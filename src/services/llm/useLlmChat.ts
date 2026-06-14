import { useCallback, useEffect, useRef, useState } from 'react';
import { llmClient } from './client';
import { llmConfigStore, type LlmToolCall, CODE_GENERATION_TOOL } from './config';
import type { ChatMessage } from './client';

const MAX_HISTORY_CHARS = 16000;
const MIN_STREAM_MS = 800;

export type LlmStatus = 'idle' | 'streaming' | 'error';

export interface LlmState {
  status: LlmStatus;
  streamingText: string;
  messages: ChatMessage[];
  lastError: string | null;
  toolCalls: LlmToolCall[] | null;
  pendingCode: string | null;
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 1) return messages;
  let total = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (total <= MAX_HISTORY_CHARS) return messages;
  const result = [...messages];
  while (total > MAX_HISTORY_CHARS && result.length > 2) {
    const [a, b] = result.splice(0, 2);
    total -= a.content.length + (b ? b.content.length : 0);
  }
  return result;
}

// Module-level state — persists across component mounts/unmounts
let _store: LlmState = {
  status: 'idle',
  streamingText: '',
  messages: [],
  lastError: null,
  toolCalls: null,
  pendingCode: null,
};
let _listeners: Array<() => void> = [];

function notify() {
  _listeners.forEach(fn => fn());
}

export function useLlmChat(initialSystemPrompt?: string) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter(f => f !== fn);
    };
  }, []);

  const state = _store;

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartRef = useRef(0);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const streamingTextRef = useRef('');
  const toolCallReasoningRef = useRef('');

  const send = useCallback(async (userMessage: string, options?: { code?: string }) => {
    if (!llmConfigStore.isConfigured()) {
      _store = { ..._store, status: 'error', lastError: 'AI not configured. Set endpoint and model in settings.' };
      notify();
      return;
    }

    const config = llmConfigStore.config;
    const codeSnapshot = options?.code ?? null;

    const apiUserContent = codeSnapshot
      ? `Current editor code:\n\`\`\`js\n${codeSnapshot}\n\`\`\`\n\n${userMessage}`
      : userMessage;

    const cleanMessage: ChatMessage = { role: 'user', content: userMessage };
    const trimmedMessages = trimMessages([...state.messages, cleanMessage]);

    _store = {
      ..._store,
      messages: trimmedMessages,
      status: 'streaming' as const,
      streamingText: '',
      lastError: null,
      toolCalls: null,
      pendingCode: null,
    };
    notify();

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    streamStartRef.current = Date.now();
    streamingTextRef.current = '';
    toolCallReasoningRef.current = '';

    const requestId = ++requestIdRef.current;

    const systemMessage: ChatMessage = {
      role: 'system',
      content: initialSystemPrompt || config.systemPrompt,
    };
    const apiMessages: ChatMessage[] = [
      systemMessage,
      ...trimmedMessages.slice(0, -1),
      { role: 'user', content: apiUserContent },
    ];

    try {
      await llmClient.sendMessage(apiMessages, {
        onToken: (token: string) => {
          if (requestIdRef.current !== requestId) return;
          streamingTextRef.current += token;
          _store = { ..._store, streamingText: streamingTextRef.current };
          notify();
        },
        onComplete: (fullResponse: string) => {
          if (requestIdRef.current !== requestId) return;
          const applyResult = () => {
            const hasToolCalls = !!_store.toolCalls?.length;
            const newMessages = hasToolCalls
              ? [..._store.messages, { role: 'assistant' as const, content: toolCallReasoningRef.current || 'Generated code via tool call.' }]
              : [..._store.messages, { role: 'assistant' as const, content: fullResponse }];
            _store = {
              ..._store,
              status: 'idle',
              streamingText: '',
              messages: newMessages,
            };
            notify();
          };
          const elapsed = Date.now() - streamStartRef.current;
          if (elapsed < MIN_STREAM_MS) {
            streamTimeoutRef.current = setTimeout(applyResult, MIN_STREAM_MS - elapsed);
          } else {
            applyResult();
          }
        },
        onError: (error: Error) => {
          if (requestIdRef.current !== requestId) return;
          _store = { ..._store, status: 'error', streamingText: '', lastError: error.message };
          notify();
        },
        onToolCalls: (toolCalls: LlmToolCall[]) => {
          if (requestIdRef.current !== requestId) return;
          toolCallReasoningRef.current = streamingTextRef.current;
          const codeCall = toolCalls.find((t) => t.name === 'set_code');
          const pendingCode =
            codeCall?.arguments && typeof codeCall.arguments.code === 'string'
              ? codeCall.arguments.code
              : null;
          _store = { ..._store, toolCalls, pendingCode };
          notify();
        },
      }, [CODE_GENERATION_TOOL]);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      _store = { ..._store, status: 'error', streamingText: '', lastError: error instanceof Error ? error.message : 'Unknown error' };
      notify();
    }
  }, []); // No deps — we read _store directly

  const acceptCode = useCallback((onCodeChange?: (code: string) => void) => {
    if (_store.pendingCode && onCodeChange) {
      onCodeChange(_store.pendingCode);
    }
    _store = { ..._store, toolCalls: null, pendingCode: null, status: 'idle' };
    notify();
  }, []);

  const rejectCode = useCallback(() => {
    _store = {
      ..._store,
      toolCalls: null,
      pendingCode: null,
      messages: _store.pendingCode ? _store.messages.slice(0, -1) : _store.messages,
    };
    notify();
  }, []);

  const clear = useCallback(() => {
    _store = { status: 'idle', streamingText: '', messages: [], lastError: null, toolCalls: null, pendingCode: null };
    notify();
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    };
  }, []);

  return {
    ...state,
    send,
    acceptCode,
    rejectCode,
    clear,
    isConfigured: llmConfigStore.isConfigured(),
  };
}

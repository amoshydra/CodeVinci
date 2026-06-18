import { useCallback, useEffect, useRef, useState } from 'react';
import { llmClient } from './client';
import { llmConfigStore, type LlmToolCall, CODE_GENERATION_TOOL, APPLY_EDITS_TOOL } from './config';
import { applyEdits } from './applyEdits';
import type { ChatMessage } from './client';

const MAX_HISTORY_CHARS = 16000;
const MIN_STREAM_MS = 800;
const SS_HISTORY_KEY = 'codevinci-llm-history';

export type LlmStatus = 'idle' | 'streaming' | 'error';

export interface LlmState {
  status: LlmStatus;
  streamingText: string;
  reasoningText: string;
  messages: ChatMessage[];
  lastError: string | null;
  toolCalls: LlmToolCall[] | null;
  pendingCode: string | null;
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(SS_HISTORY_KEY, JSON.stringify(messages));
  } catch { /* quota exceeded */ }
}

function stripReasoning(m: ChatMessage): ChatMessage {
  return m.reasoning ? { role: m.role, content: m.content } : m;
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
  reasoningText: '',
  messages: loadHistory(),
  lastError: null,
  toolCalls: null,
  pendingCode: null,
};
let _listeners: Array<() => void> = [];

function notify() {
  saveHistory(_store.messages);
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
  const streamingReasoningRef = useRef('');
  const toolCallReasoningRef = useRef('');

  const send = useCallback(async (userMessage: string, options?: { code?: string; errors?: string }) => {
    if (!llmConfigStore.isConfigured()) {
      _store = { ..._store, status: 'error', lastError: 'AI not configured. Set endpoint and model in settings.' };
      notify();
      return;
    }

    const config = llmConfigStore.config;
    const codeSnapshot = options?.code ?? null;
    const errorsSnapshot = options?.errors;

    let context = '';
    if (codeSnapshot) {
      context += `Current editor code:\n\`\`\`js\n${codeSnapshot}\n\`\`\`\n\n`;
    }
    if (errorsSnapshot) {
      context += `Console output:\n\`\`\`\n${errorsSnapshot}\n\`\`\`\n\n`;
    }
    const apiUserContent = context ? `${context}${userMessage}` : userMessage;

    const cleanMessage: ChatMessage = { role: 'user', content: userMessage };
    const trimmedMessages = trimMessages([..._store.messages, cleanMessage]);

    _store = {
      ..._store,
      messages: trimmedMessages,
      status: 'streaming' as const,
      streamingText: '',
      reasoningText: '',
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
    streamingReasoningRef.current = '';
    toolCallReasoningRef.current = '';

    const requestId = ++requestIdRef.current;

    const systemMessage: ChatMessage = {
      role: 'system',
      content: initialSystemPrompt || config.systemPrompt,
    };
    const apiMessages: ChatMessage[] = [
      systemMessage,
      ...trimmedMessages.slice(0, -1).map(stripReasoning),
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
        onReasoning: (token: string) => {
          if (requestIdRef.current !== requestId) return;
          streamingReasoningRef.current += token;
          _store = { ..._store, reasoningText: streamingReasoningRef.current };
          notify();
        },
        onComplete: (fullResponse: string) => {
          if (requestIdRef.current !== requestId) return;
          const applyResult = () => {
            const hasToolCalls = !!_store.toolCalls?.length;
            const reasoning = streamingReasoningRef.current;
            const content = fullResponse;
            const generatedCode = _store.pendingCode;
            const newMessages = hasToolCalls
              ? [..._store.messages, {
                  role: 'assistant' as const,
                  content: [toolCallReasoningRef.current, generatedCode ? `\`\`\`js\n${generatedCode}\n\`\`\`` : ''].filter(Boolean).join('\n\n'),
                }]
              : [..._store.messages, { role: 'assistant' as const, content, reasoning: reasoning || undefined }];
            _store = {
              ..._store,
              status: 'idle',
              streamingText: '',
              reasoningText: '',
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
          const editCall = toolCalls.find((t) => t.name === 'apply_edits');
          let pendingCode: string | null = null;

          if (codeCall?.arguments && typeof codeCall.arguments.code === 'string') {
            pendingCode = codeCall.arguments.code;
          } else if (editCall?.arguments) {
            const editsArg = editCall.arguments;
            const edits = 'edits' in editsArg && Array.isArray(editsArg.edits) ? editsArg.edits as Array<{ search: string; replace: string }> : null;
            if (Array.isArray(edits) && codeSnapshot) {
              const { result, error } = applyEdits(codeSnapshot, edits);
              if (error) {
                // Track retries in session storage to avoid infinite loops
                let retryCount = 0;
                try {
                  retryCount = parseInt(sessionStorage.getItem('codevinci-edit-retry') || '0', 10);
                } catch {}
                if (retryCount >= 2) {
                  sessionStorage.removeItem('codevinci-edit-retry');
                  const errMsg: ChatMessage = { role: 'assistant', content: `⚠️ Edit failed after ${retryCount} retries: ${error}. Check the code and search text manually.` };
                  _store = { ..._store, messages: [..._store.messages, errMsg] };
                  notify();
                  return;
                }
                try { sessionStorage.setItem('codevinci-edit-retry', String(retryCount + 1)); } catch {}
                const retryMsg = `The edits you proposed failed:\n${error}\n\nFix the search text and try again. Each search must match exactly once. Include enough surrounding context.`;
                const retryChat: ChatMessage = { role: 'user' as const, content: retryMsg };
                _store = { ..._store, messages: [..._store.messages, retryChat] };
                notify();
                setTimeout(() => send(retryMsg, { code: codeSnapshot }), 0);
                return;
              }
              pendingCode = result;
            }
          }

          _store = { ..._store, toolCalls, pendingCode };
          notify();
        },
      }, [CODE_GENERATION_TOOL, APPLY_EDITS_TOOL], abortControllerRef.current.signal);
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
    const historyMsg: ChatMessage = { role: 'assistant' as const, content: '✓ Code accepted — applied to editor' };
    _store = { ..._store, toolCalls: null, pendingCode: null, status: 'idle', messages: [..._store.messages, historyMsg] };
    notify();
  }, []);

  const rejectCode = useCallback(() => {
    const historyMsg: ChatMessage = { role: 'assistant' as const, content: '✗ Code rejected' };
    _store = { ..._store, toolCalls: null, pendingCode: null, messages: [..._store.messages, historyMsg] };
    notify();
  }, []);

  const clear = useCallback(() => {
    _store = { status: 'idle', streamingText: '', reasoningText: '', messages: [], lastError: null, toolCalls: null, pendingCode: null };
    notify();
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    _store = { ..._store, status: 'idle', streamingText: '', reasoningText: '' };
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
    stop,
    isConfigured: llmConfigStore.isConfigured(),
  };
}

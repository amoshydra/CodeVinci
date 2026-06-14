import { useCallback, useEffect, useRef, useState } from 'react';
import { llmClient } from './client';
import { llmConfigStore, type LlmToolCall, CODE_GENERATION_TOOL } from './config';
import type { ChatMessage } from './client';

const MAX_HISTORY_CHARS = 4000;
const CODE_TRUNCATE_LENGTH = 2000;
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
  while (total > MAX_HISTORY_CHARS && result.length > 1) {
    const removed = result.shift()!;
    total -= removed.content.length;
  }
  return result;
}

export function useLlmChat(initialSystemPrompt?: string) {
  const [state, setState] = useState<LlmState>({
    status: 'idle',
    streamingText: '',
    messages: [],
    lastError: null,
    toolCalls: null,
    pendingCode: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartRef = useRef(0);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const streamingTextRef = useRef('');
  const toolCallReasoningRef = useRef('');

  const send = useCallback(async (userMessage: string, options?: { code?: string }) => {
    if (!llmConfigStore.isConfigured()) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        lastError: 'AI not configured. Set endpoint and model in settings.',
      }));
      return;
    }

    const config = llmConfigStore.config;
    const codeSnapshot = options?.code ?? null;

    // Build user message for API with current code context
    const apiUserContent = codeSnapshot
      ? `Current editor code:\n\`\`\`js\n${codeSnapshot.slice(0, CODE_TRUNCATE_LENGTH)}${codeSnapshot.length > CODE_TRUNCATE_LENGTH ? '\n// ... truncated' : ''}\n\`\`\`\n\n${userMessage}`
      : userMessage;

    // Store clean message in local history (without code injection)
    const cleanMessage: ChatMessage = { role: 'user', content: userMessage };
    const trimmedMessages = trimMessages([...state.messages, cleanMessage]);

    setState((prev) => ({
      ...prev,
      messages: trimmedMessages,
      status: 'streaming',
      streamingText: '',
      lastError: null,
      toolCalls: null,
      pendingCode: null,
    }));

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    streamStartRef.current = Date.now();
    streamingTextRef.current = '';
    toolCallReasoningRef.current = '';

    const requestId = ++requestIdRef.current;

    // Build API messages: system prompt + clean history + current message with code
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
          setState((prev) => ({
            ...prev,
            streamingText: prev.streamingText + token,
          }));
        },
        onComplete: (fullResponse: string) => {
          if (requestIdRef.current !== requestId) return;
          const applyResult = () => {
            setState((prev) => {
              const hasToolCalls = !!prev.toolCalls?.length;
              const newMessages = hasToolCalls
                ? [...prev.messages, { role: 'assistant' as const, content: toolCallReasoningRef.current || 'Generated code via tool call.' }]
                : [...prev.messages, { role: 'assistant' as const, content: fullResponse }];
              return {
                ...prev,
                status: 'idle',
                streamingText: '',
                messages: newMessages.slice(-50),
              };
            });
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
          setState((prev) => ({
            ...prev,
            status: 'error',
            streamingText: '',
            lastError: error.message,
          }));
        },
        onToolCalls: (toolCalls: LlmToolCall[]) => {
          if (requestIdRef.current !== requestId) return;
          toolCallReasoningRef.current = streamingTextRef.current;
          const codeCall = toolCalls.find((t) => t.name === 'set_code');
          const pendingCode =
            codeCall?.arguments && typeof codeCall.arguments.code === 'string'
              ? codeCall.arguments.code
              : null;
          setState((prev) => ({
            ...prev,
            toolCalls,
            pendingCode,
          }));
        },
      }, [CODE_GENERATION_TOOL]);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setState((prev) => ({
        ...prev,
        status: 'error',
        streamingText: '',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [state.messages, initialSystemPrompt]);

  const acceptCode = useCallback((onCodeChange?: (code: string) => void) => {
    if (state.pendingCode && onCodeChange) {
      onCodeChange(state.pendingCode);
    }
    setState((prev) => ({
      ...prev,
      toolCalls: null,
      pendingCode: null,
      status: 'idle',
    }));
  }, [state.pendingCode]);

  const rejectCode = useCallback(() => {
    setState((prev) => {
      const updatedMessages = prev.pendingCode
        ? prev.messages.slice(0, -1)
        : prev.messages;
      return {
        ...prev,
        toolCalls: null,
        pendingCode: null,
        messages: updatedMessages,
      };
    });
  }, []);

  const clear = useCallback(() => {
    setState({
      status: 'idle',
      streamingText: '',
      messages: [],
      lastError: null,
      toolCalls: null,
      pendingCode: null,
    });
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

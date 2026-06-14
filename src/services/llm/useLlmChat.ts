import { useCallback, useEffect, useRef, useState } from 'react';
import { llmClient } from './client';
import { llmConfigStore, type LlmTool, type LlmToolCall, CODE_GENERATION_TOOL } from './config';
import type { ChatMessage } from './client';

const MAX_MESSAGES = 50;

export type LlmStatus = 'idle' | 'streaming' | 'error';

export interface LlmState {
  status: LlmStatus;
  streamingText: string;
  messages: ChatMessage[];
  lastError: string | null;
  toolCalls: LlmToolCall[] | null;
  pendingCode: string | null;
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

  const send = useCallback(async (userMessage: string, tools?: LlmTool[]) => {
    if (!llmConfigStore.isConfigured()) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        lastError: 'AI not configured. Set endpoint and model in settings.',
      }));
      return;
    }

    const config = llmConfigStore.config;
    const systemMessage: ChatMessage = {
      role: 'system',
      content: initialSystemPrompt || config.systemPrompt,
    };

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
    };

    const existingMessages = [...state.messages, newUserMessage].slice(-MAX_MESSAGES);

    setState((prev) => ({
      ...prev,
      messages: existingMessages,
      status: 'streaming',
      streamingText: '',
      lastError: null,
      toolCalls: null,
      pendingCode: null,
    }));

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const messages: ChatMessage[] = [systemMessage, ...existingMessages];

    try {
      await llmClient.sendMessage(messages, {
        onToken: (token: string) => {
          setState((prev) => ({
            ...prev,
            streamingText: prev.streamingText + token,
          }));
        },
        onComplete: (fullResponse: string) => {
          setState((prev) => {
            const hasToolCalls = !!prev.toolCalls?.length;
            const newMessages = hasToolCalls
              ? prev.messages
              : [...prev.messages, { role: 'assistant' as const, content: fullResponse }].slice(-MAX_MESSAGES);
            return {
              ...prev,
              status: 'idle',
              streamingText: '',
              messages: newMessages,
            };
          });
        },
        onError: (error: Error) => {
          setState((prev) => ({
            ...prev,
            status: 'error',
            streamingText: '',
            lastError: error.message,
          }));
        },
        onToolCalls: (toolCalls: LlmToolCall[]) => {
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
      }, tools || [CODE_GENERATION_TOOL]);
    } catch (error) {
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
      messages: [],
      streamingText: '',
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

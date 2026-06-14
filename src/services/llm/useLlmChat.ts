import { useCallback, useEffect, useRef, useState } from 'react';
import { llmClient } from './client';
import { llmConfigStore } from './config';
import { ChatMessage } from './client';

const MAX_MESSAGES = 50;

export type LlmStatus = 'idle' | 'streaming' | 'error';

export interface LlmState {
  status: LlmStatus;
  streamingText: string;
  messages: ChatMessage[];
  lastError: string | null;
}

export function useLlmChat(initialSystemPrompt?: string) {
  const [state, setState] = useState<LlmState>({
    status: 'idle',
    streamingText: '',
    messages: [],
    lastError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const send = useCallback(async (userMessage: string) => {
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
            const newMessages = [...prev.messages, { role: 'assistant' as const, content: fullResponse }];
            return {
              ...prev,
              status: 'idle',
              streamingText: '',
              messages: newMessages.slice(-MAX_MESSAGES),
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
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        streamingText: '',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [state.messages, initialSystemPrompt]);

  const clear = useCallback(() => {
    setState({
      status: 'idle',
      streamingText: '',
      messages: [],
      lastError: null,
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
    clear,
    isConfigured: llmConfigStore.isConfigured(),
  };
}

import { llmConfigStore, type LlmTool, type LlmToolCall } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
  onToolCalls?: (toolCalls: LlmToolCall[]) => void;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, '');
}

export class LLMClient {
  private config = llmConfigStore.config;

  constructor() {
    const handleConfigChange = () => {
      this.config = llmConfigStore.config;
    };
    window.addEventListener('codevinci-llm-config-change', handleConfigChange);
  }

  async fetchModels(): Promise<string[]> {
    const endpoint = normalizeEndpoint(this.config.apiEndpoint);
    const response = await fetch(`${endpoint}/models`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch models: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const models: string[] =
      (data.data || data.models || [])
        ?.map((model: { id: string } | string) => (typeof model === 'string' ? model : model.id))
        ?.sort() || [];

    return models;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.fetchModels();
      return true;
    } catch {
      return false;
    }
  }

  /** Accumulated tool call deltas by index — reset per sendMessage call */
  private toolCallAccumulator: Map<number, { id?: string; function: { name?: string; arguments: string } }> = new Map();

  async sendMessage(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    tools?: LlmTool[],
  ): Promise<void> {
    const endpoint = normalizeEndpoint(this.config.apiEndpoint);
    this.toolCallAccumulator.clear();

    const body: Record<string, unknown> = {
      model: this.config.defaultModel,
      messages,
      stream: true,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      top_p: this.config.topP,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError(new Error(`API error: ${response.status} ${errorText}`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError(new Error('No response body'));
      return;
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let finishReason: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            finishReason = 'stop';
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta || {};

            if (delta.content) {
              fullResponse += delta.content;
              callbacks.onToken(delta.content);
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const existing = this.toolCallAccumulator.get(idx) || { function: { arguments: '' } };
                if (tc.id) existing.id = tc.id;
                if (tc.function) {
                  if (tc.function.name) existing.function.name = tc.function.name;
                  if (tc.function.arguments) existing.function.arguments += tc.function.arguments;
                }
                this.toolCallAccumulator.set(idx, existing);
              }
            }

            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // At stream end, check for tool calls
      if (
        callbacks.onToolCalls &&
        finishReason === 'tool_calls' &&
        this.toolCallAccumulator.size > 0
      ) {
        const toolCalls: LlmToolCall[] = [];
        for (const [, tc] of this.toolCallAccumulator) {
          if (tc.function.name) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(tc.function.arguments);
            } catch {
              args = { code: tc.function.arguments };
            }
            toolCalls.push({ name: tc.function.name, arguments: args });
          }
        }
        if (toolCalls.length > 0) {
          callbacks.onToolCalls(toolCalls);
        }
      }

      callbacks.onComplete(fullResponse);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async sendMessageWithTools(
    messages: ChatMessage[],
    tools: LlmTool[],
    callbacks: StreamCallbacks,
  ): Promise<void> {
    return this.sendMessage(messages, callbacks, tools);
  }

  async sendMessageOnce(messages: ChatMessage[]): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullResponse = '';

      this.sendMessage(messages, {
        onToken: (token) => {
          fullResponse += token;
        },
        onComplete: () => {
          resolve(fullResponse);
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }
}

export const llmClient = new LLMClient();

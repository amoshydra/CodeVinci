import { llmConfigStore } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
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

  async sendMessage(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    const endpoint = normalizeEndpoint(this.config.apiEndpoint);

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.config.defaultModel,
        messages,
        stream: true,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: this.config.topP,
      }),
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

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              callbacks.onToken(content);
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      callbacks.onComplete(fullResponse);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
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

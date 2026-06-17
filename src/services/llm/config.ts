export type LlmProvider = 'openai-compatible' | 'openai';

export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export const CODE_GENERATION_TOOL: LlmTool = {
  name: "set_code",
  description: "Replace the entire editor code with new code. Use this when generating code from scratch or when making changes that touch many parts of the file.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The complete new code."
      }
    },
    required: ["code"]
  }
};

export const APPLY_EDITS_TOOL: LlmTool = {
  name: "apply_edits",
  description: "Make small, targeted changes to the existing code by finding exact text and replacing it. Use this instead of set_code when the change is small (a few lines). Each search text must match exactly once in the code.",
  parameters: {
    type: "object",
    properties: {
      edits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            search: { type: "string", description: "Exact text to find. Must appear exactly once. Include surrounding context to make it unique." },
            replace: { type: "string", description: "Text to replace it with." }
          },
          required: ["search", "replace"]
        }
      }
    },
    required: ["edits"]
  }
};

export interface LLMConfig {
  provider: LlmProvider;
  apiEndpoint: string;
  apiKey: string;
  defaultModel: string;
  systemPrompt: string;
  availableModels: string[];
  connectionValid: boolean;
  temperature: number;
  topP: number;
  maxTokens: number;
  /** The origin of the API endpoint at the time CSP was last configured.
   *  Used to detect when a reload is needed after a URL change. */
  cspOrigin: string;
}

const LLM_CONFIG_STORAGE_KEY = 'codevinci-llm-config';

export const DEFAULT_SYSTEM_PROMPT = `You are a software engineering AI assistant for a browser-based JavaScript playground.

When the user asks a question or requests an explanation, respond with text only — do NOT call any tools.

When the user asks to change the code:
- For large changes or new code: use the "set_code" tool to replace the entire file.
- For small, targeted changes (a few lines): use the "apply_edits" tool with search/replace pairs.

Code guidelines:
- Generate a single JavaScript file that runs in the browser
- Import external libraries from https://esm.sh
- Use document.body.insertAdjacentHTML to add HTML
- Wrap styles in a <style> tag inserted via insertAdjacentHTML
- Provide working, self-contained code`;

export function getDefaultLLMConfig(): LLMConfig {
  return {
    provider: 'openai-compatible',
    apiEndpoint: 'http://localhost:11434/v1',
    apiKey: '',
    defaultModel: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    availableModels: [],
    connectionValid: false,
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 131072,
    cspOrigin: '',
  };
}

export const OPENAI_ENDPOINT = 'https://api.openai.com/v1';

export function getProviderForEndpoint(endpoint: string): LlmProvider {
  const e = endpoint.replace(/\/+$/, '').toLowerCase();
  if (e === OPENAI_ENDPOINT.replace(/\/+$/, '').toLowerCase()) return 'openai';
  return 'openai-compatible';
}

export function getEndpointForProvider(provider: LlmProvider, currentEndpoint: string): string {
  if (provider === 'openai') return OPENAI_ENDPOINT;
  return currentEndpoint === OPENAI_ENDPOINT ? getDefaultLLMConfig().apiEndpoint : currentEndpoint;
}

export function extractOrigin(url: string): string {
  try {
    const u = new URL(url.replace(/\/+$/, ''));
    return u.origin;
  } catch {
    return '';
  }
}

export class LLMConfigStore {
  config: LLMConfig;

  constructor() {
    this.config = this.load();
  }

  load(): LLMConfig {
    const stored = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...getDefaultLLMConfig(),
          ...parsed,
        };
      } catch {
        return getDefaultLLMConfig();
      }
    }
    return getDefaultLLMConfig();
  }

  store(config: LLMConfig): void {
    this.config = config;
    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('codevinci-llm-config-change'));
  }

  clear(): void {
    this.config = getDefaultLLMConfig();
    localStorage.removeItem(LLM_CONFIG_STORAGE_KEY);
    window.dispatchEvent(new Event('codevinci-llm-config-change'));
  }

  isConfigured(): boolean {
    const trimmedEndpoint = this.config.apiEndpoint.trim();
    const trimmedModel = this.config.defaultModel.trim();
    return !!trimmedEndpoint && !!trimmedModel && this.config.connectionValid;
  }

  setConnectionValid(valid: boolean): void {
    this.config.connectionValid = valid;
    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    window.dispatchEvent(new Event('codevinci-llm-config-change'));
  }

  updateCspOrigin(origin: string): void {
    this.config.cspOrigin = origin;
    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(this.config));
  }

  /** Returns the origin we should allow in CSP for the current endpoint */
  currentCspOrigin(): string {
    return extractOrigin(this.config.apiEndpoint);
  }

  /** True when the endpoint changed since the last CSP-reload */
  needsCspReload(): boolean {
    const cur = this.currentCspOrigin();
    return !!cur && cur !== this.config.cspOrigin;
  }

  async withConfig<T>(partial: Partial<LLMConfig>, fn: (config: LLMConfig) => T | Promise<T>): Promise<T> {
    return fn({ ...this.config, ...partial });
  }
}

export const llmConfigStore = new LLMConfigStore();

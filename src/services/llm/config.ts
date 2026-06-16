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
  description: "Call this tool when you have generated the complete code solution. This will set the code in the editor.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The complete code."
      }
    },
    required: ["code"]
  }
};

export const APPLY_EDITS_TOOL: LlmTool = {
  name: "apply_edits",
  description: "Apply one or more search-and-replace edits to the existing code. Use this for small, targeted changes instead of rewriting the entire file. Each edit must have a unique search string that appears exactly once in the code.",
  parameters: {
    type: "object",
    properties: {
      edits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            search: { type: "string", description: "Exact text to find in the code. Must match exactly including whitespace and must appear only once." },
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

export const DEFAULT_SYSTEM_PROMPT = `You are a software engineering AI assistant that generates JavaScript code for a code editor.

Your task:
1. Understand the user's request carefully
2. Generate complete JavaScript code that fulfills the request
3. You can include imports, HTML via document.body.insertAdjacentHTML, inline styles, and script logic
4. When code generation is complete, you MUST call the set_code tool with the complete code
5. Do not call the tool until you have fully generated the code

IMPORTANT:
- The code should be a single JavaScript file that runs in a browser environment
- You can only import external npm libraries from https://esm.sh
- Use document.body.insertAdjacentHTML to add HTML elements if needed
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

  async withConfig<T>(partial: Partial<LLMConfig>, fn: () => T | Promise<T>): Promise<T> {
    const prev = this.config;
    this.config = { ...prev, ...partial };
    try {
      return await fn();
    } finally {
      this.config = prev;
    }
  }
}

export const llmConfigStore = new LLMConfigStore();

export type LlmProvider = 'openai-compatible' | 'openai';

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

export const DEFAULT_SYSTEM_PROMPT = `You are a coding assistant for CodeVinci, a browser-based code editor.

The user works with HTML/CSS/JS in a live preview environment.

When asked to create something, generate complete, runnable HTML with embedded CSS and JS.
When asked to edit, provide only the changed code with brief context.
Be concise. Prefer code over explanation.`;

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
    maxTokens: 4096,
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

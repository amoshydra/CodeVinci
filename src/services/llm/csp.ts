import { extractOrigin, llmConfigStore } from './config';

const CSP_META_ID = 'codevinci-llm-csp';

export function injectCspForOrigin(origin: string): void {
  const existing = document.getElementById(CSP_META_ID);
  if (existing) existing.remove();
  if (!origin) return;
  const meta = document.createElement('meta');
  meta.id = CSP_META_ID;
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = `connect-src 'self' ${origin}`;
  document.head.appendChild(meta);
}

export function applyCspFromConfig(): void {
  const origin = extractOrigin(llmConfigStore.config.apiEndpoint);
  if (origin) {
    injectCspForOrigin(origin);
  }
}

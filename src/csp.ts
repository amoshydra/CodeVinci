import { llmConfigStore } from './services/llm/config';

function extractOrigin(url: string): string {
  try {
    const u = new URL(url.replace(/\/+$/, ''));
    return u.origin;
  } catch {
    return '';
  }
}

function applyCSP(aiEndpoint: string): void {
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) existing.remove();

  const aiOrigin = extractOrigin(aiEndpoint);
  const connectSrc = aiOrigin
    ? `'self' ${aiOrigin}`
    : `'self'`;

  const policy = [
    "default-src 'self'",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "worker-src 'self'",
  ].join('; ');

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = policy;
  document.head.appendChild(meta);
}

export function initCSP(): void {
  const config = llmConfigStore.config;
  applyCSP(config.apiEndpoint);
}

import { llmConfigStore } from './services/llm/config';

function extractOrigin(url: string): string {
  try {
    const u = new URL(url.replace(/\/+$/, ''));
    return u.origin;
  } catch {
    return '';
  }
}

const CDN_ORIGINS = [
  'https://esm.sh',
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://esm.unpkg.com',
  'https://module.local',
].join(' ');

function applyCSP(aiEndpoint: string): void {
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) existing.remove();

  const aiOrigin = extractOrigin(aiEndpoint);
  const selfOnly = `'self'`;
  const connectSrc = aiOrigin
    ? `${selfOnly} ${aiOrigin}`
    : selfOnly;

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const workerSrc = isDev ? `${selfOnly} blob:` : selfOnly;
  const devConnect = isDev ? ` ws: wss:` : '';

  const policy = [
    "default-src 'self'",
    `connect-src ${connectSrc}${devConnect}`,
    `img-src 'self' data: blob: ${CDN_ORIGINS}`,
    `style-src 'self' 'unsafe-inline' ${CDN_ORIGINS}`,
    `script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' ${CDN_ORIGINS}`,
    `font-src 'self' ${CDN_ORIGINS}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    `worker-src ${workerSrc}`,
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

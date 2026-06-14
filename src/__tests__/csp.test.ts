import { describe, it, expect, beforeEach } from 'vitest';
import { initCSP } from '../csp';

describe('CSP injection', () => {
  beforeEach(() => {
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
  });

  it('injects a CSP meta tag into the document head', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta).not.toBeNull();
  });

  it('includes default-src self', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content');
    expect(content).toContain("default-src 'self'");
  });

  it('includes connect-src with self and LLM endpoint', () => {
    // Default endpoint is http://localhost:11434/v1
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    expect(content).toContain("connect-src 'self' http://localhost:11434");
  });

  it('includes object-src none', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    expect(content).toContain("object-src 'none'");
  });

  it('includes base-uri self', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    expect(content).toContain("base-uri 'self'");
  });

  it('includes form-action none', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    expect(content).toContain("form-action 'none'");
  });

  it('includes script-src with CDN origins', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    expect(content).toContain('esm.sh');
    expect(content).toContain('cdn.jsdelivr.net');
    expect(content).toContain('unpkg.com');
    expect(content).toContain("'unsafe-inline'");
  });

  it('includes worker-src with blob: in dev mode (localhost)', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    // In test environment, hostname is localhost, so blob: should be in worker-src
    expect(content).toContain("worker-src 'self' blob:");
  });

  it('does NOT include unsafe-eval', () => {
    initCSP();
    const content = document.querySelector('meta[http-equiv="Content-Security-Policy"]')!.getAttribute('content') || '';
    expect(content).not.toContain("'unsafe-eval'");
  });
});

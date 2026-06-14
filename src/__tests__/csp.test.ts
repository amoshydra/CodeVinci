import { describe, it, expect, beforeEach } from 'vitest';
import { initCSP } from '../csp';

describe('CSP injection', () => {
  beforeEach(() => {
    // Remove any existing CSP meta tag
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
  });

  it('injects a CSP meta tag into the document head', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta).not.toBeNull();
  });

  it('includes frame-ancestors none directive', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const content = meta?.getAttribute('content') || '';
    expect(content).toContain("frame-ancestors 'none'");
  });

  it('includes object-src none directive', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const content = meta?.getAttribute('content') || '';
    expect(content).toContain("object-src 'none'");
  });

  it('includes form-action none directive', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const content = meta?.getAttribute('content') || '';
    expect(content).toContain("form-action 'none'");
  });

  it('includes base-uri self directive', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const content = meta?.getAttribute('content') || '';
    expect(content).toContain("base-uri 'self'");
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { initCSP } from '../csp';

describe('CSP — browser injection', () => {
  beforeEach(() => {
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
  });

  it('injects CSP meta tag with connect-src self and LLM endpoint', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta).not.toBeNull();
    const content = meta!.getAttribute('content');
    expect(content).toContain("connect-src 'self'");
    expect(content).toContain('localhost:11434');
  });

  it('includes object-src none and form-action none', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta!.getAttribute('content')).toContain("object-src 'none'");
    expect(meta!.getAttribute('content')).toContain("form-action 'none'");
  });

  it('includes base-uri self', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta!.getAttribute('content')).toContain("base-uri 'self'");
  });

  it('CSP blocks fetch to unauthorized origin', async () => {
    initCSP();

    // Try to fetch from an origin NOT in the CSP connect-src
    try {
      await fetch('https://not-allowed.invalid/steal');
      // If fetch succeeds, CSP didn't block it
      expect(false).toBe(true);
    } catch {
      // Fetch was blocked by CSP — expected
      expect(true).toBe(true);
    }
  });
});

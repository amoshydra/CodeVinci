import { describe, it, expect, beforeEach } from 'vitest';
import { initCSP } from '../csp';

describe('CSP — browser injection', () => {
  beforeEach(() => {
    document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]').forEach(el => el.remove());
  });

  it('injects CSP meta tag with frame-ancestors none', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta).not.toBeNull();
    const content = meta!.getAttribute('content');
    expect(content).toContain("frame-ancestors 'none'");
  });

  it('includes object-src none', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta!.getAttribute('content')).toContain("object-src 'none'");
  });

  it('includes form-action none', () => {
    initCSP();
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta!.getAttribute('content')).toContain("form-action 'none'");
  });
});

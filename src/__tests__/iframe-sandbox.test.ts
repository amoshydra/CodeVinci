import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import { getDefaultLLMConfig } from '../services/llm/config';

// Mock the Vite worker URL import — it's a Vite-specific query that
// resolves to a string URL in the build, but doesn't resolve in test
vi.mock('../views/viewer/ViewerIframeScript?worker&url', () => ({
  default: '/mock/viewer-worker.js',
}));

import { ViewerIframe } from '../views/viewer/ViewerIframe';

describe('ViewerIframe sandbox', () => {
  beforeAll(() => {
    localStorage.setItem('codevinci-llm-enabled', 'true');
    localStorage.setItem('codevinci-llm-config', JSON.stringify({
      ...getDefaultLLMConfig(),
      apiKey: 'sk-test-key-in-storage',
    }));
  });

  it('renders iframe with sandbox="allow-scripts"', () => {
    const { container } = render(
      <ViewerIframe script="console.log('test')" onFrameMessage={() => {}} />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('sandbox does NOT include allow-same-origin', () => {
    const { container } = render(
      <ViewerIframe script="console.log('test')" onFrameMessage={() => {}} />
    );
    const sandbox = container.querySelector('iframe')!.getAttribute('sandbox') || '';
    expect(sandbox.includes('allow-same-origin')).toBe(false);
    expect(sandbox.includes('allow-scripts')).toBe(true);
    expect(sandbox.split(' ')).toHaveLength(1);
  });

  it('srcdoc does not contain inline onerror handler', () => {
    const { container } = render(
      <ViewerIframe script="console.log('test')" onFrameMessage={() => {}} />
    );
    const srcdoc = container.querySelector('iframe')!.getAttribute('srcdoc') || '';
    expect(srcdoc).not.toContain('onerror=');
  });
});

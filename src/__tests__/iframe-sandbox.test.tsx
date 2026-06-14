import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../views/viewer/ViewerIframeScript?worker&url', () => ({
  default: '/mock/viewer-worker.js',
}));

import { ViewerIframe } from '../views/viewer/ViewerIframe';

describe('ViewerIframe sandbox', () => {
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

  it('injects localStorage mock before user code', () => {
    const { container } = render(
      <ViewerIframe script="console.log('test')" onFrameMessage={() => {}} />
    );
    const srcdoc = container.querySelector('iframe')!.getAttribute('srcdoc') || '';
    expect(srcdoc).toContain('localStorage');
    expect(srcdoc).toContain('sessionStorage');
    expect(srcdoc).toContain('getItem');
    expect(srcdoc).toContain('setItem');
  });
});

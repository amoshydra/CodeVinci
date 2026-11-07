import { HTMLAttributes, memo, useEffect, useRef } from "react";
import { createEsbuilderHtmlTemplate } from "../../utils/esbuilder.html";
import { withCn } from "../../utils/tailwind";
import {
  markPreviewStarted,
  setInteractionHandler,
  setPreviewHandler,
  type InteractionRequest,
  type InteractionResult,
  type PreviewRequestOptions,
  type PreviewSnapshot,
} from "../../services/webmcpRuntime";
import { OnFrameMessage } from "./interface";
import iframeScript from "./ViewerIframeScript?worker&url";

const STORAGE_SESSION_KEY = 'codevinci-iframe-localStorage';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: number;
}

let previewRequestCounter = 0;

function getPersistedStorage(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

export interface ViewerIframeProps extends HTMLAttributes<HTMLElement> {
  script: string;
  onFrameMessage: OnFrameMessage;
  runNonce?: number;
}

export const ViewerIframe = memo(({
  script,
  onFrameMessage,
  runNonce = 0,
  ...props
}: ViewerIframeProps) => {
  const srcDoc = getSrcDoc(script);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingRequests = useRef(new Map<string, PendingRequest>());

  useEffect(() => {
    const pending = pendingRequests.current;

    const sendRequest = (
      method: string,
      payload: unknown,
      timeoutMs: number,
    ): Promise<unknown> => new Promise((resolve, reject) => {
      const frame = iframeRef.current?.contentWindow;
      if (!frame) {
        reject(new Error('The preview is not available yet.'));
        return;
      }

      const id = `preview-${++previewRequestCounter}`;
      const timer = window.setTimeout(() => {
        pending.delete(id);
        reject(new Error('Timed out waiting for the preview to respond.'));
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      frame.postMessage({
        _id: 'codevinci-request',
        id,
        method,
        args: [payload],
      }, '*');
    });

    const unregisterPreview = setPreviewHandler((options: PreviewRequestOptions) =>
      sendRequest('preview.snapshot', options, 1000) as Promise<PreviewSnapshot>,
    );
    const unregisterInteraction = setInteractionHandler((request: InteractionRequest) =>
      sendRequest('preview.interact', request, 1000) as Promise<InteractionResult>,
    );

    return () => {
      unregisterPreview();
      unregisterInteraction();
      for (const request of pending.values()) {
        window.clearTimeout(request.timer);
        request.reject(new Error('The preview was unmounted.'));
      }
      pending.clear();
    };
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data || {};
      if (event.origin === "null" && data._id === "codevinci") {
        if (data.method === "preview.started") {
          markPreviewStarted();
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id: _, ...rest } = data;
        onFrameMessage(rest);
      }
      if (event.origin === "null" && data._id === "codevinci-response") {
        const request = pendingRequests.current.get(data.id);
        if (!request) return;
        window.clearTimeout(request.timer);
        pendingRequests.current.delete(data.id);
        if (data.ok) {
          request.resolve(data.result);
        } else {
          request.reject(new Error(
            typeof data.error === 'string' ? data.error : 'The preview request failed.',
          ));
        }
      }
      if (event.origin === "null" && data._id === "codevinci-storage-sync") {
        try {
          sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.data));
        } catch { /* quota exceeded */ }
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    }
  }, []);

  return (
    <iframe
      {...withCn(props)}
      key={runNonce}
      ref={iframeRef}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
    />
  );
});

function storageMock(persisted: Record<string, string>): string {
  const init = JSON.stringify(persisted);
  return `<script>
(function(){
  var mem = ${init}, smem = {};
  function S(m, isLocal) {
    return {
      getItem: function(k) { return m.hasOwnProperty(k) ? String(m[k]) : null; },
      setItem: function(k, v) { m[k] = String(v); if (isLocal) parent.postMessage({ _id: 'codevinci-storage-sync', data: JSON.parse(JSON.stringify(mem)) }, '*'); },
      removeItem: function(k) { delete m[k]; if (isLocal) parent.postMessage({ _id: 'codevinci-storage-sync', data: JSON.parse(JSON.stringify(mem)) }, '*'); },
      clear: function() { for (var k in m) delete m[k]; if (isLocal) parent.postMessage({ _id: 'codevinci-storage-sync', data: {} }, '*'); },
      key: function(i) { var keys = Object.keys(m); return keys[i] || null; },
      get length() { return Object.keys(m).length; }
    };
  }
  Object.defineProperty(window, 'localStorage', { value: S(mem, true), writable: false });
  Object.defineProperty(window, 'sessionStorage', { value: S(smem, false), writable: false });
})();
</script>`;
}

const cspCaptureScript = `<script>
(function(){
  window.__codevinciCspQueue = [];
  window.__codevinciCspNotify = null;
  window.addEventListener('securitypolicyviolation', function(event) {
    var violation = {
      blockedURI: event.blockedURI || '',
      effectiveDirective: event.effectiveDirective || '',
      disposition: event.disposition || '',
      sourceFile: event.sourceFile || '',
      lineNumber: event.lineNumber || 0,
      columnNumber: event.columnNumber || 0
    };
    if (window.__codevinciCspNotify) {
      window.__codevinciCspNotify(violation);
    } else {
      window.__codevinciCspQueue.push(violation);
    }
  });
})();
</script>`;

const getSrcDoc = (script: string) =>
  createEsbuilderHtmlTemplate("", `
    ${storageMock(getPersistedStorage())}
    ${cspCaptureScript}
    <script type="module" src=${JSON.stringify(iframeScript)} data-origin=${location.origin}></script>
    <script type="module">${script}</script>
  `);

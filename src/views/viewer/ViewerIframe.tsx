import { HTMLAttributes, memo, useEffect } from "react";
import { createEsbuilderHtmlTemplate } from "../../utils/esbuilder.html";
import { withCn } from "../../utils/tailwind";
import { OnFrameMessage } from "./interface";
import iframeScript from "./ViewerIframeScript?worker&url";

const STORAGE_SESSION_KEY = 'codevinci-iframe-localStorage';

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
}

export const ViewerIframe = memo(({ script, onFrameMessage, ...props }: ViewerIframeProps) => {
  const srcDoc = getSrcDoc(script);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data || {};
      if (event.origin === "null" && data._id === "codevinci") {
        const { _id, ...rest } = data;
        onFrameMessage(rest);
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

const getSrcDoc = (script: string) =>
  createEsbuilderHtmlTemplate("", `
    ${storageMock(getPersistedStorage())}
    <script type="module" src=${JSON.stringify(iframeScript)} data-origin=${location.origin}></script>
    <script type="module">${script}</script>
  `);

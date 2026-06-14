import { HTMLAttributes, memo, useEffect } from "react";
import { createEsbuilderHtmlTemplate } from "../../utils/esbuilder.html";
import { withCn } from "../../utils/tailwind";
import { MessageEventFrameMessage, OnFrameMessage } from "./interface";
import iframeScript from "./ViewerIframeScript?worker&url";

export interface ViewerIframeProps extends HTMLAttributes<HTMLElement> {
  script: string;
  onFrameMessage: OnFrameMessage;
}

export const ViewerIframe = memo(({ script, onFrameMessage, ...props }: ViewerIframeProps) => {
  const srcDoc = getSrcDoc(script);

  useEffect(() => {
    const handler = (event: MessageEvent<MessageEventFrameMessage>) => {
      const { _id, ...rest } = event.data;
      if (event.origin === "null" && _id === "codevinci") {
        onFrameMessage(rest);
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

const storageMock = `<script>
(function(){
  var mem = {}, smem = {};
  function S(m) {
    return {
      getItem: function(k) { return m.hasOwnProperty(k) ? m[k] : null; },
      setItem: function(k, v) { m[k] = String(v); },
      removeItem: function(k) { delete m[k]; },
      clear: function() { for (var k in m) delete m[k]; },
      key: function(i) { var keys = Object.keys(m); return keys[i] || null; },
      get length() { return Object.keys(m).length; }
    };
  }
  Object.defineProperty(window, 'localStorage', { value: S(mem), writable: false });
  Object.defineProperty(window, 'sessionStorage', { value: S(smem), writable: false });
})();
</script>`;

const getSrcDoc = (script: string) =>
  createEsbuilderHtmlTemplate("", `
    ${storageMock}
    <script type="module" src=${JSON.stringify(iframeScript)} data-origin=${location.origin}></script>
    <script type="module">${script}</script>
  `);

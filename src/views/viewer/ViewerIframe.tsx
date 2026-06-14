import { HTMLAttributes, memo, useCallback, useEffect, useRef } from "react";
import { withCn } from "../../utils/tailwind";
import { MessageEventFrameMessage, OnFrameMessage } from "./interface";
import iframeScript from "./ViewerIframeScript?worker&url";

function postCode(iframe: HTMLIFrameElement | null, code: string) {
  iframe?.contentWindow?.postMessage({
    _id: 'codevinci-init',
    scriptUrl: iframeScript,
    code,
    origin: location.origin,
  }, '*');
}

export interface ViewerIframeProps extends HTMLAttributes<HTMLElement> {
  script: string;
  onFrameMessage: OnFrameMessage;
}

export const ViewerIframe = memo(({ script, onFrameMessage, ...props }: ViewerIframeProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Forward messages from the iframe to the parent
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

  // Send code to iframe whenever it changes
  useEffect(() => {
    postCode(iframeRef.current, script);
  }, [script]);

  // Also send on initial iframe load (effect may fire before iframe is ready)
  const handleLoad = useCallback(() => {
    postCode(iframeRef.current, script);
  }, [script]);

  return (
    <iframe
      ref={iframeRef}
      {...withCn(props)}
      sandbox="allow-scripts"
      src="/viewer.html"
      onLoad={handleLoad}
    />
  );
});

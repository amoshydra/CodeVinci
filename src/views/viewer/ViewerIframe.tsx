import { HTMLAttributes, memo, useCallback, useEffect, useRef } from "react";
import { withCn } from "../../utils/tailwind";
import { MessageEventFrameMessage, OnFrameMessage } from "./interface";
import iframeScript from "./ViewerIframeScript?worker&url";

export interface ViewerIframeProps extends HTMLAttributes<HTMLElement> {
  script: string;
  onFrameMessage: OnFrameMessage;
}

export const ViewerIframe = memo(({ script, onFrameMessage, ...props }: ViewerIframeProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const handleLoad = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({
      _id: 'codevinci-init',
      scriptUrl: iframeScript,
      code: script,
      origin: location.origin,
    }, '*');
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

import { HTMLAttributes, memo, useEffect } from "react";
import { createEsbuilderHtmlTemplate } from "../../utils/esbuilder.html";
import { withCn } from "../../utils/tailwind";
import { onErrorFunctionName } from "./common";
import { MessageEventFrameMessage, OnFrameMessage } from "./interface";
import iframeScript from "./ViewerIframeScript?url";

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
      {...withCn(props, "h-full w-full overflow-auto")}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
    />
  );
});

const getSrcDoc = (script: string) =>
  createEsbuilderHtmlTemplate("", `
    <script type="module" src=${JSON.stringify(iframeScript)}></script>
    <script type="module" onerror="${onErrorFunctionName}()">${script}</script>
  `)
  ;

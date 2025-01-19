import { HTMLAttributes, memo, useEffect } from "react";
import { withCn } from "../../utils/tailwind";
import { MessageEventFrameMessage, OnFrameMessage } from "./interface";

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

const getSrcDoc = (script: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Preview</title>
        <script>
          (() => {
            function send(method, args) {
              const message = {
                _id: 'codevinci',
                method,
                args,
              };
              window.parent.postMessage(message, ${JSON.stringify(location.origin)});
            }
            Object.defineProperty(window, "console", {
              value: (
                new Proxy(console, {
                  get(target, thisArg) {
                    return function (...argumentsList) {
                      target[thisArg](...argumentsList);
                      send("console." + thisArg, argumentsList);
                    }
                  },
                })
              )
            });
            window.addEventListener("error", function() {
              send("error", arguments);
            });
          })();
        </script>
        <script type="module">${script}</script>
      </head>
      <body>
      </body>
    </html>
  `;
};

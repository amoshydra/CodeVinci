import { HTMLAttributes, memo } from "react";
import { withCn } from "../../utils/tailwind";

export interface ViewerProps extends HTMLAttributes<HTMLElement> {
  script: string;
}

export const ViewerIframe = memo((props: ViewerProps) => {
  const srcDoc = getSrcDoc(props.script);

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
        <script type="module">${script}</script>
      </head>
      <body>
      </body>
    </html>
  `;
};

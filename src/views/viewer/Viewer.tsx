import { HTMLAttributes } from "react";
import { withCn } from "../../utils/tailwind";

export interface ViewerProps extends HTMLAttributes<HTMLElement> {
  script: string;
}

export const Viewer = (props: ViewerProps) => {
  const srcDoc = getSrcDoc(props.script);

  return (
    <iframe
      {...withCn(props, "h-full w-full overflow-auto")}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
    />
  );
};

const getSrcDoc = (script: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Preview</title>
      </head>
      <body>
        <script>${script}</script>
      </body>
    </html>
  `;
};

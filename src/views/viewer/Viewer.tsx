import { HTMLAttributes, memo } from "react";
import { useBuilder } from "../../services/builder";
import { useEsbuild } from "../../services/esbuild";
import { withCn } from "../../utils/tailwind";
import { ViewerIframe } from "./ViewerIframe";
import { OnFrameMessage } from "./interface";

export interface ViewerProps extends HTMLAttributes<HTMLElement> {
  code: string;
  onFrameMessage: OnFrameMessage;
}

export const Viewer = memo(({ code, onFrameMessage, ...props }: ViewerProps) => {
  const [ , isLoading, error] = useEsbuild();

  if (error) {
    return <ViewerErrorView title="Unable to load builder (esbuild-wasm)" error={error} {...props} />;
  }
  if (isLoading) {
    return <ViewerLoadingView {...props} />
  }

  return <ViewerBuilder code={code} onFrameMessage={onFrameMessage} {...props} />
});

const ViewerBuilder = memo(({ code, onFrameMessage, ...props }: ViewerProps) => {
  const [, , result] = useBuilder(code);

  return (
    <ViewerIframe
      {...withCn(props, "h-full w-full overflow-auto")}
      onFrameMessage={onFrameMessage}
      script={result}
    />
  );
});

const ViewerLoadingView = (props: HTMLAttributes<HTMLElement>) => {
  return (
    <div
      {...withCn(props, "p-6 w-full h-full")}
    >Loading viewer...</div>
  );
}

const ViewerErrorView = ({ error, title, ...props }: { error: Error, title: string }) => {
  return (
    <div {...withCn(props, "p-6 overflow-auto w-full h-full")} >
      <div>{title}</div>
      <br />
      <pre>{(error.stack || error).toString()}</pre>
    </div>
  );
}

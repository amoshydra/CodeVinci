import { HTMLAttributes, memo } from "react";
import { useBuilder } from "../../services/builder";
import { useEsbuild } from "../../services/esbuild";
import { withCn } from "../../utils/tailwind";
import { ViewerIframe } from "./ViewerIframe";

export interface ViewerProps extends HTMLAttributes<HTMLElement> {
  code: string;
}

export const Viewer = memo(({ code, ...props }: ViewerProps) => {
  const [ , isLoading, error] = useEsbuild();

  if (error) {
    return <ViewerErrorView title="Unable to load builder (esbuild-wasm)" error={error} {...props} />;
  }
  if (isLoading) {
    return <ViewerLoadingView {...props} />
  }

  return <ViewerBuilder code={code} {...props} />
});

const ViewerBuilder = memo(({ code, ...props }: ViewerProps) => {
  const [, , result] = useBuilder(code);

  return (
    <ViewerIframe
      {...withCn(props, "h-full w-full overflow-auto")}
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

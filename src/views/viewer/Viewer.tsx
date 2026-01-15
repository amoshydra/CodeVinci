import { serialize } from "@ungap/structured-clone";
import { HTMLAttributes, memo } from "react";
import { css } from "../../../styled-system/css";
import { useBuilder, type UseBuilderEsbuildOptions } from "../../services/builder";
import { useEsbuild } from "../../services/esbuild";
import { withCn } from "../../utils/tailwind";
import { ViewerIframe } from "./ViewerIframe";
import { OnFrameMessage } from "./interface";

export interface ViewerProps extends HTMLAttributes<HTMLElement> {
  code: string;
  esbuildOptions: UseBuilderEsbuildOptions,
  onFrameMessage: OnFrameMessage;
}

export const Viewer = memo(({ code, esbuildOptions, onFrameMessage, ...props }: ViewerProps) => {
  const [, isLoading, error] = useEsbuild();

  if (error) {
    return <ViewerErrorView title="Unable to load builder (esbuild-wasm)" error={error} {...props} />;
  }
  if (isLoading) {
    return <ViewerLoadingView {...props} />
  }

  return <ViewerBuilder code={code} esbuildOptions={esbuildOptions} onFrameMessage={onFrameMessage} {...props} />
});

const ViewerBuilder = memo(({ code, esbuildOptions, onFrameMessage, ...props }: ViewerProps) => {
  const [error, , result] = useBuilder(code, esbuildOptions);

  if (error) {
    onFrameMessage({
      method: "build.error",
      args: serialize([error]),
    });
    return <ViewerErrorView title={error.message} error={error} {...props} />;
  }

  return (
    // Additional div is required around iframe to make 100% height work on iOS
    <div {...props}>
      <ViewerIframe
        className={css({
          height: 'full',
          width: 'full',
        })}
        onFrameMessage={onFrameMessage}
        script={result}
      />
    </div>
  );
});

const ViewerLoadingView = (props: HTMLAttributes<HTMLElement>) => {
  return (
    <div
      {...withCn(props, css({
        p: 6,
        overflow: "auto",
      }))}
    >Loading viewer...</div>
  );
}

const ViewerErrorView = ({ error, title, ...props }: { error: Error, title: string }) => {
  return (
    <div
      {...withCn(props, css({
        p: 6,
        overflow: "auto",
      }))}
    >
      <div>{title}</div>
      <br />
      <pre>{(error.stack || error).toString()}</pre>
    </div>
  );
}

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
    <div {...withCn(props)}>
      <ViewerIframe
        className={css({
          height: 'full',
          width: 'full',
          background: 'light-dark(white, #1c1917)',
          color: 'light-dark(#1c1917, white)',
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
      {...withCn(props, cssViewMessage)}
    >Loading viewer...</div>
  );
}

const ViewerErrorView = ({ error, title, ...props }: { error: Error, title: string }) => {
  const errorMessage = (error.stack || error).toString();

  return (
    <div
      {...withCn(props, cssViewMessage)}
    >
      <div
        className={css({
          fontWeight: 600,
          color: "red.500",
        })}
      >{title}</div>
      <br />
      <ViewerErrorViewHintWebAssemblyMissing errorMessage={errorMessage} />
      <pre
        className={css({
          fontSize: "xs"
        })}
      >{errorMessage}</pre>
    </div>
  );
}


const ViewerErrorViewHintWebAssemblyMissing = ({ errorMessage }: { errorMessage: string }) => {
  const isWebAssemblyMissing = typeof WebAssembly === 'undefined';
  const isWebAssemblyError = /WebAssembly/i.test(errorMessage) && isWebAssemblyMissing;

  if (!isWebAssemblyError) return false;

  return (
    <p className={css({ color: "red.600" })}>
      An error occurs because WebAssembly is not available in your browser.
      <ul className={css({ paddingLeft: 4, paddingTop: 2, listStyle: 'outside' })}>
        <li>Check if WebAssembly is enabled in your browser settings.</li>
        <li>Ensure your browser support WebAssembly. See {""}
          <a
            href="https://caniuse.com/wasm"
            className={css({
              textDecoration: "underline"
            })}
          >https://caniuse.com/wasm</a>.
        </li>
      </ul>
      <br />
    </p>
  )
};

const cssViewMessage = css({
  p: 6,
  overflow: "auto",
});

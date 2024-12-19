import * as esbuild from "esbuild-wasm";
import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";
import { useEffect, useState } from "react";

const esbuildScope = window as unknown as {
  __esbuild: { initPromise: Promise<void> };
};
esbuildScope.__esbuild = esbuildScope.__esbuild || {
  initPromise: esbuild.initialize({
    wasmURL: esbuildWasmUrl,
  }),
};

export const useEsbuild = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    esbuildScope.__esbuild.initPromise.then(() => {
      setIsLoading(true);
    });
  }, []);

  return [esbuild, isLoading] as const;
};

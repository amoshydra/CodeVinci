import * as esbuild from "esbuild-wasm";
import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";

const esbuildScope = window as unknown as {
  __esbuild: { initPromise: Promise<void> };
};
esbuildScope.__esbuild = esbuildScope.__esbuild || {
  initPromise: esbuild.initialize({
    wasmURL: esbuildWasmUrl,
  }),
};

export { esbuildScope };

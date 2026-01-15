import * as esbuild from "esbuild-wasm";
import { esbuildScope } from "../services/esbuildScope";

export interface EsbuilderOptions {
  target: string
}

export const esbuilderTranform = async (code: string, options: EsbuilderOptions) => {
  await esbuildScope.__esbuild.initPromise;
  const transformedPromiseResult = await esbuild.transform(code, {
    loader: "tsx",
    target: options.target,
    format: "esm",
    platform: "browser",
  });

  return transformedPromiseResult;
};

import * as esbuild from "esbuild-wasm";
import { esbuildScope } from "../services/esbuildScope";

export interface EsbuilderOptions {
  target: string
}

export const esbuilderTranform = async (code: string, options: EsbuilderOptions) => {
  await esbuildScope.__esbuild.initPromise;
  try {
    const transformedPromiseResult = await esbuild.transform(code, {
      loader: "tsx",
      target: options.target,
      format: "esm",
      platform: "browser",
    });
    return transformedPromiseResult;
  } catch (error) {
    // Transform errors (e.g. syntax errors) are raised as exceptions by esbuild-wasm.
    // Convert to a proper result shape so upstream code handles it gracefully.
    const esbuildError = error as Error & { errors?: Array<{ text: string }> };
    return {
      code: '',
      warnings: [],
      errors: esbuildError.errors || [{ text: esbuildError.message || 'Unknown transform error' }],
    };
  }
};

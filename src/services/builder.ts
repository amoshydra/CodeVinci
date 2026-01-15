import { Message } from "esbuild-wasm";
import { useEffect, useState } from "react";
import { esbuilderTranform } from "../utils/esbuilder";
import { useEsbuild } from "./esbuild";

export interface UseBuilderEsbuildOptions {
  target: string
}

export const useBuilder = (code: string, options: UseBuilderEsbuildOptions) => {
  const [esbuild] = useEsbuild();
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<Error | null>(null);
  const [buildErrors, setBuildErrors] = useState<Message[]>([]);
  const [buildWarnings, setBuildWarnings] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      esbuilderTranform(code, options),
    ])
      .then(([transformedPromiseResult, /* buildPromiseResult */]) => {
        const results: string[] = [];
        const buildWarnings: Message[] = [];
        const buildErrors: Message[] = [];
        const errors: Error[] = [];

        if (transformedPromiseResult.status === "fulfilled") {
          results.push(transformedPromiseResult.value.code);
          buildWarnings.push(...transformedPromiseResult.value.warnings);
        } else {
          errors.push(transformedPromiseResult.reason);
        }

        // use previous result if there is no new result
        setResult((previousResult) => results[0] || previousResult);

        // update build warnings and errors
        setBuildWarnings(buildWarnings);
        setBuildErrors(buildErrors);
        setError(errors[0] || null);
      })
      .catch((error) => {
        setError(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [esbuild, code]);

  return [error, isLoading, result, buildWarnings, buildErrors] as const;
};

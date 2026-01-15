import * as esbuild from "esbuild-wasm";
import { useEffect, useState } from "react";
import { esbuildScope } from "./esbuildScope";


export const useEsbuild = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    esbuildScope.__esbuild.initPromise
      .catch((error) => {
        setError(error);
      })
      .finally(() => {
        setIsLoading(false);
      })
    ;
  }, []);

  return [esbuild, isLoading, error] as const;
};

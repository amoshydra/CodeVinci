import { useEffect, useState } from "react";
import { useEsbuild } from "./esbuild";
import { Message } from "esbuild-wasm";

export const useBuilder = (code: string) => {
  const [esbuild] = useEsbuild();
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<Error | null>(null);
  const [buildErrors, setBuildErrors] = useState<Message[]>([]);
  const [buildWarnings, setBuildWarnings] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      esbuild.transform(code, {
        loader: "tsx",
        target: "es2020",
        format: "esm",
        platform: "browser",
      }),
      // esbuild.build({
      //   entryPoints: ["index.ts"],
      //   bundle: true,
      //   write: false,
      //   platform: "browser",
      //   target: "es2020",
      //   loader: {
      //     ".ts": "ts",
      //     ".tsx": "tsx",
      //   },
      //   plugins: [],
      // }),
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

        // if (buildPromiseResult.status === "fulfilled") {
        //   results.push(buildPromiseResult.value.outputFiles[0].text);
        //   buildWarnings.push(...buildPromiseResult.value.warnings);
        //   buildErrors.push(...buildPromiseResult.value.errors);
        // } else {
        //   errors.push(buildPromiseResult.reason);
        // }

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

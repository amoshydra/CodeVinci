import { useState } from "react";

export interface UseSettingsReturn {
  target: string;
};

export const useSettings = () => {
  const [params] = useState(getInitialParams)
  return {
    settings: params,
  };
}

const whiteListedParams = new Set([
  "target",
]);

function getInitialParams (): UseSettingsReturn {
  const params = new URLSearchParams(location.search);
  const result = Object.create(null);
  for (const [key, value] of params.entries()) {
    if (!whiteListedParams.has(key)) {
      continue;
    }
    result[key] = value;
  }
  return Object.freeze({
    target: "esnext",
    ...result,
  });
}

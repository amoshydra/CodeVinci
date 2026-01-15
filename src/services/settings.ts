import { useCallback, useState } from "react";

export type SettingsMode = "view-edit" | "view" | "edit" | "external";

export interface UseSettingsReturn {
  target: string;
  mode: SettingsMode;
};

export const useSettings = () => {
  const [params, setParams] = useState(getInitialParams)

  const updateSetting = useCallback(<K extends keyof UseSettingsReturn>(name: K, value: UseSettingsReturn[K]) => {
    setParams(p => ({
      ...p,
      [name]: value,
    }));
    updateParams(name, value);
  }, []);
  return {
    settings: params,
    updateSetting,
  };
}

const whiteListedParams = new Set([
  "target",
  "mode",
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
    mode: "view-edit",
    ...result,
  });
}


function updateParams (name: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);

  // Update URL
  history.replaceState(null, "", url);
}

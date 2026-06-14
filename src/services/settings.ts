import { useCallback, useState } from "react";

export type SettingsMode = "view-edit" | "view" | "edit" | "ai-chat" | "external";

export interface UseSettingsReturn {
  target: string;
  mode: SettingsMode;
  enableLlm: boolean;
};

export const useSettings = () => {
  const [params, setParams] = useState(getInitialParams)

const URL_PARAM_MAP: Partial<Record<keyof UseSettingsReturn, string>> = {
  enableLlm: "llm",
};

const updateSetting = useCallback(<K extends keyof UseSettingsReturn>(name: K, value: UseSettingsReturn[K]) => {
  setParams(p => ({
    ...p,
    [name]: value,
  }));
  const paramKey = URL_PARAM_MAP[name] ?? name;
  updateParams(paramKey, value as string | boolean);
}, []);
  return {
    settings: params,
    updateSetting,
  };
}

const whiteListedParams = new Set([
  "target",
  "mode",
  "llm",
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
    enableLlm: params.get("llm") === "true",
    ...result,
  });
}


function updateParams (name: string, value: string | boolean) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, String(value).toLowerCase());

  // Update URL
  history.replaceState(null, "", url);
}

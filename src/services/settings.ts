import { useCallback, useState } from "react";

export type SettingsMode = "view-edit" | "view" | "edit" | "ai-chat" | "external";

export interface UseSettingsReturn {
  target: string;
  mode: SettingsMode;
  enableLlm: boolean;
};

const LS_LLM_KEY = 'codevinci-llm-enabled';

export const useSettings = () => {
  const [params, setParams] = useState(getInitialParams)

const updateSetting = useCallback(<K extends keyof UseSettingsReturn>(name: K, value: UseSettingsReturn[K]) => {
  if (name === 'enableLlm') {
    try { localStorage.setItem(LS_LLM_KEY, String(value)); } catch { /* quota exceeded */ }
  }
  setParams(p => ({
    ...p,
    [name]: value,
  }));
  updateParams(name, value as string | boolean);
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
  let mode = (result.mode as SettingsMode) || "view-edit";
  const savedLlm = (() => { try { return localStorage.getItem(LS_LLM_KEY) === 'true'; } catch { return false; } })();
  if (mode === "ai-chat" && !savedLlm) {
    mode = "view-edit";
  }
  return Object.freeze({
    target: "esnext",
    mode,
    enableLlm: savedLlm,
    ...result,
  });
}


function updateParams (name: string, value: string | boolean) {
  if (!whiteListedParams.has(name)) return;
  const url = new URL(window.location.href);
  url.searchParams.set(name, String(value).toLowerCase());

  // Update URL
  history.replaceState(null, "", url);
}

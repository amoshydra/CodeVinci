import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import { useState } from "react";
import { css } from "../../../styled-system/css";

export type UseAnyLoaderMode = "base64" | "url" | "html";

export interface UseAnyLoaderOptions {
  mode: UseAnyLoaderMode
};

const editorConfig = {
  base64: {
    className: css({ maxHeight: "30vh", height: "30vh" }),
    extensions: [EditorView.lineWrapping],
  },
  url: {
    className: css({ maxHeight: "30vh", height: "30vh" }),
    extensions: [EditorView.lineWrapping],
  },
  html: {
    className: css({ maxHeight: "30vh", height: "30vh" }),
    extensions: [html()],
  },
}

export const useAnyLoader = () => {
  const [mode, setMode] = useState<UseAnyLoaderMode>("base64");
  const [value, setValue] = useState("");

  const onModeChange = (newMode: UseAnyLoaderMode) => {
    setMode(newMode);
  }
  const onValueChange = (newValue: string) => {
    setValue(newValue);
  }

  return {
    mode,
    onModeChange,
    value,
    onValueChange,
    editorConfig: editorConfig[mode],
  }
};

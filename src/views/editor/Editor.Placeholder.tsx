import PlaceholderModuleCss from "./Editor.Placeholder.module.css";
import { EditorProps } from "./interface";

export interface PlaceholderEditorProps extends Omit<EditorProps, "onValueChange"> {
  "data-editor": "monaco" | "codemirror"
  onValueChange?: EditorProps["onValueChange"]
}

export const PlaceholderEditor = (p: PlaceholderEditorProps) => {
  return (
    <textarea
      data-editor={p["data-editor"]}
      className={`h-full w-full ${PlaceholderModuleCss.placeholderEditor}`}
      readOnly
      value={p.value}
    />
  )
};

import { css, cx } from "../../../styled-system/css";
import PlaceholderModuleCss from "./Editor.Placeholder.module.css";
import { EditorProps } from "./interface";

export interface PlaceholderEditorProps extends Omit<EditorProps, "onValueChange"> {
  "data-editor": "monaco" | "codemirror"
  onValueChange?: EditorProps["onValueChange"]
  readOnly?: boolean
}

export const PlaceholderEditor = (p: PlaceholderEditorProps) => {
  return (
    <textarea
      data-editor={p["data-editor"]}
      className={cx(PlaceholderModuleCss.placeholderEditor, css({
        width: "full",
        height: "full",
      }))}
      spellCheck={false}
      autoComplete="false"
      autoCorrect="false"
      readOnly={p.readOnly}
      value={p.value}
      onChange={e => p.onValueChange?.(e.currentTarget.value)}
    />
  )
};

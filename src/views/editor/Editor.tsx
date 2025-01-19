import { lazy, Suspense } from 'react';
import { withCn } from "../../utils/tailwind";
import { PlaceholderEditor } from './Editor.Placeholder';
import { EditorProps } from './interface';

const editorPreference = ((): "monaco" | "codemirror" => {
  const params = new URLSearchParams(location.search);
  const editorValue = params.get("editor") ?? "monaco";
  return editorValue === "codemirror" ? "codemirror" : "monaco";
})();

const getPreferredEditor = async () => {
  if (editorPreference === "monaco") {
    return (await import("./Editor.Monaco")).MonacoEditor;
  }
  return (await import("./Editor.CodeMirror")).CodeMirrorEditor
}
// start fetching editor as this module load
const getPreferredEditorPromise = getPreferredEditor().then(component => ({ default: component }));

export const Editor = ({ value, onValueChange, ...props }: EditorProps) => {
  return (
    <div {...withCn(props, "overflow-y-hidden")}>
      <Suspense
        fallback={<PlaceholderEditor data-editor={editorPreference} value={value} />}
      >
        <LaziedEditor
          value={value}
          onValueChange={onValueChange}
        />
      </Suspense>
    </div>
  );
};

const LaziedEditor = lazy(() => getPreferredEditorPromise);

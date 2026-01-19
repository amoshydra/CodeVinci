import { lazy, Suspense } from 'react';
import { css } from '../../../styled-system/css';
import { withCn } from "../../utils/tailwind";
import { PlaceholderEditor } from './Editor.Placeholder';
import { EditorProps } from './interface';

const editorPreference = ((): "monaco" | "codemirror" => {
  const userAgentPreference = matchMedia('(pointer: fine)').matches ? "monaco" : "codemirror";

  const params = new URLSearchParams(location.search);
  const editorValue = params.get("editor") ?? userAgentPreference;
  return editorValue === "codemirror" ? "codemirror" : "monaco";
})();

const getPreferredEditor = async () => {
  // if (editorPreference === "monaco") {
  //   return (await import("./Editor.Monaco")).MonacoEditor;
  // }
  return (await import("./Editor.CodeMirror")).CodeMirrorEditor
}
// start fetching editor as this module load
const getPreferredEditorPromise = getPreferredEditor()
  .then(component => ({ default: component }))
  .catch(e => {
    console.error("Failed to load, loading fallback", e);
    return ({
      default: (p: EditorProps) => <PlaceholderEditor {...p} data-editor={editorPreference} />
    });
  })
  ;

export const Editor = ({ value, onValueChange, ...props }: EditorProps) => {
  return (
    <div {...withCn(props, css({ overflowY: "hidden" }))}>
      <Suspense
        fallback={
          <PlaceholderEditor
            data-editor={editorPreference}
            value={value}
            onValueChange={onValueChange}
          />
        }
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

import ReactMonacoEditor, { MonacoEditorProps } from '@uiw/react-monacoeditor';
import { memo, useRef } from 'react';
import { EditorProps } from './interface';


export const MonacoEditor = memo(({ value, onValueChange }: EditorProps) => {
  const { current: initialValue } = useRef(value);
  return (
    <ReactMonacoEditor
      value={initialValue}
      onChange={(value) => {
        if (!value) return;
        onValueChange(value)
      }}
      options={options}
      language='javascript'
      height="100%"
      width="100%"
    />
  );
});

const options: MonacoEditorProps["options"] = {
  selectOnLineNumbers: true,
  roundedSelection: false,
  readOnly: false,
  cursorStyle: 'line',
  automaticLayout: true,
  theme: 'vs-light',
  scrollbar: {
    // Subtle shadows to the left & top. Defaults to true.
    useShadows: false,
    // Render vertical arrows. Defaults to false.
    verticalHasArrows: true,
    // Render horizontal arrows. Defaults to false.
    horizontalHasArrows: true,
    // Render vertical scrollbar.
    // Accepted values: 'auto', 'visible', 'hidden'.
    // Defaults to 'auto'
    vertical: 'visible',
    // Render horizontal scrollbar.
    // Accepted values: 'auto', 'visible', 'hidden'.
    // Defaults to 'auto'
    horizontal: 'visible',
    verticalScrollbarSize: 17,
    horizontalScrollbarSize: 17,
    arrowSize: 30,
  },
} as const;

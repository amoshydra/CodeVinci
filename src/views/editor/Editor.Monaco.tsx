import ReactMonacoEditor, { MonacoEditorProps } from '@uiw/react-monacoeditor';
import { memo, useMemo, useRef, useState } from 'react';
import { EditorProps } from './interface';


export const MonacoEditor = memo((p: EditorProps) => {
  // @uiw/react-monacoeditor@3.6.0 will cause cursor to be reset when value is changed
  // this useRef retained the `value` prop, prevent the underlying model to be reset.
  //
  // additionally, ReactMonacoEditor's value prop is not strictly operating in controlled mode.
  // It can be used as an uncontrolled prop.
  const { current: initialValue } = useRef(p.value);

  // @uiw/react-monacoeditor@3.6.0 will always call `onChange` with an empty string value `""` on mount
  //
  // this patchignore the first call
  const onValueChange = useIgnoreFirstCall(p.onValueChange);

  return (
    <ReactMonacoEditor
      value={initialValue}
      onChange={onValueChange}
      options={options}
      language='typescript'
      height="100%"
      width="100%"
      onKeyDown={(e) => {
        if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
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

const useIgnoreFirstCall = (onValueChange: (s: string) => void) => {
  const [hasBeenCalled, setHasBeenCalled] = useState(false);

  return useMemo(() => {
    if (!hasBeenCalled) {
      setHasBeenCalled(true);
      return () => {};
    }

    return onValueChange;
  }, [hasBeenCalled, onValueChange])
}

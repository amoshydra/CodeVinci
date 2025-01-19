import { lazy, Suspense } from 'react';
import { withCn } from "../../utils/tailwind";
import { EditorProps } from './interface';

const LaziedCodeMirror = lazy(async () => ({ default: (await import("./Editor.CodeMirror")).CodeMirrorEditor }));
const LaziedMonaco = lazy(async () => ({ default: (await import("./Editor.Monaco")).MonacoEditor }));
const PlaceholderEditor = (p: { value: string }) => <textarea className='h-full w-full' readOnly value={"// Loading editor...\n\n" + p.value} />

const EditorToRender = true ? LaziedMonaco : LaziedCodeMirror;

export const Editor = ({ value, onValueChange, ...props }: EditorProps) => {
  return (
    <div {...withCn(props, "overflow-y-hidden")}>
      <Suspense
        fallback={<PlaceholderEditor value={value} />}
      >
        <EditorToRender
          value={value}
          onValueChange={onValueChange}
        />
      </Suspense>
    </div>
  );
};

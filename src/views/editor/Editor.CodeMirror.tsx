import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { EditorProps } from './interface';

export const CodeMirrorEditor = ({ value, onValueChange }: EditorProps) => {
  return (
    <CodeMirror
      height="100%"
      className='h-full'
      value={value}
      onChange={onValueChange}
      extensions={extensions}
    />
  );
};

const extensions = [
  javascript({ jsx: true }),
];

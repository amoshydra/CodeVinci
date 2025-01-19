import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { HTMLAttributes } from 'react';
import { withCn } from "../../utils/tailwind";

export interface EditorProps extends HTMLAttributes<HTMLDivElement> {
  onValueChange: (value: string) => void;
  value: string;
}

export const Editor = ({ value, onValueChange, ...props }: EditorProps) => {
  return (
    <div {...withCn(props, "overflow-y-hidden")}>
      <CodeMirror
        height="100%"
        className='h-full'
        value={value}
        onChange={onValueChange}
        extensions={extensions}
      />
    </div>
  );
};

const extensions = [javascript({ jsx: true })];

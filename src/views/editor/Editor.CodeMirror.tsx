import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '../../../styled-system/css';
import { EditorProps } from './interface';

export const CodeMirrorEditor = ({ value, onValueChange }: EditorProps) => {
  return (
    <CodeMirror
      height="100%"
      className={css({
        height: 'full',
      })}
      value={value}
      onChange={onValueChange}
      extensions={extensions}
    />
  );
};

const extensions = [
  javascript({ jsx: true }),
];

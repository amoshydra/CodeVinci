import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '../../../styled-system/css';
import { EditorProps } from './interface';
import { javascriptWithHtmlHighlighting } from './javascriptWithHtmlHighlighting';
import { javascript } from '@codemirror/lang-javascript';

export const CodeMirrorEditor = ({ value, onValueChange, readOnly, extensions }: EditorProps) => {
  return (
    <CodeMirror
      height="100%"
      className={css({
        height: 'full',
      })}
      value={value}
      onChange={onValueChange}
      editable={!readOnly}
      extensions={extensions ?? defaultExtensions}
      theme={vscodeDark}
    />
  );
};

const defaultExtensions = [
  javascript({ jsx: true }),
  javascriptWithHtmlHighlighting(),
];

import { InputHTMLAttributes } from "react";

export interface EditorProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const Editor = ({ onValueChange, ...props }: EditorProps) => {
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange?.(e.target.value);
    props.onChange?.(e);
  };
  return <textarea {...props} onChange={onChange} />;
};

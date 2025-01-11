import { InputHTMLAttributes } from "react";
import { withCn } from "../../utils/tailwind";

export interface EditorProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const Editor = ({ onValueChange, ...props }: EditorProps) => {
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange?.(e.target.value);
    props.onChange?.(e);
  };
  return (
    <textarea
      {...withCn(props, "resize-none font-mono whitespace-pre p-2")}
      onChange={onChange}
    />
  );
};

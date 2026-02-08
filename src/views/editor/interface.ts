import { Extension } from "@uiw/react-codemirror";
import { HTMLAttributes } from "react";

export interface EditorProps extends HTMLAttributes<HTMLDivElement> {
  onValueChange: (value: string) => void;
  value: string;
  readOnly?: boolean;
  extensions?: Extension[]
}

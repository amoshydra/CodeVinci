import { HTMLAttributes, useDeferredValue } from "react";
import { Editor } from "../editor/Editor";
import { Viewer } from "../viewer/Viewer";
import { useBuilder } from "./../../services/builder";
import { withCn } from "./../../utils/tailwind";

export interface EntryProps extends HTMLAttributes<HTMLElement> {
  code: string;
  onCodeChange: (code: string) => void;
}

export const Entry = ({ code, onCodeChange, ...props }: EntryProps) => {
  const deferredCode = useDeferredValue(code);

  const [, , result] = useBuilder(deferredCode);

  return (
    <div {...withCn(props, "h-full flex flex-col")}>
      <Placeholder data-placeholder="top-toolbar" />
      <div
        {...withCn(props, "grid min-h-0 flex-1")}
        style={{
          gridTemplateColumns: "min-content 1fr 1fr",
        }}
      >
        <Placeholder
          data-placeholder="sidebar"
          className="resize-x overflow-auto"
        />

        <Viewer className="w-full h-full" script={result} />
        <Editor
          className="w-full h-full"
          value={code}
          onValueChange={(code) => {
            onCodeChange(code);
          }}
        />
      </div>
      <Placeholder
        data-placeholder="bottom-toolbar"
        className="resize-y overflow-auto"
      />
    </div>
  );
};

const Placeholder = (props: HTMLAttributes<HTMLDivElement>) => {
  return <div {...withCn(props, "border-2 p-4")} />;
};


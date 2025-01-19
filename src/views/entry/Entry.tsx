import { HTMLAttributes, useCallback, useDeferredValue, useState } from "react";
import { Editor } from "../editor/Editor";
import { FrameMessage } from "../viewer/interface";
import { Viewer } from "../viewer/Viewer";
import { withCn } from "./../../utils/tailwind";

export interface EntryProps extends HTMLAttributes<HTMLElement> {
  code: string;
  onCodeChange: (code: string) => void;
}

export const Entry = ({ code, onCodeChange, ...props }: EntryProps) => {
  const deferredCode = useDeferredValue(code);

  const [logs, setLogs] = useState<FrameMessage[]>([]);

  const onFrameMessage = useCallback((frameMessage: FrameMessage) => {
    setLogs(l => [...l, frameMessage]);
  }, []);

  return (
    <div {...withCn(props, "h-full flex flex-col")}>
      <Placeholder data-placeholder="top-toolbar" />
      <div className="entry-content-grid flex-1">
        <Placeholder
          data-placeholder="sidebar"
          data-grid-area="sidebar"
          className="resize-x overflow-auto"
        />
        <Viewer
          className="w-full h-full"
          code={deferredCode}
          data-grid-area="viewer"
          onFrameMessage={onFrameMessage}
        />
        <div
          style={{ paddingTop: 1, paddingLeft: 1 }}
          className="w-full h-full bg-black"
          data-grid-area="divider"
        />
        <Editor
          className="w-full h-full"
          value={code}
          onValueChange={onCodeChange}
          data-grid-area="editor"
        />
      </div>
      <Placeholder
        data-placeholder="bottom-toolbar"
        className="resize-y overflow-auto"
      >
        {logs.map((l, i) => <div key={i}>{JSON.stringify(l)}</div>)}
      </Placeholder>
    </div>
  );
};

const Placeholder = (props: HTMLAttributes<HTMLDivElement>) => {
  return <div {...withCn(props, "border-2 p-4")} />;
};


import { HTMLAttributes, useDeferredValue } from "react";
import { useSettings } from "../../services/settings";
import { useLogger } from "../../services/useLogger";
import { Editor } from "../editor/Editor";
import { Log } from "../log/Log";
import { Viewer } from "../viewer/Viewer";
import { withCn } from "./../../utils/tailwind";

export interface EntryProps extends HTMLAttributes<HTMLElement> {
  code: string;
  onCodeChange: (code: string) => void;
}

export const Entry = ({ code, onCodeChange, ...props }: EntryProps) => {
  const deferredCode = useDeferredValue(code);
  const { settings } = useSettings();

  const { logs, onFrameMessage, resetLog } = useLogger(deferredCode);

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
          esbuildOptions={settings}
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
        <Log
          data-placeholder="bottom-toolbar"
          data-grid-area="bottom"
          className="resize-y overflow-auto"
          logs={logs}
          onClear={resetLog}
        />
      </div>
    </div>
  );
};

const Placeholder = (props: HTMLAttributes<HTMLDivElement>) => {
  return <div {...withCn(props, "border-2 p-4")} />;
};

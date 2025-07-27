import { HTMLAttributes, useDeferredValue } from "react";
import { UseSettingsReturn } from "../../services/settings";
import { useLogger } from "../../services/useLogger";
import { Editor } from "../editor/Editor";
import { Log } from "../log/Log";
import { TopBar } from "../top-bar/TopBar";
import { Viewer } from "../viewer/Viewer";
import { withCn } from "./../../utils/tailwind";

export interface EntryProps extends HTMLAttributes<HTMLElement> {
  code: string;
  onCodeChange: (code: string) => void;
  settings: UseSettingsReturn;
  onSettingUpdate: <K extends keyof UseSettingsReturn>(name: K, value: UseSettingsReturn[K]) => void,
}

export const Entry = ({ code, onCodeChange, settings, onSettingUpdate, ...props }: EntryProps) => {
  const deferredCode = useDeferredValue(code);
  const { logs, onFrameMessage, resetLog } = useLogger(deferredCode);

  return (
    <div {...withCn(props, "h-full flex flex-col")}>
      <TopBar
        viewMode={settings.mode}
        onViewModeChange={(newViewMode) => {
          onSettingUpdate("mode", newViewMode);
        }}
      />
      <div
        className="entry-content-grid flex-1"
        data-mode={settings.mode}
      >
        <Placeholder
          data-placeholder="sidebar"
          data-grid-area="sidebar"
          className="resize-x overflow-auto"
        />
        {
          settings.mode.includes("view") && (
            <Viewer
              className="w-full h-full"
              code={deferredCode}
              esbuildOptions={settings}
              data-grid-area="viewer"
              onFrameMessage={onFrameMessage}
            />
          )
        }
        {
          settings.mode.includes("-") && (
            <div
              style={{ paddingTop: 1, paddingLeft: 1 }}
              className="w-full h-full bg-black"
              data-grid-area="divider"
            />
          )
        }
        {
          settings.mode.includes("edit") && (
            <>
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
            </>
          )
        }
      </div>
    </div>
  );
};

const Placeholder = (props: HTMLAttributes<HTMLDivElement>) => {
  return <div {...withCn(props, "border-2 p-4")} />;
};

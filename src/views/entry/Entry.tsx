import { HTMLAttributes, useDeferredValue } from "react";
import { css, cx } from "../../../styled-system/css";
import { styled } from "../../../styled-system/jsx";
import { UseSettingsReturn } from "../../services/settings";
import { useLogger } from "../../services/useLogger";
import { esbuildLaunchInNewWindow } from "../../utils/esbuilder.opener";
import { withCn } from "../../utils/tailwind";
import { Editor } from "../editor/Editor";
import { Log } from "../log/Log";
import { TopBar } from "../top-bar/TopBar";
import { Viewer } from "../viewer/Viewer";

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
    <div
      {...withCn(props, css({
        height: "full",
        display: 'flex',
        flexDirection: "column",
      }))}
    >
      <TopBar
        viewMode={settings.mode}
        onViewModeChange={(newViewMode) => {
          if (newViewMode === "external") {
            esbuildLaunchInNewWindow(deferredCode, settings);
            return;
          }
          onSettingUpdate("mode", newViewMode);
        }}
      />
      <div
        className={cx("entry-content-grid", css({
          flex: "1",
          borderBottomWidth: 1,
          borderColor: "slate.300",
        }))}
        data-mode={settings.mode}
      >
        {
          settings.mode.includes("view") && (
            <Viewer
              className={css({
                height: 'full',
                width: 'full',
                resize: 'both',
              })}
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
              className={css({
                width: 'full',
                height: 'full',
                background: "slate.300"
              })}
              style={{ paddingTop: 1, paddingLeft: 1 }} data-grid-area="divider" />
          )
        }
        {
          settings.mode.includes("edit") && (
            <>
              <Placeholder data-placeholder="sidebar" data-grid-area="sidebar"
                className={css({
                  resize: 'horizontal',
                  overflow: 'auto',
                  borderRightWidth: 1,
                  p: 0,

                })}
              />
              <Editor
                className={css({
                  height: 'full',
                  width: 'full',
                })}
                value={code}
                onValueChange={onCodeChange}
                data-grid-area="editor"
              />
              <Log
                data-placeholder="bottom-toolbar"
                data-grid-area="bottom"
                className={css({
                  resize: 'vertical',
                  overflow: 'auto',
                  borderTopWidth: 1,
                  borderColor: "slate.300",
                })}
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


const Placeholder = styled('div', {
  base: {
    borderColor: "slate.300",
    p: '4',
  },
});

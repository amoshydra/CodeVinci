import { HTMLAttributes, useDeferredValue } from "react";
import { css } from "../../../styled-system/css";
import { styled } from "../../../styled-system/jsx";
import { EntryContentGrid, A as GridArea } from "../../components/EntryContentGrid";
import { UseSettingsReturn } from "../../services/settings";
import { useLogger } from "../../services/useLogger";
import { esbuildLaunchInNewWindow } from "../../utils/esbuilder.opener";
import { withCn } from "../../utils/tailwind";
import { BottomBar } from "../bottom-bar/BottomBar";
import { Editor } from "../editor/Editor";
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
  const { logs, onFrameMessage, resetLog, counts } = useLogger(deferredCode);

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
            esbuildLaunchInNewWindow(deferredCode, settings)
              .catch(e => {
                alert("Unable to open. See error: " + e.message);
              })
              ;
            return;
          }
          onSettingUpdate("mode", newViewMode);
        }}
      />
      <EntryContentGrid
        className={css({
          flex: "1",
        })}
        mode={settings.mode}
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
              data-grid-area={GridArea.viewer_}
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
                background: "stone.950"
              })}
              style={{ paddingTop: 1, paddingLeft: 1 }} data-grid-area={GridArea.divider} />
          )
        }
        {
          settings.mode.includes("edit") && (
            <>
              <Placeholder data-placeholder="sidebar" data-grid-area={GridArea.sidebar}
                className={css({
                  resize: 'horizontal',
                  background: "stone.950",
                  overflow: 'auto',
                  display: 'none'
                })}
              />
              <Editor
                className={css({
                  height: 'full',
                  width: 'full',
                })}
                value={code}
                onValueChange={onCodeChange}
                data-grid-area={GridArea.editor_}
              />
              <BottomBar
                data-placeholder="bottom-toolbar"
                data-grid-area={GridArea.bottom_}
                className={css({
                  background: 'stone.950',
                })}
                logs={logs}
                counts={counts}
                onClear={resetLog}
              />
            </>
          )
        }
      </EntryContentGrid>
    </div>
  );
};


const Placeholder = styled('div', {
  base: {
    p: '4',
  },
});

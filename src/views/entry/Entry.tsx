import { HTMLAttributes, lazy, Suspense, useCallback, useDeferredValue, useState } from "react";
import { css } from "../../../styled-system/css";
import { EntryContentGrid, A as GridArea } from "../../components/EntryContentGrid";
import { Dialog } from "../../components/Dialog";
import { useLlmChat } from "../../services/llm";
import { SettingsMode, UseSettingsReturn } from "../../services/settings";
import { useLogger } from "../../services/useLogger";
import { esbuildLaunchInNewWindow } from "../../utils/esbuilder.opener";
import { withCn } from "../../utils/tailwind";
import { BottomBar } from "../bottom-bar/BottomBar";
import { Editor } from "../editor/Editor";
import { TopBar } from "../top-bar/TopBar";
import { Viewer } from "../viewer/Viewer";
import { LlmSettings } from "../llm/LlmSettings";

const LLMPanel = lazy(() => import("../llm/LLMPanel"));

export interface EntryProps extends HTMLAttributes<HTMLElement> {
  code: string;
  onCodeChange: (code: string) => void;
  settings: UseSettingsReturn;
  onSettingUpdate: <K extends keyof UseSettingsReturn>(name: K, value: UseSettingsReturn[K]) => void,
}

export const Entry = ({ code, onCodeChange, settings, onSettingUpdate, ...props }: EntryProps) => {
  const deferredCode = useDeferredValue(code);
  const { logs, onFrameMessage, resetLog, counts } = useLogger(deferredCode);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    status,
    streamingText,
    messages,
    lastError,
    pendingCode,
    send,
    acceptCode,
    rejectCode,
    clear,
    isConfigured,
  } = useLlmChat();

  const isAiChatMode = settings.mode === 'ai-chat';
  const previewCode = pendingCode ?? deferredCode;
  const showPendingLabel = !!pendingCode && !isAiChatMode;

  const aiDotState = !isConfigured ? 'hidden' :
    status === 'error' ? 'error' :
    status === 'streaming' ? 'streaming' :
    pendingCode ? 'pending' :
    'hidden';

  const handleViewModeChange = useCallback((newViewMode: string) => {
    if (newViewMode === "external") {
      esbuildLaunchInNewWindow(deferredCode, settings)
        .catch(e => {
          alert("Unable to open. See error: " + e.message);
        });
      return;
    }
    onSettingUpdate("mode", newViewMode as SettingsMode);
  }, [onSettingUpdate, deferredCode, settings]);

  const handleLLMCodeChange = useCallback((pendingCode: string) => {
    onCodeChange(pendingCode);
  }, [onCodeChange]);

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
        onViewModeChange={handleViewModeChange}
        onSettingsClick={() => setSettingsOpen(true)}
        enableLlm={settings.enableLlm}
        aiDotState={aiDotState}
      />
      <EntryContentGrid
        className={css({
          flex: "1",
        })}
        mode={settings.mode}
      >
        {/* Viewer — shown in view, view-edit, and ai-chat modes */}
        {(settings.mode.includes("view") || isAiChatMode) && (
          <div
            className={css({
              position: 'relative',
              height: 'full',
              width: 'full',
            })}
            data-grid-area={GridArea.viewer_}
          >
            <Viewer
              className={css({
                height: 'full',
                width: 'full',
                resize: 'both',
              })}
              code={previewCode}
              esbuildOptions={settings}
              onFrameMessage={onFrameMessage}
            />
            {showPendingLabel && (
              <div className={css({
                position: 'absolute',
                top: '2',
                right: '2',
                px: '2',
                py: '0.5',
                borderRadius: 'sm',
                fontSize: 'xs',
                fontFamily: 'mono',
                bg: 'amber.900/40',
                color: 'amber.300',
                border: '1px solid',
                borderColor: 'amber.700/40',
                pointerEvents: 'none',
                zIndex: '10',
              })}>
                Pending preview
              </div>
            )}
          </div>
        )}

        {/* Divider — only in view-edit mode */}
        {settings.mode === "view-edit" && (
          <div
            className={css({
              width: 'full',
              height: 'full',
              background: "stone.950"
            })}
            style={{ paddingTop: 1, paddingLeft: 1 }}
            data-grid-area={GridArea.divider}
          />
        )}

        {/* Editor — shown in edit and view-edit modes */}
        {settings.mode.includes("edit") && (
          <Editor
            className={css({
              height: 'full',
              width: 'full',
            })}
            value={code}
            onValueChange={onCodeChange}
            data-grid-area={GridArea.editor_}
          />
        )}

        {/* Bottom bar — shown in edit/view-edit and ai-chat modes */}
        {(settings.mode.includes("edit") || isAiChatMode) && (
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
        )}

        {/* AI Chat panel — rendered inside grid in ai-chat mode */}
        {settings.enableLlm && isAiChatMode && (
          <Suspense fallback={null}>
            <LLMPanel
              code={code}
              onCodeChange={handleLLMCodeChange}
              onSettingsClick={() => setSettingsOpen(true)}
              errorCount={counts.error}
              status={status}
              streamingText={streamingText}
              messages={messages}
              lastError={lastError}
              pendingCode={pendingCode}
              send={send}
              acceptCode={acceptCode}
              rejectCode={rejectCode}
              clear={clear}
              isConfigured={isConfigured}
              data-grid-area={GridArea.chat_}
            />
          </Suspense>
        )}
      </EntryContentGrid>

      {/* Settings dialog */}
      <Dialog
        id="app-settings"
        title="Settings"
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      >
        <LlmSettings
          enableLlm={settings.enableLlm}
          onEnableLlmChange={(v) => onSettingUpdate("enableLlm", v)}
          onClose={() => setSettingsOpen(false)}
        />
      </Dialog>
    </div>
  );
};

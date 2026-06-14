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

  const handleAiPillClick = useCallback(() => {
    if (!isConfigured) {
      setSettingsOpen(true);
      return;
    }
    onSettingUpdate("mode", "ai-chat");
  }, [onSettingUpdate, isConfigured]);

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

      {/* Collapsed AI pill — in non-ai-chat modes when LLM is enabled */}
      {settings.enableLlm && !isAiChatMode && (
        <div
          onClick={handleAiPillClick}
          className={css({
            position: 'fixed',
            bottom: settings.mode.includes('edit') ? '48px' : '0',
            left: '0',
            right: '0',
            zIndex: '100',
            bg: 'stone.800',
            borderTop: '1px solid',
            borderColor: 'stone.700',
            color: 'stone.400',
            fontSize: 'sm',
            px: '4',
            py: '2.5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            _hover: { bg: 'stone.700' },
            transition: 'background 0.15s',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={css({ flexShrink: '0', color: 'stone.500' })}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className={css({ flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>
            {status === 'streaming' ? 'AI is generating...' :
             showPendingLabel ? 'Code pending review — open AI Chat' :
             isConfigured ? 'Ask AI to write or modify code...' :
             'Configure AI in Settings'}
          </span>
          {aiDotState !== 'hidden' && (
            <span className={css({
              width: '6px',
              height: '6px',
              borderRadius: 'full',
              flexShrink: '0',
              ...(aiDotState === 'streaming'
                ? { bg: 'amber.400', animation: 'pulse 1s ease-in-out infinite' }
                : aiDotState === 'pending'
                  ? { bg: 'amber.400' }
                  : { bg: 'red.400', animation: 'pulse 1s ease-in-out infinite' }
              ),
            })} />
          )}
          {!isConfigured && (
            <span className={css({
              fontSize: 'xs',
              px: '1.5',
              py: '0.5',
              borderRadius: 'sm',
              bg: 'amber.900/30',
              color: 'amber.400',
            })}>
              Not configured
            </span>
          )}
        </div>
      )}

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

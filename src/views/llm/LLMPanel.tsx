import { useCallback, useEffect, useRef, useState } from "react";
import { css } from "../../../styled-system/css";
import { ActionButton } from "../../components/ActionButton";
import { Dialog } from "../../components/Dialog";
import { useLlmChat } from "../../services/llm";
import { LlmSettings } from "./LlmSettings";

interface PromptingViewProps {
  enableLlm: boolean;
  onEnableLlmChange: (enabled: boolean) => void;
  errorCount?: number;
}

const PromptingView = ({ enableLlm, onEnableLlmChange, errorCount = 0 }: PromptingViewProps) => {
  const { status, streamingText, messages, lastError, send, clear, isConfigured } = useLlmChat();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"auto" | "create" | "edit">("auto");
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasOutput = messages.length > 0 || !!streamingText || !!lastError;
  const canSend = input.trim() && status !== "streaming" && isConfigured;

  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, expanded]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    send(input.trim());
    setInput("");
  }, [input, canSend, send]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setExpanded(false);
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }, []);

  const handleModeClick = useCallback((m: "auto" | "create" | "edit") => {
    setMode(m);
  }, []);

  const contextTags = [
    errorCount > 0 && { label: `${errorCount} error${errorCount > 1 ? 's' : ''}`, variant: 'error' as const },
  ].filter(Boolean);

  return (
    <>
      {/* Collapsed pill */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          className={css({
            position: 'fixed',
            bottom: '0',
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
            {isConfigured ? "Ask AI to create or edit code..." : "Configure AI in Settings"}
          </span>
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

      {/* Expanded sheet overlay */}
      {expanded && (
        <>
          <div
            onClick={() => setExpanded(false)}
            className={css({
              position: 'fixed',
              inset: '0',
              zIndex: '99',
              bg: 'rgba(0,0,0,0.4)',
            })}
          />
          <div className={css({
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            zIndex: '100',
            bg: 'stone.900',
            borderTop: '1px solid',
            borderColor: 'stone.700',
            display: 'flex',
            flexDirection: 'column',
            maxH: '70vh',
            transform: 'translateY(0)',
            transition: 'transform 0.2s ease-out',
          })}>
            {/* Handle */}
            <div
              onClick={() => setExpanded(false)}
              className={css({
                display: 'flex',
                justifyContent: 'center',
                py: '1.5',
                cursor: 'pointer',
                flexShrink: '0',
                _hover: { bg: 'stone.800' },
              })}
            >
              <div className={css({
                w: '8',
                h: '1',
                bg: 'stone.600',
                borderRadius: 'full',
              })} />
            </div>

            {/* Header row */}
            <div className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: '4',
              pb: '2',
              flexShrink: '0',
            })}>
              <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'stone.200' })}>
                AI Prompt
              </span>
              <div className={css({ display: 'flex', gap: '1' })}>
                {hasOutput && (
                  <ActionButton size="xs" visual="secondary" onClick={clear}>
                    Clear
                  </ActionButton>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className={css({
                    background: 'none',
                    border: 'none',
                    color: 'stone.400',
                    cursor: 'pointer',
                    p: '1',
                    borderRadius: 'md',
                    display: 'grid',
                    placeItems: 'center',
                    _hover: { color: 'stone.200', bg: 'stone.800' },
                  })}
                  aria-label="AI Settings"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mode chips */}
            <div className={css({ px: '4', pb: '2', display: 'flex', gap: '1.5', flexShrink: '0' })}>
              {(["auto", "create", "edit"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeClick(m)}
                  className={css({
                    px: '2.5',
                    py: '1',
                    borderRadius: 'md',
                    fontSize: 'xs',
                    fontWeight: 'medium',
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.15s',
                    letterSpacing: '0.02em',
                    ...(mode === m
                      ? { bg: 'blue.500/20', color: 'blue.300', borderColor: 'blue.500/40' }
                      : { bg: 'transparent', color: 'stone.400', borderColor: 'stone.700', _hover: { color: 'stone.200', borderColor: 'stone.600' } }
                    ),
                  })}
                >
                  {m === 'auto' ? 'Auto' : m === 'create' ? 'Create' : 'Edit'}
                </button>
              ))}
            </div>

            {/* Context tags */}
            {contextTags.length > 0 && (
              <div className={css({ px: '4', pb: '2', display: 'flex', gap: '1.5', flexWrap: 'wrap', flexShrink: '0' })}>
                {contextTags.map((tag, i) => (
                  <span
                    key={i}
                    className={css({
                      px: '1.5',
                      py: '0.5',
                      borderRadius: 'sm',
                      fontSize: 'xs',
                      fontFamily: 'mono',
                      letterSpacing: '0.01em',
                      ...(tag.variant === 'error'
                        ? { bg: 'red.900/30', color: 'red.400' }
                        : { bg: 'stone.800', color: 'stone.400' }
                      ),
                    })}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}

            {/* Input area — at the TOP of the sheet */}
            <div className={css({
              px: '4',
              pb: '2',
              display: 'flex',
              gap: '2',
              alignItems: 'flex-end',
              flexShrink: '0',
            })}>
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={status === 'streaming' || !isConfigured}
                placeholder={
                  !isConfigured
                    ? 'Configure AI in settings...'
                    : status === 'streaming'
                      ? 'Waiting for response...'
                      : 'Ask AI to create or edit code... (Cmd+Enter to send)'
                }
                rows={1}
                className={css({
                  flex: '1',
                  px: '3',
                  py: '2',
                  borderRadius: 'md',
                  border: '1px solid',
                  borderColor: 'stone.600',
                  background: 'stone.800',
                  color: 'stone.100',
                  fontSize: 'sm',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  maxH: '24',
                  lineHeight: '1.4',
                  '&:focus': {
                    borderColor: 'sky.500',
                  },
                  '&:disabled': {
                    opacity: '0.5',
                    cursor: 'not-allowed',
                  },
                  '&::placeholder': {
                    color: 'stone.500',
                  },
                })}
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={css({
                  px: '3',
                  py: '2',
                  borderRadius: 'md',
                  border: 'none',
                  background: canSend ? 'sky.600' : 'stone.700',
                  color: canSend ? 'white' : 'stone.500',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  transition: 'background 0.15s',
                  flexShrink: '0',
                  display: 'grid',
                  placeItems: 'center',
                  _hover: canSend ? { bg: 'sky.500' } : undefined,
                })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>

            {/* Output area */}
            <div className={css({
              flex: '1',
              overflowY: 'auto',
              px: '4',
              pb: '3',
              minH: '0',
              borderTop: hasOutput ? '1px solid' : 'none',
              borderColor: 'stone.800',
            })}>
              {!hasOutput && (
                <div className={css({
                  py: '4',
                  textAlign: 'center',
                  fontSize: 'sm',
                  color: 'stone.600',
                })}>
                  {isConfigured
                    ? 'Your AI response will appear here'
                    : 'Configure AI in Settings to get started'}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={css({
                  py: '2',
                  borderBottom: i < messages.length - 1 ? '1px solid' : 'none',
                  borderColor: 'stone.800',
                })}>
                  <div className={css({
                    fontSize: 'xs',
                    color: msg.role === 'user' ? 'sky.400' : 'stone.500',
                    mb: '1',
                    fontFamily: 'mono',
                    letterSpacing: '0.02em',
                  })}>
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </div>
                  <div className={css({
                    fontSize: 'sm',
                    color: msg.role === 'user' ? 'stone.200' : 'stone.300',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                    fontFamily: msg.role === 'assistant' ? 'mono' : 'inherit',
                    fontSize: msg.role === 'assistant' ? 'xs' : 'sm',
                    '& code': {
                      background: 'stone.950',
                      px: '1',
                      py: '0.5',
                      borderRadius: '4',
                      fontSize: 'xs',
                    },
                    '& pre': {
                      background: 'stone.950',
                      p: '2',
                      borderRadius: 'md',
                      overflowX: 'auto',
                      my: '1',
                    },
                    '& pre code': {
                      background: 'none',
                      p: '0',
                    },
                  })}>
                    {msg.role === 'user' ? msg.content : formatOutput(msg.content)}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className={css({ py: '2' })}>
                  <div className={css({
                    fontSize: 'xs',
                    color: 'stone.500',
                    mb: '1',
                    fontFamily: 'mono',
                    letterSpacing: '0.02em',
                  })}>
                    AI
                    <span className={css({
                      ml: '1.5',
                      color: 'amber.400',
                      fontSize: 'xs',
                    })}>streaming...</span>
                  </div>
                  <div className={css({
                    fontSize: 'xs',
                    color: 'stone.300',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                    fontFamily: 'mono',
                    '& code': {
                      background: 'stone.950',
                      px: '1',
                      py: '0.5',
                      borderRadius: '4',
                    },
                    '& pre': {
                      background: 'stone.950',
                      p: '2',
                      borderRadius: 'md',
                      overflowX: 'auto',
                      my: '1',
                    },
                    '& pre code': {
                      background: 'none',
                      p: '0',
                    },
                  })}>
                    {formatOutput(streamingText)}
                  </div>
                </div>
              )}

              {lastError && (
                <div className={css({
                  py: '2',
                  fontSize: 'sm',
                  color: 'red.400',
                })}>
                  {lastError}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </>
      )}

      {/* Settings dialog */}
      <Dialog
        id="llm-settings"
        title="AI Settings"
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      >
        <LlmSettings
          enableLlm={enableLlm}
          onEnableLlmChange={onEnableLlmChange}
          onClose={() => setShowSettings(false)}
        />
      </Dialog>
    </>
  );
};

function formatOutput(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default PromptingView;

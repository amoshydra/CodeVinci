import { useCallback, useEffect, useRef, useState } from "react";
import { css } from "../../../styled-system/css";
import type { ChatMessage } from "../../services/llm";
import type { LlmStatus } from "../../services/llm";

export interface LLMPanelProps {
  onCodeChange?: (code: string) => void;
  onSettingsClick: () => void;
  errorCount?: number;
  status: LlmStatus;
  streamingText: string;
  messages: ChatMessage[];
  lastError: string | null;
  pendingCode: string | null;
  send: (userMessage: string) => void;
  acceptCode: (onCodeChange?: (code: string) => void) => void;
  rejectCode: () => void;
  clear: () => void;
  isConfigured: boolean;
}

const LLMPanel = ({
  onCodeChange,
  onSettingsClick,
  errorCount = 0,
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
}: LLMPanelProps) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasOutput = messages.length > 0 || !!streamingText || !!lastError || !!pendingCode;

  const canSend = input.trim() && status !== "streaming" && isConfigured;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

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
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }, []);

  const contextTags: { label: string; variant: 'error' }[] = [];
  if (errorCount > 0) {
    contextTags.push({ label: `${errorCount} error${errorCount > 1 ? 's' : ''}`, variant: 'error' });
  }

  return (
    <div className={css({
      display: 'flex',
      flexDirection: 'column',
      height: 'full',
      bg: 'stone.900',
      overflow: 'hidden',
    })}>
      {/* Header */}
      <div className={css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: '3',
        py: '2',
        flexShrink: '0',
        borderBottom: '1px solid',
        borderColor: 'stone.800',
        gap: '2',
      })}>
        <div className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '2',
        })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={css({ color: 'stone.400' })}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className={css({ fontSize: 'sm', fontWeight: 'semibold', color: 'stone.200' })}>
            AI Chat
          </span>
          {status === 'streaming' && (
            <span className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1.5',
              fontSize: 'xs',
              color: 'amber.400',
            })}>
              <span className={css({
                width: '6px',
                height: '6px',
                borderRadius: 'full',
                bg: 'amber.400',
                animation: 'pulse 1s ease-in-out infinite',
              })} />
              generating code...
            </span>
          )}
          {pendingCode && status !== 'streaming' && (
            <span className={css({
              width: '6px',
              height: '6px',
              borderRadius: 'full',
              bg: 'amber.400',
              flexShrink: '0',
            })} />
          )}
          {contextTags.length > 0 && contextTags.map((tag, i) => (
            <span key={i} className={css({
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
            })}>
              {tag.label}
            </span>
          ))}
        </div>
        <div className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
          {hasOutput && (
            <button
              onClick={clear}
              className={css({
                background: 'none',
                border: 'none',
                color: 'stone.500',
                cursor: 'pointer',
                px: '1.5',
                py: '0.5',
                borderRadius: 'md',
                fontSize: 'xs',
                _hover: { color: 'stone.200', bg: 'stone.800' },
              })}
            >
              Clear
            </button>
          )}
          <button
            onClick={onSettingsClick}
            className={css({
              background: 'none',
              border: 'none',
              color: 'stone.500',
              cursor: 'pointer',
              p: '1',
              borderRadius: 'md',
              display: 'grid',
              placeItems: 'center',
              _hover: { color: 'stone.200', bg: 'stone.800' },
            })}
            aria-label="AI Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={css({
        flex: '1',
        overflowY: 'auto',
        px: '3',
        py: '2',
        minH: '0',
      })}>
        {!hasOutput && (
          <div className={css({
            py: '8',
            textAlign: 'center',
            fontSize: 'sm',
            color: 'stone.600',
          })}>
            {isConfigured
              ? 'Ask AI to write or modify code...'
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
              color: msg.role === 'user' ? 'stone.200' : 'stone.300',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
              fontFamily: msg.role === 'assistant' ? 'mono' : 'inherit',
              fontSize: msg.role === 'assistant' ? 'xs' : 'sm',
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
            </div>
            <div className={css({
              fontSize: 'xs',
              color: 'stone.300',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
              fontFamily: 'mono',
            })}>
              {formatOutput(streamingText)}
            </div>
          </div>
        )}

        {pendingCode && (
          <div className={css({
            py: '2',
            px: '3',
            mt: '2',
            borderRadius: 'md',
            bg: 'emerald.900/20',
            border: '1px solid',
            borderColor: 'emerald.700/40',
          })}>
            <div className={css({
              fontSize: 'xs',
              color: 'emerald.400',
              mb: '1.5',
              fontFamily: 'mono',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            })}>
              Code generated — review below
            </div>
            <pre className={css({
              fontSize: 'xs',
              fontFamily: 'mono',
              color: 'stone.200',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
              bg: 'stone.950',
              p: '2',
              borderRadius: 'md',
              maxH: '36',
              overflowY: 'auto',
              mb: '2',
            })}>
              {formatOutput(pendingCode.slice(0, 1000))}
              {pendingCode.length > 1000 && (
                <span className={css({ color: 'stone.500' })}>
                  {'\n'}... ({pendingCode.length - 1000} more chars)
                </span>
              )}
            </pre>
            <div className={css({ display: 'flex', gap: '2' })}>
              <button
                onClick={() => acceptCode(onCodeChange)}
                className={css({
                  px: '3',
                  py: '1.5',
                  borderRadius: 'md',
                  border: 'none',
                  bg: 'emerald.600',
                  color: 'white',
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  cursor: 'pointer',
                  _hover: { bg: 'emerald.500' },
                })}
              >
                Accept code
              </button>
              <button
                onClick={rejectCode}
                className={css({
                  px: '3',
                  py: '1.5',
                  borderRadius: 'md',
                  border: '1px solid',
                  borderColor: 'stone.600',
                  bg: 'transparent',
                  color: 'stone.400',
                  fontSize: 'sm',
                  cursor: 'pointer',
                  _hover: { bg: 'stone.800', color: 'stone.200' },
                })}
              >
                Reject
              </button>
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

      {/* Input at bottom */}
      <div className={css({
        px: '3',
        py: '2',
        display: 'flex',
        gap: '2',
        alignItems: 'flex-end',
        flexShrink: '0',
        borderTop: '1px solid',
        borderColor: 'stone.800',
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
                : 'Ask AI to write code... (Cmd+Enter to send)'
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

    </div>
  );
};

function formatOutput(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default LLMPanel;

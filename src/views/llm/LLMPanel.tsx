import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { css } from "../../../styled-system/css";
import { ActionButton } from "../../components/ActionButton";
import { ChatBubble, SettingsGear, SendArrow } from "../../components/Icons";
import { Dialog } from "../../components/Dialog";
import { useLlmChat, type LlmStatus } from "../../services/llm";

export interface LLMPanelProps {
  code?: string;
  onCodeChange?: (code: string) => void;
  onSettingsClick: () => void;
  errorCount?: number;
  errorContext?: string;
  onStatusChange?: (status: LlmStatus) => void;
  onPendingCodeChange?: (code: string | null) => void;
  onConfiguredChange?: (configured: boolean) => void;
}

const LLMPanel = ({
  code,
  onCodeChange,
  onSettingsClick,
  errorCount = 0,
  errorContext = '',
  onStatusChange,
  onPendingCodeChange,
  onConfiguredChange,
}: LLMPanelProps) => {
  const {
    status,
    streamingText,
    reasoningText,
    messages,
    lastError,
    pendingCode,
    send,
    acceptCode,
    rejectCode,
    clear,
    isConfigured,
  } = useLlmChat();

  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);
  useEffect(() => { onPendingCodeChange?.(pendingCode); }, [pendingCode, onPendingCodeChange]);
  useEffect(() => { onConfiguredChange?.(isConfigured); }, [isConfigured, onConfiguredChange]);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const codeSnapshotRef = useRef<string | null>(null);
  const [showDivergentWarning, setShowDivergentWarning] = useState(false);

  const hasOutput = messages.length > 0 || !!streamingText || !!reasoningText || !!lastError || !!pendingCode;

  const canSend = input.trim() && status !== "streaming" && isConfigured;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, reasoningText]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    codeSnapshotRef.current = code ?? null;
    const options: { code?: string; errors?: string } = { code };
    if (errorContext) {
      options.errors = errorContext;
    }
    send(input.trim(), options);
    setInput("");
  }, [input, canSend, send, code, errorContext]);

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
          <ChatBubble className={css({ color: 'stone.400' })} />
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
            <ActionButton size="xs" visual="secondary" onClick={clear}>
              Clear
            </ActionButton>
          )}
          <ActionButton
            size="sm"
            outline={false}
            onClick={onSettingsClick}
            aria-label="AI Settings"
            className={css({ display: 'grid', placeItems: 'center' })}
          >
            <SettingsGear />
          </ActionButton>
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
              fontFamily: msg.role === 'assistant' ? 'inherit' : 'inherit',
              fontSize: 'sm',
            })}>
              {msg.role === 'user' ? msg.content : (
                <>
                  {(msg as any).reasoning && (
                    <div className={css({
                      fontSize: 'sm',
                      color: 'stone.500',
                      fontStyle: 'italic',
                      whiteSpace: 'pre-wrap',
                      mb: '2',
                      p: '2',
                      bg: 'stone.800/50',
                      borderRadius: 'md',
                      borderLeft: '2px solid',
                      borderColor: 'stone.600',
                    })}>
                      {(msg as any).reasoning}
                    </div>
                  )}
                  {renderResponse(msg.content)}
                </>
              )}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className={css({
            py: '2',
            borderTop: messages.length > 0 ? '1px solid' : 'none',
            borderColor: 'stone.800',
          })}>
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
            {reasoningText && (
              <div className={css({
                fontSize: 'sm',
                color: 'stone.500',
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: '1.5',
                mb: '2',
                p: '2',
                bg: 'stone.800/50',
                borderRadius: 'md',
                borderLeft: '2px solid',
                borderColor: 'stone.600',
              })}>
                {reasoningText}
              </div>
            )}
            <div className={css({
              fontSize: 'sm',
              color: 'stone.300',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5',
            })}>
              {renderStreaming(streamingText)}
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
              lineHeight: '1.4',
              bg: 'stone.950',
              p: '2',
              borderRadius: 'md',
              maxH: '60vh',
              overflowY: 'auto',
              mb: '2',
            })}>
              {renderDiff(code || '', pendingCode)}
              {pendingCode.length > 1000 && (
                <span className={css({ color: 'stone.500' })}>
                  {'\n'}... ({pendingCode.length - 1000} more chars)
                </span>
              )}
            </pre>
            <div className={css({ display: 'flex', gap: '2' })}>
              <ActionButton
              size="sm"
              visual="primary"
              onClick={() => {
                if (codeSnapshotRef.current !== null && code !== codeSnapshotRef.current) {
                  setShowDivergentWarning(true);
                  return;
                }
                acceptCode(onCodeChange);
              }}
            >
              Accept code
            </ActionButton>
            <ActionButton
              size="sm"
              visual="secondary"
              onClick={rejectCode}
            >
              Reject
            </ActionButton>
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
        alignItems: 'stretch',
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
            py: '1.5',
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
        <ActionButton
          size="sm"
          visual="primary"
          onClick={handleSend}
          disabled={!canSend}
          className={css({ display: 'grid', placeItems: 'center', py: '1.5' })}
        >
          <SendArrow />
        </ActionButton>
      </div>

      <Dialog
        id="divergent-code-warning"
        title="Code Changed"
        isOpen={showDivergentWarning}
        onClose={() => setShowDivergentWarning(false)}
      >
        <p className={css({ fontSize: 'sm', color: 'stone.300', mb: '4' })}>
          Editor code changed since AI generated this. Accepting will overwrite your changes. Continue?
        </p>
        <div className={css({ display: 'flex', gap: '2', justifyContent: 'flex-end' })}>
          <ActionButton size="sm" visual="secondary" onClick={() => setShowDivergentWarning(false)}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" visual="primary" onClick={() => {
            setShowDivergentWarning(false);
            acceptCode(onCodeChange);
          }}>
            Overwrite
          </ActionButton>
        </div>
      </Dialog>
    </div>
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderResponse(text: string): ReactNode[] {
  return splitCodeBlocks(escapeHtml(text)).map((part, i) => {
    if (part.type === 'code') {
      return (
        <pre key={i} className={css({
          bg: 'stone.950',
          p: '2',
          my: '1.5',
          borderRadius: 'md',
          overflowX: 'auto',
          fontSize: 'xs',
          fontFamily: 'mono',
          color: 'stone.200',
          lineHeight: '1.4',
        })}>{part.content}</pre>
      );
    }
    return (
      <span key={i} className={css({ color: 'stone.300', fontSize: 'sm' })}>
        {part.content}
      </span>
    );
  });
}

function renderStreaming(text: string): ReactNode[] {
  // During streaming, we can't parse complete code blocks.
  // Show reasoning (text before first code block) dimmed, code blocks in progress
  const parts = splitCodeBlocks(escapeHtml(text));
  return parts.map((part, i) => {
    if (part.type === 'code') {
      return (
        <pre key={i} className={css({
          bg: 'stone.950',
          p: '2',
          my: '1',
          borderRadius: 'md',
          overflowX: 'auto',
          fontSize: 'xs',
          fontFamily: 'mono',
          color: 'stone.200',
        })}>{part.content}</pre>
      );
    }
    return (
      <span key={i} className={css({
        color: 'stone.400',
        fontSize: 'sm',
        fontStyle: 'italic',
      })}>{part.content}</span>
    );
  });
}

function splitCodeBlocks(text: string): Array<{ type: 'text' | 'code'; content: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

// Simple diff: returns lines with status 'same' | 'added' | 'removed'
function computeDiff(oldText: string, newText: string): Array<{ status: 'same' | 'added' | 'removed'; line: string }> {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // LCS-based diff
  const lcs: number[][] = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0));
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      lcs[i][j] = oldLines[i - 1] === newLines[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  const result: Array<{ status: 'same' | 'added' | 'removed'; line: string }> = [];
  let i = oldLines.length, j = newLines.length;
  const temp: typeof result = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.push({ status: 'same' as const, line: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      temp.push({ status: 'added' as const, line: newLines[j - 1] });
      j--;
    } else {
      temp.push({ status: 'removed' as const, line: oldLines[i - 1] });
      i--;
    }
  }

  return temp.reverse();
}

function renderDiff(oldCode: string, newCode: string): ReactNode[] {
  const diff = computeDiff(oldCode, newCode);
  return diff.map((d, i) => (
    <div key={i} className={css({
      fontFamily: 'mono', fontSize: 'xs', lineHeight: '1.4',
      color: d.status === 'added' ? 'emerald.300' : d.status === 'removed' ? 'red.400' : 'stone.400',
      bg: d.status === 'added' ? 'emerald.900/20' : d.status === 'removed' ? 'red.900/20' : 'transparent',
      px: '1', py: '0.5', borderRadius: 'sm', my: '0.5',
    })}>
      <span className={css({ color: 'stone.600', mr: '1', userSelect: 'none' })}>
        {d.status === 'added' ? '+' : d.status === 'removed' ? '-' : ' '}
      </span>
      {d.line || ' '}
    </div>
  ));
}

export default LLMPanel;

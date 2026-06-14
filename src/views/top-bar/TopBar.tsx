import { ButtonHTMLAttributes, HTMLProps, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { ActionButton } from "../../components/ActionButton";
import { AppTopBar } from "../../components/AppTopBar";
import { BrandLogoButton } from "../../components/BrandLogoButton";
import { SettingsGear } from "../../components/Icons";
import { ShareButtonDialog } from "../../components/ShareButtonDialog/ShareButtonDialog";
import { SettingsMode } from "../../services/settings";

export interface TopBarProps extends HTMLProps<HTMLDivElement> {
  viewMode: SettingsMode
  onViewModeChange: (viewMode: SettingsMode) => void;
  onSettingsClick: () => void;
  enableLlm?: boolean;
  aiDotState?: 'hidden' | 'streaming' | 'pending' | 'error';
}

export const TopBar = (props: TopBarProps) => {
  const { viewMode, onViewModeChange, onSettingsClick, enableLlm, aiDotState = 'hidden' } = props;

  return (
    <AppTopBar>
      <BrandLogoButton />
      <div className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
        <SettingsButton onClick={onSettingsClick} />
        <ShareButton
          className={cssNavbarButton}
        >Share</ShareButton>

        {/* AI status dot */}
        {aiDotState !== 'hidden' && (
          <span
            className={css({
              width: '7px',
              height: '7px',
              borderRadius: 'full',
              flexShrink: '0',
              ...(aiDotState === 'streaming'
                ? { bg: 'amber.400', animation: 'pulse 1s ease-in-out infinite' }
                : aiDotState === 'pending'
                  ? { bg: 'amber.400' }
                  : { bg: 'red.400', animation: 'pulse 1s ease-in-out infinite' }
              ),
            })}
            title={
              aiDotState === 'streaming' ? 'AI generating...' :
              aiDotState === 'pending' ? 'Code pending review' :
              'AI error'
            }
          />
        )}

        <select
          value={viewMode}
          onChange={e => {
            const value = e.currentTarget.value;
            onViewModeChange(value as SettingsMode);
          }}
          className={
            cx(
              cssNavbarButton,
              css({
                fieldSizing: "content",
                maxWidth: "15ch",
                textAlign: 'right',
                padding: 2,
                "@supports (field-sizing: content)": {
                  maxWidth: "auto",
                }
              })
            )
          }
        >
          <option disabled>Select mode</option>
          {enableLlm && (
            <option value="ai-chat">AI Chat</option>
          )}
          <option value="view-edit">View & Edit</option>
          <option value="edit">Edit only</option>
          <option value="view">View only</option>
          <option value="external">Open in a new window</option>
        </select>
      </div>
    </AppTopBar>
  );
};

const SettingsButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <ActionButton
    {...props}
    size="sm"
    outline={false}
    aria-label="Settings"
    className={css({ display: 'grid', placeItems: 'center' })}
  >
    <SettingsGear />
  </ActionButton>
);


const cssNavbarButton = css({
  fontFamily: "mono",
  fontSize: "sm",
  letterSpacing: -0.125,
  fontWeight: "medium",
});

const ShareButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ActionButton
        {...props}
        size="sm"
        onClick={(e) => {
          props.onClick?.(e)
          setIsOpen(true);
        }}
        outline={false}
        aria-pressed={isOpen}
      />
      <ShareButtonDialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
        }}
      />
    </>
  )
}

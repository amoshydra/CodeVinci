import { ButtonHTMLAttributes, HTMLProps, useState } from "react";
import { css, cx } from "../../../styled-system/css";
import { ActionButton } from "../../components/ActionButton";
import { AppTopBar } from "../../components/AppTopBar";
import { BrandLogoButton } from "../../components/BrandLogoButton";
import { ShareButtonDialog } from "../../components/ShareButtonDialog/ShareButtonDialog";
import { SettingsMode } from "../../services/settings";

export interface TopBarProps extends HTMLProps<HTMLDivElement> {
  viewMode: SettingsMode
  onViewModeChange: (viewMode: SettingsMode) => void;
  onSettingsClick: () => void;
}

export const TopBar = (props: TopBarProps) => {
  return (
    <AppTopBar>
      <BrandLogoButton />
      <div className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
        <SettingsButton onClick={props.onSettingsClick} />
        <ShareButton
          className={cssNavbarButton}
        >Share</ShareButton>

        <select
          value={props.viewMode}
          onChange={e => {
            const value = e.currentTarget.value;
            props.onViewModeChange(value as SettingsMode);
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
  <button
    {...props}
    className={css({
      background: 'none',
      border: 'none',
      color: 'stone.400',
      cursor: 'pointer',
      p: '1.5',
      borderRadius: 'md',
      display: 'grid',
      placeItems: 'center',
      _hover: { color: 'stone.100', bg: 'stone.800' },
    })}
    aria-label="Settings"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  </button>
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

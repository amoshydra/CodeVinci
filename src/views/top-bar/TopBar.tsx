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
}

export const TopBar = (props: TopBarProps) => {
  return (
    <AppTopBar>
      <BrandLogoButton />
      <div>
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

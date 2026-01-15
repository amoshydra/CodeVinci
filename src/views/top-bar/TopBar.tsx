import { HTMLProps } from "react";
import { css } from "../../../styled-system/css";
import { AppTopBar } from "../../components/AppTopBar";
import { BrandLogoButton } from "../../components/BrandLogoButton";
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
        <select
          value={props.viewMode}
          onChange={e => {
            const value = e.currentTarget.value;
            props.onViewModeChange(value as SettingsMode);
          }}
          className={css({
            fieldSizing: "content",
            maxWidth: "20ch",
            fontFamily: "mono",
            fontSize: "sm",
            padding: 2,
            letterSpacing: -0.125,
            "@supports (field-sizing: content)": {
              maxWidth: "auto",
            }
          })}
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

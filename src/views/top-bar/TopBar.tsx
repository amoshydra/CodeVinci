import { HTMLProps } from "react";
import { SettingsMode } from "../../services/settings";
import { withCn } from "../../utils/tailwind";

export interface TopBarProps extends HTMLProps<HTMLDivElement> {
  viewMode: SettingsMode
  onViewModeChange: (viewMode: SettingsMode) => void;
}

export const TopBar = (props: TopBarProps) => {
  return (
    <div {...withCn(props, "border-2 p-1 flex justify-between")}>
      <div>CodeVinci</div>
      <div>
        <select value={props.viewMode} onChange={e => {
          props.onViewModeChange(e.currentTarget.value as SettingsMode);
        }}>
          <option disabled>Select mode</option>
          <option value="view-edit">View & Edit</option>
          <option value="edit">Edit only</option>
          <option value="view">View only</option>
        </select>
      </div>
    </div>
  );
};

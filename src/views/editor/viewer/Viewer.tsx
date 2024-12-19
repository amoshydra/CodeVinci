import { HTMLAttributes } from "react";
import { withCn } from "../../../utils/tailwind";

export const Viewer = (props: HTMLAttributes<HTMLElement>) => {
  return <pre {...withCn(props, "h-full w-full overflow-auto")} />;
};

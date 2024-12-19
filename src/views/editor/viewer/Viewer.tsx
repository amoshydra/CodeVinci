import { HTMLAttributes } from "react";

export const Viewer = (props: HTMLAttributes<HTMLElement>) => {
  return <pre {...props} />;
};

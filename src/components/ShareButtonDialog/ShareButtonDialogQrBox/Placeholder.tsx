import { ButtonHTMLAttributes } from "react";
import { css } from "../../../../styled-system/css";

export const ShareButtonDialogQrBoxPlaceholder = (props: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...props}
      className={css({
        background: "slate.800",
        width: "full",
        height: "full",
        aspectRatio: "1 / 1",
        borderRadius: "md",
      })}
    >
      Click to generate QR
    </button>
  );
};

import { HTMLAttributes } from "react";
import { css } from "../../../styled-system/css";
import { withCn } from "../../utils/tailwind";
import type { CspViolation } from "./interface";

export interface CspErrorBannerProps extends HTMLAttributes<HTMLDivElement> {
  violation: CspViolation;
  onDismiss: () => void;
}

export const CspErrorBanner = ({ violation, onDismiss, ...props }: CspErrorBannerProps) => {
  const blocked = violation.blockedURI || "a resource";

  return (
    <div
      role="alert"
      {...withCn(props, css({
        position: "absolute",
        top: 2,
        left: 2,
        right: 2,
        zIndex: 20,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 3,
        padding: 3,
        border: "1px solid",
        borderColor: "red.700/70",
        borderRadius: "sm",
        background: "red.950/95",
        color: "red.100",
        boxShadow: "lg",
        fontFamily: "mono",
        fontSize: "sm",
        lineHeight: 1.35,
      }))}
    >
      <div className={css({ minWidth: 0 })}>
        <div className={css({ fontWeight: 700, color: "red.200" })}>
          Preview resource blocked
        </div>
        <div className={css({ marginTop: 1, overflowWrap: "anywhere" })}>
          Content Security Policy blocked{" "}
          <span className={css({ color: "red.300" })}>{blocked}</span>.
        </div>
        <div className={css({ marginTop: 1, color: "red.300" })}>
          Directive: {violation.effectiveDirective || "unknown"}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={css({
          flexShrink: 0,
          minHeight: 9,
          minWidth: 9,
          paddingX: 2,
          border: "1px solid",
          borderColor: "red.500/60",
          borderRadius: "sm",
          background: "transparent",
          color: "red.100",
          cursor: "pointer",
          _hover: {
            background: "red.800/60",
          },
        })}
      >
        Dismiss
      </button>
    </div>
  );
};

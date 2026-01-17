import { ButtonHTMLAttributes, memo } from "react";
import { css } from "../../../styled-system/css/css";
import { styled } from "../../../styled-system/jsx";
import { withCn } from "../../utils/tailwind.ts";
import { LogPropLog } from "./Logger.interface.ts";


export interface LoggerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  logs: LogPropLog[]
  counts: { error: number; warn: number; info: number; other: number }
}

export const LoggerButton = memo(({ logs, counts, ...props }: LoggerButtonProps) => {

  return (
    <button
      {...withCn(props, css({
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        minWidth: "6ch",
        fontFamily: "mono",
        display: 'grid',
        columnGap: 1,
        rowGap: 0,
        padding: 1,
        placeSelf: "center",
        gridTemplateAreas: `
          "counter marker"
          "indicators marker"
        `,
        gridTemplateColumns: "min-content min-content",
        gridTemplateRows: "min-content min-content",
        [`& > [data-grid-area="marker"]`]: { gridArea: "marker" },
        [`& > [data-grid-area="counter"]`]: { gridArea: "counter" },
        [`& > [data-grid-area="indicators"]`]: { gridArea: "indicators" },
        borderRadius: "sm",

        color: 'stone.500',
        "@media (hover: hover)": {
          _hover: {
            background: "stone.800",
          }
        },
        _active: {
          background: "stone.900",
        }
      }))}
    >
      <span
        aria-hidden
        data-grid-area="marker"
        className={css({
          display: "inline-block",
          lineHeight: 1,
          paddingY: 1,
          fontSize: 10,
          transform: "rotate(-90deg)",
          transformOrigin: "center",
        })}
      >➤</span>
      <LoggerButtonCounter data-grid-area="counter" count={logs.length} />
      <div
        data-grid-area="indicators"
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          paddingBottom: 1,
        })}
      >
        <LoggerDot kind="error" count={counts.error} />
        <LoggerDot kind="warn" count={counts.warn} />
        <LoggerDot kind="info" count={counts.info} />
        <LoggerDot kind="other" count={counts.other} />
      </div>
    </button>
  )
});

const LoggerButtonCounter = styled(({ count, kind, ...props }) => {
  if (count === 0) return <span {...props}>Log</span>;
  return <span {...props}>{count}</span>
}, {
  base: {
    fontSize: 14,
    display: "inline-flex",
    fontFamily: "mono",
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    fontWeight: "bold",
  },
});

const LoggerDot = styled(({ count, kind, ...props }) => {
  if (count === 0) return false;
  return <span {...props} />
}, {
  base: {
    width: 1,
    height: 1,
    display: "inline-block",
    borderRadius: "full",
  },
  variants: {
    kind: {
      error: {
        backgroundColor: "red.600",
      },
      warn: {
        backgroundColor: "yellow.600",
      },
      info: {
        backgroundColor: "blue.600",
      },
      other: {
        backgroundColor: "stone.600",
      },
    }
  }
});
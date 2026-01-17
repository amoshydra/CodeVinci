import { deserialize } from '@ungap/structured-clone';
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { css } from "../../../styled-system/css";
import { styled } from "../../../styled-system/jsx";
import { withCn } from "../../utils/tailwind";
import { LogPropLog } from "./Logger.interface.ts";

export interface LogProps {
  logs: LogPropLog[];
  open: boolean;
}

export const Logger = ({ logs, open, ...props }: LogProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const hasUserScrolledRef = useRef(false);

  useEffect(() => {
    if (ref.current) {
      if (!hasUserScrolledRef.current) {
        // Don't auto scroll if user has scrolled
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    }
  });
  useEffect(() => {
    hasUserScrolledRef.current = false;
  }, [open])

  const lesserLogs = useMemo(() => {
    return logs.slice(Math.max(logs.length - 100, 0));
  }, [logs]);

  const scrollSnap = useCallback((e: { movementY: number, deltaY?: number }) => {
    const delta = e.movementY || e.deltaY || 0;
    const target = ref.current;
    if (!target) return;
    if (delta > 0) {
      if (target.scrollTop > (target.scrollHeight - 500)) {
        hasUserScrolledRef.current = false;
      }
    } else {
      hasUserScrolledRef.current = true;
    }
  }, []);

  if (!open) return false;

  return (
    <div
      ref={ref}
      {...withCn(props, css({
        height: "20vh",
        overflow: "scroll",
        background: "zinc.900",
        paddingY: 2,
        paddingX: 1,
        borderRadius: 'sm',
        margin: 2,
        marginBottom: 0,
      }))}
      onTouchMove={scrollSnap as any}
      onWheel={scrollSnap}
    >
      {
        logs.length > 100 && (
          <span
            className={css({
              fontStyle: "italic",
              color: "stone.600",
              display: "inline-block",
              paddingBottom: 2,
            })}
          >Logs are truncated. Display only 100 logs</span>
        )
      }
      {
        logs.length > 0
          ? (
            <LogLine logs={lesserLogs} />
          ) : (
            <span
              className={css({
                fontStyle: "italic",
                color: "stone.600",
                paddingX: 2,
              })}
            >Log is empty</span>
          )
      }
    </div>
  );
};

const LogLine = memo(({ logs }: { logs: LogPropLog[] }) => {
  return (
    <>
      {logs.map((log, logIndex) =>
        <LogLineRow
          key={logIndex}
          method={log.method as any}
        >
          {
            deserialize(log.args).map((data: unknown, i: number) =>
              <span key={i}>
                <LogLineItem data={data} />
              </span>
            )
          }
        </LogLineRow>
      )}
    </>
  )
});
const LogLineItem = ({ data }: { data: unknown }) => {
  if (typeof data === "object" && data instanceof Error) {
    return JSON.stringify({
      name: data.name,
      message: data.message,
    });
  }
  return JSON.stringify(data);
}


const LogLineRow = styled("pre", {
  base: {
    display: 'flex',
    flexWrap: 'flex-wrap',
    gap: 2,
    color: 'stone.100',
    paddingY: 1.5,
    lineHeight: 1,
    borderTop: "1px solid",
    borderColor: "slate.900",
    _first: {
      borderColor: "transparent",
    }
  },
  variants: {
    method: {
      'build.error': {
        color: 'red.800'
      },
      'console.error': {
        color: 'red.800'
      },
      'console.info': {
        color: 'blue.500'
      },
      'console.warn': {
        color: 'yellow.500'
      },
      'console.debug': {
        color: 'stone.400'
      },
    }
  }
})

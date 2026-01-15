import structuredClone, { deserialize } from '@ungap/structured-clone';
import { HTMLAttributes, memo, useEffect, useRef } from 'react';
import { css } from '../../../styled-system/css';

export interface LogProps extends HTMLAttributes<HTMLDetailsElement> {
  logs: { method: string, args: structuredClone.SerializedRecord }[]
  onClear: () => void;
}

export const Log = memo(({ logs, onClear, ...props }: LogProps) => {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  });
  return (
    <details ref={ref} {...props}>
      <summary
        className={css({
          padding: 2,
          width: 'full',
          display: 'block',
          fontSize: 'sm',
          color: "stone.500",
          fontFamily: "mono",
        })}
      >
        &gt; Console {logs.length ? `(${logs.length})` : false}
      </summary>
      <div
        className={css({
          maxHeight: '32',
          overflow: "auto",
        })}
      >
        {logs.map((log, logIndex) =>
          <pre key={logIndex} className={getBackground(log.method)}>
            {
              deserialize(log.args).map((data: unknown, i: number) =>
                <LogRenderer key={i} data={data} />
              )
            }
          </pre>
        )}
      </div>
    </details>
  );
});

const getBackground = (method: string) => {
  if (method === "console.error" || method === "build.error") {
    return css({
      color: 'red.600',
    });
  }
  if (method === "console.info") {
    return css({
      color: 'blue.500',
    });
  }
  if (method === "console.warn") {
    return css({
      color: 'yellow.500',
    });
  }
  if (method === "console.debug") {
    return css({
      color: 'stone.400',
    });
  }
  return css({
    color: 'stone.100',
  });
}

const LogRenderer = ({ data }: { data: unknown }) => {
  if (typeof data === "object" && data instanceof Error) {
    return JSON.stringify({
      name: data.name,
      message: data.message,
    });
  }
  return JSON.stringify(data);
}

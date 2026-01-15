import structuredClone, { deserialize } from '@ungap/structured-clone';
import { HTMLAttributes, memo, useEffect, useRef } from 'react';
import { css, cx } from '../../../styled-system/css';
import { withCn } from '../../utils/tailwind';

export interface LogProps extends HTMLAttributes<HTMLDivElement> {
  logs: { method: string, args: structuredClone.SerializedRecord }[]
  onClear: () => void;
}

export const Log = memo(({ logs, onClear, ...props }: LogProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  });
  return (
    <div
      {...withCn(props, cx(props.className, css({
        height: 10,
      })))}
      ref={ref}
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
  );
});

const getBackground = (method: string) => {
  if (method === "console.error" || method === "build.error") {
    return css({
      color: 'red.600',
      _dark: {
        color: 'red.400',
      }
    });
  }
  if (method === "console.info") {
    return css({
      color: 'blue.600',
      _dark: {
        color: 'blue.400',
      }
    });
  }
  if (method === "console.warn") {
    return css({
      color: 'yellow.500',
    });
  }
  if (method === "console.debug") {
    return css({
      color: 'gray.500',
    });
  }
  return "";
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

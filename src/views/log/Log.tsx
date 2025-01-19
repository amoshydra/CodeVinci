import structuredClone, { deserialize } from '@ungap/structured-clone';
import { HTMLAttributes, memo, useEffect, useRef } from 'react';
import { cn } from '../../utils/tailwind';

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
      {...props}
      className={cn(props, "h-10 border-2")}
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
    return "text-red-800 dark:text-red-400"
  }
  if (method === "console.info") {
    return "text-blue-800 dark:text-blue-400"
  }
  if (method === "console.warn") {
    return "text-orange-600"
  }
  if (method === "console.debug") {
    return "text-gray-500"
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

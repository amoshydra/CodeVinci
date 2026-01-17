import { useCallback, useEffect, useState } from "react";
import { FrameMessage } from "../views/viewer/interface";

export const useLogger = (code: string) => {
  const [logs, setLogs] = useState<FrameMessage[]>([]);
  const [counts, setCounts] = useState({ error: 0, warn: 0, info: 0, other: 0 });

  const onFrameMessage = useCallback((frameMessage: FrameMessage) => {
    if (frameMessage.method === "console.clear") {
      setLogs([]);
      setCounts({ error: 0, warn: 0, info: 0, other: 0 });
      return;
    }
    setLogs(l => [...l, frameMessage]);
    setCounts(c => {
      const key = frameMessage.method.split(".")[1] || "other";
      return {
        ...c,
        [key]: c[key as keyof typeof c] + 1
      };
    });
  }, []);

  const resetLog = useCallback(() => {
    setLogs([]);
    setCounts({ error: 0, warn: 0, info: 0, other: 0 });
  }, []);

  useEffect(() => {
    resetLog();
  }, [resetLog, code]);

  return {
    onFrameMessage,
    resetLog,
    logs,
    counts,
  }
}

import { useCallback, useEffect, useState } from "react";
import { FrameMessage } from "../views/viewer/interface";

export const useLogger = (code: string) => {
  const [logs, setLogs] = useState<FrameMessage[]>([]);

  const onFrameMessage = useCallback((frameMessage: FrameMessage) => {
    if (frameMessage.method === "console.clear") {
      setLogs([]);
      return;
    }
    setLogs(l => [...l, frameMessage]);
  }, []);

  const resetLog = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    resetLog();
  }, [resetLog, code]);

  return {
    onFrameMessage,
    resetLog,
    logs,
  }
}

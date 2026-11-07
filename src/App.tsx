import "./App.css";
import { useEffect, useRef } from "react";
import { useSettings } from "./services/settings";
import { useCodeStorage } from "./services/useCodeStorage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { css } from "../styled-system/css";
import { Disclaimer } from "./views/disclaimer/Disclaimer";
import { toggleComment } from "./views/disclaimer/toggleComment.util";
import { useDisclaimer } from "./views/disclaimer/useDisclaimer";
import { Entry } from "./views/entry/Entry";
import { pushSnapshot, undo as historyUndo } from "./services/codeHistory";
import { registerWebMcpTools } from "./services/webmcp";

function App() {
  const [code, setCode] = useCodeStorage(initialCode);
  const { isDisclaimerAccepted, acceptDisclaimer } = useDisclaimer();
  const { settings, updateSetting } = useSettings();

  // Monotonic code version for optimistic-concurrency checks in WebMCP tools.
  const versionRef = useRef(0);
  const lastCodeRef = useRef(code);
  useEffect(() => {
    if (lastCodeRef.current !== code) {
      lastCodeRef.current = code;
      versionRef.current += 1;
    }
  }, [code]);

  // Registered above the disclaimer gate so an agent always sees the tool
  // surface; writes stay locked until the user accepts.
  const latestRef = useRef({ code, setCode, isDisclaimerAccepted, mode: settings.mode });
  useEffect(() => {
    latestRef.current = { code, setCode, isDisclaimerAccepted, mode: settings.mode };
  });

  useEffect(() => {
    return registerWebMcpTools({
      getCode: () => latestRef.current.code,
      setCode: (next) => {
        pushSnapshot(latestRef.current.code);
        // Read-your-write: a later tool call in the same turn must see this value.
        latestRef.current.code = next;
        lastCodeRef.current = next;
        versionRef.current += 1;
        latestRef.current.setCode(next);
        return versionRef.current;
      },
      isWriteEnabled: () => latestRef.current.isDisclaimerAccepted,
      getMode: () => latestRef.current.mode,
      getVersion: () => versionRef.current,
      undo: () => {
        const previous = historyUndo(latestRef.current.code);
        if (previous === null) return null;
        latestRef.current.code = previous;
        lastCodeRef.current = previous;
        versionRef.current += 1;
        latestRef.current.setCode(previous);
        return { code: previous, version: versionRef.current };
      },
    });
  }, []);

  if (!isDisclaimerAccepted) {
    return (
      <Disclaimer
        code={code}
        onAcceptRun={() => {
          acceptDisclaimer();
        }}
        onAcceptEdit={() => {
          setCode(toggleComment(code));
        }}
        onAcceptExternalLoad={(externalCode) => {
          setCode(externalCode);
        }}
      />
    );
  }

  return (
    <ErrorBoundary fallback={(error) => (
      <div className={css({ p: '4', color: 'red.400', fontFamily: 'mono', fontSize: 'sm', whiteSpace: 'pre-wrap' })}>
        <div className={css({ fontWeight: 'bold', mb: '2' })}>Something went wrong</div>
        {error.message}
        <br /><br />
        <button onClick={() => location.reload()} className={css({
          px: '3', py: '1.5', borderRadius: 'md', border: '1px solid',
          borderColor: 'stone.600', bg: 'stone.800', color: 'stone.200',
          cursor: 'pointer', fontSize: 'sm', mt: '2',
        })}>
          Reload page
        </button>
      </div>
    )}>
      <Entry
        code={code}
        onCodeChange={setCode}
        settings={settings}
        onSettingUpdate={updateSetting}
      />
    </ErrorBoundary>
  );
}

export default App;

const initialCode = `document.body.insertAdjacentHTML("beforeend", \`
  <h1>Hello, World!</h1>
  <div>

  </div>
  <style>
    :root {
      color-scheme: dark;
      font-family: sans-serif;
    }
  </style>
\`);
`;

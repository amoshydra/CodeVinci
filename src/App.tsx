import "./App.css";
import { useEffect } from "react";
import { useSettings } from "./services/settings";
import { useCodeStorage } from "./services/useCodeStorage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { css } from "../styled-system/css";
import { Disclaimer } from "./views/disclaimer/Disclaimer";
import { toggleComment } from "./views/disclaimer/toggleComment.util";
import { useDisclaimer } from "./views/disclaimer/useDisclaimer";
import { Entry } from "./views/entry/Entry";
import { applyCspFromConfig } from "./services/llm/csp";

function App() {
  const [code, setCode] = useCodeStorage(initialCode);
  const { isDisclaimerAccepted, acceptDisclaimer } = useDisclaimer();
  const { settings, updateSetting } = useSettings();

  useEffect(() => {
    applyCspFromConfig();
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

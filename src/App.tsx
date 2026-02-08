import "./App.css";
import { useSettings } from "./services/settings";
import { useCodeStorage } from "./services/useCodeStorage";
import { Disclaimer } from "./views/disclaimer/Disclaimer";
import { toggleComment } from "./views/disclaimer/toggleComment.util";
import { useDisclaimer } from "./views/disclaimer/useDisclaimer";
import { Entry } from "./views/entry/Entry";

function App() {
  const [code, setCode] = useCodeStorage(initialCode);
  const { isDisclaimerAccepted, acceptDisclaimer } = useDisclaimer();
  const { settings, updateSetting } = useSettings();

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
    <Entry
      code={code}
      onCodeChange={setCode}
      settings={settings}
      onSettingUpdate={updateSetting}
    />
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

import { useEsbuild } from "./services/esbuild";
import { useCodeStorage } from "./services/useCodeStorage";
import { Disclaimer } from "./views/disclaimer/Disclaimer";
import { toggleComment } from "./views/disclaimer/toggleComment.util";
import { useDisclaimer } from "./views/disclaimer/useDisclaimer";
import { Entry } from "./views/entry/Entry";

function App() {
  const [code, setCode] = useCodeStorage(initialCode);
  const { isDisclaimerAccepted, acceptDisclaimer } = useDisclaimer();
  const [, isLoading, error] = useEsbuild();

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
      />
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div>Error loading application</div>
        <br />
        <pre>{(error.stack || error).toString()}</pre>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6">Loading application...</div>;
  }

  return <Entry code={code} onCodeChange={setCode} />;
}

export default App;

const initialCode = `document.body.insertAdjacentHTML("beforeend", \`
  <h1>Hello, World!</h1>
  <div>
    
  </div>
\`);
`;

import { useEsbuild } from "./services/esbuild";
import { Entry } from "./views/editor/entry/Entry";

function App() {
  const [, isLoading] = useEsbuild();

  if (!isLoading) {
    return <div className="">Loading...</div>;
  }

  return <Entry />;
}

export default App;

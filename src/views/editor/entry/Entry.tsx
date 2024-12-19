import { useCodeStorage } from "../../../services/useCodeStorage";
import { Editor } from "../Editor";
import { Viewer } from "../viewer/Viewer";

export const Entry = () => {
  const [code, setCode] = useCodeStorage();

  return (
    <div>
      <Viewer children={code} />
      <Editor
        value={code}
        onValueChange={(code) => {
          setCode(code);
        }}
      />
    </div>
  );
};

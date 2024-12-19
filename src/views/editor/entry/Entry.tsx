import { HTMLAttributes } from "react";
import { useCodeStorage } from "../../../services/useCodeStorage";
import { withCn } from "../../../utils/tailwind";
import { Editor } from "../Editor";
import { Viewer } from "../viewer/Viewer";

export type EntryProps = HTMLAttributes<HTMLElement>;

export const Entry = (props: EntryProps) => {
  const [code, setCode] = useCodeStorage();

  return (
    <div {...withCn(props, "h-full flex flex-col")}>
      <Placeholder data-placeholder="top-toolbar" />
      <div
        {...withCn(props, "grid min-h-0 flex-1")}
        style={{
          gridTemplateColumns: "min-content 1fr 1fr",
        }}
      >
        <Placeholder
          data-placeholder="sidebar"
          className="resize-x overflow-auto"
        />

        <Viewer className="w-full h-full" children={code} />
        <Editor
          className="w-full h-full"
          value={code}
          onValueChange={(code) => {
            setCode(code);
          }}
        />
      </div>
      <Placeholder
        data-placeholder="bottom-toolbar"
        className="resize-y overflow-auto"
      />
    </div>
  );
};

const Placeholder = (props: HTMLAttributes<HTMLDivElement>) => {
  return <div {...withCn(props, "border-2 p-4")} />;
};

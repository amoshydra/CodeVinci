import yaml from "yaml";

interface ParsedData<T extends object> {
  data: T;
  content: string;
}

const MARK = "---";

export const parse = <T extends object>(code: string): ParsedData<T> => {
  const codeLines = code.split("\n");

  if (codeLines[0] !== MARK) {
    return {
      data: {} as T,
      content: code,
    };
  }

  let yamlContent = "";
  let contentStartIndex = 0;

  for (let i = 1; i < codeLines.length; i++) {
    if (codeLines[i] === MARK) {
      contentStartIndex = i + 1;
      break;
    }
    yamlContent += codeLines[i] + "\n";
  }

  const data = yaml.parse(yamlContent) as T;
  const content = codeLines.slice(contentStartIndex).join("\n");

  return {
    data,
    content,
  };
};

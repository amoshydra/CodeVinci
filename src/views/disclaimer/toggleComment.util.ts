const NEWLINE = "\n";

export const toggleComment = (code: string) => {
  const codeLines = code.split(NEWLINE);

  if (isAllLinesCommented(codeLines)) {
    return codeLines
      .map((line) => {
        return line.replace(/^\/\/ /, "");
      })
      .join(NEWLINE);
  }

  return codeLines
    .map((line) => {
      return `// ${line}`;
    })
    .join(NEWLINE);
};

const isAllLinesCommented = (codeLines: string[]) => {
  return codeLines
    .filter((x) => x.trim().length > 0)
    .every((line) => line.startsWith("//"));
};

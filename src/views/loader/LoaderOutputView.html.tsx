import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { css } from "../../../styled-system/css";
import { QUERY_PROPERTY_VALUE } from "../../constants/query";
import { arrayBufferToBase64 } from "../../utils/base64Buffer";
import { compress } from "../../utils/compress";
import { Editor } from "../editor/Editor";
import { LinkOutputView } from "./components/LinkOutputView";
import { useOutputLink } from "./hooks/useOutputLink";
import { LoaderOutputViewProps } from "./interface";

const noop = () => { };

export const LoaderOutputViewHtml = ({ value }: LoaderOutputViewProps) => {

  const deferred = useDeferredValue(value)

  const output = useMemo(() => {
    try {
      return convertHtmlToEsm(value)
    } catch (e) {
      return "<div>failed to extract</div>";
    }
  }, [deferred]);

  const { base64, isLoading } = useOutputBase64(output);
  const href = useOutputLink(base64, QUERY_PROPERTY_VALUE);

  return (
    <div
      className={css({ minWidth: 0 })}
    >
      <LinkOutputView
        fallbackMessage="Unable to parse the given HTML"
        href={href}
        isValid={!isLoading && !!base64}
      />

      <Editor
        className={css({ height: "full" })}
        value={output} readOnly onValueChange={noop}
      />
    </div>
  );
};

const useOutputBase64 = (newHtmlOutput: string) => {
  const [base64, setBase64] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    setIsLoading(true);

    Promise.resolve()
      .then(async () => {
        const compressed = await compress(newHtmlOutput);
        if (aborted) return;
        const base64String = arrayBufferToBase64(compressed);
        setBase64(base64String);
      })
      .finally(() => {
        setIsLoading(false);
      })
    ;
    return () => {
      aborted = true;
    };
  }, [newHtmlOutput])
  return { isLoading, base64 };
};

function convertHtmlToEsm(htmlInput: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlInput, 'text/html');

  // 1. Parse Import Map
  const importMapScript = doc.querySelector('script[type="importmap"]');
  const importMap = importMapScript ? JSON.parse(importMapScript.textContent || "{}").imports : {};

  // 2. Aggregate Styles
  const styleContent = Array.from(doc.querySelectorAll('style'))
    .map(s => (s.textContent || "").trim())
    .join('\n')
  ;

  // 3. Extract and Clean Body HTML (removing script tags from the markup)
  const bodyClone = doc.body.cloneNode(true) as HTMLElement;
  const scriptsInBody = bodyClone.querySelectorAll('script');
  scriptsInBody.forEach(s => s.remove());
  const bodyContent = bodyClone.innerHTML.trim();

  // 4. Process all Module Scripts
  const moduleScripts = Array.from(doc.querySelectorAll('script:not([type="importmap"])'));
  let allImports = new Set();
  let allLogic: string[] = [];

  moduleScripts.forEach(script => {
    let code = (script.textContent || "").trim();

    // Resolve aliases based on the Import Map
    // In a true AST environment, we'd use: babel.transform(code, { plugins: [rewriteImports] })
    Object.entries(importMap).forEach(([alias, url]) => {
      const importRegex = new RegExp(`(import\\s+.*?from\\s+['"])${alias}(['"])`, 'g');
      code = code.replace(importRegex, `$1${url}$2`);
    });

    // Separate imports from logic
    const lines = code.split('\n');
    lines.forEach(line => {
      if (line.trim().startsWith('import ')) {
        allImports.add(line.trim());
      } else {
        allLogic.push(line);
      }
    });
  });

  // 5. Assemble final ESM Output
  return `
${Array.from(allImports).join('\n')}

document.body.insertAdjacentHTML("beforeend", \`
<style>
${styleContent}
</style>
${bodyContent}
\`);

${allLogic.join('\n').trim()}
`.trim();
}

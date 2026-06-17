export interface TextEdit {
  search: string;
  replace: string;
}

function codeContext(code: string, aroundIdx: number, radius = 40): string {
  const start = Math.max(0, aroundIdx - radius);
  const end = Math.min(code.length, aroundIdx + radius);
  let snippet = code.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < code.length) snippet = snippet + '...';
  return snippet.replace(/\n/g, '\\n');
}

export function applyEdits(code: string, edits: TextEdit[]): { result: string; error?: string } {
  let working = code;
  for (let i = 0; i < edits.length; i++) {
    const { search, replace } = edits[i];
    if (search === '') {
      return { result: code, error: `Edit ${i + 1}: empty search string` };
    }
    const firstIdx = working.indexOf(search);
    
    if (firstIdx === -1) {
      // Try to find the closest match for debugging
      const searchStart = search.slice(0, 20);
      const closeIdx = working.indexOf(searchStart);
      const snippet = closeIdx !== -1
        ? `Near: \`${codeContext(working, closeIdx)}\``
        : `Code starts with: \`${code.slice(0, 80).replace(/\n/g, '\\n')}...\``;
      return {
        result: code,
        error: `Edit ${i + 1}: search text not found.\nSearch: "${search.slice(0, 80)}"\n${snippet}\n\nFix the search text to match the code exactly, including whitespace. Copy-paste the exact lines from the code above.`,
      };
    }
    
    const lastIdx = working.lastIndexOf(search);
    if (firstIdx !== lastIdx) {
      const ctx1 = codeContext(working, firstIdx);
      const ctx2 = codeContext(working, lastIdx);
      return {
        result: code,
        error: `Edit ${i + 1}: search text matches ${countOccurrences(working, search)} times.\nMatch 1: \`${ctx1}\`\nMatch 2: \`${ctx2}\`\n\nInclude more surrounding context to make the search unique.`,
      };
    }
    
    working = working.slice(0, firstIdx) + replace + working.slice(firstIdx + search.length);
  }
  return { result: working };
}

function countOccurrences(text: string, search: string): number {
  let count = 0;
  let idx = 0;
  while ((idx = text.indexOf(search, idx)) !== -1) {
    count++;
    idx += search.length;
  }
  return count;
}

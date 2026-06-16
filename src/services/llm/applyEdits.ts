export interface TextEdit {
  search: string;
  replace: string;
}

export function applyEdits(code: string, edits: TextEdit[]): { result: string; error?: string } {
  let working = code;
  for (let i = 0; i < edits.length; i++) {
    const { search, replace } = edits[i];
    const firstIdx = working.indexOf(search);
    if (firstIdx === -1) {
      return { result: code, error: `Edit ${i + 1}: search text not found — "${search.slice(0, 60)}"` };
    }
    const lastIdx = working.lastIndexOf(search);
    if (firstIdx !== lastIdx) {
      return { result: code, error: `Edit ${i + 1}: search text matches ${countOccurrences(working, search)} times — must match exactly once. Try including more surrounding context.` };
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

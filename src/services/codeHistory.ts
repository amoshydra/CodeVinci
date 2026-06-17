const SS_KEY = 'codevinci-code-history';
const MAX_SNAPSHOTS = 50;

interface HistoryStore {
  past: string[];
  future: string[];
}

function load(): HistoryStore {
  try {
    return JSON.parse(sessionStorage.getItem(SS_KEY) || '{"past":[],"future":[]}');
  } catch {
    return { past: [], future: [] };
  }
}

function save(store: HistoryStore): void {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(store)); } catch {}
}

/** Save a snapshot of the current code before accepting a change */
export function pushSnapshot(code: string): void {
  const store = load();
  store.past.push(code);
  if (store.past.length > MAX_SNAPSHOTS) store.past.shift();
  store.future = [];
  save(store);
}

/** Go back to the previous snapshot. Returns the previous code or null. */
export function undo(currentCode: string): string | null {
  const store = load();
  if (store.past.length === 0) return null;
  store.future.push(currentCode);
  const prev = store.past.pop()!;
  save(store);
  return prev;
}

/** Go forward to the next snapshot. Returns the next code or null. */
export function redo(currentCode: string): string | null {
  const store = load();
  if (store.future.length === 0) return null;
  store.past.push(currentCode);
  const next = store.future.pop()!;
  save(store);
  return next;
}

export function canUndo(): boolean {
  return load().past.length > 0;
}

export function canRedo(): boolean {
  return load().future.length > 0;
}

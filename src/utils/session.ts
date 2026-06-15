const SESSION_KEYS = [
  'accepted-disclaimer',
  'codevinci-llm-history',
  'codevinci-iframe-localStorage',
  'codevinci-reopen-settings',
];

export function resetSession(): void {
  for (const key of SESSION_KEYS) {
    try { sessionStorage.removeItem(key); } catch { /* private mode */ }
  }
}

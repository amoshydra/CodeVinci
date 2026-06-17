const SESSION_KEYS = [
  'codevinci-accepted-disclaimer',
  'codevinci-llm-history',
  'codevinci-iframe-localStorage',
  'codevinci-reopen-settings',
  'codevinci-edit-retry',
  'codevinci-code-history',
];

export function resetSession(): void {
  for (const key of SESSION_KEYS) {
    try { sessionStorage.removeItem(key); } catch { /* private mode */ }
  }
}

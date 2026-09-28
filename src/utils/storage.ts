const memoryStore = new Map<string, string>();

const getStorage = (): Storage | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
};

export const safeStorage = {
  getItem(key: string): string | null {
    const storage = getStorage();
    if (storage) {
      try {
        return storage.getItem(key);
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // Quota exceeded or storage blocked — keep the in-memory value only.
    }
  },

  removeItem(key: string): void {
    memoryStore.delete(key);
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // Storage blocked — the in-memory value is already cleared.
    }
  },
};

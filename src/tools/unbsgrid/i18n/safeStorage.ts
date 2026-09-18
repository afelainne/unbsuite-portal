// localStorage wrappers that never throw (private mode, disabled storage,
// QuotaExceededError). unbsgrid has no shared storage helper, so the i18n
// module brings its own — the same shape unbscolor uses.

const getStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return getStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

/** Returns false when the value could not be persisted (e.g. quota exceeded). */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    // Quota or privacy mode: the choice still applies, it just forgets.
    return false;
  }
};

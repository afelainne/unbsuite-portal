// localStorage wrappers that never throw (private mode, disabled storage,
// QuotaExceededError, corrupt JSON).

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
  } catch (err) {
    console.warn(`[unbscolor] Could not persist "${key}":`, err);
    return false;
  }
};

export const safeRemoveItem = (key: string): void => {
  try {
    getStorage()?.removeItem(key);
  } catch {
    /* ignore */
  }
};

/** Reads JSON; returns `fallback` when missing, unparsable, or rejected by `validate`. */
export const readJson = <T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T => {
  const raw = safeGetItem(key);
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown): boolean => {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
};

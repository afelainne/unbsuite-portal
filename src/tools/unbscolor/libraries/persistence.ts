import type { StoredLibrary } from './types';

/**
 * Where imported libraries live between visits: IndexedDB on this device.
 * A full library file can be ~12 MB, far past what localStorage holds.
 * When IndexedDB is missing or refuses to open (private mode, blocked site
 * data), everything falls back to memory and lasts until the page reloads.
 * No call here ever throws.
 */

export type EnabledPrefs = Record<string, boolean>;

export interface LibraryPersistence {
  /** False when running on the in-memory fallback. */
  persistent: boolean;
  loadLibraries: () => Promise<StoredLibrary[]>;
  saveLibrary: (library: StoredLibrary) => Promise<boolean>;
  removeLibrary: (id: string) => Promise<boolean>;
  loadEnabled: () => Promise<EnabledPrefs>;
  saveEnabled: (prefs: EnabledPrefs) => Promise<boolean>;
}

const DB_NAME = 'unbscolor-libraries';
const DB_VERSION = 1;
const LIBRARIES = 'libraries';
const PREFS = 'prefs';
const ENABLED_KEY = 'enabled';

export const createMemoryPersistence = (): LibraryPersistence => {
  const libraries = new Map<string, StoredLibrary>();
  let enabled: EnabledPrefs = {};
  return {
    persistent: false,
    loadLibraries: async () => Array.from(libraries.values()),
    saveLibrary: async (library) => {
      libraries.set(library.id, library);
      return true;
    },
    removeLibrary: async (id) => libraries.delete(id),
    loadEnabled: async () => ({ ...enabled }),
    saveEnabled: async (prefs) => {
      enabled = { ...prefs };
      return true;
    }
  };
};

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const openDatabase = (factory: IDBFactory): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = factory.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LIBRARIES)) db.createObjectStore(LIBRARIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(PREFS)) db.createObjectStore(PREFS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });

const isStoredLibrary = (value: unknown): value is StoredLibrary => {
  const v = value as StoredLibrary;
  return !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.name === 'string' && Array.isArray(v.books);
};

const createIndexedDbPersistence = (db: IDBDatabase): LibraryPersistence => {
  const run = async <T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const tx = db.transaction(store, mode);
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    const result = await request(action(tx.objectStore(store)));
    await done;
    return result;
  };
  const warn = (what: string, err: unknown) => console.warn(`[unbscolor] Could not ${what}:`, err);

  return {
    persistent: true,
    loadLibraries: async () => {
      try {
        const all = await run<unknown[]>(LIBRARIES, 'readonly', (s) => s.getAll());
        return all.filter(isStoredLibrary);
      } catch (err) {
        warn('read libraries', err);
        return [];
      }
    },
    saveLibrary: async (library) => {
      try {
        await run(LIBRARIES, 'readwrite', (s) => s.put(library));
        return true;
      } catch (err) {
        warn('save library', err);
        return false;
      }
    },
    removeLibrary: async (id) => {
      try {
        await run(LIBRARIES, 'readwrite', (s) => s.delete(id));
        return true;
      } catch (err) {
        warn('remove library', err);
        return false;
      }
    },
    loadEnabled: async () => {
      try {
        const value = await run<unknown>(PREFS, 'readonly', (s) => s.get(ENABLED_KEY));
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return Object.fromEntries(Object.entries(value).filter(([, on]) => typeof on === 'boolean')) as EnabledPrefs;
      } catch (err) {
        warn('read preferences', err);
        return {};
      }
    },
    saveEnabled: async (prefs) => {
      try {
        await run(PREFS, 'readwrite', (s) => s.put(prefs, ENABLED_KEY));
        return true;
      } catch (err) {
        warn('save preferences', err);
        return false;
      }
    }
  };
};

/** Opens IndexedDB, or hands back the in-memory store when it is unavailable. */
export const openLibraryPersistence = async (): Promise<LibraryPersistence> => {
  try {
    const factory = typeof indexedDB !== 'undefined' ? indexedDB : null;
    if (!factory) return createMemoryPersistence();
    const db = await openDatabase(factory);
    return createIndexedDbPersistence(db);
  } catch {
    return createMemoryPersistence();
  }
};

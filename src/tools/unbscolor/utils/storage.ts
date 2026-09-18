import { ReferenceColor } from '../types';
import { readJson, writeJson } from './safeStorage';

const STORAGE_KEY = 'chromamatch_custom_libraries';

export interface StoredLibrary {
  name: string;
  colors: ReferenceColor[];
  dateAdded: number;
}

const isStoredLibrary = (v: any): v is StoredLibrary =>
  !!v && typeof v === 'object' && typeof v.name === 'string' && Array.isArray(v.colors);

const isArray = (v: unknown): v is StoredLibrary[] => Array.isArray(v);

export const getStoredLibraries = (): StoredLibrary[] => {
  // Malformed entries are dropped instead of crashing consumers
  return readJson<StoredLibrary[]>(STORAGE_KEY, [], isArray).filter(isStoredLibrary);
};

/**
 * Saves (or replaces by name) a library and returns the updated list.
 * `persisted` is false when the browser refused to store it (e.g. quota).
 */
export const saveLibraryToStorage = (name: string, colors: ReferenceColor[]) => {
  const filtered = getStoredLibraries().filter((lib) => lib.name !== name);

  const newLib: StoredLibrary = {
    name,
    colors,
    dateAdded: Date.now()
  };

  const updated = [...filtered, newLib];
  const persisted = writeJson(STORAGE_KEY, updated);
  return Object.assign(updated, { persisted });
};

export const removeLibraryFromStorage = (name: string) => {
  const updated = getStoredLibraries().filter((lib) => lib.name !== name);
  const persisted = writeJson(STORAGE_KEY, updated);
  return Object.assign(updated, { persisted });
};

import { ReferenceColor } from '../types';

const STORAGE_KEY = 'chromamatch_custom_libraries';

export interface StoredLibrary {
  name: string;
  colors: ReferenceColor[];
  dateAdded: number;
}

export const getStoredLibraries = (): StoredLibrary[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load libraries", e);
    return [];
  }
};

export const saveLibraryToStorage = (name: string, colors: ReferenceColor[]) => {
  const current = getStoredLibraries();
  
  // Remove duplicate names if exists, replace with new
  const filtered = current.filter(lib => lib.name !== name);
  
  const newLib: StoredLibrary = {
    name,
    colors,
    dateAdded: Date.now()
  };

  const updated = [...filtered, newLib];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const removeLibraryFromStorage = (name: string) => {
  const current = getStoredLibraries();
  const updated = current.filter(lib => lib.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

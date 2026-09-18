import { useEffect, useSyncExternalStore } from 'react';
import type { AnalysisResult } from '../types';
import { toImportedEntry } from './books';
import { readLibraryFile, type LibraryFileLike } from './importFile';
import { getOpenLibraries } from './open';
import { openLibraryPersistence, type EnabledPrefs, type LibraryPersistence } from './persistence';
import type { LibraryEntry, LibraryState, ReferenceBook, StoredLibrary } from './types';
import { findNote, serializeUnbsLibrary } from './unbsJson';

/**
 * The one list of reference libraries the whole tool reads: the open
 * palettes plus whatever the person imported. A tiny external store, so the
 * Matcher, the multi-slot analysis, the palettes and the settings sheet all
 * see the same libraries without threading props through every view.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let state: LibraryState = { ready: false, persistent: false, entries: getOpenLibraries() };
let enabledPrefs: EnabledPrefs = {};
let persistencePromise: Promise<LibraryPersistence> | null = null;
let initPromise: Promise<void> | null = null;

const emit = (next: Partial<LibraryState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getPersistence = () => {
  if (!persistencePromise) persistencePromise = openLibraryPersistence();
  return persistencePromise;
};

const isEnabled = (id: string) => enabledPrefs[id] ?? true;

const withEnabled = (entry: LibraryEntry): LibraryEntry =>
  entry.enabled === isEnabled(entry.id) ? entry : { ...entry, enabled: isEnabled(entry.id) };

/** Reads IndexedDB once. Safe to call from every mount. */
export const initLibraries = (): Promise<void> => {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const persistence = await getPersistence();
      const [prefs, stored] = await Promise.all([persistence.loadEnabled(), persistence.loadLibraries()]);
      enabledPrefs = prefs;
      const imported = stored
        .sort((a, b) => (a.importedAt || 0) - (b.importedAt || 0))
        .map((library) => toImportedEntry(library, isEnabled(library.id)));
      emit({
        ready: true,
        persistent: persistence.persistent,
        entries: [...getOpenLibraries().map(withEnabled), ...imported]
      });
    } catch (err) {
      console.warn('[unbscolor] Could not load reference libraries:', err);
      emit({ ready: true, persistent: false });
    }
  })();
  return initPromise;
};

export const getLibraryState = () => state;

export const useReferenceLibraries = (): LibraryState => {
  const snapshot = useSyncExternalStore(subscribe, getLibraryState, getLibraryState);
  useEffect(() => {
    void initLibraries();
  }, []);
  return snapshot;
};

const newId = () => `user:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface ImportOutcome {
  entry: LibraryEntry;
  /** False when the browser would not store it: it lasts until reload. */
  persisted: boolean;
  /** True when it replaced a library of the same name. */
  replaced: boolean;
}

/** Parses a file and adds it to the libraries. Throws LibraryImportError on a bad file. */
export const importLibraryFile = async (file: LibraryFileLike): Promise<ImportOutcome> => {
  await initLibraries();
  const parsed = await readLibraryFile(file);
  const twin = state.entries.find((entry) => entry.source === 'imported' && entry.name === parsed.name);
  const stored: StoredLibrary = { ...parsed, id: twin ? twin.id : newId(), importedAt: Date.now() };
  const persistence = await getPersistence();
  const persisted = await persistence.saveLibrary(stored);
  const entry = toImportedEntry(stored, twin ? twin.enabled : true);
  const entries = twin
    ? state.entries.map((item) => (item.id === twin.id ? entry : item))
    : [...state.entries, entry];
  emit({ entries });
  return { entry, persisted, replaced: Boolean(twin) };
};

export const removeLibrary = async (id: string): Promise<void> => {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || entry.source !== 'imported') return;
  emit({ entries: state.entries.filter((item) => item.id !== id) });
  const persistence = await getPersistence();
  await persistence.removeLibrary(id);
  if (id in enabledPrefs) {
    const { [id]: _removed, ...rest } = enabledPrefs;
    void _removed;
    enabledPrefs = rest;
    await persistence.saveEnabled(enabledPrefs);
  }
};

export const setLibraryEnabled = async (id: string, enabled: boolean): Promise<void> => {
  enabledPrefs = { ...enabledPrefs, [id]: enabled };
  emit({ entries: state.entries.map((entry) => (entry.id === id ? { ...entry, enabled } : entry)) });
  const persistence = await getPersistence();
  await persistence.saveEnabled(enabledPrefs);
};

/** The UNBS JSON document of an imported library, ready to download. */
export const exportLibraryDocument = (id: string, now = new Date()) => {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !entry.stored) return null;
  return serializeUnbsLibrary(entry.stored, now);
};

// --- Selectors ----------------------------------------------------------------

const activeBooksCache = new WeakMap<LibraryEntry[], ReferenceBook[]>();

/** Books of the enabled libraries. Same array for the same entries (memo friendly). */
export const selectActiveBooks = (entries: LibraryEntry[]): ReferenceBook[] => {
  let books = activeBooksCache.get(entries);
  if (!books) {
    books = entries.filter((entry) => entry.enabled).flatMap((entry) => entry.books);
    activeBooksCache.set(entries, books);
  }
  return books;
};

/** The note an enabled imported library carries for this code, if any. */
export const selectReferenceNote = (entries: LibraryEntry[], code: string): AnalysisResult | undefined => {
  for (const entry of entries) {
    if (!entry.enabled || !entry.notes) continue;
    const note = findNote(entry.notes, code);
    if (note) return note;
  }
  return undefined;
};

export const useActiveBooks = (): ReferenceBook[] => selectActiveBooks(useReferenceLibraries().entries);

/** Test hook: forget everything and start again with the given persistence. */
export const resetLibraryStoreForTests = (persistence?: LibraryPersistence) => {
  state = { ready: false, persistent: false, entries: getOpenLibraries() };
  enabledPrefs = {};
  initPromise = null;
  persistencePromise = persistence ? Promise.resolve(persistence) : null;
  listeners.forEach((listener) => listener());
};

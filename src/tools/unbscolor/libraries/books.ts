import type { ReferenceColor } from '../types';
import { hexToLab, hexToRgb } from '../utils/colorMath';
import { sortFinishes } from '../constants';
import type { LibraryEntry, ReferenceBook, StoredBook, StoredLibrary } from './types';

/** Turns a stored book into one the matcher can search: Lab is computed once. */
export const toReferenceBook = (libraryId: string, libraryName: string, book: StoredBook): ReferenceBook => {
  const key = `${libraryId}/${book.id}`;
  const colors: ReferenceColor[] = book.colors.map((color) => ({
    code: color.code,
    name: color.code,
    hex: color.hex,
    rgb: hexToRgb(color.hex),
    lab: hexToLab(color.hex),
    cmyk: color.cmyk ? color.cmyk.map((v) => Math.round(v)).join(', ') : undefined,
    systemId: libraryId,
    systemName: libraryName,
    finishId: key,
    finish: book.finish,
    source: book.name
  }));
  return { key, libraryId, libraryName, name: book.name, finish: book.finish, colors };
};

export const countColors = (books: readonly { colors: readonly unknown[] }[]): number =>
  books.reduce((total, book) => total + book.colors.length, 0);

/** Builds the in-memory entry of an imported library. */
export const toImportedEntry = (stored: StoredLibrary, enabled: boolean): LibraryEntry => {
  const books = stored.books.map((book) => toReferenceBook(stored.id, stored.name, book));
  return {
    id: stored.id,
    name: stored.name,
    source: 'imported',
    format: stored.format,
    books,
    colorCount: countColors(books),
    finishes: sortFinishes(books.map((book) => book.finish)),
    enabled,
    importedAt: stored.importedAt,
    notes: stored.notes,
    stored
  };
};

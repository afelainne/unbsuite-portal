import { TAILWIND_COLORS } from '../data/open/tailwind';
import { OPEN_COLOR_COLORS } from '../data/open/openColor';
import { RADIX_COLORS } from '../data/open/radix';
import { MATERIAL_COLORS } from '../data/open/material';
import { toReferenceBook } from './books';
import type { LibraryEntry, StoredBook } from './types';

/**
 * The open palettes that ship with the app, so the Matcher answers out of the
 * box. Each one is permissively licensed; the licence of each is recorded in
 * its data file and in data/open/README.md.
 */

interface OpenPalette {
  id: string;
  name: string;
  /** Prefix of every code: "Tailwind red-500", "Open Color blue 6". */
  prefix: string;
  licence: string;
  colors: ReadonlyArray<readonly [string, string]>;
}

const OPEN_PALETTES: OpenPalette[] = [
  { id: 'open:tailwind', name: 'Tailwind CSS v3', prefix: 'Tailwind', licence: 'MIT', colors: TAILWIND_COLORS },
  { id: 'open:open-color', name: 'Open Color', prefix: 'Open Color', licence: 'MIT', colors: OPEN_COLOR_COLORS },
  { id: 'open:radix', name: 'Radix Colors', prefix: 'Radix', licence: 'MIT', colors: RADIX_COLORS },
  { id: 'open:material', name: 'Material Design 2', prefix: 'Material', licence: 'Apache-2.0', colors: MATERIAL_COLORS }
];

let cached: LibraryEntry[] | null = null;

/** Built once per session; the book arrays keep their identity for the match cache. */
export const getOpenLibraries = (): LibraryEntry[] => {
  if (cached) return cached;
  cached = OPEN_PALETTES.map((palette) => {
    const book: StoredBook = {
      id: 'main',
      name: palette.name,
      finish: '',
      colors: palette.colors.map(([name, hex]) => ({ code: `${palette.prefix} ${name}`, hex }))
    };
    const referenceBook = toReferenceBook(palette.id, palette.name, book);
    return {
      id: palette.id,
      name: palette.name,
      source: 'builtin' as const,
      licence: palette.licence,
      books: [referenceBook],
      colorCount: referenceBook.colors.length,
      finishes: [],
      enabled: true
    };
  });
  return cached;
};

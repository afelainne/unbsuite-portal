import type { ColorMatch } from '../types';
import { findReferenceMatches } from '../utils/colorMath';
import type { ReferenceBook } from './types';

export interface BookMatch {
  book: ReferenceBook;
  match: ColorMatch;
}

/**
 * The closest reference of each book, closest first. Used wherever one line
 * per library is shown: the multi-slot cards, the copied text, the palettes.
 */
export const bestPerBook = (hex: string, books: readonly ReferenceBook[], limit?: number): BookMatch[] => {
  const found: BookMatch[] = [];
  for (const book of books) {
    const match = findReferenceMatches(hex, book.colors, 1)[0];
    if (match) found.push({ book, match });
  }
  found.sort((a, b) => a.match.deltaE - b.match.deltaE);
  return typeof limit === 'number' ? found.slice(0, limit) : found;
};

/** The single closest reference across every book. */
export const closestReference = (hex: string, books: readonly ReferenceBook[]): ColorMatch | undefined =>
  bestPerBook(hex, books, 1)[0]?.match;

/** The nearest references across every book, closest first (the card's strip). */
export const nearestAcrossBooks = (hex: string, books: readonly ReferenceBook[], count: number): ColorMatch[] =>
  books
    .flatMap((book) => findReferenceMatches(hex, book.colors, count))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, count);

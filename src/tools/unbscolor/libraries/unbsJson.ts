import type { AnalysisResult } from '../types';
import { hexToRgb, normalizeHex, rgbToHex } from '../utils/colorMath';
import { cleanReferenceCode } from '../utils/reference';
import { LIBRARY_LIMITS, LibraryImportError, type StoredBook, type StoredColor, type StoredLibrary } from './types';

/**
 * The UNBS reference library format: one JSON file holding one or more books
 * and, optionally, notes keyed by reference code. See data/LIBRARY_FORMAT.md.
 */

export const UNBS_LIBRARY_FORMAT = 'unbs-reference-library';
export const UNBS_LIBRARY_VERSION = 1;

type Languages = 'en' | 'pt' | 'es';
const LANGUAGES: Languages[] = ['en', 'pt', 'es'];

export type ParsedLibrary = Omit<StoredLibrary, 'id' | 'importedAt'>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/** A finish is a short suffix such as C, U, CP or UP. Anything else reads as none. */
export const cleanFinish = (value: unknown): string => {
  const finish = cleanText(value, 8).toUpperCase();
  return /^[A-Z0-9+]{1,6}$/.test(finish) ? finish : '';
};

const isByte = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 255;

const readCmyk = (value: unknown): StoredColor['cmyk'] => {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  if (!value.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100)) return undefined;
  return [value[0], value[1], value[2], value[3]];
};

const readColor = (value: unknown): StoredColor | null => {
  if (!isObject(value)) return null;
  const code = cleanReferenceCode(cleanText(value.code, LIBRARY_LIMITS.maxCodeLength));
  if (!code) return null;
  let hex = typeof value.hex === 'string' ? normalizeHex(value.hex) : null;
  if (!hex && Array.isArray(value.rgb) && value.rgb.length === 3 && value.rgb.every(isByte)) {
    hex = rgbToHex(value.rgb[0], value.rgb[1], value.rgb[2]);
  }
  if (!hex) return null;
  const cmyk = readCmyk(value.cmyk);
  return cmyk ? { code, hex, cmyk } : { code, hex };
};

const readLocalized = (value: unknown): Record<Languages, string> | null => {
  if (typeof value === 'string' && value.trim()) {
    const text = value.trim();
    return { en: text, pt: text, es: text };
  }
  if (!isObject(value)) return null;
  const found = LANGUAGES.map((lang) => (typeof value[lang] === 'string' ? (value[lang] as string).trim() : ''));
  const fallback = found.find(Boolean);
  if (!fallback) return null;
  return { en: found[0] || fallback, pt: found[1] || fallback, es: found[2] || fallback };
};

const readTips = (value: unknown): Record<Languages, string[]> | null => {
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0).map((tip) => tip.trim()) : [];
  if (Array.isArray(value)) {
    const tips = list(value);
    return tips.length ? { en: tips, pt: tips, es: tips } : null;
  }
  if (!isObject(value)) return null;
  const found = LANGUAGES.map((lang) => list(value[lang]));
  const fallback = found.find((tips) => tips.length > 0);
  if (!fallback) return null;
  return {
    en: found[0].length ? found[0] : fallback,
    pt: found[1].length ? found[1] : fallback,
    es: found[2].length ? found[2] : fallback
  };
};

const EMPTY_TEXT = { en: '', pt: '', es: '' };
const EMPTY_TIPS = { en: [], pt: [], es: [] };

/** One note: any of the three parts is enough; missing languages borrow a present one. */
export const readNote = (value: unknown): AnalysisResult | null => {
  if (!isObject(value)) return null;
  const description = readLocalized(value.description);
  const psychology = readLocalized(value.psychology);
  const usageTips = readTips(value.usageTips);
  if (!description && !psychology && !usageTips) return null;
  return {
    description: description || EMPTY_TEXT,
    psychology: psychology || EMPTY_TEXT,
    usageTips: usageTips || EMPTY_TIPS
  };
};

const readNotes = (value: unknown): Record<string, AnalysisResult> | undefined => {
  if (!isObject(value)) return undefined;
  const notes: Record<string, AnalysisResult> = {};
  let count = 0;
  for (const [rawKey, rawNote] of Object.entries(value)) {
    const key = cleanReferenceCode(rawKey);
    const note = key ? readNote(rawNote) : null;
    if (!note) continue;
    notes[key] = note;
    count += 1;
    if (count >= LIBRARY_LIMITS.maxColorsPerLibrary) break;
  }
  return count ? notes : undefined;
};

/**
 * Validates a parsed UNBS JSON document. Throws a LibraryImportError naming
 * what is wrong; a colour without a code or a usable value rejects the file,
 * so a half-read library never reaches the matcher.
 */
export const parseUnbsLibrary = (value: unknown, fallbackName = 'Library'): ParsedLibrary => {
  if (!isObject(value) || value.format !== UNBS_LIBRARY_FORMAT) throw new LibraryImportError('badFormat');
  if (value.version !== UNBS_LIBRARY_VERSION) throw new LibraryImportError('badVersion', String(value.version));
  if (!Array.isArray(value.books) || value.books.length === 0) throw new LibraryImportError('noBooks');
  if (value.books.length > LIBRARY_LIMITS.maxBooks) throw new LibraryImportError('tooManyColors', `${value.books.length} books`);

  const usedIds = new Set<string>();
  const books: StoredBook[] = [];
  let total = 0;

  value.books.forEach((rawBook, bookIndex) => {
    if (!isObject(rawBook) || !Array.isArray(rawBook.colors)) {
      throw new LibraryImportError('badBook', String(bookIndex + 1));
    }
    let id = cleanText(rawBook.id, 64) || `book-${bookIndex + 1}`;
    while (usedIds.has(id)) id = `${id}-${bookIndex + 1}`;
    usedIds.add(id);
    const name = cleanText(rawBook.name, LIBRARY_LIMITS.maxNameLength) || id;

    if (rawBook.colors.length > LIBRARY_LIMITS.maxColorsPerBook) {
      throw new LibraryImportError('tooManyColors', name);
    }
    const colors = rawBook.colors.map((rawColor, colorIndex) => {
      const color = readColor(rawColor);
      if (!color) throw new LibraryImportError('badColor', `${name} · ${colorIndex + 1}`);
      return color;
    });
    total += colors.length;
    if (total > LIBRARY_LIMITS.maxColorsPerLibrary) throw new LibraryImportError('tooManyColors', String(total));
    if (colors.length) books.push({ id, name, finish: cleanFinish(rawBook.finish), colors });
  });

  if (total === 0) throw new LibraryImportError('noColors');

  const name = cleanText(value.name, LIBRARY_LIMITS.maxNameLength) || fallbackName;
  const notes = readNotes(value.notes);
  return notes ? { name, format: 'unbs-json', books, notes } : { name, format: 'unbs-json', books };
};

/** Writes a library back to the UNBS JSON format. */
export const serializeUnbsLibrary = (library: Pick<StoredLibrary, 'name' | 'books' | 'notes'>, now = new Date()) => {
  const document: Record<string, unknown> = {
    format: UNBS_LIBRARY_FORMAT,
    version: UNBS_LIBRARY_VERSION,
    name: library.name,
    exportedAt: now.toISOString(),
    books: library.books.map((book) => ({
      id: book.id,
      name: book.name,
      finish: book.finish,
      colors: book.colors.map((color) => {
        const rgb = hexToRgb(color.hex);
        const out: Record<string, unknown> = { code: color.code, hex: color.hex, rgb: [rgb.r, rgb.g, rgb.b] };
        if (color.cmyk) out.cmyk = color.cmyk;
        return out;
      })
    }))
  };
  if (library.notes && Object.keys(library.notes).length) document.notes = library.notes;
  return document;
};

// --- Notes lookup ------------------------------------------------------------

const noteIndexCache = new WeakMap<Record<string, AnalysisResult>, Map<string, AnalysisResult>>();

const noteIndex = (notes: Record<string, AnalysisResult>) => {
  let index = noteIndexCache.get(notes);
  if (!index) {
    index = new Map();
    for (const [key, note] of Object.entries(notes)) index.set(cleanReferenceCode(key).toUpperCase(), note);
    noteIndexCache.set(notes, index);
  }
  return index;
};

/**
 * Finds the note for a code. Notes may be keyed with or without the prefix a
 * book puts before its codes ("ACME 100 CP" and "100 CP" both find "100 CP"),
 * so leading words are dropped one at a time, never down to a lone suffix.
 */
export const findNote = (notes: Record<string, AnalysisResult> | undefined, code: string): AnalysisResult | undefined => {
  if (!notes) return undefined;
  const index = noteIndex(notes);
  const tokens = cleanReferenceCode(code).toUpperCase().split(' ').filter(Boolean);
  for (let start = 0; start < tokens.length; start++) {
    if (start > 0 && tokens.length - start < 2) break;
    const note = index.get(tokens.slice(start).join(' '));
    if (note) return note;
  }
  return undefined;
};

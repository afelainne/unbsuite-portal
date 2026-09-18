import { parseACB } from '../utils/acbParser';
import { parseAse } from '../utils/paletteExport';
import { normalizeHex } from '../utils/colorMath';
import { cleanReferenceCode, referenceFinish } from '../utils/reference';
import { LIBRARY_LIMITS, LibraryImportError, type StoredBook, type StoredColor } from './types';
import { parseUnbsLibrary, type ParsedLibrary } from './unbsJson';

/**
 * Reads a library file the person picked. Everything happens here, in the
 * browser: the file is never sent anywhere.
 */

export interface LibraryFileLike {
  name: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export const ACCEPTED_LIBRARY_FILES = '.acb,.ase,.json,application/json';

const baseName = (fileName: string) => fileName.replace(/\.[^./\\]+$/, '').trim() || 'Library';

/** The finish every code of a book shares, or "" when they disagree. */
const sharedFinish = (colors: StoredColor[]): string => {
  let finish: string | null = null;
  for (const color of colors) {
    const current = referenceFinish(color.code);
    if (finish === null) finish = current;
    else if (finish !== current) return '';
  }
  return finish || '';
};

const checkCount = (books: StoredBook[]) => {
  const total = books.reduce((sum, book) => sum + book.colors.length, 0);
  if (total === 0) throw new LibraryImportError('noColors');
  if (books.some((book) => book.colors.length > LIBRARY_LIMITS.maxColorsPerBook) || total > LIBRARY_LIMITS.maxColorsPerLibrary) {
    throw new LibraryImportError('tooManyColors', String(total));
  }
};

const toStoredColor = (code: string, hex: string, cmyk?: StoredColor['cmyk']): StoredColor | null => {
  const clean = cleanReferenceCode(code).slice(0, LIBRARY_LIMITS.maxCodeLength);
  const normalized = normalizeHex(hex);
  if (!clean || !normalized) return null;
  return cmyk ? { code: clean, hex: normalized, cmyk } : { code: clean, hex: normalized };
};

export const readAcbLibrary = async (buffer: ArrayBuffer, fallbackName: string): Promise<ParsedLibrary> => {
  let parsed: Awaited<ReturnType<typeof parseACB>>;
  try {
    parsed = await parseACB(buffer);
  } catch (err) {
    throw new LibraryImportError('badAcb', err instanceof Error ? err.message : undefined);
  }
  const colors = parsed.colors
    .map((color) => toStoredColor(color.code || color.name, color.hex))
    .filter((color): color is StoredColor => color !== null);
  const name = (parsed.name && parsed.name !== 'Imported Library' ? parsed.name : fallbackName).slice(0, LIBRARY_LIMITS.maxNameLength);
  const books: StoredBook[] = [{ id: 'book-1', name, finish: sharedFinish(colors), colors }];
  checkCount(books);
  return { name, format: 'acb', books };
};

export const readAseLibrary = (buffer: ArrayBuffer, fallbackName: string): ParsedLibrary => {
  let swatches: ReturnType<typeof parseAse>;
  try {
    swatches = parseAse(buffer);
  } catch (err) {
    throw new LibraryImportError('badAse', err instanceof Error ? err.message : undefined);
  }
  // Each group of the file becomes a book; loose swatches go to one named after the file.
  const byGroup = new Map<string, StoredColor[]>();
  swatches.forEach((swatch, index) => {
    const cmyk: StoredColor['cmyk'] =
      swatch.model === 'CMYK' ? [swatch.values[0] * 100, swatch.values[1] * 100, swatch.values[2] * 100, swatch.values[3] * 100] : undefined;
    const color = toStoredColor(swatch.name || `${index + 1}`, swatch.hex, cmyk);
    if (!color) return;
    const group = (swatch.group || '').trim() || fallbackName;
    const list = byGroup.get(group);
    if (list) list.push(color);
    else byGroup.set(group, [color]);
  });
  const books: StoredBook[] = Array.from(byGroup.entries())
    .slice(0, LIBRARY_LIMITS.maxBooks)
    .map(([group, colors], index) => ({
      id: `book-${index + 1}`,
      name: group.slice(0, LIBRARY_LIMITS.maxNameLength),
      finish: sharedFinish(colors),
      colors
    }));
  checkCount(books);
  return { name: fallbackName.slice(0, LIBRARY_LIMITS.maxNameLength), format: 'ase', books };
};

export const readUnbsJsonLibrary = (buffer: ArrayBuffer, fallbackName: string): ParsedLibrary => {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new LibraryImportError('badJson');
  }
  return parseUnbsLibrary(value, fallbackName);
};

const signature = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  return String.fromCharCode(...Array.from(bytes));
};

/** Detects the format by extension, then by the first bytes, and parses the file. */
export const readLibraryFile = async (file: LibraryFileLike): Promise<ParsedLibrary> => {
  if (file.size > LIBRARY_LIMITS.maxFileBytes) throw new LibraryImportError('tooLarge');
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > LIBRARY_LIMITS.maxFileBytes) throw new LibraryImportError('tooLarge');
  const fallbackName = baseName(file.name);
  const extension = (file.name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
  const magic = signature(buffer);

  if (extension === 'acb' || magic === '8BCB') return readAcbLibrary(buffer, fallbackName);
  if (extension === 'ase' || magic === 'ASEF') return readAseLibrary(buffer, fallbackName);
  if (extension === 'json' || magic.trimStart().startsWith('{')) return readUnbsJsonLibrary(buffer, fallbackName);
  throw new LibraryImportError('unsupported');
};

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOpenLibraries } from '../libraries/open';
import { findNote, parseUnbsLibrary, serializeUnbsLibrary, UNBS_LIBRARY_FORMAT } from '../libraries/unbsJson';
import { readLibraryFile, type LibraryFileLike } from '../libraries/importFile';
import { createMemoryPersistence, openLibraryPersistence } from '../libraries/persistence';
import {
  exportLibraryDocument,
  getLibraryState,
  importLibraryFile,
  initLibraries,
  removeLibrary,
  resetLibraryStoreForTests,
  selectActiveBooks,
  selectReferenceNote,
  setLibraryEnabled
} from '../libraries/store';
import { bestPerBook, closestReference, nearestAcrossBooks } from '../libraries/matching';
import { LIBRARY_LIMITS, LibraryImportError } from '../libraries/types';
import { toAse } from '../utils/paletteExport';
import { sortFinishes } from '../constants';

// --- Synthetic fixtures (never real reference data) ---------------------------

const note = (text: string) => ({
  description: { en: `${text} en`, pt: `${text} pt`, es: `${text} es` },
  usageTips: { en: ['tip en'], pt: ['dica pt'], es: ['consejo es'] },
  psychology: { en: 'calm', pt: 'calmo', es: 'calmo es' }
});

const sampleDocument = () => ({
  format: UNBS_LIBRARY_FORMAT,
  version: 1,
  name: 'Test inks',
  exportedAt: '2026-01-01T00:00:00.000Z',
  books: [
    {
      id: 'solid-c',
      name: 'Test Solid Coated',
      finish: 'C',
      colors: [
        { code: 'TEST 10 C', hex: '#FF0000', rgb: [255, 0, 0] },
        { code: 'TEST 20 C', hex: '#00ff00', rgb: [0, 255, 0], cmyk: [60, 0, 100, 0] }
      ]
    },
    {
      id: 'solid-u',
      name: 'Test Solid Uncoated',
      finish: 'U',
      colors: [{ code: 'TEST 10 U', rgb: [240, 20, 20] }]
    }
  ],
  notes: { '10 C': note('ten'), 'bad entry': 5 }
});

const fileOf = (name: string, content: string | Uint8Array | ArrayBuffer): LibraryFileLike => {
  const bytes =
    typeof content === 'string' ? new TextEncoder().encode(content) : content instanceof Uint8Array ? content : new Uint8Array(content);
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  };
};

/** Minimal standard Adobe Color Book: v1, UTF-16 strings, 8-bit components. */
const buildAcb = (title: string, prefix: string, suffix: string, colorSpace: 0 | 2 | 7, records: { name: string; c: number[] }[]) => {
  const bytes: number[] = [];
  const u8 = (v: number) => bytes.push(v & 0xff);
  const u16 = (v: number) => {
    u8(v >> 8);
    u8(v);
  };
  const u32 = (v: number) => {
    u16(v >>> 16);
    u16(v & 0xffff);
  };
  const str = (s: string) => {
    u32(s.length);
    for (let i = 0; i < s.length; i++) u16(s.charCodeAt(i));
  };
  '8BCB'.split('').forEach((ch) => u8(ch.charCodeAt(0)));
  u16(1);
  u16(3000);
  str(title);
  str(prefix);
  str(suffix);
  str('');
  u16(records.length);
  u16(7);
  u16(0);
  u16(colorSpace);
  records.forEach((r) => {
    str(r.name);
    'ABCDEF'.split('').forEach((ch) => u8(ch.charCodeAt(0)));
    r.c.forEach(u8);
  });
  return Uint8Array.from(bytes);
};

// --- Open palettes -----------------------------------------------------------

describe('open palettes', () => {
  it('ship four permissively licensed palettes with valid colours', () => {
    const libraries = getOpenLibraries();
    expect(libraries.map((library) => library.name)).toEqual(['Tailwind CSS v3', 'Open Color', 'Radix Colors', 'Material Design 2']);
    for (const library of libraries) {
      expect(['MIT', 'Apache-2.0']).toContain(library.licence);
      expect(library.enabled).toBe(true);
      expect(library.finishes).toEqual([]);
      expect(library.colorCount).toBeGreaterThan(100);
      for (const color of library.books[0].colors) {
        expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
        expect(color.lab).toBeDefined();
        expect(color.finish).toBe('');
      }
    }
  });

  it('names codes after the palette', () => {
    const codes = getOpenLibraries().flatMap((library) => library.books[0].colors.map((color) => color.code));
    expect(codes).toContain('Tailwind red-500');
    expect(codes).toContain('Open Color blue 6');
    expect(codes).toContain('Radix blue 9');
    expect(codes).toContain('Material red A200');
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('answer the matcher out of the box', () => {
    const books = getOpenLibraries().flatMap((library) => library.books);
    const best = closestReference('#EF4444', books);
    expect(best?.reference.code).toBe('Tailwind red-500');
    expect(best?.deltaE).toBeLessThan(0.5);
    expect(bestPerBook('#EF4444', books)).toHaveLength(4);
    expect(nearestAcrossBooks('#EF4444', books, 6)).toHaveLength(6);
  });
});

// --- UNBS JSON ---------------------------------------------------------------

describe('UNBS JSON library format', () => {
  it('reads books, finishes, colours and notes', () => {
    const parsed = parseUnbsLibrary(sampleDocument());
    expect(parsed.name).toBe('Test inks');
    expect(parsed.books.map((book) => [book.id, book.finish, book.colors.length])).toEqual([
      ['solid-c', 'C', 2],
      ['solid-u', 'U', 1]
    ]);
    expect(parsed.books[0].colors[1]).toEqual({ code: 'TEST 20 C', hex: '#00FF00', cmyk: [60, 0, 100, 0] });
    // A colour with only rgb is accepted.
    expect(parsed.books[1].colors[0].hex).toBe('#F01414');
    // The malformed note is dropped, the good one kept.
    expect(Object.keys(parsed.notes || {})).toEqual(['10 C']);
  });

  it('rejects malformed files with a named reason', () => {
    const code = (value: unknown) => {
      try {
        parseUnbsLibrary(value);
      } catch (err) {
        return err instanceof LibraryImportError ? `${err.code}${err.detail ? `:${err.detail}` : ''}` : 'other';
      }
      return 'ok';
    };
    expect(code(null)).toBe('badFormat');
    expect(code({ format: 'something-else', version: 1, books: [] })).toBe('badFormat');
    expect(code({ ...sampleDocument(), version: 2 })).toBe('badVersion:2');
    expect(code({ ...sampleDocument(), books: [] })).toBe('noBooks');
    expect(code({ ...sampleDocument(), books: [{ id: 'x' }] })).toBe('badBook:1');
    const badColor = sampleDocument();
    (badColor.books[0].colors as unknown[]).push({ code: 'NO VALUE' });
    expect(code(badColor)).toBe('badColor:Test Solid Coated · 3');
    expect(code({ ...sampleDocument(), books: [{ id: 'e', colors: [] }] })).toBe('noColors');
  });

  it('caps the number of colours', () => {
    const colors = Array.from({ length: LIBRARY_LIMITS.maxColorsPerBook + 1 }, (_, i) => ({ code: `X ${i}`, hex: '#000000' }));
    expect(() => parseUnbsLibrary({ ...sampleDocument(), books: [{ id: 'big', colors }] })).toThrow(/tooManyColors/);
  });

  it('round-trips through the exporter', () => {
    const parsed = parseUnbsLibrary(sampleDocument());
    const exported = serializeUnbsLibrary(parsed, new Date('2026-02-02T00:00:00Z'));
    expect(exported.format).toBe(UNBS_LIBRARY_FORMAT);
    expect(exported.exportedAt).toBe('2026-02-02T00:00:00.000Z');
    const again = parseUnbsLibrary(JSON.parse(JSON.stringify(exported)));
    expect(again.books).toEqual(parsed.books);
    expect(again.notes).toEqual(parsed.notes);
    expect((exported.books as { colors: { rgb: number[] }[] }[])[0].colors[0].rgb).toEqual([255, 0, 0]);
  });

  it('finds notes with or without the prefix of the book', () => {
    const notes = parseUnbsLibrary(sampleDocument()).notes;
    expect(findNote(notes, 'TEST 10 C')?.description.pt).toBe('ten pt');
    expect(findNote(notes, '10 c')?.description.en).toBe('ten en');
    expect(findNote(notes, 'TEST 20 C')).toBeUndefined();
    // Never down to a lone finish.
    expect(findNote({ C: note('lone') }, 'TEST 99 C')).toBeUndefined();
  });
});

// --- File import ---------------------------------------------------------------

describe('reading a library file', () => {
  it('reads UNBS JSON by extension', async () => {
    const parsed = await readLibraryFile(fileOf('mine.json', JSON.stringify(sampleDocument())));
    expect(parsed.format).toBe('unbs-json');
    expect(parsed.books).toHaveLength(2);
  });

  it('reads an .acb color book into one book with its finish', async () => {
    const acb = buildAcb('$$$/book/T/title=Test Book$$$/x', '$$$/book/T/prefix=TEST ', '$$$/book/T/suffix= C', 7, [
      { name: '100', c: [Math.round(53.24 * 2.55), 128 + 80, 128 + 67] },
      { name: '200', c: [Math.round(32.3 * 2.55), 128 + 79, 128 - 108] }
    ]);
    const parsed = await readLibraryFile(fileOf('book.acb', acb));
    expect(parsed.format).toBe('acb');
    expect(parsed.name).toBe('Test Book');
    expect(parsed.books[0].finish).toBe('C');
    expect(parsed.books[0].colors.map((color) => color.code)).toEqual(['TEST 100 C', 'TEST 200 C']);
  });

  it('reads an .ase file, one book per group', async () => {
    const ase = toAse(
      [
        { name: 'Brand red', hex: '#E30613' },
        { name: 'Brand navy', hex: '#1B365D' }
      ],
      { groupName: 'Brand', model: 'CMYK' }
    );
    const parsed = await readLibraryFile(fileOf('brand.ase', ase));
    expect(parsed.format).toBe('ase');
    expect(parsed.name).toBe('brand');
    expect(parsed.books).toHaveLength(1);
    expect(parsed.books[0].name).toBe('Brand');
    expect(parsed.books[0].colors[0].code).toBe('Brand red');
    expect(parsed.books[0].colors[0].cmyk).toHaveLength(4);
  });

  it('sniffs the format when the extension is missing', async () => {
    const parsed = await readLibraryFile(fileOf('noext', JSON.stringify(sampleDocument())));
    expect(parsed.format).toBe('unbs-json');
  });

  it('refuses unknown, broken and oversized files', async () => {
    await expect(readLibraryFile(fileOf('x.txt', 'hello'))).rejects.toMatchObject({ code: 'unsupported' });
    await expect(readLibraryFile(fileOf('x.json', '{ nope'))).rejects.toMatchObject({ code: 'badJson' });
    await expect(readLibraryFile(fileOf('x.acb', new Uint8Array(3)))).rejects.toMatchObject({ code: 'badAcb' });
    await expect(readLibraryFile(fileOf('x.ase', new Uint8Array(20)))).rejects.toMatchObject({ code: 'badAse' });
    const huge: LibraryFileLike = { name: 'big.json', size: LIBRARY_LIMITS.maxFileBytes + 1, arrayBuffer: vi.fn() };
    await expect(readLibraryFile(huge)).rejects.toMatchObject({ code: 'tooLarge' });
    expect(huge.arrayBuffer).not.toHaveBeenCalled();
  });
});

// --- Store and persistence ---------------------------------------------------

describe('library store', () => {
  let persistence = createMemoryPersistence();

  beforeEach(() => {
    persistence = createMemoryPersistence();
    resetLibraryStoreForTests(persistence);
  });
  afterEach(() => resetLibraryStoreForTests());

  it('falls back to memory when IndexedDB is missing', async () => {
    const fallback = await openLibraryPersistence();
    expect(fallback.persistent).toBe(false);
  });

  it('imports, persists, toggles, exports and removes a library', async () => {
    await initLibraries();
    const openCount = getLibraryState().entries.length;
    const outcome = await importLibraryFile(fileOf('mine.json', JSON.stringify(sampleDocument())));
    expect(outcome.persisted).toBe(true);
    expect(outcome.entry.finishes).toEqual(['C', 'U']);
    expect(getLibraryState().entries).toHaveLength(openCount + 1);

    const books = selectActiveBooks(getLibraryState().entries);
    expect(sortFinishes(books.map((book) => book.finish))).toEqual(['C', 'U']);
    expect(closestReference('#FF0000', books)?.reference.code).toBe('TEST 10 C');
    expect(selectReferenceNote(getLibraryState().entries, 'TEST 10 C')?.psychology.pt).toBe('calmo');

    // A reload reads it back from the persistence.
    resetLibraryStoreForTests(persistence);
    await initLibraries();
    const reloaded = getLibraryState().entries.find((entry) => entry.name === 'Test inks');
    expect(reloaded?.colorCount).toBe(3);

    await setLibraryEnabled(reloaded!.id, false);
    expect(selectActiveBooks(getLibraryState().entries).some((book) => book.finish === 'C')).toBe(false);
    expect(selectReferenceNote(getLibraryState().entries, 'TEST 10 C')).toBeUndefined();
    resetLibraryStoreForTests(persistence);
    await initLibraries();
    expect(getLibraryState().entries.find((entry) => entry.id === reloaded!.id)?.enabled).toBe(false);

    const document = exportLibraryDocument(reloaded!.id) as { name: string; books: unknown[] };
    expect(document.name).toBe('Test inks');
    expect(document.books).toHaveLength(2);

    await removeLibrary(reloaded!.id);
    expect(getLibraryState().entries).toHaveLength(openCount);
    expect(await persistence.loadLibraries()).toEqual([]);
  });

  it('replaces a library imported again under the same name', async () => {
    await importLibraryFile(fileOf('a.json', JSON.stringify(sampleDocument())));
    const second = await importLibraryFile(fileOf('b.json', JSON.stringify(sampleDocument())));
    expect(second.replaced).toBe(true);
    expect(getLibraryState().entries.filter((entry) => entry.source === 'imported')).toHaveLength(1);
  });

  it('can switch an open palette off, never remove it', async () => {
    await initLibraries();
    const tailwind = getLibraryState().entries[0];
    await setLibraryEnabled(tailwind.id, false);
    expect(selectActiveBooks(getLibraryState().entries).some((book) => book.libraryId === tailwind.id)).toBe(false);
    await removeLibrary(tailwind.id);
    expect(getLibraryState().entries.some((entry) => entry.id === tailwind.id)).toBe(true);
  });
});

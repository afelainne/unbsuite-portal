import type { AnalysisResult, ReferenceColor } from '../types';

/**
 * Reference libraries: the palettes the Matcher searches.
 *
 * Two kinds live side by side. The built-in ones are small open palettes that
 * ship with the app. The imported ones are files the person loads from their
 * own computer (.acb, .ase or UNBS JSON); they are parsed in the browser,
 * kept in IndexedDB on that device and never uploaded anywhere.
 */

export type LibraryFormat = 'acb' | 'ase' | 'unbs-json';

/** A colour as it is stored and exported: the file's own code and value. */
export interface StoredColor {
  code: string;
  /** #RRGGBB, upper case. */
  hex: string;
  /** Optional ink recipe carried by the file, 0–100 each. */
  cmyk?: [number, number, number, number];
}

/** One book inside a library: a set of colours sharing a finish. */
export interface StoredBook {
  id: string;
  name: string;
  /** Finish suffix the codes carry ("C", "U", "CP"…), or "" when none. */
  finish: string;
  colors: StoredColor[];
}

/** An imported library as persisted in IndexedDB. */
export interface StoredLibrary {
  id: string;
  name: string;
  format: LibraryFormat;
  importedAt: number;
  books: StoredBook[];
  /** Notes keyed by reference code, as written in the file. */
  notes?: Record<string, AnalysisResult>;
}

/** A book ready for matching: colours carry their Lab values. */
export interface ReferenceBook {
  /** Unique across libraries: "<libraryId>/<bookId>". */
  key: string;
  libraryId: string;
  libraryName: string;
  name: string;
  finish: string;
  colors: ReferenceColor[];
}

export interface LibraryEntry {
  id: string;
  name: string;
  source: 'builtin' | 'imported';
  format?: LibraryFormat;
  /** Licence of a built-in palette, shown under its name. */
  licence?: string;
  books: ReferenceBook[];
  colorCount: number;
  /** Finishes carried by the books, in display order. Empty for open palettes. */
  finishes: string[];
  enabled: boolean;
  importedAt?: number;
  notes?: Record<string, AnalysisResult>;
  /** The persisted form, kept for export. Only on imported libraries. */
  stored?: StoredLibrary;
}

export interface LibraryState {
  /** False until IndexedDB has been read once. */
  ready: boolean;
  /** False when the browser refused IndexedDB: imports last until reload. */
  persistent: boolean;
  entries: LibraryEntry[];
}

/** Error codes an import can fail with; the UI words them per language. */
export type LibraryErrorCode =
  | 'tooLarge'
  | 'unsupported'
  | 'badJson'
  | 'badFormat'
  | 'badVersion'
  | 'noBooks'
  | 'badBook'
  | 'badColor'
  | 'noColors'
  | 'tooManyColors'
  | 'badAcb'
  | 'badAse';

export class LibraryImportError extends Error {
  readonly code: LibraryErrorCode;
  /** Extra context for the message: book name, colour index… */
  readonly detail?: string;

  constructor(code: LibraryErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'LibraryImportError';
    this.code = code;
    this.detail = detail;
  }
}

/** Import limits. The UNBS JSON of a full set of four books is about 12 MB. */
export const LIBRARY_LIMITS = {
  maxFileBytes: 50 * 1024 * 1024,
  maxBooks: 64,
  maxColorsPerBook: 20_000,
  maxColorsPerLibrary: 100_000,
  maxCodeLength: 120,
  maxNameLength: 120
} as const;

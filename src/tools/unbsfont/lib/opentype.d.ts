/** Tipos mínimos do opentype.js 1.3, só o que o UNBSFONT usa (o pacote não traz tipos). */
declare module 'opentype.js' {
  export type PathCommand =
    | { type: 'M' | 'L'; x: number; y: number }
    | { type: 'Q'; x1: number; y1: number; x: number; y: number }
    | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
    | { type: 'Z' };

  export class Path {
    commands: PathCommand[];
  }

  export class Glyph {
    constructor(options: { name: string; unicode?: number; advanceWidth: number; path: Path });
    name: string;
    index: number;
    unicode?: number;
    unicodes: number[];
    addUnicode(unicode: number): void;
    advanceWidth: number;
    path: Path;
  }

  export interface FontConstructorOptions {
    familyName: string;
    styleName: string;
    fullName?: string;
    postScriptName?: string;
    designer?: string;
    manufacturer?: string;
    version?: string;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: Glyph[];
    tables?: { os2?: Record<string, number> };
  }

  export class Font {
    constructor(options: FontConstructorOptions);
    names: Record<string, { en: string }>;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    glyphs: { length: number; get(index: number): Glyph };
    tables: Record<string, Record<string, unknown>>;
    toArrayBuffer(): ArrayBuffer;
    charToGlyph(c: string): Glyph;
    charToGlyphIndex(c: string): number;
    getKerningValue(left: Glyph | number, right: Glyph | number): number;
  }

  export function parse(buffer: ArrayBuffer): Font;
}

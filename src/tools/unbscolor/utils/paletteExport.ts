// Palette exporters: CSS variables, Tailwind (v3 config / v4 @theme),
// W3C Design Tokens (DTCG), Adobe Swatch Exchange (.ase, binary) and GIMP (.gpl).

import { hexToRgb, normalizeHex, rgbToCmyk, hexToLab, rgbToHex, labToHex } from './colorMath';
import { formatOklch } from './oklab';

export interface PaletteSwatch {
  name: string;
  hex: string;
}

/** name -> hex, or name -> { shade -> hex } (e.g. a tonal scale). */
export type PaletteGroups = Record<string, string | Record<string | number, string>>;

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** kebab-case ASCII identifier, safe for CSS custom properties and JS keys. */
export const slugifyColorName = (name: string, fallback = 'color'): string => {
  const slug = String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) return fallback;
  return /^[0-9]/.test(slug) ? `${fallback}-${slug}` : slug;
};

/** Valid swatches with unique slugs (duplicates get -2, -3…). Invalid hex entries are dropped. */
export const prepareSwatches = (swatches: PaletteSwatch[]): { slug: string; name: string; hex: string }[] => {
  const used = new Map<string, number>();
  const out: { slug: string; name: string; hex: string }[] = [];
  swatches.forEach((s, i) => {
    const hex = normalizeHex(s?.hex);
    if (!hex) return;
    const baseSlug = slugifyColorName(s.name, `color-${i + 1}`);
    const n = (used.get(baseSlug) ?? 0) + 1;
    used.set(baseSlug, n);
    out.push({ slug: n === 1 ? baseSlug : `${baseSlug}-${n}`, name: s.name || hex, hex });
  });
  return out;
};

// ---------------------------------------------------------------------------
// CSS custom properties
// ---------------------------------------------------------------------------

export type CssColorFormat = 'hex' | 'rgb' | 'oklch';

export interface CssVariablesOptions {
  /** Variable prefix: `--{prefix}-{name}`. Empty string for `--{name}`. Default "color". */
  prefix?: string;
  selector?: string;
  format?: CssColorFormat;
}

const formatCssColor = (hex: string, format: CssColorFormat): string => {
  if (format === 'rgb') {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${r} ${g} ${b})`;
  }
  if (format === 'oklch') return formatOklch(hex);
  return hex;
};

export const toCssVariables = (swatches: PaletteSwatch[], options: CssVariablesOptions = {}): string => {
  const { prefix = 'color', selector = ':root', format = 'hex' } = options;
  const pre = prefix ? `${slugifyColorName(prefix)}-` : '';
  const lines = prepareSwatches(swatches).map(
    (s) => `  --${pre}${s.slug}: ${formatCssColor(s.hex, format)};`
  );
  return `${selector} {\n${lines.join('\n')}\n}\n`;
};

// ---------------------------------------------------------------------------
// Tailwind
// ---------------------------------------------------------------------------

const swatchesToGroups = (input: PaletteSwatch[] | PaletteGroups): Record<string, string | Record<string, string>> => {
  if (Array.isArray(input)) {
    return Object.fromEntries(prepareSwatches(input).map((s) => [s.slug, s.hex]));
  }
  const out: Record<string, string | Record<string, string>> = {};
  const used = new Set<string>();
  for (const [rawName, value] of Object.entries(input)) {
    let key = slugifyColorName(rawName);
    let n = 2;
    while (used.has(key)) key = `${slugifyColorName(rawName)}-${n++}`;
    if (typeof value === 'string') {
      const hex = normalizeHex(value);
      if (!hex) continue;
      out[key] = hex;
    } else if (value && typeof value === 'object') {
      const shades: Record<string, string> = {};
      for (const [shade, v] of Object.entries(value)) {
        const hex = normalizeHex(v);
        if (hex) shades[String(shade)] = hex;
      }
      if (!Object.keys(shades).length) continue;
      out[key] = shades;
    } else {
      continue;
    }
    used.add(key);
  }
  return out;
};

export interface TailwindOptions {
  /** 3 = `tailwind.config.js` object, 4 = CSS-first `@theme` block. Default 4. */
  version?: 3 | 4;
}

const jsKey = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`);

export const toTailwindConfig = (input: PaletteSwatch[] | PaletteGroups, options: TailwindOptions = {}): string => {
  const groups = swatchesToGroups(input);
  const version = options.version ?? 4;

  if (version === 4) {
    const lines: string[] = [];
    for (const [name, value] of Object.entries(groups)) {
      if (typeof value === 'string') {
        lines.push(`  --color-${name}: ${value};`);
      } else {
        for (const [shade, hex] of Object.entries(value)) lines.push(`  --color-${name}-${shade}: ${hex};`);
      }
    }
    return `@import "tailwindcss";\n\n@theme {\n${lines.join('\n')}\n}\n`;
  }

  const body = Object.entries(groups)
    .map(([name, value]) => {
      if (typeof value === 'string') return `        ${jsKey(name)}: '${value}',`;
      const shades = Object.entries(value)
        .map(([shade, hex]) => `          ${jsKey(shade)}: '${hex}',`)
        .join('\n');
      return `        ${jsKey(name)}: {\n${shades}\n        },`;
    })
    .join('\n');

  return `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${body}\n      },\n    },\n  },\n};\n`;
};

// ---------------------------------------------------------------------------
// W3C Design Tokens (DTCG, Format Module 2025.10)
// ---------------------------------------------------------------------------

export interface DesignTokensOptions {
  /** Top-level group name. Default "color". Empty string = no wrapping group. */
  group?: string;
  /**
   * 'object' (default): DTCG 2025.10 color value `{ colorSpace, components, alpha, hex }`.
   * 'hex': legacy draft string value, still read by many tools (Style Dictionary v3, Tokens Studio).
   */
  valueFormat?: 'object' | 'hex';
  description?: string;
}

export interface DtcgColorValue {
  colorSpace: 'srgb';
  components: [number, number, number];
  alpha: number;
  hex: string;
}

export interface DtcgColorToken {
  $type: 'color';
  $value: DtcgColorValue | string;
  $description?: string;
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export const toDtcgColorValue = (hex: string): DtcgColorValue | null => {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const { r, g, b } = hexToRgb(norm);
  return {
    colorSpace: 'srgb',
    components: [round4(r / 255), round4(g / 255), round4(b / 255)],
    alpha: 1,
    hex: norm.toLowerCase()
  };
};

export const toDesignTokens = (
  input: PaletteSwatch[] | PaletteGroups,
  options: DesignTokensOptions = {}
): Record<string, unknown> => {
  const { group = 'color', valueFormat = 'object', description } = options;
  const groups = swatchesToGroups(input);
  const names = Array.isArray(input) ? new Map(prepareSwatches(input).map((s) => [s.slug, s.name])) : null;

  const token = (hex: string, desc?: string): DtcgColorToken => {
    const t: DtcgColorToken = {
      $type: 'color',
      $value: valueFormat === 'hex' ? hex.toLowerCase() : (toDtcgColorValue(hex) as DtcgColorValue)
    };
    if (desc) t.$description = desc;
    return t;
  };

  const tokens: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(groups)) {
    if (typeof value === 'string') {
      const original = names?.get(name);
      tokens[name] = token(value, original && original !== name ? original : undefined);
    } else {
      const sub: Record<string, unknown> = { $type: 'color' };
      for (const [shade, hex] of Object.entries(value)) {
        const t = token(hex);
        delete (t as Partial<DtcgColorToken>).$type; // inherited from group
        sub[shade] = t;
      }
      tokens[name] = sub;
    }
  }

  if (!group) return tokens;
  const wrapped: Record<string, unknown> = { $type: 'color', ...tokens };
  if (description) wrapped.$description = description;
  return { [group]: wrapped };
};

export const toDesignTokensJson = (input: PaletteSwatch[] | PaletteGroups, options?: DesignTokensOptions): string =>
  JSON.stringify(toDesignTokens(input, options), null, 2) + '\n';

// ---------------------------------------------------------------------------
// GIMP Palette (.gpl)
// ---------------------------------------------------------------------------

export interface GplOptions {
  name?: string;
  columns?: number;
}

export const toGpl = (swatches: PaletteSwatch[], options: GplOptions = {}): string => {
  const name = (options.name || 'UNBSCOLOR Palette').replace(/[\r\n]+/g, ' ');
  const prepared = prepareSwatches(swatches);
  const columns = options.columns ?? Math.min(Math.max(prepared.length, 1), 16);
  const pad = (n: number) => String(n).padStart(3, ' ');
  const rows = prepared.map((s) => {
    const { r, g, b } = hexToRgb(s.hex);
    return `${pad(r)} ${pad(g)} ${pad(b)}\t${s.name.replace(/[\r\n\t]+/g, ' ')}`;
  });
  return `GIMP Palette\nName: ${name}\nColumns: ${columns}\n#\n${rows.join('\n')}\n`;
};

// ---------------------------------------------------------------------------
// Adobe Swatch Exchange (.ase)
// ---------------------------------------------------------------------------

export type AseColorModel = 'RGB' | 'CMYK' | 'LAB' | 'Gray';
export type AseColorType = 'global' | 'spot' | 'normal';

const ASE_TYPE_CODE: Record<AseColorType, number> = { global: 0, spot: 1, normal: 2 };
const ASE_TYPE_NAME: Record<number, AseColorType> = { 0: 'global', 1: 'spot', 2: 'normal' };
const ASE_BLOCK = { groupStart: 0xc001, groupEnd: 0xc002, color: 0x0001 } as const;

export interface AseOptions {
  /** Wraps all swatches in a named group (shown as a folder in Illustrator/InDesign). */
  groupName?: string;
  model?: Exclude<AseColorModel, 'Gray'>;
  colorType?: AseColorType;
}

class ByteWriter {
  private chunks: number[] = [];
  u8(v: number) {
    this.chunks.push(v & 0xff);
  }
  u16(v: number) {
    this.u8(v >> 8);
    this.u8(v);
  }
  u32(v: number) {
    this.u16((v >>> 16) & 0xffff);
    this.u16(v & 0xffff);
  }
  f32(v: number) {
    const buf = new DataView(new ArrayBuffer(4));
    buf.setFloat32(0, v);
    for (let i = 0; i < 4; i++) this.u8(buf.getUint8(i));
  }
  ascii(s: string) {
    for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i));
  }
  /** u16 length (code units incl. terminator) + UTF-16BE + 0x0000 */
  aseString(s: string) {
    this.u16(s.length + 1);
    for (let i = 0; i < s.length; i++) this.u16(s.charCodeAt(i));
    this.u16(0);
  }
  get length() {
    return this.chunks.length;
  }
  bytes() {
    return Uint8Array.from(this.chunks);
  }
}

const aseComponents = (hex: string, model: Exclude<AseColorModel, 'Gray'>): number[] => {
  if (model === 'CMYK') {
    const { c, m, y, k } = rgbToCmyk(hexToRgb(hex));
    return [c / 100, m / 100, y / 100, k / 100];
  }
  if (model === 'LAB') {
    const { l, a, b } = hexToLab(hex);
    return [l / 100, a, b];
  }
  const { r, g, b } = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
};

/** Builds a binary .ase file. Use `new Blob([bytes], { type: 'application/octet-stream' })` to download. */
export const toAse = (swatches: PaletteSwatch[], options: AseOptions = {}): Uint8Array => {
  const model = options.model ?? 'RGB';
  const typeCode = ASE_TYPE_CODE[options.colorType ?? 'global'];
  const prepared = prepareSwatches(swatches);

  const blocks: { type: number; body: Uint8Array }[] = [];
  if (options.groupName) {
    const w = new ByteWriter();
    w.aseString(options.groupName);
    blocks.push({ type: ASE_BLOCK.groupStart, body: w.bytes() });
  }
  for (const s of prepared) {
    const w = new ByteWriter();
    w.aseString(s.name.slice(0, 0xfffe));
    w.ascii(model.padEnd(4, ' '));
    aseComponents(s.hex, model).forEach((v) => w.f32(v));
    w.u16(typeCode);
    blocks.push({ type: ASE_BLOCK.color, body: w.bytes() });
  }
  if (options.groupName) {
    blocks.push({ type: ASE_BLOCK.groupEnd, body: new Uint8Array(0) });
  }

  const out = new ByteWriter();
  out.ascii('ASEF');
  out.u16(1); // version major
  out.u16(0); // version minor
  out.u32(blocks.length);
  for (const block of blocks) {
    out.u16(block.type);
    out.u32(block.body.length);
    block.body.forEach((b) => out.u8(b));
  }
  return out.bytes();
};

export interface AseSwatch {
  name: string;
  hex: string;
  model: AseColorModel;
  values: number[];
  type: AseColorType;
  group?: string;
}

/** Parses an .ase file (RGB, CMYK, LAB and Gray entries). Throws on malformed input. */
export const parseAse = (input: ArrayBuffer | Uint8Array): AseSwatch[] => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const need = (n: number) => {
    if (offset + n > view.byteLength) throw new Error('Invalid ASE file: unexpected end of data.');
  };
  const readString = () => {
    need(2);
    const len = view.getUint16(offset);
    offset += 2;
    need(len * 2);
    let s = '';
    for (let i = 0; i < len; i++) {
      const code = view.getUint16(offset + i * 2);
      if (code !== 0) s += String.fromCharCode(code);
    }
    offset += len * 2;
    return s;
  };

  need(12);
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (sig !== 'ASEF') throw new Error('Invalid ASE file: signature mismatch.');
  offset = 8;
  const count = view.getUint32(offset);
  offset += 4;

  const result: AseSwatch[] = [];
  let currentGroup: string | undefined;

  for (let i = 0; i < count; i++) {
    need(6);
    const type = view.getUint16(offset);
    const length = view.getUint32(offset + 2);
    offset += 6;
    const end = offset + length;
    if (end > view.byteLength) throw new Error('Invalid ASE file: block exceeds file size.');

    if (type === ASE_BLOCK.groupStart) {
      currentGroup = readString();
    } else if (type === ASE_BLOCK.groupEnd) {
      currentGroup = undefined;
    } else if (type === ASE_BLOCK.color) {
      const name = readString();
      need(4);
      const model = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]).trim() as AseColorModel;
      offset += 4;
      const n = model === 'CMYK' ? 4 : model === 'Gray' ? 1 : 3;
      need(n * 4 + 2);
      const values: number[] = [];
      for (let k = 0; k < n; k++) values.push(view.getFloat32(offset + k * 4));
      offset += n * 4;
      const colorType = ASE_TYPE_NAME[view.getUint16(offset)] ?? 'normal';

      let hex: string;
      if (model === 'RGB') {
        hex = rgbToHex(values[0] * 255, values[1] * 255, values[2] * 255);
      } else if (model === 'CMYK') {
        const [c, m, y, k] = values;
        hex = rgbToHex(255 * (1 - c) * (1 - k), 255 * (1 - m) * (1 - k), 255 * (1 - y) * (1 - k));
      } else if (model === 'Gray') {
        hex = rgbToHex(values[0] * 255, values[0] * 255, values[0] * 255);
      } else if (model === 'LAB') {
        hex = labToHex({ l: values[0] * 100, a: values[1], b: values[2] });
      } else {
        offset = end;
        continue;
      }
      result.push({ name, hex, model, values, type: colorType, group: currentGroup });
    }
    offset = end; // tolerate unknown blocks / trailing bytes
  }

  return result;
};

// ---------------------------------------------------------------------------
// Format registry (for download buttons)
// ---------------------------------------------------------------------------

export type PaletteExportFormat = 'css' | 'tailwind-v3' | 'tailwind-v4' | 'dtcg' | 'ase' | 'gpl';

export const PALETTE_EXPORT_FORMATS: Record<
  PaletteExportFormat,
  { label: string; extension: string; mime: string; binary: boolean }
> = {
  css: { label: 'CSS variables', extension: 'css', mime: 'text/css', binary: false },
  'tailwind-v3': { label: 'Tailwind v3 config', extension: 'js', mime: 'text/javascript', binary: false },
  'tailwind-v4': { label: 'Tailwind v4 @theme', extension: 'css', mime: 'text/css', binary: false },
  dtcg: { label: 'Design Tokens (DTCG)', extension: 'tokens.json', mime: 'application/json', binary: false },
  ase: { label: 'Adobe Swatch Exchange', extension: 'ase', mime: 'application/octet-stream', binary: true },
  gpl: { label: 'GIMP Palette', extension: 'gpl', mime: 'text/plain', binary: false }
};

/** One-call export returning a Blob ready to download. */
export const exportPalette = (
  swatches: PaletteSwatch[],
  format: PaletteExportFormat,
  paletteName = 'UNBSCOLOR Palette'
): Blob => {
  const meta = PALETTE_EXPORT_FORMATS[format];
  let content: string | Uint8Array;
  switch (format) {
    case 'css':
      content = toCssVariables(swatches);
      break;
    case 'tailwind-v3':
      content = toTailwindConfig(swatches, { version: 3 });
      break;
    case 'tailwind-v4':
      content = toTailwindConfig(swatches, { version: 4 });
      break;
    case 'dtcg':
      content = toDesignTokensJson(swatches, { description: paletteName });
      break;
    case 'ase':
      content = toAse(swatches, { groupName: paletteName });
      break;
    case 'gpl':
      content = toGpl(swatches, { name: paletteName });
      break;
  }
  return new Blob([content as BlobPart], { type: meta.mime });
};

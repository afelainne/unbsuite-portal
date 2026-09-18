/**
 * SVG input — every door the logo can come in through, one lock.
 *
 * Paths supported: file picker, drag & drop, pasted markup from a text field,
 * Ctrl+V anywhere on the page (text OR file in the clipboard), and
 * `data:image/svg+xml` URLs. Nothing here touches the network: an http(s)
 * address is rejected with a clear message instead of being fetched.
 *
 * Every path ends in `validateSvgInput`, which runs the shared sanitizer
 * (`svg-sanitize.ts`). The `svg` field of a successful result is the only
 * string callers should hand to paper.js or inject into the DOM; `raw` is kept
 * only as provenance (file name, re-export, debugging).
 */

import {
  sanitizeSVG,
  SvgParseError,
  type SanitizeOptions,
  type SvgArtboard,
  type SvgParseErrorCode,
} from './svg-sanitize';
import { activeT } from '../i18n/runtime';
import { fill } from '../i18n/format';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SvgInputSource = 'file' | 'drop' | 'text' | 'clipboard' | 'data-url' | 'sample' | 'recent';

export type SvgInputErrorCode =
  | SvgParseErrorCode // 'empty' | 'not-svg' | 'too-large' | 'too-complex' | 'invalid-xml'
  | 'no-shapes'
  | 'not-svg-file'
  | 'read-failed'
  | 'unsupported-url'
  | 'bad-data-url'
  | 'no-svg-in-clipboard';

export interface SvgInputError {
  ok: false;
  code: SvgInputErrorCode;
  /** Short line for the toast title. */
  title: string;
  /** One sentence saying what to do about it. */
  description: string;
  source: SvgInputSource;
  name: string | null;
}

export interface SvgInputResult {
  ok: true;
  /** Sanitized + normalized SVG. The ONLY string that may reach paper / the DOM. */
  svg: string;
  /** What the user handed us, untouched. Never inject this anywhere. */
  raw: string;
  name: string;
  source: SvgInputSource;
  artboard: SvgArtboard | null;
  /** Non-fatal notes from the sanitizer (removed elements, invalid viewBox…). */
  warnings: string[];
  elementCount: number;
  /** Size of the original input, in characters. */
  bytes: number;
}

export type SvgInputOutcome = SvgInputResult | SvgInputError;

export interface SvgInputOptions {
  /** Name shown in the UI / stored in the recents list. */
  name?: string;
  /** Which door this came through (only affects reporting). */
  source?: SvgInputSource;
  /** Forwarded to `sanitizeSVG`. */
  sanitize?: SanitizeOptions;
  /** Hard ceiling for the input, in characters (default 15 MB). */
  maxBytes?: number;
}

/** Same ceiling the sanitizer uses by default. */
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;

const SVG_NAME_RE = /\.svg$/i;
const SVG_MIME_RE = /^image\/svg(\+xml)?$/i;
const SHAPE_RE = /<(?:path|rect|circle|ellipse|line|polyline|polygon|text|image)[\s/>]/i;
const DATA_URL_RE = /^\s*data:/i;
const REMOTE_URL_RE = /^\s*(?:https?|ftp|blob|file):/i;

const DEFAULT_NAME: Record<SvgInputSource, string> = {
  file: 'Arquivo SVG',
  drop: 'Arquivo SVG',
  text: 'SVG colado',
  clipboard: 'SVG da área de transferência',
  'data-url': 'SVG por data URL',
  sample: 'Exemplo',
  recent: 'Recente',
};

// ---------------------------------------------------------------------------
// Messages — one clear line per kind of problem
// ---------------------------------------------------------------------------

/** Dictionary key prefix of each problem (`svgInput` namespace). */
const MESSAGE_KEYS: Record<SvgInputErrorCode, string> = {
  empty: 'empty',
  'not-svg': 'notSvg',
  'not-svg-file': 'notSvgFile',
  'too-large': 'tooLarge',
  'too-complex': 'tooComplex',
  'invalid-xml': 'invalidXml',
  'no-shapes': 'noShapes',
  'read-failed': 'readFailed',
  'unsupported-url': 'unsupportedUrl',
  'bad-data-url': 'badDataUrl',
  'no-svg-in-clipboard': 'noSvgInClipboard',
};

/** Title and description in the active language. */
function messageFor(code: SvgInputErrorCode): { title: string; description: string } {
  const dict = activeT().svgInput as Record<string, string>;
  const key = MESSAGE_KEYS[code] ?? MESSAGE_KEYS['invalid-xml'];
  return {
    title: dict[`${key}Title`],
    description: fill(dict[`${key}Description`], { limit: Math.round(MAX_INPUT_BYTES / 1048576) }),
  };
}

/** Title + description for a problem code, ready for a toast. */
export function describeSvgInputError(code: SvgInputErrorCode, detail?: string): { title: string; description: string } {
  const base = messageFor(code);
  return detail ? { title: base.title, description: `${base.description} (${detail})` } : { ...base };
}

function fail(code: SvgInputErrorCode, source: SvgInputSource, name: string | null, detail?: string): SvgInputError {
  const { title, description } = describeSvgInputError(code, detail);
  return { ok: false, code, title, description, source, name };
}

export function isSvgInputError(outcome: SvgInputOutcome): outcome is SvgInputError {
  return outcome.ok === false;
}

export function isSvgInputResult(outcome: SvgInputOutcome): outcome is SvgInputResult {
  return outcome.ok === true;
}

// ---------------------------------------------------------------------------
// Sniffing helpers
// ---------------------------------------------------------------------------

/** Does this text look like SVG markup (and not, say, a stray `<div>`)? */
export function looksLikeSvgText(text: unknown): boolean {
  return typeof text === 'string' && /<svg[\s>]/i.test(text.replace(/^﻿/, ''));
}

/** A `data:image/svg+xml…` URL (base64 or percent-encoded). */
export function isSvgDataUrl(text: unknown): boolean {
  return typeof text === 'string' && /^\s*data:image\/svg(\+xml)?[;,]/i.test(text);
}

/** A file the picker/drop should accept: `.svg` name or `image/svg+xml` type. */
export function isSvgFile(file: { name?: string; type?: string } | null | undefined): boolean {
  if (!file) return false;
  if (file.type && SVG_MIME_RE.test(file.type)) return true;
  return !!file.name && SVG_NAME_RE.test(file.name);
}

// ---------------------------------------------------------------------------
// The single validation door
// ---------------------------------------------------------------------------

/**
 * Sanitize + validate an SVG string. This is the only place that turns raw
 * input into something the rest of the tool may use.
 */
export function validateSvgInput(input: unknown, options: SvgInputOptions = {}): SvgInputOutcome {
  const source = options.source ?? 'text';
  const name = options.name ?? DEFAULT_NAME[source];
  const maxBytes = options.maxBytes ?? MAX_INPUT_BYTES;

  if (typeof input !== 'string' || !input.trim()) return fail('empty', source, options.name ?? null);

  const text = input.replace(/^﻿/, '').trim();
  if (REMOTE_URL_RE.test(text)) return fail('unsupported-url', source, options.name ?? null);
  if (text.length > maxBytes) {
    return fail('too-large', source, options.name ?? null, `${(text.length / 1048576).toFixed(1)} MB`);
  }
  if (!looksLikeSvgText(text)) {
    return fail(isSvgDataUrl(text) ? 'bad-data-url' : 'not-svg', source, options.name ?? null);
  }

  let sanitized: ReturnType<typeof sanitizeSVG>;
  try {
    sanitized = sanitizeSVG(text, { maxBytes, ...options.sanitize });
  } catch (err) {
    if (err instanceof SvgParseError) return fail(err.code, source, options.name ?? null);
    return fail('invalid-xml', source, options.name ?? null, err instanceof Error ? err.message : String(err));
  }

  if (!SHAPE_RE.test(sanitized.svg)) return fail('no-shapes', source, options.name ?? null);

  return {
    ok: true,
    svg: sanitized.svg,
    raw: input,
    name,
    source,
    artboard: sanitized.artboard,
    warnings: sanitized.warnings,
    elementCount: sanitized.stats.elementCount,
    bytes: input.length,
  };
}

// ---------------------------------------------------------------------------
// data: URLs (no network, ever)
// ---------------------------------------------------------------------------

function decodeBase64(payload: string): string | null {
  try {
    const clean = payload.replace(/\s+/g, '');
    const binary = typeof atob === 'function'
      ? atob(clean)
      : Buffer.from(clean, 'base64').toString('binary');
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Decode a `data:image/svg+xml` URL into markup. Returns null for any other
 * scheme or media type — nothing is fetched.
 */
export function decodeSvgDataUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const text = url.trim();
  if (!DATA_URL_RE.test(text)) return null;
  const comma = text.indexOf(',');
  if (comma < 0) return null;
  const meta = text.slice(5, comma).toLowerCase();
  const mime = meta.split(';')[0].trim();
  if (mime && !SVG_MIME_RE.test(mime)) return null;
  const payload = text.slice(comma + 1);
  if (!payload) return null;
  if (/;\s*base64\s*$/.test(meta) || /;base64/.test(meta)) return decodeBase64(payload);
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload; // already plain markup with stray "%" characters
  }
}

/** Open a `data:image/svg+xml` URL. */
export function svgFromDataUrl(url: unknown, options: SvgInputOptions = {}): SvgInputOutcome {
  const source = options.source ?? 'data-url';
  if (typeof url === 'string' && REMOTE_URL_RE.test(url)) return fail('unsupported-url', source, options.name ?? null);
  const markup = decodeSvgDataUrl(url);
  if (markup === null) return fail('bad-data-url', source, options.name ?? null);
  return validateSvgInput(markup, { ...options, source, name: options.name ?? DEFAULT_NAME['data-url'] });
}

// ---------------------------------------------------------------------------
// Text field / paste of markup
// ---------------------------------------------------------------------------

/**
 * Accept what a person pasted into a text field: SVG markup, or a
 * `data:image/svg+xml` URL. An http(s) address is refused, not fetched.
 */
export function svgFromText(text: unknown, options: SvgInputOptions = {}): SvgInputOutcome {
  const source = options.source ?? 'text';
  if (typeof text !== 'string' || !text.trim()) return fail('empty', source, options.name ?? null);
  if (isSvgDataUrl(text)) return svgFromDataUrl(text, { ...options, source });
  return validateSvgInput(text, { ...options, source, name: options.name ?? DEFAULT_NAME[source] });
}

// ---------------------------------------------------------------------------
// Files (picker and drop)
// ---------------------------------------------------------------------------

function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result;
      if (typeof value === 'string') resolve(value);
      else reject(new Error('Conteúdo binário'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Falha de leitura'));
    reader.readAsText(file);
  });
}

/** Read a picked / dropped file, validate it, and hand back sanitized markup. */
export async function readSvgFile(file: File | null | undefined, options: SvgInputOptions = {}): Promise<SvgInputOutcome> {
  const source = options.source ?? 'file';
  if (!file) return fail('empty', source, options.name ?? null);
  const name = options.name ?? file.name ?? DEFAULT_NAME[source];
  const maxBytes = options.maxBytes ?? MAX_INPUT_BYTES;
  if (!isSvgFile(file)) return fail('not-svg-file', source, name, file.name);
  if (typeof file.size === 'number' && file.size > maxBytes) {
    return fail('too-large', source, name, `${(file.size / 1048576).toFixed(1)} MB`);
  }
  let text: string;
  try {
    text = await readFileText(file);
  } catch (err) {
    return fail('read-failed', source, name, err instanceof Error ? err.message : undefined);
  }
  return validateSvgInput(text, { ...options, source, name });
}

// ---------------------------------------------------------------------------
// Clipboard and drop payloads
// ---------------------------------------------------------------------------

/** Minimal shape of `DataTransfer` — works for both paste and drop events. */
export interface ClipboardLike {
  getData?(type: string): string;
  files?: ArrayLike<File> | null;
  items?: ArrayLike<{ kind: string; type: string; getAsFile(): File | null }> | null;
  types?: ReadonlyArray<string> | null;
}

function firstFile(data: ClipboardLike): File | null {
  const files = data.files;
  if (files && files.length) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f) return f;
    }
  }
  const items = data.items;
  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === 'file') {
        const f = item.getAsFile();
        if (f) return f;
      }
    }
  }
  return null;
}

function readTransferText(data: ClipboardLike): string {
  if (typeof data.getData !== 'function') return '';
  for (const type of ['image/svg+xml', 'text/plain', 'text/uri-list', 'text/html', '']) {
    try {
      const value = data.getData(type);
      if (typeof value === 'string' && value.trim()) return value;
    } catch {
      /* some types throw in Safari — keep trying */
    }
  }
  return '';
}

/**
 * Handle a paste (Ctrl+V) or a drop: a file wins over text, and text is
 * accepted as markup or as a `data:image/svg+xml` URL.
 */
export async function svgFromClipboard(data: ClipboardLike | null | undefined, options: SvgInputOptions = {}): Promise<SvgInputOutcome> {
  const source = options.source ?? 'clipboard';
  if (!data) return fail('no-svg-in-clipboard', source, options.name ?? null);

  const file = firstFile(data);
  if (file) {
    if (!isSvgFile(file)) return fail('not-svg-file', source, file.name ?? null, file.name);
    return readSvgFile(file, { ...options, source, name: options.name ?? file.name });
  }

  const text = readTransferText(data);
  if (!text.trim()) return fail('no-svg-in-clipboard', source, options.name ?? null);
  if (REMOTE_URL_RE.test(text.trim())) return fail('unsupported-url', source, options.name ?? null);
  if (!looksLikeSvgText(text) && !isSvgDataUrl(text)) return fail('no-svg-in-clipboard', source, options.name ?? null);
  return svgFromText(text, { ...options, source, name: options.name ?? DEFAULT_NAME[source] });
}

/** Drop payload: same rules as paste, reported as `drop`. */
export function svgFromDrop(data: ClipboardLike | null | undefined, options: SvgInputOptions = {}): Promise<SvgInputOutcome> {
  return svgFromClipboard(data, { ...options, source: options.source ?? 'drop' });
}

// ---------------------------------------------------------------------------
// Paste shortcut helpers
// ---------------------------------------------------------------------------

/**
 * True when the event target is a text field — a page-level paste (or an undo
 * shortcut) must not steal it. Lives in `session-history.ts`; re-exported here
 * because the paste handler is its main caller.
 */
export { isTextEntryTarget } from './session-history';

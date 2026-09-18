/**
 * SVG sanitizer + normalizer.
 *
 * Why this exists: paper.js `importSVG` temporarily APPENDS the parsed SVG node
 * to `document.body` (so it can read computed styles). Anything active inside
 * the file — `<foreignObject>` HTML, `<image onerror>`, `<style>` rules,
 * external `href`s — therefore runs against the live page. A string without a
 * `<` is even treated by paper as an element id or a URL to fetch.
 *
 * `sanitizeSVG` returns a safe, normalized SVG string:
 *  - allowlisted SVG elements only (scripts, foreignObject, animation, media… removed)
 *  - no `on*` handlers, no `javascript:` values, no external references
 *  - DOCTYPE removed (simple internal entities from old Illustrator files are expanded first)
 *  - `<use>` expanded inline (bounded, cycle-safe) so paper sees real geometry
 *  - `<style>` rules inlined into `style` attributes, then `<style>` removed
 *  - root sized in unitless user units (viewBox size) and `overflow="visible"`,
 *    so paper does not add the artboard as a clip mask and bounds = real content
 */

import { memoizeByKey, hashKey } from './memo';
import { activeT, activeLanguage } from '../i18n/runtime';
import { fill } from '../i18n/format';

export type SvgParseErrorCode = 'empty' | 'not-svg' | 'too-large' | 'too-complex' | 'invalid-xml';

export class SvgParseError extends Error {
  readonly code: SvgParseErrorCode;
  constructor(code: SvgParseErrorCode, message: string) {
    super(message);
    this.name = 'SvgParseError';
    this.code = code;
  }
}

export interface SanitizeOptions {
  /** Max input size in characters (default 15 MB). */
  maxBytes?: number;
  /** Max number of elements after `<use>` expansion (default 60 000). */
  maxElements?: number;
  /** Expand `<use>` references inline (default true). */
  expandUse?: boolean;
  /** Inline `<style>` rules into style attributes (default true). */
  inlineStyles?: boolean;
}

export interface SvgArtboard { x: number; y: number; width: number; height: number }

export interface SanitizeResult {
  svg: string;
  /** Artboard (viewBox, or width/height converted to px) or null if unknown. */
  artboard: SvgArtboard | null;
  warnings: string[];
  stats: {
    elementCount: number;
    removedElements: Record<string, number>;
    removedAttributes: number;
    expandedUses: number;
    inlinedRules: number;
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'switch',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textpath', 'title', 'desc',
  'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop', 'pattern', 'marker',
  'image', 'style',
]);

/** Elements that are unwrapped (children kept) instead of removed. */
const UNWRAP_ELEMENTS = new Set(['a']);

const DANGEROUS_VALUE = /(?:java|vb)script\s*:|data\s*:\s*text\/html|expression\s*\(|-moz-binding|behavior\s*:/i;
const SAFE_IMAGE_DATA = /^\s*data:image\/(?:png|jpe?g|gif|webp|bmp);/i;

const PX_PER_UNIT: Record<string, number> = {
  '': 1, px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, q: 96 / 101.6,
};

/** Parse a CSS/SVG length into px. Returns null for %, em, invalid. */
export function parseLengthToPx(value: string | null | undefined): number | null {
  if (value == null) return null;
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)\s*$/i.exec(value);
  if (!m) return null;
  const unit = m[2].toLowerCase();
  const factor = PX_PER_UNIT[unit];
  if (factor === undefined) return null;
  const n = parseFloat(m[1]) * factor;
  return Number.isFinite(n) ? n : null;
}

/** Parse a viewBox attribute. Returns null unless 4 finite numbers with w,h > 0. */
export function parseViewBox(value: string | null | undefined): SvgArtboard | null {
  if (!value) return null;
  const parts = value.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) return null;
  const [x, y, width, height] = parts;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/** Expand simple internal DTD entities (old Illustrator exports) and drop the DOCTYPE. */
function stripDoctype(src: string): string {
  const doctype = /<!DOCTYPE[^[>]*(\[([\s\S]*?)\])?\s*>/i.exec(src);
  if (!doctype) return src;
  let out = src.slice(0, doctype.index) + src.slice(doctype.index + doctype[0].length);
  const subset = doctype[2];
  if (subset) {
    const entities = new Map<string, string>();
    const re = /<!ENTITY\s+([A-Za-z_][\w.-]*)\s+(["'])([^"'&%<]{0,512})\2\s*>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(subset)) && entities.size < 64) entities.set(m[1], m[3]);
    if (entities.size) {
      out = out.replace(/&([A-Za-z_][\w.-]*);/g, (full, name: string) => entities.get(name) ?? full);
    }
  }
  return out;
}

function localName(el: Element): string {
  return (el.localName || el.nodeName).toLowerCase();
}

function getHref(el: Element): string | null {
  return el.getAttribute('href') ?? el.getAttributeNS(XLINK_NS, 'href') ?? el.getAttribute('xlink:href');
}

function removeHref(el: Element) {
  el.removeAttribute('href');
  el.removeAttributeNS(XLINK_NS, 'href');
  el.removeAttribute('xlink:href');
}

/** Remove `url(...)` references that are not local fragment references. */
function sanitizeCssValue(value: string): string {
  return value
    .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (full, _q, target: string) => (target.trim().startsWith('#') ? full : 'none'))
    .replace(/@import[^;]*;?/gi, '');
}

function sanitizeStyleAttribute(value: string): string {
  const decls = value.split(';').map(d => d.trim()).filter(Boolean);
  const kept: string[] = [];
  for (const d of decls) {
    const idx = d.indexOf(':');
    if (idx <= 0) continue;
    const prop = d.slice(0, idx).trim().toLowerCase();
    const val = d.slice(idx + 1).trim();
    if (DANGEROUS_VALUE.test(val) || /^-?-?(?:moz-binding|behavior)$/.test(prop)) continue;
    kept.push(`${prop}:${sanitizeCssValue(val)}`);
  }
  return kept.join(';');
}

function parseStyleDecls(style: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of style.split(';')) {
    const idx = d.indexOf(':');
    if (idx <= 0) continue;
    map.set(d.slice(0, idx).trim().toLowerCase(), d.slice(idx + 1).trim());
  }
  return map;
}

/** Selector specificity as a comparable number (ids, classes/attrs/pseudo, types). */
export function selectorSpecificity(selector: string): number {
  const s = selector.replace(/::?[a-z-]+\([^)]*\)/gi, m => (m.startsWith('::') ? ' e' : ' .p'));
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length;
  const types = (s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|::?[\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
  return ids * 10000 + classes * 100 + types;
}

interface CssRule { selector: string; decls: Array<{ prop: string; value: string; important: boolean }>; order: number }

/** Very small CSS parser: plain rules only, at-rules are skipped. */
export function parseCssRules(css: string): CssRule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  let i = 0;
  let order = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) break;
    // Block-less at-rules (@import …; @charset …;) end at ';' — skip them
    // instead of letting them swallow the next rule's selector.
    const head = text.slice(i, open);
    const at = head.search(/\S/);
    if (at >= 0 && head[at] === '@') {
      const semi = head.indexOf(';', at);
      if (semi >= 0) { i += semi + 1; continue; }
    }
    const prelude = text.slice(i, open).trim();
    // find matching close brace (handles nested at-rule blocks)
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }
    const body = text.slice(open + 1, j - 1);
    i = j;
    if (!prelude || prelude.startsWith('@')) continue;
    const decls = body.split(';').map(d => d.trim()).filter(Boolean).flatMap(d => {
      const idx = d.indexOf(':');
      if (idx <= 0) return [];
      let value = d.slice(idx + 1).trim();
      const important = /!important\s*$/i.test(value);
      if (important) value = value.replace(/!important\s*$/i, '').trim();
      return [{ prop: d.slice(0, idx).trim().toLowerCase(), value, important }];
    });
    for (const selector of prelude.split(',').map(s => s.trim()).filter(Boolean)) {
      rules.push({ selector, decls, order: order++ });
    }
  }
  return rules;
}

function inlineStyles(doc: Document, root: Element, cssText: string): number {
  const rules = parseCssRules(cssText);
  type Winner = { value: string; important: boolean; spec: number; order: number };
  const perElement = new Map<Element, Map<string, Winner>>();
  let applied = 0;
  for (const rule of rules) {
    let matches: Element[];
    try {
      matches = Array.from(root.querySelectorAll(rule.selector));
      if (root.matches?.(rule.selector)) matches.unshift(root);
    } catch {
      continue; // unsupported selector
    }
    if (!matches.length) continue;
    applied++;
    const spec = selectorSpecificity(rule.selector);
    for (const el of matches) {
      let props = perElement.get(el);
      if (!props) perElement.set(el, (props = new Map()));
      for (const d of rule.decls) {
        if (DANGEROUS_VALUE.test(d.value)) continue;
        const prev = props.get(d.prop);
        const beats = !prev
          || (d.important && !prev.important)
          || (d.important === prev.important && (spec > prev.spec || (spec === prev.spec && rule.order >= prev.order)));
        if (beats) props.set(d.prop, { value: sanitizeCssValue(d.value), important: d.important, spec, order: rule.order });
      }
    }
  }
  perElement.forEach((props, el) => {
    const inline = parseStyleDecls(el.getAttribute('style') || '');
    props.forEach((w, prop) => {
      if (!inline.has(prop) || w.important) inline.set(prop, w.value);
    });
    const serialized = Array.from(inline.entries()).map(([k, v]) => `${k}:${v}`).join(';');
    if (serialized) el.setAttribute('style', serialized);
  });
  void doc;
  return applied;
}

const PAR_ALIGN: Record<string, [number, number]> = {
  xminymin: [0, 0], xmidymin: [0.5, 0], xmaxymin: [1, 0],
  xminymid: [0, 0.5], xmidymid: [0.5, 0.5], xmaxymid: [1, 0.5],
  xminymax: [0, 1], xmidymax: [0.5, 1], xmaxymax: [1, 1],
};

/** Transform that maps a viewBox into a (w,h) viewport, honoring preserveAspectRatio. */
export function viewBoxTransform(vb: SvgArtboard, w: number, h: number, par: string | null): string {
  const parts = (par || 'xMidYMid meet').trim().toLowerCase().split(/\s+/);
  const align = parts[0] || 'xmidymid';
  const slice = parts[1] === 'slice';
  let sx = w / vb.width;
  let sy = h / vb.height;
  let tx = 0;
  let ty = 0;
  if (align !== 'none') {
    const s = slice ? Math.max(sx, sy) : Math.min(sx, sy);
    const [ax, ay] = PAR_ALIGN[align] ?? [0.5, 0.5];
    tx = (w - vb.width * s) * ax;
    ty = (h - vb.height * s) * ay;
    sx = sy = s;
  }
  return `translate(${tx} ${ty}) scale(${sx} ${sy}) translate(${-vb.x} ${-vb.y})`;
}

function expandUses(doc: Document, root: Element, maxElements: number, warnings: string[]): number {
  const byId = new Map<string, Element>();
  root.querySelectorAll('[id]').forEach(el => { const id = el.getAttribute('id'); if (id && !byId.has(id)) byId.set(id, el); });
  let budget = maxElements - root.getElementsByTagName('*').length;
  let expanded = 0;
  let guard = 0;
  for (;;) {
    const use = root.getElementsByTagNameNS(SVG_NS, 'use')[0] ?? root.getElementsByTagName('use')[0];
    if (!use) break;
    if (++guard > maxElements) throw new SvgParseError('too-complex', 'SVG has too many <use> references.');
    const href = getHref(use) || '';
    const target = href.startsWith('#') ? byId.get(href.slice(1)) : undefined;
    if (!target || target === use || target.contains(use)) {
      if (href && !target) warnings.push(fill(activeT().sanitize.useMissing, { href: href ?? '' }));
      if (target) warnings.push(fill(activeT().sanitize.useSelfReference, { href: href ?? '' }));
      use.parentNode?.removeChild(use);
      continue;
    }
    const g = doc.createElementNS(SVG_NS, 'g');
    for (const attr of Array.from(use.attributes)) {
      const n = attr.name.toLowerCase();
      if (['x', 'y', 'width', 'height', 'href', 'xlink:href', 'transform', 'id'].includes(n)) continue;
      g.setAttribute(attr.name, attr.value);
    }
    const x = parseFloat(use.getAttribute('x') || '0') || 0;
    const y = parseFloat(use.getAttribute('y') || '0') || 0;
    const transforms = [use.getAttribute('transform') || '', x || y ? `translate(${x} ${y})` : ''];
    const tName = localName(target);
    let content: Element;
    if (tName === 'symbol' || tName === 'svg') {
      content = doc.createElementNS(SVG_NS, 'g');
      for (const child of Array.from(target.childNodes)) content.appendChild(child.cloneNode(true));
      const vb = parseViewBox(target.getAttribute('viewBox'));
      const w = parseLengthToPx(use.getAttribute('width') ?? target.getAttribute('width'));
      const h = parseLengthToPx(use.getAttribute('height') ?? target.getAttribute('height'));
      if (vb && w && h) content.setAttribute('transform', viewBoxTransform(vb, w, h, target.getAttribute('preserveAspectRatio')));
      else if (vb && (vb.x || vb.y)) content.setAttribute('transform', `translate(${-vb.x} ${-vb.y})`);
      for (const presentational of ['fill', 'stroke', 'style', 'class', 'opacity', 'fill-rule']) {
        const v = target.getAttribute(presentational);
        if (v != null && !content.hasAttribute(presentational)) content.setAttribute(presentational, v);
      }
    } else {
      content = target.cloneNode(true) as Element;
      content.removeAttribute('id');
    }
    content.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    const added = content.getElementsByTagName('*').length + 2;
    budget -= added;
    if (budget < 0) throw new SvgParseError('too-complex', `SVG expands to more than ${maxElements} elements.`);
    const transform = transforms.filter(Boolean).join(' ');
    if (transform) g.setAttribute('transform', transform);
    g.appendChild(content);
    use.parentNode?.replaceChild(g, use);
    expanded++;
  }
  return expanded;
}

/**
 * `<rect rx="8">` (no ry) must round both axes. Copy the given radius to the
 * missing attribute so the importer draws real rounded corners; `auto` and
 * non-positive values are left alone.
 */
export function mirrorRectRadius(rect: Element): void {
  const rx = rect.getAttribute('rx');
  const ry = rect.getAttribute('ry');
  const usable = (v: string | null) => {
    if (v === null) return false;
    const t = v.trim().toLowerCase();
    if (!t || t === 'auto') return false;
    return Number.isFinite(parseFloat(t)) && parseFloat(t) > 0;
  };
  if (usable(rx) && !usable(ry)) rect.setAttribute('ry', rx as string);
  else if (usable(ry) && !usable(rx)) rect.setAttribute('rx', ry as string);
}

function sanitizeTree(root: Element, stats: SanitizeResult['stats'], cssChunks: string[]) {
  const bump = (name: string) => { stats.removedElements[name] = (stats.removedElements[name] || 0) + 1; };
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const name = localName(child);
      const ns = child.namespaceURI;
      if (ns && ns !== SVG_NS) { bump(name); child.remove(); continue; }
      if (UNWRAP_ELEMENTS.has(name)) {
        const g = child.ownerDocument.createElementNS(SVG_NS, 'g');
        for (const attr of Array.from(child.attributes)) g.setAttribute(attr.name, attr.value);
        while (child.firstChild) g.appendChild(child.firstChild);
        child.replaceWith(g);
        bump(name);
        sanitizeElement(g, stats);
        walk(g);
        continue;
      }
      if (!ALLOWED_ELEMENTS.has(name)) { bump(name); child.remove(); continue; }
      if (name === 'style') {
        const type = (child.getAttribute('type') || 'text/css').toLowerCase();
        if (type === 'text/css') cssChunks.push(child.textContent || '');
        child.remove();
        continue;
      }
      if (name === 'image') {
        const href = getHref(child) || '';
        if (!SAFE_IMAGE_DATA.test(href)) { bump(name); child.remove(); continue; }
      }
      // SVG says a missing rx/ry mirrors the other one. Paper.js reads the
      // missing one as 0, turning a rounded rect into a bevelled corner.
      if (name === 'rect') mirrorRectRadius(child);
      sanitizeElement(child, stats);
      walk(child);
    }
  };
  sanitizeElement(root, stats);
  walk(root);
}

function sanitizeElement(el: Element, stats: SanitizeResult['stats']) {
  const name = localName(el);
  for (const attr of Array.from(el.attributes)) {
    const attrName = attr.name.toLowerCase();
    const local = (attr.localName || attr.name).toLowerCase();
    const value = attr.value;
    let remove = false;
    if (attrName.startsWith('on')) remove = true;
    else if (local === 'href') {
      const v = value.trim();
      remove = !(v.startsWith('#') || (name === 'image' && SAFE_IMAGE_DATA.test(v)));
    } else if (attrName === 'xml:base' || local === 'base') remove = true;
    else if (DANGEROUS_VALUE.test(value)) remove = true;
    else if (attrName === 'style') {
      const clean = sanitizeStyleAttribute(value);
      if (clean !== value) {
        if (clean) el.setAttribute('style', clean);
        else el.removeAttribute('style');
      }
      continue;
    } else if (/url\(/i.test(value)) {
      const clean = sanitizeCssValue(value);
      if (clean !== value) el.setAttribute(attr.name, clean);
      continue;
    }
    if (remove) {
      if (local === 'href') removeHref(el);
      else el.removeAttributeNode(attr);
      stats.removedAttributes++;
    }
  }
}

function normalizeRoot(root: Element, warnings: string[]): SvgArtboard | null {
  const vb = parseViewBox(root.getAttribute('viewBox'));
  let artboard: SvgArtboard | null = null;
  if (vb) {
    artboard = vb;
    // Unitless size == viewBox size => paper imports at scale 1 in user units,
    // regardless of "mm"/"%"/missing width/height on the original root.
    root.setAttribute('width', String(vb.width));
    root.setAttribute('height', String(vb.height));
  } else {
    if (root.hasAttribute('viewBox')) warnings.push(activeT().sanitize.invalidViewBox);
    const w = parseLengthToPx(root.getAttribute('width'));
    const h = parseLengthToPx(root.getAttribute('height'));
    if (w && h && w > 0 && h > 0) {
      artboard = { x: 0, y: 0, width: w, height: h };
      root.setAttribute('width', String(w));
      root.setAttribute('height', String(h));
    } else {
      root.removeAttribute('width');
      root.removeAttribute('height');
    }
    root.removeAttribute('viewBox');
  }
  root.removeAttribute('x');
  root.removeAttribute('y');
  // Prevent paper from inserting the artboard as a clip mask: that clip rect
  // used to be detected as a logo "component" and made fullBounds == artboard.
  root.setAttribute('overflow', 'visible');
  return artboard;
}

function parseDocument(src: string): Document {
  const parser = new DOMParser();
  let doc = parser.parseFromString(src, 'image/svg+xml');
  const failed = (d: Document) =>
    d.getElementsByTagName('parsererror').length > 0 || !d.documentElement || localName(d.documentElement) !== 'svg';
  if (failed(doc)) {
    // Lenient fallback: the HTML parser tolerates unescaped "&", unquoted attrs, etc.
    const html = parser.parseFromString(`<!doctype html><html><body>${src}</body></html>`, 'text/html');
    const svg = html.querySelector('svg');
    if (!svg) throw new SvgParseError('invalid-xml', 'File is not valid SVG/XML.');
    const serialized = new XMLSerializer().serializeToString(svg);
    doc = parser.parseFromString(serialized, 'image/svg+xml');
    if (failed(doc)) throw new SvgParseError('invalid-xml', 'File is not valid SVG/XML.');
  }
  return doc;
}

function sanitizeSVGUncached(input: string, options: SanitizeOptions = {}): SanitizeResult {
  const maxBytes = options.maxBytes ?? 15 * 1024 * 1024;
  const maxElements = options.maxElements ?? 60000;
  if (typeof input !== 'string' || !input.trim()) throw new SvgParseError('empty', 'SVG file is empty.');
  if (input.length > maxBytes) {
    throw new SvgParseError('too-large', `SVG is too large (${(input.length / 1048576).toFixed(1)} MB, max ${(maxBytes / 1048576).toFixed(0)} MB).`);
  }
  let src = input.replace(/^﻿/, '').trim();
  if (!/<svg[\s>]/i.test(src)) throw new SvgParseError('not-svg', 'File does not contain an <svg> element.');
  src = stripDoctype(src);

  const doc = parseDocument(src);
  const root = doc.documentElement;
  const initialCount = root.getElementsByTagName('*').length + 1;
  if (initialCount > maxElements) throw new SvgParseError('too-complex', `SVG has more than ${maxElements} elements.`);

  const warnings: string[] = [];
  const stats: SanitizeResult['stats'] = { elementCount: 0, removedElements: {}, removedAttributes: 0, expandedUses: 0, inlinedRules: 0 };
  const cssChunks: string[] = [];

  sanitizeTree(root, stats, cssChunks);
  if (options.expandUse !== false) stats.expandedUses = expandUses(doc, root, maxElements, warnings);
  if (options.inlineStyles !== false && cssChunks.length) {
    stats.inlinedRules = inlineStyles(doc, root, cssChunks.join('\n'));
  }
  const artboard = normalizeRoot(root, warnings);

  // Remove leftover processing instructions / comments (can hide payloads for other tools).
  const strip: Node[] = [];
  const it = doc.createNodeIterator(doc, 128 /* COMMENT */ | 64 /* PROCESSING_INSTRUCTION */);
  for (let n = it.nextNode(); n; n = it.nextNode()) strip.push(n);
  strip.forEach(n => n.parentNode?.removeChild(n));

  stats.elementCount = root.getElementsByTagName('*').length + 1;
  const removedTotal = Object.values(stats.removedElements).reduce((a, b) => a + b, 0);
  if (removedTotal) {
    warnings.push(fill(activeT().sanitize.removedElements, {
    list: Object.entries(stats.removedElements).map(([k, v]) => `${k}×${v}`).join(', '),
  }));
  }
  if (stats.removedAttributes) warnings.push(fill(activeT().sanitize.removedAttributes, { n: stats.removedAttributes }));

  let svg = new XMLSerializer().serializeToString(root);
  if (!/\sxmlns=/.test(svg.slice(0, svg.indexOf('>')))) svg = svg.replace(/^<svg/, `<svg xmlns="${SVG_NS}"`);
  return { svg, artboard, warnings, stats };
}

// The language is part of the key: the warnings are written in it.
const sanitizeMemo = memoizeByKey(sanitizeSVGUncached, (input, options) => hashKey(input, options ?? {}, activeLanguage()), 8);

/**
 * Sanitize + normalize an SVG string (memoized by content hash).
 * Throws `SvgParseError` for empty / non-SVG / oversized / unparseable input.
 */
export function sanitizeSVG(input: string, options?: SanitizeOptions): SanitizeResult {
  const res = sanitizeMemo(input, options);
  // Return copies of mutable parts so callers cannot corrupt the cache.
  return { ...res, warnings: [...res.warnings], artboard: res.artboard ? { ...res.artboard } : null };
}

import type { Cmd } from './types';
import { mapCmds, splitContours, type Pt } from './geometry';

/**
 * Leitura de SVG: limpa o documento, resolve transformações e estilos e devolve
 * as formas preenchidas como comandos absolutos (M, L, Q, C, Z) no espaço do
 * documento. Nada do arquivo do usuário vai para o DOM da página: o documento
 * é lido num DOMParser, que não executa nada, e o que chega à tela é redesenhado
 * a partir dos comandos.
 */

export interface SvgShape {
  contours: Cmd[][];
  fillRule: 'nonzero' | 'evenodd';
}

export interface SvgReadResult {
  shapes: SvgShape[];
  /** Formas só com traço (sem preenchimento), que uma fonte não consegue usar. */
  strokeOnly: number;
}

const MAX_SVG_BYTES = 20 * 1024 * 1024;
const DROP_ELEMENTS = new Set(['script', 'foreignobject', 'iframe', 'image', 'audio', 'video', 'canvas', 'object', 'embed', 'a']);
const SKIP_CONTAINERS = new Set(['defs', 'clippath', 'mask', 'pattern', 'marker', 'symbol', 'lineargradient', 'radialgradient', 'filter', 'metadata', 'title', 'desc', 'text', 'style']);

/** Aceita um SVG completo, um fragmento com `<path>` ou só o valor de `d`. */
export function normalizeSvgInput(text: string): string {
  const t = text.trim();
  if (/<svg[\s>]/i.test(t)) return t;
  if (/<(path|rect|circle|ellipse|polygon|polyline|g)[\s>/]/i.test(t)) return `<svg xmlns="http://www.w3.org/2000/svg">${t}</svg>`;
  if (/^[MmZzLlHhVvCcSsQqTtAa0-9eE.,\s+-]+$/.test(t) && /^[Mm]/.test(t)) {
    return `<svg xmlns="http://www.w3.org/2000/svg"><path d="${t.replace(/"/g, '')}"/></svg>`;
  }
  return t;
}

/** Remove DOCTYPE/entidades antes de ler e, depois, tudo que executa ou busca algo fora. */
export function parseSvgDocument(text: string): Document {
  if (text.length > MAX_SVG_BYTES) throw new Error('SVG grande demais (limite de 20 MB).');
  const cleaned = normalizeSvgInput(text)
    .replace(/<!DOCTYPE[\s\S]*?(\[[\s\S]*?\])?\s*>/gi, '')
    .replace(/<!ENTITY[\s\S]*?>/gi, '');
  const doc = new DOMParser().parseFromString(cleaned, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length || doc.documentElement.nodeName.toLowerCase() !== 'svg') {
    throw new Error('O texto não é um SVG válido.');
  }
  sanitize(doc.documentElement);
  return doc;
}

function sanitize(root: Element) {
  const all = Array.from(root.getElementsByTagName('*'));
  for (const el of all) {
    if (DROP_ELEMENTS.has(el.localName.toLowerCase())) {
      el.parentNode?.removeChild(el);
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#')) el.removeAttribute(attr.name);
      else if (/url\(\s*['"]?(?!#)/i.test(value)) el.removeAttribute(attr.name);
    }
  }
  for (const attr of Array.from(root.attributes)) if (attr.name.toLowerCase().startsWith('on')) root.removeAttribute(attr.name);
}

/* ------------------------------------------------------------ transformações */

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

const NUMBER_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
const nums = (s: string) => (s.match(NUMBER_RE) || []).map(Number);

export function parseTransform(value: string | null): Matrix {
  if (!value) return IDENTITY;
  let m: Matrix = IDENTITY;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    const kind = match[1].toLowerCase();
    const a = nums(match[2]);
    let t: Matrix = IDENTITY;
    if (kind === 'matrix' && a.length >= 6) t = [a[0], a[1], a[2], a[3], a[4], a[5]];
    else if (kind === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (kind === 'scale') t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (kind === 'rotate') {
      const r = ((a[0] || 0) * Math.PI) / 180;
      const cos = Math.cos(r);
      const sin = Math.sin(r);
      t = [cos, sin, -sin, cos, 0, 0];
      if (a.length >= 3) t = multiply(multiply([1, 0, 0, 1, a[1], a[2]], t), [1, 0, 0, 1, -a[1], -a[2]]);
    } else if (kind === 'skewx') t = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
    else if (kind === 'skewy') t = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = multiply(m, t);
  }
  return m;
}

const applyMatrix = (cmds: Cmd[], m: Matrix): Cmd[] =>
  m === IDENTITY ? cmds : mapCmds(cmds, (x, y): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);

/* ------------------------------------------------------------ caminho (d) */

/** Converte um atributo `d` em comandos absolutos M/L/Q/C/Z. Arcos viram cúbicas. */
export function parsePathData(d: string): Cmd[] {
  const out: Cmd[] = [];
  const tokens = d.match(/[MmZzLlHhVvCcSsQqTtAa]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || [];
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0;
  let lastCtrl: Pt | null = null;
  let lastType = '';
  const isCmd = (t: string) => /^[a-zA-Z]$/.test(t);
  const num = () => Number(tokens[i++]);
  // Flags de arco têm um dígito só e podem vir coladas no número seguinte ("a1 1 0 01.5.5").
  const flag = () => {
    const t = tokens[i] || '0';
    if (t.length > 1) tokens[i] = t.slice(1);
    else i++;
    return t[0] === '1' ? 1 : 0;
  };

  while (i < tokens.length) {
    if (isCmd(tokens[i])) cmd = tokens[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'Z') {
      out.push({ type: 'Z' });
      x = sx; y = sy;
      lastCtrl = null; lastType = 'Z';
      continue;
    }
    if (i >= tokens.length || isCmd(tokens[i])) continue;
    if (C === 'M') {
      x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num();
      sx = x; sy = y;
      out.push({ type: 'M', x, y });
      cmd = rel ? 'l' : 'L';
      lastCtrl = null; lastType = 'M';
    } else if (C === 'L') {
      x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num();
      out.push({ type: 'L', x, y });
      lastCtrl = null; lastType = 'L';
    } else if (C === 'H') {
      x = (rel ? x : 0) + num();
      out.push({ type: 'L', x, y });
      lastCtrl = null; lastType = 'L';
    } else if (C === 'V') {
      y = (rel ? y : 0) + num();
      out.push({ type: 'L', x, y });
      lastCtrl = null; lastType = 'L';
    } else if (C === 'C' || C === 'S') {
      let x1: number, y1: number;
      if (C === 'C') { x1 = (rel ? x : 0) + num(); y1 = (rel ? y : 0) + num(); }
      else if (lastCtrl && lastType === 'C') { x1 = 2 * x - lastCtrl[0]; y1 = 2 * y - lastCtrl[1]; }
      else { x1 = x; y1 = y; }
      const x2 = (rel ? x : 0) + num(); const y2 = (rel ? y : 0) + num();
      const ex = (rel ? x : 0) + num(); const ey = (rel ? y : 0) + num();
      out.push({ type: 'C', x1, y1, x2, y2, x: ex, y: ey });
      lastCtrl = [x2, y2]; lastType = 'C';
      x = ex; y = ey;
    } else if (C === 'Q' || C === 'T') {
      let x1: number, y1: number;
      if (C === 'Q') { x1 = (rel ? x : 0) + num(); y1 = (rel ? y : 0) + num(); }
      else if (lastCtrl && lastType === 'Q') { x1 = 2 * x - lastCtrl[0]; y1 = 2 * y - lastCtrl[1]; }
      else { x1 = x; y1 = y; }
      const ex = (rel ? x : 0) + num(); const ey = (rel ? y : 0) + num();
      out.push({ type: 'Q', x1, y1, x: ex, y: ey });
      lastCtrl = [x1, y1]; lastType = 'Q';
      x = ex; y = ey;
    } else if (C === 'A') {
      const rx = Math.abs(num()); const ry = Math.abs(num()); const rot = num();
      const large = flag(); const sweep = flag();
      const ex = (rel ? x : 0) + num(); const ey = (rel ? y : 0) + num();
      out.push(...arcToCubics(x, y, rx, ry, rot, large, sweep, ex, ey));
      x = ex; y = ey;
      lastCtrl = null; lastType = 'A';
    } else {
      i++;
    }
  }
  return out.filter(c => Object.values(c).every(v => typeof v !== 'number' || Number.isFinite(v)));
}

/** Arco elíptico do SVG em cúbicas (até 90° por cúbica), conforme o apêndice B.2.4 da especificação. */
function arcToCubics(x1: number, y1: number, rx: number, ry: number, angle: number, large: number, sweep: number, x2: number, y2: number): Cmd[] {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return [{ type: 'L', x: x2, y: y2 }];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const theta1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const segs = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / segs;
  const k = (4 / 3) * Math.tan(step / 4);
  const out: Cmd[] = [];
  const point = (t: number): Pt => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const deriv = (t: number): Pt => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  let t = theta1;
  for (let s = 0; s < segs; s++) {
    const t2 = t + step;
    const p1 = point(t);
    const p2 = point(t2);
    const d1 = deriv(t);
    const d2 = deriv(t2);
    const end: Pt = s === segs - 1 ? [x2, y2] : p2;
    out.push({ type: 'C', x1: p1[0] + k * d1[0], y1: p1[1] + k * d1[1], x2: p2[0] - k * d2[0], y2: p2[1] - k * d2[1], x: end[0], y: end[1] });
    t = t2;
  }
  return out;
}

/* ------------------------------------------------------------ formas básicas */

const KAPPA = 0.5522847498307936;

function ellipseCmds(cx: number, cy: number, rx: number, ry: number): Cmd[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { type: 'M', x: cx + rx, y: cy },
    { type: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { type: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
    { type: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { type: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { type: 'Z' },
  ];
}

function rectCmds(x: number, y: number, w: number, h: number, rx: number, ry: number): Cmd[] {
  if (w <= 0 || h <= 0) return [];
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (!rx || !ry) {
    return [
      { type: 'M', x, y }, { type: 'L', x: x + w, y }, { type: 'L', x: x + w, y: y + h }, { type: 'L', x, y: y + h }, { type: 'Z' },
    ];
  }
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { type: 'M', x: x + rx, y },
    { type: 'L', x: x + w - rx, y },
    { type: 'C', x1: x + w - rx + kx, y1: y, x2: x + w, y2: y + ry - ky, x: x + w, y: y + ry },
    { type: 'L', x: x + w, y: y + h - ry },
    { type: 'C', x1: x + w, y1: y + h - ry + ky, x2: x + w - rx + kx, y2: y + h, x: x + w - rx, y: y + h },
    { type: 'L', x: x + rx, y: y + h },
    { type: 'C', x1: x + rx - kx, y1: y + h, x2: x, y2: y + h - ry + ky, x, y: y + h - ry },
    { type: 'L', x, y: y + ry },
    { type: 'C', x1: x, y1: y + ry - ky, x2: x + rx - kx, y2: y, x: x + rx, y },
    { type: 'Z' },
  ];
}

const attrNum = (el: Element, name: string, fallback = 0) => {
  const v = parseFloat(el.getAttribute(name) || '');
  return Number.isFinite(v) ? v : fallback;
};

function shapeCmds(el: Element): Cmd[] {
  switch (el.localName.toLowerCase()) {
    case 'path':
      return parsePathData(el.getAttribute('d') || '');
    case 'rect': {
      const rxA = el.getAttribute('rx');
      const ryA = el.getAttribute('ry');
      const rx = attrNum(el, 'rx', rxA === null && ryA !== null ? attrNum(el, 'ry') : 0);
      const ry = attrNum(el, 'ry', ryA === null ? rx : 0);
      return rectCmds(attrNum(el, 'x'), attrNum(el, 'y'), attrNum(el, 'width'), attrNum(el, 'height'), rx, ry);
    }
    case 'circle': {
      const r = attrNum(el, 'r');
      return r > 0 ? ellipseCmds(attrNum(el, 'cx'), attrNum(el, 'cy'), r, r) : [];
    }
    case 'ellipse': {
      const rx = attrNum(el, 'rx');
      const ry = attrNum(el, 'ry');
      return rx > 0 && ry > 0 ? ellipseCmds(attrNum(el, 'cx'), attrNum(el, 'cy'), rx, ry) : [];
    }
    case 'polygon':
    case 'polyline': {
      const p = nums(el.getAttribute('points') || '');
      if (p.length < 6) return [];
      const cmds: Cmd[] = [{ type: 'M', x: p[0], y: p[1] }];
      for (let k = 2; k + 1 < p.length; k += 2) cmds.push({ type: 'L', x: p[k], y: p[k + 1] });
      cmds.push({ type: 'Z' });
      return cmds;
    }
    default:
      return [];
  }
}

/* ------------------------------------------------------------ estilos */

type StyleMap = Record<string, string>;

/** Regras simples de `<style>` por classe (o que Illustrator e Figma exportam: `.cls-1{fill:#231f20}`). */
function readClassStyles(doc: Document): Record<string, StyleMap> {
  const rules: Record<string, StyleMap> = {};
  for (const styleEl of Array.from(doc.getElementsByTagName('style'))) {
    const css = (styleEl.textContent || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /([^{}]+)\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
      const decls = parseDecls(m[2]);
      for (const sel of m[1].split(',')) {
        const s = sel.trim();
        if (/^\.[\w-]+$/.test(s)) rules[s.slice(1)] = { ...(rules[s.slice(1)] || {}), ...decls };
      }
    }
  }
  return rules;
}

function parseDecls(text: string): StyleMap {
  const out: StyleMap = {};
  for (const part of text.split(';')) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim().toLowerCase();
  }
  return out;
}

const STYLE_PROPS = ['fill', 'fill-rule', 'fill-opacity', 'opacity', 'display', 'visibility', 'stroke'];

function ownStyle(el: Element, classes: Record<string, StyleMap>): StyleMap {
  const s: StyleMap = {};
  for (const cls of (el.getAttribute('class') || '').split(/\s+/)) if (cls && classes[cls]) Object.assign(s, classes[cls]);
  for (const p of STYLE_PROPS) {
    const v = el.getAttribute(p);
    if (v !== null) s[p] = v.trim().toLowerCase();
  }
  Object.assign(s, parseDecls(el.getAttribute('style') || ''));
  return s;
}

const WHITE = /^(#fff(fff)?|white|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/;

function isPainted(style: StyleMap): boolean {
  const fill = style.fill ?? '#000';
  if (fill === 'none' || fill === 'transparent' || WHITE.test(fill)) return false;
  if (style['fill-opacity'] !== undefined && parseFloat(style['fill-opacity']) === 0) return false;
  return true;
}

/* ------------------------------------------------------------ leitura */

/** Lê todas as formas preenchidas de um SVG, já no espaço do documento. */
export function readSvgShapes(text: string): SvgReadResult {
  const doc = parseSvgDocument(text);
  const classes = readClassStyles(doc);
  const shapes: SvgShape[] = [];
  let strokeOnly = 0;
  const byId = new Map<string, Element>();
  for (const el of Array.from(doc.getElementsByTagName('*'))) {
    const id = el.getAttribute('id');
    if (id) byId.set(id, el);
  }

  const visit = (el: Element, matrix: Matrix, inherited: StyleMap, depth: number) => {
    if (depth > 64) return;
    const tag = el.localName.toLowerCase();
    if (SKIP_CONTAINERS.has(tag)) return;
    const own = ownStyle(el, classes);
    if (own.display === 'none' || own.visibility === 'hidden' || (own.opacity !== undefined && parseFloat(own.opacity) === 0)) return;
    const style: StyleMap = { ...inherited };
    for (const k of ['fill', 'fill-rule', 'fill-opacity', 'stroke']) if (own[k] !== undefined) style[k] = own[k];
    let m = multiply(matrix, parseTransform(el.getAttribute('transform')));

    if (tag === 'use') {
      const ref = (el.getAttribute('href') || el.getAttribute('xlink:href') || '').slice(1);
      const target = ref ? byId.get(ref) : undefined;
      if (!target) return;
      m = multiply(m, [1, 0, 0, 1, attrNum(el, 'x'), attrNum(el, 'y')]);
      const t = target.localName.toLowerCase();
      if (t === 'symbol') for (const child of Array.from(target.children)) visit(child, m, style, depth + 1);
      else visit(target, m, style, depth + 1);
      return;
    }
    if (tag === 'svg' || tag === 'g' || tag === 'switch') {
      if (tag === 'svg' && el !== doc.documentElement) m = multiply(m, [1, 0, 0, 1, attrNum(el, 'x'), attrNum(el, 'y')]);
      for (const child of Array.from(el.children)) visit(child, m, style, depth + 1);
      return;
    }
    const cmds = shapeCmds(el);
    if (!cmds.length) return;
    if (!isPainted(style)) {
      if (style.stroke && style.stroke !== 'none') strokeOnly++;
      return;
    }
    const contours = splitContours(applyMatrix(cmds, m));
    if (!contours.length) return;
    shapes.push({ contours, fillRule: style['fill-rule'] === 'evenodd' ? 'evenodd' : 'nonzero' });
  };

  visit(doc.documentElement, IDENTITY, {}, 0);
  return { shapes, strokeOnly };
}

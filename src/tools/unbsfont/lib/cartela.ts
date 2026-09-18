import type { Cmd, Glyph, Metrics } from './types';
import { type Box, flatten, mapCmds, polyBox, signedArea, toPathData, unionBox } from './geometry';
import type { SvgShape } from './svg';
import { groupOutline, newGlyph, shapesToComponents, type Component, type SheetGroup } from './sheet';

/**
 * Cartela: um modelo para baixar, com uma célula por caractere, as guias das
 * métricas e marcas de registro nos cantos de cada página. O designer desenha
 * por cima e sobe o arquivo de volta; a posição de cada forma diz a qual
 * caractere ela pertence.
 *
 * Tudo é medido em pontos (1/72 pol.), com y para baixo e as páginas empilhadas
 * na vertical: a página i do PDF é exatamente a faixa i do SVG. O arquivo leva
 * um descritor (JSON em base64) com a grade e os caracteres; se ele se perder
 * numa reexportação, a grade é refeita a partir das marcas de registro e da
 * ordem de caracteres atual.
 */

export const CARTELA_VERSION = 1;
export const DESCRIPTOR_PREFIX = 'UNBSFONT-CARTELA:';
/** Guias, molduras e rótulos: só referência, ignorados na volta. */
export const GUIDE_COLOR = '#8fc9f5';
/** Marcas de registro. */
export const MARK_COLOR = '#0a7cff';
/** Texto do cabeçalho e rótulos das células. */
export const TEXT_COLOR = '#6b7888';
export const TEMPLATE_COLORS = [GUIDE_COLOR, MARK_COLOR, TEXT_COLOR];

export type Paper = 'a4' | 'letter';
export const PAPERS: Record<Paper, { label: string; w: number; h: number }> = {
  a4: { label: 'A4', w: 595.276, h: 841.89 },
  letter: { label: 'Carta', w: 612, h: 792 },
};

export const DEFAULT_COLUMNS = 10;
const GRID_W = 500;
const CELL_H = 64;
const GRID_TOP = 120;
const BOTTOM_ROOM = 48;
const PAGE_GAP = 36;
const LABEL_BAND = 12;
const FOOT_PAD = 4;
const MARK_OFFSET = 14;
const MARK_SIZE = 10;

export type MarkType = 'tl' | 'tr' | 'bl' | 'br';

export interface CartelaSpec {
  v: 1;
  paper: Paper;
  pageW: number;
  pageH: number;
  cols: number;
  cellW: number;
  cellH: number;
  gridX: number;
  gridY: number;
  rowsPerPage: number;
  pageGap: number;
  chars: string[];
  /** Métricas usadas nas guias (unidades da fonte). */
  metrics: { upm: number; asc: number; desc: number; cap: number; x: number };
  family?: string;
  style?: string;
}

export interface Cell {
  index: number;
  char: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** y da linha de base, em pontos. */
  baseline: number;
}

export interface Mark { type: MarkType; page: number; x: number; y: number }

/* ------------------------------------------------------------ geometria */

export function makeSpec(opts: {
  chars: string[];
  metrics: Metrics;
  paper?: Paper;
  cols?: number;
  family?: string;
  style?: string;
}): CartelaSpec {
  const paper = opts.paper ?? 'a4';
  const { w, h } = PAPERS[paper];
  const cols = Math.max(1, Math.min(20, Math.round(opts.cols ?? DEFAULT_COLUMNS)));
  const m = opts.metrics;
  // Um caractere por célula, na ordem em que aparece.
  const chars = Array.from(new Set(opts.chars.filter(c => c && !/\s/.test(c))));
  return {
    v: 1,
    paper,
    pageW: w,
    pageH: h,
    cols,
    cellW: GRID_W / cols,
    cellH: CELL_H,
    gridX: (w - GRID_W) / 2,
    gridY: GRID_TOP,
    rowsPerPage: Math.max(1, Math.floor((h - GRID_TOP - BOTTOM_ROOM) / CELL_H)),
    pageGap: PAGE_GAP,
    chars,
    metrics: {
      upm: m.unitsPerEm,
      asc: Math.max(m.ascender, m.capHeight),
      desc: Math.min(m.descender, 0),
      cap: m.capHeight,
      x: m.xHeight,
    },
    family: opts.family,
    style: opts.style,
  };
}

export const perPage = (s: CartelaSpec) => s.cols * s.rowsPerPage;
export const pageCount = (s: CartelaSpec) => Math.max(1, Math.ceil(s.chars.length / perPage(s)));
export const pageTop = (s: CartelaSpec, page: number) => page * (s.pageH + s.pageGap);
export const docHeight = (s: CartelaSpec) => pageCount(s) * s.pageH + (pageCount(s) - 1) * s.pageGap;

/** Pontos por unidade da fonte dentro da célula. */
export const unitScale = (s: CartelaSpec) => (s.cellH - LABEL_BAND - FOOT_PAD) / Math.max(1, s.metrics.asc - s.metrics.desc);

export function cells(s: CartelaSpec): Cell[] {
  const k = unitScale(s);
  const pp = perPage(s);
  return s.chars.map((char, index) => {
    const page = Math.floor(index / pp);
    const local = index % pp;
    const x = s.gridX + (local % s.cols) * s.cellW;
    const y = pageTop(s, page) + s.gridY + Math.floor(local / s.cols) * s.cellH;
    return { index, char, page, x, y, w: s.cellW, h: s.cellH, baseline: y + LABEL_BAND + s.metrics.asc * k };
  });
}

/** Centro de cada marca de registro, em todas as páginas (ou só numa). */
export function marks(s: CartelaSpec, onlyPage?: number): Mark[] {
  const out: Mark[] = [];
  const x0 = s.gridX - MARK_OFFSET;
  const x1 = s.gridX + s.cols * s.cellW + MARK_OFFSET;
  for (let p = 0; p < pageCount(s); p++) {
    if (onlyPage !== undefined && p !== onlyPage) continue;
    const y0 = pageTop(s, p) + s.gridY - MARK_OFFSET;
    const y1 = pageTop(s, p) + s.gridY + s.rowsPerPage * s.cellH + MARK_OFFSET;
    out.push({ type: 'tl', page: p, x: x0, y: y0 }, { type: 'tr', page: p, x: x1, y: y0 }, { type: 'bl', page: p, x: x0, y: y1 }, { type: 'br', page: p, x: x1, y: y1 });
  }
  return out;
}

const K = 0.5522847498307936;
function circle(cx: number, cy: number, r: number, reverse = false): Cmd[] {
  const k = r * K;
  const d = reverse ? -1 : 1;
  return [
    { type: 'M', x: cx + r, y: cy },
    { type: 'C', x1: cx + r, y1: cy + d * k, x2: cx + k, y2: cy + d * r, x: cx, y: cy + d * r },
    { type: 'C', x1: cx - k, y1: cy + d * r, x2: cx - r, y2: cy + d * k, x: cx - r, y: cy },
    { type: 'C', x1: cx - r, y1: cy - d * k, x2: cx - k, y2: cy - d * r, x: cx, y: cy - d * r },
    { type: 'C', x1: cx + k, y1: cy - d * r, x2: cx + r, y2: cy - d * k, x: cx + r, y: cy },
    { type: 'Z' },
  ];
}

/** Formas das marcas: círculo, quadrado, triângulo e anel. Cada canto é inconfundível. */
export function markShape(m: Mark): Cmd[] {
  const r = MARK_SIZE / 2;
  const { x, y } = m;
  switch (m.type) {
    case 'tl': return circle(x, y, r);
    case 'tr': return [{ type: 'M', x: x - r, y: y - r }, { type: 'L', x: x + r, y: y - r }, { type: 'L', x: x + r, y: y + r }, { type: 'L', x: x - r, y: y + r }, { type: 'Z' }];
    case 'bl': return [{ type: 'M', x: x - r, y: y - r }, { type: 'L', x: x + r, y: y + r }, { type: 'L', x: x - r, y: y + r }, { type: 'Z' }];
    default: return [...circle(x, y, r), ...circle(x, y, r / 2, true)];
  }
}

/* ------------------------------------------------------------ descritor */

const toBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

export function encodeDescriptor(s: CartelaSpec): string {
  return DESCRIPTOR_PREFIX + toBase64(JSON.stringify({ k: 'unbsfont-cartela', ...s }));
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Procura o descritor em qualquer lugar do texto (metadado, texto, atributo) e valida cada campo. */
export function decodeDescriptor(text: string): CartelaSpec | null {
  const re = new RegExp(`${DESCRIPTOR_PREFIX}\\s*([A-Za-z0-9+/=]{16,})`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    try {
      const o = JSON.parse(fromBase64(m[1])) as Record<string, unknown>;
      if (o.k !== 'unbsfont-cartela' || o.v !== CARTELA_VERSION) continue;
      const nums = ['pageW', 'pageH', 'cols', 'cellW', 'cellH', 'gridX', 'gridY', 'rowsPerPage', 'pageGap'] as const;
      if (!nums.every(key => finite(o[key]) && (o[key] as number) >= 0)) continue;
      if ((o.cols as number) < 1 || (o.cellW as number) <= 0 || (o.cellH as number) <= 0 || (o.rowsPerPage as number) < 1) continue;
      const chars = Array.isArray(o.chars) ? o.chars.filter((c): c is string => typeof c === 'string' && Array.from(c).length === 1) : [];
      const mt = (o.metrics || {}) as Record<string, unknown>;
      if (!chars.length || !['upm', 'asc', 'desc', 'cap', 'x'].every(key => finite(mt[key]))) continue;
      return {
        v: 1,
        paper: o.paper === 'letter' ? 'letter' : 'a4',
        pageW: o.pageW as number,
        pageH: o.pageH as number,
        cols: Math.round(o.cols as number),
        cellW: o.cellW as number,
        cellH: o.cellH as number,
        gridX: o.gridX as number,
        gridY: o.gridY as number,
        rowsPerPage: Math.round(o.rowsPerPage as number),
        pageGap: o.pageGap as number,
        chars,
        metrics: { upm: mt.upm as number, asc: mt.asc as number, desc: mt.desc as number, cap: mt.cap as number, x: mt.x as number },
        family: typeof o.family === 'string' ? o.family : undefined,
        style: typeof o.style === 'string' ? o.style : undefined,
      };
    } catch { /* trecho que não é um descritor válido: segue procurando */ }
  }
  return null;
}

/* ------------------------------------------------------------ cena */

/** O desenho da cartela, uma lista por página, que vira SVG ou PDF sem diferença de posição. */
export type SceneItem =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; dash?: number[] }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; width: number; dash?: number[] }
  | { kind: 'text'; x: number; y: number; size: number; text: string; bold?: boolean }
  | { kind: 'mark'; mark: Mark; cmds: Cmd[] }
  | { kind: 'ink'; cmds: Cmd[] };

export interface ScenePage { index: number; top: number; guides: SceneItem[]; marks: SceneItem[] }

const INSTRUCTIONS = [
  'Desenhe cada glifo na sua célula, sobre a linha de base. Não mova as marcas de registro.',
  'Exporte como SVG ou PDF e suba de volta.',
];

export function scene(s: CartelaSpec): ScenePage[] {
  const all = cells(s);
  const k = unitScale(s);
  const pages: ScenePage[] = [];
  const total = pageCount(s);
  for (let p = 0; p < total; p++) {
    const top = pageTop(s, p);
    const guides: SceneItem[] = [];
    const title = ['Cartela de glifos', s.family, s.style].filter(Boolean).join(' · ');
    guides.push({ kind: 'text', x: s.gridX, y: top + 44, size: 14, text: title, bold: true });
    INSTRUCTIONS.forEach((line, i) => guides.push({ kind: 'text', x: s.gridX, y: top + 62 + i * 12, size: 8.5, text: line }));
    guides.push({
      kind: 'text', x: s.gridX, y: top + 96, size: 7,
      text: `Guias: ascendente, maiúsculas, altura-x, linha de base (mais forte) e descendente. Página ${p + 1} de ${total} · ${s.chars.length} caracteres.`,
    });
    for (const c of all.filter(cell => cell.page === p)) {
      guides.push({ kind: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, width: 0.5 });
      const lines: [number, number, number[] | undefined][] = [
        [s.metrics.asc, 0.35, [1.5, 1.5]],
        [s.metrics.cap, 0.35, undefined],
        [s.metrics.x, 0.35, undefined],
        [0, 0.9, undefined],
        [s.metrics.desc, 0.35, [1.5, 1.5]],
      ];
      for (const [v, width, dash] of lines) {
        const y = c.baseline - v * k;
        guides.push({ kind: 'line', x1: c.x, y1: y, x2: c.x + c.w, y2: y, width, dash });
      }
      // Caixa de avanço: margem de 3 pt de cada lado, da ascendente à descendente.
      guides.push({
        kind: 'rect', x: c.x + 3, y: c.baseline - s.metrics.asc * k, w: c.w - 6, h: (s.metrics.asc - s.metrics.desc) * k, width: 0.3, dash: [0.8, 1.6],
      });
      guides.push({ kind: 'text', x: c.x + 2.5, y: c.y + 8.5, size: 7, text: c.char });
    }
    guides.push({ kind: 'text', x: s.gridX, y: top + s.pageH - 20, size: 1.5, text: p === 0 ? encodeDescriptor(s) : 'UNBSFONT-CARTELA' });
    pages.push({ index: p, top, guides, marks: marks(s, p).map(mk => ({ kind: 'mark', mark: mk, cmds: markShape(mk) })) });
  }
  return pages;
}

/** Contorno em unidades da fonte (y para cima) posto na célula de um caractere, em pontos. */
export function placeInCell(s: CartelaSpec, cell: Cell, outline: Cmd[], leftInset = 6): Cmd[] {
  const k = unitScale(s);
  return mapCmds(outline, (x, y) => [cell.x + leftInset + x * k, cell.baseline - y * k]);
}

/* ------------------------------------------------------------ SVG */

const f3 = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

export const escapeXml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Caminho com 6 casas: o desenho de teste não pode perder precisão na ida. */
function precisePath(cmds: Cmd[]): string {
  const p = (v: number) => String(Math.round(v * 1e6) / 1e6);
  return cmds.map(c => {
    if (c.type === 'M' || c.type === 'L') return `${c.type}${p(c.x)} ${p(c.y)}`;
    if (c.type === 'Q') return `Q${p(c.x1)} ${p(c.y1)} ${p(c.x)} ${p(c.y)}`;
    if (c.type === 'C') return `C${p(c.x1)} ${p(c.y1)} ${p(c.x2)} ${p(c.y2)} ${p(c.x)} ${p(c.y)}`;
    return 'Z';
  }).join('');
}

function svgItem(it: SceneItem): string {
  switch (it.kind) {
    case 'line':
      return `<line x1="${f3(it.x1)}" y1="${f3(it.y1)}" x2="${f3(it.x2)}" y2="${f3(it.y2)}" stroke-width="${it.width}"${it.dash ? ` stroke-dasharray="${it.dash.join(' ')}"` : ''}/>`;
    case 'rect':
      return `<rect x="${f3(it.x)}" y="${f3(it.y)}" width="${f3(it.w)}" height="${f3(it.h)}" stroke-width="${it.width}"${it.dash ? ` stroke-dasharray="${it.dash.join(' ')}"` : ''}/>`;
    case 'text':
      return `<text x="${f3(it.x)}" y="${f3(it.y)}" font-size="${it.size}"${it.bold ? ' font-weight="700"' : ''}>${escapeXml(it.text)}</text>`;
    case 'mark':
      return `<path id="unbsfont-marca-${it.mark.type}-${it.mark.page + 1}" fill-rule="evenodd" d="${toPathData(it.cmds)}"/>`;
    case 'ink':
      return `<path d="${precisePath(it.cmds)}"/>`;
  }
}

/** SVG da cartela. `ink` desenha formas por cima (usado em testes e para conferir). */
export function cartelaSvg(s: CartelaSpec, ink: Cmd[][] = []): string {
  const W = s.pageW;
  const H = docHeight(s);
  const pages = scene(s);
  const guides = pages.flatMap(p => [
    `<rect x="0" y="${f3(p.top)}" width="${f3(W)}" height="${f3(s.pageH)}" fill="#ffffff" stroke-width="0.5"/>`,
    ...p.guides.filter(g => g.kind !== 'text').map(svgItem),
  ]);
  const texts = pages.flatMap(p => p.guides.filter(g => g.kind === 'text').map(svgItem));
  const markEls = pages.flatMap(p => p.marks.map(svgItem));
  const desc = encodeDescriptor(s);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f3(W)}pt" height="${f3(H)}pt" viewBox="0 0 ${f3(W)} ${f3(H)}" data-unbsfont-cartela="${desc}">`,
    `<title>Cartela UNBSFONT</title>`,
    `<metadata id="unbsfont-descritor">${desc}</metadata>`,
    `<g id="unbsfont-guias" fill="none" stroke="${GUIDE_COLOR}">`,
    ...guides,
    '</g>',
    `<g id="unbsfont-guias-texto" fill="${TEXT_COLOR}" stroke="none" font-family="Helvetica, Arial, sans-serif">`,
    ...texts,
    '</g>',
    `<g id="unbsfont-marcas" fill="${MARK_COLOR}" stroke="none">`,
    ...markEls,
    '</g>',
    '<g id="desenho" fill="#000000">',
    ...ink.map(cmds => svgItem({ kind: 'ink', cmds })),
    '</g>',
    '</svg>',
  ].join('\n');
}

/* ------------------------------------------------------------ cores */

export function parseColor(value: string | undefined): [number, number, number] | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return [0, 1, 2].map(i => parseInt(m![1][i] + m![1][i], 16)) as [number, number, number];
  m = /^#([0-9a-f]{6})/.exec(v);
  if (m) return [0, 2, 4].map(i => parseInt(m![1].slice(i, i + 2), 16)) as [number, number, number];
  m = /^rgba?\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (v === 'black') return [0, 0, 0];
  return null;
}

/** Cor perto de uma das cores da cartela (tolerância para conversões de perfil de cor). */
export function isTemplateColor(value: string | undefined, colors = TEMPLATE_COLORS): boolean {
  const c = parseColor(value);
  if (!c) return false;
  return colors.some(t => {
    const r = parseColor(t)!;
    return Math.abs(c[0] - r[0]) <= 24 && Math.abs(c[1] - r[1]) <= 24 && Math.abs(c[2] - r[2]) <= 24;
  });
}

/** Peças da cartela no SVG: pula na leitura (não contam nem como traço solto). */
export function skipTemplateElement(_el: Element, style: { fill?: string; stroke?: string; tag?: string }): boolean {
  const tag = (style.tag || '').toLowerCase();
  if (tag.startsWith('unbsfont-guias') || tag.startsWith('unbsfont-descritor')) return true;
  const noFill = !style.fill || style.fill === 'none';
  return noFill && isTemplateColor(style.stroke, [GUIDE_COLOR]);
}

/* ------------------------------------------------------------ marcas */

interface Candidate { index: number; type: MarkType; x: number; y: number; size: number; colored: boolean }

/** Reconhece uma forma como marca de registro pelo desenho (vale mesmo que a cor tenha mudado). */
export function classifyMark(shape: SvgShape): { type: MarkType; x: number; y: number; size: number } | null {
  if (!shape.contours.length || shape.contours.length > 2) return null;
  const polys = shape.contours.map(c => flatten(c, 0.05));
  if (polys.some(p => p.length < 3)) return null;
  const boxes = polys.map(polyBox);
  const outerIdx = boxes.length === 2 && (boxes[1].x1 - boxes[1].x0) > (boxes[0].x1 - boxes[0].x0) ? 1 : 0;
  const b = boxes[outerIdx];
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  if (w <= 0 || h <= 0 || w / h < 0.8 || w / h > 1.25) return null;
  const ratio = Math.abs(signedArea(polys[outerIdx])) / (w * h);
  const x = (b.x0 + b.x1) / 2;
  const y = (b.y0 + b.y1) / 2;
  const size = (w + h) / 2;
  if (polys.length === 1) {
    if (ratio > 0.93) return { type: 'tr', x, y, size };
    if (ratio > 0.72 && ratio < 0.85) return { type: 'tl', x, y, size };
    if (ratio > 0.42 && ratio < 0.58) return { type: 'bl', x, y, size };
    return null;
  }
  const ib = boxes[1 - outerIdx];
  const iw = ib.x1 - ib.x0;
  const centered = Math.abs((ib.x0 + ib.x1) / 2 - x) < w * 0.08 && Math.abs((ib.y0 + ib.y1) / 2 - y) < h * 0.08;
  if (ratio > 0.72 && ratio < 0.85 && centered && iw / w > 0.3 && iw / w < 0.7) return { type: 'br', x, y, size };
  return null;
}

export interface MarkFit {
  /** De coordenadas do arquivo para as da cartela: X = s·x + tx, Y = s·y + ty. */
  s: number;
  tx: number;
  ty: number;
  /** Índices das formas que são marcas. */
  markShapes: Set<number>;
  found: number;
  expected: number;
  /** Erro médio, em pontos da cartela. */
  rms: number;
}

const firstBy = <T,>(xs: T[], score: (x: T) => number) => xs.reduce<T | undefined>((best, x) => (best === undefined || score(x) < score(best) ? x : best), undefined);

/**
 * Casa as marcas achadas com as esperadas: escala uniforme e translação (o
 * arquivo pode ter sido redimensionado ou movido). Testa pares de marcas de
 * cantos opostos, confere quantas das demais caem no lugar e refaz o ajuste
 * por mínimos quadrados com as que casaram.
 */
export function fitMarks(shapes: SvgShape[], expected: Mark[]): MarkFit | null {
  if (!expected.length) return null;
  let cands: Candidate[] = [];
  shapes.forEach((sh, index) => {
    const c = classifyMark(sh);
    if (c) cands.push({ index, ...c, colored: isTemplateColor(sh.fill, [MARK_COLOR]) });
  });
  if (cands.filter(c => c.colored).length >= 3) cands = cands.filter(c => c.colored);
  if (cands.length < 2) return null;

  const expSize = MARK_SIZE;
  const pairs: [Mark, Mark][] = [];
  const pick = (type: MarkType, score: (m: Mark) => number) => firstBy(expected.filter(m => m.type === type), score);
  const eTL = pick('tl', m => m.x + m.y);
  const eBR = pick('br', m => -(m.x + m.y));
  const eTR = pick('tr', m => m.y - m.x);
  const eBL = pick('bl', m => m.x - m.y);
  if (eTL && eBR) pairs.push([eTL, eBR]);
  if (eTR && eBL) pairs.push([eTR, eBL]);

  let best: MarkFit | null = null;
  for (const [ea, eb] of pairs) {
    const ca = cands.filter(c => c.type === ea.type).slice(0, 40);
    const cb = cands.filter(c => c.type === eb.type).slice(0, 40);
    for (const a of ca) for (const b of cb) {
      const fd = Math.hypot(b.x - a.x, b.y - a.y);
      const ed = Math.hypot(eb.x - ea.x, eb.y - ea.y);
      if (fd < 1e-9) continue;
      // Mesma direção (só escala e translação, sem giro).
      const cos = ((b.x - a.x) * (eb.x - ea.x) + (b.y - a.y) * (eb.y - ea.y)) / (fd * ed);
      if (cos < 0.999) continue;
      const s = ed / fd;
      const fit = refine(s, ea.x - s * a.x, ea.y - s * a.y, cands, expected, expSize);
      if (fit && (!best || fit.found > best.found || (fit.found === best.found && fit.rms < best.rms))) best = fit;
    }
  }
  if (!best) return null;
  const need = Math.max(3, Math.ceil(expected.length * 0.75));
  return best.found >= need ? best : null;
}

function refine(s0: number, tx0: number, ty0: number, cands: Candidate[], expected: Mark[], expSize: number): MarkFit | null {
  let s = s0, tx = tx0, ty = ty0;
  let matched: { e: Mark; c: Candidate }[] = [];
  for (let iter = 0; iter < 2; iter++) {
    const tol = Math.max(2, expSize * 0.4);
    const used = new Set<number>();
    matched = [];
    for (const e of expected) {
      let bestC: Candidate | undefined;
      let bestD = Infinity;
      for (const c of cands) {
        if (c.type !== e.type || used.has(c.index)) continue;
        const d = Math.hypot(s * c.x + tx - e.x, s * c.y + ty - e.y);
        const sizeOk = Math.abs(s * c.size - expSize) < expSize * 0.35;
        if (d < tol && sizeOk && d < bestD) { bestD = d; bestC = c; }
      }
      if (bestC) { used.add(bestC.index); matched.push({ e, c: bestC }); }
    }
    if (matched.length < 2) return null;
    // Mínimos quadrados: X = s·x + t.
    const n = matched.length;
    const fx = matched.reduce((a, m) => a + m.c.x, 0) / n;
    const fy = matched.reduce((a, m) => a + m.c.y, 0) / n;
    const ex = matched.reduce((a, m) => a + m.e.x, 0) / n;
    const ey = matched.reduce((a, m) => a + m.e.y, 0) / n;
    let num = 0, den = 0;
    for (const m of matched) {
      num += (m.c.x - fx) * (m.e.x - ex) + (m.c.y - fy) * (m.e.y - ey);
      den += (m.c.x - fx) ** 2 + (m.c.y - fy) ** 2;
    }
    if (den < 1e-12) return null;
    s = num / den;
    tx = ex - s * fx;
    ty = ey - s * fy;
  }
  // Ajuste que é praticamente a identidade vira identidade: o arquivo não foi mexido.
  if (Math.abs(s - 1) < 1e-6 && Math.abs(tx) < 1e-3 && Math.abs(ty) < 1e-3) { s = 1; tx = 0; ty = 0; }
  const rms = Math.sqrt(matched.reduce((a, m) => a + (s * m.c.x + tx - m.e.x) ** 2 + (s * m.c.y + ty - m.e.y) ** 2, 0) / matched.length);
  return { s, tx, ty, markShapes: new Set(matched.map(m => m.c.index)), found: matched.length, expected: expected.length, rms };
}

/* ------------------------------------------------------------ leitura */

export interface CartelaPageInput {
  shapes: SvgShape[];
  /** Página da cartela a que este pedaço corresponde (PDF), ou todas (SVG). */
  page?: number;
}

export interface CartelaResult {
  source: 'descritor' | 'marcas';
  spec: CartelaSpec;
  /** Um glifo por célula preenchida, em unidades da cartela. */
  glyphs: Glyph[];
  recognized: string[];
  empty: string[];
  outside: number;
  srcCap: number;
  /** Escala do arquivo em relação à cartela original (1 = sem mudança). */
  scale: number;
  /** A grade foi posta pela posição original porque as marcas não foram achadas. */
  noMarks: boolean;
}

/**
 * Leva as formas de cada página para o espaço da cartela, joga fora as peças do
 * modelo e distribui o resto pelas células. Devolve null quando não há cartela
 * reconhecível (nem descritor, nem marcas): aí o arquivo é uma folha livre.
 */
export function readCartela(
  pages: CartelaPageInput[],
  descriptor: CartelaSpec | null,
  fallback: (paper: Paper) => CartelaSpec,
  keep: Record<string, Glyph> = {},
): CartelaResult | null {
  const specs = descriptor ? [descriptor] : (['a4', 'letter'] as Paper[]).map(fallback);
  let chosen: { spec: CartelaSpec; fits: (MarkFit | null)[]; score: number } | null = null;
  for (const spec of specs) {
    const fits = pages.map(p => fitMarks(p.shapes, marks(spec, p.page)));
    const score = fits.reduce((a, f) => a + (f ? f.found - f.rms * 0.01 : 0), 0);
    if (fits.some(Boolean) && (!chosen || score > chosen.score)) chosen = { spec, fits, score };
  }
  let noMarks = false;
  if (!chosen) {
    if (!descriptor) return null;
    // Descritor sem marcas: a grade fica onde foi gerada.
    noMarks = true;
    chosen = { spec: descriptor, fits: pages.map(() => ({ s: 1, tx: 0, ty: 0, markShapes: new Set<number>(), found: 0, expected: 0, rms: 0 })), score: 0 };
  }
  const { spec, fits } = chosen;

  // Formas do desenho, já no espaço da cartela.
  const drawn: SvgShape[] = [];
  pages.forEach((p, i) => {
    const fit = fits[i];
    if (!fit) return;
    p.shapes.forEach((sh, index) => {
      if (fit.markShapes.has(index) || isTemplateColor(sh.fill)) return;
      const t = (x: number, y: number): [number, number] => [fit.s * x + fit.tx, fit.s * y + fit.ty];
      drawn.push({ ...sh, contours: sh.contours.map(c => mapCmds(c, t)) });
    });
  });
  const comps = shapesToComponents(drawn);
  const grid = cells(spec);
  const buckets = new Map<number, Component[]>();
  let outside = 0;
  for (const comp of comps) {
    const cell = cellFor(comp.box, grid);
    if (!cell) { outside++; continue; }
    const list = buckets.get(cell.index) ?? [];
    list.push(comp);
    buckets.set(cell.index, list);
  }

  const k = unitScale(spec);
  const srcCap = spec.metrics.cap * k;
  const glyphs: Glyph[] = [];
  const recognized: string[] = [];
  const empty: string[] = [];
  for (const cell of grid) {
    const list = buckets.get(cell.index);
    if (!list?.length) { empty.push(cell.char); continue; }
    const group: SheetGroup = { id: cell.index, components: list, box: list.map(c => c.box).reduce(unionBox), row: 0 };
    glyphs.push(newGlyph(cell.char, groupOutline(group, cell.baseline), srcCap, keep[cell.char]));
    recognized.push(cell.char);
  }
  const fitted = fits.find(Boolean);
  return {
    source: descriptor ? 'descritor' : 'marcas',
    spec,
    glyphs,
    recognized,
    empty,
    outside,
    srcCap,
    scale: fitted ? 1 / fitted.s : 1,
    noMarks,
  };
}

/** Célula do componente: a que contém o centro, ou, se ele cruza bordas, a de maior sobreposição. */
export function cellFor(box: Box, grid: Cell[]): Cell | null {
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  let best: Cell | null = null;
  let bestArea = 0;
  let home: Cell | null = null;
  for (const c of grid) {
    const ox = Math.min(box.x1, c.x + c.w) - Math.max(box.x0, c.x);
    const oy = Math.min(box.y1, c.y + c.h) - Math.max(box.y0, c.y);
    if (cx >= c.x && cx < c.x + c.w && cy >= c.y && cy < c.y + c.h) home = c;
    if (ox <= 0 || oy <= 0) continue;
    const area = ox * oy;
    if (area > bestArea) { bestArea = area; best = c; }
  }
  if (home && box.x0 >= home.x && box.x1 <= home.x + home.w && box.y0 >= home.y && box.y1 <= home.y + home.h) return home;
  return best ?? home;
}

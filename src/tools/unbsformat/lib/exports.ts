// Saídas em texto: valores para o InDesign e o Figma, e o SVG da grade.

import { columnCountOf, GridConfig, GridResult, referencePage } from './grid';
import { buildScene, Layers, SceneItem } from './scene';
import { fmt, mmToPt, mmToPx, round } from './units';

// ---------- InDesign ----------

export interface InDesignValues {
  /** Tudo em pt. */
  pageWidth: number;
  pageHeight: number;
  facingPages: boolean;
  margins: { top: number; bottom: number; inside: number; outside: number };
  columns: number;
  columnGutter: number;
  bleed: number;
  rows: number;
  rowGutter: number;
  /** Grade de linha de base: início relativo à margem superior. */
  baseline: { start: number; increment: number; relativeTo: 'margem superior' } | null;
  hasUnequalColumns: boolean;
}

export function indesignValues(c: GridConfig, r: GridResult): InDesignValues {
  const pt = (v: number) => round(mmToPt(v), 3);
  return {
    pageWidth: pt(c.fold === 'none' ? c.width : r.width),
    pageHeight: pt(c.height),
    facingPages: c.facing && c.fold === 'none',
    margins: { top: pt(c.margins.top), bottom: pt(c.margins.bottom), inside: pt(c.margins.inside), outside: pt(c.margins.outside) },
    columns: columnCountOf(c),
    columnGutter: pt(r.columnGutter),
    bleed: pt(c.bleed),
    rows: Math.max(1, Math.round(c.rows)),
    rowGutter: pt(r.rowGutter),
    baseline: c.baseline.enabled
      ? { start: pt(((c.baseline.offset % c.baseline.leading) + c.baseline.leading) % c.baseline.leading), increment: pt(c.baseline.leading), relativeTo: 'margem superior' }
      : null,
    hasUnequalColumns: !!(c.columnRatios && c.columnRatios.length),
  };
}

export function indesignText(c: GridConfig, r: GridResult): string {
  const v = indesignValues(c, r);
  const p = (n: number) => `${fmt(n, 3)} pt`;
  const lines = [
    `Documento: ${p(v.pageWidth)} × ${p(v.pageHeight)}${v.facingPages ? ', páginas espelhadas' : ''}${c.fold !== 'none' ? ' (folha aberta)' : ''}`,
    `Margens: superior ${p(v.margins.top)} · inferior ${p(v.margins.bottom)} · ${v.facingPages ? 'interna' : 'esquerda'} ${p(v.margins.inside)} · ${v.facingPages ? 'externa' : 'direita'} ${p(v.margins.outside)}`,
    `Colunas: ${v.columns} · medianiz ${p(v.columnGutter)}${v.hasUnequalColumns ? ' (larguras diferentes: arraste as guias depois)' : ''}`,
    `Sangria: ${p(v.bleed)} em todos os lados`,
    `Layout > Criar guias: ${v.rows} linhas, medianiz ${p(v.rowGutter)}; ${v.columns} colunas, medianiz ${p(v.columnGutter)}; ajustar às margens`,
  ];
  if (v.baseline) {
    lines.push(`Grade de linha de base: início ${p(v.baseline.start)}, relativo à ${v.baseline.relativeTo}, incremento ${p(v.baseline.increment)}`);
    lines.push(`Texto: entrelinha ${p(v.baseline.increment)}, alinhar à grade de linha de base`);
  }
  if (!r.closes) lines.push(`Atenção: a grade não fecha, sobram ${fmt(mmToPt(r.leftover), 3)} pt no pé da mancha.`);
  return lines.join('\n');
}

// ---------- Figma ----------

export interface FigmaGrid {
  pattern: 'COLUMNS' | 'ROWS';
  alignment: 'STRETCH' | 'MIN';
  count: number;
  gutterSize: number;
  offset: number;
  sectionSize?: number;
}

export interface FigmaValues {
  /** Fator mm → unidade do Figma. Impresso usa 1 pt = 1 px (A4 = 595 × 842, como o preset do Figma). */
  scaleNote: string;
  frame: { width: number; height: number };
  grids: FigmaGrid[];
}

export function figmaValues(c: GridConfig, r: GridResult): FigmaValues {
  const toFig = (mm: number) => round(c.docUnit === 'px' ? mmToPx(mm) : mmToPt(mm), 2);
  const p = referencePage(r);
  const left = p.margins.left;
  const right = p.margins.right;
  const grids: FigmaGrid[] = [];
  const cols = p.columns.length;
  if (cols > 0) {
    grids.push(
      Math.abs(left - right) < 0.001
        ? { pattern: 'COLUMNS', alignment: 'STRETCH', count: cols, gutterSize: toFig(r.columnGutter), offset: toFig(left) }
        : { pattern: 'COLUMNS', alignment: 'MIN', count: cols, gutterSize: toFig(r.columnGutter), offset: toFig(left), sectionSize: toFig(p.columns[0].w) },
    );
  }
  if (p.rows.length > 0) {
    grids.push(
      Math.abs(p.margins.top - p.margins.bottom) < 0.001 && r.closes
        ? { pattern: 'ROWS', alignment: 'STRETCH', count: p.rows.length, gutterSize: toFig(r.rowGutter), offset: toFig(p.margins.top) }
        : { pattern: 'ROWS', alignment: 'MIN', count: p.rows.length, gutterSize: toFig(r.rowGutter), offset: toFig(p.margins.top), sectionSize: toFig(r.rowHeight) },
    );
  }
  if (c.baseline.enabled && r.baselines.length > 0) {
    // Linha de base como linhas de 1 unidade de altura: o truque usual no Figma.
    const inc = toFig(c.baseline.leading);
    grids.push({ pattern: 'ROWS', alignment: 'MIN', count: r.baselines.length, gutterSize: round(inc - 1, 2), offset: round(toFig(r.baselines[0]) - 1, 2), sectionSize: 1 });
  }
  return {
    scaleNote: c.docUnit === 'px' ? 'Valores em px.' : 'Documento impresso: 1 pt = 1 px no Figma.',
    frame: { width: toFig(p.trim.w), height: toFig(c.height) },
    grids,
  };
}

export function figmaText(c: GridConfig, r: GridResult): string {
  const v = figmaValues(c, r);
  const n = (x: number) => fmt(x, 2);
  const out = [`Frame: ${n(v.frame.width)} × ${n(v.frame.height)} (${v.scaleNote})`];
  v.grids.forEach((g, i) => {
    const isBaseline = i === v.grids.length - 1 && g.sectionSize === 1;
    const name = isBaseline ? 'Linha de base (Rows)' : g.pattern === 'COLUMNS' ? 'Columns' : 'Rows';
    const align = g.alignment === 'STRETCH' ? 'Stretch' : g.pattern === 'COLUMNS' ? 'Left' : 'Top';
    const parts = [`count ${g.count}`, `type ${align}`];
    if (g.sectionSize !== undefined) parts.push(`${g.pattern === 'COLUMNS' ? 'width' : 'height'} ${n(g.sectionSize)}`);
    parts.push(`${g.alignment === 'STRETCH' ? 'margin' : 'offset'} ${n(g.offset)}`, `gutter ${n(g.gutterSize)}`);
    out.push(`${name}: ${parts.join(' · ')}`);
  });
  return out.join('\n');
}

// ---------- SVG ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v: number) => String(round(v, 4));

/** Espessura de saída: pt → mm. */
const w = (pt = 0.5) => n((pt * 25.4) / 72);

function itemToSvg(it: SceneItem): string {
  if (it.type === 'rect') {
    const attrs = [
      `x="${n(it.x)}" y="${n(it.y)}" width="${n(Math.max(0, it.w))}" height="${n(Math.max(0, it.h))}"`,
      it.fill ? `fill="${it.fill}"` : 'fill="none"',
      it.fill && it.fillOpacity !== undefined ? `fill-opacity="${it.fillOpacity}"` : '',
      it.stroke ? `stroke="${it.stroke}" stroke-width="${w(it.weight)}"` : '',
      it.dash ? `stroke-dasharray="${it.dash.map(d => w(d)).join(' ')}"` : '',
    ];
    return `<rect ${attrs.filter(Boolean).join(' ')}/>`;
  }
  const attrs = [
    `x1="${n(it.x1)}" y1="${n(it.y1)}" x2="${n(it.x2)}" y2="${n(it.y2)}"`,
    `stroke="${it.stroke}" stroke-width="${w(it.weight)}"`,
    it.dash ? `stroke-dasharray="${it.dash.map(d => w(d)).join(' ')}"` : '',
    it.opacity !== undefined ? `stroke-opacity="${it.opacity}"` : '',
  ];
  return `<line ${attrs.filter(Boolean).join(' ')}/>`;
}

/** SVG em escala real (width/height em mm), uma camada <g> por grupo de guias. */
export function buildGridSvg(c: GridConfig, r: GridResult, layers: Layers): string {
  const items = buildScene(c, r, { ...layers, cotas: false });
  const bb = r.bleedBox;
  const groups = new Map<string, string[]>();
  items.forEach(it => {
    const list = groups.get(it.layer) ?? [];
    list.push(itemToSvg(it));
    groups.set(it.layer, list);
  });
  const body = [...groups.entries()]
    .map(([layer, els]) => `  <g id="${esc(layer)}">\n    ${els.join('\n    ')}\n  </g>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(bb.w)}mm" height="${n(bb.h)}mm" viewBox="${n(bb.x)} ${n(bb.y)} ${n(bb.w)} ${n(bb.h)}">`,
    `  <title>${esc(`${c.formatName}: grade ${columnCountOf(c)} × ${c.rows}`)}</title>`,
    `  <clipPath id="folha"><rect x="${n(bb.x)}" y="${n(bb.y)}" width="${n(bb.w)}" height="${n(bb.h)}"/></clipPath>`,
    `  <rect x="${n(bb.x)}" y="${n(bb.y)}" width="${n(bb.w)}" height="${n(bb.h)}" fill="#FFFFFF"/>`,
    `<g clip-path="url(#folha)">`,
    body,
    '</g>',
    '</svg>',
    '',
  ].join('\n');
}

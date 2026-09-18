// Motor da grade. Puro, sem DOM, tudo em milímetros.
//
// Coordenadas: origem no canto superior esquerdo do corte da folha (ou do
// espelho, quando há páginas espelhadas). A sangria fica em coordenadas negativas
// e além da largura. y cresce para baixo, como no SVG.
//
// Linhas reais: com a linha de base ligada, a altura de cada campo é um número
// inteiro de entrelinhas e a medianiz vertical também. O que não cabe vira sobra,
// medida e exibida; `closeGrid` resolve as margens para a sobra ser zero.

import type { FoldType, Sides } from './formats';
import { mmToPx, pxToMm } from './units';

export type MethodId =
  | 'livre'
  | 'vandegraaf'
  | 'villard'
  | 'tschichold'
  | 'rosarivo9'
  | 'rosarivo12'
  | 'aurea'
  | 'mullerbrockmann'
  | 'gerstner'
  | 'samara_manuscrito'
  | 'samara_colunas'
  | 'samara_modular'
  | 'samara_hierarquico'
  | 'digital12'
  | 'material'
  | 'oitopt';

export interface Margins {
  top: number;
  bottom: number;
  /** Lado da lombada (ou da dobra). */
  inside: number;
  /** Lado do corte livre. */
  outside: number;
}

export interface BaselineConfig {
  enabled: boolean;
  /** Entrelinha, em mm. */
  leading: number;
  /** Deslocamento da primeira linha de base a partir da margem superior, em mm (0 ≤ offset < leading). */
  offset: number;
  /** Medianiz entre linhas de campos, em entrelinhas. */
  rowGutterLines: number;
  /** Medianiz entre colunas em entrelinhas; 0 = usa `columnGutter` em mm. */
  columnGutterLines: number;
}

export interface GridConfig {
  version: 2;
  formatId: string;
  formatName: string;
  /** Unidade nativa do documento: mm para impresso, px para tela. */
  docUnit: 'mm' | 'px';
  /** Formato final (corte), já na orientação escolhida. */
  width: number;
  height: number;
  bleed: number;
  safe: Sides;
  margins: Margins;
  facing: boolean;
  fold: FoldType;
  /** Quanto o painel que entra por dentro é mais estreito (dobra carteira e janela). */
  foldTuck: number;
  foldSide: 'inside' | 'outside';
  columns: number;
  columnGutter: number;
  /** Proporções das colunas (grade hierárquica). null = colunas iguais. */
  columnRatios: number[] | null;
  rows: number;
  rowGutter: number;
  baseline: BaselineConfig;
  /** Corpo do texto, em mm, para estimar a medida. */
  fontSize: number;
  method: MethodId;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Module extends Rect {
  row: number;
  col: number;
}

export type PageSide = 'single' | 'verso' | 'recto' | 'panel';

export interface PageLayout {
  index: number;
  side: PageSide;
  trim: Rect;
  /** Margens resolvidas para esquerda e direita desta página. */
  margins: { top: number; bottom: number; left: number; right: number };
  textBlock: Rect;
  safe: Rect;
  columns: Rect[];
  rows: Rect[];
  modules: Module[];
  columnGutters: Rect[];
  rowGutters: Rect[];
  /** Faixa não usada no pé da mancha quando a grade não fecha. */
  leftover: Rect | null;
}

export interface LineStats {
  /** Linhas que cabem na mancha. */
  available: number;
  /** Linhas por campo. */
  perRow: number;
  /** Linhas ocupadas por campos e medianizes. */
  used: number;
}

export interface GridResult {
  width: number;
  height: number;
  bleed: number;
  bleedBox: Rect;
  pages: PageLayout[];
  /** Posições x das dobras (e da lombada, no espelho). */
  folds: number[];
  /** Posições y das linhas de base, iguais em todas as páginas. */
  baselines: number[];
  lines: LineStats | null;
  columnGutter: number;
  rowGutter: number;
  rowHeight: number;
  /** Sobra vertical em mm (0 quando fecha). */
  leftover: number;
  closes: boolean;
  warnings: string[];
}

export const EPS = 1e-6;
/** Tolerância para dizer que a grade fecha: um centésimo de milímetro. */
export const CLOSE_TOLERANCE = 0.01;
/** Largura média de um caractere de texto corrido, em em (aproximação de copyfitting). */
export const CHAR_EM = 0.5;

const clampInt = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v)));

/** Larguras dos painéis de um folheto aberto. */
export function foldPanels(width: number, fold: FoldType, tuck = 0, side: 'inside' | 'outside' = 'inside'): number[] {
  switch (fold) {
    case 'half':
      return [width / 2, width / 2];
    case 'z':
      return [width / 3, width / 3, width / 3];
    case 'roll': {
      // Carteira: dois painéis cheios e o que entra por dentro, mais estreito.
      // Por dentro ele fica à direita; no verso, à esquerda.
      const full = (width + tuck) / 3;
      const inner = full - tuck;
      return side === 'inside' ? [full, full, inner] : [inner, full, full];
    }
    case 'gate': {
      // Janela: as duas abas encontram-se no meio, cada uma um pouco mais estreita.
      const flap = width / 4 - tuck / 2;
      return [flap, width / 2 + tuck, flap];
    }
    default:
      return [width];
  }
}

export const columnGutterOf = (c: GridConfig) =>
  c.baseline.enabled && c.baseline.columnGutterLines > 0
    ? c.baseline.columnGutterLines * c.baseline.leading
    : Math.max(0, c.columnGutter);

export const rowGutterOf = (c: GridConfig) =>
  c.baseline.enabled ? Math.max(0, Math.round(c.baseline.rowGutterLines)) * c.baseline.leading : Math.max(0, c.rowGutter);

export const columnCountOf = (c: GridConfig) =>
  c.columnRatios && c.columnRatios.length > 0 ? c.columnRatios.length : clampInt(c.columns, 1, 48);

/** Divide `available` em larguras proporcionais (iguais sem proporções). */
export function splitWidths(available: number, count: number, ratios: number[] | null): number[] {
  if (ratios && ratios.length > 0) {
    const sum = ratios.reduce((a, b) => a + b, 0);
    return ratios.map(r => (available * r) / sum);
  }
  return Array.from({ length: count }, () => available / count);
}

/** Quantas linhas por campo cabem, dadas as linhas disponíveis. */
export function linesPerRow(available: number, rows: number, gutterLines: number): number {
  return Math.floor((available - (rows - 1) * gutterLines) / rows);
}

interface PageFrame {
  x: number;
  w: number;
  side: PageSide;
  leftIsInside: boolean;
  rightIsInside: boolean;
}

function pageFrames(c: GridConfig): { frames: PageFrame[]; folds: number[]; totalWidth: number } {
  if (c.fold !== 'none') {
    const widths = foldPanels(c.width, c.fold, c.foldTuck, c.foldSide);
    const frames: PageFrame[] = [];
    const folds: number[] = [];
    let x = 0;
    widths.forEach((w, i) => {
      frames.push({ x, w, side: 'panel', leftIsInside: i > 0, rightIsInside: i < widths.length - 1 });
      x += w;
      if (i < widths.length - 1) folds.push(x);
    });
    return { frames, folds, totalWidth: c.width };
  }
  if (c.facing) {
    return {
      frames: [
        { x: 0, w: c.width, side: 'verso', leftIsInside: false, rightIsInside: true },
        { x: c.width, w: c.width, side: 'recto', leftIsInside: true, rightIsInside: false },
      ],
      folds: [c.width],
      totalWidth: c.width * 2,
    };
  }
  // Página avulsa é tratada como recto: lombada à esquerda.
  return {
    frames: [{ x: 0, w: c.width, side: 'single', leftIsInside: true, rightIsInside: false }],
    folds: [],
    totalWidth: c.width,
  };
}

export function computeGrid(c: GridConfig): GridResult {
  const warnings: string[] = [];
  const H = c.height;
  const { frames, folds, totalWidth } = pageFrames(c);
  const cols = columnCountOf(c);
  const rows = clampInt(c.rows, 1, 48);
  const gx = columnGutterOf(c);
  const L = c.baseline.leading;
  const useBaseline = c.baseline.enabled && L > EPS;

  const top = c.margins.top;
  const bottom = c.margins.bottom;
  const textH = H - top - bottom;

  // Linhas verticais: iguais em todas as páginas, porque todas têm a mesma altura.
  let lines: LineStats | null = null;
  let rowH: number;
  let gy: number;
  let usedH: number;

  if (useBaseline) {
    const gLines = Math.max(0, Math.round(c.baseline.rowGutterLines));
    const available = Math.floor(textH / L + EPS);
    let perRow = linesPerRow(available, rows, gLines);
    if (perRow < 1) {
      warnings.push(`Não cabem ${rows} linhas de campos com essa entrelinha: são ${Math.max(0, available)} linhas na mancha.`);
      perRow = 0;
    }
    gy = gLines * L;
    rowH = perRow * L;
    const used = perRow > 0 ? rows * perRow + (rows - 1) * gLines : 0;
    usedH = used * L;
    lines = { available: Math.max(0, available), perRow, used };
  } else {
    gy = Math.max(0, c.rowGutter);
    rowH = (textH - (rows - 1) * gy) / rows;
    usedH = textH;
  }

  const leftover = Math.max(0, textH - usedH);
  const closes = textH > 0 && rowH > 0 && leftover < CLOSE_TOLERANCE;
  if (useBaseline && rowH > 0 && !closes) {
    warnings.push('A grade não fecha na linha de base: sobra espaço no pé da mancha.');
  }
  if (textH <= 0) warnings.push('As margens superior e inferior somam mais que a altura do formato.');

  // Linhas de base, a partir da margem superior.
  const baselines: number[] = [];
  if (useBaseline && textH > 0) {
    const offset = ((c.baseline.offset % L) + L) % L;
    for (let y = top + offset + L; y <= top + textH + EPS && baselines.length < 5000; y += L) {
      baselines.push(y);
    }
  }

  const pages: PageLayout[] = frames.map((f, index) => {
    const left = f.leftIsInside ? c.margins.inside : c.margins.outside;
    const right = f.rightIsInside ? c.margins.inside : c.margins.outside;
    const trim: Rect = { x: f.x, y: 0, w: f.w, h: H };
    const textW = f.w - left - right;
    const textBlock: Rect = { x: f.x + left, y: top, w: Math.max(0, textW), h: Math.max(0, textH) };
    const safe: Rect = {
      x: f.x + c.safe.left,
      y: c.safe.top,
      w: Math.max(0, f.w - c.safe.left - c.safe.right),
      h: Math.max(0, H - c.safe.top - c.safe.bottom),
    };

    const columns: Rect[] = [];
    const columnGutters: Rect[] = [];
    const rowsR: Rect[] = [];
    const rowGutters: Rect[] = [];
    const modules: Module[] = [];

    const availW = textW - (cols - 1) * gx;
    if (textW > 0 && textH > 0 && availW > 0) {
      const widths = splitWidths(availW, cols, c.columnRatios);
      let x = textBlock.x;
      widths.forEach((w, i) => {
        columns.push({ x, y: top, w, h: textH });
        x += w;
        if (i < widths.length - 1) {
          columnGutters.push({ x, y: top, w: gx, h: textH });
          x += gx;
        }
      });

      if (rowH > 0) {
        let y = top;
        for (let r = 0; r < rows; r++) {
          rowsR.push({ x: textBlock.x, y, w: textW, h: rowH });
          columns.forEach((col, ci) => modules.push({ x: col.x, y, w: col.w, h: rowH, row: r, col: ci }));
          y += rowH;
          if (r < rows - 1) {
            rowGutters.push({ x: textBlock.x, y, w: textW, h: gy });
            y += gy;
          }
        }
      }
    }

    return {
      index,
      side: f.side,
      trim,
      margins: { top, bottom, left, right },
      textBlock,
      safe,
      columns,
      rows: rowsR,
      modules,
      columnGutters,
      rowGutters,
      leftover: leftover >= CLOSE_TOLERANCE && textW > 0 ? { x: textBlock.x, y: top + usedH, w: textW, h: leftover } : null,
    };
  });

  const ref = pages[pages.length - 1];
  if (ref.textBlock.w <= 0) warnings.push('As margens laterais somam mais que a largura da página.');
  else if (ref.textBlock.w - (cols - 1) * gx <= 0) warnings.push('As medianizes ocupam a mancha inteira: reduza colunas ou medianiz.');

  // Mancha fora da área de segurança.
  const invaded: string[] = [];
  if (top < c.safe.top - EPS) invaded.push('topo');
  if (bottom < c.safe.bottom - EPS) invaded.push('pé');
  if (pages.some(p => p.margins.left < c.safe.left - EPS)) invaded.push('esquerda');
  if (pages.some(p => p.margins.right < c.safe.right - EPS)) invaded.push('direita');
  if (invaded.length) warnings.push(`A mancha invade a área de segurança (${invaded.join(', ')}).`);

  const b = c.bleed;
  return {
    width: totalWidth,
    height: H,
    bleed: b,
    bleedBox: { x: -b, y: -b, w: totalWidth + 2 * b, h: H + 2 * b },
    pages,
    folds,
    baselines,
    lines,
    columnGutter: gx,
    rowGutter: gy,
    rowHeight: rowH,
    leftover,
    closes,
    warnings,
  };
}

/** A página de referência para diagnóstico: a da direita (recto), ou a única. */
export const referencePage = (r: GridResult) => r.pages[r.pages.length - 1];

// ---------- Diagnóstico ----------

export interface Diagnostics {
  textBlock: { w: number; h: number };
  module: { w: number; h: number } | null;
  moduleRatio: number | null;
  columnWidth: number;
  /** Caracteres por linha estimados na largura de uma coluna. */
  measure: number;
  /** Caracteres por linha na largura da mancha inteira. */
  measureFull: number;
  measureVerdict: 'curta' | 'boa' | 'longa';
  /** Área da mancha sobre a área da página, em %. */
  coverage: number;
  /** Mancha e página têm a mesma proporção (tolerância de 0,5%). */
  sameProportion: boolean;
  /** Colunas com largura inteira em px (só faz sentido em documento de tela). */
  integerPx: boolean;
}

export const charsPerLine = (widthMm: number, fontSizeMm: number) =>
  fontSizeMm > 0 ? widthMm / (fontSizeMm * CHAR_EM) : 0;

export function diagnose(c: GridConfig, r: GridResult): Diagnostics {
  const p = referencePage(r);
  const colW = p.columns[0]?.w ?? 0;
  const mod = p.modules[0] ? { w: p.modules[0].w, h: p.modules[0].h } : null;
  const measure = charsPerLine(colW, c.fontSize);
  const measureVerdict = measure < 45 ? 'curta' : measure > 75 ? 'longa' : 'boa';
  const tb = p.textBlock;
  const pageRatio = p.trim.h / p.trim.w;
  const tbRatio = tb.w > 0 ? tb.h / tb.w : 0;
  const integerPx = p.columns.length > 0 && p.columns.every(col => Math.abs(mmToPx(col.w) - Math.round(mmToPx(col.w))) < 0.01);
  return {
    textBlock: { w: tb.w, h: tb.h },
    module: mod,
    moduleRatio: mod && mod.w > 0 ? mod.h / mod.w : null,
    columnWidth: colW,
    measure,
    measureFull: charsPerLine(tb.w, c.fontSize),
    measureVerdict,
    coverage: p.trim.w > 0 ? ((tb.w * tb.h) / (p.trim.w * p.trim.h)) * 100 : 0,
    sameProportion: tb.w > 0 && Math.abs(tbRatio - pageRatio) / pageRatio < 0.005,
    integerPx,
  };
}

// ---------- Fechar a grade ----------

export interface CloseResult {
  config: GridConfig;
  /** Mudança em mm aplicada a cada margem. */
  delta: Margins;
  closed: boolean;
  message: string;
}

/**
 * Ajusta as margens para a grade fechar exatamente:
 * - na vertical, com linha de base ligada, a mancha passa a ter exatamente
 *   `linhas × entrelinha`, escolhendo entre tirar ou pôr uma linha por campo a
 *   opção que mexe menos, e repartindo a diferença entre topo e pé na proporção
 *   que eles já tinham;
 * - na horizontal, em documento de tela, as colunas ficam com largura inteira
 *   em px e a diferença vai para as margens laterais, meio a meio.
 */
export function closeGrid(c: GridConfig, opts: { horizontal?: boolean } = {}): CloseResult {
  const next: GridConfig = { ...c, margins: { ...c.margins }, baseline: { ...c.baseline } };
  const delta: Margins = { top: 0, bottom: 0, inside: 0, outside: 0 };
  const notes: string[] = [];
  const L = c.baseline.leading;

  if (c.baseline.enabled && L > EPS) {
    const rows = clampInt(c.rows, 1, 48);
    const g = Math.max(0, Math.round(c.baseline.rowGutterLines));
    const textH = c.height - c.margins.top - c.margins.bottom;
    const available = Math.floor(textH / L + EPS);
    const n = Math.max(1, linesPerRow(available, rows, g));
    const candidates = [n, n + 1]
      .map(per => ({ per, h: (rows * per + (rows - 1) * g) * L }))
      .map(o => ({ ...o, change: textH - o.h }))
      // a mudança vem das margens: elas precisam continuar positivas
      .filter(o => c.margins.top + c.margins.bottom + o.change > 0);
    candidates.sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
    const pick = candidates[0];
    if (pick) {
      const sum = c.margins.top + c.margins.bottom;
      const shareTop = sum > EPS ? c.margins.top / sum : 0.5;
      delta.top = pick.change * shareTop;
      delta.bottom = pick.change - delta.top;
      next.margins.top = c.margins.top + delta.top;
      next.margins.bottom = c.margins.bottom + delta.bottom;
      notes.push(`${pick.per} linhas por campo`);
    }
  }

  if (opts.horizontal !== false && c.docUnit === 'px' && !(c.columnRatios && c.columnRatios.length)) {
    const cols = columnCountOf(c);
    const gx = columnGutterOf(c);
    // página de referência: página avulsa ou recto
    const pageW = c.fold === 'none' ? c.width : Math.max(...foldPanels(c.width, c.fold, c.foldTuck, c.foldSide));
    const availPx = mmToPx(pageW - c.margins.inside - c.margins.outside - (cols - 1) * gx);
    const colPx = Math.floor(availPx / cols + EPS);
    if (colPx > 0) {
      const extraPx = availPx - colPx * cols;
      if (extraPx > 0.001) {
        const half = Math.floor(extraPx / 2);
        delta.inside = pxToMm(half);
        delta.outside = pxToMm(extraPx - half);
        next.margins.inside = c.margins.inside + delta.inside;
        next.margins.outside = c.margins.outside + delta.outside;
      }
      notes.push(`colunas de ${colPx} px`);
    }
  }

  const closed = computeGrid(next).closes;
  return {
    config: next,
    delta,
    closed,
    message: notes.length ? `Grade fechada: ${notes.join(', ')}.` : 'Nada a ajustar.',
  };
}

// ---------- Contagem de folhas ----------

/** Lombada de brochura: páginas / 2 × espessura do papel (µm), mais a capa. */
export function spineWidth(pages: number, paperMicrons: number, coverMicrons = 0): number {
  if (!(pages > 0) || !(paperMicrons > 0)) return 0;
  const leaves = Math.ceil(pages / 2);
  return (leaves * paperMicrons + 2 * Math.max(0, coverMicrons)) / 1000;
}

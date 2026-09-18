/**
 * Clearspace (área de respiro) the way a brand manual states it.
 *
 * The tool used to have a single number + an abstract unit ("logomark", "px",
 * "cm", "in"). A manual never says "1 logomark": it says "the clearspace
 * equals the height of the X in the wordmark", and that rule has to survive
 * being printed at 40mm or shown at 320px.
 *
 * So this module does three things:
 *
 * 1. MEASURES reference units on the artwork itself (symbol height, cap
 *    height, x-height, stem width, half the symbol). The ink measurement
 *    reuses `lib/metrics.ts` (`paperToShapes`, `shapesBounds`,
 *    `transposeShapes`) in read-only fashion; the scanline profile / run
 *    lengths that cap-height, x-height and stem width need are computed here
 *    because metrics only exposes aggregates.
 * 2. RESOLVES a per-side clearspace (with an optional "all sides equal" lock)
 *    into drawing units, and converts it to millimetres and pixels for a
 *    given print or screen size. Conversions go through one exact table
 *    (25.4mm/in, 72pt/in) so a value never drifts between panels.
 * 3. WRITES the rule in Portuguese, ready to paste into the manual.
 *
 * Everything here is pure (no DOM, no React) except `measureReferenceUnits`,
 * which imports the SVG with paper.js; that one is memoized by SVG content.
 */
import paper from 'paper';
import { sanitizeSVG } from './svg-sanitize';
import { hashKey, LRUCache } from './memo';
import { activeT, activeLocale } from '../i18n/runtime';
import { fill, type FillVars } from '../i18n/format';
import type { Translations } from '../i18n/types';

type ClearspaceKey = keyof Translations['clearspace'];
/** A clearspace message in the active language. */
const tr = (key: ClearspaceKey, vars?: FillVars): string => fill(activeT().clearspace[key], vars);
import {
  paperToShapes, shapesBounds, transposeShapes,
  type Box, type FillShape, type StrokeShape,
} from './metrics';

export type { Box } from './metrics';

// ---------------------------------------------------------------------------
// Exact unit conversions
// ---------------------------------------------------------------------------

/** Millimetres in one inch (exact, by definition of the inch). */
export const MM_PER_INCH = 25.4;
/** PostScript points in one inch (exact, by definition of the point). */
export const PT_PER_INCH = 72;
/** Points per millimetre (72 / 25.4). */
export const PT_PER_MM = PT_PER_INCH / MM_PER_INCH;
/** CSS reference pixel density: 96 px = 1 in. */
export const DEFAULT_SCREEN_DPI = 96;
/** Typical print raster for a final PDF. */
export const DEFAULT_PRINT_DPI = 300;

export function mmToIn(mm: number): number { return mm / MM_PER_INCH; }
export function inToMm(inches: number): number { return inches * MM_PER_INCH; }
export function mmToPt(mm: number): number { return (mm / MM_PER_INCH) * PT_PER_INCH; }
export function ptToMm(pt: number): number { return (pt / PT_PER_INCH) * MM_PER_INCH; }
export function mmToPx(mm: number, dpi: number = DEFAULT_SCREEN_DPI): number {
  return (mm / MM_PER_INCH) * (dpi > 0 ? dpi : DEFAULT_SCREEN_DPI);
}
export function pxToMm(px: number, dpi: number = DEFAULT_SCREEN_DPI): number {
  return (px / (dpi > 0 ? dpi : DEFAULT_SCREEN_DPI)) * MM_PER_INCH;
}

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------

const finite = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

type Interval = [number, number];

function mergeIntervals(list: Interval[]): Interval[] {
  if (list.length < 2) return list;
  list.sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [[list[0][0], list[0][1]]];
  for (let i = 1; i < list.length; i++) {
    const last = out[out.length - 1];
    const cur = list[i];
    if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
    else out.push([cur[0], cur[1]]);
  }
  return out;
}

/**
 * Percentile of a list of lengths WEIGHTED BY THE LENGTH ITSELF, i.e. "the run
 * length seen by a random point of ink".
 *
 * Why weighted: a plain percentile of raw run lengths is dominated by the
 * degenerate slivers at the top and bottom of every round shape (the first
 * scanline of a disc is a 0.5-unit run), which would report a solid circle as
 * having a hairline stem. Weighting by length makes those slivers count for
 * (almost) nothing, which matches how a reader perceives "the thin part".
 */
export function weightedPercentile(values: number[], p: number): number {
  const v = values.filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  let total = 0;
  for (const x of v) total += x;
  const target = total * clamp(p, 0, 1);
  let acc = 0;
  for (const x of v) {
    acc += x;
    if (acc >= target) return x;
  }
  return v[v.length - 1];
}

// ---------------------------------------------------------------------------
// Ink scanning (runs and gaps per scanline)
// ---------------------------------------------------------------------------

interface Edge { x0: number; y0: number; x1: number; y1: number; dir: 1 | -1; shape: number }

function buildEdges(fills: FillShape[]): Edge[] {
  const edges: Edge[] = [];
  fills.forEach((shape, si) => {
    for (const ring of shape.rings) {
      const n = ring.length;
      if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        if (![a.x, a.y, b.x, b.y].every(Number.isFinite) || a.y === b.y) continue;
        edges.push(a.y < b.y
          ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y, dir: 1, shape: si }
          : { x0: b.x, y0: b.y, x1: a.x, y1: a.y, dir: -1, shape: si });
      }
    }
  });
  return edges;
}

/** Ink intervals of one horizontal scanline, merged across shapes and clipped to [x0, x1]. */
function scanlineRuns(edges: Edge[], fills: FillShape[], y: number, x0: number, x1: number): Interval[] {
  const perShape = new Map<number, Array<{ x: number; dir: number }>>();
  for (const e of edges) {
    if (e.y0 > y || e.y1 <= y) continue;
    const x = e.x0 + ((y - e.y0) * (e.x1 - e.x0)) / (e.y1 - e.y0);
    let arr = perShape.get(e.shape);
    if (!arr) perShape.set(e.shape, (arr = []));
    arr.push({ x, dir: e.dir });
  }
  const intervals: Interval[] = [];
  perShape.forEach((crossings, si) => {
    crossings.sort((a, b) => a.x - b.x);
    const evenodd = fills[si].rule === 'evenodd';
    let wind = 0;
    let start = 0;
    for (const c of crossings) {
      const wasInside = evenodd ? (wind & 1) === 1 : wind !== 0;
      wind += evenodd ? 1 : c.dir;
      const isInside = evenodd ? (wind & 1) === 1 : wind !== 0;
      if (!wasInside && isInside) start = c.x;
      else if (wasInside && !isInside && c.x > start) intervals.push([start, c.x]);
    }
  });
  const merged = mergeIntervals(intervals);
  const out: Interval[] = [];
  for (const [a, b] of merged) {
    const lo = Math.max(a, x0);
    const hi = Math.min(b, x1);
    if (hi > lo) out.push([lo, hi]);
  }
  return out;
}

export interface AxisScan {
  /** Ink length on each sample line, ordered along the scanned axis. */
  coverage: number[];
  /** Position (centre) of each sample line. */
  positions: number[];
  /** Distance between two sample lines. */
  step: number;
  /** Every ink run length found on every line. */
  runs: number[];
  /** Every gap between two consecutive runs of the same line (counters, letter gaps). */
  gaps: number[];
}

/**
 * Sample `samples` horizontal lines across `box` and collect, per line, the
 * covered length, the individual run lengths and the gaps between runs.
 * Scan columns by transposing the shapes and the box first.
 */
export function scanFills(fills: FillShape[], box: Box, samples = 256): AxisScan {
  const n = Math.max(8, Math.min(4096, Math.round(samples)));
  const empty: AxisScan = { coverage: [], positions: [], step: 0, runs: [], gaps: [] };
  if (!fills.length || !(box.height > 0) || !(box.width > 0)) return empty;
  const edges = buildEdges(fills);
  if (!edges.length) return empty;

  const step = box.height / n;
  const x0 = box.x;
  const x1 = box.x + box.width;
  const coverage: number[] = new Array(n);
  const positions: number[] = new Array(n);
  const runs: number[] = [];
  const gaps: number[] = [];

  for (let i = 0; i < n; i++) {
    const y = box.y + (i + 0.5) * step;
    positions[i] = y;
    const line = scanlineRuns(edges, fills, y, x0, x1);
    let total = 0;
    for (let k = 0; k < line.length; k++) {
      const len = line[k][1] - line[k][0];
      total += len;
      if (len > 0) runs.push(len);
      if (k > 0) {
        const gap = line[k][0] - line[k - 1][1];
        if (gap > 0) gaps.push(gap);
      }
    }
    coverage[i] = total;
  }
  return { coverage, positions, step, runs, gaps };
}

function transposeBox(box: Box): Box {
  return { x: box.y, y: box.x, width: box.height, height: box.width };
}

function unionBox(a: Box | null, b: Box | null): Box | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x, y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

function strokeBounds(strokes: StrokeShape[]): Box | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    const half = (s.width || 0) / 2;
    for (const line of s.polylines) for (const p of line) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      if (p.x - half < minX) minX = p.x - half;
      if (p.x + half > maxX) maxX = p.x + half;
      if (p.y - half < minY) minY = p.y - half;
      if (p.y + half > maxY) maxY = p.y + half;
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ---------------------------------------------------------------------------
// Reference units measured on the drawing
// ---------------------------------------------------------------------------

export interface ReferenceUnits {
  /** Height of the symbol / logomark (falls back to the whole drawing). */
  symbolHeight: number;
  /** symbolHeight / 2 — the classic "half the symbol" clearspace. */
  halfSymbol: number;
  /** Height of the tallest ink in the measured region (cap height of a wordmark). */
  capHeight: number;
  /** Height of the dense band of the wordmark (x-height); equals capHeight on a plain symbol. */
  xHeight: number;
  /** Typical stem width (weighted median run length across rows and columns). */
  strokeWidth: number;
  /** Thinnest meaningful stem (weighted 5th percentile). Drives the minimum size. */
  minStrokeWidth: number;
  /** Narrowest counter / gap between shapes, or null when the drawing has none. */
  minGap: number | null;
  /** Bounding box of the ink, in drawing units. */
  inkBounds: Box;
  /** inkBounds.width / .height, kept flat for convenience. */
  logoWidth: number;
  logoHeight: number;
  longestSide: number;
  diagonal: number;
  /** false when nothing measurable was found (empty SVG); every value is then 0. */
  measured: boolean;
  /** Non-fatal notes for the UI ("only strokes found", "no counters"…). */
  warnings: string[];
}

export interface MeasureOptions {
  /** Bounds of the symbol / logomark (from `getIconBounds`), in drawing units. */
  symbolBounds?: Box | null;
  /** Restrict cap / x-height / stem measuring to the wordmark. Defaults to the whole ink. */
  textBounds?: Box | null;
  /** Scanlines per axis (default 256). */
  samples?: number;
}

/** Fraction of the peak coverage that still counts as "inside the x-height band". */
const X_HEIGHT_THRESHOLD = 0.5;
/** Above this ratio the drawing has no distinct x-height band (plain symbol). */
const X_HEIGHT_MERGE_RATIO = 0.98;

const EMPTY_UNITS: ReferenceUnits = {
  symbolHeight: 0, halfSymbol: 0, capHeight: 0, xHeight: 0,
  strokeWidth: 0, minStrokeWidth: 0, minGap: null,
  inkBounds: { x: 0, y: 0, width: 0, height: 0 },
  logoWidth: 0, logoHeight: 0, longestSide: 0, diagonal: 0,
  measured: false, warnings: ['Nada mensurável no desenho.'],
};

/**
 * Measure the reference units from already-extracted ink (the pure half, so
 * tests can feed known polygons without paper.js).
 */
export function measureUnitsFromShapes(
  input: { fills: FillShape[]; strokes?: StrokeShape[] },
  options: MeasureOptions = {},
): ReferenceUnits {
  const fills = input.fills ?? [];
  const strokes = input.strokes ?? [];
  const warnings: string[] = [];

  const inkBounds = unionBox(shapesBounds(fills), strokeBounds(strokes));
  if (!inkBounds || !(inkBounds.width > 0) || !(inkBounds.height > 0)) {
    return { ...EMPTY_UNITS, warnings: [...EMPTY_UNITS.warnings] };
  }

  const box = options.textBounds && options.textBounds.width > 0 && options.textBounds.height > 0
    ? options.textBounds
    : inkBounds;
  const samples = options.samples ?? 256;

  const rows = scanFills(fills, box, samples);
  const cols = scanFills(transposeShapes(fills), transposeBox(box), samples);

  // Cap height: vertical extent of the inked scanlines.
  let first = -1, last = -1;
  const peak = rows.coverage.length ? Math.max(...rows.coverage) : 0;
  const inkEps = peak * 1e-4;
  for (let i = 0; i < rows.coverage.length; i++) {
    if (rows.coverage[i] > inkEps) { if (first < 0) first = i; last = i; }
  }
  let capHeight = first >= 0 ? (last - first + 1) * rows.step : box.height;

  // x-height: contiguous band around the densest scanline that still carries
  // at least X_HEIGHT_THRESHOLD of the peak coverage. On a wordmark that is
  // exactly the body of the lowercase letters; on a plain symbol the band
  // covers (almost) everything and collapses back onto the cap height.
  let xHeight = capHeight;
  if (first >= 0 && peak > 0) {
    let argmax = first;
    for (let i = first; i <= last; i++) if (rows.coverage[i] > rows.coverage[argmax]) argmax = i;
    const limit = peak * X_HEIGHT_THRESHOLD;
    let a = argmax, b = argmax;
    while (a - 1 >= first && rows.coverage[a - 1] >= limit) a--;
    while (b + 1 <= last && rows.coverage[b + 1] >= limit) b++;
    const band = (b - a + 1) * rows.step;
    xHeight = band / capHeight > X_HEIGHT_MERGE_RATIO ? capHeight : band;
  }

  // Stem width: the thin direction wins, so take the smaller of the two axes.
  const strokeWidths = strokes.map(s => s.width).filter(w => Number.isFinite(w) && w > 0);
  let strokeWidth = 0;
  let minStrokeWidth = 0;
  if (rows.runs.length || cols.runs.length) {
    const rowMedian = weightedPercentile(rows.runs, 0.5);
    const colMedian = weightedPercentile(cols.runs, 0.5);
    strokeWidth = Math.min(rowMedian || Infinity, colMedian || Infinity);
    const rowThin = weightedPercentile(rows.runs, 0.05);
    const colThin = weightedPercentile(cols.runs, 0.05);
    minStrokeWidth = Math.min(rowThin || Infinity, colThin || Infinity);
  }
  if (strokeWidths.length) {
    // Unfilled paths carry their width explicitly; no need to infer it.
    const sorted = [...strokeWidths].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    strokeWidth = Number.isFinite(strokeWidth) && strokeWidth > 0 ? Math.min(strokeWidth, median) : median;
    minStrokeWidth = Number.isFinite(minStrokeWidth) && minStrokeWidth > 0
      ? Math.min(minStrokeWidth, sorted[0])
      : sorted[0];
    if (!fills.length) warnings.push('O desenho só tem traços abertos; a medida usa a espessura declarada.');
  }
  if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) strokeWidth = 0;
  if (!Number.isFinite(minStrokeWidth) || minStrokeWidth <= 0) minStrokeWidth = strokeWidth;

  const rowGap = rows.gaps.length ? weightedPercentile(rows.gaps, 0.05) : 0;
  const colGap = cols.gaps.length ? weightedPercentile(cols.gaps, 0.05) : 0;
  const gapCandidates = [rowGap, colGap].filter(g => g > 0);
  const minGap = gapCandidates.length ? Math.min(...gapCandidates) : null;
  if (minGap === null) warnings.push('O desenho não tem vãos internos; o tamanho mínimo considera só o traço.');

  const symbolHeight = options.symbolBounds && options.symbolBounds.height > 0
    ? options.symbolBounds.height
    : inkBounds.height;

  if (capHeight <= 0) capHeight = inkBounds.height;
  if (xHeight <= 0) xHeight = capHeight;

  return {
    symbolHeight,
    halfSymbol: symbolHeight / 2,
    capHeight,
    xHeight,
    strokeWidth,
    minStrokeWidth,
    minGap,
    inkBounds,
    logoWidth: inkBounds.width,
    logoHeight: inkBounds.height,
    longestSide: Math.max(inkBounds.width, inkBounds.height),
    diagonal: Math.hypot(inkBounds.width, inkBounds.height),
    measured: true,
    warnings,
  };
}

// --- paper.js adapter (memoized) -------------------------------------------

let clearspaceScope: paper.PaperScope | null = null;
const unitsCache = new LRUCache<string, ReferenceUnits>(12);

function importForMeasure(svg: string): paper.Item | null {
  if (!clearspaceScope) {
    clearspaceScope = new paper.PaperScope();
    clearspaceScope.setup(new clearspaceScope.Size(1, 1));
  }
  const scope = clearspaceScope;
  scope.activate();
  try {
    scope.project.clear();
    return scope.project.importSVG(svg, { expandShapes: true }) as paper.Item | null;
  } finally {
    paper.activate();
  }
}

/**
 * Measure the reference units of an SVG string (or a ParsedSVG-like object).
 * Memoized by SVG content + options, so panels can call it from a `useMemo`
 * without paying for the paper import on every keystroke.
 */
export function measureReferenceUnits(
  input: string | { originalSVG: string } | null | undefined,
  options: MeasureOptions = {},
): ReferenceUnits {
  if (!input) return { ...EMPTY_UNITS, warnings: [...EMPTY_UNITS.warnings] };
  const raw = typeof input === 'string' ? input : input.originalSVG;
  if (!raw) return { ...EMPTY_UNITS, warnings: [...EMPTY_UNITS.warnings] };
  const svg = sanitizeSVG(raw).svg;
  const key = hashKey(svg, options);
  const cached = unitsCache.get(key);
  if (cached) return cached;

  let units: ReferenceUnits;
  try {
    const item = importForMeasure(svg);
    const { fills, strokes } = item ? paperToShapes(item, 0.5) : { fills: [], strokes: [] };
    units = measureUnitsFromShapes({ fills, strokes }, options);
  } catch (err) {
    units = {
      ...EMPTY_UNITS,
      warnings: [`Não foi possível medir o desenho: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
  unitsCache.set(key, units);
  return units;
}

/** Drop the memoized measurements (tests, or after a hard reset). */
export function clearReferenceUnitsCache(): void {
  unitsCache.clear();
}

// ---------------------------------------------------------------------------
// Clearspace configuration
// ---------------------------------------------------------------------------

export type ClearspaceReference =
  | 'symbol-height'
  | 'cap-height'
  | 'x-height'
  | 'stroke-width'
  | 'half-symbol'
  | 'percent';

export const CLEARSPACE_REFERENCES: readonly ClearspaceReference[] = [
  'symbol-height', 'cap-height', 'x-height', 'stroke-width', 'half-symbol', 'percent',
];

export function isClearspaceReference(value: unknown): value is ClearspaceReference {
  return typeof value === 'string' && (CLEARSPACE_REFERENCES as readonly string[]).includes(value);
}

export interface ReferenceLabel {
  /** Chip / button text. */
  short: string;
  /** Noun phrase used in the manual sentence ("a altura da letra X do logotipo"). */
  noun: string;
  /** One-line explanation for the tooltip. */
  hint: string;
}

/** Dictionary prefix of each reference (`clearspace` namespace). */
const REFERENCE_KEYS: Record<ClearspaceReference, string> = {
  'symbol-height': 'symbolHeight',
  'cap-height': 'capHeight',
  'x-height': 'xHeight',
  'stroke-width': 'strokeWidth',
  'half-symbol': 'halfSymbol',
  percent: 'percent',
};

const referenceLabel = (ref: ClearspaceReference): ReferenceLabel => {
  const prefix = REFERENCE_KEYS[ref];
  return {
    get short() { return tr(`${prefix}Short` as ClearspaceKey); },
    get noun() { return tr(`${prefix}Noun` as ClearspaceKey); },
    get hint() { return tr(`${prefix}Hint` as ClearspaceKey); },
  };
};

/** Reference names, read in the active language on every access. */
export const CLEARSPACE_REFERENCE_LABELS: Record<ClearspaceReference, ReferenceLabel> = Object.fromEntries(
  (Object.keys(REFERENCE_KEYS) as ClearspaceReference[]).map(ref => [ref, referenceLabel(ref)]),
) as Record<ClearspaceReference, ReferenceLabel>;

export type PercentBase = 'longest-side' | 'width' | 'height' | 'diagonal';

const PERCENT_BASE_KEYS: Record<PercentBase, ClearspaceKey> = {
  'longest-side': 'baseLongestSide',
  width: 'baseWidth',
  height: 'baseHeight',
  diagonal: 'baseDiagonal',
};

/** Percentage bases, read in the active language on every access. */
export const PERCENT_BASE_LABELS: Readonly<Record<PercentBase, string>> = Object.defineProperties(
  {} as Record<PercentBase, string>,
  Object.fromEntries((Object.keys(PERCENT_BASE_KEYS) as PercentBase[]).map(k => [
    k, { enumerable: true, get: () => tr(PERCENT_BASE_KEYS[k]) },
  ])),
);

export type ClearspaceSide = 'top' | 'right' | 'bottom' | 'left';
export const CLEARSPACE_SIDES: readonly ClearspaceSide[] = ['top', 'right', 'bottom', 'left'];
const SIDE_KEYS: Record<ClearspaceSide, ClearspaceKey> = {
  top: 'sideTop', right: 'sideRight', bottom: 'sideBottom', left: 'sideLeft',
};

/** Side names, read in the active language on every access. */
export const CLEARSPACE_SIDE_LABELS: Readonly<Record<ClearspaceSide, string>> = Object.defineProperties(
  {} as Record<ClearspaceSide, string>,
  Object.fromEntries((Object.keys(SIDE_KEYS) as ClearspaceSide[]).map(k => [
    k, { enumerable: true, get: () => tr(SIDE_KEYS[k]) },
  ])),
);

export interface ClearspaceSides { top: number; right: number; bottom: number; left: number }

export interface ClearspaceConfig {
  reference: ClearspaceReference;
  /** Multiplier of the reference unit per side (percent value when reference === 'percent'). */
  sides: ClearspaceSides;
  /** When true every side follows the last edited one. */
  locked: boolean;
  /** Only used by the 'percent' reference. */
  percentBase: PercentBase;
}

export const CLEARSPACE_MAX_MULTIPLIER = 20;

export const DEFAULT_CLEARSPACE_CONFIG: ClearspaceConfig = {
  reference: 'x-height',
  sides: { top: 1, right: 1, bottom: 1, left: 1 },
  locked: true,
  percentBase: 'longest-side',
};

function sanitizeMultiplier(value: unknown, fallback = 0): number {
  const n = finite(value, fallback);
  if (!(n > 0)) return 0;
  return clamp(n, 0, CLEARSPACE_MAX_MULTIPLIER * 10);
}

export function createClearspaceConfig(partial: Partial<ClearspaceConfig> = {}): ClearspaceConfig {
  const base = DEFAULT_CLEARSPACE_CONFIG;
  const sides = partial.sides ?? base.sides;
  return {
    reference: isClearspaceReference(partial.reference) ? partial.reference : base.reference,
    sides: {
      top: sanitizeMultiplier(sides.top, base.sides.top),
      right: sanitizeMultiplier(sides.right, base.sides.right),
      bottom: sanitizeMultiplier(sides.bottom, base.sides.bottom),
      left: sanitizeMultiplier(sides.left, base.sides.left),
    },
    locked: partial.locked ?? base.locked,
    percentBase: partial.percentBase ?? base.percentBase,
  };
}

/** Set one side; with `locked` on, every side follows. */
export function setClearspaceSide(config: ClearspaceConfig, side: ClearspaceSide, value: number): ClearspaceConfig {
  const v = sanitizeMultiplier(value, 0);
  if (config.locked) {
    return { ...config, sides: { top: v, right: v, bottom: v, left: v } };
  }
  return { ...config, sides: { ...config.sides, [side]: v } };
}

/** Turning the lock on levels every side to the top one (the value the user sees first). */
export function setClearspaceLocked(config: ClearspaceConfig, locked: boolean): ClearspaceConfig {
  if (!locked) return { ...config, locked: false };
  const v = config.sides.top;
  return { ...config, locked: true, sides: { top: v, right: v, bottom: v, left: v } };
}

export function setClearspaceReference(config: ClearspaceConfig, reference: ClearspaceReference): ClearspaceConfig {
  if (!isClearspaceReference(reference) || reference === config.reference) return config;
  // Percent multipliers live on a different scale (10 = 10%), so switching in
  // or out of percent resets to a sane default instead of a 1% hairline.
  if (reference === 'percent') {
    return { ...config, reference, sides: { top: 10, right: 10, bottom: 10, left: 10 }, locked: config.locked };
  }
  if (config.reference === 'percent') {
    return { ...config, reference, sides: { top: 1, right: 1, bottom: 1, left: 1 } };
  }
  return { ...config, reference };
}

export function areSidesEqual(sides: ClearspaceSides): boolean {
  const { top, right, bottom, left } = sides;
  return Math.abs(top - right) < 1e-9 && Math.abs(top - bottom) < 1e-9 && Math.abs(top - left) < 1e-9;
}

// ---------------------------------------------------------------------------
// Resolving the clearspace
// ---------------------------------------------------------------------------

/**
 * Length of ONE unit of the chosen reference, in drawing units. For 'percent'
 * it is 1% of the chosen base, so the multiplier keeps reading as a percentage.
 */
export function referenceLength(
  reference: ClearspaceReference,
  units: ReferenceUnits,
  percentBase: PercentBase = 'longest-side',
): number {
  switch (reference) {
    case 'symbol-height': return units.symbolHeight;
    case 'half-symbol': return units.halfSymbol;
    case 'cap-height': return units.capHeight;
    case 'x-height': return units.xHeight;
    case 'stroke-width': return units.strokeWidth;
    case 'percent': {
      const base = percentBase === 'width' ? units.logoWidth
        : percentBase === 'height' ? units.logoHeight
        : percentBase === 'diagonal' ? units.diagonal
        : units.longestSide;
      return base / 100;
    }
    default: return 0;
  }
}

export interface ClearspaceResult {
  reference: ClearspaceReference;
  /** Length of one reference unit, in drawing units. */
  unitLength: number;
  /** Clearspace per side, in drawing units. */
  sides: ClearspaceSides;
  /** The logo box the clearspace was applied to. */
  inner: Box;
  /** Logo box + clearspace. */
  outer: Box;
  /** false when the reference could not be measured (unitLength === 0). */
  valid: boolean;
  warnings: string[];
}

/**
 * Apply a config to a logo box. `bounds` is in the same units as `units`
 * (drawing units); the caller scales to canvas px separately.
 */
export function resolveClearspace(
  bounds: Box,
  config: ClearspaceConfig,
  units: ReferenceUnits,
): ClearspaceResult {
  const cfg = createClearspaceConfig(config);
  const unitLength = referenceLength(cfg.reference, units, cfg.percentBase);
  const warnings: string[] = [];
  const valid = Number.isFinite(unitLength) && unitLength > 0;
  if (!valid) {
    warnings.push(tr('cannotMeasure', { noun: CLEARSPACE_REFERENCE_LABELS[cfg.reference].noun }));
  }
  const len = valid ? unitLength : 0;
  const sides: ClearspaceSides = {
    top: cfg.sides.top * len,
    right: cfg.sides.right * len,
    bottom: cfg.sides.bottom * len,
    left: cfg.sides.left * len,
  };
  const inner: Box = {
    x: finite(bounds.x), y: finite(bounds.y),
    width: Math.max(0, finite(bounds.width)), height: Math.max(0, finite(bounds.height)),
  };
  const outer: Box = {
    x: inner.x - sides.left,
    y: inner.y - sides.top,
    width: inner.width + sides.left + sides.right,
    height: inner.height + sides.top + sides.bottom,
  };
  return { reference: cfg.reference, unitLength: len, sides, inner, outer, valid, warnings };
}

// ---------------------------------------------------------------------------
// Converting to millimetres and pixels
// ---------------------------------------------------------------------------

export type ClearspaceMedium = 'screen' | 'print';

export interface OutputSize {
  medium: ClearspaceMedium;
  /** Printed width of the LOGO (not of the clearspace box), in mm. */
  widthMm?: number | null;
  /** Printed height of the logo, in mm (used when widthMm is absent). */
  heightMm?: number | null;
  /** On-screen width of the logo, in px. */
  widthPx?: number | null;
  /** On-screen height of the logo, in px. */
  heightPx?: number | null;
  /** Raster density used to cross-convert mm <-> px (default 96 on screen, 300 on print). */
  dpi?: number | null;
}

export const DEFAULT_OUTPUT_SIZE: OutputSize = { medium: 'print', widthMm: 40, dpi: DEFAULT_PRINT_DPI };

export interface UnitScale {
  mmPerUnit: number;
  pxPerUnit: number;
  dpi: number;
  medium: ClearspaceMedium;
}

/**
 * How many mm / px one drawing unit becomes, given the size the logo is
 * reproduced at. Width wins when both are given; the other axis follows the
 * logo's own proportion, so the scale is always uniform.
 */
export function unitScale(bounds: Box, output: OutputSize): UnitScale {
  const medium: ClearspaceMedium = output.medium === 'screen' ? 'screen' : 'print';
  const dpi = finite(output.dpi, 0) > 0
    ? (output.dpi as number)
    : medium === 'screen' ? DEFAULT_SCREEN_DPI : DEFAULT_PRINT_DPI;
  const w = Math.max(0, finite(bounds.width));
  const h = Math.max(0, finite(bounds.height));

  let mmPerUnit = 0;
  let pxPerUnit = 0;
  if (medium === 'print') {
    const widthMm = finite(output.widthMm, 0);
    const heightMm = finite(output.heightMm, 0);
    if (widthMm > 0 && w > 0) mmPerUnit = widthMm / w;
    else if (heightMm > 0 && h > 0) mmPerUnit = heightMm / h;
    pxPerUnit = mmToPx(mmPerUnit, dpi);
  } else {
    const widthPx = finite(output.widthPx, 0);
    const heightPx = finite(output.heightPx, 0);
    if (widthPx > 0 && w > 0) pxPerUnit = widthPx / w;
    else if (heightPx > 0 && h > 0) pxPerUnit = heightPx / h;
    mmPerUnit = pxToMm(pxPerUnit, dpi);
  }
  return { mmPerUnit, pxPerUnit, dpi, medium };
}

export interface ClearspaceMeasures {
  scale: UnitScale;
  /** Clearspace per side. */
  mm: ClearspaceSides;
  px: ClearspaceSides;
  /** Size of one reference unit. */
  unitMm: number;
  unitPx: number;
  /** Logo box. */
  logoMm: { width: number; height: number };
  logoPx: { width: number; height: number };
  /** Logo + clearspace. */
  outerMm: { width: number; height: number };
  outerPx: { width: number; height: number };
}

export function convertClearspace(result: ClearspaceResult, output: OutputSize): ClearspaceMeasures {
  const scale = unitScale(result.inner, output);
  const mmOf = (v: number) => v * scale.mmPerUnit;
  const pxOf = (v: number) => v * scale.pxPerUnit;
  return {
    scale,
    mm: {
      top: mmOf(result.sides.top), right: mmOf(result.sides.right),
      bottom: mmOf(result.sides.bottom), left: mmOf(result.sides.left),
    },
    px: {
      top: pxOf(result.sides.top), right: pxOf(result.sides.right),
      bottom: pxOf(result.sides.bottom), left: pxOf(result.sides.left),
    },
    unitMm: mmOf(result.unitLength),
    unitPx: pxOf(result.unitLength),
    logoMm: { width: mmOf(result.inner.width), height: mmOf(result.inner.height) },
    logoPx: { width: pxOf(result.inner.width), height: pxOf(result.inner.height) },
    outerMm: { width: mmOf(result.outer.width), height: mmOf(result.outer.height) },
    outerPx: { width: pxOf(result.outer.width), height: pxOf(result.outer.height) },
  };
}

// ---------------------------------------------------------------------------
// Bridge to the legacy scene settings (render-pipeline / PreviewCanvas)
// ---------------------------------------------------------------------------

export interface LegacyClearspaceSettings {
  clearspaceValue: number;
  clearspaceUnit: 'logomark';
}

/**
 * The scene renderer only knows ONE uniform clearspace expressed in
 * "logomark" units (`value * min(iconWidth, iconHeight)`). This converts a
 * resolved clearspace into that single number so the canvas keeps drawing.
 *
 * With the lock on, the conversion is exact. With per-side values it takes the
 * largest side by default (the safest rectangle to show on the canvas) — the
 * panel preview remains the place where the four sides are shown exactly.
 *
 * @param logomarkSize `getLogomarkSize(components)` in DRAWING units.
 */
export function toLegacySceneClearspace(
  result: ClearspaceResult,
  logomarkSize: number,
  pick: 'max' | 'min' | 'mean' | ClearspaceSide = 'max',
): LegacyClearspaceSettings {
  const size = finite(logomarkSize, 0);
  if (!(size > 0)) return { clearspaceValue: 0, clearspaceUnit: 'logomark' };
  const s = result.sides;
  const all = [s.top, s.right, s.bottom, s.left];
  const length = pick === 'max' ? Math.max(...all)
    : pick === 'min' ? Math.min(...all)
    : pick === 'mean' ? all.reduce((a, b) => a + b, 0) / 4
    : s[pick];
  const value = length / size;
  return {
    clearspaceValue: Number.isFinite(value) && value > 0 ? value : 0,
    clearspaceUnit: 'logomark',
  };
}

// ---------------------------------------------------------------------------
// Manual-ready text (pt-BR)
// ---------------------------------------------------------------------------

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return rounded.toLocaleString(activeLocale(), { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function multiplierText(value: number): string {
  return tr('multiplierText', { value: formatNumber(value, 2) });
}

/**
 * The rule as it goes into the manual, e.g.
 * "A área de respiro equivale à altura da letra X do logotipo."
 */
export function clearspaceRuleSentence(config: ClearspaceConfig): string {
  const cfg = createClearspaceConfig(config);
  const label = CLEARSPACE_REFERENCE_LABELS[cfg.reference];
  const equal = cfg.locked || areSidesEqual(cfg.sides);

  if (cfg.reference === 'percent') {
    const base = PERCENT_BASE_LABELS[cfg.percentBase];
    if (equal) {
      return tr('sentencePercentEqual', { value: formatNumber(cfg.sides.top, 2), base });
    }
    return tr('sentencePercentSides', {
      base,
      top: formatNumber(cfg.sides.top, 2), right: formatNumber(cfg.sides.right, 2),
      bottom: formatNumber(cfg.sides.bottom, 2), left: formatNumber(cfg.sides.left, 2),
    });
  }

  if (equal) {
    const n = cfg.sides.top;
    if (Math.abs(n - 1) < 1e-9) return tr('sentenceOnce', { noun: label.noun });
    return tr('sentenceEqual', { value: multiplierText(n), noun: label.noun });
  }
  return tr('sentenceSides', {
    noun: label.noun,
    top: multiplierText(cfg.sides.top), right: multiplierText(cfg.sides.right),
    bottom: multiplierText(cfg.sides.bottom), left: multiplierText(cfg.sides.left),
  });
}

export interface ManualTextOptions {
  /** Name used in the text (default "logotipo"). */
  logoName?: string;
  /** Include the millimetre / pixel block. */
  measures?: ClearspaceMeasures | null;
}

/** Full block, ready to paste into a brand manual. */
export function clearspaceManualText(
  result: ClearspaceResult,
  config: ClearspaceConfig,
  options: ManualTextOptions = {},
): string {
  const cfg = createClearspaceConfig(config);
  const name = options.logoName?.trim() || tr('manualDefaultName');
  const label = CLEARSPACE_REFERENCE_LABELS[cfg.reference];
  const lines: string[] = [tr('manualHeading'), ''];
  lines.push(clearspaceRuleSentence(cfg));
  lines.push(tr('manualNoIntrusion', { name }));
  lines.push('');

  const unitName = cfg.reference === 'percent'
    ? tr('manualPercentUnit', { base: PERCENT_BASE_LABELS[cfg.percentBase] })
    : label.noun.charAt(0).toUpperCase() + label.noun.slice(1);
  lines.push(tr('manualReference', { unit: unitName, value: formatNumber(result.unitLength, 2) }));

  if (!areSidesEqual(result.sides)) {
    lines.push(tr('manualPerSide', {
      top: formatNumber(result.sides.top, 2), right: formatNumber(result.sides.right, 2),
      bottom: formatNumber(result.sides.bottom, 2), left: formatNumber(result.sides.left, 2),
    }));
  }

  const m = options.measures;
  if (m && (m.scale.mmPerUnit > 0 || m.scale.pxPerUnit > 0)) {
    lines.push('');
    if (m.scale.medium === 'print') {
      lines.push(tr('manualPrint', {
        name, width: formatNumber(m.logoMm.width, 2),
        top: formatNumber(m.mm.top, 2), right: formatNumber(m.mm.right, 2),
        bottom: formatNumber(m.mm.bottom, 2), left: formatNumber(m.mm.left, 2),
      }));
      lines.push(tr('manualPrintTotal', { width: formatNumber(m.outerMm.width, 2), height: formatNumber(m.outerMm.height, 2) }));
    } else {
      lines.push(tr('manualScreen', {
        name, width: formatNumber(m.logoPx.width, 0),
        top: formatNumber(m.px.top, 0), right: formatNumber(m.px.right, 0),
        bottom: formatNumber(m.px.bottom, 0), left: formatNumber(m.px.left, 0),
      }));
      lines.push(tr('manualScreenTotal', { width: formatNumber(m.outerPx.width, 0), height: formatNumber(m.outerPx.height, 0) }));
    }
  }
  return lines.join('\n');
}

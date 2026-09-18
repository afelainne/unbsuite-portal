/**
 * Compare two versions of the same logo.
 *
 * Both versions are aligned by their ink CENTER and by their HEIGHT (the
 * second version is scaled so its ink is exactly as tall as the first one),
 * which is how a designer eyeballs a redraw: size differences that come from
 * the artboard are irrelevant, the shape is what matters.
 *
 * From that aligned pair it produces:
 *  - a side-by-side metric table (proportion, ink coverage, visual centre,
 *    symmetry, anchors, minimum thickness) with the signed variation in %;
 *  - a difference map: ink only in A, only in B, and in both, rasterized with
 *    the same vector scanline approach as `scanlineCoverage` in `metrics.ts`
 *    (no canvas, no DOM, so it is testable);
 *  - the percentage of coinciding area (intersection over union).
 *
 * Everything here is pure: no React, no network, no canvas.
 */
import paper from 'paper';
import { parseSVG, SvgParseError, type ParsedSVG } from './svg-engine';
import { parseViewBox } from './svg-sanitize';
import {
  computeLogoMetrics, nameAspectRatio, paperToShapes, transposeShapes, shapesBounds,
  type Box, type FillShape, type LogoMetrics, type Pt, type StrokeShape,
} from './metrics';
import { hashKey, LRUCache } from './memo';
import { activeT, activeLanguage, activeLocale } from '../i18n/runtime';
import { fill, type FillVars } from '../i18n/format';
import type { Translations } from '../i18n/types';

type CompareKey = keyof Translations['compareLib'];
/** A comparison message in the active language. */
const tr = (key: CompareKey, vars?: FillVars): string => fill(activeT().compareLib[key], vars);

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type CompareSideId = 'a' | 'b';
export type CompareErrorCode = 'empty' | 'not-svg' | 'invalid' | 'too-big' | 'unreadable';

/** A failure that already carries a message ready to show to the user (pt-BR). */
export class CompareError extends Error {
  readonly code: CompareErrorCode;
  readonly side: CompareSideId;
  constructor(code: CompareErrorCode, message: string, side: CompareSideId = 'b') {
    super(message);
    this.name = 'CompareError';
    this.code = code;
    this.side = side;
  }
}

const sideLabel = (side: CompareSideId): string => (side === 'a' ? activeT().compare.versionA : activeT().compare.versionB);

function messageFor(code: CompareErrorCode, side: CompareSideId, detail?: string): string {
  const who = sideLabel(side);
  const extra = detail ? tr('detail', { detail }) : '';
  switch (code) {
    case 'empty':
      return tr('errorEmpty', { who });
    case 'not-svg':
      return tr('errorNotSvg', { who });
    case 'too-big':
      return tr('errorTooBig', { who });
    case 'invalid':
      return tr('errorInvalid', { who, detail: extra });
    default:
      return tr('errorUnreadable', { who, detail: extra });
  }
}

function codeFromParse(code: SvgParseError['code']): CompareErrorCode {
  switch (code) {
    case 'empty': return 'empty';
    case 'not-svg': return 'not-svg';
    case 'too-large':
    case 'too-complex': return 'too-big';
    default: return 'invalid';
  }
}

/**
 * Parse a version for the comparison. Always throws a `CompareError` whose
 * `message` names the side and can be shown as-is.
 */
export function parseCompareVersion(svgString: string, side: CompareSideId = 'b'): ParsedSVG {
  if (typeof svgString !== 'string' || !svgString.trim()) {
    throw new CompareError('empty', messageFor('empty', side), side);
  }
  let parsed: ParsedSVG;
  try {
    parsed = parseSVG(svgString);
  } catch (err) {
    if (err instanceof SvgParseError) {
      const code = codeFromParse(err.code);
      throw new CompareError(code, messageFor(code, side, err.message), side);
    }
    throw new CompareError('unreadable', messageFor('unreadable', side, err instanceof Error ? err.message : String(err)), side);
  }
  if (!parsed.components.length) {
    throw new CompareError('empty', messageFor('empty', side), side);
  }
  return parsed;
}

/** Message for any error raised while loading / comparing a version. */
export function describeCompareError(err: unknown, side: CompareSideId = 'b'): string {
  if (err instanceof CompareError) return err.message;
  if (err instanceof SvgParseError) return messageFor(codeFromParse(err.code), side, err.message);
  return messageFor('unreadable', side, err instanceof Error ? err.message : String(err));
}

// ---------------------------------------------------------------------------
// Scanline primitives (same spirit as metrics.scanlineCoverage)
// ---------------------------------------------------------------------------

type Interval = [number, number];

interface Edge { x0: number; y0: number; x1: number; y1: number; dir: 1 | -1; shape: number }

interface Scan {
  /** Sampled row centres. */
  ys: number[];
  /** Merged ink runs per row (union of every shape). */
  runs: Interval[][];
}

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

function buildEdges(shapes: FillShape[]): Edge[] {
  const edges: Edge[] = [];
  shapes.forEach((shape, si) => {
    for (const ring of shape.rings) {
      const n = ring.length;
      if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) continue;
        if (a.y === b.y) continue;
        edges.push(a.y < b.y
          ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y, dir: 1, shape: si }
          : { x0: b.x, y0: b.y, x1: a.x, y1: a.y, dir: -1, shape: si });
      }
    }
  });
  edges.sort((a, b) => a.y0 - b.y0);
  return edges;
}

/**
 * Ink runs on `rows` evenly spaced horizontal lines across `box`.
 * Each shape is filled with its own rule (nonzero / evenodd) and the results
 * are merged, so overlapping shapes are counted once.
 */
export function scanRuns(shapes: FillShape[], box: Box, rows: number): Scan {
  const n = Math.max(1, Math.min(4096, Math.round(rows)));
  const ys: number[] = new Array(n);
  const runs: Interval[][] = new Array(n);
  const step = box.height / n;
  for (let r = 0; r < n; r++) {
    ys[r] = box.y + (r + 0.5) * step;
    runs[r] = [];
  }
  const edges = buildEdges(shapes);
  if (!edges.length) return { ys, runs };

  let next = 0;
  let active: Edge[] = [];
  const perShape = new Map<number, Array<{ x: number; dir: number }>>();

  for (let r = 0; r < n; r++) {
    const y = ys[r];
    while (next < edges.length && edges[next].y0 <= y) active.push(edges[next++]);
    if (active.length) active = active.filter(e => e.y1 > y);
    if (!active.length) continue;

    perShape.clear();
    for (const e of active) {
      if (e.y0 > y) continue;
      const x = e.x0 + ((y - e.y0) * (e.x1 - e.x0)) / (e.y1 - e.y0);
      let arr = perShape.get(e.shape);
      if (!arr) perShape.set(e.shape, (arr = []));
      arr.push({ x, dir: e.dir });
    }
    const intervals: Interval[] = [];
    perShape.forEach((crossings, si) => {
      crossings.sort((a, b) => a.x - b.x);
      const evenodd = shapes[si].rule === 'evenodd';
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
    runs[r] = mergeIntervals(intervals);
  }
  return { ys, runs };
}

/**
 * Coverage grid: `cols × rows` cells over `box`, each holding the fraction of
 * the cell width covered by ink on the row's centre line (0..1).
 */
export function rasterize(shapes: FillShape[], box: Box, cols: number, rows: number): Float32Array {
  const grid = new Float32Array(cols * rows);
  if (!shapes.length || !(box.width > 0) || !(box.height > 0)) return grid;
  const scan = scanRuns(shapes, box, rows);
  const cw = box.width / cols;
  for (let r = 0; r < rows; r++) {
    const base = r * cols;
    for (const [x1, x2] of scan.runs[r]) {
      const from = Math.max(0, Math.floor((x1 - box.x) / cw));
      const to = Math.min(cols - 1, Math.ceil((x2 - box.x) / cw) - 1);
      for (let c = from; c <= to; c++) {
        const cellA = box.x + c * cw;
        const cellB = cellA + cw;
        const covered = Math.min(x2, cellB) - Math.max(x1, cellA);
        if (covered <= 0) continue;
        const v = grid[base + c] + covered / cw;
        grid[base + c] = v > 1 ? 1 : v;
      }
    }
  }
  return grid;
}

function runAt(runs: Interval[], v: number): Interval | null {
  for (const r of runs) if (v >= r[0] && v <= r[1]) return r;
  return null;
}

function nearestIndex(values: number[], v: number): number {
  if (!values.length) return -1;
  const step = values.length > 1 ? values[1] - values[0] : 1;
  if (!(step > 0)) return 0;
  return Math.max(0, Math.min(values.length - 1, Math.round((v - values[0]) / step)));
}

/**
 * Thinnest stem: for every ink sample, the local thickness is
 * min(horizontal run, vertical run) through the point (a horizontal bar has a
 * long horizontal run but a short vertical one, so the minimum is the real
 * stem width). Returned in the units of `box`.
 */
export function minThickness(shapes: FillShape[], box: Box, rows = 96): { value: number; at: Pt | null } {
  if (!shapes.length || !(box.width > 0) || !(box.height > 0)) return { value: 0, at: null };
  const rowScan = scanRuns(shapes, box, rows);
  const colBox: Box = { x: box.y, y: box.x, width: box.height, height: box.width };
  const cols = Math.max(8, Math.min(512, Math.round((rows * box.width) / box.height)));
  const colScan = scanRuns(transposeShapes(shapes), colBox, cols);

  let min = Infinity;
  let at: Pt | null = null;
  const consider = (t: number, x: number, y: number) => {
    if (!Number.isFinite(t) || !(t > 0) || t >= min) return;
    min = t;
    at = { x, y };
  };

  for (let i = 0; i < rowScan.ys.length; i++) {
    const y = rowScan.ys[i];
    for (const run of rowScan.runs[i]) {
      const x = (run[0] + run[1]) / 2;
      const h = run[1] - run[0];
      const j = nearestIndex(colScan.ys, x);
      if (j < 0) continue;
      const cr = runAt(colScan.runs[j], y);
      consider(Math.min(h, cr ? cr[1] - cr[0] : Infinity), x, y);
    }
  }
  for (let j = 0; j < colScan.ys.length; j++) {
    const x = colScan.ys[j];
    for (const run of colScan.runs[j]) {
      const y = (run[0] + run[1]) / 2;
      const v = run[1] - run[0];
      const i = nearestIndex(rowScan.ys, y);
      if (i < 0) continue;
      const rr = runAt(rowScan.runs[i], x);
      consider(Math.min(v, rr ? rr[1] - rr[0] : Infinity), x, y);
    }
  }
  return Number.isFinite(min) ? { value: min, at } : { value: 0, at: null };
}

// ---------------------------------------------------------------------------
// Shapes of one version
// ---------------------------------------------------------------------------

/**
 * Approximate unfilled strokes as filled ribbons (one quad per segment,
 * extended by half a width at both ends so joins and caps are covered).
 * Overlaps do not matter: every shape is merged into a single ink union.
 */
export function strokeRings(strokes: StrokeShape[]): FillShape[] {
  const out: FillShape[] = [];
  for (const s of strokes) {
    const half = (s.width || 0) / 2;
    if (!(half > 0)) continue;
    s.polylines.forEach((line, li) => {
      const n = line.length;
      const segs = s.closed[li] ? n : n - 1;
      for (let i = 0; i < segs; i++) {
        const a = line[i];
        const b = line[(i + 1) % n];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (!(len > 0)) continue;
        const nx = (-dy / len) * half;
        const ny = (dx / len) * half;
        const ex = (dx / len) * half;
        const ey = (dy / len) * half;
        const ax = a.x - ex, ay = a.y - ey, bx = b.x + ex, by = b.y + ey;
        out.push({
          rule: 'nonzero',
          rings: [[
            { x: ax + nx, y: ay + ny },
            { x: bx + nx, y: by + ny },
            { x: bx - nx, y: by - ny },
            { x: ax - nx, y: ay - ny },
          ]],
        });
      }
    });
  }
  return out;
}

/** Translate + scale every ring (used to align a version by centre + height). */
export function transformShapes(shapes: FillShape[], scale: number, cx: number, cy: number): FillShape[] {
  return shapes.map(s => ({
    rule: s.rule,
    rings: s.rings.map(r => r.map(p => ({ x: (p.x - cx) * scale, y: (p.y - cy) * scale }))),
  }));
}

let compareScope: paper.PaperScope | null = null;

/**
 * Import into a PRIVATE paper scope: `parseSVG` reuses one project and would
 * destroy version A's items while parsing version B, so the comparison always
 * works from the sanitized SVG strings instead of live paper items.
 */
function importForCompare(svg: string): paper.Item | null {
  if (!compareScope) {
    compareScope = new paper.PaperScope();
    compareScope.setup(new compareScope.Size(1, 1));
  }
  const scope = compareScope;
  scope.activate();
  try {
    scope.project.clear();
    return scope.project.importSVG(svg, { expandShapes: true }) as paper.Item | null;
  } finally {
    paper.activate();
  }
}

// ---------------------------------------------------------------------------
// Aligned SVG for the viewer
// ---------------------------------------------------------------------------

/**
 * Wrap an SVG so the rendered image is EXACTLY `box` (the ink bounds). Two
 * images built this way and drawn at the same height are automatically
 * aligned by centre and by height — no transform needed in the view.
 *
 * `box` comes from paper.js, whose coordinates are VIEWPORT coordinates: a
 * `viewBox="-50 -50 400 400"` shifts everything by +50. The box is mapped back
 * to the file's own user units before being used as the outer viewBox,
 * otherwise the crop lands somewhere else in the drawing.
 *
 * The original root becomes a nested `<svg>` whose viewport is placed at its
 * own viewBox rectangle, which makes the inner mapping the identity.
 */
export function toAlignedSVG(svg: string, box: Box): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) {
    throw new CompareError('invalid', messageFor('invalid', 'b'));
  }
  const rawW = Number(root.getAttribute('width'));
  const rawH = Number(root.getAttribute('height'));
  const vb = parseViewBox(root.getAttribute('viewBox'))
    ?? { x: 0, y: 0, width: rawW > 0 ? rawW : box.width, height: rawH > 0 ? rawH : box.height };

  // viewBox → viewport mapping used by the renderer (and by paper): uniform
  // scale that fits ("meet"), then centring.
  const sx = rawW > 0 && vb.width > 0 ? rawW / vb.width : 1;
  const sy = rawH > 0 && vb.height > 0 ? rawH / vb.height : 1;
  const s = Math.min(sx, sy) || 1;
  const tx = rawW > 0 ? (rawW - vb.width * s) / 2 : 0;
  const ty = rawH > 0 ? (rawH - vb.height * s) / 2 : 0;
  const user: Box = {
    x: (box.x - tx) / s + vb.x,
    y: (box.y - ty) / s + vb.y,
    width: box.width / s,
    height: box.height / s,
  };

  root.setAttribute('x', String(vb.x));
  root.setAttribute('y', String(vb.y));
  root.setAttribute('width', String(vb.width));
  root.setAttribute('height', String(vb.height));
  root.setAttribute('overflow', 'visible');
  root.setAttribute('preserveAspectRatio', 'none');
  // A nested <svg> is clipped by the UA stylesheet (svg:not(:root)), which the
  // presentation attribute alone cannot beat — ink outside the viewBox (thick
  // strokes) would disappear.
  const style = root.getAttribute('style');
  root.setAttribute('style', `${style ? `${style};` : ''}overflow:visible`);
  const inner = new XMLSerializer().serializeToString(root);
  const vbAttr = `${user.x} ${user.y} ${user.width} ${user.height}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbAttr}" width="${user.width}" height="${user.height}">${inner}</svg>`;
}

/** Inline data URL for an `<img src>` (no network, no blob to revoke). */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CompareMetricKey =
  | 'aspectRatio' | 'inkCoverage' | 'visualCenter' | 'symmetryVertical'
  | 'symmetryHorizontal' | 'anchorCount' | 'minThickness';

export type CompareMetricUnit = 'ratio' | 'fraction' | 'percent' | 'count';

export interface CompareMetricRow {
  key: CompareMetricKey;
  /** Short pt-BR label, sentence case. */
  label: string;
  unit: CompareMetricUnit;
  a: number;
  b: number;
  /** Ready-to-print values. */
  aLabel: string;
  bLabel: string;
  /** b − a, in the metric's own unit. */
  delta: number;
  /** (b − a) / |a|, in %. Null when A is zero (no meaningful variation). */
  deltaPercent: number | null;
  /** Sign of the variation: 'up' when B is bigger than A. */
  direction: 'up' | 'down' | 'same';
  /** Whether a bigger number is "more" of something visible; used only for wording. */
  hint?: string;
}

export interface CompareSideResult {
  /** Sanitized SVG (safe to inject / serialize). */
  svg: string;
  /** SVG whose viewBox is exactly the ink bounds (see `toAlignedSVG`). */
  alignedSVG: string;
  /** Ink bounds in the version's own user units. */
  bounds: Box;
  /** width / height of the ink bounds. */
  aspect: number;
  metrics: LogoMetrics;
  /** Thinnest stem, as a fraction of the version's own ink height. */
  minThickness: number;
  /** Where it was measured, in aligned (normalized) coordinates. */
  minThicknessAt: Pt | null;
  warnings: string[];
}

export interface DiffMap {
  cols: number;
  rows: number;
  /** Aligned box the grid covers (height 1 + margin, centred on 0,0). */
  box: Box;
  /** Per-cell coverage, row-major. */
  onlyA: Float32Array;
  onlyB: Float32Array;
  both: Float32Array;
  /** Areas in aligned units² (height of the logo = 1). */
  areaA: number;
  areaB: number;
  intersection: number;
  union: number;
  /** intersection / union, in % — the coinciding area. */
  matchPercent: number;
  /** Share of the union that exists only in A / only in B, in %. */
  onlyAPercent: number;
  onlyBPercent: number;
}

export interface CompareResult {
  a: CompareSideResult;
  b: CompareSideResult;
  metrics: CompareMetricRow[];
  diff: DiffMap;
  /** Same as `diff.matchPercent`, hoisted for convenience. */
  matchPercent: number;
  /** Aspect ratio of the frame that fits both versions at the same height. */
  frameAspect: number;
  resolution: number;
}

export interface CompareOptions {
  /** Rows of the difference map (default 160; 24…512). */
  resolution?: number;
  /** Margin around the aligned ink, as a fraction of the height (default 0.02). */
  margin?: number;
}

export type CompareInput = ParsedSVG | string;

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

const MAX_COLS = 1024;
const compareCache = new LRUCache<string, CompareResult>(8);

function svgOf(input: CompareInput): string {
  const svg = typeof input === 'string' ? input : input?.originalSVG;
  if (typeof svg !== 'string' || !svg.trim()) throw new CompareError('empty', messageFor('empty', 'b'));
  return svg;
}

interface SideShapes {
  side: CompareSideResult;
  /** Ink aligned by centre + height: height 1, centred on (0,0). */
  aligned: FillShape[];
}

function buildSide(input: CompareInput, side: CompareSideId): SideShapes {
  const svg = svgOf(input);
  const warnings = typeof input === 'string' ? [] : (input.warnings ?? []);
  let metrics: LogoMetrics;
  let shapes: FillShape[];
  try {
    metrics = computeLogoMetrics(svg);
    const item = importForCompare(svg);
    const tol = Math.max(metrics.width, metrics.height) / 2000 || 0.5;
    const { fills, strokes } = item ? paperToShapes(item, tol) : { fills: [], strokes: [] };
    shapes = [...fills, ...strokeRings(strokes)];
  } catch (err) {
    if (err instanceof CompareError) throw err;
    throw new CompareError('invalid', messageFor('invalid', side, err instanceof Error ? err.message : String(err)), side);
  }

  const bounds = shapesBounds(shapes)
    ?? (metrics.width > 0 && metrics.height > 0
      ? { x: metrics.geometricCenter.x - metrics.width / 2, y: metrics.geometricCenter.y - metrics.height / 2, width: metrics.width, height: metrics.height }
      : null);
  if (!bounds || !(bounds.width > 0) || !(bounds.height > 0)) {
    throw new CompareError('empty', messageFor('empty', side), side);
  }

  const scale = 1 / bounds.height;
  const aligned = transformShapes(shapes, scale, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);

  return {
    aligned,
    side: {
      svg,
      alignedSVG: toAlignedSVG(svg, bounds),
      bounds,
      aspect: bounds.width / bounds.height,
      metrics,
      minThickness: 0,
      minThicknessAt: null,
      warnings,
    },
  };
}

const EPS = 1e-9;

function makeRow(
  key: CompareMetricKey,
  label: string,
  unit: CompareMetricUnit,
  a: number,
  b: number,
  format: (v: number) => string,
  hint?: string,
): CompareMetricRow {
  const delta = b - a;
  const scale = Math.max(Math.abs(a), Math.abs(b), EPS);
  const same = Math.abs(delta) <= scale * 1e-6;
  return {
    key,
    label,
    unit,
    a,
    b,
    aLabel: format(a),
    bLabel: format(b),
    delta: same ? 0 : delta,
    deltaPercent: Math.abs(a) > EPS ? (same ? 0 : (delta / Math.abs(a)) * 100) : null,
    direction: same ? 'same' : delta > 0 ? 'up' : 'down',
    hint,
  };
}

const pctOf = (digits: number) => (v: number) => `${(v * 100).toFixed(digits)}%`;

function buildRows(a: CompareSideResult, b: CompareSideResult): CompareMetricRow[] {
  const ma = a.metrics;
  const mb = b.metrics;
  return [
    makeRow('aspectRatio', tr('rowAspect'), 'ratio', ma.aspectRatio, mb.aspectRatio,
      v => nameAspectRatio(v), tr('rowAspectHint')),
    makeRow('inkCoverage', tr('rowInk'), 'fraction', ma.inkCoverage, mb.inkCoverage,
      pctOf(1), tr('rowInkHint')),
    makeRow('visualCenter', tr('rowCenter'), 'percent', ma.deviationPercent, mb.deviationPercent,
      v => `${v.toFixed(1)}%`, tr('rowCenterHint')),
    makeRow('symmetryVertical', tr('rowSymmetryVertical'), 'fraction', ma.symmetry.vertical, mb.symmetry.vertical,
      pctOf(0), tr('rowSymmetryVerticalHint')),
    makeRow('symmetryHorizontal', tr('rowSymmetryHorizontal'), 'fraction', ma.symmetry.horizontal, mb.symmetry.horizontal,
      pctOf(0), tr('rowSymmetryHorizontalHint')),
    makeRow('anchorCount', tr('rowAnchors'), 'count', ma.anchorCount, mb.anchorCount,
      v => Math.round(v).toLocaleString(activeLocale()), tr('rowAnchorsHint')),
    makeRow('minThickness', tr('rowMinThickness'), 'fraction', a.minThickness, b.minThickness,
      pctOf(2), tr('rowMinThicknessHint')),
  ];
}

function buildDiff(alignedA: FillShape[], alignedB: FillShape[], aspect: number, options: CompareOptions) {
  const rows = Math.max(24, Math.min(512, Math.round(options.resolution ?? 160)));
  const margin = Math.max(0, Math.min(0.5, options.margin ?? 0.02));
  const height = 1 + margin * 2;
  const width = aspect + margin * 2;
  const box: Box = { x: -width / 2, y: -height / 2, width, height };
  const cols = Math.max(8, Math.min(MAX_COLS, Math.round((rows * width) / height)));

  const gridA = rasterize(alignedA, box, cols, rows);
  const gridB = rasterize(alignedB, box, cols, rows);

  const n = cols * rows;
  const onlyA = new Float32Array(n);
  const onlyB = new Float32Array(n);
  const both = new Float32Array(n);
  let sumA = 0, sumB = 0, inter = 0, union = 0;
  for (let i = 0; i < n; i++) {
    const va = gridA[i];
    const vb = gridB[i];
    const lo = va < vb ? va : vb;
    const hi = va < vb ? vb : va;
    both[i] = lo;
    onlyA[i] = va - lo;
    onlyB[i] = vb - lo;
    sumA += va;
    sumB += vb;
    inter += lo;
    union += hi;
  }
  const cell = (box.width / cols) * (box.height / rows);
  const diff: DiffMap = {
    cols,
    rows,
    box,
    onlyA,
    onlyB,
    both,
    areaA: sumA * cell,
    areaB: sumB * cell,
    intersection: inter * cell,
    union: union * cell,
    matchPercent: union > 0 ? (inter / union) * 100 : 100,
    onlyAPercent: union > 0 ? ((sumA - inter) / union) * 100 : 0,
    onlyBPercent: union > 0 ? ((sumB - inter) / union) * 100 : 0,
  };
  return { diff, rows };
}

/**
 * Compare two versions of the same logo. Accepts `ParsedSVG` objects (only
 * their sanitized `originalSVG` is used, so an older parse stays valid) or
 * plain SVG strings.
 *
 * @throws CompareError with a pt-BR message when a version cannot be measured.
 */
export function compareLogos(a: CompareInput, b: CompareInput, options: CompareOptions = {}): CompareResult {
  // The language is part of the key: the metric rows carry their labels.
  const key = hashKey(svgOf(a), svgOf(b), options, activeLanguage());
  const cached = compareCache.get(key);
  if (cached) return cached;

  const sideA = buildSide(a, 'a');
  const sideB = buildSide(b, 'b');

  const frameAspect = Math.max(sideA.side.aspect, sideB.side.aspect, 0.05);
  const { diff, rows } = buildDiff(sideA.aligned, sideB.aligned, frameAspect, options);

  const thickBox: Box = { x: -frameAspect / 2, y: -0.5, width: frameAspect, height: 1 };
  const thickRows = Math.max(48, Math.min(256, rows));
  const ta = minThickness(sideA.aligned, thickBox, thickRows);
  const tb = minThickness(sideB.aligned, thickBox, thickRows);
  sideA.side.minThickness = ta.value;
  sideA.side.minThicknessAt = ta.at;
  sideB.side.minThickness = tb.value;
  sideB.side.minThicknessAt = tb.at;

  const result: CompareResult = {
    a: sideA.side,
    b: sideB.side,
    metrics: buildRows(sideA.side, sideB.side),
    diff,
    matchPercent: diff.matchPercent,
    frameAspect,
    resolution: rows,
  };
  compareCache.set(key, result);
  return result;
}

/** Drop memoized comparisons (tests, or to free the grids). */
export function clearCompareCache(): void {
  compareCache.clear();
}

// ---------------------------------------------------------------------------
// Painting helpers
// ---------------------------------------------------------------------------

export interface DiffColors {
  /** Ink present in both versions. */
  both: string;
  /** Ink only in A. */
  onlyA: string;
  /** Ink only in B. */
  onlyB: string;
}

/** Defaults: shared ink almost black, exclusives in two distinct hues. */
export const DIFF_COLORS: DiffColors = {
  both: '#1C1C1E',
  onlyA: '#E5484D',
  onlyB: '#8B5CF6',
};

function hexToRGB(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const s = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

/**
 * RGBA pixels (premultiplied blend of the three layers) ready for
 * `new ImageData(data, cols, rows)`. Transparent where neither version has ink.
 */
export function diffMapToRGBA(diff: DiffMap, colors: DiffColors = DIFF_COLORS): Uint8ClampedArray {
  const cBoth = hexToRGB(colors.both);
  const cA = hexToRGB(colors.onlyA);
  const cB = hexToRGB(colors.onlyB);
  const n = diff.cols * diff.rows;
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const wBoth = diff.both[i];
    const wA = diff.onlyA[i];
    const wB = diff.onlyB[i];
    const alpha = wBoth + wA + wB;
    const o = i * 4;
    if (alpha <= 0) continue;
    out[o] = (cBoth[0] * wBoth + cA[0] * wA + cB[0] * wB) / alpha;
    out[o + 1] = (cBoth[1] * wBoth + cA[1] * wA + cB[1] * wB) / alpha;
    out[o + 2] = (cBoth[2] * wBoth + cA[2] * wA + cB[2] * wB) / alpha;
    out[o + 3] = Math.min(1, alpha) * 255;
  }
  return out;
}

/** "+12,3%" / "−4,0%" / "—" for a metric row. */
export function formatDelta(row: CompareMetricRow, digits = 1): string {
  if (row.direction === 'same') return '=';
  if (row.deltaPercent === null) return row.delta > 0 ? '+∞' : '—';
  const sign = row.deltaPercent > 0 ? '+' : '−';
  return `${sign}${Math.abs(row.deltaPercent).toFixed(digits)}%`;
}

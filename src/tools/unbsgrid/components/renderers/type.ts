/**
 * Wordmark / signature constructions, all measured from the REAL ink.
 *
 * Everything in here is built on one shared scan of the artwork (the exact
 * scanline from `./extra`): rows give the height bands, columns give the
 * letter segmentation, and the two together give local stem thickness. No
 * construction guesses from the bounding box.
 *
 * The scan is memoized per (paths, box) because a scene render may switch ten
 * of these on at once and they all ask for the same numbers.
 *
 * Every decorative length comes from `metricsFor(context, bounds)`, so the
 * 600px preview and a 4096px export look identical, and every loop is capped
 * so a pathological drawing cannot blow past `MAX_RENDER_ITEMS`.
 */
import paper from 'paper';
import {
  hexToColor, formatLength, MAX_RENDER_ITEMS,
  type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor, type GuideMetrics } from './scale';
import { LabelPlacer } from './measurement';
import {
  inkShapes, scanInk, transposeShapes, boxOf,
  type Box, type InkScan, type Pt2, type Run,
} from './extra';

const EPS = 1e-9;

/** A drawing split into more cells than this is texture, not a wordmark. */
export const MAX_LETTERS = 64;
/** Hard ceiling on the counters a single render may outline. */
export const MAX_COUNTERS = 48;
/** Samples of the density curve (a longer curve is downsampled). */
export const MAX_DENSITY_SAMPLES = 400;

/** Simple item budget so no renderer can exceed `MAX_RENDER_ITEMS`. */
export class ItemBudget {
  private used = 0;
  constructor(private readonly max: number = MAX_RENDER_ITEMS) {}
  get left(): number { return Math.max(0, this.max - this.used); }
  /** True when `count` more items still fit (and books them). */
  take(count = 1): boolean {
    if (this.used + count > this.max) return false;
    this.used += count;
    return true;
  }
}

// ---------------------------------------------------------------------------
// Height bands from a coverage profile
// ---------------------------------------------------------------------------

export interface HeightBand {
  /** Top of the ink (cap line or ascender). */
  topY: number;
  /** Detected x-height line, or null when the profile has no such step. */
  xY: number | null;
  /** Baseline: the last big drop of ink; equals `bottomY` when there is none. */
  baselineY: number;
  /** Bottom of the ink. */
  bottomY: number;
  capHeight: number;
  xHeight: number | null;
}

/**
 * Cap / x-height / baseline out of a per-row ink coverage profile.
 *
 * Same reading as `detectTypeHeights` in `./extra` (biggest step up in the
 * top of the band, biggest drop in the bottom), but it takes a profile rather
 * than paths, so it can be applied to one letter or one word without
 * re-scanning the artwork.
 */
export function bandFromProfile(ys: number[], covered: number[], step: number): HeightBand | null {
  const n = Math.min(ys.length, covered.length);
  if (n < 2 || !(step > 0)) return null;
  let max = 0;
  for (let i = 0; i < n; i++) if (covered[i] > max) max = covered[i];
  if (!(max > 0)) return null;

  const thr = max * 0.02;
  let first = -1;
  let last = -1;
  for (let i = 0; i < n; i++) if (covered[i] > thr) { if (first < 0) first = i; last = i; }
  if (first < 0 || last < first) return null;

  const smooth = (i: number) =>
    (covered[Math.max(0, i - 1)] + covered[i] + covered[Math.min(n - 1, i + 1)]) / 3;
  const span = last - first;
  const half = step / 2;
  const topY = ys[first] - half;
  const bottomY = ys[last] + half;

  let xIdx = -1;
  let bestJump = max * 0.15;
  const jumpEnd = Math.min(last, first + Math.max(1, Math.round(span * 0.7)));
  for (let i = first + 1; i <= jumpEnd; i++) {
    const d = smooth(i) - smooth(i - 1);
    if (d > bestJump) { bestJump = d; xIdx = i; }
  }

  let baseIdx = -1;
  let bestDrop = max * 0.15;
  const dropStart = first + Math.max(1, Math.round(span * 0.3));
  for (let i = dropStart; i <= last; i++) {
    const d = smooth(i - 1) - smooth(i);
    if (d > bestDrop) { bestDrop = d; baseIdx = i; }
  }

  const baselineY = baseIdx > 0 ? ys[baseIdx] - half : bottomY;
  let xY = xIdx > 0 ? ys[xIdx] - half : null;
  if (xY !== null && (xY <= topY + EPS || xY >= baselineY - EPS)) xY = null;
  const capHeight = baselineY - topY;
  return {
    topY, xY, baselineY, bottomY,
    capHeight,
    xHeight: xY === null ? null : baselineY - xY,
  };
}

// ---------------------------------------------------------------------------
// The shared wordmark scan
// ---------------------------------------------------------------------------

export interface LetterCell {
  index: number;
  /** Ink extent along x. */
  left: number;
  right: number;
  width: number;
  /** Ink extent along y (this letter only). */
  top: number;
  bottom: number;
  height: number;
  /** Ink area, in square px. */
  area: number;
  /** Height band of this letter alone. */
  band: HeightBand | null;
}

export interface LetterGap {
  /** Index of the letter on the left of the gap. */
  index: number;
  left: number;
  right: number;
  width: number;
}

export interface WordmarkScan {
  box: Box;
  /** Rows over the whole box (runs are x intervals). */
  rows: InkScan;
  /** Columns over the whole box (`ys` are x positions, runs are y intervals). */
  cols: InkScan;
  letters: LetterCell[];
  gaps: LetterGap[];
  /** Height band of the whole drawing. */
  band: HeightBand | null;
  /** Total ink area, in square px. */
  area: number;
}

/** Ink covered by `runs` inside [x0, x1]. */
export function coverageInRange(runs: Run[], x0: number, x1: number): number {
  let sum = 0;
  for (const r of runs) {
    const a = Math.max(r[0], x0);
    const b = Math.min(r[1], x1);
    if (b > a) sum += b - a;
  }
  return sum;
}

/** Per-row coverage restricted to a column range (one letter or one word). */
export function profileInRange(rows: InkScan, x0: number, x1: number): number[] {
  return rows.runs.map(runs => coverageInRange(runs, x0, x1));
}

function rowCount(box: Box): number {
  return Math.max(24, Math.min(256, Math.round(box.height * 2)));
}
function colCount(box: Box): number {
  return Math.max(24, Math.min(512, Math.round(box.width * 2)));
}

/**
 * Split the column profile into letters. Columns with no ink separate two
 * letters only when the empty run is wide enough to read as spacing, so a
 * one-column sliver inside a glyph does not cut it in half.
 */
export function segmentLetters(cols: InkScan, rows: InkScan, minGap: number): { letters: LetterCell[]; gaps: LetterGap[] } {
  const n = cols.ys.length;
  const half = cols.step / 2;
  const spans: Array<{ a: number; b: number }> = [];
  let start = -1;
  for (let i = 0; i < n; i++) {
    const ink = cols.covered[i] > EPS;
    if (ink && start < 0) start = i;
    if (!ink && start >= 0) { spans.push({ a: start, b: i - 1 }); start = -1; }
  }
  if (start >= 0) spans.push({ a: start, b: n - 1 });
  if (!spans.length) return { letters: [], gaps: [] };

  // Merge spans separated by a gap narrower than `minGap`.
  const merged: Array<{ a: number; b: number }> = [spans[0]];
  for (let i = 1; i < spans.length; i++) {
    const prev = merged[merged.length - 1];
    const gap = (cols.ys[spans[i].a] - half) - (cols.ys[prev.b] + half);
    if (gap < minGap) prev.b = spans[i].b;
    else merged.push(spans[i]);
  }

  const letters: LetterCell[] = [];
  for (const span of merged) {
    if (letters.length >= MAX_LETTERS) break;
    const left = cols.ys[span.a] - half;
    const right = cols.ys[span.b] + half;
    let top = Infinity;
    let bottom = -Infinity;
    let area = 0;
    for (let i = span.a; i <= span.b; i++) {
      for (const r of cols.runs[i]) {
        if (r[0] < top) top = r[0];
        if (r[1] > bottom) bottom = r[1];
      }
      area += cols.covered[i] * cols.step;
    }
    if (!Number.isFinite(top) || !Number.isFinite(bottom) || !(bottom > top)) continue;
    const profile = profileInRange(rows, left, right);
    letters.push({
      index: letters.length,
      left, right, width: right - left,
      top, bottom, height: bottom - top,
      area,
      band: bandFromProfile(rows.ys, profile, rows.step),
    });
  }

  const gaps: LetterGap[] = [];
  for (let i = 0; i < letters.length - 1; i++) {
    const a = letters[i].right;
    const b = letters[i + 1].left;
    if (b > a) gaps.push({ index: i, left: a, right: b, width: b - a });
  }
  return { letters, gaps };
}

const scanCache = new WeakMap<object, Map<string, WordmarkScan | null>>();

/**
 * The one scan every construction in this file shares. Returns null when the
 * drawing has no usable ink or looks like texture rather than lettering.
 */
export function wordmarkScan(paths: paper.Item[] | undefined, box: Box | null): WordmarkScan | null {
  if (!paths || !paths.length || !box) return null;
  const key = `${box.x}|${box.y}|${box.width}|${box.height}`;
  const bucket = scanCache.get(paths as unknown as object);
  if (bucket && bucket.has(key)) return bucket.get(key) ?? null;
  const result = computeWordmarkScan(paths, box);
  const map = bucket ?? new Map<string, WordmarkScan | null>();
  map.set(key, result);
  scanCache.set(paths as unknown as object, map);
  return result;
}

function computeWordmarkScan(paths: paper.Item[], box: Box): WordmarkScan | null {
  const shapes = inkShapes(paths);
  if (!shapes.length) return null;
  const rows = scanInk(shapes, box, rowCount(box));
  const colBox: Box = { x: box.y, y: box.x, width: box.height, height: box.width };
  const cols = scanInk(transposeShapes(shapes), colBox, colCount(box));
  const area = rows.covered.reduce((s, v) => s + v, 0) * rows.step;
  if (!(area > 0)) return null;
  const minGap = Math.max(cols.step * 1.5, box.height * 0.015);
  const { letters, gaps } = segmentLetters(cols, rows, minGap);
  if (!letters.length) return null;
  return {
    box, rows, cols, letters, gaps, area,
    band: bandFromProfile(rows.ys, rows.covered, rows.step),
  };
}

/** The scan for the context the pipeline hands a renderer. */
function scanOf(bounds: paper.Rectangle, context?: RenderContext): WordmarkScan | null {
  const paths = context?.actualPaths;
  if (!paths || !paths.length) return null;
  return wordmarkScan(paths, boxOf(context?.contentBounds ?? bounds));
}

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------

interface Ink {
  strong: paper.Color;
  mid: paper.Color;
  faint: paper.Color;
  wash: paper.Color;
}

function inkOf(style: StyleConfig): Ink {
  return {
    strong: hexToColor(style.color, style.opacity),
    mid: hexToColor(style.color, style.opacity * 0.6),
    faint: hexToColor(style.color, style.opacity * 0.32),
    wash: hexToColor(style.color, style.opacity * 0.14),
  };
}

function line(a: Pt2, b: Pt2, color: paper.Color, width: number, dash?: number[]): paper.Path | null {
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
  const path = new paper.Path.Line(new paper.Point(a.x, a.y), new paper.Point(b.x, b.y));
  path.strokeColor = color;
  path.strokeWidth = width;
  if (dash && dash.length) path.dashArray = dash;
  return path;
}

function rect(box: { x: number; y: number; width: number; height: number }, stroke: paper.Color | null, fill: paper.Color | null, width: number, dash?: number[]): paper.Path | null {
  if (![box.x, box.y, box.width, box.height].every(Number.isFinite)) return null;
  if (!(box.width > 0) || !(box.height > 0)) return null;
  const path = new paper.Path.Rectangle(new paper.Rectangle(box.x, box.y, box.width, box.height));
  path.strokeColor = stroke;
  path.fillColor = fill;
  if (stroke) path.strokeWidth = width;
  if (dash && dash.length) path.dashArray = dash;
  return path;
}

function text(x: number, y: number, content: string, color: paper.Color, size: number, just: 'left' | 'center' | 'right' = 'left', bold = false): paper.PointText | null {
  if (!content || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const t = new paper.PointText(new paper.Point(x, y));
  t.content = content;
  t.fillColor = color;
  t.fontSize = size;
  t.justification = just;
  if (bold) t.fontWeight = 'bold';
  return t;
}

/**
 * Reserved row of each construction's summary line. Ten of these can be on at
 * once and, without a slot each, they would all land on the same baseline
 * above the artwork and turn into one illegible smear. Slot 0 sits closest to
 * the box; the list reads upwards from there.
 */
export const SUMMARY_SLOT = {
  wordBaselines: 0,
  letterHeights: 1,
  letterRhythm: 2,
  letterAxes: 3,
  letterStemWidth: 4,
  opticalEdges: 5,
  counterAreas: 6,
  densityCurve: 7,
  signatureRelation: 8,
  xHeightGrid: 9,
} as const;

/** The one-line reading a construction leaves above the artwork. */
function summaryLine(box: Box, m: GuideMetrics, color: paper.Color, slot: number, content: string): void {
  const size = m.font(10);
  text(box.x, box.y - m.len(6) - slot * size * 1.4, content, color, size, 'left', true);
}

/** Area label in the same unit system as `formatLength` ("u²" or "px²"). */
export function formatArea(px2: number, context?: RenderContext): string {
  const k = context?.unitsPerPixel;
  if (!Number.isFinite(px2) || px2 < 0) return '—';
  if (k && Number.isFinite(k) && k > 0) {
    const v = px2 * k * k;
    return `${v >= 100 ? Math.round(v) : Number(v.toFixed(v >= 10 ? 1 : 2))}u²`;
  }
  return `${Math.round(px2)}px²`;
}

function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Index of the scan line nearest `v` (both scans are evenly spaced). */
function nearestIndex(values: number[], v: number): number {
  if (!values.length) return -1;
  const step = values.length > 1 ? values[1] - values[0] : 1;
  if (!(step > 0)) return 0;
  return Math.max(0, Math.min(values.length - 1, Math.round((v - values[0]) / step)));
}

function runAt(runs: Run[], v: number): Run | null {
  for (const r of runs) if (v >= r[0] - EPS && v <= r[1] + EPS) return r;
  return null;
}

// ---------------------------------------------------------------------------
// 1. Top line and baseline, per word
// ---------------------------------------------------------------------------

export interface WordGroup {
  from: number;
  to: number;
  left: number;
  right: number;
  band: HeightBand | null;
}

/**
 * Letters grouped into words: a gap wide enough compared with the typical
 * letter gap is a word space. A wordmark with even spacing stays one group,
 * which is the honest answer.
 */
export function groupWords(scan: WordmarkScan): WordGroup[] {
  const { letters, gaps, rows } = scan;
  if (!letters.length) return [];
  const widths = gaps.map(g => g.width);
  const typical = widths.length ? median(widths) : 0;
  const xh = scan.band?.xHeight ?? scan.band?.capHeight ?? scan.box.height;
  const threshold = Math.max(typical * 1.8, xh * 0.4);
  const groups: WordGroup[] = [];
  let from = 0;
  for (let i = 0; i < letters.length; i++) {
    const gap = gaps.find(g => g.index === i);
    const isLast = i === letters.length - 1;
    if (isLast || (gap && gap.width >= threshold)) {
      const left = letters[from].left;
      const right = letters[i].right;
      groups.push({ from, to: i, left, right, band: bandFromProfile(rows.ys, profileInRange(rows, left, right), rows.step) });
      from = i + 1;
    }
  }
  return groups;
}

export function renderWordBaselines(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan || !scan.band) return;
  const words = groupWords(scan);
  if (!words.length) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(9);
  const over = m.len(8);
  const budget = new ItemBudget();

  // Reference: the baseline of the whole drawing, so a word that sits off it
  // is obvious even before reading the number.
  line(
    { x: scan.box.x - over * 2, y: scan.band.baselineY },
    { x: scan.box.x + scan.box.width + over * 2, y: scan.band.baselineY },
    ink.faint, m.stroke(style.strokeWidth * 0.8), m.dash(2, 4),
  );

  for (const word of words.slice(0, 24)) {
    const band = word.band;
    if (!band) continue;
    if (!budget.take(4)) break;
    const left = word.left - over;
    const right = word.right + over;
    line({ x: left, y: band.topY }, { x: right, y: band.topY }, ink.strong, m.stroke(style.strokeWidth));
    line({ x: left, y: band.baselineY }, { x: right, y: band.baselineY }, ink.strong, m.stroke(style.strokeWidth * 1.2));
    line({ x: left, y: band.topY }, { x: left, y: band.baselineY }, ink.mid, m.stroke(style.strokeWidth * 0.6), m.dash(3, 3));
    line({ x: right, y: band.topY }, { x: right, y: band.baselineY }, ink.mid, m.stroke(style.strokeWidth * 0.6), m.dash(3, 3));

    const mid = (word.left + word.right) / 2;
    text(mid, band.topY - m.len(3), `topo ${formatLength(band.capHeight, context)}`, ink.strong, font, 'center', true);

    const drift = band.baselineY - scan.band.baselineY;
    const tol = Math.max(scan.rows.step, scan.band.capHeight * 0.005);
    text(
      mid, band.baselineY + font * 1.5,
      Math.abs(drift) > tol
        ? `base ${drift > 0 ? '+' : '−'}${formatLength(Math.abs(drift), context)} fora da linha`
        : 'base alinhada',
      Math.abs(drift) > tol ? ink.strong : ink.mid, font, 'center', Math.abs(drift) > tol,
    );
  }

  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.wordBaselines,
    words.length > 1 ? `${words.length} palavras · base comum` : 'palavra única');
}

// ---------------------------------------------------------------------------
// 2. Cap / x / ascender / descender height, per letter
// ---------------------------------------------------------------------------

export type LetterClass = 'cap' | 'asc' | 'x' | 'desc' | 'other';

/** How one letter's own band reads against the band of the whole drawing. */
export function classifyLetter(letter: LetterCell, whole: HeightBand, tol: number): LetterClass {
  if (!letter.band) return 'other';
  const below = letter.bottom > whole.baselineY + tol;
  if (below) return 'desc';
  const top = letter.top;
  if (whole.xY !== null && top >= whole.xY - tol) return 'x';
  if (top <= whole.topY + tol) return whole.xY !== null ? 'asc' : 'cap';
  return 'other';
}

const CLASS_LABEL: Record<LetterClass, string> = {
  cap: 'maiúscula', asc: 'ascendente', x: 'altura-x', desc: 'descendente', other: 'intermediária',
};

export function renderLetterHeights(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan || !scan.band) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const tick = m.len(4);
  const budget = new ItemBudget();
  const placer = new LabelPlacer(120);
  const tol = Math.max(scan.rows.step, scan.band.capHeight * 0.03);
  const over = m.len(10);

  // Reference lines of the whole set, so the per-letter bars have something
  // to be read against.
  const refs: Array<[number, string]> = [
    [scan.band.topY, 'topo'],
    [scan.band.baselineY, 'base'],
  ];
  if (scan.band.xY !== null) refs.push([scan.band.xY, 'x']);
  if (scan.band.bottomY > scan.band.baselineY + tol) refs.push([scan.band.bottomY, 'desc']);
  for (const [y, name] of refs) {
    line({ x: scan.box.x - over, y }, { x: scan.box.x + scan.box.width + over, y }, ink.faint, m.stroke(style.strokeWidth * 0.7), m.dash(3, 4));
    text(scan.box.x - over - m.len(2), y + font * 0.35, name, ink.mid, font, 'right');
  }

  for (const letter of scan.letters) {
    if (!budget.take(4)) break;
    const cx = (letter.left + letter.right) / 2;
    const cls = classifyLetter(letter, scan.band, tol);
    const strong = cls === 'desc' || cls === 'asc';
    const color = strong ? ink.strong : ink.mid;
    line({ x: cx, y: letter.top }, { x: cx, y: letter.bottom }, color, m.stroke(style.strokeWidth * (strong ? 1.2 : 0.8)));
    line({ x: cx - tick, y: letter.top }, { x: cx + tick, y: letter.top }, color, m.stroke(style.strokeWidth));
    line({ x: cx - tick, y: letter.bottom }, { x: cx + tick, y: letter.bottom }, color, m.stroke(style.strokeWidth));

    const own = letter.band;
    const height = own ? own.baselineY - own.topY : letter.height;
    placer.place(cx, letter.top - m.len(3), formatLength(height, context), {
      size: font, color: ink.strong, justification: 'center', bold: true, prefer: 'up',
    });
    placer.place(cx, letter.bottom + font * 1.5, CLASS_LABEL[cls], {
      size: font, color, justification: 'center', prefer: 'down',
    });
  }

  const summary = scan.band.xHeight !== null
    ? `x/cap ${Math.round((scan.band.xHeight / scan.band.capHeight) * 100)}% · ${scan.letters.length} letras`
    : `cap ${formatLength(scan.band.capHeight, context)} · ${scan.letters.length} letras`;
  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.letterHeights, summary);
}

// ---------------------------------------------------------------------------
// 3. Rhythm: the width of every gap between letters
// ---------------------------------------------------------------------------

export function renderLetterRhythm(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan || scan.gaps.length === 0) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const budget = new ItemBudget();
  const widths = scan.gaps.map(g => g.width);
  const mid = median(widths);
  let tightest = scan.gaps[0];
  let loosest = scan.gaps[0];
  for (const g of scan.gaps) {
    if (g.width < tightest.width) tightest = g;
    if (g.width > loosest.width) loosest = g;
  }

  const top = scan.band?.topY ?? scan.box.y;
  const bottom = scan.band?.baselineY ?? scan.box.y + scan.box.height;
  const cy = (top + bottom) / 2;
  const arm = m.len(3);

  for (const gap of scan.gaps) {
    if (!budget.take(6)) break;
    const extreme = gap === tightest || gap === loosest;
    const color = extreme ? ink.strong : ink.mid;
    rect({ x: gap.left, y: top, width: gap.width, height: bottom - top }, null, extreme ? ink.wash : null, 0);
    line({ x: gap.left, y: top }, { x: gap.left, y: bottom }, color, m.stroke(style.strokeWidth * 0.7), m.dash(3, 3));
    line({ x: gap.right, y: top }, { x: gap.right, y: bottom }, color, m.stroke(style.strokeWidth * 0.7), m.dash(3, 3));
    // Double arrow across the gap.
    line({ x: gap.left, y: cy }, { x: gap.right, y: cy }, color, m.stroke(style.strokeWidth * (extreme ? 1.4 : 0.9)));
    line({ x: gap.left, y: cy - arm }, { x: gap.left, y: cy + arm }, color, m.stroke(style.strokeWidth));
    line({ x: gap.right, y: cy - arm }, { x: gap.right, y: cy + arm }, color, m.stroke(style.strokeWidth));
    text((gap.left + gap.right) / 2, cy - m.len(3), formatLength(gap.width, context), color, font, 'center', extreme);
  }

  if (scan.gaps.length > 1) {
    text((tightest.left + tightest.right) / 2, bottom + font * 1.6, 'mais apertado', ink.strong, font, 'center', true);
    text((loosest.left + loosest.right) / 2, bottom + font * 2.9, 'mais folgado', ink.strong, font, 'center', true);
  }
  const spread = mid > 0 ? ((loosest.width - tightest.width) / mid) * 100 : 0;
  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.letterRhythm,
    `ritmo ${formatLength(tightest.width, context)} → ${formatLength(loosest.width, context)} · variação ${Math.round(spread)}%`);
}

// ---------------------------------------------------------------------------
// 4. The fitted vertical axis of each letter
// ---------------------------------------------------------------------------

export interface LetterAxis {
  index: number;
  /** x of the axis at the top and at the bottom of the measured band. */
  topX: number;
  bottomX: number;
  topY: number;
  bottomY: number;
  /** Degrees off vertical; positive leans right at the top, like an italic. */
  angle: number;
}

/**
 * Least-squares fit of the horizontal ink centroid against y. The middle of
 * the band only (15%..85%), so serifs, terminals and the flat top of a glyph
 * do not drag the axis.
 */
export function fitLetterAxis(scan: WordmarkScan, letter: LetterCell): LetterAxis | null {
  const rows = scan.rows;
  const from = letter.top + letter.height * 0.15;
  const to = letter.bottom - letter.height * 0.15;
  let n = 0, sy = 0, sx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < rows.ys.length; i++) {
    const y = rows.ys[i];
    if (y < from || y > to) continue;
    let weight = 0;
    let acc = 0;
    for (const r of rows.runs[i]) {
      const a = Math.max(r[0], letter.left);
      const b = Math.min(r[1], letter.right);
      if (b <= a) continue;
      const w = b - a;
      acc += ((a + b) / 2) * w;
      weight += w;
    }
    if (!(weight > 0)) continue;
    const x = acc / weight;
    n++; sy += y; sx += x; syy += y * y; sxy += y * x;
  }
  if (n < 4) return null;
  const denom = n * syy - sy * sy;
  if (!(Math.abs(denom) > EPS)) return null;
  const slope = (n * sxy - sy * sx) / denom;
  const intercept = (sx - slope * sy) / n;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  const at = (y: number) => intercept + slope * y;
  return {
    index: letter.index,
    topY: from, bottomY: to,
    topX: at(from), bottomX: at(to),
    // Going down the glyph, x grows to the right; an italic leans the other way.
    angle: -(Math.atan(slope) * 180) / Math.PI,
  };
}

export function renderLetterAxes(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan) return;
  const axes: LetterAxis[] = [];
  for (const letter of scan.letters) {
    const axis = fitLetterAxis(scan, letter);
    if (axis) axes.push(axis);
  }
  if (!axes.length) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const budget = new ItemBudget();
  const mid = median(axes.map(a => a.angle));
  const worst = axes.reduce((a, b) => (Math.abs(b.angle - mid) > Math.abs(a.angle - mid) ? b : a), axes[0]);
  const tol = 0.75;

  for (const axis of axes) {
    if (!budget.take(3)) break;
    const off = Math.abs(axis.angle - mid) > tol;
    const color = off ? ink.strong : ink.mid;
    line({ x: axis.topX, y: axis.topY }, { x: axis.bottomX, y: axis.bottomY }, color, m.stroke(style.strokeWidth * (off ? 1.3 : 0.9)));
    // Median axis through the same letter, for comparison.
    const cx = (axis.topX + axis.bottomX) / 2;
    const cy = (axis.topY + axis.bottomY) / 2;
    const h = (axis.bottomY - axis.topY) / 2;
    const dx = Math.tan((-mid * Math.PI) / 180) * h;
    line({ x: cx - dx, y: cy - h }, { x: cx + dx, y: cy + h }, ink.faint, m.stroke(style.strokeWidth * 0.6), m.dash(2, 3));
    if (off) {
      text(axis.topX, axis.topY - m.len(3), `${axis.angle > 0 ? '+' : ''}${axis.angle.toFixed(1)}°`, color, font, 'center', true);
    }
  }

  const spread = Math.abs(worst.angle - mid);
  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.letterAxes,
    spread > tol
      ? `eixo mediano ${mid.toFixed(1)}° · desvio máx ${spread.toFixed(1)}°`
      : `eixo consistente ${mid.toFixed(1)}°`);
}

// ---------------------------------------------------------------------------
// 5. Stem width, per letter
// ---------------------------------------------------------------------------

export interface LetterStem {
  index: number;
  min: number;
  median: number;
  samples: number;
}

/**
 * Local thickness through a point = min(horizontal run, vertical run): a
 * crossbar has long horizontal runs but short vertical ones, so the minimum
 * of the two is the real stem.
 */
export function measureLetterStems(scan: WordmarkScan): LetterStem[] {
  const out: LetterStem[] = [];
  for (const letter of scan.letters) {
    const samples: number[] = [];
    for (let i = 0; i < scan.rows.ys.length; i++) {
      const y = scan.rows.ys[i];
      for (const r of scan.rows.runs[i]) {
        const a = Math.max(r[0], letter.left);
        const b = Math.min(r[1], letter.right);
        if (!(b > a)) continue;
        const x = (a + b) / 2;
        const j = nearestIndex(scan.cols.ys, x);
        if (j < 0) continue;
        const vertical = runAt(scan.cols.runs[j], y);
        const t = Math.min(b - a, vertical ? vertical[1] - vertical[0] : Infinity);
        if (Number.isFinite(t) && t > 0) samples.push(t);
      }
    }
    if (!samples.length) continue;
    out.push({ index: letter.index, min: Math.min(...samples), median: median(samples), samples: samples.length });
  }
  return out;
}

export function renderLetterStemWidth(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan) return;
  const stems = measureLetterStems(scan);
  if (!stems.length) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const budget = new ItemBudget();
  const thinnest = stems.reduce((a, b) => (b.median < a.median ? b : a), stems[0]);
  const thickest = stems.reduce((a, b) => (b.median > a.median ? b : a), stems[0]);
  const maxMedian = thickest.median > 0 ? thickest.median : 1;

  const baseY = (scan.band?.bottomY ?? scan.box.y + scan.box.height) + m.len(10);
  const barMax = Math.max(m.len(6), scan.box.height * 0.16);

  for (const stem of stems) {
    const letter = scan.letters[stem.index];
    if (!letter) continue;
    if (!budget.take(3)) break;
    const extreme = stem === thinnest || stem === thickest;
    const color = extreme ? ink.strong : ink.mid;
    const h = (stem.median / maxMedian) * barMax;
    const w = Math.max(letter.width * 0.5, m.len(2));
    const cx = (letter.left + letter.right) / 2;
    rect({ x: cx - w / 2, y: baseY, width: w, height: h }, color, extreme ? ink.wash : null, m.stroke(style.strokeWidth * 0.8));
    text(cx, baseY + h + font * 1.4, formatLength(stem.median, context), color, font, 'center', extreme);
    // The measured thickness drawn at real size on the letter itself.
    const markY = letter.top + letter.height * 0.5;
    line({ x: cx - stem.median / 2, y: markY }, { x: cx + stem.median / 2, y: markY }, color, m.stroke(style.strokeWidth * 2));
  }

  const contrast = thinnest.median > 0 ? thickest.median / thinnest.median : 0;
  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.letterStemWidth,
    `haste ${formatLength(thinnest.median, context)} → ${formatLength(thickest.median, context)} · contraste ${contrast.toFixed(2)}×`);
}

// ---------------------------------------------------------------------------
// 6. Optical edges against the geometric bounding box
// ---------------------------------------------------------------------------

export interface OpticalEdges {
  left: number; right: number; top: number; bottom: number;
  geomLeft: number; geomRight: number; geomTop: number; geomBottom: number;
}

/**
 * The optical edge is where the ink actually starts to count: the position at
 * which the accumulated ink from that side reaches `fraction` of the total.
 * A round letter overshoots the geometric edge by design, and this is the
 * construction that shows by how much.
 */
export function opticalEdgesOf(scan: WordmarkScan, fraction = 0.02): OpticalEdges | null {
  const total = scan.area;
  if (!(total > 0)) return null;
  const sweep = (positions: number[], weight: number[], step: number, reverse: boolean): number => {
    const target = total * fraction / step;
    let acc = 0;
    const order = reverse ? [...positions.keys()].reverse() : [...positions.keys()];
    for (const i of order) {
      acc += weight[i];
      if (acc >= target) return positions[i] + (reverse ? step / 2 : -step / 2);
    }
    return reverse ? positions[positions.length - 1] : positions[0];
  };
  const inkAt = (positions: number[], weight: number[], reverse: boolean): number => {
    const order = reverse ? [...positions.keys()].reverse() : [...positions.keys()];
    for (const i of order) if (weight[i] > EPS) return positions[i];
    return reverse ? positions[positions.length - 1] : positions[0];
  };
  const { cols, rows } = scan;
  return {
    left: sweep(cols.ys, cols.covered, cols.step, false),
    right: sweep(cols.ys, cols.covered, cols.step, true),
    top: sweep(rows.ys, rows.covered, rows.step, false),
    bottom: sweep(rows.ys, rows.covered, rows.step, true),
    geomLeft: inkAt(cols.ys, cols.covered, false) - cols.step / 2,
    geomRight: inkAt(cols.ys, cols.covered, true) + cols.step / 2,
    geomTop: inkAt(rows.ys, rows.covered, false) - rows.step / 2,
    geomBottom: inkAt(rows.ys, rows.covered, true) + rows.step / 2,
  };
}

export function renderOpticalEdges(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan) return;
  const edges = opticalEdgesOf(scan);
  if (!edges) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const over = m.len(12);
  const box = scan.box;
  const tol = Math.hypot(box.width, box.height) * 0.002;

  const vertical = (x: number, color: paper.Color, dash?: number[]) =>
    line({ x, y: box.y - over }, { x, y: box.y + box.height + over }, color, m.stroke(style.strokeWidth * (dash ? 0.7 : 1.1)), dash);
  const horizontal = (y: number, color: paper.Color, dash?: number[]) =>
    line({ x: box.x - over, y }, { x: box.x + box.width + over, y }, color, m.stroke(style.strokeWidth * (dash ? 0.7 : 1.1)), dash);

  vertical(edges.geomLeft, ink.faint, m.dash(3, 3));
  vertical(edges.geomRight, ink.faint, m.dash(3, 3));
  horizontal(edges.geomTop, ink.faint, m.dash(3, 3));
  horizontal(edges.geomBottom, ink.faint, m.dash(3, 3));
  vertical(edges.left, ink.strong);
  vertical(edges.right, ink.strong);
  horizontal(edges.top, ink.strong);
  horizontal(edges.bottom, ink.strong);

  const overshoot: Array<[string, number, number, number, 'v' | 'h']> = [
    ['esquerda', edges.left - edges.geomLeft, edges.geomLeft, box.y + box.height + over, 'v'],
    ['direita', edges.geomRight - edges.right, edges.geomRight, box.y + box.height + over, 'v'],
    ['topo', edges.top - edges.geomTop, box.x + box.width + over, edges.geomTop, 'h'],
    ['base', edges.geomBottom - edges.bottom, box.x + box.width + over, edges.geomBottom, 'h'],
  ];
  for (const [name, value, x, y, axis] of overshoot) {
    if (!(value > tol)) continue;
    rect(
      axis === 'v'
        ? { x: Math.min(x, x + (name === 'esquerda' ? value : -value)), y: box.y, width: value, height: box.height }
        : { x: box.x, y: Math.min(y, y + (name === 'topo' ? value : -value)), width: box.width, height: value },
      null, ink.wash, 0,
    );
    text(x, y + font * (axis === 'v' ? 1.4 : 0.35), `${name} ${formatLength(value, context)}`, ink.strong, font, axis === 'v' ? 'center' : 'left', true);
  }

  // The first and the last letter carry the side bearings, so they get the
  // per-letter reading a designer actually adjusts.
  const first = scan.letters[0];
  const last = scan.letters[scan.letters.length - 1];
  if (first && last && first !== last) {
    const leftBearing = first.left - edges.geomLeft;
    const rightBearing = edges.geomRight - last.right;
    text(
      box.x, box.y + box.height + m.len(over > 0 ? 26 : 20),
      `laterais ${formatLength(Math.max(0, leftBearing), context)} / ${formatLength(Math.max(0, rightBearing), context)}`,
      ink.mid, font, 'left',
    );
  }

  summaryLine(box, m, ink.strong, SUMMARY_SLOT.opticalEdges,
    `borda óptica recua ${formatLength(Math.max(0, edges.left - edges.geomLeft), context)} à esquerda`);
}

// ---------------------------------------------------------------------------
// 7. Counters: the enclosed space inside each letter
// ---------------------------------------------------------------------------

export interface Counter {
  letter: number;
  area: number;
  box: Box;
  center: Pt2;
}

/**
 * Enclosed counters, found on the scan itself: the empty runs BETWEEN two ink
 * runs of the same letter are horizontally enclosed by definition; joining
 * them across rows and dropping every region that reaches the top or the
 * bottom of the letter leaves only the closed ones. The gap between the two
 * stems of an H reaches both ends and is correctly not counted.
 */
export function detectCounters(scan: WordmarkScan, letter: LetterCell): Counter[] {
  const rows = scan.rows;
  const step = rows.step;
  const cells: Array<{ row: number; a: number; b: number; parent: number }> = [];
  const rowStart: number[] = [];
  const rowEnd: number[] = [];
  let firstRow = -1;
  let lastRow = -1;

  for (let i = 0; i < rows.ys.length; i++) {
    rowStart[i] = cells.length;
    const clipped: Run[] = [];
    for (const r of rows.runs[i]) {
      const a = Math.max(r[0], letter.left);
      const b = Math.min(r[1], letter.right);
      if (b > a) clipped.push([a, b]);
    }
    if (clipped.length) { if (firstRow < 0) firstRow = i; lastRow = i; }
    for (let k = 0; k < clipped.length - 1; k++) {
      cells.push({ row: i, a: clipped[k][1], b: clipped[k + 1][0], parent: cells.length });
    }
    rowEnd[i] = cells.length;
  }
  if (firstRow < 0 || !cells.length) return [];

  const find = (i: number): number => {
    let r = i;
    while (cells[r].parent !== r) r = cells[r].parent;
    while (cells[i].parent !== r) { const next = cells[i].parent; cells[i].parent = r; i = next; }
    return r;
  };
  const union = (i: number, j: number) => {
    const a = find(i), b = find(j);
    if (a !== b) cells[a].parent = b;
  };
  for (let i = 1; i < rows.ys.length; i++) {
    for (let p = rowStart[i - 1]; p < rowEnd[i - 1]; p++) {
      for (let q = rowStart[i]; q < rowEnd[i]; q++) {
        if (cells[p].a < cells[q].b - EPS && cells[q].a < cells[p].b - EPS) union(p, q);
      }
    }
  }

  const groups = new Map<number, { area: number; left: number; right: number; top: number; bottom: number; open: boolean; wx: number; wy: number }>();
  for (let i = 0; i < cells.length; i++) {
    const root = find(i);
    const cell = cells[i];
    const w = cell.b - cell.a;
    const y = rows.ys[cell.row];
    const g = groups.get(root);
    const open = cell.row <= firstRow || cell.row >= lastRow;
    if (!g) {
      groups.set(root, { area: w * step, left: cell.a, right: cell.b, top: y - step / 2, bottom: y + step / 2, open, wx: ((cell.a + cell.b) / 2) * w, wy: y * w });
    } else {
      g.area += w * step;
      g.left = Math.min(g.left, cell.a);
      g.right = Math.max(g.right, cell.b);
      g.top = Math.min(g.top, y - step / 2);
      g.bottom = Math.max(g.bottom, y + step / 2);
      g.open = g.open || open;
      g.wx += ((cell.a + cell.b) / 2) * w;
      g.wy += y * w;
    }
  }

  const out: Counter[] = [];
  const floor = letter.area * 0.01;
  groups.forEach(g => {
    if (g.open || !(g.area > floor)) return;
    const weight = g.area / step;
    out.push({
      letter: letter.index,
      area: g.area,
      box: { x: g.left, y: g.top, width: g.right - g.left, height: g.bottom - g.top },
      center: { x: weight > 0 ? g.wx / weight : (g.left + g.right) / 2, y: weight > 0 ? g.wy / weight : (g.top + g.bottom) / 2 },
    });
  });
  return out.sort((a, b) => a.area - b.area);
}

export function renderCounterAreas(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan) return;
  const counters: Counter[] = [];
  for (const letter of scan.letters) {
    for (const c of detectCounters(scan, letter)) {
      counters.push(c);
      if (counters.length >= MAX_COUNTERS) break;
    }
    if (counters.length >= MAX_COUNTERS) break;
  }
  if (!counters.length) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const budget = new ItemBudget();
  const smallest = counters.reduce((a, b) => (b.area < a.area ? b : a), counters[0]);
  const placer = new LabelPlacer(80);

  for (const counter of counters) {
    if (!budget.take(3)) break;
    const tight = counter === smallest;
    const color = tight ? ink.strong : ink.mid;
    rect(counter.box, color, tight ? ink.wash : null, m.stroke(style.strokeWidth * (tight ? 1.2 : 0.7)), tight ? undefined : m.dash(3, 3));
    const dot = new paper.Path.Circle(new paper.Point(counter.center.x, counter.center.y), m.dot(1.6));
    dot.fillColor = color;
    dot.strokeColor = null;
    placer.place(counter.center.x, counter.center.y + font * 0.35, formatArea(counter.area, context), {
      size: font, color, justification: 'center', bold: tight,
    });
  }

  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.counterAreas,
    `${counters.length} contraforma${counters.length > 1 ? 's' : ''} · menor ${formatArea(smallest.area, context)}`);
}

// ---------------------------------------------------------------------------
// 8. Horizontal density curve
// ---------------------------------------------------------------------------

export function renderDensityCurve(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan) return;
  const { cols, box } = scan;
  const n = cols.ys.length;
  if (n < 4) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const stride = Math.max(1, Math.ceil(n / MAX_DENSITY_SAMPLES));
  const height = Math.max(m.len(12), box.height * 0.22);
  // Below the band the per-letter stem bars use, so the two panels under the
  // artwork read as two panels and not as one tangle.
  const baseY = box.y + box.height + box.height * 0.26 + m.len(18) + height;
  let peak = 0;
  for (const v of cols.covered) if (v > peak) peak = v;
  if (!(peak > 0)) return;
  const mean = cols.covered.reduce((s, v) => s + v, 0) / n;

  const points: paper.Point[] = [];
  for (let i = 0; i < n; i += stride) {
    const x = cols.ys[i];
    const y = baseY - (cols.covered[i] / peak) * height;
    if (Number.isFinite(x) && Number.isFinite(y)) points.push(new paper.Point(x, y));
  }
  if (points.length < 2) return;

  const area = new paper.Path([
    new paper.Point(points[0].x, baseY),
    ...points,
    new paper.Point(points[points.length - 1].x, baseY),
  ]);
  area.closed = true;
  area.fillColor = ink.wash;
  area.strokeColor = null;

  const curve = new paper.Path(points);
  curve.strokeColor = ink.strong;
  curve.strokeWidth = m.stroke(style.strokeWidth * 1.2);
  curve.fillColor = null;

  line({ x: box.x, y: baseY }, { x: box.x + box.width, y: baseY }, ink.mid, m.stroke(style.strokeWidth * 0.8));
  const meanY = baseY - (mean / peak) * height;
  line({ x: box.x, y: meanY }, { x: box.x + box.width, y: meanY }, ink.faint, m.stroke(style.strokeWidth * 0.7), m.dash(3, 3));
  text(box.x + box.width + m.len(4), meanY + font * 0.35, 'média', ink.mid, font, 'left');

  let peakIndex = 0;
  for (let i = 1; i < n; i++) if (cols.covered[i] > cols.covered[peakIndex]) peakIndex = i;
  const peakX = cols.ys[peakIndex];
  line({ x: peakX, y: box.y }, { x: peakX, y: baseY }, ink.strong, m.stroke(style.strokeWidth), m.dash(2, 3));
  const peakDot = new paper.Path.Circle(new paper.Point(peakX, baseY - height), m.dot(2.2));
  peakDot.fillColor = ink.strong;
  peakDot.strokeColor = null;

  const at = box.width > 0 ? ((peakX - box.x) / box.width) * 100 : 0;
  summaryLine(box, m, ink.strong, SUMMARY_SLOT.densityCurve,
    `densidade máx a ${Math.round(at)}% da largura · pico/média ${(peak / (mean || 1)).toFixed(2)}×`);
}

// ---------------------------------------------------------------------------
// 9. Symbol vs text in a signature
// ---------------------------------------------------------------------------

export interface SignatureParts {
  symbol: Box;
  text: Box;
  /** True when the split came from the SVG components, not from the ink gaps. */
  fromComponents: boolean;
}

const rectToBox = (r: paper.Rectangle): Box => ({ x: r.left, y: r.top, width: r.width, height: r.height });

function unionBox(boxes: Box[]): Box | null {
  if (!boxes.length) return null;
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const box of boxes) {
    l = Math.min(l, box.x); t = Math.min(t, box.y);
    r = Math.max(r, box.x + box.width); b = Math.max(b, box.y + box.height);
  }
  if (![l, t, r, b].every(Number.isFinite) || !(r > l) || !(b > t)) return null;
  return { x: l, y: t, width: r - l, height: b - t };
}

/**
 * Symbol and text of a lockup. The SVG components win when they carry the
 * icon flag (that is what the "invert symbol" control edits); otherwise the
 * letters are split at the widest gap, and only when that gap really stands
 * out — a plain wordmark has no symbol and gets nothing drawn.
 */
export function splitSignature(scan: WordmarkScan, comps: paper.Rectangle[], isIcon: boolean[]): SignatureParts | null {
  const icons: Box[] = [];
  const rest: Box[] = [];
  for (let i = 0; i < comps.length; i++) {
    const box = rectToBox(comps[i]);
    if (!(box.width > 0) || !(box.height > 0)) continue;
    (isIcon[i] ? icons : rest).push(box);
  }
  if (icons.length && rest.length) {
    const symbol = unionBox(icons);
    const textBox = unionBox(rest);
    if (symbol && textBox) return { symbol, text: textBox, fromComponents: true };
  }

  if (scan.letters.length < 3 || scan.gaps.length < 2) return null;
  const widths = scan.gaps.map(g => g.width);
  const typical = median(widths);
  const widest = scan.gaps.reduce((a, b) => (b.width > a.width ? b : a), scan.gaps[0]);
  if (!(typical > 0) || widest.width < typical * 1.8) return null;
  const toBox = (from: number, to: number): Box | null => {
    const cells = scan.letters.slice(from, to + 1);
    return unionBox(cells.map(c => ({ x: c.left, y: c.top, width: c.width, height: c.height })));
  };
  const leftBox = toBox(0, widest.index);
  const rightBox = toBox(widest.index + 1, scan.letters.length - 1);
  if (!leftBox || !rightBox) return null;
  // The symbol is the compact side; the text is the long, low one.
  const leftIsSymbol = (leftBox.width / leftBox.height) < (rightBox.width / rightBox.height);
  return leftIsSymbol
    ? { symbol: leftBox, text: rightBox, fromComponents: false }
    : { symbol: rightBox, text: leftBox, fromComponents: false };
}

export function renderSignatureRelation(
  bounds: paper.Rectangle,
  comps: paper.Rectangle[],
  isIcon: boolean[],
  style: StyleConfig,
  context?: RenderContext,
): void {
  const scan = scanOf(bounds, context);
  if (!scan) return;
  const parts = splitSignature(scan, comps ?? [], isIcon ?? []);
  if (!parts) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(9);
  const { symbol, text: textBox } = parts;

  rect(symbol, ink.strong, null, m.stroke(style.strokeWidth), m.dash(4, 3));
  rect(textBox, ink.mid, null, m.stroke(style.strokeWidth * 0.8), m.dash(4, 3));

  // Height relation: the symbol against the MEASURED cap height of the text,
  // which is what a lockup is actually built on.
  const textBand = bandFromProfile(scan.rows.ys, profileInRange(scan.rows, textBox.x, textBox.x + textBox.width), scan.rows.step);
  const cap = textBand ? textBand.capHeight : textBox.height;
  const xh = textBand?.xHeight ?? cap * 0.52;
  const ratio = cap > 0 ? symbol.height / cap : 0;

  // Gap between the two parts, read in x-heights.
  const gapLeft = Math.min(symbol.x + symbol.width, textBox.x + textBox.width);
  const gapRight = Math.max(symbol.x, textBox.x);
  const gap = gapRight - gapLeft;
  const cy = (Math.max(symbol.y, textBox.y) + Math.min(symbol.y + symbol.height, textBox.y + textBox.height)) / 2;
  if (gap > 0 && Number.isFinite(cy)) {
    rect({ x: gapLeft, y: Math.min(symbol.y, textBox.y), width: gap, height: Math.max(symbol.height, textBox.height) }, null, ink.wash, 0);
    line({ x: gapLeft, y: cy }, { x: gapRight, y: cy }, ink.strong, m.stroke(style.strokeWidth * 1.3));
    text((gapLeft + gapRight) / 2, cy - m.len(3),
      xh > 0 ? `${formatLength(gap, context)} · ${(gap / xh).toFixed(2)}×x` : formatLength(gap, context),
      ink.strong, font, 'center', true);
  }

  // Alignment: optical centres and the text baseline carried across.
  const symbolCenter = symbol.y + symbol.height / 2;
  const textCenter = textBox.y + textBox.height / 2;
  const over = m.len(8);
  const left = Math.min(symbol.x, textBox.x) - over;
  const right = Math.max(symbol.x + symbol.width, textBox.x + textBox.width) + over;
  line({ x: left, y: symbolCenter }, { x: right, y: symbolCenter }, ink.mid, m.stroke(style.strokeWidth * 0.7), m.dash(2, 3));
  line({ x: left, y: textCenter }, { x: right, y: textCenter }, ink.faint, m.stroke(style.strokeWidth * 0.7), m.dash(2, 3));
  if (textBand) {
    line({ x: left, y: textBand.baselineY }, { x: right, y: textBand.baselineY }, ink.strong, m.stroke(style.strokeWidth));
    text(right + m.len(3), textBand.baselineY + font * 0.35, 'base do texto', ink.mid, m.font(8), 'left');
  }

  const drift = symbolCenter - textCenter;
  const tol = Math.max(scan.rows.step, cap * 0.01);
  summaryLine(scan.box, m, ink.strong, SUMMARY_SLOT.signatureRelation,
    `símbolo ${ratio.toFixed(2)}× a maiúscula · centros ${Math.abs(drift) > tol ? `${drift > 0 ? '+' : '−'}${formatLength(Math.abs(drift), context)}` : 'alinhados'}`
      + (parts.fromComponents ? '' : ' · separação pelo maior vão'));
}

// ---------------------------------------------------------------------------
// 10. Construction grid in multiples of the measured x-height
// ---------------------------------------------------------------------------

export function renderXHeightGrid(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext): void {
  const scan = scanOf(bounds, context);
  if (!scan || !scan.band) return;
  const band = scan.band;
  const unit = band.xHeight ?? (band.capHeight > 0 ? band.capHeight / 2 : 0);
  if (!(unit > 0)) return;

  const m = metricsFor(context, bounds);
  const ink = inkOf(style);
  const font = m.font(8);
  const budget = new ItemBudget();
  const box = scan.box;
  const over = m.len(8);
  const originX = scan.letters[0]?.left ?? box.x;
  const left = box.x - over;
  const right = box.x + box.width + over;
  const top = box.y - over;
  const bottom = box.y + box.height + over;

  // Rows: multiples of the x-height above and below the baseline.
  const up = Math.min(24, Math.ceil((band.baselineY - top) / unit));
  const down = Math.min(8, Math.ceil((bottom - band.baselineY) / unit));
  for (let k = -down; k <= up; k++) {
    if (!budget.take(2)) break;
    const y = band.baselineY - k * unit;
    if (y < top || y > bottom) continue;
    const major = k === 0 || k % 2 === 0;
    line({ x: left, y }, { x: right, y }, k === 0 ? ink.strong : major ? ink.mid : ink.faint,
      m.stroke(style.strokeWidth * (k === 0 ? 1.3 : major ? 0.8 : 0.6)), k === 0 ? undefined : m.dash(2, 4));
    if (major && k !== 0) text(left - m.len(2), y + font * 0.35, `${k}x`, ink.mid, font, 'right');
  }
  text(left - m.len(2), band.baselineY + font * 0.35, '0', ink.strong, font, 'right', true);

  // Columns: the same module, starting at the first letter.
  const colsRight = Math.min(48, Math.ceil((right - originX) / unit));
  const colsLeft = Math.min(8, Math.ceil((originX - left) / unit));
  for (let k = -colsLeft; k <= colsRight; k++) {
    if (!budget.take(1)) break;
    const x = originX + k * unit;
    if (x < left || x > right) continue;
    line({ x, y: top }, { x, y: bottom }, k === 0 ? ink.mid : ink.faint,
      m.stroke(style.strokeWidth * (k === 0 ? 0.9 : 0.6)), k === 0 ? undefined : m.dash(2, 4));
  }

  const capInUnits = unit > 0 ? band.capHeight / unit : 0;
  const widthInUnits = unit > 0 ? box.width / unit : 0;
  summaryLine(box, m, ink.strong, SUMMARY_SLOT.xHeightGrid,
    `módulo = altura-x ${formatLength(unit, context)} · maiúscula ${capInUnits.toFixed(2)}x · largura ${widthInUnits.toFixed(1)}x`);
}

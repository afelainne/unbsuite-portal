/**
 * Brand-analysis constructions derived from the REAL vector data.
 *
 * Everything here is measured, never decorative: an ink scan (exact scanline
 * over the flattened outlines, strokes approximated as ribbons) feeds the
 * type-height bands, the stroke-weight report and the reduction test; the
 * flattened polylines feed the slant detector; the Bézier curves feed the
 * corner-radius detector.
 *
 * All decorative lengths come from `metricsFor(context, bounds)` so the
 * 600px preview and a 4096px export look identical.
 */
import paper from 'paper';
import {
  hexToColor, clipLineToRect, formatLength,
  type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor } from './scale';
import { paperToShapes } from '../../lib/metrics';

// ---------------------------------------------------------------------------
// Ink scanning (shared by every construction in this file)
// ---------------------------------------------------------------------------

export interface Box { x: number; y: number; width: number; height: number }
export interface Pt2 { x: number; y: number }
export type Run = [number, number];

/** A closed-ring shape ready for the scanline (strokes already thickened). */
export interface ScanShape { rings: Pt2[][]; evenodd: boolean }

export interface InkScan {
  /** Scan-line coordinates (row centers), ascending. */
  ys: number[];
  /** Merged runs along each scan line. */
  runs: Run[][];
  /** Total covered length per row. */
  covered: number[];
  /** Distance between scan lines. */
  step: number;
  box: Box;
}

const EPS = 1e-9;

export function boxOf(rect: { x: number; y: number; width: number; height: number } | null | undefined): Box | null {
  if (!rect || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return null;
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/** Merge overlapping / touching runs. */
export function mergeRuns(runs: Run[]): Run[] {
  if (runs.length < 2) return runs.filter(r => r[1] > r[0]);
  const sorted = runs.filter(r => r[1] > r[0]).sort((a, b) => a[0] - b[0]);
  const out: Run[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1] + EPS) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

const shapeCache = new WeakMap<object, { tolerance: number; shapes: ScanShape[] }>();

/**
 * Outlines + stroke ribbons as closed rings. Unfilled strokes become one quad
 * per segment (each its own shape, so overlapping quads union correctly).
 *
 * Flattening is the expensive part and several constructions ask for the same
 * paths during one scene render (the pipeline hands them all the same
 * `actualPaths` array), so the result is memoized on that array.
 */
export function inkShapes(paths: paper.Item[], tolerance = 0.6): ScanShape[] {
  if (!paths || paths.length === 0) return [];
  const cached = shapeCache.get(paths as unknown as object);
  if (cached && cached.tolerance === tolerance) return cached.shapes;
  const { fills, strokes } = paperToShapes(paths, tolerance);
  const out: ScanShape[] = [];
  for (const f of fills) out.push({ rings: f.rings, evenodd: f.rule === 'evenodd' });
  for (const s of strokes) {
    const half = Math.max(1e-4, s.width) / 2;
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
        out.push({
          rings: [[
            { x: a.x + nx, y: a.y + ny }, { x: b.x + nx, y: b.y + ny },
            { x: b.x - nx, y: b.y - ny }, { x: a.x - nx, y: a.y - ny },
          ]],
          evenodd: false,
        });
      }
    });
  }
  shapeCache.set(paths as unknown as object, { tolerance, shapes: out });
  return out;
}

/** Swap x/y so the same sweep can scan columns. */
export function transposeShapes(shapes: ScanShape[]): ScanShape[] {
  return shapes.map(s => ({ evenodd: s.evenodd, rings: s.rings.map(r => r.map(p => ({ x: p.y, y: p.x }))) }));
}

interface ScanEdge { x0: number; y0: number; x1: number; y1: number; dir: number; shape: number }

function buildEdges(shapes: ScanShape[]): ScanEdge[] {
  const edges: ScanEdge[] = [];
  shapes.forEach((s, si) => {
    for (const ring of s.rings) {
      const n = ring.length;
      if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
        if (a.y === b.y) continue;
        edges.push(a.y < b.y
          ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y, dir: 1, shape: si }
          : { x0: b.x, y0: b.y, x1: a.x, y1: a.y, dir: -1, shape: si });
      }
    }
  });
  edges.sort((p, q) => p.y0 - q.y0);
  return edges;
}

/** Exact per-row ink runs inside `box` (rows are sampled at their centers). */
export function scanInk(shapes: ScanShape[], box: Box, rows: number): InkScan {
  const n = Math.max(4, Math.min(512, Math.round(Number.isFinite(rows) ? rows : 64)));
  const step = box.height / n;
  const ys: number[] = [];
  const runs: Run[][] = [];
  const covered: number[] = [];
  const edges = buildEdges(shapes);
  const perShape = new Map<number, Array<{ x: number; dir: number }>>();
  let next = 0;
  let active: ScanEdge[] = [];

  for (let i = 0; i < n; i++) {
    const y = box.y + step * (i + 0.5);
    while (next < edges.length && edges[next].y0 <= y) active.push(edges[next++]);
    if (active.length) active = active.filter(e => e.y1 > y);
    perShape.clear();
    for (const e of active) {
      if (e.y0 > y) continue;
      const x = e.x0 + ((y - e.y0) * (e.x1 - e.x0)) / (e.y1 - e.y0);
      if (!Number.isFinite(x)) continue;
      let arr = perShape.get(e.shape);
      if (!arr) perShape.set(e.shape, (arr = []));
      arr.push({ x, dir: e.dir });
    }
    const intervals: Run[] = [];
    perShape.forEach((crossings, si) => {
      crossings.sort((a, b) => a.x - b.x);
      const evenodd = shapes[si].evenodd;
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
    const merged = mergeRuns(intervals);
    ys.push(y);
    runs.push(merged);
    covered.push(merged.reduce((sum, r) => sum + (r[1] - r[0]), 0));
  }
  return { ys, runs, covered, step, box };
}

/** Rows to scan for a box: dense enough to resolve details, cheap enough to draw. */
function rowCount(box: Box): number {
  return Math.max(24, Math.min(192, Math.round(box.height)));
}

// ---------------------------------------------------------------------------
// Mass distribution (used by the contrast guide)
// ---------------------------------------------------------------------------

export interface AxisMass { q25: number; q50: number; q75: number }
export interface MassProfile {
  x: AxisMass;
  y: AxisMass;
  /** Ink area in square px. */
  area: number;
  /** Ink area / box area. */
  density: number;
  /** Densest scan line / mean scan line (1 = perfectly even). */
  peakRatio: number;
}

function quantilesOf(pos: number[], weight: number[], step: number): AxisMass {
  const total = weight.reduce((s, v) => s + v, 0);
  const fallback = pos.length ? pos[Math.floor(pos.length / 2)] : 0;
  if (!(total > 0)) return { q25: fallback, q50: fallback, q75: fallback };
  const at = (frac: number) => {
    const target = total * frac;
    let acc = 0;
    for (let i = 0; i < pos.length; i++) {
      const next = acc + weight[i];
      if (next >= target) {
        const t = weight[i] > 0 ? (target - acc) / weight[i] : 0.5;
        return pos[i] + (t - 0.5) * step;
      }
      acc = next;
    }
    return pos[pos.length - 1];
  };
  return { q25: at(0.25), q50: at(0.5), q75: at(0.75) };
}

/** Where the ink actually sits: quartiles of mass on both axes + density. */
export function inkMassProfile(paths: paper.Item[], box: Box, rows?: number): MassProfile | null {
  const shapes = inkShapes(paths);
  if (!shapes.length) return null;
  const rowScan = scanInk(shapes, box, rows ?? rowCount(box));
  const colBox: Box = { x: box.y, y: box.x, width: box.height, height: box.width };
  const colScan = scanInk(transposeShapes(shapes), colBox, Math.max(24, Math.min(192, Math.round(box.width))));
  const area = rowScan.covered.reduce((s, v) => s + v, 0) * rowScan.step;
  if (!(area > 0)) return null;
  const mean = area / rowScan.step / rowScan.covered.length;
  const peak = Math.max(...rowScan.covered);
  return {
    x: quantilesOf(colScan.ys, colScan.covered, colScan.step),
    y: quantilesOf(rowScan.ys, rowScan.covered, rowScan.step),
    area,
    density: area / (box.width * box.height),
    peakRatio: mean > 0 ? peak / mean : 0,
  };
}

// ---------------------------------------------------------------------------
// 1. Real cap-height / x-height, from the ink histogram per row
// ---------------------------------------------------------------------------

export interface TypeHeights {
  /** Top of the ink (cap line / ascender). */
  capY: number;
  /** Detected x-height line, or null when the drawing has no such step. */
  xY: number | null;
  /** Baseline (last big drop of ink), equals `descenderY` when there is none. */
  baselineY: number;
  /** Bottom of the ink. */
  descenderY: number;
  capHeight: number;
  xHeight: number | null;
  /** x-height / cap-height, or null. */
  ratio: number | null;
}

export function detectTypeHeights(paths: paper.Item[], box: Box, rows?: number): TypeHeights | null {
  const shapes = inkShapes(paths);
  if (!shapes.length) return null;
  const scan = scanInk(shapes, box, rows ?? rowCount(box));
  const p = scan.covered;
  const n = p.length;
  let max = 0;
  for (const v of p) if (v > max) max = v;
  if (!(max > 0)) return null;

  const thr = max * 0.02;
  let first = -1;
  let last = -1;
  for (let i = 0; i < n; i++) if (p[i] > thr) { if (first < 0) first = i; last = i; }
  if (first < 0 || last <= first) return null;

  // 3-row moving average kills anti-alias-like noise from flattening.
  const s = p.map((_, i) => (p[Math.max(0, i - 1)] + p[i] + p[Math.min(n - 1, i + 1)]) / 3);
  const span = last - first;
  const half = scan.step / 2;
  const capY = scan.ys[first] - half;
  const descenderY = scan.ys[last] + half;

  // x-height: biggest jump UP in the top 70% of the ink band (all the
  // x-height letters start there, so the covered length steps up).
  let xIdx = -1;
  let bestJump = max * 0.15;
  const jumpEnd = first + Math.max(1, Math.round(span * 0.7));
  for (let i = first + 1; i <= Math.min(jumpEnd, last); i++) {
    const d = s[i] - s[i - 1];
    if (d > bestJump) { bestJump = d; xIdx = i; }
  }

  // baseline: biggest drop in the bottom 70%, else the bottom of the ink.
  let baseIdx = -1;
  let bestDrop = max * 0.15;
  const dropStart = first + Math.max(1, Math.round(span * 0.3));
  for (let i = dropStart; i <= last; i++) {
    const d = s[i - 1] - s[i];
    if (d > bestDrop) { bestDrop = d; baseIdx = i; }
  }

  const baselineY = baseIdx > 0 ? scan.ys[baseIdx] - half : descenderY;
  let xY = xIdx > 0 ? scan.ys[xIdx] - half : null;
  if (xY !== null && (xY <= capY + EPS || xY >= baselineY - EPS)) xY = null;

  const capHeight = baselineY - capY;
  const xHeight = xY === null ? null : baselineY - xY;
  return {
    capY, xY, baselineY, descenderY, capHeight, xHeight,
    ratio: xHeight !== null && capHeight > 0 ? xHeight / capHeight : null,
  };
}

export function renderInkHeightBands(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext) {
  const paths = context?.actualPaths;
  if (!paths || paths.length === 0) return;
  const box = boxOf(context?.contentBounds ?? bounds);
  if (!box) return;
  const h = detectTypeHeights(paths, box);
  if (!h) return;

  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dim = hexToColor(style.color, style.opacity * 0.55);
  const over = m.len(10);
  const left = box.x - over;
  const right = box.x + box.width + over;
  const font = m.font(9);

  const line = (y: number, text: string, strong: boolean) => {
    const path = new paper.Path.Line(new paper.Point(left, y), new paper.Point(right, y));
    path.strokeColor = strong ? color : dim;
    path.strokeWidth = m.stroke(style.strokeWidth * (strong ? 1 : 0.7));
    if (!strong) path.dashArray = m.dash(4, 3);
    const t = new paper.PointText(new paper.Point(right + m.len(4), y + font * 0.35));
    t.content = text;
    t.fillColor = strong ? color : dim;
    t.fontSize = font;
    t.justification = 'left';
  };

  line(h.capY, `cap ${formatLength(h.capHeight, context)}`, true);
  if (h.xY !== null && h.xHeight !== null) {
    line(h.xY, `x ${formatLength(h.xHeight, context)}`, true);
  }
  line(h.baselineY, 'baseline', true);
  if (h.descenderY > h.baselineY + m.len(0.5)) {
    line(h.descenderY, `desc ${formatLength(h.descenderY - h.baselineY, context)}`, false);
  }

  if (h.ratio !== null) {
    const t = new paper.PointText(new paper.Point(left, h.capY - m.len(5)));
    t.content = `x/cap ${(h.ratio * 100).toFixed(0)}%`;
    t.fillColor = color;
    t.fontSize = m.font(10);
    t.fontWeight = 'bold';
    t.justification = 'left';
  }
}

// ---------------------------------------------------------------------------
// 2. Detected slant (italic) angle of the vertical stems
// ---------------------------------------------------------------------------

export interface SlantResult {
  /** Degrees off vertical; positive leans right (top to the right). */
  angle: number;
  /** Share of the near-vertical outline length that agrees within ±3°. */
  consistency: number;
  /** Total near-vertical outline length that was measured. */
  weight: number;
}

/** Flattened polylines of every path (outlines and stroke centerlines). */
function polylinesOf(paths: paper.Item[]): Array<{ pts: Pt2[]; closed: boolean }> {
  const { fills, strokes } = paperToShapes(paths, 0.6);
  const out: Array<{ pts: Pt2[]; closed: boolean }> = [];
  for (const f of fills) for (const ring of f.rings) out.push({ pts: ring, closed: true });
  for (const s of strokes) s.polylines.forEach((pl, i) => out.push({ pts: pl, closed: !!s.closed[i] }));
  return out;
}

export function detectSlant(paths: paper.Item[], maxOffVertical = 40): SlantResult | null {
  const lines = polylinesOf(paths);
  const samples: Array<{ a: number; w: number }> = [];
  let total = 0;
  for (const { pts, closed } of lines) {
    const n = pts.length;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (!(len > EPS)) continue;
      if (dy < 0) { dx = -dx; dy = -dy; }
      if (!(dy > EPS)) continue; // horizontal segment: no slant information
      const angle = (Math.atan2(-dx, dy) * 180) / Math.PI;
      if (Math.abs(angle) > maxOffVertical) continue;
      samples.push({ a: angle, w: len });
      total += len;
    }
  }
  if (samples.length < 2 || !(total > 0)) return null;

  samples.sort((p, q) => p.a - q.a);
  let acc = 0;
  let median = samples[0].a;
  for (const s of samples) {
    acc += s.w;
    if (acc >= total / 2) { median = s.a; break; }
  }
  let agree = 0;
  for (const s of samples) if (Math.abs(s.a - median) <= 3) agree += s.w;
  return { angle: median, consistency: agree / total, weight: total };
}

export function renderSlantAngle(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext) {
  const paths = context?.actualPaths;
  if (!paths || paths.length === 0) return;
  const box = boxOf(context?.contentBounds ?? bounds);
  if (!box) return;
  const slant = detectSlant(paths);
  if (!slant) return;

  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dim = hexToColor(style.color, style.opacity * 0.45);
  const rad = (slant.angle * Math.PI) / 180;
  // direction of a stem, top -> bottom
  const dx = -Math.sin(rad);
  const dy = Math.cos(rad);
  const diag = Math.hypot(box.width, box.height);
  const count = 7;
  const left = box.x;
  const right = box.x + box.width;
  const top = box.y;
  const bottom = box.y + box.height;

  for (let i = 0; i <= count; i++) {
    const x = left + (box.width * i) / count;
    const cy = box.y + box.height / 2;
    const clipped = clipLineToRect(
      x - dx * diag, cy - dy * diag, x + dx * diag, cy + dy * diag,
      left, top, right, bottom,
    );
    if (!clipped) continue;
    const line = new paper.Path.Line(new paper.Point(clipped[0], clipped[1]), new paper.Point(clipped[2], clipped[3]));
    line.strokeColor = dim;
    line.strokeWidth = m.stroke(style.strokeWidth * 0.8);
    line.dashArray = m.dash(5, 4);
  }

  // vertical reference + the measured stem, from the bottom center
  const anchorX = box.x + box.width / 2;
  const h = box.height * 0.5;
  const vRef = new paper.Path.Line(new paper.Point(anchorX, bottom), new paper.Point(anchorX, bottom - h));
  vRef.strokeColor = dim;
  vRef.strokeWidth = m.stroke(style.strokeWidth * 0.6);
  vRef.dashArray = m.dash(2, 3);

  const stem = new paper.Path.Line(
    new paper.Point(anchorX, bottom),
    new paper.Point(anchorX - dx * h, bottom - dy * h),
  );
  stem.strokeColor = color;
  stem.strokeWidth = m.stroke(style.strokeWidth * 1.4);

  const label = new paper.PointText(new paper.Point(anchorX + m.len(6), bottom - h - m.len(4)));
  const upright = Math.abs(slant.angle) < 0.5;
  label.content = upright
    ? `upright ${slant.angle.toFixed(1)}°`
    : `slant ${slant.angle > 0 ? '+' : ''}${slant.angle.toFixed(1)}° · ${Math.round(slant.consistency * 100)}%`;
  label.fillColor = color;
  label.fontSize = m.font(10);
  label.fontWeight = 'bold';
  label.justification = 'left';
}

// ---------------------------------------------------------------------------
// 3. Stroke weight: min / median / max and WHERE the thinnest place is
// ---------------------------------------------------------------------------

export interface StrokeWeightStats {
  min: number;
  median: number;
  max: number;
  /** Where the thinnest measurement was taken. */
  minAt: Pt2 | null;
  /** Thinnest gap (counter / letter spacing), a second reduction risk. */
  minGap: number | null;
  minGapAt: Pt2 | null;
  samples: number;
}

function runAt(runs: Run[], v: number): Run | null {
  for (const r of runs) if (v >= r[0] - EPS && v <= r[1] + EPS) return r;
  return null;
}

function nearestIndex(values: number[], v: number): number {
  if (values.length === 0) return -1;
  const step = values.length > 1 ? values[1] - values[0] : 1;
  if (!(step > 0)) return 0;
  return Math.max(0, Math.min(values.length - 1, Math.round((v - values[0]) / step)));
}

/**
 * Local thickness = min(horizontal run, vertical run) through a point: a
 * horizontal bar has long horizontal runs but short vertical ones, so the
 * minimum of the two is the real stem width.
 */
/** Stroke-weight results are shared by the weight report and the reduction test. */
const weightCache = new WeakMap<object, Map<string, StrokeWeightStats | null>>();

export function measureStrokeWeight(paths: paper.Item[], box: Box, rows?: number): StrokeWeightStats | null {
  const key = `${box.x}|${box.y}|${box.width}|${box.height}|${rows ?? ''}`;
  const bucket = paths && paths.length ? weightCache.get(paths as unknown as object) : null;
  if (bucket && bucket.has(key)) return bucket.get(key) ?? null;
  const stats = computeStrokeWeight(paths, box, rows);
  if (paths && paths.length) {
    const map = bucket ?? new Map<string, StrokeWeightStats | null>();
    map.set(key, stats);
    weightCache.set(paths as unknown as object, map);
  }
  return stats;
}

function computeStrokeWeight(paths: paper.Item[], box: Box, rows?: number): StrokeWeightStats | null {
  const shapes = inkShapes(paths);
  if (!shapes.length) return null;
  const n = rows ?? rowCount(box);
  const rowScan = scanInk(shapes, box, n);
  const colBox: Box = { x: box.y, y: box.x, width: box.height, height: box.width };
  const colScan = scanInk(transposeShapes(shapes), colBox, Math.max(24, Math.min(192, Math.round(box.width))));

  const samples: number[] = [];
  let min = Infinity;
  let minAt: Pt2 | null = null;

  for (let i = 0; i < rowScan.ys.length; i++) {
    const y = rowScan.ys[i];
    for (const r of rowScan.runs[i]) {
      const x = (r[0] + r[1]) / 2;
      const h = r[1] - r[0];
      const j = nearestIndex(colScan.ys, x);
      if (j < 0) continue;
      const cr = runAt(colScan.runs[j], y);
      const v = cr ? cr[1] - cr[0] : Infinity;
      const t = Math.min(h, v);
      if (!Number.isFinite(t) || !(t > 0)) continue;
      samples.push(t);
      if (t < min) { min = t; minAt = { x, y }; }
    }
  }
  for (let j = 0; j < colScan.ys.length; j++) {
    const x = colScan.ys[j];
    for (const r of colScan.runs[j]) {
      const y = (r[0] + r[1]) / 2;
      const v = r[1] - r[0];
      const i = nearestIndex(rowScan.ys, y);
      if (i < 0) continue;
      const rr = runAt(rowScan.runs[i], x);
      const h = rr ? rr[1] - rr[0] : Infinity;
      const t = Math.min(h, v);
      if (!Number.isFinite(t) || !(t > 0)) continue;
      samples.push(t);
      if (t < min) { min = t; minAt = { x, y }; }
    }
  }
  if (!samples.length) return null;

  // Smallest counter / spacing, ignoring numeric slivers.
  const gapFloor = Math.hypot(box.width, box.height) * 0.002;
  let minGap = Infinity;
  let minGapAt: Pt2 | null = null;
  const scanGaps = (scan: InkScan, swap: boolean) => {
    for (let i = 0; i < scan.ys.length; i++) {
      const runs = scan.runs[i];
      for (let k = 0; k < runs.length - 1; k++) {
        const g = runs[k + 1][0] - runs[k][1];
        if (!(g > gapFloor) || g >= minGap) continue;
        minGap = g;
        const mid = (runs[k][1] + runs[k + 1][0]) / 2;
        minGapAt = swap ? { x: scan.ys[i], y: mid } : { x: mid, y: scan.ys[i] };
      }
    }
  };
  scanGaps(rowScan, false);
  scanGaps(colScan, true);

  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return {
    min,
    median,
    max: sorted[sorted.length - 1],
    minAt,
    minGap: Number.isFinite(minGap) ? minGap : null,
    minGapAt,
    samples: samples.length,
  };
}

export function renderStrokeWeight(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext) {
  const paths = context?.actualPaths;
  if (!paths || paths.length === 0) return;
  const box = boxOf(context?.contentBounds ?? bounds);
  if (!box) return;
  const stats = measureStrokeWeight(paths, box);
  if (!stats) return;

  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const warn = hexToColor(style.color, style.opacity * 0.5);
  const font = m.font(9);

  if (stats.minAt) {
    const r = Math.max(stats.min, m.len(3)) * 1.8;
    const ring = new paper.Path.Circle(new paper.Point(stats.minAt.x, stats.minAt.y), r);
    ring.strokeColor = color;
    ring.strokeWidth = m.stroke(style.strokeWidth * 1.2);
    ring.fillColor = null;
    const bar = new paper.Path.Line(
      new paper.Point(stats.minAt.x - stats.min / 2, stats.minAt.y),
      new paper.Point(stats.minAt.x + stats.min / 2, stats.minAt.y),
    );
    bar.strokeColor = color;
    bar.strokeWidth = m.stroke(style.strokeWidth * 2);
    const t = new paper.PointText(new paper.Point(stats.minAt.x + r + m.len(4), stats.minAt.y + font * 0.35));
    t.content = `thinnest ${formatLength(stats.min, context)}`;
    t.fillColor = color;
    t.fontSize = font;
    t.justification = 'left';
  }

  if (stats.minGapAt && stats.minGap !== null) {
    const gr = Math.max(stats.minGap, m.len(2)) * 1.6;
    const ring = new paper.Path.Circle(new paper.Point(stats.minGapAt.x, stats.minGapAt.y), gr);
    ring.strokeColor = warn;
    ring.strokeWidth = m.stroke(style.strokeWidth * 0.8);
    ring.dashArray = m.dash(3, 3);
    ring.fillColor = null;
  }

  const contrast = stats.min > 0 ? stats.max / stats.min : 0;
  const summary = new paper.PointText(new paper.Point(box.x, box.y - m.len(6)));
  summary.content = `stroke ${formatLength(stats.min, context)} / ${formatLength(stats.median, context)} / ${formatLength(stats.max, context)} · contrast ${contrast.toFixed(1)}×`;
  summary.fillColor = color;
  summary.fontSize = m.font(10);
  summary.fontWeight = 'bold';
  summary.justification = 'left';
}

// ---------------------------------------------------------------------------
// 4. Reduction test: the logo at 16 / 24 / 32 / 48 px
// ---------------------------------------------------------------------------

export const REDUCTION_SIZES = [16, 24, 32, 48];
/** Below this many device px a stem or a counter stops surviving rasterization. */
const DETAIL_FLOOR = 1;
const DETAIL_WARN = 1.5;
/** Cloning the artwork four times is only worth it for reasonable path counts. */
const MAX_GHOST_PATHS = 300;

export interface ReductionStep {
  size: number;
  /** Thinnest stem, in device px, once the logo is that tall. */
  strokePx: number;
  /** Thinnest counter / gap, in device px. */
  gapPx: number | null;
  status: 'ok' | 'risk' | 'lost';
}

export function reductionSteps(stats: StrokeWeightStats, contentHeight: number, sizes = REDUCTION_SIZES): ReductionStep[] {
  if (!(contentHeight > 0)) return [];
  return sizes.map(size => {
    const k = size / contentHeight;
    const strokePx = stats.min * k;
    const gapPx = stats.minGap !== null ? stats.minGap * k : null;
    const worst = gapPx === null ? strokePx : Math.min(strokePx, gapPx);
    const status: ReductionStep['status'] = worst < DETAIL_FLOOR ? 'lost' : worst < DETAIL_WARN ? 'risk' : 'ok';
    return { size, strokePx, gapPx, status };
  });
}

/** Rebuild the artwork as one group, keeping compound paths (holes) intact. */
function cloneArtwork(paths: paper.Path[]): paper.Group | null {
  const group = new paper.Group();
  const compounds = new Map<paper.Item, paper.Path[]>();
  const loose: paper.Path[] = [];
  for (const p of paths) {
    const owner = p.parent instanceof paper.CompoundPath ? p.parent : null;
    if (owner) {
      const arr = compounds.get(owner);
      if (arr) arr.push(p); else compounds.set(owner, [p]);
    } else loose.push(p);
  }
  for (const p of loose) {
    const c = p.clone({ insert: false }) as paper.Path;
    group.addChild(c);
  }
  compounds.forEach((children, owner) => {
    const cp = new paper.CompoundPath({ insert: false });
    for (const child of children) cp.addChild(child.clone({ insert: false }) as paper.Path);
    cp.fillRule = (owner as paper.PathItem).fillRule || 'nonzero';
    group.addChild(cp);
  });
  if (!group.children.length || !(group.bounds.width > 0) || !(group.bounds.height > 0)) {
    group.remove();
    return null;
  }
  return group;
}

export function renderReductionTest(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext) {
  const paths = context?.actualPaths;
  if (!paths || paths.length === 0) return;
  const box = boxOf(context?.contentBounds ?? bounds);
  if (!box) return;
  const stats = measureStrokeWeight(paths, box);
  if (!stats) return;
  const steps = reductionSteps(stats, box.height);
  if (!steps.length) return;

  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const okColor = hexToColor(style.color, style.opacity * 0.85);
  const lostColor = hexToColor(style.color, style.opacity * 0.35);
  const font = m.font(8);
  const maxSize = steps[steps.length - 1].size;
  const rowHeight = box.height * 0.22;
  const gapX = box.width * 0.04;
  const top = box.y + box.height + box.height * 0.10;
  const canGhost = paths.length <= MAX_GHOST_PATHS;

  let x = box.x;
  for (const step of steps) {
    const k = step.size / maxSize;
    const h = rowHeight * k;
    const w = box.width * (h / box.height);
    const frame = new paper.Rectangle(x, top + (rowHeight - h), w, h);

    if (canGhost) {
      const ghost = cloneArtwork(paths as paper.Path[]);
      if (ghost) {
        const tint = step.status === 'lost' ? lostColor : okColor;
        const walk = (it: paper.Item) => {
          if (it instanceof paper.CompoundPath || it instanceof paper.Path) {
            if (it.fillColor) it.fillColor = tint;
            else if (it.strokeColor) it.strokeColor = tint;
            else it.fillColor = tint;
            if (it.strokeColor) it.strokeColor = tint;
          }
          for (const c of it.children || []) walk(c);
        };
        walk(ghost);
        ghost.fitBounds(frame);
      }
    }

    const outline = new paper.Path.Rectangle(frame);
    outline.strokeColor = step.status === 'ok' ? color : okColor;
    outline.strokeWidth = m.stroke(style.strokeWidth * (step.status === 'lost' ? 1.2 : 0.6));
    outline.fillColor = null;
    if (step.status !== 'ok') outline.dashArray = m.dash(3, 2);

    if (step.status === 'lost') {
      const a = new paper.Path.Line(frame.topLeft, frame.bottomRight);
      const b = new paper.Path.Line(frame.topRight, frame.bottomLeft);
      [a, b].forEach(p => { p.strokeColor = color; p.strokeWidth = m.stroke(style.strokeWidth); });
    }

    const label = new paper.PointText(new paper.Point(frame.center.x, top + rowHeight + font * 1.4));
    label.content = `${step.size}px`;
    label.fillColor = step.status === 'lost' ? color : okColor;
    label.fontSize = font;
    label.fontWeight = 'bold';
    label.justification = 'center';

    const detail = new paper.PointText(new paper.Point(frame.center.x, top + rowHeight + font * 2.8));
    detail.content = `${step.strokePx.toFixed(2)}px${step.status === 'ok' ? '' : step.status === 'risk' ? ' !' : ' ✕'}`;
    detail.fillColor = step.status === 'lost' ? color : lostColor;
    detail.fontSize = font;
    detail.justification = 'center';

    x += w + gapX;
  }
}

// ---------------------------------------------------------------------------
// 5. Corner radii: are the rounded corners consistent?
// ---------------------------------------------------------------------------

export interface CornerArc {
  center: Pt2;
  point: Pt2;
  radius: number;
  /** Total turn of the tangent over the arc, in degrees. */
  turn: number;
}

const MIN_CORNER_TURN = 25;
const MAX_CORNER_TURN = 170;
export const MAX_CORNERS = 24;

export function detectCornerRadii(paths: paper.Item[], maxRadius = Infinity): CornerArc[] {
  const found: CornerArc[] = [];
  for (const item of paths || []) {
    const path = item as paper.Path;
    const curves = path?.curves;
    if (!curves || !curves.length) continue;
    for (const curve of curves) {
      const len = curve.length;
      if (!(len > 0)) continue;
      let k: number;
      let mid: paper.Point;
      let normal: paper.Point;
      let t0: paper.Point;
      let t1: paper.Point;
      try {
        k = curve.getCurvatureAtTime(0.5);
        mid = curve.getPointAtTime(0.5);
        normal = curve.getNormalAtTime(0.5);
        t0 = curve.getTangentAtTime(0);
        t1 = curve.getTangentAtTime(1);
      } catch {
        continue;
      }
      if (!Number.isFinite(k) || k === 0 || !mid || !normal || !t0 || !t1) continue;
      const turn = Math.abs(t0.getAngle(t1));
      if (!Number.isFinite(turn) || turn < MIN_CORNER_TURN || turn > MAX_CORNER_TURN) continue;
      // arc length / turn is far more accurate than 1/curvature on a Bézier
      const radius = len / ((turn * Math.PI) / 180);
      if (!Number.isFinite(radius) || !(radius > 0) || radius > maxRadius) continue;
      const n = normal.normalize();
      const center = {
        x: mid.x - n.x * Math.sign(k) * radius,
        y: mid.y - n.y * Math.sign(k) * radius,
      };
      if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) continue;
      found.push({ center, point: { x: mid.x, y: mid.y }, radius, turn });
    }
  }
  // merge corners split across several curves (same center, same radius)
  const merged: CornerArc[] = [];
  for (const c of found) {
    const near = merged.find(o =>
      Math.hypot(o.center.x - c.center.x, o.center.y - c.center.y) < Math.max(o.radius, c.radius) * 0.3 &&
      Math.abs(o.radius - c.radius) <= Math.max(o.radius, c.radius) * 0.1);
    if (near) near.turn += c.turn;
    else merged.push({ ...c });
  }
  // keep the most corner-like arcs: a big turn over a short arc
  return merged.sort((a, b) => (b.turn - a.turn) || (a.radius - b.radius)).slice(0, MAX_CORNERS);
}

/** Group radii that are within `tolerance` of each other (relative). */
export function clusterRadii(corners: CornerArc[], tolerance = 0.08): Array<{ radius: number; count: number }> {
  const groups: Array<{ sum: number; count: number }> = [];
  for (const c of [...corners].sort((a, b) => a.radius - b.radius)) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.sum / last.count - c.radius) <= (last.sum / last.count) * tolerance) {
      last.sum += c.radius; last.count++;
    } else groups.push({ sum: c.radius, count: 1 });
  }
  return groups.map(g => ({ radius: g.sum / g.count, count: g.count })).sort((a, b) => b.count - a.count);
}

export function renderCornerRadii(bounds: paper.Rectangle, style: StyleConfig, context?: RenderContext) {
  const paths = context?.actualPaths;
  if (!paths || paths.length === 0) return;
  const box = boxOf(context?.contentBounds ?? bounds);
  if (!box) return;
  const corners = detectCornerRadii(paths, Math.hypot(box.width, box.height));
  if (!corners.length) return;

  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dim = hexToColor(style.color, style.opacity * 0.45);
  const font = m.font(8);

  for (const c of corners) {
    const circle = new paper.Path.Circle(new paper.Point(c.center.x, c.center.y), c.radius);
    circle.strokeColor = dim;
    circle.strokeWidth = m.stroke(style.strokeWidth * 0.7);
    circle.dashArray = m.dash(3, 3);
    circle.fillColor = null;
    const spoke = new paper.Path.Line(new paper.Point(c.center.x, c.center.y), new paper.Point(c.point.x, c.point.y));
    spoke.strokeColor = color;
    spoke.strokeWidth = m.stroke(style.strokeWidth * 0.7);
    const dot = new paper.Path.Circle(new paper.Point(c.center.x, c.center.y), m.dot(2));
    dot.fillColor = color;
    dot.strokeColor = null;
  }

  const groups = clusterRadii(corners);
  const consistent = groups.length === 1;
  const text = groups.slice(0, 3)
    .map(g => `R ${formatLength(g.radius, context)}×${g.count}`)
    .join('  ');
  const label = new paper.PointText(new paper.Point(box.x, box.y + box.height + m.len(12)));
  label.content = `${text}${consistent ? '' : `  · ${groups.length} radii`}`;
  label.fillColor = color;
  label.fontSize = Math.max(font, m.font(9));
  label.fontWeight = 'bold';
  label.justification = 'left';
}

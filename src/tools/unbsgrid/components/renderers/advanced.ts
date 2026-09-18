import paper from 'paper';
import type { BezierSegmentData } from '../../lib/svg-engine';
import { hexToColor, clipLineToRect, formatLength, MAX_RENDER_ITEMS, type StyleConfig, type RenderContext } from './utils';
import { metricsFor } from './scale';
import { LabelPlacer, orientationDeg, formatAngle } from './measurement';

/** Max underlying circles drawn (each also draws a cross). */
export const MAX_UNDERLYING_CIRCLES = 12;
/** Paths a medial-axis pass may walk (it casts a ray per sample). */
export const MAX_SKELETON_PATHS = 12;

/**
 * Every renderer here draws one item per geometric feature, and a complex
 * logo has thousands of them. A shared counter keeps a single construction
 * from flooding the scene (and the exported SVG).
 */
class Budget {
  private used = 0;
  constructor(private readonly max = MAX_RENDER_ITEMS) {}
  get left(): number { return Math.max(0, this.max - this.used); }
  /** Reserve `n` slots; false when the budget is exhausted. */
  take(n = 1): boolean {
    if (n <= 0) return true;
    if (this.used + n > this.max) return false;
    this.used += n;
    return true;
  }
}

function inkPaths(context?: RenderContext): paper.Path[] {
  return context?.useRealData && context.actualPaths?.length ? context.actualPaths : [];
}

/** All four rectangle numbers usable (a zero-size logo is still drawable). */
function finiteRect(rect: paper.Rectangle | null | undefined): boolean {
  return !!rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite);
}

function diagonalOf(rect: paper.Rectangle): number {
  const d = Math.hypot(rect?.width ?? 0, rect?.height ?? 0);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/** Screen direction of an orientation in [0,180) (y grows downwards). */
function dirOf(angleDeg: number): { dx: number; dy: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { dx: Math.cos(a), dy: -Math.sin(a) };
}

function safeCurvePoint(curve: paper.Curve, offset: number): paper.Point | null {
  try {
    const len = curve.length;
    if (!Number.isFinite(len) || len <= 0) return null;
    return curve.getPointAt(Math.max(0, Math.min(len, offset))) ?? null;
  } catch {
    return null;
  }
}

/** p-th percentile (0..1) of a numeric list. */
export function percentile(values: number[], p: number): number {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  const sorted = [...finite].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Bezier handles
// ---------------------------------------------------------------------------

export interface BezierHandlesOptions {
  /** Anchor / handle dot radius in GUIDE UNITS (default 3). */
  handleSize?: number;
  /** Show anchor dots on segment points (default true). */
  showAnchors?: boolean;
  /** Show handle lines + handle dots (default true). */
  showHandles?: boolean;
}

export function renderBezierHandles(
  segments: BezierSegmentData[],
  originalBounds: paper.Rectangle,
  canvasBounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext,
  options?: BezierHandlesOptions
) {
  const m = metricsFor(context, canvasBounds);
  const color = hexToColor(style.color, style.opacity);
  const handleColor = hexToColor(style.color, style.opacity * 0.7);
  const hs = Number.isFinite(options?.handleSize) ? (options?.handleSize as number) : 3;
  const showA = options?.showAnchors ?? true;
  const showH = options?.showHandles ?? true;
  if (!showA && !showH) return;
  const anchorR = m.dot(hs);
  const handleR = m.dot(Math.max(0.5, hs * 0.6));
  const handleLineW = m.stroke(style.strokeWidth * 0.6);
  const budget = new Budget();

  // Absolute handle thresholds hid every handle of a small viewBox and showed
  // rounding noise on a large one: scale it with the drawing instead.
  const eps = Math.max(1e-9, diagonalOf(canvasBounds) * 1e-4);

  const paths = inkPaths(context);
  if (paths.length > 0) {
    for (const path of paths) {
      if (showH && path.curves?.length) {
        for (const curve of path.curves) {
          const p1 = curve.point1, p2 = curve.point2;
          const h1 = curve.handle1, h2 = curve.handle2;
          if (h1 && (Math.abs(h1.x) > eps || Math.abs(h1.y) > eps)) {
            if (!budget.take(2)) return;
            const hPt = new paper.Point(p1.x + h1.x, p1.y + h1.y);
            const line = new paper.Path.Line(new paper.Point(p1.x, p1.y), hPt);
            line.strokeColor = handleColor; line.strokeWidth = handleLineW;
            const hdot = new paper.Path.Circle(hPt, handleR);
            hdot.fillColor = handleColor; hdot.strokeColor = null;
          }
          if (h2 && (Math.abs(h2.x) > eps || Math.abs(h2.y) > eps)) {
            if (!budget.take(2)) return;
            const hPt = new paper.Point(p2.x + h2.x, p2.y + h2.y);
            const line = new paper.Path.Line(new paper.Point(p2.x, p2.y), hPt);
            line.strokeColor = handleColor; line.strokeWidth = handleLineW;
            const hdot = new paper.Path.Circle(hPt, handleR);
            hdot.fillColor = handleColor; hdot.strokeColor = null;
          }
        }
      }
      if (showA) {
        for (const seg of path.segments ?? []) {
          if (!budget.take(1)) return;
          const dot = new paper.Path.Circle(new paper.Point(seg.point.x, seg.point.y), anchorR);
          dot.fillColor = color; dot.strokeColor = null;
        }
      }
    }
    return;
  }

  // Zero-width/height originals (a single horizontal/vertical stroke) used to
  // divide by zero and produce NaN coordinates.
  const ow = originalBounds?.width ?? 0, oh = originalBounds?.height ?? 0;
  const mapX = (x: number) => canvasBounds.left + (ow > 0 ? ((x - originalBounds.left) / ow) * canvasBounds.width : canvasBounds.width / 2);
  const mapY = (y: number) => canvasBounds.top + (oh > 0 ? ((y - originalBounds.top) / oh) * canvasBounds.height : canvasBounds.height / 2);
  const finite = (...vals: number[]) => vals.every(Number.isFinite);

  for (const seg of segments ?? []) {
    const ax = mapX(seg.anchor.x), ay = mapY(seg.anchor.y);
    if (!finite(ax, ay)) continue;
    if (showA) {
      if (!budget.take(1)) return;
      const dot = new paper.Path.Circle(new paper.Point(ax, ay), anchorR);
      dot.fillColor = color; dot.strokeColor = null;
    }
    if (showH && seg.hasHandleIn) {
      const hx = mapX(seg.handleIn.x), hy = mapY(seg.handleIn.y);
      if (finite(hx, hy) && budget.take(2)) {
        const line = new paper.Path.Line(new paper.Point(ax, ay), new paper.Point(hx, hy));
        line.strokeColor = handleColor; line.strokeWidth = handleLineW;
        const hdot = new paper.Path.Circle(new paper.Point(hx, hy), handleR);
        hdot.fillColor = handleColor; hdot.strokeColor = null;
      }
    }
    if (showH && seg.hasHandleOut) {
      const hx = mapX(seg.handleOut.x), hy = mapY(seg.handleOut.y);
      if (finite(hx, hy) && budget.take(2)) {
        const line = new paper.Path.Line(new paper.Point(ax, ay), new paper.Point(hx, hy));
        line.strokeColor = handleColor; line.strokeWidth = handleLineW;
        const hdot = new paper.Path.Circle(new paper.Point(hx, hy), handleR);
        hdot.fillColor = handleColor; hdot.strokeColor = null;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Parallel flow lines
// ---------------------------------------------------------------------------

interface FlowSample { angle: number; x: number; y: number }

/**
 * Directions actually present in the artwork: straight segments contribute
 * their own direction, curves contribute tangent samples. Angles use the
 * designer convention (0° horizontal, 45° rising to the right).
 */
function collectFlowSamples(paths: paper.Path[], minLen: number): FlowSample[] {
  const out: FlowSample[] = [];
  for (const path of paths) {
    const segs = path.segments;
    if (!segs || segs.length < 2) continue;
    for (const curve of path.curves ?? []) {
      const len = curve.length;
      if (!Number.isFinite(len) || len < minLen) continue;
      if (!curve.hasHandles()) {
        // Straight edge: the chord IS the direction.
        const p1 = curve.point1, p2 = curve.point2;
        out.push({ angle: orientationDeg(p2.x - p1.x, p2.y - p1.y), x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
        continue;
      }
      for (const t of [0.05, 0.5, 0.95]) {
        try {
          const pt = curve.getPointAt(len * t);
          const tan = curve.getTangentAt(len * t);
          if (!pt || !tan) continue;
          out.push({ angle: orientationDeg(tan.x, tan.y), x: pt.x, y: pt.y });
        } catch { /* skip */ }
      }
    }
  }
  return out;
}

export function renderParallelFlowLines(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext,
  maxFlowLines: number = 5
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const budget = new Budget();
  const labels = new LabelPlacer(8);

  const diag = diagonalOf(bounds);
  if (!(diag > 0)) return;
  const samples = collectFlowSamples(paths, Math.max(m.len(2), Math.min(bounds.width, bounds.height) * 0.02));
  if (!samples.length) return;

  const angleTolerance = 3;
  interface AngleGroup { angle: number; points: { x: number; y: number }[] }
  const groups: AngleGroup[] = [];
  for (const s of samples) {
    let found = false;
    for (const g of groups) {
      const diff = Math.abs(g.angle - s.angle);
      if (diff <= angleTolerance || diff >= 180 - angleTolerance) {
        g.points.push({ x: s.x, y: s.y });
        found = true;
        break;
      }
    }
    if (!found) groups.push({ angle: s.angle, points: [{ x: s.x, y: s.y }] });
  }

  groups.sort((a, b) => b.points.length - a.points.length);
  const topGroups = groups.slice(0, Math.max(1, Math.min(12, maxFlowLines)));
  const ext = m.len(30);
  const clipLeft = bounds.left - ext, clipTop = bounds.top - ext;
  const clipRight = bounds.right + ext, clipBottom = bounds.bottom + ext;
  const font = m.font(9);

  topGroups.forEach((group, gIdx) => {
    const { dx, dy } = dirOf(group.angle);
    const lineColor = gIdx < 2 ? color : dimColor;
    const sw = m.stroke(style.strokeWidth * (gIdx < 2 ? 1 : 0.7));
    // Normal of the family: points that share this projection are on one line.
    const perpDx = -dy, perpDy = dx;

    const projections = group.points
      .map(p => ({ proj: p.x * perpDx + p.y * perpDy, x: p.x, y: p.y }))
      .sort((a, b) => a.proj - b.proj);

    const minSpacing = Math.max(m.len(2), Math.min(bounds.width, bounds.height) * 0.04);
    const uniqueLines: { x: number; y: number }[] = [];
    let lastProj = -Infinity;
    for (const p of projections) {
      if (!uniqueLines.length || p.proj - lastProj > minSpacing) {
        uniqueLines.push({ x: p.x, y: p.y });
        lastProj = p.proj;
      }
    }

    uniqueLines.forEach((pt, lIdx) => {
      if (!budget.take(1)) return;
      const clipped = clipLineToRect(
        pt.x - dx * diag, pt.y - dy * diag, pt.x + dx * diag, pt.y + dy * diag,
        clipLeft, clipTop, clipRight, clipBottom,
      );
      if (!clipped) return;
      const line = new paper.Path.Line(new paper.Point(clipped[0], clipped[1]), new paper.Point(clipped[2], clipped[3]));
      line.strokeColor = lineColor;
      line.strokeWidth = sw;
      line.dashArray = lIdx === 0 ? [] : m.dash(5, 3);
    });

    if (gIdx < 3) {
      labels.place(bounds.right + m.len(8), bounds.top + m.len(12) + gIdx * font * 1.5,
        `${formatAngle(group.angle)} (${group.points.length})`,
        { size: font, color: gIdx < 2 ? color : dimColor, bold: true, justification: 'left', prefer: 'down' });
    }
  });
}

// ---------------------------------------------------------------------------
// Underlying circles
// ---------------------------------------------------------------------------

export interface CircleFit { cx: number; cy: number; r: number; rms: number }

/**
 * Least-squares circle through the sampled points (Kåsa / algebraic fit) plus
 * the RMS radial residual, so a curve that is NOT an arc can be rejected
 * instead of contributing an invented circle.
 */
export function fitCircle(points: { x: number; y: number }[]): CircleFit | null {
  const pts = points.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < 3) return null;
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= n; my /= n;

  let sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0;
  for (const p of pts) {
    const u = p.x - mx, v = p.y - my;
    const z = u * u + v * v;
    sxx += u * u; sxy += u * v; syy += v * v;
    sxz += u * z; syz += v * z;
  }
  const det = sxx * syy - sxy * sxy;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const uc = (sxz * syy - syz * sxy) / (2 * det);
  const vc = (syz * sxx - sxz * sxy) / (2 * det);
  const cx = mx + uc, cy = my + vc;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  let sum = 0;
  const dists: number[] = [];
  for (const p of pts) {
    const d = Math.hypot(p.x - cx, p.y - cy);
    dists.push(d); sum += d;
  }
  const r = sum / n;
  if (!(r > 0) || !Number.isFinite(r)) return null;
  let acc = 0;
  for (const d of dists) acc += (d - r) * (d - r);
  return { cx, cy, r, rms: Math.sqrt(acc / n) };
}

export function renderUnderlyingCircles(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const labels = new LabelPlacer(4);
  const budget = new Budget();

  const minR = Math.min(bounds.width, bounds.height) * 0.05;
  const maxR = Math.max(bounds.width, bounds.height) * 2;

  interface Candidate extends CircleFit { score: number }
  const candidates: Candidate[] = [];

  for (const path of paths) {
    for (const curve of path.curves ?? []) {
      if (!curve.hasHandles()) continue;
      const cLen = curve.length;
      if (!Number.isFinite(cLen) || cLen < 1) continue;
      const samples: { x: number; y: number }[] = [];
      for (let i = 0; i <= 6; i++) {
        const pt = safeCurvePoint(curve, (i / 6) * cLen);
        if (pt) samples.push({ x: pt.x, y: pt.y });
      }
      const fit = fitCircle(samples);
      if (!fit) continue;
      if (!(fit.r >= minR) || fit.r > maxR) continue;
      // The curve must really BE an arc of that circle.
      if (fit.rms > fit.r * 0.04) continue;

      const tol = fit.r * 0.12;
      const match = candidates.find(c => Math.hypot(c.cx - fit.cx, c.cy - fit.cy) < tol && Math.abs(c.r - fit.r) < tol);
      if (match) {
        // Weighted merge keeps the fit honest as evidence accumulates.
        const w = match.score, tw = w + 1;
        match.cx = (match.cx * w + fit.cx) / tw;
        match.cy = (match.cy * w + fit.cy) / tw;
        match.r = (match.r * w + fit.r) / tw;
        match.score = tw;
        continue;
      }
      candidates.push({ ...fit, score: 1 });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.rms - b.rms);

  // Unbounded before: complex logos produced hundreds of overlapping circles.
  candidates.slice(0, MAX_UNDERLYING_CIRCLES).forEach((c, idx) => {
    if (!budget.take(3)) return;
    const circle = new paper.Path.Circle(new paper.Point(c.cx, c.cy), c.r);
    circle.strokeColor = idx < 2 ? color : dimColor;
    circle.strokeWidth = m.stroke(style.strokeWidth * (idx < 2 ? 1 : 0.7));
    circle.fillColor = null;
    circle.dashArray = m.dash(6, 3);

    const crossSize = Math.min(c.r * 0.15, m.len(6));
    const hCross = new paper.Path.Line(new paper.Point(c.cx - crossSize, c.cy), new paper.Point(c.cx + crossSize, c.cy));
    hCross.strokeColor = idx < 2 ? color : dimColor;
    hCross.strokeWidth = m.stroke(style.strokeWidth * 0.5);
    const vCross = new paper.Path.Line(new paper.Point(c.cx, c.cy - crossSize), new paper.Point(c.cx, c.cy + crossSize));
    vCross.strokeColor = idx < 2 ? color : dimColor;
    vCross.strokeWidth = m.stroke(style.strokeWidth * 0.5);

    if (idx < 2) {
      labels.place(c.cx + crossSize + m.len(3), c.cy - m.len(3), `r ${formatLength(c.r, context)}`, {
        size: m.font(8), color, justification: 'left', prefer: 'up',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Dominant diagonals
// ---------------------------------------------------------------------------

export interface DiagonalCandidate {
  /** A point on the line. */
  x: number;
  y: number;
  /** Orientation in [0,180), designer convention. */
  angle: number;
  /** Signed distance of the line from the origin along its normal. */
  offset: number;
  /** Total edge length supporting this line. */
  weight: number;
}

/** Perpendicular offset of the line through (x, y) with orientation `angle`. */
export function lineOffset(x: number, y: number, angleDeg: number): number {
  const { dx, dy } = dirOf(angleDeg);
  return x * -dy + y * dx;
}

function angleGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
}

/**
 * Straight edges of the artwork grouped into the lines they lie on. Grouping
 * by angle AND perpendicular offset merges collinear edges that are far
 * apart (the old midpoint proximity test kept them as separate guides) and
 * keeps parallel-but-distinct edges separate.
 */
export function collectDiagonals(
  paths: paper.Path[],
  minLen: number,
  offsetTolerance: number,
  angleTolerance = 4,
): DiagonalCandidate[] {
  const out: DiagonalCandidate[] = [];
  for (const path of paths) {
    for (const curve of path.curves ?? []) {
      if (curve.hasHandles()) continue; // only real straight edges
      const p1 = curve.point1, p2 = curve.point2;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (!(len >= minLen)) continue;
      const angle = orientationDeg(dx, dy);
      // Horizontal / vertical edges belong to the alignment guides.
      if (angle < 10 || angle > 170 || (angle > 80 && angle < 100)) continue;
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const offset = lineOffset(mx, my, angle);
      const match = out.find(c => angleGap(c.angle, angle) <= angleTolerance && Math.abs(c.offset - offset) <= offsetTolerance);
      if (match) {
        const w = match.weight, tw = w + len;
        match.angle = (match.angle * w + angle * len) / tw;
        match.offset = (match.offset * w + offset * len) / tw;
        match.x = (match.x * w + mx * len) / tw;
        match.y = (match.y * w + my * len) / tw;
        match.weight = tw;
        continue;
      }
      out.push({ x: mx, y: my, angle, offset, weight: len });
    }
  }
  return out.sort((a, b) => b.weight - a.weight);
}

export function renderDominantDiagonals(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.4);
  const labels = new LabelPlacer(6);
  const diag = diagonalOf(bounds);
  if (!(diag > 0)) return;

  const minLen = Math.max(m.len(3), Math.min(bounds.width, bounds.height) * 0.03);
  const candidates = collectDiagonals(paths, minLen, Math.max(m.len(2), diag * 0.015));
  const topLines = candidates.slice(0, 6);
  const ext = m.len(15);
  const font = m.font(8);

  topLines.forEach((l, idx) => {
    const { dx, dy } = dirOf(l.angle);
    const clipped = clipLineToRect(
      l.x - dx * diag, l.y - dy * diag, l.x + dx * diag, l.y + dy * diag,
      bounds.left - ext, bounds.top - ext, bounds.right + ext, bounds.bottom + ext,
    );
    if (!clipped) return;
    const line = new paper.Path.Line(new paper.Point(clipped[0], clipped[1]), new paper.Point(clipped[2], clipped[3]));
    line.strokeColor = idx < 2 ? color : dimColor;
    line.strokeWidth = m.stroke(style.strokeWidth * (idx < 2 ? 1 : 0.6));
    line.dashArray = m.dash(8, 4);
    if (idx < 3) {
      labels.place(bounds.right + m.len(8), bounds.bottom - m.len(8) - idx * font * 1.6, formatAngle(l.angle), {
        size: font, color: idx < 2 ? color : dimColor, justification: 'left', prefer: 'up',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Curvature comb
// ---------------------------------------------------------------------------

interface CombSample { x: number; y: number; nx: number; ny: number; k: number }

export function renderCurvatureComb(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.45);
  const budget = new Budget();
  const maxTooth = Math.max(m.len(4), Math.min(bounds.width, bounds.height) * 0.12);
  // Global budget: 100 teeth × thousands of paths froze the tab.
  const perPathBudget = Math.max(8, Math.floor(MAX_RENDER_ITEMS / Math.max(1, paths.length)));

  // Pass 1 — sample the REAL curvature (1/radius, signed) along every path.
  const perPath: CombSample[][] = [];
  const magnitudes: number[] = [];
  for (const path of paths) {
    const len = path.length;
    if (!Number.isFinite(len) || len < 5) { perPath.push([]); continue; }
    const steps = Math.min(100, perPathBudget, Math.max(20, Math.floor(len / 2)));
    const samples: CombSample[] = [];
    for (let i = 0; i < steps; i++) {
      const offset = (i / steps) * len;
      try {
        const point = path.getPointAt(offset);
        const normal = path.getNormalAt(offset);
        const k = path.getCurvatureAt(offset);
        if (!point || !normal || k === null || k === undefined || !Number.isFinite(k)) continue;
        samples.push({ x: point.x, y: point.y, nx: normal.x, ny: normal.y, k });
        magnitudes.push(Math.abs(k));
      } catch { /* skip */ }
    }
    perPath.push(samples);
  }

  // Pass 2 — one proportional scale for the whole drawing: the 90th
  // percentile curvature maps to the longest tooth, so the comb compares
  // curvature ACROSS the logo instead of using a magic multiplier.
  const kRef = percentile(magnitudes, 0.9);
  if (!(kRef > 0)) return;
  const scale = maxTooth / kRef;
  const minTooth = Math.max(m.len(0.6), 0.25);

  paths.forEach((path, pIdx) => {
    const samples = perPath[pIdx];
    if (!samples?.length) return;
    const tips: paper.Point[] = [];
    for (const s of samples) {
      // Signed: the comb flips side at inflection points, which is the whole
      // point of a curvature comb. `Math.abs` hid them.
      const toothLen = Math.max(-maxTooth, Math.min(maxTooth, s.k * scale));
      const tip = new paper.Point(s.x + s.nx * toothLen, s.y + s.ny * toothLen);
      if (Math.abs(toothLen) < minTooth) continue;
      if (!budget.take(1)) return;
      const tooth = new paper.Path.Line(new paper.Point(s.x, s.y), tip);
      tooth.strokeColor = color;
      tooth.strokeWidth = m.stroke(style.strokeWidth * 0.4);
      tips.push(tip);
    }
    // The envelope is what makes a comb readable (smooth = even curvature).
    if (tips.length >= 3 && budget.take(1)) {
      const envelope = new paper.Path(tips);
      envelope.strokeColor = dimColor;
      envelope.strokeWidth = m.stroke(style.strokeWidth * 0.5);
      envelope.fillColor = null;
      envelope.closed = false;
    }
  });
}

// ---------------------------------------------------------------------------
// Skeleton / medial axis
// ---------------------------------------------------------------------------

export interface MedialSample { x: number; y: number; half: number }

/** Principal direction (unit vector) of a point cloud. */
export function principalDirection(points: { x: number; y: number }[]): { x: number; y: number } {
  const n = points.length;
  if (n < 2) return { x: 1, y: 0 };
  let mx = 0, my = 0;
  for (const p of points) { mx += p.x; my += p.y; }
  mx /= n; my /= n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of points) {
    const u = p.x - mx, v = p.y - my;
    sxx += u * u; sxy += u * v; syy += v * v;
  }
  if (sxx + syy <= 0) return { x: 1, y: 0 };
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { x: Math.cos(theta), y: Math.sin(theta) };
}

/**
 * Medial samples of a closed path: from each outline sample a ray is cast
 * INWARDS and the midpoint to the opposite wall is kept. That follows the
 * axis of the stroke — the previous version paired points half a perimeter
 * apart, which only works for a blob and drifted towards the bbox diagonal
 * on anything L- or C-shaped.
 */
export function medialSamples(path: paper.Path, maxSamples = 48): MedialSample[] {
  const out: MedialSample[] = [];
  const len = path.length;
  if (!path.closed || !Number.isFinite(len) || len <= 0) return out;
  const b = path.bounds;
  const reach = Math.hypot(b.width, b.height);
  if (!(reach > 0)) return out;
  const eps = Math.max(reach * 1e-3, 1e-6);
  const steps = Math.max(8, Math.min(maxSamples, Math.floor(len / Math.max(eps, 1e-9))));

  for (let i = 0; i < steps; i++) {
    const offset = (i / steps) * len;
    let p: paper.Point | null = null;
    let n: paper.Point | null = null;
    try {
      p = path.getPointAt(offset) ?? null;
      n = path.getNormalAt(offset) ?? null;
    } catch { continue; }
    if (!p || !n) continue;
    const nl = Math.hypot(n.x, n.y);
    if (!(nl > 0)) continue;
    let ix = n.x / nl, iy = n.y / nl;
    let probe = new paper.Point(p.x + ix * eps, p.y + iy * eps);
    if (!path.contains(probe)) {
      ix = -ix; iy = -iy;
      probe = new paper.Point(p.x + ix * eps, p.y + iy * eps);
      if (!path.contains(probe)) continue; // degenerate / zero-area
    }
    const ray = new paper.Path.Line(probe, new paper.Point(p.x + ix * reach, p.y + iy * reach));
    let hit: paper.Point | null = null;
    let bestD = Infinity;
    try {
      for (const loc of ray.getIntersections(path)) {
        const d = Math.hypot(loc.point.x - p.x, loc.point.y - p.y);
        if (d > eps * 2 && d < bestD) { bestD = d; hit = loc.point; }
      }
    } catch { /* skip */ }
    ray.remove();
    if (!hit || !Number.isFinite(bestD)) continue;
    out.push({ x: (p.x + hit.x) / 2, y: (p.y + hit.y) / 2, half: bestD / 2 });
  }
  return out;
}

export function renderSkeletonCenterline(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labels = new LabelPlacer(6);
  const budget = new Budget();

  const closed = paths
    .filter(p => p.closed && Number.isFinite(p.length) && p.length > 5)
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_SKELETON_PATHS);

  closed.forEach((path, idx) => {
    const raw = medialSamples(path, 48);
    if (raw.length < 3) return;

    // Chords that cross a concavity are much longer than the stroke: drop
    // them so the axis follows the stroke instead of jumping across the shape.
    const halves = raw.map(s => s.half).sort((a, b) => a - b);
    const median = halves[halves.length >> 1];
    if (!(median > 0)) return;
    const kept = raw.filter(s => s.half <= median * 2.2 && s.half >= median * 0.25);
    if (kept.length < 3) return;

    // Each axis point is found twice (once from each wall): merge them.
    const cell = Math.max(median * 0.5, 1e-6);
    const seen = new Map<string, { x: number; y: number; n: number }>();
    for (const s of kept) {
      const key = `${Math.round(s.x / cell)}:${Math.round(s.y / cell)}`;
      const acc = seen.get(key);
      if (acc) { acc.x += s.x; acc.y += s.y; acc.n++; } else { seen.set(key, { x: s.x, y: s.y, n: 1 }); }
    }
    const pts = [...seen.values()].map(a => ({ x: a.x / a.n, y: a.y / a.n }));
    if (pts.length < 3) return;

    // Order along the main direction of the axis, otherwise the polyline
    // zig-zags between the two walls.
    const dir = principalDirection(pts);
    pts.sort((a, b) => (a.x * dir.x + a.y * dir.y) - (b.x * dir.x + b.y * dir.y));

    if (!budget.take(1)) return;
    const skeleton = new paper.Path();
    skeleton.strokeColor = color;
    skeleton.strokeWidth = m.stroke(style.strokeWidth);
    skeleton.fillColor = null;
    skeleton.dashArray = m.dash(3, 2);
    for (const pt of pts) skeleton.add(new paper.Segment(new paper.Point(pt.x, pt.y)));
    if (skeleton.segments.length > 2) skeleton.smooth({ type: 'catmull-rom', factor: 0.5 });

    // A stroke that keeps one weight is the point of a skeleton: say it once.
    if (idx === 0) {
      labels.place(skeleton.bounds.right + m.len(6), skeleton.bounds.center.y, `stem ${formatLength(median * 2, context)}`, {
        size: m.font(8), color, justification: 'left', prefer: 'down',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Construction grid
// ---------------------------------------------------------------------------

export interface CoordCluster { value: number; count: number }

/** Group coordinates that repeat within `tolerance`, strongest first. */
export function clusterCoordinates(coords: number[], tolerance: number, minCount = 2): CoordCluster[] {
  const finite = coords.filter(Number.isFinite);
  if (finite.length < minCount || !(tolerance > 0)) return [];
  const sorted = [...finite].sort((a, b) => a - b);
  const clusters: { sum: number; count: number; last: number }[] = [];
  for (const v of sorted) {
    const cur = clusters[clusters.length - 1];
    if (cur && v - cur.last <= tolerance) { cur.sum += v; cur.count++; cur.last = v; }
    else clusters.push({ sum: v, count: 1, last: v });
  }
  return clusters
    .filter(c => c.count >= minCount)
    .map(c => ({ value: c.sum / c.count, count: c.count }))
    .sort((a, b) => b.count - a.count);
}

export function renderConstructionGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.3);
  const labels = new LabelPlacer(8);

  const xCoords: number[] = [];
  const yCoords: number[] = [];
  for (const path of paths) {
    for (const seg of path.segments ?? []) {
      xCoords.push(seg.point.x);
      yCoords.push(seg.point.y);
    }
    // Extremes of each subpath are construction lines too (the tangent points
    // of a circle have no node, yet every grid in a logo manual shows them).
    const b = path.bounds;
    if (b && Number.isFinite(b.left) && b.width >= 0) { xCoords.push(b.left, b.right); }
    if (b && Number.isFinite(b.top) && b.height >= 0) { yCoords.push(b.top, b.bottom); }
  }
  if (xCoords.length < 3) return;

  const span = Math.min(bounds.width, bounds.height);
  const tolerance = Math.max(m.len(0.5), (span > 0 ? span : diagonalOf(bounds)) * 0.015);
  const xClusters = clusterCoordinates(xCoords, tolerance).slice(0, 12);
  const yClusters = clusterCoordinates(yCoords, tolerance).slice(0, 12);
  const ext = m.len(15);

  xClusters.forEach(c => {
    const line = new paper.Path.Line(new paper.Point(c.value, bounds.top - ext), new paper.Point(c.value, bounds.bottom + ext));
    const isPrimary = c.count >= 3;
    line.strokeColor = isPrimary ? color : dimColor;
    line.strokeWidth = m.stroke(style.strokeWidth * (isPrimary ? 0.8 : 0.5));
    line.dashArray = isPrimary ? m.dash(6, 3) : m.dash(2, 3);
  });

  yClusters.forEach(c => {
    const line = new paper.Path.Line(new paper.Point(bounds.left - ext, c.value), new paper.Point(bounds.right + ext, c.value));
    const isPrimary = c.count >= 3;
    line.strokeColor = isPrimary ? color : dimColor;
    line.strokeWidth = m.stroke(style.strokeWidth * (isPrimary ? 0.8 : 0.5));
    line.dashArray = isPrimary ? m.dash(6, 3) : m.dash(2, 3);
  });

  if (xClusters.length + yClusters.length > 0) {
    const font = m.font(8);
    labels.place(bounds.left - m.len(5), bounds.top - m.len(8),
      `${xClusters.length}×${yClusters.length} grid · ±${formatLength(tolerance, context)}`,
      { size: font, color, justification: 'left', prefer: 'up' });
  }
}

// ---------------------------------------------------------------------------
// Path direction arrows
// ---------------------------------------------------------------------------

/** Arrow heads drawn per path (longest curves first). */
const MAX_ARROWS_PER_PATH = 12;

export function renderPathDirectionArrows(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const budget = new Budget();
  // Proportional head: fixed pixels vanished on a 4096px export.
  const size = Math.max(m.len(3), Math.min(bounds.width, bounds.height) * 0.02);
  const HEAD = 2.5; // radians from the tip direction to the barbs

  for (const path of paths) {
    const len = path.length;
    if (!Number.isFinite(len) || len < 5) continue;
    const curves = (path.curves ?? [])
      .map((c, i) => ({ c, i, len: c.length }))
      .filter(e => Number.isFinite(e.len) && e.len > size * 1.5)
      .sort((a, b) => b.len - a.len)
      .slice(0, MAX_ARROWS_PER_PATH);
    if (!curves.length) continue;

    for (const entry of curves) {
      // Middle of the segment, oriented by the tangent there.
      const mid = entry.len / 2;
      let point: paper.Point | null = null;
      let tangent: paper.Point | null = null;
      try {
        point = entry.c.getPointAt(mid) ?? null;
        tangent = entry.c.getTangentAt(mid) ?? null;
      } catch { continue; }
      if (!point || !tangent) continue;
      const angle = Math.atan2(tangent.y, tangent.x);
      if (!Number.isFinite(angle)) continue;
      if (!budget.take(1)) return;
      const tip = new paper.Point(point.x + Math.cos(angle) * size, point.y + Math.sin(angle) * size);
      const left = new paper.Point(point.x + Math.cos(angle + HEAD) * size * 0.7, point.y + Math.sin(angle + HEAD) * size * 0.7);
      const right = new paper.Point(point.x + Math.cos(angle - HEAD) * size * 0.7, point.y + Math.sin(angle - HEAD) * size * 0.7);
      const arrow = new paper.Path([new paper.Segment(tip), new paper.Segment(left), new paper.Segment(right)]);
      arrow.closed = true;
      arrow.fillColor = color;
      arrow.strokeColor = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Tangent intersections
// ---------------------------------------------------------------------------

const MAX_TANGENT_INTERSECTIONS = 20;

export function renderTangentIntersections(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.35);
  const budget = new Budget();

  interface Hit { ix: number; iy: number; ax: number; ay: number; bx: number; by: number; weight: number }
  const hits: Hit[] = [];

  for (const path of paths) {
    for (const curve of path.curves ?? []) {
      if (!curve.hasHandles()) continue;
      const cLen = curve.length;
      if (!Number.isFinite(cLen) || cLen < 0.5) continue;
      let p1: paper.Point | null = null, d1: paper.Point | null = null;
      let p2: paper.Point | null = null, d2: paper.Point | null = null;
      try {
        // The construction point is where the tangents AT THE ENDS meet;
        // sampling slightly inside the curve (the old code used a fixed 0.1
        // offset) tilted both tangents and moved the corner by several px.
        p1 = curve.getPointAt(0) ?? null;
        d1 = curve.getTangentAt(0) ?? null;
        p2 = curve.getPointAt(cLen) ?? null;
        d2 = curve.getTangentAt(cLen) ?? null;
      } catch { continue; }
      if (!p1 || !d1 || !p2 || !d2) continue;

      const cross = d1.x * d2.y - d1.y * d2.x;
      if (Math.abs(cross) < 1e-4) continue; // parallel tangents: no corner
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const s = (dx * d2.y - dy * d2.x) / cross;
      if (!Number.isFinite(s)) continue;
      // The construction point of an arc sits within a segment length of it;
      // anything further comes from nearly-parallel tangents.
      if (Math.abs(s) > cLen * 2) continue;
      const ix = p1.x + s * d1.x, iy = p1.y + s * d1.y;
      if (!Number.isFinite(ix) || !Number.isFinite(iy)) continue;
      hits.push({ ix, iy, ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y, weight: cLen });
    }
  }

  // Merge duplicates BEFORE drawing: the old version capped the markers but
  // still drew two dashed tangents for every curve in the artwork.
  const tol = Math.max(m.len(2), diagonalOf(bounds) * 0.01);
  const merged: Hit[] = [];
  for (const h of hits.sort((a, b) => b.weight - a.weight)) {
    if (merged.some(o => Math.hypot(o.ix - h.ix, o.iy - h.iy) < tol)) continue;
    merged.push(h);
    if (merged.length >= MAX_TANGENT_INTERSECTIONS) break;
  }

  const markerSize = Math.max(m.len(3), Math.min(bounds.width, bounds.height) * 0.012);
  for (const h of merged) {
    if (!budget.take(3)) return;
    const ip = new paper.Point(h.ix, h.iy);
    const line1 = new paper.Path.Line(new paper.Point(h.ax, h.ay), ip);
    line1.strokeColor = dimColor;
    line1.strokeWidth = m.stroke(style.strokeWidth * 0.5);
    line1.dashArray = m.dash(3, 3);
    const line2 = new paper.Path.Line(new paper.Point(h.bx, h.by), ip);
    line2.strokeColor = dimColor;
    line2.strokeWidth = m.stroke(style.strokeWidth * 0.5);
    line2.dashArray = m.dash(3, 3);

    const diamond = new paper.Path([
      new paper.Segment(new paper.Point(h.ix, h.iy - markerSize)),
      new paper.Segment(new paper.Point(h.ix + markerSize, h.iy)),
      new paper.Segment(new paper.Point(h.ix, h.iy + markerSize)),
      new paper.Segment(new paper.Point(h.ix - markerSize, h.iy)),
    ]);
    diamond.closed = true;
    diamond.fillColor = color;
    diamond.strokeColor = null;
  }
}

// ---------------------------------------------------------------------------
// Anchor points
// ---------------------------------------------------------------------------

export function renderAnchorPoints(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext,
  pointSize: number = 3
) {
  const paths = inkPaths(context);
  if (!paths.length || !finiteRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const outlineColor = hexToColor(style.color, style.opacity * 0.2);
  const haloColor = hexToColor('#ffffff', style.opacity * 0.8);
  const labels = new LabelPlacer(4);
  const budget = new Budget();
  const r = m.dot(Number.isFinite(pointSize) ? pointSize : 3);
  const eps = Math.max(1e-9, diagonalOf(bounds) * 1e-4);
  const layer = paper.project?.activeLayer ?? null;

  let totalPoints = 0, smoothCount = 0, cornerCount = 0;

  for (const path of paths) {
    if (!path.segments?.length) continue;

    // clone() inserts next to the ORIGINAL, i.e. inside the logo layer of a
    // layered export. Clone detached and adopt it into the current layer.
    if (layer && budget.take(1)) {
      let outline: paper.Path | null = null;
      try { outline = path.clone({ insert: false }) as paper.Path; } catch { outline = null; }
      if (outline) {
        layer.addChild(outline);
        outline.fillColor = null;
        outline.strokeColor = outlineColor;
        outline.strokeWidth = m.stroke(style.strokeWidth * 0.3);
        outline.dashArray = m.dash(2, 2);
      }
    }

    for (const seg of path.segments) {
      totalPoints++;
      const hasHandles = (!!seg.handleIn && (Math.abs(seg.handleIn.x) > eps || Math.abs(seg.handleIn.y) > eps)) ||
        (!!seg.handleOut && (Math.abs(seg.handleOut.x) > eps || Math.abs(seg.handleOut.y) > eps));
      if (hasHandles) smoothCount++; else cornerCount++;
      if (!budget.take(1)) continue;
      const pt = new paper.Point(seg.point.x, seg.point.y);
      const marker = hasHandles
        ? new paper.Path.Circle(pt, r)
        : new paper.Path.Rectangle(new paper.Rectangle(pt.x - r, pt.y - r, r * 2, r * 2));
      marker.fillColor = color;
      marker.strokeColor = haloColor;
      marker.strokeWidth = m.stroke(style.strokeWidth * 0.3);
    }
  }

  if (totalPoints > 0) {
    labels.place(bounds.right + m.len(8), bounds.top + m.len(12), `${totalPoints} pts (${smoothCount}○ ${cornerCount}□)`, {
      size: m.font(9), color, bold: true, justification: 'left', prefer: 'down',
    });
  }
}

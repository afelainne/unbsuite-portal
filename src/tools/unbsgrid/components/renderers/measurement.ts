import paper from 'paper';
import {
  hexToColor, intersectsAnyPath, showIfIntersects, isUsableRect, formatLength,
  type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor } from './scale';

// ---------------------------------------------------------------------------
// Angle math (pure, testable)
// ---------------------------------------------------------------------------

/** Below this a paper Arc cannot be built (the three points are collinear). */
const MIN_ARC_ANGLE = 0.5;

/** Normalize an angle to [0, 360). Never returns -0, NaN becomes 0. */
export function normalizeDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  const d = deg % 360;
  if (d === 0) return 0; // also maps -0 to 0
  return d < 0 ? d + 360 : d;
}

/** Signed shortest difference `b - a`, in (-180, 180]. */
export function deltaDeg(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  let d = (b - a) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d === 0 ? 0 : d;
}

/**
 * Orientation of a direction given in SCREEN deltas (y grows downwards),
 * expressed the way a designer reads it: 0° = horizontal, 45° = going up to
 * the right, measured counter-clockwise, folded into [0, 180).
 */
export function orientationDeg(dx: number, dy: number): number {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (dx === 0 && dy === 0) return 0;
  const a = ((Math.atan2(-dy, dx) * 180) / Math.PI) % 180;
  const v = (a + 180) % 180;
  return v === 0 ? 0 : v;
}

/** Angle label: normalized, no "-0°", integer when it is (almost) round. */
export function formatAngle(deg: number, decimals = 1): string {
  const v = normalizeDeg(deg);
  const rounded = Math.round(v);
  if (Math.abs(v - rounded) < 0.05) return `${rounded % 360}°`;
  const fixed = Number(v.toFixed(decimals));
  return `${fixed >= 360 ? 0 : fixed}°`;
}

/**
 * Three points of the arc that marks angle `angleDeg` at corner (x, y)
 * (screen coordinates, counter-clockwise from the +x axis). The "through"
 * point is always the true mid-angle point on the circle.
 */
export function angleArcPoints(x: number, y: number, radius: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return {
    from: { x: x + radius, y },
    through: { x: x + radius * Math.cos(a / 2), y: y - radius * Math.sin(a / 2) },
    to: { x: x + radius * Math.cos(a), y: y - radius * Math.sin(a) },
  };
}

export interface ArcPoints {
  from: { x: number; y: number };
  through: { x: number; y: number };
  to: { x: number; y: number };
  /** Signed sweep in (-180, 180]: always the MINOR arc. */
  sweep: number;
  /** Direction (screen degrees) of the middle of the arc. */
  midDeg: number;
}

/**
 * Minor arc between two screen directions around (cx, cy). Angles are raw
 * screen angles (`atan2(dy, dx)`), so the caller never has to flip signs.
 * The mid point is on the SHORT side, which is what stops paper from drawing
 * the complementary, almost-full circle.
 */
export function arcPointsBetween(cx: number, cy: number, r: number, startDeg: number, endDeg: number): ArcPoints {
  const sweep = deltaDeg(startDeg, endDeg);
  const midDeg = startDeg + sweep / 2;
  const at = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  return { from: at(startDeg), through: at(midDeg), to: at(endDeg), sweep, midDeg };
}

/** Interior angle (0..180) at `corner` between the rays to `a` and `b`. */
export function interiorAngleDeg(
  a: { x: number; y: number },
  corner: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const v1x = a.x - corner.x, v1y = a.y - corner.y;
  const v2x = b.x - corner.x, v2y = b.y - corner.y;
  const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y);
  if (!(l1 > 0) || !(l2 > 0)) return NaN;
  const cos = (v1x * v2x + v1y * v2y) / (l1 * l2);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Label placement
// ---------------------------------------------------------------------------

export interface LabelOptions {
  size: number;
  color: paper.Color;
  justification?: 'left' | 'center' | 'right';
  bold?: boolean;
  /** Preferred nudge direction when the slot is already taken. */
  prefer?: 'up' | 'down';
}

/**
 * Creates PointText labels while keeping them from stacking on top of each
 * other. Widths are ESTIMATED from the character count on purpose: canvas
 * text metrics are unavailable in headless environments and differ between
 * the preview and the exported SVG, so measuring would make the layout
 * non-deterministic. A label with no free slot nearby is dropped instead of
 * being piled onto its neighbour.
 */
export class LabelPlacer {
  private readonly taken: { l: number; t: number; r: number; b: number }[] = [];
  private placed = 0;

  constructor(private readonly max = 160) {}

  get count(): number { return this.placed; }

  /** Mark a rectangle as occupied (e.g. the logo itself). */
  reserve(l: number, t: number, r: number, b: number): void {
    if ([l, t, r, b].every(Number.isFinite)) this.taken.push({ l, t, r, b });
  }

  place(x: number, y: number, content: string, opts: LabelOptions): paper.PointText | null {
    if (this.placed >= this.max) return null;
    if (!content || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const size = Math.max(1, Number.isFinite(opts.size) ? opts.size : 1);
    const w = Math.max(size, content.length * size * 0.58);
    const h = size * 1.2;
    const just = opts.justification ?? 'left';
    const step = h * 1.05;
    const dir = opts.prefer === 'up' ? -1 : 1;

    for (let i = 0; i < 8; i++) {
      const off = i === 0 ? 0 : Math.ceil(i / 2) * step * (i % 2 === 1 ? dir : -dir);
      const yy = y + off;
      const l = just === 'left' ? x : just === 'center' ? x - w / 2 : x - w;
      const box = { l, t: yy - size * 0.85, r: l + w, b: yy - size * 0.85 + h };
      const hit = this.taken.some(o => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t);
      if (hit) continue;
      this.taken.push(box);
      this.placed++;
      const text = new paper.PointText(new paper.Point(x, yy));
      text.content = content;
      text.fillColor = opts.color;
      text.fontSize = size;
      text.justification = just;
      if (opts.bold) text.fontWeight = 'bold';
      return text;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Real-structure helpers
// ---------------------------------------------------------------------------

function safePointAt(path: paper.Path, offset: number): paper.Point | null {
  const len = path.length;
  if (!Number.isFinite(len) || len <= 0) return null;
  try {
    return path.getPointAt(Math.max(0, Math.min(len - 1e-6, offset))) ?? null;
  } catch {
    return null;
  }
}

/** Distance from (x, y) to the nearest ink, capped at `cap` (cheap bbox reject first). */
function nearestInkDistance(paths: paper.Path[], x: number, y: number, cap: number): number {
  const pt = new paper.Point(x, y);
  let best = cap;
  for (const p of paths) {
    const b = p.bounds;
    const dx = x < b.left ? b.left - x : x > b.right ? x - b.right : 0;
    const dy = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0;
    if (Math.hypot(dx, dy) >= best) continue;
    let np: paper.Point | null = null;
    try { np = p.getNearestPoint(pt) ?? null; } catch { np = null; }
    if (!np) continue;
    const d = np.getDistance(pt);
    if (d < best) best = d;
    if (best <= 1e-9) break;
  }
  return best;
}

export interface SymmetryMeasurement {
  /** 0..100. 100 = every sampled point has a mirror on the shape. */
  percent: number;
  /** Mean distance between a mirrored sample and the nearest ink (px). */
  meanDeviation: number;
  /** Worst sampled deviation (px). */
  maxDeviation: number;
  samples: number;
}

const NO_SYMMETRY: SymmetryMeasurement = { percent: 0, meanDeviation: 0, maxDeviation: 0, samples: 0 };

/**
 * REAL mirror symmetry: every sample of the outline is reflected across the
 * axis and matched against the nearest point of the shape itself. A bounding
 * box tells nothing about symmetry (an L and a square share one), so this
 * compares the drawing with its own mirror image.
 *
 * `tolerance` is the deviation that counts as "not symmetric at all"; a good
 * default is a few percent of the ink diagonal.
 */
export function measureMirrorSymmetry(
  paths: paper.Path[] | undefined | null,
  axis: 'vertical' | 'horizontal',
  axisPos: number,
  tolerance: number,
  maxSamples = 140,
): SymmetryMeasurement {
  if (!paths?.length || !Number.isFinite(axisPos) || !(tolerance > 0)) return NO_SYMMETRY;
  const usable = paths.filter(p => !!p && Number.isFinite(p.length) && p.length > 0);
  if (!usable.length) return NO_SYMMETRY;
  // Largest first + a hard cap: complex artwork must not make this quadratic.
  const ranked = usable.length > 80
    ? [...usable].sort((a, b) => b.length - a.length).slice(0, 80)
    : usable;
  const total = ranked.reduce((s, p) => s + p.length, 0);
  if (!(total > 0)) return NO_SYMMETRY;
  // Every sample searches the nearest ink: keep the total work flat as the
  // artwork gets busier (the preview re-runs this on every redraw).
  const budget = ranked.length > 60 ? Math.min(maxSamples, 60)
    : ranked.length > 24 ? Math.min(maxSamples, 90)
      : maxSamples;

  let sum = 0, max = 0, n = 0;
  for (const p of ranked) {
    const share = Math.max(3, Math.min(budget, Math.round((p.length / total) * budget)));
    for (let i = 0; i < share; i++) {
      const pt = safePointAt(p, (i / share) * p.length);
      if (!pt) continue;
      const mx = axis === 'vertical' ? 2 * axisPos - pt.x : pt.x;
      const my = axis === 'horizontal' ? 2 * axisPos - pt.y : pt.y;
      const d = nearestInkDistance(ranked, mx, my, tolerance);
      sum += d;
      if (d > max) max = d;
      n++;
    }
  }
  if (!n) return NO_SYMMETRY;
  const mean = sum / n;
  return {
    percent: Math.max(0, Math.min(100, 100 * (1 - mean / tolerance))),
    meanDeviation: mean,
    maxDeviation: max,
    samples: n,
  };
}

/**
 * Tighten the mapped component boxes to the ink they actually contain, so
 * gaps and alignments are measured on the drawing instead of on rectangles
 * derived from the parse-space bounding boxes.
 */
export function refineComponentBoxes(comps: paper.Rectangle[], context?: RenderContext): paper.Rectangle[] {
  const paths = context?.useRealData ? context.actualPaths : undefined;
  if (!paths?.length || !comps.length) return comps;
  const acc: (paper.Rectangle | null)[] = comps.map(() => null);

  for (const p of paths) {
    const b = p.bounds;
    if (!b || ![b.x, b.y, b.width, b.height].every(Number.isFinite)) continue;
    const cx = b.center.x, cy = b.center.y;
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < comps.length; i++) {
      const r = comps[i];
      if (r.contains(new paper.Point(cx, cy))) { best = i; bestD = 0; break; }
      const dx = Math.max(r.left - cx, 0, cx - r.right);
      const dy = Math.max(r.top - cy, 0, cy - r.bottom);
      const d = Math.hypot(dx, dy);
      const reach = Math.max(1, Math.min(r.width, r.height) * 0.5);
      if (d < bestD && d <= reach) { bestD = d; best = i; }
    }
    if (best < 0) continue;
    acc[best] = acc[best] ? (acc[best] as paper.Rectangle).unite(b) : b.clone();
  }

  return comps.map((r, i) => {
    const got = acc[i];
    return got && got.width >= 0 && got.height >= 0 ? got : r;
  });
}

/** Ink bounds when the real paths are known, the layout bounds otherwise. */
function inkBounds(bounds: paper.Rectangle, context?: RenderContext): paper.Rectangle {
  const cb = context?.contentBounds;
  return cb && isUsableRect(cb) ? cb : bounds;
}

function realPaths(context?: RenderContext): paper.Path[] {
  return context?.useRealData && context.actualPaths?.length ? context.actualPaths : [];
}

// ---------------------------------------------------------------------------
// Symmetry axes
// ---------------------------------------------------------------------------

/** Cap for the mirrored ghost outline (one clone per path). */
const MAX_MIRROR_GHOST_PATHS = 60;

export function renderSymmetryAxes(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);
  const ghostColor = hexToColor(style.color, style.opacity * 0.28);

  const ink = inkBounds(bounds, context);
  const paths = realPaths(context);
  const diag = Math.hypot(ink.width, ink.height);
  const tolerance = diag > 0 ? diag * 0.04 : 0;
  const vSym = tolerance > 0 ? measureMirrorSymmetry(paths, 'vertical', ink.center.x, tolerance) : NO_SYMMETRY;
  const hSym = tolerance > 0 ? measureMirrorSymmetry(paths, 'horizontal', ink.center.y, tolerance) : NO_SYMMETRY;

  const ext = m.len(40);
  const labels = new LabelPlacer(24);
  const font = m.font(9);

  // A stronger axis is drawn heavier: the weight itself carries the reading.
  const weightFor = (s: SymmetryMeasurement) => (s.samples > 0 ? 0.8 + (s.percent / 100) * 0.8 : 1.2);

  const vAxis = new paper.Path.Line(
    new paper.Point(ink.center.x, ink.top - ext),
    new paper.Point(ink.center.x, ink.bottom + ext),
  );
  showIfIntersects(vAxis, context, () => {
    vAxis.strokeColor = color;
    vAxis.strokeWidth = m.stroke(style.strokeWidth * weightFor(vSym));
    vAxis.dashArray = m.dash(10, 4, 2, 4);
  });

  const hAxis = new paper.Path.Line(
    new paper.Point(ink.left - ext, ink.center.y),
    new paper.Point(ink.right + ext, ink.center.y),
  );
  showIfIntersects(hAxis, context, () => {
    hAxis.strokeColor = color;
    hAxis.strokeWidth = m.stroke(style.strokeWidth * weightFor(hSym));
    hAxis.dashArray = m.dash(10, 4, 2, 4);
  });

  const diamondR = m.len(5);
  if (diamondR > 0) {
    const diamond = new paper.Path.RegularPolygon(ink.center, 4, diamondR);
    diamond.strokeColor = color;
    diamond.strokeWidth = m.stroke(style.strokeWidth);
    diamond.fillColor = hexToColor(style.color, style.opacity * 0.2);
    diamond.rotation = 45;
  }

  // Discreet numeric summary of the measured symmetry.
  if (vSym.samples > 0) {
    labels.place(ink.center.x + m.len(4), ink.top - ext + font, `SYM V ${Math.round(vSym.percent)}%`, {
      size: font, color, bold: true, justification: 'left', prefer: 'up',
    });
  }
  if (hSym.samples > 0) {
    labels.place(ink.right + ext + m.len(4), ink.center.y - m.len(3), `SYM H ${Math.round(hSym.percent)}%`, {
      size: font, color, bold: true, justification: 'left', prefer: 'down',
    });
  }

  // Mirror ghost: the shape reflected on its dominant axis, so the reader can
  // see WHERE the symmetry breaks instead of just reading a number.
  const best = vSym.percent >= hSym.percent ? vSym : hSym;
  const bestAxis = vSym.percent >= hSym.percent ? 'vertical' : 'horizontal';
  if (best.samples > 0 && best.percent >= 55 && best.percent < 99.5 && paths.length <= MAX_MIRROR_GHOST_PATHS) {
    const layer = paper.project?.activeLayer;
    for (const p of paths) {
      let ghost: paper.Path | null = null;
      try { ghost = p.clone({ insert: false }) as paper.Path; } catch { ghost = null; }
      if (!ghost) continue;
      // clone({ insert: false }) keeps the item out of the LOGO layer.
      if (layer) layer.addChild(ghost); else ghost.remove();
      if (!ghost.parent) continue;
      ghost.scale(bestAxis === 'vertical' ? -1 : 1, bestAxis === 'vertical' ? 1 : -1, ink.center);
      ghost.fillColor = null;
      ghost.strokeColor = ghostColor;
      ghost.strokeWidth = m.stroke(style.strokeWidth * 0.5);
      ghost.dashArray = m.dash(2, 3);
    }
  }

  const compExt = m.len(15);
  scaledCompBounds.slice(0, 64).forEach(cb => {
    if (!isUsableRect(cb)) return;
    const cv = new paper.Path.Line(new paper.Point(cb.center.x, cb.top - compExt), new paper.Point(cb.center.x, cb.bottom + compExt));
    showIfIntersects(cv, context, () => {
      cv.strokeColor = dimColor;
      cv.strokeWidth = m.stroke(style.strokeWidth * 0.6);
      cv.dashArray = m.dash(6, 3, 2, 3);
    });
    const ch = new paper.Path.Line(new paper.Point(cb.left - compExt, cb.center.y), new paper.Point(cb.right + compExt, cb.center.y));
    showIfIntersects(ch, context, () => {
      ch.strokeColor = dimColor;
      ch.strokeWidth = m.stroke(style.strokeWidth * 0.6);
      ch.dashArray = m.dash(6, 3, 2, 3);
    });
  });
}

// ---------------------------------------------------------------------------
// Angle measurements
// ---------------------------------------------------------------------------

export interface CornerAngle {
  x: number;
  y: number;
  /** Interior angle in degrees (0..180). */
  angle: number;
  /** Screen direction of the incoming leg (pointing away from the corner). */
  startDeg: number;
  /** Screen direction of the outgoing leg. */
  endDeg: number;
  /** Shortest adjacent leg length — how much the corner "matters". */
  weight: number;
}

function tangentAt(curve: paper.Curve, offset: number): paper.Point | null {
  try {
    const t = curve.getTangentAt(Math.max(0, Math.min(curve.length, offset)));
    return t && Number.isFinite(t.x) && Number.isFinite(t.y) && (t.x !== 0 || t.y !== 0) ? t : null;
  } catch {
    return null;
  }
}

/**
 * Real corner angles of the artwork: at every node the tangents of the two
 * adjacent curves are compared. Smooth joins (≈180°) and hairline spikes are
 * dropped, so what remains are the angles a designer would actually dimension.
 */
export function extractCornerAngles(
  paths: paper.Path[] | undefined | null,
  minLeg: number,
  maxCorners = 10,
): CornerAngle[] {
  if (!paths?.length) return [];
  const out: CornerAngle[] = [];
  for (const path of paths) {
    const segs = path.segments;
    if (!segs || segs.length < 2) continue;
    for (const seg of segs) {
      const outCurve = seg.curve;
      const inCurve = seg.previous?.curve;
      if (!outCurve || !inCurve || outCurve === inCurve) continue;
      if (!path.closed && (seg.index === 0 || seg.index === segs.length - 1)) continue;
      const lIn = inCurve.length, lOut = outCurve.length;
      if (!(lIn >= minLeg) || !(lOut >= minLeg)) continue;

      const tIn = tangentAt(inCurve, lIn);   // forward tangent arriving at the node
      const tOut = tangentAt(outCurve, 0);   // forward tangent leaving the node
      if (!tIn || !tOut) continue;

      // Leg directions measured FROM the corner outwards.
      const backDeg = (Math.atan2(-tIn.y, -tIn.x) * 180) / Math.PI;
      const fwdDeg = (Math.atan2(tOut.y, tOut.x) * 180) / Math.PI;
      const angle = Math.abs(deltaDeg(backDeg, fwdDeg));
      if (!Number.isFinite(angle) || angle < 3 || angle > 176) continue;

      out.push({
        x: seg.point.x,
        y: seg.point.y,
        angle,
        startDeg: backDeg,
        endDeg: fwdDeg,
        weight: Math.min(lIn, lOut),
      });
    }
  }

  out.sort((a, b) => b.weight - a.weight);
  // Drop corners that sit on top of an already-picked one.
  const picked: CornerAngle[] = [];
  const minDist = Math.max(minLeg, 1e-6);
  for (const c of out) {
    if (picked.length >= maxCorners) break;
    if (picked.some(p => Math.hypot(p.x - c.x, p.y - c.y) < minDist)) continue;
    picked.push(c);
  }
  return picked;
}

export function renderAngleMeasurements(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.9);
  const labels = new LabelPlacer(40);
  const font = m.font(9);
  const minDim = Math.min(bounds.width, bounds.height);

  const drawArc = (cx: number, cy: number, r: number, startDeg: number, endDeg: number, weight: number): number => {
    const pts = arcPointsBetween(cx, cy, r, startDeg, endDeg);
    if (!(Math.abs(pts.sweep) >= MIN_ARC_ANGLE) || !(r > 0)) return NaN;
    try {
      const arc = new paper.Path.Arc(
        new paper.Point(pts.from.x, pts.from.y),
        new paper.Point(pts.through.x, pts.through.y),
        new paper.Point(pts.to.x, pts.to.y),
      );
      arc.strokeColor = color;
      arc.strokeWidth = m.stroke(style.strokeWidth * weight);
      arc.fillColor = null;
    } catch {
      return NaN;
    }
    return pts.midDeg;
  };

  // --- Real structure: dimension the angles of the drawing itself ----------
  const paths = realPaths(context);
  if (paths.length > 0) {
    const minLeg = Math.max(m.len(6), minDim * 0.04);
    const corners = extractCornerAngles(paths, minLeg, 10);
    if (corners.length > 0) {
      corners.forEach((c, idx) => {
        const r = Math.max(m.len(6), Math.min(c.weight * 0.35, minDim * 0.12));
        const midDeg = drawArc(c.x, c.y, r, c.startDeg, c.endDeg, idx < 3 ? 1 : 0.7);
        if (!Number.isFinite(midDeg)) return;
        const rad = (midDeg * Math.PI) / 180;
        const lx = c.x + Math.cos(rad) * r * 1.55;
        const ly = c.y + Math.sin(rad) * r * 1.55;
        labels.place(lx, ly + font * 0.35, formatAngle(c.angle), {
          size: idx < 3 ? font : font * 0.85,
          color: idx < 3 ? labelColor : hexToColor(style.color, style.opacity * 0.65),
          justification: Math.cos(rad) < -0.2 ? 'right' : Math.cos(rad) > 0.2 ? 'left' : 'center',
          bold: idx < 3,
          prefer: Math.sin(rad) < 0 ? 'up' : 'down',
        });
      });
      return;
    }
    // No measurable corner (fully smooth artwork): fall through to the
    // bounding-box diagonal, which is still a true reading of the layout.
  }

  // --- Bounding-box diagonals (no real data, or no corners) ----------------
  const diagAngle = (Math.atan2(bounds.height, bounds.width) * 180) / Math.PI;
  const arcRadius = minDim * 0.15;

  const diagonal = new paper.Path.Line(new paper.Point(bounds.left, bounds.bottom), new paper.Point(bounds.right, bounds.top));
  let showMainAngle = true;
  if (context?.useRealData && context?.actualPaths) {
    showMainAngle = intersectsAnyPath(diagonal, context.actualPaths);
  }
  diagonal.remove();

  if (showMainAngle && diagAngle >= MIN_ARC_ANGLE && arcRadius > 0) {
    const pts = angleArcPoints(bounds.left, bounds.bottom, arcRadius, diagAngle);
    try {
      const arcPath = new paper.Path.Arc(
        new paper.Point(pts.from.x, pts.from.y),
        new paper.Point(pts.through.x, pts.through.y),
        new paper.Point(pts.to.x, pts.to.y),
      );
      arcPath.strokeColor = color;
      arcPath.strokeWidth = m.stroke(style.strokeWidth);
      arcPath.fillColor = null;
    } catch { /* collinear: nothing to draw */ }

    const half = (diagAngle * Math.PI) / 360;
    labels.place(
      bounds.left + arcRadius * 1.4 * Math.cos(half),
      bounds.bottom - arcRadius * 1.4 * Math.sin(half),
      formatAngle(diagAngle),
      { size: font, color: labelColor, bold: true, justification: 'left', prefer: 'up' },
    );
  }

  scaledCompBounds.slice(0, 48).forEach(cb => {
    if (!isUsableRect(cb)) return;
    const angle = (Math.atan2(cb.height, cb.width) * 180) / Math.PI;
    const r = Math.min(cb.width, cb.height) * 0.2;
    if (r < m.len(8) || !(angle >= MIN_ARC_ANGLE)) return;

    const compDiag = new paper.Path.Line(new paper.Point(cb.left, cb.bottom), new paper.Point(cb.right, cb.top));
    let showComp = true;
    if (context?.useRealData && context?.actualPaths) showComp = intersectsAnyPath(compDiag, context.actualPaths);
    compDiag.remove();
    if (!showComp) return;

    // The old "through" point was fixed at ~30.5° and slightly off the
    // circle: for flatter components paper drew the LONG arc (almost a full circle).
    const pts = angleArcPoints(cb.left, cb.bottom, r, angle);
    try {
      const arc = new paper.Path.Arc(
        new paper.Point(pts.from.x, pts.from.y),
        new paper.Point(pts.through.x, pts.through.y),
        new paper.Point(pts.to.x, pts.to.y),
      );
      arc.strokeColor = hexToColor(style.color, style.opacity * 0.6);
      arc.strokeWidth = m.stroke(style.strokeWidth * 0.7);
      arc.fillColor = null;
    } catch { /* collinear */ }

    if (r > m.len(15)) {
      labels.place(cb.left + r * 1.5, cb.bottom - r * 0.3, formatAngle(angle), {
        size: m.font(8), color: hexToColor(style.color, style.opacity * 0.7), justification: 'left', prefer: 'up',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Spacing guides
// ---------------------------------------------------------------------------

/** Components considered for pairwise spacing (the loop below is cubic). */
const MAX_SPACING_COMPS = 24;
/** Gaps drawn per direction. */
const MAX_GAPS_PER_AXIS = 12;

interface GapInfo { a: number; b: number; gap: number; }

/**
 * Gaps between neighbouring boxes along one axis. Only pairs that overlap on
 * the perpendicular axis are considered (two boxes in different rows do not
 * have a horizontal gap), and a pair is dropped when a third box sits between
 * them — otherwise every box pair produced a duplicate dimension line.
 */
export function neighbourGaps(boxes: paper.Rectangle[], axis: 'x' | 'y'): GapInfo[] {
  const n = Math.min(boxes.length, MAX_SPACING_COMPS);
  const out: GapInfo[] = [];
  const lo = (r: paper.Rectangle) => (axis === 'x' ? r.left : r.top);
  const hi = (r: paper.Rectangle) => (axis === 'x' ? r.right : r.bottom);
  const pLo = (r: paper.Rectangle) => (axis === 'x' ? r.top : r.left);
  const pHi = (r: paper.Rectangle) => (axis === 'x' ? r.bottom : r.right);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ra = boxes[i], rb = boxes[j];
      if (![lo(ra), hi(ra), lo(rb), hi(rb)].every(Number.isFinite)) continue;
      const first = lo(ra) <= lo(rb) ? i : j;
      const second = first === i ? j : i;
      const A = boxes[first], B = boxes[second];
      const gap = lo(B) - hi(A);
      if (!Number.isFinite(gap) || gap <= 0) continue;
      // Perpendicular overlap: no overlap, no shared gap.
      const overlap = Math.min(pHi(A), pHi(B)) - Math.max(pLo(A), pLo(B));
      if (!(overlap > 0)) continue;
      // Someone else in between?
      let blocked = false;
      for (let k = 0; k < n && !blocked; k++) {
        if (k === first || k === second) continue;
        const C = boxes[k];
        const cMid = (lo(C) + hi(C)) / 2;
        if (cMid <= hi(A) || cMid >= lo(B)) continue;
        const ov = Math.min(pHi(C), Math.min(pHi(A), pHi(B))) - Math.max(pLo(C), Math.max(pLo(A), pLo(B)));
        if (ov > 0) blocked = true;
      }
      if (blocked) continue;
      out.push({ a: first, b: second, gap });
    }
  }
  out.sort((p, q) => q.gap - p.gap);
  return out.slice(0, MAX_GAPS_PER_AXIS);
}

/** Index of the value furthest from the median (or -1). */
export function outlierIndex(values: number[], minRelative = 0.12): number {
  if (values.length < 3) return -1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  if (!(median > 0)) return -1;
  let idx = -1, worst = 0;
  values.forEach((v, i) => {
    const rel = Math.abs(v - median) / median;
    if (rel > worst) { worst = rel; idx = i; }
  });
  return worst >= minRelative ? idx : -1;
}

export function renderSpacingGuides(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  if (scaledCompBounds.length < 2) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.9);
  const warnColor = hexToColor(style.color, Math.min(1, style.opacity * 1.0));
  const fillColor = hexToColor(style.color, style.opacity * 0.08);
  const labels = new LabelPlacer(48);
  const font = m.font(9);
  const arrowSize = m.len(4);
  const minGap = Math.max(m.len(2), 1e-6);

  const boxes = refineComponentBoxes(scaledCompBounds, context).slice(0, MAX_SPACING_COMPS);

  const hGaps = neighbourGaps(boxes, 'x').filter(g => g.gap > minGap);
  const vGaps = neighbourGaps(boxes, 'y').filter(g => g.gap > minGap);
  const hOutlier = outlierIndex(hGaps.map(g => g.gap));
  const vOutlier = outlierIndex(vGaps.map(g => g.gap));

  hGaps.forEach((g, idx) => {
    const leftComp = boxes[g.a], rightComp = boxes[g.b];
    const odd = idx === hOutlier;
    const midY = (Math.max(leftComp.top, rightComp.top) + Math.min(leftComp.bottom, rightComp.bottom)) / 2;

    const rect = new paper.Path.Rectangle(
      new paper.Point(leftComp.right, Math.max(leftComp.top, rightComp.top)),
      new paper.Point(rightComp.left, Math.min(leftComp.bottom, rightComp.bottom)),
    );
    rect.fillColor = fillColor;
    rect.strokeColor = null;

    const line = new paper.Path.Line(new paper.Point(leftComp.right, midY), new paper.Point(rightComp.left, midY));
    line.strokeColor = odd ? warnColor : color;
    line.strokeWidth = m.stroke(style.strokeWidth * (odd ? 1.4 : 1));

    const leftArrow = new paper.Path([
      new paper.Point(leftComp.right + arrowSize, midY - arrowSize),
      new paper.Point(leftComp.right, midY),
      new paper.Point(leftComp.right + arrowSize, midY + arrowSize),
    ]);
    leftArrow.strokeColor = color;
    leftArrow.strokeWidth = m.stroke(style.strokeWidth);
    leftArrow.fillColor = null;

    const rightArrow = new paper.Path([
      new paper.Point(rightComp.left - arrowSize, midY - arrowSize),
      new paper.Point(rightComp.left, midY),
      new paper.Point(rightComp.left - arrowSize, midY + arrowSize),
    ]);
    rightArrow.strokeColor = color;
    rightArrow.strokeWidth = m.stroke(style.strokeWidth);
    rightArrow.fillColor = null;

    labels.place((leftComp.right + rightComp.left) / 2, midY - m.len(6), formatLength(g.gap, context), {
      size: font, color: odd ? warnColor : labelColor, bold: true, justification: 'center', prefer: 'up',
    });
  });

  vGaps.forEach((g, idx) => {
    const topComp = boxes[g.a], bottomComp = boxes[g.b];
    const odd = idx === vOutlier;
    const midX = (Math.max(topComp.left, bottomComp.left) + Math.min(topComp.right, bottomComp.right)) / 2;

    const line = new paper.Path.Line(new paper.Point(midX, topComp.bottom), new paper.Point(midX, bottomComp.top));
    line.strokeColor = odd ? warnColor : color;
    line.strokeWidth = m.stroke(style.strokeWidth * (odd ? 1.4 : 1));

    const topArrow = new paper.Path([
      new paper.Point(midX - arrowSize, topComp.bottom + arrowSize),
      new paper.Point(midX, topComp.bottom),
      new paper.Point(midX + arrowSize, topComp.bottom + arrowSize),
    ]);
    topArrow.strokeColor = color;
    topArrow.strokeWidth = m.stroke(style.strokeWidth);
    topArrow.fillColor = null;

    const bottomArrow = new paper.Path([
      new paper.Point(midX - arrowSize, bottomComp.top - arrowSize),
      new paper.Point(midX, bottomComp.top),
      new paper.Point(midX + arrowSize, bottomComp.top - arrowSize),
    ]);
    bottomArrow.strokeColor = color;
    bottomArrow.strokeWidth = m.stroke(style.strokeWidth);
    bottomArrow.fillColor = null;

    labels.place(midX + m.len(8), (topComp.bottom + bottomComp.top) / 2 + font * 0.35, formatLength(g.gap, context), {
      size: font, color: odd ? warnColor : labelColor, bold: true, justification: 'left', prefer: 'down',
    });
  });
}

// ---------------------------------------------------------------------------
// Alignment guides
// ---------------------------------------------------------------------------

export type EdgeKind = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

export interface AlignmentCluster {
  kind: EdgeKind;
  axis: 'x' | 'y';
  value: number;
  count: number;
  /** Largest distance between a member and the cluster mean. */
  spread: number;
  /** Index of the box that deviates the most. */
  worstBox: number;
}

const EDGE_KINDS: { kind: EdgeKind; axis: 'x' | 'y'; get: (r: paper.Rectangle) => number }[] = [
  { kind: 'left', axis: 'x', get: r => r.left },
  { kind: 'centerX', axis: 'x', get: r => r.center.x },
  { kind: 'right', axis: 'x', get: r => r.right },
  { kind: 'top', axis: 'y', get: r => r.top },
  { kind: 'centerY', axis: 'y', get: r => r.center.y },
  { kind: 'bottom', axis: 'y', get: r => r.bottom },
];

/**
 * Group the edges that line up. One line per group instead of one line per
 * PAIR (the old code drew the same guide once for every matching pair) and
 * the worst offender inside each group is reported, so the drawing shows
 * where an "almost aligned" edge actually sits.
 */
export function clusterAlignments(boxes: paper.Rectangle[], tolerance: number): AlignmentCluster[] {
  const out: AlignmentCluster[] = [];
  if (boxes.length < 2 || !(tolerance > 0)) return out;

  for (const def of EDGE_KINDS) {
    const values = boxes
      .map((r, i) => ({ v: def.get(r), i }))
      .filter(e => Number.isFinite(e.v))
      .sort((a, b) => a.v - b.v);
    let group: { v: number; i: number }[] = [];
    const flush = () => {
      if (group.length >= 2) {
        const mean = group.reduce((s, e) => s + e.v, 0) / group.length;
        let spread = 0, worstBox = group[0].i;
        for (const e of group) {
          const d = Math.abs(e.v - mean);
          if (d > spread) { spread = d; worstBox = e.i; }
        }
        out.push({ kind: def.kind, axis: def.axis, value: mean, count: group.length, spread, worstBox });
      }
      group = [];
    };
    for (const e of values) {
      if (group.length && Math.abs(e.v - group[group.length - 1].v) > tolerance) flush();
      group.push(e);
    }
    flush();
  }

  // Two kinds landing on the same coordinate would draw the same line twice.
  const merged: AlignmentCluster[] = [];
  for (const c of out.sort((a, b) => b.count - a.count || a.spread - b.spread)) {
    const dup = merged.find(o => o.axis === c.axis && Math.abs(o.value - c.value) <= tolerance);
    if (dup) { dup.count = Math.max(dup.count, c.count); continue; }
    merged.push({ ...c });
  }
  return merged;
}

const MAX_ALIGNMENT_LINES = 24;

export function renderAlignmentGuides(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  if (scaledCompBounds.length < 2 || !isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.4);
  const labels = new LabelPlacer(32);
  const font = m.font(8);

  const boxes = refineComponentBoxes(scaledCompBounds, context).slice(0, 64);
  const diag = Math.hypot(bounds.width, bounds.height);
  // "Almost aligned" is relative to the drawing, not a fixed 3px: on a large
  // export a 3px threshold found nothing, on a tiny one it matched everything.
  const tolerance = Math.max(m.len(2), diag * 0.01);
  const clusters = clusterAlignments(boxes, tolerance).slice(0, MAX_ALIGNMENT_LINES);
  const ext = m.len(30);

  let worst: AlignmentCluster | null = null;
  for (const c of clusters) if (!worst || c.spread > worst.spread) worst = c;

  clusters.forEach(c => {
    const isCenter = c.kind === 'centerX' || c.kind === 'centerY';
    const line = c.axis === 'y'
      ? new paper.Path.Line(new paper.Point(bounds.left - ext, c.value), new paper.Point(bounds.right + ext, c.value))
      : new paper.Path.Line(new paper.Point(c.value, bounds.top - ext), new paper.Point(c.value, bounds.bottom + ext));
    showIfIntersects(line, context, () => {
      line.strokeColor = isCenter ? color : dimColor;
      line.strokeWidth = m.stroke(style.strokeWidth * (isCenter ? 1 : 0.8));
      line.dashArray = m.dash(3, 3);
    });
  });

  // Highlight the alignment that is the least exact — the thing to fix.
  if (worst && worst.spread > tolerance * 0.25 && boxes[worst.worstBox]) {
    const box = boxes[worst.worstBox];
    const def = EDGE_KINDS.find(d => d.kind === worst!.kind);
    const actual = def ? def.get(box) : worst.value;
    const tick = m.len(6);
    const marker = worst.axis === 'y'
      ? new paper.Path.Line(new paper.Point(box.center.x - tick, actual), new paper.Point(box.center.x + tick, actual))
      : new paper.Path.Line(new paper.Point(actual, box.center.y - tick), new paper.Point(actual, box.center.y + tick));
    marker.strokeColor = color;
    marker.strokeWidth = m.stroke(style.strokeWidth * 1.6);

    const lx = worst.axis === 'y' ? box.center.x + tick * 1.5 : actual + tick * 0.5;
    const ly = worst.axis === 'y' ? actual - tick * 0.5 : box.center.y - tick * 1.2;
    labels.place(lx, ly, `${worst.kind} ±${formatLength(worst.spread, context)}`, {
      size: font, color, bold: true, justification: 'left', prefer: 'up',
    });
  }
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

export function renderDynamicBaseline(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.7);
  const labels = new LabelPlacer(24);
  const font = m.font(7);

  // Anchored on the real ink box when it is known.
  const ink = inkBounds(bounds, context);
  if (!isUsableRect(ink)) return;

  const lineCount = 12;
  const step = ink.height / lineCount;
  if (!(step > 0)) return;
  const ext = m.len(20);

  for (let i = 0; i <= lineCount; i++) {
    const y = ink.top + step * i;
    const line = new paper.Path.Line(new paper.Point(ink.left - ext, y), new paper.Point(ink.right + ext, y));
    const isMajor = i % 4 === 0;
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = m.stroke(style.strokeWidth * (isMajor ? 1 : 0.4));
      line.dashArray = isMajor ? [] : m.dash(2, 4);
      if (isMajor && i > 0 && i < lineCount) {
        labels.place(ink.right + ext * 1.25, y + font * 0.4, formatLength(step * i, context), {
          size: font, color: labelColor, justification: 'left', prefer: 'down',
        });
      }
    });
  }

  labels.place(ink.left - ext * 1.25, ink.top - m.len(6), `BASELINE ${lineCount}×${formatLength(step, context)}`, {
    size: font, color: labelColor, bold: true, justification: 'right', prefer: 'up',
  });
}

// ---------------------------------------------------------------------------
// Component ratios
// ---------------------------------------------------------------------------

const RATIO_STANDARDS: { name: string; flipped: string; value: number }[] = [
  { name: '1:1', flipped: '1:1', value: 1 },
  { name: '4:3', flipped: '3:4', value: 4 / 3 },
  { name: '√2', flipped: '1:√2', value: Math.SQRT2 },
  { name: '3:2', flipped: '2:3', value: 3 / 2 },
  { name: 'φ', flipped: '1:φ', value: (1 + Math.sqrt(5)) / 2 },
  { name: '16:9', flipped: '9:16', value: 16 / 9 },
  { name: '2:1', flipped: '1:2', value: 2 },
  { name: '3:1', flipped: '1:3', value: 3 },
];

/**
 * Name the aspect ratio. Portrait boxes are recognised too (the old version
 * only knew landscape ratios, so a 1:2 component was labelled "0.50:1"), and
 * the tolerance is relative, so it means the same at every ratio.
 */
export function describeRatio(width: number, height: number, tolerance = 0.025): string {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return '—';
  const portrait = height > width;
  const r = portrait ? height / width : width / height;
  let best = RATIO_STANDARDS[0];
  let bestRel = Infinity;
  for (const s of RATIO_STANDARDS) {
    const rel = Math.abs(r - s.value) / s.value;
    if (rel < bestRel) { bestRel = rel; best = s; }
  }
  if (bestRel <= tolerance) return portrait ? best.flipped : best.name;
  return portrait ? `1:${r.toFixed(2)}` : `${r.toFixed(2)}:1`;
}

export function renderComponentRatioLabels(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const m = metricsFor(context, bounds);
  const labelColor = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);
  const labels = new LabelPlacer(64);
  const big = m.font(10);
  const small = m.font(8);

  const boxes = refineComponentBoxes(scaledCompBounds, context).slice(0, 32);

  boxes.forEach(cb => {
    if (!cb || !Number.isFinite(cb.width) || !Number.isFinite(cb.height)) return;
    labels.place(cb.center.x, cb.top - m.len(8), describeRatio(cb.width, cb.height), {
      size: big, color: labelColor, bold: true, justification: 'center', prefer: 'up',
    });
    labels.place(cb.center.x, cb.bottom + m.len(14), `${formatLength(cb.width, context)}×${formatLength(cb.height, context)}`, {
      size: small, color: dimColor, justification: 'center', prefer: 'down',
    });
  });

  if (isUsableRect(bounds)) {
    labels.place(bounds.right + m.len(8), bounds.top + m.len(12), `Full: ${describeRatio(bounds.width, bounds.height)}`, {
      size: small, color: hexToColor(style.color, style.opacity * 0.5), justification: 'left', prefer: 'down',
    });
  }
}

// ---------------------------------------------------------------------------
// Harmonic divisions
// ---------------------------------------------------------------------------

export function renderHarmonicDivisions(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const labelColor = hexToColor(style.color, style.opacity * 0.6);
  const labels = new LabelPlacer(16);
  const font = m.font(7);

  const divisions = [
    { n: 2, label: '1/2' }, { n: 3, label: '1/3' }, { n: 4, label: '1/4' },
    { n: 5, label: '1/5' }, { n: 6, label: '1/6' },
  ];

  divisions.forEach((div, di) => {
    const opacity = 1 - di * 0.15;
    const c = hexToColor(style.color, style.opacity * opacity);
    const over = m.len(5 + di * 3);

    for (let i = 1; i < div.n; i++) {
      const x = bounds.left + (bounds.width * i) / div.n;
      const vLine = new paper.Path.Line(new paper.Point(x, bounds.top - over), new paper.Point(x, bounds.bottom + over));
      showIfIntersects(vLine, context, () => {
        vLine.strokeColor = c;
        vLine.strokeWidth = m.stroke(style.strokeWidth * (1 - di * 0.12));
        vLine.dashArray = m.dash(3 + di, 3 + di);
      });

      const y = bounds.top + (bounds.height * i) / div.n;
      const hLine = new paper.Path.Line(new paper.Point(bounds.left - over, y), new paper.Point(bounds.right + over, y));
      showIfIntersects(hLine, context, () => {
        hLine.strokeColor = c;
        hLine.strokeWidth = m.stroke(style.strokeWidth * (1 - di * 0.12));
        hLine.dashArray = m.dash(3 + di, 3 + di);
      });
    }

    labels.place(bounds.right + m.len(20 + di * 12), bounds.top + bounds.height / div.n + font * 0.4, div.label, {
      size: font, color: labelColor, justification: 'left', prefer: 'down',
    });
  });
}

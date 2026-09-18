/**
 * Measuring maths for the canvas ruler / inspector.
 *
 * Everything here is PURE: no paper, no DOM, no React. The canvas layers
 * (`components/MeasureLayer.tsx`, `components/CanvasRulers.tsx`) do the
 * drawing, this module answers the questions:
 *
 * - where should a point snap to (nodes, construction intersections, the
 *   logo centre, the bounding box edges) and which kind of snap won;
 * - how to lock a drag to 0 / 45 / 90 degrees;
 * - how to format a dimension (distance, percentage of the longest side,
 *   angle) without ever producing `NaN`, `Infinity` or `-0` on screen;
 * - which tick marks a ruler should draw for a given zoom, so labels never
 *   collide.
 *
 * Two coordinate spaces are used throughout:
 * - **canvas space**: CSS pixels inside the preview element (what a pointer
 *   event gives us, and what paper.js draws in);
 * - **svg space**: the user units of the uploaded artwork.
 * `CanvasTransform` converts between them; measurements are always STORED in
 * svg space so they survive zoom and pan.
 */

export interface MeasurePoint {
  x: number;
  y: number;
}

export interface MeasureBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MeasureSegment {
  a: MeasurePoint;
  b: MeasurePoint;
}

/** What a point snapped to. `free` means "nothing was close enough". */
export type SnapKind = 'node' | 'intersection' | 'center' | 'edge' | 'free';

export interface SnapCandidate {
  point: MeasurePoint;
  kind: SnapKind;
  /** Overrides the generic kind label in the snap badge. */
  label?: string;
}

export interface SnapResult {
  point: MeasurePoint;
  kind: SnapKind;
  label: string;
  snapped: boolean;
  /** Distance from the raw pointer to the chosen point (same units as input). */
  distance: number;
}

/**
 * Ranking bias per snap kind: the winner is the candidate with the smallest
 * `distance * weight`, so a real path node beats a bounding-box edge even
 * when the edge is somewhat closer, but a far node never beats an edge that
 * is right under the pointer.
 */
export const SNAP_KIND_WEIGHT: Record<SnapKind, number> = {
  node: 0.55,
  intersection: 0.7,
  center: 0.8,
  edge: 1,
  free: Infinity,
};

/** Tie-break when two candidates score the same: stronger kind wins. */
export const SNAP_KIND_PRIORITY: Record<SnapKind, number> = {
  node: 4,
  intersection: 3,
  center: 2,
  edge: 1,
  free: 0,
};

/** Interface copy (pt-BR, sentence case). */
export const SNAP_KIND_LABEL: Record<SnapKind, string> = {
  node: 'Nó',
  intersection: 'Interseção',
  center: 'Centro',
  edge: 'Borda',
  free: 'Livre',
};

const EPS = 1e-9;
const RAD = Math.PI / 180;

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isFinitePoint(point: unknown): point is MeasurePoint {
  const p = point as MeasurePoint | null;
  return !!p && isFiniteNumber(p.x) && isFiniteNumber(p.y);
}

/** `value` when finite, otherwise `fallback`. Also collapses `-0` to `0`. */
export function finiteOr(value: unknown, fallback = 0): number {
  const n = isFiniteNumber(value) ? value : fallback;
  return n === 0 ? 0 : n;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!isFiniteNumber(value)) return min;
  return value < min ? min : value > max ? max : value;
}

export function distance(a: MeasurePoint, b: MeasurePoint): number {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return 0;
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/* --------------------------------------------------------------------------
 * canvas <-> svg
 * ----------------------------------------------------------------------- */

/**
 * Affine (uniform scale + translation) mapping between the artwork's own
 * units and the pixels it currently occupies on the canvas.
 */
export interface CanvasTransform {
  /** Canvas pixels per svg unit (fit scale x zoom). Always > 0. */
  scale: number;
  /** Canvas x of `svgLeft`. */
  canvasLeft: number;
  /** Canvas y of `svgTop`. */
  canvasTop: number;
  svgLeft: number;
  svgTop: number;
}

/**
 * Build the transform from the drawn logo rect (canvas px) and the same logo
 * rect in svg units. Returns `null` when either rect is degenerate, so
 * callers can skip every measurement feature instead of dividing by zero.
 */
export function makeTransform(
  canvasBox: MeasureBox | null | undefined,
  svgBox: MeasureBox | null | undefined,
): CanvasTransform | null {
  if (!canvasBox || !svgBox) return null;
  const { x: cx, y: cy, width: cw, height: ch } = canvasBox;
  const { x: sx, y: sy, width: sw, height: sh } = svgBox;
  if (![cx, cy, cw, ch, sx, sy, sw, sh].every(isFiniteNumber)) return null;
  const kx = sw > EPS ? cw / sw : NaN;
  const ky = sh > EPS ? ch / sh : NaN;
  const scale = isFiniteNumber(kx) && kx > 0 ? kx : isFiniteNumber(ky) && ky > 0 ? ky : NaN;
  if (!isFiniteNumber(scale) || scale <= 0) return null;
  return { scale, canvasLeft: cx, canvasTop: cy, svgLeft: sx, svgTop: sy };
}

export function svgToCanvas(point: MeasurePoint, t: CanvasTransform): MeasurePoint {
  return {
    x: t.canvasLeft + (finiteOr(point?.x) - t.svgLeft) * t.scale,
    y: t.canvasTop + (finiteOr(point?.y) - t.svgTop) * t.scale,
  };
}

export function canvasToSvg(point: MeasurePoint, t: CanvasTransform): MeasurePoint {
  return {
    x: t.svgLeft + (finiteOr(point?.x) - t.canvasLeft) / t.scale,
    y: t.svgTop + (finiteOr(point?.y) - t.canvasTop) / t.scale,
  };
}

export function boxToSvg(box: MeasureBox, t: CanvasTransform): MeasureBox {
  const topLeft = canvasToSvg({ x: box.x, y: box.y }, t);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: finiteOr(box.width) / t.scale,
    height: finiteOr(box.height) / t.scale,
  };
}

/* --------------------------------------------------------------------------
 * segment geometry
 * ----------------------------------------------------------------------- */

/** Closest point of segment `a-b` to `p` (clamped to the segment). */
export function nearestPointOnSegment(p: MeasurePoint, a: MeasurePoint, b: MeasurePoint): MeasurePoint {
  if (!isFinitePoint(p) || !isFinitePoint(a) || !isFinitePoint(b)) {
    return { x: finiteOr(p?.x), y: finiteOr(p?.y) };
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= EPS) return { x: a.x, y: a.y };
  const t = clampNumber(((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq, 0, 1);
  return { x: a.x + dx * t, y: a.y + dy * t };
}

export function distanceToSegment(p: MeasurePoint, a: MeasurePoint, b: MeasurePoint): number {
  return distance(p, nearestPointOnSegment(p, a, b));
}

/**
 * Proper intersection of two finite segments. `null` when they are parallel,
 * degenerate or only meet outside one of them.
 */
export function segmentIntersection(
  a1: MeasurePoint,
  a2: MeasurePoint,
  b1: MeasurePoint,
  b2: MeasurePoint,
): MeasurePoint | null {
  if (!isFinitePoint(a1) || !isFinitePoint(a2) || !isFinitePoint(b1) || !isFinitePoint(b2)) return null;
  const rx = a2.x - a1.x;
  const ry = a2.y - a1.y;
  const sx = b2.x - b1.x;
  const sy = b2.y - b1.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-12) return null;
  const qpx = b1.x - a1.x;
  const qpy = b1.y - a1.y;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  const point = { x: a1.x + rx * t, y: a1.y + ry * t };
  return isFinitePoint(point) ? point : null;
}

export interface IntersectionOptions {
  /** Only consider segments passing within `radius` of this point. */
  near?: MeasurePoint | null;
  radius?: number;
  /** Cap on the segments taken into account (keeps the pair loop bounded). */
  maxSegments?: number;
  maxResults?: number;
}

/**
 * Intersections between drawn construction lines, restricted to the pointer
 * neighbourhood so the pair loop stays small enough to run inside a pointer
 * move without dropping a frame.
 */
export function collectIntersections(
  segments: readonly MeasureSegment[],
  options: IntersectionOptions = {},
): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  if (!Array.isArray(segments) || segments.length < 2) return out;
  const near = isFinitePoint(options.near) ? options.near : null;
  const radius = isFiniteNumber(options.radius) && options.radius > 0 ? options.radius : Infinity;
  const maxSegments = isFiniteNumber(options.maxSegments) && options.maxSegments > 0
    ? Math.floor(options.maxSegments)
    : 80;
  const maxResults = isFiniteNumber(options.maxResults) && options.maxResults > 0
    ? Math.floor(options.maxResults)
    : 48;

  const pool: MeasureSegment[] = [];
  for (const seg of segments) {
    if (!seg || !isFinitePoint(seg.a) || !isFinitePoint(seg.b)) continue;
    if (near && Number.isFinite(radius) && distanceToSegment(near, seg.a, seg.b) > radius) continue;
    pool.push(seg);
    if (pool.length >= maxSegments) break;
  }

  for (let i = 0; i < pool.length && out.length < maxResults; i++) {
    for (let j = i + 1; j < pool.length && out.length < maxResults; j++) {
      const hit = segmentIntersection(pool[i].a, pool[i].b, pool[j].a, pool[j].b);
      if (!hit) continue;
      if (near && Number.isFinite(radius) && distance(near, hit) > radius) continue;
      out.push({ point: hit, kind: 'intersection' });
    }
  }
  return out;
}

/**
 * Candidates offered by the logo's bounding box: its centre, the four
 * corners, and the projection of the pointer onto each edge (so a point can
 * be dropped anywhere along a border).
 */
export function boxSnapCandidates(box: MeasureBox | null | undefined, raw?: MeasurePoint | null): SnapCandidate[] {
  if (!box || ![box.x, box.y, box.width, box.height].every(isFiniteNumber)) return [];
  const left = box.x;
  const top = box.y;
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  const out: SnapCandidate[] = [
    { point: { x: left + box.width / 2, y: top + box.height / 2 }, kind: 'center', label: 'Centro da caixa' },
    { point: { x: left, y: top }, kind: 'edge', label: 'Canto' },
    { point: { x: right, y: top }, kind: 'edge', label: 'Canto' },
    { point: { x: right, y: bottom }, kind: 'edge', label: 'Canto' },
    { point: { x: left, y: bottom }, kind: 'edge', label: 'Canto' },
  ];
  if (isFinitePoint(raw)) {
    const edges: MeasureSegment[] = [
      { a: { x: left, y: top }, b: { x: right, y: top } },
      { a: { x: right, y: top }, b: { x: right, y: bottom } },
      { a: { x: right, y: bottom }, b: { x: left, y: bottom } },
      { a: { x: left, y: bottom }, b: { x: left, y: top } },
    ];
    for (const edge of edges) out.push({ point: nearestPointOnSegment(raw, edge.a, edge.b), kind: 'edge' });
  }
  return out;
}

/* --------------------------------------------------------------------------
 * point index (fast node snapping)
 * ----------------------------------------------------------------------- */

export interface PointIndex {
  readonly size: number;
  readonly cellSize: number;
  /** Points inside the query disc. */
  query(point: MeasurePoint, radius: number): MeasurePoint[];
}

/** Drop points closer than `epsilon` to one already kept. */
export function dedupePoints(points: readonly MeasurePoint[], epsilon = 0.5): MeasurePoint[] {
  const out: MeasurePoint[] = [];
  const cell = Math.max(epsilon, 1e-6);
  const seen = new Map<string, MeasurePoint[]>();
  for (const p of points ?? []) {
    if (!isFinitePoint(p)) continue;
    const cx = Math.floor(p.x / cell);
    const cy = Math.floor(p.y / cell);
    let duplicate = false;
    for (let ix = cx - 1; ix <= cx + 1 && !duplicate; ix++) {
      for (let iy = cy - 1; iy <= cy + 1 && !duplicate; iy++) {
        const bucket = seen.get(`${ix},${iy}`);
        if (!bucket) continue;
        for (const q of bucket) {
          if (Math.hypot(q.x - p.x, q.y - p.y) <= epsilon) {
            duplicate = true;
            break;
          }
        }
      }
    }
    if (duplicate) continue;
    const key = `${cx},${cy}`;
    const bucket = seen.get(key);
    if (bucket) bucket.push(p);
    else seen.set(key, [p]);
    out.push(p);
  }
  return out;
}

/**
 * Uniform grid over the points, so snapping a pointer to one of a few
 * thousand path nodes costs a handful of bucket lookups instead of a full
 * scan on every pointer move.
 */
export function createPointIndex(points: readonly MeasurePoint[], cellSize?: number): PointIndex {
  const valid = (points ?? []).filter(isFinitePoint);
  let size = isFiniteNumber(cellSize) && (cellSize as number) > 0 ? (cellSize as number) : 0;
  if (!size) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of valid) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const span = valid.length > 1 ? Math.max(maxX - minX, maxY - minY) : 0;
    const guess = span > 0 ? span / Math.max(4, Math.sqrt(valid.length)) : 0;
    size = isFiniteNumber(guess) && guess > 0 ? guess : 24;
  }
  const buckets = new Map<string, MeasurePoint[]>();
  for (const p of valid) {
    const key = `${Math.floor(p.x / size)},${Math.floor(p.y / size)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(p);
    else buckets.set(key, [p]);
  }
  const cell = size;
  return {
    size: valid.length,
    cellSize: cell,
    query(point, radius) {
      if (!isFinitePoint(point) || !isFiniteNumber(radius) || radius < 0) return [];
      const span = Math.max(1, Math.ceil(radius / cell));
      const cx = Math.floor(point.x / cell);
      const cy = Math.floor(point.y / cell);
      const out: MeasurePoint[] = [];
      for (let ix = cx - span; ix <= cx + span; ix++) {
        for (let iy = cy - span; iy <= cy + span; iy++) {
          const bucket = buckets.get(`${ix},${iy}`);
          if (!bucket) continue;
          for (const p of bucket) {
            if (Math.hypot(p.x - point.x, p.y - point.y) <= radius) out.push(p);
          }
        }
      }
      return out;
    },
  };
}

/* --------------------------------------------------------------------------
 * snapping
 * ----------------------------------------------------------------------- */

/**
 * Pick the best candidate within `radius` of `raw`, or fall back to the raw
 * pointer position (`kind: 'free'`). Never returns NaN coordinates.
 */
export function snapPoint(
  raw: MeasurePoint,
  candidates: readonly SnapCandidate[],
  radius: number,
  options: { weights?: Partial<Record<SnapKind, number>> } = {},
): SnapResult {
  const safeRaw: MeasurePoint = { x: finiteOr(raw?.x), y: finiteOr(raw?.y) };
  const free: SnapResult = {
    point: safeRaw,
    kind: 'free',
    label: SNAP_KIND_LABEL.free,
    snapped: false,
    distance: 0,
  };
  if (!isFinitePoint(raw) || !isFiniteNumber(radius) || radius <= 0 || !candidates?.length) return free;

  let best: SnapCandidate | null = null;
  let bestScore = Infinity;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    if (!candidate || !isFinitePoint(candidate.point)) continue;
    const d = Math.hypot(candidate.point.x - safeRaw.x, candidate.point.y - safeRaw.y);
    if (!isFiniteNumber(d) || d > radius) continue;
    const weight = options.weights?.[candidate.kind] ?? SNAP_KIND_WEIGHT[candidate.kind] ?? 1;
    if (!isFiniteNumber(weight)) continue;
    const score = d * weight;
    const better = best === null
      || score < bestScore - EPS
      || (Math.abs(score - bestScore) <= EPS
        && SNAP_KIND_PRIORITY[candidate.kind] > SNAP_KIND_PRIORITY[best.kind]);
    if (better) {
      best = candidate;
      bestScore = score;
      bestDistance = d;
    }
  }
  if (!best) return free;
  return {
    point: { x: best.point.x, y: best.point.y },
    kind: best.kind,
    label: best.label ?? SNAP_KIND_LABEL[best.kind],
    snapped: true,
    distance: bestDistance,
  };
}

/* --------------------------------------------------------------------------
 * angles
 * ----------------------------------------------------------------------- */

/** Wrap to `[0, 360)`, collapsing `-0` and `360` to `0`. */
export function normalizeDegrees(deg: number): number {
  if (!isFiniteNumber(deg)) return 0;
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped === 0 ? 0 : wrapped;
}

/**
 * Direction of `a -> b` in degrees, read the way a designer reads a
 * protractor: 0 = to the right, 90 = straight up. Canvas y grows downwards,
 * hence the sign flip.
 */
export function angleDegrees(a: MeasurePoint, b: MeasurePoint): number {
  if (!isFinitePoint(a) || !isFinitePoint(b)) return 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return 0;
  return normalizeDegrees(Math.atan2(-dy, dx) / RAD);
}

/**
 * Lock a drag to multiples of `stepDeg` (45 by default, i.e. 0/45/90/...).
 * The distance the user dragged is preserved, only the direction is
 * quantised, so the cota keeps following the pointer at 1:1 speed.
 */
export function constrainToAngleSteps(origin: MeasurePoint, point: MeasurePoint, stepDeg = 45): MeasurePoint {
  if (!isFinitePoint(origin)) return { x: finiteOr(point?.x), y: finiteOr(point?.y) };
  if (!isFinitePoint(point)) return { x: origin.x, y: origin.y };
  const step = isFiniteNumber(stepDeg) && stepDeg > 0 ? stepDeg : 45;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length <= EPS) return { x: origin.x, y: origin.y };
  const raw = Math.atan2(-dy, dx);
  const stepRad = step * RAD;
  const snapped = Math.round(raw / stepRad) * stepRad;
  return {
    x: origin.x + Math.cos(snapped) * length,
    y: origin.y - Math.sin(snapped) * length,
  };
}

/* --------------------------------------------------------------------------
 * formatting
 * ----------------------------------------------------------------------- */

/** Shown instead of a number whenever the input is not finite. */
export const EMPTY_VALUE = '—';

export interface NumberFormatOptions {
  /** Hard cap on decimals (the adaptive precision never exceeds it). */
  maxDecimals?: number;
  /** Decimal mark, '.' by default. */
  separator?: string;
}

function adaptiveDecimals(abs: number): number {
  if (abs >= 1000) return 0;
  if (abs >= 100) return 1;
  if (abs >= 1) return 2;
  if (abs >= 0.1) return 3;
  return 4;
}

/**
 * Adaptive fixed-point formatting: big numbers lose their decimals, small
 * ones keep enough digits to stay distinguishable. Trailing zeros are
 * trimmed and `-0` never reaches the screen.
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  if (!isFiniteNumber(value)) return EMPTY_VALUE;
  const abs = Math.abs(value);
  let decimals = adaptiveDecimals(abs);
  if (isFiniteNumber(options.maxDecimals)) {
    decimals = Math.min(decimals, Math.max(0, Math.floor(options.maxDecimals as number)));
  }
  let text = value.toFixed(decimals);
  if (text.includes('.')) text = text.replace(/\.?0+$/, '');
  if (text === '-0' || text === '' || text === '-') text = '0';
  const separator = options.separator ?? '.';
  return separator === '.' ? text : text.replace('.', separator);
}

/** `"124.5 u"`. `unit` is the SVG user-unit label. */
export function formatDistance(value: number, unit = 'u', options: NumberFormatOptions = {}): string {
  const text = formatNumber(value, options);
  return text === EMPTY_VALUE ? EMPTY_VALUE : `${text} ${unit}`;
}

export function formatAngle(deg: number): string {
  if (!isFiniteNumber(deg)) return EMPTY_VALUE;
  const text = formatNumber(normalizeDegrees(deg), { maxDecimals: 1 });
  return text === EMPTY_VALUE ? EMPTY_VALUE : `${text}°`;
}

/** `ratio` is a fraction (0.124 -> "12.4%"). */
export function formatPercent(ratio: number): string {
  if (!isFiniteNumber(ratio)) return EMPTY_VALUE;
  const text = formatNumber(ratio * 100, { maxDecimals: 1 });
  return text === EMPTY_VALUE ? EMPTY_VALUE : `${text}%`;
}

/** Fraction of the box's longest side, or `null` when the box is degenerate. */
export function ratioOfLongestSide(value: number, box: MeasureBox | null | undefined): number | null {
  if (!isFiniteNumber(value) || !box) return null;
  const longest = Math.max(Math.abs(finiteOr(box.width)), Math.abs(finiteOr(box.height)));
  if (!(longest > EPS)) return null;
  const ratio = value / longest;
  return isFiniteNumber(ratio) ? ratio : null;
}

export interface MeasurementReadout {
  distance: number;
  dx: number;
  dy: number;
  angleDeg: number;
  /** Fraction of the logo's longest side, `null` when unavailable. */
  ratio: number | null;
  distanceLabel: string;
  angleLabel: string;
  percentLabel: string | null;
  /** One-line label drawn on the cota: "124.5 u · 12.4% · 45°". */
  primaryLabel: string;
}

/**
 * Everything the cota label needs, already formatted. `box` is the logo's
 * bounding box in the SAME units as `a`/`b` (svg units).
 */
export function describeMeasurement(
  a: MeasurePoint,
  b: MeasurePoint,
  box?: MeasureBox | null,
  unit = 'u',
): MeasurementReadout {
  const safeA: MeasurePoint = { x: finiteOr(a?.x), y: finiteOr(a?.y) };
  const safeB: MeasurePoint = { x: finiteOr(b?.x), y: finiteOr(b?.y) };
  const dx = safeB.x - safeA.x;
  const dy = safeB.y - safeA.y;
  const dist = Math.hypot(dx, dy);
  const angleDeg = angleDegrees(safeA, safeB);
  const ratio = ratioOfLongestSide(dist, box);
  const distanceLabel = formatDistance(dist, unit);
  const angleLabel = formatAngle(angleDeg);
  const percentLabel = ratio === null ? null : formatPercent(ratio);
  const parts = [distanceLabel, percentLabel, angleLabel].filter(
    (p): p is string => !!p && p !== EMPTY_VALUE,
  );
  return {
    distance: dist,
    dx,
    dy,
    angleDeg,
    ratio,
    distanceLabel,
    angleLabel,
    percentLabel,
    primaryLabel: parts.length ? parts.join(' · ') : EMPTY_VALUE,
  };
}

/* --------------------------------------------------------------------------
 * stored measurements
 * ----------------------------------------------------------------------- */

export interface Measurement {
  id: string;
  /** Endpoints in SVG user units, so zoom and pan do not move the cota. */
  a: MeasurePoint;
  b: MeasurePoint;
  aKind: SnapKind;
  bKind: SnapKind;
}

let measurementSeq = 0;

export function createMeasurementId(): string {
  measurementSeq += 1;
  return `m${measurementSeq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Id of the cota under `point` (both mapped through `toPoint` first). */
export function hitTestMeasurements(
  measurements: readonly Measurement[],
  point: MeasurePoint,
  tolerance: number,
  toPoint: (p: MeasurePoint) => MeasurePoint = p => p,
): string | null {
  if (!measurements?.length || !isFinitePoint(point)) return null;
  const limit = isFiniteNumber(tolerance) && tolerance > 0 ? tolerance : 6;
  let bestId: string | null = null;
  let bestDistance = Infinity;
  for (const m of measurements) {
    if (!m || !isFinitePoint(m.a) || !isFinitePoint(m.b)) continue;
    const d = distanceToSegment(point, toPoint(m.a), toPoint(m.b));
    if (d <= limit && d < bestDistance) {
      bestDistance = d;
      bestId = m.id;
    }
  }
  return bestId;
}

/* --------------------------------------------------------------------------
 * ruler ticks
 * ----------------------------------------------------------------------- */

export interface RulerTick {
  /** Value in svg units. */
  value: number;
  /** Offset in pixels along the ruler. */
  position: number;
  major: boolean;
  /** Only set on major ticks. */
  label: string | null;
}

export interface RulerTicks {
  /** Spacing between labelled ticks, in svg units. */
  step: number;
  /** Spacing between drawn ticks, in svg units. */
  minorStep: number;
  ticks: RulerTick[];
}

export interface RulerTicksOptions {
  /** SVG value at `position = 0`. */
  originValue: number;
  /** Pixels per svg unit (fit scale x zoom). */
  pixelsPerUnit: number;
  /** Ruler length in pixels. */
  length: number;
  /** Minimum pixel gap between two labels (default 64). */
  minLabelSpacing?: number;
  /** Minimum pixel gap between two drawn ticks (default 6). */
  minTickSpacing?: number;
  /** Safety valve (default 600). */
  maxTicks?: number;
}

/** Round up to the next 1 / 2 / 5 x 10^n. */
export function niceStep(raw: number): number {
  if (!isFiniteNumber(raw) || raw <= 0) return 1;
  const exponent = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exponent);
  const fraction = raw / base;
  const multiplier = fraction <= 1 + 1e-9 ? 1 : fraction <= 2 + 1e-9 ? 2 : fraction <= 5 + 1e-9 ? 5 : 10;
  const step = multiplier * base;
  return isFiniteNumber(step) && step > 0 ? step : 1;
}

/** Decimals a label needs so two consecutive ticks never render the same. */
export function decimalsForStep(step: number): number {
  if (!isFiniteNumber(step) || step <= 0) return 0;
  if (step >= 1) return 0;
  return clampNumber(Math.ceil(-Math.log10(step)), 0, 4);
}

/**
 * Tick marks for one ruler edge. The labelled step is chosen so labels are at
 * least `minLabelSpacing` px apart at ANY zoom, and the minor subdivision is
 * dropped as soon as it would get denser than `minTickSpacing`.
 */
export function computeRulerTicks(options: RulerTicksOptions): RulerTicks {
  const { originValue, pixelsPerUnit, length } = options ?? ({} as RulerTicksOptions);
  const empty: RulerTicks = { step: 0, minorStep: 0, ticks: [] };
  if (!isFiniteNumber(originValue) || !isFiniteNumber(pixelsPerUnit) || pixelsPerUnit <= 0) return empty;
  if (!isFiniteNumber(length) || length <= 0) return empty;

  const minLabelSpacing = isFiniteNumber(options.minLabelSpacing) && (options.minLabelSpacing as number) > 0
    ? (options.minLabelSpacing as number)
    : 64;
  const minTickSpacing = isFiniteNumber(options.minTickSpacing) && (options.minTickSpacing as number) > 0
    ? (options.minTickSpacing as number)
    : 6;
  const maxTicks = isFiniteNumber(options.maxTicks) && (options.maxTicks as number) > 0
    ? Math.floor(options.maxTicks as number)
    : 600;

  const step = niceStep(minLabelSpacing / pixelsPerUnit);
  let divisions = 1;
  for (const d of [5, 4, 2]) {
    if ((step / d) * pixelsPerUnit >= minTickSpacing) {
      divisions = d;
      break;
    }
  }
  const minorStep = step / divisions;
  if (!isFiniteNumber(minorStep) || minorStep <= 0) return empty;

  const decimals = decimalsForStep(step);
  const startIndex = Math.floor(originValue / minorStep - 1e-9);
  const ticks: RulerTick[] = [];
  const guard = maxTicks * 2 + 8;
  for (let i = 0; i < guard && ticks.length < maxTicks; i++) {
    const value = (startIndex + i) * minorStep;
    const position = (value - originValue) * pixelsPerUnit;
    if (position > length + 0.5) break;
    if (position < -0.5) continue;
    const ratio = value / step;
    const major = Math.abs(ratio - Math.round(ratio)) < 1e-6;
    ticks.push({
      value: value === 0 ? 0 : value,
      position,
      major,
      label: major ? formatNumber(value, { maxDecimals: decimals }) : null,
    });
  }
  return { step, minorStep, ticks };
}

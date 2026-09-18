/**
 * Logo metrics: proportion, ink area, visual center of mass vs geometric
 * center, quadrant balance and mirror symmetry.
 *
 * The core is pure math (flatten Béziers → polygons → scanline coverage with
 * nonzero / evenodd fill rules), so it is exact per scanline, handles holes
 * and overlapping shapes, and is testable without a canvas. A thin adapter
 * converts paper.js items into those polygons.
 */
import paper from 'paper';
import { sanitizeSVG } from './svg-sanitize';
import { hashKey, LRUCache } from './memo';

export interface Pt { x: number; y: number }
export interface Box { x: number; y: number; width: number; height: number }
export type FillRule = 'nonzero' | 'evenodd';

/** A filled shape: one or more closed rings combined with a fill rule. */
export interface FillShape { rings: Pt[][]; rule: FillRule }
/** A stroked (unfilled) shape, approximated as ribbons of `width`. */
export interface StrokeShape { polylines: Pt[][]; width: number; closed: boolean[] }

export interface Quadrants { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number }

export interface CoverageResult {
  /** Ink area in the shapes' units². */
  area: number;
  /** Center of mass of the ink, null when there is no ink. */
  centroid: Pt | null;
  /** Ink area per quadrant around `split`, as fractions summing to 1 (all 0 if no ink). */
  quadrants: Quadrants;
  /** Left/right mirror similarity around split.x (0..1). */
  mirrorX: number;
}

// ---------------------------------------------------------------------------
// Pure geometry
// ---------------------------------------------------------------------------

/** Flatten a cubic Bézier into points (excluding p0, including p3). */
export function flattenCubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, tolerance = 0.5): Pt[] {
  const straight = Math.abs(c1.x - p0.x) + Math.abs(c1.y - p0.y) + Math.abs(c2.x - p3.x) + Math.abs(c2.y - p3.y) < 1e-12;
  if (straight) return [{ x: p3.x, y: p3.y }];
  const hull = Math.hypot(c1.x - p0.x, c1.y - p0.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(p3.x - c2.x, p3.y - c2.y);
  const tol = tolerance > 0 ? tolerance : 0.5;
  const n = Math.max(2, Math.min(64, Math.ceil(Math.sqrt(hull / tol) * 2)));
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
    out.push({ x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y });
  }
  return out;
}

/** Shoelace signed area (positive = clockwise in screen coordinates). */
export function polygonSignedArea(ring: Pt[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

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

function intersectionLength(a: Interval[], b: Interval[]): number {
  let i = 0, j = 0, total = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (hi > lo) total += hi - lo;
    if (a[i][1] < b[j][1]) i++; else j++;
  }
  return total;
}

interface Edge { x0: number; y0: number; x1: number; y1: number; dir: 1 | -1; shape: number }

export function shapesBounds(shapes: FillShape[]): Box | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes) for (const ring of s.rings) for (const p of ring) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Ink coverage of filled shapes (union of all shapes, each with its own fill
 * rule), computed with a horizontal sweep.
 *
 * Bands are delimited by every vertex y (plus the split line and a uniform
 * grid of `rows`), so inside a band each edge is a straight segment and the
 * covered width varies linearly: sampling the band's middle is exact for
 * polygons (curves are flattened first). Very dense vertex sets are quantized
 * to `maxBands` to bound the cost.
 */
export function scanlineCoverage(
  shapes: FillShape[],
  options: { rows?: number; split?: Pt; bounds?: Box; maxBands?: number } = {},
): CoverageResult {
  const empty: CoverageResult = { area: 0, centroid: null, quadrants: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }, mirrorX: 0 };
  const box = options.bounds ?? shapesBounds(shapes);
  if (!box || !(box.height > 0) || !(box.width > 0)) return empty;
  const rows = Math.max(8, Math.min(4096, Math.round(options.rows ?? 256)));
  const maxBands = Math.max(rows, Math.min(200000, Math.round(options.maxBands ?? 20000)));
  const split = options.split ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const yMin = box.y;
  const yMax = box.y + box.height;

  const edges: Edge[] = [];
  const events: number[] = [];
  shapes.forEach((shape, si) => {
    for (const ring of shape.rings) {
      const n = ring.length;
      if (n < 3) continue;
      for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) continue;
        events.push(a.y);
        if (a.y === b.y) continue;
        edges.push(a.y < b.y
          ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y, dir: 1, shape: si }
          : { x0: b.x, y0: b.y, x1: a.x, y1: a.y, dir: -1, shape: si });
      }
    }
  });
  if (!edges.length) return empty;

  // Band boundaries: uniform grid + vertices + split line, clamped to the box.
  const quantum = events.length + rows > maxBands ? box.height / maxBands : 0;
  const ys = new Set<number>();
  for (let r = 0; r <= rows; r++) ys.add(yMin + (box.height * r) / rows);
  for (const y of events) {
    if (y <= yMin || y >= yMax) continue;
    ys.add(quantum ? yMin + Math.round((y - yMin) / quantum) * quantum : y);
  }
  if (split.y > yMin && split.y < yMax) ys.add(split.y);
  const bounds = Array.from(ys).sort((a, b) => a - b);

  edges.sort((a, b) => a.y0 - b.y0);
  let next = 0;
  let active: Edge[] = [];

  let area = 0, mx = 0, my = 0;
  const q = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  let mirrorInter = 0, mirrorUnion = 0;
  const perShape = new Map<number, Array<{ x: number; dir: number }>>();

  for (let k = 0; k < bounds.length - 1; k++) {
    const ya = bounds[k];
    const yb = bounds[k + 1];
    const h = yb - ya;
    if (!(h > 1e-12)) continue;
    const y = (ya + yb) / 2;
    while (next < edges.length && edges[next].y0 <= y) active.push(edges[next++]);
    active = active.filter(e => e.y1 > y);
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
    const merged = mergeIntervals(intervals);
    if (!merged.length) continue;
    const top = y < split.y;
    let rowLen = 0;
    for (const [x1, x2] of merged) {
      const len = x2 - x1;
      rowLen += len;
      mx += ((x1 + x2) / 2) * len * h;
      const leftLen = Math.max(0, Math.min(x2, split.x) - x1);
      const rightLen = len - leftLen;
      if (top) { q.topLeft += leftLen * h; q.topRight += rightLen * h; }
      else { q.bottomLeft += leftLen * h; q.bottomRight += rightLen * h; }
    }
    area += rowLen * h;
    my += y * rowLen * h;
    const mirrored = mergeIntervals(merged.map(([a, b]) => [2 * split.x - b, 2 * split.x - a] as Interval));
    const inter = intersectionLength(merged, mirrored);
    mirrorInter += inter * h;
    mirrorUnion += (2 * rowLen - inter) * h;
  }

  if (!(area > 0)) return empty;
  const total = q.topLeft + q.topRight + q.bottomLeft + q.bottomRight;
  return {
    area,
    centroid: { x: mx / area, y: my / area },
    quadrants: {
      topLeft: q.topLeft / total, topRight: q.topRight / total,
      bottomLeft: q.bottomLeft / total, bottomRight: q.bottomRight / total,
    },
    mirrorX: mirrorUnion > 0 ? mirrorInter / mirrorUnion : 0,
  };
}

/** Swap x/y of every point (to run the scanline on columns). */
export function transposeShapes(shapes: FillShape[]): FillShape[] {
  return shapes.map(s => ({ rule: s.rule, rings: s.rings.map(r => r.map(p => ({ x: p.y, y: p.x }))) }));
}

/** Approximate ink of unfilled strokes (ribbons): area, first moments, quadrant split. */
export function strokeInk(strokes: StrokeShape[], split: Pt) {
  let area = 0, mx = 0, my = 0;
  const q = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  for (const s of strokes) {
    s.polylines.forEach((line, li) => {
      const n = line.length;
      const segs = s.closed[li] ? n : n - 1;
      for (let i = 0; i < segs; i++) {
        const a = line[i];
        const b = line[(i + 1) % n];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (!(len > 0)) continue;
        const w = len * s.width;
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        area += w; mx += cx * w; my += cy * w;
        const key = (cy < split.y ? 'top' : 'bottom') + (cx < split.x ? 'Left' : 'Right');
        q[key as keyof typeof q] += w;
      }
    });
  }
  return { area, mx, my, q };
}

// ---------------------------------------------------------------------------
// paper.js adapter
// ---------------------------------------------------------------------------

function pathRing(path: paper.Path, matrix: paper.Matrix | null, tolerance: number): Pt[] {
  const segs = path.segments;
  const n = segs.length;
  if (!n) return [];
  const tf = (p: paper.Point): Pt => {
    const t = matrix ? matrix.transform(p) : p;
    return { x: t.x, y: t.y };
  };
  const ring: Pt[] = [tf(segs[0].point)];
  const count = path.closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const a = segs[i];
    const b = segs[(i + 1) % n];
    const p0 = tf(a.point);
    const c1 = tf(a.point.add(a.handleOut));
    const c2 = tf(b.point.add(b.handleIn));
    const p3 = tf(b.point);
    ring.push(...flattenCubic(p0, c1, c2, p3, tolerance));
  }
  if (path.closed && ring.length > 1) ring.pop(); // last point == first
  return ring;
}

function styleOf(item: paper.Item): { fill: boolean; stroke: boolean; width: number; rule: FillRule } {
  const owner = item.parent instanceof paper.CompoundPath ? item.parent : item;
  const fill = typeof owner.hasFill === 'function' ? owner.hasFill() : !!owner.fillColor;
  const stroke = typeof owner.hasStroke === 'function' ? owner.hasStroke() : !!owner.strokeColor && owner.strokeWidth > 0;
  const rule = (owner as paper.PathItem).fillRule === 'evenodd' ? 'evenodd' : 'nonzero';
  // Unstyled geometry is black-filled in SVG (paper only knows it via computed style).
  return { fill: fill || !stroke, stroke, width: owner.strokeWidth || 0, rule };
}

function globalMatrixOf(item: paper.Item): paper.Matrix | null {
  const m = (item as unknown as { globalMatrix?: paper.Matrix }).globalMatrix;
  return m && !m.isIdentity() ? m : null;
}

/** Convert paper items (paths, compound paths, groups) into fill / stroke shapes. */
export function paperToShapes(items: paper.Item | paper.Item[], tolerance = 0.5): { fills: FillShape[]; strokes: StrokeShape[] } {
  const fills: FillShape[] = [];
  const strokes: StrokeShape[] = [];
  const compoundRings = new Map<paper.Item, FillShape>();

  const addPath = (path: paper.Path) => {
    const st = styleOf(path);
    const ring = pathRing(path, globalMatrixOf(path), tolerance);
    if (ring.length < 2) return;
    if (st.fill && ring.length >= 3) {
      const owner = path.parent instanceof paper.CompoundPath ? path.parent : null;
      if (owner) {
        let shape = compoundRings.get(owner);
        if (!shape) { shape = { rings: [], rule: st.rule }; compoundRings.set(owner, shape); fills.push(shape); }
        shape.rings.push(ring);
      } else {
        fills.push({ rings: [ring], rule: st.rule });
      }
    } else if (st.stroke && st.width > 0) {
      strokes.push({ polylines: [ring], width: st.width, closed: [path.closed] });
    }
  };

  const walk = (it: paper.Item) => {
    if (it.visible === false || it.clipMask) return;
    if (it instanceof paper.CompoundPath) {
      for (const c of it.children) if (c instanceof paper.Path) addPath(c);
      return;
    }
    if (it instanceof paper.Path) { addPath(it); return; }
    for (const c of it.children || []) walk(c);
  };
  (Array.isArray(items) ? items : [items]).forEach(walk);
  return { fills, strokes };
}

/**
 * Center of mass of the ink of the given paths (area-weighted, stroke-only
 * paths approximated as ribbons). Null when there is no measurable ink.
 * Used by the optical-center renderer instead of the vertex average, which
 * was biased towards curves with many anchor points.
 */
export function computeInkCentroid(paths: paper.Item[], rows = 64): Pt | null {
  if (!paths?.length) return null;
  const { fills, strokes } = paperToShapes(paths, 0.75);
  const box = shapesBounds(fills);
  const split = box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: 0, y: 0 };
  const cov = fills.length ? scanlineCoverage(fills, { rows, split }) : null;
  const st = strokeInk(strokes, split);
  const area = (cov?.area ?? 0) + st.area;
  if (!(area > 0)) return null;
  const mx = (cov?.centroid ? cov.centroid.x * cov.area : 0) + st.mx;
  const my = (cov?.centroid ? cov.centroid.y * cov.area : 0) + st.my;
  return { x: mx / area, y: my / area };
}

// ---------------------------------------------------------------------------
// Public metrics API
// ---------------------------------------------------------------------------

export interface LogoMetrics {
  width: number;
  height: number;
  /** width / height */
  aspectRatio: number;
  /** Nearest named ratio ("1:1", "φ", "√2", "16:9"…) or "1.23:1". */
  aspectRatioLabel: string;
  orientation: 'landscape' | 'portrait' | 'square';
  boundsArea: number;
  /** Area covered by ink (fills exact per scanline; strokes approximated). */
  inkArea: number;
  /** inkArea / boundsArea (0..1). */
  inkCoverage: number;
  geometricCenter: Pt;
  /** Center of mass of the ink; null if the logo has no measurable ink. */
  visualCenter: Pt | null;
  /** Classic optical center target: geometric center raised by 5% of the height. */
  opticalCenterTarget: Pt;
  /** visualCenter − geometricCenter, in SVG units. */
  offset: Pt;
  /** Offset as % of width / height (positive = right / down). */
  offsetPercent: Pt;
  /** |offset| as % of the bounds diagonal. */
  deviationPercent: number;
  balance: { horizontal: 'left' | 'right' | 'centered'; vertical: 'top' | 'bottom' | 'centered' };
  /** Ink distribution around the geometric center (fractions summing to 1). */
  quadrants: Quadrants;
  /** Mirror similarity 0..1: left↔right (vertical axis) and top↔bottom (horizontal axis). */
  symmetry: { vertical: number; horizontal: number };
  componentCount: number;
  anchorCount: number;
  /** Fraction of anchors that have Bézier handles. */
  smoothAnchorRatio: number;
  /** Resolution used (rows); higher = more precise, slower. */
  resolution: number;
}

export interface MetricsOptions {
  /** Scanline rows (default 256). */
  resolution?: number;
  /** Threshold in % for "centered" balance (default 1). */
  centeredThresholdPercent?: number;
}

const NAMED_RATIOS: Array<[string, number]> = [
  ['1:1', 1], ['5:4', 5 / 4], ['4:3', 4 / 3], ['3:2', 3 / 2], ['√2', Math.SQRT2], ['φ', (1 + Math.sqrt(5)) / 2],
  ['16:9', 16 / 9], ['√3', Math.sqrt(3)], ['2:1', 2], ['√5', Math.sqrt(5)], ['3:1', 3],
];

export function nameAspectRatio(ratio: number, tolerance = 0.01): string {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return '—';
  const r = ratio >= 1 ? ratio : 1 / ratio;
  let best: [string, number] | null = null;
  for (const entry of NAMED_RATIOS) {
    const rel = Math.abs(r - entry[1]) / entry[1];
    if (rel <= tolerance && (!best || rel < Math.abs(r - best[1]) / best[1])) best = entry;
  }
  if (best) {
    if (ratio >= 1 || best[0] === '1:1') return best[0];
    return best[0].includes(':') ? best[0].split(':').reverse().join(':') : `1:${best[0]}`;
  }
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

let metricsScope: paper.PaperScope | null = null;
const metricsCache = new LRUCache<string, LogoMetrics>(16);

function importForMetrics(svg: string): paper.Item | null {
  if (!metricsScope) {
    metricsScope = new paper.PaperScope();
    metricsScope.setup(new metricsScope.Size(1, 1));
  }
  const scope = metricsScope;
  scope.activate();
  try {
    scope.project.clear();
    return scope.project.importSVG(svg, { expandShapes: true }) as paper.Item | null;
  } finally {
    paper.activate();
  }
}

/**
 * Compute logo metrics from an SVG string or a ParsedSVG-like object
 * (`{ originalSVG }`). Memoized by SVG content + options.
 */
export function computeLogoMetrics(input: string | { originalSVG: string }, options: MetricsOptions = {}): LogoMetrics {
  // Always sanitize (memoized + idempotent): an unsanitized string would keep
  // the artboard clip mask and measure the artboard instead of the logo.
  const svg = sanitizeSVG(typeof input === 'string' ? input : input.originalSVG).svg;
  const key = hashKey(svg, options);
  const cached = metricsCache.get(key);
  if (cached) return structuredCloneSafe(cached);

  const item = importForMetrics(svg);
  const resolution = Math.max(16, Math.min(2048, Math.round(options.resolution ?? 256)));
  const threshold = options.centeredThresholdPercent ?? 1;
  const b = item ? item.bounds : null;
  const width = b && Number.isFinite(b.width) ? b.width : 0;
  const height = b && Number.isFinite(b.height) ? b.height : 0;
  const gc: Pt = { x: (b?.x ?? 0) + width / 2, y: (b?.y ?? 0) + height / 2 };

  const { fills, strokes } = item ? paperToShapes(item, Math.max(width, height) / 2000 || 0.5) : { fills: [], strokes: [] };
  const box: Box = { x: b?.x ?? 0, y: b?.y ?? 0, width, height };
  const cov = width > 0 && height > 0 && fills.length
    ? scanlineCoverage(fills, { rows: resolution, split: gc, bounds: box })
    : null;
  const covCols = width > 0 && height > 0 && fills.length
    ? scanlineCoverage(transposeShapes(fills), { rows: resolution, split: { x: gc.y, y: gc.x }, bounds: { x: box.y, y: box.x, width: height, height: width } })
    : null;
  const st = strokeInk(strokes, gc);

  const inkArea = (cov?.area ?? 0) + st.area;
  let visualCenter: Pt | null = null;
  const quadrants: Quadrants = { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  if (inkArea > 0) {
    const fa = cov?.area ?? 0;
    visualCenter = {
      x: ((cov?.centroid?.x ?? 0) * fa + st.mx) / inkArea,
      y: ((cov?.centroid?.y ?? 0) * fa + st.my) / inkArea,
    };
    (Object.keys(quadrants) as Array<keyof Quadrants>).forEach(k => {
      quadrants[k] = ((cov?.quadrants[k] ?? 0) * fa + st.q[k]) / inkArea;
    });
  }

  const offset = visualCenter ? { x: visualCenter.x - gc.x, y: visualCenter.y - gc.y } : { x: 0, y: 0 };
  const offsetPercent = {
    x: width > 0 ? (offset.x / width) * 100 : 0,
    y: height > 0 ? (offset.y / height) * 100 : 0,
  };
  const diag = Math.hypot(width, height);
  const segs = item ? paperToAnchorStats(item) : { anchors: 0, smooth: 0, components: 0 };
  const ratio = height > 0 ? width / height : 0;

  const result: LogoMetrics = {
    width,
    height,
    aspectRatio: ratio,
    aspectRatioLabel: nameAspectRatio(ratio),
    orientation: Math.abs(ratio - 1) <= 0.01 ? 'square' : ratio > 1 ? 'landscape' : 'portrait',
    boundsArea: width * height,
    inkArea,
    inkCoverage: width * height > 0 ? Math.min(1, inkArea / (width * height)) : 0,
    geometricCenter: gc,
    visualCenter,
    opticalCenterTarget: { x: gc.x, y: gc.y - height * 0.05 },
    offset,
    offsetPercent,
    deviationPercent: diag > 0 ? (Math.hypot(offset.x, offset.y) / diag) * 100 : 0,
    balance: {
      horizontal: Math.abs(offsetPercent.x) <= threshold ? 'centered' : offsetPercent.x < 0 ? 'left' : 'right',
      vertical: Math.abs(offsetPercent.y) <= threshold ? 'centered' : offsetPercent.y < 0 ? 'top' : 'bottom',
    },
    quadrants,
    symmetry: { vertical: cov?.mirrorX ?? 0, horizontal: covCols?.mirrorX ?? 0 },
    componentCount: segs.components,
    anchorCount: segs.anchors,
    smoothAnchorRatio: segs.anchors ? segs.smooth / segs.anchors : 0,
    resolution,
  };
  metricsCache.set(key, result);
  return structuredCloneSafe(result);
}

function paperToAnchorStats(item: paper.Item) {
  let anchors = 0, smooth = 0, components = 0;
  const eps = Math.hypot(item.bounds.width, item.bounds.height) * 1e-4 || 1e-6;
  const walk = (it: paper.Item) => {
    if (it.visible === false || it.clipMask) return;
    if (it instanceof paper.CompoundPath || it instanceof paper.Path) {
      if (it.bounds.width > 0 && it.bounds.height > 0) components++;
      const paths = it instanceof paper.CompoundPath ? (it.children as paper.Path[]) : [it];
      for (const p of paths) for (const s of p.segments || []) {
        anchors++;
        if (s.handleIn.length > eps || s.handleOut.length > eps) smooth++;
      }
      return;
    }
    for (const c of it.children || []) walk(c);
  };
  walk(item);
  return { anchors, smooth, components };
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Clear memoized metrics (e.g. in tests). */
export function clearMetricsCache(): void {
  metricsCache.clear();
}

import paper from 'paper';
import type { GuideMetrics } from './scale';

export const PHI = (1 + Math.sqrt(5)) / 2;

export interface StyleConfig {
  color: string;
  opacity: number;
  strokeWidth: number;
}

export interface RenderContext {
  actualPaths?: paper.Path[];
  useRealData?: boolean;
  contentBounds?: paper.Rectangle;
  /**
   * SVG user units per canvas pixel (1 / preview scale). When provided,
   * measurement labels show SVG units instead of zoom-dependent screen px.
   */
  unitsPerPixel?: number;
  /**
   * Scale-aware lengths for strokes, dashes, labels and dots. Supplied by the
   * render pipeline. Renderers must use it instead of fixed pixel numbers so
   * the preview and a 4096px export look identical. See ./scale.
   */
  metrics?: GuideMetrics;
}

/** Hard cap on lines/shapes a single grid-like renderer may create. */
export const MAX_RENDER_ITEMS = 4000;

/** Finite, positive number or the fallback. */
export function positiveOr(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** True when a rectangle is usable for geometry (finite, non-degenerate). */
export function isUsableRect(r: { width: number; height: number; x?: number; y?: number } | null | undefined): boolean {
  return !!r && Number.isFinite(r.width) && Number.isFinite(r.height) && r.width > 0 && r.height > 0
    && (r.x === undefined || Number.isFinite(r.x)) && (r.y === undefined || Number.isFinite(r.y));
}

/** Clamp a subdivision count coming from a free-text input. */
export function sanitizeSubdivisions(value: number, fallback = 8, max = 256): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(1, Math.round(value)));
}

/** Format a canvas-px length for labels (SVG units when the context knows the scale). */
export function formatLength(px: number, context?: RenderContext): string {
  const k = context?.unitsPerPixel;
  if (k && Number.isFinite(k) && k > 0) {
    const v = px * k;
    return `${v >= 100 ? Math.round(v) : Number(v.toFixed(v >= 10 ? 1 : 2))}u`;
  }
  return `${Math.round(px)}px`;
}

/** Compute the tight bounding box union from actual paths */
export function computeContentBounds(paths: paper.Path[]): paper.Rectangle | null {
  if (!paths || paths.length === 0) return null;
  let result = paths[0].bounds.clone();
  for (let i = 1; i < paths.length; i++) {
    result = result.unite(paths[i].bounds);
  }
  return result;
}

/** Compute the visual centroid (weighted by path length) of all paths */
export function computeVisualCentroid(paths: paper.Path[]): paper.Point {
  let totalWeight = 0;
  let cx = 0;
  let cy = 0;
  for (const p of paths) {
    const len = p.length;
    const w = Number.isFinite(len) && len > 0 ? len : 1;
    cx += p.bounds.center.x * w;
    cy += p.bounds.center.y * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return paths[0]?.bounds.center ?? new paper.Point(0, 0);
  return new paper.Point(cx / totalWeight, cy / totalWeight);
}

/**
 * Parse #rgb, #rrggbb, #rrggbbaa (and a few fallbacks) into RGBA 0..1.
 * Invalid input yields opaque black instead of NaN channels.
 */
export function parseHexColor(hex: string): { r: number; g: number; b: number; a: number } {
  const s = typeof hex === 'string' ? hex.trim() : '';
  let m = /^#?([0-9a-f]{3,4})$/i.exec(s);
  if (m) {
    const [r, g, b, a = 'f'] = m[1].split('');
    return { r: parseInt(r + r, 16) / 255, g: parseInt(g + g, 16) / 255, b: parseInt(b + b, 16) / 255, a: parseInt(a + a, 16) / 255 };
  }
  m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (m) {
    return {
      r: parseInt(m[1].slice(0, 2), 16) / 255,
      g: parseInt(m[1].slice(2, 4), 16) / 255,
      b: parseInt(m[1].slice(4, 6), 16) / 255,
      a: m[2] ? parseInt(m[2], 16) / 255 : 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

export function hexToColor(hex: string, opacity: number): paper.Color {
  const { r, g, b, a } = parseHexColor(hex);
  return new paper.Color(r, g, b, clamp01(a * opacity));
}

/**
 * Check if a Paper.js item intersects with any actual SVG path.
 * Paths whose bounds do not overlap the item are skipped (cheap pre-filter —
 * getIntersections is by far the most expensive call in the render loop).
 */
export function intersectsAnyPath(item: paper.PathItem, paths: paper.Path[]): boolean {
  const ib = item.bounds;
  const pad = 0.5;
  const left = ib.left - pad, right = ib.right + pad, top = ib.top - pad, bottom = ib.bottom + pad;
  for (const path of paths) {
    const pb = path.bounds;
    if (pb.right < left || pb.left > right || pb.bottom < top || pb.top > bottom) continue;
    if (item.getIntersections(path).length > 0) return true;
  }
  return false;
}

/** Conditionally show or remove an item based on real-data intersection */
export function showIfIntersects(
  item: paper.PathItem,
  context: RenderContext | undefined,
  applyStyle: () => void
): void {
  if (context?.useRealData && context?.actualPaths) {
    if (intersectsAnyPath(item, context.actualPaths)) {
      applyStyle();
    } else {
      item.remove();
    }
  } else {
    applyStyle();
  }
}

/** Cohen-Sutherland line clipping */
export function clipLineToRect(
  x1: number, y1: number, x2: number, y2: number,
  xmin: number, ymin: number, xmax: number, ymax: number
): [number, number, number, number] | null {
  if (![x1, y1, x2, y2, xmin, ymin, xmax, ymax].every(Number.isFinite)) return null;
  const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
  const code = (x: number, y: number) => {
    let c = INSIDE;
    if (x < xmin) c |= LEFT; else if (x > xmax) c |= RIGHT;
    if (y < ymin) c |= TOP; else if (y > ymax) c |= BOTTOM;
    return c;
  };
  let c1 = code(x1, y1), c2 = code(x2, y2);
  for (let iter = 0; iter < 16; iter++) {
    if (!(c1 | c2)) return [x1, y1, x2, y2];
    if (c1 & c2) return null;
    const co = c1 ? c1 : c2;
    let x = 0, y = 0;
    if (co & BOTTOM) { x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1); y = ymax; }
    else if (co & TOP) { x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1); y = ymin; }
    else if (co & RIGHT) { y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1); x = xmax; }
    else if (co & LEFT) { y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1); x = xmin; }
    if (co === c1) { x1 = x; y1 = y; c1 = code(x1, y1); }
    else { x2 = x; y2 = y; c2 = code(x2, y2); }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Golden rectangle / spiral math (pure, shared by spiral + Fibonacci overlay)
// ---------------------------------------------------------------------------

export interface PlainRect { x: number; y: number; width: number; height: number }

/**
 * Largest golden rectangle centered inside `rect`, oriented like `rect`
 * (landscape for wide bounds, portrait for tall bounds).
 */
export function fitGoldenRect(rect: PlainRect): PlainRect & { orientation: 'landscape' | 'portrait' } {
  const W = Math.max(0, rect.width || 0);
  const H = Math.max(0, rect.height || 0);
  const cx = rect.x + W / 2;
  const cy = rect.y + H / 2;
  const portrait = H > W;
  let w: number, h: number;
  if (!portrait) {
    if (H > 0 && W / H >= PHI) { h = H; w = h * PHI; } else { w = W; h = w / PHI; }
  } else {
    if (W > 0 && H / W >= PHI) { w = W; h = w * PHI; } else { h = H; w = h / PHI; }
  }
  return { x: cx - w / 2, y: cy - h / 2, width: w, height: h, orientation: portrait ? 'portrait' : 'landscape' };
}

export type SpiralSide = 'left' | 'top' | 'right' | 'bottom';

export interface GoldenSpiralStep {
  side: SpiralSide;
  /** The square cut from the remaining rectangle. */
  square: PlainRect;
  /** Arc center / radius and start angle (degrees, screen coords, +90° sweep). */
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  /** Divider line between the square and the remaining rectangle. */
  divider: [number, number, number, number];
}

const SIDES: SpiralSide[] = ['left', 'top', 'right', 'bottom'];

/**
 * Successive square cuts of a golden rectangle, clockwise. Landscape
 * rectangles start on the left, portrait ones on the top, so the arcs always
 * form one continuous spiral.
 */
export function computeGoldenSpiralSteps(rect: PlainRect, maxSteps = 12, minSize = 0.5): GoldenSpiralStep[] {
  let { x, y } = rect;
  let w = rect.width;
  let h = rect.height;
  const steps: GoldenSpiralStep[] = [];
  if (!(w > 0 && h > 0)) return steps;
  const offset = h > w ? 1 : 0;
  for (let i = 0; i < maxSteps; i++) {
    const s = Math.min(w, h);
    if (!(s >= minSize)) break;
    const side = SIDES[(i + offset) % 4];
    let step: GoldenSpiralStep;
    switch (side) {
      case 'left':
        step = { side, square: { x, y, width: s, height: s }, center: { x: x + s, y: y + s }, radius: s, startAngle: 180, divider: [x + s, y, x + s, y + s] };
        x += s; w -= s;
        break;
      case 'top':
        step = { side, square: { x, y, width: s, height: s }, center: { x, y: y + s }, radius: s, startAngle: 270, divider: [x, y + s, x + s, y + s] };
        y += s; h -= s;
        break;
      case 'right':
        step = { side, square: { x: x + w - s, y, width: s, height: s }, center: { x: x + w - s, y }, radius: s, startAngle: 0, divider: [x + w - s, y, x + w - s, y + s] };
        w -= s;
        break;
      default:
        step = { side, square: { x, y: y + h - s, width: s, height: s }, center: { x: x + s, y: y + h - s }, radius: s, startAngle: 90, divider: [x, y + h - s, x + s, y + h - s] };
        h -= s;
        break;
    }
    steps.push(step);
  }
  return steps;
}

/** Point on a spiral arc at `angleDeg` (screen coordinates). */
export function arcPoint(step: Pick<GoldenSpiralStep, 'center' | 'radius'>, angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: step.center.x + step.radius * Math.cos(a), y: step.center.y + step.radius * Math.sin(a) };
}

/**
 * Vesica piscis lens: two circles of radius r whose centers are r apart.
 * Returns the two cusp points and the two extreme points of the lens.
 */
export function vesicaLens(cx: number, cy: number, r: number) {
  const halfHeight = Math.sqrt(r * r - (r / 2) * (r / 2)); // = r·√3/2
  const halfWidth = r / 2;
  return {
    top: { x: cx, y: cy - halfHeight },
    bottom: { x: cx, y: cy + halfHeight },
    left: { x: cx - halfWidth, y: cy },
    right: { x: cx + halfWidth, y: cy },
  };
}

/** Symmetric similarity between two ratios in % (100 = identical). */
export function ratioMatchPercent(actual: number, target: number): number {
  if (!(actual > 0) || !(target > 0) || !Number.isFinite(actual) || !Number.isFinite(target)) return 0;
  return (Math.min(actual, target) / Math.max(actual, target)) * 100;
}

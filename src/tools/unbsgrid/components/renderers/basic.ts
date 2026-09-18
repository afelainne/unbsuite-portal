/**
 * Basic constructions (bounding boxes, circles, axes, diagonals, tangents,
 * anchors).
 *
 * Two rules every function here follows:
 *  1. No decorative length is a fixed pixel number. Stroke widths, dashes,
 *     label sizes, dot radii and overshoots come from `metricsFor(context,
 *     bounds)` so the 600px preview and a 4096px export look the same.
 *  2. Whatever can be derived from the real drawing is derived from it:
 *     `context.contentBounds` (real ink bbox) instead of the item bounds, and
 *     `context.actualPaths` (real contours) for circles, tangents and anchors.
 *     Without real data every construction falls back to the bounding box.
 */
import paper from 'paper';
import {
  hexToColor, showIfIntersects, isUsableRect, formatLength,
  type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor } from './scale';

// ---------------------------------------------------------------------------
// Shared "real structure" helpers (also used by proportions.ts / harmony.ts)
// ---------------------------------------------------------------------------

/** Reference frame: the real ink bbox when the context has one, else the item bounds. */
export function frameOf(bounds: paper.Rectangle, context?: RenderContext): paper.Rectangle {
  const cb = context?.contentBounds;
  return cb && isUsableRect(cb) ? cb : bounds;
}

/** Union of the usable rectangles, or null when there is none. */
export function unionRects(rects: readonly paper.Rectangle[] | undefined): paper.Rectangle | null {
  let out: paper.Rectangle | null = null;
  for (const r of rects ?? []) {
    if (!isUsableRect(r)) continue;
    out = out ? out.unite(r) : r.clone();
  }
  return out;
}

/** Hard cap on contour samples, so a 5000-node logo cannot stall a render. */
export const MAX_CONTOUR_SAMPLES = 2048;

/**
 * Points that lie ON the real contour: every segment anchor plus an even
 * arc-length sampling of each path. Constructions use these to touch the
 * drawing itself instead of its bounding box.
 */
export function samplePathPoints(paths: readonly paper.Path[] | undefined, perPath = 64): paper.Point[] {
  const out: paper.Point[] = [];
  if (!paths || paths.length === 0) return out;
  const per = Math.max(4, Math.min(perPath, Math.floor(MAX_CONTOUR_SAMPLES / paths.length)));
  const push = (p: paper.Point | null | undefined) => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    out.push(new paper.Point(p.x, p.y));
  };
  for (const path of paths) {
    for (const seg of path.segments ?? []) {
      if (out.length >= MAX_CONTOUR_SAMPLES) return out;
      push(seg.point);
    }
    const len = path.length;
    if (!Number.isFinite(len) || len <= 0) continue;
    for (let i = 0; i < per; i++) {
      if (out.length >= MAX_CONTOUR_SAMPLES) return out;
      push(path.getPointAt((len * i) / per));
    }
  }
  return out;
}

/**
 * Draw or filter. A construction measured ON the contour touches the drawing
 * by definition, and that contact is *tangential*: `getIntersections` is
 * numerically unreliable exactly there and would silently delete the correct
 * guide. Only bounding-box guesses go through the intersection filter.
 */
export function showDerived(
  item: paper.PathItem,
  context: RenderContext | undefined,
  fromInk: boolean,
  applyStyle: () => void,
): void {
  if (fromInk) applyStyle();
  else showIfIntersects(item, context, applyStyle);
}

/** Contour points inside (or within `pad` of) a rectangle. */
export function pointsInRect(points: readonly paper.Point[], rect: paper.Rectangle, pad = 0.5): paper.Point[] {
  return points.filter(p =>
    p.x >= rect.left - pad && p.x <= rect.right + pad &&
    p.y >= rect.top - pad && p.y <= rect.bottom + pad);
}

/** Average of a point cloud (null when empty). */
export function averagePoint(points: readonly paper.Point[]): paper.Point | null {
  if (!points.length) return null;
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return new paper.Point(x / points.length, y / points.length);
}

/** Nearest / farthest distance from `center` to a point cloud. */
export function radialExtent(
  points: readonly paper.Point[],
  center: paper.Point,
): { min: number; max: number } | null {
  if (!points.length) return null;
  let min = Infinity, max = 0;
  for (const p of points) {
    const d = Math.hypot(p.x - center.x, p.y - center.y);
    if (!Number.isFinite(d)) continue;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return Number.isFinite(min) && max > 0 ? { min, max } : null;
}

/** Extreme contour points of a cloud: the real tangency points on each side. */
export function extremePoints(points: readonly paper.Point[]): {
  left: paper.Point; right: paper.Point; top: paper.Point; bottom: paper.Point;
} | null {
  if (!points.length) return null;
  let left = points[0], right = points[0], top = points[0], bottom = points[0];
  for (const p of points) {
    if (p.x < left.x) left = p;
    if (p.x > right.x) right = p;
    if (p.y < top.y) top = p;
    if (p.y > bottom.y) bottom = p;
  }
  return { left, right, top, bottom };
}

// ---------------------------------------------------------------------------
// Constructions
// ---------------------------------------------------------------------------

export function renderBoundingRects(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  scaledCompBounds.forEach(cb => {
    if (!isUsableRect(cb)) return;
    const rect = new paper.Path.Rectangle(cb);
    rect.strokeColor = color;
    rect.strokeWidth = m.stroke(style.strokeWidth);
    rect.fillColor = null;
    rect.dashArray = m.dash(4, 3);
  });

  if (!isUsableRect(bounds)) return;
  const fullRect = new paper.Path.Rectangle(bounds);
  fullRect.strokeColor = hexToColor(style.color, style.opacity * 0.7);
  fullRect.strokeWidth = m.stroke(style.strokeWidth * 1.2);
  fullRect.fillColor = null;

  // Tight ink box: only worth drawing when it differs from the item bounds
  // (item bounds include stroke width, so they are usually slightly larger).
  const ink = context?.contentBounds;
  const tol = m.len(1);
  if (ink && isUsableRect(ink) && (Math.abs(ink.width - bounds.width) > tol || Math.abs(ink.height - bounds.height) > tol)) {
    const inkRect = new paper.Path.Rectangle(ink);
    inkRect.strokeColor = hexToColor(style.color, style.opacity * 0.45);
    inkRect.strokeWidth = m.stroke(style.strokeWidth * 0.6);
    inkRect.fillColor = null;
    inkRect.dashArray = m.dash(2, 2);
  }

  const dims = new paper.PointText(new paper.Point(bounds.left, bounds.top - m.len(5)));
  dims.content = `${formatLength(bounds.width, context)} × ${formatLength(bounds.height, context)}`;
  dims.fillColor = hexToColor(style.color, style.opacity * 0.6);
  dims.fontSize = m.font(8);
}

export function renderCircles(
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const rects = scaledCompBounds.filter(isUsableRect);
  const frame = unionRects(rects) ?? (context?.contentBounds && isUsableRect(context.contentBounds) ? context.contentBounds : null);
  if (!frame) return;
  const targets = rects.length ? rects : [frame];
  const m = metricsFor(context, frame);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);

  // A component repeated in the parse (or a round mark, whose inscribed and
  // circumscribed circles are the same circle) used to draw the very same
  // circle twice, doubling its weight. Tolerance-based so two circles that
  // differ by a sampling artefact count as one.
  const drawn: Array<{ x: number; y: number; r: number }> = [];
  const once = (cx: number, cy: number, r: number): boolean => {
    if (!(r > 0) || !Number.isFinite(r) || !Number.isFinite(cx) || !Number.isFinite(cy)) return false;
    const tol = Math.max(m.len(1), r * 0.02);
    if (drawn.some(c => Math.abs(c.r - r) <= tol && Math.hypot(c.x - cx, c.y - cy) <= tol)) return false;
    drawn.push({ x: cx, y: cy, r });
    return true;
  };

  const samples = context?.useRealData ? samplePathPoints(context.actualPaths) : [];

  targets.forEach(cb => {
    let center = cb.center;
    let inscribedR = Math.min(cb.width, cb.height) / 2;
    let circumR = Math.hypot(cb.width, cb.height) / 2;
    let real = false;

    // Real inscribed / circumscribed circles: measured from the contour points
    // that belong to this component, not from the rectangle around them.
    const local = samples.length ? pointsInRect(samples, cb, Math.max(1, m.len(1))) : [];
    if (local.length >= 3) {
      const c = averagePoint(local);
      const ext = c ? radialExtent(local, c) : null;
      if (c && ext && ext.max > 0) {
        center = new paper.Point(c.x, c.y);
        circumR = ext.max;
        // A center sitting on top of a stroke gives min ≈ 0: keep the bbox
        // inscribed radius in that case so the construction stays readable.
        inscribedR = ext.min > circumR * 0.02 ? ext.min : inscribedR;
        real = true;
      }
    }

    if (once(center.x, center.y, inscribedR)) {
      const inscribed = new paper.Path.Circle(center, inscribedR);
      showDerived(inscribed, context, real, () => {
        inscribed.strokeColor = color;
        inscribed.strokeWidth = m.stroke(style.strokeWidth);
        inscribed.fillColor = null;
        if (inscribedR > m.len(24)) {
          const label = new paper.PointText(new paper.Point(center.x, center.y - inscribedR - m.len(3)));
          label.content = `r ${formatLength(inscribedR, context)}`;
          label.fillColor = hexToColor(style.color, style.opacity * 0.6);
          label.fontSize = m.font(7);
          label.justification = 'center';
        }
      });
    }

    if (once(center.x, center.y, circumR)) {
      const circum = new paper.Path.Circle(center, circumR);
      showDerived(circum, context, real, () => {
        circum.strokeColor = dimColor;
        circum.strokeWidth = m.stroke(style.strokeWidth);
        circum.fillColor = null;
        circum.dashArray = m.dash(6, 4);
      });
    }

    if (real) {
      const dot = new paper.Path.Circle(center, m.dot(1.5));
      dot.fillColor = hexToColor(style.color, style.opacity * 0.7);
      dot.strokeColor = null;
    }
  });
}

export function renderCenterLines(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const over = m.len(30);

  const hLine = new paper.Path.Line(
    new paper.Point(frame.left - over, frame.center.y),
    new paper.Point(frame.right + over, frame.center.y)
  );
  showIfIntersects(hLine, context, () => {
    hLine.strokeColor = color; hLine.strokeWidth = m.stroke(style.strokeWidth); hLine.dashArray = m.dash(8, 4);
  });

  const vLine = new paper.Path.Line(
    new paper.Point(frame.center.x, frame.top - over),
    new paper.Point(frame.center.x, frame.bottom + over)
  );
  showIfIntersects(vLine, context, () => {
    vLine.strokeColor = color; vLine.strokeWidth = m.stroke(style.strokeWidth); vLine.dashArray = m.dash(8, 4);
  });

  const compOver = m.len(10);
  const eps = m.len(2);
  scaledCompBounds.forEach(cb => {
    if (!isUsableRect(cb)) return;
    if (Math.abs(cb.center.x - frame.center.x) <= eps && Math.abs(cb.center.y - frame.center.y) <= eps) return;
    const ch = new paper.Path.Line(new paper.Point(cb.left - compOver, cb.center.y), new paper.Point(cb.right + compOver, cb.center.y));
    showIfIntersects(ch, context, () => {
      ch.strokeColor = dimColor; ch.strokeWidth = m.stroke(style.strokeWidth * 0.5); ch.dashArray = m.dash(4, 3);
    });
    const cv = new paper.Path.Line(new paper.Point(cb.center.x, cb.top - compOver), new paper.Point(cb.center.x, cb.bottom + compOver));
    showIfIntersects(cv, context, () => {
      cv.strokeColor = dimColor; cv.strokeWidth = m.stroke(style.strokeWidth * 0.5); cv.dashArray = m.dash(4, 3);
    });
  });
}

export function renderDiagonals(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);

  let shown = 0;
  const d1 = new paper.Path.Line(new paper.Point(frame.left, frame.top), new paper.Point(frame.right, frame.bottom));
  showIfIntersects(d1, context, () => { d1.strokeColor = color; d1.strokeWidth = m.stroke(style.strokeWidth); shown++; });
  const d2 = new paper.Path.Line(new paper.Point(frame.right, frame.top), new paper.Point(frame.left, frame.bottom));
  showIfIntersects(d2, context, () => { d2.strokeColor = color; d2.strokeWidth = m.stroke(style.strokeWidth); shown++; });

  if (shown === 2) {
    const dot = new paper.Path.Circle(frame.center, m.dot(2));
    dot.fillColor = hexToColor(style.color, style.opacity * 0.8);
    dot.strokeColor = null;
  }

  scaledCompBounds.forEach(cb => {
    if (!isUsableRect(cb)) return;
    const cd1 = new paper.Path.Line(new paper.Point(cb.left, cb.top), new paper.Point(cb.right, cb.bottom));
    showIfIntersects(cd1, context, () => { cd1.strokeColor = dimColor; cd1.strokeWidth = m.stroke(style.strokeWidth * 0.5); });
    const cd2 = new paper.Path.Line(new paper.Point(cb.right, cb.top), new paper.Point(cb.left, cb.bottom));
    showIfIntersects(cd2, context, () => { cd2.strokeColor = dimColor; cd2.strokeWidth = m.stroke(style.strokeWidth * 0.5); });
  });
}

export function renderTangentLines(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const over = m.len(40);
  const rects = scaledCompBounds.filter(isUsableRect);
  const targets = rects.length ? rects : [frame];
  const samples = context?.useRealData ? samplePathPoints(context.actualPaths) : [];

  const seenH = new Set<number>();
  const seenV = new Set<number>();

  targets.forEach(cb => {
    // Tangency points on the real contour when we have it: the line then
    // touches the drawing, not the rectangle that happens to contain it.
    const local = samples.length ? pointsInRect(samples, cb, Math.max(1, m.len(1))) : [];
    const ext = local.length >= 2 ? extremePoints(local) : null;

    const horizontals: Array<{ y: number; touch: paper.Point | null }> = ext
      ? [{ y: ext.top.y, touch: ext.top }, { y: ext.bottom.y, touch: ext.bottom }]
      : [{ y: cb.top, touch: null }, { y: cb.bottom, touch: null }];
    const verticals: Array<{ x: number; touch: paper.Point | null }> = ext
      ? [{ x: ext.left.x, touch: ext.left }, { x: ext.right.x, touch: ext.right }]
      : [{ x: cb.left, touch: null }, { x: cb.right, touch: null }];

    horizontals.forEach(({ y, touch }) => {
      const key = Math.round(y * 100);
      if (seenH.has(key)) return;
      seenH.add(key);
      const line = new paper.Path.Line(new paper.Point(frame.left - over, y), new paper.Point(frame.right + over, y));
      showDerived(line, context, !!touch, () => {
        line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth); line.dashArray = m.dash(2, 3);
        if (touch) markTangency(touch, style, m);
      });
    });

    verticals.forEach(({ x, touch }) => {
      const key = Math.round(x * 100);
      if (seenV.has(key)) return;
      seenV.add(key);
      const line = new paper.Path.Line(new paper.Point(x, frame.top - over), new paper.Point(x, frame.bottom + over));
      showDerived(line, context, !!touch, () => {
        line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth); line.dashArray = m.dash(2, 3);
        if (touch) markTangency(touch, style, m);
      });
    });
  });
}

function markTangency(pt: paper.Point, style: StyleConfig, m: ReturnType<typeof metricsFor>) {
  const dot = new paper.Path.Circle(pt, m.dot(2));
  dot.fillColor = null;
  dot.strokeColor = hexToColor(style.color, style.opacity * 0.9);
  dot.strokeWidth = m.stroke(style.strokeWidth * 0.8);
}

export function renderAnchoringPoints(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const size = m.len(4) + m.stroke(style.strokeWidth) * 2;

  const refs = [
    frame.topLeft, new paper.Point(frame.center.x, frame.top), frame.topRight,
    new paper.Point(frame.left, frame.center.y), frame.center, new paper.Point(frame.right, frame.center.y),
    frame.bottomLeft, new paper.Point(frame.center.x, frame.bottom), frame.bottomRight,
  ];

  const tol = Math.max(frame.width, frame.height) * 0.05;
  const paths = context?.useRealData ? context.actualPaths : undefined;

  refs.forEach(ref => {
    let pt = ref;
    if (paths && paths.length) {
      // Snap the frame anchor to the closest real node, so the marker sits on
      // the drawing. No node within tolerance => the anchor is not anchoring
      // anything and is dropped (previous behaviour).
      let best: paper.Point | null = null;
      let bestD = Infinity;
      for (const path of paths) {
        const nearest = path.getNearestPoint(ref);
        if (!nearest) continue;
        const d = nearest.getDistance(ref);
        if (d < bestD) { bestD = d; best = nearest; }
      }
      if (!best || bestD > tol) return;
      pt = new paper.Point(best.x, best.y);

      if (bestD > m.len(1)) {
        const link = new paper.Path.Line(ref, pt);
        link.strokeColor = hexToColor(style.color, style.opacity * 0.35);
        link.strokeWidth = m.stroke(style.strokeWidth * 0.4);
        link.dashArray = m.dash(2, 2);
      }
    }

    const h = new paper.Path.Line(new paper.Point(pt.x - size, pt.y), new paper.Point(pt.x + size, pt.y));
    h.strokeColor = color; h.strokeWidth = m.stroke(style.strokeWidth);
    const v = new paper.Path.Line(new paper.Point(pt.x, pt.y - size), new paper.Point(pt.x, pt.y + size));
    v.strokeColor = color; v.strokeWidth = m.stroke(style.strokeWidth);
    const dot = new paper.Path.Circle(pt, m.dot(1.5) + m.stroke(style.strokeWidth) * 0.5);
    dot.fillColor = color;
    dot.strokeColor = hexToColor('#ffffff', style.opacity * 0.6);
    dot.strokeWidth = m.stroke(style.strokeWidth * 0.3);
  });
}

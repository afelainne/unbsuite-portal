import paper from 'paper';
import {
  hexToColor,
  showIfIntersects,
  computeContentBounds,
  computeVisualCentroid,
  isUsableRect,
  formatLength,
  MAX_RENDER_ITEMS,
  type StyleConfig,
  type RenderContext,
} from './utils';
import { metricsFor } from './scale';
import { computeInkCentroid } from '../../lib/metrics';

/** √3/2 — the row height of a unit triangular lattice. */
const H3 = Math.sqrt(3) / 2;

/**
 * Hexagon radius for a honeycomb covering `rect` (~8 hexes across), enlarged
 * when the lattice would exceed `maxCells` (very tall/narrow content).
 */
export function hexGridRadius(rect: { width: number; height: number }, maxCells = MAX_RENDER_ITEMS / 2): number {
  let r = rect.width / 16;
  if (!(r > 0) || !Number.isFinite(r)) return 0;
  const cells = (rWidth: number) => {
    const cols = (rect.width + 4 * rWidth) / (1.5 * rWidth) + 1;
    const rows = (rect.height + 2 * Math.sqrt(3) * rWidth) / (Math.sqrt(3) * rWidth) + 1;
    return cols * rows;
  };
  const n = cells(r);
  if (n > maxCells) r *= Math.sqrt(n / maxCells);
  return r;
}

/**
 * Anchor for every construction here: the CONTENT box and the center of mass
 * of the ink (not the artboard, and not the average of the anchor points —
 * that one drifts towards whichever part of the drawing has more nodes).
 */
export function resolveAnchor(bounds: paper.Rectangle, context?: RenderContext): {
  center: paper.Point;
  refRect: paper.Rectangle;
} {
  if (context?.useRealData && context?.actualPaths && context.actualPaths.length > 0) {
    const cb = context.contentBounds || computeContentBounds(context.actualPaths) || bounds;
    const ink = computeInkCentroid(context.actualPaths);
    const center = ink && Number.isFinite(ink.x) && Number.isFinite(ink.y)
      ? new paper.Point(ink.x, ink.y)
      : (computeVisualCentroid(context.actualPaths) ?? cb.center);
    return { center, refRect: isUsableRect(cb) ? cb : bounds };
  }
  return { center: bounds.center, refRect: bounds };
}

/**
 * Flower of Life — 19 circles of EQUAL radius on a triangular lattice whose
 * spacing equals that radius (every neighbour passes through the centers of
 * its neighbours). In real-data mode it anchors on the ink center of mass,
 * sizes from the tight content box, and keeps only circles that touch the
 * vector.
 */
export function renderFlowerOfLife(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const r = Math.min(refRect.width, refRect.height) / 6;
  if (!(r >= 0.5) || !Number.isFinite(r)) return;

  // Triangular lattice (a = (1,0), b = (½, √3/2)) up to distance 2r:
  // 1 seed + 6 at distance r + 6 at r√3 + 6 at 2r = 19 circles.
  const offsets: Array<[number, number]> = [
    [0, 0],
    // first ring — 6 circles, centers exactly r away
    [1, 0], [-1, 0],
    [0.5, H3], [-0.5, H3],
    [0.5, -H3], [-0.5, -H3],
    // second ring — 6 at r√3 and 6 at 2r
    [1.5, H3], [-1.5, H3],
    [1.5, -H3], [-1.5, -H3],
    [0, 2 * H3], [0, -2 * H3],
    [2, 0], [-2, 0],
    [1, 2 * H3], [-1, 2 * H3],
    [1, -2 * H3], [-1, -2 * H3],
  ];

  for (let idx = 0; idx < offsets.length; idx++) {
    const [ox, oy] = offsets[idx];
    const c = new paper.Path.Circle(
      new paper.Point(center.x + ox * r, center.y + oy * r),
      r
    );
    // Central seed circle is always visible; outer 18 are filtered by intersection
    if (idx === 0) {
      c.strokeColor = color;
      c.strokeWidth = m.stroke(style.strokeWidth);
      c.fillColor = null;
    } else {
      showIfIntersects(c, context, () => {
        c.strokeColor = color;
        c.strokeWidth = m.stroke(style.strokeWidth);
        c.fillColor = null;
      });
    }
  }

  // Outer enclosing circle (decorative, dimmed) — also filtered
  const enclosing = new paper.Path.Circle(center, r * 3);
  showIfIntersects(enclosing, context, () => {
    enclosing.strokeColor = hexToColor(style.color, style.opacity * 0.5);
    enclosing.strokeWidth = m.stroke(style.strokeWidth);
    enclosing.fillColor = null;
    enclosing.dashArray = m.dash(4, 3);
  });
}

/**
 * Reuleaux Triangle — a true curve of constant width: three arcs whose radius
 * equals the side of the equilateral triangle and whose centers are the
 * OPPOSITE vertices, so the width is the same in every direction.
 */
export function renderReuleauxTriangle(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  // circumradius; the constant width is the side = r·√3
  const r = Math.min(refRect.width, refRect.height) / 2;
  if (!(r >= 1) || !Number.isFinite(r)) return;

  // Three vertices, top vertex pointing up
  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const verts = angles.map(
    (a) => new paper.Point(center.x + r * Math.cos(a), center.y + r * Math.sin(a))
  );

  // Each arc runs from one vertex to the next, centered on the third one, so
  // its radius is the triangle side and the width stays constant.
  for (let i = 0; i < 3; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % 3];
    const opposite = verts[(i + 2) % 3];
    const mid = new paper.Point((a.x + b.x) / 2, (a.y + b.y) / 2);
    const delta = mid.subtract(opposite);
    if (!(delta.length > 1e-9)) continue;
    const radius = a.getDistance(opposite);
    const through = opposite.add(delta.normalize().multiply(radius));
    const arc = new paper.Path.Arc(a, through, b);
    showIfIntersects(arc, context, () => {
      arc.strokeColor = color;
      arc.strokeWidth = m.stroke(style.strokeWidth);
      arc.fillColor = null;
    });
  }

  // Light construction triangle and vertex dots
  const tri = new paper.Path([verts[0], verts[1], verts[2]]);
  tri.closed = true;
  showIfIntersects(tri, context, () => {
    tri.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    tri.strokeWidth = m.stroke(style.strokeWidth * 0.6);
    tri.fillColor = null;
    tri.dashArray = m.dash(3, 3);
  });

  for (const v of verts) {
    const dot = new paper.Path.Circle(v, m.dot(2) + m.stroke(style.strokeWidth));
    dot.fillColor = color;
    dot.strokeColor = null;
  }

  const width = r * Math.sqrt(3);
  const label = new paper.PointText(new paper.Point(center.x, verts[0].y - m.len(6)));
  label.content = `width ${formatLength(width, context)}`;
  label.fillColor = hexToColor(style.color, style.opacity * 0.8);
  label.fontSize = m.font(8);
  label.justification = 'center';
}

/**
 * Hexagonal Grid — flat-top honeycomb: hexagons of radius r on a lattice of
 * 1.5r columns and √3·r rows, odd columns offset by half a row, so the cells
 * share edges with neither gaps nor overlaps.
 */
export function renderHexGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const r = hexGridRadius(refRect); // hexagon "radius" (center-to-vertex)
  if (!(r > 0.5) || !Number.isFinite(r)) return;

  const hexW = r * 2;
  const hexH = r * Math.sqrt(3);
  const colStep = hexW * 0.75;
  const rowStep = hexH;

  // Cover slightly beyond reference rect to ensure full tessellation
  const startX = refRect.left - hexW;
  const endX = refRect.right + hexW;
  const startY = refRect.top - hexH;
  const endY = refRect.bottom + hexH;

  // Anchor lattice on the ink center so a hex sits on the center line
  const phaseX = ((center.x - startX) % colStep + colStep) % colStep - colStep;

  let col = 0;
  let drawn = 0;
  for (let cx = startX + phaseX; cx <= endX; cx += colStep) {
    const yOffset = col % 2 === 0 ? 0 : rowStep / 2;
    for (let cy = startY + yOffset; cy <= endY; cy += rowStep) {
      if (++drawn > MAX_RENDER_ITEMS) return;
      const hex = new paper.Path.RegularPolygon(new paper.Point(cx, cy), 6, r);
      hex.rotate(30); // flat-top orientation
      // Cheap pre-filter: if hex bounds don't overlap content bounds, drop early
      if (
        context?.useRealData && context?.actualPaths && context.actualPaths.length > 0 &&
        !hex.bounds.intersects(refRect)
      ) {
        // (the old code also did `col++` here, inside the ROW loop, which
        // flipped the column parity and broke the honeycomb offsets)
        hex.remove();
        continue;
      }
      showIfIntersects(hex, context, () => {
        hex.strokeColor = color;
        hex.strokeWidth = m.stroke(style.strokeWidth);
        hex.fillColor = null;
      });
    }
    col++;
  }
}

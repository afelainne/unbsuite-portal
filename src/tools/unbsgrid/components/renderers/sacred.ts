import paper from 'paper';
import {
  hexToColor,
  showIfIntersects,
  computeContentBounds,
  computeVisualCentroid,
  type StyleConfig,
  type RenderContext,
} from './utils';

/** Resolve geometric anchor (centroid + reference rect) preferring real path data. */
function resolveAnchor(bounds: paper.Rectangle, context?: RenderContext): {
  center: paper.Point;
  refRect: paper.Rectangle;
} {
  if (context?.useRealData && context?.actualPaths && context.actualPaths.length > 0) {
    const cb = context.contentBounds || computeContentBounds(context.actualPaths) || bounds;
    const center = computeVisualCentroid(context.actualPaths);
    return { center, refRect: cb };
  }
  return { center: bounds.center, refRect: bounds };
}

/**
 * Flower of Life — 19 overlapping circles in a hexagonal lattice. In real-data
 * mode it anchors on the visual centroid of the SVG paths, sizes from the
 * tight content bounds, and only keeps circles that actually touch the vector.
 */
export function renderFlowerOfLife(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const r = Math.min(refRect.width, refRect.height) / 6;
  if (r < 0.5) return;

  // Triangular lattice offsets that produce the classic 19-circle Flower of Life
  const offsets: Array<[number, number]> = [
    [0, 0],
    // First ring (6)
    [1, 0], [-1, 0],
    [0.5, 0.8660254], [-0.5, 0.8660254],
    [0.5, -0.8660254], [-0.5, -0.8660254],
    // Second ring (12)
    [2, 0], [-2, 0],
    [1, 1.7320508], [-1, 1.7320508],
    [1, -1.7320508], [-1, -1.7320508],
    [1.5, 0.8660254], [-1.5, 0.8660254],
    [1.5, -0.8660254], [-1.5, -0.8660254],
    [0, 1.7320508], [0, -1.7320508],
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
      c.strokeWidth = style.strokeWidth;
      c.fillColor = null;
    } else {
      showIfIntersects(c, context, () => {
        c.strokeColor = color;
        c.strokeWidth = style.strokeWidth;
        c.fillColor = null;
      });
    }
  }

  // Outer enclosing circle (decorative, dimmed) — also filtered
  const enclosing = new paper.Path.Circle(center, r * 3);
  showIfIntersects(enclosing, context, () => {
    enclosing.strokeColor = hexToColor(style.color, style.opacity * 0.5);
    enclosing.strokeWidth = style.strokeWidth;
    enclosing.fillColor = null;
    enclosing.dashArray = [4, 3];
  });
}

/**
 * Reuleaux Triangle — curve of constant width built from three circular arcs
 * whose centers are the vertices of an equilateral triangle inscribed in the bounds.
 */
export function renderReuleauxTriangle(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const r = Math.min(refRect.width, refRect.height) / 2;
  if (r < 1) return;

  // Three vertices, top vertex pointing up
  const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
  const verts = angles.map(
    (a) => new paper.Point(center.x + r * Math.cos(a), center.y + r * Math.sin(a))
  );

  // Three arcs: each arc spans from one vertex to the next, curving away from
  // the third vertex (which is the arc's center). Use Path.Arc(from, through, to).
  for (let i = 0; i < 3; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % 3];
    const opposite = verts[(i + 2) % 3];
    const mid = new paper.Point((a.x + b.x) / 2, (a.y + b.y) / 2);
    const dir = mid.subtract(opposite).normalize();
    const radius = a.getDistance(opposite);
    const through = opposite.add(dir.multiply(radius));
    const arc = new paper.Path.Arc(a, through, b);
    showIfIntersects(arc, context, () => {
      arc.strokeColor = color;
      arc.strokeWidth = style.strokeWidth;
      arc.fillColor = null;
    });
  }

  // Light construction triangle and vertex dots
  const tri = new paper.Path([verts[0], verts[1], verts[2]]);
  tri.closed = true;
  showIfIntersects(tri, context, () => {
    tri.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    tri.strokeWidth = style.strokeWidth * 0.6;
    tri.fillColor = null;
    tri.dashArray = [3, 3];
  });

  for (const v of verts) {
    const dot = new paper.Path.Circle(v, Math.max(2, style.strokeWidth * 1.5));
    dot.fillColor = color;
    dot.strokeColor = null;
  }
}

/**
 * Hexagonal Grid — pure honeycomb tessellation covering the bounds.
 * Hexagons are flat-top, sized so ~8 fit across the width.
 */
export function renderHexGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const r = refRect.width / 16; // hexagon "radius" (center-to-vertex)
  if (r <= 0.5) return;

  const hexW = r * 2;
  const hexH = r * Math.sqrt(3);
  const colStep = hexW * 0.75;
  const rowStep = hexH;

  // Cover slightly beyond reference rect to ensure full tessellation
  const startX = refRect.left - hexW;
  const endX = refRect.right + hexW;
  const startY = refRect.top - hexH;
  const endY = refRect.bottom + hexH;

  // Anchor lattice on the visual centroid so a hex sits on the centroid line
  const phaseX = ((center.x - startX) % colStep + colStep) % colStep - colStep;

  let col = 0;
  for (let cx = startX + phaseX; cx <= endX; cx += colStep) {
    const yOffset = col % 2 === 0 ? 0 : rowStep / 2;
    for (let cy = startY + yOffset; cy <= endY; cy += rowStep) {
      const hex = new paper.Path.RegularPolygon(new paper.Point(cx, cy), 6, r);
      hex.rotate(30); // flat-top orientation
      // Cheap pre-filter: if hex bounds don't overlap content bounds, drop early
      if (
        context?.useRealData && context?.actualPaths && context.actualPaths.length > 0 &&
        !hex.bounds.intersects(refRect)
      ) {
        hex.remove();
        col++;
        continue;
      }
      showIfIntersects(hex, context, () => {
        hex.strokeColor = color;
        hex.strokeWidth = style.strokeWidth;
        hex.fillColor = null;
      });
    }
    col++;
  }
}

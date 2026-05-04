import paper from 'paper';
import { hexToColor, type StyleConfig, type RenderContext } from './utils';

/**
 * Flower of Life — 19 overlapping circles arranged in a hexagonal pattern,
 * centered on the bounds. Each circle radius = bounds.shortSide / 6.
 */
export function renderFlowerOfLife(
  bounds: paper.Rectangle,
  style: StyleConfig,
  _context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const center = bounds.center;
  const r = Math.min(bounds.width, bounds.height) / 6;

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

  for (const [ox, oy] of offsets) {
    const c = new paper.Path.Circle(
      new paper.Point(center.x + ox * r, center.y + oy * r),
      r
    );
    c.strokeColor = color;
    c.strokeWidth = style.strokeWidth;
    c.fillColor = null;
  }

  // Outer enclosing circle (decorative, dimmed)
  const enclosing = new paper.Path.Circle(center, r * 3);
  enclosing.strokeColor = hexToColor(style.color, style.opacity * 0.5);
  enclosing.strokeWidth = style.strokeWidth;
  enclosing.fillColor = null;
  enclosing.dashArray = [4, 3];
}

/**
 * Reuleaux Triangle — curve of constant width built from three circular arcs
 * whose centers are the vertices of an equilateral triangle inscribed in the bounds.
 */
export function renderReuleauxTriangle(
  bounds: paper.Rectangle,
  style: StyleConfig,
  _context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const center = bounds.center;
  const r = Math.min(bounds.width, bounds.height) / 2;

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
    // Through-point: midpoint of the arc — on the line from `opposite` through the
    // midpoint of segment a-b, at distance `radius` (= |a - opposite|) from `opposite`.
    const mid = new paper.Point((a.x + b.x) / 2, (a.y + b.y) / 2);
    const dir = mid.subtract(opposite).normalize();
    const radius = a.getDistance(opposite);
    const through = opposite.add(dir.multiply(radius));
    const arc = new paper.Path.Arc(a, through, b);
    arc.strokeColor = color;
    arc.strokeWidth = style.strokeWidth;
    arc.fillColor = null;
  }

  // Light construction triangle and vertex dots
  const tri = new paper.Path([verts[0], verts[1], verts[2]]);
  tri.closed = true;
  tri.strokeColor = hexToColor(style.color, style.opacity * 0.4);
  tri.strokeWidth = style.strokeWidth * 0.6;
  tri.fillColor = null;
  tri.dashArray = [3, 3];

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
  _context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const r = bounds.width / 16; // hexagon "radius" (center-to-vertex)
  if (r <= 0.5) return;

  const hexW = r * 2;
  const hexH = r * Math.sqrt(3);
  const colStep = hexW * 0.75;
  const rowStep = hexH;

  // Cover slightly beyond bounds to ensure full tessellation
  const startX = bounds.left - hexW;
  const endX = bounds.right + hexW;
  const startY = bounds.top - hexH;
  const endY = bounds.bottom + hexH;

  let col = 0;
  for (let cx = startX; cx <= endX; cx += colStep) {
    const yOffset = col % 2 === 0 ? 0 : rowStep / 2;
    for (let cy = startY + yOffset; cy <= endY; cy += rowStep) {
      const hex = new paper.Path.RegularPolygon(new paper.Point(cx, cy), 6, r);
      hex.rotate(30); // flat-top orientation
      hex.strokeColor = color;
      hex.strokeWidth = style.strokeWidth;
      hex.fillColor = null;
    }
    col++;
  }
}

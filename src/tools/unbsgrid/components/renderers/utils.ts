import paper from 'paper';

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
    const w = p.length || 1;
    cx += p.bounds.center.x * w;
    cy += p.bounds.center.y * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return paths[0].bounds.center;
  return new paper.Point(cx / totalWeight, cy / totalWeight);
}

export function hexToColor(hex: string, opacity: number): paper.Color {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new paper.Color(r, g, b, opacity);
}

/** Check if a Paper.js item intersects with any actual SVG path */
export function intersectsAnyPath(item: paper.PathItem, paths: paper.Path[]): boolean {
  for (const path of paths) {
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
  const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
  const code = (x: number, y: number) => {
    let c = INSIDE;
    if (x < xmin) c |= LEFT; else if (x > xmax) c |= RIGHT;
    if (y < ymin) c |= TOP; else if (y > ymax) c |= BOTTOM;
    return c;
  };
  let c1 = code(x1, y1), c2 = code(x2, y2);
  while (true) {
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
}

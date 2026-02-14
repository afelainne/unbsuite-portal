import paper from 'paper';

export interface SVGComponent {
  id: string;
  path: paper.Path | paper.CompoundPath;
  bounds: paper.Rectangle;
  isIcon: boolean;
}

export interface BezierSegmentData {
  anchor: { x: number; y: number };
  handleIn: { x: number; y: number };
  handleOut: { x: number; y: number };
  hasHandleIn: boolean;
  hasHandleOut: boolean;
}

export interface PathGeometry {
  allPaths: paper.Path[];
  allPoints: paper.Point[];
  extremePoints: {
    topLeft: paper.Point;
    topRight: paper.Point;
    bottomLeft: paper.Point;
    bottomRight: paper.Point;
    topMost: paper.Point;
    bottomMost: paper.Point;
    leftMost: paper.Point;
    rightMost: paper.Point;
  };
}

export interface ParsedSVG {
  components: SVGComponent[];
  fullBounds: paper.Rectangle;
  originalSVG: string;
  paperProject: paper.Project;
  segments: BezierSegmentData[];
  pathGeometry: PathGeometry;
}

export type ClearspaceUnit = 'logomark' | 'pixels' | 'centimeters' | 'inches';

const UNIT_TO_PX: Record<ClearspaceUnit, number> = {
  logomark: 1,
  pixels: 1,
  centimeters: 28.346,
  inches: 72,
};

export function convertToPixels(value: number, unit: ClearspaceUnit, logomarkSize: number): number {
  if (unit === 'logomark') {
    return value * logomarkSize;
  }
  return value * UNIT_TO_PX[unit];
}

/**
 * Collect all paths from a Paper.js item tree
 */
export function collectPaths(item: paper.Item): paper.Path[] {
  const paths: paper.Path[] = [];
  
  function walk(it: paper.Item) {
    if (it instanceof paper.Path) {
      paths.push(it);
    }
    if (it instanceof paper.CompoundPath && it.children) {
      for (const child of it.children) {
        if (child instanceof paper.Path) {
          paths.push(child);
        }
      }
    }
    if (it.children && !(it instanceof paper.CompoundPath)) {
      for (const child of it.children) {
        walk(child);
      }
    }
  }
  
  walk(item);
  return paths;
}

export function extractPathGeometry(item: paper.Item): PathGeometry {
  const allPaths = collectPaths(item);
  const allPoints: paper.Point[] = [];

  for (const path of allPaths) {
    if (path.segments) {
      for (const seg of path.segments) {
        allPoints.push(seg.point.clone());
      }
    }
  }

  // Find extreme points
  let topLeft = allPoints[0] || new paper.Point(0, 0);
  let topRight = allPoints[0] || new paper.Point(0, 0);
  let bottomLeft = allPoints[0] || new paper.Point(0, 0);
  let bottomRight = allPoints[0] || new paper.Point(0, 0);
  let topMost = allPoints[0] || new paper.Point(0, 0);
  let bottomMost = allPoints[0] || new paper.Point(0, 0);
  let leftMost = allPoints[0] || new paper.Point(0, 0);
  let rightMost = allPoints[0] || new paper.Point(0, 0);

  for (const pt of allPoints) {
    if (pt.x + pt.y < topLeft.x + topLeft.y) topLeft = pt;
    if (pt.x - pt.y > topRight.x - topRight.y) topRight = pt;
    if (pt.y - pt.x > bottomLeft.y - bottomLeft.x) bottomLeft = pt;
    if (pt.x + pt.y > bottomRight.x + bottomRight.y) bottomRight = pt;
    if (pt.y < topMost.y) topMost = pt;
    if (pt.y > bottomMost.y) bottomMost = pt;
    if (pt.x < leftMost.x) leftMost = pt;
    if (pt.x > rightMost.x) rightMost = pt;
  }

  return {
    allPaths,
    allPoints,
    extremePoints: {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
      topMost,
      bottomMost,
      leftMost,
      rightMost,
    },
  };
}

export function extractBezierHandles(item: paper.Item): BezierSegmentData[] {
  const results: BezierSegmentData[] = [];

  function walk(it: paper.Item) {
    if (it instanceof paper.Path && it.segments) {
      for (const seg of it.segments) {
        const anchor = seg.point;
        const hIn = seg.handleIn;
        const hOut = seg.handleOut;
        results.push({
          anchor: { x: anchor.x, y: anchor.y },
          handleIn: { x: anchor.x + hIn.x, y: anchor.y + hIn.y },
          handleOut: { x: anchor.x + hOut.x, y: anchor.y + hOut.y },
          hasHandleIn: hIn.length > 0.5,
          hasHandleOut: hOut.length > 0.5,
        });
      }
    }
    if (it instanceof paper.CompoundPath && it.children) {
      for (const child of it.children) {
        walk(child);
      }
    }
    if (it.children && !(it instanceof paper.CompoundPath)) {
      for (const child of it.children) {
        walk(child);
      }
    }
  }

  walk(item);
  return results;
}

export function parseSVG(svgString: string, canvas: HTMLCanvasElement): ParsedSVG {
  paper.setup(canvas);
  
  const item = paper.project.importSVG(svgString, { expandShapes: true });
  
  const components: SVGComponent[] = [];
  let idx = 0;
  
  function collectPaths(item: paper.Item) {
    if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
      if (item.bounds.width > 0 && item.bounds.height > 0) {
        components.push({
          id: `comp-${idx++}`,
          path: item,
          bounds: item.bounds,
          isIcon: false,
        });
      }
    }
    if (item.children) {
      for (const child of item.children) {
        collectPaths(child);
      }
    }
  }
  
  collectPaths(item);
  
  if (components.length > 1) {
    let bestIconIdx = 0;
    let bestRatio = Infinity;
    components.forEach((comp, i) => {
      const ratio = Math.abs(comp.bounds.width / comp.bounds.height - 1);
      if (ratio < bestRatio) {
        bestRatio = ratio;
        bestIconIdx = i;
      }
    });
    components[bestIconIdx].isIcon = true;
  } else if (components.length === 1) {
    components[0].isIcon = true;
  }
  
  const fullBounds = item.bounds;
  const segments = extractBezierHandles(item);
  const pathGeometry = extractPathGeometry(item);
  
  return {
    components,
    fullBounds,
    originalSVG: svgString,
    paperProject: paper.project,
    segments,
    pathGeometry,
  };
}

export function getLogomarkSize(components: SVGComponent[]): number {
  const icon = components.find(c => c.isIcon);
  if (!icon) return 50;
  return Math.min(icon.bounds.width, icon.bounds.height);
}

export function invertComponents(components: SVGComponent[]): SVGComponent[] {
  return components.map(c => ({ ...c, isIcon: !c.isIcon }));
}

export interface ClearspaceZones {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function computeClearspace(
  bounds: paper.Rectangle,
  value: number,
  unit: ClearspaceUnit,
  logomarkSize: number
): ClearspaceZones {
  const px = convertToPixels(value, unit, logomarkSize);
  return { top: px, bottom: px, left: px, right: px };
}

export function generateGridLines(
  bounds: paper.Rectangle,
  components: SVGComponent[],
  subdivisions: number = 8
): { horizontal: number[]; vertical: number[] } {
  const icon = components.find(c => c.isIcon);
  const ref = icon ? icon.bounds : bounds;
  
  const horizontal: number[] = [];
  const vertical: number[] = [];
  
  const stepX = ref.width / subdivisions;
  const stepY = ref.height / subdivisions;
  
  const startX = ref.left;
  const startY = ref.top;
  
  for (let x = startX; x <= bounds.right + stepX; x += stepX) {
    vertical.push(x);
  }
  for (let x = startX - stepX; x >= bounds.left - stepX; x -= stepX) {
    vertical.unshift(x);
  }
  for (let y = startY; y <= bounds.bottom + stepY; y += stepY) {
    horizontal.push(y);
  }
  for (let y = startY - stepY; y >= bounds.top - stepY; y -= stepY) {
    horizontal.unshift(y);
  }
  
  return { horizontal, vertical };
}

export function exportSVG(project: paper.Project): string {
  const svg = project.exportSVG({ asString: true }) as string;
  return svg;
}

/**
 * Check if a line intersects with any path in the geometry
 */
export function lineIntersectsPath(
  line: paper.Path,
  paths: paper.Path[],
  tolerance: number = 2
): boolean {
  for (const path of paths) {
    const intersections = line.getIntersections(path);
    if (intersections.length > 0) return true;
    
    // Also check if line is very close to any path point
    for (const seg of path.segments) {
      const distance = line.getNearestPoint(seg.point).getDistance(seg.point);
      if (distance < tolerance) return true;
    }
  }
  return false;
}

/**
 * Check if a point is close to any path
 */
export function pointNearPath(
  point: paper.Point,
  paths: paper.Path[],
  tolerance: number = 3
): boolean {
  for (const path of paths) {
    const nearest = path.getNearestPoint(point);
    if (nearest.getDistance(point) < tolerance) return true;
  }
  return false;
}

/**
 * Get all intersection points between paths and a line
 */
export function getPathLineIntersections(
  line: paper.Path,
  paths: paper.Path[]
): paper.Point[] {
  const points: paper.Point[] = [];
  for (const path of paths) {
    const intersections = line.getIntersections(path);
    for (const inter of intersections) {
      points.push(inter.point);
    }
  }
  return points;
}

/**
 * Check if a circle intersects with paths
 */
export function circleIntersectsPath(
  center: paper.Point,
  radius: number,
  paths: paper.Path[],
  tolerance: number = 2
): boolean {
  const circle = new paper.Path.Circle(center, radius);
  for (const path of paths) {
    const intersections = circle.getIntersections(path);
    if (intersections.length > 0) {
      circle.remove();
      return true;
    }
  }
  circle.remove();
  return false;
}


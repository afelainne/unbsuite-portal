import paper from 'paper';
import { sanitizeSVG, SvgParseError, type SanitizeOptions, type SvgArtboard } from './svg-sanitize';

export { SvgParseError, sanitizeSVG } from './svg-sanitize';
export type { SanitizeOptions, SanitizeResult, SvgArtboard, SvgParseErrorCode } from './svg-sanitize';

export interface SVGComponent {
  id: string;
  /** Live paper item from the parse project. Removed from its project on the next parseSVG call. */
  path: paper.Path | paper.CompoundPath;
  /** Plain (unlinked) copy of the item bounds. */
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
  /** Bounds of the drawn content (not the artboard). */
  fullBounds: paper.Rectangle;
  /**
   * SANITIZED + normalized SVG. This is what every consumer should import /
   * inject (PreviewCanvas, exports). Kept under this name for compatibility.
   */
  originalSVG: string;
  /** The raw string the user dropped (never inject this into the DOM). */
  sourceSVG?: string;
  /** Artboard from viewBox / width+height, if any. */
  artboard?: SvgArtboard | null;
  /** Non-fatal issues found while parsing (removed elements, empty file…). */
  warnings?: string[];
  paperProject: paper.Project;
  segments: BezierSegmentData[];
  pathGeometry: PathGeometry;
}

export type ClearspaceUnit = 'logomark' | 'pixels' | 'centimeters' | 'inches';

/**
 * SVG user units per unit. The tool treats 1 user unit as 1pt (Illustrator
 * convention, 72/in), so cm and in stay consistent with each other.
 */
const UNIT_TO_PX: Record<ClearspaceUnit, number> = {
  logomark: 1,
  pixels: 1,
  centimeters: 72 / 2.54,
  inches: 72,
};

const CLEARSPACE_UNITS = Object.keys(UNIT_TO_PX) as ClearspaceUnit[];

export function isClearspaceUnit(value: unknown): value is ClearspaceUnit {
  return typeof value === 'string' && (CLEARSPACE_UNITS as string[]).includes(value);
}

/**
 * Convert a clearspace value to canvas pixels.
 * @param logomarkSize logomark size ALREADY in canvas pixels
 * @param scale canvas px per SVG user unit (preview zoom). Absolute units
 *        (px/cm/in) must be multiplied by it, otherwise the clearspace does
 *        not follow the logo when zooming.
 */
export function convertToPixels(value: number, unit: ClearspaceUnit, logomarkSize: number, scale = 1): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (unit === 'logomark') {
    return Number.isFinite(logomarkSize) && logomarkSize > 0 ? value * logomarkSize : 0;
  }
  const factor = UNIT_TO_PX[unit] ?? 1;
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return value * factor * s;
}

function isRenderable(it: paper.Item): boolean {
  return it.visible !== false && !it.clipMask;
}

/**
 * Collect all drawable sub-paths from a Paper.js item tree
 * (compound paths are expanded into their children; clip masks and hidden
 * items are skipped).
 */
export function collectPaths(item: paper.Item | null | undefined): paper.Path[] {
  const paths: paper.Path[] = [];
  if (!item) return paths;

  function walk(it: paper.Item) {
    if (!isRenderable(it)) return;
    if (it instanceof paper.CompoundPath) {
      for (const child of it.children || []) {
        if (child instanceof paper.Path) paths.push(child);
      }
      return;
    }
    if (it instanceof paper.Path) {
      paths.push(it);
      return;
    }
    if (it.children) {
      for (const child of it.children) walk(child);
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

  const first = allPoints[0] || new paper.Point(0, 0);
  let topLeft = first, topRight = first, bottomLeft = first, bottomRight = first;
  let topMost = first, bottomMost = first, leftMost = first, rightMost = first;

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
    extremePoints: { topLeft, topRight, bottomLeft, bottomRight, topMost, bottomMost, leftMost, rightMost },
  };
}

/**
 * Handle threshold relative to the drawing size. The old absolute 0.5 unit
 * threshold hid every handle of small-viewBox icons (e.g. 24×24).
 */
export function handleThreshold(bounds: { width: number; height: number } | null | undefined): number {
  if (!bounds) return 1e-6;
  const diag = Math.hypot(bounds.width || 0, bounds.height || 0);
  return Number.isFinite(diag) && diag > 0 ? diag * 1e-4 : 1e-6;
}

export function extractBezierHandles(item: paper.Item): BezierSegmentData[] {
  const results: BezierSegmentData[] = [];
  const threshold = handleThreshold(item.bounds);

  for (const path of collectPaths(item)) {
    for (const seg of path.segments) {
      const anchor = seg.point;
      const hIn = seg.handleIn;
      const hOut = seg.handleOut;
      results.push({
        anchor: { x: anchor.x, y: anchor.y },
        handleIn: { x: anchor.x + hIn.x, y: anchor.y + hIn.y },
        handleOut: { x: anchor.x + hOut.x, y: anchor.y + hOut.y },
        hasHandleIn: hIn.length > threshold,
        hasHandleOut: hOut.length > threshold,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Paper scope management
// ---------------------------------------------------------------------------

let parseScope: paper.PaperScope | null = null;

/**
 * Prepare `scope` to draw on `canvas` WITHOUT leaking: reuses the existing
 * project/view when it already targets this canvas (clearing its content and
 * resizing), otherwise removes the old project (and its view + DOM listeners)
 * before calling setup. `paper.setup()` on every render creates a new Project
 * + View each time and never frees the previous ones.
 */
export function resetPaperProject(
  canvas: HTMLCanvasElement | null | undefined,
  scope: paper.PaperScope = paper,
  size?: { width: number; height: number },
): paper.Project {
  const project = scope.project as paper.Project | null;
  const view = project?.view as paper.View | undefined;
  const element = view?.element;
  if (project && (!canvas || element === canvas)) {
    scope.activate();
    project.clear();
    project.activate();
    if (size && view && size.width > 0 && size.height > 0) {
      view.viewSize = new scope.Size(size.width, size.height);
    }
    return project;
  }
  if (project) project.remove();
  if (canvas) scope.setup(canvas);
  else scope.setup(new scope.Size(Math.max(1, size?.width ?? 1), Math.max(1, size?.height ?? 1)));
  return scope.project;
}

/** Number of live projects in a scope (useful to assert there is no leak). */
export function countProjects(scope: paper.PaperScope = paper): number {
  return scope.projects.length;
}

/** Live projects held by parseSVG's private scope (should never exceed 1). */
export function getParseProjectCount(): number {
  return parseScope ? parseScope.projects.length : 0;
}

function iconScore(bounds: paper.Rectangle, maxArea: number): number {
  const ratio = bounds.width / bounds.height;
  const squareness = 1 / (1 + Math.abs(Math.log(ratio)));
  const areaWeight = maxArea > 0 ? Math.sqrt((bounds.width * bounds.height) / maxArea) : 0;
  return squareness * areaWeight;
}

/**
 * Pick the logomark among components: the most square shape, weighted by its
 * size (the old "most square wins" rule often picked the dot of an "i" or ®).
 */
export function pickIconIndex(boundsList: Array<{ width: number; height: number }>): number {
  if (!boundsList.length) return -1;
  const maxArea = Math.max(...boundsList.map(b => b.width * b.height));
  let best = 0;
  let bestScore = -Infinity;
  boundsList.forEach((b, i) => {
    const score = iconScore(b as paper.Rectangle, maxArea);
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

export interface ParseOptions {
  sanitize?: SanitizeOptions;
}

/**
 * Parse an SVG string into components + geometry.
 * The input is sanitized first (see `sanitizeSVG`). Uses a private PaperScope
 * that is reused between calls, so repeated uploads do not leak projects.
 * @throws SvgParseError for empty / invalid / oversized input.
 */
export function parseSVG(svgString: string, canvas?: HTMLCanvasElement | null, options: ParseOptions = {}): ParsedSVG {
  const sanitized = sanitizeSVG(svgString, options.sanitize);
  const warnings = [...sanitized.warnings];

  if (!parseScope) parseScope = new paper.PaperScope();
  const scope = parseScope;
  let item: paper.Item | null = null;
  let project: paper.Project;
  try {
    project = resetPaperProject(canvas ?? null, scope);
    item = project.importSVG(sanitized.svg, { expandShapes: true }) as paper.Item | null;
  } catch (err) {
    throw new SvgParseError('invalid-xml', `Could not import SVG: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    // Leave the default scope active for code that uses `new paper.Path()`.
    paper.activate();
  }
  if (!item) throw new SvgParseError('invalid-xml', 'SVG could not be imported.');

  const components: SVGComponent[] = [];
  let idx = 0;
  const walk = (it: paper.Item) => {
    if (!isRenderable(it)) return;
    if (it instanceof paper.Path || it instanceof paper.CompoundPath) {
      const b = it.bounds;
      if (b.width > 0 && b.height > 0 && Number.isFinite(b.width) && Number.isFinite(b.height)) {
        components.push({ id: `comp-${idx++}`, path: it, bounds: b.clone(), isIcon: false });
      }
      return; // never descend into a compound path's children (double counting)
    }
    for (const child of it.children || []) walk(child);
  };
  walk(item);

  const iconIdx = pickIconIndex(components.map(c => c.bounds));
  if (iconIdx >= 0) components[iconIdx].isIcon = true;

  const fullBounds = item.bounds.clone();
  if (!components.length) warnings.push('SVG has no drawable shapes (paths, rects, circles…).');

  return {
    components,
    fullBounds,
    originalSVG: sanitized.svg,
    sourceSVG: svgString,
    artboard: sanitized.artboard,
    warnings,
    paperProject: project,
    segments: extractBezierHandles(item),
    pathGeometry: extractPathGeometry(item),
  };
}

/** Union of the bounds of all components flagged as icon, or null. */
export function getIconBounds(components: SVGComponent[]): paper.Rectangle | null {
  let result: paper.Rectangle | null = null;
  for (const c of components) {
    if (!c.isIcon) continue;
    result = result ? result.unite(c.bounds) : new paper.Rectangle(c.bounds);
  }
  return result;
}

/**
 * Logomark size (min side of the icon). With several icon components (after
 * inversion) their union is used; with none, the whole drawing. Returns 0 when
 * there is nothing to measure (the old hard-coded 50 was arbitrary).
 */
export function getLogomarkSize(components: SVGComponent[]): number {
  let ref = getIconBounds(components);
  if (!ref) {
    for (const c of components) ref = ref ? ref.unite(c.bounds) : new paper.Rectangle(c.bounds);
  }
  if (!ref) return 0;
  const size = Math.min(ref.width, ref.height);
  return Number.isFinite(size) && size > 0 ? size : 0;
}

/**
 * Swap logomark <-> rest. A single component cannot be inverted (it would
 * leave no logomark at all), so it is returned unchanged.
 */
export function invertComponents(components: SVGComponent[]): SVGComponent[] {
  if (components.length < 2) return components.map(c => ({ ...c }));
  return components.map(c => ({ ...c, isIcon: !c.isIcon }));
}

export interface ClearspaceZones {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * @param logomarkSize logomark size in canvas px
 * @param scale canvas px per SVG unit (needed for pixels / cm / inches)
 */
export function computeClearspace(
  bounds: paper.Rectangle,
  value: number,
  unit: ClearspaceUnit,
  logomarkSize: number,
  scale = 1,
): ClearspaceZones {
  void bounds;
  const px = convertToPixels(value, unit, logomarkSize, scale);
  return { top: px, bottom: px, left: px, right: px };
}

export const MAX_GRID_SUBDIVISIONS = 256;
const MAX_GRID_LINES = 2000;

export function clampSubdivisions(value: number, fallback = 8): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(MAX_GRID_SUBDIVISIONS, Math.max(1, Math.round(value)));
}

/**
 * Grid lines aligned to the logomark and extended over the full bounds.
 * Guards against the infinite loops the old version had with a zero-size
 * reference or a negative subdivision count.
 */
export function generateGridLines(
  bounds: paper.Rectangle,
  components: SVGComponent[],
  subdivisions: number = 8
): { horizontal: number[]; vertical: number[] } {
  const ref = getIconBounds(components) ?? bounds;
  const subs = clampSubdivisions(subdivisions);

  const axis = (start: number, size: number, min: number, max: number): number[] => {
    const step = size / subs;
    if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(start)) return [];
    const out: number[] = [];
    const firstK = Math.floor((min - step - start) / step);
    const lastK = Math.ceil((max + step - start) / step);
    if (lastK - firstK > MAX_GRID_LINES) return [];
    for (let k = firstK; k <= lastK; k++) {
      const v = start + k * step;
      if (v >= min - step - 1e-9 && v <= max + step + 1e-9) out.push(v);
    }
    return out;
  };

  return {
    horizontal: axis(ref.top, ref.height, bounds.top, bounds.bottom),
    vertical: axis(ref.left, ref.width, bounds.left, bounds.right),
  };
}

export interface ExportSVGOptions {
  /** Crop the document to the drawn content instead of the current viewport (default true). */
  fitToContent?: boolean;
  /** Margin around the content in px when fitToContent (default 16). */
  margin?: number;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';

/** Ensure an exported SVG string has the required namespaces and XML header. */
export function finalizeSVGString(svg: string): string {
  let out = svg.trim().replace(/^<\?xml[^>]*>\s*/, '');
  const openEnd = out.indexOf('>');
  let open = out.slice(0, openEnd);
  if (!/\sxmlns=/.test(open)) open = open.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  if (/xlink:/.test(out) && !/\sxmlns:xlink=/.test(open)) open = open.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  out = open + out.slice(openEnd);
  return XML_HEADER + out;
}

export function exportSVG(project: paper.Project, options: ExportSVGOptions = {}): string {
  const fit = options.fitToContent !== false;
  let bounds: paper.Rectangle | 'view' = 'view';
  if (fit) {
    let content: paper.Rectangle | null = null;
    for (const layer of project.layers) {
      if (!layer.visible || !layer.children.length) continue;
      const b = layer.strokeBounds;
      if (b.width <= 0 && b.height <= 0) continue;
      content = content ? content.unite(b) : b.clone();
    }
    if (content) bounds = content.expand((options.margin ?? 16) * 2);
  }
  const svg = project.exportSVG({ asString: true, bounds }) as string;
  return finalizeSVGString(svg);
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
 * Check if a circle intersects with paths (the probe circle is never inserted).
 */
export function circleIntersectsPath(
  center: paper.Point,
  radius: number,
  paths: paper.Path[],
  tolerance: number = 2
): boolean {
  void tolerance;
  const circle = new paper.Path.Circle({ center, radius, insert: false });
  try {
    for (const path of paths) {
      if (circle.getIntersections(path).length > 0) return true;
    }
    return false;
  } finally {
    circle.remove();
  }
}

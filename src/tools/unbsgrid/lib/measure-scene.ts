/**
 * Bridge between the live paper scene and the pure maths in `measure.ts`.
 *
 * The preview draws the whole scene with `renderScene(..., { layered: true })`
 * while the measuring tool is on, so every construction lives in its own
 * `paper.Layer` named with `geometryLayerId(key)`. That is what makes it
 * possible to tell WHICH construction a guide under the pointer belongs to,
 * and to grey out the others.
 *
 * Everything here works in CANVAS space (the same pixels the pointer events
 * report); converting to svg units is the caller's job, via `CanvasTransform`.
 */
import paper from 'paper';
import { GEOMETRY_KEYS, geometryLayerId, type GeometryOptions } from '../types/geometry';
import {
  type MeasureBox,
  type MeasurePoint,
  type MeasureSegment,
  type SnapCandidate,
  dedupePoints,
  isFinitePoint,
  angleDegrees,
} from './measure';

/** Layers that renderScene creates which are not constructions. */
export const RESERVED_LAYER_IDS = new Set(['logo', 'clearspace', 'grid', 'visual-center']);

const LAYER_ID_TO_KEY = new Map<string, keyof GeometryOptions>(
  GEOMETRY_KEYS.map(key => [geometryLayerId(key), key] as const),
);

/** `"golden-ratio"` -> `"goldenRatio"`; `null` for the reserved layers. */
export function layerIdToGeometryKey(id: string | null | undefined): keyof GeometryOptions | null {
  if (!id) return null;
  return LAYER_ID_TO_KEY.get(id) ?? null;
}

function globalPoint(path: paper.Path, point: paper.Point): MeasurePoint {
  const matrix = path.globalMatrix as paper.Matrix | undefined;
  const p = matrix ? matrix.transform(point) : point;
  return { x: p.x, y: p.y };
}

function walkPaths(item: paper.Item | null | undefined, visit: (path: paper.Path) => boolean | void): boolean {
  if (!item || item.visible === false) return true;
  if (item instanceof paper.Path) return visit(item) !== false;
  const children = (item.children ?? []) as paper.Item[];
  for (const child of children) {
    if (!walkPaths(child, visit)) return false;
  }
  return true;
}

export interface SceneSnapTargets {
  /** Real path nodes of the artwork (canvas space). */
  nodes: MeasurePoint[];
  /** Straight construction lines, used for intersection snapping. */
  segments: MeasureSegment[];
  /** Centres and any other named single points. */
  extras: SnapCandidate[];
}

export interface CollectSnapTargetsOptions {
  /** Logo bounding box in canvas space (adds the centre candidate). */
  box?: MeasureBox | null;
  /** Optical / visual centre in canvas space, when the caller knows it. */
  visualCenter?: MeasurePoint | null;
  maxNodes?: number;
  maxSegments?: number;
  /** Merge nodes closer than this many px (default 0.75). */
  dedupeEpsilon?: number;
}

/**
 * Real nodes from the imported artwork plus the straight lines every enabled
 * construction drew. Both are read from the live paper items, never
 * re-derived from the source string, so what snaps is exactly what is on
 * screen.
 */
export function collectSnapTargets(
  project: paper.Project | null | undefined,
  logo: paper.Item | null | undefined,
  options: CollectSnapTargetsOptions = {},
): SceneSnapTargets {
  const maxNodes = options.maxNodes ?? 6000;
  const maxSegments = options.maxSegments ?? 400;
  const nodes: MeasurePoint[] = [];
  const segments: MeasureSegment[] = [];
  const extras: SnapCandidate[] = [];

  walkPaths(logo, path => {
    for (const segment of path.segments ?? []) {
      if (nodes.length >= maxNodes) return false;
      const p = globalPoint(path, segment.point);
      if (isFinitePoint(p)) nodes.push(p);
    }
    return true;
  });

  const layers = (project?.layers ?? []) as paper.Layer[];
  for (const layer of layers) {
    const id = layer.name ?? '';
    if (id === 'logo' || id === 'visual-center') continue;
    if (segments.length >= maxSegments) break;
    walkPaths(layer, path => {
      if (segments.length >= maxSegments) return false;
      const segs = path.segments ?? [];
      // Only polylines: a curved path has no single obvious intersection to
      // snap to, and testing its curves on every pointer move is too slow.
      if (segs.length < 2 || segs.length > 8) return true;
      if (segs.some(s => !s.handleIn.isZero() || !s.handleOut.isZero())) return true;
      const points = segs.map(s => globalPoint(path, s.point));
      const count = path.closed ? points.length : points.length - 1;
      for (let i = 0; i < count && segments.length < maxSegments; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (isFinitePoint(a) && isFinitePoint(b)) segments.push({ a, b });
      }
      return true;
    });
  }

  if (options.box) {
    const { x, y, width, height } = options.box;
    extras.push({ point: { x: x + width / 2, y: y + height / 2 }, kind: 'center', label: 'Centro do logo' });
  }
  if (isFinitePoint(options.visualCenter)) {
    extras.push({ point: options.visualCenter, kind: 'center', label: 'Centro óptico' });
  }

  return {
    nodes: dedupePoints(nodes, options.dedupeEpsilon ?? 0.75),
    segments,
    extras,
  };
}

/**
 * Which construction layer is under `point` (canvas space), or `null`.
 *
 * Limitation, worth knowing: paper only tells us the ITEM that was hit, and
 * renderScene does not tag items individually — the layer is the finest
 * granularity available. So a click reports the construction, not the
 * individual guide inside it. See the integration notes.
 */
export function hitTestConstruction(
  project: paper.Project | null | undefined,
  point: MeasurePoint,
  tolerance = 6,
): string | null {
  if (!project || !isFinitePoint(point)) return null;
  let hit: paper.HitResult | null = null;
  try {
    hit = project.hitTest(new paper.Point(point.x, point.y), {
      stroke: true,
      fill: true,
      segments: false,
      tolerance: Math.max(1, tolerance),
    }) as paper.HitResult | null;
  } catch {
    return null;
  }
  if (!hit?.item) return null;
  let node: paper.Item | null = hit.item;
  while (node && !(node instanceof paper.Layer)) node = node.parent as paper.Item | null;
  const id = node instanceof paper.Layer ? node.name ?? '' : '';
  if (!id || RESERVED_LAYER_IDS.has(id)) return null;
  return layerIdToGeometryKey(id) ? id : null;
}

export interface ConstructionSummary {
  /** Layer id, e.g. `"golden-ratio"`. */
  layerId: string;
  key: keyof GeometryOptions | null;
  /** Number of drawn items in the layer. */
  itemCount: number;
  /** Layer bounds in svg units. */
  box: MeasureBox | null;
  /** Longest straight guide in the layer, in svg units. */
  longest: { length: number; angleDeg: number } | null;
}

/**
 * The "valor medido" shown in the inspect card: how big the construction is
 * and, when it is made of straight guides, the longest one with its angle.
 * `scale` is canvas px per svg unit.
 */
export function describeConstructionLayer(
  project: paper.Project | null | undefined,
  layerId: string,
  scale: number,
  svgOrigin: MeasurePoint = { x: 0, y: 0 },
  canvasOrigin: MeasurePoint = { x: 0, y: 0 },
): ConstructionSummary {
  const summary: ConstructionSummary = {
    layerId,
    key: layerIdToGeometryKey(layerId),
    itemCount: 0,
    box: null,
    longest: null,
  };
  const layer = ((project?.layers ?? []) as paper.Layer[]).find(l => l.name === layerId);
  if (!layer || !Number.isFinite(scale) || scale <= 0) return summary;

  summary.itemCount = (layer.children ?? []).length;
  const bounds = layer.bounds;
  if (bounds && Number.isFinite(bounds.width) && Number.isFinite(bounds.height)) {
    summary.box = {
      x: svgOrigin.x + (bounds.left - canvasOrigin.x) / scale,
      y: svgOrigin.y + (bounds.top - canvasOrigin.y) / scale,
      width: bounds.width / scale,
      height: bounds.height / scale,
    };
  }

  let bestLength = 0;
  let bestAngle = 0;
  walkPaths(layer, path => {
    const segs = path.segments ?? [];
    if (segs.length !== 2) return true;
    if (segs.some(s => !s.handleIn.isZero() || !s.handleOut.isZero())) return true;
    const a = globalPoint(path, segs[0].point);
    const b = globalPoint(path, segs[1].point);
    const length = Math.hypot(b.x - a.x, b.y - a.y) / scale;
    if (Number.isFinite(length) && length > bestLength) {
      bestLength = length;
      bestAngle = angleDegrees(a, b);
    }
    return true;
  });
  if (bestLength > 0) summary.longest = { length: bestLength, angleDeg: bestAngle };
  return summary;
}

export interface InspectHighlightOptions {
  /** Colour the non-selected constructions are repainted with. */
  dimColor?: string;
  /** Opacity applied to the non-selected construction layers. */
  dimOpacity?: number;
}

/**
 * Grey out every construction except `selectedLayerId`. Applied right after
 * `renderScene`, so the next redraw starts from the original colours — no
 * state to undo.
 */
export function applyInspectHighlight(
  project: paper.Project | null | undefined,
  selectedLayerId: string | null,
  options: InspectHighlightOptions = {},
): void {
  if (!project || !selectedLayerId) return;
  const dimColor = new paper.Color(options.dimColor ?? '#9A9AA0');
  const dimOpacity = options.dimOpacity ?? 0.45;
  for (const layer of (project.layers ?? []) as paper.Layer[]) {
    const id = layer.name ?? '';
    if (!id || RESERVED_LAYER_IDS.has(id) || !layerIdToGeometryKey(id)) continue;
    if (id === selectedLayerId) {
      layer.opacity = 1;
      continue;
    }
    layer.opacity = dimOpacity;
    walkPaths(layer, path => {
      if (path.strokeColor) {
        const alpha = path.strokeColor.alpha;
        path.strokeColor = dimColor.clone();
        path.strokeColor.alpha = alpha;
      }
      if (path.fillColor) {
        const alpha = path.fillColor.alpha;
        path.fillColor = dimColor.clone();
        path.fillColor.alpha = alpha;
      }
      return true;
    });
  }
}

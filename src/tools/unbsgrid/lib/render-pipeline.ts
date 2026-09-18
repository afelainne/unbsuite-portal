/**
 * Shared scene renderer: logo + clearspace + grid + every enabled
 * construction. Mirrors PreviewCanvas.draw() (with its bugs fixed) so the
 * preview and the exports can use one code path. With `layered: true` each
 * construction goes into its own named paper Layer, exported as
 * `<g id="golden-ratio" data-name="Golden Ratio">`.
 */
import paper from 'paper';
import {
  computeClearspace, generateGridLines, getLogomarkSize, collectPaths,
  type ParsedSVG, type ClearspaceUnit, type SVGComponent,
} from './svg-engine';
import {
  GEOMETRY_KEYS, GEOMETRY_STYLE_DEFAULTS, geometryLayerId,
  type GeometryOptions, type GeometryStyle, type GeometryStyles,
} from '../types/geometry';
import { FALLBACK_STYLE } from './geometry-meta';
import {
  renderBoundingRects, renderCircles, renderCenterLines, renderDiagonals,
  renderGoldenRatio, renderTangentLines, renderGoldenSpiral, renderIsometricGrid,
  renderBezierHandles, renderTypographicProportions, renderThirdLines,
  renderSymmetryAxes, renderAngleMeasurements, renderSpacingGuides,
  renderRootRectangles, renderModularScale, renderAlignmentGuides, renderSafeZone,
  renderPixelGrid, renderOpticalCenter, renderContrastGuide,
  renderDynamicBaseline, renderFibonacciOverlay, renderKenBurnsSafe, renderComponentRatioLabels,
  renderVesicaPiscis, renderRuleOfOdds, renderVisualWeightMap, renderAnchoringPoints, renderHarmonicDivisions,
  renderParallelFlowLines, renderUnderlyingCircles, renderDominantDiagonals, renderCurvatureComb,
  renderSkeletonCenterline, renderConstructionGrid, renderPathDirectionArrows, renderTangentIntersections,
  renderAnchorPoints, renderFlowerOfLife, renderReuleauxTriangle, renderHexGrid,
  renderTriangularGrid, renderPolarGrid, renderConcentricSquares,
  renderInkHeightBands, renderSlantAngle, renderStrokeWeight, renderReductionTest, renderCornerRadii,
  renderWordBaselines, renderLetterHeights, renderLetterRhythm, renderLetterAxes,
  renderLetterStemWidth, renderOpticalEdges, renderCounterAreas, renderDensityCurve,
  renderSignatureRelation, renderXHeightGrid,
} from '../components/renderers';
import { computeContentBounds, sanitizeSubdivisions, type RenderContext } from '../components/renderers/utils';
import { createGuideMetrics } from '../components/renderers/scale';

export interface SceneSettings {
  clearspaceValue: number;
  clearspaceUnit: ClearspaceUnit;
  showGrid: boolean;
  gridSubdivisions: number;
  geometryOptions: GeometryOptions;
  geometryStyles: GeometryStyles;
  modularScaleRatio?: number;
  safeZoneMargin?: number;
  useRealDataInterpretation?: boolean;
  maxFlowLines?: number;
  anchorPointSize?: number;
  bezierHandleSize?: number;
  bezierShowAnchors?: boolean;
  bezierShowHandles?: boolean;
  svgColorOverride?: string | null;
  svgOutlineMode?: boolean;
  svgOutlineWidth?: number;
  svgOutlineDash?: number[];
  svgOutlineLineCap?: string;
  /**
   * Multiplier for every guide weight (stroke, dash, label, dot). 1 = the
   * weights tuned for a ~1000px logo diagonal; the pipeline scales them with
   * the rendered logo size, so exports keep the same look. See renderers/scale.
   */
  guideScale?: number;
}

export interface SceneViewport {
  width: number;
  height: number;
  padding?: number;
  zoom?: number;
  pan?: { x: number; y: number };
}

export interface SceneResult {
  logo: paper.Item | null;
  bounds: paper.Rectangle | null;
  /** canvas px per SVG unit */
  scale: number;
  /** Renderers that threw (previously swallowed silently). */
  errors: Array<{ key: string; message: string }>;
}

/** "goldenRatio" -> "Golden Ratio" */
export function geometryLayerLabel(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
}

/**
 * Fit scale for content of size (w, h) into the viewport. Never negative,
 * never infinite (the preview flipped the logo when the pane was narrower
 * than 2×padding, and divided by zero for flat logos).
 */
export function computeFitScale(contentW: number, contentH: number, viewport: SceneViewport): number {
  const pad = viewport.padding ?? 60;
  const availW = Math.max(1, viewport.width - pad * 2);
  const availH = Math.max(1, viewport.height - pad * 2);
  const zoom = Number.isFinite(viewport.zoom) && (viewport.zoom as number) > 0 ? (viewport.zoom as number) : 1;
  const sx = contentW > 0 ? availW / contentW : Infinity;
  const sy = contentH > 0 ? availH / contentH : Infinity;
  const s = Math.min(sx, sy);
  return (Number.isFinite(s) && s > 0 ? s : 1) * zoom;
}

/** Map component bounds from parse space into the scaled scene space. */
export function mapComponentBounds(
  components: SVGComponent[],
  fullBounds: { left: number; top: number; width: number; height: number },
  sceneBounds: paper.Rectangle,
): paper.Rectangle[] {
  const fw = fullBounds.width, fh = fullBounds.height;
  const kx = fw > 0 ? sceneBounds.width / fw : 0;
  const ky = fh > 0 ? sceneBounds.height / fh : 0;
  return components.map(c => new paper.Rectangle(
    sceneBounds.left + (c.bounds.left - fullBounds.left) * kx,
    sceneBounds.top + (c.bounds.top - fullBounds.top) * ky,
    c.bounds.width * kx,
    c.bounds.height * ky,
  ));
}

/** Color override + outline mode, as in the preview. */
export function applyLogoAppearance(item: paper.Item, settings: Pick<SceneSettings, 'svgColorOverride' | 'svgOutlineMode' | 'svgOutlineWidth' | 'svgOutlineDash' | 'svgOutlineLineCap'>): void {
  const override = settings.svgColorOverride ? new paper.Color(settings.svgColorOverride) : null;
  const walk = (it: paper.Item) => {
    if (it instanceof paper.Path || it instanceof paper.CompoundPath) {
      if (override) {
        if (it.fillColor) it.fillColor = override.clone();
        if (it.strokeColor) it.strokeColor = override.clone();
      }
      if (settings.svgOutlineMode) {
        const color = it.fillColor || it.strokeColor;
        if (color) it.strokeColor = color;
        it.fillColor = null;
        it.strokeWidth = settings.svgOutlineWidth ?? 1;
        if (settings.svgOutlineDash?.length) it.dashArray = settings.svgOutlineDash;
        it.strokeCap = settings.svgOutlineLineCap ?? 'butt';
      }
    }
    for (const c of it.children || []) walk(c);
  };
  walk(item);
}

type RendererInput = {
  bounds: paper.Rectangle;
  comps: paper.Rectangle[];
  parsed: ParsedSVG;
  ctx: RenderContext;
  settings: SceneSettings;
};

/**
 * Style of a construction. A preset written before a construction existed has
 * NO entry for it, and the registered default in `types/geometry.ts` fills
 * that hole so the guide draws in its intended colour instead of vanishing.
 * A present-but-malformed entry is left alone on purpose: it must still reach
 * the renderer and be reported in `SceneResult.errors`, not be papered over.
 */
const s = (i: RendererInput, k: keyof GeometryOptions): GeometryStyle => {
  const styles = i.settings.geometryStyles;
  const own = styles ? styles[k] : undefined;
  return own !== undefined ? own : (GEOMETRY_STYLE_DEFAULTS[k] ?? FALLBACK_STYLE);
};

/** Construction key -> renderer call. Order = GEOMETRY_KEYS (same as the preview). */
export const RENDERERS: Record<keyof GeometryOptions, (i: RendererInput) => void> = {
  boundingRects: i => renderBoundingRects(i.bounds, i.comps, s(i, 'boundingRects'), i.ctx),
  circles: i => renderCircles(i.comps, s(i, 'circles'), i.ctx),
  centerLines: i => renderCenterLines(i.bounds, i.comps, s(i, 'centerLines'), i.ctx),
  diagonals: i => renderDiagonals(i.bounds, i.comps, s(i, 'diagonals'), i.ctx),
  goldenRatio: i => renderGoldenRatio(i.bounds, s(i, 'goldenRatio'), i.ctx),
  tangentLines: i => renderTangentLines(i.bounds, i.comps, s(i, 'tangentLines'), i.ctx),
  goldenSpiral: i => renderGoldenSpiral(i.bounds, s(i, 'goldenSpiral'), i.ctx),
  isometricGrid: i => renderIsometricGrid(i.bounds, s(i, 'isometricGrid'), i.settings.gridSubdivisions, i.ctx),
  bezierHandles: i => renderBezierHandles(i.parsed.segments, i.parsed.fullBounds, i.bounds, s(i, 'bezierHandles'), i.ctx, {
    handleSize: i.settings.bezierHandleSize, showAnchors: i.settings.bezierShowAnchors, showHandles: i.settings.bezierShowHandles,
  }),
  typographicProportions: i => renderTypographicProportions(i.bounds, s(i, 'typographicProportions'), i.ctx),
  thirdLines: i => renderThirdLines(i.bounds, s(i, 'thirdLines'), i.ctx),
  symmetryAxes: i => renderSymmetryAxes(i.bounds, i.comps, s(i, 'symmetryAxes'), i.ctx),
  angleMeasurements: i => renderAngleMeasurements(i.bounds, i.comps, s(i, 'angleMeasurements'), i.ctx),
  spacingGuides: i => renderSpacingGuides(i.bounds, i.comps, s(i, 'spacingGuides'), i.ctx),
  rootRectangles: i => renderRootRectangles(i.bounds, s(i, 'rootRectangles'), i.ctx),
  modularScale: i => renderModularScale(i.bounds, s(i, 'modularScale'), i.settings.modularScaleRatio ?? 1.618, i.ctx),
  alignmentGuides: i => renderAlignmentGuides(i.bounds, i.comps, s(i, 'alignmentGuides'), i.ctx),
  safeZone: i => renderSafeZone(i.bounds, s(i, 'safeZone'), i.settings.safeZoneMargin ?? 0.1, i.ctx),
  pixelGrid: i => renderPixelGrid(i.bounds, s(i, 'pixelGrid'), i.settings.gridSubdivisions, i.ctx),
  opticalCenter: i => renderOpticalCenter(i.bounds, s(i, 'opticalCenter'), i.ctx),
  contrastGuide: i => renderContrastGuide(i.bounds, s(i, 'contrastGuide'), i.ctx),
  dynamicBaseline: i => renderDynamicBaseline(i.bounds, s(i, 'dynamicBaseline'), i.ctx),
  fibonacciOverlay: i => renderFibonacciOverlay(i.bounds, s(i, 'fibonacciOverlay'), i.ctx),
  kenBurnsSafe: i => renderKenBurnsSafe(i.bounds, s(i, 'kenBurnsSafe'), i.ctx),
  componentRatioLabels: i => renderComponentRatioLabels(i.bounds, i.comps, s(i, 'componentRatioLabels'), i.ctx),
  vesicaPiscis: i => renderVesicaPiscis(i.bounds, s(i, 'vesicaPiscis'), i.ctx),
  ruleOfOdds: i => renderRuleOfOdds(i.bounds, s(i, 'ruleOfOdds'), i.ctx),
  visualWeightMap: i => renderVisualWeightMap(i.bounds, i.comps, s(i, 'visualWeightMap'), i.ctx),
  anchoringPoints: i => renderAnchoringPoints(i.bounds, s(i, 'anchoringPoints'), i.ctx),
  harmonicDivisions: i => renderHarmonicDivisions(i.bounds, s(i, 'harmonicDivisions'), i.ctx),
  parallelFlowLines: i => renderParallelFlowLines(i.bounds, s(i, 'parallelFlowLines'), i.ctx, i.settings.maxFlowLines ?? 5),
  underlyingCircles: i => renderUnderlyingCircles(i.bounds, s(i, 'underlyingCircles'), i.ctx),
  dominantDiagonals: i => renderDominantDiagonals(i.bounds, s(i, 'dominantDiagonals'), i.ctx),
  curvatureComb: i => renderCurvatureComb(i.bounds, s(i, 'curvatureComb'), i.ctx),
  skeletonCenterline: i => renderSkeletonCenterline(i.bounds, s(i, 'skeletonCenterline'), i.ctx),
  constructionGrid: i => renderConstructionGrid(i.bounds, s(i, 'constructionGrid'), i.ctx),
  pathDirectionArrows: i => renderPathDirectionArrows(i.bounds, s(i, 'pathDirectionArrows'), i.ctx),
  tangentIntersections: i => renderTangentIntersections(i.bounds, s(i, 'tangentIntersections'), i.ctx),
  anchorPoints: i => renderAnchorPoints(i.bounds, s(i, 'anchorPoints'), i.ctx, i.settings.anchorPointSize ?? 3),
  flowerOfLife: i => renderFlowerOfLife(i.bounds, s(i, 'flowerOfLife'), i.ctx),
  reuleauxTriangle: i => renderReuleauxTriangle(i.bounds, s(i, 'reuleauxTriangle'), i.ctx),
  hexGrid: i => renderHexGrid(i.bounds, s(i, 'hexGrid'), i.ctx),
  triangularGrid: i => renderTriangularGrid(i.bounds, s(i, 'triangularGrid'), i.ctx),
  polarGrid: i => renderPolarGrid(i.bounds, s(i, 'polarGrid'), i.ctx),
  concentricSquares: i => renderConcentricSquares(i.bounds, s(i, 'concentricSquares'), i.ctx),
  inkHeightBands: i => renderInkHeightBands(i.bounds, s(i, 'inkHeightBands'), i.ctx),
  slantAngle: i => renderSlantAngle(i.bounds, s(i, 'slantAngle'), i.ctx),
  strokeWeight: i => renderStrokeWeight(i.bounds, s(i, 'strokeWeight'), i.ctx),
  reductionTest: i => renderReductionTest(i.bounds, s(i, 'reductionTest'), i.ctx),
  cornerRadii: i => renderCornerRadii(i.bounds, s(i, 'cornerRadii'), i.ctx),
  wordBaselines: i => renderWordBaselines(i.bounds, s(i, 'wordBaselines'), i.ctx),
  letterHeights: i => renderLetterHeights(i.bounds, s(i, 'letterHeights'), i.ctx),
  letterRhythm: i => renderLetterRhythm(i.bounds, s(i, 'letterRhythm'), i.ctx),
  letterAxes: i => renderLetterAxes(i.bounds, s(i, 'letterAxes'), i.ctx),
  letterStemWidth: i => renderLetterStemWidth(i.bounds, s(i, 'letterStemWidth'), i.ctx),
  opticalEdges: i => renderOpticalEdges(i.bounds, s(i, 'opticalEdges'), i.ctx),
  counterAreas: i => renderCounterAreas(i.bounds, s(i, 'counterAreas'), i.ctx),
  densityCurve: i => renderDensityCurve(i.bounds, s(i, 'densityCurve'), i.ctx),
  // The only construction that needs to know which component is the logomark
  // (that flag is what the canvas "invert symbol" control edits).
  signatureRelation: i => renderSignatureRelation(
    i.bounds, i.comps, i.parsed.components.map(c => !!c.isIcon), s(i, 'signatureRelation'), i.ctx,
  ),
  xHeightGrid: i => renderXHeightGrid(i.bounds, s(i, 'xHeightGrid'), i.ctx),
};

/** Human labels of export layers (not in item.data: paper exports that as data-paper-data). */
const layerLabels = new WeakMap<paper.Item, string>();

function beginLayer(layered: boolean, id: string, label: string): paper.Layer | null {
  if (!layered) return null;
  const layer = new paper.Layer();
  layer.name = id;
  layerLabels.set(layer, label);
  layer.activate();
  return layer;
}

/**
 * Draw the whole scene into `scope.project` (call `resetPaperProject`
 * first). The scope is activated so renderers (`new paper.Path()`) insert
 * into the right project. Returns scene info and renderer errors.
 */
export function renderScene(
  parsed: ParsedSVG,
  settings: SceneSettings,
  viewport: SceneViewport,
  options: { layered?: boolean; scope?: paper.PaperScope } = {},
): SceneResult {
  const layered = !!options.layered;
  const scope = options.scope ?? paper;
  scope.activate();
  const project = scope.project;
  const errors: SceneResult['errors'] = [];
  const baseLayer = layered ? null : project.activeLayer;

  const logoLayer = beginLayer(layered, 'logo', 'Logo');
  const item = project.importSVG(parsed.originalSVG, { expandShapes: true }) as paper.Item | null;
  if (!item) return { logo: null, bounds: null, scale: 1, errors: [{ key: 'logo', message: 'SVG import failed' }] };
  if (logoLayer && item.parent !== logoLayer) logoLayer.addChild(item);
  applyLogoAppearance(item, settings);

  const natural = item.bounds;
  const scale = computeFitScale(natural.width, natural.height, viewport);
  item.scale(scale);
  item.position = new paper.Point(viewport.width / 2 + (viewport.pan?.x ?? 0), viewport.height / 2 + (viewport.pan?.y ?? 0));

  const bounds = item.bounds.clone();
  const components = parsed.components;
  const logomarkSize = getLogomarkSize(components) * scale;
  const actualPaths = collectPaths(item);
  const comps = mapComponentBounds(components, parsed.fullBounds, bounds);
  const useReal = settings.useRealDataInterpretation ?? true;
  // Guide weights follow the rendered logo size, so the preview and a large
  // export look the same instead of turning into hairlines or slabs.
  const metrics = createGuideMetrics(bounds, { guideScale: settings.guideScale });
  const ctx: RenderContext = {
    actualPaths,
    useRealData: useReal,
    contentBounds: useReal && actualPaths.length > 0 ? computeContentBounds(actualPaths) ?? undefined : undefined,
    unitsPerPixel: scale > 0 ? 1 / scale : undefined,
    metrics,
  };

  if (settings.clearspaceValue > 0) {
    beginLayer(layered, 'clearspace', 'Clearspace');
    const zones = computeClearspace(bounds, settings.clearspaceValue, settings.clearspaceUnit, logomarkSize, scale);
    if (zones.top > 0) {
      const csColor = new paper.Color(0.37, 0.67, 0.97, 0.08);
      const borderColor = new paper.Color(0.37, 0.67, 0.97, 0.4);
      const rects = [
        [bounds.left - zones.left, bounds.top - zones.top, bounds.right + zones.right, bounds.top],
        [bounds.left - zones.left, bounds.bottom, bounds.right + zones.right, bounds.bottom + zones.bottom],
        [bounds.left - zones.left, bounds.top, bounds.left, bounds.bottom],
        [bounds.right, bounds.top, bounds.right + zones.right, bounds.bottom],
      ];
      rects.forEach(([x1, y1, x2, y2]) => {
        const r = new paper.Path.Rectangle(new paper.Point(x1, y1), new paper.Point(x2, y2));
        r.fillColor = csColor; r.strokeColor = null;
      });
      const outerRect = new paper.Path.Rectangle(
        new paper.Point(bounds.left - zones.left, bounds.top - zones.top),
        new paper.Point(bounds.right + zones.right, bounds.bottom + zones.bottom),
      );
      outerRect.strokeColor = borderColor; outerRect.strokeWidth = metrics.stroke(1);
      outerRect.dashArray = metrics.dash(6, 4); outerRect.fillColor = null;
      if (zones.top > metrics.len(15)) {
        const size = metrics.font(11);
        const xText = new paper.PointText(new paper.Point(bounds.center.x, bounds.top - zones.top / 2 + size * 0.36));
        xText.content = 'X'; xText.fillColor = new paper.Color(0.95, 0.55, 0.2, 0.8);
        xText.fontSize = size; xText.fontWeight = 'bold'; xText.justification = 'center';
      }
    }
  }

  if (settings.showGrid) {
    beginLayer(layered, 'grid', 'Grid');
    const scaledComponents = components.map((c, i) => ({ ...c, bounds: comps[i] }));
    const grid = generateGridLines(bounds, scaledComponents, sanitizeSubdivisions(settings.gridSubdivisions));
    const gridColor = new paper.Color(0.37, 0.67, 0.97, 0.25);
    const overshoot = metrics.len(50);
    const margin = metrics.len(200);
    grid.vertical.forEach(x => {
      if (x >= bounds.left - margin && x <= bounds.right + margin) {
        const line = new paper.Path.Line(new paper.Point(x, bounds.top - overshoot), new paper.Point(x, bounds.bottom + overshoot));
        line.strokeColor = gridColor; line.strokeWidth = metrics.stroke(0.5);
      }
    });
    grid.horizontal.forEach(y => {
      if (y >= bounds.top - margin && y <= bounds.bottom + margin) {
        const line = new paper.Path.Line(new paper.Point(bounds.left - overshoot, y), new paper.Point(bounds.right + overshoot, y));
        line.strokeColor = gridColor; line.strokeWidth = metrics.stroke(0.5);
      }
    });
  }

  const input: RendererInput = { bounds, comps, parsed, ctx, settings };
  for (const key of GEOMETRY_KEYS) {
    if (!settings.geometryOptions[key]) continue;
    const layer = beginLayer(layered, geometryLayerId(key), geometryLayerLabel(key));
    if (baseLayer) baseLayer.activate();
    try {
      RENDERERS[key](input);
    } catch (err) {
      errors.push({ key, message: err instanceof Error ? err.message : String(err) });
    }
    if (layer && !layer.children.length) layer.remove();
  }

  if (layered) {
    for (const layer of [...project.layers]) {
      if (!layer.children.length && project.layers.length > 1) layer.remove();
    }
  }
  return { logo: item, bounds, scale, errors };
}

/** Add `data-name` (Illustrator/Figma layer label) to the exported layer groups. */
export function labelExportedLayers(svg: string, project: paper.Project): string {
  let out = svg;
  for (const layer of project.layers) {
    const id = layer.name;
    const label = layerLabels.get(layer);
    if (!id || !label) continue;
    const safeId = id.replace(/[^\w-]/g, '');
    const safeLabel = label.replace(/[<>&"]/g, '');
    // paper writes `<g … id="x" …>`: move id first and add data-name once
    const re = new RegExp(`<g((?:\\s(?!id=)[\\w:-]+="[^"]*")*)\\sid="${safeId}"`);
    out = out.replace(re, (match, before: string) =>
      /data-name=/.test(match) ? match : `<g id="${safeId}" data-name="${safeLabel}"${before}`);
  }
  return out;
}

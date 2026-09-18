/**
 * The construction set the preset defaults were written for. Every key here
 * is required in a preset, so `preset-engine`'s `allOff` / `defaultStyles`
 * literals must list all of them.
 */
export interface GeometryOptionsBase {
  boundingRects: boolean;
  circles: boolean;
  diagonals: boolean;
  goldenRatio: boolean;
  centerLines: boolean;
  tangentLines: boolean;
  goldenSpiral: boolean;
  isometricGrid: boolean;
  bezierHandles: boolean;
  typographicProportions: boolean;
  thirdLines: boolean;
  symmetryAxes: boolean;
  angleMeasurements: boolean;
  spacingGuides: boolean;
  rootRectangles: boolean;
  modularScale: boolean;
  alignmentGuides: boolean;
  safeZone: boolean;
  pixelGrid: boolean;
  opticalCenter: boolean;
  contrastGuide: boolean;
  dynamicBaseline: boolean;
  fibonacciOverlay: boolean;
  kenBurnsSafe: boolean;
  componentRatioLabels: boolean;
  // Batch 3
  vesicaPiscis: boolean;
  ruleOfOdds: boolean;
  visualWeightMap: boolean;
  anchoringPoints: boolean;
  harmonicDivisions: boolean;
  // Advanced SVG Analysis
  parallelFlowLines: boolean;
  underlyingCircles: boolean;
  dominantDiagonals: boolean;
  curvatureComb: boolean;
  skeletonCenterline: boolean;
  constructionGrid: boolean;
  pathDirectionArrows: boolean;
  tangentIntersections: boolean;
  anchorPoints: boolean;
  // Sacred Geometry
  flowerOfLife: boolean;
  reuleauxTriangle: boolean;
  hexGrid: boolean;
  // Geometric Construction
  triangularGrid: boolean;
  polarGrid: boolean;
  concentricSquares: boolean;
  // Brand analysis (measured from the real vector data)
  inkHeightBands: boolean;
  slantAngle: boolean;
  strokeWeight: boolean;
  reductionTest: boolean;
  cornerRadii: boolean;
}

/**
 * Constructions added after the preset defaults were written (wordmark /
 * signature analysis). They are OPTIONAL on purpose: a preset saved before
 * they existed — including `preset-engine`'s own `allOff` and `defaultStyles`
 * literals — stays valid without listing them, and the render pipeline fills
 * the missing style from `GEOMETRY_STYLE_DEFAULTS`.
 *
 * Once `preset-engine.ts` lists them, they can be folded into
 * `GeometryOptionsBase` and this split disappears.
 */
export interface GeometryOptionsExtra {
  /** Top line and baseline of each word in a wordmark. */
  wordBaselines: boolean;
  /** Cap / x / ascender / descender height of EACH letter, not just the set. */
  letterHeights: boolean;
  /** Width of every inter-letter gap, with the tightest and the loosest called out. */
  letterRhythm: boolean;
  /** Fitted vertical axis of each letter (inconsistent slant). */
  letterAxes: boolean;
  /** Median stem width per letter, thinnest vs thickest. */
  letterStemWidth: boolean;
  /** Optical edges of the ink against the geometric bounding box. */
  opticalEdges: boolean;
  /** Enclosed counter of each letter, with the smallest one called out. */
  counterAreas: boolean;
  /** Symbol vs text in a signature: height ratio, alignment and the gap. */
  signatureRelation: boolean;
  /** Construction grid of the signature, in multiples of the measured x-height. */
  xHeightGrid: boolean;
  /** Horizontal ink-density curve: where the drawing weighs the most. */
  densityCurve: boolean;
}

export interface GeometryOptions extends GeometryOptionsBase, Partial<GeometryOptionsExtra> {}

export interface GeometryStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
}

export type GeometryStyles =
  Record<keyof GeometryOptionsBase, GeometryStyle>
  & Partial<Record<keyof GeometryOptionsExtra, GeometryStyle>>;

/**
 * Default look of the constructions that the preset defaults do not carry yet
 * (see `GeometryOptionsExtra`). The render pipeline reads this whenever
 * `geometryStyles[key]` is missing, so a brand new construction draws with
 * its intended colour instead of a grey placeholder.
 */
export const GEOMETRY_STYLE_DEFAULTS: Readonly<Partial<Record<keyof GeometryOptions, GeometryStyle>>> = Object.freeze({
  wordBaselines:     Object.freeze({ color: '#4ecdc4', opacity: 0.65, strokeWidth: 1 }),
  letterHeights:     Object.freeze({ color: '#5eaaf7', opacity: 0.6, strokeWidth: 1 }),
  letterRhythm:      Object.freeze({ color: '#f7b267', opacity: 0.6, strokeWidth: 1 }),
  letterAxes:        Object.freeze({ color: '#ff8fab', opacity: 0.6, strokeWidth: 1 }),
  letterStemWidth:   Object.freeze({ color: '#ff6b6b', opacity: 0.65, strokeWidth: 1 }),
  opticalEdges:      Object.freeze({ color: '#9ad1f5', opacity: 0.7, strokeWidth: 1 }),
  counterAreas:      Object.freeze({ color: '#c792ea', opacity: 0.6, strokeWidth: 1 }),
  signatureRelation: Object.freeze({ color: '#88ddaa', opacity: 0.7, strokeWidth: 1 }),
  xHeightGrid:       Object.freeze({ color: '#7799dd', opacity: 0.4, strokeWidth: 0.6 }),
  densityCurve:      Object.freeze({ color: '#e6a833', opacity: 0.6, strokeWidth: 1 }),
});

export type CanvasBackground = "dark" | "light" | "checkerboard";

/** Every construction key, in render order (single source of truth). */
export const GEOMETRY_KEYS = [
  "boundingRects", "circles", "centerLines", "diagonals", "goldenRatio", "tangentLines",
  "goldenSpiral", "isometricGrid", "bezierHandles", "typographicProportions", "thirdLines",
  "symmetryAxes", "angleMeasurements", "spacingGuides", "rootRectangles", "modularScale",
  "alignmentGuides", "safeZone", "pixelGrid", "opticalCenter", "contrastGuide",
  "dynamicBaseline", "fibonacciOverlay", "kenBurnsSafe", "componentRatioLabels",
  "vesicaPiscis", "ruleOfOdds", "visualWeightMap", "anchoringPoints", "harmonicDivisions",
  "parallelFlowLines", "underlyingCircles", "dominantDiagonals", "curvatureComb",
  "skeletonCenterline", "constructionGrid", "pathDirectionArrows", "tangentIntersections",
  "anchorPoints", "flowerOfLife", "reuleauxTriangle", "hexGrid",
  "triangularGrid", "polarGrid", "concentricSquares",
  "inkHeightBands", "slantAngle", "strokeWeight", "reductionTest", "cornerRadii",
  // Wordmark / signature analysis (see GeometryOptionsExtra)
  "wordBaselines", "letterHeights", "letterRhythm", "letterAxes", "letterStemWidth",
  "opticalEdges", "counterAreas", "densityCurve", "signatureRelation", "xHeightGrid",
] as const satisfies ReadonlyArray<keyof GeometryOptions>;

export type GeometryKey = (typeof GEOMETRY_KEYS)[number];

/** camelCase key -> kebab-case layer id used in exported SVG (`<g id="golden-ratio">`). */
export function geometryLayerId(key: keyof GeometryOptions): string {
  return String(key).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

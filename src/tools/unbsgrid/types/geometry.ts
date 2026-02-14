export interface GeometryOptions {
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
}

export interface GeometryStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
}

export type GeometryStyles = Record<keyof GeometryOptions, GeometryStyle>;

export type CanvasBackground = "dark" | "light" | "checkerboard";

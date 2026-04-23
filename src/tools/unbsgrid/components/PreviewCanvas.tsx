import React, { useRef, useEffect, useCallback, useState } from 'react';
import paper from 'paper';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Move } from 'lucide-react';
import { type ParsedSVG, type ClearspaceUnit, computeClearspace, getLogomarkSize, generateGridLines, collectPaths } from '../lib/svg-engine';
import type { GeometryOptions, GeometryStyles, CanvasBackground } from '../types/geometry';
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
  renderAnchorPoints,
} from './renderers';
import { Button } from './ui/button';

interface PreviewCanvasProps {
  parsedSVG: ParsedSVG | null;
  clearspaceValue: number;
  clearspaceUnit: ClearspaceUnit;
  showGrid: boolean;
  gridSubdivisions: number;
  geometryOptions: GeometryOptions;
  geometryStyles: GeometryStyles;
  canvasBackground: CanvasBackground;
  modularScaleRatio?: number;
  safeZoneMargin?: number;
  svgColorOverride?: string | null;
  useRealDataInterpretation?: boolean;
  svgOutlineMode?: boolean;
  svgOutlineWidth?: number;
  svgOutlineDash?: number[];
  svgOutlineLineCap?: string;
  maxFlowLines?: number;
  anchorPointSize?: number;
  onProjectReady?: (project: paper.Project) => void;
}

const CANVAS_PADDING = 60;

const bgClasses: Record<CanvasBackground, string> = {
  dark: 'bg-canvas',
  light: 'bg-card',
  checkerboard: '',
};

const TOOLBAR_THEME = {
  bg: 'hsl(var(--card))',
  text: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
};

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  parsedSVG, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions,
  geometryOptions, geometryStyles, canvasBackground, modularScaleRatio = 1.618,
  safeZoneMargin = 0.1, svgColorOverride, useRealDataInterpretation = true,
  svgOutlineMode = false, svgOutlineWidth = 1, svgOutlineDash = [], svgOutlineLineCap = 'butt',
  maxFlowLines = 5, anchorPointSize = 3, onProjectReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    if (!canvasRef.current || !parsedSVG) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    paper.setup(canvas);

    const item = paper.project.importSVG(parsedSVG.originalSVG, { expandShapes: true });

    if (svgColorOverride) {
      const overrideColor = new paper.Color(svgColorOverride);
      const applyColor = (item: paper.Item) => {
        if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
          if ((item as any).fillColor) (item as any).fillColor = overrideColor;
          if ((item as any).strokeColor) (item as any).strokeColor = overrideColor;
        }
        if ((item as any).children) {
          (item as any).children.forEach((child: paper.Item) => applyColor(child));
        }
      };
      applyColor(item);
    }

    if (svgOutlineMode) {
      const applyOutline = (it: paper.Item) => {
        if (it instanceof paper.Path || it instanceof paper.CompoundPath) {
          const pathItem = it as any;
          const color = pathItem.fillColor || pathItem.strokeColor;
          if (color) pathItem.strokeColor = color;
          pathItem.fillColor = null;
          pathItem.strokeWidth = svgOutlineWidth;
          if (svgOutlineDash.length > 0) pathItem.dashArray = svgOutlineDash;
          pathItem.strokeCap = svgOutlineLineCap;
        }
        if ((it as any).children) {
          (it as any).children.forEach((child: paper.Item) => applyOutline(child));
        }
      };
      applyOutline(item);
    }

    const availW = canvas.width - CANVAS_PADDING * 2;
    const availH = canvas.height - CANVAS_PADDING * 2;
    const scale = Math.min(availW / item.bounds.width, availH / item.bounds.height) * zoom;

    item.scale(scale);
    item.position = new paper.Point(canvas.width / 2 + panOffset.x, canvas.height / 2 + panOffset.y);

    const bounds = item.bounds;
    const components = parsedSVG.components;
    const logomarkSize = getLogomarkSize(components) * scale;
    const actualPaths = collectPaths(item);

    const scaledCompBounds = components.map(c => new paper.Rectangle(
      bounds.left + (c.bounds.left - parsedSVG.fullBounds.left) / parsedSVG.fullBounds.width * bounds.width,
      bounds.top + (c.bounds.top - parsedSVG.fullBounds.top) / parsedSVG.fullBounds.height * bounds.height,
      c.bounds.width / parsedSVG.fullBounds.width * bounds.width,
      c.bounds.height / parsedSVG.fullBounds.height * bounds.height,
    ));

    if (clearspaceValue > 0) {
      const zones = computeClearspace(bounds, clearspaceValue, clearspaceUnit, logomarkSize);
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
        new paper.Point(bounds.right + zones.right, bounds.bottom + zones.bottom)
      );
      outerRect.strokeColor = borderColor; outerRect.strokeWidth = 1;
      outerRect.dashArray = [6, 4]; outerRect.fillColor = null;
      if (zones.top > 15) {
        const xText = new paper.PointText(new paper.Point(bounds.center.x, bounds.top - zones.top / 2 + 4));
        xText.content = 'X'; xText.fillColor = new paper.Color(0.95, 0.55, 0.2, 0.8);
        xText.fontSize = 11; xText.fontWeight = 'bold'; xText.justification = 'center';
      }
    }

    if (showGrid) {
      const scaledComponents = components.map((c, i) => ({ ...c, bounds: scaledCompBounds[i] }));
      const gridData = generateGridLines(bounds, scaledComponents as any, gridSubdivisions);
      const gridColor = new paper.Color(0.37, 0.67, 0.97, 0.25);
      gridData.vertical.forEach(x => {
        if (x >= bounds.left - 200 && x <= bounds.right + 200) {
          const line = new paper.Path.Line(new paper.Point(x, bounds.top - 50), new paper.Point(x, bounds.bottom + 50));
          line.strokeColor = gridColor; line.strokeWidth = 0.5;
        }
      });
      gridData.horizontal.forEach(y => {
        if (y >= bounds.top - 200 && y <= bounds.bottom + 200) {
          const line = new paper.Path.Line(new paper.Point(bounds.left - 50, y), new paper.Point(bounds.right + 50, y));
          line.strokeColor = gridColor; line.strokeWidth = 0.5;
        }
      });
    }

    const s = geometryStyles;
    const renderContext = { actualPaths, useRealData: useRealDataInterpretation, contentBounds: useRealDataInterpretation && actualPaths.length > 0 ? (() => { let b = actualPaths[0].bounds.clone(); for (let i = 1; i < actualPaths.length; i++) b = b.unite(actualPaths[i].bounds); return b; })() : undefined };
    const safe = (fn: () => void) => { try { fn(); } catch { /* skip broken renderer */ } };

    if (geometryOptions.boundingRects) safe(() => renderBoundingRects(bounds, scaledCompBounds, s.boundingRects, renderContext));
    if (geometryOptions.circles) safe(() => renderCircles(scaledCompBounds, s.circles, renderContext));
    if (geometryOptions.centerLines) safe(() => renderCenterLines(bounds, scaledCompBounds, s.centerLines, renderContext));
    if (geometryOptions.diagonals) safe(() => renderDiagonals(bounds, scaledCompBounds, s.diagonals, renderContext));
    if (geometryOptions.goldenRatio) safe(() => renderGoldenRatio(bounds, s.goldenRatio, renderContext));
    if (geometryOptions.tangentLines) safe(() => renderTangentLines(bounds, scaledCompBounds, s.tangentLines, renderContext));
    if (geometryOptions.goldenSpiral) safe(() => renderGoldenSpiral(bounds, s.goldenSpiral, renderContext));
    if (geometryOptions.isometricGrid) safe(() => renderIsometricGrid(bounds, s.isometricGrid, gridSubdivisions, renderContext));
    if (geometryOptions.bezierHandles) safe(() => renderBezierHandles(parsedSVG.segments, parsedSVG.fullBounds, bounds, s.bezierHandles, renderContext));
    if (geometryOptions.typographicProportions) safe(() => renderTypographicProportions(bounds, s.typographicProportions, renderContext));
    if (geometryOptions.thirdLines) safe(() => renderThirdLines(bounds, s.thirdLines, renderContext));
    if (geometryOptions.symmetryAxes) safe(() => renderSymmetryAxes(bounds, scaledCompBounds, s.symmetryAxes, renderContext));
    if (geometryOptions.angleMeasurements) safe(() => renderAngleMeasurements(bounds, scaledCompBounds, s.angleMeasurements, renderContext));
    if (geometryOptions.spacingGuides) safe(() => renderSpacingGuides(bounds, scaledCompBounds, s.spacingGuides));
    if (geometryOptions.rootRectangles) safe(() => renderRootRectangles(bounds, s.rootRectangles, renderContext));
    if (geometryOptions.modularScale) safe(() => renderModularScale(bounds, s.modularScale, modularScaleRatio, renderContext));
    if (geometryOptions.alignmentGuides) safe(() => renderAlignmentGuides(bounds, scaledCompBounds, s.alignmentGuides, renderContext));
    if (geometryOptions.safeZone) safe(() => renderSafeZone(bounds, s.safeZone, safeZoneMargin, renderContext));
    if (geometryOptions.pixelGrid) safe(() => renderPixelGrid(bounds, s.pixelGrid, gridSubdivisions, renderContext));
    if (geometryOptions.opticalCenter) safe(() => renderOpticalCenter(bounds, s.opticalCenter, renderContext));
    if (geometryOptions.contrastGuide) safe(() => renderContrastGuide(bounds, s.contrastGuide, renderContext));
    if (geometryOptions.dynamicBaseline) safe(() => renderDynamicBaseline(bounds, s.dynamicBaseline, renderContext));
    if (geometryOptions.fibonacciOverlay) safe(() => renderFibonacciOverlay(bounds, s.fibonacciOverlay, renderContext));
    if (geometryOptions.kenBurnsSafe) safe(() => renderKenBurnsSafe(bounds, s.kenBurnsSafe, renderContext));
    if (geometryOptions.componentRatioLabels) safe(() => renderComponentRatioLabels(bounds, scaledCompBounds, s.componentRatioLabels));
    if (geometryOptions.vesicaPiscis) safe(() => renderVesicaPiscis(bounds, s.vesicaPiscis, renderContext));
    if (geometryOptions.ruleOfOdds) safe(() => renderRuleOfOdds(bounds, s.ruleOfOdds, renderContext));
    if (geometryOptions.visualWeightMap) safe(() => renderVisualWeightMap(bounds, scaledCompBounds, s.visualWeightMap, renderContext));
    if (geometryOptions.anchoringPoints) safe(() => renderAnchoringPoints(bounds, s.anchoringPoints, renderContext));
    if (geometryOptions.harmonicDivisions) safe(() => renderHarmonicDivisions(bounds, s.harmonicDivisions, renderContext));
    if (geometryOptions.parallelFlowLines) safe(() => renderParallelFlowLines(bounds, s.parallelFlowLines, renderContext, maxFlowLines));
    if (geometryOptions.underlyingCircles) safe(() => renderUnderlyingCircles(bounds, s.underlyingCircles, renderContext));
    if (geometryOptions.dominantDiagonals) safe(() => renderDominantDiagonals(bounds, s.dominantDiagonals, renderContext));
    if (geometryOptions.curvatureComb) safe(() => renderCurvatureComb(bounds, s.curvatureComb, renderContext));
    if (geometryOptions.skeletonCenterline) safe(() => renderSkeletonCenterline(bounds, s.skeletonCenterline, renderContext));
    if (geometryOptions.constructionGrid) safe(() => renderConstructionGrid(bounds, s.constructionGrid, renderContext));
    if (geometryOptions.pathDirectionArrows) safe(() => renderPathDirectionArrows(bounds, s.pathDirectionArrows, renderContext));
    if (geometryOptions.tangentIntersections) safe(() => renderTangentIntersections(bounds, s.tangentIntersections, renderContext));
    if (geometryOptions.anchorPoints) safe(() => renderAnchorPoints(bounds, s.anchorPoints, renderContext, anchorPointSize));

    (paper.view as any).draw();
    onProjectReady?.(paper.project);
  }, [parsedSVG, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions, geometryOptions, geometryStyles, zoom, panOffset, onProjectReady, modularScaleRatio, safeZoneMargin, svgColorOverride, canvasBackground, useRealDataInterpretation, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap, anchorPointSize]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setCursorPos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
    }
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);

  const fitToScreen = useCallback(() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }, []);

  const checkerStyle = canvasBackground === 'checkerboard' ? {
    backgroundImage: 'linear-gradient(45deg, hsl(0 0% 18%) 25%, transparent 25%), linear-gradient(-45deg, hsl(0 0% 18%) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(0 0% 18%) 75%), linear-gradient(-45deg, transparent 75%, hsl(0 0% 18%) 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: 'hsl(0 0% 22%)',
  } : {};

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Canvas Toolbar - themed */}
      <div className="flex items-center gap-0.5 px-2 py-1 rounded-t-lg border-b"
        style={{ backgroundColor: TOOLBAR_THEME.bg, borderColor: TOOLBAR_THEME.border }}
      >
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(5, z + 0.25))}
          style={{ color: TOOLBAR_THEME.text }}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}
          style={{ color: TOOLBAR_THEME.text }}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fitToScreen}
          style={{ color: TOOLBAR_THEME.text }}>
          <Maximize className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
          style={{ color: TOOLBAR_THEME.text }}>
          <RotateCcw className="h-3 w-3" />
        </Button>
        <div className="h-3 w-px mx-0.5" style={{ backgroundColor: TOOLBAR_THEME.border }} />
        <div className="flex items-center gap-0.5 text-[9px]" style={{ color: TOOLBAR_THEME.muted }}>
          <Move className="h-2.5 w-2.5" />
          <span>Alt+Drag</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[9px]" style={{ color: TOOLBAR_THEME.muted }}>
          {cursorPos && <span>X:{cursorPos.x} Y:{cursorPos.y}</span>}
          <span className="font-mono">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`relative flex-1 rounded-b-lg overflow-hidden ${bgClasses[canvasBackground]}`}
        style={{ ...checkerStyle, cursor: isPanning ? 'grabbing' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        {!parsedSVG && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm" style={{ color: TOOLBAR_THEME.muted }}>Upload an SVG to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewCanvas;

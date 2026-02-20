import { useEffect, useRef, useCallback } from 'react';
import paper from 'paper';
import type { GeometryPreset } from '../../unbsgrid/lib/preset-engine';
import { parseSVG } from '../../unbsgrid/lib/svg-engine';
import {
  renderBoundingRects, renderCircles, renderCenterLines, renderDiagonals,
  renderTangentLines, renderAnchoringPoints,
} from '../../unbsgrid/components/renderers/basic';
import {
  renderGoldenRatio, renderGoldenSpiral, renderThirdLines,
  renderTypographicProportions, renderRuleOfOdds,
} from '../../unbsgrid/components/renderers/proportions';
import {
  renderSymmetryAxes, renderAngleMeasurements, renderSpacingGuides,
  renderAlignmentGuides, renderDynamicBaseline, renderComponentRatioLabels,
  renderHarmonicDivisions,
} from '../../unbsgrid/components/renderers/measurement';
import {
  renderRootRectangles, renderModularScale, renderSafeZone,
  renderFibonacciOverlay, renderVesicaPiscis,
} from '../../unbsgrid/components/renderers/harmony';
import {
  renderIsometricGrid, renderPixelGrid, renderContrastGuide,
  renderKenBurnsSafe, renderOpticalCenter, renderVisualWeightMap,
} from '../../unbsgrid/components/renderers/grid';
import {
  renderBezierHandles, renderParallelFlowLines, renderUnderlyingCircles,
  renderDominantDiagonals, renderCurvatureComb, renderSkeletonCenterline,
  renderConstructionGrid, renderPathDirectionArrows,
  renderTangentIntersections, renderAnchorPoints,
} from '../../unbsgrid/components/renderers/advanced';
import { computeContentBounds } from '../../unbsgrid/components/renderers/utils';

interface LogoGridCanvasProps {
  svgContent: string;
  preset: GeometryPreset;
  className?: string;
}

const CANVAS_PADDING = 48;

const LogoGridCanvas = ({ svgContent, preset, className = '' }: LogoGridCanvasProps) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !svgContent) return;

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    const offscreen = offscreenRef.current;
    offscreen.width  = canvas.clientWidth  || 600;
    offscreen.height = canvas.clientHeight || 338;

    try {
      const parsed = parseSVG(svgContent, offscreen);
      const { components, segments, pathGeometry } = parsed;

      const W = offscreen.width;
      const H = offscreen.height;

      const svgW = parsed.fullBounds.width  || 1;
      const svgH = parsed.fullBounds.height || 1;
      const availW = W - CANVAS_PADDING * 2;
      const availH = H - CANVAS_PADDING * 2;
      const scale  = Math.min(availW / svgW, availH / svgH);

      const scaledW = svgW * scale;
      const scaledH = svgH * scale;
      const offsetX = (W - scaledW) / 2;
      const offsetY = (H - scaledH) / 2;

      const bounds = new paper.Rectangle(offsetX, offsetY, scaledW, scaledH);

      const scaledCompBounds = components.map((comp) => {
        const dx = (comp.bounds.x - parsed.fullBounds.x) * scale + offsetX;
        const dy = (comp.bounds.y - parsed.fullBounds.y) * scale + offsetY;
        return new paper.Rectangle(dx, dy, comp.bounds.width * scale, comp.bounds.height * scale);
      });

      // Build real-path context — translate & scale paths to canvas space
      const originX = parsed.fullBounds.x;
      const originY = parsed.fullBounds.y;
      const actualPaths = pathGeometry.allPaths.map((p) => {
        const clone = p.clone() as paper.Path;
        clone.translate(new paper.Point(-originX, -originY));
        clone.scale(scale, new paper.Point(0, 0));
        clone.translate(new paper.Point(offsetX, offsetY));
        return clone;
      });
      const contentBounds = computeContentBounds(actualPaths) ?? bounds;

      const opts   = preset.geometryOptions;
      const styles = preset.geometryStyles;

      const ctx = { actualPaths, useRealData: true, contentBounds };

      // ── Render all active overlays ──────────────────────────────────────────
      // basic
      try { if (opts.boundingRects)          renderBoundingRects(bounds, scaledCompBounds, styles.boundingRects, ctx);         } catch {}
      try { if (opts.circles)                renderCircles(scaledCompBounds, styles.circles, ctx);                              } catch {}
      try { if (opts.centerLines)            renderCenterLines(bounds, scaledCompBounds, styles.centerLines, ctx);              } catch {}
      try { if (opts.diagonals)              renderDiagonals(bounds, scaledCompBounds, styles.diagonals, ctx);                  } catch {}
      try { if (opts.tangentLines)           renderTangentLines(bounds, scaledCompBounds, styles.tangentLines, ctx);            } catch {}
      try { if (opts.anchoringPoints)        renderAnchoringPoints(bounds, styles.anchoringPoints, ctx);                        } catch {}
      // proportions
      try { if (opts.goldenRatio)            renderGoldenRatio(bounds, styles.goldenRatio, ctx);                                } catch {}
      try { if (opts.goldenSpiral)           renderGoldenSpiral(bounds, styles.goldenSpiral, ctx);                              } catch {}
      try { if (opts.thirdLines)             renderThirdLines(bounds, styles.thirdLines, ctx);                                  } catch {}
      try { if (opts.typographicProportions) renderTypographicProportions(bounds, styles.typographicProportions, ctx);          } catch {}
      try { if (opts.ruleOfOdds)             renderRuleOfOdds(bounds, styles.ruleOfOdds, ctx);                                  } catch {}
      // measurement
      try { if (opts.symmetryAxes)           renderSymmetryAxes(bounds, scaledCompBounds, styles.symmetryAxes, ctx);           } catch {}
      try { if (opts.angleMeasurements)      renderAngleMeasurements(bounds, scaledCompBounds, styles.angleMeasurements, ctx); } catch {}
      try { if (opts.spacingGuides)          renderSpacingGuides(bounds, scaledCompBounds, styles.spacingGuides);                } catch {}
      try { if (opts.alignmentGuides)        renderAlignmentGuides(bounds, scaledCompBounds, styles.alignmentGuides, ctx);         } catch {}
      try { if (opts.dynamicBaseline)        renderDynamicBaseline(bounds, styles.dynamicBaseline, ctx);                           } catch {}
      try { if (opts.componentRatioLabels)   renderComponentRatioLabels(bounds, scaledCompBounds, styles.componentRatioLabels);    } catch {}
      try { if (opts.harmonicDivisions)      renderHarmonicDivisions(bounds, styles.harmonicDivisions, ctx);                   } catch {}
      // harmony
      try { if (opts.rootRectangles)         renderRootRectangles(bounds, styles.rootRectangles, ctx);                                   } catch {}
      try { if (opts.modularScale)           renderModularScale(bounds, styles.modularScale, 1.618, ctx);                                } catch {}
      try { if (opts.safeZone)               renderSafeZone(bounds, styles.safeZone, 0.1, ctx);                                          } catch {}
      try { if (opts.fibonacciOverlay)       renderFibonacciOverlay(bounds, styles.fibonacciOverlay, ctx);                               } catch {}
      try { if (opts.vesicaPiscis)           renderVesicaPiscis(bounds, styles.vesicaPiscis, ctx);                                        } catch {}
      // grid
      try { if (opts.isometricGrid)          renderIsometricGrid(bounds, styles.isometricGrid, preset.gridSubdivisions || 8, ctx);       } catch {}
      try { if (opts.pixelGrid)              renderPixelGrid(bounds, styles.pixelGrid, preset.gridSubdivisions || 8, ctx);               } catch {}
      try { if (opts.contrastGuide)          renderContrastGuide(bounds, styles.contrastGuide, ctx);                                      } catch {}
      try { if (opts.kenBurnsSafe)           renderKenBurnsSafe(bounds, styles.kenBurnsSafe, ctx);                                        } catch {}
      try { if (opts.opticalCenter)          renderOpticalCenter(bounds, styles.opticalCenter, ctx);                                      } catch {}
      try { if (opts.visualWeightMap)        renderVisualWeightMap(bounds, scaledCompBounds, styles.visualWeightMap, ctx);               } catch {}
      // advanced — use original parsed bounds for remapping
      const origBounds = new paper.Rectangle(parsed.fullBounds.x, parsed.fullBounds.y, parsed.fullBounds.width, parsed.fullBounds.height);
      try { if (opts.bezierHandles)          renderBezierHandles(segments, origBounds, bounds, styles.bezierHandles, ctx);     } catch {}
      try { if (opts.parallelFlowLines)      renderParallelFlowLines(bounds, styles.parallelFlowLines, ctx);                   } catch {}
      try { if (opts.underlyingCircles)      renderUnderlyingCircles(bounds, styles.underlyingCircles, ctx);                   } catch {}
      try { if (opts.dominantDiagonals)      renderDominantDiagonals(bounds, styles.dominantDiagonals, ctx);                   } catch {}
      try { if (opts.curvatureComb)          renderCurvatureComb(bounds, styles.curvatureComb, ctx);                           } catch {}
      try { if (opts.skeletonCenterline)     renderSkeletonCenterline(bounds, styles.skeletonCenterline, ctx);                 } catch {}
      try { if (opts.constructionGrid)       renderConstructionGrid(bounds, styles.constructionGrid, ctx);                     } catch {}
      try { if (opts.pathDirectionArrows)    renderPathDirectionArrows(bounds, styles.pathDirectionArrows, ctx);               } catch {}
      try { if (opts.tangentIntersections)   renderTangentIntersections(bounds, styles.tangentIntersections, ctx);             } catch {}
      try { if (opts.anchorPoints)           renderAnchorPoints(bounds, styles.anchorPoints, ctx);                             } catch {}

      // Copy offscreen → visible canvas with white background
      canvas.width  = offscreen.width;
      canvas.height = offscreen.height;
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
        ctx2d.drawImage(offscreen, 0, 0);
      }

      // Cleanup path clones
      actualPaths.forEach((p) => p.remove());
    } catch (err) {
      console.warn('[LogoGridCanvas] render error', err);
    }
  }, [svgContent, preset]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas.parentElement ?? canvas);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full rounded-lg ${className}`}
      style={{ display: 'block' }}
    />
  );
};

export default LogoGridCanvas;

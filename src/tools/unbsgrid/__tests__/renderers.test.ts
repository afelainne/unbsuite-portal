import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PHI, fitGoldenRect, computeGoldenSpiralSteps, arcPoint, vesicaLens, ratioMatchPercent, parseHexColor,
  hexToColor, clipLineToRect, intersectsAnyPath, sanitizeSubdivisions, formatLength, computeVisualCentroid,
  type RenderContext,
} from '../components/renderers/utils';
import { angleArcPoints, renderAngleMeasurements, renderSpacingGuides } from '../components/renderers/measurement';
import { renderPixelGrid, renderIsometricGrid, renderOpticalCenter, inkQuadrantWeights, renderVisualWeightMap } from '../components/renderers/grid';
import { renderHexGrid, hexGridRadius } from '../components/renderers/sacred';
import { renderRootRectangles, renderVesicaPiscis, renderFibonacciOverlay } from '../components/renderers/harmony';
import { renderGoldenSpiral, renderGoldenRatio } from '../components/renderers/proportions';
import { renderCurvatureComb, renderUnderlyingCircles, renderBezierHandles, MAX_UNDERLYING_CIRCLES } from '../components/renderers/advanced';
import { renderTriangularGrid } from '../components/renderers/construction';

const style = { color: '#ff0000', opacity: 1, strokeWidth: 1 };
let scope: paper.PaperScope;

beforeEach(() => {
  scope = new paper.PaperScope();
  scope.setup(new scope.Size(1000, 1000));
});
afterEach(() => {
  scope.project.remove();
  paper.activate();
});

const items = () => scope.project.activeLayer.children;
const allItems = () => scope.project.getItems({}) as paper.Item[];
const texts = () => allItems().filter(i => i instanceof paper.PointText) as paper.PointText[];
const finiteBounds = () => items().every(i => [i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));

describe('golden rectangle & spiral math', () => {
  it('fitGoldenRect keeps φ, fits inside and follows orientation', () => {
    for (const r of [{ x: 0, y: 0, width: 300, height: 100 }, { x: 5, y: 5, width: 100, height: 100 }, { x: 0, y: 0, width: 80, height: 400 }, { x: 0, y: 0, width: 100, height: 130 }]) {
      const g = fitGoldenRect(r);
      const long = Math.max(g.width, g.height), short = Math.min(g.width, g.height);
      expect(long / short).toBeCloseTo(PHI, 6);
      expect(g.width).toBeLessThanOrEqual(r.width + 1e-9);
      expect(g.height).toBeLessThanOrEqual(r.height + 1e-9);
      expect(g.x + g.width / 2).toBeCloseTo(r.x + r.width / 2);
      expect(g.orientation).toBe(r.height > r.width ? 'portrait' : 'landscape');
      expect(g.height > g.width).toBe(r.height > r.width);
    }
    expect(fitGoldenRect({ x: 0, y: 0, width: 0, height: 0 }).width).toBe(0);
  });

  it.each([
    ['landscape', { x: 0, y: 0, width: 161.8034, height: 100 }, 'left'],
    ['portrait', { x: 0, y: 0, width: 100, height: 161.8034 }, 'top'],
  ])('%s spiral is continuous and starts on the long side', (_n, rect, firstSide) => {
    const steps = computeGoldenSpiralSteps(rect as never, 10, 0.5);
    expect(steps[0].side).toBe(firstSide);
    expect(steps.length).toBe(10);
    for (let i = 0; i < steps.length - 1; i++) {
      const end = arcPoint(steps[i], steps[i].startAngle + 90);
      const start = arcPoint(steps[i + 1], steps[i + 1].startAngle);
      expect(end.x).toBeCloseTo(start.x, 4);
      expect(end.y).toBeCloseTo(start.y, 4);
      expect(steps[i].square.width / steps[i + 1].square.width).toBeCloseTo(PHI, 3);
      // arc endpoints are corners of their own square
      const s = steps[i].square;
      const inSquare = (p: { x: number; y: number }) => p.x >= s.x - 1e-6 && p.x <= s.x + s.width + 1e-6 && p.y >= s.y - 1e-6 && p.y <= s.y + s.height + 1e-6;
      expect(inSquare(arcPoint(steps[i], steps[i].startAngle + 45))).toBe(true);
    }
    expect(computeGoldenSpiralSteps({ x: 0, y: 0, width: 0, height: 10 })).toEqual([]);
  });

  it('renderGoldenSpiral draws a portrait spiral for portrait bounds and survives zero bounds', () => {
    renderGoldenSpiral(new paper.Rectangle(0, 0, 100, 300), style);
    const outer = items()[0];
    expect(outer.bounds.height).toBeGreaterThan(outer.bounds.width);
    expect(outer.bounds.height / outer.bounds.width).toBeCloseTo(PHI, 3);
    scope.project.clear();
    expect(() => renderGoldenSpiral(new paper.Rectangle(0, 0, 100, 0), style)).not.toThrow();
    expect(() => renderGoldenRatio(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
  });

  it('renderGoldenRatio rectangle fits very wide bounds', () => {
    renderGoldenRatio(new paper.Rectangle(0, 0, 500, 100), style);
    const rect = items().find(i => i instanceof paper.Path && (i as paper.Path).segments.length === 4)!;
    expect(rect.bounds.height).toBeLessThanOrEqual(100 + 1e-6);
    // unique fibonacci circles (no duplicated radius)
    const radii = items().filter(i => i instanceof paper.Path && (i as paper.Path).segments.length === 4 && i !== rect).map(i => Math.round(i.bounds.width));
    expect(new Set(radii).size).toBe(radii.length);
  });

  it('Fibonacci overlay squares match the spiral squares', () => {
    const b = new paper.Rectangle(0, 0, 100, 300);
    renderFibonacciOverlay(b, style);
    const golden = fitGoldenRect(b);
    const expected = computeGoldenSpiralSteps(golden, 8, 1).map(s => s.square);
    const squares = items().slice(1).filter(i => i instanceof paper.Path) as paper.Path[];
    expect(squares.length).toBe(expected.length);
    squares.forEach((sq, i) => {
      expect(sq.bounds.x).toBeCloseTo(expected[i].x, 4);
      expect(sq.bounds.y).toBeCloseTo(expected[i].y, 4);
    });
  });
});

describe('vesica piscis', () => {
  it('lens cusps lie on both circles; lens is r wide and r·√3 tall', () => {
    const r = 30;
    const lens = vesicaLens(100, 50, r);
    const c1 = { x: 100 - r / 2, y: 50 }, c2 = { x: 100 + r / 2, y: 50 };
    for (const p of [lens.top, lens.bottom]) {
      expect(Math.hypot(p.x - c1.x, p.y - c1.y)).toBeCloseTo(r);
      expect(Math.hypot(p.x - c2.x, p.y - c2.y)).toBeCloseTo(r);
    }
    expect(Math.hypot(lens.left.x - c2.x, lens.left.y - c2.y)).toBeCloseTo(r);
    expect(lens.right.x - lens.left.x).toBeCloseTo(r);
    expect(lens.bottom.y - lens.top.y).toBeCloseTo(r * Math.sqrt(3));
  });

  it('renderVesicaPiscis draws the real mandorla, not a near-circle', () => {
    renderVesicaPiscis(new paper.Rectangle(0, 0, 300, 200), style);
    const r = 100;
    const lens = (items() as paper.Path[]).find(i => i instanceof paper.Path && i.closed && Math.abs(i.bounds.width - r) < 1);
    expect(lens).toBeDefined();
    expect(lens!.bounds.height).toBeCloseTo(r * Math.sqrt(3), 0);
    expect(() => renderVesicaPiscis(new paper.Rectangle(0, 0, 0, 10), style)).not.toThrow();
  });
});

describe('root rectangles', () => {
  it('ratioMatchPercent is symmetric and guarded', () => {
    expect(ratioMatchPercent(2, 1)).toBeCloseTo(50);
    expect(ratioMatchPercent(0.5, 1)).toBeCloseTo(50);
    expect(ratioMatchPercent(Math.SQRT2, Math.SQRT2)).toBe(100);
    expect(ratioMatchPercent(0, 1)).toBe(0);
    expect(ratioMatchPercent(Infinity, 1)).toBe(0);
  });

  it('flags √2 as best match and does not emit NaN for zero height', () => {
    renderRootRectangles(new paper.Rectangle(0, 0, 141.42, 100), style);
    const labels = texts().map(t => t.content);
    expect(labels.some(l => l.startsWith('√2 ✓ 100%'))).toBe(true);
    expect(labels.join()).not.toMatch(/NaN|Infinity/);
    scope.project.clear();
    renderRootRectangles(new paper.Rectangle(0, 0, 100, 0), style);
    expect(texts().map(t => t.content).join()).not.toMatch(/NaN|Infinity/);
  });
});

describe('angle measurements', () => {
  it('angleArcPoints puts the through point on the circle at the half angle', () => {
    const p = angleArcPoints(0, 0, 10, 60);
    expect(Math.hypot(p.through.x, p.through.y)).toBeCloseTo(10);
    expect(Math.atan2(-p.through.y, p.through.x) * 180 / Math.PI).toBeCloseTo(30);
    expect(Math.atan2(-p.to.y, p.to.x) * 180 / Math.PI).toBeCloseTo(60);
  });

  it('flat components get a short arc (not a near-full circle)', () => {
    const comp = new paper.Rectangle(0, 0, 400, 50); // 7.1°
    renderAngleMeasurements(new paper.Rectangle(0, 0, 400, 50), [comp], style);
    const arcs = (items() as paper.Path[]).filter(i => i instanceof paper.Path && i.curves.length && !i.closed);
    expect(arcs.length).toBeGreaterThan(0);
    for (const arc of arcs) {
      const r = Math.hypot(arc.firstSegment.point.x - 0, arc.firstSegment.point.y - (arc === arcs[0] ? 50 : 50));
      const expectedLen = r * (Math.atan2(50, 400));
      expect(arc.length).toBeLessThan(expectedLen * 1.2 + 1);
    }
  });

  it('zero-height bounds do not throw', () => {
    expect(() => renderAngleMeasurements(new paper.Rectangle(0, 0, 100, 0), [new paper.Rectangle(0, 0, 100, 0)], style)).not.toThrow();
  });
});

describe('grids terminate and stay bounded', () => {
  it('renderPixelGrid: zero height / negative subdivisions do not loop forever', () => {
    renderPixelGrid(new paper.Rectangle(0, 0, 100, 0), style, 8);
    expect(items()).toHaveLength(0);
    renderPixelGrid(new paper.Rectangle(0, 0, 100, 100), style, -5);
    const n = items().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(10);
    scope.project.clear();
    renderPixelGrid(new paper.Rectangle(0, 0, 100, 100), style, 4);
    expect(items()).toHaveLength(18); // 9 + 9 lines, step 12.5
  });

  it('renderIsometricGrid covers the long side of wide bounds', () => {
    const b = new paper.Rectangle(0, 0, 1000, 100);
    renderIsometricGrid(b, style, 4);
    const verticals = (items() as paper.Path[]).filter(p => Math.abs(p.firstSegment.point.x - p.lastSegment.point.x) < 1e-6);
    const xs = verticals.map(p => p.firstSegment.point.x);
    expect(Math.min(...xs)).toBeLessThanOrEqual(b.left);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(b.right);
    expect(finiteBounds()).toBe(true);
    scope.project.clear();
    renderIsometricGrid(new paper.Rectangle(0, 0, 0, 0), style, 4);
    expect(items()).toHaveLength(0);
  });

  it('renderTriangularGrid caps line count for tall narrow content', () => {
    renderTriangularGrid(new paper.Rectangle(0, 0, 4, 20000), style);
    expect(items().length).toBeLessThanOrEqual(4100);
  });

  it('hex grid keeps a valid honeycomb in real-data mode (column parity bug)', () => {
    const b = new paper.Rectangle(100, 100, 320, 200);
    const target = new paper.Path.Rectangle(b);
    target.remove();
    const ctx: RenderContext = { useRealData: true, actualPaths: [target], contentBounds: b };
    renderHexGrid(b, style, ctx);
    const hexes = (items() as paper.Path[]).filter(p => p.segments.length === 6);
    expect(hexes.length).toBeGreaterThan(10);
    const r = b.width / 16;
    const rowStep = r * Math.sqrt(3);
    const colStep = r * 1.5;
    const xs = [...new Set(hexes.map(h => Math.round(h.position.x * 1000) / 1000))].sort((a, c) => a - c);
    const phase = (col: number) => {
      const ys = hexes.filter(h => Math.abs(h.position.x - xs[col]) < 1e-3).map(h => h.position.y);
      return ((ys[0] % rowStep) + rowStep) % rowStep;
    };
    for (let i = 0; i < xs.length - 1; i++) {
      expect(xs[i + 1] - xs[i]).toBeCloseTo(colStep, 3);
      const diff = Math.abs(phase(i) - phase(i + 1));
      expect(Math.min(diff, rowStep - diff)).toBeCloseTo(rowStep / 2, 3);
    }
  });

  it('hexGridRadius grows for very tall content', () => {
    expect(hexGridRadius({ width: 160, height: 100 })).toBe(10);
    const r = hexGridRadius({ width: 16, height: 100000 }, 2000);
    expect(r).toBeGreaterThan(1);
    expect(hexGridRadius({ width: 0, height: 10 })).toBe(0);
  });
});

describe('real-data analysis', () => {
  const heavyBottom = () => {
    // thin bar on top, big block at the bottom -> ink center is low and left
    const top = new paper.Path.Rectangle(new paper.Rectangle(0, 0, 100, 5));
    const block = new paper.Path.Rectangle(new paper.Rectangle(0, 60, 40, 40));
    // many nodes on the top bar would have biased the old vertex average upwards
    top.flatten(0.5);
    [top, block].forEach(p => { p.fillColor = new paper.Color('black'); p.remove(); });
    return [top, block];
  };

  it('optical center follows the ink center of mass (x and y)', () => {
    const paths = heavyBottom();
    const b = new paper.Rectangle(0, 0, 100, 100);
    renderOpticalCenter(b, style, { useRealData: true, actualPaths: paths });
    const circle = (items() as paper.Path[]).find(p => p.closed && p.segments.length === 4 && Math.abs(p.bounds.width - 100 * 0.08 * 1.2) < 0.01)!;
    // ink: top 500 @ (50, 2.5), block 1600 @ (20, 80)
    // the sweep is exact for polygons
    expect(circle.position.y).toBeCloseTo((500 * 2.5 + 1600 * 80) / 2100, 3);
    expect(circle.position.y).toBeGreaterThan(55); // old vertex average of the flattened bar was ~20
    expect(circle.position.x).toBeCloseTo((500 * 50 + 1600 * 20) / 2100, 0);
  });

  it('visual weight map uses ink area per quadrant', () => {
    const paths = heavyBottom();
    const w = inkQuadrantWeights(paths, new paper.Rectangle(0, 0, 100, 100))!;
    expect(w.reduce((a, c) => a + c, 0)).toBeCloseTo(1);
    expect(w[2]).toBeCloseTo(1600 / 2100, 4); // bottom-left holds the block
    expect(w[0]).toBeCloseTo(250 / 2100, 4);
    renderVisualWeightMap(new paper.Rectangle(0, 0, 100, 100), [], style, { useRealData: true, actualPaths: paths });
    const labels = texts().map(t => t.content);
    expect(labels).toContain(`${Math.round(w[2] * 100)}%`);
    expect(inkQuadrantWeights([], new paper.Rectangle(0, 0, 1, 1))).toBeNull();
  });

  it('intersectsAnyPath skips paths whose bounds are far away', () => {
    const far = new paper.Path.Rectangle(new paper.Rectangle(500, 500, 10, 10));
    const near = new paper.Path.Rectangle(new paper.Rectangle(0, 0, 10, 10));
    const line = new paper.Path.Line(new paper.Point(-5, 5), new paper.Point(20, 5));
    const spy = vi.spyOn(line, 'getIntersections');
    expect(intersectsAnyPath(line, [far])).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(intersectsAnyPath(line, [far, near])).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('curvature comb respects a global budget', () => {
    const paths: paper.Path[] = [];
    for (let i = 0; i < 400; i++) {
      const c = new paper.Path.Circle(new paper.Point((i % 20) * 30, Math.floor(i / 20) * 30), 10);
      c.remove();
      paths.push(c);
    }
    renderCurvatureComb(new paper.Rectangle(0, 0, 600, 600), style, { useRealData: true, actualPaths: paths });
    expect(items().length).toBeLessThanOrEqual(4000);
  });

  it('underlying circles are capped', () => {
    const paths: paper.Path[] = [];
    for (let i = 0; i < 40; i++) {
      const c = new paper.Path.Circle(new paper.Point(i * 50, 0), 10 + i);
      c.remove();
      paths.push(c);
    }
    renderUnderlyingCircles(new paper.Rectangle(0, -60, 2000, 120), style, { useRealData: true, actualPaths: paths });
    const circles = (items() as paper.Path[]).filter(p => p.closed);
    expect(circles.length).toBeLessThanOrEqual(MAX_UNDERLYING_CIRCLES);
  });

  it('bezier handle mapping survives zero-size original bounds', () => {
    const seg = { anchor: { x: 0, y: 5 }, handleIn: { x: -1, y: 5 }, handleOut: { x: 1, y: 5 }, hasHandleIn: true, hasHandleOut: true };
    renderBezierHandles([seg], new paper.Rectangle(0, 5, 10, 0), new paper.Rectangle(0, 0, 100, 100), style);
    expect(items().length).toBeGreaterThan(0);
    expect(finiteBounds()).toBe(true);
  });
});

describe('small utils', () => {
  it('parseHexColor / hexToColor never produce NaN', () => {
    expect(parseHexColor('#abc')).toEqual({ r: 0xaa / 255, g: 0xbb / 255, b: 0xcc / 255, a: 1 });
    expect(parseHexColor('#11223380').a).toBeCloseTo(0x80 / 255);
    expect(parseHexColor('red')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    const c = hexToColor('nope', 2);
    expect([c.red, c.green, c.blue, c.alpha].every(Number.isFinite)).toBe(true);
    expect(c.alpha).toBe(1);
  });

  it('clipLineToRect rejects non-finite input', () => {
    expect(clipLineToRect(NaN, 0, 10, 10, 0, 0, 5, 5)).toBeNull();
    expect(clipLineToRect(-10, 2, 20, 2, 0, 0, 5, 5)).toEqual([0, 2, 5, 2]);
  });

  it('sanitizeSubdivisions / formatLength / computeVisualCentroid', () => {
    expect(sanitizeSubdivisions(-2)).toBe(1);
    expect(sanitizeSubdivisions(NaN)).toBe(8);
    expect(formatLength(50.4)).toBe('50px');
    expect(formatLength(50, { unitsPerPixel: 0.5 })).toBe('25u');
    expect(formatLength(3, { unitsPerPixel: 0.5 })).toBe('1.5u');
    expect(computeVisualCentroid([]).x).toBe(0);
  });

  it('spacing guides label in SVG units when the scale is known', () => {
    renderSpacingGuides(new paper.Rectangle(0, 0, 300, 50), [new paper.Rectangle(0, 0, 50, 50), new paper.Rectangle(150, 0, 50, 50)], style, { unitsPerPixel: 0.1 });
    expect(texts().map(t => t.content)).toContain('10u');
  });
});

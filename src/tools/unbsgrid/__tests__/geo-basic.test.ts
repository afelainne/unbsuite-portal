import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderBoundingRects, renderCircles, renderCenterLines, renderDiagonals,
  renderTangentLines, renderAnchoringPoints,
  frameOf, unionRects, samplePathPoints, pointsInRect, averagePoint, radialExtent, extremePoints,
} from '../components/renderers/basic';
import { createGuideMetrics } from '../components/renderers/scale';
import type { RenderContext } from '../components/renderers/utils';

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

const items = () => scope.project.activeLayer.children as paper.Item[];
const paths = () => items().filter(i => i instanceof paper.Path) as paper.Path[];
const texts = () => items().filter(i => i instanceof paper.PointText) as paper.PointText[];
const allFinite = () => items().every(i => [i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));
const noNaNLabels = () => texts().every(t => !/NaN|Infinity|undefined/.test(t.content));

/** A detached path, usable as "real" logo data. */
const detached = <T extends paper.Path>(p: T): T => { p.remove(); return p; };
const realCircle = (x: number, y: number, r: number) => detached(new paper.Path.Circle(new paper.Point(x, y), r));
const realRect = (r: paper.Rectangle) => detached(new paper.Path.Rectangle(r));

const ctxFor = (p: paper.Path[]): RenderContext => ({
  useRealData: true,
  actualPaths: p,
  contentBounds: p.reduce((acc, q) => (acc ? acc.unite(q.bounds) : q.bounds.clone()), null as paper.Rectangle | null) ?? undefined,
});

describe('structure helpers', () => {
  it('frameOf prefers the real ink bbox and ignores a degenerate one', () => {
    const b = new paper.Rectangle(0, 0, 100, 100);
    const ink = new paper.Rectangle(10, 20, 30, 40);
    expect(frameOf(b, { contentBounds: ink }).equals(ink)).toBe(true);
    expect(frameOf(b, { contentBounds: new paper.Rectangle(0, 0, 0, 10) }).equals(b)).toBe(true);
    expect(frameOf(b, undefined).equals(b)).toBe(true);
  });

  it('unionRects skips degenerate rectangles', () => {
    const u = unionRects([new paper.Rectangle(0, 0, 10, 10), new paper.Rectangle(0, 0, 0, 0), new paper.Rectangle(20, 20, 10, 10)])!;
    expect([u.left, u.top, u.right, u.bottom]).toEqual([0, 0, 30, 30]);
    expect(unionRects([])).toBeNull();
    expect(unionRects(undefined)).toBeNull();
  });

  it('samplePathPoints stays on the contour, is capped, and feeds radial extents', () => {
    const c = realCircle(100, 100, 40);
    const pts = samplePathPoints([c], 64);
    expect(pts.length).toBeGreaterThan(20);
    expect(pts.every(p => Math.abs(Math.hypot(p.x - 100, p.y - 100) - 40) < 0.5)).toBe(true);

    const avg = averagePoint(pts)!;
    expect(avg.x).toBeCloseTo(100, 1);
    expect(avg.y).toBeCloseTo(100, 1);
    const ext = radialExtent(pts, avg)!;
    expect(ext.min).toBeCloseTo(40, 0);
    expect(ext.max).toBeCloseTo(40, 0);

    const ex = extremePoints(pts)!;
    expect(ex.top.y).toBeCloseTo(60, 1);
    expect(ex.bottom.y).toBeCloseTo(140, 1);
    expect(ex.left.x).toBeCloseTo(60, 1);
    expect(ex.right.x).toBeCloseTo(140, 1);

    expect(averagePoint([])).toBeNull();
    expect(radialExtent([], new paper.Point(0, 0))).toBeNull();
    expect(extremePoints([])).toBeNull();
    expect(samplePathPoints([])).toEqual([]);

    const many = Array.from({ length: 300 }, (_, i) => realCircle(i * 10, 0, 5));
    expect(samplePathPoints(many).length).toBeLessThanOrEqual(2048);
  });

  it('pointsInRect keeps only the local contour', () => {
    const pts = [new paper.Point(1, 1), new paper.Point(50, 50), new paper.Point(-10, 0)];
    expect(pointsInRect(pts, new paper.Rectangle(0, 0, 10, 10)).length).toBe(1);
  });
});

describe('every decorative length scales with the logo', () => {
  const renderAll = (k: number) => {
    const b = new paper.Rectangle(0, 0, 600 * k, 800 * k);
    const comps = [new paper.Rectangle(0, 0, 300 * k, 400 * k)];
    renderBoundingRects(b, comps, style);
    renderCenterLines(b, comps, style);
    renderDiagonals(b, comps, style);
    renderTangentLines(b, comps, style);
    renderAnchoringPoints(b, style);
  };

  it('stroke, dash, font and marker sizes are proportional to the bounds diagonal', () => {
    renderAll(1);
    const small = {
      stroke: paths()[0].strokeWidth,
      dash: paths()[0].dashArray[0],
      font: texts()[0].fontSize as number,
      markers: paths().length,
    };
    scope.project.clear();
    renderAll(8);
    const big = {
      stroke: paths()[0].strokeWidth,
      dash: paths()[0].dashArray[0],
      font: texts()[0].fontSize as number,
      markers: paths().length,
    };
    expect(big.stroke / small.stroke).toBeCloseTo(8, 3);
    expect(big.dash / small.dash).toBeCloseTo(8, 3);
    expect(big.font / small.font).toBeCloseTo(8, 3);
    expect(big.markers).toBe(small.markers); // scaling must not change the drawing
  });

  it('a tiny logo keeps visible hairlines instead of zero-width strokes', () => {
    const m = createGuideMetrics({ width: 3, height: 4 });
    renderBoundingRects(new paper.Rectangle(0, 0, 3, 4), [], style, { metrics: m });
    expect(paths().every(p => p.strokeWidth >= 0.4)).toBe(true);
    expect(texts().every(t => (t.fontSize as number) >= 7)).toBe(true);
    expect(allFinite()).toBe(true);
  });

  it('a huge logo stays finite and free of NaN labels', () => {
    const b = new paper.Rectangle(0, 0, 100000, 50000);
    renderBoundingRects(b, [b], style);
    renderCircles([b], style);
    renderTangentLines(b, [b], style);
    renderAnchoringPoints(b, style);
    expect(allFinite()).toBe(true);
    expect(noNaNLabels()).toBe(true);
  });
});

describe('degenerate input', () => {
  it('zero-size bounds never throw and draw nothing structural', () => {
    const zero = new paper.Rectangle(0, 0, 0, 0);
    const flat = new paper.Rectangle(0, 0, 100, 0);
    expect(() => {
      renderBoundingRects(zero, [flat], style);
      renderCircles([zero, flat], style);
      renderCenterLines(flat, [flat], style);
      renderDiagonals(zero, [zero], style);
      renderTangentLines(flat, [flat], style);
      renderAnchoringPoints(zero, style);
    }).not.toThrow();
    expect(items()).toHaveLength(0);
    expect(allFinite()).toBe(true);
  });
});

describe('bounding rects', () => {
  it('adds the tight ink box only when it differs from the item bounds', () => {
    const b = new paper.Rectangle(0, 0, 200, 100);
    renderBoundingRects(b, [], style, { contentBounds: new paper.Rectangle(0, 0, 200, 100) });
    expect(paths()).toHaveLength(1);
    scope.project.clear();
    renderBoundingRects(b, [], style, { contentBounds: new paper.Rectangle(20, 10, 160, 80) });
    expect(paths()).toHaveLength(2);
    expect(paths()[1].bounds.width).toBeCloseTo(160);
    expect(texts()[0].content).toBe('200px × 100px');
  });
});

describe('circles', () => {
  it('bbox mode: inscribed = min side / 2, circumscribed = diagonal / 2', () => {
    renderCircles([new paper.Rectangle(0, 0, 200, 100)], style);
    const radii = paths().map(p => p.bounds.width / 2).sort((a, b) => a - b);
    expect(radii[0]).toBeCloseTo(50, 6);
    expect(radii[1]).toBeCloseTo(Math.hypot(200, 100) / 2, 6);
  });

  it('never draws the same circle twice', () => {
    const r = new paper.Rectangle(0, 0, 200, 100);
    renderCircles([r, r.clone(), r.clone()], style);
    expect(paths()).toHaveLength(2);
  });

  it('real data: radii are measured on the contour, and a true circle collapses to one', () => {
    const c = realCircle(100, 100, 40);
    renderCircles([c.bounds], style, ctxFor([c]));
    const circles = paths().filter(p => p.bounds.width > 5);
    expect(circles).toHaveLength(1); // inscribed == circumscribed == 40
    expect(circles[0].bounds.width / 2).toBeCloseTo(40, 0);
    expect(circles[0].position.x).toBeCloseTo(100, 1);
  });

  it('real data: a cross-shaped mark gets a small inscribed and a large circumscribed circle', () => {
    const bar = realRect(new paper.Rectangle(0, 45, 100, 10));
    const stem = realRect(new paper.Rectangle(45, 0, 10, 100));
    const ctx = ctxFor([bar, stem]);
    renderCircles([ctx.contentBounds!], style, ctx);
    const radii = paths().filter(p => p.bounds.width > 2).map(p => p.bounds.width / 2).sort((a, b) => a - b);
    expect(radii.length).toBe(2);
    expect(radii[0]).toBeLessThan(10); // inscribed: half the stem width
    // circumscribed reaches the arm tips (50, ±5), NOT the empty bbox corner
    expect(radii[1]).toBeCloseTo(Math.hypot(50, 5), 0);
    expect(radii[1]).toBeLessThan(Math.hypot(50, 50));
  });
});

describe('center lines and diagonals', () => {
  it('use the real ink frame, not the item bounds', () => {
    const b = new paper.Rectangle(0, 0, 400, 400);
    const ink = new paper.Rectangle(100, 100, 100, 100);
    renderCenterLines(b, [], style, { contentBounds: ink });
    const [h, v] = paths();
    expect(h.bounds.center.y).toBeCloseTo(150, 6);
    expect(v.bounds.center.x).toBeCloseTo(150, 6);
  });

  it('diagonals mark their crossing only when both are drawn', () => {
    renderDiagonals(new paper.Rectangle(0, 0, 200, 200), [], style);
    expect(paths()).toHaveLength(3);
    scope.project.clear();
    // real data far from the diagonals: both are dropped, no crossing dot
    const far = realRect(new paper.Rectangle(500, 500, 10, 10));
    renderDiagonals(new paper.Rectangle(0, 0, 200, 200), [], style, { useRealData: true, actualPaths: [far] });
    expect(paths()).toHaveLength(0);
  });
});

describe('tangent lines', () => {
  it('touch the real contour instead of the component box, and mark the touch point', () => {
    const c = realCircle(100, 100, 50);
    const comp = new paper.Rectangle(0, 0, 200, 200); // box much larger than the ink
    const ctx: RenderContext = { useRealData: true, actualPaths: [c], contentBounds: comp };
    renderTangentLines(comp, [comp], style, ctx);

    const lines = paths().filter(p => p.segments.length === 2);
    const ys = lines.filter(l => Math.abs(l.firstSegment.point.y - l.lastSegment.point.y) < 1e-9).map(l => l.firstSegment.point.y);
    const xs = lines.filter(l => Math.abs(l.firstSegment.point.x - l.lastSegment.point.x) < 1e-9).map(l => l.firstSegment.point.x);
    expect(Math.min(...ys)).toBeCloseTo(50, 0);
    expect(Math.max(...ys)).toBeCloseTo(150, 0);
    expect(Math.min(...xs)).toBeCloseTo(50, 0);
    expect(Math.max(...xs)).toBeCloseTo(150, 0);
    // one tangency marker per line
    expect(paths().filter(p => p.closed).length).toBe(4);
  });

  it('falls back to the component box without real data', () => {
    const comp = new paper.Rectangle(10, 20, 100, 60);
    renderTangentLines(comp, [comp], style);
    const ys = paths().filter(l => Math.abs(l.firstSegment.point.y - l.lastSegment.point.y) < 1e-9).map(l => l.firstSegment.point.y);
    expect(ys.sort((a, b) => a - b)).toEqual([20, 80]);
    expect(paths().filter(p => p.closed)).toHaveLength(0);
  });
});

describe('anchoring points', () => {
  it('snap to real nodes and drop anchors that anchor nothing', () => {
    const square = realRect(new paper.Rectangle(20, 20, 60, 60));
    const ctx = ctxFor([square]);
    renderAnchoringPoints(new paper.Rectangle(0, 0, 100, 100), style, ctx);
    const dots = paths().filter(p => p.closed);
    // 8 frame anchors sit on the outline; the center one has no node nearby
    expect(dots).toHaveLength(8);
    expect(dots.every(d => Math.abs(d.position.x - 50) > 1 || Math.abs(d.position.y - 50) > 1)).toBe(true);
  });

  it('draws the full 3x3 frame without real data', () => {
    renderAnchoringPoints(new paper.Rectangle(0, 0, 100, 100), style);
    expect(paths().filter(p => p.closed)).toHaveLength(9);
  });
});

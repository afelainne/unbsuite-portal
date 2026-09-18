import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  fitCircle, percentile, principalDirection, medialSamples, collectDiagonals, lineOffset,
  clusterCoordinates, MAX_UNDERLYING_CIRCLES,
  renderBezierHandles, renderParallelFlowLines, renderUnderlyingCircles, renderDominantDiagonals,
  renderCurvatureComb, renderSkeletonCenterline, renderConstructionGrid, renderPathDirectionArrows,
  renderTangentIntersections, renderAnchorPoints,
} from '../components/renderers/advanced';
import { MAX_RENDER_ITEMS, type RenderContext } from '../components/renderers/utils';

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

const allItems = () => scope.project.getItems({}) as paper.Item[];
const texts = () => allItems().filter(i => i instanceof paper.PointText) as paper.PointText[];
const paths = () => allItems().filter(i => i instanceof paper.Path) as paper.Path[];
const labelText = () => texts().map(t => t.content).join(' | ');
const finite = () => paths().every(p => [p.bounds.x, p.bounds.y, p.bounds.width, p.bounds.height].every(Number.isFinite));
const noBadNumbers = () => finite() && !/NaN|Infinity|undefined/.test(labelText());

function detached<T extends paper.Path>(p: T): T {
  p.remove();
  return p;
}

const R = (x: number, y: number, w: number, h: number) => new paper.Rectangle(x, y, w, h);
const ctx = (list: paper.Path[], extra: Partial<RenderContext> = {}): RenderContext =>
  ({ useRealData: true, actualPaths: list, ...extra });

describe('circle fitting', () => {
  it('recovers a circle exactly and reports a zero residual', () => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push({ x: 30 + 12 * Math.cos(a), y: -5 + 12 * Math.sin(a) });
    }
    const fit = fitCircle(pts)!;
    expect(fit.cx).toBeCloseTo(30, 6);
    expect(fit.cy).toBeCloseTo(-5, 6);
    expect(fit.r).toBeCloseTo(12, 6);
    expect(fit.rms).toBeLessThan(1e-6);
  });

  it('rejects what is not a circle', () => {
    expect(fitCircle([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBeNull();
    expect(fitCircle([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }])).toBeNull();
    expect(fitCircle([{ x: NaN, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 3 }])).toBeNull(); // NaN dropped => 2 points
    const square = fitCircle([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 0 }])!;
    expect(square.rms).toBeGreaterThan(square.r * 0.04);
  });

  it('only draws circles the artwork really contains', () => {
    const circle = detached(new paper.Path.Circle(new paper.Point(100, 100), 40));
    const square = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 200, 200)));
    renderUnderlyingCircles(R(0, 0, 200, 200), style, ctx([circle, square], { unitsPerPixel: 1 }));
    const drawn = paths().filter(p => p.closed);
    expect(drawn).toHaveLength(1);
    expect(drawn[0].bounds.width).toBeCloseTo(80, 1); // paper approximates a circle with 4 beziers
    expect(labelText()).toContain('r 40u');
    expect(noBadNumbers()).toBe(true);
  });

  it('stays capped on busy artwork', () => {
    const list: paper.Path[] = [];
    for (let i = 0; i < 40; i++) list.push(detached(new paper.Path.Circle(new paper.Point(i * 50, 0), 10 + i)));
    renderUnderlyingCircles(R(0, -60, 2000, 120), style, ctx(list));
    expect(paths().filter(p => p.closed).length).toBeLessThanOrEqual(MAX_UNDERLYING_CIRCLES);
  });
});

describe('dominant diagonals', () => {
  it('merges collinear edges that are far apart and keeps parallel ones apart', () => {
    const a = detached(new paper.Path([new paper.Point(0, 100), new paper.Point(40, 60)]));
    const b = detached(new paper.Path([new paper.Point(60, 40), new paper.Point(100, 0)]));  // same line
    const c = detached(new paper.Path([new paper.Point(0, 200), new paper.Point(100, 100)])); // parallel, offset
    const merged = collectDiagonals([a, b], 5, 10);
    expect(merged).toHaveLength(1);
    expect(merged[0].angle).toBeCloseTo(45, 4);
    expect(collectDiagonals([a, b, c], 5, 10)).toHaveLength(2);
  });

  it('skips horizontals, verticals and curves', () => {
    const h = detached(new paper.Path([new paper.Point(0, 0), new paper.Point(100, 0)]));
    const v = detached(new paper.Path([new paper.Point(0, 0), new paper.Point(0, 100)]));
    const curve = detached(new paper.Path.Circle(new paper.Point(50, 50), 40));
    expect(collectDiagonals([h, v, curve], 5, 10)).toHaveLength(0);
  });

  it('lineOffset is the same for every point of one line', () => {
    expect(lineOffset(0, 100, 45)).toBeCloseTo(lineOffset(100, 0, 45), 9);
    expect(lineOffset(0, 0, 45)).not.toBeCloseTo(lineOffset(0, 100, 45), 3);
    expect(lineOffset(0, 0, 0)).toBe(0);
  });

  it('labels the angle the way a designer reads it', () => {
    const up = detached(new paper.Path([new paper.Point(0, 200), new paper.Point(200, 0)]));
    renderDominantDiagonals(R(0, 0, 200, 200), style, ctx([up]));
    expect(labelText()).toContain('45°');
    expect(labelText()).not.toContain('135°');
    expect(noBadNumbers()).toBe(true);
  });
});

describe('parallel flow lines', () => {
  it('groups the real directions of the artwork', () => {
    const a = detached(new paper.Path([new paper.Point(0, 100), new paper.Point(100, 0)]));
    const b = detached(new paper.Path([new paper.Point(0, 200), new paper.Point(100, 100)]));
    renderParallelFlowLines(R(0, 0, 200, 200), style, ctx([a, b]), 3);
    expect(labelText()).toMatch(/45° \(2\)/);
    expect(noBadNumbers()).toBe(true);
  });

  it('does nothing without real data', () => {
    renderParallelFlowLines(R(0, 0, 200, 200), style, undefined, 3);
    expect(paths()).toHaveLength(0);
  });
});

describe('curvature comb', () => {
  it('uses the real curvature: a tighter arc gets a longer tooth', () => {
    const big = detached(new paper.Path.Circle(new paper.Point(100, 100), 80));
    const small = detached(new paper.Path.Circle(new paper.Point(400, 100), 20));
    renderCurvatureComb(R(0, 0, 500, 200), style, ctx([big, small]));
    const teeth = paths().filter(p => p.segments.length === 2);
    expect(teeth.length).toBeGreaterThan(10);
    const near = (x: number) => teeth.filter(t => Math.abs(t.firstSegment.point.x - x) < 120);
    const lenOf = (list: paper.Path[]) => list.reduce((s, t) => s + t.length, 0) / Math.max(1, list.length);
    const bigTooth = lenOf(near(100));
    const smallTooth = lenOf(near(400));
    expect(smallTooth).toBeGreaterThan(bigTooth * 3);   // 1/20 vs 1/80 => 4×
    expect(smallTooth / bigTooth).toBeLessThan(5);
    expect(noBadNumbers()).toBe(true);
  });

  it('respects the global item budget', () => {
    const list: paper.Path[] = [];
    for (let i = 0; i < 400; i++) {
      list.push(detached(new paper.Path.Circle(new paper.Point((i % 20) * 30, Math.floor(i / 20) * 30), 10)));
    }
    renderCurvatureComb(R(0, 0, 600, 600), style, ctx(list));
    expect(scope.project.activeLayer.children.length).toBeLessThanOrEqual(MAX_RENDER_ITEMS);
  });

  it('ignores a flat path instead of dividing by zero', () => {
    const line = detached(new paper.Path([new paper.Point(0, 0), new paper.Point(100, 0)]));
    renderCurvatureComb(R(0, 0, 100, 100), style, ctx([line]));
    expect(paths()).toHaveLength(0);
  });
});

describe('skeleton / medial axis', () => {
  it('follows the stroke axis, not the bbox diagonal', () => {
    const bar = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 200, 20)));
    const samples = medialSamples(bar, 48);
    expect(samples.length).toBeGreaterThan(10);
    const median = samples.map(s => s.half).sort((a, b) => a - b)[samples.length >> 1];
    expect(median).toBeCloseTo(10, 1);

    renderSkeletonCenterline(R(0, 0, 200, 20), style, ctx([bar], { unitsPerPixel: 1 }));
    const skeleton = paths().find(p => (p.dashArray?.length ?? 0) > 0 && p.segments.length > 2)!;
    expect(skeleton).toBeDefined();
    expect(skeleton.bounds.height).toBeLessThan(4);          // a diagonal would be ~20 tall
    expect(skeleton.bounds.width).toBeGreaterThan(100);
    expect(skeleton.bounds.center.y).toBeCloseTo(10, 0);
    expect(labelText()).toContain('stem 20u');
  });

  it('collapses to nothing meaningful on a round blob and skips open paths', () => {
    const disc = detached(new paper.Path.Circle(new paper.Point(100, 100), 50));
    const axis = medialSamples(disc, 32);
    expect(axis.length).toBeGreaterThan(5);
    for (const s of axis) {
      expect(Math.hypot(s.x - 100, s.y - 100)).toBeLessThan(0.5);   // every chord is a diameter
    }
    const open = detached(new paper.Path([new paper.Point(0, 0), new paper.Point(10, 10)]));
    expect(medialSamples(open, 16)).toHaveLength(0);
  });

  it('principalDirection finds the axis of a point cloud', () => {
    const along = [{ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 5 }];
    expect(Math.abs(principalDirection(along).x)).toBeCloseTo(1, 6);
    const up = [{ x: 3, y: 0 }, { x: 3, y: 10 }, { x: 3, y: 20 }];
    expect(Math.abs(principalDirection(up).y)).toBeCloseTo(1, 6);
    expect(principalDirection([]).x).toBe(1);
  });
});

describe('construction grid', () => {
  it('clusters repeated coordinates and ignores one-offs', () => {
    const c = clusterCoordinates([0, 0.4, 10, 10.2, 55], 1);
    expect(c).toHaveLength(2);
    expect(c[0].count).toBe(2);
    expect(c.map(x => Math.round(x.value)).sort((a, b) => a - b)).toEqual([0, 10]);
    expect(clusterCoordinates([1, 2, 3], 0)).toHaveLength(0);
    expect(clusterCoordinates([NaN, NaN], 1)).toHaveLength(0);
  });

  it('derives the grid from the real nodes', () => {
    const a = detached(new paper.Path.Rectangle(new paper.Rectangle(20, 20, 60, 60)));
    const b = detached(new paper.Path.Rectangle(new paper.Rectangle(20, 120, 60, 60)));
    renderConstructionGrid(R(0, 0, 200, 200), style, ctx([a, b], { unitsPerPixel: 1 }));
    const xs = paths().filter(p => p.bounds.width < 1).map(p => Math.round(p.bounds.center.x)).sort((m, n) => m - n);
    expect(xs).toEqual([20, 80]);
    expect(labelText()).toMatch(/2×4 grid/);
    expect(noBadNumbers()).toBe(true);
  });
});

describe('direction arrows', () => {
  it('sits at the middle of each segment and points along the tangent', () => {
    const sq = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 100, 100)));
    renderPathDirectionArrows(R(0, 0, 100, 100), style, ctx([sq]));
    const arrows = paths().filter(p => p.closed);
    expect(arrows).toHaveLength(4);
    const centers = arrows.map(a => a.bounds.center);
    const edgeMids = [{ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }];
    for (const mid of edgeMids) {
      expect(centers.some(c => Math.hypot(c.x - mid.x, c.y - mid.y) < 6)).toBe(true);
    }
    expect(noBadNumbers()).toBe(true);
  });

  it('scales the head with the scene', () => {
    const small = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 40, 40)));
    renderPathDirectionArrows(R(0, 0, 40, 40), style, ctx([small]));
    const a = paths().filter(p => p.closed)[0].bounds.width;
    scope.project.clear();
    const big = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 4000, 4000)));
    renderPathDirectionArrows(R(0, 0, 4000, 4000), style, ctx([big]));
    const b = paths().filter(p => p.closed)[0].bounds.width;
    expect(b).toBeGreaterThan(a * 10);
  });
});

describe('tangent intersections', () => {
  it('caps the dashed construction lines, not only the markers', () => {
    const list: paper.Path[] = [];
    for (let i = 0; i < 60; i++) list.push(detached(new paper.Path.Circle(new paper.Point(i * 40, (i % 5) * 40), 15)));
    renderTangentIntersections(R(0, 0, 2400, 200), style, ctx(list));
    const markers = paths().filter(p => p.closed);
    const dashed = paths().filter(p => (p.dashArray?.length ?? 0) > 0);
    expect(markers.length).toBeLessThanOrEqual(20);
    expect(dashed.length).toBeLessThanOrEqual(markers.length * 2);
    expect(noBadNumbers()).toBe(true);
  });

  it('finds the corner point of a quarter arc', () => {
    const arc = detached(new paper.Path.Arc(new paper.Point(0, 100), new paper.Point(29.29, 29.29), new paper.Point(100, 0)));
    renderTangentIntersections(R(0, 0, 100, 100), style, ctx([arc]));
    const marker = paths().find(p => p.closed);
    expect(marker).toBeDefined();
    expect(marker!.bounds.center.x).toBeCloseTo(0, 0);
    expect(marker!.bounds.center.y).toBeCloseTo(0, 0);
  });
});

describe('anchor points and handles', () => {
  it('counts every node of every subpath', () => {
    const a = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 40, 40)));
    const b = detached(new paper.Path.Circle(new paper.Point(80, 20), 15));
    renderAnchorPoints(R(0, 0, 100, 40), style, ctx([a, b]), 3);
    expect(labelText()).toContain('8 pts (4○ 4□)');
  });

  it('never leaks the dashed outline into the logo group', () => {
    const group = new paper.Group();
    const logo = new paper.Path.Rectangle(new paper.Rectangle(0, 0, 40, 40));
    group.addChild(logo);
    const layer = new paper.Layer();
    layer.activate();
    renderAnchorPoints(R(0, 0, 40, 40), style, ctx([logo]), 3);
    expect(group.children).toHaveLength(1);
    expect(layer.children.length).toBeGreaterThan(4);
  });

  it('bezier handles scale and survive zero-size original bounds', () => {
    const seg = { anchor: { x: 0, y: 5 }, handleIn: { x: -1, y: 5 }, handleOut: { x: 1, y: 5 }, hasHandleIn: true, hasHandleOut: true };
    renderBezierHandles([seg], R(0, 5, 10, 0), R(0, 0, 100, 100), style);
    expect(paths().length).toBeGreaterThan(0);
    expect(finite()).toBe(true);
    const smallDot = paths().filter(p => p.closed)[0].bounds.width;
    scope.project.clear();
    renderBezierHandles([seg], R(0, 5, 10, 0), R(0, 0, 4000, 4000), style);
    const bigDot = paths().filter(p => p.closed)[0].bounds.width;
    expect(bigDot).toBeGreaterThan(smallDot * 10);
  });

  it('uses every subpath of the real artwork', () => {
    const a = detached(new paper.Path.Circle(new paper.Point(20, 20), 10));
    const b = detached(new paper.Path.Circle(new paper.Point(60, 20), 10));
    renderBezierHandles([], R(0, 0, 80, 40), R(0, 0, 80, 40), style, ctx([a, b]), { showHandles: false });
    expect(paths().filter(p => p.closed)).toHaveLength(8); // 4 anchors × 2 subpaths
  });
});

describe('degenerate input never throws', () => {
  it.each([
    ['zero size', R(0, 0, 0, 0)],
    ['flat', R(0, 0, 100, 0)],
    ['NaN origin', R(NaN, 0, 10, 10)],
    ['microscopic', R(0, 0, 0.4, 0.2)],
    ['enormous', R(0, 0, 40000, 20000)],
  ] as const)('%s', (_name, rect) => {
    const art = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, Math.max(1, rect.width || 1), Math.max(1, rect.height || 1))));
    const c = ctx([art], { unitsPerPixel: 1 });
    expect(() => {
      renderParallelFlowLines(rect, style, c, 5);
      renderUnderlyingCircles(rect, style, c);
      renderDominantDiagonals(rect, style, c);
      renderCurvatureComb(rect, style, c);
      renderSkeletonCenterline(rect, style, c);
      renderConstructionGrid(rect, style, c);
      renderPathDirectionArrows(rect, style, c);
      renderTangentIntersections(rect, style, c);
      renderAnchorPoints(rect, style, c, 3);
      renderBezierHandles([], rect, rect, style, c);
    }).not.toThrow();
    expect(noBadNumbers()).toBe(true);
    expect(paths().every(p => p.strokeWidth === 0 || p.strokeWidth >= 0.4)).toBe(true);
  });
});

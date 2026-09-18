import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mergeRuns, inkShapes, scanInk, inkMassProfile,
  detectTypeHeights, detectSlant, measureStrokeWeight, reductionSteps,
  detectCornerRadii, clusterRadii,
  renderInkHeightBands, renderSlantAngle, renderStrokeWeight, renderReductionTest, renderCornerRadii,
  REDUCTION_SIZES, type StrokeWeightStats, type Box,
} from '../components/renderers/extra';
import { MAX_RENDER_ITEMS, type RenderContext } from '../components/renderers/utils';
import { parseSVG, resetPaperProject } from '../lib/svg-engine';
import { renderScene } from '../lib/render-pipeline';
import { createDefaultGeometryStyles } from '../lib/preset-engine';
import { GEOMETRY_KEYS, type GeometryOptions } from '../types/geometry';

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

const paths = () => scope.project.getItems({ class: paper.Path }) as paper.Path[];
const texts = () => scope.project.getItems({ class: paper.PointText }) as paper.PointText[];
const allText = () => texts().map(t => String(t.content)).join(' | ');
const allFinite = () => scope.project.getItems({}).every(i =>
  [i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));

/** A filled, detached rectangle (what the pipeline hands the renderers). */
function bar(x: number, y: number, w: number, h: number): paper.Path {
  const p = new paper.Path.Rectangle(new paper.Rectangle(x, y, w, h));
  p.fillColor = new paper.Color('black');
  p.remove();
  return p;
}

const ctxOf = (items: paper.Path[], box: paper.Rectangle): RenderContext =>
  ({ useRealData: true, actualPaths: items, contentBounds: box });

describe('ink scanning', () => {
  it('merges runs and measures exact coverage', () => {
    expect(mergeRuns([[0, 5], [3, 8], [20, 25]])).toEqual([[0, 8], [20, 25]]);
    expect(mergeRuns([[5, 5]])).toEqual([]);
    expect(mergeRuns([])).toEqual([]);

    const shapes = inkShapes([bar(0, 0, 40, 100), bar(60, 0, 20, 100)]);
    const scan = scanInk(shapes, { x: 0, y: 0, width: 100, height: 100 }, 50);
    expect(scan.ys).toHaveLength(50);
    for (const runs of scan.runs) {
      expect(runs).toHaveLength(2);
      expect(runs[0][0]).toBeCloseTo(0, 6);
      expect(runs[0][1]).toBeCloseTo(40, 6);
    }
    for (const c of scan.covered) expect(c).toBeCloseTo(60, 6);
    expect(scan.covered.every(Number.isFinite)).toBe(true);
  });

  it('turns unfilled strokes into ribbons and survives empty input', () => {
    const line = new paper.Path([new paper.Point(10, 0), new paper.Point(10, 100)]);
    line.strokeColor = new paper.Color('black');
    line.strokeWidth = 6;
    line.remove();
    const scan = scanInk(inkShapes([line]), { x: 0, y: 0, width: 100, height: 100 }, 20);
    for (const c of scan.covered) expect(c).toBeCloseTo(6, 6);
    expect(inkShapes([])).toEqual([]);
    expect(scanInk([], { x: 0, y: 0, width: 10, height: 10 }, 8).covered.every(v => v === 0)).toBe(true);
  });

  it('reports where the mass sits', () => {
    const box: Box = { x: 0, y: 0, width: 200, height: 100 };
    const profile = inkMassProfile([bar(0, 0, 100, 100)], box)!;
    expect(profile.x.q25).toBeCloseTo(25, 0);
    expect(profile.x.q50).toBeCloseTo(50, 0);
    expect(profile.x.q75).toBeCloseTo(75, 0);
    expect(profile.y.q50).toBeCloseTo(50, 0);
    expect(profile.density).toBeCloseTo(0.5, 2);
    expect(profile.peakRatio).toBeCloseTo(1, 2);
    expect(inkMassProfile([], box)).toBeNull();
  });
});

describe('cap-height / x-height from the real ink', () => {
  it('finds the cap line, the x-height step and the baseline', () => {
    // a 100 tall stem + a 60 tall block starting at y = 40
    const items = [bar(0, 0, 10, 100), bar(20, 40, 50, 60)];
    const h = detectTypeHeights(items, { x: 0, y: 0, width: 70, height: 100 })!;
    expect(h).not.toBeNull();
    expect(h.capY).toBeCloseTo(0, 1);
    expect(h.baselineY).toBeCloseTo(100, 1);
    expect(h.descenderY).toBeCloseTo(100, 1);
    expect(Math.abs(h.xY! - 40)).toBeLessThanOrEqual(1.5);
    expect(h.capHeight).toBeCloseTo(100, 1);
    expect(h.ratio!).toBeGreaterThan(0.55);
    expect(h.ratio!).toBeLessThan(0.65);
  });

  it('separates the baseline from the descender', () => {
    const items = [bar(0, 0, 10, 100), bar(20, 40, 50, 60), bar(25, 100, 10, 20)];
    const h = detectTypeHeights(items, { x: 0, y: 0, width: 70, height: 120 })!;
    expect(Math.abs(h.baselineY - 100)).toBeLessThanOrEqual(1.5);
    expect(h.descenderY).toBeCloseTo(120, 1);
    expect(h.descenderY - h.baselineY).toBeGreaterThan(15);
  });

  it('returns null instead of inventing lines', () => {
    expect(detectTypeHeights([], { x: 0, y: 0, width: 10, height: 10 })).toBeNull();
    // a single flat block has no x-height step
    const h = detectTypeHeights([bar(0, 0, 50, 50)], { x: 0, y: 0, width: 50, height: 50 })!;
    expect(h.xY).toBeNull();
    expect(h.ratio).toBeNull();
  });

  it('renders labelled bands and stays finite', () => {
    const box = new paper.Rectangle(0, 0, 70, 100);
    const items = [bar(0, 0, 10, 100), bar(20, 40, 50, 60)];
    renderInkHeightBands(box, style, ctxOf(items, box));
    expect(allText()).toMatch(/cap/);
    expect(allText()).toMatch(/x\/cap 6\d%/);
    expect(allText()).toMatch(/baseline/);
    expect(allFinite()).toBe(true);

    scope.project.clear();
    expect(() => renderInkHeightBands(box, style)).not.toThrow();
    expect(() => renderInkHeightBands(new paper.Rectangle(0, 0, 0, 0), style, { useRealData: true, actualPaths: items })).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('slant detection', () => {
  const slanted = (deg: number) => {
    const dx = 100 * Math.tan((deg * Math.PI) / 180);
    const p = new paper.Path([
      new paper.Point(dx, 0), new paper.Point(dx + 12, 0),
      new paper.Point(12, 100), new paper.Point(0, 100),
    ]);
    p.closed = true;
    p.fillColor = new paper.Color('black');
    p.remove();
    return p;
  };

  it('measures the angle of the vertical stems', () => {
    const s = detectSlant([slanted(12)])!;
    expect(s.angle).toBeCloseTo(12, 4);
    expect(s.consistency).toBeCloseTo(1, 6);

    const back = detectSlant([slanted(-8)])!;
    expect(back.angle).toBeCloseTo(-8, 4);

    const upright = detectSlant([bar(0, 0, 20, 100)])!;
    expect(upright.angle).toBeCloseTo(0, 9);
    expect(upright.consistency).toBeCloseTo(1, 6);
  });

  it('ignores horizontal edges and gives up when there is no stem', () => {
    // a flat bar: only horizontal segments carry no slant information
    const flat = detectSlant([bar(0, 0, 200, 4)]);
    expect(flat === null || Math.abs(flat.angle) < 1e-6).toBe(true);
    expect(detectSlant([])).toBeNull();
    const diagonal = new paper.Path([new paper.Point(0, 0), new paper.Point(100, 10)]);
    diagonal.strokeColor = new paper.Color('black');
    diagonal.strokeWidth = 1;
    diagonal.remove();
    expect(detectSlant([diagonal], 5)).toBeNull(); // ~84° off vertical: not a stem
  });

  it('renders the measured angle', () => {
    const box = new paper.Rectangle(0, 0, 120, 100);
    renderSlantAngle(box, style, ctxOf([slanted(12)], box));
    expect(allText()).toMatch(/slant \+12\.0°/);
    expect(allFinite()).toBe(true);
    scope.project.clear();
    expect(() => renderSlantAngle(box, style)).not.toThrow();
    expect(() => renderSlantAngle(new paper.Rectangle(0, 0, 0, 0), style, { useRealData: true, actualPaths: [slanted(3)] })).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('stroke weight', () => {
  const box: Box = { x: 0, y: 0, width: 90, height: 100 };
  const items = () => [bar(0, 0, 10, 100), bar(30, 0, 60, 20)];

  it('measures the thinnest, the median and the thickest stem', () => {
    const s = measureStrokeWeight(items(), box)!;
    expect(s.min).toBeCloseTo(10, 1);
    expect(s.max).toBeCloseTo(20, 1);
    expect(s.median).toBeGreaterThanOrEqual(10);
    expect(s.median).toBeLessThanOrEqual(20);
    expect(s.minAt!.x).toBeCloseTo(5, 0);
    expect(s.minGap).toBeCloseTo(20, 1); // the empty band between the two bars
    expect(s.samples).toBeGreaterThan(50);
    expect(measureStrokeWeight([], box)).toBeNull();
  });

  it('renders the report and marks the thinnest place', () => {
    const rect = new paper.Rectangle(0, 0, 90, 100);
    renderStrokeWeight(rect, style, ctxOf(items(), rect));
    expect(allText()).toMatch(/thinnest/);
    expect(allText()).toMatch(/contrast 2\.0×/);
    expect(allFinite()).toBe(true);
    scope.project.clear();
    expect(() => renderStrokeWeight(rect, style)).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('reduction test', () => {
  const stats = (min: number, gap: number | null): StrokeWeightStats =>
    ({ min, median: min * 2, max: min * 3, minAt: { x: 0, y: 0 }, minGap: gap, minGapAt: null, samples: 10 });

  it('scales the thinnest detail down to each target size', () => {
    const steps = reductionSteps(stats(10, 20), 100);
    expect(steps.map(s => s.size)).toEqual(REDUCTION_SIZES);
    expect(steps[0].strokePx).toBeCloseTo(1.6, 6);  // 10/100 * 16
    expect(steps[3].strokePx).toBeCloseTo(4.8, 6);
    expect(steps.every(s => s.status === 'ok')).toBe(true);

    // a 4px stem on a 100px logo: gone at 16 and 24, fragile at 32
    const thin = reductionSteps(stats(4, null), 100);
    expect(thin.map(s => s.status)).toEqual(['lost', 'lost', 'risk', 'ok']);
    // a tight counter fails even when the stems are fat
    const tight = reductionSteps(stats(40, 1), 100);
    expect(tight[0].gapPx).toBeCloseTo(0.16, 6);
    expect(tight.every(s => s.status === 'lost')).toBe(true);
    expect(reductionSteps(stats(10, 20), 0)).toEqual([]);
  });

  it('draws one ghost per size with its verdict', () => {
    const rect = new paper.Rectangle(0, 0, 90, 100);
    const items = [bar(0, 0, 10, 100), bar(30, 0, 60, 20)];
    renderReductionTest(rect, style, ctxOf(items, rect));
    const labels = texts().map(t => String(t.content));
    for (const size of REDUCTION_SIZES) expect(labels).toContain(`${size}px`);
    // the ghosts live below the artwork and keep the aspect ratio
    const ghosts = paths().filter(p => p.bounds.top > rect.bottom);
    expect(ghosts.length).toBeGreaterThan(0);
    expect(allFinite()).toBe(true);
    expect(paths().length).toBeLessThan(MAX_RENDER_ITEMS);

    scope.project.clear();
    expect(() => renderReductionTest(rect, style)).not.toThrow();
    expect(() => renderReductionTest(new paper.Rectangle(0, 0, 0, 0), style, { useRealData: true, actualPaths: items })).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('corner radii', () => {
  const rounded = (r: number) => {
    const p = new paper.Path.Rectangle({ rectangle: new paper.Rectangle(0, 0, 200, 100), radius: r });
    p.fillColor = new paper.Color('black');
    p.remove();
    return p;
  };

  it('finds the four corner arcs and their radius', () => {
    const corners = detectCornerRadii([rounded(12)]);
    expect(corners).toHaveLength(4);
    const expected = [[12, 12], [188, 12], [188, 88], [12, 88]];
    for (const c of corners) {
      expect(Math.abs(c.radius - 12) / 12).toBeLessThan(0.01);
      expect(c.turn).toBeCloseTo(90, 3);
      const hit = expected.some(([x, y]) => Math.hypot(c.center.x - x, c.center.y - y) < 0.3);
      expect(hit).toBe(true);
    }
    const groups = clusterRadii(corners);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(4);
    expect(groups[0].radius).toBeCloseTo(12, 1);
  });

  it('separates inconsistent radii and ignores straight edges', () => {
    const corners = [...detectCornerRadii([rounded(4)]), ...detectCornerRadii([rounded(20)])];
    const groups = clusterRadii(corners);
    expect(groups).toHaveLength(2);
    expect(groups.map(g => g.count)).toEqual([4, 4]);
    expect(detectCornerRadii([bar(0, 0, 50, 50)])).toHaveLength(0);
    expect(detectCornerRadii([])).toHaveLength(0);
  });

  it('renders the osculating circles with a verdict', () => {
    const rect = new paper.Rectangle(0, 0, 200, 100);
    renderCornerRadii(rect, style, ctxOf([rounded(12)], rect));
    const circles = paths().filter(p => p.closed && Math.abs(p.bounds.width / 2 - 12) < 0.2);
    expect(circles).toHaveLength(4);
    expect(allText()).toMatch(/R .*×4/);
    expect(allFinite()).toBe(true);

    scope.project.clear();
    renderCornerRadii(rect, style, ctxOf([rounded(4), rounded(20)], rect));
    expect(allText()).toMatch(/2 radii/);

    scope.project.clear();
    expect(() => renderCornerRadii(rect, style)).not.toThrow();
    expect(() => renderCornerRadii(new paper.Rectangle(0, 0, 0, 0), style, { useRealData: true, actualPaths: [rounded(8)] })).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('pipeline wiring', () => {
  // NB: `<rect rx="8">` is imported by paper as a chamfer (it reads ry as 0),
  // so the fixture uses a real curve for the corner detector.
  const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
    <rect x="10" y="10" width="20" height="100" fill="#111"/>
    <circle cx="70" cy="70" r="30" fill="#111"/>
    <path d="M160 110 L180 10 L200 110" fill="none" stroke="#111" stroke-width="6"/>
  </svg>`;

  it('renders every construction, new ones included, without errors', () => {
    const parsed = parseSVG(LOGO);
    const on = Object.fromEntries(GEOMETRY_KEYS.map(k => [k, true])) as unknown as GeometryOptions;
    resetPaperProject(null, scope, { width: 800, height: 600 });
    const res = renderScene(
      parsed,
      {
        clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
        geometryOptions: on, geometryStyles: createDefaultGeometryStyles(),
      },
      { width: 800, height: 600 },
      { scope, layered: true },
    );
    expect(res.errors).toEqual([]);
    const layers = scope.project.layers.map(l => l.name);
    for (const key of ['ink-height-bands', 'slant-angle', 'stroke-weight', 'reduction-test', 'corner-radii']) {
      expect(layers).toContain(key);
    }
    const bad = scope.project.getItems({}).filter(i =>
      ![i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));
    expect(bad).toHaveLength(0);
  });
});

describe('extreme inputs never break the analysis', () => {
  it('handles a microscopic and a gigantic logo', () => {
    for (const [items, rect] of [
      [[bar(0, 0, 0.3, 0.9)], new paper.Rectangle(0, 0, 0.3, 0.9)],
      [[bar(0, 0, 90000, 120000)], new paper.Rectangle(0, 0, 90000, 120000)],
    ] as Array<[paper.Path[], paper.Rectangle]>) {
      const ctx = ctxOf(items, rect);
      expect(() => {
        renderInkHeightBands(rect, style, ctx);
        renderSlantAngle(rect, style, ctx);
        renderStrokeWeight(rect, style, ctx);
        renderReductionTest(rect, style, ctx);
        renderCornerRadii(rect, style, ctx);
      }).not.toThrow();
      expect(allFinite()).toBe(true);
      expect(paths().every(p => Number.isFinite(p.strokeWidth))).toBe(true);
      expect(texts().every(t => Number.isFinite(t.fontSize as number) && (t.fontSize as number) > 0)).toBe(true);
      scope.project.clear();
    }
  });

  it('survives a degenerate bbox and NaN coordinates', () => {
    const nanPath = new paper.Path([new paper.Point(NaN, 0), new paper.Point(10, 10)]);
    nanPath.remove();
    const rect = new paper.Rectangle(0, 0, 10, 0);
    const ctx: RenderContext = { useRealData: true, actualPaths: [nanPath] };
    expect(() => {
      renderInkHeightBands(rect, style, ctx);
      renderSlantAngle(rect, style, ctx);
      renderStrokeWeight(rect, style, ctx);
      renderReductionTest(rect, style, ctx);
      renderCornerRadii(rect, style, ctx);
    }).not.toThrow();
    expect(allFinite()).toBe(true);
  });
});

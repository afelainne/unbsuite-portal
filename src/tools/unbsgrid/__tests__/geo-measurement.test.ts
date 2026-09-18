import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  normalizeDeg, deltaDeg, orientationDeg, formatAngle, angleArcPoints, arcPointsBetween,
  interiorAngleDeg, measureMirrorSymmetry, extractCornerAngles, neighbourGaps, outlierIndex,
  clusterAlignments, describeRatio, refineComponentBoxes, LabelPlacer,
  renderSymmetryAxes, renderAngleMeasurements, renderSpacingGuides, renderAlignmentGuides,
  renderDynamicBaseline, renderComponentRatioLabels, renderHarmonicDivisions,
} from '../components/renderers/measurement';
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

const allItems = () => scope.project.getItems({}) as paper.Item[];
const texts = () => allItems().filter(i => i instanceof paper.PointText) as paper.PointText[];
const paths = () => allItems().filter(i => i instanceof paper.Path) as paper.Path[];
const labelText = () => texts().map(t => t.content).join(' | ');
const noBadNumbers = () =>
  !/NaN|Infinity|undefined/.test(labelText()) &&
  paths().every(p => [p.bounds.x, p.bounds.y, p.bounds.width, p.bounds.height].every(Number.isFinite));

/** Detached paths, so they act purely as "the real artwork". */
function detached<T extends paper.Path>(p: T): T {
  p.remove();
  return p;
}

const R = (x: number, y: number, w: number, h: number) => new paper.Rectangle(x, y, w, h);
const ctx = (paths: paper.Path[], extra: Partial<RenderContext> = {}): RenderContext =>
  ({ useRealData: true, actualPaths: paths, ...extra });

describe('angle math', () => {
  it('normalizeDeg covers 0 / 90 / 180 / 270 and negatives without -0', () => {
    expect(normalizeDeg(0)).toBe(0);
    expect(Object.is(normalizeDeg(-0), 0)).toBe(true);
    expect(normalizeDeg(90)).toBe(90);
    expect(normalizeDeg(180)).toBe(180);
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(-270)).toBe(90);
    expect(normalizeDeg(450)).toBe(90);
    expect(normalizeDeg(-360)).toBe(0);
    expect(normalizeDeg(NaN)).toBe(0);
    expect(normalizeDeg(Infinity)).toBe(0);
  });

  it('deltaDeg always returns the short way round', () => {
    expect(deltaDeg(350, 10)).toBeCloseTo(20);
    expect(deltaDeg(10, 350)).toBeCloseTo(-20);
    expect(deltaDeg(0, 180)).toBeCloseTo(180);
    expect(deltaDeg(0, -180)).toBeCloseTo(180);
    expect(deltaDeg(0, 190)).toBeCloseTo(-170);
    expect(Math.abs(deltaDeg(0, 0))).toBe(0);
    for (let a = -720; a <= 720; a += 37) {
      for (let b = -720; b <= 720; b += 53) {
        const d = deltaDeg(a, b);
        expect(Math.abs(d)).toBeLessThanOrEqual(180);
      }
    }
  });

  it('orientationDeg reads screen deltas the way a designer does', () => {
    expect(orientationDeg(1, 0)).toBe(0);
    expect(orientationDeg(-1, 0)).toBe(0);
    expect(orientationDeg(1, -1)).toBeCloseTo(45);   // up to the right
    expect(orientationDeg(-1, 1)).toBeCloseTo(45);   // same line, other way
    expect(orientationDeg(0, -1)).toBeCloseTo(90);
    expect(orientationDeg(0, 1)).toBeCloseTo(90);
    expect(orientationDeg(1, 1)).toBeCloseTo(135);   // down to the right
    expect(orientationDeg(0, 0)).toBe(0);
    expect(orientationDeg(NaN, 2)).toBe(0);
    for (let i = 0; i < 360; i += 7) {
      const v = orientationDeg(Math.cos(i), Math.sin(i));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(180);
    }
  });

  it('formatAngle normalizes, rounds and never prints -0', () => {
    expect(formatAngle(0)).toBe('0°');
    expect(formatAngle(-0)).toBe('0°');
    expect(formatAngle(90)).toBe('90°');
    expect(formatAngle(-90)).toBe('270°');
    expect(formatAngle(180)).toBe('180°');
    expect(formatAngle(360)).toBe('0°');
    expect(formatAngle(359.99)).toBe('0°');
    expect(formatAngle(45.02)).toBe('45°');
    expect(formatAngle(45.5)).toBe('45.5°');
    expect(formatAngle(NaN)).toBe('0°');
  });

  it('arcPointsBetween always describes the MINOR arc', () => {
    const cases: [number, number][] = [[0, 350], [0, 10], [170, -170], [-30, 30], [0, 180], [90, 270]];
    for (const [a, b] of cases) {
      const p = arcPointsBetween(0, 0, 10, a, b);
      expect(Math.abs(p.sweep)).toBeLessThanOrEqual(180 + 1e-9);
      expect(Math.hypot(p.through.x, p.through.y)).toBeCloseTo(10);
      expect(Math.hypot(p.from.x, p.from.y)).toBeCloseTo(10);
      expect(Math.hypot(p.to.x, p.to.y)).toBeCloseTo(10);
      // The mid point really sits between the two ends.
      expect(Math.abs(deltaDeg(a, p.midDeg))).toBeLessThanOrEqual(Math.abs(p.sweep) / 2 + 1e-6);
    }
    // 0° -> 350° is a 10° arc, not a 350° one.
    expect(arcPointsBetween(0, 0, 10, 0, 350).sweep).toBeCloseTo(-10);
  });

  it('angleArcPoints keeps its y-up convention', () => {
    const p = angleArcPoints(0, 0, 10, 60);
    expect(Math.hypot(p.through.x, p.through.y)).toBeCloseTo(10);
    expect((Math.atan2(-p.through.y, p.through.x) * 180) / Math.PI).toBeCloseTo(30);
  });

  it('interiorAngleDeg measures real corners', () => {
    expect(interiorAngleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(interiorAngleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
    expect(interiorAngleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(0);
    expect(interiorAngleDeg({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: -1 })).toBeCloseTo(90);
    expect(Number.isNaN(interiorAngleDeg({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }))).toBe(true);
  });
});

describe('real mirror symmetry', () => {
  const tol = (p: paper.Path) => Math.hypot(p.bounds.width, p.bounds.height) * 0.04;

  it('a circle is symmetric on both axes', () => {
    const c = detached(new paper.Path.Circle(new paper.Point(100, 100), 40));
    const v = measureMirrorSymmetry([c], 'vertical', 100, tol(c));
    const h = measureMirrorSymmetry([c], 'horizontal', 100, tol(c));
    expect(v.percent).toBeGreaterThan(99);
    expect(h.percent).toBeGreaterThan(99);
    expect(v.meanDeviation).toBeLessThan(0.5);
    expect(v.samples).toBeGreaterThan(10);
  });

  it('a rectangle is symmetric, a right triangle is not', () => {
    const rect = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 120, 60)));
    const rv = measureMirrorSymmetry([rect], 'vertical', 60, tol(rect));
    expect(rv.percent).toBeGreaterThan(99);

    const tri = detached(new paper.Path([
      new paper.Point(0, 0), new paper.Point(120, 0), new paper.Point(0, 60),
    ]));
    tri.closed = true;
    const tv = measureMirrorSymmetry([tri], 'vertical', tri.bounds.center.x, tol(tri));
    expect(tv.percent).toBeLessThan(60);
    expect(tv.percent).toBeLessThan(rv.percent - 30);
  });

  it('an L shape breaks both axes but a cross keeps them', () => {
    const l = detached(new paper.Path([
      new paper.Point(0, 0), new paper.Point(0, 100), new paper.Point(60, 100), new paper.Point(60, 80),
      new paper.Point(20, 80), new paper.Point(20, 0),
    ]));
    l.closed = true;
    const lv = measureMirrorSymmetry([l], 'vertical', l.bounds.center.x, tol(l));
    expect(lv.percent).toBeLessThan(70);

    const a = detached(new paper.Path.Rectangle(new paper.Rectangle(40, 0, 20, 100)));
    const b = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 40, 100, 20)));
    const cv = measureMirrorSymmetry([a, b], 'vertical', 50, 100 * 0.04);
    const ch = measureMirrorSymmetry([a, b], 'horizontal', 50, 100 * 0.04);
    expect(cv.percent).toBeGreaterThan(95);
    expect(ch.percent).toBeGreaterThan(95);
  });

  it('degenerate input yields a neutral reading instead of NaN', () => {
    expect(measureMirrorSymmetry([], 'vertical', 0, 10).percent).toBe(0);
    expect(measureMirrorSymmetry(undefined, 'vertical', 0, 10).samples).toBe(0);
    const c = detached(new paper.Path.Circle(new paper.Point(0, 0), 10));
    expect(measureMirrorSymmetry([c], 'vertical', NaN, 10).percent).toBe(0);
    expect(measureMirrorSymmetry([c], 'vertical', 0, 0).percent).toBe(0);
    const res = measureMirrorSymmetry([c], 'vertical', 0, 5);
    expect(Number.isFinite(res.percent)).toBe(true);
  });

  it('symmetryAxes reports the measured percentage', () => {
    const c = detached(new paper.Path.Circle(new paper.Point(100, 100), 40));
    renderSymmetryAxes(R(60, 60, 80, 80), [], style, ctx([c], { contentBounds: c.bounds }));
    expect(labelText()).toMatch(/SYM V \d+%/);
    expect(labelText()).toMatch(/SYM V (100|99)%/);
    expect(noBadNumbers()).toBe(true);
  });

  it('symmetryAxes survives a degenerate bbox and draws nothing silly', () => {
    expect(() => renderSymmetryAxes(R(0, 0, 100, 0), [R(0, 0, 100, 0)], style)).not.toThrow();
    expect(noBadNumbers()).toBe(true);
  });
});

describe('corner angles from the real artwork', () => {
  it('finds the 90° corners of a square', () => {
    const sq = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 100, 100)));
    const corners = extractCornerAngles([sq], 5, 10);
    expect(corners.length).toBe(4);
    for (const c of corners) expect(c.angle).toBeCloseTo(90, 4);
  });

  it('finds the 45° tip of a triangle and skips smooth joins', () => {
    const tri = detached(new paper.Path([
      new paper.Point(0, 0), new paper.Point(100, 0), new paper.Point(0, 100),
    ]));
    tri.closed = true;
    const angles = extractCornerAngles([tri], 5, 10).map(c => Math.round(c.angle)).sort((a, b) => a - b);
    expect(angles).toEqual([45, 45, 90]);

    const circle = detached(new paper.Path.Circle(new paper.Point(0, 0), 50));
    expect(extractCornerAngles([circle], 5, 10)).toHaveLength(0);
  });

  it('renders the real angles as labels', () => {
    const tri = detached(new paper.Path([
      new paper.Point(0, 200), new paper.Point(200, 200), new paper.Point(0, 0),
    ]));
    tri.closed = true;
    renderAngleMeasurements(R(0, 0, 200, 200), [], style, ctx([tri], { contentBounds: tri.bounds }));
    const content = labelText();
    expect(content).toContain('90°');
    expect(content).toContain('45°');
    expect(noBadNumbers()).toBe(true);
  });

  it('keeps the bounding-box reading when there is no real data', () => {
    renderAngleMeasurements(R(0, 0, 400, 400), [], style);
    expect(labelText()).toContain('45°');
  });
});

describe('spacing from real neighbours', () => {
  it('only measures adjacent, overlapping boxes', () => {
    const boxes = [R(0, 0, 50, 50), R(100, 0, 50, 50), R(200, 0, 50, 50)];
    const gaps = neighbourGaps(boxes, 'x');
    expect(gaps).toHaveLength(2);
    expect(gaps.every(g => Math.abs(g.gap - 50) < 1e-9)).toBe(true);
    // 0 and 2 are not neighbours: 1 sits between them.
    expect(gaps.some(g => (g.a === 0 && g.b === 2) || (g.a === 2 && g.b === 0))).toBe(false);
  });

  it('ignores pairs that do not share a band', () => {
    const boxes = [R(0, 0, 50, 50), R(100, 500, 50, 50)];
    expect(neighbourGaps(boxes, 'x')).toHaveLength(0);
    expect(neighbourGaps(boxes, 'y')).toHaveLength(0);
    expect(neighbourGaps([R(0, 0, 50, 50), R(0, 100, 50, 50)], 'y')).toHaveLength(1);
  });

  it('flags the odd gap out', () => {
    expect(outlierIndex([10, 10, 10])).toBe(-1);
    expect(outlierIndex([10, 10, 40])).toBe(2);
    expect(outlierIndex([10, 10])).toBe(-1);
    expect(outlierIndex([0, 0, 0])).toBe(-1);
  });

  it('labels the gap in SVG units and draws one dimension per gap', () => {
    renderSpacingGuides(R(0, 0, 300, 50), [R(0, 0, 50, 50), R(150, 0, 50, 50)], style, { unitsPerPixel: 0.1 });
    expect(texts().map(t => t.content)).toContain('10u');
    expect(texts()).toHaveLength(1);
    expect(noBadNumbers()).toBe(true);
  });

  it('uses the real ink instead of the mapped component box', () => {
    // Component boxes are far too wide; the ink inside them is not.
    const a = detached(new paper.Path.Rectangle(new paper.Rectangle(10, 10, 20, 20)));
    const b = detached(new paper.Path.Rectangle(new paper.Rectangle(110, 10, 20, 20)));
    const comps = [R(0, 0, 50, 50), R(100, 0, 50, 50)];
    const refined = refineComponentBoxes(comps, ctx([a, b]));
    expect(refined[0].left).toBeCloseTo(10);
    expect(refined[1].left).toBeCloseTo(110);
    renderSpacingGuides(R(0, 0, 150, 50), comps, style, ctx([a, b], { unitsPerPixel: 1 }));
    expect(texts().map(t => t.content)).toContain('80u'); // 110 - 30, not 100 - 50
  });

  it('keeps the original boxes when there is no real data', () => {
    const comps = [R(0, 0, 50, 50)];
    expect(refineComponentBoxes(comps, undefined)).toBe(comps);
    expect(refineComponentBoxes(comps, { useRealData: false, actualPaths: [] })).toBe(comps);
  });
});

describe('alignment clustering', () => {
  it('draws one guide per group instead of one per pair', () => {
    const boxes = [R(0, 0, 40, 40), R(0, 100, 40, 40), R(0, 200, 40, 40)];
    const clusters = clusterAlignments(boxes, 2);
    const left = clusters.find(c => c.kind === 'left');
    expect(left?.count).toBe(3);
    expect(left?.spread).toBeCloseTo(0);
    renderAlignmentGuides(R(0, 0, 40, 240), boxes, style);
    // 3 boxes sharing left/centerX/right => 3 lines, not 3 pairs × 3 edges.
    expect(paths().length).toBeLessThanOrEqual(4);
  });

  it('reports the worst offender of a near miss', () => {
    const boxes = [R(0, 0, 40, 40), R(0, 200, 40, 40), R(3, 400, 40, 40)];
    const clusters = clusterAlignments(boxes, 6);
    const left = clusters.find(c => c.kind === 'left');
    expect(left?.count).toBe(3);
    expect(left?.worstBox).toBe(2);
    expect(left?.spread).toBeGreaterThan(1);
    renderAlignmentGuides(R(0, 0, 43, 440), boxes, style, { unitsPerPixel: 1 });
    expect(labelText()).toMatch(/left ±/);
    expect(noBadNumbers()).toBe(true);
  });

  it('ignores a lone box and a zero tolerance', () => {
    expect(clusterAlignments([R(0, 0, 10, 10)], 2)).toHaveLength(0);
    expect(clusterAlignments([R(0, 0, 10, 10), R(0, 0, 10, 10)], 0)).toHaveLength(0);
  });
});

describe('ratios and labels', () => {
  it('names landscape and portrait ratios', () => {
    expect(describeRatio(100, 100)).toBe('1:1');
    expect(describeRatio(160, 90)).toBe('16:9');
    expect(describeRatio(90, 160)).toBe('9:16');
    expect(describeRatio(161.8, 100)).toBe('φ');
    expect(describeRatio(100, 161.8)).toBe('1:φ');
    expect(describeRatio(100, 141.4)).toBe('1:√2');
    expect(describeRatio(100, 37)).toBe('2.70:1');
    expect(describeRatio(37, 100)).toBe('1:2.70');
    expect(describeRatio(0, 10)).toBe('—');
    expect(describeRatio(NaN, 10)).toBe('—');
  });

  it('LabelPlacer keeps labels from stacking', () => {
    const placer = new LabelPlacer(10);
    const color = new paper.Color(0, 0, 0);
    const a = placer.place(0, 0, 'AAAA', { size: 10, color });
    const b = placer.place(0, 0, 'BBBB', { size: 10, color });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(Math.abs((b as paper.PointText).point.y - (a as paper.PointText).point.y)).toBeGreaterThan(5);
    expect(placer.place(NaN, 0, 'x', { size: 10, color })).toBeNull();
    expect(placer.place(0, 0, '', { size: 10, color })).toBeNull();
  });

  it('component ratio labels use the refined ink boxes', () => {
    const ink = detached(new paper.Path.Rectangle(new paper.Rectangle(10, 10, 80, 40)));
    renderComponentRatioLabels(R(0, 0, 100, 100), [R(0, 0, 100, 60)], style, ctx([ink], { unitsPerPixel: 1 }));
    expect(labelText()).toContain('2:1');
    expect(labelText()).toContain('80u×40u');
  });
});

describe('scale awareness', () => {
  const strokes = () => paths().map(p => p.strokeWidth).filter(w => w > 0);

  it('guides get heavier on a big scene and stay visible on a tiny one', () => {
    renderHarmonicDivisions(R(0, 0, 40, 40), style);
    const small = Math.max(...strokes());
    scope.project.clear();
    renderHarmonicDivisions(R(0, 0, 4000, 4000), style);
    const big = Math.max(...strokes());
    expect(small).toBeGreaterThan(0);
    expect(big).toBeGreaterThan(small * 10);
    expect(noBadNumbers()).toBe(true);
  });

  it('dashes and fonts follow the same scale', () => {
    renderDynamicBaseline(R(0, 0, 4000, 4000), style, { unitsPerPixel: 1 });
    const dashed = paths().find(p => (p.dashArray?.length ?? 0) > 0);
    expect(dashed).toBeDefined();
    expect(Math.max(...(dashed as paper.Path).dashArray)).toBeGreaterThan(4);
    expect(Math.max(...texts().map(t => t.fontSize as number))).toBeGreaterThan(10);
    scope.project.clear();
    renderDynamicBaseline(R(0, 0, 30, 30), style);
    expect(Math.min(...texts().map(t => t.fontSize as number))).toBeGreaterThanOrEqual(7);
    expect(noBadNumbers()).toBe(true);
  });

  it('honours an explicit guideScale from the pipeline', () => {
    const metrics = { unit: 4, reference: 4000, guideScale: 4, len: (u: number) => u * 4, stroke: (u = 1) => u * 4, dash: (...p: number[]) => p.map(v => v * 4), font: (u = 9) => u * 4, dot: (u = 3) => u * 4 };
    renderHarmonicDivisions(R(0, 0, 100, 100), style, { metrics });
    expect(Math.max(...strokes())).toBeCloseTo(4);
  });
});

describe('degenerate input never throws', () => {
  const degenerate: paper.Rectangle[] = [R(0, 0, 0, 0), R(0, 0, 100, 0), R(0, 0, 0, 100), R(NaN, 0, 10, 10)];

  it.each(degenerate.map((r, i) => [i, r] as const))('bounds #%i', (_i, rect) => {
    const comps = [rect, rect];
    expect(() => {
      renderSymmetryAxes(rect, comps, style);
      renderAngleMeasurements(rect, comps, style);
      renderSpacingGuides(rect, comps, style);
      renderAlignmentGuides(rect, comps, style);
      renderDynamicBaseline(rect, style);
      renderComponentRatioLabels(rect, comps, style);
      renderHarmonicDivisions(rect, style);
    }).not.toThrow();
    expect(labelText()).not.toMatch(/NaN|Infinity/);
  });

  it('a huge and a microscopic logo both stay finite', () => {
    for (const rect of [R(0, 0, 0.5, 0.25), R(0, 0, 40000, 20000)]) {
      scope.project.clear();
      const comps = [
        new paper.Rectangle(rect.x, rect.y, rect.width / 3, rect.height),
        new paper.Rectangle(rect.x + rect.width * 0.6, rect.y, rect.width / 3, rect.height),
      ];
      renderSpacingGuides(rect, comps, style, { unitsPerPixel: 1 });
      renderComponentRatioLabels(rect, comps, style, { unitsPerPixel: 1 });
      renderAlignmentGuides(rect, comps, style, { unitsPerPixel: 1 });
      expect(noBadNumbers()).toBe(true);
      expect(paths().every(p => p.strokeWidth === 0 || p.strokeWidth >= 0.4)).toBe(true);
    }
  });
});

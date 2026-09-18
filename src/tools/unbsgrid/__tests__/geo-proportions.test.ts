import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderGoldenRatio, renderGoldenSpiral, renderThirdLines, renderRuleOfOdds,
  renderTypographicProportions, inkRowProfile, deriveTypographicGuides, unionLength,
} from '../components/renderers/proportions';
import { PHI, fitGoldenRect, computeGoldenSpiralSteps, arcPoint, type RenderContext } from '../components/renderers/utils';

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

const detached = <T extends paper.Path>(p: T): T => { p.remove(); return p; };
const realRect = (x: number, y: number, w: number, h: number) =>
  detached(new paper.Path.Rectangle(new paper.Rectangle(x, y, w, h)));
const ctxFor = (p: paper.Path[], contentBounds?: paper.Rectangle): RenderContext => ({
  useRealData: true,
  actualPaths: p,
  contentBounds: contentBounds ?? p.reduce((a, q) => (a ? a.unite(q.bounds) : q.bounds.clone()), null as paper.Rectangle | null) ?? undefined,
});

describe('golden ratio', () => {
  it('circles form an exact φ progression (not the old Fibonacci integers)', () => {
    renderGoldenRatio(new paper.Rectangle(0, 0, 400, 400), style);
    const circles = paths().filter(p => p.closed && Math.abs(p.bounds.width - p.bounds.height) < 1e-6);
    const radii = circles.map(c => c.bounds.width / 2).sort((a, b) => b - a);
    expect(radii[0]).toBeCloseTo(200, 6);
    for (let i = 0; i < radii.length - 1; i++) {
      expect(radii[i] / radii[i + 1]).toBeCloseTo(PHI, 9);
    }
  });

  it('the golden rectangle keeps φ and carries its golden-section cut', () => {
    const b = new paper.Rectangle(0, 0, 300, 200);
    renderGoldenRatio(b, style);
    const gr = fitGoldenRect(b);
    const rect = paths().find(p => p.closed && Math.abs(p.bounds.width - gr.width) < 1e-6)!;
    expect(rect.bounds.width / rect.bounds.height).toBeCloseTo(PHI, 9);
    // the cut leaves a square: it sits one square-side away from the left edge
    const cut = paths().find(p => !p.closed && p.segments.length === 2 && Math.abs(p.firstSegment.point.x - p.lastSegment.point.x) < 1e-9)!;
    expect(cut.firstSegment.point.x - gr.x).toBeCloseTo(gr.height, 6);
  });

  it('reports the measured ratio and confirms a φ logo', () => {
    renderGoldenRatio(new paper.Rectangle(0, 0, 161.8034, 100), style);
    expect(texts().some(t => t.content.includes('1.618') && t.content.includes('✓'))).toBe(true);
    scope.project.clear();
    renderGoldenRatio(new paper.Rectangle(0, 0, 100, 100), style);
    const ratio = texts().find(t => /^\d/.test(t.content))!;
    expect(ratio.content).toContain('1.000');
    expect(ratio.content).not.toContain('✓');
  });

  it('uses the real ink frame when there is one', () => {
    const ink = new paper.Rectangle(100, 100, 100, 100);
    renderGoldenRatio(new paper.Rectangle(0, 0, 400, 400), style, { contentBounds: ink });
    const biggest = paths().filter(p => p.closed).sort((a, b) => b.bounds.width - a.bounds.width)[0];
    expect(biggest.position.x).toBeCloseTo(150, 6);
    expect(biggest.position.y).toBeCloseTo(150, 6);
  });

  it('survives degenerate bounds', () => {
    expect(() => renderGoldenRatio(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(() => renderGoldenRatio(new paper.Rectangle(0, 0, 100, 0), style)).not.toThrow();
    expect(items()).toHaveLength(0);
  });
});

describe('golden spiral', () => {
  it('is a single continuous stroke of quarter arcs', () => {
    const b = new paper.Rectangle(0, 0, 400, 250);
    renderGoldenSpiral(b, style);
    const golden = fitGoldenRect(b);
    const steps = computeGoldenSpiralSteps(golden, 12, Math.max(0.25, Math.hypot(400, 250) / 1000 * 0.5));
    const spiral = paths().find(p => p.curves.length > 2 && !p.closed)!;
    expect(spiral.curves.length).toBe(steps.length);

    const start = arcPoint(steps[0], steps[0].startAngle);
    expect(spiral.firstSegment.point.x).toBeCloseTo(start.x, 4);
    expect(spiral.firstSegment.point.y).toBeCloseTo(start.y, 4);
    const last = steps[steps.length - 1];
    const end = arcPoint(last, last.startAngle + 90);
    expect(spiral.lastSegment.point.x).toBeCloseTo(end.x, 4);
    expect(spiral.lastSegment.point.y).toBeCloseTo(end.y, 4);
    // every joint is shared: a continuous path has exactly curves+1 segments
    expect(spiral.segments.length).toBe(spiral.curves.length + 1);
  });

  it('starts on the left in landscape and on the top in portrait', () => {
    renderGoldenSpiral(new paper.Rectangle(0, 0, 400, 100), style);
    expect(computeGoldenSpiralSteps(fitGoldenRect({ x: 0, y: 0, width: 400, height: 100 }), 1, 0.5)[0].side).toBe('left');
    scope.project.clear();
    renderGoldenSpiral(new paper.Rectangle(0, 0, 100, 400), style);
    const outer = paths()[0];
    expect(outer.bounds.height / outer.bounds.width).toBeCloseTo(PHI, 6);
    expect(computeGoldenSpiralSteps(fitGoldenRect({ x: 0, y: 0, width: 100, height: 400 }), 1, 0.5)[0].side).toBe('top');
  });

  it('draws fewer, larger steps for a huge export (no sub-pixel arcs)', () => {
    renderGoldenSpiral(new paper.Rectangle(0, 0, 100000, 61803), style);
    const spiral = paths().find(p => p.curves.length > 2 && !p.closed)!;
    expect(spiral.curves.length).toBeLessThanOrEqual(12);
    expect(allFinite()).toBe(true);
  });
});

describe('thirds and odds', () => {
  it('third lines sit exactly at 1/3 and 2/3 and carry four power points', () => {
    const b = new paper.Rectangle(0, 0, 300, 300);
    renderThirdLines(b, style);
    const lines = paths().filter(p => !p.closed);
    const xs = lines.filter(l => Math.abs(l.firstSegment.point.x - l.lastSegment.point.x) < 1e-9).map(l => l.firstSegment.point.x);
    const ys = lines.filter(l => Math.abs(l.firstSegment.point.y - l.lastSegment.point.y) < 1e-9).map(l => l.firstSegment.point.y);
    expect(xs.sort((a, c) => a - c)).toEqual([100, 200]);
    expect(ys.sort((a, c) => a - c)).toEqual([100, 200]);
    const dots = paths().filter(p => p.closed);
    expect(dots).toHaveLength(4);
    expect(dots.map(d => [Math.round(d.position.x), Math.round(d.position.y)]).sort()).toEqual([[100, 100], [100, 200], [200, 100], [200, 200]].sort());
  });

  it('power points only appear where two drawn lines cross', () => {
    // ink is a thin horizontal band: the horizontal thirds miss it
    const band = realRect(0, 0, 300, 4);
    renderThirdLines(new paper.Rectangle(0, 0, 300, 300), style, { ...ctxFor([band]), contentBounds: new paper.Rectangle(0, 0, 300, 300) });
    expect(paths().filter(p => p.closed)).toHaveLength(0);
  });

  it('rule of odds divides in exact fifths and sevenths', () => {
    const b = new paper.Rectangle(0, 0, 35, 35);
    renderRuleOfOdds(b, style);
    const lines = paths().filter(p => !p.closed);
    const xs = lines
      .filter(l => Math.abs(l.firstSegment.point.x - l.lastSegment.point.x) < 1e-9)
      .map(l => l.firstSegment.point.x).sort((a, c) => a - c);
    expect(xs).toHaveLength(4 + 6);
    expect(xs.filter(x => Math.abs(x % 7) < 1e-9)).toHaveLength(4); // fifths of 35
    expect(xs.filter(x => Math.abs(x % 5) < 1e-9)).toHaveLength(6); // sevenths of 35
    expect(texts().map(t => t.content).sort()).toEqual(['1/5', '1/7']);
  });

  it('degenerate bounds draw nothing', () => {
    renderThirdLines(new paper.Rectangle(0, 0, 0, 100), style);
    renderRuleOfOdds(new paper.Rectangle(0, 0, 100, 0), style);
    expect(items()).toHaveLength(0);
  });
});

describe('ink histogram', () => {
  it('unionLength counts overlaps once', () => {
    expect(unionLength([])).toBe(0);
    expect(unionLength([[0, 10], [5, 15]])).toBe(15);
    expect(unionLength([[0, 10], [20, 30]])).toBe(20);
    expect(unionLength([[0, 10], [2, 4]])).toBe(10);
    expect(unionLength([[NaN, 10], [0, 5]])).toBe(5);
    expect(unionLength([[5, 5]])).toBe(0);
  });

  it('measures the covered width of each scan row', () => {
    const block = realRect(20, 0, 60, 100);
    const profile = inkRowProfile([block], { top: 0, bottom: 100, left: 0, right: 100 }, 32)!;
    expect(profile).toHaveLength(32);
    expect(profile.every(v => Math.abs(v - 60) < 1e-6)).toBe(true);

    const two = inkRowProfile([realRect(0, 0, 20, 100), realRect(80, 0, 20, 100)], { top: 0, bottom: 100, left: 0, right: 100 }, 16)!;
    expect(two.every(v => Math.abs(v - 40) < 1e-6)).toBe(true);

    expect(inkRowProfile([], { top: 0, bottom: 10, left: 0, right: 10 })).toBeNull();
    expect(inkRowProfile([block], { top: 0, bottom: 0, left: 0, right: 10 })).toBeNull();
  });

  it('derives baseline, x-height, cap height and descender from the distribution', () => {
    // cap band 10..40 (80 wide), lowercase body 40..90 (100 wide), descender 90..100 (10 wide)
    const shapes = [realRect(10, 10, 80, 30), realRect(0, 40, 100, 50), realRect(45, 90, 10, 10)];
    const profile = inkRowProfile(shapes, { top: 0, bottom: 100, left: 0, right: 100 }, 128)!;
    const g = deriveTypographicGuides(profile, 0, 100)!;
    expect(g.ascender).toBeCloseTo(10, 0);
    expect(g.capHeight).toBeCloseTo(10, 0);
    expect(g.xHeight).toBeCloseTo(40, 0);
    expect(g.baseline).toBeCloseTo(90, 0);
    expect(g.descender).toBeCloseTo(100, 0);
    expect(g.ascender <= g.capHeight && g.capHeight <= g.xHeight && g.xHeight <= g.baseline && g.baseline <= g.descender).toBe(true);
  });

  it('a plain block has no descender: baseline = ink bottom, x-height in the middle', () => {
    const profile = inkRowProfile([realRect(0, 0, 100, 100)], { top: 0, bottom: 100, left: 0, right: 100 }, 64)!;
    const g = deriveTypographicGuides(profile, 0, 100)!;
    expect(g.ascender).toBeCloseTo(0, 1);
    expect(g.baseline).toBeCloseTo(100, 1);
    expect(g.descender).toBeCloseTo(100, 1);
    expect(g.xHeight).toBeCloseTo(50, 1);
  });

  it('rejects empty or unusable histograms', () => {
    expect(deriveTypographicGuides(null, 0, 100)).toBeNull();
    expect(deriveTypographicGuides([1, 2, 3], 0, 100)).toBeNull();
    expect(deriveTypographicGuides(new Array(32).fill(0), 0, 100)).toBeNull();
    expect(deriveTypographicGuides(new Array(32).fill(1), 0, 0)).toBeNull();
    const oneRow = new Array(32).fill(0); oneRow[4] = 5;
    expect(deriveTypographicGuides(oneRow, 0, 100)).toBeNull();
  });
});

describe('typographic proportions', () => {
  it('real data puts the baseline on the ink, not at a fixed percentage', () => {
    const shapes = [realRect(10, 10, 80, 30), realRect(0, 40, 100, 50), realRect(45, 90, 10, 10)];
    const frame = new paper.Rectangle(0, 0, 100, 100);
    renderTypographicProportions(frame, style, ctxFor(shapes, frame));
    const ys = paths().map(p => p.firstSegment.point.y).sort((a, b) => a - b);
    expect(ys.some(y => Math.abs(y - 90) < 1)).toBe(true);  // baseline above the descender
    expect(ys.some(y => Math.abs(y - 40) < 1)).toBe(true);  // x-height
    expect(ys.every(y => y >= -1e-6 && y <= 100 + 1e-6)).toBe(true);
    const xLabel = texts().find(t => t.content.startsWith('x-height'))!;
    expect(xLabel.content).toMatch(/x-height · \d+% · /);
    expect(noNaNLabels()).toBe(true);
  });

  it('merges lines that land on the same row instead of stacking labels', () => {
    const frame = new paper.Rectangle(0, 0, 100, 100);
    renderTypographicProportions(frame, style, ctxFor([realRect(0, 0, 100, 100)], frame));
    expect(paths().length).toBe(3); // ascender+cap, x-height, baseline+descender
    expect(texts().some(t => t.content.includes('/'))).toBe(true);
  });

  it('falls back to the conventional ratio table without real data', () => {
    const frame = new paper.Rectangle(0, 0, 200, 100);
    renderTypographicProportions(frame, style);
    const ys = paths().map(p => p.firstSegment.point.y).sort((a, b) => a - b);
    expect(ys).toHaveLength(5);
    [-10, 0, 40, 100, 115].forEach((expected, i) => expect(ys[i]).toBeCloseTo(expected, 9));
  });

  it('degenerate bounds draw nothing', () => {
    renderTypographicProportions(new paper.Rectangle(0, 0, 100, 0), style);
    expect(items()).toHaveLength(0);
  });
});

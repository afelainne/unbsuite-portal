import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderRootRectangles, renderModularScale, renderSafeZone, renderFibonacciOverlay,
  renderVesicaPiscis, maxFittingMargin, MAX_MODULAR_STEPS,
} from '../components/renderers/harmony';
import { PHI, fitGoldenRect, computeGoldenSpiralSteps, vesicaLens, type RenderContext } from '../components/renderers/utils';

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

const ROOTS = [Math.SQRT2, Math.sqrt(3), Math.sqrt(5)];

describe('root rectangles', () => {
  it('are concentric and hold √2, √3 and √5 exactly (landscape logo)', () => {
    const b = new paper.Rectangle(0, 0, 400, 200);
    renderRootRectangles(b, style);
    const rects = paths().filter(p => p.closed);
    expect(rects).toHaveLength(3);
    rects.forEach(r => {
      expect(r.position.x).toBeCloseTo(200, 6);
      expect(r.position.y).toBeCloseTo(100, 6);
      expect(r.bounds.width).toBeLessThanOrEqual(400 + 1e-9);
      expect(r.bounds.height).toBeLessThanOrEqual(200 + 1e-9);
    });
    const ratios = rects.map(r => r.bounds.width / r.bounds.height).sort((a, c) => a - c);
    ratios.forEach((v, i) => expect(v).toBeCloseTo(ROOTS[i], 5));
  });

  it('follow the LOGO orientation: a portrait logo never gets landscape roots', () => {
    renderRootRectangles(new paper.Rectangle(0, 0, 200, 400), style);
    const rects = paths().filter(p => p.closed);
    expect(rects).toHaveLength(3);
    rects.forEach(r => expect(r.bounds.height).toBeGreaterThan(r.bounds.width));
    const ratios = rects.map(r => r.bounds.height / r.bounds.width).sort((a, c) => a - c);
    ratios.forEach((v, i) => expect(v).toBeCloseTo(ROOTS[i], 5));
  });

  it('flags the closest root and reports the measured aspect ratio', () => {
    renderRootRectangles(new paper.Rectangle(0, 0, 100, 223.607), style); // 1:√5 portrait
    const labels = texts().map(t => t.content);
    expect(labels.some(l => l.startsWith('√5 ✓ 100%'))).toBe(true);
    expect(labels.some(l => l.includes('Aspect ratio: 0.447:1'))).toBe(true);
    expect(noNaNLabels()).toBe(true);
  });

  it('uses the real ink frame and survives a degenerate one', () => {
    const ink = new paper.Rectangle(50, 50, 200, 100);
    renderRootRectangles(new paper.Rectangle(0, 0, 400, 400), style, { contentBounds: ink });
    paths().forEach(p => expect(p.position.x).toBeCloseTo(150, 6));
    scope.project.clear();
    renderRootRectangles(new paper.Rectangle(0, 0, 100, 0), style);
    expect(items()).toHaveLength(0);
  });
});

describe('modular scale', () => {
  const radiiOf = () => paths()
    .filter(p => p.closed && Math.abs(p.bounds.width - p.bounds.height) < 1e-6 && p.bounds.width > 10)
    .map(p => p.bounds.width / 2)
    .sort((a, b) => a - b);

  it('every step is the previous one times the ratio given', () => {
    renderModularScale(new paper.Rectangle(0, 0, 400, 400), style, 1.25);
    const radii = radiiOf();
    expect(radii.length).toBeGreaterThan(3);
    for (let i = 0; i < radii.length - 1; i++) expect(radii[i + 1] / radii[i]).toBeCloseTo(1.25, 9);
    expect(texts().some(t => t.content === 'Modular scale ×1.250')).toBe(true);
  });

  it('a broken ratio falls back to φ and a ratio below 1 is inverted', () => {
    renderModularScale(new paper.Rectangle(0, 0, 400, 400), style, NaN);
    let radii = radiiOf();
    for (let i = 0; i < radii.length - 1; i++) expect(radii[i + 1] / radii[i]).toBeCloseTo(PHI, 9);
    scope.project.clear();
    renderModularScale(new paper.Rectangle(0, 0, 400, 400), style, 0);
    expect(radiiOf().length).toBeGreaterThan(3);
    scope.project.clear();
    renderModularScale(new paper.Rectangle(0, 0, 400, 400), style, 0.5);
    radii = radiiOf();
    for (let i = 0; i < radii.length - 1; i++) expect(radii[i + 1] / radii[i]).toBeCloseTo(2, 9);
  });

  it('never exceeds the step budget or the frame diagonal', () => {
    renderModularScale(new paper.Rectangle(0, 0, 400, 400), style, 1.0001);
    expect(radiiOf().length).toBeLessThanOrEqual(MAX_MODULAR_STEPS);
    const maxR = Math.max(...radiiOf());
    expect(maxR).toBeLessThanOrEqual(Math.hypot(200, 200) + 1e-6);
  });

  it('centres on the ink centre of mass, not the middle of the box', () => {
    const heavyLeft = [realRect(0, 40, 40, 20), realRect(190, 45, 10, 10)];
    const frame = new paper.Rectangle(0, 0, 200, 100);
    renderModularScale(frame, style, PHI, ctxFor(heavyLeft, frame));
    const marker = paths().filter(p => p.closed).sort((a, b) => a.bounds.width - b.bounds.width)[0];
    expect(marker.position.x).toBeLessThan(100);
    expect(allFinite()).toBe(true);
  });

  it('degenerate bounds draw nothing', () => {
    renderModularScale(new paper.Rectangle(0, 0, 0, 100), style, PHI);
    expect(items()).toHaveLength(0);
  });
});

describe('safe zone', () => {
  it('insets are a fraction of the frame at any size', () => {
    renderSafeZone(new paper.Rectangle(0, 0, 400, 200), style, 0.1);
    const safe = paths()[0];
    expect(safe.bounds.width).toBeCloseTo(400 * 0.8, 6);
    expect(safe.bounds.height).toBeCloseTo(200 * 0.8, 6);
    scope.project.clear();
    renderSafeZone(new paper.Rectangle(0, 0, 4000, 2000), style, 0.1);
    const big = paths()[0];
    expect(big.bounds.width / 4000).toBeCloseTo(0.8, 9);
    expect(big.strokeWidth / safe.strokeWidth).toBeCloseTo(10, 6);
  });

  it('clamps impossible margins instead of inverting the rectangle', () => {
    renderSafeZone(new paper.Rectangle(0, 0, 400, 200), style, 5);
    expect(paths()[0].bounds.width).toBeCloseTo(400 * 0.02, 6);
    expect(allFinite()).toBe(true);
    scope.project.clear();
    renderSafeZone(new paper.Rectangle(0, 0, 400, 200), style, NaN);
    expect(paths()[0].bounds.width).toBeCloseTo(400 * 0.8, 6);
    scope.project.clear();
    renderSafeZone(new paper.Rectangle(0, 0, 400, 200), style, -1);
    expect(paths()[0].bounds.width).toBeCloseTo(400, 6);
  });

  it('maxFittingMargin measures how far the ink stays from the frame', () => {
    const frame = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
    expect(maxFittingMargin(frame, { left: 10, top: 20, right: 90, bottom: 80 })).toBeCloseTo(0.1);
    expect(maxFittingMargin(frame, { left: 0, top: 0, right: 100, bottom: 100 })).toBe(0);
    expect(maxFittingMargin(frame, null)).toBeNull();
    expect(maxFittingMargin({ ...frame, width: 0 }, { left: 0, top: 0, right: 1, bottom: 1 })).toBeNull();
  });

  it('reports bleeds and the margin the drawing would actually fit', () => {
    const frame = new paper.Rectangle(0, 0, 100, 100);
    const ink = realRect(10, 10, 80, 80);
    renderSafeZone(frame, style, 0.2, ctxFor([ink]));
    const status = texts().find(t => t.content.includes('SAFE ZONE'))!;
    expect(status.content).toContain('✗');
    expect(status.content).toContain('fits ≤ 10%');
    scope.project.clear();
    renderSafeZone(frame, style, 0.05, ctxFor([ink]));
    expect(texts().find(t => t.content.includes('SAFE ZONE'))!.content).toContain('✓');
  });

  it('degenerate bounds draw nothing', () => {
    renderSafeZone(new paper.Rectangle(0, 0, 100, 0), style, 0.1);
    expect(items()).toHaveLength(0);
  });
});

describe('fibonacci overlay', () => {
  it('squares shrink by φ and match the spiral squares', () => {
    const b = new paper.Rectangle(0, 0, 400, 200);
    renderFibonacciOverlay(b, style);
    const expected = computeGoldenSpiralSteps(fitGoldenRect(b), 8, Math.max(0.5, Math.hypot(400, 200) / 1000)).map(s => s.square);
    const squares = paths().slice(1);
    expect(squares).toHaveLength(expected.length);
    squares.forEach((sq, i) => {
      expect(sq.bounds.x).toBeCloseTo(expected[i].x, 4);
      expect(sq.bounds.width).toBeCloseTo(sq.bounds.height, 6);
      if (i > 0) expect(squares[i - 1].bounds.width / sq.bounds.width).toBeCloseTo(PHI, 6);
    });
    expect(texts().map(t => t.content)).toContain('21');
  });

  it('dims squares with no ink and keeps every square drawn', () => {
    const b = new paper.Rectangle(0, 0, 400, 200);
    const ink = realRect(0, 0, 60, 200); // only the left-most square holds ink
    renderFibonacciOverlay(b, style, ctxFor([ink], b));
    const squares = paths().slice(1);
    expect(squares.length).toBeGreaterThan(2);
    const widths = squares.map(s => s.strokeWidth);
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths));
  });

  it('degenerate bounds draw nothing', () => {
    renderFibonacciOverlay(new paper.Rectangle(0, 0, 0, 200), style);
    expect(items()).toHaveLength(0);
  });
});

describe('vesica piscis', () => {
  it('two circles of radius r with centres r apart, fitted in the frame', () => {
    const b = new paper.Rectangle(0, 0, 300, 400);
    renderVesicaPiscis(b, style);
    const r = Math.min(300 / 3, 400 / 2); // 100
    const circles = paths().filter(p => p.closed && Math.abs(p.bounds.width - 2 * r) < 1e-6);
    expect(circles).toHaveLength(2);
    expect(Math.abs(circles[0].position.x - circles[1].position.x)).toBeCloseTo(r, 6);
    expect(circles[0].position.y).toBeCloseTo(circles[1].position.y, 6);
    expect(circles.every(c => c.bounds.width <= 300 && c.bounds.height <= 400)).toBe(true);
  });

  it('the lens is the true intersection: r wide, r·√3 tall', () => {
    const b = new paper.Rectangle(0, 0, 300, 400);
    renderVesicaPiscis(b, style);
    const r = 100;
    const lens = paths().find(p => p.closed && Math.abs(p.bounds.width - r) < 0.5)!;
    expect(lens.bounds.height).toBeCloseTo(r * Math.sqrt(3), 0);
    const geom = vesicaLens(150, 200, r);
    expect(lens.bounds.top).toBeCloseTo(geom.top.y, 0);
    expect(lens.bounds.bottom).toBeCloseTo(geom.bottom.y, 0);
  });

  it('uses the real ink frame and reports coverage', () => {
    const ink = realRect(100, 100, 150, 100);
    renderVesicaPiscis(new paper.Rectangle(0, 0, 600, 600), style, ctxFor([ink]));
    const r = Math.min(150 / 3, 100 / 2);
    const circles = paths().filter(p => p.closed && Math.abs(p.bounds.width - 2 * r) < 1e-6);
    expect(circles).toHaveLength(2);
    expect(texts()[0].content).toMatch(/Vesica: \d+% \| Circles: \d+%/);
  });

  it('degenerate bounds draw nothing', () => {
    renderVesicaPiscis(new paper.Rectangle(0, 0, 0, 10), style);
    renderVesicaPiscis(new paper.Rectangle(0, 0, 10, 0), style);
    expect(items()).toHaveLength(0);
  });
});

describe('scale invariance across output sizes', () => {
  it('a 10x larger render keeps the same drawing with 10x weights', () => {
    // above the readability floor (min stroke 0.4px / min font 7px), the
    // weights are strictly proportional to the logo diagonal
    const small = () => {
      renderRootRectangles(new paper.Rectangle(0, 0, 3000, 2000), style);
      renderVesicaPiscis(new paper.Rectangle(0, 0, 3000, 2000), style);
      renderFibonacciOverlay(new paper.Rectangle(0, 0, 3000, 2000), style);
    };
    const big = () => {
      renderRootRectangles(new paper.Rectangle(0, 0, 30000, 20000), style);
      renderVesicaPiscis(new paper.Rectangle(0, 0, 30000, 20000), style);
      renderFibonacciOverlay(new paper.Rectangle(0, 0, 30000, 20000), style);
    };
    small();
    const a = { n: paths().length, stroke: paths()[0].strokeWidth, font: texts()[0].fontSize as number };
    scope.project.clear();
    big();
    const b = { n: paths().length, stroke: paths()[0].strokeWidth, font: texts()[0].fontSize as number };
    expect(b.n).toBe(a.n);
    expect(b.stroke / a.stroke).toBeCloseTo(10, 6);
    expect(b.font / a.font).toBeCloseTo(10, 6);
    expect(allFinite()).toBe(true);
    expect(noNaNLabels()).toBe(true);
  });
});

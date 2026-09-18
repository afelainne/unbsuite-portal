import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderIsometricGrid, renderPixelGrid, renderContrastGuide, renderKenBurnsSafe,
  renderOpticalCenter, renderVisualWeightMap, inferPixelStep, inkQuadrantWeights,
} from '../components/renderers/grid';
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

const paths = () => scope.project.getItems({ class: paper.Path }) as paper.Path[];
const texts = () => scope.project.getItems({ class: paper.PointText }) as paper.PointText[];
const lines = () => paths().filter(p => p.segments.length === 2);
const allFinite = () => scope.project.getItems({}).every(i =>
  [i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));

function detached(p: paper.Path): paper.Path {
  p.fillColor = new paper.Color('black');
  p.remove();
  return p;
}

function angleOf(p: paper.Path): number {
  const a = p.firstSegment.point;
  const b = p.lastSegment.point;
  let deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return deg > 179.999 ? 0 : deg;
}

describe('isometric grid', () => {
  it('draws real 30 degree families plus verticals, clipped to the box', () => {
    const b = new paper.Rectangle(0, 0, 1000, 100);
    renderIsometricGrid(b, style, 4);
    const ls = lines().filter(p => p.length > 1e-6);
    const angles = new Set(ls.map(p => Math.round(angleOf(p) * 1000) / 1000));
    expect([...angles].sort((x, y) => x - y)).toEqual([30, 90, 150]);

    for (const l of ls) {
      expect(l.bounds.left).toBeGreaterThanOrEqual(b.left - 1e-6);
      expect(l.bounds.right).toBeLessThanOrEqual(b.right + 1e-6);
      expect(l.bounds.top).toBeGreaterThanOrEqual(b.top - 1e-6);
      expect(l.bounds.bottom).toBeLessThanOrEqual(b.bottom + 1e-6);
    }

    // the wide side is fully covered: verticals reach both edges
    const xs = ls.filter(p => Math.abs(angleOf(p) - 90) < 1e-6).map(p => p.firstSegment.point.x);
    expect(Math.min(...xs)).toBeCloseTo(b.left, 6);
    expect(Math.max(...xs)).toBeCloseTo(b.right, 6);
    // and the 30° family spans the whole width too
    const thirty = ls.filter(p => Math.abs(angleOf(p) - 30) < 1e-6);
    expect(Math.min(...thirty.map(p => p.bounds.left))).toBeCloseTo(b.left, 6);
    expect(Math.max(...thirty.map(p => p.bounds.right))).toBeCloseTo(b.right, 6);
    expect(allFinite()).toBe(true);
  });

  it('follows the content box and never loops forever', () => {
    const content = new paper.Rectangle(200, 200, 300, 300);
    const blob = detached(new paper.Path.Rectangle(content));
    const ctx: RenderContext = { useRealData: true, actualPaths: [blob], contentBounds: content };
    renderIsometricGrid(new paper.Rectangle(0, 0, 1000, 1000), style, 6, ctx);
    for (const l of lines()) {
      expect(l.bounds.left).toBeGreaterThanOrEqual(content.left - 1e-6);
      expect(l.bounds.right).toBeLessThanOrEqual(content.right + 1e-6);
    }
    scope.project.clear();
    renderIsometricGrid(new paper.Rectangle(0, 0, 0, 0), style, 4);
    expect(paths()).toHaveLength(0);
    renderIsometricGrid(new paper.Rectangle(0, 0, 10, 10), style, -3);
    expect(paths().length).toBeLessThan(MAX_RENDER_ITEMS);
    expect(allFinite()).toBe(true);
  });
});

describe('pixel grid', () => {
  it('keeps the subdivision step when nothing can be inferred', () => {
    renderPixelGrid(new paper.Rectangle(0, 0, 100, 100), style, 4);
    expect(paths()).toHaveLength(18); // 9 + 9 lines, step 12.5
    scope.project.clear();
    renderPixelGrid(new paper.Rectangle(0, 0, 100, 0), style, 8);
    expect(paths()).toHaveLength(0);
    renderPixelGrid(new paper.Rectangle(0, 0, 100, 100), style, -5);
    expect(paths().length).toBeGreaterThan(0);
    expect(paths().length).toBeLessThan(10);
  });

  it('infers the module the artwork is drawn on', () => {
    const box = { x: 0, y: 0, width: 200, height: 200 };
    const a = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 25, 150)));
    const b = detached(new paper.Path.Rectangle(new paper.Rectangle(75, 25, 125, 175)));
    const found = inferPixelStep([a, b], box)!;
    expect(found).not.toBeNull();
    expect(found.step).toBeCloseTo(25, 6);
    expect(found.divisions).toBe(8);
    expect(found.score).toBeCloseTo(1, 6);

    // organic coordinates: nothing to infer, no false positive
    const blob = detached(new paper.Path([
      new paper.Point(3.7, 11.2), new paper.Point(61.3, 29.9),
      new paper.Point(97.1, 143.8), new paper.Point(18.6, 177.4),
      new paper.Point(131.9, 66.5), new paper.Point(44.2, 88.3),
    ]));
    expect(inferPixelStep([blob], box)).toBeNull();
    expect(inferPixelStep([], box)).toBeNull();
    expect(inferPixelStep([a], { x: 0, y: 0, width: 0, height: 0 })).toBeNull();
  });

  it('aligns the drawn grid to the inferred module and labels it', () => {
    const content = new paper.Rectangle(0, 0, 200, 200);
    const a = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 25, 150)));
    const b = detached(new paper.Path.Rectangle(new paper.Rectangle(75, 25, 125, 175)));
    const ctx: RenderContext = { useRealData: true, actualPaths: [a, b], contentBounds: content };
    renderPixelGrid(new paper.Rectangle(0, 0, 200, 200), style, 4, ctx);
    for (const l of lines()) {
      const v = Math.abs(l.firstSegment.point.x - l.lastSegment.point.x) < 1e-6
        ? l.firstSegment.point.x
        : l.firstSegment.point.y;
      expect(v / 25).toBeCloseTo(Math.round(v / 25), 6);
    }
    expect(texts().some(t => String(t.content).includes('module'))).toBe(true);
  });

  it('never draws an unreadable step', () => {
    // 4096px export: the guide unit is ~5.8px, so a 0.2px step must open up
    const big = new paper.Rectangle(0, 0, 4000, 4000);
    renderPixelGrid(big, style, 256);
    const xs = lines()
      .filter(p => Math.abs(p.firstSegment.point.x - p.lastSegment.point.x) < 1e-6)
      .map(p => p.firstSegment.point.x)
      .sort((a, b) => a - b);
    expect(xs.length).toBeGreaterThan(1);
    // subdivisions would give 7.8px on a 5.66px guide unit: too dense to read
    expect(xs[1] - xs[0]).toBeGreaterThan(16);
    expect(paths().length).toBeLessThanOrEqual(MAX_RENDER_ITEMS);
  });
});

describe('contrast guide', () => {
  it('measures the real mass distribution', () => {
    // all the ink in the left half: the 50% core box must sit there
    const content = new paper.Rectangle(0, 0, 200, 100);
    const ink = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 100, 100)));
    const ctx: RenderContext = { useRealData: true, actualPaths: [ink], contentBounds: content };
    renderContrastGuide(new paper.Rectangle(0, 0, 200, 100), style, ctx);

    const core = paths().filter(p => p.closed && p.segments.length === 4)
      .sort((a, b) => b.bounds.width - a.bounds.width)[0];
    expect(core.bounds.left).toBeCloseTo(25, 0);
    expect(core.bounds.right).toBeCloseTo(75, 0);
    expect(core.bounds.top).toBeCloseTo(25, 0);
    expect(core.bounds.bottom).toBeCloseTo(75, 0);

    const label = texts().map(t => String(t.content)).join(' ');
    expect(label).toContain('50% INK');
    expect(label).toContain('density 50%'); // 100x100 of ink inside a 200x100 box
    expect(allFinite()).toBe(true);
  });

  it('falls back to a labelled zone without vector data and survives zero bounds', () => {
    renderContrastGuide(new paper.Rectangle(0, 0, 100, 100), style);
    expect(texts().map(t => String(t.content))).toContain('CONTRAST ZONE');
    scope.project.clear();
    expect(() => renderContrastGuide(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('visual weight map', () => {
  it('splits the ink box, not the artboard', () => {
    const content = new paper.Rectangle(100, 100, 200, 200);
    const ink = detached(new paper.Path.Rectangle(new paper.Rectangle(100, 200, 100, 100)));
    const ctx: RenderContext = { useRealData: true, actualPaths: [ink], contentBounds: content };
    renderVisualWeightMap(new paper.Rectangle(0, 0, 1000, 1000), [], style, ctx);
    const quads = paths().filter(p => p.closed && p.segments.length === 4);
    expect(quads).toHaveLength(4);
    for (const q of quads) {
      expect(q.bounds.width).toBeCloseTo(100, 6);
      expect(q.bounds.left).toBeGreaterThanOrEqual(99.999);
      expect(q.bounds.right).toBeLessThanOrEqual(300.001);
    }
    // the block fills exactly the bottom-left quadrant of the content box
    expect(texts().map(t => String(t.content))).toContain('100%');
    const w = inkQuadrantWeights([ink], content)!;
    expect(w[2]).toBeCloseTo(1, 6);
  });
});

describe('guide weights follow the rendered size', () => {
  it('scales strokes and labels instead of using fixed pixels', () => {
    const small = new paper.Rectangle(0, 0, 100, 100);
    renderKenBurnsSafe(small, style);
    const smallFont = texts()[0].fontSize as number;
    const smallStroke = Math.max(...paths().map(p => p.strokeWidth));
    scope.project.clear();

    const big = new paper.Rectangle(0, 0, 4000, 4000);
    renderKenBurnsSafe(big, style);
    const bigFont = texts()[0].fontSize as number;
    const bigStroke = Math.max(...paths().map(p => p.strokeWidth));
    expect(bigFont / smallFont).toBeGreaterThan(5);
    expect(bigStroke / smallStroke).toBeGreaterThan(5);
    scope.project.clear();

    renderOpticalCenter(big, style);
    expect(texts().every(t => (t.fontSize as number) > 20)).toBe(true);
    expect(paths().every(p => p.strokeWidth > 1)).toBe(true);
    expect(allFinite()).toBe(true);
  });
});

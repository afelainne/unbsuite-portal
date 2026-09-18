import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderTriangularGrid, renderPolarGrid, renderConcentricSquares,
  POLAR_RINGS, POLAR_SPOKES, CONCENTRIC_COUNT,
} from '../components/renderers/construction';
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
const allFinite = () => scope.project.getItems({}).every(i =>
  [i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));

function detached(p: paper.Path): paper.Path {
  p.fillColor = new paper.Color('black');
  p.remove();
  return p;
}

/** Straight two-point paths only (skips the labels and the centre dot). */
const lines = () => paths().filter(p => p.segments.length === 2);

function angleOf(p: paper.Path): number {
  const a = p.firstSegment.point;
  const b = p.lastSegment.point;
  let deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  deg = ((deg % 180) + 180) % 180;
  return deg > 179.999 ? 0 : deg;
}

describe('triangular grid', () => {
  it('draws three families at 0/60/120 degrees with one constant spacing', () => {
    const bounds = new paper.Rectangle(0, 0, 400, 400);
    renderTriangularGrid(bounds, style);
    const ls = lines();
    expect(ls.length).toBeGreaterThan(10);

    const families = new Map<number, paper.Path[]>();
    for (const l of ls) {
      const key = Math.round(angleOf(l) * 1e6) / 1e6;
      const bucket = families.get(key);
      if (bucket) bucket.push(l); else families.set(key, [l]);
    }
    expect([...families.keys()].sort((a, b) => a - b).map(v => Math.round(v))).toEqual([0, 60, 120]);

    // equilateral cells: the perpendicular offsets inside a family are
    // multiples of ONE spacing, the same for all three families
    const spacings: number[] = [];
    families.forEach((group, deg) => {
      const rad = (deg * Math.PI) / 180;
      const px = -Math.sin(rad), py = Math.cos(rad);
      const offsets = group
        .map(l => l.firstSegment.point.x * px + l.firstSegment.point.y * py)
        .sort((a, b) => a - b);
      const diffs: number[] = [];
      for (let i = 1; i < offsets.length; i++) {
        const d = offsets[i] - offsets[i - 1];
        if (d > 1e-6) diffs.push(d);
      }
      const unit = Math.min(...diffs);
      for (const d of diffs) expect(d / unit).toBeCloseTo(Math.round(d / unit), 4);
      spacings.push(unit);
    });
    for (const s of spacings) expect(s).toBeCloseTo(spacings[0], 4);
    // spacing d of lines 60° apart => equilateral triangles of side 2d/√3
    expect(spacings[0]).toBeCloseTo(50, 4); // min(400,400)/8
  });

  it('follows the content box and stays capped for extreme aspect ratios', () => {
    const content = new paper.Rectangle(600, 600, 200, 100);
    const blob = detached(new paper.Path.Rectangle(content));
    const ctx: RenderContext = { useRealData: true, actualPaths: [blob], contentBounds: content };
    renderTriangularGrid(new paper.Rectangle(0, 0, 1000, 1000), style, ctx);
    for (const l of lines()) {
      expect(l.bounds.left).toBeGreaterThanOrEqual(content.left - 1e-6);
      expect(l.bounds.right).toBeLessThanOrEqual(content.right + 1e-6);
      expect(l.bounds.top).toBeGreaterThanOrEqual(content.top - 1e-6);
      expect(l.bounds.bottom).toBeLessThanOrEqual(content.bottom + 1e-6);
    }

    scope.project.clear();
    renderTriangularGrid(new paper.Rectangle(0, 0, 4, 20000), style);
    expect(paths().length).toBeLessThanOrEqual(MAX_RENDER_ITEMS + 100);
    expect(allFinite()).toBe(true);

    scope.project.clear();
    expect(() => renderTriangularGrid(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(() => renderTriangularGrid(new paper.Rectangle(0, 0, 10, NaN), style)).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('polar grid', () => {
  it('has equally spaced rings and equally spaced spokes', () => {
    const content = new paper.Rectangle(100, 100, 400, 200);
    renderPolarGrid(content, style);

    const centre = content.center;
    const rings = paths().filter(p => p.closed && p.segments.length === 4 && p.bounds.width > 10)
      .map(p => p.bounds.width / 2)
      .sort((a, b) => a - b);
    expect(rings).toHaveLength(POLAR_RINGS);
    const maxR = Math.hypot(content.width / 2, content.height / 2);
    for (let i = 0; i < rings.length; i++) {
      expect(rings[i]).toBeCloseTo((maxR * (i + 1)) / POLAR_RINGS, 3);
    }
    // the outer ring reaches the corners of the content (wide logos included)
    expect(rings[rings.length - 1]).toBeCloseTo(maxR, 3);

    const spokes = lines().filter(l =>
      Math.abs(l.firstSegment.point.x - centre.x) < 1e-6 && Math.abs(l.firstSegment.point.y - centre.y) < 1e-6);
    expect(spokes).toHaveLength(POLAR_SPOKES);
    const angs = spokes
      .map(l => {
        const d = l.lastSegment.point.subtract(centre);
        return ((Math.atan2(d.y, d.x) * 180) / Math.PI + 360) % 360;
      })
      .sort((a, b) => a - b);
    for (let i = 0; i < angs.length; i++) expect(angs[i]).toBeCloseTo((360 / POLAR_SPOKES) * i, 4);
    for (const s of spokes) expect(s.length).toBeCloseTo(maxR, 3);
  });

  it('is anchored on the ink, not on the artboard', () => {
    const content = new paper.Rectangle(100, 100, 400, 200);
    // heavy block on the right: the centre of mass is not the box centre
    const light = detached(new paper.Path.Rectangle(new paper.Rectangle(100, 100, 40, 200)));
    const heavy = detached(new paper.Path.Rectangle(new paper.Rectangle(380, 100, 120, 200)));
    const ctx: RenderContext = {
      useRealData: true, actualPaths: [light, heavy], contentBounds: content,
    };
    renderPolarGrid(new paper.Rectangle(0, 0, 1000, 1000), style, ctx);
    const dot = paths().filter(p => p.closed && p.segments.length === 4)
      .sort((a, b) => a.bounds.width - b.bounds.width)[0];
    // ink: 8000 @ x=120 and 24000 @ x=440 -> 360
    expect(dot.bounds.center.x).toBeCloseTo(360, 0);
    expect(dot.bounds.center.y).toBeCloseTo(200, 0);
  });

  it('never divides by zero', () => {
    expect(() => renderPolarGrid(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(() => renderPolarGrid(new paper.Rectangle(0, 0, 1, 1), style)).not.toThrow();
    expect(() => renderPolarGrid(new paper.Rectangle(NaN, NaN, 10, 10), style)).not.toThrow();
    expect(allFinite()).toBe(true);
  });
});

describe('concentric squares', () => {
  it('uses a constant step and the content centre', () => {
    const bounds = new paper.Rectangle(0, 0, 500, 300);
    renderConcentricSquares(bounds, style);
    const squares = paths().filter(p => p.closed && p.segments.length === 4)
      .map(p => ({ half: p.bounds.width / 2, c: p.bounds.center }))
      .sort((a, b) => b.half - a.half);
    expect(squares).toHaveLength(CONCENTRIC_COUNT);

    for (const s of squares) {
      expect(s.c.x).toBeCloseTo(bounds.center.x, 6);
      expect(s.c.y).toBeCloseTo(bounds.center.y, 6);
    }
    const step = squares[0].half / CONCENTRIC_COUNT;
    for (let i = 1; i < squares.length; i++) {
      expect(squares[i - 1].half - squares[i].half).toBeCloseTo(step, 6);
    }
    expect(squares[0].half).toBeCloseTo(150, 6); // min(500, 300) / 2
  });

  it('falls back to the box centre when the ink centre would push it outside', () => {
    const content = new paper.Rectangle(0, 0, 200, 200);
    // all the ink in the top-left corner: the centre of mass is near the edge
    const blob = detached(new paper.Path.Rectangle(new paper.Rectangle(0, 0, 20, 20)));
    const ctx: RenderContext = { useRealData: true, actualPaths: [blob], contentBounds: content };
    renderConcentricSquares(content, style, ctx);
    const outer = paths().filter(p => p.closed && p.segments.length === 4)
      .sort((a, b) => b.bounds.width - a.bounds.width)[0];
    expect(outer.bounds.center.x).toBeCloseTo(100, 6);
    expect(outer.bounds.width).toBeCloseTo(200, 6);
    expect(allFinite()).toBe(true);

    scope.project.clear();
    expect(() => renderConcentricSquares(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  renderFlowerOfLife, renderReuleauxTriangle, renderHexGrid, hexGridRadius, resolveAnchor,
} from '../components/renderers/sacred';
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

/** A detached filled path (what `collectPaths` hands the renderers). */
function detached(p: paper.Path): paper.Path {
  p.fillColor = new paper.Color('black');
  p.remove();
  return p;
}

describe('flower of life', () => {
  const bounds = new paper.Rectangle(100, 100, 600, 600);
  const r = 100; // min(600, 600) / 6

  it('draws 19 circles of equal radius on a triangular lattice of spacing r', () => {
    renderFlowerOfLife(bounds, style);
    const circles = paths().filter(p => Math.abs(p.bounds.width / 2 - r) < 1e-6);
    expect(circles).toHaveLength(19);
    for (const c of circles) {
      expect(c.bounds.width).toBeCloseTo(c.bounds.height, 9); // round, not oval
      expect(c.bounds.width / 2).toBeCloseTo(r, 9);
    }

    const centers = circles.map(c => c.bounds.center);
    const seed = centers.find(p => Math.abs(p.x - bounds.center.x) < 1e-6 && Math.abs(p.y - bounds.center.y) < 1e-6);
    expect(seed).toBeDefined();

    // 6 neighbours at exactly r, 6 at r√3 and 6 at 2r: the classic lattice
    const dist = centers.map(p => p.getDistance(seed!)).sort((a, b) => a - b);
    expect(dist[0]).toBeCloseTo(0, 9);
    for (let i = 1; i <= 6; i++) expect(dist[i]).toBeCloseTo(r, 6);
    for (let i = 7; i <= 12; i++) expect(dist[i]).toBeCloseTo(r * Math.sqrt(3), 6);
    for (let i = 13; i <= 18; i++) expect(dist[i]).toBeCloseTo(2 * r, 6);

    // every circle passes through the center of each of its neighbours
    for (const a of centers) {
      const neighbours = centers.filter(b => Math.abs(b.getDistance(a) - r) < 1e-6);
      expect(neighbours.length).toBeGreaterThanOrEqual(3);
    }

    // the enclosing circle wraps the whole flower
    const enclosing = paths().filter(p => Math.abs(p.bounds.width / 2 - 3 * r) < 1e-6);
    expect(enclosing).toHaveLength(1);
  });

  it('centres on the ink and survives degenerate input', () => {
    const blob = detached(new paper.Path.Rectangle(new paper.Rectangle(500, 500, 120, 120)));
    const ctx: RenderContext = {
      useRealData: true, actualPaths: [blob],
      contentBounds: new paper.Rectangle(500, 500, 120, 120),
    };
    renderFlowerOfLife(bounds, style, ctx);
    const seed = paths().find(p => Math.abs(p.bounds.width / 2 - 20) < 1e-6);
    expect(seed).toBeDefined();
    expect(seed!.bounds.center.x).toBeCloseTo(560, 3);
    expect(seed!.bounds.center.y).toBeCloseTo(560, 3);
    expect(allFinite()).toBe(true);

    scope.project.clear();
    expect(() => renderFlowerOfLife(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(() => renderFlowerOfLife(new paper.Rectangle(0, 0, 1, 1), style)).not.toThrow();
    expect(() => renderFlowerOfLife(new paper.Rectangle(NaN, 0, 10, 10), style)).not.toThrow();
    expect(paths()).toHaveLength(0); // r < 0.5 for a 1px logo: nothing to draw
  });
});

describe('reuleaux triangle', () => {
  const bounds = new paper.Rectangle(0, 0, 400, 400);
  const r = 200;                       // circumradius
  const side = r * Math.sqrt(3);       // the constant width

  it('is a true curve of constant width', () => {
    renderReuleauxTriangle(bounds, style);
    const arcs = paths().filter(p => !p.closed && p.segments.length >= 2 && p.length > 1);
    expect(arcs).toHaveLength(3);

    // sample the whole boundary
    const pts: paper.Point[] = [];
    for (const arc of arcs) {
      for (let i = 0; i <= 60; i++) pts.push(arc.getPointAt((arc.length * i) / 60));
    }
    expect(pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);

    // width(θ) = max projection − min projection, must not change with θ
    const widths: number[] = [];
    for (let deg = 0; deg < 180; deg += 3) {
      const a = (deg * Math.PI) / 180;
      const ux = Math.cos(a), uy = Math.sin(a);
      let lo = Infinity, hi = -Infinity;
      for (const p of pts) {
        const v = p.x * ux + p.y * uy;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      widths.push(hi - lo);
    }
    const min = Math.min(...widths);
    const max = Math.max(...widths);
    expect(min).toBeGreaterThan(side * 0.99);
    expect(max).toBeLessThan(side * 1.01);
    expect((max - min) / side).toBeLessThan(0.01);

    // every arc has the side as its radius, centred on the opposite vertex
    const verts = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].map(a =>
      new paper.Point(bounds.center.x + r * Math.cos(a), bounds.center.y + r * Math.sin(a)));
    for (const arc of arcs) {
      const mid = arc.getPointAt(arc.length / 2);
      const centre = verts.reduce((best, v) =>
        Math.abs(v.getDistance(mid) - side) < Math.abs(best.getDistance(mid) - side) ? v : best, verts[0]);
      for (let i = 0; i <= 10; i++) {
        // Path.Arc is a Bézier approximation: a few parts per 100 000 off
        const d = centre.getDistance(arc.getPointAt((arc.length * i) / 10));
        expect(Math.abs(d - side) / side).toBeLessThan(1e-4);
      }
    }
  });

  it('skips degenerate bounds', () => {
    expect(() => renderReuleauxTriangle(new paper.Rectangle(0, 0, 0, 0), style)).not.toThrow();
    expect(() => renderReuleauxTriangle(new paper.Rectangle(0, 0, 1, 1), style)).not.toThrow();
    expect(paths()).toHaveLength(0);
  });
});

describe('hex grid', () => {
  it('tessellates without gaps or overlaps (every neighbour at √3·r)', () => {
    const bounds = new paper.Rectangle(0, 0, 320, 240);
    renderHexGrid(bounds, style);
    const hexes = paths().filter(p => p.segments.length === 6);
    expect(hexes.length).toBeGreaterThan(20);

    const r = 320 / 16;
    for (const h of hexes) {
      expect(h.bounds.width).toBeCloseTo(2 * r, 6);            // flat-top: vertex to vertex
      expect(h.bounds.height).toBeCloseTo(r * Math.sqrt(3), 6); // flat edge to flat edge
    }

    const centers = hexes.map(h => h.bounds.center);
    const expected = r * Math.sqrt(3);
    for (const a of centers) {
      let nearest = Infinity;
      for (const b of centers) {
        if (b === a) continue;
        const d = a.getDistance(b);
        if (d < nearest) nearest = d;
      }
      // no overlap (nothing closer than the lattice pitch) and no gap
      expect(nearest).toBeCloseTo(expected, 6);
    }
  });

  it('stays bounded for huge content and skips impossible radii', () => {
    renderHexGrid(new paper.Rectangle(0, 0, 4000, 400000), style);
    expect(scope.project.getItems({ class: paper.Path }).length).toBeLessThanOrEqual(MAX_RENDER_ITEMS);
    expect(allFinite()).toBe(true);
    scope.project.clear();
    renderHexGrid(new paper.Rectangle(0, 0, 4, 4), style);
    expect(paths()).toHaveLength(0); // r = 0.25 < 0.5
    expect(hexGridRadius({ width: 0, height: 10 })).toBe(0);
    expect(hexGridRadius({ width: NaN, height: 10 })).toBe(0);
  });
});

describe('resolveAnchor', () => {
  it('prefers the ink centre of mass over the node average', () => {
    // a long thin bar with many nodes on the left + a heavy block on the right
    const bar = new paper.Path.Rectangle(new paper.Rectangle(0, 0, 40, 4));
    bar.flatten(0.5);
    const block = new paper.Path.Rectangle(new paper.Rectangle(60, 0, 40, 40));
    [bar, block].forEach(detached);
    const box = new paper.Rectangle(0, 0, 100, 40);
    const anchor = resolveAnchor(box, { useRealData: true, actualPaths: [bar, block], contentBounds: box });
    // ink: 160 @ x=20 and 1600 @ x=80  ->  ~74.5, far right of the node average
    expect(anchor.center.x).toBeGreaterThan(70);
    expect(anchor.refRect.width).toBe(100);
    const plain = resolveAnchor(box, undefined);
    expect(plain.center.x).toBeCloseTo(50, 9);
  });
});

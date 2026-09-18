import './paper-env';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  flattenCubic, polygonSignedArea, scanlineCoverage, transposeShapes, strokeInk, shapesBounds,
  computeLogoMetrics, nameAspectRatio, clearMetricsCache, type FillShape, type Pt,
} from '../lib/metrics';

const rect = (x: number, y: number, w: number, h: number, ccw = false): Pt[] => {
  const pts = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  return ccw ? pts.reverse() : pts;
};
const svg = (body: string, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

describe('pure geometry', () => {
  it('flattenCubic: straight segments collapse, curves approximate a circle', () => {
    expect(flattenCubic({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 })).toEqual([{ x: 10, y: 0 }]);
    const k = 0.5522847498 * 50;
    const c = { x: 50, y: 50 };
    const quarters: Array<[Pt, Pt, Pt, Pt]> = [
      [{ x: 100, y: 50 }, { x: 100, y: 50 + k }, { x: 50 + k, y: 100 }, { x: 50, y: 100 }],
      [{ x: 50, y: 100 }, { x: 50 - k, y: 100 }, { x: 0, y: 50 + k }, { x: 0, y: 50 }],
      [{ x: 0, y: 50 }, { x: 0, y: 50 - k }, { x: 50 - k, y: 0 }, { x: 50, y: 0 }],
      [{ x: 50, y: 0 }, { x: 50 + k, y: 0 }, { x: 100, y: 50 - k }, { x: 100, y: 50 }],
    ];
    const ring: Pt[] = [];
    quarters.forEach(q => ring.push(...flattenCubic(...q, 0.1)));
    expect(Math.abs(polygonSignedArea(ring))).toBeCloseTo(Math.PI * 2500, -1);
    expect(ring.every(p => Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - 50) < 0.1)).toBe(true);
  });

  it('polygonSignedArea sign follows orientation', () => {
    expect(polygonSignedArea(rect(0, 0, 10, 5))).toBe(50);
    expect(polygonSignedArea(rect(0, 0, 10, 5, true))).toBe(-50);
  });

  it('scanlineCoverage: square area, centroid, quadrants, symmetry', () => {
    const cov = scanlineCoverage([{ rule: 'nonzero', rings: [rect(0, 0, 100, 100)] }], { rows: 64 });
    expect(cov.area).toBeCloseTo(10000);
    expect(cov.centroid).toEqual({ x: 50, y: 50 });
    expect(cov.quadrants.topLeft).toBeCloseTo(0.25);
    expect(cov.mirrorX).toBeCloseTo(1);
  });

  it('handles holes for evenodd and for opposite-winding nonzero; same-winding nonzero is solid', () => {
    const outer = rect(0, 0, 100, 100);
    const holeCW = rect(25, 25, 50, 50);
    const holeCCW = rect(25, 25, 50, 50, true);
    const box = { x: 0, y: 0, width: 100, height: 100 };
    expect(scanlineCoverage([{ rule: 'evenodd', rings: [outer, holeCW] }], { rows: 100, bounds: box }).area).toBeCloseTo(7500);
    expect(scanlineCoverage([{ rule: 'nonzero', rings: [outer, holeCCW] }], { rows: 100, bounds: box }).area).toBeCloseTo(7500);
    expect(scanlineCoverage([{ rule: 'nonzero', rings: [outer, holeCW] }], { rows: 100, bounds: box }).area).toBeCloseTo(10000);
  });

  it('unions overlapping shapes and weights the centroid by area', () => {
    const shapes: FillShape[] = [
      { rule: 'nonzero', rings: [rect(0, 0, 60, 20)] },
      { rule: 'nonzero', rings: [rect(40, 0, 60, 20)] }, // overlaps 20
      { rule: 'nonzero', rings: [rect(0, 80, 20, 20)] },
    ];
    const cov = scanlineCoverage(shapes, { rows: 100 });
    expect(cov.area).toBeCloseTo(2000 + 400);
    // bar 2000 @ (50,10), block 400 @ (10,90)
    expect(cov.centroid!.x).toBeCloseTo((2000 * 50 + 400 * 10) / 2400, 5);
    expect(cov.centroid!.y).toBeCloseTo((2000 * 10 + 400 * 90) / 2400, 5);
    expect(cov.quadrants.bottomRight).toBe(0);
    expect(cov.mirrorX).toBeLessThan(1);
  });

  it('transposeShapes + strokeInk + shapesBounds', () => {
    const t = transposeShapes([{ rule: 'nonzero', rings: [rect(0, 0, 10, 2)] }]);
    expect(shapesBounds(t)).toEqual({ x: 0, y: 0, width: 2, height: 10 });
    const ink = strokeInk([{ polylines: [[{ x: 0, y: 0 }, { x: 10, y: 0 }]], width: 2, closed: [false] }], { x: 20, y: 20 });
    expect(ink.area).toBe(20);
    expect(ink.mx / ink.area).toBe(5);
    expect(ink.q.topLeft).toBe(20);
    expect(scanlineCoverage([]).centroid).toBeNull();
  });
});

describe('computeLogoMetrics', () => {
  beforeEach(() => clearMetricsCache());

  it('centered square: no deviation, full coverage, symmetric', () => {
    const m = computeLogoMetrics(svg('<rect x="10" y="10" width="80" height="80" fill="#000"/>'));
    expect(m.width).toBeCloseTo(80);
    expect(m.aspectRatioLabel).toBe('1:1');
    expect(m.orientation).toBe('square');
    expect(m.inkCoverage).toBeCloseTo(1, 2);
    expect(m.deviationPercent).toBeCloseTo(0, 5);
    expect(m.balance).toEqual({ horizontal: 'centered', vertical: 'centered' });
    expect(m.symmetry.vertical).toBeCloseTo(1, 3);
    expect(m.symmetry.horizontal).toBeCloseTo(1, 3);
    expect(m.componentCount).toBe(1);
    expect(m.anchorCount).toBe(4);
    expect(m.smoothAnchorRatio).toBe(0);
    expect(m.opticalCenterTarget.y).toBeCloseTo(50 - 4);
  });

  it('bottom-left heavy logo: visual center moves down-left, reported in %', () => {
    const m = computeLogoMetrics(svg('<rect x="0" y="0" width="100" height="10"/><rect x="0" y="50" width="50" height="50"/>'));
    expect(m.inkArea).toBeCloseTo(1000 + 2500, 6);
    expect(m.offset.x).toBeLessThan(0);
    expect(m.offset.y).toBeGreaterThan(0);
    expect(m.balance).toEqual({ horizontal: 'left', vertical: 'bottom' });
    const expectedY = (1000 * 5 + 2500 * 75) / 3500;
    expect(m.offsetPercent.y).toBeCloseTo(expectedY - 50, 6);
    expect(m.quadrants.bottomLeft).toBeGreaterThan(0.6);
    expect(m.quadrants.bottomRight).toBeCloseTo(0, 5);
    expect(m.symmetry.vertical).toBeLessThan(0.7);
    expect(m.deviationPercent).toBeGreaterThan(5);
  });

  it('golden-ratio logo gets the φ label; portrait labels are flipped', () => {
    expect(computeLogoMetrics(svg('<rect width="161.8" height="100"/>', '0 0 200 100')).aspectRatioLabel).toBe('φ');
    expect(nameAspectRatio(9 / 16)).toBe('9:16');
    expect(nameAspectRatio(1 / Math.SQRT2)).toBe('1:√2');
    expect(nameAspectRatio(1.23)).toBe('1.23:1');
    expect(nameAspectRatio(0)).toBe('—');
  });

  it('counts compound-path holes and stroke-only ink', () => {
    const ring = computeLogoMetrics(svg('<path fill-rule="evenodd" d="M0 0H100V100H0Z M25 25H75V75H25Z"/>'));
    expect(ring.inkArea).toBeCloseTo(7500, -1);
    expect(ring.inkCoverage).toBeCloseTo(0.75, 2);
    const line = computeLogoMetrics(svg('<path d="M10 50H90" fill="none" stroke="#000" stroke-width="4"/>'));
    expect(line.inkArea).toBeCloseTo(320);
    expect(line.visualCenter!.x).toBeCloseTo(50);
  });

  it('circle: smooth anchors and curve-accurate area', () => {
    const m = computeLogoMetrics(svg('<circle cx="50" cy="50" r="40"/>'), { resolution: 512 });
    expect(m.inkArea / (Math.PI * 1600)).toBeCloseTo(1, 2);
    expect(m.smoothAnchorRatio).toBe(1);
  });

  it('empty logo returns null visual center and zeros', () => {
    const m = computeLogoMetrics(svg('<title>x</title>'));
    expect(m.visualCenter).toBeNull();
    expect(m.inkArea).toBe(0);
    expect(m.deviationPercent).toBe(0);
    expect(m.aspectRatioLabel).toBe('—');
  });

  it('accepts a ParsedSVG-like object, memoizes, and returns independent copies', () => {
    const input = { originalSVG: svg('<rect width="10" height="20"/>') };
    const a = computeLogoMetrics(input);
    a.geometricCenter.x = 999;
    const b = computeLogoMetrics(input);
    expect(b.geometricCenter.x).toBe(5);
    expect(b.orientation).toBe('portrait');
  });
});

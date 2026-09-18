// `measure-scene` pulls in paper, which touches the canvas API at import time.
import './paper-env';
import { describe, it, expect } from 'vitest';
import {
  EMPTY_VALUE,
  SNAP_KIND_LABEL,
  angleDegrees,
  boxSnapCandidates,
  canvasToSvg,
  clampNumber,
  collectIntersections,
  computeRulerTicks,
  constrainToAngleSteps,
  createMeasurementId,
  createPointIndex,
  decimalsForStep,
  dedupePoints,
  describeMeasurement,
  distanceToSegment,
  finiteOr,
  formatAngle,
  formatDistance,
  formatNumber,
  formatPercent,
  hitTestMeasurements,
  makeTransform,
  nearestPointOnSegment,
  niceStep,
  normalizeDegrees,
  ratioOfLongestSide,
  segmentIntersection,
  snapPoint,
  svgToCanvas,
  type Measurement,
  type MeasurePoint,
  type SnapCandidate,
} from '../lib/measure';
import { layerIdToGeometryKey, RESERVED_LAYER_IDS } from '../lib/measure-scene';

const P = (x: number, y: number): MeasurePoint => ({ x, y });

/** Every number reachable from `value`, so "no NaN" can be asserted in bulk. */
function numbersIn(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) for (const v of value) numbersIn(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) numbersIn(v, out);
  return out;
}

describe('snapPoint', () => {
  const candidates: SnapCandidate[] = [
    { point: P(100, 100), kind: 'node' },
    { point: P(104, 100), kind: 'intersection' },
    { point: P(103, 100), kind: 'center' },
    { point: P(102, 100), kind: 'edge' },
  ];

  it('picks the strongest candidate inside the radius', () => {
    // The edge is nearest in raw distance, but the node wins on the weighted
    // score (4 * 0.55 = 2.2 against 2 * 1 = 2.0 ... edge still wins here).
    const near = snapPoint(P(102, 100), candidates, 12);
    expect(near.kind).toBe('edge');
    expect(near.snapped).toBe(true);

    // Right on top of the node: nothing can beat it.
    const onNode = snapPoint(P(100.5, 100), candidates, 12);
    expect(onNode.kind).toBe('node');
    expect(onNode.point).toEqual(P(100, 100));
    expect(onNode.distance).toBeCloseTo(0.5, 6);
  });

  it('prefers a slightly farther node over an edge (kind weighting)', () => {
    const pair: SnapCandidate[] = [
      { point: P(0, 0), kind: 'node' },
      { point: P(7, 0), kind: 'edge' },
    ];
    // Pointer at x = 5: node is 5 away (score 2.75), edge is 2 away (score 2).
    expect(snapPoint(P(5, 0), pair, 12).kind).toBe('edge');
    // Pointer at x = 4: node is 4 away (score 2.2), edge is 3 away (score 3).
    expect(snapPoint(P(4, 0), pair, 12).kind).toBe('node');
  });

  it('ignores candidates outside the radius and falls back to free', () => {
    const result = snapPoint(P(0, 0), candidates, 10);
    expect(result.snapped).toBe(false);
    expect(result.kind).toBe('free');
    expect(result.label).toBe(SNAP_KIND_LABEL.free);
    expect(result.point).toEqual(P(0, 0));
  });

  it('keeps the candidate label when there is one', () => {
    const labelled: SnapCandidate[] = [{ point: P(1, 1), kind: 'center', label: 'Centro do logo' }];
    expect(snapPoint(P(1, 1), labelled, 5).label).toBe('Centro do logo');
  });

  it('survives garbage input without producing NaN', () => {
    const dirty = [
      { point: P(NaN, 3), kind: 'node' },
      { point: P(1, Infinity), kind: 'edge' },
      null,
    ] as unknown as SnapCandidate[];
    const a = snapPoint(P(NaN, NaN), dirty, 10);
    expect(numbersIn(a).every(Number.isFinite)).toBe(true);
    const b = snapPoint(P(2, 2), dirty, NaN);
    expect(b.snapped).toBe(false);
    expect(numbersIn(b).every(Number.isFinite)).toBe(true);
    expect(snapPoint(P(2, 2), [], 10).snapped).toBe(false);
    expect(snapPoint(P(2, 2), candidates, -4).snapped).toBe(false);
  });
});

describe('snap candidate sources', () => {
  it('offers centre, corners and edge projections for a box', () => {
    const list = boxSnapCandidates({ x: 0, y: 0, width: 100, height: 50 }, P(40, -30));
    const centre = list.find(c => c.kind === 'center');
    expect(centre?.point).toEqual(P(50, 25));
    expect(list.filter(c => c.label === 'Canto')).toHaveLength(4);
    // Pointer above the box: the top edge projection lands right below it.
    const projections = list.filter(c => c.kind === 'edge' && !c.label);
    expect(projections).toHaveLength(4);
    expect(projections.some(c => Math.abs(c.point.x - 40) < 1e-9 && Math.abs(c.point.y) < 1e-9)).toBe(true);
    expect(numbersIn(list).every(Number.isFinite)).toBe(true);
    expect(boxSnapCandidates(null)).toEqual([]);
    expect(boxSnapCandidates({ x: NaN, y: 0, width: 1, height: 1 })).toEqual([]);
  });

  it('finds construction intersections near the pointer only', () => {
    const segments = [
      { a: P(0, 50), b: P(100, 50) },
      { a: P(50, 0), b: P(50, 100) },
      { a: P(0, 900), b: P(100, 900) },
      { a: P(50, 800), b: P(50, 1000) },
    ];
    const near = collectIntersections(segments, { near: P(52, 48), radius: 20 });
    expect(near).toHaveLength(1);
    expect(near[0].kind).toBe('intersection');
    expect(near[0].point.x).toBeCloseTo(50, 9);
    expect(near[0].point.y).toBeCloseTo(50, 9);

    expect(collectIntersections(segments).length).toBe(2);
    expect(collectIntersections([segments[0]])).toEqual([]);
    expect(collectIntersections(segments, { maxResults: 1 })).toHaveLength(1);
  });

  it('segmentIntersection rejects parallel and out-of-range crossings', () => {
    expect(segmentIntersection(P(0, 0), P(10, 0), P(0, 5), P(10, 5))).toBeNull();
    expect(segmentIntersection(P(0, 0), P(10, 0), P(20, -5), P(20, 5))).toBeNull();
    expect(segmentIntersection(P(0, 0), P(10, 0), P(5, -5), P(5, 5))).toEqual(P(5, 0));
    expect(segmentIntersection(P(NaN, 0), P(10, 0), P(5, -5), P(5, 5))).toBeNull();
  });

  it('nearestPointOnSegment clamps to the segment', () => {
    expect(nearestPointOnSegment(P(5, 10), P(0, 0), P(10, 0))).toEqual(P(5, 0));
    expect(nearestPointOnSegment(P(-50, 10), P(0, 0), P(10, 0))).toEqual(P(0, 0));
    expect(nearestPointOnSegment(P(5, 5), P(3, 3), P(3, 3))).toEqual(P(3, 3));
    expect(distanceToSegment(P(5, 10), P(0, 0), P(10, 0))).toBeCloseTo(10, 9);
  });
});

describe('point index', () => {
  it('returns exactly the points inside the query disc', () => {
    const points = Array.from({ length: 400 }, (_, i) => P((i % 20) * 10, Math.floor(i / 20) * 10));
    const index = createPointIndex(points);
    expect(index.size).toBe(400);
    const hits = index.query(P(51, 51), 12);
    const keys = hits.map(p => `${p.x},${p.y}`).sort();
    // Exactly the grid nodes within 12px of (51, 51) — (60,60) is 12.7 away.
    expect(keys).toEqual(['40,50', '50,40', '50,50', '50,60', '60,50']);
    expect(index.query(P(51, 51), -1)).toEqual([]);
    expect(index.query(P(NaN, 0), 10)).toEqual([]);
  });

  it('handles empty and degenerate inputs', () => {
    const empty = createPointIndex([]);
    expect(empty.size).toBe(0);
    expect(empty.cellSize).toBeGreaterThan(0);
    expect(empty.query(P(0, 0), 100)).toEqual([]);
    const single = createPointIndex([P(4, 4), P(NaN, 1)]);
    expect(single.size).toBe(1);
    expect(single.query(P(4, 4), 1)).toEqual([P(4, 4)]);
  });

  it('dedupePoints merges coincident nodes', () => {
    const merged = dedupePoints([P(0, 0), P(0.2, 0), P(3, 0), P(3.4, 0)], 0.5);
    expect(merged).toEqual([P(0, 0), P(3, 0)]);
    expect(dedupePoints([P(NaN, 0)])).toEqual([]);
  });
});

describe('angle lock', () => {
  it('snaps to 0, 45 and 90 degrees keeping the dragged length', () => {
    const origin = P(0, 0);
    const cases: [MeasurePoint, number][] = [
      [P(100, 5), 0],
      [P(100, -98), 45],
      [P(5, -100), 90],
      [P(-100, -96), 135],
      [P(-100, 3), 180],
      [P(-96, 100), 225],
      [P(2, 100), 270],
      [P(100, 96), 315],
    ];
    for (const [raw, expected] of cases) {
      const locked = constrainToAngleSteps(origin, raw);
      expect(angleDegrees(origin, locked)).toBeCloseTo(expected, 6);
      expect(Math.hypot(locked.x, locked.y)).toBeCloseTo(Math.hypot(raw.x, raw.y), 9);
    }
  });

  it('accepts other steps and degenerate input', () => {
    const locked = constrainToAngleSteps(P(10, 10), P(40, 10), 90);
    expect(locked).toEqual(P(40, 10));
    expect(constrainToAngleSteps(P(3, 3), P(3, 3))).toEqual(P(3, 3));
    expect(constrainToAngleSteps(P(3, 3), P(NaN, 1))).toEqual(P(3, 3));
    const fromBadOrigin = constrainToAngleSteps(P(NaN, 0), P(1, 2));
    expect(numbersIn(fromBadOrigin).every(Number.isFinite)).toBe(true);
    // A zero/negative step falls back to 45 instead of dividing by zero.
    const fallback = constrainToAngleSteps(P(0, 0), P(100, -98), 0);
    expect(angleDegrees(P(0, 0), fallback)).toBeCloseTo(45, 6);
  });

  it('angleDegrees reads like a protractor and never returns -0', () => {
    expect(angleDegrees(P(0, 0), P(10, 0))).toBe(0);
    expect(angleDegrees(P(0, 0), P(0, -10))).toBeCloseTo(90, 9);
    expect(angleDegrees(P(0, 0), P(-10, 0))).toBeCloseTo(180, 9);
    expect(angleDegrees(P(0, 0), P(0, 10))).toBeCloseTo(270, 9);
    expect(Object.is(angleDegrees(P(0, 0), P(0, 0)), -0)).toBe(false);
    expect(angleDegrees(P(0, 0), P(NaN, 1))).toBe(0);
    expect(normalizeDegrees(-45)).toBeCloseTo(315, 9);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(NaN)).toBe(0);
  });
});

describe('formatting', () => {
  it('formats distances with adaptive precision', () => {
    expect(formatDistance(0, 'u')).toBe('0 u');
    expect(formatDistance(1234.567, 'u')).toBe('1235 u');
    expect(formatDistance(124.456, 'u')).toBe('124.5 u');
    expect(formatDistance(12.3456, 'u')).toBe('12.35 u');
    expect(formatDistance(1.5, 'u')).toBe('1.5 u');
    expect(formatDistance(0.25, 'u')).toBe('0.25 u');
    expect(formatDistance(0.0004, 'u')).toBe('0.0004 u');
    expect(formatDistance(100, 'px')).toBe('100 px');
  });

  it('never leaks NaN, Infinity or -0 to the screen', () => {
    expect(formatNumber(NaN)).toBe(EMPTY_VALUE);
    expect(formatNumber(Infinity)).toBe(EMPTY_VALUE);
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0.0001)).toBe('-0.0001');
    expect(formatDistance(NaN)).toBe(EMPTY_VALUE);
    expect(formatAngle(NaN)).toBe(EMPTY_VALUE);
    expect(formatPercent(NaN)).toBe(EMPTY_VALUE);
    expect(formatPercent(Infinity)).toBe(EMPTY_VALUE);
  });

  it('honours the decimal cap and separator', () => {
    expect(formatNumber(12.3456, { maxDecimals: 1 })).toBe('12.3');
    expect(formatNumber(12.3456, { maxDecimals: 0 })).toBe('12');
    expect(formatNumber(12.5, { separator: ',' })).toBe('12,5');
    expect(formatAngle(45)).toBe('45°');
    expect(formatAngle(44.96)).toBe('45°');
    expect(formatPercent(0.1234)).toBe('12.3%');
  });

  it('ratioOfLongestSide guards degenerate boxes', () => {
    expect(ratioOfLongestSide(50, { x: 0, y: 0, width: 200, height: 100 })).toBeCloseTo(0.25, 9);
    expect(ratioOfLongestSide(50, { x: 0, y: 0, width: 0, height: 0 })).toBeNull();
    expect(ratioOfLongestSide(NaN, { x: 0, y: 0, width: 10, height: 10 })).toBeNull();
    expect(ratioOfLongestSide(50, null)).toBeNull();
  });
});

describe('describeMeasurement', () => {
  const box = { x: 0, y: 0, width: 400, height: 200 };

  it('reports distance, percentage of the longest side and angle', () => {
    const readout = describeMeasurement(P(0, 0), P(100, 0), box, 'u');
    expect(readout.distance).toBeCloseTo(100, 9);
    expect(readout.angleDeg).toBe(0);
    expect(readout.distanceLabel).toBe('100 u');
    expect(readout.percentLabel).toBe('25%');
    expect(readout.angleLabel).toBe('0°');
    expect(readout.primaryLabel).toBe('100 u · 25% · 0°');
  });

  it('drops the percentage when there is no usable box', () => {
    const readout = describeMeasurement(P(0, 0), P(0, -30), null, 'u');
    expect(readout.percentLabel).toBeNull();
    expect(readout.angleDeg).toBeCloseTo(90, 9);
    expect(readout.primaryLabel).toBe('30 u · 90°');
  });

  it('never produces NaN, even from broken endpoints', () => {
    const readout = describeMeasurement(
      { x: NaN, y: undefined as unknown as number },
      { x: Infinity, y: 4 },
      { x: 0, y: 0, width: NaN, height: NaN },
      'u',
    );
    expect(numbersIn(readout).every(Number.isFinite)).toBe(true);
    expect(readout.primaryLabel).not.toContain('NaN');
    expect(readout.primaryLabel).not.toContain('Infinity');
  });
});

describe('ruler ticks', () => {
  const LENGTH = 900;

  it('keeps labels apart at every zoom level', () => {
    const zooms = [0.02, 0.1, 0.37, 1, 2.5, 7, 19, 60];
    for (const pixelsPerUnit of zooms) {
      const result = computeRulerTicks({ originValue: -123.4, pixelsPerUnit, length: LENGTH, minLabelSpacing: 64 });
      const majors = result.ticks.filter(t => t.major);
      expect(majors.length).toBeGreaterThan(0);
      for (let i = 1; i < majors.length; i++) {
        expect(majors[i].position - majors[i - 1].position).toBeGreaterThanOrEqual(64 - 1e-6);
      }
      // Minor ticks stay readable too.
      for (let i = 1; i < result.ticks.length; i++) {
        expect(result.ticks[i].position - result.ticks[i - 1].position).toBeGreaterThanOrEqual(6 - 1e-6);
      }
      // Every tick sits inside the ruler and carries a usable label.
      for (const tick of result.ticks) {
        expect(tick.position).toBeGreaterThanOrEqual(-0.5);
        expect(tick.position).toBeLessThanOrEqual(LENGTH + 0.5);
        expect(Number.isFinite(tick.value)).toBe(true);
        if (tick.major) expect(tick.label).not.toBe(EMPTY_VALUE);
        else expect(tick.label).toBeNull();
      }
    }
  });

  it('labels never repeat within one ruler', () => {
    for (const pixelsPerUnit of [0.05, 1, 12, 250]) {
      const result = computeRulerTicks({ originValue: 0.037, pixelsPerUnit, length: 600 });
      const labels = result.ticks.filter(t => t.major).map(t => t.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('covers the whole ruler and follows pan', () => {
    const a = computeRulerTicks({ originValue: 0, pixelsPerUnit: 2, length: 400 });
    expect(a.ticks[0].position).toBeLessThan(a.minorStep * 2 + 0.5);
    expect(a.ticks[a.ticks.length - 1].position).toBeGreaterThan(400 - a.minorStep * 2 - 0.5);
    const b = computeRulerTicks({ originValue: 500, pixelsPerUnit: 2, length: 400 });
    expect(b.step).toBe(a.step);
    expect(b.ticks[0].value).toBeGreaterThanOrEqual(500 - b.minorStep);
  });

  it('returns nothing instead of looping on degenerate input', () => {
    expect(computeRulerTicks({ originValue: 0, pixelsPerUnit: 0, length: 100 }).ticks).toEqual([]);
    expect(computeRulerTicks({ originValue: 0, pixelsPerUnit: -3, length: 100 }).ticks).toEqual([]);
    expect(computeRulerTicks({ originValue: NaN, pixelsPerUnit: 1, length: 100 }).ticks).toEqual([]);
    expect(computeRulerTicks({ originValue: 0, pixelsPerUnit: 1, length: 0 }).ticks).toEqual([]);
    const capped = computeRulerTicks({ originValue: 0, pixelsPerUnit: 1, length: 1e6, maxTicks: 50 });
    expect(capped.ticks.length).toBeLessThanOrEqual(50);
  });

  it('niceStep / decimalsForStep produce 1-2-5 ladders', () => {
    expect(niceStep(0.7)).toBeCloseTo(1, 9);
    expect(niceStep(1.4)).toBeCloseTo(2, 9);
    expect(niceStep(3)).toBeCloseTo(5, 9);
    expect(niceStep(7)).toBeCloseTo(10, 9);
    expect(niceStep(0.03)).toBeCloseTo(0.05, 9);
    expect(niceStep(0)).toBe(1);
    expect(niceStep(NaN)).toBe(1);
    expect(decimalsForStep(10)).toBe(0);
    expect(decimalsForStep(0.5)).toBe(1);
    expect(decimalsForStep(0.02)).toBe(2);
    expect(decimalsForStep(0)).toBe(0);
  });
});

describe('transform and hit testing', () => {
  const transform = makeTransform({ x: 100, y: 50, width: 400, height: 200 }, { x: 0, y: 0, width: 200, height: 100 });

  it('maps canvas and svg space both ways', () => {
    expect(transform).not.toBeNull();
    const t = transform!;
    expect(t.scale).toBeCloseTo(2, 9);
    expect(svgToCanvas(P(0, 0), t)).toEqual(P(100, 50));
    expect(svgToCanvas(P(200, 100), t)).toEqual(P(500, 250));
    expect(canvasToSvg(P(500, 250), t)).toEqual(P(200, 100));
    expect(numbersIn(canvasToSvg(P(NaN, NaN), t)).every(Number.isFinite)).toBe(true);
  });

  it('refuses degenerate rects', () => {
    expect(makeTransform(null, { x: 0, y: 0, width: 1, height: 1 })).toBeNull();
    expect(makeTransform({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 0, height: 0 })).toBeNull();
    expect(makeTransform({ x: 0, y: 0, width: NaN, height: 10 }, { x: 0, y: 0, width: 5, height: 5 })).toBeNull();
  });

  it('finds the cota under the pointer', () => {
    const measurements: Measurement[] = [
      { id: 'a', a: P(0, 0), b: P(100, 0), aKind: 'node', bKind: 'node' },
      { id: 'b', a: P(0, 40), b: P(100, 40), aKind: 'edge', bKind: 'edge' },
    ];
    expect(hitTestMeasurements(measurements, P(50, 2), 6)).toBe('a');
    expect(hitTestMeasurements(measurements, P(50, 38), 6)).toBe('b');
    expect(hitTestMeasurements(measurements, P(50, 20), 6)).toBeNull();
    expect(hitTestMeasurements([], P(0, 0), 6)).toBeNull();
    expect(hitTestMeasurements(measurements, P(NaN, 0), 6)).toBeNull();
    const t = transform!;
    expect(hitTestMeasurements(measurements, svgToCanvas(P(50, 0), t), 6, p => svgToCanvas(p, t))).toBe('a');
  });

  it('createMeasurementId is unique', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createMeasurementId()));
    expect(ids.size).toBe(200);
  });
});

describe('helpers', () => {
  it('finiteOr and clampNumber guard bad numbers', () => {
    expect(finiteOr(NaN)).toBe(0);
    expect(finiteOr(undefined, 7)).toBe(7);
    expect(Object.is(finiteOr(-0), -0)).toBe(false);
    expect(clampNumber(5, 0, 3)).toBe(3);
    expect(clampNumber(-5, 0, 3)).toBe(0);
    expect(clampNumber(NaN, 2, 3)).toBe(2);
  });

  it('maps construction layer ids back to geometry keys', () => {
    expect(layerIdToGeometryKey('golden-ratio')).toBe('goldenRatio');
    expect(layerIdToGeometryKey('bounding-rects')).toBe('boundingRects');
    expect(layerIdToGeometryKey('logo')).toBeNull();
    expect(layerIdToGeometryKey('')).toBeNull();
    expect(layerIdToGeometryKey(null)).toBeNull();
    expect(RESERVED_LAYER_IDS.has('clearspace')).toBe(true);
  });
});

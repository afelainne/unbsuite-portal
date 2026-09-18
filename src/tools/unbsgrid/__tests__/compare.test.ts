import './paper-env';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  compareLogos, parseCompareVersion, describeCompareError, clearCompareCache, CompareError,
  rasterize, scanRuns, minThickness, strokeRings, transformShapes, toAlignedSVG, svgToDataUrl,
  diffMapToRGBA, formatDelta,
  type CompareMetricKey, type CompareMetricRow,
} from '../lib/compare';
import { clearMetricsCache, type Box, type FillShape } from '../lib/metrics';

const svg = (body: string, vb = '0 0 100 100') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

const rect = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/>`;

const ring = (x: number, y: number, w: number, h: number): FillShape => ({
  rule: 'nonzero',
  rings: [[{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]],
});

const row = (rows: CompareMetricRow[], key: CompareMetricKey): CompareMetricRow => {
  const found = rows.find(r => r.key === key);
  if (!found) throw new Error(`missing row ${key}`);
  return found;
};

/**
 * Two outer bars (identical in both versions) + one inner bar that moves.
 * The outer bars keep the ink bounds identical, so the centre/height
 * alignment is the same and only the inner bar creates a difference.
 */
const BARS_A = svg(rect(0, 0, 10, 100) + rect(90, 0, 10, 100) + rect(20, 0, 10, 100));
const BARS_B = svg(rect(0, 0, 10, 100) + rect(90, 0, 10, 100) + rect(50, 0, 10, 100));

beforeEach(() => {
  clearCompareCache();
  clearMetricsCache();
});

describe('scan primitives', () => {
  const box: Box = { x: 0, y: 0, width: 100, height: 100 };

  it('scanRuns merges overlapping shapes into a single run', () => {
    const scan = scanRuns([ring(0, 0, 60, 100), ring(40, 0, 60, 100)], box, 8);
    expect(scan.runs[0]).toEqual([[0, 100]]);
  });

  it('rasterize fills exactly the covered cells', () => {
    const grid = rasterize([ring(0, 0, 50, 100)], box, 10, 10);
    const firstRow = Array.from(grid.slice(0, 10));
    expect(firstRow.slice(0, 5)).toEqual([1, 1, 1, 1, 1]);
    expect(firstRow.slice(5)).toEqual([0, 0, 0, 0, 0]);
  });

  it('minThickness returns the thinnest stem, not the longest run', () => {
    // 100 wide, 10 tall bar: horizontal run 100, vertical run 10.
    const t = minThickness([ring(0, 45, 100, 10)], box, 128);
    expect(t.value).toBeGreaterThan(9);
    expect(t.value).toBeLessThan(11);
    expect(t.at).not.toBeNull();
  });

  it('strokeRings turns a stroked polyline into ribbons of the right area', () => {
    const rings = strokeRings([{ polylines: [[{ x: 0, y: 50 }, { x: 100, y: 50 }]], width: 10, closed: [false] }]);
    expect(rings).toHaveLength(1);
    const covered = rasterize(rings, box, 100, 100);
    const inked = covered.reduce((s, v) => s + v, 0) * (100 / 100) * (100 / 100);
    // 110 x 10 ribbon (extended by half a width at each end), clipped to the box.
    expect(inked).toBeGreaterThan(900);
  });

  it('transformShapes aligns by centre and height', () => {
    const moved = transformShapes([ring(10, 20, 40, 80)], 1 / 80, 30, 60);
    const pts = moved[0].rings[0];
    expect(pts[0]).toEqual({ x: -0.25, y: -0.5 });
    expect(pts[2]).toEqual({ x: 0.25, y: 0.5 });
  });
});

describe('compareLogos — coinciding area', () => {
  it('identical shapes coincide 100%', () => {
    const result = compareLogos(BARS_A, BARS_A);
    expect(result.matchPercent).toBeCloseTo(100, 6);
    expect(result.diff.onlyAPercent).toBeCloseTo(0, 6);
    expect(result.diff.onlyBPercent).toBeCloseTo(0, 6);
    expect(result.diff.areaA).toBeCloseTo(result.diff.areaB, 6);
  });

  it('identical shapes in different artboards still coincide 100%', () => {
    // Same drawing, twice as big, on a bigger artboard: centre + height
    // alignment must cancel scale and position.
    const big = svg(
      rect(0, 0, 20, 200) + rect(180, 0, 20, 200) + rect(40, 0, 20, 200),
      '0 0 200 200',
    );
    const result = compareLogos(BARS_A, big);
    expect(result.matchPercent).toBeGreaterThan(99);
  });

  it('a displaced element lowers the coinciding area', () => {
    const result = compareLogos(BARS_A, BARS_B);
    // 2 of 3 bars overlap: intersection 2, union 4 → 50%.
    expect(result.matchPercent).toBeGreaterThan(45);
    expect(result.matchPercent).toBeLessThan(55);
    expect(result.matchPercent).toBeLessThan(compareLogos(BARS_A, BARS_A).matchPercent);
    expect(result.diff.onlyAPercent).toBeGreaterThan(20);
    expect(result.diff.onlyBPercent).toBeGreaterThan(20);
    // The exclusive maps really hold ink, the shared one too.
    const sum = (g: Float32Array) => g.reduce((s, v) => s + v, 0);
    expect(sum(result.diff.both)).toBeGreaterThan(0);
    expect(sum(result.diff.onlyA)).toBeGreaterThan(0);
    expect(sum(result.diff.onlyB)).toBeGreaterThan(0);
  });

  it('the difference map partitions every cell (both + onlyA + onlyB ≤ 1)', () => {
    const { diff } = compareLogos(BARS_A, BARS_B);
    expect(diff.onlyA).toHaveLength(diff.cols * diff.rows);
    for (let i = 0; i < diff.onlyA.length; i++) {
      expect(diff.both[i] + diff.onlyA[i] + diff.onlyB[i]).toBeLessThanOrEqual(1 + 1e-6);
      expect(diff.onlyA[i] * diff.onlyB[i]).toBeCloseTo(0, 6);
    }
  });
});

describe('compareLogos — metric table', () => {
  it('uses the right sign on every variation', () => {
    const one = svg(rect(0, 0, 100, 100));
    const two = svg(rect(0, 0, 40, 100) + rect(60, 0, 40, 100));
    const result = compareLogos(one, two);

    const anchors = row(result.metrics, 'anchorCount');
    expect(anchors.a).toBe(4);
    expect(anchors.b).toBe(8);
    expect(anchors.delta).toBe(4);
    expect(anchors.deltaPercent).toBeCloseTo(100, 6);
    expect(anchors.direction).toBe('up');
    expect(formatDelta(anchors)).toBe('+100.0%');

    const coverage = row(result.metrics, 'inkCoverage');
    expect(coverage.a).toBeCloseTo(1, 2);
    expect(coverage.b).toBeLessThan(coverage.a);
    expect(coverage.delta).toBeLessThan(0);
    expect(coverage.deltaPercent).toBeLessThan(0);
    expect(coverage.direction).toBe('down');
    expect(formatDelta(coverage).startsWith('−')).toBe(true);

    // Swapping the versions mirrors every sign.
    const swapped = compareLogos(two, one);
    expect(row(swapped.metrics, 'anchorCount').direction).toBe('down');
    expect(row(swapped.metrics, 'anchorCount').delta).toBe(-4);
    expect(row(swapped.metrics, 'inkCoverage').direction).toBe('up');
  });

  it('reports no variation between identical versions', () => {
    const result = compareLogos(BARS_A, BARS_A);
    for (const r of result.metrics) {
      expect(r.direction).toBe('same');
      expect(r.delta).toBe(0);
      expect(formatDelta(r)).toBe('=');
      expect(r.aLabel).toBe(r.bLabel);
    }
  });

  it('measures the minimum thickness relative to the height', () => {
    // A 10-unit stem in a 100-tall logo = 10% of the height.
    const thin = svg(rect(0, 0, 10, 100) + rect(90, 0, 10, 100));
    const thick = svg(rect(0, 0, 30, 100) + rect(70, 0, 30, 100));
    const result = compareLogos(thin, thick);
    const t = row(result.metrics, 'minThickness');
    expect(t.a).toBeGreaterThan(0.08);
    expect(t.a).toBeLessThan(0.12);
    expect(t.b).toBeGreaterThan(t.a);
    expect(t.direction).toBe('up');
    expect(result.a.minThicknessAt).not.toBeNull();
  });

  it('carries proportion, symmetry and both sides of the comparison', () => {
    const wide = svg(rect(0, 0, 100, 50));
    const square = svg(rect(0, 0, 100, 100));
    const result = compareLogos(wide, square);
    const ratio = row(result.metrics, 'aspectRatio');
    expect(ratio.a).toBeCloseTo(2, 3);
    expect(ratio.b).toBeCloseTo(1, 3);
    expect(ratio.aLabel).toBe('2:1');
    expect(ratio.bLabel).toBe('1:1');
    expect(ratio.direction).toBe('down');
    expect(row(result.metrics, 'symmetryVertical').a).toBeGreaterThan(0.99);
    expect(result.a.aspect).toBeCloseTo(2, 3);
    expect(result.frameAspect).toBeCloseTo(2, 3);
    expect(result.metrics.map(r => r.key)).toEqual([
      'aspectRatio', 'inkCoverage', 'visualCenter', 'symmetryVertical',
      'symmetryHorizontal', 'anchorCount', 'minThickness',
    ]);
  });
});

describe('compareLogos — aligned output for the viewer', () => {
  it('gives each side an SVG cropped to its ink bounds', () => {
    const result = compareLogos(svg(rect(20, 30, 40, 20)), BARS_A);
    expect(result.a.bounds.width).toBeCloseTo(40, 3);
    expect(result.a.bounds.height).toBeCloseTo(20, 3);
    expect(result.a.alignedSVG).toContain('viewBox="20 30 40 20"');
    // The original file becomes a nested <svg> placed at its own viewBox.
    expect(result.a.alignedSVG).toMatch(/<svg[^>]*>\s*<svg/);
    expect(svgToDataUrl(result.a.alignedSVG).startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  });

  it('crops in the file own coordinates, not in paper viewport coordinates', () => {
    // paper shifts everything by −viewBox.min when importing; the aligned
    // viewBox must undo that or the crop lands on the wrong part of the logo.
    const shifted = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 400 400" width="400" height="400">
      <rect x="24" y="44" width="124" height="96" fill="#000"/></svg>`;
    const result = compareLogos(shifted, shifted);
    expect(result.a.alignedSVG).toContain('viewBox="24 44 124 96"');
    expect(result.a.alignedSVG).toContain('overflow:visible');
    expect(result.a.aspect).toBeCloseTo(124 / 96, 3);
  });

  it('toAlignedSVG rejects a broken document', () => {
    expect(() => toAlignedSVG('<svg><g></svg>', { x: 0, y: 0, width: 1, height: 1 })).toThrow(CompareError);
  });

  it('diffMapToRGBA paints only where there is ink', () => {
    const { diff } = compareLogos(BARS_A, BARS_B);
    const rgba = diffMapToRGBA(diff);
    expect(rgba).toHaveLength(diff.cols * diff.rows * 4);
    let opaque = 0;
    for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) opaque++;
    expect(opaque).toBeGreaterThan(0);
    expect(opaque).toBeLessThan(diff.cols * diff.rows);
  });
});

describe('invalid second version', () => {
  it('rejects text that is not an SVG with a clear message', () => {
    let error: unknown;
    try { parseCompareVersion('isto não é um svg', 'b'); } catch (err) { error = err; }
    expect(error).toBeInstanceOf(CompareError);
    const e = error as CompareError;
    expect(e.side).toBe('b');
    expect(e.code).toBe('not-svg');
    expect(e.message).toContain('Versão B');
    expect(e.message).not.toContain('undefined');
  });

  it('rejects an empty string and an SVG with no shapes', () => {
    expect(() => parseCompareVersion('', 'b')).toThrow(/Versão B/);
    expect(() => parseCompareVersion(svg(''), 'b')).toThrow(/formas desenháveis/);
    expect(() => compareLogos(BARS_A, svg(''))).toThrow(CompareError);
  });

  it('names the side that failed', () => {
    try { parseCompareVersion('<svg', 'a'); } catch (err) {
      expect((err as CompareError).message).toContain('Versão A');
    }
    expect(describeCompareError(new Error('boom'), 'b')).toContain('Versão B');
    expect(describeCompareError(new CompareError('empty', 'Versão B: vazio.'))).toBe('Versão B: vazio.');
  });

  it('never throws a raw paper/DOM error out of compareLogos', () => {
    expect(() => compareLogos(BARS_A, 'lorem ipsum')).toThrow(CompareError);
    expect(() => compareLogos('', BARS_A)).toThrow(CompareError);
  });
});

describe('isolation from the app state', () => {
  it('comparing does not depend on the shared parse project', () => {
    const a = parseCompareVersion(BARS_A, 'a');
    // Parsing B recycles the shared paper project used by A…
    const b = parseCompareVersion(BARS_B, 'b');
    expect(a.originalSVG).not.toBe(b.originalSVG);
    // …and the comparison still works, because it uses the sanitized strings.
    const result = compareLogos(a, b);
    expect(result.matchPercent).toBeGreaterThan(40);
    expect(result.a.svg).toBe(a.originalSVG);
    expect(result.b.svg).toBe(b.originalSVG);
  });

  it('is memoized per pair and order', () => {
    const first = compareLogos(BARS_A, BARS_B);
    expect(compareLogos(BARS_A, BARS_B)).toBe(first);
    expect(compareLogos(BARS_B, BARS_A)).not.toBe(first);
  });
});

import './paper-env';
import { describe, it, expect } from 'vitest';
import { parseSVG } from '../lib/svg-engine';
import { exportOutlineSVG, exportLayeredSVG } from '../lib/export-engine';
import { createDefaultGeometryOptions, createDefaultGeometryStyles } from '../lib/preset-engine';
import type { SceneSettings } from '../lib/render-pipeline';
import { createGuideMetrics, REFERENCE_DIAGONAL } from '../components/renderers/scale';

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
  <circle cx="60" cy="60" r="50" fill="#112233"/>
  <path d="M130 20h90v20h-90z" fill="#445566"/>
</svg>`;

const settings = (over: Partial<SceneSettings> = {}): SceneSettings => ({
  clearspaceValue: 0,
  clearspaceUnit: 'logomark',
  showGrid: false,
  gridSubdivisions: 8,
  geometryOptions: { ...createDefaultGeometryOptions(), boundingRects: true },
  geometryStyles: createDefaultGeometryStyles(),
  ...over,
});

const viewBoxOf = (svg: string) => {
  const m = /viewBox="([^"]+)"/.exec(svg);
  if (!m) return null;
  const [x, y, w, h] = m[1].split(/[\s,]+/).map(Number);
  return { x, y, width: w, height: h };
};

/** Largest stroke-width attribute in the document. */
const maxStroke = (svg: string) =>
  Math.max(0, ...[...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => Number(m[1])));

describe('guide metrics scale with the rendered logo', () => {
  it('one guide unit equals one pixel at the reference diagonal', () => {
    const m = createGuideMetrics({ width: REFERENCE_DIAGONAL, height: 0 });
    expect(m.unit).toBeCloseTo(1, 6);
    expect(m.stroke(1)).toBeCloseTo(1, 6);
    expect(m.font(9)).toBeCloseTo(9, 6);
  });

  it('doubles every decorative length when the logo is twice as big', () => {
    const small = createGuideMetrics({ width: 800, height: 600 });   // diagonal 1000
    const big = createGuideMetrics({ width: 1600, height: 1200 });   // diagonal 2000
    expect(big.unit / small.unit).toBeCloseTo(2, 6);
    expect(big.stroke(2) / small.stroke(2)).toBeCloseTo(2, 6);
    expect(big.dash(6, 3)[0] / small.dash(6, 3)[0]).toBeCloseTo(2, 6);
    expect(big.font(9) / small.font(9)).toBeCloseTo(2, 6);
    expect(big.dot(3) / small.dot(3)).toBeCloseTo(2, 6);
  });

  it('keeps guides visible on a tiny logo and applies the user scale', () => {
    const tiny = createGuideMetrics({ width: 4, height: 3 });
    expect(tiny.stroke(1)).toBeGreaterThanOrEqual(0.4);
    expect(tiny.font(9)).toBeGreaterThanOrEqual(7);

    const plain = createGuideMetrics({ width: 800, height: 600 });
    const heavy = createGuideMetrics({ width: 800, height: 600 }, { guideScale: 2 });
    expect(heavy.stroke(1) / plain.stroke(1)).toBeCloseTo(2, 6);
  });

  it('falls back to the reference when bounds are degenerate', () => {
    for (const rect of [{ width: 0, height: 0 }, { width: NaN, height: 10 }, null]) {
      const m = createGuideMetrics(rect as never);
      expect(Number.isFinite(m.unit)).toBe(true);
      expect(m.unit).toBeGreaterThan(0);
    }
  });
});

describe('export honours the requested logo size', () => {
  it('layered SVG grows with logoSize and keeps guide weight proportional', () => {
    const parsed = parseSVG(LOGO);
    const small = exportLayeredSVG(parsed, settings(), { logoSize: 512 });
    const big = exportLayeredSVG(parsed, settings(), { logoSize: 2048 });

    const sb = viewBoxOf(small)!;
    const bb = viewBoxOf(big)!;
    expect(sb).not.toBeNull();
    // 4x the logo size gives roughly 4x the canvas (margins are scaled too).
    expect(bb.width / sb.width).toBeGreaterThan(3);
    expect(bb.width / sb.width).toBeLessThan(5);

    // Guides do not turn into hairlines at the bigger size.
    expect(maxStroke(big)).toBeGreaterThan(maxStroke(small) * 2);
  });

  it('outline SVG scales to logoSize and thickens its stroke with it', () => {
    const parsed = parseSVG(LOGO);
    const natural = exportOutlineSVG(parsed, { strokeWidth: 1 });
    const large = exportOutlineSVG(parsed, { strokeWidth: 1, logoSize: 2400 });

    const nb = viewBoxOf(natural)!;
    const lb = viewBoxOf(large)!;
    expect(lb.width).toBeGreaterThan(nb.width * 5);
    expect(maxStroke(large)).toBeGreaterThan(maxStroke(natural) * 5);
  });

  it('clamps an absurd logoSize instead of producing a broken file', () => {
    const parsed = parseSVG(LOGO);
    const svg = exportOutlineSVG(parsed, { logoSize: 10_000_000 });
    const box = viewBoxOf(svg)!;
    expect(Number.isFinite(box.width)).toBe(true);
    expect(box.width).toBeLessThanOrEqual(20000 * 1.2);
  });
});

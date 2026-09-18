import './paper-env';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import ClearspacePanel from '../components/ClearspacePanel';
import type { FillShape, Pt } from '../lib/metrics';
import {
  MM_PER_INCH, PT_PER_INCH, DEFAULT_SCREEN_DPI,
  mmToPx, pxToMm, mmToPt, ptToMm, mmToIn, inToMm,
  weightedPercentile, scanFills,
  measureUnitsFromShapes, measureReferenceUnits, clearReferenceUnitsCache,
  createClearspaceConfig, setClearspaceSide, setClearspaceLocked, setClearspaceReference,
  areSidesEqual, referenceLength, resolveClearspace, convertClearspace, unitScale,
  clearspaceRuleSentence, clearspaceManualText, toLegacySceneClearspace,
  CLEARSPACE_REFERENCES, isClearspaceReference, formatNumber,
  type ReferenceUnits,
} from '../lib/clearspace';

const ring = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
];
const shape = (...rings: Pt[][]): FillShape => ({ rule: 'nonzero', rings });
const box = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

/** Solid 100×100 square. */
const SQUARE: FillShape[] = [shape(ring(0, 0, 100, 100))];

/**
 * An "H": two 10-wide stems 100 tall, 50 apart, joined by a 10-tall crossbar.
 * Known answers: stem = 10, counter (gap) = 50, cap height = 100.
 */
const H: FillShape[] = [
  shape(ring(0, 0, 10, 100)),
  shape(ring(60, 0, 10, 100)),
  shape(ring(10, 45, 50, 10)),
];

/**
 * An ascender + a body: a 10-wide bar 100 tall at the left and an 80×50 block
 * sitting on the baseline. Known answers: cap height = 100, x-height = 50.
 */
const WORDMARK: FillShape[] = [
  shape(ring(0, 0, 10, 100)),
  shape(ring(20, 50, 80, 50)),
];

describe('unit conversion', () => {
  it('is exact on the defining identities', () => {
    expect(MM_PER_INCH).toBe(25.4);
    expect(PT_PER_INCH).toBe(72);
    expect(mmToPx(25.4, 96)).toBe(96);
    expect(mmToPx(25.4, 300)).toBe(300);
    expect(pxToMm(96, 96)).toBe(25.4);
    expect(pxToMm(300, 300)).toBe(25.4);
    expect(mmToPt(25.4)).toBe(72);
    expect(ptToMm(72)).toBe(25.4);
    expect(mmToIn(25.4)).toBe(1);
    expect(inToMm(1)).toBe(25.4);
    expect(mmToPx(0, 96)).toBe(0);
  });

  it('round-trips without drift and defaults to 96 dpi', () => {
    for (const mm of [0.2, 1, 3.5, 40, 210]) {
      expect(pxToMm(mmToPx(mm, 300), 300)).toBeCloseTo(mm, 10);
      expect(ptToMm(mmToPt(mm))).toBeCloseTo(mm, 10);
    }
    expect(mmToPx(25.4)).toBe(DEFAULT_SCREEN_DPI);
    // A non-positive dpi falls back instead of producing Infinity / 0.
    expect(mmToPx(25.4, 0)).toBe(96);
    expect(pxToMm(96, -1)).toBe(25.4);
  });
});

describe('weightedPercentile', () => {
  it('weights each length by itself, so slivers do not win', () => {
    // 99 slivers of 0.1 (total 9.9) against 10 stems of 10 (total 100).
    const values = [...Array(99).fill(0.1), ...Array(10).fill(10)];
    expect(weightedPercentile(values, 0.5)).toBe(10);
    expect(weightedPercentile(values, 0.05)).toBe(0.1);
    expect(weightedPercentile([], 0.5)).toBe(0);
    expect(weightedPercentile([5, 5, 5], 0.5)).toBe(5);
  });
});

describe('scanFills', () => {
  it('measures coverage, runs and gaps on a known shape', () => {
    const scan = scanFills(H, box(0, 0, 70, 100), 200);
    expect(scan.coverage.length).toBe(200);
    expect(scan.step).toBeCloseTo(0.5, 10);
    // Rows away from the crossbar: two stems of 10.
    expect(scan.coverage[0]).toBeCloseTo(20, 6);
    // A row inside the crossbar: 10 + 50 + 10.
    const mid = scan.coverage[Math.round(scan.coverage.length / 2)];
    expect(mid).toBeCloseTo(70, 6);
    expect(Math.min(...scan.runs)).toBeCloseTo(10, 6);
    expect(Math.min(...scan.gaps)).toBeCloseTo(50, 6);
  });

  it('returns an empty scan for empty input', () => {
    expect(scanFills([], box(0, 0, 10, 10)).coverage).toEqual([]);
    expect(scanFills(SQUARE, box(0, 0, 0, 0)).runs).toEqual([]);
  });
});

describe('measureUnitsFromShapes', () => {
  it('measures a solid square', () => {
    const u = measureUnitsFromShapes({ fills: SQUARE });
    expect(u.measured).toBe(true);
    expect(u.symbolHeight).toBeCloseTo(100, 6);
    expect(u.halfSymbol).toBeCloseTo(50, 6);
    expect(u.capHeight).toBeCloseTo(100, 6);
    expect(u.xHeight).toBeCloseTo(100, 6); // no distinct band on a plain shape
    expect(u.strokeWidth).toBeCloseTo(100, 6);
    expect(u.minStrokeWidth).toBeCloseTo(100, 6);
    expect(u.minGap).toBeNull();
    expect(u.logoWidth).toBeCloseTo(100, 6);
    expect(u.longestSide).toBeCloseTo(100, 6);
    expect(u.diagonal).toBeCloseTo(Math.hypot(100, 100), 6);
  });

  it('measures stem and counter on an H', () => {
    const u = measureUnitsFromShapes({ fills: H });
    expect(u.capHeight).toBeCloseTo(100, 6);
    expect(u.strokeWidth).toBeCloseTo(10, 6);
    expect(u.minStrokeWidth).toBeCloseTo(10, 6);
    expect(u.minGap).toBeCloseTo(50, 6);
    // The dense band of an H is the crossbar.
    expect(u.xHeight).toBeGreaterThan(8);
    expect(u.xHeight).toBeLessThan(12);
  });

  it('separates cap height from x-height on an ascender + body', () => {
    const u = measureUnitsFromShapes({ fills: WORDMARK });
    expect(u.capHeight).toBeCloseTo(100, 6);
    expect(u.xHeight).toBeCloseTo(50, 6);
    expect(u.minGap).toBeCloseTo(10, 6);
  });

  it('uses the symbol bounds for the symbol height and a text box for cap/x', () => {
    // Symbol (40 tall) on the left, wordmark (20 tall) on the right.
    const fills = [shape(ring(0, 0, 40, 40)), shape(ring(50, 10, 60, 20))];
    const u = measureUnitsFromShapes({ fills }, {
      symbolBounds: box(0, 0, 40, 40),
      textBounds: box(50, 10, 60, 20),
    });
    expect(u.symbolHeight).toBeCloseTo(40, 6);
    expect(u.halfSymbol).toBeCloseTo(20, 6);
    expect(u.capHeight).toBeCloseTo(20, 6); // measured inside the text box only
    expect(u.logoHeight).toBeCloseTo(40, 6); // ink bounds still cover everything
  });

  it('falls back to declared widths when the artwork is stroke-only', () => {
    const u = measureUnitsFromShapes({
      fills: [],
      strokes: [{ polylines: [[{ x: 0, y: 0 }, { x: 100, y: 0 }]], width: 4, closed: [false] }],
    });
    expect(u.measured).toBe(true);
    expect(u.strokeWidth).toBeCloseTo(4, 6);
    expect(u.minStrokeWidth).toBeCloseTo(4, 6);
    expect(u.warnings.join(' ')).toMatch(/traços abertos/);
  });

  it('reports nothing measurable for empty ink', () => {
    const u = measureUnitsFromShapes({ fills: [] });
    expect(u.measured).toBe(false);
    expect(u.symbolHeight).toBe(0);
  });
});

describe('measureReferenceUnits (SVG)', () => {
  beforeEach(() => clearReferenceUnitsCache());

  it('measures a square drawn in an SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<rect x="10" y="10" width="80" height="80" fill="#000"/></svg>';
    const u = measureReferenceUnits(svg);
    expect(u.measured).toBe(true);
    expect(u.symbolHeight).toBeCloseTo(80, 1);
    expect(u.capHeight).toBeCloseTo(80, 1);
    expect(u.strokeWidth).toBeCloseTo(80, 1);
  });

  it('is memoized and null-safe', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
      + '<rect width="10" height="10" fill="#000"/></svg>';
    expect(measureReferenceUnits(svg)).toBe(measureReferenceUnits(svg));
    expect(measureReferenceUnits(null).measured).toBe(false);
    expect(measureReferenceUnits({ originalSVG: '' }).measured).toBe(false);
  });
});

// ---------------------------------------------------------------------------

const UNITS: ReferenceUnits = {
  symbolHeight: 80, halfSymbol: 40, capHeight: 60, xHeight: 30,
  strokeWidth: 10, minStrokeWidth: 8, minGap: 12,
  inkBounds: box(0, 0, 200, 80),
  logoWidth: 200, logoHeight: 80, longestSide: 200, diagonal: Math.hypot(200, 80),
  measured: true, warnings: [],
};

describe('clearspace configuration', () => {
  it('validates references', () => {
    expect(CLEARSPACE_REFERENCES).toContain('x-height');
    expect(isClearspaceReference('x-height')).toBe(true);
    expect(isClearspaceReference('nope')).toBe(false);
  });

  it('locks every side together and unlocks per side', () => {
    let cfg = createClearspaceConfig({ locked: true });
    cfg = setClearspaceSide(cfg, 'top', 2);
    expect(cfg.sides).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
    expect(areSidesEqual(cfg.sides)).toBe(true);

    cfg = setClearspaceLocked(cfg, false);
    cfg = setClearspaceSide(cfg, 'left', 4);
    expect(cfg.sides).toEqual({ top: 2, right: 2, bottom: 2, left: 4 });
    expect(areSidesEqual(cfg.sides)).toBe(false);

    // Re-locking levels every side to the top value.
    cfg = setClearspaceLocked(cfg, true);
    expect(cfg.sides).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });

  it('never keeps a negative or non-finite multiplier', () => {
    const cfg = setClearspaceSide(createClearspaceConfig(), 'top', -3);
    expect(cfg.sides.top).toBe(0);
    expect(createClearspaceConfig({ sides: { top: NaN, right: 1, bottom: 1, left: 1 } }).sides.top).toBe(1);
  });

  it('rescales the multiplier when switching in and out of percent', () => {
    const base = createClearspaceConfig({ reference: 'x-height', sides: { top: 2, right: 2, bottom: 2, left: 2 } });
    const percent = setClearspaceReference(base, 'percent');
    expect(percent.sides.top).toBe(10);
    const back = setClearspaceReference(percent, 'symbol-height');
    expect(back.sides.top).toBe(1);
    // Switching between two measured references keeps the multiplier.
    expect(setClearspaceReference(base, 'cap-height').sides.top).toBe(2);
  });
});

describe('referenceLength', () => {
  it('reads each unit off the measurement', () => {
    expect(referenceLength('symbol-height', UNITS)).toBe(80);
    expect(referenceLength('half-symbol', UNITS)).toBe(40);
    expect(referenceLength('cap-height', UNITS)).toBe(60);
    expect(referenceLength('x-height', UNITS)).toBe(30);
    expect(referenceLength('stroke-width', UNITS)).toBe(10);
  });

  it('turns percent into 1% of the chosen base', () => {
    expect(referenceLength('percent', UNITS, 'longest-side')).toBeCloseTo(2, 10);
    expect(referenceLength('percent', UNITS, 'width')).toBeCloseTo(2, 10);
    expect(referenceLength('percent', UNITS, 'height')).toBeCloseTo(0.8, 10);
    expect(referenceLength('percent', UNITS, 'diagonal')).toBeCloseTo(UNITS.diagonal / 100, 10);
  });
});

describe('resolveClearspace', () => {
  it('applies one multiplier to every side when locked', () => {
    const cfg = createClearspaceConfig({ reference: 'x-height', locked: true, sides: { top: 2, right: 2, bottom: 2, left: 2 } });
    const r = resolveClearspace(box(0, 0, 200, 80), cfg, UNITS);
    expect(r.valid).toBe(true);
    expect(r.unitLength).toBe(30);
    expect(r.sides).toEqual({ top: 60, right: 60, bottom: 60, left: 60 });
    expect(r.outer).toEqual({ x: -60, y: -60, width: 320, height: 200 });
  });

  it('applies a different value per side', () => {
    const cfg = createClearspaceConfig({
      reference: 'stroke-width', locked: false, sides: { top: 1, right: 3, bottom: 2, left: 4 },
    });
    const r = resolveClearspace(box(10, 20, 200, 80), cfg, UNITS);
    expect(r.sides).toEqual({ top: 10, right: 30, bottom: 20, left: 40 });
    expect(r.inner).toEqual({ x: 10, y: 20, width: 200, height: 80 });
    expect(r.outer).toEqual({ x: -30, y: 10, width: 270, height: 110 });
  });

  it('flags an unmeasurable reference instead of drawing a zero box silently', () => {
    const blind: ReferenceUnits = { ...UNITS, xHeight: 0 };
    const r = resolveClearspace(box(0, 0, 10, 10), createClearspaceConfig({ reference: 'x-height' }), blind);
    expect(r.valid).toBe(false);
    expect(r.sides.top).toBe(0);
    expect(r.warnings[0]).toMatch(/altura da letra X/);
  });
});

describe('conversion to millimetres and pixels', () => {
  it('scales a print size exactly', () => {
    // 200 drawing units printed 100mm wide → 0.5mm per unit.
    const s = unitScale(box(0, 0, 200, 80), { medium: 'print', widthMm: 100, dpi: 300 });
    expect(s.mmPerUnit).toBe(0.5);
    expect(s.pxPerUnit).toBeCloseTo(mmToPx(0.5, 300), 12);
    expect(s.dpi).toBe(300);
  });

  it('scales a screen size exactly and derives mm from the dpi', () => {
    const s = unitScale(box(0, 0, 200, 80), { medium: 'screen', widthPx: 400, dpi: 96 });
    expect(s.pxPerUnit).toBe(2);
    expect(s.mmPerUnit).toBeCloseTo(pxToMm(2, 96), 12);
  });

  it('falls back to the height when no width is given', () => {
    expect(unitScale(box(0, 0, 200, 80), { medium: 'print', heightMm: 40 }).mmPerUnit).toBe(0.5);
    expect(unitScale(box(0, 0, 200, 80), { medium: 'screen', heightPx: 160 }).pxPerUnit).toBe(2);
    expect(unitScale(box(0, 0, 0, 0), { medium: 'print', widthMm: 40 }).mmPerUnit).toBe(0);
  });

  it('converts every side and the outer box', () => {
    const cfg = createClearspaceConfig({ reference: 'x-height', locked: true, sides: { top: 1, right: 1, bottom: 1, left: 1 } });
    const r = resolveClearspace(box(0, 0, 200, 80), cfg, UNITS);
    const m = convertClearspace(r, { medium: 'print', widthMm: 100, dpi: 300 });
    expect(m.unitMm).toBe(15);            // 30 units × 0.5 mm
    expect(m.mm.top).toBe(15);
    expect(m.logoMm).toEqual({ width: 100, height: 40 });
    expect(m.outerMm).toEqual({ width: 130, height: 70 });
    expect(m.px.top).toBeCloseTo(mmToPx(15, 300), 10);
    expect(m.outerPx.width).toBeCloseTo(mmToPx(130, 300), 10);
  });
});

describe('legacy scene bridge', () => {
  it('expresses the clearspace in logomark units', () => {
    const cfg = createClearspaceConfig({ reference: 'symbol-height', locked: true, sides: { top: 1, right: 1, bottom: 1, left: 1 } });
    const r = resolveClearspace(box(0, 0, 200, 80), cfg, UNITS); // 80 units per side
    expect(toLegacySceneClearspace(r, 40)).toEqual({ clearspaceValue: 2, clearspaceUnit: 'logomark' });
  });

  it('picks the largest side when the sides differ, and survives a missing logomark', () => {
    const cfg = createClearspaceConfig({ reference: 'stroke-width', locked: false, sides: { top: 1, right: 4, bottom: 1, left: 1 } });
    const r = resolveClearspace(box(0, 0, 200, 80), cfg, UNITS); // top 10, right 40
    expect(toLegacySceneClearspace(r, 20).clearspaceValue).toBe(2);   // 40 / 20
    expect(toLegacySceneClearspace(r, 20, 'min').clearspaceValue).toBe(0.5);
    expect(toLegacySceneClearspace(r, 20, 'mean').clearspaceValue).toBeCloseTo(0.875, 10);
    expect(toLegacySceneClearspace(r, 0).clearspaceValue).toBe(0);
  });
});

describe('manual text', () => {
  it('writes the canonical sentence for a single reference unit', () => {
    const cfg = createClearspaceConfig({ reference: 'x-height', locked: true, sides: { top: 1, right: 1, bottom: 1, left: 1 } });
    expect(clearspaceRuleSentence(cfg)).toBe('A área de respiro equivale à altura da letra X do logotipo.');
  });

  it('writes multipliers, percentages and per-side rules', () => {
    const one = createClearspaceConfig({ reference: 'symbol-height', locked: true, sides: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 } });
    expect(clearspaceRuleSentence(one)).toBe('A área de respiro equivale a 1,5× a altura do símbolo.');

    const pct = createClearspaceConfig({ reference: 'percent', locked: true, sides: { top: 10, right: 10, bottom: 10, left: 10 } });
    expect(clearspaceRuleSentence(pct)).toBe('A área de respiro equivale a 10% do lado maior do logotipo.');

    const sides = createClearspaceConfig({ reference: 'cap-height', locked: false, sides: { top: 1, right: 2, bottom: 1, left: 2 } });
    const text = clearspaceRuleSentence(sides);
    expect(text).toContain('no topo');
    expect(text).toContain('à direita');
    expect(text).toContain('altura de maiúscula do logotipo');
  });

  it('builds a manual block with the measured numbers', () => {
    const cfg = createClearspaceConfig({ reference: 'x-height', locked: true, sides: { top: 1, right: 1, bottom: 1, left: 1 } });
    const r = resolveClearspace(box(0, 0, 200, 80), cfg, UNITS);
    const m = convertClearspace(r, { medium: 'print', widthMm: 100, dpi: 300 });
    const text = clearspaceManualText(r, cfg, { measures: m, logoName: 'logotipo' });
    expect(text).toContain('Área de respiro');
    expect(text).toContain('A área de respiro equivale à altura da letra X do logotipo.');
    expect(text).toContain('15 mm');
    expect(text).toContain('130 × 70 mm');
  });

  it('formats numbers in pt-BR', () => {
    expect(formatNumber(1.5)).toBe('1,5');
    expect(formatNumber(2)).toBe('2');
    expect(formatNumber(NaN)).toBe('—');
  });
});

describe('ClearspacePanel', () => {
  beforeEach(() => {
    cleanup();
    // Radix Slider measures itself; jsdom has no ResizeObserver.
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {} unobserve() {} disconnect() {}
    };
  });

  const panelUnits: ReferenceUnits = { ...UNITS };

  it('renders the manual sentence and the reference units', () => {
    render(React.createElement(ClearspacePanel, {
      units: panelUnits,
      config: createClearspaceConfig({ reference: 'x-height', locked: true, sides: { top: 1, right: 1, bottom: 1, left: 1 } }),
      onConfigChange: () => {},
    }));
    expect(screen.getByText('Área de respiro')).toBeInTheDocument();
    expect(screen.getByText('A área de respiro equivale à altura da letra X do logotipo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Altura do símbolo' })).toBeInTheDocument();
  });

  it('does not push a change on every keystroke', async () => {
    const onConfigChange = vi.fn();
    render(React.createElement(ClearspacePanel, {
      units: panelUnits,
      config: createClearspaceConfig(),
      onConfigChange,
      commitDelay: 40,
    }));
    const input = screen.getByLabelText('Respiro em todos os lados') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.change(input, { target: { value: '3' } });
    expect(onConfigChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onConfigChange).toHaveBeenCalledTimes(1));
    expect(onConfigChange.mock.calls[0][0].sides).toEqual({ top: 3, right: 3, bottom: 3, left: 3 });
  });

  it('asks for an SVG when nothing was measured', () => {
    render(React.createElement(ClearspacePanel, {
      units: null,
      config: createClearspaceConfig(),
      onConfigChange: () => {},
    }));
    expect(screen.getByText(/Carregue um SVG/)).toBeInTheDocument();
  });
});

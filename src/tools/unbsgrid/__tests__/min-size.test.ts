// min-size.ts re-uses clearspace.ts, which imports paper at module load.
import './paper-env';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import MinSizePanel from '../components/MinSizePanel';
import { mmToPx, pxToMm, type ReferenceUnits } from '../lib/clearspace';
import {
  computeMinSize, buildPreviewStrip, minSizeManualText, minSizeSummary,
  roundUpToStep, DEFAULT_MIN_SIZE_LIMITS, ROUGH_MIN_SIZE_LIMITS,
  NICE_PX_STEPS, NICE_MM_STEPS,
} from '../lib/min-size';

/** A logo 200×80 drawing units with the given thinnest stem / narrowest gap. */
const units = (minStrokeWidth: number, minGap: number | null = null): ReferenceUnits => ({
  symbolHeight: 80, halfSymbol: 40, capHeight: 80, xHeight: 40,
  strokeWidth: minStrokeWidth * 1.5, minStrokeWidth, minGap,
  inkBounds: { x: 0, y: 0, width: 200, height: 80 },
  logoWidth: 200, logoHeight: 80, longestSide: 200, diagonal: Math.hypot(200, 80),
  measured: true, warnings: [],
});

describe('computeMinSize', () => {
  it('scales the whole logo so the thinnest stem reaches the limit', () => {
    // Stem 2 units must render at 1.5px → scale 0.75 → 200 units = 150px.
    const r = computeMinSize(units(2));
    expect(r.valid).toBe(true);
    expect(r.screen.scale).toBeCloseTo(0.75, 12);
    expect(r.screen.widthPx).toBeCloseTo(150, 10);
    expect(r.screen.heightPx).toBeCloseTo(60, 10);
    expect(r.screen.strokeAt).toBeCloseTo(DEFAULT_MIN_SIZE_LIMITS.screenStrokePx, 12);
    expect(r.screen.limitedBy).toBe('stroke');

    // Print: 0.2mm / 2 units = 0.1 mm per unit → 20mm wide.
    expect(r.print.widthMm).toBeCloseTo(20, 10);
    expect(r.print.heightMm).toBeCloseTo(8, 10);
    expect(r.print.strokeAt).toBeCloseTo(DEFAULT_MIN_SIZE_LIMITS.printStrokeMm, 12);
  });

  it('cross-converts the media with the given dpi', () => {
    const r = computeMinSize(units(2), { screenDpi: 96, printDpi: 300 });
    expect(r.screen.widthMm).toBeCloseTo(pxToMm(r.screen.widthPx, 96), 12);
    expect(r.print.widthPx).toBeCloseTo(mmToPx(r.print.widthMm, 300), 12);
    expect(r.screen.dpi).toBe(96);
    expect(r.print.dpi).toBe(300);
  });

  it('is coherent between a thick-stroke and a thin-stroke logo', () => {
    const thick = computeMinSize(units(20));
    const thin = computeMinSize(units(2));
    // Same box, ten times thinner stem → exactly ten times bigger minimum.
    expect(thin.screen.widthPx).toBeGreaterThan(thick.screen.widthPx);
    expect(thin.screen.widthPx / thick.screen.widthPx).toBeCloseTo(10, 10);
    expect(thin.print.widthMm / thick.print.widthMm).toBeCloseTo(10, 10);
    // And both still render their stem exactly at the limit.
    expect(thick.screen.strokeAt).toBeCloseTo(thin.screen.strokeAt, 12);
  });

  it('lets the narrowest gap win when it is the tighter constraint', () => {
    // Stem 4 → screen scale 0.375; gap 2 → screen scale 1. The gap wins.
    const r = computeMinSize(units(4, 2));
    expect(r.screen.limitedBy).toBe('gap');
    expect(r.screen.scale).toBeCloseTo(1, 12);
    expect(r.screen.widthPx).toBeCloseTo(200, 10);
    expect(r.screen.gapAt).toBeCloseTo(DEFAULT_MIN_SIZE_LIMITS.screenGapPx, 12);
    expect(r.screen.strokeAt).toBeGreaterThan(DEFAULT_MIN_SIZE_LIMITS.screenStrokePx);
  });

  it('warns and falls back to the stroke when the logo has no counters', () => {
    const r = computeMinSize(units(2, null));
    expect(r.screen.gapAt).toBeNull();
    expect(r.screen.limitedBy).toBe('stroke');
    expect(r.warnings.join(' ')).toMatch(/vãos internos/);
  });

  it('demands more from a rough substrate', () => {
    const fine = computeMinSize(units(2));
    const rough = computeMinSize(units(2), { limits: ROUGH_MIN_SIZE_LIMITS });
    expect(rough.print.widthMm).toBeGreaterThan(fine.print.widthMm);
    expect(rough.print.widthMm / fine.print.widthMm).toBeCloseTo(2.5, 10); // 0.5mm / 0.2mm
  });

  it('refuses to invent numbers when nothing was measured', () => {
    const blind: ReferenceUnits = { ...units(0), measured: false };
    const r = computeMinSize(blind);
    expect(r.valid).toBe(false);
    expect(r.screen.widthPx).toBe(0);
    expect(r.print.widthMm).toBe(0);
    expect(minSizeSummary(r)).toBe('—');
    expect(minSizeManualText(r)).toMatch(/Não foi possível medir/);
  });
});

describe('buildPreviewStrip', () => {
  it('puts the minimum in the middle, with failing steps below it', () => {
    const r = computeMinSize(units(2)); // 150px minimum
    const strip = buildPreviewStrip(r, { medium: 'screen', below: 1, above: 3 });
    const minimum = strip.find(s => s.isMinimum);
    expect(minimum).toBeDefined();
    expect(minimum!.size).toBeCloseTo(150, 10);
    expect(minimum!.ratio).toBeCloseTo(1, 12);
    expect(minimum!.ok).toBe(true);
    expect(minimum!.label).toContain('mínimo');

    expect(strip.filter(s => !s.ok).every(s => s.size < 150)).toBe(true);
    expect(strip.filter(s => s.ok).every(s => s.size >= 150)).toBe(true);
    expect(strip.map(s => s.size)).toEqual([...strip.map(s => s.size)].sort((a, b) => a - b));
    expect(new Set(strip.map(s => s.key)).size).toBe(strip.length);
  });

  it('keeps the logo proportion and scales the features with the step', () => {
    const r = computeMinSize(units(2));
    const strip = buildPreviewStrip(r, { medium: 'screen', below: 0, above: 2 });
    for (const step of strip) {
      expect(step.heightPx / step.widthPx).toBeCloseTo(80 / 200, 10);
      expect(step.strokeAt).toBeCloseTo(DEFAULT_MIN_SIZE_LIMITS.screenStrokePx * step.ratio, 10);
    }
  });

  it('builds a print strip in millimetres', () => {
    const r = computeMinSize(units(2)); // 20mm minimum
    const strip = buildPreviewStrip(r, { medium: 'print', below: 1, above: 2 });
    expect(strip.some(s => s.label.includes('mm'))).toBe(true);
    const minimum = strip.find(s => s.isMinimum)!;
    expect(minimum.size).toBeCloseTo(20, 10);
    // The thumbnail is still expressed in px, at the preview dpi.
    expect(minimum.widthPx).toBeCloseTo(mmToPx(20, 96), 10);
  });

  it('accepts a custom ladder and returns nothing when invalid', () => {
    const r = computeMinSize(units(2));
    const strip = buildPreviewStrip(r, { medium: 'screen', steps: [100, 200, 400], below: 1, above: 2 });
    expect(strip.map(s => s.size)).toEqual([100, 150, 200, 400]);
    expect(buildPreviewStrip({ ...r, valid: false })).toEqual([]);
  });
});

describe('manual text', () => {
  it('rounds up to a clean ladder value', () => {
    expect(roundUpToStep(150, NICE_PX_STEPS)).toBe(160);
    expect(roundUpToStep(16, NICE_PX_STEPS)).toBe(16);
    expect(roundUpToStep(20, NICE_MM_STEPS)).toBe(20);
    expect(roundUpToStep(21, NICE_MM_STEPS)).toBe(25);
    expect(roundUpToStep(9999, NICE_PX_STEPS)).toBe(9999);
  });

  it('writes both media and names the limiting feature', () => {
    const r = computeMinSize(units(2));
    const text = minSizeManualText(r, { logoName: 'logotipo' });
    expect(text).toContain('Tamanho mínimo');
    expect(text).toContain('160 px');
    expect(text).toContain('20 mm');
    expect(text).toContain('traço mais fino');
    expect(minSizeSummary(r)).toBe('≥ 160 px · ≥ 20 mm');
  });

  it('names the gap when the gap is what limits', () => {
    const text = minSizeManualText(computeMinSize(units(4, 2)));
    expect(text).toContain('vão mais estreito');
  });
});

describe('MinSizePanel', () => {
  beforeEach(() => {
    cleanup();
    (globalThis as Record<string, unknown>).ResizeObserver = class {
      observe() {} unobserve() {} disconnect() {}
    };
  });

  it('shows both minimums and a preview strip around the limit', () => {
    render(React.createElement(MinSizePanel, { units: units(2) }));
    expect(screen.getByText('Tamanho mínimo')).toBeInTheDocument();
    expect(screen.getByText('≥ 160 px · ≥ 20 mm')).toBeInTheDocument();
    const strip = screen.getByRole('list', { name: 'Fita de prévia por tamanho' });
    expect(strip.children.length).toBeGreaterThan(2);
    expect(screen.getByText(/150 px · mínimo/)).toBeInTheDocument();
  });

  it('asks for an SVG when nothing was measured', () => {
    render(React.createElement(MinSizePanel, { units: null }));
    expect(screen.getByText(/Carregue um SVG/)).toBeInTheDocument();
  });
});

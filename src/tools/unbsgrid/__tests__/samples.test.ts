import './paper-env';
import { describe, it, expect } from 'vitest';
import { parseSVG } from '../lib/svg-engine';
import { sanitizeSVG } from '../lib/svg-sanitize';
import { SAMPLE_LOGOS, getSampleById, loadSample } from '../lib/samples';
import { isSvgInputError, isSvgInputResult } from '../lib/svg-input';

describe('sample gallery', () => {
  it('has between 8 and 12 marks, with unique ids and names', () => {
    expect(SAMPLE_LOGOS.length).toBeGreaterThanOrEqual(8);
    expect(SAMPLE_LOGOS.length).toBeLessThanOrEqual(12);
    expect(new Set(SAMPLE_LOGOS.map(s => s.id)).size).toBe(SAMPLE_LOGOS.length);
    expect(new Set(SAMPLE_LOGOS.map(s => s.name)).size).toBe(SAMPLE_LOGOS.length);
  });

  it('describes what each mark demonstrates', () => {
    for (const sample of SAMPLE_LOGOS) {
      expect(sample.name.trim().length).toBeGreaterThan(2);
      expect(sample.demonstrates.trim().length).toBeGreaterThan(15);
      expect(sample.demonstrates).not.toContain('\n');
    }
  });

  it('covers the whole range of shapes the tool has to handle', () => {
    const ids = SAMPLE_LOGOS.map(s => s.id);
    for (const expected of [
      'chevron-duplo',          // símbolo geométrico
      'wordmark-hastes',        // wordmark
      'monograma-cruzado',      // monograma
      'orbita-fina',            // traço fino
      'petala-organica',        // forma orgânica
      'estilhaco-assimetrico',  // assimétrico
      'blocos-arredondados',    // cantos arredondados
      'anel-com-corte',         // contraforma pequena
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it.each(SAMPLE_LOGOS.map(s => [s.id, s] as const))('%s passes sanitization with no warnings', (_id, sample) => {
    const result = sanitizeSVG(sample.svg);
    expect(result.warnings).toEqual([]);
    expect(result.stats.removedAttributes).toBe(0);
    expect(result.stats.removedElements).toEqual({});
    expect(result.artboard).not.toBeNull();
  });

  it.each(SAMPLE_LOGOS.map(s => [s.id, s] as const))('%s parses with no warnings and real geometry', (_id, sample) => {
    const parsed = parseSVG(sample.svg);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.components.length).toBeGreaterThan(0);
    expect(parsed.fullBounds.width).toBeGreaterThan(0);
    expect(parsed.fullBounds.height).toBeGreaterThan(0);
    expect(Number.isFinite(parsed.fullBounds.width)).toBe(true);
    expect(parsed.segments.length).toBeGreaterThan(0);
    // The drawing must stay inside its artboard: no stray off-canvas geometry.
    const board = parsed.artboard;
    expect(board).toBeTruthy();
    if (board) {
      expect(parsed.fullBounds.width).toBeLessThanOrEqual(board.width + 1);
      expect(parsed.fullBounds.height).toBeLessThanOrEqual(board.height + 1);
    }
  });

  it('loads a sample through the shared input door', () => {
    for (const sample of SAMPLE_LOGOS) {
      const outcome = loadSample(sample.id);
      expect(isSvgInputResult(outcome)).toBe(true);
      if (!isSvgInputResult(outcome)) continue;
      expect(outcome.source).toBe('sample');
      expect(outcome.name).toBe(sample.name);
      expect(outcome.warnings).toEqual([]);
    }
  });

  it('reports an unknown sample instead of throwing', () => {
    expect(getSampleById('não-existe')).toBeNull();
    const outcome = loadSample('não-existe');
    expect(isSvgInputError(outcome)).toBe(true);
    if (isSvgInputError(outcome)) expect(outcome.description).toContain('não-existe');
  });

  it('contains no scripts, external references or embedded rasters', () => {
    for (const sample of SAMPLE_LOGOS) {
      expect(sample.svg).not.toMatch(/script|foreignObject|<image|href|<style|on[a-z]+=/i);
      expect(sample.svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="/);
    }
  });
});

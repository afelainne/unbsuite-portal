import { describe, it, expect } from 'vitest';
import {
  getBuiltinPresets, normalizePreset, createPreset, importPresetsFromJSON, exportPresetsToJSON,
  createDefaultGeometryOptions, createDefaultGeometryStyles,
  PRESET_FAMILIES, isPresetFamily, presetFamilyLabel,
  type GeometryPreset, type PresetFamily,
} from '../lib/preset-engine';
import { GEOMETRY_KEYS, type GeometryOptions } from '../types/geometry';
import { MOTIF_IDS, MOTIF_KEYS, presetMotifs, constructionCount, type MotifId } from '../lib/preset-thumb';

const builtins = getBuiltinPresets();
const keySet = new Set<string>(GEOMETRY_KEYS);

const enabled = (p: GeometryPreset): (keyof GeometryOptions)[] =>
  (GEOMETRY_KEYS as readonly (keyof GeometryOptions)[]).filter(k => p.geometryOptions[k] === true);

const byFamily = (family: PresetFamily) => builtins.filter(p => p.family === family);

describe('preset families', () => {
  it('declares the three families, in the order the UI shows them', () => {
    expect(PRESET_FAMILIES.map(f => f.id)).toEqual(['logo', 'wordmark', 'lockup']);
    for (const f of PRESET_FAMILIES) {
      expect(f.label.trim()).not.toBe('');
      expect(f.hint.trim().endsWith('.')).toBe(true);
    }
    expect(isPresetFamily('wordmark')).toBe(true);
    expect(isPresetFamily('nope')).toBe(false);
    expect(isPresetFamily(null)).toBe(false);
    expect(presetFamilyLabel('lockup')).toBe('Logo e tipo');
  });

  it('every family has built-in presets', () => {
    for (const f of PRESET_FAMILIES) expect(byFamily(f.id).length).toBeGreaterThan(0);
  });

  it('a preset without a family, or with a bogus one, lands in "logo"', () => {
    expect(normalizePreset({ id: 'a', name: 'A' })!.family).toBe('logo');
    expect(normalizePreset({ id: 'a', name: 'A', family: 'banana' })!.family).toBe('logo');
    expect(normalizePreset({ id: 'a', name: 'A', family: 'wordmark' })!.family).toBe('wordmark');
    expect(createPreset({
      name: 'Sem família',
      geometryOptions: createDefaultGeometryOptions(),
      geometryStyles: createDefaultGeometryStyles(),
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
    }).family).toBe('logo');
  });

  it('the family survives an export / import round trip', () => {
    const mine = createPreset({
      name: 'Meu wordmark', family: 'wordmark',
      geometryOptions: createDefaultGeometryOptions(),
      geometryStyles: createDefaultGeometryStyles(),
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
    });
    const back = importPresetsFromJSON(exportPresetsToJSON([mine]));
    expect(back.presets[0].family).toBe('wordmark');
  });
});

describe('built-in preset library', () => {
  it('ships at least twelve presets spread over the three families', () => {
    expect(builtins.length).toBeGreaterThanOrEqual(12);
    expect(byFamily('logo').length).toBeGreaterThanOrEqual(4);
    expect(byFamily('wordmark').length).toBeGreaterThanOrEqual(4);
    expect(byFamily('lockup').length).toBeGreaterThanOrEqual(4);
  });

  it('ids and names are unique, and every id is marked as built-in', () => {
    expect(new Set(builtins.map(p => p.id)).size).toBe(builtins.length);
    expect(new Set(builtins.map(p => p.name.toLowerCase())).size).toBe(builtins.length);
    for (const p of builtins) expect(p.isBuiltin).toBe(true);
  });

  it('each one has a one-line description written as a sentence', () => {
    for (const p of builtins) {
      expect(p.description, p.name).toBeTruthy();
      expect(p.description!.includes('\n')).toBe(false);
      expect(p.description!.length).toBeLessThanOrEqual(120);
      expect(p.description!.endsWith('.'), p.name).toBe(true);
      // Names are written in a sentence too: no ALL CAPS shouting.
      expect(p.name).not.toBe(p.name.toUpperCase());
    }
  });

  it('only turns on constructions that exist', () => {
    for (const p of builtins) {
      for (const key of Object.keys(p.geometryOptions)) {
        expect(keySet.has(key), `${p.name} -> ${key}`).toBe(true);
      }
      expect(enabled(p).length, p.name).toBeGreaterThan(0);
    }
  });

  it('carries a complete style table, so the sidebar never reads undefined', () => {
    for (const p of builtins) {
      for (const key of GEOMETRY_KEYS) {
        const style = p.geometryStyles[key];
        expect(style, `${p.name} -> ${String(key)}`).toBeDefined();
        expect(style!.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(style!.opacity).toBeGreaterThan(0);
        expect(style!.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the clearspace and the grid inside the range the UI accepts', () => {
    for (const p of builtins) {
      expect(p.clearspaceValue, p.name).toBeGreaterThanOrEqual(0);
      expect(p.clearspaceValue, p.name).toBeLessThanOrEqual(1000);
      expect(p.gridSubdivisions, p.name).toBeGreaterThanOrEqual(2);
      expect(p.gridSubdivisions, p.name).toBeLessThanOrEqual(64);
      expect(Number.isInteger(p.gridSubdivisions), p.name).toBe(true);
      // A clearspace in pixels smaller than one pixel draws nothing, which is
      // never what the name of a preset promises.
      if (p.clearspaceUnit === 'pixels' && p.clearspaceValue > 0) {
        expect(p.clearspaceValue, p.name).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('stays readable: no preset but the full audit turns on more than eight constructions', () => {
    for (const p of builtins) {
      if (p.id === 'builtin-full-audit') continue;
      expect(enabled(p).length, p.name).toBeLessThanOrEqual(8);
    }
    expect(enabled(builtins.find(p => p.id === 'builtin-full-audit')!)).toHaveLength(GEOMETRY_KEYS.length);
  });

  it('wordmark and lockup presets lean on the typographic constructions', () => {
    const typographic: (keyof GeometryOptions)[] = [
      // Measured letter by letter, from the ink itself.
      'wordBaselines', 'letterHeights', 'letterRhythm', 'letterAxes', 'letterStemWidth',
      'opticalEdges', 'counterAreas', 'densityCurve', 'signatureRelation', 'xHeightGrid',
      // Whole-drawing constructions that still say something about a wordmark.
      'inkHeightBands', 'typographicProportions', 'dynamicBaseline', 'slantAngle',
      'spacingGuides', 'alignmentGuides', 'componentRatioLabels', 'harmonicDivisions',
      'strokeWeight', 'reductionTest', 'cornerRadii', 'curvatureComb', 'safeZone',
      'opticalCenter', 'symmetryAxes', 'centerLines', 'boundingRects',
      'constructionGrid', 'tangentIntersections',
    ];
    for (const p of [...byFamily('wordmark'), ...byFamily('lockup')]) {
      for (const key of enabled(p)) {
        expect(typographic.includes(key), `${p.name} -> ${String(key)}`).toBe(true);
      }
    }
  });

  it('uses every brand-analysis construction somewhere outside the full audit', () => {
    const brand: (keyof GeometryOptions)[] = ['inkHeightBands', 'slantAngle', 'strokeWeight', 'reductionTest', 'cornerRadii'];
    const curated = builtins.filter(p => p.id !== 'builtin-full-audit');
    for (const key of brand) {
      expect(curated.some(p => p.geometryOptions[key]), String(key)).toBe(true);
    }
  });

  it('presets meant for a single symbol do not rely on multi-component guides', () => {
    // spacingGuides / alignmentGuides need at least two components to draw
    // anything, so a symbol-only preset that turned them on would look broken.
    const multiComponentOnly: (keyof GeometryOptions)[] = ['spacingGuides'];
    const symbolOnly = ['builtin-quick-check', 'builtin-minimal', 'builtin-golden', 'builtin-monogram', 'builtin-presentation'];
    for (const id of symbolOnly) {
      const p = builtins.find(x => x.id === id)!;
      expect(p, id).toBeDefined();
      for (const key of multiComponentOnly) expect(p.geometryOptions[key], `${id} -> ${String(key)}`).toBe(false);
    }
  });

  it('survives normalization untouched', () => {
    for (const p of builtins) {
      const n = normalizePreset(p)!;
      expect(n.family, p.name).toBe(p.family);
      expect(n.geometryOptions).toEqual(p.geometryOptions);
      expect(n.name).toBe(p.name);
    }
  });
});

describe('preset thumbnails', () => {
  it('maps every construction to exactly one motif', () => {
    const seen = new Map<string, MotifId>();
    for (const id of MOTIF_IDS) {
      for (const key of MOTIF_KEYS[id]) {
        expect(keySet.has(String(key)), `${id} -> ${String(key)}`).toBe(true);
        expect(seen.has(String(key)), `${String(key)} is in ${seen.get(String(key))} too`).toBe(false);
        seen.set(String(key), id);
      }
    }
    const missing = GEOMETRY_KEYS.filter(k => !seen.has(String(k)));
    expect(missing).toEqual([]);
  });

  it('gives every built-in preset a drawable thumbnail, in the colours of the scene', () => {
    for (const p of builtins) {
      const motifs = presetMotifs(p);
      expect(motifs.length, p.name).toBeGreaterThan(0);
      expect(motifs.length).toBeLessThanOrEqual(3);
      expect(new Set(motifs.map(m => m.id)).size).toBe(motifs.length);
      for (const m of motifs) expect(m.color, `${p.name} -> ${m.id}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(constructionCount(p), p.name).toBe(enabled(p).length + (p.showGrid ? 1 : 0));
    }
  });

  it('a preset with nothing on has no motif', () => {
    const empty = createPreset({
      name: 'Vazio',
      geometryOptions: createDefaultGeometryOptions(),
      geometryStyles: createDefaultGeometryStyles(),
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
    });
    expect(presetMotifs(empty)).toEqual([]);
    expect(constructionCount(empty)).toBe(0);
  });
});

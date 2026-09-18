import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getBuiltinPresets, loadPresetsFromStorage, savePresetsToStorage, createPreset, normalizePreset, validatePreset,
  exportPresetsToJSON, importPresetsFromJSON, importPresetsFromFile, exportPresetsBlob,
  ALL_GEOMETRY_OFF, DEFAULT_GEOMETRY_STYLES, createDefaultGeometryStyles, createDefaultGeometryOptions,
  PRESET_FILE_FORMAT, PRESET_FILE_VERSION, PRESET_SCHEMA_VERSION, PRESET_FAMILIES, isPresetFamily, presetFamilyLabel, type GeometryPreset,
} from '../lib/preset-engine';
import { GEOMETRY_KEYS, geometryLayerId, isHexColor } from '../types/geometry';

const KEY = 'unbsgrid-presets';

const userPreset = (over: Partial<GeometryPreset> = {}): GeometryPreset => createPreset({
  name: 'Mine',
  description: 'desc',
  geometryOptions: { ...createDefaultGeometryOptions(), goldenSpiral: true },
  geometryStyles: createDefaultGeometryStyles(),
  clearspaceValue: 1,
  clearspaceUnit: 'logomark',
  showGrid: true,
  gridSubdivisions: 12,
  ...over,
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('geometry keys', () => {
  it('GEOMETRY_KEYS covers exactly the GeometryOptions keys', () => {
    expect([...GEOMETRY_KEYS].sort()).toEqual(Object.keys(ALL_GEOMETRY_OFF).sort());
    expect(Object.keys(DEFAULT_GEOMETRY_STYLES).sort()).toEqual([...GEOMETRY_KEYS].sort());
    expect(new Set(GEOMETRY_KEYS).size).toBe(GEOMETRY_KEYS.length);
  });

  it('layer ids are kebab-case and unique', () => {
    expect(geometryLayerId('goldenRatio')).toBe('golden-ratio');
    expect(geometryLayerId('kenBurnsSafe')).toBe('ken-burns-safe');
    const ids = GEOMETRY_KEYS.map(geometryLayerId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
  });

  it('defaults are frozen; factories return fresh copies', () => {
    expect(Object.isFrozen(DEFAULT_GEOMETRY_STYLES.circles)).toBe(true);
    const a = createDefaultGeometryStyles();
    a.circles.color = '#000000';
    expect(createDefaultGeometryStyles().circles.color).not.toBe('#000000');
  });

  it('every built-in preset is valid and complete', () => {
    for (const p of getBuiltinPresets()) {
      const n = normalizePreset(p)!;
      expect(n).not.toBeNull();
      expect(n.geometryOptions).toEqual(p.geometryOptions);
      expect(n.geometryStyles).toEqual(p.geometryStyles);
      expect(n.isBuiltin).toBe(true);
    }
  });
});

describe('normalizePreset', () => {
  it('fills keys missing from old presets and repairs invalid values', () => {
    const old = {
      id: 'p1', name: '  Old  ',
      geometryOptions: { boundingRects: true, circles: 'yes' },
      geometryStyles: { boundingRects: { color: 'red', opacity: 5, strokeWidth: -1 } },
      clearspaceValue: 'x', clearspaceUnit: 'mm', gridSubdivisions: 1000, showGrid: 1,
    };
    const p = normalizePreset(old)!;
    expect(p.name).toBe('Old');
    expect(Object.keys(p.geometryOptions)).toHaveLength(GEOMETRY_KEYS.length);
    expect(p.geometryOptions.boundingRects).toBe(true);
    expect(p.geometryOptions.circles).toBe(false);
    expect(p.geometryOptions.flowerOfLife).toBe(false);
    for (const k of GEOMETRY_KEYS) expect(p.geometryStyles[k]).toBeDefined();
    expect(p.geometryStyles.boundingRects).toEqual({ color: DEFAULT_GEOMETRY_STYLES.boundingRects.color, opacity: 1, strokeWidth: 0.05 });
    expect(p.clearspaceValue).toBe(0);
    expect(p.clearspaceUnit).toBe('logomark');
    expect(p.gridSubdivisions).toBe(64);
    expect(p.showGrid).toBe(false);
  });

  it('rejects entries without identity', () => {
    expect(normalizePreset(null)).toBeNull();
    expect(normalizePreset([])).toBeNull();
    expect(normalizePreset({ id: 'x' })).toBeNull();
    expect(normalizePreset({ name: 'x' })).toBeNull();
    expect(validatePreset({ id: 'a', name: 'b' })).toBe(true);
  });
});

describe('localStorage', () => {
  it('ignores invalid JSON and non-array payloads', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadPresetsFromStorage()).toEqual([]);
    localStorage.setItem(KEY, '42');
    expect(loadPresetsFromStorage()).toEqual([]);
    localStorage.setItem(KEY, 'null');
    expect(loadPresetsFromStorage()).toEqual([]);
  });

  it('upgrades old entries, drops invalid / builtin / duplicate ones', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { id: 'a', name: 'A', geometryOptions: { circles: true }, geometryStyles: {} },
      { id: 'a', name: 'A dup', geometryOptions: {}, geometryStyles: {} },
      { id: 'b' },
      { id: 'builtin-x', name: 'X', isBuiltin: true, geometryOptions: {}, geometryStyles: {} },
      'garbage',
    ]));
    const list = loadPresetsFromStorage();
    expect(list.map(p => p.id)).toEqual(['a']);
    expect(list[0].geometryStyles.concentricSquares).toEqual(DEFAULT_GEOMETRY_STYLES.concentricSquares);
  });

  it('round-trips user presets and skips built-ins', () => {
    const mine = userPreset();
    expect(savePresetsToStorage([...getBuiltinPresets(), mine])).toBe(true);
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].schemaVersion).toBe(PRESET_SCHEMA_VERSION);
    const loaded = loadPresetsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].geometryOptions.goldenSpiral).toBe(true);
    expect(loaded[0].gridSubdivisions).toBe(12);
  });

  it('save never throws on quota / security errors', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    expect(savePresetsToStorage([userPreset()])).toBe(false);
  });

  it('load/save survive a localStorage getter that throws (sandboxed iframe)', () => {
    const desc = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
    try {
      expect(loadPresetsFromStorage()).toEqual([]);
      expect(savePresetsToStorage([userPreset()])).toBe(false);
    } finally {
      Object.defineProperty(window, 'localStorage', desc);
    }
  });

  it('createPreset ids are unique', () => {
    const ids = new Set(Array.from({ length: 50 }, () => userPreset().id));
    expect(ids.size).toBe(50);
  });
});

describe('preset files', () => {
  it('exports a versioned file without built-ins and imports it back', () => {
    const mine = userPreset();
    const json = exportPresetsToJSON([...getBuiltinPresets(), mine]);
    const file = JSON.parse(json);
    expect(file.format).toBe(PRESET_FILE_FORMAT);
    expect(file.version).toBe(PRESET_FILE_VERSION);
    expect(file.presets).toHaveLength(1);
    expect(file.presets[0].isBuiltin).toBeUndefined();
    const res = importPresetsFromJSON(json);
    expect(res.errors).toEqual([]);
    expect(res.fileVersion).toBe(1);
    expect(res.presets).toHaveLength(1);
    expect(res.presets[0]).toMatchObject({ id: mine.id, name: 'Mine', gridSubdivisions: 12 });
    expect(JSON.parse(exportPresetsToJSON(getBuiltinPresets(), { includeBuiltin: true, pretty: false })).presets.length)
      .toBe(getBuiltinPresets().length);
  });

  it('renames name collisions, re-ids id collisions, never imports built-ins', () => {
    const existing = [userPreset({ name: 'Mine' }), userPreset({ name: 'Mine (2)' })];
    const incoming = { ...existing[0], isBuiltin: true };
    const res = importPresetsFromJSON(exportPresetsToJSON([incoming], { includeBuiltin: true }), existing);
    expect(res.presets).toHaveLength(1);
    expect(res.presets[0].name).toBe('Mine (3)');
    expect(res.presets[0].id).not.toBe(existing[0].id);
    expect(res.presets[0].isBuiltin).toBeUndefined();
    expect(res.warnings.join()).toMatch(/Mine \(3\)/);
  });

  it('accepts legacy arrays and single objects with warnings', () => {
    const legacy = importPresetsFromJSON(JSON.stringify([{ id: 'x', name: 'Legacy', geometryOptions: {}, geometryStyles: {} }]));
    expect(legacy.presets).toHaveLength(1);
    expect(legacy.warnings.join()).toMatch(/antigo/);
    expect(legacy.warnings.join()).toMatch(/esquema v1/);
    const single = importPresetsFromJSON(JSON.stringify({ name: 'Solo', geometryOptions: { circles: true } }));
    expect(single.presets[0].name).toBe('Solo');
    expect(single.presets[0].id).toMatch(/^preset-/);
  });

  it('rejects invalid files with a reason', () => {
    expect(importPresetsFromJSON('').errors[0]).toMatch(/vazio/);
    expect(importPresetsFromJSON('{').errors[0]).toMatch(/JSON/);
    expect(importPresetsFromJSON('{"hello":1}').errors[0]).toMatch(/Formato/);
    expect(importPresetsFromJSON(JSON.stringify({ format: PRESET_FILE_FORMAT, version: 0, presets: [] })).errors[0]).toMatch(/versão/);
    expect(importPresetsFromJSON(JSON.stringify({ format: PRESET_FILE_FORMAT, version: 1, presets: 'x' })).errors).toHaveLength(1);
    expect(importPresetsFromJSON('x'.repeat(6 * 1024 * 1024)).errors[0]).toMatch(/grande/);
    const partial = importPresetsFromJSON(JSON.stringify({ format: PRESET_FILE_FORMAT, version: 1, presets: [{ id: 'a' }, 5, { id: 'b', name: 'B' }] }));
    expect(partial.presets.map(p => p.name)).toEqual(['B']);
    expect(partial.errors).toHaveLength(2);
  });

  it('warns about files from a newer version and caps the preset count', () => {
    const many = Array.from({ length: 510 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, geometryOptions: {}, geometryStyles: {}, futureField: 1 }));
    const res = importPresetsFromJSON(JSON.stringify({ format: PRESET_FILE_FORMAT, version: 99, presets: many }));
    expect(res.presets).toHaveLength(500);
    expect(res.warnings.join()).toMatch(/mais nova/);
    expect(res.warnings.join()).toMatch(/500/);
    expect((res.presets[0] as unknown as Record<string, unknown>).futureField).toBeUndefined();
  });

  it('imports from a Blob/File', async () => {
    const blob = exportPresetsBlob([userPreset({ name: 'From file' })]);
    expect(blob.type).toBe('application/json');
    const res = await importPresetsFromFile(blob);
    expect(res.presets[0].name).toBe('From file');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { decodeEncodedPayload, safeDecodeEncodedPayload, encodePayload, xorBytes } from '../data/encoded/decode';
import { loadColorLibrary } from '../data/encoded/loadColors';
import { loadAnalyses, sanitizeValue } from '../data/encoded/loadAnalyses';

afterEach(() => vi.restoreAllMocks());

describe('encoded .dat decoding', () => {
  it('round-trips unicode JSON across chunks', () => {
    const value = { colors: [{ name: 'Açaí ✓', hex: '#FFE000' }], n: 3 };
    const raw = encodePayload(value, 'c0lor-key', 7);
    expect(JSON.parse(raw).d.length).toBeGreaterThan(1);
    expect(decodeEncodedPayload(raw, 'c0lor-key')).toEqual(value);
  });

  it('xor with an empty key is a no-op copy (no NaN/undefined bytes)', () => {
    const data = Uint8Array.from([1, 2, 3]);
    const out = xorBytes(data, '');
    expect(Array.from(out)).toEqual([1, 2, 3]);
    expect(out).not.toBe(data);
  });

  it('throws descriptive errors for malformed payloads', () => {
    expect(() => decodeEncodedPayload('', 'k')).toThrow(/empty/);
    expect(() => decodeEncodedPayload('{"x":1}', 'k')).toThrow(/invalid shape/);
    expect(() => decodeEncodedPayload('{"d":[1,2]}', 'k')).toThrow(/invalid shape/);
    expect(() => decodeEncodedPayload('not json', 'k')).toThrow();
    // wrong key -> garbage -> JSON.parse fails
    expect(() => decodeEncodedPayload(encodePayload({ a: 1 }, 'right'), 'wrong')).toThrow();
  });

  it('safeDecode returns the fallback instead of crashing the module import', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(safeDecodeEncodedPayload('garbage', 'k', { colors: [] })).toEqual({ colors: [] });
    expect(spy).toHaveBeenCalled();
  });
});

describe('bundled datasets', () => {
  it('color library decodes and is cached', () => {
    const lib = loadColorLibrary();
    expect(Array.isArray(lib.colors)).toBe(true);
    expect(lib.colors.length).toBeGreaterThan(1000);
    expect(lib.colors[0]).toHaveProperty('hex');
    expect(loadColorLibrary()).toBe(lib);
  });

  it('analysis dataset decodes, is sanitized and cached', () => {
    const data = loadAnalyses();
    const keys = Object.keys(data);
    expect(keys.length).toBeGreaterThan(100);
    expect(JSON.stringify(data[keys[0]])).not.toMatch(/pantone/i);
    expect(loadAnalyses()).toBe(data);
  });

  it('sanitizeValue replaces brand name deeply', () => {
    expect(sanitizeValue({ a: ['Pantone 186 C', { b: 'PANTONE' }], n: 1 })).toEqual({
      a: ['reference 186 C', { b: 'reference' }],
      n: 1
    });
  });
});

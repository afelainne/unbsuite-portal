import { describe, it, expect } from 'vitest';
import {
  isValidHex,
  normalizeHex,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  hslToRgb,
  hsvToRgb,
  rgbToCmyk,
  cmykToRgb,
  hexToLab,
  labToHex,
  deltaE2000,
  findReferenceMatches,
  enrichLibraryWithLab,
  getClosestColorName,
  adjustHue,
  mixColors,
  generateHarmonies,
  wrapHue
} from '../utils/colorMath';
import type { ReferenceColor } from '../types';

describe('isValidHex / normalizeHex / hexToRgb', () => {
  it.each(['#FFF', 'fff', '#abc', 'ABC', '#a1b2c3', 'a1b2c3', '#A1B2C3'])('accepts %s', (hex) => {
    expect(isValidHex(hex)).toBe(true);
  });

  it.each(['', '#', '#ff', '#ffff', '#fffff', '#fffffff', 'ggg', '#12345g', ' #fff', '##fff', 'fff '])(
    'rejects %j',
    (hex) => {
      expect(isValidHex(hex)).toBe(false);
    }
  );

  it('rejects non-strings without throwing', () => {
    expect(isValidHex(undefined as unknown as string)).toBe(false);
    expect(isValidHex(123 as unknown as string)).toBe(false);
  });

  it('normalizes 3-digit, lowercase and missing #', () => {
    expect(normalizeHex('abc')).toBe('#AABBCC');
    expect(normalizeHex('#a1b2c3')).toBe('#A1B2C3');
    expect(normalizeHex('  #fff ')).toBe('#FFFFFF');
    expect(normalizeHex('nope')).toBeNull();
  });

  it('hexToRgb handles 3-digit / lowercase / no # and never returns NaN', () => {
    expect(hexToRgb('abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(hexToRgb('#f7e043')).toEqual({ r: 247, g: 224, b: 67 });
    expect(hexToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHex clamps and rounds (bug: fractional/out-of-range produced invalid hex)', () => {
  it('rounds fractional channels', () => {
    expect(rgbToHex(254.6, 0.4, 127.5)).toBe('#FF0080');
  });
  it('clamps out-of-range and NaN channels', () => {
    expect(rgbToHex(300, -20, NaN)).toBe('#FF0000');
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
  });
  it('round-trips with hexToRgb', () => {
    for (const hex of ['#000000', '#FFFFFF', '#F7E043', '#1A1A1A', '#0080FF']) {
      const { r, g, b } = hexToRgb(hex);
      expect(rgbToHex(r, g, b)).toBe(hex);
    }
  });
});

describe('hue handling (bug: hue could be 360; negative hue broke hslToRgb)', () => {
  it('rgbToHsl never returns h = 360', () => {
    // raw hue 359.76° used to round to 360
    const hsl = rgbToHsl({ r: 255, g: 0, b: 1 });
    expect(hsl.h).toBeGreaterThanOrEqual(0);
    expect(hsl.h).toBeLessThan(360);
    expect(hsl.h).toBe(0);
    const hsv = rgbToHsv({ r: 255, g: 0, b: 1 });
    expect(hsv.h).toBe(0);
  });

  it('exhaustive sample: hue always in [0, 360)', () => {
    for (let r = 0; r <= 255; r += 15) {
      for (let g = 0; g <= 255; g += 15) {
        for (let b = 0; b <= 255; b += 15) {
          const { h } = rgbToHsl({ r, g, b });
          expect(h).toBeLessThan(360);
          expect(h).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('hslToRgb wraps negative and >= 360 hues', () => {
    const ref = hslToRgb({ h: 330, s: 80, l: 50 });
    expect(hslToRgb({ h: -30, s: 80, l: 50 })).toEqual(ref);
    expect(hslToRgb({ h: 690, s: 80, l: 50 })).toEqual(ref);
    expect(hslToRgb({ h: 360, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('hslToRgb clamps s/l', () => {
    expect(hslToRgb({ h: 0, s: 150, l: 120 })).toEqual({ r: 255, g: 255, b: 255 });
    expect(hslToRgb({ h: 0, s: -10, l: 50 })).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('wrapHue', () => {
    expect(wrapHue(-30)).toBe(330);
    expect(wrapHue(360)).toBe(0);
    expect(wrapHue(725)).toBe(5);
    expect(wrapHue(NaN)).toBe(0);
  });

  it('adjustHue wraps', () => {
    expect(adjustHue({ r: 255, g: 0, b: 0 }, -120)).toEqual({ r: 0, g: 0, b: 255 });
    expect(adjustHue({ r: 255, g: 0, b: 0 }, 480)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('hsvToRgb inverts rgbToHsv', () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb({ h: 240, s: 100, v: 50 })).toEqual({ r: 0, g: 0, b: 128 });
    expect(hsvToRgb({ h: -120, s: 100, v: 100 })).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('round-trips HSL for primaries', () => {
    for (const rgb of [{ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 }, { r: 128, g: 128, b: 128 }]) {
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
    }
  });
});

describe('CMYK', () => {
  it('pure black has no division by zero', () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
  });
  it('white and primaries', () => {
    expect(rgbToCmyk({ r: 255, g: 255, b: 255 })).toEqual({ c: 0, m: 0, y: 0, k: 0 });
    expect(rgbToCmyk({ r: 255, g: 0, b: 0 })).toEqual({ c: 0, m: 100, y: 100, k: 0 });
    expect(rgbToCmyk({ r: 1, g: 0, b: 0 })).toEqual({ c: 0, m: 100, y: 100, k: 100 });
  });
  it('never returns NaN for out-of-range input', () => {
    const res = rgbToCmyk({ r: NaN, g: -5, b: 999 });
    Object.values(res).forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });
  it('cmykToRgb clamps to 0–100 (bug: values > 100 produced negative channels)', () => {
    expect(cmykToRgb({ c: 150, m: -20, y: 0, k: 0 })).toEqual({ r: 0, g: 255, b: 255 });
    expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 100 })).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('CIE Lab (D65 end-to-end)', () => {
  const close = (a: number, b: number, tol = 0.05) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

  it('white is L=100, a=b=0 (white point consistent with the sRGB matrix)', () => {
    const lab = hexToLab('#FFFFFF');
    close(lab.l, 100, 0.01);
    close(lab.a, 0, 0.02);
    close(lab.b, 0, 0.02);
  });

  it('matches published sRGB/D65 values', () => {
    const red = hexToLab('#FF0000');
    close(red.l, 53.24, 0.05);
    close(red.a, 80.09, 0.05);
    close(red.b, 67.2, 0.05);
    const green = hexToLab('#00FF00');
    close(green.l, 87.73, 0.05);
    close(green.a, -86.18, 0.05);
    close(green.b, 83.18, 0.05);
    const blue = hexToLab('#0000FF');
    close(blue.l, 32.3, 0.05);
    close(blue.a, 79.19, 0.05);
    close(blue.b, -107.86, 0.05);
  });

  it('labToHex inverts hexToLab (incl. dark colors in the linear segment)', () => {
    for (const hex of ['#000000', '#010101', '#050505', '#FFFFFF', '#F7E043', '#1A1A1A', '#123456', '#FF00FF']) {
      expect(labToHex(hexToLab(hex))).toBe(hex);
    }
  });
});

describe('deltaE2000 — Sharma, Wu & Dalal (2005) test data', () => {
  // [L1, a1, b1, L2, a2, b2, ΔE00]
  const SHARMA: number[][] = [
    [50.0, 2.6772, -79.7751, 50.0, 0.0, -82.7485, 2.0425],
    [50.0, 3.1571, -77.2803, 50.0, 0.0, -82.7485, 2.8615],
    [50.0, 2.8361, -74.02, 50.0, 0.0, -82.7485, 3.4412],
    [50.0, -1.3802, -84.2814, 50.0, 0.0, -82.7485, 1.0],
    [50.0, -1.1848, -84.8006, 50.0, 0.0, -82.7485, 1.0],
    [50.0, -0.9009, -85.5211, 50.0, 0.0, -82.7485, 1.0],
    [50.0, 0.0, 0.0, 50.0, -1.0, 2.0, 2.3669],
    [50.0, -1.0, 2.0, 50.0, 0.0, 0.0, 2.3669],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.0009, 7.1792],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.001, 7.1792],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.0011, 7.2195],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.0012, 7.2195],
    [50.0, -0.001, 2.49, 50.0, 0.0009, -2.49, 4.8045],
    [50.0, -0.001, 2.49, 50.0, 0.001, -2.49, 4.8045],
    [50.0, -0.001, 2.49, 50.0, 0.0011, -2.49, 4.7461],
    [50.0, 2.5, 0.0, 50.0, 0.0, -2.5, 4.3065],
    [50.0, 2.5, 0.0, 73.0, 25.0, -18.0, 27.1492],
    [50.0, 2.5, 0.0, 61.0, -5.0, 29.0, 22.8977],
    [50.0, 2.5, 0.0, 56.0, -27.0, -3.0, 31.903],
    [50.0, 2.5, 0.0, 58.0, 24.0, 15.0, 19.4535],
    [50.0, 2.5, 0.0, 50.0, 3.1736, 0.5854, 1.0],
    [50.0, 2.5, 0.0, 50.0, 3.2972, 0.0, 1.0],
    [50.0, 2.5, 0.0, 50.0, 1.8634, 0.5757, 1.0],
    [50.0, 2.5, 0.0, 50.0, 3.2592, 0.335, 1.0],
    [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
    [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
    [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
    [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
    [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
    [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
    [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
    [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
    [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
    [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082]
  ];

  it.each(SHARMA.map((row, i) => [i + 1, ...row]))(
    'pair %i',
    (_i, L1, a1, b1, L2, a2, b2, expected) => {
      const d12 = deltaE2000({ l: L1, a: a1, b: b1 }, { l: L2, a: a2, b: b2 });
      const d21 = deltaE2000({ l: L2, a: a2, b: b2 }, { l: L1, a: a1, b: b1 });
      expect(d12).toBeCloseTo(expected, 4);
      // ΔE00 is symmetric
      expect(d21).toBeCloseTo(expected, 4);
    }
  );

  it('identical colors -> 0', () => {
    expect(deltaE2000({ l: 50, a: 10, b: -10 }, { l: 50, a: 10, b: -10 })).toBe(0);
    expect(deltaE2000({ l: 0, a: 0, b: 0 }, { l: 0, a: 0, b: 0 })).toBe(0);
  });
});

describe('findReferenceMatches (memoized)', () => {
  const makeLib = (n: number): ReferenceColor[] =>
    Array.from({ length: n }, (_, i) => {
      const hex = rgbToHex((i * 37) % 256, (i * 91) % 256, (i * 53) % 256);
      return { code: `REF ${i}`, name: `Ref ${i}`, hex, rgb: hexToRgb(hex) };
    });

  it('returns the exact color first with ΔE 0', () => {
    const lib = makeLib(300);
    const target = lib[123].hex;
    const [best] = findReferenceMatches(target, lib, 3);
    expect(best.reference.hex).toBe(target);
    expect(best.deltaE).toBeCloseTo(0, 6);
    expect(best.ranking).toBe('Exact');
  });

  it('caches by normalized hex (lowercase / no # / 3-digit hit the same entry)', () => {
    const lib = makeLib(500);
    const a = findReferenceMatches('#AABBCC', lib, 5);
    const b = findReferenceMatches('aabbcc', lib, 5);
    const c = findReferenceMatches('abc', lib, 5);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    // same match objects => served from cache, not recomputed
    b.forEach((m, i) => expect(m).toBe(a[i]));
    c.forEach((m, i) => expect(m).toBe(a[i]));
    // callers get a fresh array (mutating it cannot corrupt the cache)
    expect(b).not.toBe(a);
    b.pop();
    expect(findReferenceMatches('#AABBCC', lib, 5)).toHaveLength(5);
  });

  it('cache is per library and per count', () => {
    const libA = makeLib(50);
    const libB = makeLib(60);
    expect(findReferenceMatches('#336699', libA, 3)).toHaveLength(3);
    expect(findReferenceMatches('#336699', libA, 6)).toHaveLength(6);
    const fromB = findReferenceMatches('#336699', libB, 3);
    expect(fromB.every((m) => libB.includes(m.reference))).toBe(true);
  });

  it('repeated lookups on a large un-enriched library are fast', () => {
    const lib = makeLib(4000);
    const t0 = performance.now();
    findReferenceMatches('#F7E043', lib, 1);
    const cold = performance.now() - t0;
    const t1 = performance.now();
    for (let i = 0; i < 200; i++) findReferenceMatches('#F7E043', lib, 1);
    const warm = (performance.now() - t1) / 200;
    expect(warm).toBeLessThan(Math.max(cold / 10, 0.5));
  });

  it('invalid input / empty library -> []', () => {
    expect(findReferenceMatches('zzz', makeLib(5))).toEqual([]);
    expect(findReferenceMatches('#fff', [])).toEqual([]);
    expect(findReferenceMatches('#fff', makeLib(5), 0)).toEqual([]);
  });

  it('enrichLibraryWithLab is stable for the same input (memo-friendly)', () => {
    const lib = makeLib(20);
    const e1 = enrichLibraryWithLab(lib);
    const e2 = enrichLibraryWithLab(lib);
    expect(e2).toBe(e1);
    expect(enrichLibraryWithLab(e1)).toBe(e1);
    expect(e1[0].lab).toEqual(hexToLab(lib[0].hex));
  });
});

describe('misc helpers', () => {
  it('getClosestColorName is consistent across hex spellings', () => {
    expect(getClosestColorName('#FF0000')).toBe('Red');
    expect(getClosestColorName('ff0000')).toBe('Red');
    expect(getClosestColorName('f00')).toBe('Red');
    expect(getClosestColorName('bad')).not.toBe('');
    expect(getClosestColorName('xyz')).toBe('Custom Color');
  });

  it('mixColors keeps previous semantics (weight = % of color2) and clamps', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(mixColors(black, white, 0)).toEqual(black);
    expect(mixColors(black, white, 100)).toEqual(white);
    expect(mixColors(black, white, 50)).toEqual({ r: 128, g: 128, b: 128 });
    expect(mixColors(black, white, 150)).toEqual(white);
  });

  it('generateHarmonies returns valid hexes', () => {
    const h = generateHarmonies('#F7E043');
    expect(h).toHaveLength(7);
    h.forEach((c) => expect(isValidHex(c.hex)).toBe(true));
    expect(generateHarmonies('nope')).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import {
  hexToOklch,
  hexToOklab,
  oklchToHex,
  oklabToHex,
  isOklchInGamut,
  gamutMapOklch,
  formatOklch,
  formatOklab,
  deltaEOK
} from '../utils/oklab';
import {
  contrastRatio,
  getWcagContrast,
  wcagLevelFor,
  apcaContrast,
  apcaUsage,
  bestTextColor,
  suggestAccessibleColor,
  relativeLuminance
} from '../utils/contrast';
import { simulateColorBlindness, simulatePalette, MACHADO_2009_MATRICES } from '../utils/colorBlindness';
import { generateTonalScale, generateTonalScaleRecord, TONAL_STEPS } from '../utils/tonalScale';
import { escapeXml, toSafeFileName } from '../utils/escape';
import { deltaE2000, hexToLab, isValidHex } from '../utils/colorMath';

const near = (actual: number, expected: number, tol: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('OKLab / OKLCH', () => {
  it('matches reference values (Ottosson / CSS Color 4)', () => {
    const red = hexToOklch('#FF0000');
    near(red.l, 0.62796, 1e-4);
    near(red.c, 0.25768, 1e-4);
    near(red.h, 29.2339, 1e-2);

    const blue = hexToOklch('#0000FF');
    near(blue.l, 0.45201, 1e-4);
    near(blue.c, 0.31321, 1e-4);
    near(blue.h, 264.052, 1e-2);

    const white = hexToOklab('#FFFFFF');
    near(white.l, 1, 1e-4);
    near(white.a, 0, 1e-4);
    near(white.b, 0, 1e-4);
  });

  it('achromatic colors get hue 0 (no atan2 noise)', () => {
    for (const hex of ['#000000', '#808080', '#FFFFFF']) {
      const lch = hexToOklch(hex);
      expect(lch.h).toBe(0);
      expect(lch.c).toBeLessThan(1e-3);
    }
  });

  it('round-trips hex -> OKLCH -> hex', () => {
    for (const hex of ['#000000', '#FFFFFF', '#F7E043', '#1A1A1A', '#123456', '#FF00FF', '#00FF00', '#7F7F80']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
      expect(oklabToHex(hexToOklab(hex))).toBe(hex);
    }
  });

  it('gamut maps by reducing chroma while keeping L and H', () => {
    const outOfGamut = { l: 0.7, c: 0.4, h: 145 };
    expect(isOklchInGamut(outOfGamut)).toBe(false);
    const mapped = gamutMapOklch(outOfGamut);
    expect(isOklchInGamut(mapped)).toBe(true);
    expect(mapped.l).toBe(0.7);
    expect(mapped.h).toBe(145);
    expect(mapped.c).toBeLessThan(0.4);
    expect(mapped.c).toBeGreaterThan(0.1);
    expect(isValidHex(oklchToHex(outOfGamut))).toBe(true);
    expect(gamutMapOklch({ l: 1.2, c: 0.2, h: -10 })).toEqual({ l: 1, c: 0, h: 350 });
  });

  it('formats CSS strings', () => {
    expect(formatOklch('#FF0000')).toBe('oklch(62.8% 0.2577 29.23)');
    expect(formatOklch({ l: 0.5, c: 0.1, h: 200 }, 0.5)).toBe('oklch(50% 0.1 200 / 0.5)');
    expect(formatOklab('#FFFFFF')).toMatch(/^oklab\(100% -?0 -?0\)$/);
    expect(formatOklch('nope')).toBe('');
  });

  it('deltaEOK', () => {
    expect(deltaEOK(hexToOklab('#FFFFFF'), hexToOklab('#000000'))).toBeCloseTo(1, 3);
  });
});

describe('WCAG 2.2 contrast', () => {
  it('extremes and symmetry', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 10);
    expect(contrastRatio('#abc', '#abc')).toBe(1);
    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(contrastRatio('#GGG', '#fff')).toBeNaN();
  });

  it('known thresholds: #767676 passes AA on white, #777777 fails', () => {
    const pass = getWcagContrast('#767676', '#FFFFFF')!;
    expect(pass.ratio).toBeGreaterThanOrEqual(4.5);
    expect(pass.aa.normal).toBe(true);
    expect(pass.aaa.normal).toBe(false);
    expect(pass.aaa.large).toBe(true);
    expect(pass.level).toEqual({ normal: 'AA', large: 'AAA' });

    const fail = getWcagContrast('#777777', '#FFFFFF')!;
    near(fail.ratio, 4.4776, 1e-3);
    // must NOT be rounded up to 4.5
    expect(fail.aa.normal).toBe(false);
    expect(fail.aa.large).toBe(true);
    expect(fail.nonText).toBe(true);
    expect(fail.display).toBe('4.47:1');
  });

  it('wcagLevelFor', () => {
    expect(wcagLevelFor(7)).toBe('AAA');
    expect(wcagLevelFor(6.99)).toBe('AA');
    expect(wcagLevelFor(2.99, 'large')).toBe('Fail');
    expect(wcagLevelFor(NaN)).toBe('Fail');
    expect(getWcagContrast('xyz', '#fff')).toBeNull();
  });
});

describe('APCA', () => {
  it.each([
    ['#000000', '#FFFFFF', 106.04],
    ['#FFFFFF', '#000000', -107.88],
    ['#888888', '#FFFFFF', 63.06],
    ['#FFFFFF', '#888888', -68.54],
    ['#000000', '#AAAAAA', 58.15],
    ['#AAAAAA', '#000000', -56.24]
  ])('Lc(%s on %s) ≈ %d', (text, bg, expected) => {
    near(apcaContrast(text, bg), expected, 0.05);
  });

  it('same color is 0, invalid is NaN', () => {
    expect(apcaContrast('#777', '#777')).toBe(0);
    expect(apcaContrast('x', '#777')).toBeNaN();
  });

  it('usage bands', () => {
    expect(apcaUsage(-107)).toBe('body-preferred');
    expect(apcaUsage(76)).toBe('body');
    expect(apcaUsage(63)).toBe('content');
    expect(apcaUsage(50)).toBe('large-text');
    expect(apcaUsage(31)).toBe('spot-text');
    expect(apcaUsage(16)).toBe('non-text');
    expect(apcaUsage(10)).toBe('fail');
  });
});

describe('contrast helpers', () => {
  it('bestTextColor', () => {
    expect(bestTextColor('#F7E043')).toBe('#000000');
    expect(bestTextColor('#1A1A1A')).toBe('#FFFFFF');
    expect(bestTextColor('#1A1A1A', ['#FFFFFF', '#EEEEEE'], 'apca')).toBe('#FFFFFF');
  });

  it('suggestAccessibleColor reaches the target with minimal change', () => {
    expect(suggestAccessibleColor('#000', '#FFFFFF')).toBe('#000000');
    const fixed = suggestAccessibleColor('#F7E043', '#FFFFFF', 4.5)!;
    expect(fixed).not.toBeNull();
    expect(contrastRatio(fixed, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    // keeps the hue family (yellow/olive)
    near(hexToOklch(fixed).h, hexToOklch('#F7E043').h, 8);
    const onBlack = suggestAccessibleColor('#333333', '#000000', 7)!;
    expect(contrastRatio(onBlack, '#000000')).toBeGreaterThanOrEqual(7);
    // impossible target
    expect(suggestAccessibleColor('#808080', '#808080', 22)).toBeNull();
  });
});

describe('color blindness (Machado 2009)', () => {
  it('matrices preserve white (rows sum to 1)', () => {
    for (const m of Object.values(MACHADO_2009_MATRICES)) {
      for (const row of m) near(row[0] + row[1] + row[2], 1, 1e-5);
    }
  });

  it('neutrals are unchanged', () => {
    for (const type of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'] as const) {
      expect(simulateColorBlindness('#FFFFFF', type)).toBe('#FFFFFF');
      expect(simulateColorBlindness('#000000', type)).toBe('#000000');
      expect(simulateColorBlindness('#808080', type)).toBe('#808080');
    }
  });

  it('known value: pure red under protanopia', () => {
    expect(simulateColorBlindness('#FF0000', 'protanopia')).toBe('#6D5F00');
  });

  it('red/green become confusable for protan/deutan, not for tritan', () => {
    const d = (a: string, b: string) => deltaE2000(hexToLab(a), hexToLab(b));
    const original = d('#D62728', '#2CA02C');
    const deutan = d(simulateColorBlindness('#D62728', 'deuteranopia')!, simulateColorBlindness('#2CA02C', 'deuteranopia')!);
    const protan = d(simulateColorBlindness('#D62728', 'protanopia')!, simulateColorBlindness('#2CA02C', 'protanopia')!);
    const tritan = d(simulateColorBlindness('#D62728', 'tritanopia')!, simulateColorBlindness('#2CA02C', 'tritanopia')!);
    expect(deutan).toBeLessThan(original / 2);
    expect(protan).toBeLessThan(original / 2);
    expect(tritan).toBeGreaterThan(deutan);
  });

  it('severity 0 is identity; invalid hex -> null; palette helper', () => {
    expect(simulateColorBlindness('#D62728', 'deuteranopia', 0)).toBe('#D62728');
    expect(simulateColorBlindness('nope', 'tritanopia')).toBeNull();
    const pal = simulatePalette(['#FF0000', 'xyz'], ['protanopia']);
    expect(pal.protanopia).toEqual(['#6D5F00', 'xyz']);
  });

  it('achromatopsia yields grays', () => {
    const hex = simulateColorBlindness('#F7E043', 'achromatopsia')!;
    expect(hex.slice(1, 3)).toBe(hex.slice(3, 5));
    expect(hex.slice(3, 5)).toBe(hex.slice(5, 7));
  });
});

describe('tonal scale 50–950 (OKLCH)', () => {
  it('produces 11 valid, strictly darkening steps', () => {
    for (const base of ['#3B82F6', '#F7E043', '#1A1A1A', '#FFFFFF', '#000000', '#FF00FF', '#808080']) {
      const scale = generateTonalScale(base)!;
      expect(scale.swatches.map((s) => s.step)).toEqual([...TONAL_STEPS]);
      scale.swatches.forEach((s) => expect(isValidHex(s.hex)).toBe(true));
      for (let i = 1; i < scale.swatches.length; i++) {
        expect(scale.swatches[i].oklch.l).toBeLessThan(scale.swatches[i - 1].oklch.l);
      }
    }
  });

  it('anchors the input color on the closest step', () => {
    const scale = generateTonalScale('#3b82f6')!; // Tailwind blue-500
    expect(scale.anchorStep).toBe(500);
    const base = scale.swatches.find((s) => s.isBase)!;
    expect(base.step).toBe(500);
    expect(base.hex).toBe('#3B82F6');
    expect(scale.swatches.filter((s) => s.isBase)).toHaveLength(1);
  });

  it('keeps hue and neutral colors stay neutral', () => {
    const blue = generateTonalScale('#3B82F6')!;
    blue.swatches.slice(1, 10).forEach((s) => near(s.oklch.h, hexToOklch('#3B82F6').h, 1));
    const gray = generateTonalScale('#808080')!;
    gray.swatches.forEach((s) => expect(s.oklch.c).toBeLessThan(0.002));
  });

  it('does not anchor colors far from every step (e.g. pure black)', () => {
    const scale = generateTonalScale('#000000')!;
    expect(scale.anchorStep).toBeNull();
    expect(scale.swatches.some((s) => s.isBase)).toBe(false);
  });

  it('options & record helper', () => {
    expect(generateTonalScale('zzz')).toBeNull();
    expect(() => generateTonalScale('#fff', { lightness: [1, 0.5] })).toThrow();
    const rec = generateTonalScaleRecord('#3B82F6', { anchor: false })!;
    expect(Object.keys(rec)).toEqual(TONAL_STEPS.map(String));
    // the default lightness table is calibrated so Tailwind blue-500 lands on 500 even unanchored
    expect(rec[500]).toBe('#3B82F6');
    const unanchored = generateTonalScale('#F7E043', { anchor: false })!;
    expect(unanchored.anchorStep).toBeNull();
    expect(unanchored.swatches.some((s) => s.hex === '#F7E043')).toBe(false);
    const shifted = generateTonalScale('#3B82F6', { anchor: false, hueShift: 20 })!;
    expect(shifted.swatches[10].oklch.h).toBeGreaterThan(shifted.swatches[1].oklch.h);
  });
});

describe('escape helpers', () => {
  it('escapeXml', () => {
    expect(escapeXml(`Tom & Jerry's <"red">`)).toBe('Tom &amp; Jerry&apos;s &lt;&quot;red&quot;&gt;');
    expect(escapeXml(`a${String.fromCharCode(1)}b`)).toBe('ab');
    expect(escapeXml(undefined)).toBe('');
  });
  it('toSafeFileName', () => {
    expect(toSafeFileName('Paleta Açaí: v1/2?')).toBe('paleta-acai-v12');
    expect(toSafeFileName('   ')).toBe('palette');
  });
});

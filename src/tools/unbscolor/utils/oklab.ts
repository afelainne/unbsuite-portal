// OKLab / OKLCH (Björn Ottosson, 2020) conversions for sRGB colors.
// L is 0–1, a/b roughly ±0.4, C is 0–~0.37, H in degrees [0, 360).

import type { RGB } from '../types';
import { hexToRgb, isValidHex, linearToSrgb, rgbToHex, srgbToLinear, wrapHue } from './colorMath';

export interface OKLab {
  l: number;
  a: number;
  b: number;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

/** Below this chroma a color is treated as achromatic (hue = 0). */
export const OKLCH_ACHROMATIC_THRESHOLD = 1e-4;

export const linearRgbToOklab = (r: number, g: number, b: number): OKLab => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
};

/** OKLab -> linear sRGB (unclamped; values outside 0–1 are out of gamut). */
export const oklabToLinearRgb = ({ l: L, a, b }: OKLab): [number, number, number] => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
};

export const rgbToOklab = ({ r, g, b }: RGB): OKLab =>
  linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));

/** OKLab -> 8-bit sRGB, clipped per channel (use oklchToHex for proper gamut mapping). */
export const oklabToRgb = (lab: OKLab): RGB => {
  const [r, g, b] = oklabToLinearRgb(lab);
  const enc = (c: number) => Math.round(Math.min(1, Math.max(0, linearToSrgb(c))) * 255);
  return { r: enc(r), g: enc(g), b: enc(b) };
};

export const oklabToOklch = ({ l, a, b }: OKLab): OKLCH => {
  const c = Math.hypot(a, b);
  const h = c < OKLCH_ACHROMATIC_THRESHOLD ? 0 : wrapHue((Math.atan2(b, a) * 180) / Math.PI);
  return { l, c, h };
};

export const oklchToOklab = ({ l, c, h }: OKLCH): OKLab => {
  const rad = (wrapHue(h) * Math.PI) / 180;
  const cc = Math.max(0, c);
  return { l, a: cc * Math.cos(rad), b: cc * Math.sin(rad) };
};

export const rgbToOklch = (rgb: RGB): OKLCH => oklabToOklch(rgbToOklab(rgb));

export const hexToOklab = (hex: string): OKLab => rgbToOklab(hexToRgb(hex));

export const hexToOklch = (hex: string): OKLCH => rgbToOklch(hexToRgb(hex));

const GAMUT_EPS = 1e-6;

export const isOklchInGamut = (lch: OKLCH): boolean => {
  const rgb = oklabToLinearRgb(oklchToOklab(lch));
  return rgb.every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);
};

/**
 * Maps an OKLCH color into sRGB by reducing chroma (binary search) while
 * keeping lightness and hue, like CSS Color 4 gamut mapping.
 */
export const gamutMapOklch = (lch: OKLCH): OKLCH => {
  const l = Math.min(1, Math.max(0, lch.l));
  const h = wrapHue(lch.h);
  if (l >= 1) return { l: 1, c: 0, h };
  if (l <= 0) return { l: 0, c: 0, h };
  const target = { l, c: Math.max(0, lch.c), h };
  if (isOklchInGamut(target)) return target;

  let lo = 0;
  let hi = target.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (isOklchInGamut({ l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return { l, c: lo, h };
};

export const oklchToRgb = (lch: OKLCH): RGB => oklabToRgb(oklchToOklab(gamutMapOklch(lch)));

export const oklchToHex = (lch: OKLCH): string => {
  const { r, g, b } = oklchToRgb(lch);
  return rgbToHex(r, g, b);
};

export const oklabToHex = (lab: OKLab): string => oklchToHex(oklabToOklch(lab));

/** Euclidean distance in OKLab (ΔEOK). ~0.02 is a just-noticeable difference. */
export const deltaEOK = (a: OKLab, b: OKLab): number => Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);

const trim = (n: number, digits: number) => parseFloat(n.toFixed(digits)).toString();

/** CSS Color 4 string, e.g. `oklch(62.8% 0.2577 29.23)`. Returns '' for invalid hex. */
export const formatOklch = (input: string | OKLCH, alpha?: number): string => {
  let lch: OKLCH;
  if (typeof input === 'string') {
    if (!isValidHex(input)) return '';
    lch = hexToOklch(input);
  } else {
    lch = input;
  }
  const a = alpha !== undefined && alpha < 1 ? ` / ${trim(Math.max(0, alpha), 3)}` : '';
  return `oklch(${trim(lch.l * 100, 2)}% ${trim(lch.c, 4)} ${trim(lch.h, 2)}${a})`;
};

/** CSS Color 4 string, e.g. `oklab(62.8% 0.2249 0.1258)`. Returns '' for invalid hex. */
export const formatOklab = (input: string | OKLab): string => {
  let lab: OKLab;
  if (typeof input === 'string') {
    if (!isValidHex(input)) return '';
    lab = hexToOklab(input);
  } else {
    lab = input;
  }
  return `oklab(${trim(lab.l * 100, 2)}% ${trim(lab.a, 4)} ${trim(lab.b, 4)})`;
};

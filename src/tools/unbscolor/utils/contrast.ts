// Contrast utilities: WCAG 2.2 contrast ratio and APCA (Lc).

import { hexToRgb, isValidHex, normalizeHex, srgbToLinear } from './colorMath';
import { hexToOklch, oklchToHex } from './oklab';

// ---------------------------------------------------------------------------
// WCAG 2.2
// ---------------------------------------------------------------------------

export const WCAG_THRESHOLDS = {
  aaNormal: 4.5,
  aaLarge: 3,
  aaaNormal: 7,
  aaaLarge: 4.5,
  nonText: 3 // SC 1.4.11 (UI components & graphical objects)
} as const;

export type WcagTextSize = 'normal' | 'large';
export type WcagLevel = 'AAA' | 'AA' | 'Fail';

export interface WcagContrastResult {
  /** Unrounded ratio 1–21. WCAG forbids rounding up before comparing. */
  ratio: number;
  /** Ratio rounded down to 2 decimals, for display. */
  display: string;
  aa: { normal: boolean; large: boolean };
  aaa: { normal: boolean; large: boolean };
  nonText: boolean;
  level: { normal: WcagLevel; large: WcagLevel };
}

/** WCAG relative luminance (0–1). Uses the 0.04045 sRGB threshold (WCAG 2.2 note). */
export const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

/** WCAG contrast ratio (1–21), order-independent. NaN for invalid hex. */
export const contrastRatio = (hexA: string, hexB: string): number => {
  if (!isValidHex(hexA) || !isValidHex(hexB)) return NaN;
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

export const wcagLevelFor = (ratio: number, size: WcagTextSize = 'normal'): WcagLevel => {
  if (!Number.isFinite(ratio)) return 'Fail';
  const aaa = size === 'large' ? WCAG_THRESHOLDS.aaaLarge : WCAG_THRESHOLDS.aaaNormal;
  const aa = size === 'large' ? WCAG_THRESHOLDS.aaLarge : WCAG_THRESHOLDS.aaNormal;
  if (ratio >= aaa) return 'AAA';
  if (ratio >= aa) return 'AA';
  return 'Fail';
};

/** Full WCAG 2.2 report for a foreground/background pair. Null for invalid hex. */
export const getWcagContrast = (foreground: string, background: string): WcagContrastResult | null => {
  const ratio = contrastRatio(foreground, background);
  if (Number.isNaN(ratio)) return null;
  return {
    ratio,
    display: `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`,
    aa: { normal: ratio >= WCAG_THRESHOLDS.aaNormal, large: ratio >= WCAG_THRESHOLDS.aaLarge },
    aaa: { normal: ratio >= WCAG_THRESHOLDS.aaaNormal, large: ratio >= WCAG_THRESHOLDS.aaaLarge },
    nonText: ratio >= WCAG_THRESHOLDS.nonText,
    level: { normal: wcagLevelFor(ratio, 'normal'), large: wcagLevelFor(ratio, 'large') }
  };
};

// ---------------------------------------------------------------------------
// APCA (SAPC-APCA 0.0.98G-4g, W3 constants)
// ---------------------------------------------------------------------------

const APCA = {
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1
} as const;

/** APCA screen luminance (simple 2.4 power curve, as specified by APCA). */
export const apcaLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => Math.pow(c / 255, APCA.mainTRC);
  return APCA.sRco * lin(r) + APCA.sGco * lin(g) + APCA.sBco * lin(b);
};

/**
 * APCA lightness contrast Lc (≈ -108..106). Polarity matters:
 * positive = dark text on light background, negative = light text on dark.
 * NaN for invalid hex.
 */
export const apcaContrast = (textHex: string, backgroundHex: string): number => {
  if (!isValidHex(textHex) || !isValidHex(backgroundHex)) return NaN;

  const softClamp = (y: number) => (y > APCA.blkThrs ? y : y + Math.pow(APCA.blkThrs - y, APCA.blkClmp));
  const txtY = softClamp(apcaLuminance(textHex));
  const bgY = softClamp(apcaLuminance(backgroundHex));

  if (Math.abs(bgY - txtY) < APCA.deltaYmin) return 0;

  let output: number;
  if (bgY > txtY) {
    const sapc = (Math.pow(bgY, APCA.normBG) - Math.pow(txtY, APCA.normTXT)) * APCA.scaleBoW;
    output = sapc < APCA.loClip ? 0 : sapc - APCA.loBoWoffset;
  } else {
    const sapc = (Math.pow(bgY, APCA.revBG) - Math.pow(txtY, APCA.revTXT)) * APCA.scaleWoB;
    output = sapc > -APCA.loClip ? 0 : sapc + APCA.loWoBoffset;
  }
  return output * 100;
};

export type ApcaUsage =
  | 'body-preferred' // |Lc| >= 90
  | 'body' // >= 75
  | 'content' // >= 60
  | 'large-text' // >= 45
  | 'spot-text' // >= 30
  | 'non-text' // >= 15
  | 'fail';

/** Simplified APCA "Bronze" usage bands (guidance only; font size/weight tables are more precise). */
export const apcaUsage = (lc: number): ApcaUsage => {
  const v = Math.abs(lc);
  if (!Number.isFinite(v)) return 'fail';
  if (v >= 90) return 'body-preferred';
  if (v >= 75) return 'body';
  if (v >= 60) return 'content';
  if (v >= 45) return 'large-text';
  if (v >= 30) return 'spot-text';
  if (v >= 15) return 'non-text';
  return 'fail';
};

// ---------------------------------------------------------------------------
// Helpers for the UI
// ---------------------------------------------------------------------------

/** Picks the candidate with the highest contrast against `background`. */
export const bestTextColor = (
  background: string,
  candidates: string[] = ['#000000', '#FFFFFF'],
  method: 'wcag' | 'apca' = 'wcag'
): string => {
  const valid = candidates.filter(isValidHex);
  if (!valid.length || !isValidHex(background)) return valid[0] ?? '#000000';
  const score = (c: string) =>
    method === 'apca' ? Math.abs(apcaContrast(c, background)) : contrastRatio(c, background);
  return valid.reduce((best, c) => (score(c) > score(best) ? c : best), valid[0]);
};

/**
 * Returns the color closest to `foreground` (same OKLCH hue/chroma, only
 * lightness changes) that reaches `targetRatio` against `background`.
 * Returns the input when it already passes, or null when impossible.
 */
export const suggestAccessibleColor = (
  foreground: string,
  background: string,
  targetRatio: number = WCAG_THRESHOLDS.aaNormal
): string | null => {
  if (!isValidHex(foreground) || !isValidHex(background)) return null;
  if (contrastRatio(foreground, background) >= targetRatio) return normalizeHex(foreground);

  const base = hexToOklch(foreground);
  const candidates: string[] = [];

  // Search darker and lighter directions; keep the one with the smallest lightness change.
  for (const direction of [-1, 1] as const) {
    const limit = direction < 0 ? 0 : 1;
    if (contrastRatio(oklchToHex({ ...base, l: limit }), background) < targetRatio) continue;
    let lo = base.l; // fails
    let hi = limit; // passes
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const hex = oklchToHex({ ...base, l: mid });
      if (contrastRatio(hex, background) >= targetRatio) hi = mid;
      else lo = mid;
    }
    candidates.push(oklchToHex({ ...base, l: hi }));
  }

  if (!candidates.length) return null;
  const valid = candidates.filter((c) => contrastRatio(c, background) >= targetRatio);
  if (!valid.length) return null;
  return valid.reduce((best, c) =>
    Math.abs(hexToOklch(c).l - base.l) < Math.abs(hexToOklch(best).l - base.l) ? c : best
  );
};

// Tonal scale (50–950) generated in OKLCH, Tailwind-style.

import { isValidHex, normalizeHex } from './colorMath';
import { OKLCH, gamutMapOklch, hexToOklch, oklchToHex } from './oklab';

export const TONAL_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type TonalStep = (typeof TONAL_STEPS)[number];

/** Default OKLCH lightness per step (modelled on Tailwind v4 chromatic palettes). */
export const DEFAULT_TONAL_LIGHTNESS: readonly number[] = [
  0.97, 0.932, 0.882, 0.809, 0.707, 0.623, 0.546, 0.488, 0.424, 0.379, 0.282
];

/** Chroma multiplier per step, relative to the base color chroma. */
export const DEFAULT_TONAL_CHROMA_CURVE: readonly number[] = [
  0.15, 0.3, 0.5, 0.72, 0.9, 1, 1, 0.92, 0.8, 0.66, 0.5
];

export interface TonalScaleOptions {
  /**
   * Place the input color exactly on the step with the closest lightness and
   * shift neighbours smoothly (default true). Ignored when the base color is
   * too far from every step (see `maxAnchorShift`).
   */
  anchor?: boolean;
  /** Maximum lightness shift allowed for anchoring (default 0.08). */
  maxAnchorShift?: number;
  /** 11 lightness values (0–1), from step 50 to 950, strictly decreasing. */
  lightness?: readonly number[];
  /** 11 chroma multipliers. */
  chromaCurve?: readonly number[];
  /** Degrees of hue rotation applied progressively toward the dark end (e.g. -10 for warmer shadows). */
  hueShift?: number;
}

export interface TonalSwatch {
  step: TonalStep;
  hex: string;
  oklch: OKLCH;
  /** True for the step that holds the exact input color. */
  isBase: boolean;
}

export interface TonalScale {
  base: string;
  anchorStep: TonalStep | null;
  swatches: TonalSwatch[];
}

/**
 * Generates an 11-step tonal scale (50–950) in OKLCH.
 * Returns null for invalid hex.
 */
export const generateTonalScale = (hex: string, options: TonalScaleOptions = {}): TonalScale | null => {
  const base = normalizeHex(hex);
  if (!base || !isValidHex(base)) return null;

  const lightness = options.lightness ?? DEFAULT_TONAL_LIGHTNESS;
  const chromaCurve = options.chromaCurve ?? DEFAULT_TONAL_CHROMA_CURVE;
  if (lightness.length !== TONAL_STEPS.length || chromaCurve.length !== TONAL_STEPS.length) {
    throw new Error(`lightness and chromaCurve must have ${TONAL_STEPS.length} entries`);
  }
  const anchor = options.anchor ?? true;
  const maxAnchorShift = options.maxAnchorShift ?? 0.08;
  const hueShift = options.hueShift ?? 0;

  const baseLch = hexToOklch(base);
  const lastIndex = TONAL_STEPS.length - 1;

  // Closest step by lightness
  let anchorIndex = 0;
  for (let i = 1; i < lightness.length; i++) {
    if (Math.abs(lightness[i] - baseLch.l) < Math.abs(lightness[anchorIndex] - baseLch.l)) anchorIndex = i;
  }
  const delta = baseLch.l - lightness[anchorIndex];
  const useAnchor = anchor && Math.abs(delta) <= maxAnchorShift;
  const maxDist = Math.max(anchorIndex, lastIndex - anchorIndex) || 1;

  // Chroma reference: the curve value at the anchor maps to the base chroma.
  const chromaRef = baseLch.c / (useAnchor ? chromaCurve[anchorIndex] || 1 : 1);

  const swatches: TonalSwatch[] = TONAL_STEPS.map((step, i) => {
    if (useAnchor && i === anchorIndex) {
      return { step, hex: base, oklch: baseLch, isBase: true };
    }
    const weight = useAnchor ? 1 - Math.abs(i - anchorIndex) / maxDist : 0;
    const l = Math.min(1, Math.max(0, lightness[i] + delta * weight));
    const c = chromaRef * chromaCurve[i];
    const h = baseLch.h + hueShift * (i / lastIndex);
    const mapped = gamutMapOklch({ l, c, h });
    return { step, hex: oklchToHex(mapped), oklch: mapped, isBase: false };
  });

  return { base, anchorStep: useAnchor ? TONAL_STEPS[anchorIndex] : null, swatches };
};

/** Convenience: `{ 50: '#…', 100: '#…', … }` (or null for invalid hex). */
export const generateTonalScaleRecord = (
  hex: string,
  options?: TonalScaleOptions
): Record<TonalStep, string> | null => {
  const scale = generateTonalScale(hex, options);
  if (!scale) return null;
  return Object.fromEntries(scale.swatches.map((s) => [s.step, s.hex])) as Record<TonalStep, string>;
};

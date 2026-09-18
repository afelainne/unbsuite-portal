import {
  deltaE2000,
  findReferenceMatches,
  hexToLab,
  hexToRgb,
  hslToRgb,
  normalizeHex,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  wrapHue
} from './colorMath';
import { parseReferenceCode } from './reference';
import type { CMYK, LAB, ReferenceColor } from '../types';

/**
 * The reading the Matcher does out loud: what the colour is, which references
 * sit around it, which siblings are lighter, darker, warmer or cooler, which
 * partners it harmonizes with and how it behaves on press. Pure functions, so
 * the wording lives in the dictionaries and the numbers stay testable.
 */

// --- What this colour is --------------------------------------------------

export type HueFamily =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'magenta'
  | 'pink'
  | 'neutral';

export type Temperature = 'warm' | 'cool' | 'temperate';
export type SaturationBand = 'gray' | 'muted' | 'balanced' | 'vivid';
export type LightnessBand = 'veryDark' | 'dark' | 'medium' | 'light' | 'veryLight';

export interface ColorReading {
  family: HueFamily;
  temperature: Temperature;
  saturation: SaturationBand;
  lightness: LightnessBand;
  /** CIE L*, 0–100. */
  l: number;
  /** Chroma in Lab. */
  chroma: number;
  /** Hue in HSL degrees. */
  hue: number;
}

const HUE_BANDS: { max: number; family: HueFamily }[] = [
  { max: 15, family: 'red' },
  { max: 45, family: 'orange' },
  { max: 65, family: 'yellow' },
  { max: 100, family: 'lime' },
  { max: 160, family: 'green' },
  { max: 190, family: 'teal' },
  { max: 210, family: 'cyan' },
  { max: 250, family: 'blue' },
  { max: 270, family: 'indigo' },
  { max: 290, family: 'violet' },
  { max: 320, family: 'magenta' },
  { max: 345, family: 'pink' },
  { max: 360, family: 'red' }
];

/** Chroma below this reads as a neutral, whatever its hue says. */
const NEUTRAL_CHROMA = 6;

export const hueFamily = (hex: string): HueFamily => {
  const lab = hexToLab(hex);
  if (Math.hypot(lab.a, lab.b) < NEUTRAL_CHROMA) return 'neutral';
  const { h } = rgbToHsl(hexToRgb(hex));
  const hue = wrapHue(h);
  return (HUE_BANDS.find((band) => hue < band.max) || HUE_BANDS[HUE_BANDS.length - 1]).family;
};

/** Reads a colour into the words a designer would use. */
export const readColor = (hex: string): ColorReading => {
  const lab = hexToLab(hex);
  const chroma = Math.hypot(lab.a, lab.b);
  const { h } = rgbToHsl(hexToRgb(hex));
  const warmth = lab.a + lab.b;

  let temperature: Temperature = 'temperate';
  if (chroma >= NEUTRAL_CHROMA) {
    if (warmth > 8) temperature = 'warm';
    else if (warmth < -8) temperature = 'cool';
  }

  let saturation: SaturationBand = 'vivid';
  if (chroma < NEUTRAL_CHROMA) saturation = 'gray';
  else if (chroma < 25) saturation = 'muted';
  else if (chroma < 55) saturation = 'balanced';

  let lightness: LightnessBand = 'veryLight';
  if (lab.l < 15) lightness = 'veryDark';
  else if (lab.l < 35) lightness = 'dark';
  else if (lab.l < 65) lightness = 'medium';
  else if (lab.l < 85) lightness = 'light';

  return {
    family: hueFamily(hex),
    temperature,
    saturation,
    lightness,
    l: Math.round(lab.l * 10) / 10,
    chroma: Math.round(chroma * 10) / 10,
    hue: wrapHue(h)
  };
};

// --- Neighbours in the library -------------------------------------------

export type NeighbourKind = 'lighter' | 'darker' | 'warmer' | 'cooler';

export interface Neighbour {
  kind: NeighbourKind;
  reference: ReferenceColor;
  /** Display code, already free of any brand name. */
  code: string;
  hex: string;
  deltaE: number;
}

const warmthOf = (lab: LAB) => lab.a + lab.b;

/**
 * Picks the sibling that moves along one axis while staying on the same
 * colour: the lighter one drifts as little as possible in hue and chroma,
 * the warmer one as little as possible in lightness.
 */
export const findNeighbours = (
  hex: string,
  library: readonly ReferenceColor[],
  poolSize = 48
): Neighbour[] => {
  const normalized = normalizeHex(hex);
  if (!normalized || !library || library.length === 0) return [];

  const baseLab = hexToLab(normalized);
  const baseWarmth = warmthOf(baseLab);
  const pool = findReferenceMatches(normalized, library as ReferenceColor[], poolSize);

  const candidates = pool
    .filter((match) => (match.reference.hex || '').toUpperCase() !== normalized)
    .map((match) => {
      const lab = match.reference.lab || hexToLab(match.reference.hex);
      return {
        match,
        lab,
        dL: lab.l - baseLab.l,
        dWarmth: warmthOf(lab) - baseWarmth,
        drift: Math.hypot(lab.a - baseLab.a, lab.b - baseLab.b)
      };
    });

  const pick = (kind: NeighbourKind): Neighbour | null => {
    const wantsLight = kind === 'lighter' || kind === 'darker';
    const filtered = candidates.filter((candidate) =>
      kind === 'lighter'
        ? candidate.dL >= 4
        : kind === 'darker'
          ? candidate.dL <= -4
          : kind === 'warmer'
            ? candidate.dWarmth >= 5
            : candidate.dWarmth <= -5
    );
    if (filtered.length === 0) return null;

    const scored = filtered
      .map((candidate) => ({
        candidate,
        // Off-axis drift first, then a preference for a clear but moderate move.
        score: wantsLight
          ? candidate.drift + Math.abs(Math.abs(candidate.dL) - 14) * 0.35
          : Math.abs(candidate.dL) * 0.8 + Math.abs(Math.abs(candidate.dWarmth) - 12) * 0.3
      }))
      .sort((a, b) => a.score - b.score);

    const winner = scored[0].candidate;
    return {
      kind,
      reference: winner.match.reference,
      code: parseReferenceCode(winner.match.reference.code).code,
      hex: (winner.match.reference.hex || '').toUpperCase(),
      deltaE: winner.match.deltaE
    };
  };

  const kinds: NeighbourKind[] = ['lighter', 'darker', 'warmer', 'cooler'];
  return kinds.map(pick).filter((neighbour): neighbour is Neighbour => neighbour !== null);
};

// --- Harmonic partners ----------------------------------------------------

export type HarmonyKind = 'complement' | 'analogousA' | 'analogousB' | 'triadicA' | 'triadicB';

export interface HarmonyPartner {
  kind: HarmonyKind;
  hex: string;
  /** Closest reference to the partner, when a library was given. */
  code: string;
  refHex: string;
  deltaE: number;
}

const HARMONY_ANGLES: { kind: HarmonyKind; angle: number }[] = [
  { kind: 'complement', angle: 180 },
  { kind: 'analogousA', angle: -30 },
  { kind: 'analogousB', angle: 30 },
  { kind: 'triadicA', angle: 120 },
  { kind: 'triadicB', angle: 240 }
];

export const findHarmonyPartners = (hex: string, library: readonly ReferenceColor[]): HarmonyPartner[] => {
  const normalized = normalizeHex(hex);
  if (!normalized) return [];
  const hsl = rgbToHsl(hexToRgb(normalized));

  return HARMONY_ANGLES.map(({ kind, angle }) => {
    const rgb = hslToRgb({ h: wrapHue(hsl.h + angle), s: hsl.s, l: hsl.l });
    const partnerHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const match = library && library.length ? findReferenceMatches(partnerHex, library as ReferenceColor[], 1)[0] : undefined;
    return {
      kind,
      hex: partnerHex,
      code: match ? parseReferenceCode(match.reference.code).code : '',
      refHex: match ? (match.reference.hex || '').toUpperCase() : '',
      deltaE: match ? match.deltaE : Number.POSITIVE_INFINITY
    };
  });
};

// --- Press notes ----------------------------------------------------------

export interface PressNotes {
  cmyk: CMYK;
  /** Sum of the four inks, in percentage points. */
  totalInk: number;
  /** Over the usual 300% limit for coated stock. */
  heavyInk: boolean;
  /** Estimated reach of four-colour process at this hue and lightness. */
  withinProcess: boolean;
  /** How far past the estimated process reach the colour sits, in chroma points. */
  chromaOverflow: number;
}

/**
 * Approximate maximum chroma of four-colour process on coated stock, by Lab
 * hue angle. Coarse on purpose: it answers "will process reach this?", not
 * "what will the press deliver".
 */
const PROCESS_CHROMA_BY_HUE = [
  { hue: 0, chroma: 76 },
  { hue: 30, chroma: 80 },
  { hue: 60, chroma: 86 },
  { hue: 90, chroma: 95 },
  { hue: 120, chroma: 72 },
  { hue: 150, chroma: 60 },
  { hue: 180, chroma: 50 },
  { hue: 210, chroma: 54 },
  { hue: 240, chroma: 60 },
  { hue: 270, chroma: 70 },
  { hue: 300, chroma: 66 },
  { hue: 330, chroma: 72 },
  { hue: 360, chroma: 76 }
];

const maxProcessChroma = (hueDeg: number, l: number): number => {
  const hue = wrapHue(hueDeg);
  const index = Math.min(PROCESS_CHROMA_BY_HUE.length - 2, Math.floor(hue / 30));
  const low = PROCESS_CHROMA_BY_HUE[index];
  const high = PROCESS_CHROMA_BY_HUE[index + 1];
  const ratio = (hue - low.hue) / (high.hue - low.hue || 1);
  const base = low.chroma + (high.chroma - low.chroma) * ratio;
  // The gamut narrows towards black and towards paper white.
  const lightnessFactor = Math.max(0.25, 1 - Math.pow((l - 55) / 55, 2));
  return base * lightnessFactor;
};

export const readPress = (hex: string): PressNotes => {
  const rgb = hexToRgb(hex);
  const cmyk = rgbToCmyk(rgb);
  const lab = hexToLab(hex);
  const chroma = Math.hypot(lab.a, lab.b);
  const hueDeg = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  const reach = maxProcessChroma(hueDeg, lab.l);
  const totalInk = cmyk.c + cmyk.m + cmyk.y + cmyk.k;

  return {
    cmyk,
    totalInk,
    heavyInk: totalInk > 300,
    withinProcess: chroma <= reach,
    chromaOverflow: Math.max(0, Math.round((chroma - reach) * 10) / 10)
  };
};

/** ΔE between two hexes, for the side-by-side comparison. */
export const deltaBetween = (a: string, b: string): number => deltaE2000(hexToLab(a), hexToLab(b));

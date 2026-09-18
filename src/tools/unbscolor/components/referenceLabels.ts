import type { Translations } from '../i18n';
import type { NameModifierLabels } from '../utils/colorNames';
import type { DeltaVerdict } from '../utils/reference';
import type {
  HarmonyKind,
  HueFamily,
  LightnessBand,
  NeighbourKind,
  SaturationBand,
  Temperature
} from '../utils/discoveries';

/**
 * The bridge between the pure logic and the dictionaries: every key the
 * reading produces gets its wording here, in one place, for all three
 * languages. No brand name is ever part of this wording.
 */

const FINISH_KEYS: Record<string, keyof Translations> = {
  C: 'finishCoated',
  U: 'finishUncoated',
  CP: 'finishProcessCoated',
  UP: 'finishProcessUncoated'
};

export const finishLabelOf = (t: Translations, finish: string): string => {
  const key = FINISH_KEYS[finish.toUpperCase()];
  return key ? t[key] : `${t.finishLabel} ${finish}`;
};

const VERDICT_KEYS: Record<DeltaVerdict, keyof Translations> = {
  imperceptible: 'deltaImperceptible',
  subtle: 'deltaSubtle',
  close: 'deltaClose',
  visible: 'deltaVisible',
  different: 'deltaDifferent'
};

export const verdictLabel = (t: Translations, verdict: DeltaVerdict): string => t[VERDICT_KEYS[verdict]];

const FAMILY_KEYS: Record<HueFamily, keyof Translations> = {
  red: 'familyRed',
  orange: 'familyOrange',
  yellow: 'familyYellow',
  lime: 'familyLime',
  green: 'familyGreen',
  teal: 'familyTeal',
  cyan: 'familyCyan',
  blue: 'familyBlue',
  indigo: 'familyIndigo',
  violet: 'familyViolet',
  magenta: 'familyMagenta',
  pink: 'familyPink',
  neutral: 'familyNeutral'
};

export const familyLabel = (t: Translations, family: HueFamily): string => t[FAMILY_KEYS[family]];

const TEMPERATURE_KEYS: Record<Temperature, keyof Translations> = {
  warm: 'tempWarm',
  cool: 'tempCool',
  temperate: 'tempTemperate'
};

export const temperatureLabel = (t: Translations, temperature: Temperature): string => t[TEMPERATURE_KEYS[temperature]];

const SATURATION_KEYS: Record<SaturationBand, keyof Translations> = {
  gray: 'satGray',
  muted: 'satMuted',
  balanced: 'satBalanced',
  vivid: 'satVivid'
};

export const saturationLabel = (t: Translations, band: SaturationBand): string => t[SATURATION_KEYS[band]];

const LIGHTNESS_KEYS: Record<LightnessBand, keyof Translations> = {
  veryDark: 'lightVeryDark',
  dark: 'lightDark',
  medium: 'lightMedium',
  light: 'lightLight',
  veryLight: 'lightVeryLight'
};

export const lightnessLabel = (t: Translations, band: LightnessBand): string => t[LIGHTNESS_KEYS[band]];

const NEIGHBOUR_KEYS: Record<NeighbourKind, keyof Translations> = {
  lighter: 'neighbourLighter',
  darker: 'neighbourDarker',
  warmer: 'neighbourWarmer',
  cooler: 'neighbourCooler'
};

export const neighbourLabel = (t: Translations, kind: NeighbourKind): string => t[NEIGHBOUR_KEYS[kind]];

const HARMONY_KEYS: Record<HarmonyKind, keyof Translations> = {
  complement: 'harmonyComplement',
  analogousA: 'harmonyAnalogousA',
  analogousB: 'harmonyAnalogousB',
  triadicA: 'harmonyTriadicA',
  triadicB: 'harmonyTriadicB'
};

export const harmonyLabel = (t: Translations, kind: HarmonyKind): string => t[HARMONY_KEYS[kind]];

export const modifierLabels = (t: Translations): NameModifierLabels => ({
  lighter: t.nameModLighter,
  darker: t.nameModDarker,
  warmer: t.nameModWarmer,
  cooler: t.nameModCooler,
  vivid: t.nameModVivid,
  muted: t.nameModMuted
});

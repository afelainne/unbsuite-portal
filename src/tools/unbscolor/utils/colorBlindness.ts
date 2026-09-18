// Color vision deficiency simulation using Machado, Oliveira & Fernandes (2009),
// "A Physiologically-based Model for Simulation of Color Vision Deficiency".
// Matrices are applied in linear sRGB.

import type { RGB } from '../types';
import { hexToRgb, isValidHex, linearToSrgb, rgbToHex, srgbToLinear, clamp } from './colorMath';

export type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number]
];

/** Machado 2009, severity 1.0 (dichromacy). */
export const MACHADO_2009_MATRICES: Record<'protanopia' | 'deuteranopia' | 'tritanopia', Matrix3> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998]
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881]
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039]
  ]
};

const IDENTITY: Matrix3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];

/** Achromatopsia (rod monochromacy) approximated by linear luminance. */
const ACHROMATOPSIA: Matrix3 = [
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722]
];

const matrixFor = (type: ColorBlindnessType, severity: number): Matrix3 => {
  const full = type === 'achromatopsia' ? ACHROMATOPSIA : MACHADO_2009_MATRICES[type];
  const s = clamp(severity, 0, 1);
  if (s === 1) return full;
  // Anomalous trichromacy approximated by interpolating from identity.
  return full.map((row, i) => row.map((v, j) => IDENTITY[i][j] * (1 - s) + v * s)) as unknown as Matrix3;
};

/**
 * Simulates how `rgb` is perceived with the given deficiency.
 * @param severity 0 (normal vision) to 1 (full dichromacy). Values between are an approximation.
 */
export const simulateColorBlindnessRgb = (rgb: RGB, type: ColorBlindnessType, severity: number = 1): RGB => {
  const m = matrixFor(type, severity);
  const lin = [srgbToLinear(rgb.r), srgbToLinear(rgb.g), srgbToLinear(rgb.b)];
  const out = m.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
  const enc = (v: number) => Math.round(linearToSrgb(clamp(v, 0, 1)) * 255);
  return { r: enc(out[0]), g: enc(out[1]), b: enc(out[2]) };
};

/** Hex in, hex out. Returns null for invalid hex. */
export const simulateColorBlindness = (hex: string, type: ColorBlindnessType, severity: number = 1): string | null => {
  if (!isValidHex(hex)) return null;
  const { r, g, b } = simulateColorBlindnessRgb(hexToRgb(hex), type, severity);
  return rgbToHex(r, g, b);
};

export const COLOR_BLINDNESS_TYPES: ColorBlindnessType[] = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];

/** Simulates a whole palette for every deficiency type. Invalid entries are kept as-is. */
export const simulatePalette = (
  hexes: string[],
  types: ColorBlindnessType[] = COLOR_BLINDNESS_TYPES,
  severity: number = 1
): Record<ColorBlindnessType, string[]> => {
  const result = {} as Record<ColorBlindnessType, string[]>;
  for (const type of types) {
    result[type] = hexes.map((h) => simulateColorBlindness(h, type, severity) ?? h);
  }
  return result;
};

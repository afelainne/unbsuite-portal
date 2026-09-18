
import { RGB, CMYK, HSL, HSV, LAB, ReferenceColor, ColorMatch, HarmonyColor } from '../types';
import { NAMED_COLORS } from '../constants';

// --- Numeric helpers ---

/** Clamps to [min, max]; NaN/undefined become `min`. */
export const clamp = (value: number, min: number, max: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

/** Wraps any angle (negative, >= 360) into [0, 360). */
export const wrapHue = (h: number): number => {
  if (typeof h !== 'number' || !Number.isFinite(h)) return 0;
  const wrapped = ((h % 360) + 360) % 360;
  // -0 and floating 360 edge cases
  return wrapped === 360 ? 0 : wrapped + 0;
};

const clampByte = (v: number) => Math.round(clamp(v, 0, 255));

// --- HEX Helpers ---

const HEX_RE = /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/;

export const isValidHex = (hex: string): boolean => {
  return typeof hex === 'string' && HEX_RE.test(hex);
};

/**
 * Normalizes any accepted hex input ("abc", "#abc", " #aabbcc ") to "#AABBCC".
 * Returns null when the input is not a valid 3/6-digit hex.
 */
export const normalizeHex = (hex: string): string | null => {
  if (typeof hex !== 'string') return null;
  const trimmed = hex.trim();
  if (!HEX_RE.test(trimmed)) return null;
  let clean = trimmed.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  return `#${clean.toUpperCase()}`;
};

export const hexToRgb = (hex: string): RGB => {
  const normalized = normalizeHex(hex);
  if (!normalized) return { r: 0, g: 0, b: 0 };
  const bigint = parseInt(normalized.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
};

/** Channels are rounded and clamped to 0–255 (NaN -> 0) so the output is always a valid #RRGGBB. */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + ((1 << 24) + (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b)).toString(16).slice(1).toUpperCase();
};

// --- Color Manipulation Helpers ---

export const mixColors = (color1: RGB, color2: RGB, weight: number): RGB => {
  // weight = percentage (0–100) of color2 in the mix
  const w1 = clamp(weight, 0, 100) / 100;
  const w2 = 1 - w1;

  return {
    r: Math.round(color1.r * w2 + color2.r * w1),
    g: Math.round(color1.g * w2 + color2.g * w1),
    b: Math.round(color1.b * w2 + color2.b * w1)
  };
};

export const adjustHue = (rgb: RGB, degree: number): RGB => {
  const hsl = rgbToHsl(rgb);
  return hslToRgb({ ...hsl, h: wrapHue(hsl.h + degree) });
};

export const adjustSaturation = (rgb: RGB, amount: number): RGB => {
  // amount is a delta in percentage points (e.g. -10 or +10)
  const hsl = rgbToHsl(rgb);
  return hslToRgb({ ...hsl, s: clamp(hsl.s + amount, 0, 100) });
};

// --- Color Space Conversions ---

export const rgbToCmyk = ({ r, g, b }: RGB): CMYK => {
  const rNorm = clamp(r, 0, 255) / 255;
  const gNorm = clamp(g, 0, 255) / 255;
  const bNorm = clamp(b, 0, 255) / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);

  // Pure black: avoid division by zero (1 - k === 0)
  if (1 - k < 1e-9) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

// Inverse CMYK to RGB (naive, device-independent)
export const cmykToRgb = ({ c, m, y, k }: CMYK): RGB => {
  const cc = clamp(c, 0, 100) / 100;
  const mm = clamp(m, 0, 100) / 100;
  const yy = clamp(y, 0, 100) / 100;
  const kk = clamp(k, 0, 100) / 100;
  return {
    r: Math.round(255 * (1 - cc) * (1 - kk)),
    g: Math.round(255 * (1 - mm) * (1 - kk)),
    b: Math.round(255 * (1 - yy) * (1 - kk))
  };
};

const rgbHue = (rN: number, gN: number, bN: number, max: number, d: number): number => {
  let h: number;
  if (max === rN) h = (gN - bN) / d + (gN < bN ? 6 : 0);
  else if (max === gN) h = (bN - rN) / d + 2;
  else h = (rN - gN) / d + 4;
  // Rounding can produce 360 (e.g. rgb(255,0,1) -> 359.76); keep hue in [0, 360)
  return Math.round(h * 60) % 360;
};

export const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rNorm = clamp(r, 0, 255) / 255;
  const gNorm = clamp(g, 0, 255) / 255;
  const bNorm = clamp(b, 0, 255) / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = rgbHue(rNorm, gNorm, bNorm, max, d);
  }

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

export const rgbToHsv = ({ r, g, b }: RGB): HSV => {
  const rNorm = clamp(r, 0, 255) / 255;
  const gNorm = clamp(g, 0, 255) / 255;
  const bNorm = clamp(b, 0, 255) / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;

  const s = max === 0 ? 0 : d / max;
  const h = max !== min ? rgbHue(rNorm, gNorm, bNorm, max, d) : 0;

  return {
    h,
    s: Math.round(s * 100),
    v: Math.round(max * 100)
  };
};

// Inverse HSL to RGB. Hue is wrapped (negative / >= 360 accepted), s/l clamped to 0–100.
export const hslToRgb = ({ h, s, l }: HSL): RGB => {
  const hh = wrapHue(h);
  const sNorm = clamp(s, 0, 100) / 100;
  const lNorm = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  };
};

// Inverse HSV (HSB) to RGB.
export const hsvToRgb = ({ h, s, v }: HSV): RGB => {
  const hh = wrapHue(h);
  const sN = clamp(s, 0, 100) / 100;
  const vN = clamp(v, 0, 100) / 100;
  const f = (n: number) => {
    const k = (n + hh / 60) % 6;
    return vN - vN * sN * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255)
  };
};

// --- sRGB <-> CIE XYZ <-> CIE L*a*b* ---
// Everything here is D65 / 2° observer end-to-end (sRGB matrix and Lab white point
// share the same illuminant, so no chromatic adaptation is needed). Reference
// libraries are converted with the same functions, so ΔE is self-consistent.

const D65 = { x: 95.047, y: 100.0, z: 108.883 };
const LAB_EPSILON = 216 / 24389; // 0.008856...
const LAB_KAPPA = 24389 / 27; // 903.296...

export const srgbToLinear = (channel255: number): number => {
  const c = clamp(channel255, 0, 255) / 255;
  return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
};

/** Linear [0..1] -> gamma-encoded [0..1] (not clamped). */
export const linearToSrgb = (c: number): number => {
  return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;
};

const rgbToXyz = ({ r, g, b }: RGB) => {
  const rL = srgbToLinear(r) * 100;
  const gL = srgbToLinear(g) * 100;
  const bL = srgbToLinear(b) * 100;

  // Observer = 2°, Illuminant = D65
  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;

  return { x, y, z };
};

const labF = (t: number) => (t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116);

const xyzToLab = ({ x, y, z }: { x: number; y: number; z: number }): LAB => {
  const fx = labF(x / D65.x);
  const fy = labF(y / D65.y);
  const fz = labF(z / D65.z);

  return {
    l: parseFloat((116 * fy - 16).toFixed(2)),
    a: parseFloat((500 * (fx - fy)).toFixed(2)),
    b: parseFloat((200 * (fy - fz)).toFixed(2))
  };
};

export const rgbToLab = (rgb: RGB): LAB => xyzToLab(rgbToXyz(rgb));

export const hexToLab = (hex: string): LAB => rgbToLab(hexToRgb(hex));

const labToXyz = ({ l, a, b }: LAB) => {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const fx3 = fx * fx * fx;
  const fz3 = fz * fz * fz;

  const xr = fx3 > LAB_EPSILON ? fx3 : (116 * fx - 16) / LAB_KAPPA;
  const yr = l > LAB_KAPPA * LAB_EPSILON ? fy * fy * fy : l / LAB_KAPPA;
  const zr = fz3 > LAB_EPSILON ? fz3 : (116 * fz - 16) / LAB_KAPPA;

  return { x: xr * D65.x, y: yr * D65.y, z: zr * D65.z };
};

const xyzToRgb = ({ x, y, z }: { x: number; y: number; z: number }): RGB => {
  const xN = x / 100;
  const yN = y / 100;
  const zN = z / 100;

  const r = linearToSrgb(xN * 3.2406 + yN * -1.5372 + zN * -0.4986);
  const g = linearToSrgb(xN * -0.9689 + yN * 1.8758 + zN * 0.0415);
  const b = linearToSrgb(xN * 0.0557 + yN * -0.204 + zN * 1.057);

  return {
    r: Math.round(clamp(r, 0, 1) * 255),
    g: Math.round(clamp(g, 0, 1) * 255),
    b: Math.round(clamp(b, 0, 1) * 255)
  };
};

export const labToRgb = (lab: LAB): RGB => xyzToRgb(labToXyz(lab));

export const labToHex = (lab: LAB): string => {
  const rgb = labToRgb(lab);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
};

// --- Delta E 2000 ---
// Implementation follows Sharma, Wu & Dalal (2005), including the zero-chroma
// and hue-average edge cases. Verified against the 34 published test pairs.

const degToRad = (deg: number) => (deg * Math.PI) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;
const POW25_7 = Math.pow(25, 7);

export const deltaE2000 = (lab1: LAB, lab2: LAB, kL = 1, kC = 1, kH = 1): number => {
  const { l: L1, a: a1, b: b1 } = lab1;
  const { l: L2, a: a2, b: b2 } = lab2;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const avgC7 = Math.pow((C1 + C2) / 2, 7);
  const G = 0.5 * (1 - Math.sqrt(avgC7 / (avgC7 + POW25_7)));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const hueOf = (b: number, ap: number) => {
    if (b === 0 && ap === 0) return 0;
    const h = radToDeg(Math.atan2(b, ap));
    return h < 0 ? h + 360 : h;
  };
  const h1p = hueOf(b1, a1p);
  const h2p = hueOf(b2, a2p);

  const chromaProduct = C1p * C2p;

  let dhp = 0;
  if (chromaProduct !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  const dHp = 2 * Math.sqrt(chromaProduct) * Math.sin(degToRad(dhp / 2));

  const avgLp = (L1 + L2) / 2;
  const avgCp = (C1p + C2p) / 2;

  let avgHp: number;
  if (chromaProduct === 0) {
    avgHp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    avgHp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    avgHp = (h1p + h2p + 360) / 2;
  } else {
    avgHp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(degToRad(avgHp - 30)) +
    0.24 * Math.cos(degToRad(2 * avgHp)) +
    0.32 * Math.cos(degToRad(3 * avgHp + 6)) -
    0.2 * Math.cos(degToRad(4 * avgHp - 63));

  const lMinus50Sq = Math.pow(avgLp - 50, 2);
  const Sl = 1 + (0.015 * lMinus50Sq) / Math.sqrt(20 + lMinus50Sq);
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const avgCp7 = Math.pow(avgCp, 7);
  const Rc = 2 * Math.sqrt(avgCp7 / (avgCp7 + POW25_7));
  const Rt = -Rc * Math.sin(degToRad(2 * deltaTheta));

  const tL = dLp / (kL * Sl);
  const tC = dCp / (kC * Sc);
  const tH = dHp / (kH * Sh);

  return Math.sqrt(tL * tL + tC * tC + tH * tH + Rt * tC * tH);
};

const calculateDeltaE = (lab1: LAB, lab2: LAB): number => deltaE2000(lab1, lab2);

// --- Matching Logic ---

// Libraries are large static arrays; cache derived data per array instance.
const enrichedLibraryCache = new WeakMap<ReferenceColor[], ReferenceColor[]>();
const libraryLabCache = new WeakMap<ReferenceColor[], LAB[]>();
const matchResultCache = new WeakMap<ReferenceColor[], Map<string, ColorMatch[]>>();
const MATCH_CACHE_LIMIT = 500;

// Pre-calculates LAB values. Returns the same array instance for the same input,
// so callers using it as a memo dependency don't re-render needlessly.
export const enrichLibraryWithLab = (library: ReferenceColor[]): ReferenceColor[] => {
  const cached = enrichedLibraryCache.get(library);
  if (cached) return cached;
  const enriched = library.map((p) => (p.lab ? p : { ...p, lab: hexToLab(p.hex) }));
  enrichedLibraryCache.set(library, enriched);
  enrichedLibraryCache.set(enriched, enriched);
  return enriched;
};

const getLibraryLabs = (library: ReferenceColor[]): LAB[] => {
  let labs = libraryLabCache.get(library);
  if (!labs || labs.length !== library.length) {
    labs = library.map((p) => p.lab || hexToLab(p.hex));
    libraryLabCache.set(library, labs);
  }
  return labs;
};

/** Clears memoized match results (e.g. after mutating a library array in place). */
export const clearMatchCache = (library?: ReferenceColor[]) => {
  if (library) {
    matchResultCache.delete(library);
    libraryLabCache.delete(library);
    enrichedLibraryCache.delete(library);
  }
};

const computeReferenceMatches = (targetHex: string, library: ReferenceColor[], count: number): ColorMatch[] => {
  const targetLab = hexToLab(targetHex);
  const targetC = Math.hypot(targetLab.a, targetLab.b);
  const targetHueRad = Math.atan2(targetLab.b, targetLab.a);
  const labs = getLibraryLabs(library);

  // Initial pass: ΔE2000 on the whole library
  const candidates = library.map((reference, i) => ({
    reference,
    pLab: labs[i],
    dist: calculateDeltaE(targetLab, labs[i])
  }));

  // Sort by raw ΔE and take the top pool to rerank
  candidates.sort((a, b) => a.dist - b.dist);
  const topPool = candidates.slice(0, Math.max(count * 3, 12));

  // Composite perceptual score: ΔE2000 + hue penalty + asymmetric chroma penalty
  const scored = topPool.map(({ reference, pLab, dist }) => {
    const refC = Math.hypot(pLab.a, pLab.b);
    const refHueRad = Math.atan2(pLab.b, pLab.a);
    let dHue = Math.abs(targetHueRad - refHueRad);
    if (dHue > Math.PI) dHue = 2 * Math.PI - dHue;
    const dHueDeg = (dHue * 180) / Math.PI;

    // Hue penalty only matters when target (and reference) are reasonably saturated
    const hueWeight = Math.min(1, targetC / 25, refC / 25);
    const huePenalty = (dHueDeg / 60) * hueWeight * 1.5;

    // Asymmetric chroma: penalize losing saturation more than gaining
    const dC = refC - targetC;
    const chromaPenalty = dC < 0 ? Math.abs(dC) * 0.04 : Math.abs(dC) * 0.015;

    // Lightness gating: if |ΔL| > 15, penalize heavily
    const dL = Math.abs(targetLab.l - pLab.l);
    const lightPenalty = dL > 15 ? (dL - 15) * 0.5 : 0;

    const score = dist * 0.85 + huePenalty + chromaPenalty + lightPenalty;

    let ranking: ColorMatch['ranking'] = 'Similar';
    if (dist < 1.0) ranking = 'Exact';
    else if (dist < 2.3) ranking = 'Very Close';
    else if (dist < 4.5) ranking = 'Close';

    return { reference, deltaE: dist, ranking, score };
  });

  scored.sort((a, b) => a.score - b.score);

  return scored.slice(0, count).map(({ reference, deltaE, ranking }) => ({ reference, deltaE, ranking }));
};

/**
 * Finds the closest references (ΔE2000 + perceptual rerank). Results are memoized
 * per library instance and normalized hex, so repeated renders are O(1).
 */
export const findReferenceMatches = (targetHex: string, library: ReferenceColor[] = [], count: number = 5): ColorMatch[] => {
  const normalized = normalizeHex(targetHex);
  if (!normalized || !library || library.length === 0 || count <= 0) return [];

  let perLibrary = matchResultCache.get(library);
  if (!perLibrary) {
    perLibrary = new Map();
    matchResultCache.set(library, perLibrary);
  }

  const key = `${normalized}|${count}|${library.length}`;
  const hit = perLibrary.get(key);
  if (hit) {
    // refresh LRU position
    perLibrary.delete(key);
    perLibrary.set(key, hit);
    return hit.slice();
  }

  const result = computeReferenceMatches(normalized, library, count);
  perLibrary.set(key, result);
  if (perLibrary.size > MATCH_CACHE_LIMIT) {
    const oldest = perLibrary.keys().next().value;
    if (oldest !== undefined) perLibrary.delete(oldest);
  }
  return result.slice();
};

// --- Color Naming System ---

let namedColorLabs: { name: string; lab: LAB }[] | null = null;
const colorNameCache = new Map<string, string>();
const NAME_CACHE_LIMIT = 2000;

export const getClosestColorName = (hex: string): string => {
  const normalized = normalizeHex(hex);
  if (!normalized) return 'Custom Color';

  const cached = colorNameCache.get(normalized);
  if (cached) return cached;

  if (!namedColorLabs) {
    namedColorLabs = NAMED_COLORS.map((c) => ({ name: c.name, lab: hexToLab(c.hex) }));
  }

  const targetLab = hexToLab(normalized);
  let minDistance = Infinity;
  let closestName = 'Custom Color';

  for (const color of namedColorLabs) {
    const dist = calculateDeltaE(targetLab, color.lab);
    if (dist < minDistance) {
      minDistance = dist;
      closestName = color.name;
    }
  }

  if (colorNameCache.size >= NAME_CACHE_LIMIT) colorNameCache.clear();
  colorNameCache.set(normalized, closestName);
  return closestName;
};

// --- Harmonies & Contrast ---

export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  // YIQ equation
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
};

export const generateHarmonies = (baseHex: string): HarmonyColor[] => {
  if (!isValidHex(baseHex)) return [];

  const baseRgb = hexToRgb(baseHex);
  const baseHsl = rgbToHsl(baseRgb);

  const harmonies: HarmonyColor[] = [];

  const add = (h: number, s: number, l: number, type: string) => {
    const rgb = hslToRgb({ h: wrapHue(h), s: clamp(s, 0, 100), l: clamp(l, 0, 100) });
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    harmonies.push({ hex, name: getClosestColorName(hex), type });
  };

  add(baseHsl.h, baseHsl.s, baseHsl.l, 'Base');
  add(baseHsl.h - 30, baseHsl.s, baseHsl.l, 'Analogous');
  add(baseHsl.h + 30, baseHsl.s, baseHsl.l, 'Analogous');
  add(baseHsl.h + 180, baseHsl.s, baseHsl.l, 'Complement');
  add(baseHsl.h + 150, baseHsl.s, baseHsl.l, 'Split');
  add(baseHsl.h + 210, baseHsl.s, baseHsl.l, 'Split');
  add(baseHsl.h + 120, baseHsl.s, baseHsl.l, 'Triadic');

  return harmonies;
};

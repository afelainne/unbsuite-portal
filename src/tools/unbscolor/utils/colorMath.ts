
import { RGB, CMYK, HSL, HSV, LAB, ReferenceColor, ColorMatch, HarmonyColor } from '../types';
import { DEFAULT_LIBRARY, NAMED_COLORS } from '../constants';

// --- HEX Helpers ---

export const hexToRgb = (hex: string): RGB => {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

export const isValidHex = (hex: string): boolean => {
  return /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex);
};

// --- Color Manipulation Helpers (New) ---

export const mixColors = (color1: RGB, color2: RGB, weight: number): RGB => {
  const p = weight / 100;
  const w = 2 * p - 1;
  const a = 0; // Alpha support omitted for simplicity
  
  const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
  const w2 = 1 - w1;

  return {
    r: Math.round(color1.r * w2 + color2.r * w1),
    g: Math.round(color1.g * w2 + color2.g * w1),
    b: Math.round(color1.b * w2 + color2.b * w1)
  };
};

export const adjustHue = (rgb: RGB, degree: number): RGB => {
  const hsl = rgbToHsl(rgb);
  hsl.h = (hsl.h + degree) % 360;
  if (hsl.h < 0) hsl.h += 360;
  return hslToRgb(hsl);
};

export const adjustSaturation = (rgb: RGB, amount: number): RGB => {
    // amount is delta percentage (e.g. -10 or +10)
    // or we can treat it as a factor relative to current.
    // For this specific app requirement, let's treat it as setting/scaling logic handled by caller or simple addition
    const hsl = rgbToHsl(rgb);
    // Simple addition logic for the palette builder
    let newSat = hsl.s + amount;
    newSat = Math.max(0, Math.min(100, newSat));
    return hslToRgb({ ...hsl, s: newSat });
};

// --- Color Space Conversions ---

export const rgbToCmyk = ({ r, g, b }: RGB): CMYK => {
  let c = 0, m = 0, y = 0, k = 0;
  
  // Normalize RGB to 0-1
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  k = 1 - Math.max(rNorm, gNorm, bNorm);

  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  c = (1 - rNorm - k) / (1 - k);
  m = (1 - gNorm - k) / (1 - k);
  y = (1 - bNorm - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

// Inverse CMYK to RGB
export const cmykToRgb = ({ c, m, y, k }: CMYK): RGB => {
  const r = 255 * (1 - c / 100) * (1 - k / 100);
  const g = 255 * (1 - m / 100) * (1 - k / 100);
  const b = 255 * (1 - y / 100) * (1 - k / 100);
  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b)
  };
};

export const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

export const rgbToHsv = ({ r, g, b }: RGB): HSV => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
};

// Inverse HSL to RGB
export const hslToRgb = ({ h, s, l }: HSL): RGB => {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  };
};

// RGB to LAB requires RGB -> XYZ -> LAB
const rgbToXyz = ({ r, g, b }: RGB) => {
  let rL = r / 255;
  let gL = g / 255;
  let bL = b / 255;

  rL = rL > 0.04045 ? Math.pow((rL + 0.055) / 1.055, 2.4) : rL / 12.92;
  gL = gL > 0.04045 ? Math.pow((gL + 0.055) / 1.055, 2.4) : gL / 12.92;
  bL = bL > 0.04045 ? Math.pow((bL + 0.055) / 1.055, 2.4) : bL / 12.92;

  rL *= 100;
  gL *= 100;
  bL *= 100;

  // Observer. = 2°, Illuminant = D65
  const x = rL * 0.4124 + gL * 0.3576 + bL * 0.1805;
  const y = rL * 0.2126 + gL * 0.7152 + bL * 0.0722;
  const z = rL * 0.0193 + gL * 0.1192 + bL * 0.9505;

  return { x, y, z };
};

const xyzToLab = ({ x, y, z }: { x: number, y: number, z: number }): LAB => {
  // D65 Standard
  let xN = x / 95.047;
  let yN = y / 100.000;
  let zN = z / 108.883;

  xN = xN > 0.008856 ? Math.pow(xN, 1/3) : (7.787 * xN) + (16/116);
  yN = yN > 0.008856 ? Math.pow(yN, 1/3) : (7.787 * yN) + (16/116);
  zN = zN > 0.008856 ? Math.pow(zN, 1/3) : (7.787 * zN) + (16/116);

  return {
    l: parseFloat(((116 * yN) - 16).toFixed(2)),
    a: parseFloat((500 * (xN - yN)).toFixed(2)),
    b: parseFloat((200 * (yN - zN)).toFixed(2))
  };
};

export const hexToLab = (hex: string): LAB => {
  const rgb = hexToRgb(hex);
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
};

// --- LAB -> RGB Inverse for ACB Parser ---

const labToXyz = ({ l, a, b }: LAB) => {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const x3 = x * x * x;
  const y3 = y * y * y;
  const z3 = z * z * z;

  x = (x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787) * 95.047;
  y = (y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787) * 100.000;
  z = (z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787) * 108.883;

  return { x, y, z };
};

const xyzToRgb = ({ x, y, z }: { x: number, y: number, z: number }): RGB => {
  let xN = x / 100;
  let yN = y / 100;
  let zN = z / 100;

  let r = xN * 3.2406 + yN * -1.5372 + zN * -0.4986;
  let g = xN * -0.9689 + yN * 1.8758 + zN * 0.0415;
  let b = xN * 0.0557 + yN * -0.2040 + zN * 1.0570;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

  return {
    r: Math.round(Math.max(0, Math.min(1, r)) * 255),
    g: Math.round(Math.max(0, Math.min(1, g)) * 255),
    b: Math.round(Math.max(0, Math.min(1, b)) * 255)
  };
};

export const labToHex = (lab: LAB): string => {
  const xyz = labToXyz(lab);
  const rgb = xyzToRgb(xyz);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
};

// --- Delta E 2000 (Robust Professional Standard) ---
// Replaces previous CIE76 implementation for high-accuracy matching

const degToRad = (deg: number) => (deg * Math.PI) / 180;
const radToDeg = (rad: number) => (rad * 180) / Math.PI;

const calculateDeltaE = (lab1: LAB, lab2: LAB): number => {
  // CIE 2000 Algorithm
  const L1 = lab1.l;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const L2 = lab2.l;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const avgL = (L1 + L2) / 2;
  const C1 = Math.sqrt(Math.pow(a1, 2) + Math.pow(b1, 2));
  const C2 = Math.sqrt(Math.pow(a2, 2) + Math.pow(b2, 2));
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));

  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.sqrt(Math.pow(a1p, 2) + Math.pow(b1, 2));
  const C2p = Math.sqrt(Math.pow(a2p, 2) + Math.pow(b2, 2));

  const avgCp = (C1p + C2p) / 2;

  let h1p = radToDeg(Math.atan2(b1, a1p));
  if (h1p < 0) h1p += 360;

  let h2p = radToDeg(Math.atan2(b2, a2p));
  if (h2p < 0) h2p += 360;

  const avgHp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;

  const T = 1 - 0.17 * Math.cos(degToRad(avgHp - 30)) + 0.24 * Math.cos(degToRad(2 * avgHp)) + 0.32 * Math.cos(degToRad(3 * avgHp + 6)) - 0.20 * Math.cos(degToRad(4 * avgHp - 63));

  let deltaHp = h2p - h1p;
  if (Math.abs(deltaHp) > 180) {
    if (h2p <= h1p) deltaHp += 360;
    else deltaHp -= 360;
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHpVal = 2 * Math.sqrt(C1p * C2p) * Math.sin(degToRad(deltaHp / 2));

  const Sl = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const Rt = -Rc * Math.sin(degToRad(2 * deltaTheta));

  const KL = 1;
  const KC = 1;
  const KH = 1;

  const deltaE = Math.sqrt(
    Math.pow(deltaLp / (KL * Sl), 2) +
    Math.pow(deltaCp / (KC * Sc), 2) +
    Math.pow(deltaHpVal / (KH * Sh), 2) +
    Rt * (deltaCp / (KC * Sc)) * (deltaHpVal / (KH * Sh))
  );

  return deltaE;
};

// --- Matching Logic ---

// Helper to Pre-calculate LAB values for efficiency
export const enrichLibraryWithLab = (library: ReferenceColor[]): ReferenceColor[] => {
    return library.map(p => {
        if (p.lab) return p; // Already cached
        return { ...p, lab: hexToLab(p.hex) };
    });
};

export const findReferenceMatches = (targetHex: string, library: ReferenceColor[] = DEFAULT_LIBRARY, count: number = 5): ColorMatch[] => {
  if (!isValidHex(targetHex)) return [];

  const targetLab = hexToLab(targetHex);

  const matches = library.map(reference => {
    // We compare against cached Lab if available (Optimization)
    const pLab = reference.lab || hexToLab(reference.hex);
    
    // Uses CIE2000 for robust accuracy
    const dist = calculateDeltaE(targetLab, pLab);
    
    // Refined Ranking Logic for Perfection
    let ranking: ColorMatch['ranking'] = 'Similar';
    if (dist < 1.0) ranking = 'Exact'; // Imperceptible difference
    else if (dist < 2.0) ranking = 'Very Close'; // Very hard to tell apart
    else if (dist < 4.0) ranking = 'Close'; // Noticeable but acceptable
    else ranking = 'Similar';

    return {
      reference,
      deltaE: dist,
      ranking
    };
  });

  matches.sort((a, b) => a.deltaE - b.deltaE);

  return matches.slice(0, count);
};

// --- Color Naming System ---

export const getClosestColorName = (hex: string): string => {
  if (!isValidHex(hex)) return "Custom Color";
  
  const targetLab = hexToLab(hex); // Use LAB for naming too!
  let minDistance = Infinity;
  let closestName = "Custom Color";

  for (const color of NAMED_COLORS) {
     const dbLab = hexToLab(color.hex);
     
     // Use DeltaE 2000 for naming precision
     const dist = calculateDeltaE(targetLab, dbLab);
     
     if (dist < minDistance) {
       minDistance = dist;
       closestName = color.name;
     }
  }

  return closestName;
};

// --- Harmonies & Contrast ---

export const getContrastColor = (hex: string): string => {
    const rgb = hexToRgb(hex);
    // YIQ equation
    const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

export const generateHarmonies = (baseHex: string): HarmonyColor[] => {
    if (!isValidHex(baseHex)) return [];
    
    const baseRgb = hexToRgb(baseHex);
    const baseHsl = rgbToHsl(baseRgb);
    
    const harmonies: HarmonyColor[] = [];
    
    // Helper to push harmony
    const add = (h: number, s: number, l: number, type: string) => {
        // Wrap Hue
        let newH = h % 360;
        if (newH < 0) newH += 360;
        
        // Clamp Sat/Light
        const newS = Math.max(0, Math.min(100, s));
        const newL = Math.max(0, Math.min(100, l));
        
        const rgb = hslToRgb({ h: newH, s: newS, l: newL });
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        harmonies.push({ hex, name: getClosestColorName(hex), type });
    };

    // 1. Base
    add(baseHsl.h, baseHsl.s, baseHsl.l, 'Base');

    // 2. Analogous (-30)
    add(baseHsl.h - 30, baseHsl.s, baseHsl.l, 'Analogous');

    // 3. Analogous (+30)
    add(baseHsl.h + 30, baseHsl.s, baseHsl.l, 'Analogous');

    // 4. Complementary (+180)
    add(baseHsl.h + 180, baseHsl.s, baseHsl.l, 'Complement');

    // 5. Split Comp 1 (+150)
    add(baseHsl.h + 150, baseHsl.s, baseHsl.l, 'Split');

    // 6. Split Comp 2 (+210)
    add(baseHsl.h + 210, baseHsl.s, baseHsl.l, 'Split');
    
    // 7. Triadic 1 (+120)
    add(baseHsl.h + 120, baseHsl.s, baseHsl.l, 'Triadic');

    return harmonies;
};

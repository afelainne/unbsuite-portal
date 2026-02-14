export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface ReferenceColor {
  code: string;
  name: string;
  hex: string;
  rgb: RGB; // Cached RGB for faster display
  lab?: LAB; // Cached LAB for faster math
  cmyk?: string;
  model?: string;
  source?: string;
  systemId?: string;
  systemName?: string;
  finishId?: string;
  finish?: string;
}

export interface ColorMatch {
  reference: ReferenceColor;
  deltaE: number; // Distance/Accuracy (Lower is better)
  ranking: 'Exact' | 'Very Close' | 'Close' | 'Similar';
}

export interface HarmonyColor {
  hex: string;
  name: string;
  type: string;
  pantoneCode?: string;
}

export interface AnalysisResult {
  description: {
    en: string;
    pt: string;
    es: string;
  };
  usageTips: {
    en: string[];
    pt: string[];
    es: string[];
  };
  psychology: {
    en: string;
    pt: string;
    es: string;
  };
}
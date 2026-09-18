/**
 * Paleta da folha de marca: as cores que o próprio arquivo SVG usa.
 *
 * Tudo aqui é puro e trabalha sobre a string do SVG já higienizado, sem tocar
 * no projeto paper: varre `fill`, `stroke`, `stop-color` (atributo e `style`),
 * normaliza para `#RRGGBB` e ordena pela frequência com que cada cor aparece.
 * Se o arquivo não tiver cor própria — ou só tiver cinzas —, a folha cai no
 * trio neutro do sistema (preto, branco e o cinza de apoio).
 */

import { activeT } from '../i18n/runtime';

export interface PaletteSwatch {
  /** Sempre `#RRGGBB` em maiúsculas. */
  hex: string;
  /** Quantas vezes a cor aparece no arquivo (0 nos neutros de apoio). */
  weight: number;
  /** `brand` veio do arquivo; `neutral` é apoio do sistema. */
  role: 'brand' | 'neutral';
  /** Nome curto para a legenda (os neutros têm nome; as de marca usam o hex). */
  label: string;
}

/** Trio usado quando o SVG não traz cor própria. */
export const NEUTRAL_PALETTE: PaletteSwatch[] = [
  // Labels read the active language when the palette is copied for a sheet.
  { hex: '#000000', weight: 0, role: 'neutral', get label() { return activeT().brandSheet.sheetBlack; } },
  { hex: '#FFFFFF', weight: 0, role: 'neutral', get label() { return activeT().brandSheet.sheetWhite; } },
  { hex: '#AAA9AB', weight: 0, role: 'neutral', get label() { return activeT().brandSheet.sheetSupportGray; } },
];

/** Quantas amostras a folha chega a imprimir. */
export const MAX_PALETTE_SWATCHES = 6;

/** Nomes CSS que aparecem de verdade em arquivo de logo. */
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  orange: '#FFA500',
  purple: '#800080',
  navy: '#000080',
  teal: '#008080',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  lime: '#00FF00',
  maroon: '#800000',
  olive: '#808000',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  beige: '#F5F5DC',
  gold: '#FFD700',
};

const IGNORED = new Set(['none', 'transparent', 'currentcolor', 'inherit', 'initial', 'unset', 'context-fill', 'context-stroke']);

const clamp255 = (v: number): number => (Number.isFinite(v) ? Math.max(0, Math.min(255, Math.round(v))) : 0);

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map(v => clamp255(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/**
 * Normaliza um valor de cor de SVG/CSS para `#RRGGBB`.
 * Devolve `null` para `none`, `url(#grad)`, `currentColor` e lixo em geral.
 */
export function normalizeColor(raw: string | null | undefined): string | null {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value || IGNORED.has(value) || value.startsWith('url(')) return null;

  if (value.startsWith('#')) {
    const hex = value.slice(1).replace(/[^0-9a-f]/g, '');
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = [...hex.slice(0, 3)].map(c => parseInt(c + c, 16));
      return toHex(r, g, b);
    }
    if (hex.length === 6 || hex.length === 8) {
      return toHex(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16));
    }
    return null;
  }

  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = (p: string): number => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p));
    const [r, g, b] = parts.slice(0, 3).map(channel);
    if (![r, g, b].every(Number.isFinite)) return null;
    return toHex(r, g, b);
  }

  return NAMED_COLORS[value] ?? null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeColor(hex) ?? '#000000';
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

/** Luminância relativa (WCAG), 0 = preto, 1 = branco. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Fundo claro o bastante para receber o logo positivo. O corte é a luminância
 * em que preto e branco empatam em contraste (WCAG, ≈ 0,179).
 */
export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.179;
}

/** Razão de contraste entre duas cores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Saturação HSL: 0 em qualquer cinza. */
export function colorSaturation(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** Cor sem croma perceptível (preto, branco e cinzas). */
export function isAchromatic(hex: string): boolean {
  return colorSaturation(hex) < 0.08;
}

const ATTRIBUTE_RE = /\b(fill|stroke|stop-color|flood-color|lighting-color)\s*=\s*("([^"]*)"|'([^']*)')/gi;
const STYLE_RE = /\b(fill|stroke|stop-color|flood-color|lighting-color)\s*:\s*([^;"'}>]+)/gi;

/**
 * Cores encontradas no arquivo, da mais usada para a menos usada.
 * Não filtra nada por semântica: quem decide se vira "paleta de marca" é
 * `extractSvgPalette`.
 */
export function collectSvgColors(svg: string | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  const source = String(svg ?? '');
  if (!source) return counts;

  const bump = (raw: string | undefined) => {
    const hex = normalizeColor(raw);
    if (!hex) return;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  };

  ATTRIBUTE_RE.lastIndex = 0;
  for (let m = ATTRIBUTE_RE.exec(source); m; m = ATTRIBUTE_RE.exec(source)) bump(m[3] ?? m[4]);
  STYLE_RE.lastIndex = 0;
  for (let m = STYLE_RE.exec(source); m; m = STYLE_RE.exec(source)) bump(m[2]);

  return counts;
}

/**
 * Paleta da folha. Se o arquivo não tiver cor própria — nenhuma cor, ou só
 * cinzas —, devolve o trio neutro do sistema.
 */
export function extractSvgPalette(svg: string | null | undefined): PaletteSwatch[] {
  const counts = collectSvgColors(svg);
  const found = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([hex, weight]): PaletteSwatch => ({ hex, weight, role: 'brand', label: hex }));

  if (!found.length || found.every(s => isAchromatic(s.hex))) return NEUTRAL_PALETTE.map(s => ({ ...s }));
  return found.slice(0, MAX_PALETTE_SWATCHES);
}

/**
 * Cor dominante do arquivo (a mais usada com croma). Num logo monocromático
 * não existe dominante: aí responde o cinza de apoio, porque preto e branco já
 * têm célula própria na fita de fundos.
 */
export function dominantColor(swatches: PaletteSwatch[] | null | undefined): string {
  const brand = (swatches ?? []).find(s => !isAchromatic(s.hex));
  return brand?.hex ?? '#AAA9AB';
}

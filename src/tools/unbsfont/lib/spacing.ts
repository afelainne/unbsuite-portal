import type { Glyph, Metrics, SpacingSettings } from './types';
import { crossings, glyphProfile, inkOutline, type Profile, sampleY } from './outline';
import { isLower } from './charset';

/**
 * Espaçamento automático por área, no método do HT Letterspacer (Huerta
 * Tipográfica): cada lado do glifo precisa ter a mesma quantidade de branco
 * dentro da zona de referência (altura-x nas minúsculas, altura das maiúsculas
 * no resto). O branco é medido entre a tinta e a margem, com duas correções que
 * imitam o olho: a profundidade máxima (contraformas abertas, como a do C ou do
 * T, contam só até certo ponto) e o fechamento em 45° (uma abertura estreita
 * não é vista por inteiro).
 *
 * A calibragem segue o método de Walter Tracy (Letters of Credit): as retas
 * definem o ritmo. O branco-alvo de cada lado é uma fração da contraforma do H
 * (maiúsculas) ou do n (minúsculas), então HH e nn ficam com o mesmo ritmo das
 * suas contraformas; O, o e os demais saem proporcionais, e as curvas ficam
 * naturalmente com margem menor que as retas (HHOHOO, nnonoo).
 */

/** Profundidade máxima do branco lateral, em fração da altura-x (padrão do HT Letterspacer: 15%). */
export const SPACING_DEPTH = 0.15;
/** Branco lateral médio em fração da contraforma do H e do n (mediana de Arial, Verdana, Segoe UI, Times, Calibri e Georgia). */
export const WHITE_RATIO_UPPER = 0.26;
export const WHITE_RATIO_LOWER = 0.33;
/** Pontuação e sinais pequenos (medidos na própria altura) levam menos branco. */
export const SMALL_MARK_FACTOR = 0.7;

export const REF_UPPER = ['H', 'I', 'N', 'M', 'E'];
export const REF_LOWER = ['n', 'h', 'm', 'u', 'l'];

export interface SideMeasure {
  /** Profundidade média do branco dentro da zona (unidades). */
  mean: number;
  /** Distância entre a borda da caixa da tinta e o ponto mais saliente dentro da zona. */
  inset: number;
}

/** Zona vertical de medida do glifo. */
export function spacingZone(g: Glyph, p: Profile, m: Metrics): [number, number] {
  const top = isLower(g.char) ? m.xHeight : m.capHeight;
  const zone: [number, number] = [0, top];
  let total = 0;
  let ink = 0;
  for (let i = 0; i < p.left.length; i++) {
    const y = sampleY(p, i);
    if (y < zone[0] || y > zone[1]) continue;
    total++;
    if (!Number.isNaN(p.left[i])) ink++;
  }
  const zoneSamples = (zone[1] - zone[0]) / p.step;
  // Pontuação e sinais que ocupam pouco da zona (vírgula, aspas, hífen) usam a própria altura.
  if (ink < zoneSamples * 0.3 || total === 0) return [p.box.y0, p.box.y1];
  return zone;
}

/** Mede um lado do perfil dentro da zona: profundidade média do branco, limitada e fechada em 45°. */
export function measureSide(p: Profile, side: 'left' | 'right', zone: [number, number], maxDepth: number): SideMeasure | null {
  const values: number[] = [];
  for (let i = 0; i < p.left.length; i++) {
    const y = sampleY(p, i);
    if (y < zone[0] || y > zone[1]) continue;
    values.push(side === 'left' ? p.left[i] : p.right[i]);
  }
  // Alturas da zona fora da tinta contam como branco máximo.
  const below = Math.max(0, Math.round((Math.max(zone[0], p.box.y0) - zone[0]) / p.step));
  const above = Math.max(0, Math.round((zone[1] - Math.min(zone[1], p.box.y1)) / p.step));
  const ink = values.filter(v => !Number.isNaN(v));
  if (!ink.length) return null;
  const extreme = side === 'left' ? Math.min(...ink) : Math.max(...ink);
  const depth = [
    ...new Array(below).fill(maxDepth),
    ...values.map(v => (Number.isNaN(v) ? maxDepth : Math.min(maxDepth, Math.abs(v - extreme)))),
    ...new Array(above).fill(maxDepth),
  ];
  // Fechamento em 45°: de uma amostra para a próxima o branco só cresce um passo.
  for (let i = 1; i < depth.length; i++) depth[i] = Math.min(depth[i], depth[i - 1] + p.step);
  for (let i = depth.length - 2; i >= 0; i--) depth[i] = Math.min(depth[i], depth[i + 1] + p.step);
  const mean = depth.reduce((a, b) => a + b, 0) / depth.length;
  const inset = side === 'left' ? extreme - p.box.x0 : p.box.x1 - extreme;
  return { mean, inset };
}

/** Maior contraforma interna da letra de referência, medida a 30% e 70% da zona. */
function counterWidth(g: Glyph, m: Metrics, top: number): number {
  const cmds = inkOutline(g, m);
  const gaps = [0.3, 0.7].map(f => {
    const xs = crossings(cmds, top * f);
    let best = 0;
    for (let i = 1; i + 1 < xs.length; i += 2) best = Math.max(best, xs[i + 1] - xs[i]);
    return best;
  }).filter(v => v > 0);
  return gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
}

export interface SpacingReference {
  /** Branco médio que cada lado deve ter (margem + profundidade média). */
  upper: number;
  lower: number;
  /** Margem de reta resultante, para mostrar na tela. */
  straightUpper: number;
  straightLower: number;
  refUpper?: string;
  refLower?: string;
}

export function spacingReference(glyphs: Record<string, Glyph>, m: Metrics, settings: SpacingSettings): SpacingReference {
  const maxDepth = m.xHeight * SPACING_DEPTH;
  const calibrate = (refs: string[], top: number, ratio: number) => {
    const ref = refs.map(c => glyphs[c]).find(g => g && g.outline.length);
    if (!ref) return null;
    const p = glyphProfile(ref, m);
    const zone = spacingZone(ref, p, m);
    const l = measureSide(p, 'left', zone, maxDepth);
    const r = measureSide(p, 'right', zone, maxDepth);
    const counter = counterWidth(ref, m, top);
    if (!l || !r || counter <= 0) return null;
    return { white: counter * ratio, meanRef: (l.mean + r.mean) / 2, char: ref.char };
  };
  const up = calibrate(REF_UPPER, m.capHeight, WHITE_RATIO_UPPER);
  const lo = calibrate(REF_LOWER, m.xHeight, WHITE_RATIO_LOWER);
  const fallback = m.unitsPerEm * 0.07;
  const upper = (up?.white ?? lo?.white ?? fallback) * settings.factor;
  const lower = (lo?.white ?? (up ? up.white * 0.85 : fallback)) * settings.factor;
  return {
    upper,
    lower,
    straightUpper: upper - (up?.meanRef ?? 0),
    straightLower: lower - (lo?.meanRef ?? 0),
    refUpper: up?.char,
    refLower: lo?.char,
  };
}

/** Margens automáticas de um glifo. */
export function glyphSpacing(g: Glyph, m: Metrics, ref: SpacingReference, settings: SpacingSettings): { lsb: number; rsb: number } {
  const p = glyphProfile(g, m);
  if (!g.outline.length || !p.left.length) return { lsb: 0, rsb: 0 };
  const zone = spacingZone(g, p, m);
  const maxDepth = m.xHeight * SPACING_DEPTH;
  const ownZone = zone[1] - zone[0] < (isLower(g.char) ? m.xHeight : m.capHeight) * 0.9;
  const target = (isLower(g.char) ? ref.lower : ref.upper) * (ownZone ? SMALL_MARK_FACTOR : 1);
  const half = settings.tracking / 2;
  const side = (s: 'left' | 'right') => {
    const ms = measureSide(p, s, zone, maxDepth);
    if (!ms) return Math.round(target / 2 + half);
    return Math.round(target - ms.mean - ms.inset + half);
  };
  return { lsb: side('left'), rsb: side('right') };
}

/** Aplica o espaçamento automático a todos os glifos que não foram ajustados à mão. */
export function autoSpace(glyphs: Record<string, Glyph>, m: Metrics, settings: SpacingSettings): Record<string, Glyph> {
  // Derivados (unicase, compostos) herdam as margens da origem: não medem nem servem de referência.
  const drawn = Object.fromEntries(Object.entries(glyphs).filter(([, g]) => !g.derived));
  const ref = spacingReference(drawn, m, settings);
  const out: Record<string, Glyph> = {};
  for (const [c, g] of Object.entries(glyphs)) {
    if (g.locked || !g.outline.length || g.derived) { out[c] = g; continue; }
    const { lsb, rsb } = glyphSpacing(g, m, ref, settings);
    out[c] = lsb === g.lsb && rsb === g.rsb ? g : { ...g, lsb, rsb };
  }
  return out;
}

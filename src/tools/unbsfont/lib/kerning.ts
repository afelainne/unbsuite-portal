import type { Glyph, KerningSettings, KerningState, Metrics } from './types';
import { glyphProfile, type Profile } from './outline';
import { baseChar, charKind, isLower, LEFT_SIDE_GROUPS, RIGHT_SIDE_GROUPS, type CharKind } from './charset';
import { REF_LOWER, REF_UPPER } from './spacing';

/**
 * Kerning automático por perfil.
 *
 * Para cada par, os dois glifos são postos lado a lado com as margens atuais e
 * a distância entre a borda direita do primeiro e a esquerda do segundo é
 * amostrada em muitas alturas, só onde os dois têm tinta (a faixa em que o
 * olho compara um com o outro), com mais peso dentro da altura-x ou das
 * maiúsculas. Cada lado entra com profundidade limitada, como no espaçamento,
 * para uma contraforma aberta pesar sem dominar. O resultado é o "vão óptico"
 * do par.
 *
 * O alvo vem das próprias margens: cada glifo tem o vão que forma ao lado da
 * sua letra de referência (H ou n, os pares de retas do método de Tracy); o
 * par deveria somar os dois. O kerning é a diferença, com teto, limiar e uma
 * trava para os desenhos nunca se aproximarem demais. É a ideia do kerning
 * óptico (medir o branco entre as formas, não a caixa) aplicada a pares.
 */

export interface KerningModel {
  /** Profundidade máxima de cada lado, em fração da altura-x. */
  depth: number;
  /** Quanto uma parte saliente fora da faixa comum (barra do T) pode abrigar o vizinho, em fração da altura-x. */
  inset: number;
  /** Expoente da média dos vãos (negativo: o trecho mais próximo manda). */
  power: number;
  /** Peso das alturas fora da zona principal. */
  outsideWeight: number;
  /** Valores menores que isto (fração da UPM) viram zero. */
  threshold: number;
  /** Maior kerning, em fração da UPM. */
  cap: number;
  /** Escala geral: com 100% de força, o resultado fica na média de fontes profissionais medidas. */
  gain: number;
  /** Fração mantida de um kerning positivo. Zero: o automático só aproxima, como nas fontes medidas; afastar fica para o ajuste à mão. */
  positive: number;
  /** Vão mínimo depois do kerning, em fração do vão entre duas retas. */
  minGap: number;
}

export const DEFAULT_MODEL: KerningModel = { depth: 0.5, inset: 0.5, power: -1.5, gain: 0.7, outsideWeight: 0.35, threshold: 0.008, cap: 0.3, positive: 0, minGap: 0.35 };

export const DEFAULT_KERNING: KerningSettings = { strength: 1, scope: 'common', useClasses: true };

export const pairKey = (l: string, r: string) => `${l}|${r}`;
export const splitKey = (k: string): [string, string] => {
  const i = k.indexOf('|', 1);
  return [k.slice(0, i), k.slice(i + 1)];
};

/* ---------------------------------------------------------- vão do par */

interface SideCtx { p: Profile; lsb: number; rsb: number; lower: boolean }

const ctx = (g: Glyph, m: Metrics): SideCtx => ({ p: glyphProfile(g, m), lsb: g.lsb, rsb: g.rsb, lower: isLower(g.char) });

/**
 * Vão óptico entre dois glifos (sem kerning) e o menor vão bruto entre eles.
 * `null` quando não há altura em que os dois tenham tinta.
 */
export function pairGap(a: SideCtx, b: SideCtx, m: Metrics, model: KerningModel): { gap: number; min: number } | null {
  const step = a.p.step;
  const kStart = Math.max(a.p.k0, b.p.k0);
  const kEnd = Math.min(a.p.k0 + a.p.right.length, b.p.k0 + b.p.left.length);
  if (kEnd <= kStart) return null;
  const maxDepth = m.xHeight * model.depth;
  // Pontos mais salientes de cada lado dentro da faixa comum.
  let extA = -Infinity;
  let extB = Infinity;
  for (let k = kStart; k < kEnd; k++) {
    const ra = a.p.right[k - a.p.k0];
    const lb = b.p.left[k - b.p.k0];
    if (!Number.isNaN(ra) && ra > extA) extA = ra;
    if (!Number.isNaN(lb) && lb < extB) extB = lb;
  }
  if (!Number.isFinite(extA) || !Number.isFinite(extB)) return null;
  // O que sobra para fora da faixa comum (a barra do T sobre o o, o bojo do P sobre o ponto)
  // também tem profundidade limitada: o vizinho se encaixa por baixo, mas não inteiro.
  const inset = m.xHeight * model.inset;
  const baseA = a.rsb + Math.min(inset, a.p.box.x1 - extA);
  const baseB = b.lsb + Math.min(inset, extB - b.p.box.x0);
  const top = a.lower || b.lower ? m.xHeight : m.capHeight;
  let sum = 0;
  let weights = 0;
  let min = Infinity;
  const da: number[] = [];
  const db: number[] = [];
  for (let k = kStart; k < kEnd; k++) {
    const ra = a.p.right[k - a.p.k0];
    const lb = b.p.left[k - b.p.k0];
    da.push(Number.isNaN(ra) ? maxDepth : Math.min(maxDepth, extA - ra));
    db.push(Number.isNaN(lb) ? maxDepth : Math.min(maxDepth, lb - extB));
    if (!Number.isNaN(ra) && !Number.isNaN(lb)) {
      const raw = a.rsb + (a.p.box.x1 - ra) + b.lsb + (lb - b.p.box.x0);
      if (raw < min) min = raw;
    }
  }
  // Fechamento em 45°, como no espaçamento.
  for (const d of [da, db]) {
    for (let i = 1; i < d.length; i++) d[i] = Math.min(d[i], d[i - 1] + step);
    for (let i = d.length - 2; i >= 0; i--) d[i] = Math.min(d[i], d[i + 1] + step);
  }
  // Média de potência negativa: o trecho mais próximo pesa mais que o mais aberto,
  // como o olho, que ancora o vão no ponto em que as formas quase se tocam.
  const floor = m.unitsPerEm * 0.01;
  for (let k = kStart, i = 0; k < kEnd; k++, i++) {
    const y = (k + 0.5) * step;
    const w = y >= 0 && y <= top ? 1 : model.outsideWeight;
    const g = Math.max(floor, baseA + da[i] + baseB + db[i]);
    sum += w * Math.pow(g, model.power);
    weights += w;
  }
  return { gap: Math.pow(sum / weights, 1 / model.power), min };
}

/* ---------------------------------------------------------- classes */

export interface KerningClasses {
  /** Glifo → líder da classe pelo lado direito (quando é o primeiro do par). */
  right: Record<string, string>;
  /** Glifo → líder da classe pelo lado esquerdo (quando é o segundo do par). */
  left: Record<string, string>;
}

/** Perfil de um lado normalizado pela saliência, para comparar formas. */
function sideSignature(g: Glyph, m: Metrics, side: 'left' | 'right'): Float64Array | null {
  const p = glyphProfile(g, m);
  const top = isLower(g.char) ? m.xHeight : m.capHeight;
  const n = 24;
  const out = new Float64Array(n);
  const maxDepth = m.xHeight * 0.4;
  const values: number[] = [];
  for (let i = 0; i < n; i++) {
    const y = ((i + 0.5) / n) * top;
    const idx = Math.floor(y / p.step) - p.k0;
    const v = idx >= 0 && idx < p.left.length ? (side === 'left' ? p.left[idx] : p.right[idx]) : NaN;
    values.push(v);
  }
  const ink = values.filter(v => !Number.isNaN(v));
  if (ink.length < n * 0.3) return null;
  const ext = side === 'left' ? Math.min(...ink) : Math.max(...ink);
  values.forEach((v, i) => { out[i] = Number.isNaN(v) ? maxDepth : Math.min(maxDepth, Math.abs(v - ext)); });
  return out;
}

const signatureDistance = (a: Float64Array, b: Float64Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

/**
 * Classes de kerning: candidatos tradicionais (H com B D E F…, O com C G Q, n
 * com m h r…) confirmados pelo desenho, e acentuados com a letra-base.
 */
const classCache = new WeakMap<Record<string, Glyph>, Map<string, KerningClasses>>();

export function buildClasses(glyphs: Record<string, Glyph>, m: Metrics, useClasses: boolean): KerningClasses {
  const key = `${m.capHeight}:${m.xHeight}:${m.unitsPerEm}:${useClasses}`;
  let inner = classCache.get(glyphs);
  if (!inner) classCache.set(glyphs, (inner = new Map()));
  let hit = inner.get(key);
  if (!hit) inner.set(key, (hit = computeClasses(glyphs, m, useClasses)));
  return hit;
}

function computeClasses(glyphs: Record<string, Glyph>, m: Metrics, useClasses: boolean): KerningClasses {
  const chars = Object.keys(glyphs).filter(c => glyphs[c].outline.length);
  const right: Record<string, string> = {};
  const left: Record<string, string> = {};
  for (const c of chars) { right[c] = c; left[c] = c; }
  // Derivados entram sempre na classe da origem (a de unicase, a letra-base do composto),
  // com ou sem classes: é o mesmo desenho naquele lado. Algumas voltas resolvem cadeias (á → Á → A).
  const follow = (map: Record<string, string>) => {
    for (let pass = 0; pass < 3; pass++) {
      for (const c of chars) {
        const d = glyphs[c].derived;
        if (!d) continue;
        const b = baseChar(c);
        const src = d.kind === 'unicase' ? d.from : glyphs[b]?.outline.length ? b : d.from;
        if (src !== c && map[src]) map[c] = map[src];
      }
    }
  };
  if (!useClasses) {
    follow(right);
    follow(left);
    return { right, left };
  }
  const tol = m.unitsPerEm * 0.02;
  const assign = (groups: string[], side: 'left' | 'right', map: Record<string, string>) => {
    for (const group of groups) {
      const members = Array.from(group).filter(c => glyphs[c]?.outline.length && !glyphs[c].derived);
      if (members.length < 2) continue;
      const leader = members[0];
      const sigL = sideSignature(glyphs[leader], m, side);
      if (!sigL) continue;
      for (const c of members.slice(1)) {
        const sig = sideSignature(glyphs[c], m, side);
        if (sig && signatureDistance(sig, sigL) <= tol) map[c] = leader;
      }
    }
    // Acentuados seguem a base (o acento não muda o lado na zona da letra).
    for (const c of chars) {
      const b = baseChar(c);
      if (b !== c && glyphs[b]?.outline.length) map[c] = map[b];
    }
    follow(map);
  };
  assign(RIGHT_SIDE_GROUPS, 'right', right);
  assign(LEFT_SIDE_GROUPS, 'left', left);
  return { right, left };
}

/** Membros de cada classe, pelo líder. */
export function classMembers(map: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [c, leader] of Object.entries(map)) (out[leader] ||= []).push(c);
  return out;
}

/* ---------------------------------------------------------- pares */

const COMMON: Array<[CharKind[], CharKind[]]> = [
  [['upper'], ['upper', 'lower', 'punct', 'quote', 'dash', 'bracket']],
  [['lower'], ['lower', 'punct', 'quote', 'dash', 'bracket']],
  [['digit'], ['digit', 'punct', 'dash']],
  [['quote', 'dash', 'bracket'], ['upper', 'lower', 'digit']],
  [['quote'], ['punct']],
  [['punct'], ['quote']],
];

export function isCommonPair(l: string, r: string): boolean {
  const kl = charKind(l);
  const kr = charKind(r);
  return COMMON.some(([a, b]) => a.includes(kl) && b.includes(kr));
}

/** Referência de um glifo para o alvo: H para maiúsculas e o resto, n para minúsculas. */
function referenceFor(c: string, glyphs: Record<string, Glyph>): Glyph | undefined {
  const refs = isLower(c) ? REF_LOWER : REF_UPPER;
  return refs.map(r => glyphs[r]).find(g => g && g.outline.length) ??
    [...REF_UPPER, ...REF_LOWER].map(r => glyphs[r]).find(g => g && g.outline.length);
}

/** Kerning de um par de glifos (em unidades, antes da força). */
export function pairKern(a: Glyph, b: Glyph, glyphs: Record<string, Glyph>, m: Metrics, model: KerningModel = DEFAULT_MODEL): number {
  const ca = ctx(a, m);
  const cb = ctx(b, m);
  const actual = pairGap(ca, cb, m, model);
  if (!actual) return 0;
  const refA = referenceFor(a.char, glyphs);
  const refB = referenceFor(b.char, glyphs);
  if (!refA || !refB) return 0;
  const cra = ctx(refA, m);
  const crb = ctx(refB, m);
  // Quanto cada lado "vale" ao lado da sua referência (a parte da referência descontada).
  const aRef = pairGap(ca, cra, m, model);
  const refRefA = pairGap(cra, cra, m, model);
  const bRef = pairGap(crb, cb, m, model);
  const refRefB = pairGap(crb, crb, m, model);
  if (!aRef || !bRef || !refRefA || !refRefB) return 0;
  const target = aRef.gap - refRefA.gap / 2 + bRef.gap - refRefB.gap / 2;
  let kern = (target - actual.gap) * model.gain;
  if (kern > 0) kern *= model.positive;
  // Trava: nunca deixar o vão bruto menor que uma fração do vão entre retas.
  const straightGap = (refRefA.gap + refRefB.gap) / 2;
  const floor = model.minGap * straightGap - actual.min;
  if (kern < floor) kern = Math.min(0, floor);
  return kern;
}

export interface AutoKernResult {
  pairs: Record<string, number>;
  classes: KerningClasses;
}

/** Kerning automático para os pares (de classes) do conjunto atual. */
// Valores brutos (antes da força) por conjunto de glifos: mexer só na força não mede tudo de novo.
const rawCache = new WeakMap<Record<string, Glyph>, Map<string, { raw: Record<string, number>; classes: KerningClasses }>>();

export function autoKern(glyphs: Record<string, Glyph>, m: Metrics, settings: KerningSettings, model: KerningModel = DEFAULT_MODEL): AutoKernResult {
  const cacheKey = `${JSON.stringify(m)}|${settings.scope}|${settings.useClasses}|${JSON.stringify(model)}`;
  let inner = rawCache.get(glyphs);
  if (!inner) rawCache.set(glyphs, (inner = new Map()));
  let hit = inner.get(cacheKey);
  if (!hit) {
    const classes = buildClasses(glyphs, m, settings.useClasses);
    const leftLeaders = Array.from(new Set(Object.values(classes.right)));
    const rightLeaders = Array.from(new Set(Object.values(classes.left)));
    const membersR = classMembers(classes.right);
    const membersL = classMembers(classes.left);
    const raw: Record<string, number> = {};
    for (const l of leftLeaders) {
      for (const r of rightLeaders) {
        if (settings.scope === 'common' && !membersR[l].some(a => membersL[r].some(b => isCommonPair(a, b)))) continue;
        const v = pairKern(glyphs[l], glyphs[r], glyphs, m, model);
        if (v) raw[pairKey(l, r)] = v;
      }
    }
    hit = { raw, classes };
    inner.set(cacheKey, hit);
  }
  const cap = m.unitsPerEm * model.cap;
  const threshold = m.unitsPerEm * model.threshold;
  const pairs: Record<string, number> = {};
  for (const [key, raw] of Object.entries(hit.raw)) {
    const v = Math.round(Math.max(-cap, Math.min(cap, raw * settings.strength)));
    if (Math.abs(v) >= threshold) pairs[key] = v;
  }
  return { pairs, classes: hit.classes };
}

/** Kerning final (manual por cima do automático), expandido para pares de glifos. */
export function flattenKerning(state: KerningState, glyphs: Record<string, Glyph>, m: Metrics): Map<string, number> {
  const classes = buildClasses(glyphs, m, state.settings.useClasses);
  const membersR = classMembers(classes.right);
  const membersL = classMembers(classes.left);
  const merged: Record<string, number> = { ...state.auto, ...state.manual };
  const out = new Map<string, number>();
  for (const [key, value] of Object.entries(merged)) {
    if (!value) continue;
    const [l, r] = splitKey(key);
    for (const a of membersR[l] || (glyphs[l] ? [l] : [])) {
      for (const b of membersL[r] || (glyphs[r] ? [r] : [])) out.set(pairKey(a, b), Math.round(value));
    }
  }
  return out;
}

/** Valor do par de glifos, olhando as classes. */
export function kernValue(state: KerningState, classes: KerningClasses, a: string, b: string): number {
  const key = pairKey(classes.right[a] ?? a, classes.left[b] ?? b);
  return state.manual[key] ?? state.auto[key] ?? 0;
}

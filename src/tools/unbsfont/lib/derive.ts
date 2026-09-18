import type { CaseSettings, Cmd, FontStyle, Glyph, Metrics } from './types';
import { DOTLESS, isLower, isUpper } from './charset';
import { computeProfile, inkBox, inkOutline, profileStep, sampleY } from './outline';
import { type Box, cmdsBox, mapCmds, splitContours } from './geometry';

/**
 * Glifos derivados: unicase (uma caixa copia a outra) e acentuados compostos
 * (letra-base + sinal). Nada aqui redesenha: a cópia unicase é o mesmo
 * contorno, e o composto é o contorno da base mais o do sinal, só transladado.
 *
 * Os derivados vivem em `style.glyphs` como glifos comuns, marcados com
 * `derived`, e são refeitos a partir da origem a cada mudança
 * (`resolveDerived`). Desenhado sempre vence derivado.
 */

export const DEFAULT_CASES: CaseSettings = { unicase: 'off', compose: true, composeExtended: false, capAccentOffset: 0, nudges: {}, detached: [] };

export const caseSettings = (s: FontStyle): CaseSettings => ({ ...DEFAULT_CASES, ...s.cases });

/* ---------------------------------------------------------- acentos */

/** Sinal combinante → caractere de espaçamento que o designer desenha. */
const COMBINING_TO_SPACING: Record<string, string> = Object.fromEntries(
  ([
    [0x300, '`'], [0x301, '´'], [0x302, 'ˆ'], [0x303, '˜'], [0x304, '¯'], [0x306, '˘'], [0x307, '˙'],
    [0x308, '¨'], [0x30a, '˚'], [0x30b, '˝'], [0x30c, 'ˇ'], [0x327, '¸'], [0x328, '˛'],
  ] as const).map(([cp, mark]) => [String.fromCharCode(cp), mark]),
);

/** Sinais que vão embaixo da letra, presos à linha de base. */
export const BOTTOM_MARKS = new Set(['¸', '˛']);

/** Letra-base e sinal de um acentuado (Á → A + ´), ou null se não se compõe assim. */
export function decompose(c: string): { base: string; mark: string } | null {
  const parts = Array.from(c.normalize('NFD'));
  if (parts.length !== 2) return null;
  const mark = COMBINING_TO_SPACING[parts[1]];
  if (!mark || !(isUpper(parts[0]) || isLower(parts[0]))) return null;
  return { base: parts[0], mark };
}

/**
 * Letras com vírgula embaixo (Ģ, ķ, ņ…): o Unicode as decompõe com cedilha,
 * mas o desenho é outro sinal. Ficam para desenhar.
 */
const COMMA_ACCENT = new Set(Array.from('ĢģĶķĻļŅņŖŗ'));

const composableIn = (from: number, to: number) => {
  const out: string[] = [];
  for (let cp = from; cp <= to; cp++) {
    const c = String.fromCodePoint(cp);
    if (decompose(c) && !COMMA_ACCENT.has(c)) out.push(c);
  }
  return out;
};

/** Acentuados do Latin-1 que dá para compor (os do português e do espanhol, e mais alguns). */
export const COMPOSABLE_LATIN_1 = composableIn(0xc0, 0xff);
/** Os do Latin Extended-A, compostos só quando o estilo pede. */
export const COMPOSABLE_EXTENDED = composableIn(0x100, 0x17f);
export const COMPOSABLE = [...COMPOSABLE_LATIN_1, ...COMPOSABLE_EXTENDED];

/** O caractere da outra caixa (A ↔ a), quando é um caractere só. */
export function otherCase(c: string): string | null {
  const o = isUpper(c) ? c.toLowerCase() : isLower(c) ? c.toUpperCase() : null;
  return o && o !== c && Array.from(o).length === 1 ? o : null;
}

/* ---------------------------------------------------------- medidas */

/** Centro óptico de uma faixa do desenho: média dos meios da tinta, amostrados em altura. */
function bandCentre(cmds: Cmd[], box: Box, m: Metrics, where: 'top' | 'bottom', frac: number): { centre: number; left: number; right: number } {
  const p = computeProfile(cmds, profileStep(m));
  const band = Math.max(p.step * 2, (box.y1 - box.y0) * frac);
  let sum = 0;
  let n = 0;
  let left = Infinity;
  let right = -Infinity;
  for (let i = 0; i < p.left.length; i++) {
    const y = sampleY(p, i);
    if (where === 'top' ? y < box.y1 - band : y > box.y0 + band) continue;
    if (Number.isNaN(p.left[i])) continue;
    sum += (p.left[i] + p.right[i]) / 2;
    n++;
    left = Math.min(left, p.left[i]);
    right = Math.max(right, p.right[i]);
  }
  if (!n) return { centre: (box.x0 + box.x1) / 2, left: box.x0, right: box.x1 };
  return { centre: sum / n, left, right };
}

/** Tira o pingo do i/j: contornos inteiros acima da altura-x. Nenhum ponto muda. */
function withoutDot(cmds: Cmd[], m: Metrics): { cmds: Cmd[]; removed: number } {
  const contours = splitContours(cmds);
  const keep = contours.filter(c => cmdsBox(c).y0 < m.xHeight * 0.9);
  if (!keep.length || keep.length === contours.length) return { cmds, removed: 0 };
  return { cmds: keep.flat(), removed: contours.length - keep.length };
}

export interface Placement {
  /** Translação aplicada ao sinal, em unidades da fonte. */
  dx: number;
  dy: number;
}

/**
 * Acentuado composto: contorno da base (em unidades da fonte) mais o do sinal,
 * transladado. Horizontal: o centro do sinal vai sobre o centro óptico do topo
 * da base (ou da base do desenho, para cedilha e ogonek). Vertical: o sinal
 * guarda a distância que tem, na própria célula, até a altura-x (ou até a
 * altura das maiúsculas, se foi desenhado acima dela); sobre maiúscula, soma
 * o ajuste de maiúsculas. Margens e avanço são os da base.
 */
export function composeGlyph(char: string, glyphs: Record<string, Glyph>, m: Metrics, cs: CaseSettings): (Glyph & { placement: Placement }) | null {
  const d = decompose(char);
  if (!d) return null;
  const mark = glyphs[d.mark];
  if (!mark?.outline.length || mark.derived) return null;
  const bottom = BOTTOM_MARKS.has(d.mark);
  let from = d.base;
  let base = glyphs[d.base];
  let note: string | undefined;
  let strip = false;
  if (!bottom && DOTLESS[d.base]) {
    const dotless = glyphs[DOTLESS[d.base]];
    if (dotless?.outline.length) { base = dotless; from = DOTLESS[d.base]; } else strip = true;
  }
  if (!base?.outline.length || base.derived?.kind === 'composite') return null;

  let baseCmds = inkOutline(base, m);
  if (strip) {
    const r = withoutDot(baseCmds, m);
    baseCmds = r.cmds;
    if (!base.derived) {
      note = r.removed
        ? `Sem ${DOTLESS[d.base]} desenhado: o pingo do ${d.base} foi retirado para o acento.`
        : `Sem ${DOTLESS[d.base]} desenhado e sem pingo separado no ${d.base}: o acento foi posto sobre o ${d.base} inteiro.`;
    }
  }
  const baseBox = cmdsBox(baseCmds);
  const markCmds = inkOutline(mark, m);
  const markBox = cmdsBox(markCmds);
  const nudge = cs.nudges[char] ?? { dx: 0, dy: 0 };

  let dx: number;
  let dy: number;
  if (bottom) {
    const b = bandCentre(baseCmds, baseBox, m, 'bottom', 0.2);
    if (d.mark === '˛') dx = b.right - markBox.x1;
    else dx = b.centre - bandCentre(markCmds, markBox, m, 'top', 0.3).centre;
    // Preso sob a linha de base como foi desenhado; se veio no alto, o topo vai para a linha de base.
    dy = markBox.y1 > m.xHeight * 0.5 ? -markBox.y1 : 0;
  } else {
    dx = bandCentre(baseCmds, baseBox, m, 'top', 0.2).centre - (markBox.x0 + markBox.x1) / 2;
    const lower = isLower(char);
    const line = lower ? m.xHeight : m.capHeight;
    const ref = markBox.y0 >= m.capHeight ? m.capHeight : m.xHeight;
    let gap = markBox.y0 - ref;
    if (gap < 0) gap = m.unitsPerEm * 0.06;
    // Ascendentes (ĺ) e letras copiadas da outra caixa: o acento sobe acima da tinta.
    const top = baseBox.y1 > line + m.unitsPerEm * 0.04 ? baseBox.y1 : line;
    dy = top + gap + (lower ? 0 : cs.capAccentOffset) - markBox.y0;
  }
  dx += nudge.dx;
  dy += nudge.dy;

  const outline = [...baseCmds, ...mapCmds(markCmds, (x, y) => [x + dx, y + dy])];
  const comp = cmdsBox(outline);
  const own = inkBox(base, m);
  return {
    char,
    outline,
    srcCap: m.capHeight,
    scale: 1,
    yOffset: 0,
    // A base fica onde estava no glifo dela; o sinal que sobra para fora come a margem.
    lsb: Math.round(base.lsb + (comp.x0 - own.x0)),
    rsb: Math.round(base.rsb + (own.x1 - comp.x1)),
    locked: base.locked,
    derived: { kind: 'composite', from, mark: d.mark, auto: true, ...(note ? { note } : {}) },
    placement: { dx, dy },
  };
}

/* ---------------------------------------------------------- resolução */

const sameCmds = (a: Cmd[], b: Cmd[]) => a === b || (a.length === b.length && a.every((c, i) => JSON.stringify(c) === JSON.stringify(b[i])));

function sameGlyph(a: Glyph | undefined, b: Glyph): boolean {
  if (!a || !a.derived || !b.derived) return false;
  return a.lsb === b.lsb && a.rsb === b.rsb && a.srcCap === b.srcCap && a.scale === b.scale && a.yOffset === b.yOffset && a.locked === b.locked
    && a.derived.kind === b.derived.kind && a.derived.from === b.derived.from && a.derived.mark === b.derived.mark
    && a.derived.auto === b.derived.auto && a.derived.note === b.derived.note
    // Unicase compartilha o próprio contorno da origem (é o que a exportação reconhece como o mesmo glifo).
    && (b.derived.kind === 'unicase' ? a.outline === b.outline : sameCmds(a.outline, b.outline));
}

/**
 * Refaz todos os derivados do estilo. Ordem: cópias pedidas à mão e do modo
 * unicase a partir do que foi desenhado; compostos da caixa de origem; cópias
 * unicase dos compostos (Á → á em unicase); por fim, compostos que sobraram.
 */
export function resolveDerived(style: FontStyle, m: Metrics): FontStyle {
  const cs = caseSettings(style);
  const detached = new Set(cs.detached);
  const prev = style.glyphs;
  const out: Record<string, Glyph> = {};
  const explicit: [string, string][] = [];
  for (const [c, g] of Object.entries(prev)) {
    if (!g.derived) out[c] = g;
    else if (g.derived.kind === 'unicase' && !g.derived.auto) explicit.push([c, g.derived.from]);
  }
  const mode = cs.unicase;
  const isTarget = (c: string) => (mode === 'upper' ? isLower(c) : mode === 'lower' ? isUpper(c) : false);
  const put = (g: Glyph) => { out[g.char] = sameGlyph(prev[g.char], g) ? prev[g.char] : g; };

  const copy = (c: string, from: string, auto: boolean) => {
    if (out[c]) return;
    const src = out[from];
    if (!src?.outline.length || src.derived?.kind === 'unicase') return;
    put({ ...src, char: c, derived: { kind: 'unicase', from, auto } });
  };
  const copies = () => {
    for (const [c, from] of explicit) copy(c, from, false);
    if (mode === 'off') return;
    for (const c of Object.keys(out)) {
      if (isTarget(c)) continue;
      const t = otherCase(c);
      if (t && isTarget(t) && !detached.has(t)) copy(t, c, true);
    }
  };
  const compose = (skipTargets: boolean) => {
    if (!cs.compose) return;
    for (const c of cs.composeExtended ? COMPOSABLE : COMPOSABLE_LATIN_1) {
      if (out[c] || detached.has(c) || (skipTargets && isTarget(c))) continue;
      const g = composeGlyph(c, out, m, cs);
      if (g) {
        const { placement: _placement, ...glyph } = g;
        put(glyph);
      }
    }
  };
  copies();
  compose(true);
  copies();
  compose(false);
  return { ...style, glyphs: out };
}

/* ---------------------------------------------------------- ações */

const withCases = (style: FontStyle, patch: Partial<CaseSettings>): FontStyle => ({ ...style, cases: { ...caseSettings(style), ...patch } });

export function setCaseSettings(style: FontStyle, patch: Partial<CaseSettings>, m: Metrics): FontStyle {
  return resolveDerived(withCases(style, patch), m);
}

/** Copia um glifo para a outra caixa. Sobrescreve um desenho só se `overwrite` (a interface confirma antes). */
export function copyToOtherCase(style: FontStyle, char: string, m: Metrics, overwrite = false): FontStyle {
  const t = otherCase(char);
  const src = style.glyphs[char];
  if (!t || !src?.outline.length || src.derived?.kind === 'unicase') return style;
  const target = style.glyphs[t];
  if (target && !target.derived && !overwrite) return style;
  const cs = caseSettings(style);
  const next = withCases(style, { detached: cs.detached.filter(c => c !== t) });
  next.glyphs = { ...style.glyphs, [t]: { ...src, char: t, derived: { kind: 'unicase', from: char, auto: false } } };
  return resolveDerived(next, m);
}

/** Preenche a outra caixa só onde não há desenho. `from` é a caixa copiada. */
export function copyMissing(style: FontStyle, from: 'upper' | 'lower', m: Metrics): { style: FontStyle; count: number } {
  const inCase = from === 'upper' ? isUpper : isLower;
  const glyphs = { ...style.glyphs };
  const filled: string[] = [];
  for (const [c, g] of Object.entries(style.glyphs)) {
    if (!inCase(c) || !g.outline.length || g.derived?.kind === 'unicase') continue;
    const t = otherCase(c);
    if (!t) continue;
    const cur = glyphs[t];
    if (cur && (!cur.derived || !cur.derived.auto || cur.derived.kind === 'unicase')) continue;
    glyphs[t] = { ...g, char: t, derived: { kind: 'unicase', from: c, auto: false } };
    filled.push(t);
  }
  if (!filled.length) return { style, count: 0 };
  const cs = caseSettings(style);
  const next = withCases({ ...style, glyphs }, { detached: cs.detached.filter(c => !filled.includes(c)) });
  return { style: resolveDerived(next, m), count: filled.length };
}

/** Desfaz a derivação: o caractere fica vazio e não é derivado de novo sozinho. */
export function detachGlyph(style: FontStyle, char: string, m: Metrics): FontStyle {
  if (!style.glyphs[char]?.derived) return style;
  const glyphs = { ...style.glyphs };
  delete glyphs[char];
  const cs = caseSettings(style);
  return resolveDerived(withCases({ ...style, glyphs }, { detached: Array.from(new Set([...cs.detached, char])) }), m);
}

/** Ajuste fino do acento de um composto. */
export function nudgeAccent(style: FontStyle, char: string, dx: number, dy: number, m: Metrics): FontStyle {
  const cs = caseSettings(style);
  const nudges = { ...cs.nudges };
  if (dx || dy) nudges[char] = { dx, dy };
  else delete nudges[char];
  return setCaseSettings(style, { nudges }, m);
}

/** Recompõe tudo: tira os ajustes finos e volta a compor os acentuados desfeitos. */
export function recomposeAll(style: FontStyle, m: Metrics): FontStyle {
  const cs = caseSettings(style);
  return setCaseSettings(style, { nudges: {}, detached: cs.detached.filter(c => !decompose(c)) }, m);
}

/** Onde está cada derivado e o que falta para compor os acentuados da ordem. */
export function deriveSummary(style: FontStyle): { unicase: number; composite: number; notes: string[] } {
  let unicase = 0;
  let composite = 0;
  const notes = new Set<string>();
  for (const g of Object.values(style.glyphs)) {
    if (g.derived?.kind === 'unicase') unicase++;
    if (g.derived?.kind === 'composite') {
      composite++;
      if (g.derived.note) notes.add(g.derived.note);
    }
  }
  return { unicase, composite, notes: Array.from(notes) };
}

/** Sinais que faltam desenhar para compor os acentuados pedidos. */
export function missingMarks(chars: string[], glyphs: Record<string, Glyph>): string[] {
  const need = new Set<string>();
  for (const c of chars) {
    const d = decompose(c);
    if (d && !glyphs[c] && !glyphs[d.mark]?.outline.length) need.add(d.mark);
  }
  return Array.from(need);
}

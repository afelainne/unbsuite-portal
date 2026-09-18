import type { Cmd, Glyph } from './types';
import {
  type Box, type Pt, boxHeight, boxWidth, flatten, mapCmds, pointInPoly, polyBox, reverseContour, signedArea, unionBox,
} from './geometry';
import { readSvgShapes, type SvgShape } from './svg';
import { ASC_REFS, CAP_REFS, DESC_REFS, DESCENDS, FLAT_BOTTOM, RAISED, ROUND_BOTTOM, X_REFS } from './charset';

/**
 * Folha de caracteres: um SVG com o alfabeto inteiro desenhado. Aqui ela vira
 * componentes (contorno externo com seus furos), linhas, glifos em ordem de
 * leitura, linhas de base e guias. Tudo no espaço do documento (y para baixo).
 */

export interface Component {
  /** Contornos já orientados: externo anti-horário e furos horários, em y para cima. */
  contours: Cmd[][];
  box: Box;
}

export interface SheetGroup {
  id: number;
  components: Component[];
  box: Box;
  row: number;
}

export interface SheetRow {
  groups: SheetGroup[];
  /** Faixa central da linha (topo e base medianos das formas grandes). */
  top: number;
  bottom: number;
  /** Linha de base detectada ou ajustada, em y do documento. */
  baseline: number;
}

export interface Sheet {
  rows: SheetRow[];
  box: Box;
  strokeOnly: number;
}

export interface SheetGuides {
  cap?: number;
  x?: number;
  asc?: number;
  desc?: number;
}

/* ---------------------------------------------------------- componentes */

interface RawContour { cmds: Cmd[]; poly: Pt[]; box: Box; area: number }

/**
 * Separa as formas em componentes. Um contorno dentro de um número ímpar de
 * outros da mesma forma é furo; os demais são externos. Os sentidos são
 * acertados (só invertendo a ordem dos pontos) para a regra de preenchimento
 * não-zero das fontes dar o mesmo desenho que o SVG mostra.
 */
export function shapesToComponents(shapes: SvgShape[]): Component[] {
  const comps: Component[] = [];
  for (const shape of shapes) {
    const raw: RawContour[] = shape.contours.map(cmds => {
      const poly = flatten(cmds, 0.5);
      return { cmds, poly, box: polyBox(poly), area: Math.abs(signedArea(poly)) };
    }).filter(c => c.poly.length >= 3 && c.area > 0);
    const parents = raw.map((c, i) => raw
      .map((o, j) => ({ o, j }))
      .filter(({ o, j }) => j !== i && o.area > c.area && containsContour(o, c))
      .map(({ j }) => j));
    const depth = parents.map(p => p.length);
    const outers = raw.map((_, i) => i).filter(i => depth[i] % 2 === 0);
    for (const oi of outers) {
      // Furos diretos: profundidade +1 e contidos neste externo.
      const holes = raw.map((_, i) => i).filter(i => depth[i] === depth[oi] + 1 && parents[i].includes(oi));
      // No documento y cresce para baixo: anti-horário em y para cima é área negativa aqui.
      const orient = (idx: number, outer: boolean) => {
        const a = signedArea(raw[idx].poly);
        const wantNegative = outer;
        return (a < 0) === wantNegative ? raw[idx].cmds : reverseContour(raw[idx].cmds);
      };
      comps.push({
        contours: [orient(oi, true), ...holes.map(h => orient(h, false))],
        box: raw[oi].box,
      });
    }
  }
  return comps;
}

function containsContour(outer: RawContour, inner: RawContour): boolean {
  const b = outer.box;
  const ib = inner.box;
  if (ib.x0 < b.x0 - 1e-6 || ib.x1 > b.x1 + 1e-6 || ib.y0 < b.y0 - 1e-6 || ib.y1 > b.y1 + 1e-6) return false;
  // Maioria de alguns pontos do contorno interno: tolera contornos que se tocam.
  const n = inner.poly.length;
  const samples = Math.min(n, 7);
  let inside = 0;
  for (let k = 0; k < samples; k++) {
    const [x, y] = inner.poly[Math.floor((k * n) / samples)];
    if (pointInPoly(x, y, outer.poly)) inside++;
  }
  return inside * 2 > samples;
}

/* ---------------------------------------------------------- agrupamento */

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const percentile = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
};

const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);

/** Remove um fundo (retângulo que cobre a maior parte da folha e contém quase tudo). */
function dropBackground(comps: Component[]): Component[] {
  if (comps.length < 3) return comps;
  let all = comps[0].box;
  for (const c of comps) all = unionBox(all, c.box);
  const totalArea = boxWidth(all) * boxHeight(all);
  return comps.filter(c => {
    if (boxWidth(c.box) * boxHeight(c.box) < totalArea * 0.5) return true;
    const inside = comps.filter(o => o !== c && o.box.x0 >= c.box.x0 && o.box.x1 <= c.box.x1 && o.box.y0 >= c.box.y0 && o.box.y1 <= c.box.y1).length;
    return inside < (comps.length - 1) * 0.5;
  });
}

/** Agrupa componentes em linhas e glifos, em ordem de leitura. */
export function groupComponents(input: Component[]): SheetRow[] {
  const comps = dropBackground(input);
  if (!comps.length) return [];
  const heights = comps.map(c => boxHeight(c.box));
  const typical = percentile(heights, 0.75) || 1;
  const big = comps.filter(c => boxHeight(c.box) >= typical * 0.4);
  const small = comps.filter(c => boxHeight(c.box) < typical * 0.4);

  // 1. Linhas a partir das formas grandes, por sobreposição vertical com o miolo da linha.
  type RowAcc = { comps: Component[]; top: number; bottom: number };
  const rows: RowAcc[] = [];
  const core = (r: RowAcc) => ({ top: median(r.comps.map(c => c.box.y0)), bottom: median(r.comps.map(c => c.box.y1)) });
  for (const c of [...big].sort((a, b) => (a.box.y0 + a.box.y1) - (b.box.y0 + b.box.y1))) {
    const h = boxHeight(c.box);
    const row = rows.find(r => overlap(r.top, r.bottom, c.box.y0, c.box.y1) >= 0.5 * Math.min(h, r.bottom - r.top));
    if (row) {
      row.comps.push(c);
      Object.assign(row, core(row));
    } else rows.push({ comps: [c], top: c.box.y0, bottom: c.box.y1 });
  }
  // 2. Formas pequenas (pingos, acentos, pontuação) vão para a linha mais próxima.
  for (const c of small) {
    const cy = (c.box.y0 + c.box.y1) / 2;
    let best: RowAcc | null = null;
    let bestDist = Infinity;
    for (const r of rows) {
      const d = cy < r.top ? r.top - cy : cy > r.bottom ? cy - r.bottom : 0;
      if (d < bestDist) { bestDist = d; best = r; }
    }
    if (best && bestDist <= (best.bottom - best.top) * 0.9) best.comps.push(c);
    else rows.push({ comps: [c], top: c.box.y0, bottom: c.box.y1 });
  }
  rows.sort((a, b) => a.top - b.top);

  // 3. Dentro da linha, junta o que se sobrepõe na horizontal (i, j, %, ;, =, !).
  let nextId = 0;
  const out: SheetRow[] = rows.map((r, rowIndex) => {
    const rowH = Math.max(1e-6, r.bottom - r.top);
    const isBig = (b: Box) => boxHeight(b) >= rowH * 0.6;
    const groups: { comps: Component[]; box: Box }[] = [];
    for (const c of [...r.comps].sort((a, b) => a.box.x0 - b.box.x0)) {
      const g = groups.find(gr => {
        const ov = overlap(gr.box.x0, gr.box.x1, c.box.x0, c.box.x1);
        if (ov <= 0) return false;
        const narrow = Math.min(boxWidth(gr.box), boxWidth(c.box)) || 1e-6;
        return ov >= narrow * (isBig(gr.box) && isBig(c.box) ? 0.6 : 0.25);
      });
      if (g) { g.comps.push(c); g.box = unionBox(g.box, c.box); }
      else groups.push({ comps: [c], box: c.box });
    }
    groups.sort((a, b) => a.box.x0 - b.box.x0);

    // 4. Marcas pequenas lado a lado e bem próximas formam um glifo só (aspas, trema).
    // "Pequena" é medida contra a letra típica da folha, não contra a linha: numa
    // linha só de sinais (´ ` ˆ ˜ ¨), os pingos do trema têm a altura da própria linha.
    const smallLimit = Math.max(rowH, typical) * 0.5;
    const gaps = groups.slice(1).map((g, k) => g.box.x0 - groups[k].box.x1).filter(v => v > 0);
    const typicalGap = median(gaps);
    for (let k = 0; k < groups.length - 1; k++) {
      const a = groups[k];
      const b = groups[k + 1];
      const gap = b.box.x0 - a.box.x1;
      const bothSmall = boxHeight(a.box) < smallLimit && boxHeight(b.box) < smallLimit;
      const sameHeight = overlap(a.box.y0, a.box.y1, b.box.y0, b.box.y1) >= 0.5 * Math.min(boxHeight(a.box), boxHeight(b.box));
      if (bothSmall && sameHeight && typicalGap > 0 && gap < typicalGap * 0.5) {
        a.comps.push(...b.comps);
        a.box = unionBox(a.box, b.box);
        groups.splice(k + 1, 1);
        k--;
      }
    }
    return {
      top: r.top,
      bottom: r.bottom,
      baseline: r.bottom,
      groups: groups.map(g => ({ id: nextId++, components: g.comps, box: g.box, row: rowIndex })),
    };
  });
  return out;
}

export function readSheet(svgText: string): Sheet {
  const { shapes, strokeOnly } = readSvgShapes(svgText);
  return sheetFromShapes(shapes, strokeOnly);
}

/** A mesma leitura a partir de formas já extraídas (de um SVG ou das páginas de um PDF). */
export function sheetFromShapes(shapes: SvgShape[], strokeOnly = 0): Sheet {
  const rows = groupComponents(shapesToComponents(shapes));
  let box: Box = { x0: 0, y0: 0, x1: 1, y1: 1 };
  const all = rows.flatMap(r => r.groups);
  if (all.length) box = all.map(g => g.box).reduce(unionBox);
  return { rows, box, strokeOnly };
}

export const sheetGroups = (sheet: Sheet): SheetGroup[] => sheet.rows.flatMap(r => r.groups);

/** Junta um glifo ao seguinte da mesma linha (ajuste manual do agrupamento). */
export function mergeWithNext(sheet: Sheet, groupId: number): Sheet {
  return {
    ...sheet,
    rows: sheet.rows.map(r => {
      const i = r.groups.findIndex(g => g.id === groupId);
      if (i < 0 || i >= r.groups.length - 1) return r;
      const a = r.groups[i];
      const b = r.groups[i + 1];
      const merged: SheetGroup = { ...a, components: [...a.components, ...b.components], box: unionBox(a.box, b.box) };
      return { ...r, groups: [...r.groups.slice(0, i), merged, ...r.groups.slice(i + 2)] };
    }),
  };
}

/** Separa um glifo nos seus componentes. */
export function splitGroup(sheet: Sheet, groupId: number): Sheet {
  let nextId = Math.max(0, ...sheetGroups(sheet).map(g => g.id)) + 1;
  return {
    ...sheet,
    rows: sheet.rows.map(r => {
      const i = r.groups.findIndex(g => g.id === groupId);
      if (i < 0 || r.groups[i].components.length < 2) return r;
      const parts = [...r.groups[i].components]
        .sort((a, b) => a.box.x0 - b.box.x0)
        .map((c, k): SheetGroup => ({ id: k === 0 ? groupId : nextId++, components: [c], box: c.box, row: r.groups[i].row }));
      return { ...r, groups: [...r.groups.slice(0, i), ...parts, ...r.groups.slice(i + 1)] };
    }),
  };
}

/* ---------------------------------------------------------- linha de base */

/**
 * Linha de base de cada linha. Primeiro pelos caracteres de pé reto (H, n, 1),
 * depois pelos redondos (O, o, ponto), e, sem nenhum dos dois, pela base mais
 * comum entre os que não descem nem ficam no alto.
 */
export function detectBaselines(sheet: Sheet, chars: string[]): Sheet {
  const charOf = new Map<number, string>();
  sheetGroups(sheet).forEach((g, i) => { if (chars[i]) charOf.set(g.id, chars[i]); });
  return {
    ...sheet,
    rows: sheet.rows.map(r => {
      const pick = (set: Set<string>) => r.groups.filter(g => set.has(charOf.get(g.id) || '')).map(g => g.box.y1);
      const flat = pick(FLAT_BOTTOM);
      const round = pick(ROUND_BOTTOM);
      let baseline: number;
      if (flat.length) baseline = median(flat);
      else if (round.length) baseline = median(round);
      else {
        const neutral = r.groups.filter(g => {
          const c = charOf.get(g.id) || '';
          return !DESCENDS.has(c) && !RAISED.has(c);
        });
        baseline = modeOf((neutral.length ? neutral : r.groups).map(g => g.box.y1), (r.bottom - r.top) * 0.02);
      }
      return { ...r, baseline };
    }),
  };
}

/** Valor mais frequente, agrupando o que difere menos que `tol`. */
function modeOf(values: number[], tol: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  let best: number[] = [s[0]];
  for (let i = 0; i < s.length; i++) {
    const cluster = s.filter(v => v >= s[i] && v <= s[i] + Math.max(tol, 1e-6));
    if (cluster.length > best.length) best = cluster;
  }
  return median(best);
}

export function setRowBaseline(sheet: Sheet, rowIndex: number, baseline: number): Sheet {
  return { ...sheet, rows: sheet.rows.map((r, i) => (i === rowIndex ? { ...r, baseline } : r)) };
}

/* ---------------------------------------------------------- guias */

/** Altura das maiúsculas, altura-x, ascendente e descendente lidas da folha (unidades do documento). */
export function measureGuides(sheet: Sheet, chars: string[]): SheetGuides {
  const entries = sheetGroups(sheet).map((g, i) => ({ g, c: chars[i], base: sheet.rows[g.row]?.baseline ?? g.box.y1 }));
  const find = (refs: string[], f: (e: (typeof entries)[number]) => number) => {
    for (const ref of refs) {
      const hits = entries.filter(e => e.c === ref).map(f).filter(v => v > 0);
      if (hits.length) return median(hits);
    }
    return undefined;
  };
  return {
    cap: find(CAP_REFS, e => e.base - e.g.box.y0),
    x: find(X_REFS, e => e.base - e.g.box.y0),
    asc: find(ASC_REFS, e => e.base - e.g.box.y0),
    desc: find(DESC_REFS, e => e.g.box.y1 - e.base),
  };
}

/** Altura de maiúscula de referência da folha, com alternativas quando não há maiúsculas. */
export function sourceCapHeight(guides: SheetGuides, sheet: Sheet): number {
  if (guides.cap) return guides.cap;
  if (guides.asc) return guides.asc * 0.95;
  if (guides.x) return guides.x / 0.7;
  const hs = sheetGroups(sheet).map(g => boxHeight(g.box));
  return percentile(hs, 0.75) || 1;
}

/* ---------------------------------------------------------- glifos */

/**
 * Leva um grupo da folha para o espaço do glifo: x a partir da tinta, y para
 * cima a partir da linha de base. É só translação e espelhamento vertical,
 * nenhum ponto muda de lugar em relação aos outros.
 */
export function groupOutline(group: SheetGroup, baseline: number): Cmd[] {
  const x0 = group.box.x0;
  return group.components.flatMap(c => c.contours.flatMap(contour => mapCmds(contour, (x, y): Pt => [x - x0, baseline - y])));
}

export function newGlyph(char: string, outline: Cmd[], srcCap: number, keep?: Glyph): Glyph {
  return {
    char,
    outline,
    srcCap,
    scale: 1,
    yOffset: 0,
    lsb: keep?.lsb ?? 0,
    rsb: keep?.rsb ?? 0,
    locked: false,
  };
}

/** Cria os glifos de uma folha já mapeada para caracteres. */
export function sheetToGlyphs(sheet: Sheet, chars: string[], srcCap: number): Glyph[] {
  const out: Glyph[] = [];
  sheetGroups(sheet).forEach((g, i) => {
    const c = chars[i];
    if (!c) return;
    out.push(newGlyph(c, groupOutline(g, sheet.rows[g.row].baseline), srcCap));
  });
  return out;
}

/* ---------------------------------------------------------- glifo avulso */

/**
 * Um SVG colado para um caractere. A escala vem da folha (se já houver uma) ou
 * da classe do caractere; a posição vertical segue o que o caractere costuma
 * ter: pé na linha de base, descendentes pendurados na altura-x, aspas no alto.
 */
export function pastedGlyph(
  svgText: string,
  char: string,
  metrics: { capHeight: number; xHeight: number; ascender: number },
  styleSrcCap?: number,
): { glyph: Glyph; srcCap: number } {
  const comps = shapesToComponents(readSvgShapes(svgText).shapes);
  if (!comps.length) throw new Error('Nenhuma forma preenchida no SVG.');
  const box = comps.map(c => c.box).reduce(unionBox);
  const h = boxHeight(box) || 1;
  const main = comps.reduce((a, b) => (boxHeight(b.box) > boxHeight(a.box) ? b : a));
  let srcCap = styleSrcCap;
  if (!srcCap) {
    if ('acemnorsuvwxz'.includes(char)) srcCap = h * (metrics.capHeight / metrics.xHeight);
    else if ('bdfhklt'.includes(char)) srcCap = h * (metrics.capHeight / metrics.ascender);
    else srcCap = h;
  }
  const s = metrics.capHeight / srcCap;
  let baseline = box.y1; // pé na linha de base
  if ('gpqy'.includes(char)) baseline = main.box.y0 + (metrics.xHeight / s);
  else if (char === 'j') baseline = main.box.y0 + (metrics.xHeight / s);
  else if (RAISED.has(char)) baseline = box.y0 + metrics.capHeight / s;
  const group: SheetGroup = { id: 0, components: comps, box, row: 0 };
  return { glyph: newGlyph(char, groupOutline(group, baseline), srcCap), srcCap };
}

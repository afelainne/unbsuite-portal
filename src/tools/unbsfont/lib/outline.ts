import type { Cmd, Glyph, Metrics } from './types';
import { type Box, cmdsBox, flatten, mapCmds, splitContours, toPathData } from './geometry';

/**
 * Da unidade de origem para a unidade da fonte. Uma escala uniforme (a altura
 * das maiúsculas declarada sobre a medida na folha) e uma translação: é a única
 * coisa que acontece com o desenho.
 */
export const glyphScale = (g: Glyph, m: Metrics) => (m.capHeight / (g.srcCap || 1)) * (g.scale || 1);

/** Contorno em unidades da fonte, tinta a partir de x = 0 (sem margem), sem arredondar. */
export function inkOutline(g: Glyph, m: Metrics): Cmd[] {
  const s = glyphScale(g, m);
  return mapCmds(g.outline, (x, y) => [x * s, y * s + g.yOffset]);
}

// Caches presos ao array do contorno (que as cópias do glifo compartilham), não ao objeto:
// mudar a margem não obriga a medir o desenho de novo.
const boxCache = new WeakMap<Cmd[], Map<string, Box>>();
const shapeKey = (g: Glyph, m: Metrics) => `${m.capHeight}:${g.srcCap}:${g.scale}:${g.yOffset}`;

/** Caixa da tinta em unidades da fonte. */
export function inkBox(g: Glyph, m: Metrics): Box {
  const key = shapeKey(g, m);
  let inner = boxCache.get(g.outline);
  if (!inner) boxCache.set(g.outline, (inner = new Map()));
  let b = inner.get(key);
  if (!b) {
    b = g.outline.length ? cmdsBox(inkOutline(g, m)) : { x0: 0, y0: 0, x1: 0, y1: 0 };
    inner.set(key, b);
  }
  return b;
}

export const advanceOf = (g: Glyph, m: Metrics) => {
  const b = inkBox(g, m);
  return Math.max(0, Math.round(g.lsb + (b.x1 - b.x0) + g.rsb));
};

/** Contorno final do glifo, em inteiros: o que vai para o arquivo. */
export function placedOutline(g: Glyph, m: Metrics): Cmd[] {
  const s = glyphScale(g, m);
  const dx = g.lsb - inkBox(g, m).x0;
  return mapCmds(g.outline, (x, y) => [Math.round(x * s + dx), Math.round(y * s + g.yOffset)]);
}

/* ---------------------------------------------------------- perfis */

/**
 * Perfil lateral: em cada altura (passo fixo, alinhado entre glifos), o x da
 * tinta mais à esquerda e mais à direita. NaN onde não há tinta. É a base do
 * espaçamento e do kerning automáticos.
 */
export interface Profile {
  step: number;
  /** Índice da primeira amostra: a altura da amostra i é (k0 + i + 0,5) · step. */
  k0: number;
  left: Float64Array;
  right: Float64Array;
  box: Box;
}

export const sampleY = (p: Profile, i: number) => (p.k0 + i + 0.5) * p.step;

export function computeProfile(cmds: Cmd[], step: number): Profile {
  const edges: number[] = [];
  for (const contour of splitContours(cmds)) {
    const pts = flatten(contour, step / 8);
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) edges.push(pts[j][0], pts[j][1], pts[i][0], pts[i][1]);
  }
  const box = cmds.length ? cmdsBox(cmds) : { x0: 0, y0: 0, x1: 0, y1: 0 };
  const k0 = Math.floor(box.y0 / step);
  const k1 = Math.ceil(box.y1 / step);
  const n = Math.max(0, k1 - k0);
  const left = new Float64Array(n).fill(NaN);
  const right = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    const y = (k0 + i + 0.5) * step;
    let lo = Infinity;
    let hi = -Infinity;
    for (let e = 0; e < edges.length; e += 4) {
      const y1 = edges[e + 1];
      const y2 = edges[e + 3];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        const x = edges[e] + ((y - y1) * (edges[e + 2] - edges[e])) / (y2 - y1);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    if (lo <= hi) { left[i] = lo; right[i] = hi; }
  }
  return { step, k0, left, right, box };
}

/** Todas as travessias de uma horizontal com o contorno (para medir contraformas). */
export function crossings(cmds: Cmd[], y: number): number[] {
  const xs: number[] = [];
  for (const contour of splitContours(cmds)) {
    const pts = flatten(contour, 1);
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [x1, y1] = pts[j];
      const [x2, y2] = pts[i];
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
  }
  return xs.sort((a, b) => a - b);
}

const profileCache = new WeakMap<Cmd[], Map<string, Profile>>();

export const profileStep = (m: Metrics) => Math.max(1, m.unitsPerEm / 200);

/** Perfil em unidades da fonte com a tinta começando em x = 0. */
export function glyphProfile(g: Glyph, m: Metrics): Profile {
  const step = profileStep(m);
  const key = `${shapeKey(g, m)}:${step}`;
  let inner = profileCache.get(g.outline);
  if (!inner) profileCache.set(g.outline, (inner = new Map()));
  let p = inner.get(key);
  if (!p) {
    const x0 = inkBox(g, m).x0;
    p = computeProfile(mapCmds(inkOutline(g, m), (x, y) => [x - x0, y]), step);
    inner.set(key, p);
  }
  return p;
}

const pathCache = new WeakMap<Cmd[], Map<string, string>>();

/** `d` do glifo já posicionado (com a margem esquerda), para desenhar em SVG com y para cima. */
export function glyphPathData(g: Glyph, m: Metrics): string {
  const key = `${shapeKey(g, m)}:${g.lsb}`;
  let inner = pathCache.get(g.outline);
  if (!inner) pathCache.set(g.outline, (inner = new Map()));
  let d = inner.get(key);
  if (d === undefined) {
    d = toPathData(placedOutline(g, m));
    inner.set(key, d);
  }
  return d;
}

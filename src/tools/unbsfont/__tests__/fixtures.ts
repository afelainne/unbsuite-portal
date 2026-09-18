import type { Cmd, Glyph } from '../lib/types';
import { newGlyph } from '../lib/sheet';

/** Formas sintéticas de letras, em coordenadas de fonte (y para cima, linha de base em 0). */
export type Poly = [number, number][];

export const LETTERS: Record<string, { polys: Poly[]; circles?: [number, number, number, number][] }> = {
  H: { polys: [[[0, 0], [100, 0], [100, 300], [400, 300], [400, 0], [500, 0], [500, 700], [400, 700], [400, 380], [100, 380], [100, 700], [0, 700]]] },
  A: {
    polys: [
      [[0, 0], [110, 0], [160, 160], [440, 160], [490, 0], [600, 0], [360, 700], [240, 700]],
      [[190, 250], [410, 250], [300, 590]],
    ],
  },
  V: { polys: [[[240, 0], [360, 0], [600, 700], [490, 700], [300, 130], [110, 700], [0, 700]]] },
  T: { polys: [[[250, 0], [350, 0], [350, 620], [600, 620], [600, 700], [0, 700], [0, 620], [250, 620]]] },
  x: { polys: [[[0, 0], [100, 0], [225, 180], [350, 0], [450, 0], [275, 250], [450, 500], [350, 500], [225, 320], [100, 500], [0, 500], [175, 250]]] },
  n: {
    polys: [[[0, 0], [90, 0], [90, 380], [150, 420], [300, 420], [330, 380], [330, 0], [420, 0], [420, 420], [350, 500], [150, 500], [90, 450], [90, 500], [0, 500]]],
  },
  // Anéis: [cx, cy, rx, ry] externo e interno.
  O: { polys: [], circles: [[300, 350, 300, 360], [300, 350, 200, 260]] },
  o: { polys: [], circles: [[250, 250, 250, 260], [250, 250, 160, 170]] },
};

const K = 0.5522847498307936;

/** Elipse em cúbicas, em y para cima; `ccw` escolhe o sentido. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, ccw: boolean): Cmd[] {
  const kx = rx * K;
  const ky = ry * K;
  const pts = [
    { type: 'M', x: cx + rx, y: cy },
    { type: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { type: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
    { type: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { type: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { type: 'Z' },
  ] as Cmd[];
  if (ccw) return pts;
  // Sentido horário: espelha em y em torno do centro.
  return pts.map(c => {
    if (c.type === 'Z') return c;
    if (c.type === 'C') return { ...c, y1: 2 * cy - c.y1, y2: 2 * cy - c.y2, y: 2 * cy - c.y };
    return { ...c, y: 2 * cy - (c as { y: number }).y };
  }) as Cmd[];
}

export function polyCmds(poly: Poly, reverse = false): Cmd[] {
  const pts = reverse ? [...poly].reverse() : poly;
  return [
    { type: 'M', x: pts[0][0], y: pts[0][1] },
    ...pts.slice(1).map(([x, y]): Cmd => ({ type: 'L', x, y })),
    { type: 'Z' },
  ];
}

/** Glifo sintético direto em unidades da fonte (altura das maiúsculas 700 = escala 1). */
export function letter(char: string): Glyph {
  const def = LETTERS[char];
  const outline: Cmd[] = [];
  def.polys.forEach((p, i) => outline.push(...polyCmds(p, i > 0)));
  if (def.circles) {
    const [outer, inner] = def.circles;
    outline.push(...ellipse(outer[0], outer[1], outer[2], outer[3], true));
    outline.push(...ellipse(inner[0], inner[1], inner[2], inner[3], false));
  }
  // Leva a tinta para começar em x = 0, como na importação.
  const x0 = Math.min(...outline.flatMap(c => ('x' in c ? [c.x] : [])));
  const shifted = outline.map(c => {
    if (c.type === 'Z') return c;
    if (c.type === 'C') return { ...c, x1: c.x1 - x0, x2: c.x2 - x0, x: c.x - x0 };
    if (c.type === 'Q') return { ...c, x1: c.x1 - x0, x: c.x - x0 };
    return { ...c, x: c.x - x0 };
  }) as Cmd[];
  return newGlyph(char, shifted, 700);
}

/* ---------------------------------------------------------- folha SVG */

/** Converte polígonos em y para cima para um `d` no espaço da folha (y para baixo). */
export const sheetPoly = (poly: Poly, ox: number, base: number) =>
  `M${poly.map(([x, y]) => `${x + ox} ${base - y}`).join(' L')} Z`;

/**
 * Folha com duas linhas: "HOAVT" (linha de base em 800) e "noxij%;\"" (linha de
 * base em 1800), com peças soltas para testar o agrupamento.
 */
export function syntheticSheet(): string {
  const parts: string[] = [];
  const b1 = 800;
  let x = 100;
  const gap = 150;
  const put = (poly: Poly, ox: number, base: number, attrs = '') => parts.push(`<path ${attrs} d="${sheetPoly(poly, ox, base)}"/>`);
  // Linha 1
  put(LETTERS.H.polys[0], x, b1); x += 500 + gap;
  // O como caminho com arcos e evenodd (contornos no mesmo sentido).
  parts.push(`<path fill-rule="evenodd" d="M${x} ${b1 - 350} a300 360 0 1 0 600 0 a300 360 0 1 0 -600 0 Z M${x + 100} ${b1 - 350} a200 260 0 1 0 400 0 a200 260 0 1 0 -400 0 Z"/>`);
  x += 600 + gap;
  parts.push(`<path fill-rule="evenodd" d="${sheetPoly(LETTERS.A.polys[0], x, b1)} ${sheetPoly(LETTERS.A.polys[1], x, b1)}"/>`);
  x += 600 + gap;
  put(LETTERS.V.polys[0], x, b1); x += 600 + gap;
  // T em duas formas que se sobrepõem (haste e barra), dentro de um grupo com transformação.
  parts.push(`<g transform="translate(${x} 0)"><rect x="250" y="${b1 - 650}" width="100" height="650"/><rect x="0" y="${b1 - 700}" width="600" height="80"/></g>`);

  // Linha 2
  const b2 = 1800;
  x = 100;
  put(LETTERS.n.polys[0], x, b2); x += 420 + gap;
  // o com o furo em sentido oposto (regra não-zero, como exporta o Illustrator).
  parts.push(`<path d="M${x} ${b2 - 250} a250 260 0 1 0 500 0 a250 260 0 1 0 -500 0 Z M${x + 90} ${b2 - 250} a160 170 0 1 1 320 0 a160 170 0 1 1 -320 0 Z"/>`);
  x += 500 + gap;
  put(LETTERS.x.polys[0], x, b2); x += 450 + gap;
  // i: haste e pingo
  parts.push(`<rect x="${x}" y="${b2 - 500}" width="90" height="500"/><rect x="${x}" y="${b2 - 670}" width="90" height="90"/>`);
  x += 90 + gap;
  // j: haste descendente e pingo
  parts.push(`<rect x="${x}" y="${b2 - 500}" width="90" height="700"/><circle cx="${x + 45}" cy="${b2 - 625}" r="45"/>`);
  x += 90 + gap;
  // %: dois círculos e a barra
  parts.push(`<circle cx="${x + 80}" cy="${b2 - 600}" r="80"/><circle cx="${x + 320}" cy="${b2 - 100}" r="80"/>`);
  put([[0, 0], [80, 0], [400, 700], [320, 700]], x, b2);
  x += 400 + gap;
  // ; ponto e vírgula
  parts.push(`<rect x="${x}" y="${b2 - 490}" width="90" height="90"/>`);
  put([[0, 90], [90, 90], [90, 10], [30, -140], [0, -140], [40, 0], [0, 0]], x, b2);
  x += 90 + gap;
  // " duas marcas
  parts.push(`<rect x="${x}" y="${b2 - 700}" width="60" height="200"/><rect x="${x + 110}" y="${b2 - 700}" width="60" height="200"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5000 2200"><style>.guide{fill:none;stroke:#f0f}</style><rect class="guide" x="0" y="0" width="5000" height="2200"/>${parts.join('')}</svg>`;
}

export const SHEET_SEQUENCE = 'HOAVT\nnoxij%;"';

import { describe, expect, it } from 'vitest';
import type { Cmd, Glyph } from '../lib/types';
import {
  DESCRIPTOR_PREFIX, MARK_COLOR, cartelaSvg, cells, decodeDescriptor, encodeDescriptor, makeSpec, marks, pageCount, placeInCell,
  type CartelaSpec, type Paper,
} from '../lib/cartela';
import { readSvgUpload, type Upload, type UploadContext } from '../lib/upload';
import { DEFAULT_METRICS } from '../lib/project';
import { DEFAULT_SEQUENCE, sequenceChars } from '../lib/charset';
import { inkOutline } from '../lib/outline';
import { cmdPoints } from '../lib/geometry';
import { letter, syntheticSheet } from './fixtures';

const m = DEFAULT_METRICS;
const chars = sequenceChars(DEFAULT_SEQUENCE);
const spec = makeSpec({ chars, metrics: m, family: 'Teste', style: 'Regular' });
const ctx = (s: CartelaSpec = spec): UploadContext => ({ fallback: (paper: Paper) => ({ ...makeSpec({ chars: s.chars, metrics: m, paper }) }), keep: {} });

/** Desenhos sintéticos em unidades da fonte, postos nas células dos caracteres pedidos. */
function inked(s: CartelaSpec, list: string[], extra: Cmd[][] = []): Cmd[][] {
  const grid = cells(s);
  return [
    ...list.map(c => {
      const cell = grid.find(g => g.char === c)!;
      return placeInCell(s, cell, letter(c === '.' ? 'o' : c).outline.map(cmd => (c === '.' && cmd.type !== 'Z' ? scaleCmd(cmd, 0.25) : cmd)));
    }),
    ...extra,
  ];
}

function scaleCmd(c: Cmd, k: number): Cmd {
  if (c.type === 'C') return { ...c, x1: c.x1 * k, y1: c.y1 * k, x2: c.x2 * k, y2: c.y2 * k, x: c.x * k, y: c.y * k };
  if (c.type === 'Q') return { ...c, x1: c.x1 * k, y1: c.y1 * k, x: c.x * k, y: c.y * k };
  if (c.type === 'Z') return c;
  return { ...c, x: c.x * k, y: c.y * k };
}

const sortedPoints = (cmds: Cmd[]) => cmdPoints(cmds).map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

function expectSameOutline(g: Glyph, char: string) {
  const got = inkOutline(g, m);
  const want = letter(char).outline;
  const a = sortedPoints(got);
  const b = sortedPoints(want);
  expect(a.length).toBe(b.length);
  a.forEach((p, i) => {
    expect(p[0]).toBeCloseTo(b[i][0], 3);
    expect(p[1]).toBeCloseTo(b[i][1], 3);
  });
}

const asCartela = (u: Upload) => {
  expect(u.kind).toBe('cartela');
  if (u.kind !== 'cartela') throw new Error('não reconheceu a cartela');
  return u.result;
};

/** Simula uma reexportação: tudo dentro de um grupo escalado e deslocado. */
const transformAll = (svg: string, t: string) => svg.replace(/(<svg[^>]*>)/, `$1<g transform="${t}">`).replace('</svg>', '</g></svg>');
const stripDescriptor = (svg: string) => svg.replace(new RegExp(`${DESCRIPTOR_PREFIX}[A-Za-z0-9+/=]+`, 'g'), '');

describe('cartela: geometria', () => {
  it('uma célula por caractere, 10 colunas, em ordem', () => {
    const grid = cells(spec);
    expect(grid.length).toBe(chars.length);
    expect(spec.cols).toBe(10);
    expect(pageCount(spec)).toBe(1);
    expect(grid[0]).toMatchObject({ x: spec.gridX, y: spec.gridY, char: 'A' });
    expect(grid[1].x - grid[0].x).toBeCloseTo(spec.cellW, 9);
    expect(grid[10].x).toBeCloseTo(spec.gridX, 9);
    expect(grid[10].y - grid[0].y).toBeCloseTo(spec.cellH, 9);
    // Linha de base dentro da célula, abaixo do topo da ascendente.
    grid.forEach(c => { expect(c.baseline).toBeGreaterThan(c.y); expect(c.baseline).toBeLessThan(c.y + c.h); });
  });

  it('pagina quando não cabe e empilha as páginas no SVG', () => {
    const many = makeSpec({ chars: Array.from({ length: 150 }, (_, i) => String.fromCharCode(0x100 + i)), metrics: m });
    expect(pageCount(many)).toBe(2);
    const grid = cells(many);
    const first2 = grid[many.cols * many.rowsPerPage];
    expect(first2.page).toBe(1);
    expect(first2.y).toBeCloseTo(many.pageH + many.pageGap + many.gridY, 9);
    expect(marks(many).length).toBe(8);
  });

  it('o descritor vai e volta igual', () => {
    const back = decodeDescriptor(`lixo ${encodeDescriptor(spec)} mais lixo`);
    expect(back).toEqual(spec);
    expect(decodeDescriptor(cartelaSvg(spec))).toEqual(spec);
    expect(decodeDescriptor(`${DESCRIPTOR_PREFIX}bm90IGpzb24gYXQgYWxs`)).toBeNull();
  });

  it('o SVG tem marcas nos quatro cantos, guias e instruções', () => {
    const svg = cartelaSvg(spec);
    expect(svg.match(/id="unbsfont-marca-/g)?.length).toBe(4);
    expect(svg).toContain('Desenhe cada glifo na sua célula, sobre a linha de base. Não mova as marcas de registro.');
    expect(svg).toContain(`fill="${MARK_COLOR}"`);
  });
});

describe('cartela: volta do SVG', () => {
  const drawn = ['H', 'A', 'O', 'n', 'x', 'o', 'T', 'V'];

  it('a cartela vazia não reconhece nenhum glifo', () => {
    const r = asCartela(readSvgUpload(cartelaSvg(spec), ctx()));
    expect(r.recognized).toEqual([]);
    expect(r.empty.length).toBe(chars.length);
    expect(r.outside).toBe(0);
  });

  it('põe cada desenho no caractere da célula, com os pontos intactos', () => {
    const r = asCartela(readSvgUpload(cartelaSvg(spec, inked(spec, drawn)), ctx()));
    expect(r.source).toBe('descritor');
    expect([...r.recognized].sort()).toEqual([...drawn].sort());
    expect(r.empty.length).toBe(chars.length - drawn.length);
    expect(r.scale).toBeCloseTo(1, 9);
    for (const c of drawn) expectSameOutline(r.glyphs.find(g => g.char === c)!, c);
  });

  it('aguenta o arquivo escalado 1,5× e deslocado', () => {
    const svg = transformAll(cartelaSvg(spec, inked(spec, drawn)), 'translate(37 -21) scale(1.5)');
    const r = asCartela(readSvgUpload(svg, ctx()));
    expect(r.source).toBe('descritor');
    expect(r.scale).toBeCloseTo(1.5, 6);
    expect([...r.recognized].sort()).toEqual([...drawn].sort());
    for (const c of drawn) expectSameOutline(r.glyphs.find(g => g.char === c)!, c);
  });

  it('sem descritor, acha a grade pelas marcas de registro', () => {
    const svg = stripDescriptor(transformAll(cartelaSvg(spec, inked(spec, drawn)), 'translate(-12 40) scale(0.8)'));
    expect(decodeDescriptor(svg)).toBeNull();
    const r = asCartela(readSvgUpload(svg, ctx()));
    expect(r.source).toBe('marcas');
    expect([...r.recognized].sort()).toEqual([...drawn].sort());
    for (const c of drawn) expectSameOutline(r.glyphs.find(g => g.char === c)!, c);
  });

  it('sem descritor e sem as cores, as marcas valem pelo desenho (com o e ponto na grade)', () => {
    const svg = stripDescriptor(cartelaSvg(spec, inked(spec, [...drawn, '.'])))
      .replace(new RegExp(MARK_COLOR, 'g'), '#000000')
      .replace(/id="unbsfont-[^"]*"/g, '');
    const r = asCartela(readSvgUpload(svg, ctx()));
    expect(r.source).toBe('marcas');
    expect([...r.recognized].sort()).toEqual([...drawn, '.'].sort());
  });

  it('ignora formas fora das células e resolve as que cruzam a borda', () => {
    const grid = cells(spec);
    const hCell = grid.find(g => g.char === 'H')!;
    const outsideShape: Cmd[] = [{ type: 'M', x: 5, y: 300 }, { type: 'L', x: 25, y: 300 }, { type: 'L', x: 25, y: 320 }, { type: 'Z' }];
    // H posto bem à direita: passa um pouco para a célula seguinte, mas a maior parte fica na dele.
    const shifted = placeInCell(spec, hCell, letter('H').outline, 30);
    const r = asCartela(readSvgUpload(cartelaSvg(spec, [shifted, outsideShape]), ctx()));
    expect(r.outside).toBe(1);
    expect(r.recognized).toEqual(['H']);
    expectSameOutline(r.glyphs[0], 'H');
  });

  it('funciona com mais de uma página', () => {
    const many = makeSpec({ chars: [...chars, ...Array.from('ÁÉÍÓÚÀÂÊÔÃÕÇáéíóúàâêôãõç')], metrics: m, paper: 'letter' });
    expect(pageCount(many)).toBe(2);
    const last = many.chars[many.chars.length - 1];
    const grid = cells(many);
    const ink = [placeInCell(many, grid.find(c => c.char === last)!, letter('o').outline), placeInCell(many, grid[0], letter('H').outline)];
    const r = asCartela(readSvgUpload(stripDescriptor(cartelaSvg(many, ink)), ctx(many)));
    expect(r.source).toBe('marcas');
    expect(r.spec.paper).toBe('letter');
    expect(r.recognized).toEqual([many.chars[0], last]);
  });

  it('uma folha livre continua sendo lida em ordem de leitura', () => {
    const u = readSvgUpload(syntheticSheet(), ctx());
    expect(u.kind).toBe('folha');
  });
});

import { describe, expect, it } from 'vitest';
import type { Cmd } from '../lib/types';
import { cells, makeSpec, pageCount, placeInCell, type Paper } from '../lib/cartela';
import { cartelaPdfString, pdfText } from '../lib/cartelaPdf';
import { operatorListToShapes, readPdf, type PdfOps } from '../lib/pdfRead';
import { pdfPagesToUpload, type UploadContext } from '../lib/upload';
import { DEFAULT_METRICS } from '../lib/project';
import { DEFAULT_SEQUENCE, sequenceChars } from '../lib/charset';
import { inkOutline } from '../lib/outline';
import { cmdPoints } from '../lib/geometry';
import { letter } from './fixtures';

const m = DEFAULT_METRICS;
const chars = sequenceChars(DEFAULT_SEQUENCE);

const sortedPoints = (cmds: Cmd[]) => cmdPoints(cmds).map(([x, y]) => [x, y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

/* Os mesmos códigos do pdf.js (OPS), para testar a conversão sem ele. */
const OPS: PdfOps = {
  save: 10, restore: 11, transform: 12, moveTo: 13, lineTo: 14, curveTo: 15, curveTo2: 16, curveTo3: 17, closePath: 18, rectangle: 19,
  stroke: 20, closeStroke: 21, fill: 22, eoFill: 23, fillStroke: 24, eoFillStroke: 25, closeFillStroke: 26, closeEOFillStroke: 27, endPath: 28,
  setStrokeRGBColor: 58, setFillRGBColor: 59, paintFormXObjectBegin: 74, paintFormXObjectEnd: 75, paintImageXObject: 85, constructPath: 91,
};

describe('PDF: operadores → formas', () => {
  const view: [number, number, number, number] = [0, 0, 200, 100];

  it('refaz caminhos do formato atual (DrawOPS) com a matriz corrente e vira y para baixo', () => {
    const data = new Float32Array([0, 10, 10, 1, 30, 10, 2, 30, 20, 20, 30, 10, 30, 4]);
    const r = operatorListToShapes(
      [OPS.save, OPS.transform, OPS.setFillRGBColor, OPS.constructPath, OPS.restore, OPS.constructPath],
      [[], [2, 0, 0, 2, 5, 0], ['#000000'], [OPS.fill, [data], null], [], [OPS.stroke, [new Float32Array([0, 0, 0, 1, 5, 5])], null]],
      OPS, view,
    );
    expect(r.shapes.length).toBe(1);
    expect(r.strokeOnly).toBe(1);
    const c = r.shapes[0].contours[0];
    // (10,10) → cm (2,0,0,2,5,0) → (25,20) → y para baixo: (25, 80)
    expect(c[0]).toEqual({ type: 'M', x: 25, y: 80 });
    expect(c[1]).toEqual({ type: 'L', x: 65, y: 80 });
    expect(c[2]).toEqual({ type: 'C', x1: 65, y1: 60, x2: 45, y2: 40, x: 25, y: 40 });
  });

  it('aceita o formato antigo (operações + coordenadas, pintura separada), com re, v e y', () => {
    const r = operatorListToShapes(
      [OPS.constructPath, OPS.eoFill, OPS.constructPath, OPS.endPath],
      [[[OPS.rectangle], [10, 10, 20, 30]], [], [[OPS.moveTo, OPS.curveTo2, OPS.curveTo3, OPS.closePath], [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]], []],
      OPS, view,
    );
    expect(r.shapes.length).toBe(1);
    expect(r.shapes[0].fillRule).toBe('evenodd');
    expect(r.shapes[0].contours[0].slice(0, 3)).toEqual([{ type: 'M', x: 10, y: 90 }, { type: 'L', x: 30, y: 90 }, { type: 'L', x: 30, y: 60 }]);
  });

  it('conta imagens e ignora fundo branco', () => {
    const r = operatorListToShapes(
      [OPS.setFillRGBColor, OPS.constructPath, OPS.paintImageXObject],
      [['#ffffff'], [OPS.fill, [new Float32Array([0, 0, 0, 1, 10, 0, 1, 10, 10, 4])], null], ['img']],
      OPS, view,
    );
    expect(r.shapes.length).toBe(0);
    expect(r.images).toBe(1);
  });
});

describe('PDF: escrita da cartela', () => {
  it('é um PDF 1.4 com uma página por página da cartela e o descritor nos metadados', () => {
    const spec = makeSpec({ chars, metrics: m });
    const pdf = cartelaPdfString(spec);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Count 1');
    expect(pdf).toContain('/MediaBox [0 0 595.276 841.89]');
    expect(pdf).toMatch(/\/Keywords \(UNBSFONT-CARTELA:/);
    // xref aponta para o início de cada objeto
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
  });

  it('texto em WinAnsi, com acentos em octal', () => {
    expect(pdfText('Não (é)')).toBe('(N\\343o \\(\\351\\))');
    expect(pdfText('“ok”')).toBe('(\\223ok\\224)');
    expect(pdfText('Ω')).toBe('(U+03A9)');
  });
});

/*
 * Ida e volta de verdade pelo pdf.js (build legado, que roda no Node sem
 * worker). Se um dia ele não carregar aqui, os testes de cima continuam
 * cobrindo a conversão dos operadores.
 */
describe('PDF: ida e volta pelo pdf.js', () => {
  const ctx = (list: string[]): UploadContext => ({ fallback: (paper: Paper) => makeSpec({ chars: list, metrics: m, paper }), keep: {} });
  const load = () => import('pdfjs-dist/legacy/build/pdf.mjs');

  it('reconhece os glifos desenhados nas células, em duas páginas, com os pontos intactos', async () => {
    const list = [...chars, ...Array.from('ÁÉÍÓÚÀÂÊÔÃÕÇáéíóúàâêôãõç')];
    const spec = makeSpec({ chars: list, metrics: m, paper: 'letter' });
    expect(pageCount(spec)).toBe(2);
    const grid = cells(spec);
    const drawn = ['H', 'A', 'O', 'n'];
    const lastChar = list[list.length - 1];
    const ink: Cmd[][][] = [[], []];
    for (const c of drawn) ink[0].push(placeInCell(spec, grid.find(g => g.char === c)!, letter(c).outline));
    ink[1].push(placeInCell(spec, grid.find(g => g.char === lastChar)!, letter('o').outline));
    const bytes = new TextEncoder().encode(cartelaPdfString(spec, ink));

    const lib = await load();
    const pdf = await readPdf(bytes.buffer.slice(0) as ArrayBuffer, lib as never);
    expect(pdf.pages.length).toBe(2);
    const up = pdfPagesToUpload(pdf, ctx(list));
    expect(up.kind).toBe('cartela');
    if (up.kind !== 'cartela') return;
    expect(up.result.source).toBe('descritor');
    expect(up.result.recognized).toEqual([...drawn.sort((a, b) => list.indexOf(a) - list.indexOf(b)), lastChar]);
    for (const c of drawn) {
      const got = sortedPoints(inkOutline(up.result.glyphs.find(g => g.char === c)!, m));
      const want = sortedPoints(letter(c).outline);
      expect(got.length).toBe(want.length);
      // O PDF guarda 3 casas em pontos (0,02 unidade da fonte nesta escala).
      got.forEach((p, i) => { expect(Math.abs(p[0] - want[i][0])).toBeLessThan(0.05); expect(Math.abs(p[1] - want[i][1])).toBeLessThan(0.05); });
    }
  });

  it('sem descritor, acha a grade pelas marcas em cada página', async () => {
    const spec = makeSpec({ chars, metrics: m });
    const grid = cells(spec);
    const ink = [[placeInCell(spec, grid.find(g => g.char === 'x')!, letter('x').outline)]];
    const text = cartelaPdfString(spec, ink).replace(/UNBSFONT-CARTELA:[A-Za-z0-9+/=]+/g, 'UNBSFONT-CARTELA');
    // Refaz o xref, que mudou de lugar com o texto menor.
    const fixed = rebuildXref(text);
    const lib = await load();
    const pdf = await readPdf(new TextEncoder().encode(fixed).buffer as ArrayBuffer, lib as never);
    const up = pdfPagesToUpload(pdf, ctx(chars));
    expect(up.kind).toBe('cartela');
    if (up.kind !== 'cartela') return;
    expect(up.result.source).toBe('marcas');
    expect(up.result.recognized).toEqual(['x']);
  });

  it('PDF só com imagem avisa que o desenho precisa ser vetorial', () => {
    expect(() => pdfPagesToUpload({ pages: [{ shapes: [], strokeOnly: 0, images: 1, width: 100, height: 100 }], text: '' }, ctx(chars)))
      .toThrow(/vetorial/);
  });
});

function rebuildXref(pdf: string): string {
  const body = pdf.slice(0, pdf.indexOf('xref\n'));
  const offsets: number[] = [];
  const re = /(\d+) 0 obj\n/g;
  let mt: RegExpExecArray | null;
  while ((mt = re.exec(body))) offsets[Number(mt[1])] = mt.index;
  const count = offsets.length - 1;
  let out = `${body}xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= count; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  return `${out}trailer\n<< /Size ${count + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${body.length}\n%%EOF\n`;
}

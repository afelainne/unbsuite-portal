import type { Cmd } from './types';
import { splitContours } from './geometry';
import type { SvgShape } from './svg';
import { GUIDE_COLOR, isTemplateColor } from './cartela';

/**
 * Leitura de PDF vetorial. O pdf.js só é baixado quando alguém sobe um PDF;
 * dele usamos a lista de operadores de cada página (nada é desenhado nem
 * executado). Os caminhos são refeitos com a matriz corrente (cm, q/Q e
 * XObjects de formulário) e entregues no mesmo formato das formas de um SVG:
 * pontos, y para baixo, origem no canto de cima da página.
 */

export interface PdfPageShapes {
  shapes: SvgShape[];
  strokeOnly: number;
  images: number;
  width: number;
  height: number;
}

export interface PdfReadResult {
  pages: PdfPageShapes[];
  /** Texto onde o descritor da cartela pode estar (metadados e texto das páginas). */
  text: string;
}

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

/** Códigos do pdf.js que interessam aqui (os nomes são os de `OPS`). */
export type PdfOps = Record<string, number>;

/** Códigos de desenho dentro de `constructPath` (DrawOPS do pdf.js 5+). */
const DRAW = { moveTo: 0, lineTo: 1, curveTo: 2, quadraticCurveTo: 3, closePath: 4 };

const colorOf = (args: unknown[]): string | undefined => {
  const a = args?.[0];
  if (typeof a === 'string') return a.toLowerCase();
  if (typeof a === 'number' && args.length >= 3) {
    const hex = (v: unknown) => Math.max(0, Math.min(255, Math.round(Number(v)))).toString(16).padStart(2, '0');
    return `#${hex(args[0])}${hex(args[1])}${hex(args[2])}`;
  }
  return undefined;
};

const WHITE = /^#fff(fff)?$/;

/**
 * Lista de operadores → formas preenchidas. Aceita o `constructPath` do pdf.js
 * atual (`[pintura, [dados], caixa]`, com os DrawOPS) e o antigo
 * (`[operações, coordenadas]`, com a pintura num operador separado).
 */
export function operatorListToShapes(
  fnArray: ArrayLike<number>,
  argsArray: ArrayLike<unknown>,
  OPS: PdfOps,
  view: [number, number, number, number],
): PdfPageShapes {
  const [vx0, vy0, vx1, vy1] = view;
  const shapes: SvgShape[] = [];
  let strokeOnly = 0;
  let images = 0;
  let ctm: Matrix = IDENTITY;
  let fill = '#000000';
  let stroke = '#000000';
  const stack: { ctm: Matrix; fill: string; stroke: string }[] = [];
  let pending: Cmd[] = [];

  const pt = (x: number, y: number): [number, number] => {
    const X = ctm[0] * x + ctm[2] * y + ctm[4];
    const Y = ctm[1] * x + ctm[3] * y + ctm[5];
    return [X - vx0, vy1 - Y];
  };

  const paint = (op: number) => {
    const isFill = [OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(op);
    const isStroke = op === OPS.stroke || op === OPS.closeStroke;
    const path = pending;
    pending = [];
    if (!path.length) return;
    if (isFill) {
      if (WHITE.test(fill) || fill === 'transparent') return;
      const contours = splitContours(path);
      if (!contours.length) return;
      const evenodd = op === OPS.eoFill || op === OPS.eoFillStroke || op === OPS.closeEOFillStroke;
      shapes.push({ contours, fillRule: evenodd ? 'evenodd' : 'nonzero', fill });
    } else if (isStroke && !isTemplateColor(stroke, [GUIDE_COLOR])) {
      strokeOnly++;
    }
  };

  const readDrawOps = (data: ArrayLike<number>) => {
    for (let i = 0; i < data.length;) {
      switch (data[i++]) {
        case DRAW.moveTo: { const [x, y] = pt(data[i++], data[i++]); pending.push({ type: 'M', x, y }); break; }
        case DRAW.lineTo: { const [x, y] = pt(data[i++], data[i++]); pending.push({ type: 'L', x, y }); break; }
        case DRAW.curveTo: {
          const [x1, y1] = pt(data[i++], data[i++]);
          const [x2, y2] = pt(data[i++], data[i++]);
          const [x, y] = pt(data[i++], data[i++]);
          pending.push({ type: 'C', x1, y1, x2, y2, x, y });
          break;
        }
        case DRAW.quadraticCurveTo: {
          const [x1, y1] = pt(data[i++], data[i++]);
          const [x, y] = pt(data[i++], data[i++]);
          pending.push({ type: 'Q', x1, y1, x, y });
          break;
        }
        case DRAW.closePath: pending.push({ type: 'Z' }); break;
        default: return; // código desconhecido: melhor parar do que ler errado
      }
    }
  };

  // Formato antigo: operações do PDF (m, l, c, v, y, h, re) com as coordenadas em sequência.
  const readLegacy = (ops: ArrayLike<number>, coords: ArrayLike<number>) => {
    let j = 0;
    let cx = 0, cy = 0;
    const raw = () => [coords[j++], coords[j++]] as const;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op === OPS.moveTo) { const [x, y] = raw(); cx = x; cy = y; const p = pt(x, y); pending.push({ type: 'M', x: p[0], y: p[1] }); }
      else if (op === OPS.lineTo) { const [x, y] = raw(); cx = x; cy = y; const p = pt(x, y); pending.push({ type: 'L', x: p[0], y: p[1] }); }
      else if (op === OPS.curveTo || op === OPS.curveTo2 || op === OPS.curveTo3) {
        let a: readonly [number, number], b: readonly [number, number], e: readonly [number, number];
        if (op === OPS.curveTo) { a = raw(); b = raw(); e = raw(); }
        else if (op === OPS.curveTo2) { a = [cx, cy]; b = raw(); e = raw(); }
        else { a = raw(); e = raw(); b = e; }
        const p1 = pt(a[0], a[1]), p2 = pt(b[0], b[1]), p = pt(e[0], e[1]);
        pending.push({ type: 'C', x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], x: p[0], y: p[1] });
        cx = e[0]; cy = e[1];
      } else if (op === OPS.closePath) pending.push({ type: 'Z' });
      else if (op === OPS.rectangle) {
        const [x, y] = raw();
        const [w, h] = raw();
        const c = [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)];
        pending.push({ type: 'M', x: c[0][0], y: c[0][1] }, ...c.slice(1).map(([px, py]): Cmd => ({ type: 'L', x: px, y: py })), { type: 'Z' });
        cx = x; cy = y;
      }
    }
  };

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = (argsArray[i] || []) as unknown[];
    if (fn === OPS.save) stack.push({ ctm, fill, stroke });
    else if (fn === OPS.restore) { const s = stack.pop(); if (s) ({ ctm, fill, stroke } = s); }
    else if (fn === OPS.transform) ctm = multiply(ctm, args.map(Number) as Matrix);
    else if (fn === OPS.paintFormXObjectBegin) {
      stack.push({ ctm, fill, stroke });
      const m = args[0] as ArrayLike<number> | null;
      if (m && m.length === 6) ctm = multiply(ctm, Array.from(m) as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) { const s = stack.pop(); if (s) ({ ctm, fill, stroke } = s); }
    else if (fn === OPS.setFillRGBColor) fill = colorOf(args) ?? fill;
    else if (fn === OPS.setStrokeRGBColor) stroke = colorOf(args) ?? stroke;
    else if (fn === OPS.setFillTransparent) fill = 'transparent';
    else if (fn === OPS.constructPath) {
      const a0 = args[0];
      if (typeof a0 === 'number') {
        // pdf.js 5+: [pintura, [dados], caixa]
        const data = (args[1] as unknown[] | undefined)?.[0] as ArrayLike<number> | null | undefined;
        if (data) readDrawOps(data);
        paint(a0);
      } else if (a0 && typeof a0 === 'object') {
        readLegacy(a0 as ArrayLike<number>, (args[1] || []) as ArrayLike<number>);
      }
    } else if ([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke, OPS.stroke, OPS.closeStroke].includes(fn)) {
      paint(fn);
    } else if (fn === OPS.endPath) pending = [];
    else if ([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat, OPS.paintImageMaskXObjectGroup, OPS.paintImageMaskXObjectRepeat, OPS.paintInlineImageXObjectGroup].includes(fn)) {
      images++;
    }
  }
  return { shapes, strokeOnly, images, width: vx1 - vx0, height: vy1 - vy0 };
}

/* ------------------------------------------------------------ pdf.js */

type PdfJs = typeof import('pdfjs-dist');
let loading: Promise<PdfJs> | null = null;

/** Carrega o pdf.js e o worker sob demanda (um pedaço separado do build). */
function loadPdfJs(): Promise<PdfJs> {
  if (!loading) {
    loading = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
    loading.catch(() => { loading = null; });
  }
  return loading;
}

const MAX_PDF_BYTES = 40 * 1024 * 1024;

export async function readPdf(data: ArrayBuffer, lib?: PdfJs): Promise<PdfReadResult> {
  if (data.byteLength > MAX_PDF_BYTES) throw new Error('PDF grande demais (limite de 40 MB).');
  // O descritor da cartela costuma estar em texto puro no arquivo que o UNBSFONT gerou.
  const head = new TextDecoder('latin1').decode(new Uint8Array(data));
  const pdfjs = lib ?? (await loadPdfJs());
  // Só erros no console: avisos de fonte padrão não interessam a quem só quer os caminhos.
  const task = pdfjs.getDocument({ data: new Uint8Array(data), enableXfa: false, verbosity: pdfjs.VerbosityLevel.ERRORS });
  const doc = await task.promise;
  try {
    const texts: string[] = [head];
    try {
      const meta = await doc.getMetadata();
      const info = (meta.info || {}) as Record<string, unknown>;
      for (const k of ['Keywords', 'Subject', 'Title']) if (typeof info[k] === 'string') texts.push(info[k] as string);
    } catch { /* sem metadados */ }
    const pages: PdfPageShapes[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const list = await page.getOperatorList();
      const view = page.view as [number, number, number, number];
      pages.push(operatorListToShapes(list.fnArray, list.argsArray, pdfjs.OPS as unknown as PdfOps, view));
      try {
        const tc = await page.getTextContent();
        texts.push(tc.items.map(it => ('str' in it ? it.str : '')).join(''));
      } catch { /* sem texto */ }
      page.cleanup();
    }
    return { pages, text: texts.join('\n') };
  } finally {
    void task.destroy();
  }
}

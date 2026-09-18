import type { Glyph } from './types';
import type { SvgShape } from './svg';
import { readSvgShapes } from './svg';
import { sheetFromShapes, type Sheet } from './sheet';
import { decodeDescriptor, readCartela, skipTemplateElement, type CartelaResult, type CartelaSpec, type Paper } from './cartela';
import { readPdf, type PdfReadResult } from './pdfRead';

/**
 * Um arquivo que sobe na Entrada: descobre sozinho se é a cartela (descritor ou
 * marcas de registro) ou uma folha livre (lida em ordem de leitura).
 */

export type Upload =
  | { kind: 'cartela'; format: 'svg' | 'pdf'; result: CartelaResult; strokeOnly: number }
  | { kind: 'folha'; format: 'svg' | 'pdf'; sheet: Sheet };

export interface UploadContext {
  /** Cartela que seria gerada agora (ordem de caracteres e métricas atuais), por papel. */
  fallback: (paper: Paper) => CartelaSpec;
  /** Glifos atuais do estilo, para manter as margens de quem for substituído. */
  keep: Record<string, Glyph>;
}

export const isPdfFile = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export function readSvgUpload(text: string, ctx: UploadContext): Upload {
  const { shapes, strokeOnly } = readSvgShapes(text, { skip: skipTemplateElement });
  const result = readCartela([{ shapes }], decodeDescriptor(text), ctx.fallback, ctx.keep);
  if (result) return { kind: 'cartela', format: 'svg', result, strokeOnly };
  return { kind: 'folha', format: 'svg', sheet: sheetFromShapes(shapes, strokeOnly) };
}

/** Mesma decisão para o que saiu do PDF (separado da leitura para dar para testar sem o pdf.js). */
export function pdfPagesToUpload(pdf: PdfReadResult, ctx: UploadContext): Upload {
  const drawnShapes = pdf.pages.reduce((a, p) => a + p.shapes.length, 0);
  const images = pdf.pages.reduce((a, p) => a + p.images, 0);
  const strokeOnly = pdf.pages.reduce((a, p) => a + p.strokeOnly, 0);
  if (!drawnShapes) {
    throw new Error(images
      ? 'Este PDF só tem imagens. O desenho precisa ser vetorial: exporte com os contornos, sem rasterizar.'
      : 'Nenhuma forma preenchida no PDF.');
  }
  const result = readCartela(pdf.pages.map((p, i) => ({ shapes: p.shapes, page: i })), decodeDescriptor(pdf.text), ctx.fallback, ctx.keep);
  if (result) return { kind: 'cartela', format: 'pdf', result, strokeOnly };
  // Folha livre: as páginas uma embaixo da outra, na ordem.
  const stacked: SvgShape[] = [];
  let top = 0;
  for (const page of pdf.pages) {
    const dy = top;
    stacked.push(...page.shapes.map(sh => ({
      ...sh,
      contours: sh.contours.map(c => c.map(cmd => {
        if (cmd.type === 'Z') return cmd;
        if (cmd.type === 'C') return { ...cmd, y1: cmd.y1 + dy, y2: cmd.y2 + dy, y: cmd.y + dy };
        if (cmd.type === 'Q') return { ...cmd, y1: cmd.y1 + dy, y: cmd.y + dy };
        return { ...cmd, y: cmd.y + dy };
      })),
    })));
    top += page.height * 1.05;
  }
  return { kind: 'folha', format: 'pdf', sheet: sheetFromShapes(stacked, strokeOnly) };
}

export async function readPdfUpload(data: ArrayBuffer, ctx: UploadContext): Promise<Upload> {
  return pdfPagesToUpload(await readPdf(data), ctx);
}

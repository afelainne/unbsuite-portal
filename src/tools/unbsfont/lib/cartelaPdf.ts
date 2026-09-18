import type { Cmd } from './types';
import { GUIDE_COLOR, MARK_COLOR, TEXT_COLOR, encodeDescriptor, scene, type CartelaSpec, type SceneItem } from './cartela';

/**
 * PDF vetorial da cartela, escrito à mão (sem dependência), no mesmo molde do
 * escritor do UNBSFORMAT. Cada página do PDF tem o tamanho do papel e usa as
 * mesmas coordenadas da faixa correspondente do SVG: um `cm` inverte o eixo y
 * e desloca a página, então nada é recalculado.
 */

const n = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
};

/* Caracteres do WinAnsiEncoding fora do Latin-1 (faixa 0x80–0x9F). */
const WIN_ANSI: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/** Texto em string literal do PDF, em WinAnsi. O que não cabe na codificação vira U+XXXX. */
export function pdfText(text: string): string {
  let out = '(';
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0) || 0;
    let code: number | undefined;
    if (cp >= 0x20 && cp < 0x7f) code = cp;
    else if (cp >= 0xa0 && cp <= 0xff) code = cp;
    else code = WIN_ANSI[cp];
    if (code === undefined) {
      out += `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
      continue;
    }
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${String.fromCharCode(code)}`;
    else if (code < 0x7f) out += String.fromCharCode(code);
    else out += `\\${code.toString(8).padStart(3, '0')}`;
  }
  return `${out})`;
}

function pathOps(cmds: Cmd[]): string {
  const out: string[] = [];
  let px = 0, py = 0;
  for (const c of cmds) {
    if (c.type === 'M') out.push(`${n(c.x)} ${n(c.y)} m`);
    else if (c.type === 'L') out.push(`${n(c.x)} ${n(c.y)} l`);
    else if (c.type === 'C') out.push(`${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)} c`);
    else if (c.type === 'Q') {
      // O PDF não tem quadrática: a cúbica equivalente é exata.
      const x1 = px + (2 / 3) * (c.x1 - px), y1 = py + (2 / 3) * (c.y1 - py);
      const x2 = c.x + (2 / 3) * (c.x1 - c.x), y2 = c.y + (2 / 3) * (c.y1 - c.y);
      out.push(`${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(c.x)} ${n(c.y)} c`);
    } else out.push('h');
    if (c.type !== 'Z') { px = c.x; py = c.y; }
  }
  return out.join(' ');
}

function drawItem(it: SceneItem): string {
  switch (it.kind) {
    case 'line':
      return `q ${n(it.width)} w ${it.dash ? `[${it.dash.map(n).join(' ')}] 0 d ` : ''}${n(it.x1)} ${n(it.y1)} m ${n(it.x2)} ${n(it.y2)} l S Q`;
    case 'rect':
      return `q ${n(it.width)} w ${it.dash ? `[${it.dash.map(n).join(' ')}] 0 d ` : ''}${n(it.x)} ${n(it.y)} ${n(it.w)} ${n(it.h)} re S Q`;
    case 'text':
      // O texto desvira o eixo y localmente para não sair espelhado.
      return `BT /${it.bold ? 'F2' : 'F1'} ${n(it.size)} Tf 1 0 0 -1 ${n(it.x)} ${n(it.y)} Tm ${pdfText(it.text)} Tj ET`;
    case 'mark':
      return `${pathOps(it.cmds)} f*`;
    case 'ink':
      return `${pathOps(it.cmds)} f`;
  }
}

/** Monta o PDF. `ink` são formas por página, nas coordenadas da cartela (as mesmas do SVG). */
export function cartelaPdfString(s: CartelaSpec, ink: Cmd[][][] = []): string {
  const pages = scene(s);
  const contents = pages.map((p, i) => {
    const guides = p.guides.filter(g => g.kind !== 'text');
    const texts = p.guides.filter(g => g.kind === 'text');
    return [
      // Pontos, y para baixo, origem no canto de cima da página i (a faixa i do SVG).
      `1 0 0 -1 0 ${n(s.pageH + p.top)} cm`,
      `q ${rgb(GUIDE_COLOR)} RG`, ...guides.map(drawItem), 'Q',
      `q ${rgb(TEXT_COLOR)} rg`, ...texts.map(drawItem), 'Q',
      `q ${rgb(MARK_COLOR)} rg`, ...p.marks.map(drawItem), 'Q',
      'q 0 0 0 rg', ...(ink[i] || []).map(cmds => drawItem({ kind: 'ink', cmds })), 'Q',
    ].join('\n');
  });

  // 1 catálogo, 2 páginas, 3 e 4 fontes, 5 informações, depois pares (página, conteúdo).
  const first = 6;
  const kids = pages.map((_, i) => `${first + i * 2} 0 R`).join(' ');
  const title = ['Cartela UNBSFONT', s.family, s.style].filter(Boolean).join(' - ');
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title ${pdfText(title)} /Subject (${encodeDescriptor(s)}) /Keywords (${encodeDescriptor(s)}) /Creator (UNBSFONT) /Producer (UNBSFONT) >>`,
  ];
  contents.forEach((content, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(s.pageW)} ${n(s.pageH)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${first + i * 2 + 1} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

/** O conteúdo é todo ASCII (acentos saem em octal), então cada caractere é um byte. */
export function cartelaPdf(s: CartelaSpec, ink: Cmd[][][] = []): Blob {
  return new Blob([cartelaPdfString(s, ink)], { type: 'application/pdf' });
}

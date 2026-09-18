// Escritor de PDF mínimo, sem dependência externa.
//
// - Uma página de PDF por página do documento (o espelho sai em duas páginas;
//   o folheto com dobra sai como uma folha aberta).
// - MediaBox inclui uma margem de trabalho para as marcas; TrimBox = formato
//   final; BleedBox = corte + sangria.
// - Marcas de corte e de dobra em cor de registro (CMYK 100/100/100/100), fora da sangria.
// - Todas as guias vão num grupo de conteúdo opcional (camada) marcado para
//   aparecer na tela e NÃO sair na impressão (/PrintState /OFF).

import type { GridConfig, GridResult, Rect } from './grid';
import { buildScene, Layers, SceneItem } from './scene';
import { MM_PER_PT } from './units';

const K = 1 / MM_PER_PT; // mm → pt
/** Distância mínima das marcas de corte ao corte: 6 pt, o padrão do InDesign. */
export const MARK_OFFSET_MIN = 6 * MM_PER_PT;
export const MARK_LENGTH = 5;
const SLUG_EXTRA = 2;

/** 3 casas bastam e evitam notação científica no stream. */
const n = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
};

const pdfString = (s: string) =>
  '(' + s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1') + ')';

export interface PdfPageGeometry {
  region: Rect;
  slug: number;
  markOffset: number;
  mediaBox: [number, number, number, number];
  trimBox: [number, number, number, number];
  bleedBox: [number, number, number, number];
}

/** Regiões (em mm, coordenadas da folha) que viram páginas do PDF. */
export function pdfRegions(c: GridConfig, r: GridResult): Rect[] {
  if (c.fold === 'none' && c.facing) return r.pages.map(p => p.trim);
  return [{ x: 0, y: 0, w: r.width, h: r.height }];
}

export function pageGeometry(region: Rect, bleed: number): PdfPageGeometry {
  const markOffset = Math.max(bleed, MARK_OFFSET_MIN);
  const slug = markOffset + MARK_LENGTH + SLUG_EXTRA;
  const W = region.w + 2 * slug;
  const H = region.h + 2 * slug;
  return {
    region,
    slug,
    markOffset,
    mediaBox: [0, 0, W * K, H * K],
    trimBox: [slug * K, slug * K, (slug + region.w) * K, (slug + region.h) * K],
    bleedBox: [(slug - bleed) * K, (slug - bleed) * K, (slug + region.w + bleed) * K, (slug + region.h + bleed) * K],
  };
}

interface GStates {
  names: Map<string, string>;
  get(fill: number, stroke: number): string;
}

function makeGStates(): GStates {
  const names = new Map<string, string>();
  return {
    names,
    get(fill, stroke) {
      const key = `${n(fill)}|${n(stroke)}`;
      let name = names.get(key);
      if (!name) {
        name = `GS${names.size}`;
        names.set(key, name);
      }
      return name;
    },
  };
}

const lw = (pt = 0.5) => n(pt * MM_PER_PT);

function drawItem(it: SceneItem, gs: GStates): string {
  const out: string[] = ['q'];
  if (it.type === 'rect') {
    const fo = it.fill ? it.fillOpacity ?? 1 : 1;
    if (fo < 1) out.push(`/${gs.get(fo, 1)} gs`);
    if (it.dash) out.push(`[${it.dash.map(d => lw(d)).join(' ')}] 0 d`);
    if (it.fill) out.push(`${rgb(it.fill)} rg`);
    if (it.stroke) out.push(`${rgb(it.stroke)} RG`, `${lw(it.weight)} w`);
    const op = it.fill && it.stroke ? 'B' : it.fill ? 'f' : 'S';
    out.push(`${n(it.x)} ${n(it.y)} ${n(it.w)} ${n(it.h)} re ${op}`);
  } else {
    if (it.opacity !== undefined && it.opacity < 1) out.push(`/${gs.get(1, it.opacity)} gs`);
    if (it.dash) out.push(`[${it.dash.map(d => lw(d)).join(' ')}] 0 d`);
    out.push(`${rgb(it.stroke)} RG`, `${lw(it.weight)} w`, `${n(it.x1)} ${n(it.y1)} m ${n(it.x2)} ${n(it.y2)} l S`);
  }
  out.push('Q');
  return out.join(' ');
}

function pageContent(g: PdfPageGeometry, items: SceneItem[], folds: number[], bleed: number, gs: GStates): string {
  const { region: R, slug } = g;
  const out: string[] = [];
  // Sistema de coordenadas em mm, y para baixo, origem no canto do corte desta página.
  out.push('q', `${n(K)} 0 0 ${n(-K)} ${n((slug - R.x) * K)} ${n((slug + R.h) * K)} cm`);

  // Guias: camada opcional que não imprime, recortada à sangria.
  out.push('/OC /Guias BDC', 'q', `${n(R.x - bleed)} ${n(-bleed)} ${n(R.w + 2 * bleed)} ${n(R.h + 2 * bleed)} re W n`);
  items.forEach(it => out.push(drawItem(it, gs)));
  out.push('Q', 'EMC');

  // Marcas de corte e de dobra: imprimem, em cor de registro.
  const o = g.markOffset;
  const L = MARK_LENGTH;
  const x0 = R.x;
  const x1 = R.x + R.w;
  const y1 = R.h;
  const seg = (ax: number, ay: number, bx: number, by: number) => out.push(`${n(ax)} ${n(ay)} m ${n(bx)} ${n(by)} l S`);
  out.push('q', '1 1 1 1 K', `${lw(0.25)} w`);
  // cantos: uma marca horizontal e uma vertical em cada
  seg(x0 - o - L, 0, x0 - o, 0); seg(x0, -o - L, x0, -o);
  seg(x1 + o, 0, x1 + o + L, 0); seg(x1, -o - L, x1, -o);
  seg(x0 - o - L, y1, x0 - o, y1); seg(x0, y1 + o, x0, y1 + o + L);
  seg(x1 + o, y1, x1 + o + L, y1); seg(x1, y1 + o, x1, y1 + o + L);
  // dobras: tracejadas, só na área de trabalho
  const inside = folds.filter(x => x > x0 + 0.01 && x < x1 - 0.01);
  if (inside.length) {
    out.push(`[${lw(3)} ${lw(2)}] 0 d`);
    inside.forEach(x => {
      seg(x, -o - L, x, -o);
      seg(x, y1 + o, x, y1 + o + L);
    });
  }
  out.push('Q', 'Q');
  return out.join('\n');
}

export interface PdfOptions {
  layers: Layers;
  title?: string;
}

/** Monta o arquivo PDF completo (um objeto por vez, xref com offsets corretos). */
export function buildPdfString(c: GridConfig, r: GridResult, opts: PdfOptions): string {
  const items = buildScene(c, r, { ...opts.layers, cotas: false });
  const regions = pdfRegions(c, r);
  const gs = makeGStates();
  const folds = c.fold === 'none' ? [] : r.folds;

  // Numeração: 1 catálogo, 2 árvore de páginas, 3 camada, 4 info, 5 estados gráficos, depois pares (página, conteúdo).
  const pageObjs: string[] = [];
  const contentObjs: string[] = [];
  regions.forEach(region => {
    const g = pageGeometry(region, c.bleed);
    const content = pageContent(g, items, folds, c.bleed, gs);
    pageObjs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [${g.mediaBox.map(n).join(' ')}] ` +
        `/TrimBox [${g.trimBox.map(n).join(' ')}] /BleedBox [${g.bleedBox.map(n).join(' ')}] ` +
        '/Resources << /ExtGState 5 0 R /Properties << /Guias 3 0 R >> >> /Contents CONTENT >>',
    );
    contentObjs.push(content);
  });

  const gsDict = [...gs.names.entries()]
    .map(([key, name]) => {
      const [ca, CA] = key.split('|');
      return `/${name} << /Type /ExtGState /ca ${ca} /CA ${CA} >>`;
    })
    .join(' ');

  const firstPage = 6;
  const kids = regions.map((_, i) => `${firstPage + i * 2} 0 R`).join(' ');
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [3 0 R] /D << /Name (Guias) /Order [3 0 R] /ON [3 0 R] ' +
      '/AS [<< /Event /Print /OCGs [3 0 R] /Category [/Print] >> << /Event /View /OCGs [3 0 R] /Category [/View] >>] >> >> >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${regions.length} >>`,
    `<< /Type /OCG /Name ${pdfString('Guias da grade (nao imprime)')} /Usage << /Print << /PrintState /OFF >> /View << /ViewState /ON >> >> >>`,
    `<< /Title ${pdfString(opts.title ?? c.formatName)} /Creator (UNBSFORMAT) /Producer (UNBSFORMAT) >>`,
    `<< ${gsDict} >>`,
  ];
  pageObjs.forEach((page, i) => {
    const contentNum = firstPage + i * 2 + 1;
    objects.push(page.replace('CONTENT', `${contentNum} 0 R`));
    const content = contentObjs[i];
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.5\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return pdf;
}

export function buildPdf(c: GridConfig, r: GridResult, opts: PdfOptions): Blob {
  return new Blob([buildPdfString(c, r, opts)], { type: 'application/pdf' });
}

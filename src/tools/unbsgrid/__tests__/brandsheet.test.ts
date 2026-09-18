import './paper-env';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import paper from 'paper';
import { parseSVG } from '../lib/svg-engine';
import { computeLogoMetrics } from '../lib/metrics';
import { createDefaultGeometryOptions, createDefaultGeometryStyles } from '../lib/preset-engine';
import type { SceneSettings } from '../lib/render-pipeline';
import { getSVGSize } from '../lib/export-engine';
import {
  MM_TO_PT, PX_TO_PT, PX_PER_MM, mmToPt, ptToMm, pxToPt, pageSizeMm, pageSizePt, pageSizeNative,
  pageLabel, isPageSize, isRotatable, pageUnit, pageFormat, PAGE_GROUPS, PAGE_SIZE_KEYS,
  computeSheetLayout, distributeHeights, balanceColumns, buildBrandSheet, blockLayerId,
  resolveBrandSheetOptions, resolveBlocks, createSheetUnits, sheetPalette,
  describeClearspace, brandSheetMetricRows, wrapText, minSizeSamples, formatSheetDate,
  sheetGuideScale, SHEET_GUIDE_UNIT_PT, BRAND_SHEET_BLOCKS, DEFAULT_BLOCKS,
  type BrandSheetBlockId, type SheetBlockChoice,
} from '../lib/brandsheet';
import {
  exportBrandSheetSVG, brandSheetPDFBytes, exportBrandSheetPDF, exportBrandSheetPNG,
  brandSheetFileName, clearBrandSheetCache, buildBrandSheetScene,
  defaultPngScale, defaultPngBackground,
} from '../lib/brandsheet-export';
import { createGuideMetrics } from '../components/renderers/scale';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandSheetPanel, { type BrandSheetPanelProps } from '../components/BrandSheetPanel';
import { TooltipProvider } from '../components/ui/tooltip';

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
  <circle cx="60" cy="60" r="50" fill="#112233"/>
  <path d="M130 20h90v20h-90z M130 60h60v20h-60z" fill="#445566"/>
  <path d="M130 100 C 150 80, 180 120, 220 100" fill="none" stroke="#778899" stroke-width="3"/>
</svg>`;

const settings = (over: Partial<SceneSettings> = {}): SceneSettings => ({
  clearspaceValue: 1,
  clearspaceUnit: 'logomark',
  showGrid: false,
  gridSubdivisions: 8,
  geometryOptions: { ...createDefaultGeometryOptions(), goldenRatio: true, boundingRects: true },
  geometryStyles: createDefaultGeometryStyles(),
  ...over,
});

// jsdom não tem object URLs
const urlApi = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
if (!urlApi.createObjectURL) urlApi.createObjectURL = () => 'blob:jsdom';
if (!urlApi.revokeObjectURL) urlApi.revokeObjectURL = () => {};

const parsedLogo = () => parseSVG(LOGO);

/** Todos os blocos ligados, na ordem padrão. */
const allBlocks = (): SheetBlockChoice[] => BRAND_SHEET_BLOCKS.map(id => ({ id, enabled: true }));

beforeEach(() => clearBrandSheetCache());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// ---------------------------------------------------------------------------

describe('unidades e páginas', () => {
  it('converte milímetros e pixels para pontos', () => {
    expect(MM_TO_PT).toBe(2.8346);
    expect(PX_TO_PT).toBe(0.75);
    expect(mmToPt(10)).toBeCloseTo(28.346, 5);
    expect(pxToPt(16)).toBe(12);
    expect(ptToMm(mmToPt(37))).toBeCloseTo(37, 6);
    expect(mmToPt(Number.NaN)).toBe(0);
  });

  it('página tem as dimensões certas em pontos', () => {
    expect(pageSizeMm('a4')).toEqual({ width: 210, height: 297 });
    const a4 = pageSizePt('a4', 'portrait');
    expect(a4.width).toBeCloseTo(210 * MM_TO_PT, 6);
    expect(a4.height).toBeCloseTo(297 * MM_TO_PT, 6);
    expect(a4.width).toBeCloseTo(595.27, 1);
    expect(a4.height).toBeCloseTo(841.87, 1);

    const a4l = pageSizePt('a4', 'landscape');
    expect(a4l.width).toBeCloseTo(a4.height, 6);
    expect(a4l.height).toBeCloseTo(a4.width, 6);

    const a3 = pageSizePt('a3');
    expect(a3.width).toBeCloseTo(297 * MM_TO_PT, 6);
    expect(a3.height).toBeCloseTo(420 * MM_TO_PT, 6);

    const letter = pageSizePt('letter');
    expect(letter.width).toBeCloseTo(215.9 * MM_TO_PT, 6);
    expect(letter.height).toBeCloseTo(279.4 * MM_TO_PT, 6);

    expect(isPageSize('a3')).toBe(true);
    expect(isPageSize('b5')).toBe(false);
    expect(pageLabel('a4', 'landscape')).toBe('A4 paisagem · 297 × 210 mm');
  });
});

describe('distribuição de alturas', () => {
  it('reparte por peso e respeita as mínimas', () => {
    const out = distributeHeights(100, [{ weight: 3, min: 0 }, { weight: 1, min: 0 }]);
    expect(out[0]).toBeCloseTo(75, 6);
    expect(out[1]).toBeCloseTo(25, 6);
    expect(out[0] + out[1]).toBeCloseTo(100, 6);

    const withMin = distributeHeights(100, [{ weight: 9, min: 0 }, { weight: 1, min: 30 }]);
    expect(withMin[1]).toBeCloseTo(30, 6);
    expect(withMin[0]).toBeCloseTo(70, 6);
  });

  it('encolhe proporcionalmente quando nem as mínimas cabem, e nunca devolve NaN', () => {
    const tight = distributeHeights(50, [{ weight: 1, min: 60 }, { weight: 1, min: 40 }]);
    expect(tight[0] + tight[1]).toBeCloseTo(50, 6);
    expect(tight.every(v => Number.isFinite(v) && v >= 0)).toBe(true);
    expect(distributeHeights(0, [{ weight: 1, min: 10 }])).toEqual([0]);
    expect(distributeHeights(10, [])).toEqual([]);
  });
});

describe('layout da folha', () => {
  it('tem todos os blocos dentro da página, sem sobreposição vertical', () => {
    const layout = computeSheetLayout({ page: 'a4', orientation: 'portrait', layout: 'single', blocks: allBlocks() });
    const ids = layout.blocks.map(b => b.id);
    for (const id of BRAND_SHEET_BLOCKS) expect(ids).toContain(id);

    for (const block of layout.blocks) {
      expect(block.frame.width).toBeGreaterThan(0);
      expect(block.frame.height).toBeGreaterThan(0);
      expect(block.frame.x).toBeGreaterThanOrEqual(0);
      expect(block.frame.y).toBeGreaterThanOrEqual(0);
      expect(block.frame.x + block.frame.width).toBeLessThanOrEqual(layout.page.width + 0.01);
      expect(block.frame.y + block.frame.height).toBeLessThanOrEqual(layout.page.height + 0.01);
    }

    const ordered = [...layout.blocks].sort((a, b) => a.frame.y - b.frame.y);
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1].frame;
      expect(ordered[i].frame.y).toBeGreaterThanOrEqual(prev.y + prev.height - 0.01);
    }
  });

  it('omite os blocos desligados e continua cabendo', () => {
    const layout = computeSheetLayout({
      showMetrics: false, showVersions: false, showMinSizes: false,
      blocks: [{ id: 'palette', enabled: false }],
    });
    const ids = layout.blocks.map(b => b.id);
    expect(ids).toEqual(['header', 'logo', 'clearspace', 'footer']);
    const last = layout.blocks[layout.blocks.length - 1].frame;
    expect(last.y + last.height).toBeLessThanOrEqual(layout.page.height + 0.01);
  });

  it('em paisagem coloca o logo numa coluna à esquerda', () => {
    const layout = computeSheetLayout({ orientation: 'landscape' });
    const logo = layout.blocks.find(b => b.id === 'logo')!;
    const metrics = layout.blocks.find(b => b.id === 'metrics')!;
    expect(logo.frame.x).toBeLessThan(metrics.frame.x);
    expect(logo.frame.height).toBeGreaterThan(metrics.frame.height);
    expect(metrics.frame.x + metrics.frame.width).toBeLessThanOrEqual(layout.page.width + 0.01);
  });
});

describe('conteúdo textual', () => {
  it('descreve a área de respiro por unidade', () => {
    expect(describeClearspace(1, 'logomark')).toBe('X = 1 × logotipo');
    expect(describeClearspace(12, 'pixels')).toBe('X = 12 px');
    expect(describeClearspace(0.5, 'centimeters')).toBe('X = 0,5 cm');
    expect(describeClearspace(0, 'logomark')).toBe('Área de respiro não definida');
  });

  it('monta a tabela de métricas com e sem dados', () => {
    const metrics = computeLogoMetrics(LOGO, { resolution: 64 });
    const rows = brandSheetMetricRows(metrics);
    const labels = rows.map(r => r.label);
    expect(labels).toContain('Proporção');
    expect(labels).toContain('Cobertura de tinta');
    expect(labels).toContain('Desvio do centro visual');
    expect(labels).toContain('Simetria (vertical / horizontal)');
    expect(labels).toContain('Nós');
    expect(rows.every(r => r.value.length > 0)).toBe(true);

    const empty = brandSheetMetricRows(null);
    expect(empty).toHaveLength(5);
    expect(empty.every(r => r.value === '—')).toBe(true);
  });

  it('quebra o texto do rodapé sem estourar a largura', () => {
    const lines = wrapText('Use sempre os arquivos originais e respeite a área de respiro desta folha.', 120, 7);
    expect(lines.length).toBeGreaterThan(1);
    const maxChars = Math.floor(120 / (7 * 0.5));
    expect(lines.every(l => l.length <= maxChars)).toBe(true);
    expect(lines.join(' ')).toContain('respiro');
    expect(wrapText('   ', 100, 7)).toEqual([]);
    expect(wrapText('supercalifragilisticoexpialidoso'.repeat(3), 30, 7).length).toBeGreaterThan(1);
  });

  it('gera as amostras de tamanho mínimo em pontos', () => {
    const samples = minSizeSamples([16, 24, 32, 48], [10, 15, 20]);
    expect(samples.map(s => s.label)).toEqual(['16 px', '24 px', '32 px', '48 px', '10 mm', '15 mm', '20 mm']);
    expect(samples[0].heightPt).toBe(12);
    expect(samples[4].heightPt).toBeCloseTo(28.346, 5);
  });

  it('formata a data e normaliza as opções', () => {
    expect(formatSheetDate(new Date(2026, 0, 9))).toBe('09/01/2026');
    expect(formatSheetDate('—')).toBe('—');
    const opts = resolveBrandSheetOptions({ title: '  ', pixelSizes: [-1, 0], page: 'b5' as never });
    expect(opts.title).toBe('Manual de marca');
    expect(opts.page).toBe('a4');
    expect(opts.pixelSizes).toEqual([16, 24, 32, 48]);
    expect(opts.footerNote.length).toBeGreaterThan(20);
  });
});

describe('escala das guias impressas', () => {
  it('mantém uma unidade de guia em ~0,75 pt qualquer que seja o tamanho do logo', () => {
    for (const diagonal of [180, 400, 1000, 2400]) {
      const scale = sheetGuideScale(diagonal);
      const m = createGuideMetrics({ width: diagonal, height: 0 }, { guideScale: scale });
      expect(m.unit).toBeCloseTo(SHEET_GUIDE_UNIT_PT, 6);
    }
    expect(sheetGuideScale(1000, 2)).toBeCloseTo(SHEET_GUIDE_UNIT_PT * 2, 6);
    expect(Number.isFinite(sheetGuideScale(0))).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('montagem da folha', () => {
  it('desenha uma camada por bloco, no tamanho da página', () => {
    const parsed = parsedLogo();
    const metrics = computeLogoMetrics(LOGO, { resolution: 64 });
    const sheet = buildBrandSheet(parsed, settings(), metrics, {
      fileName: 'marca.svg', subtitle: 'Identidade 2026', layout: 'single', blocks: allBlocks(),
    });

    expect(sheet.page.width).toBeCloseTo(pageSizePt('a4').width, 6);
    expect(sheet.page.height).toBeCloseTo(pageSizePt('a4').height, 6);
    expect(sheet.errors).toEqual([]);

    const names = sheet.project.layers.map(l => l.name);
    for (const id of BRAND_SHEET_BLOCKS) expect(names).toContain(blockLayerId(id as BrandSheetBlockId));
    expect(names).not.toContain('template');
    expect(names).not.toContain('brandsheet-scene-tmp');
    expect(sheet.project.layers.every(l => l.children.length > 0)).toBe(true);
  });

  it('mantém cada bloco dentro do seu quadro e dentro da página', () => {
    const parsed = parsedLogo();
    const sheet = buildBrandSheet(parsed, settings({ showGrid: true }), computeLogoMetrics(LOGO, { resolution: 64 }), {});
    const page = sheet.page;
    for (const block of sheet.blocks) {
      const layer = sheet.project.layers.find(l => l.name === blockLayerId(block.id));
      expect(layer, block.id).toBeTruthy();
      const b = layer!.strokeBounds;
      if (!(b.width > 0 || b.height > 0)) continue;
      const tol = 1.5;
      expect(b.left, `${block.id} esquerda`).toBeGreaterThanOrEqual(block.frame.x - tol);
      expect(b.top, `${block.id} topo`).toBeGreaterThanOrEqual(block.frame.y - tol);
      expect(b.right, `${block.id} direita`).toBeLessThanOrEqual(block.frame.x + block.frame.width + tol);
      expect(b.bottom, `${block.id} base`).toBeLessThanOrEqual(block.frame.y + block.frame.height + tol);
      expect(b.left).toBeGreaterThanOrEqual(-tol);
      expect(b.right).toBeLessThanOrEqual(page.width + tol);
      expect(b.bottom).toBeLessThanOrEqual(page.height + tol);
    }
  });

  it('desenha as amostras de tamanho mínimo na altura exata em pontos', () => {
    const parsed = parsedLogo();
    const sheet = buildBrandSheet(parsed, settings(), null, {});
    expect(sheet.warnings.some(w => /tamanhos mínimos/i.test(w))).toBe(false);
    const layer = sheet.project.layers.find(l => l.name === 'min-sizes')!;
    const strip = layer.children.find(c => c.name === 'min-size-strip')!;
    expect(strip).toBeTruthy();
    // 7 logos + 7 legendas
    const logos = strip.children.filter(c => !(c.className === 'PointText'));
    expect(logos).toHaveLength(7);
    const heights = logos.map(l => l.bounds.height).sort((a, b) => a - b);
    expect(heights[0]).toBeCloseTo(pxToPt(16), 3);
    expect(heights[heights.length - 1]).toBeCloseTo(mmToPt(20), 3);
  });

  it('não quebra sem logo e avisa', () => {
    const sheet = buildBrandSheet(null, settings(), null, { layout: 'single', blocks: allBlocks() });
    expect(sheet.warnings.some(w => /sem logo/i.test(w))).toBe(true);
    expect(sheet.errors).toEqual([]);
    const names = sheet.project.layers.map(l => l.name);
    for (const id of BRAND_SHEET_BLOCKS) expect(names).toContain(blockLayerId(id as BrandSheetBlockId));
    const svg = exportBrandSheetSVG({ parsed: null, settings: settings(), metrics: null });
    expect(svg).toContain('<svg');
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('respeita o que foi desligado', () => {
    const parsed = parsedLogo();
    const sheet = buildBrandSheet(parsed, settings(), null, {
      showClearspace: false, showMinSizes: false, showMetrics: false, showVersions: false,
    });
    const names = sheet.project.layers.map(l => l.name);
    expect(names).toContain('logo');
    expect(names).not.toContain('min-sizes');
    expect(names).not.toContain('versions');
  });
});

describe('export da folha', () => {
  it('SVG sai com a página inteira e um grupo por bloco', () => {
    const parsed = parsedLogo();
    const metrics = computeLogoMetrics(LOGO, { resolution: 64 });
    const input = { parsed, settings: settings(), metrics, options: { fileName: 'marca.svg', subtitle: 'Identidade' } };
    const svg = exportBrandSheetSVG(input);

    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    const size = getSVGSize(svg);
    expect(size.width).toBeCloseTo(pageSizePt('a4').width, 0);
    expect(size.height).toBeCloseTo(pageSizePt('a4').height, 0);

    for (const id of ['header', 'logo', 'clearspace', 'min-sizes', 'metrics', 'versions', 'footer']) {
      expect(svg).toContain(`id="${id}"`);
    }
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').getElementsByTagName('parsererror')).toHaveLength(0);
    // memoizado
    expect(exportBrandSheetSVG(input)).toBe(svg);
  });

  it('PDF tem cabeçalho e tabela de referências cruzadas válidos', () => {
    const parsed = parsedLogo();
    const metrics = computeLogoMetrics(LOGO, { resolution: 64 });
    const bytes = brandSheetPDFBytes({ parsed, settings: settings(), metrics, options: { title: 'Manual UNBS' } });
    let pdf = '';
    for (let i = 0; i < bytes.length; i++) pdf += String.fromCharCode(bytes[i]);

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);

    // página no tamanho A4 em pontos
    const media = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf);
    expect(media).not.toBeNull();
    expect(parseFloat(media![1])).toBeCloseTo(pageSizePt('a4').width, 0);
    expect(parseFloat(media![2])).toBeCloseTo(pageSizePt('a4').height, 0);

    // tabela de referências cruzadas
    const startxref = /startxref\s+(\d+)/.exec(pdf);
    expect(startxref).not.toBeNull();
    const xrefOffset = Number(startxref![1]);
    expect(pdf.slice(xrefOffset, xrefOffset + 4)).toBe('xref');

    const header = /^xref\n0 (\d+)\n/.exec(pdf.slice(xrefOffset));
    expect(header).not.toBeNull();
    const count = Number(header![1]);
    expect(count).toBeGreaterThan(1);

    const freeStart = xrefOffset + header![0].length;
    expect(pdf.slice(freeStart, freeStart + 20)).toBe('0000000000 65535 f \n');
    const entriesStart = freeStart + 20;
    for (let i = 1; i < count; i++) {
      const entry = pdf.slice(entriesStart + (i - 1) * 20, entriesStart + i * 20);
      expect(entry).toMatch(/^\d{10} 00000 n \n$/);
      const offset = Number(entry.slice(0, 10));
      expect(pdf.startsWith(`${i} 0 obj`, offset)).toBe(true);
    }

    const size = /\/Size (\d+)/.exec(pdf);
    expect(Number(size![1])).toBe(count);
    expect(pdf).toContain('/Root 1 0 R');
    // texto do cabeçalho e da tabela chegam ao conteúdo
    expect(pdf).toContain('(Manual UNBS)');
    expect(pdf).toContain('(Logotipo)');
    expect(pdf).toContain('(Positivo)');
    expect(pdf).toContain('(Negativo)');
    expect(pdf).toContain('(16 px)');
    expect(pdf).toContain('(20 mm)');
    // acentos viram escapes octais WinAnsi, não '?'
    expect(pdf).toContain('(M\\351tricas)');
    expect(pdf).toContain('(Vers\\365es)');
  });

  it('exportBrandSheetPDF devolve um Blob de PDF e o PNG rasteriza a página inteira', async () => {
    const parsed = parsedLogo();
    const blob = exportBrandSheetPDF({ parsed, settings: settings(), metrics: null });
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const drawn: number[][] = [];
    const canvasProto = HTMLCanvasElement.prototype as unknown as { toBlob: unknown };
    canvasProto.toBlob = function (this: HTMLCanvasElement, cb: (b: Blob) => void) {
      drawn.push([this.width, this.height]);
      cb(new Blob(['png'], { type: 'image/png' }));
    };
    class FakeImage { onload?: () => void; onerror?: () => void; set src(_v: string) { setTimeout(() => this.onload?.(), 0); } }
    vi.stubGlobal('Image', FakeImage);

    const page = pageSizePt('a4');
    const png = await exportBrandSheetPNG({ parsed, settings: settings(), metrics: null }, { scale: 2 });
    expect(png.blob.type).toBe('image/png');
    expect(png.width).toBeCloseTo(page.width * 2, -1);
    expect(png.height).toBeCloseTo(page.height * 2, -1);
    expect(drawn).toEqual([[png.width, png.height]]);
    vi.unstubAllGlobals();
  });

  it('sugere nomes de arquivo legíveis', () => {
    const input = { parsed: null, settings: settings(), metrics: null, options: { fileName: 'Minha Marca ©.svg', page: 'a3' as const, orientation: 'landscape' as const } };
    expect(brandSheetFileName(input, 'pdf')).toBe('manual-minha-marca-a3-paisagem.pdf');
    expect(brandSheetFileName({ parsed: null, settings: settings(), metrics: null }, 'svg')).toBe('manual-logo-a4-retrato.svg');
  });

  it('buildBrandSheetScene devolve a cena montada', () => {
    const scene = buildBrandSheetScene({ parsed: parsedLogo(), settings: settings(), metrics: null });
    // só os blocos ligados de fábrica entram na folha
    expect(scene.blocks.length).toBe(DEFAULT_BLOCKS.filter(b => b.enabled).length);
    expect(scene.options.title).toBe('Manual de marca');
    expect(scene.unit).toBe('mm');
    expect(scene.palette.length).toBeGreaterThan(0);
  });
});

describe('BrandSheetPanel', () => {
  // Sem JSX (arquivo .ts): o painel usa InfoTooltip, logo precisa do provider acima.
  const renderPanel = (props: BrandSheetPanelProps) =>
    render(React.createElement(TooltipProvider, null, React.createElement(BrandSheetPanel, props)));

  it('abre, monta a prévia e deixa exportar quando há SVG', async () => {
    renderPanel({
      parsedSVG: parsedLogo(),
      settings: settings(),
      metrics: computeLogoMetrics(LOGO, { resolution: 64 }),
      fileName: 'marca.svg',
      defaultOpen: true,
      previewDelay: 0,
    });
    expect(screen.getByText('Tamanhos mínimos')).toBeTruthy();
    const img = await screen.findByAltText('Prévia da folha de marca');
    expect((img as HTMLImageElement).src.startsWith('data:image/svg+xml')).toBe(true);
    for (const kind of ['SVG', 'PDF', 'PNG']) {
      expect((screen.getByText(kind).closest('button') as HTMLButtonElement).disabled).toBe(false);
    }

    fireEvent.click(screen.getByText('Paisagem'));
    await waitFor(() => expect(screen.getByText('A4 paisagem · 297 × 210 mm')).toBeTruthy());
  });

  it('sem SVG, desabilita os exports e convida a carregar um arquivo', () => {
    renderPanel({ parsedSVG: null, settings: settings(), metrics: null, defaultOpen: true, previewDelay: 0 });
    expect(screen.getByText('Carregue um SVG para montar a folha')).toBeTruthy();
    for (const kind of ['SVG', 'PDF', 'PNG']) {
      expect((screen.getByText(kind).closest('button') as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('troca para Instagram, esconde a orientação e mostra o formato em pixel', async () => {
    renderPanel({ parsedSVG: parsedLogo(), settings: settings(), metrics: null, defaultOpen: true, previewDelay: 0 });
    expect(screen.getByText('Retrato')).toBeTruthy();

    fireEvent.click(screen.getByText('Redes'));
    await waitFor(() => expect(screen.getByText('Instagram retrato · 1080 × 1350 px')).toBeTruthy());
    // formatos de pixel não giram
    expect(screen.queryByText('Paisagem')).toBeNull();

    fireEvent.click(screen.getByText('Story / Reels'));
    await waitFor(() => expect(screen.getByText('Story / Reels · 1080 × 1920 px')).toBeTruthy());
  });

  it('lista os blocos com opções próprias e deixa reordenar', async () => {
    renderPanel({ parsedSVG: parsedLogo(), settings: settings(), metrics: null, defaultOpen: true, previewDelay: 0 });
    for (const title of ['Cabeçalho', 'Logotipo', 'Paleta', 'Uso correto e incorreto', 'Anatomia', 'Fundos']) {
      expect(screen.getByText(title)).toBeTruthy();
    }

    // opções do bloco de versões
    fireEvent.click(screen.getByLabelText('Opções de Versões'));
    await waitFor(() => expect(screen.getByText('Monocromático')).toBeTruthy());

    const items = () => Array.from(document.querySelectorAll('li')).map(li => li.textContent ?? '');
    const before = items();
    expect(before[1]).toContain('Logotipo');
    fireEvent.click(screen.getByLabelText('Subir Logotipo'));
    await waitFor(() => expect(items()[0]).toContain('Logotipo'));
  });

  it('oferece composição, fundo e densidade', () => {
    renderPanel({ parsedSVG: parsedLogo(), settings: settings(), metrics: null, defaultOpen: true, previewDelay: 0 });
    for (const label of ['Automático', 'Uma coluna', 'Duas colunas', 'Só o logo', 'Claro', 'Escuro', 'Transparente', 'Confortável', 'Compacta']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Mostrar a grade da folha')).toBeTruthy();
  });

  it('todo botão do painel é type="button" e todo botão só de ícone tem rótulo', () => {
    renderPanel({ parsedSVG: parsedLogo(), settings: settings(), metrics: null, defaultOpen: true, previewDelay: 0 });
    const buttons = Array.from(document.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(10);
    for (const button of buttons) {
      expect(button.getAttribute('type')).toBe('button');
      const text = (button.textContent ?? '').trim();
      if (!text) expect(button.getAttribute('aria-label')).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------

describe('formatos de página', () => {
  it('conhece papel, redes e tela, cada um na sua unidade', () => {
    expect(PAGE_SIZE_KEYS).toContain('instagramPortrait');
    expect(PAGE_GROUPS.map(g => g.id)).toEqual(['paper', 'social', 'screen']);
    // o retrato é o padrão do grupo do Instagram
    expect(PAGE_GROUPS.find(g => g.id === 'social')!.keys[0]).toBe('instagramPortrait');

    expect(pageSizeNative('instagramSquare')).toEqual({ width: 1080, height: 1080, unit: 'px' });
    expect(pageSizeNative('instagramPortrait')).toEqual({ width: 1080, height: 1350, unit: 'px' });
    expect(pageSizeNative('instagramLandscape')).toEqual({ width: 1350, height: 1080, unit: 'px' });
    expect(pageSizeNative('story')).toEqual({ width: 1080, height: 1920, unit: 'px' });
    expect(pageSizeNative('presentation')).toEqual({ width: 1920, height: 1080, unit: 'px' });
    expect(pageSizeNative('screen')).toEqual({ width: 1440, height: 1024, unit: 'px' });

    // formato de pixel não gira: pedir paisagem não muda nada
    expect(isRotatable('story')).toBe(false);
    expect(pageSizeNative('story', 'landscape')).toEqual(pageSizeNative('story', 'portrait'));
    expect(isRotatable('a4')).toBe(true);

    expect(pageUnit('a4')).toBe('mm');
    expect(pageUnit('story')).toBe('px');
    expect(pageFormat('carta' as never).id).toBe('a4');
  });

  it('em pixel, 1 unidade de canvas é 1 pixel', () => {
    expect(pageSizePt('instagramPortrait')).toEqual({ width: 1080, height: 1350 });
    expect(pageSizePt('presentation')).toEqual({ width: 1920, height: 1080 });
    // e o equivalente físico sai a 96 dpi
    expect(pageSizeMm('instagramSquare').width).toBeCloseTo(1080 / PX_PER_MM, 6);
    expect(pageSizeMm('a4')).toEqual({ width: 210, height: 297 });
  });

  it('rotula o formato com a unidade certa', () => {
    expect(pageLabel('instagramPortrait')).toBe('Instagram retrato · 1080 × 1350 px');
    expect(pageLabel('story')).toBe('Story / Reels · 1080 × 1920 px');
    expect(pageLabel('presentation')).toBe('Apresentação · 1920 × 1080 px');
    expect(pageLabel('screen')).toBe('Tela · 1440 × 1024 px');
    expect(pageLabel('a4')).toBe('A4 retrato · 210 × 297 mm');
  });
});

describe('unidade e tipografia da folha', () => {
  it('papel mantém o corpo absoluto, tela escala com a página', () => {
    const a4 = createSheetUnits(pageSizePt('a4'), 'mm');
    expect(a4.typeScale).toBe(1);
    expect(a4.font(8)).toBe(8);
    expect(a4.space(14)).toBeCloseTo(mmToPt(14), 6);
    // A3 é papel: 8 pt continuam 8 pt
    expect(createSheetUnits(pageSizePt('a3'), 'mm').font(8)).toBe(8);

    for (const size of ['instagramSquare', 'instagramPortrait', 'story', 'presentation', 'screen'] as const) {
      const units = createSheetUnits(pageSizePt(size), 'px');
      expect(units.typeScale).toBeGreaterThan(1.4);
      expect(units.typeScale).toBeLessThanOrEqual(3);
      // nada de texto de 8 px numa folha de 1080
      expect(units.font(7)).toBeGreaterThanOrEqual(10);
      expect(units.font(8)).toBeGreaterThanOrEqual(12);
      expect(units.font(15)).toBeGreaterThanOrEqual(22);
      // a margem acompanha: entre 5% e 9% do lado menor
      const page = pageSizePt(size);
      const ratio = units.space(14) / Math.min(page.width, page.height);
      expect(ratio).toBeGreaterThan(0.045);
      expect(ratio).toBeLessThan(0.09);
    }
  });

  it('a medida física muda de unidade junto com a página', () => {
    const paper = createSheetUnits(pageSizePt('a4'), 'mm');
    expect(paper.fromPx(16)).toBeCloseTo(pxToPt(16), 6);
    expect(paper.fromMm(20)).toBeCloseTo(mmToPt(20), 6);

    const screen = createSheetUnits(pageSizePt('story'), 'px');
    expect(screen.fromPx(16)).toBe(16);
    expect(screen.fromMm(10)).toBeCloseTo(10 * PX_PER_MM, 6);

    const samples = minSizeSamples([16], [10], screen);
    expect(samples[0].heightPt).toBe(16);
    expect(samples[1].heightPt).toBeCloseTo(10 * PX_PER_MM, 6);
  });

  it('a densidade compacta aperta o ritmo sem sumir com o texto', () => {
    const roomy = createSheetUnits(pageSizePt('a4'), 'mm', 'comfortable');
    const tight = createSheetUnits(pageSizePt('a4'), 'mm', 'compact');
    expect(tight.space(14)).toBeLessThan(roomy.space(14));
    expect(tight.font(8)).toBeLessThan(roomy.font(8));
    expect(tight.font(8)).toBeGreaterThan(roomy.font(8) * 0.85);
  });

  it('a folha de Instagram sai com texto legível', () => {
    const sheet = buildBrandSheet(parsedLogo(), settings(), computeLogoMetrics(LOGO, { resolution: 64 }), {
      page: 'instagramPortrait',
    });
    expect(sheet.page).toEqual({ width: 1080, height: 1350 });
    expect(sheet.unit).toBe('px');
    const sizes: number[] = [];
    sheet.project.layers.forEach(layer => layer.getItems({ class: paper.PointText }).forEach(item => {
      sizes.push(Number((item as paper.PointText).fontSize));
    }));
    expect(sizes.length).toBeGreaterThan(5);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(22);
  });
});

describe('composição da folha', () => {
  it('uma coluna empilha e duas colunas repartem', () => {
    const single = computeSheetLayout({ layout: 'single', blocks: allBlocks() });
    expect(single.columns).toBe(1);
    const xs = new Set(single.blocks.map(b => Math.round(b.frame.x)));
    expect(xs.size).toBe(1);

    const double = computeSheetLayout({ layout: 'double', blocks: allBlocks() });
    expect(double.columns).toBe(2);
    const columns = new Set(double.blocks.filter(b => b.id !== 'header' && b.id !== 'footer').map(b => Math.round(b.frame.x)));
    expect(columns.size).toBe(2);
    for (const block of double.blocks) {
      expect(block.frame.x + block.frame.width).toBeLessThanOrEqual(double.page.width + 0.01);
      expect(block.frame.y + block.frame.height).toBeLessThanOrEqual(double.page.height + 0.01);
    }
  });

  it('só o logo entrega uma página limpa', () => {
    const layout = computeSheetLayout({ layout: 'logoOnly', blocks: allBlocks() });
    expect(layout.blocks.map(b => b.id)).toEqual(['logo']);
    expect(layout.blocks[0].frame.width).toBeCloseTo(layout.page.width - layout.margin * 2, 6);

    const sheet = buildBrandSheet(parsedLogo(), settings(), null, { layout: 'logoOnly' });
    const names = sheet.project.layers.map(l => l.name);
    expect(names).toContain('logo');
    expect(names).not.toContain('header');
    expect(names).not.toContain('footer');
    expect(names).not.toContain('template');
    expect(sheet.errors).toEqual([]);
  });

  it('o automático passa a duas colunas quando não cabe em uma', () => {
    const roomy = computeSheetLayout({ page: 'a3' });
    expect(roomy.columns).toBe(1);
    const crowded = computeSheetLayout({ page: 'a4', blocks: allBlocks() });
    expect(crowded.columns).toBe(2);
  });

  it('equilibra o corte entre as duas colunas', () => {
    expect(balanceColumns([1, 1, 1, 1])).toBe(2);
    expect(balanceColumns([5, 1, 1, 1, 1, 1])).toBe(1);
    expect(balanceColumns([1])).toBe(1);
    expect(balanceColumns([])).toBe(0);
  });

  it('respeita a ordem escolhida pelo usuário', () => {
    const layout = computeSheetLayout({
      layout: 'single',
      blocks: [
        { id: 'header', enabled: true },
        { id: 'metrics', enabled: true },
        { id: 'logo', enabled: true },
        { id: 'footer', enabled: true },
        { id: 'clearspace', enabled: false },
        { id: 'minSizes', enabled: false },
        { id: 'versions', enabled: false },
        { id: 'palette', enabled: false },
      ],
    });
    expect(layout.blocks.map(b => b.id)).toEqual(['header', 'metrics', 'logo', 'footer']);
    const metrics = layout.blocks.find(b => b.id === 'metrics')!;
    const logo = layout.blocks.find(b => b.id === 'logo')!;
    expect(metrics.frame.y).toBeLessThan(logo.frame.y);
  });

  it('normaliza a lista de blocos: sem repetidos, sem inventados, sem faltar', () => {
    const resolved = resolveBlocks([
      { id: 'footer', enabled: true },
      { id: 'footer', enabled: false },
      { id: 'inventado' as never, enabled: true },
    ]);
    expect(resolved[0].id).toBe('footer');
    expect(resolved.map(b => b.id).sort()).toEqual([...BRAND_SHEET_BLOCKS].sort());
    expect(new Set(resolved.map(b => b.id)).size).toBe(BRAND_SHEET_BLOCKS.length);
    // as caixas antigas continuam desligando os blocos
    expect(resolveBlocks(undefined, { showVersions: false }).find(b => b.id === 'versions')!.enabled).toBe(false);
  });
});

describe('tema e grade da folha', () => {
  it('claro, escuro e transparente pintam a página de um jeito', () => {
    expect(sheetPalette('light').page).toBe('#FFFFFF');
    expect(sheetPalette('dark').logoVariant).toBe('negative');
    expect(sheetPalette('transparent').page).toBeNull();

    const light = buildBrandSheet(parsedLogo(), settings(), null, {});
    expect(light.project.layers.some(l => l.name === 'page')).toBe(true);

    const dark = buildBrandSheet(parsedLogo(), settings(), null, { theme: 'dark' });
    const bg = dark.project.layers.find(l => l.name === 'page')!.firstChild as paper.Path;
    expect(bg.fillColor!.toCSS(true).toUpperCase()).toBe('#141416');

    const clear = buildBrandSheet(parsedLogo(), settings(), null, { theme: 'transparent' });
    expect(clear.project.layers.some(l => l.name === 'page')).toBe(false);
    expect(clear.project.layers.every(l => l.children.length > 0)).toBe(true);
  });

  it('a grade da folha é uma camada própria, e só quando pedida', () => {
    const off = buildBrandSheet(parsedLogo(), settings(), null, {});
    expect(off.project.layers.some(l => l.name === 'sheet-grid')).toBe(false);

    const on = buildBrandSheet(parsedLogo(), settings(), null, { showSheetGrid: true });
    const grid = on.project.layers.find(l => l.name === 'sheet-grid');
    expect(grid).toBeTruthy();
    expect(grid!.children.length).toBeGreaterThan(0);
    // discreta: fica atrás dos blocos
    expect(on.project.layers.indexOf(grid!)).toBeLessThan(
      on.project.layers.findIndex(l => l.name === 'logo'),
    );
  });
});

describe('controle fino do que entra', () => {
  it('escolhe as linhas da tabela de métricas', () => {
    const metrics = computeLogoMetrics(LOGO, { resolution: 64 });
    const all = brandSheetMetricRows(metrics);
    expect(all.map(r => r.key)).toContain('components');

    const few = brandSheetMetricRows(metrics, ['aspect', 'ink']);
    expect(few.map(r => r.key)).toEqual(['aspect', 'ink']);
    // lista vazia ou sem interseção não apaga a tabela
    expect(brandSheetMetricRows(metrics, []).length).toBe(all.length);
    expect(brandSheetMetricRows(metrics, ['nada']).length).toBe(all.length);
  });

  it('escolhe as versões e os tamanhos mínimos', () => {
    const sheet = buildBrandSheet(parsedLogo(), settings(), null, {
      versions: ['positive', 'negative'],
      pixelSizes: [24],
      millimeterSizes: [15],
    });
    expect(sheet.options.versions).toEqual(['positive', 'negative']);
    const versions = sheet.project.layers.find(l => l.name === 'versions')!;
    const names = versions.getItems({ recursive: true }).map(i => i.name).filter(Boolean);
    expect(names).toContain('version-positive');
    expect(names).toContain('version-negative');
    expect(names).not.toContain('version-outline');

    const strip = sheet.project.layers.find(l => l.name === 'min-sizes')!
      .children.find(c => c.name === 'min-size-strip')!;
    const logos = strip.children.filter(c => c.className !== 'PointText');
    expect(logos).toHaveLength(2);
  });

  it('escolhe o que aparece no cabeçalho', () => {
    const full = buildBrandSheet(parsedLogo(), settings(), null, { fileName: 'marca.svg', subtitle: 'Identidade' });
    const textOf = (sheet: ReturnType<typeof buildBrandSheet>) =>
      sheet.project.layers.find(l => l.name === 'header')!
        .getItems({ class: paper.PointText })
        .map(i => (i as paper.PointText).content)
        .join(' | ');
    expect(textOf(full)).toContain('marca.svg');
    expect(textOf(full)).toContain('Identidade');

    const bare = buildBrandSheet(parsedLogo(), settings(), null, {
      fileName: 'marca.svg', subtitle: 'Identidade',
      headerParts: { fileName: false, subtitle: false, date: false },
    });
    expect(textOf(bare)).not.toContain('marca.svg');
    expect(textOf(bare)).not.toContain('Identidade');
    expect(textOf(bare)).toContain('Manual de marca');
  });

  it('escolhe quais construções entram no logo grande', () => {
    const scene = settings({
      geometryOptions: { ...createDefaultGeometryOptions(), goldenRatio: true, boundingRects: true, thirdLines: true },
    });
    // A folha reaproveita um projeto paper só, limpo a cada montagem: é preciso
    // medir cada uma antes de montar a seguinte.
    const weigh = (options: Parameters<typeof buildBrandSheet>[3]) => {
      const sheet = buildBrandSheet(parsedLogo(), scene, null, options);
      const layer = sheet.project.layers.find(l => l.name === 'logo')!;
      return { paths: layer.getItems({ class: paper.Path }).length, errors: sheet.errors.length };
    };

    const all = weigh({});
    const few = weigh({ constructionKeys: ['goldenRatio'] });
    const none = weigh({ showConstructions: false });

    expect(all.paths).toBeGreaterThan(few.paths);
    expect(few.paths).toBeGreaterThan(none.paths);
    expect(all.errors).toBe(0);
    expect(few.errors).toBe(0);
    expect(none.errors).toBe(0);
  });
});

describe('assets novos da folha', () => {
  const build = (over: Parameters<typeof buildBrandSheet>[3] = {}) =>
    buildBrandSheet(parsedLogo(), settings(), null, {
      layout: 'single', blocks: allBlocks(), ...over,
    });

  it('desenha paleta, uso, anatomia e fundos quando ligados', () => {
    const sheet = build();
    for (const name of ['palette', 'usage', 'anatomy', 'backgrounds']) {
      const layer = sheet.project.layers.find(l => l.name === name);
      expect(layer, name).toBeTruthy();
      expect(layer!.children.length, name).toBeGreaterThan(0);
    }
    expect(sheet.errors).toEqual([]);
  });

  it('a paleta sai do próprio arquivo', () => {
    const sheet = build();
    expect(sheet.palette.map(s => s.hex)).toEqual(['#112233', '#445566', '#778899']);
    const layer = sheet.project.layers.find(l => l.name === 'palette')!;
    const printed = layer.getItems({ class: paper.PointText }).map(i => (i as paper.PointText).content);
    expect(printed).toContain('#112233');
    expect(printed).toContain('Dominante');
  });

  it('uso correto e incorreto traz um selo por quadro, sem emoji', () => {
    const sheet = build();
    const layer = sheet.project.layers.find(l => l.name === 'usage')!;
    const names = layer.getItems({ recursive: true }).map(i => i.name).filter(Boolean);
    for (const key of ['usage-correct', 'usage-stretched', 'usage-rotated', 'usage-crowded']) {
      expect(names).toContain(key);
    }
    expect(names.filter(n => n === 'seal-ok')).toHaveLength(1);
    expect(names.filter(n => n === 'seal-nok')).toHaveLength(3);
    const printed = layer.getItems({ class: paper.PointText }).map(i => (i as paper.PointText).content).join(' ');
    expect(printed).toContain('Certo');
    expect(printed).toContain('Errado');
    expect(printed).toContain('Distorcido');
    // sem emoji
    expect(/\p{Extended_Pictographic}/u.test(printed)).toBe(false);
  });

  it('a anatomia numera as partes do arquivo', () => {
    const sheet = build();
    const layer = sheet.project.layers.find(l => l.name === 'anatomy')!;
    const printed = layer.getItems({ class: paper.PointText }).map(i => (i as paper.PointText).content);
    expect(printed).toContain('1');
    expect(printed).toContain('3');
    expect(printed.join(' ')).toContain('3 partes');
  });

  it('a fita de fundos mostra branco, preto, cinza e a cor dominante', () => {
    const sheet = build();
    const layer = sheet.project.layers.find(l => l.name === 'backgrounds')!;
    const printed = layer.getItems({ class: paper.PointText }).map(i => (i as paper.PointText).content);
    expect(printed).toContain('#FFFFFF');
    expect(printed).toContain('#000000');
    expect(printed).toContain('#AAA9AB');
    expect(printed).toContain('#112233');
  });

  it('cada bloco novo continua dentro do seu quadro', () => {
    const sheet = build();
    for (const block of sheet.blocks) {
      const layer = sheet.project.layers.find(l => l.name === blockLayerId(block.id));
      if (!layer) continue;
      const b = layer.strokeBounds;
      if (!(b.width > 0 || b.height > 0)) continue;
      const tol = 1.5;
      expect(b.left, `${block.id} esquerda`).toBeGreaterThanOrEqual(block.frame.x - tol);
      expect(b.top, `${block.id} topo`).toBeGreaterThanOrEqual(block.frame.y - tol);
      expect(b.right, `${block.id} direita`).toBeLessThanOrEqual(block.frame.x + block.frame.width + tol);
      expect(b.bottom, `${block.id} base`).toBeLessThanOrEqual(block.frame.y + block.frame.height + tol);
    }
  });
});

describe('export nos formatos novos', () => {
  it('SVG e PDF saem no tamanho em pixel do formato', () => {
    const parsed = parsedLogo();
    const input = { parsed, settings: settings(), metrics: null, options: { page: 'story' as const } };
    const svg = exportBrandSheetSVG(input);
    const size = getSVGSize(svg);
    expect(size.width).toBeCloseTo(1080, 0);
    expect(size.height).toBeCloseTo(1920, 0);
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').getElementsByTagName('parsererror')).toHaveLength(0);

    const bytes = brandSheetPDFBytes(input);
    let pdf = '';
    for (let i = 0; i < bytes.length; i++) pdf += String.fromCharCode(bytes[i]);
    const media = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf);
    expect(parseFloat(media![1])).toBeCloseTo(1080, 0);
    expect(parseFloat(media![2])).toBeCloseTo(1920, 0);
  });

  it('o PNG de uma folha de tela sai em escala 1', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const canvasProto = HTMLCanvasElement.prototype as unknown as { toBlob: unknown };
    canvasProto.toBlob = function (this: HTMLCanvasElement, cb: (b: Blob) => void) {
      cb(new Blob(['png'], { type: 'image/png' }));
    };
    class FakeImage { onload?: () => void; onerror?: () => void; set src(_v: string) { setTimeout(() => this.onload?.(), 0); } }
    vi.stubGlobal('Image', FakeImage);

    expect(defaultPngScale({ page: 'instagramPortrait' })).toBe(1);
    expect(defaultPngScale({ page: 'a4' })).toBe(2);
    expect(defaultPngBackground({ theme: 'transparent' })).toBeNull();
    expect(defaultPngBackground({})).toBe('#FFFFFF');

    const png = await exportBrandSheetPNG({
      parsed: parsedLogo(), settings: settings(), metrics: null,
      options: { page: 'instagramPortrait' },
    });
    expect(png.width).toBeCloseTo(1080, -1);
    expect(png.height).toBeCloseTo(1350, -1);
    vi.unstubAllGlobals();
  });

  it('o nome do arquivo usa o apelido do formato', () => {
    const name = (options: Record<string, unknown>) =>
      brandSheetFileName({ parsed: null, settings: settings(), metrics: null, options }, 'png');
    expect(name({ page: 'instagramPortrait' })).toBe('manual-logo-instagram-retrato.png');
    expect(name({ page: 'story' })).toBe('manual-logo-story.png');
    expect(name({ page: 'presentation' })).toBe('manual-logo-apresentacao.png');
    expect(name({ page: 'letter', orientation: 'landscape' })).toBe('manual-logo-carta-paisagem.png');
  });
});

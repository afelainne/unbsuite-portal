/**
 * Export da folha de manual de marca: SVG, PDF vetorial e PNG.
 *
 * Reaproveita `projectToPDF` e `svgToPngBlob` de `export-engine.ts` (leitura,
 * não editado). A folha já nasce em pontos, então 1 unidade paper = 1 pt e o
 * PDF sai no tamanho de página correto sem nenhuma conversão extra.
 */
import paper from 'paper';
import { finalizeSVGString, type ParsedSVG } from './svg-engine';
import type { SceneSettings } from './render-pipeline';
import { projectToPDF, svgToPngBlob, type PngExportResult } from './export-engine';
import { hashKey, LRUCache } from './memo';
import { activeLanguage } from '../i18n/runtime';
import type { LogoMetrics } from './metrics';
import {
  buildBrandSheet, sheetPageRectangle, pageLabel, pageFormat, isPageSize, sheetPalette,
  type BrandSheetOptions, type BrandSheetResult,
} from './brandsheet';

export interface BrandSheetExportInput {
  parsed: ParsedSVG | null | undefined;
  settings: SceneSettings;
  metrics: LogoMetrics | null | undefined;
  options?: BrandSheetOptions;
}

const svgCache = new LRUCache<string, string>(6);

function cacheKey(input: BrandSheetExportInput): string {
  const m = input.metrics;
  return hashKey(
    input.parsed?.originalSVG ?? '',
    input.settings,
    input.options ?? {},
    // só o que a folha imprime da métrica (evita guardar objetos paper)
    m ? {
      a: m.aspectRatioLabel, r: m.aspectRatio, w: m.width, h: m.height,
      i: m.inkCoverage, d: m.deviationPercent, s: m.symmetry,
      n: m.anchorCount, sm: m.smoothAnchorRatio, c: m.componentCount,
    } : null,
    // The sheet prints its labels in the active language.
    activeLanguage(),
  );
}

/** Monta a folha e devolve o resultado bruto (para prévias e testes). */
export function buildBrandSheetScene(input: BrandSheetExportInput): BrandSheetResult {
  return buildBrandSheet(input.parsed, input.settings, input.metrics, input.options ?? {});
}

/** Folha completa como string SVG, recortada exatamente no tamanho da página. */
export function exportBrandSheetSVG(input: BrandSheetExportInput): string {
  const key = cacheKey(input);
  const hit = svgCache.get(key);
  if (hit) return hit;
  const sheet = buildBrandSheetScene(input);
  try {
    sheet.scope.activate();
    const raw = sheet.project.exportSVG({
      asString: true,
      bounds: sheetPageRectangle(sheet.page),
    }) as string;
    const svg = finalizeSVGString(raw);
    svgCache.set(key, svg);
    return svg;
  } finally {
    paper.activate();
  }
}

/** Folha completa como bytes de PDF vetorial de uma página. */
export function brandSheetPDFBytes(input: BrandSheetExportInput): Uint8Array {
  const sheet = buildBrandSheetScene(input);
  try {
    sheet.scope.activate();
    const title = [sheet.options.title, sheet.options.fileName, pageLabel(sheet.options.page, sheet.options.orientation)]
      .filter(Boolean)
      .join(' · ');
    return projectToPDF(sheet.project, sheetPageRectangle(sheet.page), { title });
  } finally {
    paper.activate();
  }
}

export function exportBrandSheetPDF(input: BrandSheetExportInput): Blob {
  return new Blob([brandSheetPDFBytes(input)], { type: 'application/pdf' });
}

export interface BrandSheetPngOptions {
  /** Multiplicador sobre o tamanho da página. */
  scale?: number;
  /** Fundo sólido; `null` mantém o alfa. */
  background?: string | null;
}

/**
 * Escala padrão do PNG: numa folha de papel, 2× o tamanho em pontos (≈ 144
 * dpi); numa folha de tela, 1×, para um formato de 1080 px sair com 1080 px.
 */
export function defaultPngScale(options: BrandSheetOptions | undefined): number {
  const page = options?.page;
  return isPageSize(page) && pageFormat(page).unit === 'px' ? 1 : 2;
}

/** Fundo padrão do PNG, conforme o tema da folha (transparente mantém o alfa). */
export function defaultPngBackground(options: BrandSheetOptions | undefined): string | null {
  return sheetPalette(options?.theme ?? 'light').page;
}

/** Folha completa como PNG, rasterizado a partir do próprio SVG vetorial. */
export function exportBrandSheetPNG(
  input: BrandSheetExportInput,
  options: BrandSheetPngOptions = {},
): Promise<PngExportResult> {
  return svgToPngBlob(exportBrandSheetSVG(input), {
    scale: options.scale ?? defaultPngScale(input.options),
    background: options.background === undefined ? defaultPngBackground(input.options) : options.background,
  });
}

/** Nome de arquivo sugerido: `manual-<logo>-a4-retrato.pdf`. */
export function brandSheetFileName(input: BrandSheetExportInput, extension: 'svg' | 'pdf' | 'png'): string {
  const opts = input.options ?? {};
  const base = (opts.fileName ?? '').replace(/\.[a-z0-9]+$/i, '').trim();
  const slug = (base || 'logo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'logo';
  const format = pageFormat(isPageSize(opts.page) ? opts.page : 'a4');
  const suffix = format.rotatable
    ? `${format.slug}-${opts.orientation === 'landscape' ? 'paisagem' : 'retrato'}`
    : format.slug;
  return `manual-${slug}-${suffix}.${extension}`;
}

export function clearBrandSheetCache(): void {
  svgCache.clear();
}

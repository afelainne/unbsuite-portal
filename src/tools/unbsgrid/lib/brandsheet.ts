/**
 * Folha de manual de marca.
 *
 * Uma folha é uma PÁGINA, de papel ou de tela, e cada formato traz a sua
 * unidade nativa:
 *
 *  - papel (A4, A3, Carta) mede em MILÍMETROS e é convertido para PONTOS
 *    (1 mm = 2,8346 pt). A tipografia continua absoluta, como manda a
 *    impressão: 8 pt são 8 pt num A4 e num A3;
 *  - tela (Instagram, story, apresentação, tela) mede em PIXELS, e 1 px é uma
 *    unidade do projeto. Aí a tipografia e o ritmo escalam com o tamanho da
 *    página (ver `createSheetUnits`), senão uma folha de 1080 px sairia com
 *    texto de 8 pt ilegível.
 *
 * O logo grande reaproveita `renderScene` do pipeline (dentro de um PaperScope
 * privado, como faz `export-engine.ts`), com um `guideScale` derivado do
 * tamanho em que o logo realmente aparece na página, para que os traços das
 * construções saiam com peso coerente.
 *
 * Tudo é desenhado com paper.js no mesmo projeto, então a mesma folha sai como
 * SVG, PDF e PNG.
 */
import paper from 'paper';
import { resetPaperProject, convertToPixels, getLogomarkSize, type ParsedSVG, type ClearspaceUnit } from './svg-engine';
import { renderScene, applyLogoAppearance, computeFitScale, type SceneSettings } from './render-pipeline';
import { REFERENCE_DIAGONAL } from '../components/renderers/scale';
import { GEOMETRY_KEYS, type GeometryOptions } from '../types/geometry';
import type { LogoMetrics } from './metrics';
import { activeT } from '../i18n/runtime';
import { fill, plural } from '../i18n/format';
import {
  MM_TO_PT, PX_TO_PT, PX_PER_MM, mmToPt, ptToMm, pxToPt, trimNumber, insetFrame,
  createSheetUnits, createSheetPainter, sheetPalette,
  drawPaletteBlock, drawUsageBlock, drawAnatomyBlock, drawBackgroundsBlock, drawSheetGrid,
  type Frame, type LogoVariant, type PageUnit, type SheetDensity, type SheetPainter,
  type SheetPalette, type SheetTheme, type SheetUnits,
} from './brandsheet-kit';
import { extractSvgPalette, type PaletteSwatch } from './brandsheet-palette';

export { MM_TO_PT, PX_TO_PT, PX_PER_MM, mmToPt, ptToMm, pxToPt };
export type { Frame, LogoVariant, PageUnit, SheetDensity, SheetPalette, SheetTheme, SheetUnits };
export { createSheetUnits, sheetPalette } from './brandsheet-kit';

// ---------------------------------------------------------------------------
// Formatos de página
// ---------------------------------------------------------------------------

export type PageSize =
  | 'a4' | 'a3' | 'letter'
  | 'instagramSquare' | 'instagramPortrait' | 'instagramLandscape' | 'story'
  | 'presentation' | 'screen';

export type PageOrientation = 'portrait' | 'landscape';
export type PageGroup = 'paper' | 'social' | 'screen';

export interface PageFormat {
  id: PageSize;
  label: string;
  group: PageGroup;
  unit: PageUnit;
  /** Na unidade nativa. Em papel é lado curto × lado longo. */
  width: number;
  height: number;
  /** Formatos de papel giram; os de pixel já vêm com a orientação embutida. */
  rotatable: boolean;
  /** Pedaço do nome de arquivo sugerido. */
  slug: string;
}

export const PAGE_FORMATS: Record<PageSize, PageFormat> = {
  a4: { id: 'a4', label: 'A4', group: 'paper', unit: 'mm', width: 210, height: 297, rotatable: true, slug: 'a4' },
  a3: { id: 'a3', label: 'A3', group: 'paper', unit: 'mm', width: 297, height: 420, rotatable: true, slug: 'a3' },
  letter: { id: 'letter', label: 'Carta', group: 'paper', unit: 'mm', width: 215.9, height: 279.4, rotatable: true, slug: 'carta' },
  instagramPortrait: { id: 'instagramPortrait', label: 'Instagram retrato', group: 'social', unit: 'px', width: 1080, height: 1350, rotatable: false, slug: 'instagram-retrato' },
  instagramSquare: { id: 'instagramSquare', label: 'Instagram quadrado', group: 'social', unit: 'px', width: 1080, height: 1080, rotatable: false, slug: 'instagram-quadrado' },
  instagramLandscape: { id: 'instagramLandscape', label: 'Instagram paisagem', group: 'social', unit: 'px', width: 1350, height: 1080, rotatable: false, slug: 'instagram-paisagem' },
  story: { id: 'story', label: 'Story / Reels', group: 'social', unit: 'px', width: 1080, height: 1920, rotatable: false, slug: 'story' },
  presentation: { id: 'presentation', label: 'Apresentação', group: 'screen', unit: 'px', width: 1920, height: 1080, rotatable: false, slug: 'apresentacao' },
  screen: { id: 'screen', label: 'Tela', group: 'screen', unit: 'px', width: 1440, height: 1024, rotatable: false, slug: 'tela' },
};

export const PAGE_SIZE_KEYS = Object.keys(PAGE_FORMATS) as PageSize[];

/** Formatos por grupo, na ordem em que o painel mostra. */
export const PAGE_GROUPS: Array<{ id: PageGroup; label: string; keys: PageSize[] }> = [
  { id: 'paper', label: 'Papel', keys: ['a4', 'a3', 'letter'] },
  { id: 'social', label: 'Redes', keys: ['instagramPortrait', 'instagramSquare', 'instagramLandscape', 'story'] },
  { id: 'screen', label: 'Tela', keys: ['presentation', 'screen'] },
];

/** Padrão de cada grupo (o retrato é o padrão do Instagram). */
export const PAGE_GROUP_DEFAULT: Record<PageGroup, PageSize> = {
  paper: 'a4',
  social: 'instagramPortrait',
  screen: 'presentation',
};

/** Lado curto × lado longo, só dos formatos de papel (compatibilidade). */
export const PAGE_SIZES_MM: Record<'a4' | 'a3' | 'letter', { width: number; height: number; label: string }> = {
  a4: { width: 210, height: 297, label: 'A4' },
  a3: { width: 297, height: 420, label: 'A3' },
  letter: { width: 215.9, height: 279.4, label: 'Carta' },
};

export function isPageSize(value: unknown): value is PageSize {
  return typeof value === 'string' && (PAGE_SIZE_KEYS as string[]).includes(value);
}

export function pageFormat(size: PageSize): PageFormat {
  return PAGE_FORMATS[size] ?? PAGE_FORMATS.a4;
}

/** `mm` em papel, `px` em tela. */
export function pageUnit(size: PageSize): PageUnit {
  return pageFormat(size).unit;
}

/** Só formatos de papel giram: pedir paisagem num story não faz nada. */
export function isRotatable(size: PageSize): boolean {
  return pageFormat(size).rotatable;
}

/** Dimensões na UNIDADE NATIVA do formato, já considerando a orientação. */
export function pageSizeNative(size: PageSize, orientation: PageOrientation = 'portrait'): {
  width: number; height: number; unit: PageUnit;
} {
  const fmt = pageFormat(size);
  const rotate = fmt.rotatable && orientation === 'landscape';
  return {
    width: rotate ? fmt.height : fmt.width,
    height: rotate ? fmt.width : fmt.height,
    unit: fmt.unit,
  };
}

/** Dimensões em milímetros (formatos de pixel são convertidos a 96 dpi). */
export function pageSizeMm(size: PageSize, orientation: PageOrientation = 'portrait'): { width: number; height: number } {
  const n = pageSizeNative(size, orientation);
  if (n.unit === 'mm') return { width: n.width, height: n.height };
  return { width: n.width / PX_PER_MM, height: n.height / PX_PER_MM };
}

/**
 * Dimensões na UNIDADE DE CANVAS da folha: pontos em papel, pixels em tela.
 * É a unidade do projeto paper, do SVG e do PDF.
 */
export function pageSizePt(size: PageSize, orientation: PageOrientation = 'portrait'): { width: number; height: number } {
  const n = pageSizeNative(size, orientation);
  return n.unit === 'mm'
    ? { width: mmToPt(n.width), height: mmToPt(n.height) }
    : { width: n.width, height: n.height };
}

/** Apelido honesto de `pageSizePt` para os formatos de tela. */
export const pageSizeUnits = pageSizePt;

const roundLabel = (v: number): string => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

/** "A4 retrato · 210 × 297 mm" / "Instagram retrato · 1080 × 1350 px". */
export function pageLabel(size: PageSize, orientation: PageOrientation = 'portrait'): string {
  const fmt = pageFormat(size);
  const n = pageSizeNative(size, orientation);
  const name = fmt.rotatable
    ? `${fmt.label} ${(orientation === 'landscape' ? activeT().brandSheet.landscape : activeT().brandSheet.portrait).toLowerCase()}`
    : fmt.label;
  return `${name} · ${roundLabel(n.width)} × ${roundLabel(n.height)} ${n.unit}`;
}

// ---------------------------------------------------------------------------
// Blocos e layout
// ---------------------------------------------------------------------------

export const BRAND_SHEET_BLOCKS = [
  'header', 'logo', 'clearspace', 'minSizes', 'metrics', 'versions',
  'palette', 'usage', 'anatomy', 'backgrounds', 'footer',
] as const;
export type BrandSheetBlockId = (typeof BRAND_SHEET_BLOCKS)[number];

/** camelCase -> id da camada exportada (`<g id="min-sizes">`). */
export function blockLayerId(id: BrandSheetBlockId): string {
  return String(id).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export const BLOCK_TITLES: Record<BrandSheetBlockId, string> = {
  header: 'Cabeçalho',
  logo: 'Logotipo',
  clearspace: 'Área de respiro',
  minSizes: 'Tamanhos mínimos',
  metrics: 'Métricas',
  versions: 'Versões',
  palette: 'Paleta',
  usage: 'Uso correto e incorreto',
  anatomy: 'Anatomia',
  backgrounds: 'Fundos',
  footer: 'Uso',
};

/** Uma linha de ajuda por bloco, para o painel. */
export const BLOCK_HINTS: Record<BrandSheetBlockId, string> = {
  header: 'Título, subtítulo, data e nome do arquivo.',
  logo: 'O logo grande, com as construções escolhidas.',
  clearspace: 'Moldura de respiro com a medida em X.',
  minSizes: 'Fita com o logo nos tamanhos mínimos escolhidos.',
  metrics: 'Tabela com as linhas escolhidas.',
  versions: 'Positivo, negativo, contorno e monocromático.',
  palette: 'Amostras de cor com o hex, tiradas do próprio arquivo.',
  usage: 'O logo bem aplicado e três erros clássicos.',
  anatomy: 'As partes do arquivo, numeradas.',
  backgrounds: 'O logo sobre branco, preto, cinza e a cor dominante.',
  footer: 'Aviso de uso e identificação do formato.',
};

export interface SheetBlock {
  id: BrandSheetBlockId;
  title: string;
  frame: Frame;
}

export interface SheetLayout {
  /** Página na unidade de canvas. */
  page: { width: number; height: number };
  unit: PageUnit;
  units: SheetUnits;
  margin: number;
  gap: number;
  /** Quantas colunas o corpo da folha usa. */
  columns: number;
  blocks: SheetBlock[];
}

/** Blocos do corpo que o usuário liga e desliga (ordem padrão). */
export const OPTIONAL_BLOCKS: BrandSheetBlockId[] =
  ['clearspace', 'minSizes', 'metrics', 'versions', 'palette', 'usage', 'anatomy', 'backgrounds'];

/** Modo de composição da folha. */
export type SheetLayoutMode = 'auto' | 'single' | 'double' | 'logoOnly';

export const LAYOUT_MODES: Array<{ value: SheetLayoutMode; label: string; hint: string }> = [
  { value: 'auto', label: 'Automático', hint: 'Escolhe entre uma e duas colunas conforme o que cabe na página.' },
  { value: 'single', label: 'Uma coluna', hint: 'Empilha todos os blocos numa coluna só.' },
  { value: 'double', label: 'Duas colunas', hint: 'Reparte os blocos em duas colunas equilibradas.' },
  { value: 'logoOnly', label: 'Só o logo', hint: 'Página limpa, sem painéis, boa para capa.' },
];

export const SHEET_THEMES: Array<{ value: SheetTheme; label: string; hint: string }> = [
  { value: 'light', label: 'Claro', hint: 'Fundo branco, logo positivo.' },
  { value: 'dark', label: 'Escuro', hint: 'Fundo escuro, logo em negativo.' },
  { value: 'transparent', label: 'Transparente', hint: 'Sem fundo: o PNG sai com alfa.' },
];

export const SHEET_DENSITIES: Array<{ value: SheetDensity; label: string; hint: string }> = [
  { value: 'comfortable', label: 'Confortável', hint: 'Respiro largo entre os blocos.' },
  { value: 'compact', label: 'Compacta', hint: 'Menos padding, mais conteúdo por página.' },
];

const MARGIN_MM = 14;
const GAP_MM = 5;
const HEADER_MM = { portrait: 20, landscape: 16 };
const FOOTER_MM = 11;

/** Peso e altura mínima (em mm de papel) de cada bloco do corpo da folha. */
const BODY_WEIGHTS: Record<string, { weight: number; minMm: number }> = {
  logo: { weight: 3.2, minMm: 42 },
  clearspace: { weight: 1.6, minMm: 34 },
  // 20 mm de amostra + legenda + cabeçalho do bloco não cabem em menos que isso
  minSizes: { weight: 1.3, minMm: 36 },
  metrics: { weight: 1.8, minMm: 32 },
  versions: { weight: 1.2, minMm: 24 },
  palette: { weight: 1, minMm: 22 },
  usage: { weight: 1.5, minMm: 30 },
  anatomy: { weight: 1.7, minMm: 34 },
  backgrounds: { weight: 1.1, minMm: 24 },
};

const weightOf = (id: BrandSheetBlockId) => BODY_WEIGHTS[id]?.weight ?? 1;
const minMmOf = (id: BrandSheetBlockId) => BODY_WEIGHTS[id]?.minMm ?? 20;

/**
 * Reparte `available` entre itens com peso, respeitando alturas mínimas.
 * Se a soma das mínimas já não cabe, todas encolhem proporcionalmente (a folha
 * continua válida, só mais apertada).
 */
export function distributeHeights(available: number, items: Array<{ weight: number; min: number }>): number[] {
  const n = items.length;
  if (!n) return [];
  const avail = Number.isFinite(available) && available > 0 ? available : 0;
  if (avail <= 0) return items.map(() => 0);
  const mins = items.map(i => (Number.isFinite(i.min) && i.min > 0 ? i.min : 0));
  const minSum = mins.reduce((s, v) => s + v, 0);
  if (minSum >= avail) {
    const k = avail / (minSum || 1);
    return mins.map(v => v * k);
  }
  const out = new Array<number>(n).fill(0);
  const fixed = new Array<boolean>(n).fill(false);
  let remaining = avail;
  for (let pass = 0; pass <= n; pass++) {
    const open: number[] = [];
    for (let i = 0; i < n; i++) if (!fixed[i]) open.push(i);
    if (!open.length) break;
    const wSum = open.reduce((s, i) => s + Math.max(0, items[i].weight), 0) || open.length;
    for (const i of open) out[i] = (remaining * Math.max(0, items[i].weight)) / wSum;
    let changed = false;
    for (const i of open) {
      if (out[i] < mins[i]) {
        out[i] = mins[i];
        fixed[i] = true;
        remaining -= mins[i];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

/**
 * Ponto de corte que melhor equilibra o peso de duas colunas, mantendo a
 * ordem escolhida pelo usuário.
 */
export function balanceColumns(weights: number[]): number {
  const n = weights.length;
  if (n < 2) return n;
  const total = weights.reduce((s, v) => s + Math.max(0, v), 0);
  let best = 1;
  let bestDelta = Infinity;
  let left = 0;
  for (let i = 0; i < n - 1; i++) {
    left += Math.max(0, weights[i]);
    const delta = Math.abs(left - (total - left));
    if (delta < bestDelta) { bestDelta = delta; best = i + 1; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Opções
// ---------------------------------------------------------------------------

export type HeaderPart = 'title' | 'subtitle' | 'date' | 'fileName';

export const HEADER_PARTS: Array<{ value: HeaderPart; label: string }> = [
  { value: 'title', label: 'Título' },
  { value: 'subtitle', label: 'Subtítulo' },
  { value: 'date', label: 'Data' },
  { value: 'fileName', label: 'Nome do arquivo' },
];

export const VERSION_VARIANTS: Array<{ value: LogoVariant; label: string }> = [
  { value: 'positive', label: 'Positivo' },
  { value: 'negative', label: 'Negativo' },
  { value: 'outline', label: 'Contorno' },
  { value: 'mono', label: 'Monocromático' },
];

export const METRIC_ROW_KEYS = ['aspect', 'box', 'ink', 'deviation', 'symmetry', 'anchors', 'components'] as const;
export type MetricRowKey = (typeof METRIC_ROW_KEYS)[number];

export const METRIC_ROW_LABELS: Record<MetricRowKey, string> = {
  aspect: 'Proporção',
  box: 'Caixa',
  ink: 'Cobertura de tinta',
  deviation: 'Desvio do centro visual',
  symmetry: 'Simetria (vertical / horizontal)',
  anchors: 'Nós',
  components: 'Componentes',
};

/** Linhas que a folha imprime quando o usuário não escolhe nenhuma. */
export const DEFAULT_METRIC_ROWS: MetricRowKey[] = [...METRIC_ROW_KEYS];

// ---------------------------------------------------------------------------
// Idioma
// ---------------------------------------------------------------------------
// The literals above are the original Portuguese copy. Every label the panel
// and the sheet print is swapped here for a getter that reads the active
// language (`brandSheet` namespace): "instagramPortrait" -> "pageInstagramPortrait".

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sheetText = (key: string, fallback: string) => () =>
  (activeT().brandSheet as Record<string, string>)[key] ?? fallback;

function localizeField<T extends object>(target: T, field: keyof T & string, key: string): void {
  const fallback = String(target[field]);
  Object.defineProperty(target, field, { enumerable: true, configurable: true, get: sheetText(key, fallback) });
}

for (const [id, format] of Object.entries(PAGE_FORMATS)) localizeField(format, 'label', `page${cap(id)}`);
for (const group of PAGE_GROUPS) localizeField(group, 'label', `group${cap(group.id)}`);
for (const id of Object.keys(BLOCK_TITLES) as BrandSheetBlockId[]) {
  localizeField(BLOCK_TITLES, id, `block${cap(id)}`);
  localizeField(BLOCK_HINTS, id, `block${cap(id)}Hint`);
}
for (const mode of LAYOUT_MODES) {
  localizeField(mode, 'label', `layout${cap(mode.value)}`);
  localizeField(mode, 'hint', `layout${cap(mode.value)}Hint`);
}
for (const theme of SHEET_THEMES) {
  localizeField(theme, 'label', `theme${cap(theme.value)}`);
  localizeField(theme, 'hint', `theme${cap(theme.value)}Hint`);
}
for (const density of SHEET_DENSITIES) {
  localizeField(density, 'label', `density${cap(density.value)}`);
  localizeField(density, 'hint', `density${cap(density.value)}Hint`);
}
for (const part of HEADER_PARTS) localizeField(part, 'label', `headerPart${cap(part.value)}`);
for (const variant of VERSION_VARIANTS) localizeField(variant, 'label', `version${cap(variant.value)}`);
for (const key of METRIC_ROW_KEYS) localizeField(METRIC_ROW_LABELS, key, `metric${cap(key)}`);

export interface SheetBlockChoice {
  id: BrandSheetBlockId;
  enabled: boolean;
}

/** Blocos ligados de fábrica, na ordem padrão da folha. */
export const DEFAULT_BLOCKS: SheetBlockChoice[] = [
  { id: 'header', enabled: true },
  { id: 'logo', enabled: true },
  { id: 'clearspace', enabled: true },
  { id: 'minSizes', enabled: true },
  { id: 'metrics', enabled: true },
  { id: 'versions', enabled: true },
  { id: 'palette', enabled: true },
  { id: 'usage', enabled: false },
  { id: 'anatomy', enabled: false },
  { id: 'backgrounds', enabled: false },
  { id: 'footer', enabled: true },
];

export interface BrandSheetOptions {
  page?: PageSize;
  orientation?: PageOrientation;
  /** Composição da folha. */
  layout?: SheetLayoutMode;
  /** Fundo da folha. */
  theme?: SheetTheme;
  /** Padding e ritmo interno. */
  density?: SheetDensity;
  /** Malha de construção discreta por trás dos blocos. */
  showSheetGrid?: boolean;
  /** Título grande do cabeçalho. */
  title?: string;
  /** Subtítulo editável, logo abaixo do título. */
  subtitle?: string;
  /** Nome do arquivo carregado, impresso no cabeçalho. */
  fileName?: string;
  /** Data do cabeçalho (padrão: hoje). */
  date?: Date | string | number;
  /** Ordem e liga/desliga de cada bloco. */
  blocks?: SheetBlockChoice[];
  /** O que aparece no cabeçalho. */
  headerParts?: Partial<Record<HeaderPart, boolean>>;
  showConstructions?: boolean;
  /** Quais construções entram no logo grande (null = todas as ligadas na cena). */
  constructionKeys?: string[] | null;
  /** Quais linhas da tabela de métricas entram (null = todas). */
  metricRows?: string[] | null;
  /** Quais versões entram no bloco de versões. */
  versions?: LogoVariant[];
  /** Aviso de uso do rodapé. */
  footerNote?: string;
  /** Tamanhos mínimos em px (padrão 16, 24, 32, 48). */
  pixelSizes?: number[];
  /** Tamanhos mínimos em mm (padrão 10, 15, 20). */
  millimeterSizes?: number[];
  // --- compatibilidade: as antigas caixas de marcação ----------------------
  showClearspace?: boolean;
  showMinSizes?: boolean;
  showMetrics?: boolean;
  showVersions?: boolean;
}

export interface ResolvedBrandSheetOptions extends Required<Omit<BrandSheetOptions, 'date' | 'headerParts' | 'blocks'>> {
  date: string;
  blocks: SheetBlockChoice[];
  headerParts: Record<HeaderPart, boolean>;
}

export const DEFAULT_PIXEL_SIZES = [16, 24, 32, 48];
export const DEFAULT_MILLIMETER_SIZES = [10, 15, 20];
export const DEFAULT_FOOTER_NOTE =
  'Use sempre os arquivos originais. Não recrie, distorça, recolora nem aplique efeitos sobre o logotipo. Respeite a área de respiro e os tamanhos mínimos desta folha.';

/** dd/mm/aaaa, sem depender de locale do ambiente. */
export function formatSheetDate(input?: Date | string | number): string {
  if (typeof input === 'string' && input.trim() && Number.isNaN(Date.parse(input))) return input.trim();
  const d = input === undefined ? new Date() : new Date(input as string | number | Date);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (v: number) => String(v).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const sizeList = (value: number[] | undefined, fallback: number[]): number[] => {
  if (Array.isArray(value)) {
    const list = value.filter(v => Number.isFinite(v) && v > 0);
    return list.length ? list.slice(0, 8) : fallback;
  }
  return fallback;
};

/** Normaliza a lista de blocos: mantém a ordem pedida e completa o que faltar. */
export function resolveBlocks(
  blocks: SheetBlockChoice[] | undefined,
  legacy: Pick<BrandSheetOptions, 'showClearspace' | 'showMinSizes' | 'showMetrics' | 'showVersions'> = {},
): SheetBlockChoice[] {
  const legacyOff = new Set<BrandSheetBlockId>();
  if (legacy.showClearspace === false) legacyOff.add('clearspace');
  if (legacy.showMinSizes === false) legacyOff.add('minSizes');
  if (legacy.showMetrics === false) legacyOff.add('metrics');
  if (legacy.showVersions === false) legacyOff.add('versions');

  const out: SheetBlockChoice[] = [];
  const seen = new Set<BrandSheetBlockId>();
  for (const item of Array.isArray(blocks) ? blocks : []) {
    const id = item?.id as BrandSheetBlockId;
    if (!id || seen.has(id) || !(BRAND_SHEET_BLOCKS as readonly string[]).includes(id)) continue;
    seen.add(id);
    out.push({ id, enabled: item.enabled !== false && !legacyOff.has(id) });
  }
  for (const fallback of DEFAULT_BLOCKS) {
    if (seen.has(fallback.id)) continue;
    out.push({ id: fallback.id, enabled: fallback.enabled && !legacyOff.has(fallback.id) });
  }
  return out;
}

const isEnabled = (blocks: SheetBlockChoice[], id: BrandSheetBlockId): boolean =>
  blocks.some(b => b.id === id && b.enabled);

const keyList = (value: string[] | null | undefined): string[] | null =>
  Array.isArray(value) ? value.filter(v => typeof v === 'string') : null;

export function resolveBrandSheetOptions(options: BrandSheetOptions = {}): ResolvedBrandSheetOptions {
  const blocks = resolveBlocks(options.blocks, options);
  const parts = options.headerParts ?? {};
  const versions = Array.isArray(options.versions)
    ? VERSION_VARIANTS.map(v => v.value).filter(v => options.versions!.includes(v))
    : VERSION_VARIANTS.map(v => v.value);
  return {
    page: isPageSize(options.page) ? options.page : 'a4',
    orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
    layout: ['auto', 'single', 'double', 'logoOnly'].includes(options.layout as string)
      ? (options.layout as SheetLayoutMode) : 'auto',
    theme: ['light', 'dark', 'transparent'].includes(options.theme as string)
      ? (options.theme as SheetTheme) : 'light',
    density: options.density === 'compact' ? 'compact' : 'comfortable',
    showSheetGrid: options.showSheetGrid === true,
    title: (options.title ?? '').trim() || activeT().brandSheet.sheetDefaultTitle,
    subtitle: (options.subtitle ?? '').trim(),
    fileName: (options.fileName ?? '').trim(),
    date: formatSheetDate(options.date),
    blocks,
    headerParts: {
      title: parts.title !== false,
      subtitle: parts.subtitle !== false,
      date: parts.date !== false,
      fileName: parts.fileName !== false,
    },
    showConstructions: options.showConstructions !== false,
    constructionKeys: keyList(options.constructionKeys),
    metricRows: keyList(options.metricRows),
    versions: versions.length ? versions : VERSION_VARIANTS.map(v => v.value),
    footerNote: (options.footerNote ?? '').trim() || DEFAULT_FOOTER_NOTE,
    pixelSizes: sizeList(options.pixelSizes, DEFAULT_PIXEL_SIZES),
    millimeterSizes: sizeList(options.millimeterSizes, DEFAULT_MILLIMETER_SIZES),
    // espelho das antigas caixas, para quem ainda lê essas chaves
    showClearspace: isEnabled(blocks, 'clearspace'),
    showMinSizes: isEnabled(blocks, 'minSizes'),
    showMetrics: isEnabled(blocks, 'metrics'),
    showVersions: isEnabled(blocks, 'versions'),
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function stack(
  ids: BrandSheetBlockId[],
  x: number, y: number, width: number, height: number,
  gap: number, units: SheetUnits,
): SheetBlock[] {
  const heights = distributeHeights(
    Math.max(0, height - gap * Math.max(0, ids.length - 1)),
    ids.map(id => ({ weight: weightOf(id), min: units.space(minMmOf(id)) })),
  );
  const out: SheetBlock[] = [];
  let cursor = y;
  ids.forEach((id, i) => {
    out.push({ id, title: BLOCK_TITLES[id], frame: { x, y: cursor, width, height: heights[i] } });
    cursor += heights[i] + gap;
  });
  return out;
}

/**
 * Geometria da folha, na unidade de canvas da página.
 *
 * `auto` decide sozinho: página deitada ganha o logo numa coluna à esquerda;
 * página em pé fica numa coluna só enquanto os blocos couberem nas alturas
 * mínimas, e passa a duas colunas quando não couberem.
 */
export function computeSheetLayout(options: BrandSheetOptions = {}): SheetLayout {
  return layoutFromResolved(resolveBrandSheetOptions(options));
}

function layoutFromResolved(opts: ResolvedBrandSheetOptions): SheetLayout {
  const page = pageSizePt(opts.page, opts.orientation);
  const unit = pageUnit(opts.page);
  const units = createSheetUnits(page, unit, opts.density);
  const margin = units.space(MARGIN_MM);
  const gap = units.space(GAP_MM);
  const contentX = margin;
  const contentW = Math.max(1, page.width - margin * 2);
  const wide = page.width > page.height;

  if (opts.layout === 'logoOnly') {
    return {
      page, unit, units, margin, gap, columns: 1,
      blocks: [{
        id: 'logo',
        title: BLOCK_TITLES.logo,
        frame: { x: contentX, y: margin, width: contentW, height: Math.max(1, page.height - margin * 2) },
      }],
    };
  }

  const enabled = opts.blocks.filter(b => b.enabled).map(b => b.id);
  const body = enabled.filter(id => id !== 'header' && id !== 'footer');
  const hasHeader = enabled.includes('header');
  const hasFooter = enabled.includes('footer');

  const headerH = hasHeader ? units.space(HEADER_MM[wide ? 'landscape' : 'portrait']) : 0;
  const footerH = hasFooter ? units.space(FOOTER_MM) : 0;

  const blocks: SheetBlock[] = [];
  if (hasHeader) {
    blocks.push({ id: 'header', title: BLOCK_TITLES.header, frame: { x: contentX, y: margin, width: contentW, height: headerH } });
  }

  const bodyY = margin + headerH + (hasHeader ? gap : 0);
  const bodyH = Math.max(1, page.height - margin - footerH - (hasFooter ? gap : 0) - bodyY);

  let columns = 1;
  if (body.length) {
    const minSum = body.reduce((s, id) => s + units.space(minMmOf(id)), 0) + gap * (body.length - 1);
    let mode: SheetLayoutMode | 'split' = opts.layout;
    if (mode === 'auto') {
      if (wide && body.length > 1 && body.includes('logo')) mode = 'split';
      else mode = minSum > bodyH && body.length > 2 ? 'double' : 'single';
    }

    if (mode === 'split') {
      const leftW = Math.max(1, contentW * 0.52);
      const rightW = Math.max(1, contentW - leftW - gap);
      const rest = body.filter(id => id !== 'logo');
      columns = 2;
      blocks.push({ id: 'logo', title: BLOCK_TITLES.logo, frame: { x: contentX, y: bodyY, width: leftW, height: bodyH } });
      blocks.push(...stack(rest, contentX + leftW + gap, bodyY, rightW, bodyH, gap, units));
    } else if (mode === 'double' && body.length > 1) {
      const colW = Math.max(1, (contentW - gap) / 2);
      const cut = balanceColumns(body.map(weightOf));
      columns = 2;
      blocks.push(...stack(body.slice(0, cut), contentX, bodyY, colW, bodyH, gap, units));
      blocks.push(...stack(body.slice(cut), contentX + colW + gap, bodyY, colW, bodyH, gap, units));
    } else {
      blocks.push(...stack(body, contentX, bodyY, contentW, bodyH, gap, units));
    }
  }

  if (hasFooter) {
    blocks.push({
      id: 'footer',
      title: BLOCK_TITLES.footer,
      frame: { x: contentX, y: page.height - margin - footerH, width: contentW, height: footerH },
    });
  }
  return { page, unit, units, margin, gap, columns, blocks };
}

// ---------------------------------------------------------------------------
// Conteúdo textual (puro)
// ---------------------------------------------------------------------------

const CLEARSPACE_UNIT_LABEL: Record<ClearspaceUnit, (v: number) => string> = {
  logomark: v => fill(activeT().brandSheet.sheetTimesLogotype, { value: trimNumber(v) }),
  pixels: v => `${trimNumber(v)} px`,
  centimeters: v => `${trimNumber(v)} cm`,
  inches: v => `${trimNumber(v)} in`,
};

/** "X = 1 × logotipo" / "X = 12 px" — texto do painel de respiro. */
export function describeClearspace(value: number, unit: ClearspaceUnit): string {
  if (!Number.isFinite(value) || value <= 0) return activeT().brandSheet.sheetClearspaceUndefined;
  const fn = CLEARSPACE_UNIT_LABEL[unit] ?? CLEARSPACE_UNIT_LABEL.logomark;
  return `X = ${fn(value)}`;
}

const pct = (v: number, digits = 1) => `${(Number.isFinite(v) ? v * 100 : 0).toFixed(digits)}%`;

export interface MetricRow { key: MetricRowKey; label: string; value: string }

/**
 * Linhas da tabela de métricas. `keys` filtra e mantém a ordem canônica;
 * `null` imprime todas as que existem para o estado atual.
 */
export function brandSheetMetricRows(
  metrics: LogoMetrics | null | undefined,
  keys: string[] | null = null,
): MetricRow[] {
  const round = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
  const rows: MetricRow[] = metrics
    ? [
      { key: 'aspect', label: METRIC_ROW_LABELS.aspect, value: `${metrics.aspectRatioLabel} (${round(metrics.aspectRatio).toString().replace('.', ',')})` },
      { key: 'box', label: METRIC_ROW_LABELS.box, value: `${round(metrics.width)} × ${round(metrics.height)}`.replace(/\./g, ',') },
      { key: 'ink', label: METRIC_ROW_LABELS.ink, value: pct(metrics.inkCoverage) },
      { key: 'deviation', label: METRIC_ROW_LABELS.deviation, value: `${round(metrics.deviationPercent).toString().replace('.', ',')}%` },
      { key: 'symmetry', label: METRIC_ROW_LABELS.symmetry, value: `${pct(metrics.symmetry.vertical, 0)} / ${pct(metrics.symmetry.horizontal, 0)}` },
      { key: 'anchors', label: METRIC_ROW_LABELS.anchors, value: fill(activeT().brandSheet.sheetSmooth, { n: metrics.anchorCount, pct: pct(metrics.smoothAnchorRatio, 0) }) },
      { key: 'components', label: METRIC_ROW_LABELS.components, value: String(metrics.componentCount) },
    ]
    : (['aspect', 'ink', 'deviation', 'symmetry', 'anchors'] as MetricRowKey[])
      .map(key => ({ key, label: METRIC_ROW_LABELS[key], value: '—' }));

  if (!keys) return rows;
  const wanted = new Set(keys);
  const filtered = rows.filter(r => wanted.has(r.key));
  return filtered.length ? filtered : rows;
}

/**
 * Quebra de linha aproximada por largura (Helvetica ≈ 0,5 em por caractere).
 * Puro, para o rodapé caber sem medir texto no canvas.
 */
export function wrapText(text: string, maxWidthPt: number, fontSizePt: number): string[] {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const charWidth = Math.max(0.1, fontSizePt * 0.5);
  const maxChars = Math.max(8, Math.floor(Math.max(1, maxWidthPt) / charWidth));
  const words = clean.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) { line = candidate; continue; }
    if (line) lines.push(line);
    if (word.length > maxChars) {
      let rest = word;
      while (rest.length > maxChars) { lines.push(rest.slice(0, maxChars)); rest = rest.slice(maxChars); }
      line = rest;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Amostras da fita de tamanhos mínimos, na unidade de canvas da folha.
 * Sem `units`, responde em pontos (folha de papel), como sempre respondeu.
 */
export function minSizeSamples(
  pixelSizes: number[],
  millimeterSizes: number[],
  units?: SheetUnits,
): Array<{ label: string; heightPt: number }> {
  const fromPx = units ? units.fromPx : pxToPt;
  const fromMm = units ? units.fromMm : mmToPt;
  return [
    ...pixelSizes.map(px => ({ label: `${trimNumber(px)} px`, heightPt: fromPx(px) })),
    ...millimeterSizes.map(mm => ({ label: `${trimNumber(mm)} mm`, heightPt: fromMm(mm) })),
  ];
}

// ---------------------------------------------------------------------------
// Escala das guias
// ---------------------------------------------------------------------------

/** Espessura, em pontos, de uma unidade de guia dentro da folha impressa. */
export const SHEET_GUIDE_UNIT_PT = 0.75;

/**
 * `guideScale` para o logo desenhado na folha. `createGuideMetrics` usa
 * `unit = diagonal / REFERENCE_DIAGONAL * guideScale`; aqui o resultado é
 * proporcional ao tamanho em que o logo aparece, de modo que uma unidade de
 * guia valha sempre `guideUnit` na página (independente do formato).
 */
export function sheetGuideScale(logoDiagonalPt: number, userScale = 1, guideUnit = SHEET_GUIDE_UNIT_PT): number {
  const d = Number.isFinite(logoDiagonalPt) && logoDiagonalPt > 0 ? logoDiagonalPt : REFERENCE_DIAGONAL;
  const u = Number.isFinite(userScale) && userScale > 0 ? userScale : 1;
  const g = Number.isFinite(guideUnit) && guideUnit > 0 ? guideUnit : SHEET_GUIDE_UNIT_PT;
  return ((g * REFERENCE_DIAGONAL) / d) * u;
}

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------

export interface BrandSheetResult {
  project: paper.Project;
  scope: paper.PaperScope;
  /** Página na unidade de canvas. */
  page: { width: number; height: number };
  unit: PageUnit;
  layout: SheetLayout;
  blocks: SheetBlock[];
  options: ResolvedBrandSheetOptions;
  palette: PaletteSwatch[];
  warnings: string[];
  errors: Array<{ key: string; message: string }>;
}

let sheetScope: paper.PaperScope | null = null;
function getSheetScope(): paper.PaperScope {
  if (!sheetScope) sheetScope = new paper.PaperScope();
  return sheetScope;
}

/** Desliga todas as construções (folha sem overlays). */
function withoutConstructions(settings: SceneSettings): SceneSettings {
  const off = {} as GeometryOptions;
  for (const key of GEOMETRY_KEYS) off[key] = false;
  return { ...settings, geometryOptions: off, showGrid: false, clearspaceValue: 0 };
}

/** Mantém só as construções escolhidas (dentre as que já estavam ligadas). */
function onlyConstructions(settings: SceneSettings, keys: string[] | null): SceneSettings {
  if (!keys) return settings;
  const wanted = new Set(keys);
  const next = {} as GeometryOptions;
  for (const key of GEOMETRY_KEYS) {
    next[key] = Boolean(settings.geometryOptions?.[key]) && wanted.has(String(key));
  }
  return { ...settings, geometryOptions: next, showGrid: settings.showGrid && wanted.has('grid') };
}

/**
 * Monta a folha inteira num PaperScope privado. O projeto devolvido tem a
 * página inteira como `MediaBox` natural (0,0 → page.width, page.height), uma
 * camada nomeada por bloco, e pode ser exportado como SVG / PDF / PNG.
 */
export function buildBrandSheet(
  parsed: ParsedSVG | null | undefined,
  settings: SceneSettings,
  metrics: LogoMetrics | null | undefined,
  options: BrandSheetOptions = {},
): BrandSheetResult {
  const opts = resolveBrandSheetOptions(options);
  const layout = layoutFromResolved(opts);
  const units = layout.units;
  const palette = sheetPalette(opts.theme);
  const scope = getSheetScope();
  const warnings: string[] = [];
  const errors: Array<{ key: string; message: string }> = [];
  const swatches = extractSvgPalette(parsed?.originalSVG ?? null);

  try {
    const project = resetPaperProject(null, scope, {
      width: Math.ceil(layout.page.width),
      height: Math.ceil(layout.page.height),
    });
    scope.activate();

    const layerFor = (id: BrandSheetBlockId | 'page' | 'grid'): paper.Layer => {
      const layer = new paper.Layer();
      layer.name = id === 'page' ? 'page' : id === 'grid' ? 'sheet-grid' : blockLayerId(id);
      layer.activate();
      return layer;
    };

    // --- página -----------------------------------------------------------
    if (palette.page) {
      layerFor('page');
      const bg = new paper.Path.Rectangle(new paper.Rectangle(0, 0, Math.max(1, layout.page.width), Math.max(1, layout.page.height)));
      bg.fillColor = new paper.Color(palette.page);
    }

    // --- template do logo -------------------------------------------------
    const templateLayer = new paper.Layer();
    templateLayer.name = 'template';
    templateLayer.activate();
    let template: paper.Item | null = null;
    if (parsed?.originalSVG) {
      try {
        template = project.importSVG(parsed.originalSVG, { expandShapes: true }) as paper.Item | null;
      } catch (err) {
        errors.push({ key: 'logo', message: err instanceof Error ? err.message : String(err) });
        template = null;
      }
    }
    if (!template) warnings.push(activeT().brandSheet.sheetWarnNoLogo);
    const naturalW = template?.bounds.width || 0;
    const naturalH = template?.bounds.height || 0;

    const painter: SheetPainter = createSheetPainter({ units, palette, template });
    const { text, box, rule, fitInto, placeLogo, type } = painter;

    // --- malha de construção ---------------------------------------------
    if (opts.showSheetGrid) {
      layerFor('grid');
      drawSheetGrid(painter, layout.page, layout.margin, layout.gap, 12);
    }

    const frameOf = (id: BrandSheetBlockId): Frame | null =>
      layout.blocks.find(b => b.id === id)?.frame ?? null;

    /** Desenha o logo (e, se pedido, as construções) dentro de um palco. */
    const drawLogoStage = (stage: Frame, layerName: string, plain: boolean): void => {
      if (!parsed || !template) {
        text(activeT().brandSheet.sheetNoSvg, stage.x + stage.width / 2, stage.y + stage.height / 2, {
          size: type.body, align: 'center', color: palette.muted,
        });
        return;
      }
      const scenePad = units.space(4);
      const fw = parsed.fullBounds.width || naturalW || 1;
      const fh = parsed.fullBounds.height || naturalH || 1;
      const fitScale = computeFitScale(fw, fh, { width: stage.width, height: stage.height, padding: scenePad });
      const diagonal = Math.hypot(fw * fitScale, fh * fitScale);
      // A área de respiro tem painel próprio na folha; deixá-la aqui obrigaria
      // o logo "grande" a encolher para caber a moldura de respiro junto.
      const base = plain
        ? withoutConstructions(settings)
        : onlyConstructions(settings, opts.constructionKeys);
      const hostLayer = project.layers.find(l => l.name === layerName) ?? null;

      const renderPass = (guideScale: number): { group: paper.Group | null; fit: number } => {
        const sceneLayer = new paper.Layer();
        sceneLayer.name = 'brandsheet-scene-tmp';
        sceneLayer.activate();
        let logoItem: paper.Item | null = null;
        try {
          const result = renderScene(parsed, { ...base, clearspaceValue: 0, guideScale }, {
            width: stage.width,
            height: stage.height,
            padding: scenePad,
          }, { scope });
          errors.push(...result.errors);
          logoItem = result.logo;
        } catch (err) {
          errors.push({ key: 'scene', message: err instanceof Error ? err.message : String(err) });
        }
        // Folha escura pede o logo em negativo — só o logo, nunca as guias.
        if (logoItem && palette.logoVariant === 'negative') {
          applyLogoAppearance(logoItem, { svgColorOverride: '#FFFFFF' });
        }
        const children = sceneLayer.removeChildren();
        sceneLayer.remove();
        (hostLayer ?? project.activeLayer).activate();
        if (!children.length) return { group: null, fit: 1 };
        const group = new paper.Group(children);
        group.name = 'scene';
        group.translate(new paper.Point(stage.x, stage.y));
        return { group, fit: fitInto(group, stage) };
      };

      const baseGuide = sheetGuideScale(diagonal, settings.guideScale ?? 1, SHEET_GUIDE_UNIT_PT * units.typeScale);
      const errorsBefore = errors.length;
      let pass = renderPass(baseGuide);
      // Rótulos e extensões das construções podem estourar o quadro; quando a
      // cena encolhe muito, refaz uma vez com as guias mais grossas para que
      // o traço final continue com peso coerente.
      if (pass.group && pass.fit < 0.9 && pass.fit > 0) {
        const corrected = baseGuide / pass.fit;
        pass.group.remove();
        errors.length = errorsBefore; // a primeira passada era só uma medição
        pass = renderPass(corrected);
      }
      if (pass.group && pass.fit < 0.9) warnings.push(activeT().brandSheet.sheetWarnSceneFit);
    };

    // --- só o logo (capa) -------------------------------------------------
    if (opts.layout === 'logoOnly') {
      const frame = frameOf('logo');
      if (frame) {
        layerFor('logo');
        drawLogoStage(frame, blockLayerId('logo'), !opts.showConstructions);
      }
      templateLayer.remove();
      return {
        project, scope, page: layout.page, unit: layout.unit, layout,
        blocks: layout.blocks, options: opts, palette: swatches, warnings, errors,
      };
    }

    // --- cabeçalho --------------------------------------------------------
    const header = frameOf('header');
    if (header) {
      layerFor('header');
      let y = header.y + type.title;
      if (opts.headerParts.title) {
        text(opts.title, header.x, y, { size: type.title, bold: true });
      }
      if (opts.headerParts.subtitle && opts.subtitle) {
        y += type.subtitle + units.space(1.4);
        text(opts.subtitle, header.x, y, { size: type.subtitle, color: palette.muted });
      }
      const right = header.x + header.width;
      let my = header.y + type.meta;
      if (opts.headerParts.fileName && opts.fileName) {
        text(opts.fileName, right, my, { size: type.meta, align: 'right' });
        my += type.meta + units.space(1);
      }
      if (opts.headerParts.date) {
        text(opts.date, right, my, { size: type.meta, align: 'right', color: palette.muted });
      }
      rule(header.x, header.y + header.height - units.space(0.7), right, palette.ink, Math.max(0.5, 0.9 * units.typeScale));
    }

    // --- logo grande ------------------------------------------------------
    const logoFrame = frameOf('logo');
    if (logoFrame) {
      layerFor('logo');
      const stage = painter.panel(logoFrame, BLOCK_TITLES.logo, {
        caption: opts.showConstructions ? activeT().brandSheet.sheetConstructions : undefined,
      });
      drawLogoStage(stage, blockLayerId('logo'), !opts.showConstructions);
    }

    // --- área de respiro --------------------------------------------------
    const clearFrame = frameOf('clearspace');
    if (clearFrame) {
      layerFor('clearspace');
      const stage = painter.panel(clearFrame, BLOCK_TITLES.clearspace, {
        soft: true,
        caption: describeClearspace(settings.clearspaceValue, settings.clearspaceUnit),
      });
      if (template) {
        const group = new paper.Group();
        group.name = 'clearspace-sample';
        // X cresce junto com o logo, então o diagrama inteiro é uma escala
        // única: calcula-se o fator antes de desenhar, e a tipografia continua
        // no seu tamanho (nada é reescalado depois).
        const logomarkNatural = parsed ? getLogomarkSize(parsed.components) : naturalH;
        const xNatural = convertToPixels(settings.clearspaceValue, settings.clearspaceUnit, logomarkNatural, 1);
        const labelPad = type.caption * 2;
        const diagramW = (naturalW || 1) + xNatural * 2;
        const diagramH = (naturalH || 1) + xNatural * 2;
        const k = Math.max(0.001, Math.min(
          (stage.width - labelPad) / diagramW,
          (stage.height - labelPad) / diagramH,
        ) * 0.94);
        const center = new paper.Point(stage.x + stage.width / 2, stage.y + stage.height / 2);
        const logo = placeLogo(group, { height: Math.max(4, (naturalH || 1) * k), center, variant: 'mono' });
        if (logo) {
          const drawn = naturalH > 0 ? logo.bounds.height / naturalH : k;
          const x = xNatural * drawn;
          if (x > 0) {
            const b = logo.bounds;
            const outer: Frame = { x: b.left - x, y: b.top - x, width: b.width + x * 2, height: b.height + x * 2 };
            const ring = box(outer, { stroke: palette.ink, width: Math.max(0.4, 0.6 * units.typeScale), dash: [units.space(1), units.space(0.7)] });
            group.addChild(ring);
            const inner = box({ x: b.left, y: b.top, width: b.width, height: b.height }, { stroke: palette.hairline, width: Math.max(0.3, 0.4 * units.typeScale) });
            group.addChild(inner);
            const mark = (mx: number, my: number) => {
              group.addChild(text('X', mx, my, { size: type.caption, align: 'center', bold: true }));
            };
            mark(b.center.x, b.top - x / 2 + type.caption * 0.35);
            mark(b.center.x, b.bottom + x / 2 + type.caption * 0.35);
            mark(b.left - x / 2, b.center.y + type.caption * 0.35);
            mark(b.right + x / 2, b.center.y + type.caption * 0.35);
          }
          if (fitInto(group, stage) < 0.99) warnings.push(activeT().brandSheet.sheetWarnClearspaceFit);
        }
      } else {
        text('—', stage.x + stage.width / 2, stage.y + stage.height / 2, { size: type.body, align: 'center', color: palette.muted });
      }
    }

    // --- tamanhos mínimos -------------------------------------------------
    const minFrame = frameOf('minSizes');
    if (minFrame) {
      layerFor('minSizes');
      const stage = painter.panel(minFrame, BLOCK_TITLES.minSizes, { caption: activeT().brandSheet.sheetLogoHeight });
      const samples = minSizeSamples(opts.pixelSizes, opts.millimeterSizes, units);
      if (template && samples.length) {
        const group = new paper.Group();
        group.name = 'min-size-strip';
        const captionH = type.caption + units.space(1);
        const gapPt = units.space(2);
        const rowGap = units.space(2);
        // Cada amostra ocupa a largura que o logo tem naquela altura; o rótulo
        // é o piso, senão "20 mm" sai por cima de "15 mm".
        const slot = (s: { heightPt: number }) => Math.max(s.heightPt * painter.logoAspect, type.caption * 3.4);

        // Numa coluna estreita a fita quebra em linhas em vez de virar um
        // amontoado espremido (logo largo em página de story, por exemplo).
        const rows: Array<typeof samples> = [];
        let row: typeof samples = [];
        let rowWidth = 0;
        for (const sample of samples) {
          const w = slot(sample);
          const next = row.length ? rowWidth + gapPt + w : w;
          if (row.length && next > stage.width) {
            rows.push(row);
            row = [sample];
            rowWidth = w;
          } else {
            row.push(sample);
            rowWidth = next;
          }
        }
        if (row.length) rows.push(row);

        const rowHeight = (list: typeof samples) => Math.max(...list.map(s => s.heightPt)) + captionH;
        const totalH = rows.reduce((s, list) => s + rowHeight(list), 0) + rowGap * Math.max(0, rows.length - 1);
        let top = stage.y + Math.max(0, (stage.height - totalH) / 2);

        for (const list of rows) {
          const widths = list.map(slot);
          const totalW = widths.reduce((a, b) => a + b, 0) + gapPt * Math.max(0, list.length - 1);
          const baseline = top + rowHeight(list) - captionH;
          let cursor = stage.x + Math.max(0, (stage.width - totalW) / 2);
          list.forEach((sample, i) => {
            const cx = cursor + widths[i] / 2;
            placeLogo(group, {
              height: sample.heightPt,
              center: new paper.Point(cx, baseline - sample.heightPt / 2),
              variant: 'mono',
            });
            group.addChild(text(sample.label, cx, baseline + type.caption, { size: type.caption, align: 'center', color: palette.muted }));
            cursor += widths[i] + gapPt;
          });
          top += rowHeight(list) + rowGap;
        }
        if (fitInto(group, stage) < 0.99) warnings.push(activeT().brandSheet.sheetWarnStripFit);
      } else {
        text('—', stage.x + stage.width / 2, stage.y + stage.height / 2, { size: type.body, align: 'center', color: palette.muted });
      }
    }

    // --- métricas ---------------------------------------------------------
    const metricsFrame = frameOf('metrics');
    if (metricsFrame) {
      layerFor('metrics');
      const rows = brandSheetMetricRows(metrics, opts.metricRows);
      const stage = painter.panel(metricsFrame, BLOCK_TITLES.metrics, {
        caption: plural(rows.length, activeT().brandSheet.sheetRowOne, activeT().brandSheet.sheetRowOther),
      });
      const rowH = Math.max(type.body + units.space(0.5), Math.min(units.space(4.6), stage.height / Math.max(1, rows.length)));
      const left = stage.x;
      const right = stage.x + stage.width;
      rows.forEach((row, i) => {
        const y = stage.y + rowH * i;
        if (y + rowH > stage.y + stage.height + 0.5) return;
        const baseline = y + rowH - (rowH - type.body) / 2 - 1;
        text(row.label, left, baseline, { size: type.body, color: palette.muted });
        text(row.value, right, baseline, { size: type.body, align: 'right' });
        if (i < rows.length - 1) rule(left, y + rowH, right);
      });
    }

    // --- versões ----------------------------------------------------------
    const versionsFrame = frameOf('versions');
    if (versionsFrame) {
      layerFor('versions');
      const cells = VERSION_VARIANTS.filter(v => opts.versions.includes(v.value));
      const stage = painter.panel(versionsFrame, BLOCK_TITLES.versions, {
        caption: plural(cells.length, activeT().brandSheet.sheetVersionOne, activeT().brandSheet.sheetVersionOther),
      });
      const captionH = type.caption + units.space(1);
      const cellH = Math.max(6, stage.height - captionH);
      const gapPt = units.space(2.5);
      const cellW = Math.max(6, (stage.width - gapPt * Math.max(0, cells.length - 1)) / Math.max(1, cells.length));
      cells.forEach((cell, i) => {
        const cx = stage.x + (cellW + gapPt) * i;
        const frame: Frame = { x: cx, y: stage.y, width: cellW, height: cellH };
        box(frame, {
          fill: cell.value === 'negative' ? palette.panelInvert : (palette.panelSoft ?? undefined),
          stroke: palette.hairline,
          width: Math.max(0.3, 0.4 * units.typeScale),
          radius: units.space(1),
        });
        if (template) {
          const holder = new paper.Group();
          holder.name = `version-${cell.value}`;
          placeLogo(holder, {
            longest: Math.min(cellW * 0.68, cellH * 0.6),
            center: new paper.Point(cx + cellW / 2, stage.y + cellH / 2),
            variant: cell.value,
          });
        }
        text(cell.label, cx + cellW / 2, stage.y + cellH + type.caption + units.space(0.5), {
          size: type.caption, align: 'center', color: palette.muted,
        });
      });
    }

    // --- paleta -----------------------------------------------------------
    const paletteFrame = frameOf('palette');
    if (paletteFrame) {
      layerFor('palette');
      drawPaletteBlock(painter, paletteFrame, swatches, BLOCK_TITLES.palette);
    }

    // --- uso correto e incorreto -----------------------------------------
    const usageFrame = frameOf('usage');
    if (usageFrame) {
      layerFor('usage');
      drawUsageBlock(painter, usageFrame, BLOCK_TITLES.usage);
    }

    // --- anatomia ---------------------------------------------------------
    const anatomyFrame = frameOf('anatomy');
    if (anatomyFrame) {
      layerFor('anatomy');
      drawAnatomyBlock(
        painter,
        anatomyFrame,
        (parsed?.components ?? []).map(c => ({
          bounds: { left: c.bounds.left, top: c.bounds.top, width: c.bounds.width, height: c.bounds.height },
        })),
        parsed ? {
          left: parsed.fullBounds.left, top: parsed.fullBounds.top,
          width: parsed.fullBounds.width, height: parsed.fullBounds.height,
        } : null,
        BLOCK_TITLES.anatomy,
      );
    }

    // --- fita de fundos ---------------------------------------------------
    const backgroundsFrame = frameOf('backgrounds');
    if (backgroundsFrame) {
      layerFor('backgrounds');
      drawBackgroundsBlock(painter, backgroundsFrame, swatches, BLOCK_TITLES.backgrounds);
    }

    // --- rodapé -----------------------------------------------------------
    const footer = frameOf('footer');
    if (footer) {
      layerFor('footer');
      rule(footer.x, footer.y, footer.x + footer.width, palette.hairline);
      const label = pageLabel(opts.page, opts.orientation);
      const noteWidth = Math.max(40, footer.width - type.caption * label.length * 0.5 - units.space(6));
      const lines = wrapText(opts.footerNote, noteWidth, type.caption);
      lines.slice(0, 3).forEach((line, i) => {
        text(line, footer.x, footer.y + units.space(3) + (type.caption + units.space(0.7)) * i, { size: type.caption, color: palette.muted });
      });
      text(label, footer.x + footer.width, footer.y + units.space(3), { size: type.caption, align: 'right', color: palette.muted });
    }

    templateLayer.remove();

    return {
      project,
      scope,
      page: layout.page,
      unit: layout.unit,
      layout,
      blocks: layout.blocks,
      options: opts,
      palette: swatches,
      warnings,
      errors,
    };
  } finally {
    paper.activate();
  }
}

/** Retângulo da página (para recortar o export exatamente na folha). */
export function sheetPageRectangle(page: { width: number; height: number }): paper.Rectangle {
  return new paper.Rectangle(0, 0, Math.max(1, page.width), Math.max(1, page.height));
}

export { insetFrame, trimNumber };

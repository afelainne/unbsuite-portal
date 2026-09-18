/**
 * Painel da folha de marca.
 *
 * Autocontido: recebe `parsedSVG`, `settings`, `metrics` e `fileName` por
 * props, guarda só as escolhas da própria folha (formato, composição, tema,
 * textos e a lista de blocos), monta a prévia com atraso para não refazer a
 * folha a cada tecla, e exporta SVG / PDF / PNG pelo `brandsheet-export`.
 *
 * Anatomia do sistema: `card-head` com rótulo micro, `card-body` para o ritmo
 * vertical, controles `ctl`, seleção em preenchimento preto e amarelo só no botão
 * que confirma (exportar em PDF).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ChevronUp, Expand, Loader2, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Skeleton } from './ui/skeleton';
import { useSectionOpen } from '../hooks/use-section-open';
import { SectionHead } from './chrome';
import { SECTION_BODY } from './chrome-classes';
import SheetPreviewOverlay from './SheetPreviewOverlay';
import { ToolInput } from '@/tools/_shared/ui';
import { downloadBlob, downloadText } from '../lib/export-engine';
import type { ParsedSVG } from '../lib/svg-engine';
import type { SceneSettings } from '../lib/render-pipeline';
import type { LogoMetrics } from '../lib/metrics';
import { GEOMETRY_KEYS, type GeometryOptions } from '../types/geometry';
import { labelFor } from '../lib/geometry-meta';
import { useLanguage, fill } from '../i18n';
import {
  PAGE_GROUPS, PAGE_FORMATS, PAGE_GROUP_DEFAULT, pageSizeNative, pageLabel, isRotatable,
  BLOCK_TITLES, BLOCK_HINTS, DEFAULT_BLOCKS, DEFAULT_PIXEL_SIZES, DEFAULT_MILLIMETER_SIZES,
  LAYOUT_MODES, SHEET_THEMES, SHEET_DENSITIES, HEADER_PARTS, VERSION_VARIANTS,
  METRIC_ROW_KEYS, METRIC_ROW_LABELS, DEFAULT_METRIC_ROWS,
  type BrandSheetBlockId, type BrandSheetOptions, type HeaderPart, type LogoVariant,
  type MetricRowKey, type PageGroup, type PageOrientation, type PageSize,
  type SheetBlockChoice, type SheetDensity, type SheetLayoutMode, type SheetTheme,
} from '../lib/brandsheet';
import {
  exportBrandSheetSVG, exportBrandSheetPDF, exportBrandSheetPNG, brandSheetFileName,
  type BrandSheetExportInput,
} from '../lib/brandsheet-export';

export interface BrandSheetPanelProps {
  /** SVG carregado (null = painel em modo vazio). */
  parsedSVG: ParsedSVG | null;
  /** Configuração da cena, para desenhar as construções escolhidas na folha. */
  settings: SceneSettings;
  /** Métricas do logo, para a tabela da folha. */
  metrics: LogoMetrics | null;
  /** Nome do arquivo carregado, impresso no cabeçalho. */
  fileName?: string;
  /** Atraso (ms) antes de refazer a prévia depois de uma edição (padrão 220). */
  previewDelay?: number;
  defaultOpen?: boolean;
  /** Estado controlado da seção (a sidebar usa como acordeão). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const svgToDataUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const DEFAULT_HEADER_PARTS: Record<HeaderPart, boolean> = {
  title: true, subtitle: true, date: true, fileName: true,
};

/** Blocos com opções próprias abaixo da linha. */
const BLOCKS_WITH_OPTIONS = new Set<BrandSheetBlockId>(['header', 'logo', 'minSizes', 'metrics', 'versions']);

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** 210 e não 210.0; 215,9 e não 215.9. */
const dim = (v: number): string =>
  (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1).replace('.', ','));

const toggleInList = <T,>(list: T[], value: T): T[] =>
  (list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

// ---------------------------------------------------------------------------

interface ChoiceProps {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}

const Choice: React.FC<ChoiceProps> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    title={title}
    className={`ctl ctl-sm justify-center ${active ? 'ctl-active' : 'ctl-plain text-muted-foreground hover:text-foreground'}`}
  >
    {children}
  </button>
);

interface CheckItemProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  title?: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ checked, onChange, label, title }) => (
  <label
    title={title}
    className="flex items-center gap-2 rounded-md px-1.5 py-1 text-callout text-foreground transition-colors duration-fast ease-out hover:bg-fill cursor-pointer"
  >
    <input type="checkbox" className="ctl-check" checked={checked} onChange={onChange} />
    <span>{label}</span>
  </label>
);

// ---------------------------------------------------------------------------

const BrandSheetPanel: React.FC<BrandSheetPanelProps> = ({
  parsedSVG, settings, metrics, fileName, previewDelay = 220, defaultOpen = false,
  open: openProp, onOpenChange, className = '',
}) => {
  const [open, setOpen] = useSectionOpen(defaultOpen, openProp, onOpenChange);
  const { t, language } = useLanguage();
  const b = t.brandSheet;
  const [page, setPage] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [layout, setLayout] = useState<SheetLayoutMode>('auto');
  const [theme, setTheme] = useState<SheetTheme>('light');
  const [density, setDensity] = useState<SheetDensity>('comfortable');
  const [sheetGrid, setSheetGrid] = useState(false);
  // null = the default title, which follows the language until the person types one.
  const [titleDraft, setTitle] = useState<string | null>(null);
  const title = titleDraft ?? b.sheetTitlePlaceholder;
  const [subtitle, setSubtitle] = useState('');
  const [blocks, setBlocks] = useState<SheetBlockChoice[]>(() => DEFAULT_BLOCKS.map(b => ({ ...b })));
  const [headerParts, setHeaderParts] = useState<Record<HeaderPart, boolean>>({ ...DEFAULT_HEADER_PARTS });
  const [showConstructions, setShowConstructions] = useState(true);
  const [constructionKeys, setConstructionKeys] = useState<string[] | null>(null);
  const [pixelSizes, setPixelSizes] = useState<number[]>([...DEFAULT_PIXEL_SIZES]);
  const [millimeterSizes, setMillimeterSizes] = useState<number[]>([...DEFAULT_MILLIMETER_SIZES]);
  const [metricRows, setMetricRows] = useState<MetricRowKey[]>([...DEFAULT_METRIC_ROWS]);
  const [versions, setVersions] = useState<LogoVariant[]>(VERSION_VARIANTS.map(v => v.value));
  const [expanded, setExpanded] = useState<BrandSheetBlockId | null>(null);
  const [busy, setBusy] = useState<'svg' | 'pdf' | 'png' | null>(null);
  const [preview, setPreview] = useState<{ uri: string; error: string | null } | null>(null);
  const [building, setBuilding] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  /** Construções realmente ligadas na cena (é o que a folha pode desenhar). */
  const activeConstructions = useMemo(() => {
    const list: Array<{ key: string; label: string }> = [];
    if (settings.showGrid) list.push({ key: 'grid', label: b.sceneGrid });
    for (const key of GEOMETRY_KEYS) {
      if (settings.geometryOptions?.[key]) list.push({ key: String(key), label: labelFor(key as keyof GeometryOptions) });
    }
    return list;
  }, [settings.geometryOptions, settings.showGrid, b]);

  const group = useMemo<PageGroup>(() => PAGE_FORMATS[page]?.group ?? 'paper', [page]);
  const native = pageSizeNative(page, orientation);
  const rotatable = isRotatable(page);
  const aspect = native.height > 0 ? native.width / native.height : 1;

  const options = useMemo<BrandSheetOptions>(() => ({
    page,
    orientation,
    layout,
    theme,
    density,
    showSheetGrid: sheetGrid,
    title,
    subtitle,
    fileName,
    blocks,
    headerParts,
    showConstructions,
    constructionKeys,
    metricRows,
    versions,
    pixelSizes,
    millimeterSizes,
    footerNote: b.footerNote,
  }), [
    b.footerNote,
    page, orientation, layout, theme, density, sheetGrid, title, subtitle, fileName,
    blocks, headerParts, showConstructions, constructionKeys, metricRows, versions,
    pixelSizes, millimeterSizes,
  ]);

  const input = useMemo<BrandSheetExportInput>(
    () => ({ parsed: parsedSVG, settings, metrics, options }),
    [parsedSVG, settings, metrics, options],
  );

  // Prévia com atraso: montar a folha importa o SVG e roda o pipeline, caro
  // demais para rodar a cada tecla digitada no título.
  useEffect(() => {
    if (!open || !parsedSVG) { setPreview(null); setBuilding(false); return; }
    setBuilding(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        setPreview({ uri: svgToDataUri(exportBrandSheetSVG(input)), error: null });
      } catch (err) {
        setPreview({ uri: '', error: errorMessage(err) });
      } finally {
        setBuilding(false);
      }
    }, Math.max(0, previewDelay));
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // The sheet prints its labels in the active language.
  }, [open, parsedSVG, input, previewDelay, language]);

  const pickGroup = useCallback((next: PageGroup) => {
    setPage(PAGE_GROUP_DEFAULT[next]);
  }, []);

  const toggleBlock = useCallback((id: BrandSheetBlockId) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, enabled: !b.enabled } : b)));
  }, []);

  const moveBlock = useCallback((id: BrandSheetBlockId, delta: number) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      return index < 0 ? prev : move(prev, index, index + delta);
    });
  }, []);

  const toggleConstruction = useCallback((key: string) => {
    setConstructionKeys(prev => {
      const base = prev ?? activeConstructions.map(c => c.key);
      return toggleInList(base, key);
    });
  }, [activeConstructions]);

  const reset = useCallback(() => {
    setPage('a4');
    setOrientation('portrait');
    setLayout('auto');
    setTheme('light');
    setDensity('comfortable');
    setSheetGrid(false);
    setTitle(null);
    setSubtitle('');
    setBlocks(DEFAULT_BLOCKS.map(b => ({ ...b })));
    setHeaderParts({ ...DEFAULT_HEADER_PARTS });
    setShowConstructions(true);
    setConstructionKeys(null);
    setPixelSizes([...DEFAULT_PIXEL_SIZES]);
    setMillimeterSizes([...DEFAULT_MILLIMETER_SIZES]);
    setMetricRows([...DEFAULT_METRIC_ROWS]);
    setVersions(VERSION_VARIANTS.map(v => v.value));
    setExpanded(null);
  }, []);

  const handleExport = useCallback(async (kind: 'svg' | 'pdf' | 'png') => {
    if (!parsedSVG) return;
    setBusy(kind);
    try {
      if (kind === 'svg') {
        downloadText(exportBrandSheetSVG(input), brandSheetFileName(input, 'svg'));
        toast.success(b.exportedSvg);
      } else if (kind === 'pdf') {
        downloadBlob(exportBrandSheetPDF(input), brandSheetFileName(input, 'pdf'));
        toast.success(b.exportedPdf);
      } else {
        const result = await exportBrandSheetPNG(input);
        downloadBlob(result.blob, brandSheetFileName(input, 'png'));
        toast.success(fill(b.exportedPng, { width: result.width, height: result.height }));
      }
    } catch (err) {
      toast.error(b.exportFailed, { description: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }, [parsedSVG, input, b]);

  const disabled = !parsedSVG;
  const onlyLogo = layout === 'logoOnly';

  const blockOptions = (id: BrandSheetBlockId): React.ReactNode => {
    if (id === 'header') {
      return (
        <div className="space-y-0.5">
          {HEADER_PARTS.map(part => (
            <CheckItem
              key={part.value}
              label={part.label}
              checked={headerParts[part.value]}
              onChange={() => setHeaderParts(prev => ({ ...prev, [part.value]: !prev[part.value] }))}
            />
          ))}
        </div>
      );
    }
    if (id === 'logo') {
      return (
        <div className="space-y-1">
          <CheckItem
            label={b.drawConstructions}
            checked={showConstructions}
            onChange={() => setShowConstructions(v => !v)}
          />
          {showConstructions && (
            activeConstructions.length ? (
              <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                {activeConstructions.map(item => (
                  <CheckItem
                    key={item.key}
                    label={item.label}
                    checked={constructionKeys === null || constructionKeys.includes(item.key)}
                    onChange={() => toggleConstruction(item.key)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-caption text-muted-foreground px-1.5">
                {b.noConstructions}
              </p>
            )
          )}
        </div>
      );
    }
    if (id === 'minSizes') {
      return (
        <div className="space-y-1.5">
          <span className="label block">{b.inPixels}</span>
          <div className="grid grid-cols-4 gap-1">
            {DEFAULT_PIXEL_SIZES.map(size => (
              <Choice
                key={size}
                active={pixelSizes.includes(size)}
                onClick={() => setPixelSizes(prev => toggleInList(prev, size).sort((a, b) => a - b))}
              >
                {size}
              </Choice>
            ))}
          </div>
          <span className="label block">{b.inMillimeters}</span>
          <div className="grid grid-cols-3 gap-1">
            {DEFAULT_MILLIMETER_SIZES.map(size => (
              <Choice
                key={size}
                active={millimeterSizes.includes(size)}
                onClick={() => setMillimeterSizes(prev => toggleInList(prev, size).sort((a, b) => a - b))}
              >
                {size}
              </Choice>
            ))}
          </div>
        </div>
      );
    }
    if (id === 'metrics') {
      return (
        <div className="space-y-0.5">
          {METRIC_ROW_KEYS.map(key => (
            <CheckItem
              key={key}
              label={METRIC_ROW_LABELS[key]}
              checked={metricRows.includes(key)}
              onChange={() => setMetricRows(prev => toggleInList(prev, key))}
            />
          ))}
        </div>
      );
    }
    if (id === 'versions') {
      return (
        <div className="space-y-0.5">
          {VERSION_VARIANTS.map(variant => (
            <CheckItem
              key={variant.value}
              label={variant.label}
              checked={versions.includes(variant.value)}
              onChange={() => setVersions(prev => toggleInList(prev, variant.value))}
            />
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <section className={className}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <SectionHead
          label={b.title}
          ariaLabel={b.title}
          open={open}
          meta={PAGE_FORMATS[page].label}
          tooltip={b.hint}
        />

        <CollapsibleContent className={SECTION_BODY}>
          <p className="text-callout text-muted-foreground">
            {b.intro}
          </p>

          {/* ---- formato ---- */}
          <div>
            <div className="card-head mb-1">
              <span className="label">{b.format}</span>
              <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                {dim(native.width)} × {dim(native.height)} {native.unit}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-1" role="group" aria-label={b.formatGroupAria}>
              {PAGE_GROUPS.map(item => (
                <Choice key={item.id} active={group === item.id} onClick={() => pickGroup(item.id)}>
                  {item.label}
                </Choice>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1" role="group" aria-label={b.pageSizeAria}>
              {(PAGE_GROUPS.find(g => g.id === group)?.keys ?? []).map(key => (
                <Choice
                  key={key}
                  active={page === key}
                  onClick={() => setPage(key)}
                  title={`${dim(PAGE_FORMATS[key].width)} × ${dim(PAGE_FORMATS[key].height)} ${PAGE_FORMATS[key].unit}`}
                >
                  {PAGE_FORMATS[key].label}
                </Choice>
              ))}
            </div>
            {rotatable && (
              <div className="grid grid-cols-2 gap-1 mt-1" role="group" aria-label={b.orientationAria}>
                <Choice active={orientation === 'portrait'} onClick={() => setOrientation('portrait')}>{b.portrait}</Choice>
                <Choice active={orientation === 'landscape'} onClick={() => setOrientation('landscape')}>{b.landscape}</Choice>
              </div>
            )}
          </div>

          {/* ---- visualização ---- */}
          <div>
            <span className="label block mb-1">{b.layout}</span>
            <div className="grid grid-cols-2 gap-1" role="group" aria-label={b.layoutAria}>
              {LAYOUT_MODES.map(mode => (
                <Choice key={mode.value} active={layout === mode.value} onClick={() => setLayout(mode.value)} title={mode.hint}>
                  {mode.label}
                </Choice>
              ))}
            </div>
          </div>

          <div>
            <span className="label block mb-1">{b.background}</span>
            <div className="grid grid-cols-3 gap-1" role="group" aria-label={b.backgroundAria}>
              {SHEET_THEMES.map(item => (
                <Choice key={item.value} active={theme === item.value} onClick={() => setTheme(item.value)} title={item.hint}>
                  {item.label}
                </Choice>
              ))}
            </div>
          </div>

          <div>
            <span className="label block mb-1">{b.density}</span>
            <div className="grid grid-cols-2 gap-1" role="group" aria-label={b.densityAria}>
              {SHEET_DENSITIES.map(item => (
                <Choice key={item.value} active={density === item.value} onClick={() => setDensity(item.value)} title={item.hint}>
                  {item.label}
                </Choice>
              ))}
            </div>
            <div className="mt-1">
              <CheckItem
                label={b.showSheetGrid}
                title={b.showSheetGridHint}
                checked={sheetGrid}
                onChange={() => setSheetGrid(v => !v)}
              />
            </div>
          </div>

          {/* ---- textos ---- */}
          <div className="space-y-1.5">
            <label className="label block" htmlFor="brandsheet-title">{b.sheetTitle}</label>
            <ToolInput
              id="brandsheet-title"
              size="sm"
              value={title}
              maxLength={60}
              placeholder={b.sheetTitlePlaceholder}
              onChange={e => setTitle(e.target.value)}
            />
            <label className="label block" htmlFor="brandsheet-subtitle">{b.sheetSubtitle}</label>
            <ToolInput
              id="brandsheet-subtitle"
              size="sm"
              value={subtitle}
              maxLength={80}
              placeholder={b.sheetSubtitlePlaceholder}
              onChange={e => setSubtitle(e.target.value)}
            />
          </div>

          {/* ---- blocos ---- */}
          <div>
            <div className="card-head mb-1">
              <span className="label">{b.blocks}</span>
              <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                {fill(b.blocksCount, { on: blocks.filter(item => item.enabled).length, total: blocks.length })}
              </span>
            </div>
            {onlyLogo && (
              <p className="text-caption text-muted-foreground px-1.5 mb-1">
                {b.onlyLogoNote}
              </p>
            )}
            <ul className="space-y-0.5">
              {blocks.map((block, index) => {
                const hasOptions = BLOCKS_WITH_OPTIONS.has(block.id) && block.enabled;
                const isExpanded = expanded === block.id;
                return (
                  <li key={block.id} className="rounded-md">
                    <div className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors duration-fast ease-out hover:bg-fill">
                      <label className="flex flex-1 items-center gap-2 text-callout text-foreground cursor-pointer" title={BLOCK_HINTS[block.id]}>
                        <input
                          type="checkbox"
                          className="ctl-check"
                          checked={block.enabled}
                          onChange={() => toggleBlock(block.id)}
                        />
                        <span>{BLOCK_TITLES[block.id]}</span>
                      </label>
                      {hasOptions && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : block.id)}
                          className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                          aria-label={fill(b.blockOptions, { name: BLOCK_TITLES[block.id] })}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, -1)}
                        disabled={index === 0}
                        className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                        aria-label={fill(b.moveUp, { name: BLOCK_TITLES[block.id] })}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(block.id, 1)}
                        disabled={index === blocks.length - 1}
                        className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                        aria-label={fill(b.moveDown, { name: BLOCK_TITLES[block.id] })}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {hasOptions && isExpanded && (
                      <div className="ml-6 mb-1 border-l border-separator pl-2">
                        {blockOptions(block.id)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ---- prévia ---- */}
          <div>
            <div className="card-head mb-1">
              <span className="flex items-center gap-1.5">
                <span className="label">{t.common.preview}</span>
                {building && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden="true" />}
              </span>
              <span className="card-actions">
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  disabled={!preview?.uri}
                  className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                  title={b.expandHint}
                  aria-label={b.expand}
                >
                  <Expand className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                  title={b.resetSheet}
                  aria-label={b.resetSheet}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            {/* Moldura rebaixada, como toda mídia do sistema: a folha pousa
                sobre o cinza de fundo, sem borda e sem sombra. */}
            <div className="rounded-xl bg-canvas p-4">
            <div
              className="rounded-xs bg-card overflow-hidden mx-auto"
              style={{ aspectRatio: String(aspect), maxWidth: aspect >= 1 ? '100%' : '72%' }}
            >
              {disabled ? (
                <div className="flex h-full items-center justify-center px-3">
                  <span className="text-caption text-muted-foreground text-center">{b.previewLoad}</span>
                </div>
              ) : preview?.error ? (
                <div className="flex h-full items-center justify-center px-3">
                  <span className="text-caption text-destructive text-center">{preview.error}</span>
                </div>
              ) : preview?.uri ? (
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="block h-full w-full"
                  title={b.expandHint}
                  aria-label={b.expand}
                >
                  <img src={preview.uri} alt={b.previewAlt} className="h-full w-full object-contain" />
                </button>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
            </div>
            <p className="text-footnote text-muted-foreground tabular-nums mt-2 text-center">
              {pageLabel(page, orientation)}
            </p>
          </div>

          {/* ---- exportar ---- */}
          <div className="grid grid-cols-3 gap-1" role="group" aria-label={b.exportAria}>
            {(['svg', 'pdf', 'png'] as const).map(kind => (
              <button
                key={kind}
                type="button"
                disabled={disabled || busy !== null}
                onClick={() => handleExport(kind)}
                className={`ctl ${kind === 'pdf' ? 'ctl-filled' : 'ctl-outline'} ctl-sm justify-center`}
                title={
                  kind === 'svg' ? b.exportSvgHint
                    : kind === 'pdf' ? b.exportPdfHint
                      : native.unit === 'px'
                        ? fill(b.exportPngHintPx, { width: dim(native.width), height: dim(native.height) })
                        : b.exportPngHintPt
                }
              >
                {busy === kind
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : kind.toUpperCase()}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Prévia ampliada: mesma imagem da prévia pequena, só para ver. */}
      <SheetPreviewOverlay
        open={zoomOpen && !!preview?.uri}
        onOpenChange={setZoomOpen}
        uri={preview?.uri ?? ''}
        native={native}
        label={pageLabel(page, orientation)}
        title={title}
      />
    </section>
  );
};

export default BrandSheetPanel;

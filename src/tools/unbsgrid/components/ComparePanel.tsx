import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, ClipboardPaste, Maximize2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { SectionHead } from './chrome';
import { QUIET_TABLIST, SECTION_BODY, quietTab } from './chrome-classes';
import SVGDropZone from './SVGDropZone';
import CompareView, { type CompareViewMode } from './CompareView';
import {
  compareLogos, parseCompareVersion, describeCompareError, svgToDataUrl, diffMapToRGBA,
  formatDelta, DIFF_COLORS,
  type CompareResult, type CompareMetricRow,
} from '../lib/compare';
import type { ParsedSVG } from '../lib/svg-engine';
import { useSectionOpen } from '../hooks/use-section-open';
import { useLanguage, fill, type Translations } from '../i18n';

/**
 * Self-contained "comparar versões" panel.
 *
 * The second version lives ONLY here: it never replaces the logo loaded in the
 * app. "Trocar" just flips which of the two is drawn as A, again without
 * touching the app's state.
 */

export interface CompareVersion {
  /** Raw SVG text as dropped / pasted. */
  source: string;
  /** Sanitized parse (already validated). */
  parsed: ParsedSVG;
  name: string;
}

/** Everything the page needs to draw the same comparison in the canvas area. */
export interface CompareCanvasView {
  srcA: string;
  srcB: string;
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  mode: CompareViewMode;
  overlayOpacity: number;
  frameAspect: number;
  matchPercent: number;
}

export interface ComparePanelProps {
  /** Version A: the logo currently loaded in the app. */
  parsedSVG: ParsedSVG | null;
  /** File name of version A, shown in the labels. */
  nameA?: string;
  /** Notified whenever the second version is loaded, replaced or removed. */
  onVersionBChange?: (version: CompareVersion | null) => void;
  /** Section starts expanded (default false). */
  defaultOpen?: boolean;
  /** Space flips A/B in "alternar" mode while the pointer is over the view. */
  enableSpaceShortcut?: boolean;
  /** Controlled section state (the sidebar drives it as an accordion). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * When `onCanvasModeChange` is given the panel shows a "ver no canvas"
   * toggle; while `canvasMode` is on the big view lives in the canvas area and
   * the panel keeps only the controls and the numbers.
   */
  canvasMode?: boolean;
  onCanvasModeChange?: (on: boolean) => void;
  /** Publishes what the canvas needs to draw (null when there is nothing to compare). */
  onViewStateChange?: (view: CompareCanvasView | null) => void;
  className?: string;
}

const MODES: Array<{ id: CompareViewMode; key: keyof Translations['compare'] }> = [
  { id: 'overlay', key: 'modeOverlay' },
  { id: 'toggle', key: 'modeToggle' },
  { id: 'curtain', key: 'modeCurtain' },
  { id: 'side', key: 'modeSide' },
];

/* O sinal já diz a direção: o sistema não usa seta como ícone de texto. */

const Swatch: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span className="inline-flex items-center gap-1.5 min-w-0">
    <span className="h-2.5 w-2.5 shrink-0 rounded-sm shadow-hairline" style={{ backgroundColor: color }} aria-hidden="true" />
    <span className="truncate">{children}</span>
  </span>
);

/** Difference map painted at its natural grid resolution and scaled by CSS. */
const DiffMapCanvas: React.FC<{ result: CompareResult; labelA: string; labelB: string }> = ({ result, labelA, labelB }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { t } = useLanguage();
  const c = t.compare;
  const { diff } = result;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = diff.cols;
    canvas.height = diff.rows;
    ctx.clearRect(0, 0, diff.cols, diff.rows);
    const rgba = diffMapToRGBA(diff);
    if (typeof ImageData === 'undefined') return;
    ctx.putImageData(new ImageData(rgba, diff.cols, diff.rows), 0, 0);
  }, [diff]);

  return (
    <div className="space-y-1.5">
      <canvas
        ref={ref}
        className="w-full rounded-lg bg-fill shadow-hairline"
        style={{ aspectRatio: String(diff.cols / diff.rows) }}
        role="img"
        aria-label={fill(c.diffMapAria, { pct: result.matchPercent.toFixed(1), a: labelA, b: labelB })}
      />
      <div className="grid grid-cols-3 gap-1 text-caption text-muted-foreground">
        <Swatch color={DIFF_COLORS.both}>{fill(c.inBoth, { pct: result.diff.matchPercent.toFixed(0) })}</Swatch>
        <Swatch color={DIFF_COLORS.onlyA}>{fill(c.onlyIn, { label: labelA, pct: result.diff.onlyAPercent.toFixed(0) })}</Swatch>
        <Swatch color={DIFF_COLORS.onlyB}>{fill(c.onlyIn, { label: labelB, pct: result.diff.onlyBPercent.toFixed(0) })}</Swatch>
      </div>
    </div>
  );
};

const MetricRow: React.FC<{ row: CompareMetricRow }> = ({ row }) => (
  <>
    <span className="text-footnote text-muted-foreground truncate" title={row.hint}>{row.label}</span>
    <span className="text-value text-foreground text-right tabular-nums">{row.aLabel}</span>
    <span className="text-value text-foreground text-right tabular-nums">{row.bLabel}</span>
    <span className="flex justify-end">
      <span className={`metric-delta ${row.direction === 'same' ? '' : 'text-foreground'}`}>{formatDelta(row)}</span>
    </span>
  </>
);

const ComparePanel: React.FC<ComparePanelProps> = ({
  parsedSVG, nameA: nameAProp, onVersionBChange, defaultOpen = false,
  enableSpaceShortcut = true, open: openProp, onOpenChange,
  canvasMode = false, onCanvasModeChange, onViewStateChange, className = '',
}) => {
  const [open, setOpen] = useSectionOpen(defaultOpen, openProp, onOpenChange);
  const { t, language } = useLanguage();
  const c = t.compare;
  const nameA = nameAProp ?? c.versionA;
  const [version, setVersion] = useState<CompareVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CompareViewMode>('overlay');
  const [opacity, setOpacity] = useState(0.5);
  const [swapped, setSwapped] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');

  const notify = onVersionBChange;
  const load = useCallback((source: string, name: string) => {
    try {
      const parsed = parseCompareVersion(source, 'b');
      const next: CompareVersion = { source, parsed, name };
      setVersion(next);
      setError(null);
      setPasting(false);
      setPasted('');
      notify?.(next);
      toast.success(c.loaded, { description: fill(c.loadedDescription, { name }) });
    } catch (err) {
      const message = describeCompareError(err, 'b');
      setError(message);
      toast.error(c.loadFailed, { description: message });
    }
  }, [notify, c]);

  const remove = useCallback(() => {
    setVersion(null);
    setError(null);
    setSwapped(false);
    notify?.(null);
  }, [notify]);

  // A new logo in the app invalidates the pairing.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setError(null);
  }, [parsedSVG]);

  // A and B name the SLOTS of the comparison, not the files: "trocar" swaps
  // which version sits in each slot, so the labels stay put and the names move.
  const labelA = 'A';
  const labelB = 'B';

  const { result, failure } = useMemo(() => {
    if (!parsedSVG || !version) return { result: null, failure: null };
    const first = swapped ? version.parsed : parsedSVG;
    const second = swapped ? parsedSVG : version.parsed;
    try {
      return { result: compareLogos(first, second), failure: null };
    } catch (err) {
      return { result: null, failure: describeCompareError(err, swapped ? 'a' : 'b') };
    }
    // Metric labels and errors are written in the active language, which the
    // lib reads through the i18n runtime: `language` recomputes them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedSVG, version, swapped, language]);

  const srcA = useMemo(() => (result ? svgToDataUrl(result.a.alignedSVG) : ''), [result]);
  const srcB = useMemo(() => (result ? svgToDataUrl(result.b.alignedSVG) : ''), [result]);

  const nameFirst = swapped ? version?.name ?? c.versionB : nameA;
  const nameSecond = swapped ? nameA : version?.name ?? c.versionB;
  const message = failure ?? error;

  // The page mirrors the comparison in the canvas area; it never owns it.
  const publishRef = useRef(onViewStateChange);
  publishRef.current = onViewStateChange;
  useEffect(() => {
    publishRef.current?.(result
      ? {
        srcA, srcB, labelA, labelB,
        nameA: nameFirst, nameB: nameSecond,
        mode, overlayOpacity: opacity,
        frameAspect: result.frameAspect,
        matchPercent: result.matchPercent,
      }
      : null);
  }, [result, srcA, srcB, nameFirst, nameSecond, mode, opacity]);
  useEffect(() => () => publishRef.current?.(null), []);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <SectionHead label={c.title} open={open} tooltip={c.hint} />

      <CollapsibleContent className={SECTION_BODY}>
        {!parsedSVG && (
          <p className="text-footnote text-muted-foreground">{c.needLogo}</p>
        )}

        {parsedSVG && !version && (
          <div className="space-y-2">
            <p className="text-footnote text-muted-foreground">
              {c.pickSecond}
            </p>
            <SVGDropZone onSVGLoaded={(svg, name) => load(svg, name ?? c.versionB)} />
            {pasting ? (
              <div className="space-y-1.5">
                <label className="label block" htmlFor="compare-paste">{t.input.pasteLabelShort}</label>
                <textarea
                  id="compare-paste"
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={4}
                  spellCheck={false}
                  placeholder="<svg …>"
                  className="field field-mono h-auto py-1.5 resize-y text-[11px] leading-snug"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="ctl ctl-sm ctl-filled flex-1"
                    disabled={!pasted.trim()}
                    onClick={() => load(pasted, c.pastedSvg)}
                  >
                    {c.useThisSvg}
                  </button>
                  <button type="button" className="ctl ctl-sm ctl-plain" onClick={() => { setPasting(false); setPasted(''); }}>
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="ctl ctl-sm ctl-plain w-full gap-1.5" onClick={() => setPasting(true)}>
                <ClipboardPaste className="h-3.5 w-3.5" />
                {c.pasteButton}
              </button>
            )}
          </div>
        )}

        {message && (
          <p className="flex items-start gap-1.5 text-footnote text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
            <span>{message}</span>
          </p>
        )}

        {parsedSVG && version && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="chip bg-primary text-primary-foreground shrink-0">{labelA}</span>
              <span className="text-footnote text-foreground truncate flex-1" title={nameFirst}>{nameFirst}</span>
              <button
                type="button"
                className="ctl ctl-sm ctl-icon ctl-outline shrink-0"
                aria-label={c.swap}
                title={c.swap}
                onClick={() => setSwapped(v => !v)}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
              <span className="text-footnote text-muted-foreground truncate flex-1 text-right" title={nameSecond}>{nameSecond}</span>
              <span className="chip chip-outline shrink-0">{labelB}</span>
              <button
                type="button"
                className="ctl ctl-sm ctl-icon ctl-plain shrink-0"
                aria-label={c.removeSecond}
                title={c.removeSecond}
                onClick={remove}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className={QUIET_TABLIST} role="tablist" aria-label={c.viewMode}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  className={quietTab(mode === m.id)}
                  onClick={() => setMode(m.id)}
                >
                  {c[m.key]}
                </button>
              ))}
            </div>

            {onCanvasModeChange && result && (
              <button
                type="button"
                className={`ctl ctl-sm w-full gap-1.5 ${canvasMode ? 'ctl-filled' : 'ctl-outline'}`}
                aria-pressed={canvasMode}
                onClick={() => onCanvasModeChange(!canvasMode)}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {canvasMode ? c.backToCanvas : c.seeOnCanvas}
              </button>
            )}

            {result && (
              <>
                {canvasMode ? (
                  <p className="text-footnote text-muted-foreground">
                    {c.onCanvasNote}
                  </p>
                ) : (
                  <CompareView
                    srcA={srcA}
                    srcB={srcB}
                    labelA={labelA}
                    labelB={labelB}
                    mode={mode}
                    frameAspect={result.frameAspect}
                    overlayOpacity={opacity}
                    enableSpaceShortcut={enableSpaceShortcut}
                  />
                )}

                {mode === 'overlay' && (
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <label className="label" htmlFor="compare-opacity">{fill(c.opacityOf, { label: labelB })}</label>
                      <span className="text-value text-foreground">{Math.round(opacity * 100)}%</span>
                    </div>
                    <input
                      id="compare-opacity"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(opacity * 100)}
                      onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                      className="tool-slider"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  {/* O único amarelo desta tela: a coincidência é o valor positivo. */}
                  <div className="metric">
                    <span className="metric-value">{result.matchPercent.toFixed(1)}%</span>
                    <span className="metric-caption">{c.matchArea}</span>
                  </div>
                  <div className="h-[3px] w-full rounded-pill bg-fill-2 overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.max(0, Math.min(100, result.matchPercent))}%` }} />
                  </div>
                  <DiffMapCanvas result={result} labelA={labelA} labelB={labelB} />
                </div>

                <div className="space-y-1.5">
                  <span className="label block">{c.differences}</span>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-1 items-baseline">
                    <span className="label">{c.metric}</span>
                    <span className="label text-right">{labelA}</span>
                    <span className="label text-right">{labelB}</span>
                    <span className="label text-right">{c.change}</span>
                    {result.metrics.map(row => <MetricRow key={row.key} row={row} />)}
                  </div>
                  <p className="text-callout text-muted-foreground">
                    {fill(c.changeNote, { a: labelA, b: labelB })}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ComparePanel;

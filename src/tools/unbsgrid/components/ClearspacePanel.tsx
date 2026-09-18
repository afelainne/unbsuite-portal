/**
 * Clearspace panel: pick the reference unit measured on the artwork, set the
 * breathing room (locked or per side), see it on a preview of its own, read
 * the value in mm / px for a real reproduction size, and copy the rule as it
 * goes into the manual.
 *
 * Self-contained: everything arrives through props, the preview is drawn here
 * in plain SVG (it never touches the main canvas), and edits are pushed up
 * debounced so typing does not re-render the heavy scene on every keystroke.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link2, Link2Off, Copy, RotateCcw, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TooltipProvider } from './ui/tooltip';
import InfoTooltip from './InfoTooltip';
import { SectionHead } from './chrome';
import { PILL_GROUP, SECTION_BODY } from './chrome-classes';
import { ToolInput } from '@/tools/_shared/ui';
import { stableStringify } from '../lib/memo';
import { useSectionOpen } from '../hooks/use-section-open';
import { useLanguage, fill } from '../i18n';
import {
  CLEARSPACE_REFERENCES, CLEARSPACE_REFERENCE_LABELS, CLEARSPACE_SIDES, CLEARSPACE_SIDE_LABELS,
  PERCENT_BASE_LABELS, DEFAULT_CLEARSPACE_CONFIG, DEFAULT_OUTPUT_SIZE,
  DEFAULT_PRINT_DPI, DEFAULT_SCREEN_DPI,
  areSidesEqual, clearspaceManualText, clearspaceRuleSentence, convertClearspace,
  createClearspaceConfig, formatNumber, resolveClearspace,
  setClearspaceLocked, setClearspaceReference, setClearspaceSide,
  type Box, type ClearspaceConfig, type ClearspaceReference, type ClearspaceSide,
  type OutputSize, type PercentBase, type ReferenceUnits,
} from '../lib/clearspace';

export interface ClearspacePanelProps {
  /** Reference units measured on the artwork (`measureReferenceUnits`). */
  units: ReferenceUnits | null;
  /** Logo box in drawing units. Defaults to `units.inkBounds`. */
  bounds?: Box | null;
  /** Sanitized SVG (`parsedSVG.originalSVG`) drawn inside the preview. */
  svg?: string | null;
  /** Artboard of that SVG (`parsedSVG.artboard`), so the preview lines up. */
  artboard?: Box | null;
  config: ClearspaceConfig;
  onConfigChange: (config: ClearspaceConfig) => void;
  /** Reproduction size used for the mm / px read-out. */
  defaultOutput?: OutputSize;
  onOutputChange?: (output: OutputSize) => void;
  loading?: boolean;
  defaultOpen?: boolean;
  /** Controlled section state (the sidebar drives it as an accordion). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Delay before pushing an edit up, in ms (default 160). */
  commitDelay?: number;
}


const svgToDataUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** Number field that keeps a free-typing draft and only commits valid values. */
const NumberField: React.FC<{
  value: number;
  onChange: (value: number) => void;
  label: string;
  suffix?: string;
  max?: number;
  step?: number;
  className?: string;
}> = ({ value, onChange, label, suffix, max = 100, step = 0.25, className = '' }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(Number(value.toFixed(4)));
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(n)) onChange(Math.max(0, Math.min(max, n)));
    setDraft(null);
  };
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <ToolInput
        type="number" min={0} max={max} step={step}
        value={shown}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n) && n >= 0 && n <= max) onChange(n);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
        mono size="sm"
        aria-label={label}
        className="h-7 w-16 shrink-0"
      />
      {suffix && <span className="text-caption text-muted-foreground">{suffix}</span>}
    </div>
  );
};

/** Valor acima, legenda abaixo, 4px entre os dois — o bloco de número do sistema. */
const Readout: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="metric metric-sm min-w-0">
    <span className="metric-value truncate">{children}</span>
    <span className="metric-caption truncate">{label}</span>
  </div>
);

const ClearspacePanel: React.FC<ClearspacePanelProps> = ({
  units, bounds, svg, artboard, config, onConfigChange,
  defaultOutput, onOutputChange, loading = false, defaultOpen = true,
  open: openProp, onOpenChange, commitDelay = 160,
}) => {
  const [open, setOpen] = useSectionOpen(defaultOpen, openProp, onOpenChange);
  const [draft, setDraft] = useState<ClearspaceConfig>(() => createClearspaceConfig(config));
  const [output, setOutput] = useState<OutputSize>(() => defaultOutput ?? DEFAULT_OUTPUT_SIZE);
  const { t, language } = useLanguage();
  const c = t.clearspacePanel;

  // --- debounced two-way sync with the parent ------------------------------
  const configKey = useMemo(() => stableStringify(config), [config]);
  const syncedKey = useRef(configKey);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (configKey !== syncedKey.current) {
      syncedKey.current = configKey;
      setDraft(createClearspaceConfig(config));
    }
  }, [configKey, config]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const push = useCallback((next: ClearspaceConfig) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      syncedKey.current = stableStringify(next);
      onConfigChange(next);
    }, Math.max(0, commitDelay));
  }, [commitDelay, onConfigChange]);

  const updateOutput = useCallback((next: OutputSize) => {
    setOutput(next);
    onOutputChange?.(next);
  }, [onOutputChange]);

  // --- geometry (cheap, pure, recomputed from the draft) --------------------
  const measured = !!units?.measured;
  const logoBox: Box | null = bounds ?? units?.inkBounds ?? null;

  // The result carries its warnings in the active language: `language` is
  // read by the lib through the i18n runtime, so it recomputes on a switch.
  const result = useMemo(
    () => (measured && logoBox ? resolveClearspace(logoBox, draft, units as ReferenceUnits) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measured, logoBox, draft, units, language],
  );
  const measures = useMemo(
    () => (result ? convertClearspace(result, output) : null),
    [result, output],
  );
  const dataUri = useMemo(() => (svg ? svgToDataUri(svg) : null), [svg]);

  // Plain strings, cheap to build: computed every render so they follow the language.
  const sentence = clearspaceRuleSentence(draft);
  const manualText = result ? clearspaceManualText(result, draft, { measures }) : sentence;

  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(manualText)
      .then(() => toast.success(t.common.copied))
      .catch(() => toast.error(t.common.copyFailed));
  }, [manualText, t]);

  const label = CLEARSPACE_REFERENCE_LABELS[draft.reference];
  const isPercent = draft.reference === 'percent';
  const sideMax = isPercent ? 200 : 20;
  const sideStep = isPercent ? 1 : 0.25;

  // --- preview -------------------------------------------------------------
  const preview = useMemo(() => {
    if (!result || !logoBox || !(result.outer.width > 0) || !(result.outer.height > 0)) return null;
    const pad = Math.max(result.outer.width, result.outer.height) * 0.07;
    const vbW = result.outer.width + pad * 2;
    const vbH = result.outer.height + pad * 2;
    const hair = vbW / 260; // ≈ 1px when the preview is drawn ~260px wide
    const font = vbW / 26;
    return {
      viewBox: `${result.outer.x - pad} ${result.outer.y - pad} ${vbW} ${vbH}`,
      hair, font,
      showTopLabel: result.sides.top > font * 1.2,
    };
  }, [result, logoBox]);

  return (
    // Own provider: the panel works anywhere, including outside the tool shell.
    <TooltipProvider delayDuration={250}>
    <Collapsible open={open} onOpenChange={setOpen}>
      <SectionHead
        label={c.title}
        open={open}
        meta={measured
          ? (isPercent ? `${formatNumber(draft.sides.top, 1)}%` : `${formatNumber(draft.sides.top, 2)}×`)
          : undefined}
        tooltip={c.hint}
      />

      <CollapsibleContent className={SECTION_BODY}>
        {loading && !measured && <Skeleton className="h-[112px] w-full rounded-md" />}

        {!loading && !measured && (
          <p className="text-callout text-muted-foreground">{c.empty}</p>
        )}

        {measured && result && preview && (
          <>
            {/* Prévia própria, independente do canvas principal */}
            <svg
              viewBox={preview.viewBox}
              className="w-full h-[112px] rounded-md bg-fill"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={fill(c.previewAria, { sentence })}
            >
              <rect
                x={result.outer.x} y={result.outer.y} width={result.outer.width} height={result.outer.height}
                fill="hsl(var(--fill-2))"
              />
              <rect
                x={result.inner.x} y={result.inner.y} width={result.inner.width} height={result.inner.height}
                fill="hsl(var(--card))"
              />
              {dataUri && artboard ? (
                <image
                  href={dataUri}
                  x={artboard.x} y={artboard.y} width={artboard.width} height={artboard.height}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : dataUri ? (
                <image
                  href={dataUri}
                  x={result.inner.x} y={result.inner.y} width={result.inner.width} height={result.inner.height}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : null}
              <rect
                x={result.inner.x} y={result.inner.y} width={result.inner.width} height={result.inner.height}
                fill="none" stroke="hsl(var(--separator-strong))" strokeWidth={preview.hair}
              />
              <rect
                x={result.outer.x} y={result.outer.y} width={result.outer.width} height={result.outer.height}
                fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={preview.hair}
                strokeDasharray={`${preview.hair * 5} ${preview.hair * 4}`}
              />
              {preview.showTopLabel && (
                <text
                  x={result.inner.x + result.inner.width / 2}
                  y={result.inner.y - result.sides.top / 2 + preview.font * 0.36}
                  textAnchor="middle"
                  fontSize={preview.font}
                  fill="hsl(var(--muted-foreground))"
                >
                  {isPercent ? `${formatNumber(draft.sides.top, 1)}%` : `${formatNumber(draft.sides.top, 2)}×`}
                </text>
              )}
            </svg>

            {/* Unidade de referência */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="label">{c.referenceUnit}</span>
                <InfoTooltip content={label.hint} />
              </div>
              <div className="grid grid-cols-2 gap-1" role="group" aria-label={c.referenceUnitAria}>
                {CLEARSPACE_REFERENCES.map((ref: ClearspaceReference) => {
                  const info = CLEARSPACE_REFERENCE_LABELS[ref];
                  const active = draft.reference === ref;
                  return (
                    <button
                      key={ref}
                      type="button"
                      aria-pressed={active}
                      title={info.hint}
                      onClick={() => push(setClearspaceReference(draft, ref))}
                      className={`ctl ctl-outline ctl-sm justify-center ${active ? 'ctl-active' : ''}`}
                    >
                      {info.short}
                    </button>
                  );
                })}
              </div>
              {isPercent ? (
                <div className="mt-1.5">
                  <Select
                    value={draft.percentBase}
                    onValueChange={(v) => push({ ...draft, percentBase: v as PercentBase })}
                  >
                    <SelectTrigger className="w-full h-7 rounded-md text-footnote text-foreground" aria-label={c.percentBaseAria}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PERCENT_BASE_LABELS) as PercentBase[]).map(base => (
                        <SelectItem key={base} value={base} className="text-footnote">
                          {PERCENT_BASE_LABELS[base]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-callout text-muted-foreground tabular-nums mt-1.5">
                  {fill(c.unitEquals, { value: formatNumber(result.unitLength, 2) })}
                  {measures && measures.unitMm > 0 && fill(c.unitEqualsMm, { value: formatNumber(measures.unitMm, 2) })}
                </p>
              )}
              {!result.valid && (
                <p className="flex items-start gap-1.5 text-footnote text-destructive mt-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
                  <span>{result.warnings[0]}</span>
                </p>
              )}
            </div>

            {/* Respiro por lado */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="label">{c.clearspace}</span>
                <button
                  type="button"
                  aria-pressed={draft.locked}
                  aria-label={draft.locked ? c.unlockSides : c.lockSides}
                  title={draft.locked ? c.lockedTitle : c.unlockedTitle}
                  onClick={() => push(setClearspaceLocked(draft, !draft.locked))}
                  className={`ctl ctl-plain ctl-icon ctl-sm ${draft.locked ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {draft.locked ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                </button>
                <span className="text-caption text-muted-foreground">
                  {draft.locked ? c.lockedShort : c.unlockedShort}
                </span>
                <button
                  type="button"
                  onClick={() => push(createClearspaceConfig({ ...DEFAULT_CLEARSPACE_CONFIG, reference: draft.reference, percentBase: draft.percentBase }))}
                  className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground ml-auto"
                  title={c.resetTitle}
                  aria-label={c.resetAria}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {draft.locked ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <NumberField
                      value={draft.sides.top}
                      onChange={(v) => push(setClearspaceSide(draft, 'top', v))}
                      label={c.allSidesAria}
                      suffix={isPercent ? '%' : '×'}
                      max={sideMax}
                      step={sideStep}
                    />
                    <span className="text-caption text-muted-foreground truncate">{label.short.toLowerCase()}</span>
                  </div>
                  <Slider
                    min={0}
                    max={Math.round((isPercent ? 50 : 4) * 100)}
                    step={Math.round(sideStep * 100)}
                    value={[Math.round(Math.min(draft.sides.top, isPercent ? 50 : 4) * 100)]}
                    onValueChange={(v) => push(setClearspaceSide(draft, 'top', v[0] / 100))}
                    aria-label={c.sliderAria}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {CLEARSPACE_SIDES.map((side: ClearspaceSide) => (
                    <div key={side} className="flex items-center gap-1.5 min-w-0">
                      <span className="label shrink-0 w-12">{CLEARSPACE_SIDE_LABELS[side]}</span>
                      <NumberField
                        value={draft.sides[side]}
                        onChange={(v) => push(setClearspaceSide(draft, side, v))}
                        label={fill(c.sideAria, { side: CLEARSPACE_SIDE_LABELS[side].toLowerCase() })}
                        suffix={isPercent ? '%' : '×'}
                        max={sideMax}
                        step={sideStep}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tamanho de reprodução */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="label">{c.reproductionSize}</span>
                <InfoTooltip content={c.reproductionHint} />
              </div>
              <div className={PILL_GROUP} role="group" aria-label={t.common.reproductionMedium}>
                <button
                  type="button"
                  className={`segmented-item ${output.medium === 'print' ? 'is-active' : ''}`}
                  aria-selected={output.medium === 'print'}
                  onClick={() => updateOutput({ medium: 'print', widthMm: output.widthMm ?? 40, dpi: output.dpi ?? DEFAULT_PRINT_DPI })}
                >
                  {t.common.print}
                </button>
                <button
                  type="button"
                  className={`segmented-item ${output.medium === 'screen' ? 'is-active' : ''}`}
                  aria-selected={output.medium === 'screen'}
                  onClick={() => updateOutput({ medium: 'screen', widthPx: output.widthPx ?? 320, dpi: DEFAULT_SCREEN_DPI })}
                >
                  {t.common.screen}
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="label shrink-0">{t.common.width}</span>
                {output.medium === 'print' ? (
                  <NumberField
                    value={output.widthMm ?? 40}
                    onChange={(v) => updateOutput({ ...output, widthMm: v })}
                    label={c.printWidthAria}
                    suffix="mm"
                    max={5000}
                    step={1}
                  />
                ) : (
                  <NumberField
                    value={output.widthPx ?? 320}
                    onChange={(v) => updateOutput({ ...output, widthPx: v })}
                    label={c.screenWidthAria}
                    suffix="px"
                    max={20000}
                    step={8}
                  />
                )}
              </div>

              {measures && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
                  <Readout label={c.readoutClearspace}>
                    {output.medium === 'print'
                      ? `${formatNumber(measures.mm.top, 2)} mm`
                      : `${formatNumber(measures.px.top, 1)} px`}
                    {!areSidesEqual(result.sides) && <span className="text-muted-foreground">{c.readoutTopSuffix}</span>}
                  </Readout>
                  <Readout label={c.readoutTotal}>
                    {output.medium === 'print'
                      ? `${formatNumber(measures.outerMm.width, 1)} × ${formatNumber(measures.outerMm.height, 1)} mm`
                      : `${formatNumber(measures.outerPx.width, 0)} × ${formatNumber(measures.outerPx.height, 0)} px`}
                  </Readout>
                </div>
              )}
            </div>

            {/* Texto pronto para o manual */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="label">{t.common.manualText}</span>
                <button
                  type="button"
                  onClick={copy}
                  className="ctl ctl-outline ctl-sm ml-auto gap-1.5"
                  title={c.copyRule}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t.common.copy}
                </button>
              </div>
              <p className="surface-inset px-4 py-3 text-callout text-foreground whitespace-pre-line">
                {sentence}
              </p>
            </div>

            {units?.warnings?.length ? (
              <p className="text-callout text-muted-foreground">{units.warnings[0]}</p>
            ) : null}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
    </TooltipProvider>
  );
};

export default ClearspacePanel;

/**
 * Minimum size panel: the smallest reproduction where the logo still reads,
 * for screen and for print, with the reason spelled out (the thinnest stem or
 * the narrowest counter), a strip of real-size previews around that limit, and
 * the text ready for the manual.
 *
 * Self-contained: props in, own SVG previews, no access to the main canvas.
 * The strip renders the logo at true pixel sizes, so what you see is what the
 * reader gets.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Skeleton } from './ui/skeleton';
import { TooltipProvider } from './ui/tooltip';
import InfoTooltip from './InfoTooltip';
import { SectionHead } from './chrome';
import { PILL_GROUP, SECTION_BODY } from './chrome-classes';
import { formatNumber, type Box, type ReferenceUnits } from '../lib/clearspace';
import { useSectionOpen } from '../hooks/use-section-open';
import { useLanguage, fill } from '../i18n';
import {
  computeMinSize, buildPreviewStrip, minSizeManualText, minSizeSummary, roundUpToStep,
  DEFAULT_MIN_SIZE_LIMITS, ROUGH_MIN_SIZE_LIMITS, NICE_PX_STEPS, NICE_MM_STEPS,
  type MinSizeLimits, type MinSizeMediumKind, type PreviewStep,
} from '../lib/min-size';

export interface MinSizePanelProps {
  /** Reference units measured on the artwork (`measureReferenceUnits`). */
  units: ReferenceUnits | null;
  /** Sanitized SVG (`parsedSVG.originalSVG`) used in the previews. */
  svg?: string | null;
  /** Artboard of that SVG (`parsedSVG.artboard`), so the previews line up. */
  artboard?: Box | null;
  /** Logo box in drawing units. Defaults to `units.inkBounds`. */
  bounds?: Box | null;
  /** Override the reproduction thresholds (defaults to offset + 1× screen). */
  limits?: Partial<MinSizeLimits>;
  defaultMedium?: MinSizeMediumKind;
  loading?: boolean;
  defaultOpen?: boolean;
  /** Controlled section state (the sidebar drives it as an accordion). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Substrate = 'standard' | 'rough';

const MAX_THUMB_PX = 200;

const svgToDataUri = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** Valor acima, legenda abaixo, 4px entre os dois — o bloco de número do sistema. */
const Readout: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="metric metric-sm min-w-0">
    <span className="metric-value truncate">{children}</span>
    <span className="metric-caption truncate">{label}</span>
  </div>
);

const Thumb: React.FC<{
  step: PreviewStep;
  viewBox: string;
  image: { uri: string; box: Box } | null;
  fallback: Box;
}> = ({ step, viewBox, image, fallback }) => {
  const { t } = useLanguage();
  const s = t.minSize;
  const scale = step.widthPx > MAX_THUMB_PX ? MAX_THUMB_PX / step.widthPx : 1;
  const w = Math.max(6, step.widthPx * scale);
  const h = Math.max(4, step.heightPx * scale);
  return (
    <li className="shrink-0 flex flex-col items-center gap-1" aria-label={fill(step.ok ? s.stepAria : s.stepBelowAria, { label: step.label })}>
      <div
        className={`flex items-end justify-center rounded-md px-1.5 py-1.5 ${step.isMinimum ? 'bg-fill-2 shadow-hairline-strong' : 'bg-fill'} ${step.ok ? '' : 'opacity-[0.38]'}`}
        style={{ minWidth: Math.max(28, w + 12), minHeight: Math.max(28, h + 12) }}
      >
        <svg width={w} height={h} viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={fill(s.logoAt, { label: step.label })}>
          {image
            ? <image href={image.uri} x={image.box.x} y={image.box.y} width={image.box.width} height={image.box.height} preserveAspectRatio="xMidYMid meet" />
            : <rect x={fallback.x} y={fallback.y} width={fallback.width} height={fallback.height} fill="hsl(var(--muted-foreground))" />}
        </svg>
      </div>
      <span className={`text-caption tabular-nums text-center ${step.isMinimum ? 'text-foreground' : 'text-muted-foreground'}`}>
        {step.label}
      </span>
      {scale < 1 && <span className="text-caption text-muted-foreground">{s.reducedScale}</span>}
    </li>
  );
};

const MinSizePanel: React.FC<MinSizePanelProps> = ({
  units, svg, artboard, bounds, limits, defaultMedium = 'screen', loading = false, defaultOpen = true,
  open: openProp, onOpenChange,
}) => {
  const [open, setOpen] = useSectionOpen(defaultOpen, openProp, onOpenChange);
  const [medium, setMedium] = useState<MinSizeMediumKind>(defaultMedium);
  const [substrate, setSubstrate] = useState<Substrate>('standard');
  const { t, language } = useLanguage();
  const s = t.minSize;

  const measured = !!units?.measured;
  const logoBox: Box | null = bounds ?? units?.inkBounds ?? null;

  const activeLimits = useMemo<Partial<MinSizeLimits>>(
    () => ({ ...(substrate === 'rough' ? ROUGH_MIN_SIZE_LIMITS : DEFAULT_MIN_SIZE_LIMITS), ...limits }),
    [substrate, limits],
  );

  // Warnings and strip labels are written in the active language, which the
  // lib reads through the i18n runtime: `language` recomputes them on a switch.
  const result = useMemo(
    () => (measured ? computeMinSize(units as ReferenceUnits, { limits: activeLimits }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measured, units, activeLimits, language],
  );

  const strip = useMemo(
    () => (result ? buildPreviewStrip(result, { medium, below: 1, above: 3 }) : []),
    [result, medium],
  );

  const dataUri = useMemo(() => (svg ? svgToDataUri(svg) : null), [svg]);
  const viewBox = useMemo(
    () => (logoBox ? `${logoBox.x} ${logoBox.y} ${logoBox.width} ${logoBox.height}` : '0 0 1 1'),
    [logoBox],
  );
  const image = useMemo(
    () => (dataUri && logoBox ? { uri: dataUri, box: artboard ?? logoBox } : null),
    [dataUri, artboard, logoBox],
  );

  const manualText = result ? minSizeManualText(result) : '';
  const copy = useCallback(() => {
    void navigator.clipboard?.writeText(manualText)
      .then(() => toast.success(t.common.copied))
      .catch(() => toast.error(t.common.copyFailed));
  }, [manualText, t]);

  const info = result ? (medium === 'print' ? result.print : result.screen) : null;
  const publishedPx = result ? roundUpToStep(result.screen.widthPx, NICE_PX_STEPS) : 0;
  const publishedMm = result ? roundUpToStep(result.print.widthMm, NICE_MM_STEPS) : 0;

  return (
    // Own provider: the panel works anywhere, including outside the tool shell.
    <TooltipProvider delayDuration={250}>
    <Collapsible open={open} onOpenChange={setOpen}>
      <SectionHead
        label={s.title}
        open={open}
        meta={result?.valid ? minSizeSummary(result) : undefined}
        tooltip={s.hint}
      />

      <CollapsibleContent className={SECTION_BODY}>
        {loading && !measured && <Skeleton className="h-[96px] w-full rounded-md" />}

        {!loading && !measured && (
          <p className="text-callout text-muted-foreground">{s.empty}</p>
        )}

        {result && !result.valid && (
          <p className="flex items-start gap-1.5 text-footnote text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
            <span>{result.warnings[0]}</span>
          </p>
        )}

        {result?.valid && info && (
          <>
            <div className={PILL_GROUP} role="group" aria-label={t.common.reproductionMedium}>
              <button
                type="button"
                className={`segmented-item ${medium === 'screen' ? 'is-active' : ''}`}
                aria-selected={medium === 'screen'}
                onClick={() => setMedium('screen')}
              >
                {t.common.screen}
              </button>
              <button
                type="button"
                className={`segmented-item ${medium === 'print' ? 'is-active' : ''}`}
                aria-selected={medium === 'print'}
                onClick={() => setMedium('print')}
              >
                {t.common.print}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Readout label={s.minOnScreen}>{formatNumber(publishedPx, 0)} px</Readout>
              <Readout label={s.minInPrint}>{formatNumber(publishedMm, 1)} mm</Readout>
              <Readout label={s.strokeAtMin}>
                {medium === 'print'
                  ? `${formatNumber(info.strokeAt, 2)} mm`
                  : `${formatNumber(info.strokeAt, 2)} px`}
              </Readout>
              {info.gapAt !== null && (
                <Readout label={s.gapAtMin}>
                  {medium === 'print'
                    ? `${formatNumber(info.gapAt, 2)} mm`
                    : `${formatNumber(info.gapAt, 2)} px`}
                </Readout>
              )}
              <div className="col-span-2 flex items-baseline gap-2 min-w-0">
                <span className="label shrink-0">{s.limitedBy}</span>
                <span className="text-callout text-foreground truncate">
                  {info.limitedBy === 'gap' ? s.limitedByGap : s.limitedByStroke}
                </span>
              </div>
            </div>

            {/* Fita de prévia, em tamanho real */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="label">{t.common.preview}</span>
                <InfoTooltip content={s.previewHint} />
              </div>
              <ul className="flex items-end gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label={s.previewAria}>
                {strip.map(step => (
                  <Thumb
                    key={step.key}
                    step={step}
                    viewBox={viewBox}
                    image={image}
                    fallback={logoBox ?? { x: 0, y: 0, width: 1, height: 1 }}
                  />
                ))}
              </ul>
            </div>

            {/* Substrato */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="label">{s.reproduction}</span>
                <InfoTooltip content={s.reproductionHint} />
              </div>
              <div className={PILL_GROUP} role="group" aria-label={s.reproductionAria}>
                <button
                  type="button"
                  className={`segmented-item ${substrate === 'standard' ? 'is-active' : ''}`}
                  aria-selected={substrate === 'standard'}
                  onClick={() => setSubstrate('standard')}
                >
                  {s.standard}
                </button>
                <button
                  type="button"
                  className={`segmented-item ${substrate === 'rough' ? 'is-active' : ''}`}
                  aria-selected={substrate === 'rough'}
                  onClick={() => setSubstrate('rough')}
                >
                  {s.rough}
                </button>
              </div>
            </div>

            {/* Texto pronto para o manual */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="label">{t.common.manualText}</span>
                <button
                  type="button"
                  onClick={copy}
                  className="ctl ctl-outline ctl-sm ml-auto gap-1.5"
                  title={s.copyManual}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t.common.copy}
                </button>
              </div>
              <p className="surface-inset px-4 py-3 text-callout text-foreground whitespace-pre-line">
                {fill(s.manualScreenLine, { value: formatNumber(publishedPx, 0) })}
                {fill(s.manualPrintLine, { value: formatNumber(publishedMm, 1) })}
              </p>
            </div>

            {result.warnings.length > 0 && (
              <p className="text-callout text-muted-foreground">{result.warnings[0]}</p>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
    </TooltipProvider>
  );
};

export default MinSizePanel;

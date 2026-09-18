import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent } from './ui/collapsible';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import { SectionHead, ValueRow } from './chrome';
import { SECTION_BODY } from './chrome-classes';
import type { LogoMetrics, Quadrants } from '../lib/metrics';
import { useSectionOpen } from '../hooks/use-section-open';
import { useLanguage, fill, type Translations } from '../i18n';

interface MetricsPanelProps {
  metrics: LogoMetrics | null;
  loading: boolean;
  error: string | null;
  showVisualCenter: boolean;
  onShowVisualCenterChange: (value: boolean) => void;
  /** Controlled section state (the sidebar drives it as an accordion). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const pct = (v: number, digits = 0) => `${(Number.isFinite(v) ? v * 100 : 0).toFixed(digits)}%`;
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;

type MetricsText = Translations['metrics'];
const H_BALANCE = { left: 'balanceLeft', right: 'balanceRight', centered: 'balanceCentered' } as const satisfies Record<string, keyof MetricsText>;
const V_BALANCE = { top: 'balanceTop', bottom: 'balanceBottom', centered: 'balanceCentered' } as const satisfies Record<string, keyof MetricsText>;
const ORIENTATION = { landscape: 'orientationLandscape', portrait: 'orientationPortrait', square: 'orientationSquare' } as const satisfies Record<string, keyof MetricsText>;

/**
 * Value above its caption, 4px apart, tabular — the system's metric block.
 * `metric-sm` keeps the 16px step, the one that fits a 300px panel.
 */
const Metric: React.FC<{ caption: string; children: React.ReactNode; title?: string }> = ({ caption, children, title }) => (
  <div className="metric metric-sm min-w-0">
    <span className="metric-value truncate" title={title}>{children}</span>
    <span className="metric-caption truncate">{caption}</span>
  </div>
);

/** Thin horizontal meter. Ink, not amarelo: amarelo points, it does not fill. */
const Meter: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-[3px] w-full rounded-pill bg-fill-2 overflow-hidden" aria-hidden="true">
    <div className="h-full rounded-pill bg-foreground" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
  </div>
);

/** 60×60 compass: geometric center (ring) vs visual center (graphite dot). ±10% offset reaches the edge. */
const CenterCompass: React.FC<{ offsetPercent: { x: number; y: number }; hasVisual: boolean; label: string }> = ({ offsetPercent, hasVisual, label }) => {
  const RANGE = 10;
  const R = 24;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / RANGE));
  const vx = 30 + clamp(offsetPercent.x) * R;
  const vy = 30 + clamp(offsetPercent.y) * R;
  return (
    <svg width={60} height={60} viewBox="0 0 60 60" role="img" aria-label={label} className="shrink-0 rounded-md bg-fill">
      <circle cx={30} cy={30} r={R} fill="none" stroke="hsl(var(--separator-strong))" strokeWidth={1} />
      <circle cx={30} cy={30} r={R / 2} fill="none" stroke="hsl(var(--separator))" strokeWidth={1} strokeDasharray="2 2" />
      <line x1={30} y1={4} x2={30} y2={56} stroke="hsl(var(--separator))" strokeWidth={1} />
      <line x1={4} y1={30} x2={56} y2={30} stroke="hsl(var(--separator))" strokeWidth={1} />
      <circle cx={30} cy={30} r={3.5} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
      {hasVisual && (
        <>
          <line x1={30} y1={30} x2={vx} y2={vy} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
          <circle cx={vx} cy={vy} r={4} fill="#3F3F46" stroke="#FFFFFF" strokeWidth={1.25} />
        </>
      )}
    </svg>
  );
};

const QUAD_ORDER: Array<[keyof Quadrants, keyof MetricsText, keyof MetricsText]> = [
  ['topLeft', 'topLeft', 'topLeftShort'], ['topRight', 'topRight', 'topRightShort'],
  ['bottomLeft', 'bottomLeft', 'bottomLeftShort'], ['bottomRight', 'bottomRight', 'bottomRightShort'],
];

const QuadrantGrid: React.FC<{ quadrants: Quadrants; text: MetricsText }> = ({ quadrants, text }) => {
  const max = Math.max(...QUAD_ORDER.map(([k]) => quadrants[k]), 1e-9);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3" role="list" aria-label={text.quadrantsAria}>
      {QUAD_ORDER.map(([k, nameKey, shortKey]) => (
        <div key={k} role="listitem" aria-label={`${text[nameKey]}: ${pct(quadrants[k])}`} className="space-y-1.5 min-w-0">
          <Metric caption={text[shortKey]} title={text[nameKey]}>{pct(quadrants[k])}</Metric>
          <Meter value={quadrants[k] / max} />
        </div>
      ))}
    </div>
  );
};

const LoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div className="space-y-2" aria-busy="true" aria-label={label}>
    {[0, 1, 2].map(i => (
      <div key={i} className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>
    ))}
    <div className="flex gap-2">
      <Skeleton className="h-[60px] w-[60px]" />
      <div className="flex-1 space-y-1.5 pt-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-1">
      {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
    </div>
  </div>
);

const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics, loading, error, showVisualCenter, onShowVisualCenterChange,
  open: openProp, onOpenChange,
}) => {
  const [open, setOpen] = useSectionOpen(true, openProp, onOpenChange);
  const m = metrics;
  const { t, locale } = useLanguage();
  const x = t.metrics;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SectionHead
        label={x.title}
        open={open}
        meta={m ? m.aspectRatioLabel : undefined}
        tooltip={x.hint}
      />
      <CollapsibleContent className={SECTION_BODY}>
        {error && !loading && (
          <p className="flex items-start gap-1.5 text-footnote text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
            <span>{fill(x.error, { message: error })}</span>
          </p>
        )}
        {loading && !m && <LoadingState label={x.loadingAria} />}
        {m && (
          <div className={`space-y-6 transition-opacity duration-fast ease-out ${loading ? 'opacity-60' : ''}`}>
            {/* Leituras em linha rótulo / valor: numeral tabular, peso regular. */}
            <div className="divide-y divide-border">
              <ValueRow
                label={fill(x.ratioCaption, { orientation: x[ORIENTATION[m.orientation]] })}
                title={fill(x.ratioTitle, { ratio: m.aspectRatio.toFixed(3) })}
              >
                {m.aspectRatioLabel}
              </ValueRow>
              <ValueRow label={x.inkCoverage} meter={m.inkCoverage}>{pct(m.inkCoverage, 1)}</ValueRow>
              <ValueRow label={x.symmetryVertical} meter={m.symmetry.vertical}>{pct(m.symmetry.vertical)}</ValueRow>
              <ValueRow label={x.symmetryHorizontal} meter={m.symmetry.horizontal}>{pct(m.symmetry.horizontal)}</ValueRow>
              <ValueRow label={x.anchors}>{m.anchorCount.toLocaleString(locale)}</ValueRow>
              <ValueRow label={x.smoothAnchors}>{pct(m.smoothAnchorRatio)}</ValueRow>
            </div>

            <div className="space-y-3">
              <span className="label block">{x.centerCompare}</span>
              <div className="flex items-center gap-4">
                <CenterCompass offsetPercent={m.offsetPercent} hasVisual={!!m.visualCenter} label={x.compassAria} />
                <div className="flex-1 min-w-0 space-y-2">
                  {m.visualCenter ? (
                    <>
                      <Metric caption={x.deviation}>{m.deviationPercent.toFixed(1)}%</Metric>
                      <p className="text-callout text-muted-foreground truncate">
                        {x[H_BALANCE[m.balance.horizontal]]} · {x[V_BALANCE[m.balance.vertical]]}
                      </p>
                    </>
                  ) : (
                    <p className="text-callout text-muted-foreground">{x.noInk}</p>
                  )}
                </div>
              </div>
              {/* Deslocamento é delta: sempre com sinal e porcentagem, na pílula. */}
              {m.visualCenter && (
                <div className="grid grid-cols-2 gap-x-4">
                  <div className="metric metric-sm min-w-0">
                    <span><span className="metric-delta">{signed(m.offsetPercent.x)}</span></span>
                    <span className="metric-caption">{x.horizontal}</span>
                  </div>
                  <div className="metric metric-sm min-w-0">
                    <span><span className="metric-delta">{signed(m.offsetPercent.y)}</span></span>
                    <span className="metric-caption">{x.vertical}</span>
                  </div>
                </div>
              )}
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-callout text-foreground">{x.showVisualCenter}</span>
                <Switch
                  checked={showVisualCenter}
                  onCheckedChange={onShowVisualCenterChange}
                  disabled={!m.visualCenter}
                  aria-label={x.showVisualCenter}
                />
              </label>
            </div>

            <div className="space-y-3">
              <span className="label block">{x.quadrantBalance}</span>
              <QuadrantGrid quadrants={m.quadrants} text={x} />
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MetricsPanel;

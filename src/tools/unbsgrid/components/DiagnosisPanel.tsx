import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight, AlertTriangle, FileText, Braces, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Skeleton } from './ui/skeleton';
import { useSectionOpen } from '../hooks/use-section-open';
import { SectionHead } from './chrome';
import { SECTION_BODY } from './chrome-classes';
import type { GeometryOptions } from '../types/geometry';
import { levelLabel, type CriterionScore, type LogoDiagnosis } from '../lib/diagnosis';
import { useLanguage, fill } from '../i18n';
import type { GeometrySuggestion } from '../lib/suggest';
import {
  downloadDiagnosisReport, REPORT_FORMAT_LABELS, type ReportFormat, type ReportMeta,
} from '../lib/report-export';

export interface DiagnosisPanelProps {
  /** Diagnóstico pronto. `null` enquanto não há logo carregado. */
  diagnosis: LogoDiagnosis | null;
  /** Sugestões já calculadas (`suggestGeometries`). Opcional. */
  suggestions?: GeometrySuggestion[];
  /** Mostra esqueleto enquanto o cálculo roda. */
  loading?: boolean;
  /** Mensagem de erro do cálculo, se houver. */
  error?: string | null;
  /** Liga as construções pedidas por uma sugestão. */
  onEnableGeometries: (keys: Array<keyof GeometryOptions>) => void;
  /** Nome do arquivo de origem (vai para o cabeçalho e para o nome do download). */
  fileName?: string;
  /** Avisado depois de um download bem-sucedido. */
  onExported?: (format: ReportFormat, downloadedAs: string) => void;
  /** Painel começa aberto (padrão false: o diagnóstico é consulta, não estado permanente). */
  defaultOpen?: boolean;
  /** Estado controlado da seção (a sidebar usa como acordeão). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FORMATS: Array<{ format: ReportFormat; icon: React.ComponentType<{ className?: string }> }> = [
  { format: 'markdown', icon: FileText },
  { format: 'json', icon: Braces },
  { format: 'pdf', icon: FileDown },
];

/**
 * Barra de avaliação: trilho cinza, preenchimento em tinta, texto nunca por
 * cima. Amarelo aqui seria tinta, não ponteiro.
 */
const Meter: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-[3px] w-full rounded-pill overflow-hidden bg-fill-2" aria-hidden="true">
    <div
      className="h-full rounded-pill transition-[width] duration-base ease-out bg-foreground"
      style={{ width: `${Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))}%` }}
    />
  </div>
);

const CriterionRow: React.FC<{ criterion: CriterionScore }> = ({ criterion: c }) => {
  const [open, setOpen] = useState(false);
  const { t, locale } = useLanguage();
  const d = t.diagnosisPanel;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="w-full rounded-md px-1.5 py-1.5 text-left transition-colors duration-fast ease-out hover:bg-fill"
        aria-label={c.applicable ? fill(d.scoreAria, { label: c.label, score: c.score }) : `${c.label}: ${d.notApplicable}`}
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight
            className="h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-base ease-out"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
            strokeWidth={2.25}
          />
          <span className="flex-1 min-w-0 truncate text-callout text-foreground">{c.label}</span>
          <span className="text-value text-foreground shrink-0">{c.applicable ? c.score : '—'}</span>
          <span className="text-caption text-muted-foreground shrink-0 w-14 text-right">
            {c.applicable ? levelLabel(c.level) : d.notApplicable}
          </span>
        </span>
        <span className="mt-1.5 block pl-[18px]">
          <Meter value={c.applicable ? c.score : 0} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1.5 pl-[26px] pt-1.5 pb-2 space-y-2">
        <p className="text-callout text-muted-foreground">{c.summary}</p>
        {c.details.length > 0 && (
          <dl className="space-y-0.5">
            {c.details.map(detail => (
              <div key={detail.label} className="flex items-baseline justify-between gap-2 min-w-0">
                <dt className="label shrink-0">{detail.label}</dt>
                <dd className="text-value text-foreground truncate text-right">{detail.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {c.issues.length > 0 && (
          <ul className="space-y-1">
            {c.issues.map(i => (
              <li key={i} className="flex items-start gap-1.5 text-caption text-foreground">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-callout text-muted-foreground">
          {fill(d.weight, { weight: c.weight.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};

const LoadingState: React.FC<{ label: string }> = ({ label }) => (
  <div className="space-y-2" aria-busy="true" aria-label={label}>
    <Skeleton className="h-8 w-24" />
    {[0, 1, 2, 3].map(i => (
      <div key={i} className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1 w-full" />
      </div>
    ))}
  </div>
);

/**
 * Painel de diagnóstico: nota geral, critérios com barra de avaliação,
 * sugestões de construção e exportação do relatório.
 *
 * Autocontido: recebe tudo por props, não lê estado global e não conhece a
 * página. A exportação usa `lib/report-export.ts` com o `fileName` recebido.
 */
const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({
  diagnosis,
  suggestions = [],
  loading = false,
  error = null,
  onEnableGeometries,
  fileName,
  onExported,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}) => {
  const [open, setOpen] = useSectionOpen(defaultOpen, openProp, onOpenChange);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const { t } = useLanguage();
  const d = t.diagnosisPanel;

  const meta = useMemo<ReportMeta>(() => ({ fileName, suggestions }), [fileName, suggestions]);

  const handleExport = useCallback((format: ReportFormat) => {
    if (!diagnosis) return;
    setExporting(format);
    try {
      const name = downloadDiagnosisReport(diagnosis, format, { ...meta, date: new Date() });
      toast.success(fill(d.reportExported, { format: REPORT_FORMAT_LABELS[format] }), { description: name });
      onExported?.(format, name);
    } catch (err) {
      toast.error(d.reportFailed, {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(null);
    }
  }, [diagnosis, meta, onExported, d]);

  const handleSuggestion = useCallback((s: GeometrySuggestion) => {
    onEnableGeometries([...s.keys]);
    toast.success(s.label, { description: fill(d.suggestionDone, { n: s.keys.length }) });
  }, [onEnableGeometries, d]);

  const ready = !!diagnosis && diagnosis.ok;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SectionHead
        label={d.title}
        open={open}
        meta={ready ? diagnosis!.overall.score : undefined}
        tooltip={d.hint}
      />

      <CollapsibleContent className={SECTION_BODY}>
        {error && !loading && (
          <p className="flex items-start gap-1.5 text-footnote text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
            <span>{fill(d.error, { message: error })}</span>
          </p>
        )}

        {loading && !diagnosis && <LoadingState label={d.loadingAria} />}

        {!loading && !diagnosis && !error && (
          <p className="text-callout text-muted-foreground">{d.empty}</p>
        )}

        {diagnosis && !diagnosis.ok && (
          <p className="text-callout text-muted-foreground">
            {diagnosis.reason || d.noShapes}
          </p>
        )}

        {ready && (
          <div className={`card-body transition-opacity duration-fast ease-out ${loading ? 'opacity-60' : ''}`}>
            {/* A nota geral é o número-herói do painel: numeral grande em peso
                regular, legenda embaixo e uma régua fina em tinta. */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[44px] leading-[1.02] tracking-[-0.02em] font-normal tabular-nums text-foreground">
                  {diagnosis!.overall.score}
                </span>
                <span className="text-subhead text-foreground text-right min-w-0">
                  {diagnosis!.overall.label}
                </span>
              </div>
              <p className="metric-caption !mt-1">{d.overall} · {d.outOf}</p>
              <Meter value={diagnosis!.overall.score} />
            </div>

            <p className="text-callout text-muted-foreground">{diagnosis!.overall.summary}</p>

            <div className="space-y-0.5 -mx-1.5">
              {diagnosis!.criteria.map(c => <CriterionRow key={c.key} criterion={c} />)}
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-4">
                <span className="label block">{d.suggestions}</span>
                {suggestions.map(s => (
                  <div key={s.id} className="space-y-2">
                    <p className="text-callout text-muted-foreground">{s.reason}</p>
                    <button
                      type="button"
                      onClick={() => handleSuggestion(s)}
                      className="ctl ctl-outline ctl-sm w-full justify-center"
                      aria-label={fill(d.suggestionAria, { label: s.label, n: s.keys.length })}
                    >
                      {s.label}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <span className="label block">{d.exportReport}</span>
              <div className="grid grid-cols-3 gap-1">
                {FORMATS.map(({ format, icon: Icon }) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => handleExport(format)}
                    disabled={exporting !== null}
                    className="ctl ctl-outline ctl-sm justify-center gap-1"
                    aria-label={fill(d.exportReportAria, { format: REPORT_FORMAT_LABELS[format] })}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{REPORT_FORMAT_LABELS[format]}</span>
                  </button>
                ))}
              </div>
            </div>

            {diagnosis!.hygiene.warnings.length > 0 && (
              <ul className="space-y-1">
                {diagnosis!.hygiene.warnings.map(w => (
                  <li key={w} className="flex items-start gap-1.5 text-callout text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DiagnosisPanel;

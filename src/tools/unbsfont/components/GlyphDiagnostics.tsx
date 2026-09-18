/**
 * GlyphDiagnostics Component
 * Diagnostic panel and automatic fix for glyph problems
 */

import React, { useState, useMemo, useCallback } from 'react';
import { CheckCircle2, MoreHorizontal, Pencil, Ruler, Wrench } from 'lucide-react';
import { GlyphData, FontMetadata } from '../types';
import {
  runFullDiagnostics,
  autoFixAllIssues,
  normalizeGlyphToReference,
  autoNormalizeAllSizes,
  DiagnosticSummary,
  GlyphDiagnostic,
  DiagnosticSeverity
} from '../services/glyphDiagnosticService';
import { IconButton, Metric, Segmented, Sheet, Spinner } from './ui';
import { cx } from './cx';

interface GlyphDiagnosticsProps {
  glyphs: GlyphData[];
  metadata: FontMetadata;
  /** Mantido para os chamadores; as cores vêm dos tokens, que viram com a classe `dark`. */
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdateGlyph: (char: string, updates: Partial<GlyphData>) => void;
  onEditGlyph: (char: string) => void;
}

const SEVERITY_LABEL: Record<DiagnosticSeverity, string> = {
  error: 'Erro',
  warning: 'Aviso',
  info: 'Informação'
};

/** Gravidade em tinta: erro é o ponto cheio, aviso o ponto vazado, informação o ponto cinza. */
const SeverityIcon: React.FC<{ severity: DiagnosticSeverity }> = ({ severity }) => (
  <span
    role="img"
    aria-label={SEVERITY_LABEL[severity]}
    title={SEVERITY_LABEL[severity]}
    className={cx(
      'w-2 h-2 rounded-pill shrink-0 mt-[7px]',
      severity === 'error' && 'bg-foreground',
      severity === 'warning' && 'shadow-[inset_0_0_0_1.5px_hsl(var(--foreground))]',
      severity === 'info' && 'shadow-[inset_0_0_0_1.5px_hsl(var(--muted-foreground))]'
    )}
  />
);

type Filter = DiagnosticSeverity | 'all';

const GlyphDiagnostics: React.FC<GlyphDiagnosticsProps> = ({
  glyphs,
  metadata,
  isOpen,
  onClose,
  onUpdateGlyph,
  onEditGlyph
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [isFixing, setIsFixing] = useState(false);
  const [lastFixResult, setLastFixResult] = useState<{ fixed: number; failed: number } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const diagnostics = useMemo<DiagnosticSummary>(() => {
    return runFullDiagnostics(glyphs, metadata);
  }, [glyphs, metadata]);

  const filteredDiagnostics = useMemo(() => {
    if (filter === 'all') return diagnostics.diagnostics;
    return diagnostics.diagnostics.filter(d => d.severity === filter);
  }, [diagnostics.diagnostics, filter]);

  const groupedByGlyph = useMemo(() => {
    const grouped = new Map<string, GlyphDiagnostic[]>();
    for (const diag of filteredDiagnostics) {
      if (!grouped.has(diag.glyphChar)) {
        grouped.set(diag.glyphChar, []);
      }
      grouped.get(diag.glyphChar)!.push(diag);
    }
    return grouped;
  }, [filteredDiagnostics]);

  const handleAutoFixAll = useCallback(() => {
    setIsFixing(true);
    setTimeout(() => {
      const result = autoFixAllIssues(glyphs, metadata, onUpdateGlyph);
      setLastFixResult(result);
      setIsFixing(false);
    }, 100);
  }, [glyphs, metadata, onUpdateGlyph]);

  const handleNormalizeAll = useCallback(() => {
    const fixes = autoNormalizeAllSizes(glyphs, metadata);
    for (const [char, fix] of fixes) {
      onUpdateGlyph(char, fix);
    }
    setLastFixResult({ fixed: fixes.size, failed: 0 });
  }, [glyphs, metadata, onUpdateGlyph]);

  const handleFixSingle = useCallback((diag: GlyphDiagnostic) => {
    if (diag.autoFixAction) {
      const fixes = diag.autoFixAction();
      onUpdateGlyph(diag.glyphChar, fixes);
    }
  }, [onUpdateGlyph]);

  const handleNormalizeGlyph = useCallback((char: string) => {
    const glyph = glyphs.find(g => g.char === char);
    if (!glyph) return;

    const fixes = normalizeGlyphToReference(glyph, glyphs);
    if (fixes) {
      onUpdateGlyph(char, fixes);
    }
  }, [glyphs, onUpdateGlyph]);

  if (!isOpen) return null;

  const fixableCount = diagnostics.diagnostics.filter(d => d.autoFixAvailable).length;

  const filterItems: { value: Filter; label: React.ReactNode }[] = (['all', 'error', 'warning', 'info'] as const).map(f => {
    const count = f === 'all' ? diagnostics.diagnostics.length : f === 'error' ? diagnostics.errors : f === 'warning' ? diagnostics.warnings : diagnostics.infos;
    const label = f === 'all' ? 'Todos' : f === 'error' ? 'Erros' : f === 'warning' ? 'Avisos' : 'Informações';
    return {
      value: f,
      label: (
        <>
          {label}<span className="tabular opacity-60 ml-1.5">{count}</span>
        </>
      )
    };
  });

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      size="max-w-4xl"
      title="Diagnóstico"
      description={`${diagnostics.glyphsWithIssues} de ${diagnostics.totalGlyphs} glifos com problema`}
      actions={
        <>
          <button
            type="button"
            onClick={handleAutoFixAll}
            disabled={isFixing || fixableCount === 0}
            className="ctl ctl-filled"
          >
            {isFixing ? <Spinner /> : <Wrench className="w-4 h-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{isFixing ? 'Corrigindo' : 'Corrigir tudo'}</span>
          </button>

          <div className="relative">
            <IconButton
              label="Mais ações"
              variant="surface"
              active={moreOpen}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen(o => !o)}
            >
              <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
            </IconButton>
            {moreOpen && (
              <div role="menu" className="absolute right-0 top-12 z-10 w-64 material-popover p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMoreOpen(false); handleNormalizeAll(); }}
                  className="row w-full text-left flex-col items-start gap-0.5 h-auto py-2"
                >
                  <span className="text-[14px] text-foreground">Normalizar tamanhos</span>
                  <span className="text-[12px] text-muted-foreground">Iguala a altura visual de todos os glifos.</span>
                </button>
              </div>
            )}
          </div>
        </>
      }
      bodyClassName="flex flex-col gap-6"
    >
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <Metric value={diagnostics.totalGlyphs} caption="Glifos verificados" />
        <Metric value={diagnostics.glyphsWithIssues} caption="Com problema" />
        <Metric value={diagnostics.errors} caption="Erros" />
        <Metric value={diagnostics.warnings} caption="Avisos" />
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <Segmented<Filter> items={filterItems} value={filter} onChange={setFilter} ariaLabel="Filtrar por gravidade" />
        </div>

        {/* Last Fix Result */}
        {lastFixResult && (
          <p className="flex items-center gap-2 text-[14px] text-foreground" role="status">
            <span aria-hidden="true" className="w-2 h-2 rounded-pill bg-foreground shrink-0" />
            {lastFixResult.fixed} {lastFixResult.fixed === 1 ? 'correção aplicada' : 'correções aplicadas'}
            {lastFixResult.failed > 0 && (
              <span className="text-muted-foreground">({lastFixResult.failed} falharam)</span>
            )}
          </p>
        )}
      </div>

      {/* Diagnostics List */}
      {filteredDiagnostics.length === 0 ? (
        <div className="bg-canvas rounded-xl flex flex-col items-center justify-center gap-2 py-14 px-5 text-center">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground mb-1" aria-hidden="true" />
          <p className="text-[17px] text-foreground">Nenhum problema encontrado</p>
          <p className="text-[14px] text-muted-foreground">Todos os glifos têm métricas consistentes.</p>
        </div>
      ) : (
        <ul className="flex flex-col min-w-0 hairline-t">
          {Array.from(groupedByGlyph.entries()).map(([char, diags]) => (
            <li key={char} className="hairline-b py-4 flex flex-col gap-3 min-w-0">
              {/* Glyph Header */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-md bg-canvas text-foreground flex items-center justify-center text-[32px] leading-none shrink-0">
                  {char}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground truncate">{diags[0].glyphName}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {diags.length} {diags.length > 1 ? 'problemas encontrados' : 'problema encontrado'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => { onEditGlyph(char); onClose(); }}
                    className="ctl ctl-sm ctl-outline"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    Editar
                  </button>
                  <IconButton label="Normalizar pelos outros glifos" onClick={() => handleNormalizeGlyph(char)}>
                    <Ruler className="w-4 h-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>

              {/* Issues List */}
              <ul className="flex flex-col min-w-0 sm:pl-[72px]">
                {diags.map((diag, idx) => (
                  <li key={idx} className={cx('flex items-start gap-3 py-2.5 min-w-0', idx > 0 && 'hairline-t')}>
                    <SeverityIcon severity={diag.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-foreground">
                        {diag.severity === 'error' && <span className="text-destructive">Erro: </span>}
                        {diag.message}
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-0.5">{diag.suggestion}</p>
                      <p className="text-[12px] text-muted-foreground mt-1 tabular">Código: {diag.code}</p>
                    </div>
                    {diag.autoFixAvailable && (
                      <button
                        type="button"
                        onClick={() => handleFixSingle(diag)}
                        className="ctl ctl-sm ctl-outline shrink-0"
                      >
                        Corrigir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
};

export default GlyphDiagnostics;

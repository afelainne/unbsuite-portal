/**
 * GlyphDiagnostics Component
 * Painel de diagnóstico e correção automática de problemas em glyphs
 */

import React, { useState, useMemo, useCallback } from 'react';
import { GlyphData, FontMetadata } from '../types';
import {
  runFullDiagnostics,
  autoFixAllIssues,
  normalizeGlyphToReference,
  DiagnosticSummary,
  GlyphDiagnostic,
  DiagnosticSeverity
} from '../services/glyphDiagnosticService';

interface GlyphDiagnosticsProps {
  glyphs: GlyphData[];
  metadata: FontMetadata;
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUpdateGlyph: (char: string, updates: Partial<GlyphData>) => void;
  onEditGlyph: (char: string) => void;
}

const SeverityIcon: React.FC<{ severity: DiagnosticSeverity }> = ({ severity }) => {
  switch (severity) {
    case 'error':
      return (
        <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case 'info':
      return (
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
  }
};

const GlyphDiagnostics: React.FC<GlyphDiagnosticsProps> = ({
  glyphs,
  metadata,
  isDarkMode,
  isOpen,
  onClose,
  onUpdateGlyph,
  onEditGlyph
}) => {
  const [filter, setFilter] = useState<DiagnosticSeverity | 'all'>('all');
  const [isFixing, setIsFixing] = useState(false);
  const [lastFixResult, setLastFixResult] = useState<{ fixed: number; failed: number } | null>(null);

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

  const bgClass = isDarkMode ? 'bg-slate-950' : 'bg-white';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-black/10';
  const textClass = isDarkMode ? 'text-white' : 'text-black';
  const mutedClass = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
  const cardClass = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200';
  const btnClass = isDarkMode 
    ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-white' 
    : 'bg-white border-neutral-300 hover:bg-neutral-100 text-black';

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-4 ${isDarkMode ? 'bg-black/70' : 'bg-white/70'}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[85vh] rounded-3xl border ${bgClass} ${borderClass} ${textClass} flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass}`}>
          <div>
            <p className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Diagnóstico de Glyphs
            </p>
            <p className={`text-xs ${mutedClass}`}>
              Detecta e corrige problemas de tamanho, alinhamento e métricas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-full border flex items-center justify-center text-lg font-black ${isDarkMode ? 'border-white/20 hover:bg-white/10' : 'border-neutral-300 hover:bg-neutral-100'}`}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Summary Bar */}
        <div className={`px-6 py-4 border-b ${borderClass} flex items-center gap-6 flex-wrap`}>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black">{diagnostics.totalGlyphs}</p>
              <p className={`text-[10px] uppercase tracking-wider ${mutedClass}`}>Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-red-500">{diagnostics.errors}</p>
              <p className={`text-[10px] uppercase tracking-wider ${mutedClass}`}>Erros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-amber-500">{diagnostics.warnings}</p>
              <p className={`text-[10px] uppercase tracking-wider ${mutedClass}`}>Avisos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-blue-500">{diagnostics.infos}</p>
              <p className={`text-[10px] uppercase tracking-wider ${mutedClass}`}>Info</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${mutedClass}`}>Filtrar:</span>
            {(['all', 'error', 'warning', 'info'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-full border transition ${
                  filter === f
                    ? isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                    : btnClass
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'error' ? 'Erros' : f === 'warning' ? 'Avisos' : 'Info'}
              </button>
            ))}
          </div>

          {/* Auto Fix Button */}
          <button
            onClick={handleAutoFixAll}
            disabled={isFixing || diagnostics.diagnostics.filter(d => d.autoFixAvailable).length === 0}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition ${
              isDarkMode 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-slate-700 disabled:text-slate-500' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-neutral-200 disabled:text-neutral-400'
            }`}
          >
            {isFixing ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Corrigindo...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
              Auto-Corrigir Tudo
            </span>
          )}
          </button>
        </div>

        {/* Last Fix Result */}
        {lastFixResult && (
          <div className={`px-6 py-2 border-b ${borderClass} ${isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
            <p className="text-sm text-emerald-600 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {lastFixResult.fixed} correções aplicadas
              {lastFixResult.failed > 0 && ` (${lastFixResult.failed} falharam)`}
            </p>
          </div>
        )}

        {/* Diagnostics List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredDiagnostics.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <p className="font-bold text-lg">Nenhum problema encontrado!</p>
              <p className={`text-sm ${mutedClass}`}>
                Todos os glyphs estão com métricas consistentes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedByGlyph.entries()).map(([char, diags]) => (
                <div
                  key={char}
                  className={`border rounded-2xl overflow-hidden ${cardClass}`}
                >
                  {/* Glyph Header */}
                  <div className={`px-4 py-3 border-b ${borderClass} flex items-center gap-4`}>
                    <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center text-2xl font-black">
                      {char}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{diags[0].glyphName}</p>
                      <p className={`text-xs ${mutedClass}`}>
                        {diags.length} problema{diags.length > 1 ? 's' : ''} detectado{diags.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleNormalizeGlyph(char)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border ${btnClass} flex items-center gap-1.5`}
                        title="Normalizar baseado em outros glyphs"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Normalizar
                      </button>
                      <button
                        onClick={() => { onEditGlyph(char); onClose(); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border ${btnClass} flex items-center gap-1.5`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                    </div>
                  </div>

                  {/* Issues List */}
                  <div className="divide-y divide-inherit">
                    {diags.map((diag, idx) => (
                      <div key={idx} className="px-4 py-3 flex items-start gap-3">
                        <SeverityIcon severity={diag.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{diag.message}</p>
                          <p className={`text-xs ${mutedClass} mt-0.5 flex items-start gap-1`}>
                            <svg className="w-3 h-3 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                            {diag.suggestion}
                          </p>
                          <p className={`text-[10px] ${mutedClass} mt-1 font-mono`}>
                            Código: {diag.code}
                          </p>
                        </div>
                        {diag.autoFixAvailable && (
                          <button
                            onClick={() => handleFixSingle(diag)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition ${
                              isDarkMode 
                                ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' 
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            Corrigir
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${borderClass} flex items-center justify-between`}>
          <p className={`text-xs ${mutedClass}`}>
            {diagnostics.glyphsWithIssues} de {diagnostics.totalGlyphs} glyphs com problemas
          </p>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border ${btnClass}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlyphDiagnostics;

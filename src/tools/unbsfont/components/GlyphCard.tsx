import React, { useRef, useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { GlyphData } from '../types';
import { useNotice } from '../contexts/NoticeContext';
import { cx } from './cx';

export type GlyphWarning = 'overshoot' | 'height-violation' | 'no-path';

interface GlyphCardProps {
  glyph: GlyphData;
  onEdit: (glyph: GlyphData) => void;
  onUpdate: (char: string, newData: Partial<GlyphData>) => void;
  onUpdateMembers: (parentChar: string, memberChars: string) => void;
  onDragStart: (char: string) => void;
  onDrop: (targetChar: string) => void;
  isPasteMode: boolean;
  onPaste: (char: string) => void;
  onMoveGlyph: (fromChar: string, toChar: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onClear: () => void;
  isSelected?: boolean;
  isDarkMode?: boolean;
  warnings?: GlyphWarning[];
}

/** Avisos tipográficos: tudo em tinta; o erro é o ponto cheio, o aviso é o vazado. */
const WARNING_INFO: Record<GlyphWarning, { label: string; solid: boolean }> = {
  'overshoot': { label: 'Overshoot esperado', solid: false },
  'height-violation': { label: 'Fora da altura', solid: true },
  'no-path': { label: 'Glifo vazio', solid: false },
};

const METRIC_INPUT =
  'field field-sm tabular text-center px-1 pointer-events-auto h-6 text-[11px]';

const GlyphCard: React.FC<GlyphCardProps> = ({
  glyph, onEdit, onUpdate, onDragStart, onDrop, isPasteMode, onPaste, onMoveGlyph, onContextMenu, onClear, isSelected, warnings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { pushNotice } = useNotice();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(result, "image/svg+xml");
      const path = doc.querySelector("path");

      if (path) {
        const d = path.getAttribute("d");
        if (d) {
          onUpdate(glyph.char, { pathData: d });
        }
      } else {
        pushNotice('O SVG precisa conter um elemento <path>.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isSpace = glyph.char === ' ';
  const hasPath = !isSpace && glyph.pathData && glyph.pathData.length > 0;
  const isComposite = glyph.components && glyph.components.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(glyph.char);
  };

  const handleClick = () => {
      if (isPasteMode) {
          onPaste(glyph.char);
      } else {
          // O espaço também abre o editor, para ajustar a largura.
          onEdit(glyph);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
      }
  };

  const handleMetricChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'leftSideBearing' | 'advanceWidth') => {
      e.stopPropagation();
      const val = parseInt(e.target.value) || 0;
      onUpdate(glyph.char, { [field]: val });
  };

  const handleMoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const target = window.prompt(`Mover ou trocar o desenho de "${glyph.char}" para:`, "");
      if (target && target.trim()) {
          onMoveGlyph(glyph.char, target.trim());
      }
  };

  const handleClearClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm(`Limpar o glifo "${glyph.char}"?`)) {
          onClear();
      }
  };

  const handleContextMenuInternal = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onContextMenu(e);
  };

  const showMetrics = !isPasteMode && (isHovered || isSelected);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={isPasteMode ? `Colar SVG em ${glyph.name}` : `Editar ${glyph.name}`}
      aria-pressed={isSelected || undefined}
      className={cx(
        'relative group w-full pt-[100%] rounded-lg overflow-hidden cursor-pointer outline-none focus-visible:shadow-focus',
        'transition-[background-color,color,box-shadow] duration-fast ease-out',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:shadow-hairline-strong',
        isDragOver && 'shadow-[inset_0_0_0_2px_hsl(var(--foreground))]',
        isPasteMode && 'cursor-copy'
      )}
      draggable
      onDragStart={() => onDragStart(glyph.char)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenuInternal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Caractere e estado */}
      <div className="absolute top-2.5 left-3 z-30 flex items-center gap-1.5 pointer-events-none">
        <span className={cx('text-[13px] leading-none select-none', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {isSpace ? '␣' : glyph.char}
        </span>
        {isComposite && (
          <span className={cx('chip h-[18px] px-1.5 text-[10px]', isSelected && 'bg-primary-foreground/15 text-primary-foreground')}>Composto</span>
        )}
      </div>

      {/* Avisos tipográficos */}
      {warnings && warnings.length > 0 && (
          <div className="absolute bottom-9 left-3 z-30 flex gap-1 pointer-events-none">
              {warnings.map(w => {
                  const info = WARNING_INFO[w];
                  return (
                      <span
                          key={w}
                          title={info.label}
                          className="w-2 h-2 rounded-pill"
                          style={info.solid
                              ? { background: 'currentColor' }
                              : { boxShadow: 'inset 0 0 0 1.5px currentColor' }}
                      />
                  );
              })}
          </div>
      )}

      {!isPasteMode && (
          <div className="absolute top-1.5 right-1.5 z-30 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-fast ease-out">
             {hasPath && (
                <button
                    type="button"
                    onClick={handleMoveClick}
                    className="ctl ctl-sm ctl-icon h-7 w-7 bg-card text-foreground shadow-hairline hover:bg-surface-hover"
                    aria-label={`Mover ou trocar ${glyph.name}`}
                    title="Mover ou trocar"
                >
                    <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                </button>
             )}
             <button
                type="button"
                onClick={handleClearClick}
                className="ctl ctl-sm ctl-icon h-7 w-7 bg-card text-destructive shadow-hairline hover:bg-surface-hover"
                aria-label={`Limpar ${glyph.name}`}
                title="Limpar glifo"
            >
                <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".svg" />

      {/* Desenho */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        {/* Guias de métrica ao passar o mouse */}
        {!isSpace && isHovered && !isPasteMode && !isSelected && (
            <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
                 <div className="absolute top-0 bottom-0 left-0 bg-fill-2" style={{ width: `${(glyph.leftSideBearing / 1000) * 100}%` }} />
                 <div className="absolute top-0 bottom-0 border-r border-dashed border-foreground/30" style={{ left: `${(glyph.advanceWidth / 1000) * 100}%` }} />
            </div>
        )}

        {isSpace ? (
            <div className="flex flex-col items-center justify-center gap-2 select-none">
                <span className={cx('text-[12px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>Espaço</span>
                <div className="w-12 h-px bg-current opacity-30" />
            </div>
        ) : hasPath ? (
          <svg viewBox="0 0 1000 1000" className="relative w-full h-full fill-current" style={{ overflow: 'visible' }} aria-hidden="true">
             <g transform={`translate(${glyph.leftSideBearing}, ${glyph.baselineOffset}) scale(${glyph.scale})`}><path d={glyph.pathData} /></g>
          </svg>
        ) : (
          <div className="flex items-center justify-center select-none h-full w-full">
             <div className={cx('text-[4.5rem] font-normal leading-none', isSelected ? 'opacity-40' : 'text-muted-foreground/25')}>{glyph.char}</div>
          </div>
        )}

        {isPasteMode && !hasPath && !isSpace && (
            <span className="absolute chip chip-invert">Colar aqui</span>
        )}
      </div>

      {/* Nome e métricas */}
      {!isPasteMode && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end z-20">
              <label className={cx('flex flex-col items-start gap-0.5 transition-opacity duration-fast ease-out', showMetrics ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                  <span className={cx('text-[10px] pl-0.5', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>LSB</span>
                  <input
                    type="number"
                    className={cx(METRIC_INPUT, 'w-11')}
                    value={glyph.leftSideBearing}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => handleMetricChange(e, 'leftSideBearing')}
                    aria-label={`Margem esquerda de ${glyph.name}`}
                  />
              </label>

              <div className={cx('absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none transition-opacity duration-fast ease-out', showMetrics ? 'opacity-0' : 'opacity-100')}>
                  <span className={cx('text-[11px] truncate max-w-[80%]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {glyph.name}
                  </span>
              </div>

              <label className={cx('flex flex-col items-end gap-0.5 transition-opacity duration-fast ease-out', showMetrics ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
                  <span className={cx('text-[10px] pr-0.5', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>Largura</span>
                  <input
                    type="number"
                    className={cx(METRIC_INPUT, 'w-12')}
                    value={glyph.advanceWidth}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onChange={(e) => handleMetricChange(e, 'advanceWidth')}
                    aria-label={`Largura de ${glyph.name}`}
                  />
              </label>
          </div>
      )}
    </div>
  );
};

export default GlyphCard;

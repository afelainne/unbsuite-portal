import React, { useRef, useState } from 'react';
import { GlyphData } from '../types';
import { useNotice } from '../contexts/NoticeContext';

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
}

const GlyphCard: React.FC<GlyphCardProps> = ({ 
  glyph, onEdit, onUpdate, onDragStart, onDrop, isPasteMode, onPaste, onMoveGlyph, onContextMenu, onClear, isSelected, isDarkMode
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
          // Allow editing metrics for Space too
          onEdit(glyph);
      }
  };

  const handleMetricChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'leftSideBearing' | 'advanceWidth') => {
      e.stopPropagation();
      const val = parseInt(e.target.value) || 0;
      onUpdate(glyph.char, { [field]: val });
  };

  const handleMoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const target = window.prompt(`Move/Swap shape from '${glyph.char}' to:`, "");
      if (target && target.trim()) {
          onMoveGlyph(glyph.char, target.trim());
      }
  };
  
  const handleClearClick = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      if (window.confirm("Clear this slot?")) {
          onClear();
      }
  };

  const handleContextMenuInternal = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onContextMenu(e);
  };

  // Theme styles
  const cardBase = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-200';
  const cardHover = isDarkMode ? 'hover:border-slate-500' : 'hover:border-black';
  const cardSelected = isDarkMode ? 'bg-slate-800 border-white ring-1 ring-white' : 'bg-neutral-50 border-black ring-1 ring-black';
  const badgeStyle = isDarkMode ? 'bg-white text-black' : 'bg-black text-white';
  const textSub = isDarkMode ? 'text-slate-500' : 'text-neutral-400';
  const inputBg = isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-neutral-200 text-black';

  return (
    <div 
      className={`relative group border rounded-xl w-full pt-[100%] transition-all overflow-hidden cursor-pointer ${
        isSelected ? cardSelected :
        isDragOver ? 'border-blue-500 ring-2 ring-blue-500/20' : 
        isPasteMode ? 'border-green-500 hover:border-green-600 cursor-copy' :
        `${cardBase} ${cardHover}`
      }`}
      draggable
      onDragStart={() => onDragStart(glyph.char)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropInternal}
      onClick={handleClick}
      onContextMenu={handleContextMenuInternal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header: Char Badge & Status */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
        <span className={`text-lg font-black font-mono w-8 h-8 flex items-center justify-center rounded-lg select-none ${
            isPasteMode ? 'bg-green-500 text-white' : 
            isSpace ? (isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-neutral-100 text-neutral-400 border border-neutral-200') :
            badgeStyle
        }`}>
          {glyph.char === ' ' ? '␣' : glyph.char}
        </span>
        
        {isComposite && (
             <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-neutral-100 border-neutral-200 text-neutral-500'}`}>Linked</span>
        )}
      </div>

      {/* Hover Actions (Top Right) */}
      {!isPasteMode && (
          <div className="absolute top-3 right-3 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
             {hasPath && (
                <button 
                    onClick={handleMoveClick}
                    className={`w-7 h-7 flex items-center justify-center rounded-md border hover:scale-105 transition-transform ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-neutral-200 hover:border-black text-black'}`}
                    title="Move/Swap"
                >
                    ⇄
                </button>
             )}
             <button 
                onClick={handleClearClick}
                    className={`w-7 h-7 flex items-center justify-center rounded-md border hover:scale-105 transition-transform ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-red-900/50 hover:border-red-800 text-red-400' : 'bg-white border-neutral-200 hover:bg-red-50 hover:border-red-200 text-red-500'}`}
                title="Clear Slot"
            >
                ✕
            </button>
          </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".svg" />

      {/* Glyph Preview */}
      <div className={`absolute inset-0 flex items-center justify-center p-4 pointer-events-none ${isPasteMode ? (isDarkMode ? 'bg-green-900/10' : 'bg-green-50') : ''}`}>
        {/* Visual Guides on Hover */}
        {!isSpace && isHovered && !isPasteMode && (
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                 <div className="absolute top-0 bottom-0 left-0 bg-blue-500 border-r border-blue-600" style={{ width: `${(glyph.leftSideBearing / 1000) * 100}%` }}></div>
                 <div className="absolute top-0 bottom-0 border-r border-red-500 border-dashed" style={{ left: `${(glyph.advanceWidth / 1000) * 100}%` }}></div>
            </div>
        )}

        {isSpace ? (
            <div className={`flex flex-col items-center justify-center gap-2 opacity-50 select-none`}>
                <span className={`text-xs font-bold uppercase tracking-widest ${textSub}`}>Space</span>
                <div className={`w-16 h-1 border-b-2 border-dashed ${isDarkMode ? 'border-slate-600' : 'border-neutral-300'}`}></div>
            </div>
        ) : hasPath ? (
          <svg viewBox="0 0 1000 1000" className={`w-full h-full fill-current ${isDarkMode ? 'text-white' : 'text-black'}`} style={{ overflow: 'visible' }}>
             <g transform={`translate(${glyph.leftSideBearing}, ${glyph.baselineOffset}) scale(${glyph.scale})`}><path d={glyph.pathData} /></g>
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none select-none h-full w-full opacity-5">
             <div className={`text-[6rem] font-bold leading-none ${isDarkMode ? 'text-white' : 'text-black'}`}>{glyph.char}</div>
          </div>
        )}
        
        {isPasteMode && !hasPath && !isSpace && <span className="absolute text-green-600 text-[10px] font-bold animate-pulse bg-green-100 px-2 py-1 rounded border border-green-200">Paste Here</span>}
      </div>
      
      {/* Bottom Metrics (Inputs) */}
      {!isPasteMode && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end z-20">
              {/* LSB */}
              <div className={`flex flex-col items-start transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
                  <label className={`text-[8px] font-bold uppercase mb-0.5 ml-0.5 ${textSub}`}>LSB</label>
                  <input 
                    type="number" 
                    className={`w-10 text-center text-[10px] font-bold rounded-md outline-none py-0.5 pointer-events-auto ${inputBg} hover:border-blue-400 focus:border-blue-500`} 
                    value={glyph.leftSideBearing} 
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => handleMetricChange(e, 'leftSideBearing')} 
                  />
              </div>

              {/* Name Tag (Center) - Only show if not hovering metrics to avoid overlap, or push it up */}
              <div className={`absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none transition-all ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap overflow-hidden max-w-[60px] text-ellipsis ${isDarkMode ? 'text-slate-500' : 'text-neutral-400'}`}>
                      {glyph.name}
                  </span>
              </div>

              {/* Width */}
              <div className={`flex flex-col items-end transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
                  <label className={`text-[8px] font-bold uppercase mb-0.5 mr-0.5 ${textSub}`}>Width</label>
                  <input 
                    type="number" 
                    className={`w-12 text-center text-[10px] font-bold rounded-md outline-none py-0.5 pointer-events-auto ${inputBg} hover:border-blue-400 focus:border-blue-500`} 
                    value={glyph.advanceWidth} 
                    onClick={(e) => e.stopPropagation()} 
                    onChange={(e) => handleMetricChange(e, 'advanceWidth')} 
                  />
              </div>
          </div>
      )}
    </div>
  );
};

export default GlyphCard;

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Move } from 'lucide-react';
import { FormatPreset, PrintSettings } from '../types';
import { MM_TO_PX } from '../constants';

interface TemplatePreviewProps {
  preset: FormatPreset;
  settings: PrintSettings;
  image?: string | null;
  showOverlay: boolean;
  showSafety: boolean;
}

const TOOLBAR_THEME = {
  bg: 'hsl(var(--card))',
  text: 'hsl(var(--foreground))',
  muted: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
};

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  preset, settings, image, showOverlay, showSafety
}) => {
  const widthPx = preset.width * MM_TO_PX;
  const heightPx = preset.height * MM_TO_PX;
  const bleedPx = settings.bleed * MM_TO_PX;
  const safePx = settings.safeZone * MM_TO_PX;
  const gutterPx = settings.gutter * MM_TO_PX;

  const vbW = widthPx + (bleedPx * 2);
  const vbH = heightPx + (bleedPx * 2);

  const contentW = widthPx - (safePx * 2);
  const contentH = heightPx - (safePx * 2);
  const colW = (contentW - (gutterPx * (settings.columns - 1))) / settings.columns;
  const rowH = settings.rows > 1 ? (contentH - (gutterPx * (settings.rows - 1))) / settings.rows : contentH;

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const calcFitZoom = useCallback(() => {
    const c = containerRef.current;
    if (!c) return 1;
    const pad = 48;
    return Math.min((c.clientWidth - pad) / vbW, (c.clientHeight - pad) / vbH, 1) * 0.9;
  }, [vbW, vbH]);

  const fitToScreen = useCallback(() => {
    setZoom(calcFitZoom());
    setPanOffset({ x: 0, y: 0 });
  }, [calcFitZoom]);

  // Auto-fit on mount and format change
  useEffect(() => { fitToScreen(); }, [preset.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refit on container resize
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      setZoom(calcFitZoom());
      setPanOffset({ x: 0, y: 0 });
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [calcFitZoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.1, Math.min(5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const c = containerRef.current;
    if (c) {
      const rect = c.getBoundingClientRect();
      setCursorPos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
    }
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const BtnIcon: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button onClick={onClick} className="h-6 w-6 flex items-center justify-center rounded hover:bg-foreground/5 transition-colors"
      style={{ color: TOOLBAR_THEME.text }}>
      {children}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-canvas relative">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b"
        style={{ backgroundColor: TOOLBAR_THEME.bg, borderColor: TOOLBAR_THEME.border }}>
        <BtnIcon onClick={() => setZoom(z => Math.min(5, z + 0.25))}><ZoomIn className="h-3 w-3" /></BtnIcon>
        <BtnIcon onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}><ZoomOut className="h-3 w-3" /></BtnIcon>
        <BtnIcon onClick={fitToScreen}><Maximize className="h-3 w-3" /></BtnIcon>
        <BtnIcon onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}><RotateCcw className="h-3 w-3" /></BtnIcon>
        <div className="h-3 w-px mx-0.5" style={{ backgroundColor: TOOLBAR_THEME.border }} />
        <div className="flex items-center gap-0.5 text-[9px]" style={{ color: TOOLBAR_THEME.muted }}>
          <Move className="h-2.5 w-2.5" /><span>Alt+Drag</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[9px]" style={{ color: TOOLBAR_THEME.muted }}>
          <span>{preset.name}</span>
          {cursorPos && <span>X:{cursorPos.x} Y:{cursorPos.y}</span>}
          <span className="font-mono">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}>
          <svg
            id="formatlab-canvas"
            width={vbW * zoom} 
            height={vbH * zoom} 
            viewBox={`0 0 ${vbW} ${vbH}`}
            className="bg-white shadow-2xl transition-shadow duration-300"
            xmlns="http://www.w3.org/2000/svg"
          >
            {image && (
              <image href={image} x={bleedPx} y={bleedPx} width={widthPx} height={heightPx} preserveAspectRatio="xMidYMid slice" />
            )}
            <rect x="0" y="0" width={vbW} height={vbH} fill="none" stroke="#ff00ff" strokeWidth="1" strokeDasharray="4 4" />
            <rect x={bleedPx} y={bleedPx} width={widthPx} height={heightPx} fill="none" stroke="#000" strokeWidth="1" />
            {showSafety && (
              <rect x={bleedPx + safePx} y={bleedPx + safePx} width={widthPx - (safePx * 2)} height={heightPx - (safePx * 2)} fill="none" stroke="#ff4444" strokeWidth="1" />
            )}
            {showOverlay && Array.from({ length: settings.columns }).map((_, ci) => (
              Array.from({ length: Math.max(1, settings.rows) }).map((_, ri) => (
                <rect key={`cell-${ci}-${ri}`}
                  x={bleedPx + safePx + (ci * (colW + gutterPx))}
                  y={bleedPx + safePx + (ri * (rowH + gutterPx))}
                  width={colW}
                  height={rowH}
                  fill="rgba(0, 150, 255, 0.05)" stroke="rgba(0, 150, 255, 0.2)" strokeWidth="0.5" />
              ))
            ))}
            <g stroke="#000" strokeWidth="0.5">
              <line x1="0" y1={bleedPx} x2={bleedPx/2} y2={bleedPx} />
              <line x1={bleedPx} y1="0" x2={bleedPx} y2={bleedPx/2} />
              <line x1={vbW} y1={bleedPx} x2={vbW - bleedPx/2} y2={bleedPx} />
              <line x1={vbW - bleedPx} y1="0" x2={vbW - bleedPx} y2={bleedPx/2} />
              <line x1="0" y1={vbH - bleedPx} x2={bleedPx/2} y2={vbH - bleedPx} />
              <line x1={bleedPx} y1={vbH} x2={bleedPx} y2={vbH - bleedPx/2} />
              <line x1={vbW} y1={vbH - bleedPx} x2={vbW - bleedPx/2} y2={vbH - bleedPx} />
              <line x1={vbW - bleedPx} y1={vbH} x2={vbW - bleedPx} y2={vbH - bleedPx/2} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

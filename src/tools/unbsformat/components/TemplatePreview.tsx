
import React from 'react';
import { FormatPreset, PrintSettings } from '../types';
import { MM_TO_PX } from '../constants';

interface TemplatePreviewProps {
  preset: FormatPreset;
  settings: PrintSettings;
  image: string | null;
  showOverlay: boolean;
  showSafety: boolean;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  preset, 
  settings, 
  image,
  showOverlay,
  showSafety
}) => {
  const widthPx = preset.width * MM_TO_PX;
  const heightPx = preset.height * MM_TO_PX;
  const bleedPx = settings.bleed * MM_TO_PX;
  const safePx = settings.safeZone * MM_TO_PX;
  const gutterPx = settings.gutter * MM_TO_PX;

  // Viewbox includes bleed
  const vbW = widthPx + (bleedPx * 2);
  const vbH = heightPx + (bleedPx * 2);

  // Grid calculation
  const contentW = widthPx - (safePx * 2);
  const colW = (contentW - (gutterPx * (settings.columns - 1))) / settings.columns;

  return (
    <div className="flex-1 bg-[#eeeeee] overflow-auto flex items-center justify-center p-12 relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 mono uppercase">
        CANVAS TARGET: {preset.name}
      </div>
      
      <svg 
        width={vbW} 
        height={vbH} 
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="bg-white shadow-2xl transition-all duration-300"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Image */}
        {image && (
          <image 
            href={image} 
            x={bleedPx} 
            y={bleedPx} 
            width={widthPx} 
            height={heightPx} 
            preserveAspectRatio="xMidYMid slice"
          />
        )}

        {/* Bleed Area (Sangria) */}
        <rect 
          x="0" y="0" width={vbW} height={vbH} 
          fill="none" stroke="#ff00ff" strokeWidth="1" strokeDasharray="4 4" 
        />
        
        {/* Trim Line (Corte) */}
        <rect 
          x={bleedPx} y={bleedPx} width={widthPx} height={heightPx} 
          fill="none" stroke="#000" strokeWidth="1" 
        />

        {/* Safe Zone (Margem de Segurança) */}
        {showSafety && (
            <rect 
            x={bleedPx + safePx} y={bleedPx + safePx} 
            width={widthPx - (safePx * 2)} height={heightPx - (safePx * 2)} 
            fill="none" stroke="#ff4444" strokeWidth="1" 
            />
        )}

        {/* Columns & Gutters Overlay */}
        {showOverlay && Array.from({ length: settings.columns }).map((_, i) => (
          <rect
            key={`col-${i}`}
            x={bleedPx + safePx + (i * (colW + gutterPx))}
            y={bleedPx + safePx}
            width={colW}
            height={heightPx - (safePx * 2)}
            fill="rgba(0, 150, 255, 0.05)"
            stroke="rgba(0, 150, 255, 0.2)"
            strokeWidth="0.5"
          />
        ))}

        {/* Technical Marks (Crop marks) */}
        <g stroke="#000" strokeWidth="0.5">
          {/* Top Left */}
          <line x1="0" y1={bleedPx} x2={bleedPx/2} y2={bleedPx} />
          <line x1={bleedPx} y1="0" x2={bleedPx} y2={bleedPx/2} />
          {/* Top Right */}
          <line x1={vbW} y1={bleedPx} x2={vbW - bleedPx/2} y2={bleedPx} />
          <line x1={vbW - bleedPx} y1="0" x2={vbW - bleedPx} y2={bleedPx/2} />
          {/* Bottom Left */}
          <line x1="0" y1={vbH - bleedPx} x2={bleedPx/2} y2={vbH - bleedPx} />
          <line x1={bleedPx} y1={vbH} x2={bleedPx} y2={vbH - bleedPx/2} />
          {/* Bottom Right */}
          <line x1={vbW} y1={vbH - bleedPx} x2={vbW - bleedPx/2} y2={vbH - bleedPx} />
          <line x1={vbW - bleedPx} y1={vbH} x2={vbW - bleedPx} y2={vbH - bleedPx/2} />
        </g>
      </svg>
    </div>
  );
};

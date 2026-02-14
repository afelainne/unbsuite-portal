import React from 'react';
import { getContrastColor } from '../utils/colorMath';
import { HarmonyColor } from '../types';

interface SwatchStripProps {
  colors: HarmonyColor[];
  onSelect: (hex: string) => void;
  selectedHex: string;
  showPantoneMatch: boolean;
}

export const SwatchStrip: React.FC<SwatchStripProps> = ({ colors, onSelect, selectedHex, showPantoneMatch }) => {
  
  // Helper to color code Delta E
  const getDeltaEColor = (str: string) => {
    if (!str.startsWith('ΔE')) return 'text-gray-400'; 
    const val = parseFloat(str.replace('ΔE ', ''));
    if (isNaN(val)) return 'text-gray-400';
    if (val < 2) return 'text-green-600 font-bold';
    if (val < 5) return 'text-yellow-600 font-bold';
    return 'text-red-500 font-bold';
  };

  return (
    <div className="w-full flex h-[100px] md:h-[120px] rounded-md overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] mt-12 mb-12">
      {colors.map((color, index) => {
        const textColor = getContrastColor(color.hex);
        const isSelected = color.hex.toUpperCase() === selectedHex.toUpperCase();
        const scoreColorClass = getDeltaEColor(color.type);

        return (
          <div
            key={index}
            onClick={() => onSelect(color.hex)}
            className={`
              relative flex-1 flex flex-col justify-end p-2 cursor-pointer
              transition-[flex] duration-200 ease-out hover:flex-[3] group
            `}
            style={{ backgroundColor: color.hex }}
            title={`${color.name} (${color.hex})`}
          >
            {/* Selected Checkmark */}
            {isSelected && (
               <div className="absolute top-2 right-2 w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center text-black shadow-sm">
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
               </div>
            )}

            {/* Vertical Text (Name) */}
            <span 
              className="font-mono text-[9px] md:text-[10px] tracking-widest uppercase opacity-80 group-hover:opacity-100 whitespace-nowrap mb-6 mx-auto"
              style={{ 
                  writingMode: 'vertical-lr', 
                  transform: 'rotate(180deg)',
                  color: textColor,
                  textShadow: textColor === '#FFFFFF' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              {showPantoneMatch ? color.pantoneCode || color.name : color.name}
            </span>
            
            {/* Score Label (Visible on hover or if space permits, always visible at bottom in group hover) */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span 
                 className={`text-[9px] font-mono px-1 py-[1px] bg-white/90 rounded-[2px] shadow-sm ${scoreColorClass}`}
               >
                  {color.type}
               </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
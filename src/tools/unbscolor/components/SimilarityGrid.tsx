import React from 'react';
import { ColorMatch, RGB, CMYK, LAB, HSL } from '../types';
import { hexToRgb, rgbToCmyk, rgbToHsl, hexToLab, getClosestColorName } from '../utils/colorMath';

interface SimilarityGridProps {
  matches: ColorMatch[];
  selectedHex: string;
  onSelect: (hex: string) => void;
  showRefMatch: boolean;
}

const normalizeRefCode = (code?: string) => {
    if (!code) return '';
    const upper = code.toUpperCase();
    return upper.replace(/\s+CP\b/g, ' C').replace(/\s+UP\b/g, ' U');
};

const SimilarityCard: React.FC<{ match: ColorMatch; onSelect: () => void; showRefMatch: boolean }> = ({ match, onSelect, showRefMatch }) => {
    const { reference, deltaE } = match;
  
  // Calc derived stats for the card
    const rgb = reference.rgb;
  const cmyk = rgbToCmyk(rgb);
    const lab = hexToLab(reference.hex);
  const hsl = rgbToHsl(rgb);

  // Get Fictional Name
    const descriptiveName = getClosestColorName(reference.hex);

  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
    navigator.clipboard.writeText(`${descriptiveName}\n${reference.hex}`);
  };

  // Color code score
  let scoreColorBg = 'bg-[#222] text-white';
  if (deltaE < 1.0) scoreColorBg = 'bg-purple-600 text-white'; // Precise match
  else if (deltaE < 2.0) scoreColorBg = 'bg-green-600 text-white';
  else if (deltaE < 5.0) scoreColorBg = 'bg-yellow-500 text-black';
  else scoreColorBg = 'bg-red-500 text-white';

  return (
    <div 
        onClick={onSelect}
        className="group relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-black"
    >
        {/* Preview */}
        <div 
            className="h-[70px] w-full rounded mb-3 shadow-inner relative" 
            style={{ backgroundColor: reference.hex }}
        >
             {deltaE < 1.0 && (
                 <div className="absolute top-2 right-2 bg-white text-purple-600 text-[9px] font-bold px-1 rounded shadow-sm">
                     EXACT
                 </div>
             )}
        </div>

        {/* Title (Fictional Name) */}
        <h3 className="font-bold text-sm text-gray-900 mb-1 truncate" title={descriptiveName}>
            {descriptiveName}
        </h3>
        
        {/* Subtitle (Hex) */}
        <div className="text-xs font-mono text-gray-400 mb-3">{reference.hex}</div>

        {/* Reference code revealed after search */}
        {showRefMatch && (
          <div className="font-mono text-[10px] text-gray-500 mb-1 border-t border-gray-100 pt-2">
            {normalizeRefCode(reference.code)}
          </div>
        )}

        {/* Meta 2 */}
        <div className="font-mono text-[10px] text-gray-400 mb-3">
            H{hsl.h}° S{hsl.s}% L{hsl.l}%
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-auto">
            <span className={`${scoreColorBg} px-2 py-[2px] rounded-[3px] text-[9px] font-bold font-mono`}>
                ΔE {deltaE.toFixed(2)}
            </span>
            <span className="bg-[#f0f0f0] text-gray-600 px-2 py-[2px] rounded-[3px] text-[9px] font-mono">
                L{lab.l} a{lab.a} b{lab.b}
            </span>
        </div>

        {/* Copy Button (Hover) */}
        <button 
            onClick={handleCopy}
            className="absolute bottom-2 right-2 bg-gray-100 hover:bg-black hover:text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-wider"
        >
            Copy
        </button>
    </div>
  );
};

export const SimilarityGrid: React.FC<SimilarityGridProps> = ({ matches, onSelect, showRefMatch }) => {
  return (
    <div className="mt-16 mb-12">
        <h3 className="font-mono text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">
            Nearby Matches (ΔE 00)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {matches.map((match, idx) => (
                <SimilarityCard
                    key={idx + match.reference.code}
                    match={match}
                    onSelect={() => onSelect(match.reference.hex)}
                    showRefMatch={showRefMatch}
                />
            ))}
        </div>
    </div>
  );
};
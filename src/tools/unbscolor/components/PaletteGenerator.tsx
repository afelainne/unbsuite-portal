
import React, { useState } from 'react';
import { extractColorsFromSvg, extractDominantColors } from '../utils/imageExtraction';
import { useLanguage } from '../i18n/LanguageContext';

interface PaletteGeneratorProps {
  onColorSelect: (hex: string) => void;
  onPaletteDetected?: (colors: string[]) => void;
}

export const PaletteGenerator: React.FC<PaletteGeneratorProps> = ({ onColorSelect, onPaletteDetected }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const processSvg = (svgText: string) => {
    try {
      const hexColors = extractColorsFromSvg(svgText);
      if (hexColors.length > 0) {
        onColorSelect(hexColors[0]);
        if (onPaletteDetected) {
          onPaletteDetected(hexColors);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFile = async (file: File) => {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isRaster = /^image\/(jpeg|png|webp)$/.test(file.type);
    if (!isSvg && !isRaster) return;

    setLoading(true);
    try {
      if (isSvg) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) processSvg(e.target.result as string);
          setLoading(false);
        };
        reader.readAsText(file);
      } else {
        const colors = await extractDominantColors(file, 8);
        if (colors.length > 0) {
          onColorSelect(colors[0]);
          if (onPaletteDetected) onPaletteDetected(colors);
        }
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <>
        <button 
          onClick={() => document.getElementById('hidden-file-upload')?.click()}
          disabled={loading}
          className="h-10 px-3 rounded-md border border-gray-200 bg-white text-gray-600 hover:border-black hover:text-black transition-colors flex items-center gap-2 group"
        >
          {loading ? (
             <span className="animate-pulse">{t.processingImage}</span>
          ) : (
             <>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               <span className="hidden sm:inline">SVG / IMG</span>
             </>
          )}
      </button>
      <input 
          id="hidden-file-upload" 
          type="file" 
          className="hidden" 
          accept=".svg,image/svg+xml,image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])} 
      />
    </>
  );
};

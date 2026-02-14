
import React, { useState, useEffect } from 'react';
import { extractColorsFromImage } from '../utils/imageExtraction';
import { useLanguage } from '../i18n/LanguageContext';

interface PaletteGeneratorProps {
  onColorSelect: (hex: string) => void;
  onPaletteDetected?: (colors: string[]) => void;
}

export const PaletteGenerator: React.FC<PaletteGeneratorProps> = ({ onColorSelect, onPaletteDetected }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const processImage = async (src: string) => {
    setLoading(true);
    try {
      const hexColors = await extractColorsFromImage(src, 12);
      if (hexColors.length > 0) {
        onColorSelect(hexColors[0]);
        if (onPaletteDetected) {
            onPaletteDetected(hexColors);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.match('image.*') && !file.name.endsWith('.svg')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) processImage(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) handleFile(blob);
          e.preventDefault();
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

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
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               <span className="hidden sm:inline">{t.uploadImageSvg}</span>
             </>
          )}
      </button>
      <input 
          id="hidden-file-upload" 
          type="file" 
          className="hidden" 
          accept="image/*,.svg"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])} 
      />
    </>
  );
};

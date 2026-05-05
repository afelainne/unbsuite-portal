
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
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');

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
        <div className="flex items-center gap-1">
        <button
          onClick={() => document.getElementById('hidden-file-upload')?.click()}
          disabled={loading}
          className="h-10 px-3 rounded-md border border-border bg-card text-foreground/80 hover:border-foreground hover:text-foreground transition-colors flex items-center gap-2 group"
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
        <button
          onClick={() => { setPasteValue(''); setPasteOpen(true); }}
          className="h-10 px-2 rounded-md border border-border bg-card text-foreground/80 hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Paste SVG code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <span className="hidden sm:inline text-xs font-mono uppercase tracking-wider">Paste</span>
        </button>
        </div>
      <input 
          id="hidden-file-upload" 
          type="file" 
          className="hidden" 
          accept=".svg,image/svg+xml,image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])} 
      />
      {pasteOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPasteOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-xl w-full max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest mb-3">Paste SVG code</h3>
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="<svg ...> ... </svg>"
              className="w-full h-56 p-3 font-mono text-xs bg-background border border-border rounded-md focus:outline-none focus:border-foreground resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setPasteOpen(false)}
                className="h-9 px-3 rounded-md border border-border text-xs font-mono uppercase hover:border-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pasteValue.trim()) {
                    processSvg(pasteValue);
                    setPasteOpen(false);
                  }
                }}
                className="h-9 px-4 rounded-md bg-foreground text-background text-xs font-mono uppercase font-bold hover:bg-foreground/80"
              >
                Extract
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

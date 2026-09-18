
import React, { useState } from 'react';
import { extractColorsFromSvg, extractDominantColors } from '../utils/imageExtraction';
import { useLanguage } from '../i18n/LanguageContext';
import { ClipboardPaste, ImageUp } from 'lucide-react';
import { IconButton } from './ui';

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
        reader.onerror = () => {
          console.error(reader.error);
          setLoading(false);
        };
        reader.onabort = () => setLoading(false);
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
      <IconButton
        variant="surface"
        label={loading ? t.processingImage : t.uploadImageSvg}
        onClick={() => document.getElementById('hidden-file-upload')?.click()}
        disabled={loading}
        className={loading ? 'pulse-dot' : undefined}
      >
        <ImageUp aria-hidden="true" />
      </IconButton>
      <IconButton variant="surface" label={t.pasteSvgCode} onClick={() => { setPasteValue(''); setPasteOpen(true); }}>
        <ClipboardPaste aria-hidden="true" />
      </IconButton>
      <input 
          id="hidden-file-upload" 
          type="file" 
          className="hidden" 
          accept=".svg,image/svg+xml,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            // Allow picking the same file again
            e.target.value = '';
          }}
      />
      {pasteOpen && (
        <div
          className="fixed inset-0 z-[100] bg-foreground/30 flex items-center justify-center p-4"
          onClick={() => setPasteOpen(false)}
        >
          <div
            className="material-sheet fade-in-up w-full max-w-xl p-6 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={t.pasteSvgCode}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[24px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground mb-5">{t.pasteSvgCode}</h3>
            <textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="<svg ...> ... </svg>"
              className="field field-mono h-56 text-[12px] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="ctl ctl-outline ctl-lg text-[14px]"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pasteValue.trim()) {
                    processSvg(pasteValue);
                    setPasteOpen(false);
                  }
                }}
                className="ctl ctl-filled ctl-lg text-[14px]"
              >
                {t.extract}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

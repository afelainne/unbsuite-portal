import React, { useEffect, useRef, useState } from 'react';
import { PALETTE_EXPORT_FORMATS, PaletteExportFormat, PaletteSwatch, exportPalette } from '../utils/paletteExport';
import { toSafeFileName } from '../utils/escape';
import { downloadBlob } from '../utils/browser';
import type { Translations } from '../i18n';

interface PaletteExportMenuProps {
  t: Translations;
  swatches: PaletteSwatch[];
  paletteName?: string;
  onExported?: (format: PaletteExportFormat) => void;
}

const formatLabel = (t: Translations, format: PaletteExportFormat): string => {
  switch (format) {
    case 'css':
      return t.exportFormatCss;
    case 'tailwind-v3':
      return t.exportFormatTailwind3;
    case 'tailwind-v4':
      return t.exportFormatTailwind4;
    case 'dtcg':
      return t.exportFormatDtcg;
    case 'ase':
      return t.exportFormatAse;
    case 'gpl':
      return t.exportFormatGpl;
  }
  return String(format);
};

export const PaletteExportMenu: React.FC<PaletteExportMenuProps> = ({ t, swatches, paletteName = 'UNBSCOLOR Palette', onExported }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const formats = Object.keys(PALETTE_EXPORT_FORMATS) as PaletteExportFormat[];
  const disabled = swatches.length === 0;

  const handleExport = (format: PaletteExportFormat) => {
    const meta = PALETTE_EXPORT_FORMATS[format];
    const blob = exportPalette(swatches, format, paletteName);
    downloadBlob(blob, `${toSafeFileName(paletteName, 'palette')}.${meta.extension}`);
    setOpen(false);
    onExported?.(format);
  };

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        type="button"
        className="ctl ctl-outline ctl-sm px-3"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        {t.exportPaletteMenu}
        <svg className={`w-3 h-3 transition-transform duration-fast ease-out ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] material-popover fade-in-up p-1.5 flex flex-col gap-0.5"
        >
          {formats.map((format) => (
            <button type="button" role="menuitem" key={format} className="row justify-between min-h-9" onClick={() => handleExport(format)}>
              <span>{formatLabel(t, format)}</span>
              <span className="text-[12px] tabular text-muted-foreground">.{PALETTE_EXPORT_FORMATS[format].extension}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

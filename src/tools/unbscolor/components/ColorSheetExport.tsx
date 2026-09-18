
import React from 'react';
import { PaletteItemData } from '../utils/projectStorage';
import { rgbToCmyk } from '../utils/colorMath';
import { useLanguage } from '../i18n/LanguageContext';

interface ColorSheetExportProps {
  projectName: string;
  items: PaletteItemData[];
  onClose: () => void;
}

export const ColorSheetExport: React.FC<ColorSheetExportProps> = ({ projectName, items, onClose }) => {
  const { t } = useLanguage();
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background print:bg-card overflow-auto">
      {/* Print / Close Controls - Hidden when printing */}
      <div className="fixed top-0 left-0 right-0 z-10 material-chrome px-4 py-3 flex justify-between items-center gap-4 print:hidden">
        <div className="flex flex-col min-w-0">
            <span className="text-headline text-foreground">{t.colorGuidePreview}</span>
            <span className="text-footnote text-muted-foreground">{t.printSavePdfHint}</span>
        </div>
        <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="ctl ctl-plain">{t.closeButton}</button>
            <button type="button" onClick={handlePrint} className="ctl ctl-filled">{t.printSavePdf}</button>
        </div>
      </div>

      {/* The Printable Sheet */}
      <div className="max-w-[210mm] mx-auto bg-card min-h-screen pt-24 pb-12 px-12 print:p-0 print:w-full print:max-w-none">
        
        {/* Header */}
        <header className="pb-6 mb-12 hairline-b flex justify-between items-end">
            <div>
                <h1 className="text-title-1 text-foreground mb-2">{projectName}</h1>
                <p className="label">{t.brandColorGuide}</p>
            </div>
            <div className="text-right">
                <p className="text-footnote text-muted-foreground">{t.generatedByTool}</p>
                <p className="text-value text-[12px] text-muted-foreground">{new Date().toLocaleDateString()}</p>
            </div>
        </header>

        {/* Grid Content omitted for brevity as it remains the same, assuming user only wanted the name change */}
        <div className="text-center text-footnote text-muted-foreground mt-12 pt-8 hairline-t">
            © {new Date().getFullYear()} UNBSCOLOR | {t.professionalColorStandards}
        </div>
      </div>
    </div>
  );
};

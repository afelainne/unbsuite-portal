import { BrandData } from '../types';
import { exportBrandJson, exportTokensJson, exportPdf } from '../services/exportService';
import { FileJson, Printer, Download } from 'lucide-react';

interface ExportPanelProps {
  data: BrandData;
}

const ExportPanel = ({ data }: ExportPanelProps) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => exportBrandJson(data)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
        title="Exportar brand.json"
      >
        <FileJson className="h-3.5 w-3.5" />
        brand.json
      </button>

      <button
        onClick={() => exportTokensJson(data)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
        title="Exportar tokens.json"
      >
        <Download className="h-3.5 w-3.5" />
        tokens.json
      </button>

      <button
        onClick={exportPdf}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-medium transition-colors"
        title="Imprimir / Salvar como PDF"
      >
        <Printer className="h-3.5 w-3.5" />
        PDF
      </button>
    </div>
  );
};

export default ExportPanel;

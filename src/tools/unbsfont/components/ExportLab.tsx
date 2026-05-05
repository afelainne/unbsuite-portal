import React, { useState } from 'react';
import { FontMetadata, GlyphData } from '../types';
import { downloadFontEditorFont } from '../services/fontEditorExporter';

interface ExportLabProps {
  glyphs: GlyphData[];
  metadata: FontMetadata;
  isDarkMode: boolean;
}

const ExportLab: React.FC<ExportLabProps> = ({ glyphs, metadata, isDarkMode }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const subtle = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
  const panelClass = isDarkMode
    ? 'bg-slate-950 border-slate-800 text-white'
    : 'bg-white border-neutral-200 text-black';

  const handleExportFontEditor = async () => {
    setIsExporting(true);
    setLastResult(null);
    try {
      const result = await downloadFontEditorFont(metadata, glyphs);
      setLastResult(`✓ Exported: ${result.fileName} (${result.glyphCount} glyphs)`);
    } catch (err) {
      console.error('Export failed:', err);
      setLastResult(`✗ Error: ${err instanceof Error ? err.message : 'Export failed'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`border-t ${isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-neutral-200 bg-neutral-50'} px-4 py-6`}> 
      <div className={`rounded-xl border p-4 ${panelClass}`}>
        <h3 className="text-xs font-black uppercase tracking-wide mb-3">Export Lab - Alternative Engine</h3>
        <p className={`text-sm mb-4 ${subtle}`}>
          Export using fonteditor-core as alternative engine to opentype.js. 
          May resolve aliasing issues in complex paths.
        </p>

        <button
          onClick={handleExportFontEditor}
          disabled={isExporting}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isDarkMode
              ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-700'
              : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-neutral-300'
          }`}
        >
          {isExporting ? 'Exporting...' : 'Export OTF (fonteditor-core)'}
        </button>

        {lastResult && (
          <p className={`text-sm mt-3 ${lastResult.startsWith('✓') ? 'text-green-500' : 'text-red-500'}`}>
            {lastResult}
          </p>
        )}
      </div>
    </div>
  );
};

export default ExportLab;

import React, { useRef, useState, useEffect } from 'react';
import { parseACB } from '../utils/acbParser';
import { ReferenceColor } from '../types';
import { StoredLibrary } from '../utils/storage';
import { useLanguage } from '../i18n';

interface LibraryManagerProps {
  currentLibraryName: string;
  customLibraries: StoredLibrary[];
  onLibrarySelect: (name: string, colors: ReferenceColor[]) => void;
  onLibraryUpload: (name: string, colors: ReferenceColor[]) => void;
  onLibraryDelete: (name: string) => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({ 
  currentLibraryName, 
  customLibraries,
  onLibrarySelect, 
  onLibraryUpload,
  onLibraryDelete
}) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Helper to check for corrupted colors (all black)
  const currentLib = customLibraries.find(l => l.name === currentLibraryName);
  const hasInvalidColors = currentLib && currentLib.colors.length > 0 && currentLib.colors.every(c => c.hex === '#000000');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseACB(buffer);
      
      if (result.colors.length === 0) {
        throw new Error(t.noValidColors);
      }
      
      // Use filename as fallback name if ACB internal name is generic
      let libName = result.name;
      if (!libName || libName === "Untitled" || libName === "Imported Library") {
          libName = file.name.replace(/\.acb$/i, "");
      }

      onLibraryUpload(libName, result.colors);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.parseFailed);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportJson = () => {
    const lib = customLibraries.find(l => l.name === currentLibraryName);
    
    if (lib) {
        const jsonString = JSON.stringify(lib.colors, null, 2);
        navigator.clipboard.writeText(jsonString).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        });
    } else {
        alert(t.cannotExportStandard);
    }
  };

  return (
    <div className="flex flex-col gap-4 border border-black p-4 bg-white">
      
      {/* Top Row: Selector and Upload */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="w-full sm:w-auto flex-grow">
            <label className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2 block">
              {t.selectLibrary}
            </label>
            <div className="relative">
                <select 
                    value={currentLibraryName}
                    onChange={(e) => {
                        const name = e.target.value;
                  if (name === t.standardLibrary) {
                            onLibrarySelect(name, []); 
                        } else {
                            const lib = customLibraries.find(l => l.name === name);
                            if (lib) onLibrarySelect(lib.name, lib.colors);
                        }
                    }}
                    className="w-full p-2 border border-black font-mono text-sm bg-white appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-black"
                >
                <option value={t.standardLibrary}>{t.standardLibrary}</option>
                {customLibraries.length > 0 && <optgroup label={t.uploadedLibraries}>
                        {customLibraries.map(lib => (
                            <option key={lib.name} value={lib.name}>{lib.name} ({lib.colors.length})</option>
                        ))}
                    </optgroup>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="file" 
              accept=".acb" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 h-[38px]"
            >
              {isProcessing ? t.loading : `+ ${t.uploadAcb}`}
            </button>
          </div>
      </div>

          {error && <div className="text-xs text-red-500 font-bold bg-red-50 p-2 border border-red-200">{error}</div>}
      
      {hasInvalidColors && (
          <div className="text-xs text-red-600 bg-red-50 p-2 border border-red-200 font-mono">
              <strong>{t.warning}</strong> {t.allBlackWarning}
          </div>
      )}

      {/* Bottom Row: Management Actions (Only for Custom Libraries) */}
      {!isStandard && (
          <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-300">
              <button 
                  onClick={handleExportJson}
                  className="px-3 py-1 text-[10px] font-mono border border-gray-300 hover:border-black hover:bg-gray-50 transition-colors uppercase flex items-center gap-2"
              >
                  {copyFeedback ? (
                      <span className="text-green-600 font-bold">{t.copiedToClipboard}</span>
                  ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {t.copyJsonCode}
                      </>
                  )}
              </button>
              
              <button 
                  onClick={() => onLibraryDelete(currentLibraryName)}
                  className="ml-auto px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors uppercase"
              >
                    {t.deleteLibrary}
              </button>
          </div>
      )}
      
      {!isStandard && !hasInvalidColors && (
        <p className="text-[10px] text-gray-400 font-mono leading-tight">
                * {t.verifyColorsNote}
        </p>
      )}
    </div>
  );
};
import React, { useRef, useState, useEffect } from 'react';
import { parseACB } from '../utils/acbParser';
import { ReferenceColor } from '../types';
import { StoredLibrary } from '../utils/storage';
import { useLanguage } from '../i18n';
import { copyText, useTransientState } from '../utils/browser';

/** Fixed id for the built-in library (never compare against translated labels). */
export const STANDARD_LIBRARY_ID = '__standard__';

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
  const [copyFeedback, showCopyFeedback] = useTransientState<'ok' | 'fail'>(2000);

  // Helper to check for corrupted colors (all black)
  const currentLib = customLibraries.find(l => l.name === currentLibraryName);
  const hasInvalidColors = currentLib && currentLib.colors.length > 0 && currentLib.colors.every(c => c.hex === '#000000');
  const isStandard = currentLibraryName === STANDARD_LIBRARY_ID;

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
      if (libName === STANDARD_LIBRARY_ID) libName = `${libName} (${t.customSuffix})`;

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
        void copyText(jsonString).then((ok) => showCopyFeedback(ok ? 'ok' : 'fail'));
    } else {
        setError(t.cannotExportStandard);
    }
  };

  return (
    <div className="flex flex-col gap-4 material-card">

      {/* Top Row: Selector and Upload */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div className="w-full sm:w-auto flex-grow">
            <label className="label mb-1.5 block">
              {t.selectLibrary}
            </label>
            <div className="relative">
                <select 
                    value={currentLibraryName}
                    onChange={(e) => {
                        const name = e.target.value;
                  if (name === STANDARD_LIBRARY_ID) {
                            onLibrarySelect(STANDARD_LIBRARY_ID, []);
                        } else {
                            const lib = customLibraries.find(l => l.name === name);
                            if (lib) onLibrarySelect(lib.name, lib.colors);
                        }
                    }}
                    className="field"
                    aria-label={t.selectLibrary}
                >
                <option value={STANDARD_LIBRARY_ID}>{t.standardLibrary}</option>
                {customLibraries.length > 0 && <optgroup label={t.uploadedLibraries}>
                        {customLibraries.map(lib => (
                            <option key={lib.name} value={lib.name}>{lib.name} ({lib.colors.length})</option>
                        ))}
                    </optgroup>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center px-2 text-muted-foreground" aria-hidden="true">
                    <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
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
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="ctl ctl-filled w-full sm:w-auto"
            >
              {isProcessing ? t.loading : `+ ${t.uploadAcb}`}
            </button>
          </div>
      </div>

          {error && <div className="text-footnote font-medium text-foreground bg-fill-2 px-3 py-2 rounded-sm" role="alert">{error}</div>}

      {hasInvalidColors && (
          <div className="text-footnote text-foreground bg-fill-2 px-3 py-2 rounded-sm" role="alert">
              <strong className="font-semibold">{t.warning}</strong> {t.allBlackWarning}
          </div>
      )}

      {/* Bottom Row: Management Actions (Only for Custom Libraries) */}
      {!isStandard && (
          <div className="flex items-center gap-2 pt-3 hairline-t">
              <button
                  type="button"
                  onClick={handleExportJson}
                  className="ctl ctl-outline ctl-sm"
              >
                  {copyFeedback ? (
                      <span className="font-semibold" role="status">
                        {copyFeedback === 'ok' ? t.copiedToClipboard : t.copyFailed}
                      </span>
                  ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      {t.copyJsonCode}
                      </>
                  )}
              </button>
              
              <button
                  type="button"
                  onClick={() => onLibraryDelete(currentLibraryName)}
                  className="ctl ctl-plain ctl-sm ml-auto hover:text-destructive hover:bg-destructive/10"
              >
                    {t.deleteLibrary}
              </button>
          </div>
      )}
      
      {!isStandard && !hasInvalidColors && (
        <p className="text-caption text-muted-foreground">
                * {t.verifyColorsNote}
        </p>
      )}
    </div>
  );
};
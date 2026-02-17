import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FontMetadata, GlyphData } from '../types';
import { exportFontWithFontEditor } from '../services/fontEditorExporter';

interface FontPreviewProps {
  glyphs: GlyphData[];
  metadata: FontMetadata;
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_TEXTS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'The quick brown fox jumps over the lazy dog.',
  'HAMBURGEFONSTIV',
  'Typography & Design',
  'AV AW AT LT VA WA TA YA',
];

const FontPreview: React.FC<FontPreviewProps> = ({ glyphs, metadata, isDarkMode, isOpen, onClose }) => {
  const [fontUrl, setFontUrl] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [previewSize, setPreviewSize] = useState(48);

  // Generate unique font family name
  const uniqueFontFamily = useMemo(() => {
    return `FontPreview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Export and load font
  const loadFont = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Export font to ArrayBuffer
      const buffer = await exportFontWithFontEditor(metadata, glyphs);
      
      // Create blob URL
      const blob = new Blob([buffer], { type: 'font/ttf' });
      const url = URL.createObjectURL(blob);
      
      // Clean up old URL
      if (fontUrl) {
        URL.revokeObjectURL(fontUrl);
      }
      
      // Create @font-face rule
      const fontFace = new FontFace(uniqueFontFamily, `url(${url})`);
      await fontFace.load();
      document.fonts.add(fontFace);
      
      setFontUrl(url);
      setFontFamily(uniqueFontFamily);
    } catch (err) {
      console.error('Failed to load font preview:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar preview');
    } finally {
      setIsLoading(false);
    }
  }, [metadata, glyphs, uniqueFontFamily, fontUrl]);

  // Load font when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFont();
    }
    
    return () => {
      // Cleanup on unmount
      if (fontUrl) {
        URL.revokeObjectURL(fontUrl);
      }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const bgMain = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const bgOverlay = isDarkMode ? 'bg-black/80' : 'bg-black/50';
  const textMain = isDarkMode ? 'text-white' : 'text-black';
  const textSub = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
  const borderCol = isDarkMode ? 'border-slate-700' : 'border-neutral-300';
  const inputBg = isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-neutral-50 border-neutral-300';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${bgOverlay}`}
      onClick={onClose}
    >
      <div 
        className={`relative w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${bgMain} ${textMain}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderCol}`}>
          <div>
            <h2 className="text-lg font-bold">Visualização Final da Fonte</h2>
            <p className={`text-sm ${textSub}`}>
              {metadata.familyName || 'CustomFont'} - Preview real da fonte exportada
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadFont}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-700'
                  : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-neutral-300'
              }`}
            >
              {isLoading ? '⏳ Carregando...' : '↻ Atualizar'}
            </button>
            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors ${
                isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-neutral-100'
              }`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className={`px-6 py-3 border-b flex items-center gap-6 ${borderCol} ${isDarkMode ? 'bg-slate-800/50' : 'bg-neutral-50'}`}>
          <div className="flex items-center gap-3">
            <label className={`text-xs font-bold uppercase ${textSub}`}>Tamanho:</label>
            <input
              type="range"
              min="12"
              max="120"
              value={previewSize}
              onChange={(e) => setPreviewSize(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-mono w-12">{previewSize}px</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Digite texto personalizado..."
              className={`w-full px-4 py-2 rounded-lg border text-sm ${inputBg}`}
            />
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-500 font-semibold">{error}</p>
                <button
                  onClick={loadFont}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-4 animate-pulse">⏳</div>
                <p className={textSub}>Exportando e carregando fonte...</p>
              </div>
            </div>
          ) : fontFamily ? (
            <div className="space-y-6">
              {/* Custom text */}
              {customText && (
                <div className={`p-4 rounded-xl border ${borderCol}`}>
                  <p className={`text-xs font-bold uppercase mb-2 ${textSub}`}>Texto Personalizado</p>
                  <p 
                    style={{ 
                      fontFamily: `"${fontFamily}", sans-serif`, 
                      fontSize: previewSize 
                    }}
                    className="break-words"
                  >
                    {customText}
                  </p>
                </div>
              )}

              {/* Sample texts at different sizes */}
              <div className={`p-4 rounded-xl border ${borderCol}`}>
                <p className={`text-xs font-bold uppercase mb-4 ${textSub}`}>Amostras em Diferentes Tamanhos</p>
                <div className="space-y-4">
                  {[72, 48, 36, 24, 18, 14, 12].map((size) => (
                    <div key={size} className="flex items-baseline gap-4">
                      <span className={`text-xs font-mono w-12 text-right ${textSub}`}>{size}px</span>
                      <p 
                        style={{ 
                          fontFamily: `"${fontFamily}", sans-serif`, 
                          fontSize: size 
                        }}
                      >
                        {metadata.familyName || 'HAMBURGEFONSTIV'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Character sets */}
              {SAMPLE_TEXTS.map((text, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${borderCol}`}>
                  <p 
                    style={{ 
                      fontFamily: `"${fontFamily}", sans-serif`, 
                      fontSize: previewSize 
                    }}
                    className="break-words"
                  >
                    {text}
                  </p>
                </div>
              ))}

              {/* Waterfall - like Windows font viewer */}
              <div className={`p-4 rounded-xl border ${borderCol}`}>
                <p className={`text-xs font-bold uppercase mb-4 ${textSub}`}>Cascata de Tamanhos (estilo Windows)</p>
                <div className="space-y-2">
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map((size) => (
                    <p 
                      key={size}
                      style={{ 
                        fontFamily: `"${fontFamily}", sans-serif`, 
                        fontSize: size 
                      }}
                    >
                      {size}px - The quick brown fox jumps over the lazy dog. 0123456789
                    </p>
                  ))}
                </div>
              </div>

              {/* All glyphs grid */}
              <div className={`p-4 rounded-xl border ${borderCol}`}>
                <p className={`text-xs font-bold uppercase mb-4 ${textSub}`}>Todos os Caracteres</p>
                <div 
                  className="flex flex-wrap gap-2"
                  style={{ fontFamily: `"${fontFamily}", sans-serif` }}
                >
                  {glyphs
                    .filter(g => g.pathData && g.char !== ' ')
                    .map((g, idx) => (
                      <div 
                        key={idx}
                        className={`w-12 h-12 flex items-center justify-center border rounded-lg ${borderCol}`}
                        style={{ fontSize: 32 }}
                        title={`${g.char} (${g.name || g.unicode})`}
                      >
                        {g.char}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className={textSub}>Clique em "Atualizar" para carregar o preview</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className={`px-6 py-3 border-t text-xs ${borderCol} ${textSub} flex items-center justify-between`}>
          <span>
            {glyphs.filter(g => g.pathData).length} glyphs • 
            UPM: {metadata.unitsPerEm || 1000} • 
            Ascender: {metadata.ascender || 800} • 
            Descender: {metadata.descender || -200}
          </span>
          <span>
            💡 Este preview usa a fonte TTF real exportada
          </span>
        </div>
      </div>
    </div>
  );
};

export default FontPreview;

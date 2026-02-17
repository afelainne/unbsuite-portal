import React, { useState, useEffect, useRef } from 'react';
import { GlyphData, FontMetadata, DEFAULT_TRACKING_PROFILES, TrackingProfile } from '../types';
import { getTrackingBetweenGlyphs, isAllCapsWord } from '../services/trackingService';
import { resolveKerningValue } from '../services/kerningService';
import { useNotice } from '../contexts/NoticeContext';

// Interface para snapshot das configurações iniciais
interface TestModeSnapshot {
    lineGap: number;
    wordSpacing: number;
    tracking: number;
    trackingProfile?: TrackingProfile;
}

interface TestModeProps {
    glyphs: GlyphData[];
    metadata: FontMetadata;
        onUpdateMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
    onUpdateGlyph: (char: string, data: Partial<GlyphData>) => void;
    onEditGlyph: (glyph: GlyphData) => void;
    isDarkMode?: boolean;
    onOpenKerningPanel?: (glyphChar: string) => void;
}

const TestMode: React.FC<TestModeProps> = ({ glyphs, metadata, onUpdateMetadata, onUpdateGlyph, onEditGlyph, isDarkMode, onOpenKerningPanel }) => {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog.\nType AV to test kerning.");
  const [fontSize, setFontSize] = useState(64);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [showTrackingRules, setShowTrackingRules] = useState(false);
  const [showTypographySettings, setShowTypographySettings] = useState(false);
  
  // Estados locais para preview (não aplicados na fonte ainda)
  const upm = metadata.unitsPerEm || 1000;
  const [previewLineGap, setPreviewLineGap] = useState(metadata.lineGap ?? 200);
  const [previewWordSpacing, setPreviewWordSpacing] = useState(metadata.wordSpacing ?? 250);
  const [previewTracking, setPreviewTracking] = useState(metadata.tracking);
  
  // Snapshot inicial para reset - salvo apenas uma vez na montagem
  const initialSnapshot = useRef<TestModeSnapshot | null>(null);
  
  const { pushNotice } = useNotice();

  // Salvar snapshot na primeira montagem do componente
  useEffect(() => {
    if (initialSnapshot.current === null) {
      initialSnapshot.current = {
        lineGap: metadata.lineGap ?? 200,
        wordSpacing: metadata.wordSpacing ?? 250,
        tracking: metadata.tracking ?? 0,
        trackingProfile: metadata.trackingProfile,
      };
    }
  }, []); // Executa apenas uma vez na montagem

  // Sincronizar estados locais quando metadata mudar (ex: vindo do CompactEditor)
  useEffect(() => {
    setPreviewLineGap(metadata.lineGap ?? 200);
    setPreviewWordSpacing(metadata.wordSpacing ?? 250);
    setPreviewTracking(metadata.tracking ?? 0);
  }, [metadata.lineGap, metadata.wordSpacing, metadata.tracking]);

  // Função para resetar para o snapshot inicial
  const handleReset = () => {
    if (initialSnapshot.current) {
      setPreviewLineGap(initialSnapshot.current.lineGap);
      setPreviewWordSpacing(initialSnapshot.current.wordSpacing);
      setPreviewTracking(initialSnapshot.current.tracking);
      
      // Também reseta os metadados para os valores iniciais
      onUpdateMetadata(prev => ({
        ...prev,
        lineGap: initialSnapshot.current!.lineGap,
        wordSpacing: initialSnapshot.current!.wordSpacing,
        tracking: initialSnapshot.current!.tracking,
        trackingProfile: initialSnapshot.current!.trackingProfile,
      }));
      
      pushNotice('Configurações restauradas ao estado inicial', 'info');
    }
  };

  // Função para aplicar todas as configurações na fonte
  const handleApplyToFont = () => {
    onUpdateMetadata(prev => ({ 
      ...prev, 
      lineGap: previewLineGap, 
      wordSpacing: previewWordSpacing,
      tracking: previewTracking,
    }));
    pushNotice(`Tipografia aplicada: Entrelinhas ${previewLineGap}, Espaço ${previewWordSpacing}, Tracking ${previewTracking}`, 'success');
  };

    const activeProfile = metadata.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text'];

  // Tracking Logic
  const updateProfile = (updates: Partial<TrackingProfile> | Partial<TrackingProfile['rules']>) => {
      const newProfile = { ...activeProfile, ...updates };
      if ('punctuationFactor' in updates || 'whitespaceFactor' in updates || 'capsLockExtraTracking' in updates) {
          newProfile.rules = { ...activeProfile.rules, ...(updates as any) };
      }
      // Usar padrão funcional para preservar kerning e outras configurações
      onUpdateMetadata(prev => ({ ...prev, trackingProfile: newProfile, tracking: newProfile.defaultTracking }));
  };

  const handleProfileSelect = (id: string) => {
      const preset = DEFAULT_TRACKING_PROFILES[id];
      if (preset) {
          // Usar padrão funcional para preservar kerning e outras configurações
          onUpdateMetadata(prev => ({ ...prev, trackingProfile: preset, tracking: preset.defaultTracking }));
      }
  };

  const getGlyph = (char: string) => {
      let g = glyphs.find(g => g.char === char);
      
      if (metadata.isUnicase && (!g || (!g.pathData && g.char !== ' '))) {
         const code = char.charCodeAt(0);
         let swapChar = null;
         if (code >= 65 && code <= 90) swapChar = String.fromCharCode(code + 32); 
         else if (code >= 97 && code <= 122) swapChar = String.fromCharCode(code - 32); 
         if (swapChar) {
             const swapG = glyphs.find(g => g.char === swapChar);
             if (swapG && (swapG.pathData || swapG.char === ' ')) return swapG;
         }
      }
      return g || null;
  };

  const getKerningValue = (leftChar: string, rightChar: string): number => {
      const gL = getGlyph(leftChar);
      const gR = getGlyph(rightChar);
      return resolveKerningValue(gL, gR, metadata.kerning);
  };

    const handleGlyphContextMenu = (event: React.MouseEvent, glyphChar: string) => {
            event.preventDefault();
            if (!glyphChar) return;
            onOpenKerningPanel?.(glyphChar);
    };

    const textMain = isDarkMode ? 'text-white' : 'text-black';
  const textSub = isDarkMode ? 'text-slate-500' : 'text-neutral-500';
  const bgMain = isDarkMode ? 'bg-slate-950' : 'bg-white';
  const bgSub = isDarkMode ? 'bg-slate-900' : 'bg-neutral-50';
  const borderCol = isDarkMode ? 'border-slate-800' : 'border-neutral-200';
  const sliderClass = isDarkMode ? 'bg-slate-800 accent-white' : 'bg-neutral-200 accent-black';
  const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-neutral-300 text-black';

  return (
    <div className={`flex flex-col h-full w-full ${bgMain} ${textMain}`}>
      {/* Controls Header - Centered & Balanced */}
      <div className={`flex flex-col border-b sticky top-0 z-20 w-full ${bgMain} ${isDarkMode ? 'border-slate-800' : 'border-black'}`}>
          <div className="flex items-center justify-center gap-6 p-4 flex-wrap">
            <div className="flex flex-col gap-2 items-center w-28">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Size: {fontSize}px</label>
            <input type="range" min="12" max="300" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
            </div>
            
            <div className="flex flex-col gap-2 items-center w-28">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Line Height: {lineHeight}</label>
            <input type="range" min="0.8" max="3" step="0.1" value={lineHeight} onChange={(e) => setLineHeight(parseFloat(e.target.value))} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
            </div>

            <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-200'}`}></div>

            <div className="flex flex-col gap-2 items-center w-40">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textMain}`}>Preview Tracking: {previewTracking}</label>
            <input 
                type="range" min="-200" max="500" step="10" 
                value={previewTracking} 
                onChange={(e) => setPreviewTracking(parseInt(e.target.value))} 
                className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} 
            />
            </div>

            <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-200'}`}></div>

            <button 
                onClick={() => setShowTypographySettings(!showTypographySettings)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-colors ${showTypographySettings ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-neutral-300 text-neutral-500 hover:text-black')}`}
            >
                Tipografia
            </button>

            <button 
                onClick={() => setShowTrackingRules(!showTrackingRules)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-colors ${showTrackingRules ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-neutral-300 text-neutral-500 hover:text-black')}`}
            >
                Rules
            </button>
          </div>

          {/* TYPOGRAPHY SETTINGS PANEL */}
          {showTypographySettings && (
              <div className={`p-6 border-t animate-in slide-in-from-top-2 ${bgSub} ${borderCol}`}>
                  <div className="max-w-5xl mx-auto">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {/* Entrelinhas */}
                          <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${textMain}`}>Entrelinhas (Line Gap)</label>
                                  <span className={`text-xs font-mono ${textSub}`}>{previewLineGap} units ({Math.round((previewLineGap / upm) * 100)}%)</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="-500" 
                                  max="1000" 
                                  step="10" 
                                  value={previewLineGap} 
                                  onChange={(e) => setPreviewLineGap(parseInt(e.target.value))} 
                                  className={`w-full h-1.5 rounded-lg cursor-pointer ${sliderClass}`} 
                              />
                              <div className="flex justify-between text-[9px] font-mono">
                                  <span className={textSub}>-500 (OVERLAP)</span>
                                  <span className={textSub}>1000 (LOOSE)</span>
                              </div>
                              <p className={`text-[10px] ${textSub}`}>
                                  Espaço entre linhas. Valores negativos aproximam as linhas.
                              </p>
                          </div>

                          {/* Espaço entre Palavras */}
                          <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${textMain}`}>Espaço entre Palavras</label>
                                  <span className={`text-xs font-mono ${textSub}`}>{previewWordSpacing} units ({Math.round((previewWordSpacing / upm) * 100)}%)</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="100" 
                                  max="600" 
                                  step="10" 
                                  value={previewWordSpacing} 
                                  onChange={(e) => setPreviewWordSpacing(parseInt(e.target.value))} 
                                  className={`w-full h-1.5 rounded-lg cursor-pointer ${sliderClass}`} 
                              />
                              <div className="flex justify-between text-[9px] font-mono">
                                  <span className={textSub}>100 (TIGHT)</span>
                                  <span className={textSub}>600 (WIDE)</span>
                              </div>
                              <p className={`text-[10px] ${textSub}`}>
                                  Largura do espaço. Valores típicos: 20-35% do UPM.
                              </p>
                          </div>

                          {/* Presets e Botão Aplicar */}
                          <div className="space-y-3">
                              <label className={`text-xs font-bold uppercase tracking-wider block ${textMain}`}>Presets Rápidos</label>
                              <div className="grid grid-cols-2 gap-2">
                                  <button 
                                      onClick={() => { setPreviewLineGap(Math.round(upm * 0.1)); setPreviewWordSpacing(Math.round(upm * 0.2)); }}
                                      className={`py-1.5 px-2 rounded border text-[10px] font-bold transition-colors ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-neutral-300 hover:bg-neutral-100'}`}
                                  >
                                      Tight
                                  </button>
                                  <button 
                                      onClick={() => { setPreviewLineGap(Math.round(upm * 0.2)); setPreviewWordSpacing(Math.round(upm * 0.25)); }}
                                      className={`py-1.5 px-2 rounded border text-[10px] font-bold transition-colors ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-neutral-300 hover:bg-neutral-100'}`}
                                  >
                                      Normal
                                  </button>
                                  <button 
                                      onClick={() => { setPreviewLineGap(Math.round(upm * 0.3)); setPreviewWordSpacing(Math.round(upm * 0.3)); }}
                                      className={`py-1.5 px-2 rounded border text-[10px] font-bold transition-colors ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-neutral-300 hover:bg-neutral-100'}`}
                                  >
                                      Relaxed
                                  </button>
                                  <button 
                                      onClick={() => { setPreviewLineGap(Math.round(upm * 0.5)); setPreviewWordSpacing(Math.round(upm * 0.35)); }}
                                      className={`py-1.5 px-2 rounded border text-[10px] font-bold transition-colors ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-neutral-300 hover:bg-neutral-100'}`}
                                  >
                                      Loose
                                  </button>
                              </div>
                              <div className="flex gap-2 mt-2">
                                  <button 
                                      onClick={handleApplyToFont}
                                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                  >
                                      Aplicar na Fonte
                                  </button>
                                  <button 
                                      onClick={handleReset}
                                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'}`}
                                      title="Restaurar configurações ao estado inicial do teste"
                                  >
                                      ↩ Reset
                                  </button>
                              </div>
                              <p className={`text-[9px] text-center ${textSub}`}>
                                  {metadata.lineGap === previewLineGap && metadata.wordSpacing === previewWordSpacing && metadata.tracking === previewTracking
                                      ? '✓ Valores já aplicados na fonte' 
                                      : '⚠ Valores diferentes da fonte atual'}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* ADVANCED TRACKING RULES PANEL */}
          {showTrackingRules && (
              <div className={`p-6 border-t animate-in slide-in-from-top-2 ${bgSub} ${borderCol}`}>
                  <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div>
                          <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${textSub}`}>Tracking Profile</label>
                          <select value={activeProfile.id} onChange={(e) => handleProfileSelect(e.target.value)} className={`w-full h-8 px-2 rounded text-xs font-bold border outline-none ${inputBg}`}>
                                {Object.values(DEFAULT_TRACKING_PROFILES).map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                          </select>
                          <p className={`text-[10px] mt-2 ${textSub}`}>Adjusts spacing by font size.</p>
                      </div>
                      
                      <div className="space-y-4">
                          <div>
                                <div className="flex justify-between mb-1"><label className={`text-[10px] font-bold uppercase ${textSub}`}>Punctuation Factor</label><span className="text-[10px] font-mono">{Math.round(activeProfile.rules.punctuationFactor * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={activeProfile.rules.punctuationFactor} onChange={(e) => updateProfile({ punctuationFactor: parseFloat(e.target.value) })} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
                          </div>
                          <div>
                                <div className="flex justify-between mb-1"><label className={`text-[10px] font-bold uppercase ${textSub}`}>Whitespace Factor</label><span className="text-[10px] font-mono">{Math.round(activeProfile.rules.whitespaceFactor * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={activeProfile.rules.whitespaceFactor} onChange={(e) => updateProfile({ whitespaceFactor: parseFloat(e.target.value) })} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
                          </div>
                      </div>

                      <div className="space-y-4">
                           <div>
                                <div className="flex justify-between mb-1"><label className={`text-[10px] font-bold uppercase ${textSub}`}>ALL CAPS Bonus</label><span className="text-[10px] font-mono">+{activeProfile.rules.capsLockExtraTracking}</span></div>
                                <input type="range" min="0" max="50" step="1" value={activeProfile.rules.capsLockExtraTracking} onChange={(e) => updateProfile({ capsLockExtraTracking: parseInt(e.target.value) })} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
                          </div>
                      </div>

                      {/* Botão Aplicar Tracking */}
                      <div className="space-y-3">
                          <label className={`text-[10px] font-bold uppercase tracking-wider block ${textMain}`}>Aplicar Tracking</label>
                          <button 
                              onClick={() => {
                                  onUpdateMetadata(prev => ({ 
                                      ...prev, 
                                      tracking: previewTracking, 
                                      trackingProfile: { ...activeProfile, defaultTracking: previewTracking } 
                                  }));
                                  pushNotice(`Tracking aplicado: ${previewTracking}`, 'success');
                              }}
                              className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-colors ${isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                          >
                              Aplicar na Fonte
                          </button>
                          <p className={`text-[9px] text-center ${textSub}`}>
                              {metadata.tracking === previewTracking 
                                  ? '✓ Valor já aplicado' 
                                  : `⚠ Preview: ${previewTracking} | Fonte: ${metadata.tracking}`}
                          </p>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Input Area */}
      <div className={`p-6 flex justify-center w-full border-b ${bgSub} ${borderCol}`}>
        <textarea 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Type here to test..." 
            className={`w-full max-w-4xl border rounded-lg p-4 font-medium outline-none resize-none h-24 text-center text-lg ${isDarkMode ? 'bg-slate-950 border-slate-700 focus:border-white text-white' : 'bg-white border-neutral-300 focus:border-black text-black'}`} 
        />
      </div>

      {/* Output Render */}
      <div className={`flex-1 overflow-auto p-8 relative overflow-x-hidden ${bgMain} flex flex-col`}>
        <div className="w-full flex flex-col items-center justify-center min-h-full">
            <div 
                className="w-full text-center flex flex-col"
            >
            {text.split('\n').map((line, lineIdx) => {
                const isLineAllCaps = isAllCapsWord(line);
                // Calcular margem entre linhas (pode ser negativa para sobrepor)
                const lineSpacing = (previewLineGap / upm) * fontSize + (lineHeight - 1) * fontSize;
                const scaleFactor = fontSize / upm;
                
                return (
                <div 
                    key={lineIdx} 
                    className="flex flex-wrap items-end justify-center w-full"
                    style={{ 
                        marginTop: lineIdx > 0 ? `${lineSpacing}px` : 0,
                        // EXATAMENTE como o CompactEditor
                        fontSize,
                        letterSpacing: `${previewTracking * scaleFactor}px`,
                        wordSpacing: `${previewWordSpacing * scaleFactor}px`,
                    }}
                >
                    {line.split('').map((char, charIdx) => {
                    const g = getGlyph(char);
                    
                    // Tratamento especial para espaço - IGUAL ao CompactEditor
                    if (char === ' ') {
                        return <span key={charIdx} style={{ width: fontSize * 0.3 + previewWordSpacing }}>&nbsp;</span>;
                    }
                    
                    if (!g || !g.pathData) {
                        return (
                            <span
                                key={charIdx}
                                style={{ fontSize: fontSize, width: fontSize * 0.6, height: fontSize }}
                                className="opacity-20 inline-flex items-center justify-center bg-red-100 text-red-500 border border-red-300 mx-[1px] rounded-sm align-baseline"
                                onContextMenu={(event) => handleGlyphContextMenu(event, char)}
                            >
                                {char}
                            </span>
                        );
                    }

                    const prevChar = charIdx > 0 ? line[charIdx - 1] : null;
                    
                    // EXATAMENTE como o CompactEditor
                    const scale = fontSize / upm;
                    const baseWidth = g.advanceWidth * scale;
                    
                    // Kerning entre caractere anterior e atual
                    let kernAdjust = 0;
                    if (charIdx > 0 && prevChar && prevChar !== ' ') {
                        kernAdjust = getKerningValue(prevChar, char) * scale;
                    }
                    
                    // Width IGUAL ao CompactEditor: baseWidth + letterSpacing
                    const width = baseWidth + (previewTracking * scale);
                    
                    // ViewBox para acentos (igual ao CompactEditor)
                    const accentSpace = upm * 0.25;
                    const viewBoxHeight = upm + accentSpace;
                    const viewBoxY = -accentSpace;
                    const spanHeight = fontSize * (viewBoxHeight / upm);

                    return (
                        <span 
                            key={charIdx} 
                            style={{ 
                                width: Math.max(0, width), 
                                height: spanHeight,
                                marginLeft: kernAdjust,
                                marginBottom: -(spanHeight - fontSize) * 0.2,
                            }}
                            className="inline-block relative group cursor-pointer hover:z-10"
                            onClick={() => onEditGlyph(g)}
                            onContextMenu={(event) => handleGlyphContextMenu(event, g.char)}
                        >
                            {g.pathData && (
                                <svg 
                                    viewBox={`0 ${viewBoxY} ${upm} ${viewBoxHeight}`}
                                    className={`absolute inset-0 fill-current overflow-visible ${textMain}`}
                                    style={{ width: fontSize, height: spanHeight }}
                                    preserveAspectRatio="xMidYMax meet"
                                >
                                    <g transform={`translate(${g.leftSideBearing}, ${g.baselineOffset}) scale(${g.scale})`}>
                                        <path d={g.pathData} />
                                    </g>
                                </svg>
                            )}
                        </span>
                    );
                    })}
                </div>
            )})}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TestMode;
import React, { useState } from 'react';
import { GlyphData, FontMetadata, DEFAULT_TRACKING_PROFILES, TrackingProfile } from '../types';
import { getTrackingBetweenGlyphs, isAllCapsWord } from '../services/trackingService';
import { resolveKerningValue } from '../services/kerningService';
import { useNotice } from '../contexts/NoticeContext';

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
  const [showTrackingRules, setShowTrackingRules] = useState(false);
  const [showTypographySettings, setShowTypographySettings] = useState(false);
  const outputRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  React.useEffect(() => {
    const el = outputRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  
  const upm = metadata.unitsPerEm || 1000;
  const tracking = metadata.tracking ?? 0;
  const lineGap = metadata.lineGap ?? 200;
  const wordSpacingUnits = metadata.wordSpacing ?? 250;
  
  const { pushNotice } = useNotice();

  const activeProfile = metadata.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text'];

  // Fix #5: Separate updateProfileField and updateProfileRule
  const updateProfileRule = (ruleUpdates: Partial<TrackingProfile['rules']>) => {
      const newProfile: TrackingProfile = {
          ...activeProfile,
          rules: { ...activeProfile.rules, ...ruleUpdates },
      };
      onUpdateMetadata(prev => ({ ...prev, trackingProfile: newProfile, tracking: newProfile.defaultTracking }));
  };

  const handleProfileSelect = (id: string) => {
      const preset = DEFAULT_TRACKING_PROFILES[id];
      if (preset) {
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

  // Fix #7: viewBox includes descender
  const ascender = metadata.ascender || 800;
  const descender = Math.abs(metadata.descender || -200);
  const accentSpace = upm * 0.25;
  const viewBoxY = -accentSpace;
  const viewBoxHeight = ascender + descender + accentSpace;

  // Responsive: compute effective font size so the longest line fits the container width.
  const computeLineWidth = React.useCallback((line: string, fs: number): number => {
    const scale = fs / upm;
    const isLineAllCaps = isAllCapsWord(line);
    let total = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') {
        total += wordSpacingUnits * scale;
        continue;
      }
      const g = getGlyph(ch);
      const baseW = g?.advanceWidth ? g.advanceWidth * scale : fs * 0.5;
      let spacing = 0;
      if (i > 0) {
        const prev = line[i - 1];
        const prevG = getGlyph(prev);
        if (prevG && g && prev !== ' ') {
          spacing = (getKerningValue(prev, ch) + getTrackingBetweenGlyphs(prevG, g, activeProfile, fs, isLineAllCaps)) * scale;
        } else if (prevG && g && prev === ' ') {
          spacing = getTrackingBetweenGlyphs(prevG, g, activeProfile, fs, isLineAllCaps) * scale;
        }
      }
      total += baseW + spacing;
    }
    return total;
  }, [glyphs, metadata.kerning, activeProfile, upm, wordSpacingUnits]);

  const effectiveFontSize = React.useMemo(() => {
    if (!containerWidth) return fontSize;
    const padding = 64; // matches p-8
    const available = Math.max(120, containerWidth - padding);
    const lines = text.split('\n');
    let maxLineW = 0;
    for (const line of lines) {
      maxLineW = Math.max(maxLineW, computeLineWidth(line, fontSize));
    }
    if (maxLineW <= available) return fontSize;
    const scaled = Math.floor(fontSize * (available / maxLineW));
    return Math.max(12, scaled);
  }, [containerWidth, fontSize, text, computeLineWidth]);

  return (
    <div className={`flex flex-col h-full w-full ${bgMain} ${textMain}`}>
      {/* Controls Header */}
      <div className={`flex flex-col border-b sticky top-0 z-20 w-full ${bgMain} ${isDarkMode ? 'border-slate-800' : 'border-black'}`}>
          <div className="flex items-center justify-center gap-6 p-4 flex-wrap">
            <div className="flex flex-col gap-2 items-center w-28">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Size: {fontSize}px</label>
            <input type="range" min="12" max="300" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
            </div>

            <div className={`h-8 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-200'}`}></div>

            {/* Fix #1: Tracking slider updates metadata directly */}
            <div className="flex flex-col gap-2 items-center w-40">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${textMain}`}>Tracking: {tracking}</label>
            <input 
                type="range" min="-200" max="500" step="10" 
                value={tracking} 
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onUpdateMetadata(prev => ({
                        ...prev,
                        tracking: val,
                        trackingProfile: {
                            ...(prev.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text']),
                            defaultTracking: val
                        }
                    }));
                }}
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

          {/* TYPOGRAPHY SETTINGS PANEL - Fix #1: sliders update metadata directly, no "Aplicar" button */}
          {showTypographySettings && (
              <div className={`p-6 border-t animate-in slide-in-from-top-2 ${bgSub} ${borderCol}`}>
                  <div className="max-w-5xl mx-auto">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {/* Entrelinhas - Fix #8: only lineGap, no separate lineHeight */}
                          <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${textMain}`}>Entrelinhas (Line Gap)</label>
                                  <span className={`text-xs font-mono ${textSub}`}>{lineGap} units ({Math.round((lineGap / upm) * 100)}%)</span>
                              </div>
                              <input 
                                  type="range" min="0" max="1000" step="10" 
                                  value={lineGap} 
                                  onChange={(e) => onUpdateMetadata(prev => ({ ...prev, lineGap: parseInt(e.target.value) }))} 
                                  className={`w-full h-1.5 rounded-lg cursor-pointer ${sliderClass}`} 
                              />
                              <div className="flex justify-between text-[9px] font-mono">
                                  <span className={textSub}>0 (COLADO)</span>
                                  <span className={textSub}>1000 (LOOSE)</span>
                              </div>
                              <p className={`text-[10px] ${textSub}`}>
                                  Line spacing in design units.
                              </p>
                          </div>

                          {/* Word Spacing - updates metadata directly */}
                          <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                  <label className={`text-xs font-bold uppercase tracking-wider ${textMain}`}>Word Spacing</label>
                                  <span className={`text-xs font-mono ${textSub}`}>{wordSpacingUnits} units ({Math.round((wordSpacingUnits / upm) * 100)}%)</span>
                              </div>
                              <input 
                                  type="range" min="100" max="600" step="10" 
                                  value={wordSpacingUnits} 
                                  onChange={(e) => onUpdateMetadata(prev => ({ ...prev, wordSpacing: parseInt(e.target.value) }))} 
                                  className={`w-full h-1.5 rounded-lg cursor-pointer ${sliderClass}`} 
                              />
                              <div className="flex justify-between text-[9px] font-mono">
                                  <span className={textSub}>100 (TIGHT)</span>
                                  <span className={textSub}>600 (WIDE)</span>
                              </div>
                              <p className={`text-[10px] ${textSub}`}>
                                  Space width. Typical values: 20-35% of UPM.
                              </p>
                          </div>

                          {/* Quick Presets - no "Apply to Font" button */}
                          <div className="space-y-3">
                              <label className={`text-xs font-bold uppercase tracking-wider block ${textMain}`}>Quick Presets</label>
                              <div className="grid grid-cols-2 gap-2">
                                  {[
                                      { label: 'Tight', lg: 0.1, ws: 0.2 },
                                      { label: 'Normal', lg: 0.2, ws: 0.25 },
                                      { label: 'Relaxed', lg: 0.3, ws: 0.3 },
                                      { label: 'Loose', lg: 0.5, ws: 0.35 },
                                  ].map(p => (
                                      <button
                                          key={p.label}
                                          onClick={() => onUpdateMetadata(prev => ({ ...prev, lineGap: Math.round(upm * p.lg), wordSpacing: Math.round(upm * p.ws) }))}
                                          className={`py-1.5 px-2 rounded border text-[10px] font-bold transition-colors ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-neutral-300 hover:bg-neutral-100'}`}
                                      >
                                          {p.label}
                                      </button>
                                  ))}
                              </div>
                              <p className={`text-[9px] text-center ${textSub}`}>
                                  ✓ Changes applied in real time
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
                      
                      {/* Fix #5: use updateProfileRule for rules fields */}
                      <div className="space-y-4">
                          <div>
                                <div className="flex justify-between mb-1"><label className={`text-[10px] font-bold uppercase ${textSub}`}>Punctuation Factor</label><span className="text-[10px] font-mono">{Math.round(activeProfile.rules.punctuationFactor * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={activeProfile.rules.punctuationFactor} onChange={(e) => updateProfileRule({ punctuationFactor: parseFloat(e.target.value) })} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
                          </div>
                          <div>
                                <div className="flex justify-between mb-1"><label className={`text-[10px] font-bold uppercase ${textSub}`}>Whitespace Factor</label><span className="text-[10px] font-mono">{Math.round(activeProfile.rules.whitespaceFactor * 100)}%</span></div>
                                <input type="range" min="0" max="1" step="0.1" value={activeProfile.rules.whitespaceFactor} onChange={(e) => updateProfileRule({ whitespaceFactor: parseFloat(e.target.value) })} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
                          </div>
                      </div>

                      <div className="space-y-4">
                           <div>
                                <div className="flex justify-between mb-1"><label className={`text-[10px] font-bold uppercase ${textSub}`}>ALL CAPS Bonus</label><span className="text-[10px] font-mono">+{activeProfile.rules.capsLockExtraTracking}</span></div>
                                <input type="range" min="0" max="50" step="1" value={activeProfile.rules.capsLockExtraTracking} onChange={(e) => updateProfileRule({ capsLockExtraTracking: parseInt(e.target.value) })} className={`w-full h-1 rounded-lg cursor-pointer ${sliderClass}`} />
                          </div>
                      </div>

                      {/* Info column */}
                      <div className="space-y-3">
                          <label className={`text-[10px] font-bold uppercase tracking-wider block ${textMain}`}>Tracking Atual</label>
                          <p className={`text-sm font-mono ${textMain}`}>{tracking} units</p>
                          <p className={`text-[9px] ${textSub}`}>
                              Profile: {activeProfile.label}
                          </p>
                          <p className={`text-[9px] ${textSub}`}>
                              ✓ Changes applied in real time
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
      <div ref={outputRef} className={`flex-1 overflow-auto p-8 relative overflow-x-hidden ${bgMain} flex flex-col`}>
        <div className="w-full flex flex-col items-center justify-center min-h-full">
            <div className="w-full text-center flex flex-col">
            {text.split('\n').map((line, lineIdx) => {
                const isLineAllCaps = isAllCapsWord(line);
                // Fix #8: lineSpacing uses only lineGap, no separate lineHeight multiplier
                const fs = effectiveFontSize;
                const lineSpacing = (lineGap / upm) * fs;
                const scale = fs / upm;
                const lineBodyHeight = fs * (ascender + descender) / upm;
                
                return (
                <div 
                    key={lineIdx} 
                    className="flex items-end justify-center w-full whitespace-nowrap"
                    style={{ 
                        height: lineBodyHeight,
                        overflow: 'visible',
                        marginTop: lineIdx > 0 ? `${lineSpacing}px` : 0,
                        fontSize: fs,
                    }}
                >
                    {line.split('').map((char, charIdx) => {
                    const g = getGlyph(char);
                    
                    // Fix #2: space width converts wordSpacing from design units to pixels
                    if (char === ' ') {
                        const spaceWidth = wordSpacingUnits * scale;
                        return <span key={charIdx} style={{ width: spaceWidth }}>&nbsp;</span>;
                    }
                    
                    if (!g || !g.pathData) {
                        const placeholderW = fs * 0.5;
                        return (
                            <span
                                key={charIdx}
                                style={{ width: placeholderW, height: fs, fontSize: fs * 0.35 }}
                                className={`inline-flex items-center justify-center mx-[1px] align-baseline border-2 border-dashed rounded-sm ${isDarkMode ? 'border-slate-600 text-slate-500' : 'border-neutral-300 text-neutral-400'}`}
                                title={`Missing glyph: "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`}
                                onContextMenu={(event) => handleGlyphContextMenu(event, char)}
                                onClick={() => { const found = glyphs.find(gl => gl.char === char); if (found) onEditGlyph(found); }}
                            >
                                ?
                            </span>
                        );
                    }

                    const prevChar = charIdx > 0 ? line[charIdx - 1] : null;
                    
                    const baseWidth = g.advanceWidth * scale;
                    
                    // Fix #4 & #6: Use trackingService for contextual tracking between glyphs
                    let spacingAdjust = 0;
                    if (charIdx > 0 && prevChar) {
                        const prevG = getGlyph(prevChar);
                        if (prevG && prevChar !== ' ') {
                            // Kerning pair
                            const kernVal = getKerningValue(prevChar, char) * scale;
                            // Contextual tracking from trackingProfile
                            const trackVal = getTrackingBetweenGlyphs(prevG, g, activeProfile, fs, isLineAllCaps) * scale;
                            spacingAdjust = kernVal + trackVal;
                        } else if (prevG && prevChar === ' ') {
                            // Fix #6: apply tracking contextual after whitespace too
                            const trackVal = getTrackingBetweenGlyphs(prevG, g, activeProfile, fs, isLineAllCaps) * scale;
                            spacingAdjust = trackVal;
                        }
                    }
                    
                    // Fix #3: width = baseWidth only (tracking is in marginLeft via spacingAdjust)
                    const width = baseWidth;
                    const spanHeight = fs * (viewBoxHeight / upm);

                    return (
                        <span 
                            key={charIdx} 
                            style={{ 
                                width: Math.max(0, width), 
                                height: spanHeight,
                                marginLeft: spacingAdjust,
                            }}
                            className="inline-block relative group cursor-pointer hover:z-10"
                            onClick={() => onEditGlyph(g)}
                            onContextMenu={(event) => handleGlyphContextMenu(event, g.char)}
                        >
                            {g.pathData && (
                                <svg 
                                    viewBox={`0 ${viewBoxY} ${upm} ${viewBoxHeight}`}
                                    className={`absolute inset-0 fill-current overflow-visible ${textMain}`}
                                    style={{ width: fs, height: spanHeight }}
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

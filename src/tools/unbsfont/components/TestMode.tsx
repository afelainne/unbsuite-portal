import React, { useState } from 'react';
import { GlyphData, FontMetadata, DEFAULT_TRACKING_PROFILES, TrackingProfile } from '../types';
import { getTrackingBetweenGlyphs, isAllCapsWord } from '../services/trackingService';
import { resolveKerningValue } from '../services/kerningService';
import { useNotice } from '../contexts/NoticeContext';
import { Card, Field, Switch } from './ui';
import { cx } from './cx';

interface TestModeProps {
    glyphs: GlyphData[];
    metadata: FontMetadata;
    onUpdateMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
    onUpdateGlyph: (char: string, data: Partial<GlyphData>) => void;
    onEditGlyph: (glyph: GlyphData) => void;
    /** Mantido para os chamadores; as cores vêm dos tokens, que viram com a classe `dark`. */
    isDarkMode?: boolean;
    onOpenKerningPanel?: (glyphChar: string) => void;
}

const PRESETS = [
    { label: 'Justo', lg: 0.1, ws: 0.2 },
    { label: 'Normal', lg: 0.2, ws: 0.25 },
    { label: 'Relaxado', lg: 0.3, ws: 0.3 },
    { label: 'Solto', lg: 0.5, ws: 0.35 },
];

const TestMode: React.FC<TestModeProps> = ({ glyphs, metadata, onUpdateMetadata, onEditGlyph, onOpenKerningPanel }) => {
  const [text, setText] = useState("The quick brown fox jumps over the lazy dog.\nDigite AV para testar o kerning.");
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
      const g = glyphs.find(g => g.char === char);

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

  const activePreset = PRESETS.find(p => lineGap === Math.round(upm * p.lg) && wordSpacingUnits === Math.round(upm * p.ws))?.label;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-6">
      <div className="flex flex-col gap-5 min-w-0">
        {/* Controles */}
        <Card label="Texto de teste">
          <Field label="Texto">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite aqui para testar..."
              rows={3}
              className="field w-full h-auto py-2.5 resize-none text-[14px]"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Tamanho" value={`${fontSize} px`}>
              <input
                type="range" min="12" max="300"
                value={fontSize}
                aria-label="Tamanho"
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="tool-slider w-full"
              />
            </Field>

            {/* Fix #1: Tracking slider updates metadata directly */}
            <Field label="Tracking" value={tracking}>
              <input
                type="range" min="-200" max="500" step="10"
                value={tracking}
                aria-label="Tracking"
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
                className="tool-slider w-full"
              />
            </Field>
          </div>

          <div className="flex flex-col sm:flex-row gap-x-8 gap-y-3 hairline-t pt-4">
            <Switch
              checked={showTypographySettings}
              onChange={setShowTypographySettings}
              label="Tipografia"
              description="Entrelinha e espaço entre palavras"
            />
            <Switch
              checked={showTrackingRules}
              onChange={setShowTrackingRules}
              label="Regras de tracking"
              description="Perfil, pontuação e caixa alta"
            />
          </div>

          {/* Fix #1: sliders update metadata directly, no "Aplicar" button */}
          {showTypographySettings && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 hairline-t pt-5">
              {/* Fix #8: only lineGap, no separate lineHeight */}
              <Field
                label="Entrelinha"
                value={`${lineGap} un. (${Math.round((lineGap / upm) * 100)}%)`}
                hint="Espaço entre linhas, em unidades de desenho. De 0 (colado) a 1000 (solto)."
              >
                <input
                  type="range" min="0" max="1000" step="10"
                  value={lineGap}
                  aria-label="Entrelinha"
                  onChange={(e) => onUpdateMetadata(prev => ({ ...prev, lineGap: parseInt(e.target.value) }))}
                  className="tool-slider w-full"
                />
              </Field>

              <Field
                label="Espaço entre palavras"
                value={`${wordSpacingUnits} un. (${Math.round((wordSpacingUnits / upm) * 100)}%)`}
                hint="Largura do espaço. O usual fica entre 20% e 35% da UPM."
              >
                <input
                  type="range" min="100" max="600" step="10"
                  value={wordSpacingUnits}
                  aria-label="Espaço entre palavras"
                  onChange={(e) => onUpdateMetadata(prev => ({ ...prev, wordSpacing: parseInt(e.target.value) }))}
                  className="tool-slider w-full"
                />
              </Field>

              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="text-[12px] text-muted-foreground">Predefinições</span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={activePreset === p.label}
                      onClick={() => onUpdateMetadata(prev => ({ ...prev, lineGap: Math.round(upm * p.lg), wordSpacing: Math.round(upm * p.ws) }))}
                      className={cx('ctl ctl-sm', activePreset === p.label ? 'ctl-active' : 'ctl-outline')}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <span className="text-[12px] text-muted-foreground">As mudanças valem na hora.</span>
              </div>
            </div>
          )}

          {showTrackingRules && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 hairline-t pt-5">
              <Field label="Perfil de tracking" hint="Ajusta o espaçamento conforme o tamanho do texto.">
                <select value={activeProfile.id} onChange={(e) => handleProfileSelect(e.target.value)} className="field w-full">
                  {Object.values(DEFAULT_TRACKING_PROFILES).map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </Field>

              {/* Fix #5: use updateProfileRule for rules fields */}
              <div className="flex flex-col gap-5 min-w-0">
                <Field label="Fator de pontuação" value={`${Math.round(activeProfile.rules.punctuationFactor * 100)}%`}>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={activeProfile.rules.punctuationFactor}
                    aria-label="Fator de pontuação"
                    onChange={(e) => updateProfileRule({ punctuationFactor: parseFloat(e.target.value) })}
                    className="tool-slider w-full"
                  />
                </Field>
                <Field label="Fator de espaço em branco" value={`${Math.round(activeProfile.rules.whitespaceFactor * 100)}%`}>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={activeProfile.rules.whitespaceFactor}
                    aria-label="Fator de espaço em branco"
                    onChange={(e) => updateProfileRule({ whitespaceFactor: parseFloat(e.target.value) })}
                    className="tool-slider w-full"
                  />
                </Field>
              </div>

              <Field label="Acréscimo em caixa alta" value={`+${activeProfile.rules.capsLockExtraTracking}`}>
                <input
                  type="range" min="0" max="50" step="1"
                  value={activeProfile.rules.capsLockExtraTracking}
                  aria-label="Acréscimo em caixa alta"
                  onChange={(e) => updateProfileRule({ capsLockExtraTracking: parseInt(e.target.value) })}
                  className="tool-slider w-full"
                />
              </Field>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[12px] text-muted-foreground">Tracking atual</span>
                <span className="text-[20px] leading-[1.2] font-normal tabular text-foreground">{tracking} un.</span>
                <span className="text-[12px] text-muted-foreground truncate">Perfil: {activeProfile.label}</span>
                <span className="text-[12px] text-muted-foreground">As mudanças valem na hora.</span>
              </div>
            </div>
          )}
        </Card>

        {/* Amostra */}
        <Card
          label="Amostra"
          actions={<span className="text-[12px] text-muted-foreground tabular">{effectiveFontSize} px</span>}
        >
          <div
            ref={outputRef}
            className="bg-canvas rounded-xl p-8 relative overflow-x-hidden overflow-y-auto min-h-[320px] flex flex-col text-foreground"
          >
            <div className="w-full flex flex-col items-center justify-center flex-1">
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
                              className="inline-flex items-center justify-center mx-[1px] align-baseline rounded-sm bg-fill-2 text-muted-foreground cursor-pointer"
                              title={`Glifo ausente: "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`}
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
                                className="absolute inset-0 fill-current overflow-visible text-foreground"
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
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Clique num glifo para editá-lo. Com o botão direito, abre o kerning dele.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default TestMode;

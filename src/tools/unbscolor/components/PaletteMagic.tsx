import React, { useState, useMemo, useCallback } from 'react';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, isValidHex, getClosestColorName, getContrastColor } from '../utils/colorMath';
import { useLanguage } from '../i18n';

interface PaletteMagicProps {
  initialHex: string;
  batchColors: string[];
  onHexChange: (hex: string) => void;
  onBatchColorsChange: (colors: string[]) => void;
}

type DesignContext = 'all' | 'brand' | 'poster' | 'ui' | 'editorial' | 'packaging';

interface MagicPalette {
  name: string;
  colors: string[];
  type: 'harmony' | 'trend' | 'user';
  score: number;
  contrastScore: number;
  harmonyScore: number;
  diversityScore: number;
  contexts: DesignContext[];
}

// WCAG luminance
const getLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
};

const getContrastRatio = (hex1: string, hex2: string): number => {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const adjustLightness = (hex: string, delta: number): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const newL = Math.max(0, Math.min(100, hsl.l + delta));
  const newRgb = hslToRgb({ ...hsl, l: newL });
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const rotateHue = (hex: string, degrees: number): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const newH = (hsl.h + degrees + 360) % 360;
  const newRgb = hslToRgb({ ...hsl, h: newH });
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

// Trend palettes
const TREND_PALETTES: { name: string; colors: string[]; contexts: DesignContext[] }[] = [
  { name: 'Minimal Mono', colors: ['#1A1A1A', '#4A4A4A', '#8A8A8A', '#D0D0D0', '#F5F5F5'], contexts: ['all', 'brand', 'ui', 'editorial'] },
  { name: 'Earthy Tones', colors: ['#5C4033', '#8B6914', '#C4A265', '#E8D5B7', '#F5EFE6'], contexts: ['all', 'brand', 'packaging', 'editorial'] },
  { name: 'Neon & Dark', colors: ['#0D0D0D', '#1A1A2E', '#E94560', '#00FF87', '#F0FF00'], contexts: ['all', 'poster', 'ui'] },
  { name: 'Pastel Dream', colors: ['#FFB5E8', '#B5E8FF', '#E8FFB5', '#FFE8B5', '#E8B5FF'], contexts: ['all', 'packaging', 'editorial'] },
  { name: 'Corporate Trust', colors: ['#003366', '#336699', '#6699CC', '#99CCFF', '#E6F0FF'], contexts: ['all', 'brand', 'ui'] },
  { name: 'Sunset Gradient', colors: ['#1B0A2E', '#5C2D91', '#E94560', '#FF8C42', '#FFD166'], contexts: ['all', 'poster', 'brand'] },
  { name: 'Forest Deep', colors: ['#1B2D1B', '#2D4A2D', '#4A7A4A', '#7AB87A', '#B5E8B5'], contexts: ['all', 'brand', 'packaging'] },
  { name: 'Ocean Depth', colors: ['#0A1628', '#1A3A5C', '#2D6E8E', '#4ABDC4', '#A8E6CF'], contexts: ['all', 'brand', 'ui', 'editorial'] },
  { name: 'Warm Terracotta', colors: ['#2D1810', '#8C4A2F', '#C47A5A', '#E8A889', '#F5DED2'], contexts: ['all', 'packaging', 'editorial'] },
  { name: 'Electric Pop', colors: ['#FF006E', '#8338EC', '#3A86FF', '#FFBE0B', '#FB5607'], contexts: ['all', 'poster'] },
  { name: 'Swiss Brutalist', colors: ['#FF0000', '#000000', '#FFFFFF', '#CCCCCC', '#FF0000'], contexts: ['all', 'poster', 'editorial'] },
  { name: 'Luxury Noir', colors: ['#0D0D0D', '#1A1A1A', '#B8860B', '#D4AF37', '#F5F0E1'], contexts: ['all', 'brand', 'packaging'] },
];

const generateHarmonyPalettes = (baseHex: string): MagicPalette[] => {
  if (!isValidHex(baseHex)) return [];
  const palettes: MagicPalette[] = [];

  const harmonies: { name: string; shifts: number[]; contexts: DesignContext[] }[] = [
    { name: 'Complementary', shifts: [0, 180], contexts: ['all', 'brand', 'poster'] },
    { name: 'Triadic', shifts: [0, 120, 240], contexts: ['all', 'poster', 'packaging'] },
    { name: 'Analogous', shifts: [0, -30, 30], contexts: ['all', 'brand', 'ui', 'editorial'] },
    { name: 'Split Complementary', shifts: [0, 150, 210], contexts: ['all', 'poster', 'brand'] },
    { name: 'Tetradic', shifts: [0, 90, 180, 270], contexts: ['all', 'ui', 'editorial'] },
  ];

  for (const harmony of harmonies) {
    const baseColors = harmony.shifts.map(s => rotateHue(baseHex, s));
    
    // Generate extended palette with light/dark variants
    const extended: string[] = [];
    for (const c of baseColors) {
      extended.push(adjustLightness(c, -25));
      extended.push(c);
      extended.push(adjustLightness(c, 25));
    }

    // Pick best subset with good contrast
    const selected = pickBestContrast(extended, 5);
    if (selected.length >= 3) {
      const scores = calculateScores(selected);
      palettes.push({
        name: harmony.name,
        colors: selected,
        type: 'harmony',
        ...scores,
        contexts: harmony.contexts,
      });
    }
  }

  return palettes.filter(p => p.score >= 0.3).sort((a, b) => b.score - a.score);
};

const pickBestContrast = (candidates: string[], count: number): string[] => {
  if (candidates.length <= count) return candidates;
  
  // Start with the first color, greedily pick colors with best combined contrast
  const selected = [candidates[0]];
  const remaining = candidates.slice(1);

  while (selected.length < count && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const avgContrast = selected.reduce((sum, s) => sum + getContrastRatio(s, remaining[i]), 0) / selected.length;
      if (avgContrast > bestScore) {
        bestScore = avgContrast;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
};

const calculateScores = (colors: string[]): { contrastScore: number; harmonyScore: number; diversityScore: number; score: number } => {
  // Contrast score: average pairwise contrast
  let totalContrast = 0;
  let pairs = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      totalContrast += Math.min(getContrastRatio(colors[i], colors[j]) / 7, 1);
      pairs++;
    }
  }
  const contrastScore = pairs > 0 ? totalContrast / pairs : 0;

  // Harmony score: hue distribution
  const hues = colors.map(c => rgbToHsl(hexToRgb(c)).h);
  const hueSpread = Math.max(...hues) - Math.min(...hues);
  const harmonyScore = Math.min(hueSpread / 180, 1);

  // Diversity: lightness spread
  const lightnesses = colors.map(c => rgbToHsl(hexToRgb(c)).l);
  const lSpread = Math.max(...lightnesses) - Math.min(...lightnesses);
  const diversityScore = Math.min(lSpread / 70, 1);

  const score = contrastScore * 0.4 + harmonyScore * 0.3 + diversityScore * 0.3;
  return { contrastScore, harmonyScore, diversityScore, score };
};

const scoreTrendPalette = (colors: string[], contexts: DesignContext[]): MagicPalette & { name: string } => {
  const scores = calculateScores(colors);
  return { name: '', colors, type: 'trend', ...scores, contexts };
};

export const PaletteMagic: React.FC<PaletteMagicProps> = ({ initialHex, batchColors, onHexChange, onBatchColorsChange }) => {
  const { t } = useLanguage();
  const [context, setContext] = useState<DesignContext>('all');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const baseHex = isValidHex(initialHex) ? initialHex : '#F0FF00';
  const validBatch = batchColors.filter(c => isValidHex(c));

  // Generate all palettes
  const allPalettes = useMemo(() => {
    const results: MagicPalette[] = [];

    // 1. Harmony palettes from base color
    results.push(...generateHarmonyPalettes(baseHex));

    // 2. Harmony palettes from each batch color
    for (const bc of validBatch.slice(0, 5)) {
      if (bc.toUpperCase() !== baseHex.toUpperCase()) {
        const harmPalettes = generateHarmonyPalettes(bc).slice(0, 2);
        results.push(...harmPalettes);
      }
    }

    // 3. Trend palettes scored
    for (const tp of TREND_PALETTES) {
      const scored = scoreTrendPalette(tp.colors, tp.contexts);
      results.push({ ...scored, name: tp.name, type: 'trend' });
    }

    // 4. User palette expansions
    if (validBatch.length >= 2) {
      const userExpanded = [...validBatch];
      // Add complementary colors for each batch color
      for (const bc of validBatch.slice(0, 3)) {
        const comp = rotateHue(bc, 180);
        if (!userExpanded.includes(comp)) userExpanded.push(comp);
      }
      const best = pickBestContrast(userExpanded, 6);
      const scores = calculateScores(best);
      if (scores.score >= 0.3) {
        results.push({ name: t.userPalettes, colors: best, type: 'user', ...scores, contexts: ['all', 'brand', 'ui'] });
      }
    }

    return results;
  }, [baseHex, validBatch, t]);

  // Filter by context
  const filteredPalettes = useMemo(() => {
    if (context === 'all') return allPalettes;
    return allPalettes.filter(p => p.contexts.includes(context));
  }, [allPalettes, context]);

  const copyPalette = useCallback((colors: string[]) => {
    navigator.clipboard.writeText(colors.join(', '));
    setFeedback(t.copyPalette);
    setTimeout(() => setFeedback(null), 1500);
  }, [t]);

  const applyPalette = useCallback((colors: string[]) => {
    onBatchColorsChange(colors);
    if (colors[0]) onHexChange(colors[0]);
    setFeedback(t.applyPalette);
    setTimeout(() => setFeedback(null), 1500);
  }, [onBatchColorsChange, onHexChange, t]);

  const contexts: { key: DesignContext; label: string }[] = [
    { key: 'all', label: t.allContexts },
    { key: 'brand', label: t.contextBrand },
    { key: 'poster', label: t.contextPoster },
    { key: 'ui', label: t.contextUI },
    { key: 'editorial', label: t.contextEditorial },
    { key: 'packaging', label: t.contextPackaging },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 py-8">
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-2 font-mono text-[10px] uppercase tracking-widest rounded-full shadow-2xl z-50 animate-in fade-in zoom-in duration-300">
          {feedback}
        </div>
      )}

      {/* Base Colors */}
      <section>
        <h2 className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">{t.baseColors}</h2>
        <div className="flex flex-wrap gap-3 mb-8">
          {validBatch.length > 0 ? validBatch.map((c, i) => (
            <button
              key={i}
              onClick={() => onHexChange(c)}
              className={`group relative transition-all hover:scale-110 ${c.toUpperCase() === baseHex.toUpperCase() ? 'scale-110 ring-2 ring-black ring-offset-2' : ''}`}
            >
              <div className="w-14 h-14 rounded-xl shadow-md border border-gray-200" style={{ backgroundColor: c }} />
              <span className="font-mono text-[7px] text-gray-400 block text-center mt-1">{c}</span>
            </button>
          )) : (
            <p className="text-sm text-gray-400 font-mono">{t.noBaseColors}</p>
          )}
        </div>
      </section>

      {/* Context Filter */}
      <section>
        <div className="flex flex-wrap gap-2">
          {contexts.map(ctx => (
            <button
              key={ctx.key}
              onClick={() => setContext(ctx.key)}
              className="px-4 py-2 font-mono text-[10px] uppercase tracking-widest rounded-full transition-all font-bold border"
              style={context === ctx.key
                ? { backgroundColor: '#F0FF00', color: '#232323', borderColor: '#F0FF00' }
                : { backgroundColor: 'white', color: '#232323', borderColor: '#D0D0C8' }
              }
            >
              {ctx.label}
            </button>
          ))}
        </div>
      </section>

      {/* Palettes Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
            {filteredPalettes.length} {t.paletteMagic}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPalettes.map((palette, idx) => {
            const isExpanded = expandedIdx === idx;
            return (
              <div
                key={`${palette.name}-${idx}`}
                className={`bg-white rounded-3xl border border-gray-100 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-black/10 shadow-xl' : 'hover:shadow-lg'}`}
              >
                {/* Color strip */}
                <div className="flex h-20">
                  {palette.colors.map((c, ci) => (
                    <div
                      key={ci}
                      className="flex-1 flex items-end justify-center pb-2 cursor-pointer hover:flex-[2] transition-[flex] duration-300"
                      style={{ backgroundColor: c }}
                      onClick={() => onHexChange(c)}
                    >
                      <span className="font-mono text-[7px] font-bold opacity-0 hover:opacity-100 transition-opacity" style={{ color: getContrastColor(c) }}>
                        {c}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-mono text-xs font-bold text-black uppercase tracking-wider">{palette.name}</h3>
                      <span className="font-mono text-[9px] text-gray-400 uppercase">
                        {palette.type === 'harmony' ? t.harmonyPalettes : palette.type === 'trend' ? t.trendPalettes : t.userPalettes}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="px-2 py-1 rounded-full font-mono text-[9px] font-bold" style={{
                        backgroundColor: palette.score >= 0.7 ? '#ECFDF5' : palette.score >= 0.5 ? '#FFF7ED' : '#FEF2F2',
                        color: palette.score >= 0.7 ? '#059669' : palette.score >= 0.5 ? '#D97706' : '#DC2626',
                      }}>
                        {(palette.score * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: t.contrastScore, value: palette.contrastScore },
                      { label: t.harmonyScore, value: palette.harmonyScore },
                      { label: t.paletteScore, value: palette.diversityScore },
                    ].map(s => (
                      <div key={s.label} className="space-y-1">
                        <span className="font-mono text-[7px] text-gray-400 uppercase">{s.label}</span>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.value * 100}%`, backgroundColor: s.value >= 0.7 ? '#059669' : s.value >= 0.4 ? '#D97706' : '#DC2626' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="flex-1 px-3 py-2 font-mono text-[9px] uppercase tracking-wider rounded-lg border border-gray-200 hover:border-black transition-all"
                    >
                      {t.expandPalette}
                    </button>
                    <button
                      onClick={() => copyPalette(palette.colors)}
                      className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider rounded-lg border border-gray-200 hover:border-black transition-all"
                    >
                      {t.copy}
                    </button>
                    <button
                      onClick={() => applyPalette(palette.colors)}
                      className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider rounded-lg text-white bg-black hover:bg-gray-800 transition-all"
                    >
                      {t.applyPalette}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-gray-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <h4 className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t.wcagValidated}</h4>
                      <div className="space-y-2">
                        {palette.colors.map((c1, i) =>
                          palette.colors.slice(i + 1).map((c2, j) => {
                            const ratio = getContrastRatio(c1, c2);
                            const passAA = ratio >= 4.5;
                            const passAAA = ratio >= 7;
                            return (
                              <div key={`${i}-${j}`} className="flex items-center gap-3">
                                <div className="flex gap-1">
                                  <div className="w-6 h-6 rounded" style={{ backgroundColor: c1 }} />
                                  <div className="w-6 h-6 rounded" style={{ backgroundColor: c2 }} />
                                </div>
                                <span className="font-mono text-[10px] font-bold">{ratio.toFixed(1)}:1</span>
                                <span className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-full ${passAAA ? 'bg-emerald-50 text-emerald-600' : passAA ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                                  {passAAA ? 'AAA' : passAA ? 'AA' : 'FAIL'}
                                </span>
                                {/* Preview text */}
                                <div className="flex-1 flex gap-1">
                                  <div className="px-2 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: c2, color: c1 }}>Aa</div>
                                  <div className="px-2 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: c1, color: c2 }}>Aa</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Color names */}
                      <div className="space-y-1 pt-2">
                        {palette.colors.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
                            <span className="font-mono text-[9px] text-gray-600">{c}</span>
                            <span className="font-mono text-[8px] text-gray-400">— {getClosestColorName(c)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

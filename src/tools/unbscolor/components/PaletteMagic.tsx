import React, { useState, useCallback, useRef } from 'react';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, isValidHex, getClosestColorName, getContrastColor } from '../utils/colorMath';
import { useLanguage } from '../i18n';

interface PaletteMagicProps {
  initialHex: string;
  batchColors: string[];
  onHexChange: (hex: string) => void;
  onBatchColorsChange: (colors: string[]) => void;
}

type DesignContext = 'all' | 'brand' | 'poster' | 'ui' | 'editorial' | 'packaging';

interface GeneratedPalette {
  id: string;
  name: string;
  colors: string[];
  contrastRatio: number;
  wcagPass: boolean;
}

// --- Color math helpers ---

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

const rotateHue = (hex: string, degrees: number): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const newH = (hsl.h + degrees + 360) % 360;
  const newRgb = hslToRgb({ ...hsl, h: newH });
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const adjustLightness = (hex: string, delta: number): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const newL = Math.max(5, Math.min(95, hsl.l + delta));
  const newRgb = hslToRgb({ ...hsl, l: newL });
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const adjustSat = (hex: string, delta: number): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const newS = Math.max(5, Math.min(100, hsl.s + delta));
  const newRgb = hslToRgb({ ...hsl, s: newS });
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- Palette generation strategies ---

const HARMONY_NAMES = ['Complementary', 'Triadic', 'Analogous', 'Split-Comp', 'Tetradic', 'Monochromatic'];

const generateComplementary = (base: string): string[] => {
  const comp = rotateHue(base, 180);
  return [
    adjustLightness(base, -20),
    base,
    adjustLightness(base, 20),
    comp,
    adjustLightness(comp, randInt(-15, 15)),
  ];
};

const generateTriadic = (base: string): string[] => {
  const c2 = rotateHue(base, 120);
  const c3 = rotateHue(base, 240);
  return [base, adjustLightness(base, -15), c2, c3, adjustLightness(c3, 15)];
};

const generateAnalogous = (base: string): string[] => {
  const spread = randInt(20, 45);
  return [
    rotateHue(base, -spread * 2),
    rotateHue(base, -spread),
    base,
    rotateHue(base, spread),
    rotateHue(base, spread * 2),
  ];
};

const generateSplitComp = (base: string): string[] => {
  const c2 = rotateHue(base, 150);
  const c3 = rotateHue(base, 210);
  return [base, adjustLightness(base, -20), c2, c3, adjustLightness(pick([c2, c3]), 20)];
};

const generateTetradic = (base: string): string[] => {
  return [base, rotateHue(base, 90), rotateHue(base, 180), rotateHue(base, 270), adjustLightness(base, -25)];
};

const generateMonochromatic = (base: string): string[] => {
  return [
    adjustLightness(base, -35),
    adjustLightness(base, -18),
    base,
    adjustLightness(base, 18),
    adjustLightness(base, 35),
  ];
};

// Add randomness to a palette
const jitter = (colors: string[]): string[] => {
  return colors.map(c => {
    const lDelta = rand(-8, 8);
    const sDelta = rand(-10, 10);
    const hDelta = rand(-5, 5);
    let result = adjustLightness(c, lDelta);
    result = adjustSat(result, sDelta);
    result = rotateHue(result, hDelta);
    return result;
  });
};

// Calculate average contrast of a palette
const avgContrast = (colors: string[]): number => {
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      total += getContrastRatio(colors[i], colors[j]);
      pairs++;
    }
  }
  return pairs > 0 ? total / pairs : 0;
};

// Best contrast pair in palette
const bestPairContrast = (colors: string[]): number => {
  let best = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      best = Math.max(best, getContrastRatio(colors[i], colors[j]));
    }
  }
  return best;
};

// Context-aware name prefixes
const CONTEXT_PREFIXES: Record<DesignContext, string[]> = {
  all: HARMONY_NAMES,
  brand: ['Brand Bold', 'Identity Core', 'Corporate Edge', 'Brand Essence', 'Visual DNA', 'Brand Spectrum'],
  poster: ['Impact Pop', 'Poster Punch', 'Billboard Blast', 'Street Vibrant', 'Visual Shock', 'Poster Edge'],
  ui: ['UI Clean', 'Interface Soft', 'Dashboard Flow', 'App Minimal', 'Component Palette', 'System UI'],
  editorial: ['Editorial Tone', 'Print Refined', 'Layout Classic', 'Magazine Mood', 'Type Harmony', 'Page Elegance'],
  packaging: ['Pack Pop', 'Shelf Impact', 'Label Bold', 'Box Premium', 'Wrap Fresh', 'Package Luxe'],
};

// Generate a batch of shuffled palettes
const generateShuffledBatch = (
  baseColors: string[],
  context: DesignContext,
  count: number = 9
): GeneratedPalette[] => {
  const generators = [generateComplementary, generateTriadic, generateAnalogous, generateSplitComp, generateTetradic, generateMonochromatic];
  const palettes: GeneratedPalette[] = [];
  const prefixes = CONTEXT_PREFIXES[context];

  for (let i = 0; i < count; i++) {
    const base = pick(baseColors);
    const gen = pick(generators);
    let colors = gen(base);
    colors = jitter(colors);

    // Context-specific adjustments
    if (context === 'ui') {
      // UI palettes: ensure one very light and one very dark
      colors[0] = adjustLightness(colors[0], -30);
      colors[colors.length - 1] = adjustLightness(colors[colors.length - 1], 35);
    } else if (context === 'poster') {
      // Poster: boost saturation
      colors = colors.map(c => adjustSat(c, 15));
    } else if (context === 'editorial') {
      // Editorial: desaturate slightly
      colors = colors.map(c => adjustSat(c, -10));
    } else if (context === 'packaging') {
      // Packaging: ensure high contrast
      colors[0] = adjustLightness(colors[0], -25);
      colors[colors.length - 1] = adjustLightness(colors[colors.length - 1], 30);
      colors = colors.map(c => adjustSat(c, 10));
    }

    const contrast = avgContrast(colors);
    const bestContrast = bestPairContrast(colors);

    palettes.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${pick(prefixes)} ${String(i + 1).padStart(2, '0')}`,
      colors,
      contrastRatio: contrast,
      wcagPass: bestContrast >= 4.5,
    });
  }

  // Sort by contrast
  return palettes.sort((a, b) => b.contrastRatio - a.contrastRatio);
};

// --- Component ---

export const PaletteMagic: React.FC<PaletteMagicProps> = ({ initialHex, batchColors, onHexChange, onBatchColorsChange }) => {
  const { t } = useLanguage();
  const [context, setContext] = useState<DesignContext>('all');
  const [palettes, setPalettes] = useState<GeneratedPalette[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<GeneratedPalette[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const baseHex = isValidHex(initialHex) ? initialHex : '#F7E043';
  const validBatch = batchColors.filter(c => isValidHex(c));
  const sources = validBatch.length > 0 ? validBatch : [baseHex];

  const handleShuffle = useCallback(() => {
    const newPalettes = generateShuffledBatch(sources, context, 9);
    setPalettes(newPalettes);
    setShuffleCount(c => c + 1);
    setExpandedId(null);
    // Scroll to grid
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [sources, context]);

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  }, []);

  const copyPalette = useCallback((colors: string[]) => {
    navigator.clipboard.writeText(colors.join(', '));
    showFeedback(t.copy + ' ✓');
  }, [t, showFeedback]);

  const applyPalette = useCallback((colors: string[]) => {
    onBatchColorsChange(colors);
    if (colors[0]) onHexChange(colors[0]);
    showFeedback(t.applyPalette + ' ✓');
  }, [onBatchColorsChange, onHexChange, t, showFeedback]);

  const toggleFavorite = useCallback((palette: GeneratedPalette) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === palette.id);
      if (exists) return prev.filter(p => p.id !== palette.id);
      return [...prev, palette];
    });
  }, []);

  const contexts: { key: DesignContext; label: string; icon: string }[] = [
    { key: 'all', label: t.allContexts, icon: '✦' },
    { key: 'brand', label: t.contextBrand, icon: '◆' },
    { key: 'poster', label: t.contextPoster, icon: '▣' },
    { key: 'ui', label: t.contextUI, icon: '◫' },
    { key: 'editorial', label: t.contextEditorial, icon: '▤' },
    { key: 'packaging', label: t.contextPackaging, icon: '▧' },
  ];

  const isFav = (id: string) => favorites.some(f => f.id === id);

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 py-8">
      {/* Feedback toast */}
      {feedback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-black text-white px-8 py-3 font-mono text-[10px] uppercase tracking-[0.3em] rounded-full shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
          {feedback}
        </div>
      )}

      {/* Header + Shuffle Button */}
      <section className="text-center space-y-6">
        <div>
          <h2 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-[0.5em] mb-2">{t.paletteMagic}</h2>
          <p className="font-mono text-[10px] text-gray-400 max-w-md mx-auto">Generate validated color palettes. Each shuffle creates unique combinations optimized for your context.</p>
        </div>

        {/* Source colors */}
        <div className="flex justify-center gap-2 flex-wrap">
          {sources.map((c, i) => (
            <div key={i} className="relative group">
              <div 
                className="w-10 h-10 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                onClick={() => onHexChange(c)}
              />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[6px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{c}</span>
            </div>
          ))}
        </div>

        {/* Context pills */}
        <div className="flex justify-center flex-wrap gap-2">
          {contexts.map(ctx => (
            <button
              key={ctx.key}
              onClick={() => { setContext(ctx.key); }}
              className="px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] rounded-full transition-all font-bold border"
              style={context === ctx.key
                ? { backgroundColor: '#F0FF00', color: '#232323', borderColor: '#F0FF00' }
                : { backgroundColor: 'white', color: '#999', borderColor: '#E5E5E5' }
              }
            >
              {ctx.icon} {ctx.label}
            </button>
          ))}
        </div>

        {/* THE SHUFFLE BUTTON */}
        <button
          onClick={handleShuffle}
          className="group relative inline-flex items-center gap-3 px-12 py-5 bg-black text-white font-mono text-sm uppercase tracking-[0.4em] rounded-full hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]"
        >
          <span className="text-xl transition-transform group-hover:rotate-180 duration-500">⟳</span>
          <span>Shuffle</span>
          {shuffleCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#F0FF00] text-black text-[9px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {shuffleCount}
            </span>
          )}
        </button>
      </section>

      {/* Generated Palettes Grid */}
      {palettes.length > 0 && (
        <section ref={gridRef} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">
              {palettes.length} {t.paletteMagic}
            </h3>
            {favorites.length > 0 && (
              <span className="font-mono text-[9px] text-gray-400">★ {favorites.length} {t.save || 'saved'}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {palettes.map((palette) => {
              const isExpanded = expandedId === palette.id;
              const fav = isFav(palette.id);
              return (
                <div
                  key={palette.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-1 ring-black/10 shadow-xl border-gray-200' : 'border-gray-100 hover:shadow-md hover:border-gray-200'}`}
                >
                  {/* Color strip - full bleed */}
                  <div className="flex h-24 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : palette.id)}>
                    {palette.colors.map((c, ci) => (
                      <div
                        key={ci}
                        className="flex-1 relative group/swatch hover:flex-[2] transition-[flex] duration-300"
                        style={{ backgroundColor: c }}
                      >
                        <span 
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[7px] font-bold opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap"
                          style={{ color: getContrastColor(c) }}
                        >
                          {c}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Info bar */}
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-mono text-[10px] font-bold text-gray-800 uppercase tracking-wider">{palette.name}</h4>
                      <span className={`font-mono text-[7px] font-bold px-2 py-0.5 rounded-full ${palette.wcagPass ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {palette.wcagPass ? 'WCAG AA' : `${palette.contrastRatio.toFixed(1)}:1`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFavorite(palette)}
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-all ${fav ? 'bg-[#F0FF00] scale-110' : 'hover:bg-gray-50'}`}
                      >
                        {fav ? '★' : '☆'}
                      </button>
                      <button
                        onClick={() => copyPalette(palette.colors)}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-[10px] hover:bg-gray-50 transition-all"
                        title={t.copy}
                      >
                        ⎘
                      </button>
                      <button
                        onClick={() => applyPalette(palette.colors)}
                        className="px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider rounded-full bg-black text-white hover:bg-gray-800 transition-all"
                      >
                        {t.applyPalette}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-50 animate-in slide-in-from-top-2 duration-200">
                      {/* Contrast matrix */}
                      <div className="space-y-1.5 mb-3">
                        <h5 className="font-mono text-[8px] font-bold text-gray-300 uppercase tracking-widest mb-2">Contrast Pairs</h5>
                        {palette.colors.map((c1, i) =>
                          palette.colors.slice(i + 1).map((c2, j) => {
                            const ratio = getContrastRatio(c1, c2);
                            if (ratio < 2) return null;
                            const passAA = ratio >= 4.5;
                            return (
                              <div key={`${i}-${j}`} className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: c1 }} />
                                  <div className="w-5 h-5 rounded-sm" style={{ backgroundColor: c2 }} />
                                </div>
                                <div className="flex-1 h-[2px] bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(ratio / 10 * 100, 100)}%`, backgroundColor: passAA ? '#059669' : '#D97706' }} />
                                </div>
                                <span className="font-mono text-[8px] font-bold w-10 text-right">{ratio.toFixed(1)}:1</span>
                                <span className={`font-mono text-[7px] font-bold ${passAA ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {passAA ? 'AA' : '—'}
                                </span>
                                {/* Live preview */}
                                <div className="flex gap-0.5">
                                  <div className="px-1.5 py-0.5 rounded text-[7px] font-bold leading-none" style={{ backgroundColor: c2, color: c1 }}>Aa</div>
                                  <div className="px-1.5 py-0.5 rounded text-[7px] font-bold leading-none" style={{ backgroundColor: c1, color: c2 }}>Aa</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Color list */}
                      <div className="space-y-1">
                        {palette.colors.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 -mx-1 transition-colors" onClick={() => onHexChange(c)}>
                            <div className="w-4 h-4 rounded-sm shadow-sm" style={{ backgroundColor: c }} />
                            <span className="font-mono text-[9px] text-gray-700 font-bold">{c}</span>
                            <span className="font-mono text-[8px] text-gray-400">{getClosestColorName(c)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">★ {t.save || 'Saved'} ({favorites.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {favorites.map(palette => (
              <div key={palette.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex h-16">
                  {palette.colors.map((c, ci) => (
                    <div key={ci} className="flex-1" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold text-gray-700 uppercase">{palette.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => applyPalette(palette.colors)} className="px-3 py-1 font-mono text-[8px] uppercase rounded-full bg-black text-white hover:bg-gray-800 transition-all">{t.applyPalette}</button>
                    <button onClick={() => toggleFavorite(palette)} className="px-2 py-1 font-mono text-[8px] text-red-400 hover:text-red-600 transition-colors">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {palettes.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl opacity-20">⟳</div>
          <p className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.3em]">
            Hit shuffle to generate palettes
          </p>
        </div>
      )}
    </div>
  );
};

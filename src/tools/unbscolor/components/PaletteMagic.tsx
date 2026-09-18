import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Check, Copy, Image as ImageIcon, Lock, RefreshCw, Star, Unlock, X } from 'lucide-react';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, isValidHex, getClosestColorName, getContrastColor } from '../utils/colorMath';
import { extractDominantColors } from '../utils/imageExtraction';
import { contrastRatio as wcagContrastRatio, WCAG_THRESHOLDS } from '../utils/contrast';
import { copyText, useSafeTimeout, useTransientState } from '../utils/browser';
import { useLanguage } from '../i18n';
import { Card, IconButton, LegendDot, Metric, SectionHeading, TextTabs } from './ui';

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

// --- Curated palette seeds (real brand-quality palettes) ---

const CURATED_PALETTES: { name: string; colors: string[]; tags: DesignContext[] }[] = [
  { name: 'Luxury Noir', colors: ['#1A1A2E', '#16213E', '#0F3460', '#E94560', '#FAFAFA'], tags: ['brand', 'packaging'] },
  { name: 'Earthy Warm', colors: ['#2D1B14', '#8B4513', '#D2691E', '#F4A460', '#FAEBD7'], tags: ['brand', 'editorial'] },
  { name: 'Nordic Frost', colors: ['#2E3440', '#3B4252', '#88C0D0', '#D8DEE9', '#ECEFF4'], tags: ['ui', 'editorial'] },
  { name: 'Sunset Editorial', colors: ['#1B1B2F', '#E43F5A', '#FF6B6B', '#FFC93C', '#F9F7F7'], tags: ['poster', 'editorial'] },
  { name: 'Ocean Depth', colors: ['#0B0C10', '#1F2833', '#45A29E', '#66FCF1', '#C5C6C7'], tags: ['ui', 'brand'] },
  { name: 'Forest Calm', colors: ['#1B2D2A', '#2D4739', '#5B8C5A', '#A3C9A8', '#F0F5E7'], tags: ['brand', 'packaging'] },
  { name: 'Blush Minimal', colors: ['#2B2024', '#6B4C5A', '#D4A5A5', '#F5E6E0', '#FFFFFF'], tags: ['ui', 'editorial'] },
  { name: 'Royal Purple', colors: ['#1A0533', '#3C1874', '#6C3DC1', '#A78BFA', '#EDE9FE'], tags: ['brand', 'poster'] },
  { name: 'Citrus Pop', colors: ['#1A1A2E', '#F39C12', '#E74C3C', '#27AE60', '#ECF0F1'], tags: ['poster', 'packaging'] },
  { name: 'Terracotta', colors: ['#2C1810', '#8C4A2F', '#C67B5C', '#E8C4A2', '#F5F0EB'], tags: ['brand', 'packaging'] },
  { name: 'Deep Teal', colors: ['#0D1B2A', '#1B263B', '#415A77', '#778DA9', '#E0E1DD'], tags: ['ui', 'brand'] },
  { name: 'Candy Pastel', colors: ['#FFB5E8', '#FF9CEE', '#B28DFF', '#85E3FF', '#FFFFD1'], tags: ['poster', 'packaging'] },
  { name: 'Mono Stone', colors: ['#1C1C1C', '#3D3D3D', '#6B6B6B', '#A8A8A8', '#E8E8E8'], tags: ['ui', 'editorial'] },
  { name: 'Olive Gold', colors: ['#1D1E18', '#3D405B', '#81B29A', '#F2CC8F', '#F4F1DE'], tags: ['brand', 'editorial'] },
  { name: 'Neon Cyber', colors: ['#0A0A0A', '#1A1A2E', '#00F5D4', '#FEE440', '#F15BB5'], tags: ['poster', 'ui'] },
  { name: 'Warm Coffee', colors: ['#1B1108', '#3E2723', '#6D4C41', '#A1887F', '#EFEBE9'], tags: ['brand', 'packaging'] },
  { name: 'Ice Lavender', colors: ['#1A1423', '#312541', '#7C5CBF', '#C4B5E0', '#F0ECF5'], tags: ['ui', 'editorial'] },
  { name: 'Coral Reef', colors: ['#1A2332', '#264653', '#2A9D8F', '#E9C46A', '#F4A261'], tags: ['poster', 'brand'] },
  { name: 'Midnight Blue', colors: ['#0C0F1D', '#141D3B', '#2E4272', '#5B86E5', '#DCE5F4'], tags: ['ui', 'brand'] },
  { name: 'Sand Dune', colors: ['#2C2416', '#5C4B37', '#A68B6B', '#D4C4A8', '#F2EDE4'], tags: ['editorial', 'packaging'] },
  { name: 'Cherry Blossom', colors: ['#1C1018', '#4A2040', '#C94C7D', '#F2A1B3', '#FFF0F3'], tags: ['brand', 'packaging'] },
  { name: 'Emerald Luxe', colors: ['#0B1F0E', '#1B4332', '#2D6A4F', '#52B788', '#D8F3DC'], tags: ['brand', 'packaging'] },
  { name: 'Burnt Sienna', colors: ['#1E0F06', '#5C2E0E', '#A0522D', '#CD853F', '#FFEFD5'], tags: ['editorial', 'brand'] },
  { name: 'Arctic White', colors: ['#1C2833', '#2C3E50', '#7FB3D8', '#D4E6F1', '#FDFEFE'], tags: ['ui', 'editorial'] },
  { name: 'Grape Wine', colors: ['#1A0A1E', '#3B0D3B', '#722F6D', '#C56EB5', '#F3D5F0'], tags: ['brand', 'poster'] },
  { name: 'Copper Age', colors: ['#1A130E', '#4E3524', '#B87333', '#DAA06D', '#F5E6D3'], tags: ['packaging', 'brand'] },
  { name: 'Electric Blue', colors: ['#03071E', '#1B1F3B', '#3A59D1', '#7B98F4', '#E4ECFD'], tags: ['ui', 'poster'] },
  { name: 'Sage Garden', colors: ['#1A2118', '#3B4F3A', '#6B8F6B', '#A8C5A0', '#EFF5ED'], tags: ['brand', 'editorial'] },
  { name: 'Peach Dawn', colors: ['#231715', '#5D3B35', '#CB7B62', '#F5B895', '#FFF3ED'], tags: ['packaging', 'editorial'] },
  { name: 'Steel Industry', colors: ['#111315', '#2D3436', '#636E72', '#B2BEC3', '#DFE6E9'], tags: ['ui', 'brand'] },
  { name: 'Plum Velvet', colors: ['#150515', '#3A1040', '#7B2D8E', '#B86FC4', '#F0DFF3'], tags: ['poster', 'packaging'] },
  { name: 'Gold Rush', colors: ['#1A1505', '#3D3205', '#8B7D10', '#D4AF37', '#FDF8E1'], tags: ['brand', 'packaging'] },
  { name: 'Dusty Rose', colors: ['#201518', '#5E3A40', '#B76E79', '#E8B4B8', '#FDF2F3'], tags: ['editorial', 'brand'] },
  { name: 'Marine Deep', colors: ['#020A1B', '#0A1931', '#185ADB', '#60A3D9', '#E0F0FF'], tags: ['ui', 'poster'] },
  { name: 'Clay Earth', colors: ['#1C1410', '#4A3728', '#8D6E50', '#C4A882', '#F2ECE4'], tags: ['packaging', 'brand'] },
];

// --- Color math helpers ---

// WCAG ratio from utils/contrast (invalid input falls back to 1:1).
const getContrastRatio = (hex1: string, hex2: string): number => {
  const ratio = wcagContrastRatio(hex1, hex2);
  return Number.isNaN(ratio) ? 1 : ratio;
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
  // Floor at 0 so neutral (gray) palettes stay neutral.
  const newS = Math.max(0, Math.min(100, hsl.s + delta));
  const newRgb = hslToRgb({ ...hsl, s: newS });
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- Palette generation ---

const generateComplementary = (base: string): string[] => {
  const comp = rotateHue(base, 180);
  return [adjustLightness(base, -20), base, adjustLightness(base, 20), comp, adjustLightness(comp, 10)];
};

const generateTriadic = (base: string): string[] => {
  return [base, adjustLightness(base, -15), rotateHue(base, 120), rotateHue(base, 240), adjustLightness(rotateHue(base, 240), 15)];
};

const generateAnalogous = (base: string): string[] => {
  const s = 25 + Math.floor(Math.random() * 15);
  return [rotateHue(base, -s * 2), rotateHue(base, -s), base, rotateHue(base, s), rotateHue(base, s * 2)];
};

const generateSplitComp = (base: string): string[] => {
  const c2 = rotateHue(base, 150), c3 = rotateHue(base, 210);
  return [base, adjustLightness(base, -20), c2, c3, adjustLightness(pick([c2, c3]), 20)];
};

const generateTetradic = (base: string): string[] => {
  return [base, rotateHue(base, 90), rotateHue(base, 180), rotateHue(base, 270), adjustLightness(base, -25)];
};

const generateMonochromatic = (base: string): string[] => {
  return [adjustLightness(base, -35), adjustLightness(base, -18), base, adjustLightness(base, 18), adjustLightness(base, 35)];
};

const generators = [generateComplementary, generateTriadic, generateAnalogous, generateSplitComp, generateTetradic, generateMonochromatic];

// Subtle jitter (reduced for realism)
const jitter = (colors: string[]): string[] => {
  return colors.map(c => {
    let result = adjustLightness(c, rand(-3, 3));
    result = adjustSat(result, rand(-3, 3));
    result = rotateHue(result, rand(-2, 2));
    return result;
  });
};

// Adapt palette to target slot count
const adaptToSlotCount = (colors: string[], target: number): string[] => {
  if (colors.length === target) return colors;
  if (colors.length > target) {
    // Pick most spread colors by lightness
    const sorted = colors.map((c, i) => ({ c, l: rgbToHsl(hexToRgb(c)).l, i })).sort((a, b) => a.l - b.l);
    const step = (sorted.length - 1) / (target - 1);
    return Array.from({ length: target }, (_, i) => sorted[Math.round(i * step)].c);
  }
  // Interpolate extra colors
  const result = [...colors];
  while (result.length < target) {
    const idx = Math.floor(Math.random() * (result.length - 1));
    const c1 = hexToRgb(result[idx]);
    const c2 = hexToRgb(result[idx + 1]);
    const mid = rgbToHex(
      Math.round((c1.r + c2.r) / 2),
      Math.round((c1.g + c2.g) / 2),
      Math.round((c1.b + c2.b) / 2)
    );
    result.splice(idx + 1, 0, mid);
  }
  return result;
};

// Average contrast
const avgContrast = (colors: string[]): number => {
  let total = 0, pairs = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      total += getContrastRatio(colors[i], colors[j]);
      pairs++;
    }
  }
  return pairs > 0 ? total / pairs : 0;
};

const bestPairContrast = (colors: string[]): number => {
  let best = 0;
  for (let i = 0; i < colors.length; i++)
    for (let j = i + 1; j < colors.length; j++)
      best = Math.max(best, getContrastRatio(colors[i], colors[j]));
  return best;
};

// Context adjustments for saturation limits
const applyContextAdjustments = (colors: string[], context: DesignContext): string[] => {
  if (context === 'ui') {
    const c = [...colors];
    c[0] = adjustLightness(c[0], -30);
    c[c.length - 1] = adjustLightness(c[c.length - 1], 35);
    return c;
  }
  if (context === 'poster') return colors.map(c => adjustSat(c, 10));
  if (context === 'editorial') return colors.map(c => adjustSat(c, -8));
  if (context === 'packaging') {
    const c = [...colors];
    c[0] = adjustLightness(c[0], -25);
    c[c.length - 1] = adjustLightness(c[c.length - 1], 30);
    return c.map(x => adjustSat(x, 5));
  }
  return colors;
};

// Ensure at least one neutral
const ensureNeutral = (colors: string[]): string[] => {
  const hasLight = colors.some(c => rgbToHsl(hexToRgb(c)).l > 85);
  const hasDark = colors.some(c => rgbToHsl(hexToRgb(c)).l < 15);
  const result = [...colors];
  if (!hasLight && !hasDark) {
    // Replace last color with a near-white or near-black
    if (Math.random() > 0.5) {
      result[result.length - 1] = adjustLightness(result[0], 80);
    } else {
      result[0] = adjustLightness(result[result.length - 1], -70);
    }
  }
  return result;
};

// Cap saturation for realism
const capSaturation = (colors: string[], maxS: number): string[] => {
  return colors.map(c => {
    const rgb = hexToRgb(c);
    const hsl = rgbToHsl(rgb);
    if (hsl.s > maxS) {
      const newRgb = hslToRgb({ ...hsl, s: maxS });
      return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    }
    return c;
  });
};

const CONTEXT_NAMES: Record<DesignContext, string[]> = {
  all: ['Harmony', 'Balance', 'Curated', 'Blend', 'Spectrum', 'Refined'],
  brand: ['Identity', 'Brand Core', 'Visual DNA', 'Essence', 'Signature', 'Mark'],
  poster: ['Impact', 'Bold', 'Vibrant', 'Street', 'Pop', 'Visual'],
  ui: ['Interface', 'Clean', 'System', 'App', 'Minimal', 'Flow'],
  editorial: ['Editorial', 'Print', 'Layout', 'Classic', 'Refined', 'Page'],
  packaging: ['Pack', 'Shelf', 'Label', 'Premium', 'Fresh', 'Box'],
};

// Generate a single palette from seed or harmony
const generateSinglePalette = (
  sources: string[],
  context: DesignContext,
  slotCount: number,
  index: number,
): GeneratedPalette => {
  const prefixes = CONTEXT_NAMES[context];
  let colors: string[];
  const maxSat = context === 'editorial' ? 60 : context === 'ui' ? 75 : 85;

  // Decide strategy: ~50% from curated seeds, ~50% from harmony generators
  const useCurated = Math.random() < 0.5;

  if (useCurated) {
    // Pick a curated palette, optionally filtered by context
    const filtered = context === 'all'
      ? CURATED_PALETTES
      : CURATED_PALETTES.filter(p => p.tags.includes(context));
    const seed = pick(filtered.length > 0 ? filtered : CURATED_PALETTES);
    colors = jitter([...seed.colors]);
  } else {
    // Harmony-based from user's source colors
    const base = pick(sources);
    const gen = pick(generators);
    colors = jitter(gen(base));
  }

  colors = adaptToSlotCount(colors, slotCount);
  colors = applyContextAdjustments(colors, context);
  colors = ensureNeutral(colors);
  colors = capSaturation(colors, maxSat);

  const contrast = avgContrast(colors);
  const best = bestPairContrast(colors);

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${pick(prefixes)} ${String(index + 1).padStart(2, '0')}`,
    colors,
    contrastRatio: contrast,
    wcagPass: best >= WCAG_THRESHOLDS.aaNormal,
  };
};

// Generate batch respecting locks
const generateBatch = (
  sources: string[],
  context: DesignContext,
  slotCount: number,
  existingPalettes: GeneratedPalette[],
  lockedColors: Record<string, Record<number, string>>,
  count: number = 9,
): GeneratedPalette[] => {
  const results: GeneratedPalette[] = [];

  // Regenerate existing palettes with locks
  for (const palette of existingPalettes) {
    const locks = lockedColors[palette.id] || {};
    const hasLocks = Object.keys(locks).length > 0;

    if (hasLocks) {
      // Generate a fresh palette then overlay locked slots
      const fresh = generateSinglePalette(sources, context, slotCount, 0);
      const newColors = fresh.colors.map((c, i) => locks[i] || c);
      const contrast = avgContrast(newColors);
      const best = bestPairContrast(newColors);
      results.push({
        ...palette,
        colors: newColors,
        contrastRatio: contrast,
        wcagPass: best >= WCAG_THRESHOLDS.aaNormal,
      });
    } else {
      results.push(generateSinglePalette(sources, context, slotCount, results.length));
    }
  }

  // Fill up to count with new palettes
  while (results.length < count) {
    results.push(generateSinglePalette(sources, context, slotCount, results.length));
  }

  return results.sort((a, b) => b.contrastRatio - a.contrastRatio);
};

const SLOT_OPTIONS = [3, 4, 5, 6, 7];

// --- Component ---

export const PaletteMagic: React.FC<PaletteMagicProps> = ({ initialHex, batchColors, onHexChange, onBatchColorsChange }) => {
  const { t } = useLanguage();
  const [context, setContext] = useState<DesignContext>('all');
  const [slotCount, setSlotCount] = useState(5);
  const [palettes, setPalettes] = useState<GeneratedPalette[]>([]);
  const [lockedColors, setLockedColors] = useState<Record<string, Record<number, string>>>({});
  const [shuffleCount, setShuffleCount] = useState(0);
  const [feedback, setTransientFeedback] = useTransientState<string>(1500);
  const schedule = useSafeTimeout();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<GeneratedPalette[]>([]);
  const [selectedSourceColor, setSelectedSourceColor] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const baseHex = isValidHex(initialHex) ? initialHex : '#F0FF00';
  const validBatch = batchColors.filter(c => isValidHex(c));
  const sources = validBatch.length > 0 ? validBatch : [baseHex];

  const doShuffle = useCallback((ctx: DesignContext, existingPalettes: GeneratedPalette[], locks: Record<string, Record<number, string>>) => {
    const newPalettes = generateBatch(sources, ctx, slotCount, existingPalettes, locks, 9);
    setPalettes(newPalettes);
    const newLocks: Record<string, Record<number, string>> = {};
    for (const p of newPalettes) {
      if (locks[p.id]) newLocks[p.id] = locks[p.id];
    }
    setLockedColors(newLocks);
    setShuffleCount(c => c + 1);
    setExpandedId(null);
    schedule(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [sources, slotCount, schedule]);

  const handleShuffle = useCallback(() => {
    doShuffle(context, palettes, lockedColors);
  }, [doShuffle, context, palettes, lockedColors]);

  // Auto-shuffle when context changes (only if palettes already exist)
  const prevContextRef = useRef(context);
  useEffect(() => {
    if (prevContextRef.current !== context && palettes.length > 0) {
      // Clear locks when changing context for fresh generation
      doShuffle(context, [], {});
    }
    prevContextRef.current = context;
  }, [context, doShuffle, palettes.length]);

  const showFeedback = setTransientFeedback;

  const copyPalette = useCallback((colors: string[]) => {
    void copyText(colors.join(', ')).then((ok) => showFeedback(ok ? t.copy : t.copyFailed));
  }, [t, showFeedback]);

  const applyPalette = useCallback((colors: string[]) => {
    onBatchColorsChange(colors);
    if (colors[0]) onHexChange(colors[0]);
    showFeedback(t.applyPalette);
  }, [onBatchColorsChange, onHexChange, t, showFeedback]);

  const toggleFavorite = useCallback((palette: GeneratedPalette) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === palette.id);
      if (exists) return prev.filter(p => p.id !== palette.id);
      return [...prev, palette];
    });
  }, []);

  const toggleLock = useCallback((paletteId: string, slotIndex: number, color: string) => {
    setLockedColors(prev => {
      const paletteLocks = { ...(prev[paletteId] || {}) };
      if (paletteLocks[slotIndex]) {
        delete paletteLocks[slotIndex];
      } else {
        paletteLocks[slotIndex] = color;
      }
      if (Object.keys(paletteLocks).length === 0) {
        const { [paletteId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [paletteId]: paletteLocks };
    });
  }, []);

  const isLocked = (paletteId: string, slotIndex: number) => !!lockedColors[paletteId]?.[slotIndex];

  const contexts: { key: DesignContext; label: string }[] = [
    { key: 'all', label: t.allContexts },
    { key: 'brand', label: t.contextBrand },
    { key: 'poster', label: t.contextPoster },
    { key: 'ui', label: t.contextUI },
    { key: 'editorial', label: t.contextEditorial },
    { key: 'packaging', label: t.contextPackaging },
  ];

  const isFav = (id: string) => favorites.some(f => f.id === id);

  return (
    <div className="flex flex-col gap-5">
      {/* Feedback toast — floats over content, so it is the one place blur belongs. */}
      {feedback && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 glass-invert px-5 py-2.5 text-[13px] rounded-pill shadow-floating z-50 animate-in fade-in duration-base" role="status">
          {feedback}
        </div>
      )}

      {/* Setup: sources, context, slot count, and the one committing action. */}
      <Card
        label={t.paletteMagic}
        actions={
          <button type="button" onClick={handleShuffle} className="ctl ctl-tinted ctl-sm">
            <RefreshCw aria-hidden="true" />
            {t.shuffle}
            {shuffleCount > 0 && <span className="tabular">{shuffleCount}</span>}
          </button>
        }
      >
        <p className="text-[14px] text-muted-foreground max-w-[60ch]">{t.paletteMagicIntro}</p>

        <div className="grid grid-cols-1 sm:grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-6 gap-y-2 sm:gap-y-5">
          {/* Source colors — click to select for injection into slots */}
          <span className="text-[14px] text-muted-foreground" aria-live="polite">
            {selectedSourceColor ? t.clickASlot : t.sourceColors}
          </span>
          <div className="flex gap-2 flex-wrap items-center mb-3 sm:mb-0">
            {sources.map((c, i) => {
              const active = selectedSourceColor === c;
              return (
                <button
                  type="button"
                  key={i}
                  className="relative w-10 h-10 rounded-sm shadow-hairline hover:shadow-hairline-strong press transition-shadow duration-fast ease-out"
                  style={{ backgroundColor: c }}
                  onClick={() => setSelectedSourceColor(prev => prev === c ? null : c)}
                  aria-pressed={active}
                  aria-label={`${active ? t.deselect : t.selectToInject}: ${c}`}
                  title={`${c} · ${active ? t.deselect : t.selectToInject}`}
                >
                  {/* Selected reads as everywhere else: black fill, white glyph. */}
                  {active && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-pill bg-primary text-primary-foreground flex items-center justify-center" aria-hidden="true">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
            {/* Extract from image */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              id="palette-image-upload"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const colors = await extractDominantColors(file, 8);
                  if (colors.length > 0) {
                    onBatchColorsChange(colors);
                  }
                } catch (err) {
                  console.warn('Image extraction failed:', err);
                }
                e.target.value = '';
              }}
            />
            <label
              htmlFor="palette-image-upload"
              className="ctl ctl-outline ctl-icon ctl-lg cursor-pointer"
              title={t.extractFromImageTitle}
              aria-label={t.extractFromImage}
            >
              <ImageIcon aria-hidden="true" />
            </label>
          </div>

          {/* Context: quiet text tabs */}
          <span className="text-[14px] text-muted-foreground">{t.contextLabel}</span>
          <TextTabs<DesignContext>
            items={contexts.map(ctx => ({ value: ctx.key, label: ctx.label }))}
            value={context}
            onChange={setContext}
            ariaLabel={t.contextLabel}
            className="mb-3 sm:mb-0"
          />

          {/* Slot count */}
          <span className="text-[14px] text-muted-foreground">{t.slots}</span>
          <TextTabs
            items={SLOT_OPTIONS.map(n => ({ value: String(n), label: <span className="tabular">{n}</span> }))}
            value={String(slotCount)}
            onChange={v => setSlotCount(Number(v))}
            ariaLabel={t.slots}
          />
        </div>
      </Card>

      {/* Palette Grid */}
      {palettes.length > 0 && (
        <section ref={gridRef} className="flex flex-col gap-5 scroll-mt-24" aria-label={t.paletteMagic}>
          <div className="flex items-center justify-between gap-4 pt-3">
            <span className="text-[14px] text-muted-foreground tabular">
              {palettes.length} {t.paletteMagic}
            </span>
            {favorites.length > 0 && (
              <LegendDot label={<span className="tabular">{favorites.length} {t.save}</span>} />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            {palettes.map((palette) => {
              const isExpanded = expandedId === palette.id;
              const fav = isFav(palette.id);
              return (
                <Card
                  as="article"
                  key={palette.id}
                  aria-label={palette.name}
                  label={<span className="truncate">{palette.name}</span>}
                  className={`transition-shadow duration-fast ease-out ${isExpanded ? 'shadow-[inset_0_0_0_1px_hsl(var(--foreground))]' : ''}`}
                  actions={
                    <>
                      <IconButton label={t.save} active={fav} onClick={() => toggleFavorite(palette)}>
                        <Star aria-hidden="true" fill={fav ? 'currentColor' : 'none'} />
                      </IconButton>
                      <IconButton label={t.copy} onClick={() => copyPalette(palette.colors)}>
                        <Copy aria-hidden="true" />
                      </IconButton>
                    </>
                  }
                >
                  {/* Color strip with lock icons */}
                  <div className="flex h-24 rounded-md overflow-hidden">
                    {palette.colors.map((c, ci) => {
                      const locked = isLocked(palette.id, ci);
                      return (
                        <div
                          key={ci}
                          className={`flex-1 relative group/swatch hover:flex-[2] transition-[flex] duration-base ease-out cursor-pointer ${
                            selectedSourceColor ? 'ring-inset hover:ring-2 hover:ring-foreground' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            if (selectedSourceColor) {
                              // Inject source color into this slot and ALWAYS lock it
                              const newColors = [...palette.colors];
                              newColors[ci] = selectedSourceColor;
                              const contrast = avgContrast(newColors);
                              const best = bestPairContrast(newColors);
                              setPalettes(prev => prev.map(p => p.id === palette.id ? { ...p, colors: newColors, contrastRatio: contrast, wcagPass: best >= WCAG_THRESHOLDS.aaNormal } : p));
                              // Force lock (don't toggle — always set)
                              setLockedColors(prev => ({
                                ...prev,
                                [palette.id]: { ...(prev[palette.id] || {}), [ci]: selectedSourceColor }
                              }));
                              setSelectedSourceColor(null);
                              showFeedback(t.colorInjectedLocked);
                            } else {
                              setExpandedId(isExpanded ? null : palette.id);
                            }
                          }}
                        >
                          {/* Lock button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleLock(palette.id, ci, c); }}
                            className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-sm flex items-center justify-center press transition-opacity duration-fast ease-out z-10 ${
                              locked
                                ? 'opacity-100 bg-primary text-primary-foreground'
                                : 'opacity-0 group-hover/swatch:opacity-70 hover:!opacity-100 focus-visible:opacity-100 bg-foreground/30 text-background'
                            }`}
                            title={locked ? t.unlockColor : t.lockColor}
                            aria-label={locked ? t.unlockColor : t.lockColor}
                            aria-pressed={locked}
                          >
                            {locked ? <Lock className="w-3.5 h-3.5" aria-hidden="true" /> : <Unlock className="w-3.5 h-3.5" aria-hidden="true" />}
                          </button>

                          {/* Locked indicator border */}
                          {locked && (
                            <div className="absolute inset-0 border-2 border-foreground pointer-events-none" />
                          )}

                          {/* Hex label */}
                          <span
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 tabular text-[12px] opacity-0 group-hover/swatch:opacity-100 transition-opacity duration-fast ease-out whitespace-nowrap"
                            style={{ color: getContrastColor(c) }}
                          >
                            {c}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contrast and apply */}
                  <div className="flex items-end justify-between gap-3">
                    <Metric
                      size="sm"
                      value={palette.contrastRatio.toFixed(2)}
                      caption={palette.wcagPass ? `${t.contrast} · AA` : t.contrast}
                    />
                    <button
                      type="button"
                      onClick={() => applyPalette(palette.colors)}
                      className="ctl ctl-outline ctl-sm shrink-0"
                    >
                      {t.applyPalette}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="flex flex-col gap-5 pt-5 hairline-t">
                      <div className="flex flex-col gap-2">
                        <span className="text-[13px] text-muted-foreground">{t.contrastPairs}</span>
                        {palette.colors.map((c1, i) =>
                          palette.colors.slice(i + 1).map((c2, j) => {
                            const ratio = getContrastRatio(c1, c2);
                            if (ratio < 2) return null;
                            const passAA = ratio >= WCAG_THRESHOLDS.aaNormal;
                            return (
                              <div key={`${i}-${j}`} className="flex items-center gap-2">
                                <div className="flex gap-0.5 shrink-0">
                                  <div className="w-5 h-5 rounded-xs shadow-hairline" style={{ backgroundColor: c1 }} />
                                  <div className="w-5 h-5 rounded-xs shadow-hairline" style={{ backgroundColor: c2 }} />
                                </div>
                                <div className="flex-1 h-1 bg-fill-2 rounded-pill overflow-hidden">
                                  <div className={`h-full rounded-pill ${passAA ? 'bg-foreground' : 'bg-fill-3'}`} style={{ width: `${Math.min(ratio / 10 * 100, 100)}%` }} />
                                </div>
                                <span className="tabular text-[12px] w-12 text-right text-foreground">{ratio.toFixed(1)}:1</span>
                                <span className={`text-[12px] w-5 ${passAA ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {passAA ? 'AA' : '—'}
                                </span>
                                <div className="flex gap-0.5 shrink-0" aria-hidden="true">
                                  <div className="px-1.5 py-0.5 rounded-xs text-[12px] leading-none" style={{ backgroundColor: c2, color: c1 }}>Aa</div>
                                  <div className="px-1.5 py-0.5 rounded-xs text-[12px] leading-none" style={{ backgroundColor: c1, color: c2 }}>Aa</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="flex flex-col">
                        {palette.colors.map((c, i) => (
                          <button
                            type="button"
                            key={i}
                            className={`flex items-center gap-3 min-h-10 text-left hover:opacity-80 transition-opacity duration-fast ease-out ${i < palette.colors.length - 1 ? 'hairline-b' : ''}`}
                            onClick={() => onHexChange(c)}
                            title={c}
                          >
                            <span className="w-4 h-4 shrink-0 rounded-xs shadow-hairline" style={{ backgroundColor: c }} aria-hidden="true" />
                            <span className="tabular text-[14px] text-foreground">{c}</span>
                            <span className="text-[12px] text-muted-foreground truncate">{getClosestColorName(c)}</span>
                            {isLocked(palette.id, i) && <Lock className="w-3 h-3 ml-auto shrink-0" aria-hidden="true" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className="flex flex-col gap-5 pt-3" aria-label={t.save}>
          <SectionHeading title={<>{t.save} <span className="text-muted-foreground tabular">{favorites.length}</span></>} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {favorites.map(palette => (
              <Card
                as="article"
                key={palette.id}
                aria-label={palette.name}
                label={<span className="truncate">{palette.name}</span>}
                actions={
                  <IconButton label={t.remove} onClick={() => toggleFavorite(palette)}>
                    <X aria-hidden="true" />
                  </IconButton>
                }
              >
                <div className="flex h-16 rounded-md overflow-hidden">
                  {palette.colors.map((c, ci) => (
                    <div key={ci} className="flex-1" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => applyPalette(palette.colors)} className="ctl ctl-outline ctl-sm">{t.applyPalette}</button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {palettes.length === 0 && (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <RefreshCw className="w-6 h-6 text-muted-foreground opacity-50" aria-hidden="true" />
          <p className="text-[14px] text-muted-foreground">{t.shuffleToGenerate}</p>
        </div>
      )}
    </div>
  );
};

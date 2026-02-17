import React, { useState, useCallback, useRef, useEffect } from 'react';
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, isValidHex, getClosestColorName, getContrastColor } from '../utils/colorMath';
import { extractDominantColors } from '../utils/imageExtraction';
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
    wcagPass: best >= 4.5,
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
        wcagPass: best >= 4.5,
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

// --- Component ---

export const PaletteMagic: React.FC<PaletteMagicProps> = ({ initialHex, batchColors, onHexChange, onBatchColorsChange }) => {
  const { t } = useLanguage();
  const [context, setContext] = useState<DesignContext>('all');
  const [slotCount, setSlotCount] = useState(5);
  const [palettes, setPalettes] = useState<GeneratedPalette[]>([]);
  const [lockedColors, setLockedColors] = useState<Record<string, Record<number, string>>>({});
  const [shuffleCount, setShuffleCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<GeneratedPalette[]>([]);
  const [selectedSourceColor, setSelectedSourceColor] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const baseHex = isValidHex(initialHex) ? initialHex : '#F7E043';
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
    setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [sources, slotCount]);

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

      {/* Header */}
      <section className="text-center space-y-6">
        <div>
          <h2 className="font-mono text-xs font-bold text-gray-300 uppercase tracking-[0.5em] mb-2">{t.paletteMagic}</h2>
          <p className="font-mono text-[10px] text-gray-400 max-w-md mx-auto">
            Curated palettes with lock & shuffle. Freeze colors you love, regenerate the rest.
          </p>
        </div>

        {/* Source colors — click to select for injection into slots */}
        <div className="flex justify-center gap-2 flex-wrap items-center">
          <span className="font-mono text-[8px] text-gray-400 uppercase tracking-wider mr-1">
            {selectedSourceColor ? '← click a slot' : 'Source'}
          </span>
          {sources.map((c, i) => (
            <div key={i} className="relative group">
              <div
                className={`w-10 h-10 rounded-lg shadow-sm border-2 cursor-pointer hover:scale-110 transition-all ${
                  selectedSourceColor === c ? 'border-yellow-400 ring-2 ring-yellow-300 scale-110' : 'border-gray-100'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setSelectedSourceColor(prev => prev === c ? null : c)}
                title={selectedSourceColor === c ? 'Deselect' : 'Select to inject into a slot'}
              />
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-[6px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{c}</span>
            </div>
          ))}
          {/* Extract from image button */}
          <div className="relative">
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
              className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-all"
              title="Extract palette from image (JPG/PNG/WEBP)"
            >
              <span className="text-[14px]">🖼</span>
            </label>
          </div>
        </div>

        {/* Context pills */}
        <div className="flex justify-center flex-wrap gap-2">
          {contexts.map(ctx => (
            <button
              key={ctx.key}
              onClick={() => setContext(ctx.key)}
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

        {/* Slot count selector */}
        <div className="flex justify-center items-center gap-3">
          <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">{t.slots}:</span>
          {[3, 4, 5, 6, 7].map(n => (
            <button
              key={n}
              onClick={() => setSlotCount(n)}
              className="w-8 h-8 rounded-full font-mono text-[11px] font-bold transition-all border"
              style={slotCount === n
                ? { backgroundColor: '#232323', color: '#F0FF00', borderColor: '#232323' }
                : { backgroundColor: 'white', color: '#999', borderColor: '#E5E5E5' }
              }
            >
              {n}
            </button>
          ))}
        </div>

        {/* Shuffle button */}
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

      {/* Palette Grid */}
      {palettes.length > 0 && (
        <section ref={gridRef} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">
              {palettes.length} {t.paletteMagic}
            </h3>
            {favorites.length > 0 && (
              <span className="font-mono text-[9px] text-gray-400">★ {favorites.length} {t.save}</span>
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
                  {/* Color strip with lock icons */}
                  <div className="flex h-24">
                    {palette.colors.map((c, ci) => {
                      const locked = isLocked(palette.id, ci);
                      return (
                        <div
                          key={ci}
                          className={`flex-1 relative group/swatch hover:flex-[2] transition-[flex] duration-300 cursor-pointer ${
                            selectedSourceColor ? 'ring-inset hover:ring-2 hover:ring-yellow-400' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          onClick={() => {
                            if (selectedSourceColor) {
                              // Inject source color into this slot and ALWAYS lock it
                              const newColors = [...palette.colors];
                              newColors[ci] = selectedSourceColor;
                              const contrast = avgContrast(newColors);
                              const best = bestPairContrast(newColors);
                              setPalettes(prev => prev.map(p => p.id === palette.id ? { ...p, colors: newColors, contrastRatio: contrast, wcagPass: best >= 4.5 } : p));
                              // Force lock (don't toggle — always set)
                              setLockedColors(prev => ({
                                ...prev,
                                [palette.id]: { ...(prev[palette.id] || {}), [ci]: selectedSourceColor }
                              }));
                              setSelectedSourceColor(null);
                              showFeedback('Color injected & locked ✓');
                            } else {
                              setExpandedId(isExpanded ? null : palette.id);
                            }
                          }}
                        >
                          {/* Lock button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLock(palette.id, ci, c); }}
                            className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all z-10 ${
                              locked
                                ? 'opacity-100 bg-yellow-400/90 shadow-md scale-100'
                                : 'opacity-0 group-hover/swatch:opacity-70 hover:!opacity-100 bg-black/30'
                            }`}
                            title={locked ? t.unlockColor : t.lockColor}
                          >
                            <span style={{ color: locked ? '#232323' : '#fff' }}>
                              {locked ? '🔒' : '🔓'}
                            </span>
                          </button>

                          {/* Locked indicator border */}
                          {locked && (
                            <div className="absolute inset-0 border-2 border-yellow-400 pointer-events-none" />
                          )}

                          {/* Hex label */}
                          <span
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[7px] font-bold opacity-0 group-hover/swatch:opacity-100 transition-opacity whitespace-nowrap"
                            style={{ color: getContrastColor(c) }}
                          >
                            {c}
                          </span>
                        </div>
                      );
                    })}
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
                                <div className="flex gap-0.5">
                                  <div className="px-1.5 py-0.5 rounded text-[7px] font-bold leading-none" style={{ backgroundColor: c2, color: c1 }}>Aa</div>
                                  <div className="px-1.5 py-0.5 rounded text-[7px] font-bold leading-none" style={{ backgroundColor: c1, color: c2 }}>Aa</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="space-y-1">
                        {palette.colors.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-md px-1 py-0.5 -mx-1 transition-colors" onClick={() => onHexChange(c)}>
                            <div className="w-4 h-4 rounded-sm shadow-sm" style={{ backgroundColor: c }} />
                            <span className="font-mono text-[9px] text-gray-700 font-bold">{c}</span>
                            <span className="font-mono text-[8px] text-gray-400">{getClosestColorName(c)}</span>
                            {isLocked(palette.id, i) && <span className="text-[8px] text-yellow-500">🔒</span>}
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
          <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em]">★ {t.save} ({favorites.length})</h3>
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

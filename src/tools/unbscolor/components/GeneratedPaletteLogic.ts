/**
 * Pure logic behind the "Generated palettes" tab: weights that always sum to
 * 100, one-click distributions, sorting, reordering, harmonies from a base
 * colour and pixel coverage for the "from the image" distribution.
 * Nothing here touches the DOM, so all of it is unit-tested.
 */
import { getClosestColorName, hexToRgb, hslToRgb, mixColors, normalizeHex, rgbToHex, rgbToHsl } from '../utils/colorMath';
import { relativeLuminance } from '../utils/contrast';

export interface PaletteColor {
    hex: string;
    name: string;
    weight: number;
    locked: boolean;
}

/**
 * Integer weights, none negative, summing to exactly 100. The difference is
 * absorbed by unlocked items (preferring those other than `keepIndex`),
 * then by `keepIndex`, and only as a last resort by locked items.
 */
export const normalizeWeights = (list: PaletteColor[], keepIndex = -1): PaletteColor[] => {
    if (list.length === 0) return list;
    const out = list.map((c) => ({ ...c, weight: Math.max(0, Math.round(Number.isFinite(c.weight) ? c.weight : 0)) }));
    let diff = 100 - out.reduce((sum, c) => sum + c.weight, 0);
    if (diff === 0) return out;

    const indices = out.map((_, i) => i);
    const byWeight = (a: number, b: number) => (diff < 0 ? out[b].weight - out[a].weight : out[a].weight - out[b].weight);
    const order = [
        ...indices.filter((i) => !out[i].locked && i !== keepIndex).sort(byWeight),
        ...indices.filter((i) => i === keepIndex),
        ...indices.filter((i) => out[i].locked && i !== keepIndex).sort(byWeight)
    ];
    for (const i of order) {
        if (diff === 0) break;
        const next = Math.max(0, out[i].weight + diff);
        diff -= next - out[i].weight;
        out[i] = { ...out[i], weight: next };
    }
    return out;
};

/**
 * Builds palette entries for a list of hexes. Entries at the same position keep
 * their name (when the hex is unchanged) and their lock; locked entries keep
 * their weight and the rest is split evenly among the unlocked ones.
 */
export const evenWeights = (hexes: string[], previous: PaletteColor[] = []): PaletteColor[] => {
    const base = hexes.map((hex, i) => {
        const prev = previous[i];
        const same = prev && prev.hex.toUpperCase() === hex.toUpperCase();
        return {
            hex,
            name: same ? prev.name : getClosestColorName(hex),
            weight: prev && prev.locked ? prev.weight : 0,
            locked: prev ? prev.locked : false
        };
    });
    const lockedTotal = base.filter((c) => c.locked).reduce((sum, c) => sum + c.weight, 0);
    const unlocked = base.filter((c) => !c.locked).length;
    const per = unlocked > 0 ? Math.floor(Math.max(0, 100 - lockedTotal) / unlocked) : 0;
    return normalizeWeights(base.map((c) => (c.locked ? c : { ...c, weight: per })));
};

/**
 * Splits `total` into integers proportional to `ratios` (largest remainder
 * method), so the parts always add up to `total` exactly.
 */
export const largestRemainder = (ratios: number[], total: number): number[] => {
    if (ratios.length === 0) return [];
    const safe = ratios.map((r) => (Number.isFinite(r) && r > 0 ? r : 0));
    const sum = safe.reduce((a, b) => a + b, 0);
    const budget = Math.max(0, Math.round(total));
    if (sum === 0) return largestRemainder(safe.map(() => 1), budget);
    const exact = safe.map((r) => (r / sum) * budget);
    const floors = exact.map(Math.floor);
    let left = budget - floors.reduce((a, b) => a + b, 0);
    const order = exact
        .map((value, i) => ({ i, frac: value - Math.floor(value) }))
        .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (const { i } of order) {
        if (left <= 0) break;
        floors[i] += 1;
        left -= 1;
    }
    return floors;
};

export type WeightPreset = 'equal' | 'rule603010' | 'golden' | 'descending' | 'source';

export const WEIGHT_PRESETS: WeightPreset[] = ['equal', 'rule603010', 'golden', 'descending', 'source'];

const GOLDEN = (1 + Math.sqrt(5)) / 2;

/** Relative sizes for `n` colours, first colour first. */
export const presetRatios = (preset: Exclude<WeightPreset, 'source'>, n: number): number[] => {
    if (n <= 0) return [];
    switch (preset) {
        case 'rule603010': {
            // Dominant 60, secondary 30, the accent 10 shared by everything after.
            if (n === 1) return [1];
            if (n === 2) return [60, 30];
            const accents = n - 2;
            return [60, 30, ...Array.from({ length: accents }, () => 10 / accents)];
        }
        case 'golden':
            return Array.from({ length: n }, (_, i) => GOLDEN ** -i);
        case 'descending':
            return Array.from({ length: n }, (_, i) => n - i);
        default:
            return Array.from({ length: n }, () => 1);
    }
};

/**
 * Applies a distribution to the unlocked colours, in their current order.
 * Locked colours keep their weight; the rest share what they leave.
 * `source` uses measured coverage keyed by upper-case hex.
 */
export const applyWeightPreset = (
    list: PaletteColor[],
    preset: WeightPreset,
    sourceWeights?: Record<string, number> | null
): PaletteColor[] => {
    const unlocked = list.map((c, i) => (c.locked ? -1 : i)).filter((i) => i >= 0);
    if (unlocked.length === 0) return list;
    const lockedTotal = list.reduce((sum, c) => (c.locked ? sum + c.weight : sum), 0);
    const budget = Math.max(0, 100 - lockedTotal);

    let ratios: number[];
    if (preset === 'source') {
        ratios = unlocked.map((i) => sourceWeights?.[list[i].hex.toUpperCase()] ?? 0);
        // Anything the image did not measure still gets a sliver, so it stays visible.
        if (ratios.some((r) => r > 0)) ratios = ratios.map((r) => Math.max(r, 0.5));
    } else {
        ratios = presetRatios(preset, unlocked.length);
    }
    const parts = largestRemainder(ratios, budget);
    const out = list.map((c) => ({ ...c }));
    unlocked.forEach((index, k) => {
        out[index].weight = parts[k];
    });
    return normalizeWeights(out);
};

/** True when at least one colour in the palette has a measured coverage. */
export const hasSourceWeights = (list: PaletteColor[], sourceWeights?: Record<string, number> | null): boolean =>
    Boolean(sourceWeights) && list.some((c) => (sourceWeights?.[c.hex.toUpperCase()] ?? 0) > 0);

export type PaletteSortKey = 'weight' | 'lightness' | 'hue';

/** Reorders the palette; each colour keeps its own weight and lock. Stable. */
export const sortPalette = (list: PaletteColor[], key: PaletteSortKey): PaletteColor[] => {
    const decorated = list.map((c, i) => {
        const hsl = rgbToHsl(hexToRgb(c.hex));
        const lum = relativeLuminance(c.hex);
        return { c, i, hsl, lum: Number.isFinite(lum) ? lum : 0 };
    });
    decorated.sort((a, b) => {
        let d = 0;
        if (key === 'weight') d = b.c.weight - a.c.weight;
        else if (key === 'lightness') d = b.lum - a.lum;
        else {
            // Neutrals have no meaningful hue: they go last, light to dark.
            const aNeutral = a.hsl.s < 8;
            const bNeutral = b.hsl.s < 8;
            if (aNeutral !== bNeutral) d = aNeutral ? 1 : -1;
            else if (aNeutral) d = b.lum - a.lum;
            else d = a.hsl.h - b.hsl.h;
        }
        return d !== 0 ? d : a.i - b.i;
    });
    return decorated.map((d) => d.c);
};

/** Moves one colour to another position; weights and locks travel with it. */
export const moveColor = (list: PaletteColor[], from: number, to: number): PaletteColor[] => {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
    const next = list.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
};

/**
 * Appends colours. Each new colour takes an even share of 100; the unlocked
 * colours already there shrink in proportion, so their relative sizes hold.
 */
export const appendColors = (list: PaletteColor[], rawHexes: string[]): PaletteColor[] => {
    const hexes = rawHexes.map((h) => normalizeHex(h)).filter((h): h is string => Boolean(h));
    if (hexes.length === 0) return list;
    const count = list.length + hexes.length;
    const lockedTotal = list.reduce((sum, c) => (c.locked ? sum + c.weight : sum), 0);
    const freeBudget = Math.max(0, 100 - lockedTotal);
    const unlocked = list.filter((c) => !c.locked);
    // With nothing unlocked to shrink, new colours can only take what locks leave.
    const perNew = unlocked.length === 0
        ? Math.floor(freeBudget / hexes.length)
        : Math.min(Math.floor(100 / count), Math.floor(freeBudget / (hexes.length + 1)));
    const newTotal = perNew * hexes.length;
    const existingParts = largestRemainder(unlocked.map((c) => c.weight || 1), Math.max(0, freeBudget - newTotal));
    let k = 0;
    const kept = list.map((c) => (c.locked ? { ...c } : { ...c, weight: existingParts[k++] }));
    const added = hexes.map((hex) => ({ hex, name: getClosestColorName(hex), weight: perNew, locked: false }));
    return normalizeWeights([...kept, ...added], kept.length);
};

/** Removes a colour and hands its weight to the unlocked ones in proportion. */
export const removeColorAt = (list: PaletteColor[], index: number): PaletteColor[] => {
    if (list.length <= 2 || !list[index]) return list;
    const remaining = list.filter((_, i) => i !== index);
    const lockedTotal = remaining.reduce((sum, c) => (c.locked ? sum + c.weight : sum), 0);
    const unlocked = remaining.filter((c) => !c.locked);
    if (unlocked.length === 0) return normalizeWeights(remaining);
    const parts = largestRemainder(unlocked.map((c) => c.weight || 1), Math.max(0, 100 - lockedTotal));
    let k = 0;
    return normalizeWeights(remaining.map((c) => (c.locked ? c : { ...c, weight: parts[k++] })));
};

/** Sets one weight; the other unlocked colours absorb the difference in proportion. */
export const setWeightAt = (list: PaletteColor[], index: number, requested: number): PaletteColor[] => {
    const current = list[index];
    if (!current || !Number.isFinite(requested)) return list;
    const others = list.map((_, i) => i).filter((i) => i !== index && !list[i].locked);
    if (others.length === 0) return list;
    const lockedTotal = list.reduce((sum, c, i) => (c.locked && i !== index ? sum + c.weight : sum), 0);
    const nextWeight = Math.max(0, Math.min(Math.round(requested), 100 - lockedTotal));
    if (nextWeight === current.weight) return list;
    const rest = Math.max(0, 100 - lockedTotal - nextWeight);
    const parts = largestRemainder(others.map((i) => list[i].weight || 1), rest);
    const out = list.map((c) => ({ ...c }));
    out[index].weight = nextWeight;
    others.forEach((i, k) => {
        out[i].weight = parts[k];
    });
    return normalizeWeights(out, index);
};

export type HarmonyKind = 'complementary' | 'analogous' | 'triad' | 'monochromatic';

export const HARMONY_KINDS: HarmonyKind[] = ['complementary', 'analogous', 'triad', 'monochromatic'];

const fromHsl = (h: number, s: number, l: number) => {
    const rgb = hslToRgb({ h: ((h % 360) + 360) % 360, s, l: Math.max(0, Math.min(100, l)) });
    return rgbToHex(rgb.r, rgb.g, rgb.b);
};

/** Colours derived from `baseHex`, never including the base itself. */
export const harmonyFrom = (baseHex: string, kind: HarmonyKind): string[] => {
    const hex = normalizeHex(baseHex);
    if (!hex) return [];
    const { h, s, l } = rgbToHsl(hexToRgb(hex));
    let out: string[];
    switch (kind) {
        case 'complementary':
            out = [fromHsl(h + 180, s, l)];
            break;
        case 'analogous':
            out = [fromHsl(h - 30, s, l), fromHsl(h + 30, s, l)];
            break;
        case 'triad':
            out = [fromHsl(h + 120, s, l), fromHsl(h + 240, s, l)];
            break;
        default: {
            // Two steps each way, kept inside a printable lightness range.
            const steps = [-30, -15, 15, 30].map((d) => Math.max(6, Math.min(96, l + d)));
            out = steps.map((ll) => fromHsl(h, s, ll));
        }
    }
    const seen = new Set<string>([hex.toUpperCase()]);
    return out.filter((c) => {
        const key = c.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

/**
 * Share of opaque pixels closest to each palette colour, in whole percent
 * summing to 100. Returns all zeros when no pixel is opaque.
 */
export const coverageWeights = (data: ArrayLike<number>, hexes: string[]): number[] => {
    if (hexes.length === 0) return [];
    const targets = hexes.map((h) => hexToRgb(h));
    const counts = new Array<number>(hexes.length).fill(0);
    let opaque = 0;
    for (let i = 0; i + 3 < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        opaque += 1;
        let best = 0;
        let bestDist = Infinity;
        for (let j = 0; j < targets.length; j++) {
            const dr = targets[j].r - data[i];
            const dg = targets[j].g - data[i + 1];
            const db = targets[j].b - data[i + 2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                best = j;
            }
        }
        counts[best] += 1;
    }
    if (opaque === 0) return counts;
    return largestRemainder(counts, 100);
};

/** Fallback when an SVG cannot be rasterised: how often each colour is written. */
export const occurrenceWeights = (text: string, hexes: string[]): number[] => {
    const upper = text.toUpperCase();
    const counts = hexes.map((hex) => {
        const full = hex.toUpperCase();
        const short = /^#(.)\1(.)\2(.)\3$/.test(full) ? `#${full[1]}${full[3]}${full[5]}` : null;
        const hits = (needle: string) => upper.split(needle).length - 1;
        return hits(full) + (short ? hits(`${short}"`) + hits(`${short};`) + hits(`${short}'`) : 0);
    });
    return counts.some((c) => c > 0) ? largestRemainder(counts, 100) : counts;
};

/** Upper-case hex → weight map, for `applyWeightPreset(..., 'source', map)`. */
export const toWeightMap = (hexes: string[], weights: number[]): Record<string, number> => {
    const map: Record<string, number> = {};
    hexes.forEach((hex, i) => {
        map[hex.toUpperCase()] = weights[i] ?? 0;
    });
    return map;
};

export type BasePosition = 'none' | 'above' | 'center' | 'below';

/** Tints then shades of `hex`, with the base itself placed as asked. */
export const colorVariations = (hex: string, count: number, basePosition: BasePosition): string[] => {
    const rgb = hexToRgb(hex);
    const mix = (_: string, towards: 'white' | 'black', pct: number) => {
        const target = towards === 'white' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
        const m = mixColors(rgb, target, pct);
        return rgbToHex(m.r, m.g, m.b);
    };
    const variations: string[] = [];
    for (let i = count; i >= 1; i--) variations.push(mix(hex, 'white', (i / count) * 60));
    if (basePosition === 'above') variations.unshift(hex);
    else if (basePosition === 'center') variations.push(hex);
    for (let i = 1; i <= count; i++) variations.push(mix(hex, 'black', (i / count) * 60));
    if (basePosition === 'below') variations.push(hex);
    return variations;
};

/** "40%" — whole numbers only, the way weights are stored. */
export const formatPercent = (weight: number): string => `${Math.round(weight)}%`;

/** Share of the total, in percent, for layouts that must fill a length. */
export const shareOf = (weight: number, total: number): number => (total > 0 ? (weight / total) * 100 : 0);

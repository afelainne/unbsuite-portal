/**
 * SVG renderers for the colour interaction squares (Albers study) of the
 * "Generated palettes" tab. Same sizing contract as the sheet renderers:
 * canvas size plus a `unit`, so labels stay legible on screen and in export.
 * Under each cell, when asked, the label gives the outer hex and the weight
 * each layer colour has in the palette.
 */
import { escapeXml } from '../utils/escape';
import { hexToRgb, mixColors, rgbToHex } from '../utils/colorMath';
import { formatPercent } from './GeneratedPaletteLogic';
import { fitText, inkOn } from './GeneratedPaletteSheets';

export interface AlbersCombo {
    outer: string;
    middle: string;
    inner: string;
}

export type AlbersTemplate = 'squares' | 'circles' | 'sunset' | 'bars' | 'rings' | 'diamonds' | 'frames' | 'split' | 'targets' | 'triangles';

export const ALBERS_TEMPLATES: AlbersTemplate[] = ['squares', 'circles', 'sunset', 'bars', 'rings', 'diamonds', 'frames', 'split', 'targets', 'triangles'];

export interface AlbersOptions {
    width: number;
    height: number;
    unit: number;
    background: string;
    layerCount: 2 | 3 | 4;
    showHex: boolean;
    showPercent: boolean;
    /** Palette weight of a colour, or undefined when it is not in the palette. */
    weightOf: (hex: string) => number | undefined;
    /** Area of each layer follows its weight in the palette (nested templates and bars). */
    proportional?: boolean;
    forExport: boolean;
}

/** Most cells each template can hold before shapes get too small. */
export const maxCardsFor = (template: AlbersTemplate): number => {
    switch (template) {
        case 'sunset': return 20;
        case 'bars': return 12;
        case 'squares':
        case 'circles':
        case 'rings': return 18;
        default: return 16;
    }
};

/** Outer, middle, inner and, with four layers, a middle–inner blend. */
export const comboLayers = (combo: AlbersCombo, layerCount: 2 | 3 | 4): string[] => {
    const layers: string[] = [combo.outer, combo.middle];
    if (layerCount >= 3) layers.push(combo.inner);
    if (layerCount === 4) {
        const blend = mixColors(hexToRgb(combo.middle), hexToRgb(combo.inner), 50);
        layers.push(rgbToHex(blend.r, blend.g, blend.b));
    }
    return layers.slice(0, layerCount);
};

/** "40 · 20 · 10%" for the layers that are palette colours. */
export const comboWeightsLabel = (layers: string[], weightOf: (hex: string) => number | undefined): string => {
    const values = layers.map(weightOf).filter((w): w is number => typeof w === 'number');
    if (values.length === 0) return '';
    return values.length === 1 ? formatPercent(values[0]) : `${values.map((v) => Math.round(v)).join(' · ')}%`;
};

/**
 * Side factors of nested layers (outer = 1) so that the area each layer shows
 * is proportional to its weight in the palette: with sides s₀ > s₁ > s₂, the
 * outer shows s₀² − s₁², the middle s₁² − s₂² and the centre s₂², so
 * sₖ = s₀ · √(Σⱼ≥ₖ wⱼ / Σ w). A colour outside the palette (a manual pick)
 * counts as the mean of the others. Every ring keeps at least a visible band
 * and the centre never shrinks below `minCentre`.
 */
export const proportionalScales = (
    layers: string[],
    weightOf: (hex: string) => number | undefined,
    minCentre = 0.2,
    maxStep = 0.9
): number[] => {
    const raw = layers.map(weightOf);
    const known = raw.filter((w): w is number => typeof w === 'number' && w > 0);
    const fallback = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
    const weights = raw.map((w) => (typeof w === 'number' && w > 0 ? w : fallback));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const scales = weights.map((_, k) => Math.sqrt(weights.slice(k).reduce((a, b) => a + b, 0) / total));
    // Keep each ring readable: never closer than `maxStep` to the layer outside it.
    for (let k = 1; k < scales.length; k++) scales[k] = Math.min(scales[k], scales[k - 1] * maxStep);
    const last = scales.length - 1;
    if (last > 0 && scales[last] < minCentre) {
        // Too small a centre: lift it and the rings above it in proportion.
        const lift = minCentre / scales[last];
        for (let k = 1; k <= last; k++) scales[k] = Math.min(scales[k] * lift, scales[k - 1] * maxStep);
    }
    return scales;
};

/** Default nested factors per template, used when areas don't follow the weights. */
const FIXED_SCALES = [1, 0.65, 0.4, 0.22];

const r1 = (n: number) => Math.round(n * 10) / 10;

interface Cell { x: number; y: number; w: number; h: number }

/** Chooses the column count that gives the largest square cells. */
const gridCells = (count: number, W: number, H: number, pad: number, gap: number): Cell[] => {
    let bestCols = 1;
    let bestFit = 0;
    for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
        const ch = (H - pad * 2 - gap * (rows - 1)) / rows;
        const size = Math.min(cw, ch);
        const last = count % cols || cols;
        const fit = size * size * count * (last / cols);
        if (fit > bestFit) {
            bestFit = fit;
            bestCols = cols;
        }
    }
    const rows = Math.ceil(count / bestCols);
    const cw = (W - pad * 2 - gap * (bestCols - 1)) / bestCols;
    const ch = (H - pad * 2 - gap * (rows - 1)) / rows;
    return Array.from({ length: count }, (_, i) => ({
        x: pad + (i % bestCols) * (cw + gap),
        y: pad + Math.floor(i / bestCols) * (ch + gap),
        w: cw,
        h: ch
    }));
};

const shapeFor = (template: AlbersTemplate, combo: AlbersCombo, layers: string[], c: Cell, u: number, scales: number[] | null): string => {
    /** Nested factor of layer i: proportional when asked, the template's own otherwise. */
    const fOf = (fixed: number[]) => (i: number) => (scales ? scales[i] : fixed[i]);
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    const m = Math.min(c.w, c.h);
    switch (template) {
        case 'circles': {
            const f = fOf([1, 0.65, 0.42, 0.26]);
            return layers.map((col, i) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(m * 0.44 * f(i))}" fill="${col}" />`).join('');
        }
        case 'sunset': {
            const f = [1, 0.65, 0.42, 0.26];
            return `<rect x="${r1(c.x)}" y="${r1(c.y)}" width="${r1(c.w)}" height="${r1(c.h)}" rx="${r1(8 * u)}" fill="${combo.outer}" />` +
                layers.map((col, i) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(m * 0.38 * f[i])}" fill="${col}" />`).join('');
        }
        case 'bars': {
            const span = c.h - 40 * u;
            const top = c.y + 40 * u;
            const circleR = Math.min(15 * u, c.w * 0.15);
            // Proportional: each band's height is its share (scales² differences are the shares).
            const shares = scales
                ? scales.map((sc, i) => sc * sc - (i + 1 < scales.length ? scales[i + 1] * scales[i + 1] : 0))
                : layers.map(() => 1 / layers.length);
            const sum = shares.reduce((a, b) => a + b, 0) || 1;
            let y = top;
            return layers.map((col, i) => {
                const h = (span * shares[i]) / sum;
                const rect = `<rect x="${r1(c.x)}" y="${r1(y)}" width="${r1(c.w)}" height="${r1(h + 0.5)}" fill="${col}" />`;
                y += h;
                return rect;
            }).join('') +
                `<circle cx="${r1(cx)}" cy="${r1(top - 20 * u)}" r="${r1(circleR)}" fill="${layers[1] || layers[0]}" stroke="${layers[0]}" stroke-width="${r1(3 * u)}" />`;
        }
        case 'rings': {
            const r = m * 0.42;
            return `<rect x="${r1(c.x)}" y="${r1(c.y)}" width="${r1(c.w)}" height="${r1(c.h)}" fill="${combo.middle}" /><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="none" stroke="${combo.outer}" stroke-width="${r1(r * 0.35)}" /><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r * 0.5)}" fill="${combo.inner}" />`;
        }
        case 'diamonds': {
            const f = fOf([1, 0.65, 0.4, 0.22]);
            const size = m * 0.7;
            return layers.map((col, i) => {
                const s = size * f(i);
                return `<rect x="${r1(cx - s / 2)}" y="${r1(cy - s / 2)}" width="${r1(s)}" height="${r1(s)}" fill="${col}" transform="rotate(45 ${r1(cx)} ${r1(cy)})" />`;
            }).join('');
        }
        case 'frames': {
            const f = fOf([1, 0.78, 0.55, 0.32]);
            const size = m * 0.92;
            return layers.map((col, i) => {
                const s = size * f(i);
                const off = i > 0 ? s * 0.08 : 0;
                return `<rect x="${r1(cx - s / 2)}" y="${r1(cy - s / 2 + off)}" width="${r1(s)}" height="${r1(s)}" fill="${col}" />`;
            }).join('');
        }
        case 'split': {
            const half = c.w / 2;
            return `<rect x="${r1(c.x)}" y="${r1(c.y)}" width="${r1(half)}" height="${r1(c.h)}" fill="${combo.outer}" /><rect x="${r1(c.x + half)}" y="${r1(c.y)}" width="${r1(half)}" height="${r1(c.h)}" fill="${combo.middle}" /><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(m * 0.18)}" fill="${combo.inner}" />`;
        }
        case 'targets': {
            const seq = [combo.outer, combo.middle, combo.inner, combo.outer, combo.middle];
            return [1, 0.78, 0.58, 0.4, 0.22].map((rf, i) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(m * 0.45 * rf)}" fill="${seq[i]}" />`).join('');
        }
        case 'triangles': {
            const f = fOf([1, 0.7, 0.45, 0.25]);
            const size = m * 0.85;
            return layers.map((col, i) => {
                const s = size * f(i);
                const h = s * 0.866;
                const pts = i % 2 === 1
                    ? `${r1(cx - s / 2)},${r1(cy - h / 2)} ${r1(cx + s / 2)},${r1(cy - h / 2)} ${r1(cx)},${r1(cy + h / 2)}`
                    : `${r1(cx - s / 2)},${r1(cy + h / 2)} ${r1(cx + s / 2)},${r1(cy + h / 2)} ${r1(cx)},${r1(cy - h / 2)}`;
                return `<polygon points="${pts}" fill="${col}" />`;
            }).join('');
        }
        default: {
            const f = fOf(FIXED_SCALES);
            const size = m * 0.85;
            return layers.map((col, i) => {
                const s = size * f(i);
                return `<rect x="${r1(cx - s / 2)}" y="${r1(cy - s / 2)}" width="${r1(s)}" height="${r1(s)}" fill="${col}" />`;
            }).join('');
        }
    }
};

export const renderAlbers = (template: AlbersTemplate, combos: AlbersCombo[], o: AlbersOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const mono = o.forExport ? "'JetBrains Mono', ui-monospace, monospace" : 'ui-monospace, SFMono-Regular, Menlo, monospace';
    const style = o.forExport
        ? `<style>@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style>`
        : '';
    const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}" role="img">${style}<rect width="100%" height="100%" fill="${o.background}" />`;
    if (combos.length === 0) return `${head}</svg>`;

    const labelled = o.showHex || o.showPercent;
    const labelSize = 12 * u;
    const labelH = labelled ? labelSize * 2 : 0;
    const pad = (template === 'bars' ? 48 : 40) * u;
    const gap = (template === 'sunset' || template === 'split' ? 16 : 28) * u;
    const cells: Cell[] = template === 'bars'
        ? combos.map((_, i) => {
            const w = (W - pad * 2 - gap * (combos.length - 1)) / combos.length;
            return { x: pad + i * (w + gap), y: pad, w, h: H - pad * 2 };
        })
        : gridCells(combos.length, W, H, pad, gap);

    const ink = inkOn(o.background);
    const body = combos.map((combo, i) => {
        const c = cells[i];
        const shapeCell = { ...c, h: c.h - labelH };
        const layers = comboLayers(combo, o.layerCount);
        const scales = o.proportional ? proportionalScales(layers, o.weightOf) : null;
        let svg = shapeFor(template, combo, layers, shapeCell, u, scales);
        if (labelled) {
            const parts = [o.showHex ? combo.outer.toUpperCase() : '', o.showPercent ? comboWeightsLabel(layers, o.weightOf) : ''].filter(Boolean);
            const s = fitText(parts.join('  '), labelSize, c.w, true);
            if (s) svg += `<text x="${r1(c.x + c.w / 2)}" y="${r1(c.y + c.h - labelSize * 0.45)}" font-size="${r1(labelSize)}" font-family="${mono}" fill="${ink}" opacity="0.85" text-anchor="middle">${escapeXml(s)}</text>`;
        }
        return `<g>${svg}</g>`;
    }).join('');
    return `${head}${body}</svg>`;
};

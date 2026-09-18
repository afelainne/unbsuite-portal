/**
 * SVG renderers for the colour sheet of the "Generated palettes" tab.
 *
 * Every renderer takes the canvas size and a `unit` (px per design px), so
 * the on-screen preview is drawn at the width it is shown (text never falls
 * under 11px) and the export is drawn at 1920×1080 with the same layout.
 * Block sizes follow each colour's weight; labels are skipped or trimmed
 * when they do not fit, never squeezed.
 */
import { escapeXml } from '../utils/escape';
import { isValidHex } from '../utils/colorMath';
import { relativeLuminance } from '../utils/contrast';
import { BasePosition, colorVariations, formatPercent } from './GeneratedPaletteLogic';

export interface SheetColor {
    hex: string;
    name: string;
    weight: number;
    /** Extra codes (RGB, CMYK, references…), hex excluded: it has its own switch. */
    codes: string[];
}

export interface SheetShow {
    name: boolean;
    hex: boolean;
    percent: boolean;
    codes: boolean;
}

export interface SheetOptions {
    width: number;
    height: number;
    /** Design px → canvas px. 1 on screen, 1.6 for the 1920 export. */
    unit: number;
    show: SheetShow;
    variations: boolean;
    variationCodes: boolean;
    variationCount: number;
    basePosition: BasePosition;
    splitRatio: number;
    forExport: boolean;
    idPrefix?: string;
}

export type SheetTemplate =
    | 'classic' | 'vertical' | 'swatches' | 'bars' | 'ring'
    | 'grid' | 'cards' | 'stripes' | 'gradient' | 'mosaic' | 'splitscreen' | 'columns' | 'dots' | 'editorial';

/** The five view modes offered up front: sheet, strip, grid, bars, ring. */
export const PRIMARY_SHEET_VIEWS: SheetTemplate[] = ['classic', 'vertical', 'swatches', 'bars', 'ring'];
/** Other layouts, behind "more layouts". */
export const EXTRA_SHEET_TEMPLATES: SheetTemplate[] = ['grid', 'cards', 'stripes', 'gradient', 'mosaic', 'splitscreen', 'columns', 'dots', 'editorial'];

/** Templates whose layout draws tints and shades. */
export const TEMPLATES_WITH_VARIATIONS: SheetTemplate[] = ['classic', 'grid', 'cards'];

const INK = '#111111';
const INK_SOFT = '#6E6D70';
const EDGE = '#DBDADD';

const r1 = (n: number) => Math.round(n * 10) / 10;

export const inkOn = (hex: string) => (isValidHex(hex) && relativeLuminance(hex) > 0.5 ? '#000000' : '#FFFFFF');

/** A hairline around colours that would vanish on a light background. */
const edgeFor = (hex: string, u: number) =>
    isValidHex(hex) && relativeLuminance(hex) > 0.85 ? ` stroke="${EDGE}" stroke-width="${r1(u)}"` : '';

interface Fonts { sans: string; mono: string }
const fontsFor = (o: SheetOptions): Fonts =>
    o.forExport
        ? { sans: "'BDO Grotesk', 'Urbanist', system-ui, sans-serif", mono: "'JetBrains Mono', ui-monospace, monospace" }
        : { sans: "'BDO Grotesk', system-ui, sans-serif", mono: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

const approxWidth = (s: string, size: number, mono: boolean) => s.length * size * (mono ? 0.61 : 0.58);

/** Trims to the width, with an ellipsis; empty when not even three letters fit. */
export const fitText = (s: string, size: number, maxW: number, mono = false): string => {
    if (!s) return '';
    if (approxWidth(s, size, mono) <= maxW) return s;
    const n = Math.floor(maxW / (size * (mono ? 0.61 : 0.58))) - 1;
    return n >= 3 ? `${s.slice(0, n)}…` : '';
};

interface TextOpts {
    x: number;
    y: number;
    s: string;
    size: number;
    fill: string;
    f: Fonts;
    weight?: number;
    mono?: boolean;
    anchor?: 'start' | 'middle' | 'end';
    opacity?: number;
    transform?: string;
}
const text = ({ x, y, s, size, fill, f, weight = 400, mono = false, anchor = 'start', opacity = 1, transform }: TextOpts) =>
    s
        ? `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(size)}" font-family="${mono ? f.mono : f.sans}" font-weight="${weight}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${transform ? ` transform="${transform}"` : ''}>${escapeXml(s)}</text>`
        : '';

interface StackSizes { name: number; meta: number; code: number }

/**
 * Name, then "hex · percent", then codes, top-down, while they fit.
 * `withPercent` puts the percentage on the meta line (otherwise it is drawn
 * big elsewhere by the template).
 */
const labelStack = (
    c: SheetColor,
    x: number,
    y: number,
    maxW: number,
    maxH: number,
    o: SheetOptions,
    f: Fonts,
    fill: string,
    sizes: StackSizes,
    withPercent = false,
    anchor: 'start' | 'middle' = 'start'
): string => {
    if (maxW <= 0 || maxH <= 0) return '';
    const lines: { s: string; size: number; weight: number; mono: boolean; opacity: number }[] = [];
    if (o.show.name && c.name) lines.push({ s: c.name, size: sizes.name, weight: 600, mono: false, opacity: 1 });
    const meta = [o.show.hex ? c.hex.toUpperCase() : '', withPercent && o.show.percent ? formatPercent(c.weight) : '']
        .filter(Boolean)
        .join('  ·  ');
    if (meta) lines.push({ s: meta, size: sizes.meta, weight: 400, mono: true, opacity: 0.85 });
    if (o.show.codes) c.codes.forEach((code) => lines.push({ s: code, size: sizes.code, weight: 400, mono: true, opacity: 0.72 }));

    let out = '';
    let cursor = y;
    for (const line of lines) {
        const lh = line.size * 1.3;
        if (cursor + lh > y + maxH + 0.5) break;
        const s = fitText(line.s, line.size, maxW, line.mono);
        if (!s) break;
        out += text({ x, y: cursor + line.size, s, size: line.size, fill, f, weight: line.weight, mono: line.mono, opacity: line.opacity, anchor });
        cursor += lh;
    }
    return out;
};

const wrap = (o: SheetOptions, body: string, bg?: string, defs = '') => {
    const { width: W, height: H } = o;
    const style = o.forExport
        ? `<style>@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style>`
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}" role="img">${style}${defs ? `<defs>${defs}</defs>` : ''}${bg ? `<rect width="100%" height="100%" fill="${bg}" />` : ''}${body}</svg>`;
};

const shares = (colors: SheetColor[]) => {
    const total = colors.reduce((s, c) => s + Math.max(0, c.weight), 0);
    return colors.map((c) => (total > 0 ? Math.max(0, c.weight) / total : 1 / Math.max(colors.length, 1)));
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The block's own big percentage. Returns the svg and the width it takes. */
const bigPercent = (c: SheetColor, x: number, y: number, size: number, fill: string, f: Fonts, anchor: 'start' | 'middle' | 'end' = 'end') => {
    const s = formatPercent(c.weight);
    return { svg: text({ x, y, s, size, fill, f, weight: 600, anchor }), width: approxWidth(s, size, false) };
};

const baseSizes = (u: number): StackSizes => ({ name: 18 * u, meta: 12 * u, code: 11 * u });

// ---------------------------------------------------------------- primary views

/** Sheet: stacked blocks, height by weight, tints and shades at the side. */
const renderClassic = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const mainW = o.variations ? W * clamp(o.splitRatio, 20, 90) / 100 : W;
    // Narrow sheets (phones) tighten padding and type so the name still fits.
    const pad = clamp(mainW * 0.06, 10 * u, 24 * u);
    const sizes = { ...baseSizes(u), name: clamp(mainW * 0.05, 13 * u, 18 * u) };
    const s = shares(colors);
    let y = 0;
    const blocks = colors.map((c, i) => {
        const h = s[i] * H;
        const fill = inkOn(c.hex);
        let svg = `<rect x="0" y="${r1(y)}" width="${r1(mainW)}" height="${r1(h + 0.5)}" fill="${c.hex}" />`;
        let reserved = 0;
        if (o.show.percent && h >= 16 * u) {
            const size = clamp(Math.min(h * 0.42, 40 * u, mainW * 0.14), 12 * u, 40 * u);
            const top = h >= size + 2 * pad ? pad : (h - size) / 2;
            const p = bigPercent(c, mainW - pad, y + top + size * 0.82, size, fill, f);
            svg += p.svg;
            reserved = p.width + 10 * u;
        }
        const top = h >= 3 * pad ? pad : Math.max(2 * u, (h - sizes.name * 1.3) / 2);
        svg += labelStack(c, pad, y + top, mainW - 2 * pad - reserved, h - top - 4 * u, o, f, fill, sizes);
        y += h;
        return svg;
    }).join('');

    let variations = '';
    if (o.variations && colors.length) {
        const colW = (W - mainW) / colors.length;
        variations = colors.map((c, ci) => {
            const vars = colorVariations(c.hex, o.variationCount, o.basePosition);
            const vh = H / vars.length;
            const size = 11 * u;
            const showCode = o.variationCodes && colW >= approxWidth('#FFFFFF', size, true) + 12 * u && vh >= size + 8 * u;
            return vars.map((v, ri) =>
                `<rect x="${r1(mainW + ci * colW)}" y="${r1(ri * vh)}" width="${r1(colW + 0.5)}" height="${r1(vh + 0.5)}" fill="${v}" />` +
                (showCode ? text({ x: mainW + ci * colW + 8 * u, y: ri * vh + (vh + size * 0.7) / 2, s: v, size, fill: inkOn(v), f, mono: true, opacity: 0.85 }) : '')
            ).join('');
        }).join('');
    }
    return wrap(o, blocks + variations, '#000000');
};

/** Strip: colours side by side, width by weight. */
const renderVertical = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const sizes = baseSizes(u);
    const s = shares(colors);
    let x = 0;
    const body = colors.map((c, i) => {
        const w = s[i] * W;
        const fill = inkOn(c.hex);
        const pad = clamp(w * 0.12, 6 * u, 20 * u);
        let svg = `<rect x="${r1(x)}" y="0" width="${r1(w + 0.5)}" height="${r1(H)}" fill="${c.hex}" />`;
        let bottom = 0;
        if (o.show.percent) {
            const size = clamp(Math.min(w * 0.3, 56 * u), 12 * u, 56 * u);
            const s = formatPercent(c.weight);
            if (approxWidth(s, size, false) <= w - 2 * pad + 1) {
                svg += text({ x: x + pad, y: H - pad, s, size, fill, f, weight: 600 });
                bottom = size + pad;
            }
        }
        svg += labelStack(c, x + pad, pad, w - 2 * pad, H - 2 * pad - bottom - 8 * u, o, f, fill, sizes);
        x += w;
        return svg;
    }).join('');
    return wrap(o, body, '#000000');
};

/** Grid: equal cells, each with its percentage. */
const renderSwatches = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const n = Math.max(colors.length, 1);
    const gap = 16 * u;
    const cols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * (W / H)))));
    const rows = Math.ceil(n / cols);
    const cellW = (W - gap * (cols + 1)) / cols;
    const cellH = (H - gap * (rows + 1)) / rows;
    const sizes = { name: clamp(cellW * 0.08, 13 * u, 24 * u), meta: 12 * u, code: 11 * u };
    const body = colors.map((c, i) => {
        const x = gap + (i % cols) * (cellW + gap);
        const y = gap + Math.floor(i / cols) * (cellH + gap);
        const fill = inkOn(c.hex);
        const pad = clamp(cellW * 0.08, 10 * u, 24 * u);
        let svg = `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(cellW)}" height="${r1(cellH)}" rx="${r1(12 * u)}" fill="${c.hex}"${edgeFor(c.hex, u)} />`;
        let bottom = 0;
        if (o.show.percent) {
            const size = clamp(Math.min(cellH * 0.26, cellW * 0.24, 48 * u), 12 * u, 48 * u);
            svg += text({ x: x + pad, y: y + cellH - pad, s: formatPercent(c.weight), size, fill, f, weight: 600 });
            bottom = size + 6 * u;
        }
        svg += labelStack(c, x + pad, y + pad, cellW - 2 * pad, cellH - 2 * pad - bottom, o, f, fill, sizes);
        return svg;
    }).join('');
    return wrap(o, body, '#F5F5F5');
};

/** Proportional bars: bar length by weight, percentage at the end. */
const renderBars = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const n = Math.max(colors.length, 1);
    const pad = 32 * u;
    const rowH = Math.min((H - 2 * pad) / n, 96 * u);
    const top = (H - rowH * n) / 2;
    const labelW = W >= 720 * u ? Math.min(W * 0.28, 320 * u) : W * 0.36;
    const pctSize = clamp(rowH * 0.36, 12 * u, 28 * u);
    const pctW = o.show.percent ? approxWidth('100%', pctSize, false) + 12 * u : 0;
    const x0 = pad + labelW;
    const avail = Math.max(10 * u, W - x0 - pad - pctW);
    const s = shares(colors);
    const maxShare = Math.max(...s, 0.0001);
    const sizes = { name: clamp(rowH * 0.24, 13 * u, 18 * u), meta: 12 * u, code: 11 * u };
    const body = colors.map((c, i) => {
        const y = top + i * rowH;
        const barH = Math.max(6 * u, rowH * 0.6);
        const barY = y + (rowH - barH) / 2;
        const len = Math.max(2 * u, (s[i] / maxShare) * avail);
        let svg = `<rect x="${r1(x0)}" y="${r1(barY)}" width="${r1(len)}" height="${r1(barH)}" rx="${r1(Math.min(6 * u, barH / 2))}" fill="${c.hex}"${edgeFor(c.hex, u)} />`;
        svg += `<rect x="${r1(x0)}" y="${r1(y + rowH - 0.5 * u)}" width="${r1(W - x0 - pad)}" height="${r1(Math.max(1, 0.5 * u))}" fill="#E8E7EA" />`;
        if (o.show.percent) svg += text({ x: x0 + len + 10 * u, y: y + rowH / 2 + pctSize * 0.35, s: formatPercent(c.weight), size: pctSize, fill: INK, f, weight: 600 });
        const labelTop = y + Math.max(2 * u, (rowH - sizes.name * 1.3 - sizes.meta * 1.3) / 2);
        svg += labelStack(c, pad, labelTop, labelW - 16 * u, y + rowH - labelTop - 2 * u, o, f, INK, sizes);
        return svg;
    }).join('');
    return wrap(o, body, '#FFFFFF');
};

/** Ring: a doughnut whose arcs follow the weights, plus a legend. */
const renderRing = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const pad = 32 * u;
    const landscape = W >= H * 1.1;
    // Portrait: the ring shrinks until the whole legend fits below it.
    const legendNeed = colors.length * 22 * u + 28 * u;
    const R = landscape
        ? Math.min(H / 2 - pad, W * 0.26)
        : Math.max(40 * u, Math.min(W / 2 - pad, H * 0.3, (H - 2 * pad - legendNeed) / 2));
    const cx = landscape ? pad + R + 16 * u : W / 2;
    const cy = landscape ? H / 2 : pad + R;
    const thick = R * 0.38;
    const rm = R - thick / 2;
    const C = 2 * Math.PI * rm;
    const s = shares(colors);
    let cum = 0;
    let arcs = '';
    let labels = '';
    colors.forEach((c, i) => {
        const len = s[i] * C;
        arcs += `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rm)}" fill="none" stroke="${c.hex}" stroke-width="${r1(thick)}" stroke-dasharray="${r1(len)} ${r1(Math.max(0, C - len))}" stroke-dashoffset="${r1(-cum * C)}" transform="rotate(-90 ${r1(cx)} ${r1(cy)})" />`;
        if (o.show.percent) {
            const size = clamp(thick * 0.3, 11 * u, 22 * u);
            const label = formatPercent(c.weight);
            if (len >= approxWidth(label, size, false) + 8 * u && s[i] < 0.999) {
                const a = (cum + s[i] / 2) * 2 * Math.PI - Math.PI / 2;
                labels += text({ x: cx + rm * Math.cos(a), y: cy + rm * Math.sin(a) + size * 0.35, s: label, size, fill: inkOn(c.hex), f, weight: 600, anchor: 'middle' });
            }
        }
        cum += s[i];
    });
    const outline = `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(R)}" fill="none" stroke="#E8E7EA" stroke-width="${r1(Math.max(1, u))}" /><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(R - thick)}" fill="none" stroke="#E8E7EA" stroke-width="${r1(Math.max(1, u))}" />`;
    const total = Math.round(colors.reduce((a, c) => a + c.weight, 0));
    const centerSize = clamp((R - thick) * 0.45, 14 * u, 48 * u);
    const center = o.show.percent ? text({ x: cx, y: cy + centerSize * 0.35, s: `${total}%`, size: centerSize, fill: INK, f, weight: 600, anchor: 'middle' }) : '';

    // Legend
    const lx = landscape ? cx + R + 48 * u : pad;
    const ly = landscape ? pad : cy + R + 28 * u;
    const lw = W - lx - pad;
    const lh = H - ly - pad;
    const rowH = clamp(lh / Math.max(colors.length, 1), 20 * u, 56 * u);
    const nameSize = clamp(rowH * 0.36, 12 * u, 18 * u);
    const legendTop = landscape ? ly + Math.max(0, (lh - rowH * colors.length) / 2) : ly;
    const legend = colors.map((c, i) => {
        const y = legendTop + i * rowH;
        if (y + rowH > H - pad / 2 + 1) return '';
        const sw = Math.min(16 * u, rowH * 0.6);
        let row = `<rect x="${r1(lx)}" y="${r1(y + (rowH - sw) / 2)}" width="${r1(sw)}" height="${r1(sw)}" rx="${r1(3 * u)}" fill="${c.hex}"${edgeFor(c.hex, u)} />`;
        const pctS = o.show.percent ? formatPercent(c.weight) : '';
        const pctW = pctS ? approxWidth('100%', nameSize, false) + 8 * u : 0;
        if (pctS) row += text({ x: lx + lw, y: y + rowH / 2 + nameSize * 0.35, s: pctS, size: nameSize, fill: INK, f, weight: 600, anchor: 'end' });
        const tx = lx + sw + 12 * u;
        const room = lw - sw - 12 * u - pctW;
        const name = o.show.name ? fitText(c.name, nameSize, room * 0.6) : '';
        row += text({ x: tx, y: y + rowH / 2 + nameSize * 0.35, s: name, size: nameSize, fill: INK, f, weight: 600 });
        const hexX = tx + (name ? approxWidth(name, nameSize, false) + 12 * u : 0);
        if (o.show.hex) row += text({ x: hexX, y: y + rowH / 2 + nameSize * 0.35, s: fitText(c.hex.toUpperCase(), 12 * u, tx + room - hexX, true), size: 12 * u, fill: INK_SOFT, f, mono: true });
        if (o.show.codes && rowH >= nameSize * 1.3 + 11 * u * 1.4) {
            row += text({ x: tx, y: y + rowH / 2 + nameSize * 0.35 + 11 * u * 1.35, s: fitText(c.codes.join('   '), 11 * u, room, true), size: 11 * u, fill: INK_SOFT, f, mono: true });
        }
        return row;
    }).join('');
    return wrap(o, arcs + outline + labels + center + legend, '#FFFFFF');
};

// ---------------------------------------------------------------- more layouts

/** Two main colours with tints and shades, the rest below. */
const renderGrid = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const main = colors.slice(0, Math.min(2, colors.length));
    const aux = colors.slice(2);
    const mainH = aux.length ? H * 0.65 : H;
    const colW = W / Math.max(main.length, 1);
    const pad = 24 * u;
    const sizes = { name: 28 * u, meta: 12 * u, code: 11 * u };
    const mainSvg = main.map((c, idx) => {
        const x = idx * colW;
        const fill = inkOn(c.hex);
        const vars = o.variations ? colorVariations(c.hex, 3, o.basePosition) : [];
        const blockH = vars.length ? mainH * 0.7 : mainH;
        const vh = vars.length ? (mainH - blockH) / vars.length : 0;
        let svg = `<rect x="${r1(x)}" y="0" width="${r1(colW + 0.5)}" height="${r1(blockH)}" fill="${c.hex}" />`;
        let reserved = 0;
        if (o.show.percent) {
            const p = bigPercent(c, x + colW - pad, pad + 32 * u, clamp(colW * 0.08, 14 * u, 40 * u), fill, f);
            svg += p.svg;
            reserved = p.width + 12 * u;
        }
        svg += labelStack(c, x + pad, pad, colW - 2 * pad - reserved, blockH - 2 * pad, o, f, fill, sizes);
        svg += vars.map((v, vi) => {
            const vy = blockH + vi * vh;
            const size = 11 * u;
            return `<rect x="${r1(x)}" y="${r1(vy)}" width="${r1(colW + 0.5)}" height="${r1(vh + 0.5)}" fill="${v}" />` +
                (o.variationCodes && vh >= size + 6 * u ? text({ x: x + pad, y: vy + (vh + size * 0.7) / 2, s: v, size, fill: inkOn(v), f, mono: true, opacity: 0.85 }) : '');
        }).join('');
        return svg;
    }).join('');
    const auxS = shares(aux);
    let ax = 0;
    const auxSvg = aux.map((c, i) => {
        const w = auxS[i] * W;
        const fill = inkOn(c.hex);
        const p2 = clamp(w * 0.1, 6 * u, 24 * u);
        let svg = `<rect x="${r1(ax)}" y="${r1(mainH)}" width="${r1(w + 0.5)}" height="${r1(H - mainH)}" fill="${c.hex}" />`;
        svg += labelStack(c, ax + p2, mainH + p2, w - 2 * p2, H - mainH - 2 * p2, o, f, fill, { name: 18 * u, meta: 12 * u, code: 11 * u }, true);
        ax += w;
        return svg;
    }).join('');
    return wrap(o, mainSvg + auxSvg, '#FFFFFF');
};

/** Rounded cards, width by weight: the three heaviest on top. */
const renderCards = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const pid = o.idPrefix ?? 'gp';
    const pad = 20 * u;
    const gap = 14 * u;
    const radius = 16 * u;
    const sorted = [...colors].sort((a, b) => b.weight - a.weight);
    const rowsDef = [sorted.slice(0, 3), sorted.slice(3)].filter((r) => r.length);
    const rowH = rowsDef.length === 2 ? [(H - pad * 2 - gap) * 0.6, (H - pad * 2 - gap) * 0.4] : [H - pad * 2];
    let defs = '';
    let body = '';
    let y = pad;
    let id = 0;
    rowsDef.forEach((row, ri) => {
        const h = rowH[ri];
        const s = shares(row);
        const usable = W - pad * 2 - gap * (row.length - 1);
        let x = pad;
        row.forEach((c, i) => {
            const w = s[i] * usable;
            const fill = inkOn(c.hex);
            const clip = `${pid}-card-${id++}`;
            defs += `<clipPath id="${clip}"><rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(radius)}" /></clipPath>`;
            const vars = o.variations ? colorVariations(c.hex, ri === 0 ? 3 : 2, 'none') : [];
            const vh = Math.min(36 * u, h * 0.1);
            const varSvg = vars.map((v, vi) => `<rect x="${r1(x)}" y="${r1(y + h - vh * (vars.length - vi))}" width="${r1(w)}" height="${r1(vh + 0.5)}" fill="${v}" />`).join('');
            body += `<g clip-path="url(#${clip})"><rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${c.hex}" />${varSvg}</g>`;
            const inner = clamp(w * 0.08, 8 * u, 24 * u);
            let reserved = 0;
            if (o.show.percent) {
                const size = clamp(Math.min(w * 0.14, 40 * u), 12 * u, 40 * u);
                const p = bigPercent(c, x + w - inner, y + inner + size * 0.85, size, fill, f);
                if (p.width < w - 2 * inner) {
                    body += p.svg;
                    reserved = p.width + 10 * u;
                }
            }
            body += labelStack(c, x + inner, y + inner, w - 2 * inner - reserved, h - 2 * inner - vh * vars.length, o, f, fill, { name: (ri === 0 ? 26 : 18) * u, meta: 12 * u, code: 11 * u });
            x += w + gap;
        });
        y += h + gap;
    });
    return wrap(o, body, '#F5F5F5', defs);
};

/** Horizontal stripes, height by weight. */
const renderStripes = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const s = shares(colors);
    const pad = 32 * u;
    let y = 0;
    const body = colors.map((c, i) => {
        const h = s[i] * H;
        const fill = inkOn(c.hex);
        let svg = `<rect x="0" y="${r1(y)}" width="${r1(W)}" height="${r1(h + 0.5)}" fill="${c.hex}" />`;
        let reserved = 0;
        if (o.show.percent && h >= 14 * u) {
            const size = clamp(h * 0.4, 12 * u, 48 * u);
            const p = bigPercent(c, W - pad, y + h / 2 + size * 0.35, size, fill, f);
            svg += p.svg;
            reserved = p.width + 16 * u;
        }
        const nameSize = clamp(h * 0.28, 12 * u, 36 * u);
        const top = Math.max(2 * u, Math.min(pad * 0.75, (h - nameSize * 1.3 - 12 * u * 1.3) / 2));
        svg += labelStack(c, pad, y + top, W - 2 * pad - reserved, h - top - 2 * u, o, f, fill, { name: nameSize, meta: 12 * u, code: 11 * u });
        y += h;
        return svg;
    }).join('');
    return wrap(o, body);
};

/** Continuous gradient; each colour's stop sits at the centre of its share. */
const renderGradient = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const pid = o.idPrefix ?? 'gp';
    const s = shares(colors);
    let cum = 0;
    const centers = s.map((v) => {
        const c = cum + v / 2;
        cum += v;
        return c;
    });
    const stops = colors.map((c, i) => `<stop offset="${r1(centers[i] * 100)}%" stop-color="${c.hex}" />`).join('');
    const defs = `<linearGradient id="${pid}-grad" x1="0%" y1="0%" x2="100%" y2="0%">${stops}</linearGradient>`;
    const labels = colors.map((c, i) => {
        const cx = centers[i] * W;
        const w = s[i] * W;
        const fill = inkOn(c.hex);
        let svg = labelStack(c, cx, 32 * u, w - 12 * u, H * 0.5, o, f, fill, { name: clamp(w * 0.1, 12 * u, 26 * u), meta: 12 * u, code: 11 * u }, false, 'middle');
        if (o.show.percent) {
            const size = clamp(w * 0.18, 12 * u, 48 * u);
            if (approxWidth(formatPercent(c.weight), size, false) < w - 8 * u) svg += text({ x: cx, y: H - 32 * u, s: formatPercent(c.weight), size, fill, f, weight: 600, anchor: 'middle' });
        }
        return svg;
    }).join('');
    return wrap(o, `<rect width="100%" height="100%" fill="url(#${pid}-grad)" />${labels}`, undefined, defs);
};

/** The heaviest colour as a hero, the rest stacked beside (or below) it. */
const renderMosaic = (colors: SheetColor[], o: SheetOptions, heroShare = 0.6, heroSide: 'auto' | 'top' = 'auto'): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    if (colors.length === 0) return wrap(o, '');
    const sorted = [...colors].sort((a, b) => b.weight - a.weight);
    const [main, ...rest] = sorted;
    const side = heroSide === 'top' || W < H ? 'top' : 'left';
    const heroW = side === 'left' ? W * heroShare : W;
    const heroH = side === 'left' ? H : H * (heroSide === 'top' ? 0.55 : heroShare);
    const pad = 40 * u;
    const fillMain = inkOn(main.hex);
    let body = `<rect x="0" y="0" width="${r1(heroW)}" height="${r1(heroH)}" fill="${main.hex}" />`;
    let reserved = 0;
    if (o.show.percent) {
        const p = bigPercent(main, heroW - pad, pad + 48 * u, clamp(heroW * 0.07, 16 * u, 64 * u), fillMain, f);
        body += p.svg;
        reserved = p.width + 16 * u;
    }
    body += labelStack(main, pad, pad, heroW - 2 * pad - reserved, heroH - 2 * pad, o, f, fillMain, { name: clamp(heroW * 0.05, 18 * u, 64 * u), meta: 14 * u, code: 12 * u });
    const rs = shares(rest);
    let offset = 0;
    body += rest.map((c, i) => {
        const fill = inkOn(c.hex);
        const isCol = side === 'left';
        const x = isCol ? heroW : offset;
        const y = isCol ? offset : heroH;
        const w = isCol ? W - heroW : rs[i] * W;
        const h = isCol ? rs[i] * H : H - heroH;
        const p2 = clamp(Math.min(w, h) * 0.12, 6 * u, 28 * u);
        offset += isCol ? h : w;
        return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w + 0.5)}" height="${r1(h + 0.5)}" fill="${c.hex}" />` +
            labelStack(c, x + p2, y + p2, w - 2 * p2, h - 2 * p2, o, f, fill, { name: 20 * u, meta: 12 * u, code: 11 * u }, true);
    }).join('');
    return wrap(o, body);
};

/** Tall rounded columns on black, width by weight, name turned upright. */
const renderColumns = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const pad = 24 * u;
    const gap = Math.min(12 * u, (W - 2 * pad) / Math.max(colors.length * 6, 1));
    const usable = W - pad * 2 - gap * (colors.length - 1);
    const s = shares(colors);
    let x = pad;
    const body = colors.map((c, i) => {
        const w = s[i] * usable;
        const fill = inkOn(c.hex);
        const cx = x + w / 2;
        let svg = `<rect x="${r1(x)}" y="${r1(pad)}" width="${r1(w)}" height="${r1(H - pad * 2)}" rx="${r1(Math.min(12 * u, w / 2))}" fill="${c.hex}" />`;
        let bottom = H - pad * 2;
        if (o.show.percent) {
            const size = clamp(w * 0.28, 12 * u, 40 * u);
            if (approxWidth(formatPercent(c.weight), size, false) <= w - 4 * u) {
                svg += text({ x: cx, y: H - pad - 16 * u, s: formatPercent(c.weight), size, fill, f, weight: 600, anchor: 'middle' });
                bottom -= size + 20 * u;
            }
        }
        const meta = o.show.hex ? fitText(c.hex.toUpperCase(), 11 * u, w - 8 * u, true) : '';
        if (meta) {
            svg += text({ x: cx, y: pad + bottom - 4 * u, s: meta, size: 11 * u, fill, f, mono: true, anchor: 'middle', opacity: 0.85 });
            bottom -= 11 * u * 1.6;
        }
        const nameSize = clamp(w * 0.2, 12 * u, 48 * u);
        if (o.show.name && w >= nameSize * 1.2) {
            const mid = pad + bottom / 2;
            svg += text({ x: cx, y: mid + nameSize * 0.35, s: fitText(c.name, nameSize, bottom - 24 * u), size: nameSize, fill, f, weight: 600, anchor: 'middle', transform: `rotate(-90 ${r1(cx)} ${r1(mid)})` });
        }
        x += w + gap;
        return svg;
    }).join('');
    return wrap(o, body, '#111111');
};

/** Circles on black, area by weight. */
const renderDots = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    const pad = 32 * u;
    const n = Math.max(colors.length, 1);
    const cols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * (W / H)))));
    const rows = Math.ceil(n / cols);
    const cellW = (W - pad * 2) / cols;
    const cellH = (H - pad * 2) / rows;
    const s = shares(colors);
    const maxShare = Math.max(...s, 0.0001);
    const labelH = (o.show.name ? 16 : 0) * u * 1.3 + (o.show.hex ? 12 : 0) * u * 1.3;
    const body = colors.map((c, i) => {
        const cx = pad + (i % cols) * cellW + cellW / 2;
        const cellTop = pad + Math.floor(i / cols) * cellH;
        const maxR = Math.max(4 * u, Math.min(cellW, cellH - labelH - 8 * u) * 0.44);
        const r = maxR * Math.max(0.3, Math.sqrt(s[i] / maxShare));
        const cy = cellTop + (cellH - labelH) / 2;
        let svg = `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${c.hex}" />`;
        if (o.show.percent) {
            const size = clamp(r * 0.5, 11 * u, 40 * u);
            const s2 = formatPercent(c.weight);
            svg += approxWidth(s2, size, false) < r * 1.8
                ? text({ x: cx, y: cy + size * 0.35, s: s2, size, fill: inkOn(c.hex), f, weight: 600, anchor: 'middle' })
                : text({ x: cx, y: cy - r - 6 * u, s: s2, size: 11 * u, fill: '#FFFFFF', f, weight: 600, anchor: 'middle' });
        }
        const labelTop = cellTop + cellH - labelH - 4 * u;
        const oNoCodes = { ...o, show: { ...o.show, codes: false } };
        svg += labelStack(c, cx, Math.max(labelTop, cy + r + 6 * u), cellW - 12 * u, labelH + 2 * u, oNoCodes, f, '#FFFFFF', { name: 16 * u, meta: 12 * u, code: 11 * u }, false, 'middle');
        return svg;
    }).join('');
    return wrap(o, body, '#0A0A0A');
};

/** Editorial: hero colour and an index list with hex and percentage. */
const renderEditorial = (colors: SheetColor[], o: SheetOptions): string => {
    const { width: W, height: H, unit: u } = o;
    const f = fontsFor(o);
    if (colors.length === 0) return wrap(o, '');
    const sorted = [...colors].sort((a, b) => b.weight - a.weight);
    const main = sorted[0];
    const landscape = W >= H;
    const heroW = landscape ? W * 0.62 : W;
    const heroH = landscape ? H : H * 0.5;
    const pad = 48 * u;
    const fill = inkOn(main.hex);
    let body = `<rect x="0" y="0" width="${r1(heroW)}" height="${r1(heroH)}" fill="${main.hex}" />`;
    body += labelStack(main, pad, pad, heroW - 2 * pad, heroH - 2 * pad - 60 * u, o, f, fill, { name: clamp(heroW * 0.07, 20 * u, 96 * u), meta: 16 * u, code: 13 * u });
    if (o.show.percent) body += text({ x: pad, y: heroH - pad, s: formatPercent(main.weight), size: clamp(heroW * 0.06, 16 * u, 64 * u), fill, f, weight: 600 });
    const lx = landscape ? heroW + 40 * u : pad * 0.5;
    const ly = landscape ? 48 * u : heroH + 24 * u;
    const lw = W - lx - (landscape ? 40 * u : pad * 0.5);
    const rowH = clamp((H - ly - 24 * u) / sorted.length, 28 * u, 72 * u);
    const sw = Math.min(32 * u, rowH * 0.7);
    body += sorted.map((c, i) => {
        const y = ly + i * rowH;
        if (y + rowH > H + 1) return '';
        const meta = [o.show.hex ? c.hex.toUpperCase() : '', o.show.percent ? formatPercent(c.weight) : ''].filter(Boolean).join('  ·  ');
        const nameSize = clamp(rowH * 0.3, 12 * u, 20 * u);
        const both = o.show.name && meta && rowH >= nameSize * 1.3 + 12 * u * 1.3 + 4 * u;
        const tx = lx + sw + 14 * u;
        const room = lw - sw - 14 * u;
        const nameY = both ? y + rowH / 2 - 2 * u : y + rowH / 2 + nameSize * 0.35;
        return `<rect x="${r1(lx)}" y="${r1(y + (rowH - sw) / 2)}" width="${r1(sw)}" height="${r1(sw)}" rx="${r1(4 * u)}" fill="${c.hex}"${edgeFor(c.hex, u)} />` +
            (o.show.name ? text({ x: tx, y: nameY, s: fitText(c.name, nameSize, room), size: nameSize, fill: INK, f, weight: 600 }) : '') +
            (meta && (both || !o.show.name) ? text({ x: tx, y: both ? y + rowH / 2 + 12 * u * 1.1 : y + rowH / 2 + 12 * u * 0.35, s: fitText(meta, 12 * u, room, true), size: 12 * u, fill: INK_SOFT, f, mono: true }) : '');
    }).join('');
    return wrap(o, body, '#FAFAFA');
};

export const renderSheet = (template: SheetTemplate, colors: SheetColor[], o: SheetOptions): string => {
    switch (template) {
        case 'vertical': return renderVertical(colors, o);
        case 'swatches': return renderSwatches(colors, o);
        case 'bars': return renderBars(colors, o);
        case 'ring': return renderRing(colors, o);
        case 'grid': return renderGrid(colors, o);
        case 'cards': return renderCards(colors, o);
        case 'stripes': return renderStripes(colors, o);
        case 'gradient': return renderGradient(colors, o);
        case 'mosaic': return renderMosaic(colors, o);
        case 'splitscreen': return renderMosaic(colors, o, 0.55, 'top');
        case 'columns': return renderColumns(colors, o);
        case 'dots': return renderDots(colors, o);
        case 'editorial': return renderEditorial(colors, o);
        default: return renderClassic(colors, o);
    }
};

/** Screen canvas for a preview `containerWidth` px wide: 16:9, portrait on phones. */
export const screenCanvas = (containerWidth: number) => {
    const width = Math.max(280, Math.round(containerWidth));
    const height = width < 640 ? Math.round(width * 1.25) : Math.round(width * 9 / 16);
    return { width, height, unit: Math.max(1, width / 1200) };
};

/** The export canvas: 1920×1080, the same layout drawn 1.6 times larger. */
export const EXPORT_CANVAS = { width: 1920, height: 1080, unit: 1.6 };

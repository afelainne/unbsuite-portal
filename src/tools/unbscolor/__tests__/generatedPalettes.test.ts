import { describe, expect, it } from 'vitest';
import {
    PaletteColor,
    appendColors,
    applyWeightPreset,
    coverageWeights,
    harmonyFrom,
    hasSourceWeights,
    largestRemainder,
    moveColor,
    occurrenceWeights,
    presetRatios,
    removeColorAt,
    setWeightAt,
    sortPalette,
    toWeightMap
} from '../components/GeneratedPaletteLogic';
import { EXPORT_CANVAS, PRIMARY_SHEET_VIEWS, EXTRA_SHEET_TEMPLATES, SheetOptions, fitText, renderSheet, screenCanvas } from '../components/GeneratedPaletteSheets';
import { comboWeightsLabel, renderAlbers, ALBERS_TEMPLATES } from '../components/GeneratedPaletteAlbers';

const c = (hex: string, weight: number, locked = false): PaletteColor => ({ hex, name: hex, weight, locked });
const sum = (list: PaletteColor[]) => list.reduce((s, x) => s + x.weight, 0);

const palette = (): PaletteColor[] => [c('#FF0000', 40), c('#00FF00', 30), c('#0000FF', 20), c('#FFFFFF', 10)];

describe('weights', () => {
    it('splits a total into integers that add up exactly', () => {
        expect(largestRemainder([1, 1, 1], 100)).toEqual([34, 33, 33]);
        expect(largestRemainder([0, 0], 10)).toEqual([5, 5]);
        expect(largestRemainder([3, 1], 7).reduce((a, b) => a + b, 0)).toBe(7);
    });

    it('applies every preset with a total of 100', () => {
        for (const preset of ['equal', 'rule603010', 'golden', 'descending'] as const) {
            const out = applyWeightPreset(palette(), preset);
            expect(sum(out), preset).toBe(100);
            expect(out.every((x) => x.weight >= 0)).toBe(true);
        }
        expect(applyWeightPreset(palette(), 'equal').map((x) => x.weight)).toEqual([25, 25, 25, 25]);
        expect(applyWeightPreset(palette().slice(0, 3), 'rule603010').map((x) => x.weight)).toEqual([60, 30, 10]);
        const golden = applyWeightPreset(palette(), 'golden').map((x) => x.weight);
        expect(golden[0]).toBeGreaterThan(golden[1]);
        expect(golden[1]).toBeGreaterThan(golden[2]);
    });

    it('keeps locked weights when applying a preset', () => {
        const list = palette();
        list[1] = { ...list[1], locked: true, weight: 50 };
        const out = applyWeightPreset(list, 'equal');
        expect(out[1].weight).toBe(50);
        expect(sum(out)).toBe(100);
        expect(out[0].weight + out[2].weight + out[3].weight).toBe(50);
    });

    it('uses measured coverage for the source preset', () => {
        const map = toWeightMap(['#FF0000', '#00FF00', '#0000FF', '#FFFFFF'], [70, 20, 10, 0]);
        expect(hasSourceWeights(palette(), map)).toBe(true);
        expect(hasSourceWeights(palette(), null)).toBe(false);
        const out = applyWeightPreset(palette(), 'source', map);
        expect(sum(out)).toBe(100);
        expect(out[0].weight).toBeGreaterThan(out[1].weight);
        expect(out[3].weight).toBeGreaterThanOrEqual(0);
    });

    it('describes the 60-30-10 rule for any size', () => {
        expect(presetRatios('rule603010', 5)).toHaveLength(5);
        expect(presetRatios('descending', 3)).toEqual([3, 2, 1]);
    });

    it('sets one weight and rebalances the rest', () => {
        const out = setWeightAt(palette(), 0, 70);
        expect(out[0].weight).toBe(70);
        expect(sum(out)).toBe(100);
    });

    it('adds and removes colours without breaking the total', () => {
        const added = appendColors(palette(), ['#123456', 'nope']);
        expect(added).toHaveLength(5);
        expect(sum(added)).toBe(100);
        const removed = removeColorAt(added, 0);
        expect(removed).toHaveLength(4);
        expect(sum(removed)).toBe(100);
    });
});

describe('order', () => {
    it('sorts by weight, lightness and hue, weights travelling with colours', () => {
        const byWeight = sortPalette([c('#000000', 10), c('#FF0000', 60), c('#FFFFFF', 30)], 'weight');
        expect(byWeight.map((x) => x.hex)).toEqual(['#FF0000', '#FFFFFF', '#000000']);
        const byLight = sortPalette([c('#000000', 10), c('#FFFFFF', 30), c('#808080', 60)], 'lightness');
        expect(byLight.map((x) => x.hex)).toEqual(['#FFFFFF', '#808080', '#000000']);
        const byHue = sortPalette([c('#0000FF', 10), c('#808080', 10), c('#FF0000', 40), c('#00FF00', 40)], 'hue');
        expect(byHue.map((x) => x.hex)).toEqual(['#FF0000', '#00FF00', '#0000FF', '#808080']);
        expect(byHue.find((x) => x.hex === '#FF0000')?.weight).toBe(40);
    });

    it('moves a colour with its weight', () => {
        const out = moveColor(palette(), 0, 2);
        expect(out.map((x) => x.hex)).toEqual(['#00FF00', '#0000FF', '#FF0000', '#FFFFFF']);
        expect(out[2].weight).toBe(40);
        expect(moveColor(palette(), 0, 9)).toEqual(palette());
    });
});

describe('harmonies', () => {
    it('derives colours from a base and never returns the base', () => {
        expect(harmonyFrom('#FF0000', 'complementary')).toEqual(['#00FFFF']);
        expect(harmonyFrom('#FF0000', 'triad')).toHaveLength(2);
        expect(harmonyFrom('#FF0000', 'analogous')).toHaveLength(2);
        const mono = harmonyFrom('#336699', 'monochromatic');
        expect(mono.length).toBeGreaterThanOrEqual(3);
        expect(mono).not.toContain('#336699');
        expect(harmonyFrom('not a colour', 'triad')).toEqual([]);
    });
});

describe('coverage', () => {
    it('counts opaque pixels by nearest colour', () => {
        // 3 red, 1 blue, 1 transparent pixel
        const data = [255, 0, 0, 255, 250, 5, 5, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0];
        expect(coverageWeights(data, ['#FF0000', '#0000FF'])).toEqual([75, 25]);
        expect(coverageWeights([0, 0, 0, 0], ['#FF0000'])).toEqual([0]);
    });

    it('falls back to how often a colour is written', () => {
        const svg = '<svg><rect fill="#FF0000"/><rect fill="#ff0000"/><rect fill="#00F"/></svg>';
        expect(occurrenceWeights(svg, ['#FF0000', '#0000FF'])).toEqual([67, 33]);
    });
});

describe('sheet renderers', () => {
    const colors = [
        { hex: '#FF0000', name: 'Red', weight: 60, codes: ['RGB 255, 0, 0'] },
        { hex: '#0000FF', name: 'Blue', weight: 30, codes: [] },
        { hex: '#FFFFFF', name: 'White', weight: 10, codes: [] }
    ];
    const base = (over: Partial<SheetOptions> = {}): SheetOptions => ({
        ...EXPORT_CANVAS,
        show: { name: true, hex: true, percent: true, codes: true },
        variations: false,
        variationCodes: true,
        variationCount: 3,
        basePosition: 'none',
        splitRatio: 55,
        forExport: true,
        ...over
    });

    it('renders every template as SVG with the percentages', () => {
        for (const tpl of [...PRIMARY_SHEET_VIEWS, ...EXTRA_SHEET_TEMPLATES]) {
            const svg = renderSheet(tpl, colors, base());
            expect(svg.startsWith('<svg'), tpl).toBe(true);
            expect(svg, tpl).toContain('60%');
        }
    });

    it('sizes sheet blocks by weight', () => {
        const svg = renderSheet('classic', colors, base());
        const heights = [...svg.matchAll(/<rect x="0" y="[\d.]+" width="1920" height="([\d.]+)" fill="#/g)].map((m) => Number(m[1]));
        // Blocks overlap by half a pixel so no seam shows between them.
        expect(Math.abs(heights[0] - 1080 * 0.6)).toBeLessThanOrEqual(1);
        expect(Math.abs(heights[1] - 1080 * 0.3)).toBeLessThanOrEqual(1);
    });

    it('hides what is switched off', () => {
        const svg = renderSheet('classic', colors, base({ show: { name: false, hex: false, percent: false, codes: false } }));
        expect(svg).not.toContain('60%');
        expect(svg).not.toContain('Red');
        expect(svg).not.toContain('#FF0000<');
    });

    it('keeps screen text at 11px or more', () => {
        const svg = renderSheet('swatches', colors, base({ ...screenCanvas(343), forExport: false }));
        const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
        expect(sizes.length).toBeGreaterThan(0);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
    });

    it('trims text that does not fit', () => {
        expect(fitText('A very long colour name', 12, 60)).toMatch(/…$/);
        expect(fitText('Red', 12, 200)).toBe('Red');
        expect(fitText('Anything', 40, 10)).toBe('');
    });
});

describe('interaction squares', () => {
    it('labels layers with their palette weights', () => {
        const weights: Record<string, number> = { '#FF0000': 40, '#0000FF': 20 };
        expect(comboWeightsLabel(['#FF0000', '#0000FF', '#123456'], (h) => weights[h])).toBe('40 · 20%');
        expect(comboWeightsLabel(['#123456'], () => undefined)).toBe('');
        for (const tpl of ALBERS_TEMPLATES) {
            const svg = renderAlbers(tpl, [{ outer: '#FF0000', middle: '#0000FF', inner: '#FFFFFF' }], {
                ...EXPORT_CANVAS,
                background: '#000000',
                layerCount: 3,
                showHex: true,
                showPercent: true,
                weightOf: (h) => weights[h],
                forExport: false
            });
            expect(svg, tpl).toContain('40 · 20%');
        }
    });
});

import { Download, Lock, Pencil, Plus, Shuffle, Unlock, Upload } from 'lucide-react';
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { hexToRgb, rgbToHex, isValidHex, getClosestColorName, rgbToHsl, hslToRgb, rgbToCmyk, rgbToHsv, normalizeHex } from '../utils/colorMath';
import { contrastRatio as wcagContrastRatio, wcagLevelFor } from '../utils/contrast';
import { clusterPixels } from '../utils/imageExtraction';
import { downloadBlob, downloadUrl } from '../utils/browser';
import { useActiveBooks } from '../libraries/store';
import { bestPerBook } from '../libraries/matching';
import { formatReferenceCode } from '../utils/reference';
import { useLanguage } from '../i18n';
import type { Translations } from '../i18n';
import { HexField } from './HexField';
import { PaletteExportMenu } from './PaletteExportMenu';
import { ColorVisionToggle, VisionCaption, VisionMode } from './ColorVisionToggle';
import {
    PaletteColor,
    WeightPreset,
    PaletteSortKey,
    BasePosition,
    evenWeights,
    normalizeWeights,
    applyWeightPreset,
    hasSourceWeights,
    sortPalette,
    moveColor,
    appendColors,
    removeColorAt,
    setWeightAt,
    coverageWeights,
    occurrenceWeights,
    toWeightMap,
    formatPercent
} from './GeneratedPaletteLogic';
import {
    SheetTemplate,
    SheetShow,
    PRIMARY_SHEET_VIEWS,
    EXTRA_SHEET_TEMPLATES,
    TEMPLATES_WITH_VARIATIONS,
    renderSheet,
    screenCanvas,
    EXPORT_CANVAS
} from './GeneratedPaletteSheets';
import { ALBERS_TEMPLATES, AlbersTemplate, comboLayers, maxCardsFor, proportionalScales, renderAlbers } from './GeneratedPaletteAlbers';
import { PaletteProportionBar } from './PaletteProportionBar';
import { useElementWidth } from './PaletteElementWidth';
import { PaletteColorRow } from './PaletteColorRow';
import { PaletteHarmonyPanel } from './PaletteHarmonyPanel';
import { Card, IconButton, LegendToggle, Metric, TextTabs } from './ui';

interface Settings {
    showHex: boolean;
    showRgb: boolean;
    showHsl: boolean;
    showHsb: boolean;
    showLab: boolean;
    showCmyk: boolean;
    showReferences: boolean;
    mixFormat: string;
}

interface GeneratedPalettesProps {
    initialHex?: string;
    settings?: Settings;
    externalColors?: string[];
}

const defaultSettings: Settings = {
    showHex: true,
    showRgb: true,
    showHsl: true,
    showHsb: true,
    showLab: true,
    showCmyk: true,
    showReferences: false,
    mixFormat: 'rgb(80, 184, 72)'
};

const sheetLabel = (t: Translations, template: SheetTemplate): string => {
    switch (template) {
        case 'classic': return t.gpViewSheet;
        case 'vertical': return t.gpViewStrip;
        case 'swatches': return t.gpViewGrid;
        case 'bars': return t.gpViewBars;
        case 'ring': return t.gpViewRing;
        case 'grid': return t.gpTemplateMainVariations;
        case 'cards': return t.cards;
        case 'stripes': return t.templateStripes;
        case 'gradient': return t.templateGradient;
        case 'mosaic': return t.templateMosaic;
        case 'splitscreen': return t.templateSplitScreen;
        case 'columns': return t.templateColumns;
        case 'dots': return t.templateDots;
        default: return t.templateEditorial;
    }
};

const albersLabel = (t: Translations, template: AlbersTemplate): string => {
    switch (template) {
        case 'circles': return t.templateCircles;
        case 'sunset': return t.templateSunset;
        case 'bars': return t.templateBars;
        case 'rings': return t.templateRings;
        case 'diamonds': return t.templateDiamonds;
        case 'frames': return t.templateFrames;
        case 'split': return t.templateSplit;
        case 'targets': return t.templateTargets;
        case 'triangles': return t.templateTriangles;
        default: return t.templateSquares;
    }
};

const presetLabel = (t: Translations, preset: WeightPreset): string => {
    switch (preset) {
        case 'rule603010': return '60-30-10';
        case 'golden': return t.gpPresetGolden;
        case 'descending': return t.gpPresetDescending;
        case 'source': return t.gpPresetSource;
        default: return t.gpPresetEqual;
    }
};

const ALBERS_BACKGROUNDS = { black: '#000000', white: '#FFFFFF', gray: '#E5E5E5' } as const;
type AlbersBackground = keyof typeof ALBERS_BACKGROUNDS;

/** Draws an image source onto a small canvas and returns its RGBA pixels. */
const rasterPixels = (src: string, size = 120): Promise<Uint8ClampedArray> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas unavailable'));
                ctx.drawImage(img, 0, 0, size, size);
                resolve(ctx.getImageData(0, 0, size, size).data);
            } catch (err) {
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });

/** A control on a card: muted sentence-case caption, then the control itself. */
const Control: React.FC<{ label: React.ReactNode; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
        <span className="shrink-0 text-[13px] text-muted-foreground">{label}</span>
        {children}
    </div>
);

/** A slider with its caption and its value, the value in tabular figures. */
const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    suffix?: string;
    disabled?: boolean;
}> = ({ label, value, min, max, onChange, suffix = '', disabled }) => (
    <label className={`flex items-center gap-3 ${disabled ? 'opacity-40' : ''}`}>
        <span className="shrink-0 text-[13px] text-muted-foreground">{label}</span>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="tool-slider w-28"
        />
        <span className="w-10 text-[14px] tabular text-foreground">{value}{suffix}</span>
    </label>
);


/** Text-labelled download action for a card header, in the quiet 32px style. */
const HeaderDownload: React.FC<{ label: string; ariaLabel: string; onClick: () => void }> = ({ label, ariaLabel, onClick }) => (
    <button type="button" onClick={onClick} className="ctl ctl-gray ctl-sm" aria-label={ariaLabel} title={ariaLabel}>
        <Download aria-hidden="true" />{label}
    </button>
);

export const GeneratedPalettes: React.FC<GeneratedPalettesProps> = ({
    settings = defaultSettings,
    externalColors
}) => {
    const { t } = useLanguage();
    const validExternal = useMemo(
        () => (externalColors ?? []).map((c) => normalizeHex(c)).filter((c): c is string => Boolean(c)),
        [externalColors]
    );
    const externalKey = validExternal.join(',');

    const getInitialColors = (): PaletteColor[] => {
        if (validExternal.length > 0) {
            return evenWeights(validExternal);
        }
        return [
            { hex: '#F0FF00', name: 'Unserved Yellow', weight: 40, locked: false },
            { hex: '#1A1A1A', name: 'Black', weight: 20, locked: false },
            { hex: '#FFFFFF', name: 'White', weight: 20, locked: false },
            { hex: '#E5E5E5', name: 'Light Gray', weight: 10, locked: false },
            { hex: '#333333', name: 'Dark Gray', weight: 10, locked: false },
        ];
    };

    const [colors, setColors] = useState<PaletteColor[]>(getInitialColors);
    const [newColorInput, setNewColorInput] = useState('');
    const [vision, setVision] = useState<VisionMode>('normal');

    // Input: file, pasted SVG and the proportions measured from them.
    const [svgPasteValue, setSvgPasteValue] = useState('');
    const [inputHint, setInputHint] = useState<string | null>(null);
    const [sourceWeights, setSourceWeights] = useState<Record<string, number> | null>(null);
    const [activePreset, setActivePreset] = useState<WeightPreset | null>(null);
    const loadToken = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Colour list.
    const [allCodes, setAllCodes] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [dragFrom, setDragFrom] = useState<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    // Sheet.
    const [sheetView, setSheetView] = useState<SheetTemplate>('classic');
    const [show, setShow] = useState<SheetShow>({ name: true, hex: true, percent: true, codes: true });
    const [showVariations, setShowVariations] = useState(true);
    const [showVariationCodes, setShowVariationCodes] = useState(true);
    const [variationCount, setVariationCount] = useState(5);
    const [baseColorPosition, setBaseColorPosition] = useState<BasePosition>('none');
    const [splitRatio, setSplitRatio] = useState(55);

    // Interaction squares and combinations.
    const [albersSeed, setAlbersSeed] = useState(0);
    const [cardCount, setCardCount] = useState(8);
    const [contrastCardCount, setContrastCardCount] = useState(8);
    const [albersTemplate, setAlbersTemplate] = useState<AlbersTemplate>('squares');
    const [albersBackground, setAlbersBackground] = useState<AlbersBackground>('black');
    const [albersShowHex, setAlbersShowHex] = useState(true);
    const [albersShowPercent, setAlbersShowPercent] = useState(true);
    /** Área de cada camada pela porcentagem da cor na paleta. */
    const [albersProportional, setAlbersProportional] = useState(true);
    const [draggedComboIndex, setDraggedComboIndex] = useState<number | null>(null);
    const [comboOrder, setComboOrder] = useState<number[]>([]);
    const [editingComboIndex, setEditingComboIndex] = useState<number | null>(null);
    /** Camadas em que a pessoa abriu o código manual, por "combo-camada". */
    const [manualComboLayers, setManualComboLayers] = useState<Record<string, boolean>>({});
    /** As cores da paleta, uma vez cada, para escolher a cor de cada camada das combinações. */
    const paletteSlotColors = useMemo(() => {
        const seen = new Set<string>();
        return colors
            .map((c) => ({ hex: c.hex.toUpperCase(), name: c.name }))
            .filter((c) => isValidHex(c.hex) && !seen.has(c.hex) && (seen.add(c.hex), true));
    }, [colors]);
    const [customCombos, setCustomCombos] = useState<{ [key: number]: { outer?: string; middle?: string; inner?: string } }>({});
    const [albersLayerCount, setAlbersLayerCount] = useState<2 | 3 | 4>(3);
    const [comboLocks, setComboLocks] = useState<Record<number, boolean>>({});
    const [fullContrastMode, setFullContrastMode] = useState(false);

    const [sheetRef, sheetWidth] = useElementWidth<HTMLDivElement>(1152);
    const [albersRef, albersWidth] = useElementWidth<HTMLDivElement>(1152);

    // Atualizar cores quando externalColors mudar de fato (ignora hex inválidos
    // e novas referências com o mesmo conteúdo; preserva nomes e travas).
    const lastExternalKey = useRef(externalKey);
    useEffect(() => {
        if (externalKey === lastExternalKey.current) return;
        lastExternalKey.current = externalKey;
        if (!externalKey) return;
        setColors((prev) => evenWeights(externalKey.split(','), prev));
        setActivePreset(null);
    }, [externalKey]);

    const exportSwatches = useMemo(
        () => colors.filter((c) => isValidHex(c.hex)).map((c) => ({ name: c.name || c.hex, hex: c.hex })),
        [colors]
    );

    // Books of the libraries switched on in Settings.
    const books = useActiveBooks();

    const formatColorCodes = (hex: string): string[] => {
        const codes: string[] = [];
        const rgb = hexToRgb(hex);
        const hsl = rgbToHsl(rgb);
        const hsv = rgbToHsv(rgb);
        const cmyk = rgbToCmyk(rgb);

        if (settings.showHex) codes.push(hex);
        if (settings.showRgb) {
            if (settings.mixFormat === 'R=80, G=184, B=72') {
                codes.push(`R=${rgb.r}, G=${rgb.g}, B=${rgb.b}`);
            } else if (settings.mixFormat === 'RGB 80, 184, 72') {
                codes.push(`RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`);
            } else {
                codes.push(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
            }
        }
        if (settings.showCmyk) codes.push(`CMYK ${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`);
        if (settings.showHsl) codes.push(`HSL ${hsl.h}, ${hsl.s}%, ${hsl.l}%`);
        if (settings.showHsb) codes.push(`HSB ${hsv.h}, ${hsv.s}, ${hsv.v}`);

        // The closest reference of each switched-on library, up to four, closest first.
        if (settings.showReferences) {
            bestPerBook(hex, books, 4).forEach(({ match }) => {
                if (match.deltaE < 15) codes.push(formatReferenceCode(match.reference.code));
            });
        }

        return codes;
    };

    /** Codes other than the hex itself, which has its own field and switch. */
    const extraCodes = (hex: string) => formatColorCodes(hex).filter((code) => code.toUpperCase() !== hex.toUpperCase());

    // WCAG helper from utils/contrast (invalid hex falls back to 1:1).
    const getContrastRatio = (hex1: string, hex2: string) => {
        const ratio = wcagContrastRatio(hex1, hex2);
        return Number.isNaN(ratio) ? 1 : ratio;
    };

    const getContrastPairs = useCallback(() => {
        const pairs: { bg: string; fg: string; ratio: number }[] = [];
        for (let i = 0; i < colors.length; i++) {
            for (let j = 0; j < colors.length; j++) {
                if (i !== j) {
                    const ratio = getContrastRatio(colors[i].hex, colors[j].hex);
                    if (ratio >= 3.0) {
                        pairs.push({ bg: colors[i].hex, fg: colors[j].hex, ratio });
                    }
                }
            }
        }
        return pairs.sort((a, b) => b.ratio - a.ratio);
    }, [colors]);

    const albersGrid = useMemo(() => {
        const grid: { outer: string; middle: string; inner: string; weight: number; score: number }[] = [];
        const validColors = colors.filter(c => isValidHex(c.hex));
        if (validColors.length < 2) return grid;
        const maxWeight = Math.max(...validColors.map(c => c.weight));
        const studyBackground = ALBERS_BACKGROUNDS[albersBackground];

        // Build all combos: outer ≠ middle, and pick inner ≠ outer/middle that maximizes contrast vs middle
        for (let i = 0; i < validColors.length; i++) {
            for (let j = 0; j < validColors.length; j++) {
                if (i === j) continue;
                const outer = validColors[i].hex;
                const middle = validColors[j].hex;
                let bestInner = '';
                let bestInnerContrast = -1;
                for (const c of validColors) {
                    if (c.hex === outer || c.hex === middle) continue;
                    const ratio = getContrastRatio(c.hex, middle);
                    if (ratio > bestInnerContrast) {
                        bestInnerContrast = ratio;
                        bestInner = c.hex;
                    }
                }
                // Fallback when palette has only 2 colors
                if (!bestInner) {
                    bestInner = outer;
                    bestInnerContrast = getContrastRatio(outer, middle);
                }
                const cMidInner = bestInnerContrast;
                const cOuterMid = getContrastRatio(outer, middle);
                const wOuter = validColors[i].weight;
                const wMiddle = validColors[j].weight;
                const wInner = validColors.find(c => c.hex === bestInner)?.weight ?? 0;
                const weight = (wOuter + wMiddle) / 2;
                // Hierarquia da paleta: a cor principal por fora, a secundária no meio, o destaque no centro.
                const hierarchy = ((wOuter >= wMiddle ? 1 : 0) + (wMiddle >= wInner ? 1 : 0)) / 2;
                const dominance = maxWeight > 0 ? wOuter / maxWeight : 0;
                // Contraste em 0..1 (a razão vai de 1 a 21).
                const contrast = ((cMidInner - 1) / 20) * 0.6 + ((cOuterMid - 1) / 20) * 0.4;
                // A camada de fora igual ao fundo do estudo some: vai para o fim.
                const blendsIn = getContrastRatio(outer, studyBackground) < 1.25 ? 0.25 : 1;
                const score = (hierarchy * 0.35 + dominance * 0.3 + contrast * 0.35) * blendsIn;
                grid.push({ outer, middle, inner: bestInner, weight, score });
            }
        }

        // Filter by contrast mode
        let filtered = fullContrastMode
            ? grid.filter(c => getContrastRatio(c.middle, c.inner) >= 4.5 && getContrastRatio(c.outer, c.middle) >= 3.0)
            : grid.slice();
        if (filtered.length === 0) {
            filtered = grid.slice().sort((a, b) => b.score - a.score).slice(0, Math.min(8, grid.length));
        }

        // Seeded PRNG (mulberry32) for real Fisher–Yates shuffle
        const mulberry32 = (a: number) => () => {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const rand = mulberry32(albersSeed * 2654435761 + 1);

        // Sem embaralhar, a ordem é a da nota: hierarquia da paleta primeiro.
        // Ao embaralhar, a melhor continua abrindo o estudo e o resto sai em sorteio
        // pesado pela nota (Efraimidis–Spirakis: chave = u^(1/peso), maior primeiro).
        const ranked = filtered.slice().sort((a, b) => b.score - a.score);
        const [head, ...tail] = ranked;
        const decorated = albersSeed === 0
            ? tail.map(c => ({ c, key: c.score }))
            : tail.map(c => ({ c, key: Math.pow(rand(), 1 / Math.exp(c.score * 5)) }));
        decorated.sort((a, b) => b.key - a.key);
        const shuffled = head ? [head, ...decorated.map(d => d.c)] : [];

        // Na ordem pela nota, a hierarquia manda; só o embaralhado evita vizinhos repetidos.
        if (albersSeed === 0) return shuffled;

        // Greedy interleave: avoid adjacent items sharing the same middle or inner
        const result: typeof shuffled = [];
        const remaining = shuffled.slice();
        while (remaining.length) {
            const last = result[result.length - 1];
            let pickIdx = 0;
            if (last) {
                const found = remaining.findIndex(r => r.middle !== last.middle && r.inner !== last.inner);
                if (found !== -1) pickIdx = found;
            }
            result.push(remaining.splice(pickIdx, 1)[0]);
        }
        return result;
    }, [colors, albersSeed, fullContrastMode, albersBackground]);

    /** Palette weight by hex (first occurrence), for labels on combinations. */
    const weightByHex = useMemo(() => {
        const map = new Map<string, number>();
        colors.forEach((c) => {
            const key = c.hex.toUpperCase();
            if (!map.has(key)) map.set(key, c.weight);
        });
        return map;
    }, [colors]);
    const weightOf = useCallback((hex: string) => weightByHex.get(hex.toUpperCase()), [weightByHex]);

    // ------------------------------------------------------------ palette edits

    const editColors = (fn: (prev: PaletteColor[]) => PaletteColor[], keepPreset = false) => {
        setColors(fn);
        if (!keepPreset) setActivePreset(null);
    };

    const addColor = () => {
        const hex = normalizeHex(newColorInput);
        if (!hex) return;
        editColors((prev) => appendColors(prev, [hex]));
        setNewColorInput('');
    };

    const addColors = (hexes: string[]) => {
        if (hexes.length === 0) return;
        editColors((prev) => appendColors(prev, hexes));
    };

    const removeColor = (index: number) => {
        editColors((prev) => removeColorAt(prev, index));
        setExpandedRows(new Set());
    };

    const updateColor = (index: number, rawHex: string) => {
        const hex = normalizeHex(rawHex);
        if (!hex) return;
        editColors((prev) => prev.map((c, i) => (i === index ? { ...c, hex, name: getClosestColorName(hex) } : c)), true);
    };

    const updateWeight = (index: number, requested: number) => editColors((prev) => setWeightAt(prev, index, requested));

    const toggleLock = (index: number) => editColors((prev) => prev.map((c, i) => (i === index ? { ...c, locked: !c.locked } : c)), true);

    const updateName = (index: number, name: string) => editColors((prev) => prev.map((c, i) => (i === index ? { ...c, name } : c)), true);

    const applyPreset = (preset: WeightPreset) => {
        setColors((prev) => applyWeightPreset(prev, preset, sourceWeights));
        setActivePreset(preset);
    };

    const sortBy = (key: PaletteSortKey) => {
        editColors((prev) => sortPalette(prev, key), true);
        setExpandedRows(new Set());
    };

    const moveRow = (from: number, to: number) => {
        editColors((prev) => moveColor(prev, from, to), true);
        setExpandedRows(new Set());
    };

    const toggleRow = (index: number) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    // ------------------------------------------------------------ input

    const extractColorsFromSvgText = (svgText: string): string[] => {
        const colorRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
        const rgbRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi;
        const namedColorRegex = /(?:fill|stroke|stop-color|color)\s*[:=]\s*["']?(white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|cyan|magenta)["']?/gi;
        const namedColors: Record<string, string> = {
            white: '#FFFFFF', black: '#000000', red: '#FF0000', blue: '#0000FF',
            green: '#008000', yellow: '#FFFF00', orange: '#FFA500', purple: '#800080',
            pink: '#FFC0CB', gray: '#808080', grey: '#808080', cyan: '#00FFFF', magenta: '#FF00FF'
        };
        const foundColors = new Set<string>();
        let match: RegExpExecArray | null;
        while ((match = colorRegex.exec(svgText)) !== null) {
            let hex = match[0].toUpperCase();
            if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
            foundColors.add(hex);
        }
        while ((match = rgbRegex.exec(svgText)) !== null) foundColors.add(rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3])));
        while ((match = namedColorRegex.exec(svgText)) !== null) {
            const colorName = match[1].toLowerCase();
            if (namedColors[colorName]) foundColors.add(namedColors[colorName]);
        }
        return Array.from(foundColors);
    };

    /** Replaces the palette with measured colours, weighted by coverage when known. */
    const applySourceColors = (hexes: string[], weights: number[] | null) => {
        const map = weights && weights.some((w) => w > 0) ? toWeightMap(hexes, weights) : null;
        setSourceWeights(map);
        const base = evenWeights(hexes);
        setColors(map ? applyWeightPreset(base, 'source', map) : base);
        setActivePreset(map ? 'source' : null);
        setExpandedRows(new Set());
    };

    const applySvgText = async (svgText: string): Promise<boolean> => {
        const hexes = extractColorsFromSvgText(svgText);
        if (hexes.length === 0) return false;
        const token = ++loadToken.current;
        applySourceColors(hexes, null);
        let weights: number[] | null = null;
        const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
        try {
            const data = await rasterPixels(url);
            const measured = coverageWeights(data, hexes);
            weights = measured.some((w) => w > 0) ? measured : null;
        } catch {
            weights = null;
        } finally {
            URL.revokeObjectURL(url);
        }
        if (!weights) {
            const counted = occurrenceWeights(svgText, hexes);
            weights = counted.some((w) => w > 0) ? counted : null;
        }
        if (token === loadToken.current && weights) applySourceColors(hexes, weights);
        return true;
    };

    const handleFile = async (file: File) => {
        setInputHint(null);
        const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
        try {
            if (isSvg) {
                const ok = await applySvgText(await file.text());
                if (!ok) setInputHint(t.noColorsFound);
                return;
            }
            const token = ++loadToken.current;
            const url = URL.createObjectURL(file);
            try {
                const data = await rasterPixels(url);
                const hexes = clusterPixels(data, 6);
                if (hexes.length === 0) {
                    setInputHint(t.noColorsFound);
                    return;
                }
                if (token === loadToken.current) applySourceColors(hexes, coverageWeights(data, hexes));
            } finally {
                URL.revokeObjectURL(url);
            }
        } catch {
            setInputHint(t.gpLoadFailed);
        }
    };

    const applyPastedSvg = async () => {
        const ok = await applySvgText(svgPasteValue);
        if (ok) {
            setSvgPasteValue('');
            setInputHint(null);
        } else {
            setInputHint(t.noColorsFound);
        }
    };

    const suggestNewCombination = () => {
        const baseHue = Math.floor(Math.random() * 360);
        const harmonies = [[0, 180], [0, 120, 240], [0, 30, 60], [0, 150, 210]];
        const harmony = harmonies[Math.floor(Math.random() * harmonies.length)];

        if (fullContrastMode) {
            // Generate colors with guaranteed WCAG AA contrast between pairs
            const lightnesses = [25, 45, 65, 85]; // spread luminosities
            const colorCount = harmony.length + 2;
            const weightPerColor = Math.floor(100 / colorCount);
            const newColors: PaletteColor[] = harmony.map((shift, i) => {
                const hue = (baseHue + shift) % 360;
                const sat = 60 + Math.random() * 30;
                const light = lightnesses[i % lightnesses.length];
                const rgb = hslToRgb({ h: hue, s: sat, l: light });
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                return { hex, name: getClosestColorName(hex), weight: weightPerColor, locked: false };
            });
            newColors.push({ hex: '#FAFAFA', name: 'White', weight: weightPerColor, locked: false });
            newColors.push({ hex: '#1A1A1A', name: 'Black', weight: 100 - (weightPerColor * (colorCount - 1)), locked: false });
            setColors(newColors);
        } else {
            const saturation = 60 + Math.random() * 30;
            const lightness = 45 + Math.random() * 20;
            const colorCount = harmony.length + 2;
            const weightPerColor = Math.floor(100 / colorCount);
            const newColors: PaletteColor[] = harmony.map((shift) => {
                const hue = (baseHue + shift) % 360;
                const rgb = hslToRgb({ h: hue, s: saturation, l: lightness });
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                return { hex, name: getClosestColorName(hex), weight: weightPerColor, locked: false };
            });
            newColors.push({ hex: '#FFFFFF', name: 'White', weight: weightPerColor, locked: false });
            newColors.push({ hex: '#1A1A1A', name: 'Black', weight: 100 - (weightPerColor * (colorCount - 1)), locked: false });
            setColors(newColors);
        }
        setActivePreset(null);
        setExpandedRows(new Set());
    };

    // ------------------------------------------------------------ combinations

    const shuffleAlbers = () => {
        const baseOrder = comboOrder.length > 0 ? [...comboOrder] : albersGrid.map((_, i) => i);
        const lockedPositions = baseOrder.map((_, idx) => idx).filter((idx) => comboLocks[idx]);
        const unlockedPositions = baseOrder.map((_, idx) => idx).filter((idx) => !comboLocks[idx]);

        // Always bump seed so albersGrid reorders too
        setAlbersSeed((prev) => prev + 1);

        if (lockedPositions.length === 0) {
            setComboOrder([]);
            return;
        }

        // Prefer indices not currently visible to maximize variety
        const visible = new Set(baseOrder);
        const pool: number[] = [];
        for (let k = 0; k < albersGrid.length; k++) if (!visible.has(k)) pool.push(k);
        // Mix in current unlocked values as fallback
        const unlockedValues = unlockedPositions.map((pos) => baseOrder[pos]);
        const candidates = pool.length >= unlockedPositions.length ? pool : [...pool, ...unlockedValues];
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const newOrder = [...baseOrder];
        unlockedPositions.forEach((pos, idx) => {
            newOrder[pos] = candidates[idx % candidates.length];
        });
        setComboOrder(newOrder);
    };

    const handleComboDrop = (dropIndex: number) => {
        if (draggedComboIndex === null || draggedComboIndex === dropIndex) return;
        const currentOrder = comboOrder.length > 0 ? [...comboOrder] : albersGrid.map((_, i) => i);
        const [dragged] = currentOrder.splice(draggedComboIndex, 1);
        currentOrder.splice(dropIndex, 0, dragged);
        setComboOrder(currentOrder);
        setDraggedComboIndex(null);
    };

    const updateComboColor = (comboIdx: number, colorKey: 'outer' | 'middle' | 'inner', newHex: string) => {
        const hex = normalizeHex(newHex);
        if (!hex) return;
        setCustomCombos(prev => ({ ...prev, [comboIdx]: { ...prev[comboIdx], [colorKey]: hex } }));
    };

    const resetCombo = (comboIdx: number) => {
        setCustomCombos(prev => {
            const next = { ...prev };
            delete next[comboIdx];
            return next;
        });
        setEditingComboIndex(null);
    };

    const orderedCombos = useMemo(() => {
        const baseGrid = comboOrder.length === 0 ? albersGrid : comboOrder.map(i => albersGrid[i]).filter(Boolean);
        return baseGrid.map((combo, idx) => {
            const custom = customCombos[idx];
            return custom
                ? { ...combo, outer: custom.outer || combo.outer, middle: custom.middle || combo.middle, inner: custom.inner || combo.inner }
                : combo;
        });
    }, [albersGrid, comboOrder, customCombos]);

    const visibleComboCount = Math.min(cardCount, maxCardsFor(albersTemplate), albersGrid.length);

    // ------------------------------------------------------------ rendering

    const sheetColors = colors.map((c) => ({ hex: c.hex, name: c.name, weight: c.weight, codes: extraCodes(c.hex) }));
    const sheetOptions = (canvas: { width: number; height: number; unit: number }, forExport: boolean) => ({
        ...canvas,
        show,
        variations: showVariations,
        variationCodes: showVariationCodes,
        variationCount,
        basePosition: baseColorPosition,
        splitRatio,
        forExport,
        idPrefix: forExport ? 'gpx' : 'gp'
    });
    const sheetSvg = (forExport: boolean) =>
        renderSheet(sheetView, sheetColors, sheetOptions(forExport ? EXPORT_CANVAS : screenCanvas(sheetWidth), forExport));

    const albersSvg = (forExport: boolean) =>
        renderAlbers(albersTemplate, orderedCombos.slice(0, visibleComboCount), {
            ...(forExport ? EXPORT_CANVAS : screenCanvas(albersWidth)),
            background: ALBERS_BACKGROUNDS[albersBackground],
            layerCount: albersLayerCount,
            showHex: albersShowHex,
            showPercent: albersShowPercent,
            weightOf,
            proportional: albersProportional,
            forExport
        });

    const downloadSvg = (svgString: string, filename: string) => {
        downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), filename);
    };

    const downloadPng = async (svgString: string, filename: string) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        return new Promise<void>((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1920;
                canvas.height = 1080;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, 1920, 1080);
                    downloadUrl(canvas.toDataURL('image/png'), filename);
                }
                URL.revokeObjectURL(url);
                resolve();
            };
            img.onerror = () => {
                // Broken SVG: release the URL and settle instead of hanging forever.
                console.error('Could not render palette image');
                URL.revokeObjectURL(url);
                resolve();
            };
            img.src = url;
        });
    };

    const contrastPairs = getContrastPairs();
    const sourceAvailable = hasSourceWeights(colors, sourceWeights);
    const extraValue = EXTRA_SHEET_TEMPLATES.includes(sheetView) ? sheetView : '';
    const hasVariations = TEMPLATES_WITH_VARIATIONS.includes(sheetView);
    const sheetBg = sheetView === 'classic' || sheetView === 'vertical' || sheetView === 'columns' || sheetView === 'dots' ? 'bg-foreground' : 'bg-card';

    return (
        <div className="flex flex-col gap-5">
            {/* Input: load or paste a source, or let the tool suggest one. */}
            <Card aria-label={t.gpInputLabel} label={t.gpInputLabel}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="ctl ctl-outline h-10 px-4 shrink-0">
                        <Upload aria-hidden="true" className="h-4 w-4" />
                        {t.gpLoadFile}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        aria-hidden="true"
                        tabIndex={-1}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFile(file);
                            e.target.value = '';
                        }}
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                            type="text"
                            value={svgPasteValue}
                            onChange={(e) => { setSvgPasteValue(e.target.value); if (inputHint) setInputHint(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') void applyPastedSvg(); }}
                            placeholder={t.pasteSvgPlaceholder}
                            aria-label={t.pasteSvgPlaceholder}
                            className="field h-10 min-w-0 flex-1"
                        />
                        <button type="button" onClick={() => void applyPastedSvg()} disabled={!svgPasteValue.trim()} className="ctl ctl-outline h-10 px-4 shrink-0">
                            {t.apply}
                        </button>
                    </div>
                    <button type="button" onClick={suggestNewCombination} className="ctl ctl-tinted h-10 px-4 shrink-0">
                        <Shuffle aria-hidden="true" className="h-4 w-4" />{t.suggestCombination}
                    </button>
                </div>
                {inputHint && <p className="-mt-2 text-[13px] text-muted-foreground" role="status">{inputHint}</p>}
            </Card>

            {/* Palette colours */}
            <Card
                aria-label={t.paletteColorsLabel}
                label={`${t.paletteColorsLabel} · ${t.gpColorsCount.replace('{n}', String(colors.length))}`}
                actions={<PaletteExportMenu t={t} swatches={exportSwatches} />}
            >
                <PaletteProportionBar t={t} colors={colors} vision={vision} onFixTotal={() => setColors((prev) => normalizeWeights(prev))} />

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <Control label={t.gpDistribution}>
                            <TextTabs<WeightPreset>
                                className="max-w-full"
                                ariaLabel={t.gpDistribution}
                                value={activePreset}
                                onChange={applyPreset}
                                items={(['equal', 'rule603010', 'golden', 'descending', 'source'] as WeightPreset[]).map((preset) => ({
                                    value: preset,
                                    label: presetLabel(t, preset),
                                    disabled: preset === 'source' && !sourceAvailable,
                                    title: preset === 'source' && !sourceAvailable ? t.gpPresetSourceHint : undefined
                                }))}
                            />
                        </Control>
                        <Control label={t.gpSortBy}>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button type="button" onClick={() => sortBy('weight')} className="ctl ctl-outline ctl-sm">{t.gpSortWeight}</button>
                                <button type="button" onClick={() => sortBy('lightness')} className="ctl ctl-outline ctl-sm">{t.gpSortLightness}</button>
                                <button type="button" onClick={() => sortBy('hue')} className="ctl ctl-outline ctl-sm">{t.gpSortHue}</button>
                            </div>
                        </Control>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <ColorVisionToggle t={t} value={vision} onChange={setVision} />
                        <LegendToggle label={t.showCodes} on={allCodes} onClick={() => setAllCodes(!allCodes)} />
                    </div>
                    <VisionCaption t={t} mode={vision} />
                </div>

                <div className="flex flex-col divide-y divide-separator">
                    {colors.map((color, idx) => (
                        <PaletteColorRow
                            key={`${idx}-${color.hex}`}
                            t={t}
                            color={color}
                            index={idx}
                            count={colors.length}
                            vision={vision}
                            codes={allCodes || expandedRows.has(idx) ? extraCodes(color.hex) : []}
                            expanded={allCodes || expandedRows.has(idx)}
                            canRemove={colors.length > 2}
                            dragging={dragFrom === idx}
                            dropTarget={dragFrom !== null && dragOver === idx && dragFrom !== idx}
                            onToggleExpand={() => toggleRow(idx)}
                            onHex={(hex) => updateColor(idx, hex)}
                            onName={(name) => updateName(idx, name)}
                            onWeight={(w) => updateWeight(idx, w)}
                            onToggleLock={() => toggleLock(idx)}
                            onRemove={() => removeColor(idx)}
                            onMove={(to) => moveRow(idx, to)}
                            onDragStart={setDragFrom}
                            onDragOverRow={setDragOver}
                            onDrop={(to) => {
                                if (dragFrom !== null) moveRow(dragFrom, to);
                                setDragFrom(null);
                                setDragOver(null);
                            }}
                            onDragEnd={() => {
                                setDragFrom(null);
                                setDragOver(null);
                            }}
                        />
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newColorInput}
                        onChange={(e) => setNewColorInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addColor()}
                        className="field h-10 min-w-0 flex-1 tabular"
                        placeholder={t.addColorPlaceholder}
                        aria-label={t.addColorPlaceholder}
                    />
                    <button type="button" onClick={addColor} disabled={!normalizeHex(newColorInput)} className="ctl ctl-outline h-10 px-4 shrink-0">
                        <Plus aria-hidden="true" className="h-4 w-4" />{t.addColorButton}
                    </button>
                </div>
            </Card>

            {/* Colours from a base */}
            <Card aria-label={t.gpHarmonyTitle} label={t.gpHarmonyTitle}>
                <p className="-mt-1 text-[14px] text-muted-foreground">{t.gpHarmonyHint}</p>
                <PaletteHarmonyPanel t={t} colors={colors} onAdd={addColors} />
            </Card>

            {/* Colour sheet */}
            <Card
                aria-label={t.preview1Subtitle}
                label={t.preview1Subtitle}
                actions={
                    <>
                        <HeaderDownload label="SVG" ariaLabel={t.gpDownloadSvg} onClick={() => downloadSvg(sheetSvg(true), 'palette-sheet.svg')} />
                        <HeaderDownload label="PNG" ariaLabel={t.gpDownloadPng} onClick={() => void downloadPng(sheetSvg(true), 'palette-sheet.png')} />
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <TextTabs<SheetTemplate>
                            ariaLabel={t.gpViewLabel}
                            value={sheetView}
                            onChange={setSheetView}
                            className="max-w-full"
                            items={PRIMARY_SHEET_VIEWS.map((view) => ({ value: view, label: sheetLabel(t, view) }))}
                        />
                        <label className="flex items-center gap-3">
                            <span className="shrink-0 text-[13px] text-muted-foreground">{t.gpMoreLayouts}</span>
                            <select
                                value={extraValue}
                                onChange={(e) => e.target.value && setSheetView(e.target.value as SheetTemplate)}
                                className={`field field-sm w-auto min-w-0 ${extraValue ? 'shadow-[inset_0_0_0_1px_hsl(var(--foreground))]' : ''}`}
                            >
                                <option value="">{t.gpChoose}</option>
                                {EXTRA_SHEET_TEMPLATES.map((tpl) => (
                                    <option key={tpl} value={tpl}>{sheetLabel(t, tpl)}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <Control label={t.gpShowLabel}>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <LegendToggle label={t.gpShowName} on={show.name} onClick={() => setShow((s) => ({ ...s, name: !s.name }))} />
                            <LegendToggle label={t.gpShowHex} on={show.hex} onClick={() => setShow((s) => ({ ...s, hex: !s.hex }))} />
                            <LegendToggle label={t.gpShowPercent} on={show.percent} onClick={() => setShow((s) => ({ ...s, percent: !s.percent }))} />
                            <LegendToggle label={t.gpShowCodes} on={show.codes} onClick={() => setShow((s) => ({ ...s, codes: !s.codes }))} />
                        </div>
                    </Control>
                    {hasVariations && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            <LegendToggle label={t.gpVariationsToggle} on={showVariations} onClick={() => setShowVariations(!showVariations)} />
                            {(() => {
                                const codesDisabled = !showVariations || sheetView === 'cards';
                                return (
                                    <LegendToggle label={t.gpVariationCodes} on={showVariationCodes} disabled={codesDisabled} onClick={() => setShowVariationCodes(!showVariationCodes)} />
                                );
                            })()}
                            {sheetView === 'classic' && (
                                <>
                                    <SliderControl
                                        label={t.gpTonesPerSide}
                                        min={1}
                                        max={baseColorPosition === 'none' ? 12 : 6}
                                        value={Math.min(variationCount, baseColorPosition === 'none' ? 12 : 6)}
                                        onChange={setVariationCount}
                                        disabled={!showVariations}
                                    />
                                    <SliderControl
                                        label={t.splitLabel}
                                        min={30}
                                        max={80}
                                        value={splitRatio}
                                        onChange={setSplitRatio}
                                        suffix="%"
                                        disabled={!showVariations}
                                    />
                                </>
                            )}
                            {(sheetView === 'classic' || sheetView === 'grid') && (
                                <label className={`flex items-center gap-3 ${!showVariations ? 'opacity-40' : ''}`}>
                                    <span className="shrink-0 text-[13px] text-muted-foreground">{t.basePosition}</span>
                                    <select
                                        value={baseColorPosition}
                                        onChange={(e) => setBaseColorPosition(e.target.value as BasePosition)}
                                        disabled={!showVariations}
                                        className="field field-sm w-auto min-w-0"
                                    >
                                        <option value="none">{t.basePositionNone}</option>
                                        <option value="above">{t.basePositionAbove}</option>
                                        <option value="center">{t.basePositionCenter}</option>
                                        <option value="below">{t.basePositionBelow}</option>
                                    </select>
                                </label>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <div ref={sheetRef} className={`w-full overflow-hidden rounded-md shadow-hairline ${sheetBg}`}>
                        <div className="w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: sheetSvg(false) }} />
                    </div>
                    <p className="text-[12px] text-muted-foreground">{t.gpSheetHint}</p>
                </div>
            </Card>

            {/* Colour interaction squares */}
            <Card
                aria-label={t.preview2Title}
                label={t.preview2Title}
                actions={
                    <>
                        <HeaderDownload label="SVG" ariaLabel={t.gpDownloadSvg} onClick={() => downloadSvg(albersSvg(true), 'albers-grid.svg')} />
                        <HeaderDownload label="PNG" ariaLabel={t.gpDownloadPng} onClick={() => void downloadPng(albersSvg(true), 'albers-grid.png')} />
                    </>
                }
            >
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                    <p className="max-w-[60ch] text-[14px] text-muted-foreground">{t.preview2Subtitle}</p>
                    <Metric size="md" value={albersGrid.length} caption={t.availableCombinations} align="right" />
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                        <label className="flex items-center gap-3">
                            <span className="shrink-0 text-[13px] text-muted-foreground">{t.templateLabel}</span>
                            <select value={albersTemplate} onChange={(e) => setAlbersTemplate(e.target.value as AlbersTemplate)} className="field field-sm w-auto min-w-0">
                                {ALBERS_TEMPLATES.map((tpl) => <option key={tpl} value={tpl}>{albersLabel(t, tpl)}</option>)}
                            </select>
                        </label>
                        <Control label={t.layersLabel}>
                            <TextTabs<'2' | '3' | '4'>
                                ariaLabel={t.layersLabel}
                                value={String(albersLayerCount) as '2' | '3' | '4'}
                                onChange={(v) => setAlbersLayerCount(Number(v) as 2 | 3 | 4)}
                                items={(['2', '3', '4'] as const).map((n) => ({ value: n, label: <span className="tabular">{n}</span> }))}
                            />
                        </Control>
                        <Control label={t.backgroundLabel}>
                            <TextTabs<AlbersBackground>
                                ariaLabel={t.backgroundLabel}
                                value={albersBackground}
                                onChange={setAlbersBackground}
                                items={(['black', 'white', 'gray'] as AlbersBackground[]).map((bg) => ({
                                    value: bg,
                                    label: bg === 'black' ? t.backgroundBlack : bg === 'white' ? t.backgroundWhite : t.backgroundGray
                                }))}
                            />
                        </Control>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                        <Control label={t.gpShowLabel}>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                <LegendToggle label={t.gpShowHex} on={albersShowHex} onClick={() => setAlbersShowHex(!albersShowHex)} />
                                <LegendToggle label={t.gpShowPercent} on={albersShowPercent} onClick={() => setAlbersShowPercent(!albersShowPercent)} />
                                <LegendToggle label={t.albersProportional} on={albersProportional} onClick={() => setAlbersProportional(!albersProportional)} />
                            </div>
                        </Control>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            <LegendToggle label={t.fullContrast} on={fullContrastMode} onClick={() => setFullContrastMode(!fullContrastMode)} />
                            <button type="button" onClick={shuffleAlbers} className="ctl ctl-outline ctl-sm">
                                <Shuffle aria-hidden="true" />{t.shuffleAlbers}
                            </button>
                        </div>
                    </div>
                </div>
                <div ref={albersRef} className="w-full overflow-hidden rounded-md shadow-hairline" style={{ backgroundColor: ALBERS_BACKGROUNDS[albersBackground] }}>
                    <div className="w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: albersSvg(false) }} />
                </div>
            </Card>

            {/* Custom combinations */}
            <Card
                aria-label={t.preview3Title}
                label={t.preview3Title}
                actions={
                    <IconButton label={t.shuffleAlbers} onClick={() => { shuffleAlbers(); setCustomCombos({}); }}>
                        <Shuffle aria-hidden="true" />
                    </IconButton>
                }
            >
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <p className="max-w-[60ch] text-[14px] text-muted-foreground">{t.gpCombosHint}</p>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <SliderControl
                            label={t.cardsLabel}
                            min={Math.min(4, Math.max(1, albersGrid.length))}
                            max={Math.max(1, Math.min(maxCardsFor(albersTemplate), albersGrid.length))}
                            value={visibleComboCount}
                            onChange={setCardCount}
                        />
                        <LegendToggle label={t.fullContrast} on={fullContrastMode} onClick={() => setFullContrastMode(!fullContrastMode)} />
                    </div>
                </div>
                <div className={`grid gap-x-3 gap-y-5 ${visibleComboCount <= 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8'}`}>
                    {orderedCombos.slice(0, visibleComboCount).map((combo, idx) => {
                        const layers = comboLayers(combo, 3);
                        // Lados do meio e do centro: pela porcentagem, ou as proporções fixas de antes.
                        const [, midScale, innerScale] = albersProportional ? proportionalScales(layers, weightOf) : [1, 0.6, 0.3];
                        const midPct = `${Math.round(midScale * 1000) / 10}%`;
                        const innerPct = `${Math.round((innerScale / midScale) * 1000) / 10}%`;
                        const ratio = getContrastRatio(combo.middle, combo.inner);
                        return (
                            <div
                                key={idx}
                                draggable={editingComboIndex !== idx}
                                onDragStart={(e) => { if (editingComboIndex !== idx) { setDraggedComboIndex(idx); e.dataTransfer.effectAllowed = 'move'; } }}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDrop={(e) => { e.preventDefault(); handleComboDrop(idx); }}
                                onDragEnd={() => setDraggedComboIndex(null)}
                                className={`relative flex min-w-0 flex-col gap-2 transition-opacity duration-fast ease-out ${editingComboIndex === idx ? '' : 'cursor-grab active:cursor-grabbing'} ${draggedComboIndex === idx ? 'opacity-40' : ''}`}
                            >
                                <div
                                    className={`relative aspect-square cursor-pointer overflow-hidden rounded-md shadow-hairline ${editingComboIndex === idx ? 'ring-[1.5px] ring-foreground ring-offset-2 ring-offset-card' : ''}`}
                                    style={{ backgroundColor: combo.outer }}
                                    onClick={() => setEditingComboIndex(editingComboIndex === idx ? null : idx)}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setComboLocks((prev) => ({ ...prev, [idx]: !prev[idx] })); }}
                                        aria-pressed={!!comboLocks[idx]}
                                        aria-label={comboLocks[idx] ? t.unlockSlot : t.lockSlot}
                                        title={comboLocks[idx] ? t.unlockSlot : t.lockSlot}
                                        className={`absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-sm transition-colors duration-fast ease-out ${comboLocks[idx] ? 'bg-foreground text-background' : 'bg-card/85 text-foreground hover:bg-card'}`}
                                    >
                                        {comboLocks[idx] ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Unlock className="h-3.5 w-3.5" aria-hidden="true" />}
                                    </button>
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm" style={{ backgroundColor: combo.middle, width: midPct, height: midPct }}>
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xs" style={{ backgroundColor: combo.inner, width: innerPct, height: innerPct }} />
                                    </div>
                                    {customCombos[idx] && (
                                        <div className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm bg-card/85 text-foreground" aria-hidden="true"><Pencil className="h-3 w-3" /></div>
                                    )}
                                </div>

                                {editingComboIndex === idx && (
                                    <div
                                        role="dialog"
                                        aria-label={`${t.externalColorLabel}, ${t.middleColorLabel}, ${t.internalColorLabel}`}
                                        onKeyDown={(e) => { if (e.key === 'Escape') setEditingComboIndex(null); }}
                                        className={`material-popover materialize absolute top-[calc(100%-2.75rem)] z-30 flex w-[252px] flex-col gap-3 p-3 ${idx % 2 === 1 ? 'right-0' : 'left-0'}`}
                                    >
                                        {(['outer', 'middle', 'inner'] as const).map((key) => {
                                            const label = key === 'outer' ? t.externalColorLabel : key === 'middle' ? t.middleColorLabel : t.internalColorLabel;
                                            const current = combo[key].toUpperCase();
                                            const inPalette = paletteSlotColors.some((c) => c.hex === current);
                                            const manualKey = `${idx}-${key}`;
                                            const manual = !!manualComboLayers[manualKey] || !inPalette;
                                            return (
                                                <div key={key} className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[12px] text-muted-foreground">{label}</span>
                                                        <span className="text-[12px] tabular text-foreground">{current}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
                                                        {paletteSlotColors.map((c) => {
                                                            const selected = c.hex === current;
                                                            return (
                                                                <button
                                                                    key={c.hex}
                                                                    type="button"
                                                                    role="radio"
                                                                    aria-checked={selected}
                                                                    aria-label={`${label}: ${c.name || c.hex} ${c.hex}`}
                                                                    title={`${c.name || c.hex} · ${c.hex}`}
                                                                    onClick={() => { updateComboColor(idx, key, c.hex); setManualComboLayers((prev) => ({ ...prev, [manualKey]: false })); }}
                                                                    className={`h-6 w-6 rounded-sm shadow-hairline transition-shadow duration-fast ease-out ${selected ? 'ring-[1.5px] ring-foreground ring-offset-2 ring-offset-card' : ''}`}
                                                                    style={{ backgroundColor: c.hex }}
                                                                />
                                                            );
                                                        })}
                                                        <button
                                                            type="button"
                                                            aria-pressed={manual}
                                                            aria-label={`${label}: ${t.comboManualColor}`}
                                                            title={t.comboManualColor}
                                                            onClick={() => setManualComboLayers((prev) => ({ ...prev, [manualKey]: !manual }))}
                                                            className={`flex h-6 w-6 items-center justify-center rounded-sm transition-colors duration-fast ease-out ${manual ? 'bg-foreground text-background' : 'bg-secondary text-foreground hover:bg-fill-3'}`}
                                                        >
                                                            <Pencil className="h-3 w-3" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                    {manual && (
                                                        <div className="flex items-center gap-1.5">
                                                            <input type="color" value={combo[key]} onChange={(e) => updateComboColor(idx, key, e.target.value)} aria-label={`${label}: ${t.comboManualColor}`} className="h-8 w-8 shrink-0 cursor-pointer rounded-sm" />
                                                            <HexField value={combo[key]} onCommit={(hex) => updateComboColor(idx, key, hex)} maxLength={7} aria-label={`${label} hex`} className="field field-sm tabular min-w-0 flex-1" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <div className="flex items-center gap-2">
                                            {customCombos[idx] && (
                                                <button type="button" onClick={() => resetCombo(idx)} className="ctl ctl-outline ctl-sm flex-1">{t.resetCombo}</button>
                                            )}
                                            <button type="button" onClick={() => setEditingComboIndex(null)} className="ctl ctl-filled ctl-sm flex-1">{t.comboCloseEditor}</button>
                                        </div>
                                    </div>
                                )}
                                {(
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[14px] tabular text-foreground">{ratio.toFixed(1)}:1</span>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5" title={t.gpWeightInPalette}>
                                            {layers.map((hex, li) => {
                                                const w = weightOf(hex);
                                                return (
                                                    <span key={li} className="inline-flex items-center gap-1 text-[12px] tabular text-muted-foreground">
                                                        <span className="h-2 w-2 rounded-pill shadow-hairline" style={{ backgroundColor: hex }} aria-hidden="true" />
                                                        {typeof w === 'number' ? formatPercent(w) : '–'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Contrast pairs */}
            <Card aria-label={t.preview4Title} label={t.preview4Title}>
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <p className="text-[14px] text-muted-foreground">{t.gpContrastHint}</p>
                    <SliderControl label={t.cardsLabel} min={4} max={16} value={contrastCardCount} onChange={setContrastCardCount} />
                </div>
                {contrastPairs.length === 0 ? (
                    <p className="text-[14px] text-muted-foreground">{t.gpNoPairs}</p>
                ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
                        {contrastPairs.slice(0, contrastCardCount).map((pair, idx) => {
                            const level = wcagLevelFor(pair.ratio, 'normal');
                            return (
                                <div key={idx} className="flex min-w-0 flex-col gap-3">
                                    <div className="flex h-24 flex-col items-center justify-center gap-0.5 rounded-md p-4 shadow-hairline" style={{ backgroundColor: pair.bg }}>
                                        <span className="text-[28px] font-normal leading-none" style={{ color: pair.fg }}>Aa</span>
                                        <span className="text-[12px] tabular" style={{ color: pair.fg }}>{pair.fg}</span>
                                    </div>
                                    <div className="flex items-end justify-between gap-2">
                                        <Metric size="sm" value={`${pair.ratio.toFixed(1)}:1`} caption={`${pair.bg} · ${pair.fg}`} />
                                        <span className={`shrink-0 text-[13px] ${level === 'AAA' ? 'text-foreground' : 'text-muted-foreground'}`}>{level}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
};

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { hexToRgb, rgbToHex, isValidHex, getClosestColorName, rgbToHsl, hslToRgb, mixColors, rgbToCmyk, rgbToHsv, findReferenceMatches, hexToLab } from '../utils/colorMath';
import { getLibraryById } from '../constants';
import { useLanguage } from '../i18n';

interface PaletteColor {
    hex: string;
    name: string;
    weight: number;
    locked: boolean;
}

interface Settings {
    showHex: boolean;
    showRgb: boolean;
    showHsl: boolean;
    showHsb: boolean;
    showLab: boolean;
    showCmyk: boolean;
    showPmsC: boolean;
    showPmsU: boolean;
    showPmsSolidC: boolean;
    showPmsSolidU: boolean;
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
    showPmsC: false,
    showPmsU: false,
    showPmsSolidC: false,
    showPmsSolidU: false,
    mixFormat: 'rgb(80, 184, 72)'
};

export const GeneratedPalettes: React.FC<GeneratedPalettesProps> = ({ 
    initialHex = '#F7E043',
    settings = defaultSettings,
    externalColors
}) => {
    const { t } = useLanguage();
    const getInitialColors = (): PaletteColor[] => {
        if (externalColors && externalColors.length > 0) {
            const weightPerColor = Math.floor(100 / externalColors.length);
            const remainder = 100 - (weightPerColor * externalColors.length);
            return externalColors.map((hex, i) => ({
                hex,
                name: getClosestColorName(hex),
                weight: weightPerColor + (i === 0 ? remainder : 0),
                locked: false
            }));
        }
        return [
            { hex: '#F7E043', name: 'Reference Yellow', weight: 40, locked: false },
            { hex: '#1A1A1A', name: 'Black', weight: 20, locked: false },
            { hex: '#FFFFFF', name: 'White', weight: 20, locked: false },
            { hex: '#E5E5E5', name: 'Light Gray', weight: 10, locked: false },
            { hex: '#333333', name: 'Dark Gray', weight: 10, locked: false },
        ];
    };

    const [colors, setColors] = useState<PaletteColor[]>(getInitialColors);
    const [showCodes, setShowCodes] = useState(true);
    const [showVariationCodes, setShowVariationCodes] = useState(true);
    const [newColorInput, setNewColorInput] = useState('');
    const [albersSeed, setAlbersSeed] = useState(0);
    const [cardCount, setCardCount] = useState(8);
    const [contrastCardCount, setContrastCardCount] = useState(8);
    const [variationCount, setVariationCount] = useState(5);
    const [baseColorPosition, setBaseColorPosition] = useState<'none' | 'above' | 'center' | 'below'>('none');
    const [splitRatio, setSplitRatio] = useState(55);
    const [paletteTemplate, setPaletteTemplate] = useState<'classic' | 'vertical' | 'grid' | 'cards' | 'stripes' | 'swatches' | 'gradient' | 'mosaic'>('classic');
    const [showVariations, setShowVariations] = useState(true);
    const [albersTemplate, setAlbersTemplate] = useState<'squares' | 'circles' | 'sunset' | 'bars'>('squares');
    const [albersBackground, setAlbersBackground] = useState<'black' | 'white' | 'gray'>('black');
    const [draggedComboIndex, setDraggedComboIndex] = useState<number | null>(null);
    const [comboOrder, setComboOrder] = useState<number[]>([]);
    const [editingComboIndex, setEditingComboIndex] = useState<number | null>(null);
    const [customCombos, setCustomCombos] = useState<{ [key: number]: { outer?: string; middle?: string; inner?: string } }>({});
    const [albersLayerCount, setAlbersLayerCount] = useState<2 | 3 | 4>(3);
    const [comboLocks, setComboLocks] = useState<Record<number, boolean>>({});
    const [draggedColorIndex, setDraggedColorIndex] = useState<number | null>(null);
    const [fullContrastMode, setFullContrastMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Atualizar cores quando externalColors mudar
    useEffect(() => {
        if (externalColors && externalColors.length > 0) {
            const weightPerColor = Math.floor(100 / externalColors.length);
            const remainder = 100 - (weightPerColor * externalColors.length);
            const newColors = externalColors.map((hex, i) => ({
                hex,
                name: getClosestColorName(hex),
                weight: weightPerColor + (i === 0 ? remainder : 0),
                locked: false
            }));
            setColors(newColors);
        }
    }, [externalColors]);

    // Bibliotecas de referência
    const bridgeCoatedLibrary = useMemo(() => getLibraryById('sys_a_fin_c'), []);
    const bridgeUncoatedLibrary = useMemo(() => getLibraryById('sys_a_fin_u'), []);
    const solidCoatedLibrary = useMemo(() => getLibraryById('sys_b_fin_c'), []);
    const solidUncoatedLibrary = useMemo(() => getLibraryById('sys_b_fin_u'), []);

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
        
        // System A (C)
        if (settings.showPmsC && bridgeCoatedLibrary.length > 0) {
            const match = findReferenceMatches(hex, bridgeCoatedLibrary, 1)[0];
            if (match && match.deltaE < 15) codes.push(`PMS ${match.reference.code} C`);
        }
        // System A (U)
        if (settings.showPmsU && bridgeUncoatedLibrary.length > 0) {
            const match = findReferenceMatches(hex, bridgeUncoatedLibrary, 1)[0];
            if (match && match.deltaE < 15) codes.push(`PMS ${match.reference.code} U`);
        }
        // System B (C)
        if (settings.showPmsSolidC && solidCoatedLibrary.length > 0) {
            const match = findReferenceMatches(hex, solidCoatedLibrary, 1)[0];
            if (match && match.deltaE < 15) codes.push(`PMS ${match.reference.code} C`);
        }
        // System B (U)
        if (settings.showPmsSolidU && solidUncoatedLibrary.length > 0) {
            const match = findReferenceMatches(hex, solidUncoatedLibrary, 1)[0];
            if (match && match.deltaE < 15) codes.push(`PMS ${match.reference.code} U`);
        }

        return codes;
    };

    const getLuminance = (hex: string) => {
        const rgb = hexToRgb(hex);
        const a = [rgb.r, rgb.g, rgb.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getContrastRatio = (hex1: string, hex2: string) => {
        const l1 = getLuminance(hex1);
        const l2 = getLuminance(hex2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const getContrastColor = (hex: string) => {
        return getLuminance(hex) > 0.5 ? '#000000' : '#FFFFFF';
    };

    const getColorVariations = (hex: string, count: number = 5): string[] => {
        const rgb = hexToRgb(hex);
        const variations: string[] = [];
        
        // Tints (mais claros)
        for (let i = count; i >= 1; i--) {
            const tint = mixColors(rgb, { r: 255, g: 255, b: 255 }, (i / count) * 60);
            variations.push(rgbToHex(tint.r, tint.g, tint.b));
        }
        
        // Cor base no topo (acima)
        if (baseColorPosition === 'above') {
            variations.unshift(hex);
        }
        // Cor base no centro
        else if (baseColorPosition === 'center') {
            variations.push(hex);
        }
        
        // Shades (mais escuros)
        for (let i = 1; i <= count; i++) {
            const shade = mixColors(rgb, { r: 0, g: 0, b: 0 }, (i / count) * 60);
            variations.push(rgbToHex(shade.r, shade.g, shade.b));
        }
        
        // Cor base no final (abaixo)
        if (baseColorPosition === 'below') {
            variations.push(hex);
        }
        
        return variations;
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
                const weight = (validColors[i].weight + validColors[j].weight) / 2;
                const score = cMidInner * 0.6 + cOuterMid * 0.3 + (weight / 100) * 0.1;
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

        // Weighted random sort: higher score → higher chance of appearing earlier
        const decorated = filtered.map(c => ({ c, key: rand() / (0.5 + c.score) }));
        decorated.sort((a, b) => a.key - b.key);
        const shuffled = decorated.map(d => d.c);

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
    }, [colors, albersSeed, fullContrastMode]);

    const totalWeight = useMemo(() => colors.reduce((sum, c) => sum + c.weight, 0), [colors]);

    const addColor = () => {
        if (isValidHex(newColorInput)) {
            const hex = newColorInput.startsWith('#') ? newColorInput.toUpperCase() : `#${newColorInput.toUpperCase()}`;
            const newCount = colors.length + 1;
            const baseWeight = Math.floor(100 / newCount);
            const lockedTotal = colors.filter(c => c.locked).reduce((sum, c) => sum + c.weight, 0);
            const availableWeight = 100 - lockedTotal - baseWeight;
            const unlockedColors = colors.filter(c => !c.locked);
            const weightPerUnlocked = unlockedColors.length > 0 ? Math.floor(availableWeight / unlockedColors.length) : 0;
            const updated = colors.map(c => ({ ...c, weight: c.locked ? c.weight : weightPerUnlocked }));
            setColors([...updated, { hex, name: getClosestColorName(hex), weight: baseWeight, locked: false }]);
            setNewColorInput('');
        }
    };

    const removeColor = (index: number) => {
        if (colors.length > 2) {
            const removedWeight = colors[index].weight;
            const remaining = colors.filter((_, i) => i !== index);
            const unlockedColors = remaining.filter(c => !c.locked);
            if (unlockedColors.length > 0) {
                const extraPerUnlocked = Math.floor(removedWeight / unlockedColors.length);
                const updated = remaining.map(c => ({ ...c, weight: c.locked ? c.weight : c.weight + extraPerUnlocked }));
                const newTotal = updated.reduce((sum, c) => sum + c.weight, 0);
                if (newTotal !== 100) {
                    const lastUnlocked = updated.findIndex(c => !c.locked);
                    if (lastUnlocked !== -1) updated[lastUnlocked].weight += (100 - newTotal);
                }
                setColors(updated);
            } else {
                setColors(remaining);
            }
        }
    };

    const updateColor = (index: number, hex: string) => {
        if (isValidHex(hex)) {
            const updated = [...colors];
            updated[index] = { ...updated[index], hex: hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`, name: getClosestColorName(hex) };
            setColors(updated);
        }
    };

    const updateWeight = (index: number, newWeight: number) => {
        const oldWeight = colors[index].weight;
        const diff = newWeight - oldWeight;
        if (diff === 0) return;
        const unlockedIndices = colors.map((c, i) => ({ locked: c.locked, index: i })).filter(c => !c.locked && c.index !== index).map(c => c.index);
        if (unlockedIndices.length === 0) return;
        const diffPerUnlocked = Math.floor(diff / unlockedIndices.length);
        let remainder = diff - (diffPerUnlocked * unlockedIndices.length);
        const updated = colors.map((c, i) => {
            if (i === index) return { ...c, weight: newWeight };
            if (unlockedIndices.includes(i)) {
                let adjustment = -diffPerUnlocked;
                if (remainder !== 0) { adjustment -= Math.sign(remainder); remainder -= Math.sign(remainder); }
                const newVal = Math.max(5, Math.min(90, c.weight + adjustment));
                return { ...c, weight: newVal };
            }
            return c;
        });
        const currentTotal = updated.reduce((sum, c) => sum + c.weight, 0);
        if (currentTotal !== 100) {
            const lastUnlockedIdx = unlockedIndices[unlockedIndices.length - 1];
            if (lastUnlockedIdx !== undefined) updated[lastUnlockedIdx].weight += (100 - currentTotal);
        }
        setColors(updated);
    };

    const toggleLock = (index: number) => {
        const updated = [...colors];
        updated[index].locked = !updated[index].locked;
        setColors(updated);
    };

    const updateName = (index: number, name: string) => {
        const updated = [...colors];
        updated[index].name = name;
        setColors(updated);
    };

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

    // Drag & drop handlers para combinações
    const handleComboDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedComboIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleComboDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleComboDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        if (draggedComboIndex === null || draggedComboIndex === dropIndex) return;
        
        // Criar ordem se não existir
        const currentOrder = comboOrder.length > 0 ? [...comboOrder] : albersGrid.map((_, i) => i);
        const [dragged] = currentOrder.splice(draggedComboIndex, 1);
        currentOrder.splice(dropIndex, 0, dragged);
        setComboOrder(currentOrder);
        setDraggedComboIndex(null);
    };

    const handleComboDragEnd = () => {
        setDraggedComboIndex(null);
    };

    // Drag & drop handlers para cores da paleta
    const handleColorDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
        setDraggedColorIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleColorDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleColorDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        if (draggedColorIndex === null || draggedColorIndex === dropIndex) return;
        
        // Preservar as porcentagens nas posições originais
        const originalWeights = colors.map(c => c.weight);
        const originalLocks = colors.map(c => c.locked);
        
        // Reordenar as cores (hex e nome)
        const newColors = [...colors];
        const [dragged] = newColors.splice(draggedColorIndex, 1);
        newColors.splice(dropIndex, 0, dragged);
        
        // Restaurar as porcentagens nas posições originais
        const finalColors = newColors.map((color, idx) => ({
            ...color,
            weight: originalWeights[idx],
            locked: originalLocks[idx]
        }));
        
        setColors(finalColors);
        setDraggedColorIndex(null);
    };

    const handleColorDragEnd = () => {
        setDraggedColorIndex(null);
    };

    // Função para editar cores de uma combinação
    const updateComboColor = (comboIdx: number, colorKey: 'outer' | 'middle' | 'inner', newHex: string) => {
        if (!isValidHex(newHex)) return;
        const hex = newHex.startsWith('#') ? newHex.toUpperCase() : `#${newHex.toUpperCase()}`;
        setCustomCombos(prev => ({
            ...prev,
            [comboIdx]: {
                ...prev[comboIdx],
                [colorKey]: hex
            }
        }));
    };

    // Resetar customização de uma combinação
    const resetCombo = (comboIdx: number) => {
        setCustomCombos(prev => {
            const newCustom = { ...prev };
            delete newCustom[comboIdx];
            return newCustom;
        });
        setEditingComboIndex(null);
    };

    // Ordenar combinações pela ordem customizada ou padrão
    const orderedCombos = useMemo(() => {
        const baseGrid = comboOrder.length === 0 ? albersGrid : comboOrder.map(i => albersGrid[i]).filter(Boolean);
        // Aplicar customizações
        return baseGrid.map((combo, idx) => {
            const custom = customCombos[idx];
            if (custom) {
                return {
                    ...combo,
                    outer: custom.outer || combo.outer,
                    middle: custom.middle || combo.middle,
                    inner: custom.inner || combo.inner
                };
            }
            return combo;
        });
    }, [albersGrid, comboOrder, customCombos]);

    const getComboLayers = (combo: { outer: string; middle: string; inner: string }): string[] => {
        const layers: string[] = [combo.outer, combo.middle];
        if (albersLayerCount >= 3) layers.push(combo.inner);
        if (albersLayerCount === 4) {
            const blend = mixColors(hexToRgb(combo.middle), hexToRgb(combo.inner), 50);
            layers.push(rgbToHex(blend.r, blend.g, blend.b));
        }
        return layers.slice(0, albersLayerCount);
    };

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

    const applyExtractedColors = (colorArray: string[]) => {
        if (colorArray.length === 0) return false;
        const weightPerColor = Math.floor(100 / colorArray.length);
        const remainder = 100 - (weightPerColor * colorArray.length);
        const newColors: PaletteColor[] = colorArray.map((hex, i) => ({
            hex, name: getClosestColorName(hex), weight: weightPerColor + (i === 0 ? remainder : 0), locked: false
        }));
        setColors(newColors);
        return true;
    };

    const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const svgText = event.target?.result as string;
            applyExtractedColors(extractColorsFromSvgText(svgText));
        };
        reader.readAsText(file);
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
    };

    const generatePaletteSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const mainAreaWidth = showVariations ? width * (splitRatio / 100) : width;
        const variationsAreaWidth = width - mainAreaWidth;
        let yOffset = 0;
        const mainBlocks = colors.map((color) => {
            const blockHeight = Math.max(8, Math.floor((color.weight / 100) * height));
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex) : [];

            // Tipografia básica; sem responsividade dos códigos
            const nameFontSize = blockHeight > 140 ? 24 : blockHeight > 100 ? 18 : Math.max(14, Math.floor(blockHeight * 0.18));
            const codeFontSize = 11;
            const codeGap = 30;
            const charWidth = codeFontSize * 0.6;
            const codeY = yOffset + blockHeight - 20;
            let xPos = 40;
            const codeLines = codes
                .map((code) => {
                    const text = `<text x="${xPos}" y="${codeY}" font-size="${codeFontSize}" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.7">${code}</text>`;
                    xPos += code.length * charWidth + codeGap;
                    return text;
                })
                .join('');

            const nameY = yOffset + Math.min(45, Math.max(22, blockHeight * 0.3));
            const block = `<rect x="0" y="${yOffset}" width="${mainAreaWidth}" height="${blockHeight}" fill="${color.hex}" />` +
                `<text x="40" y="${nameY}" font-size="${nameFontSize}" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}" opacity="0.9">${color.name}</text>` +
                codeLines;

            yOffset += blockHeight;
            return block;
        }).join('');
        const colWidth = colors.length ? variationsAreaWidth / colors.length : 0;
        const variationBlocks = !showVariations ? '' : colors.map((color, colIdx) => {
            const vars = getColorVariations(color.hex, variationCount);
            const varHeight = height / vars.length;
            return vars
                .map((v, rowIdx) =>
                    `<rect x="${mainAreaWidth + colIdx * colWidth}" y="${rowIdx * varHeight}" width="${colWidth}" height="${varHeight}" fill="${v}" />${showCodes && showVariationCodes ? `<text x="${mainAreaWidth + colIdx * colWidth + 10}" y="${rowIdx * varHeight + 24}" font-size="11" font-family="'JetBrains Mono', monospace" fill="${getContrastColor(v)}" opacity="0.8">${v}</text>` : ''}`
                )
                .join('');
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style><rect width="100%" height="100%" fill="#000000" />${mainBlocks}${variationBlocks}</svg>`;
    };

    // Template 2: Vertical com hex grande centralizado - respeita peso
    const generateVerticalSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const totalWeight = colors.reduce((sum, c) => sum + c.weight, 0);
        
        let xOffset = 0;
        const columns = colors.map((color) => {
            const colWidth = (color.weight / totalWeight) * width;
            const x = xOffset;
            xOffset += colWidth;
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex) : [];
            
            // Tamanho de fonte responsivo baseado na largura da coluna
            const nameFontSize = Math.max(12, Math.min(16, colWidth * 0.04));
            const codeFontSize = Math.max(9, Math.min(12, colWidth * 0.03));
            const hexFontSize = Math.max(40, Math.min(120, colWidth * 0.35));
            const codeSpacing = Math.max(16, Math.min(22, colWidth * 0.05));
            
            // Hex grande vertical (só mostra se showCodes e coluna tem largura suficiente)
            const hexText = showCodes && colWidth > 100 ? `<text x="${x + colWidth / 2}" y="${height / 2}" font-size="${hexFontSize}" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}" opacity="0.15" text-anchor="middle" transform="rotate(-90, ${x + colWidth / 2}, ${height / 2})">${color.hex}</text>` : '';
            
            // Nome no topo
            const nameText = `<text x="${x + 15}" y="40" font-size="${nameFontSize}" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}" opacity="0.9">${color.name}</text>`;
            
            // Códigos alinhados verticalmente na parte inferior (um embaixo do outro)
            const maxCodes = colWidth > 300 ? codes.length : colWidth > 200 ? 8 : colWidth > 120 ? 5 : 3;
            const codeLines = showCodes && colWidth > 80 ? codes.slice(0, maxCodes).map((code, i) => 
                `<text x="${x + 15}" y="${height - 30 - (maxCodes - 1 - i) * codeSpacing}" font-size="${codeFontSize}" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.7">${code}</text>`
            ).join('') : '';
            
            return `<rect x="${x}" y="0" width="${colWidth}" height="${height}" fill="${color.hex}" />${hexText}${nameText}${codeLines}`;
        }).join('');
        
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style>${columns}</svg>`;
    };

    // Template 3: Grid com cores principais e variações
    const generateGridSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const mainColors = colors.filter((_, i) => i < Math.min(2, colors.length));
        const auxColors = colors.filter((_, i) => i >= 2);
        
        const mainHeight = height * 0.65;
        const auxHeight = height - mainHeight;
        const mainColWidth = width / mainColors.length;
        
        // Cores principais com variações
        const mainBlocks = mainColors.map((color, idx) => {
            const x = idx * mainColWidth;
            const textColor = getContrastColor(color.hex);
            const vars = showVariations ? getColorVariations(color.hex, 3) : [];
            const codes = showCodes ? formatColorCodes(color.hex) : [];
            const mainBlockHeight = showVariations ? mainHeight * 0.7 : mainHeight;
            const varBlockHeight = vars.length ? (mainHeight - mainBlockHeight) / vars.length : 0;
            
            const mainRect = `<rect x="${x}" y="0" width="${mainColWidth}" height="${mainBlockHeight}" fill="${color.hex}" />`;
            const nameLabel = `<text x="${x + 25}" y="55" font-size="48" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${color.name}</text>`;
            const codeLabels = codes.map((code, i) => 
                `<text x="${x + 25}" y="${90 + i * 20}" font-size="12" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.7">${code}</text>`
            ).join('');
            
            const varRects = vars.map((v, vi) => {
                const vy = mainBlockHeight + vi * varBlockHeight;
                return `<rect x="${x}" y="${vy}" width="${mainColWidth}" height="${varBlockHeight}" fill="${v}" />${showCodes && showVariationCodes ? `<text x="${x + 25}" y="${vy + 25}" font-size="14" font-family="'JetBrains Mono', monospace" fill="${getContrastColor(v)}">${500 - vi * 100}</text>` : ''}`;
            }).join('');
            
            return mainRect + nameLabel + codeLabels + varRects;
        }).join('');
        
        // Cores auxiliares na parte inferior
        const auxColWidth = width / Math.max(auxColors.length, 1);
        const auxBlocks = auxColors.map((color, idx) => {
            const x = idx * auxColWidth;
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex) : [];
            const codeLabels = codes.map((code, i) => 
                `<text x="${x + 25}" y="${mainHeight + 100 + i * 18}" font-size="11" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.7">${code}</text>`
            ).join('');
            return `<rect x="${x}" y="${mainHeight}" width="${auxColWidth}" height="${auxHeight}" fill="${color.hex}" /><text x="${x + 25}" y="${mainHeight + 45}" font-size="36" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${color.name}</text>${codeLabels}`;
        }).join('');
        
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,700&family=JetBrains+Mono:wght@400&display=swap');</style><rect width="100%" height="100%" fill="#FFFFFF" />${mainBlocks}${auxBlocks}</svg>`;
    };

    // Template 4: Cards com tamanhos proporcionais ao peso
    const generateCardsSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const padding = 20;
        const gap = 15;
        const radius = 16;
        
        // Ordenar por peso
        const sortedColors = [...colors].sort((a, b) => b.weight - a.weight);
        const topColors = sortedColors.slice(0, Math.min(3, sortedColors.length));
        const bottomColors = sortedColors.slice(3);
        
        const topHeight = height * 0.6 - padding;
        const bottomHeight = height * 0.4 - padding * 2;
        
        // Cards principais (topo)
        let topX = padding;
        const topCards = topColors.map((color, idx) => {
            const cardWidth = ((width - padding * 2 - gap * (topColors.length - 1)) * color.weight) / topColors.reduce((s, c) => s + c.weight, 0);
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex) : [];
            const vars = showVariations ? getColorVariations(color.hex, 3) : [];
            const varHeight = 40;
            
            const codeLabels = codes.map((code, i) => 
                `<text x="${topX + 25}" y="${padding + 90 + i * 20}" font-size="12" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.7">${code}</text>`
            ).join('');
            
            // Variações - apenas a última tem cantos inferiores arredondados
            const variationRects = vars.map((v, vi) => {
                const isLast = vi === vars.length - 1;
                const yPos = padding + topHeight - varHeight * (vars.length - vi);
                if (isLast) {
                    // Última variação: desenhar com path para cantos inferiores arredondados
                    const x1 = topX;
                    const y1 = yPos;
                    const w = cardWidth;
                    const h = varHeight;
                    const r = radius;
                    return `<path d="M${x1},${y1} L${x1 + w},${y1} L${x1 + w},${y1 + h - r} Q${x1 + w},${y1 + h} ${x1 + w - r},${y1 + h} L${x1 + r},${y1 + h} Q${x1},${y1 + h} ${x1},${y1 + h - r} Z" fill="${v}" opacity="0.5" />`;
                }
                return `<rect x="${topX}" y="${yPos}" width="${cardWidth}" height="${varHeight}" fill="${v}" opacity="0.5" />`;
            }).join('');
            
            const card = `
                <rect x="${topX}" y="${padding}" width="${cardWidth}" height="${topHeight}" rx="${radius}" fill="${color.hex}" />
                <text x="${topX + 25}" y="${padding + 55}" font-size="36" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${color.name}</text>
                ${codeLabels}
                ${variationRects}
            `;
            topX += cardWidth + gap;
            return card;
        }).join('');
        
        // Cards secundários (bottom) com variações - respeita pesos
        const bottomWeightTotal = bottomColors.reduce((sum, c) => sum + c.weight, 0) || 1;
        let bottomX = padding;
        const bottomCards = bottomColors.map((color, idx) => {
            const bottomColWidth = ((width - padding * 2 - gap * Math.max(bottomColors.length - 1, 0)) * color.weight) / bottomWeightTotal;
            const x = bottomX;
            const y = topHeight + padding * 2;
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex) : [];
            const vars = showVariations ? getColorVariations(color.hex, 2) : [];
            const varHeight = 30;
            
            const codeLabels = codes.map((code, i) => 
                `<text x="${x + 20}" y="${y + 60 + i * 16}" font-size="10" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.7">${code}</text>`
            ).join('');
            
            // Variações dos cards de baixo
            const bottomVariationRects = vars.map((v, vi) => {
                const isLast = vi === vars.length - 1;
                const yPos = y + bottomHeight - varHeight * (vars.length - vi);
                if (isLast) {
                    // Última variação: desenhar com path para cantos inferiores arredondados
                    const x1 = x;
                    const y1 = yPos;
                    const w = bottomColWidth;
                    const h = varHeight;
                    const r = radius;
                    return `<path d="M${x1},${y1} L${x1 + w},${y1} L${x1 + w},${y1 + h - r} Q${x1 + w},${y1 + h} ${x1 + w - r},${y1 + h} L${x1 + r},${y1 + h} Q${x1},${y1 + h} ${x1},${y1 + h - r} Z" fill="${v}" opacity="0.5" />`;
                }
                return `<rect x="${x}" y="${yPos}" width="${bottomColWidth}" height="${varHeight}" fill="${v}" opacity="0.5" />`;
            }).join('');
            
            const card = `
                <rect x="${x}" y="${y}" width="${bottomColWidth}" height="${bottomHeight}" rx="${radius}" fill="${color.hex}" />
                <text x="${x + 20}" y="${y + 35}" font-size="24" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${color.name}</text>
                ${codeLabels}
                ${bottomVariationRects}
            `;
            bottomX += bottomColWidth + gap;
            return card;
        }).join('');
        
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,700&family=JetBrains+Mono:wght@400&display=swap');</style><rect width="100%" height="100%" fill="#F5F5F5" />${topCards}${bottomCards}</svg>`;
    };

    // Template 5: Stripes (linhas horizontais proporcionais)
    const generateStripesSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const totalW = colors.reduce((s, c) => s + c.weight, 0) || 1;
        let yOff = 0;
        const rows = colors.map((color) => {
            const rowH = (color.weight / totalW) * height;
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex) : [];
            const codeRow = codes.map((c, i) => `<text x="${width - 40 - i * 180}" y="${yOff + rowH / 2 + 5}" text-anchor="end" font-size="13" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.75">${c}</text>`).join('');
            const block = `<rect x="0" y="${yOff}" width="${width}" height="${rowH}" fill="${color.hex}" />` +
                `<text x="40" y="${yOff + rowH / 2 + 12}" font-size="${Math.min(48, Math.max(18, rowH * 0.35))}" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${color.name}</text>` +
                codeRow;
            yOff += rowH;
            return block;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style>${rows}</svg>`;
    };

    // Template 6: Swatches (grid de cartões iguais)
    const generateSwatchesSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const pad = 32;
        const cols = Math.min(colors.length, Math.ceil(Math.sqrt(colors.length * (width / height))));
        const rows = Math.ceil(colors.length / cols);
        const cellW = (width - pad * (cols + 1)) / cols;
        const cellH = (height - pad * (rows + 1)) / rows;
        const swatches = colors.map((color, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const x = pad + c * (cellW + pad);
            const y = pad + r * (cellH + pad);
            const textColor = getContrastColor(color.hex);
            const codes = showCodes ? formatColorCodes(color.hex).slice(0, 4) : [];
            const codeLines = codes.map((cd, ci) => `<text x="${x + 24}" y="${y + cellH - 24 - (codes.length - 1 - ci) * 18}" font-size="12" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.75">${cd}</text>`).join('');
            return `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="20" fill="${color.hex}" />` +
                `<text x="${x + 24}" y="${y + 48}" font-size="28" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${color.name}</text>` +
                codeLines;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style><rect width="100%" height="100%" fill="#F5F5F5" />${swatches}</svg>`;
    };

    // Template 7: Gradient (faixa contínua com fusão)
    const generateGradientSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const stops = colors.map((c, i) => `<stop offset="${(i / Math.max(colors.length - 1, 1)) * 100}%" stop-color="${c.hex}" />`).join('');
        const labelW = width / colors.length;
        const labels = colors.map((c, i) => {
            const x = i * labelW + labelW / 2;
            const textColor = getContrastColor(c.hex);
            const codes = showCodes ? formatColorCodes(c.hex).slice(0, 3) : [];
            const codeLines = codes.map((cd, ci) => `<text x="${x}" y="${height - 60 + ci * 18}" text-anchor="middle" font-size="11" font-family="'JetBrains Mono', monospace" fill="${textColor}" opacity="0.85">${cd}</text>`).join('');
            return `<text x="${x}" y="80" text-anchor="middle" font-size="28" font-family="'Inter', sans-serif" font-weight="700" fill="${textColor}">${c.name}</text>${codeLines}`;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">${stops}</linearGradient></defs><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style><rect width="100%" height="100%" fill="url(#g)" />${labels}</svg>`;
    };

    // Template 8: Mosaic (cor principal + secundárias quebradas)
    const generateMosaicSvg = (): string => {
        const width = 1920;
        const height = 1080;
        if (colors.length === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" />`;
        const sorted = [...colors].sort((a, b) => b.weight - a.weight);
        const main = sorted[0];
        const rest = sorted.slice(1);
        const heroW = width * 0.6;
        const sideW = width - heroW;
        const tcMain = getContrastColor(main.hex);
        const codesMain = showCodes ? formatColorCodes(main.hex).slice(0, 6) : [];
        const codeMainLines = codesMain.map((cd, i) => `<text x="60" y="${height - 80 - (codesMain.length - 1 - i) * 22}" font-size="14" font-family="'JetBrains Mono', monospace" fill="${tcMain}" opacity="0.8">${cd}</text>`).join('');
        const hero = `<rect x="0" y="0" width="${heroW}" height="${height}" fill="${main.hex}" />` +
            `<text x="60" y="120" font-size="72" font-family="'Inter', sans-serif" font-weight="700" fill="${tcMain}">${main.name}</text>` +
            codeMainLines;
        const totalRest = rest.reduce((s, c) => s + c.weight, 0) || 1;
        let yOff = 0;
        const sides = rest.map((c) => {
            const h = (c.weight / totalRest) * height;
            const tc = getContrastColor(c.hex);
            const codes = showCodes ? formatColorCodes(c.hex).slice(0, 3) : [];
            const codeLines = codes.map((cd, i) => `<text x="${heroW + 30}" y="${yOff + h - 30 - (codes.length - 1 - i) * 16}" font-size="11" font-family="'JetBrains Mono', monospace" fill="${tc}" opacity="0.8">${cd}</text>`).join('');
            const block = `<rect x="${heroW}" y="${yOff}" width="${sideW}" height="${h}" fill="${c.hex}" />` +
                `<text x="${heroW + 30}" y="${yOff + 50}" font-size="28" font-family="'Inter', sans-serif" font-weight="700" fill="${tc}">${c.name}</text>` +
                codeLines;
            yOff += h;
            return block;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=JetBrains+Mono:wght@400&amp;display=swap');</style>${hero}${sides}</svg>`;
    };

    // Função que retorna o SVG baseado no template selecionado
    const getCurrentPaletteSvg = (): string => {
        switch (paletteTemplate) {
            case 'vertical': return generateVerticalSvg();
            case 'grid': return generateGridSvg();
            case 'cards': return generateCardsSvg();
            case 'stripes': return generateStripesSvg();
            case 'swatches': return generateSwatchesSvg();
            case 'gradient': return generateGradientSvg();
            case 'mosaic': return generateMosaicSvg();
            default: return generatePaletteSvg();
        }
    };

    // Função que retorna a cor de fundo baseada na seleção
    const getAlbersBackgroundColor = (): string => {
        switch (albersBackground) {
            case 'white': return '#FFFFFF';
            case 'gray': return '#E5E5E5';
            default: return '#000000';
        }
    };

    // Limite máximo de cards por template
    const getMaxCardsByTemplate = (template: string): number => {
        switch (template) {
            case 'squares': return 18;
            case 'circles': return 18;
            case 'sunset': return 20;
            case 'bars': return 12;
            default: return 18;
        }
    };

    // Template 1: Quadrados (original)
    const generateAlbersSquaresSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const padding = 60;
        const gapX = 30;
        const gapY = 30;
        const maxCards = getMaxCardsByTemplate('squares');
        const safeCardCount = Math.min(cardCount, orderedCombos.length, maxCards);
        const displayItems = orderedCombos.slice(0, safeCardCount);
        const itemCount = displayItems.length;
        if (itemCount === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" /></svg>`;
        
        // Calcular grid responsivo que preencha toda a área
        const aspectRatio = width / height;
        let bestCols = 1;
        let bestRows = itemCount;
        let bestFit = 0;
        
        for (let cols = 1; cols <= itemCount; cols++) {
            const rows = Math.ceil(itemCount / cols);
            const cellWidth = (width - padding * 2 - gapX * (cols - 1)) / cols;
            const cellHeight = (height - padding * 2 - gapY * (rows - 1)) / rows;
            const cellSize = Math.min(cellWidth, cellHeight);
            const totalArea = cellSize * cellSize * itemCount;
            
            // Penaliza linhas incompletas
            const lastRowItems = itemCount % cols || cols;
            const completeness = lastRowItems / cols;
            const fit = totalArea * completeness;
            
            if (fit > bestFit) {
                bestFit = fit;
                bestCols = cols;
                bestRows = rows;
            }
        }
        
        const cols = bestCols;
        const rows = bestRows;
        const cellWidth = (width - padding * 2 - gapX * (cols - 1)) / cols;
        const cellHeight = (height - padding * 2 - gapY * (rows - 1)) / rows;
        const squareSize = Math.min(cellWidth, cellHeight) * 0.85;
        const cells = displayItems.map((combo, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = padding + col * (cellWidth + gapX);
            const y = padding + row * (cellHeight + gapY);
            const cx = x + cellWidth / 2;
            const cy = y + cellHeight / 2;
            const layers = getComboLayers(combo);
            const outerSize = squareSize;
            const sizeFactors = [1, 0.65, 0.4, 0.22];
            const rects = layers.map((color, i) => {
                const size = outerSize * (sizeFactors[i] || Math.max(0.15, 0.65 ** i));
                return `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" fill="${color}" />`;
            }).join('');
            const weightText = `${combo.weight.toFixed(0)}%`;
            const labelX = cx - outerSize / 2 + 8;
            const labelY = cy + outerSize / 2 + 14; // texto fora da base inferior
            const weightY = labelY + 12;
            return `<g>${rects}${showCodes ? `<text x="${labelX}" y="${labelY}" font-size="9" font-family="monospace" fill="${getContrastColor(combo.outer)}" opacity="0.8">${combo.outer}</text><text x="${labelX}" y="${weightY}" font-size="10" font-family="monospace" fill="${getContrastColor(combo.outer)}" opacity="0.9" font-weight="bold">${weightText}</text>` : ''}</g>`;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" />${cells}</svg>`;
    };

    // Template 2: Círculos concêntricos
    const generateAlbersCirclesSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const padding = 60;
        const gapX = 40;
        const gapY = 40;
        const maxCards = getMaxCardsByTemplate('circles');
        const safeCardCount = Math.min(cardCount, orderedCombos.length, maxCards);
        const displayItems = orderedCombos.slice(0, safeCardCount);
        const itemCount = displayItems.length;
        if (itemCount === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" /></svg>`;
        
        // Calcular grid responsivo
        let bestCols = 1;
        let bestFit = 0;
        
        for (let cols = 1; cols <= itemCount; cols++) {
            const rows = Math.ceil(itemCount / cols);
            const cellWidth = (width - padding * 2 - gapX * (cols - 1)) / cols;
            const cellHeight = (height - padding * 2 - gapY * (rows - 1)) / rows;
            const cellSize = Math.min(cellWidth, cellHeight);
            const lastRowItems = itemCount % cols || cols;
            const completeness = lastRowItems / cols;
            const fit = cellSize * cellSize * itemCount * completeness;
            
            if (fit > bestFit) {
                bestFit = fit;
                bestCols = cols;
            }
        }
        
        const cols = bestCols;
        const rows = Math.ceil(itemCount / cols);
        const cellWidth = (width - padding * 2 - gapX * (cols - 1)) / cols;
        const cellHeight = (height - padding * 2 - gapY * (rows - 1)) / rows;
        const circleRadius = Math.min(cellWidth, cellHeight) * 0.42;
        const cells = displayItems.map((combo, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cx = padding + col * (cellWidth + gapX) + cellWidth / 2;
            const cy = padding + row * (cellHeight + gapY) + cellHeight / 2;
            const layers = getComboLayers(combo);
            const radiusFactors = [1, 0.65, 0.42, 0.26];
            const circles = layers.map((color, i) => `<circle cx="${cx}" cy="${cy}" r="${circleRadius * (radiusFactors[i] || Math.max(0.2, 0.65 ** i))}" fill="${color}" />`).join('');
            return `<g>${circles}</g>`;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" />${cells}</svg>`;
    };

    // Template 3: Sunset (círculos concêntricos centralizados)
    const generateAlbersSunsetSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const padding = 30;
        const gap = 15;
        const maxCards = getMaxCardsByTemplate('sunset');
        const safeCardCount = Math.min(cardCount, orderedCombos.length, maxCards);
        const displayItems = orderedCombos.slice(0, safeCardCount);
        const itemCount = displayItems.length;
        if (itemCount === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" /></svg>`;
        
        // Calcular grid responsivo
        let bestCols = 1;
        let bestFit = 0;
        
        for (let cols = 1; cols <= itemCount; cols++) {
            const rows = Math.ceil(itemCount / cols);
            const cellWidth = (width - padding * 2 - gap * (cols - 1)) / cols;
            const cellHeight = (height - padding * 2 - gap * (rows - 1)) / rows;
            const cellSize = Math.min(cellWidth, cellHeight);
            const lastRowItems = itemCount % cols || cols;
            const completeness = lastRowItems / cols;
            const fit = cellSize * cellSize * itemCount * completeness;
            
            if (fit > bestFit) {
                bestFit = fit;
                bestCols = cols;
            }
        }
        
        const cols = bestCols;
        const rows = Math.ceil(itemCount / cols);
        const cellWidth = (width - padding * 2 - gap * (cols - 1)) / cols;
        const cellHeight = (height - padding * 2 - gap * (rows - 1)) / rows;
        const cells = displayItems.map((combo, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = padding + col * (cellWidth + gap);
            const y = padding + row * (cellHeight + gap);
            const cx = x + cellWidth / 2;
            const cy = y + cellHeight / 2;
            const r = Math.min(cellWidth, cellHeight) * 0.38;
            // Círculos concêntricos centralizados
            const layers = getComboLayers(combo);
            const radiusFactors = [1, 0.65, 0.42, 0.26];
            const circles = layers.map((color, i) => `<circle cx="${cx}" cy="${cy}" r="${r * (radiusFactors[i] || Math.max(0.2, 0.65 ** i))}" fill="${color}" />`).join('');
            return `<g>
                <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="8" fill="${combo.outer}" />
                ${circles}
            </g>`;
        }).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" />${cells}</svg>`;
    };

    // Template 4: Barras verticais - usa combinações
    const generateAlbersBarsSvg = (): string => {
        const width = 1920;
        const height = 1080;
        const padding = 80;
        const gap = 20;
        const maxCards = getMaxCardsByTemplate('bars');
        const safeCardCount = Math.min(cardCount, orderedCombos.length, maxCards);
        const displayItems = orderedCombos.slice(0, safeCardCount);
        const numBars = displayItems.length;
        if (numBars === 0) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" /></svg>`;
        
        // Grid responsivo para barras - preenche toda a largura
        const availableWidth = width - padding * 2;
        const barWidth = (availableWidth - gap * (numBars - 1)) / numBars;
        const barHeight = height - padding * 2 - 40; // 40 para o círculo no topo
        
        const bars = displayItems.map((combo, idx) => {
            const x = padding + idx * (barWidth + gap);
            const y = padding + 40;
            const layers = getComboLayers(combo);
            const segmentHeight = barHeight / layers.length;
            const segments = layers.map((color, i) => `<rect x="${x}" y="${y + segmentHeight * i}" width="${barWidth}" height="${segmentHeight}" fill="${color}" />`).join('');

            // Círculo no topo
            const circleY = y - 20;
            const circleR = Math.min(15, barWidth * 0.15);
            const circleFill = layers[1] || layers[0];
            const circleStroke = layers[0];
            const circle = `<circle cx="${x + barWidth / 2}" cy="${circleY}" r="${circleR}" fill="${circleFill}" stroke="${circleStroke}" stroke-width="3" />`;

            return segments + circle;
        }).join('');
        
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${getAlbersBackgroundColor()}" />${bars}</svg>`;
    };

    // Função que retorna o SVG baseado no template de Albers selecionado
    const getCurrentAlbersSvg = (): string => {
        switch (albersTemplate) {
            case 'circles': return generateAlbersCirclesSvg();
            case 'sunset': return generateAlbersSunsetSvg();
            case 'bars': return generateAlbersBarsSvg();
            default: return generateAlbersSquaresSvg();
        }
    };

    const downloadSvg = (svgString: string, filename: string) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
                    const pngUrl = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = pngUrl;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(url);
                resolve();
            };
            img.src = url;
        });
    };

    const contrastPairs = getContrastPairs();

    return (
        <div className="max-w-[1600px] mx-auto py-8 space-y-16">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h2 className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mb-1">PALETTE EXPORT</h2>
                    <p className="text-3xl font-normal tracking-tight text-foreground">Paletas Geradas</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full cursor-pointer hover:bg-secondary/40 hover:border-border transition-all text-foreground/80">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground/80">Upload SVG</span>
                        <input ref={fileInputRef} type="file" accept=".svg" className="hidden" onChange={handleSvgUpload} />
                    </label>
                    <button onClick={suggestNewCombination} className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/80 transition-all">
                        <span>🎲</span> Sugerir Combinação
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={showCodes} onChange={(e) => setShowCodes(e.target.checked)} className="w-4 h-4 accent-black" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground/80">Mostrar Códigos</span>
                    </label>
                </div>
            </div>

            <section className="bg-secondary/40 rounded-[2rem] p-8 border border-border/60">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">CORES DA PALETA</h3>
                    <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${totalWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>Total: {totalWeight}%</span>
                        {totalWeight !== 100 && <span className="text-[9px] text-amber-600">(deve ser 100%)</span>}
                    </div>
                </div>
                <div className="space-y-4 mb-6">
                    {colors.map((color, idx) => (
                        <div 
                            key={idx} 
                            className={`flex flex-wrap items-center gap-4 p-4 bg-card rounded-2xl border transition-all ${draggedColorIndex === idx ? 'border-foreground opacity-50' : 'border-border/60 hover:border-border'}`}
                            onDragOver={handleColorDragOver}
                            onDrop={(e) => handleColorDrop(e, idx)}
                        >
                            <button
                                draggable
                                onDragStart={(e) => handleColorDragStart(e, idx)}
                                onDragEnd={handleColorDragEnd}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary hover:bg-muted cursor-grab active:cursor-grabbing transition-all flex-shrink-0"
                                title="Arrastar para reordenar"
                            >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-16 rounded-xl shadow-md border border-border flex-shrink-0" style={{ backgroundColor: color.hex }} />
                            </div>
                            <div className="flex-1 min-w-[200px] space-y-2">
                                <div className="flex gap-2">
                                    <input type="text" value={color.hex} onChange={(e) => updateColor(idx, e.target.value)} className="w-28 px-3 py-2 font-mono text-sm border border-border rounded-lg focus:outline-none focus:border-foreground" placeholder="#FFFFFF" />
                                    <input type="text" value={color.name} onChange={(e) => updateName(idx, e.target.value)} className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-foreground" placeholder="Nome da cor" />
                                </div>
                                <div className="flex flex-wrap gap-2 text-[9px] font-mono text-muted-foreground">
                                    {formatColorCodes(color.hex).slice(1).map((code, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-secondary rounded">{code}</span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleLock(idx)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${color.locked ? 'bg-amber-100 text-amber-600' : 'bg-secondary text-muted-foreground hover:bg-muted'}`} title={color.locked ? 'Destrava peso' : 'Trava peso'}>
                                        {color.locked ? (
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" /></svg>
                                        )}
                                    </button>
                                    <span className={`font-mono text-[10px] w-16 ${color.locked ? 'text-amber-600 font-bold' : 'text-muted-foreground'}`}>{color.weight}% {color.locked && '🔒'}</span>
                                    <input type="range" min="5" max="90" step="1" value={color.weight} onChange={(e) => updateWeight(idx, parseInt(e.target.value))} disabled={color.locked} className={`flex-1 h-2 accent-black rounded-full ${color.locked ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                </div>
                            </div>
                            {colors.length > 2 && (
                                <button onClick={() => removeColor(idx)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary hover:bg-red-100 hover:text-red-600 transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={newColorInput} onChange={(e) => setNewColorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addColor()} className="flex-1 px-4 py-3 font-mono text-sm border-2 border-dashed border-border rounded-xl focus:outline-none focus:border-foreground" placeholder={t.addColorPlaceholder} />
                    <button onClick={addColor} disabled={!isValidHex(newColorInput)} className="px-6 py-3 bg-foreground text-background rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">{t.addColorButton}</button>
                </div>
            </section>

            <section>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{t.preview1Title}</h3>
                        <p className="text-xl font-normal tracking-tight">{t.preview1Subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.templateLabel}:</span>
                            <select 
                                value={paletteTemplate} 
                                onChange={(e) => setPaletteTemplate(e.target.value as typeof paletteTemplate)}
                                className="px-3 py-1.5 border border-border rounded-lg font-mono text-[10px] focus:outline-none focus:border-foreground bg-card"
                            >
                                <option value="classic">{t.classic}</option>
                                <option value="vertical">{t.vertical}</option>
                                <option value="grid">{t.grid}</option>
                                <option value="cards">{t.cards}</option>
                                <option value="stripes">Stripes</option>
                                <option value="swatches">Swatches</option>
                                <option value="gradient">Gradient</option>
                                <option value="mosaic">Mosaic</option>
                            </select>
                        </div>
                        {paletteTemplate === 'classic' && (
                            <>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.splitLabel}:</span>
                                    <input 
                                        type="range" 
                                        min="30" 
                                        max="80" 
                                        value={splitRatio} 
                                        onChange={(e) => setSplitRatio(Number(e.target.value))} 
                                        className="w-20 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
                                    />
                                    <span className="font-mono text-sm font-bold w-10 text-center">{splitRatio}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.variationsLabel}:</span>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max={baseColorPosition === 'none' ? 12 : 6} 
                                        value={variationCount} 
                                        onChange={(e) => setVariationCount(Number(e.target.value))} 
                                        className="w-20 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
                                    />
                                    <span className="font-mono text-sm font-bold w-12 text-center">
                                        {baseColorPosition === 'none' ? `${variationCount}+${variationCount}` : `${variationCount}+1+${variationCount}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.baseColorPositionLabel}:</span>
                                    <select 
                                        value={baseColorPosition} 
                                        onChange={(e) => setBaseColorPosition(e.target.value as 'none' | 'above' | 'center' | 'below')}
                                        className="px-2 py-1 border border-border rounded text-[10px] font-mono bg-card"
                                    >
                                        <option value="none">{t.basePositionNone}</option>
                    	                <option value="above">{t.basePositionAbove}</option>
                                        <option value="center">{t.basePositionCenter}</option>
                                        <option value="below">{t.basePositionBelow}</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <button 
                            onClick={() => setShowVariationCodes((prev) => !prev)}
                            className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${showVariationCodes ? 'border border-border hover:bg-secondary/40 text-foreground/80' : 'bg-foreground text-background hover:bg-foreground/80'}`}
                        >
                            {showVariationCodes ? t.showVariationCodesOn : t.showVariationCodesOff}
                        </button>
                        <button
                            onClick={() => setShowVariations((prev) => !prev)}
                            className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${showVariations ? 'border border-border hover:bg-secondary/40 text-foreground/80' : 'bg-foreground text-background hover:bg-foreground/80'}`}
                        >
                            {showVariations ? 'Hide variations' : 'Show variations'}
                        </button>
                        <button 
                            onClick={() => setShowCodes((prev) => !prev)}
                            className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${showCodes ? 'border border-border hover:bg-secondary/40 text-foreground/80' : 'bg-foreground text-background hover:bg-foreground/80'}`}
                        >
                            {showCodes ? t.showCodesOn : t.showCodesOff}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => downloadSvg(getCurrentPaletteSvg(), 'palette-sheet.svg')} className="px-4 py-2 border border-border rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-secondary/40 transition-all">↓ SVG</button>
                            <button onClick={() => downloadPng(getCurrentPaletteSvg(), 'palette-sheet.png')} className="px-4 py-2 bg-foreground text-background rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/80 transition-all">↓ PNG</button>
                        </div>
                    </div>
                </div>
                <div className={`w-full rounded-2xl overflow-hidden shadow-2xl ${paletteTemplate === 'cards' || paletteTemplate === 'grid' ? 'bg-secondary' : 'bg-foreground'}`}>
                    <div className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:block" dangerouslySetInnerHTML={{ __html: getCurrentPaletteSvg() }} />
                </div>
            </section>

            <section>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{t.preview2Title.toUpperCase()}</h3>
                        <p className="text-xl font-normal tracking-tight">{t.preview2Subtitle}</p>
                        <span className="text-xs text-muted-foreground">{albersGrid.length} {t.availableCombinations}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.templateLabel}:</span>
                            <select 
                                value={albersTemplate} 
                                onChange={(e) => setAlbersTemplate(e.target.value as 'squares' | 'circles' | 'sunset' | 'bars')}
                                className="px-3 py-1.5 border border-border rounded-lg font-mono text-[10px] focus:outline-none focus:border-foreground bg-card"
                            >
                                <option value="squares">{t.templateSquares}</option>
                                <option value="circles">{t.templateCircles}</option>
                                <option value="sunset">{t.templateSunset}</option>
                                <option value="bars">{t.templateBars}</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">Layers:</span>
                            <select
                                value={albersLayerCount}
                                onChange={(e) => setAlbersLayerCount(Number(e.target.value) as 2 | 3 | 4)}
                                className="px-3 py-1.5 border border-border rounded-lg font-mono text-[10px] focus:outline-none focus:border-foreground bg-card"
                            >
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.backgroundLabel}:</span>
                            <select 
                                value={albersBackground} 
                                onChange={(e) => setAlbersBackground(e.target.value as 'black' | 'white' | 'gray')}
                                className="px-3 py-1.5 border border-border rounded-lg font-mono text-[10px] focus:outline-none focus:border-foreground bg-card"
                            >
                                <option value="black">{t.backgroundBlack}</option>
                                <option value="white">{t.backgroundWhite}</option>
                                <option value="gray">{t.backgroundGray}</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setFullContrastMode(!fullContrastMode)} 
                                className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all border ${fullContrastMode ? 'border-transparent' : 'border-border hover:bg-secondary/40'}`}
                                style={fullContrastMode ? { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--foreground))' } : {}}
                            >
                                {fullContrastMode ? '◉' : '○'} FULL CONTRAST
                            </button>
                            <button onClick={shuffleAlbers} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-all">
                                🔀 {t.shuffleAlbers}
                            </button>
                            <button onClick={() => downloadSvg(getCurrentAlbersSvg(), 'albers-grid.svg')} className="px-4 py-2 border border-border rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-secondary/40 transition-all">↓ SVG</button>
                            <button onClick={() => downloadPng(getCurrentAlbersSvg(), 'albers-grid.png')} className="px-4 py-2 bg-foreground text-background rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/80 transition-all">↓ PNG</button>
                        </div>
                    </div>
                </div>
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: getAlbersBackgroundColor() }}>
                    <div className="w-full [&>svg]:w-full [&>svg]:h-auto [&>svg]:block" dangerouslySetInnerHTML={{ __html: getCurrentAlbersSvg() }} />
                </div>
            </section>

            <section className="bg-secondary/40 rounded-[2rem] p-8 border border-border/60">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{t.preview3Title.toUpperCase()}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{t.preview3Subtitle}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.cardsLabel}:</span>
                            <input 
                                type="range" 
                                min="4" 
                                max={Math.min(getMaxCardsByTemplate(albersTemplate), albersGrid.length)} 
                                value={Math.min(cardCount, getMaxCardsByTemplate(albersTemplate), albersGrid.length)} 
                                onChange={(e) => setCardCount(Math.min(Number(e.target.value), getMaxCardsByTemplate(albersTemplate), albersGrid.length))} 
                                className="w-24 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
                            />
                            <span className="font-mono text-sm font-bold w-6 text-center">{Math.min(cardCount, getMaxCardsByTemplate(albersTemplate), albersGrid.length)}</span>
                        </div>
                        <button 
                            onClick={() => setFullContrastMode(!fullContrastMode)} 
                            className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider transition-all border ${fullContrastMode ? 'border-transparent' : 'border-border hover:bg-secondary/40'}`}
                            style={fullContrastMode ? { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--foreground))' } : {}}
                        >
                            {fullContrastMode ? '◉' : '○'} FULL CONTRAST
                        </button>
                        <button onClick={() => { shuffleAlbers(); setCustomCombos({}); }} className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-foreground/80 transition-all">
                            🔀 {t.shuffleAlbers}
                        </button>
                    </div>
                </div>
                <div className={`grid gap-3 ${cardCount <= 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6' : cardCount <= 12 ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6' : 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'}`}>
                    {orderedCombos.slice(0, Math.min(cardCount, getMaxCardsByTemplate(albersTemplate), albersGrid.length)).map((combo, idx) => (
                        <div 
                            key={idx}
                            draggable={editingComboIndex !== idx}
                            onDragStart={(e) => editingComboIndex !== idx && handleComboDragStart(e, idx)}
                            onDragOver={handleComboDragOver}
                            onDrop={(e) => handleComboDrop(e, idx)}
                            onDragEnd={handleComboDragEnd}
                            className={`space-y-1 transition-all ${editingComboIndex === idx ? 'ring-2 ring-black rounded-xl' : 'cursor-grab active:cursor-grabbing hover:scale-105'} ${draggedComboIndex === idx ? 'opacity-50 scale-95' : ''}`}
                        >
                            <div 
                                className="aspect-square rounded-xl overflow-hidden shadow-lg relative cursor-pointer" 
                                style={{ backgroundColor: combo.outer }}
                                onClick={() => setEditingComboIndex(editingComboIndex === idx ? null : idx)}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); setComboLocks((prev) => ({ ...prev, [idx]: !prev[idx] })); }}
                                    className="absolute top-1 left-1 px-1.5 py-1 rounded-md bg-card/80 text-[9px] font-mono font-bold shadow-sm hover:bg-card"
                                    title={comboLocks[idx] ? 'Unlock slot' : 'Lock slot'}
                                >
                                    {comboLocks[idx] ? '🔒' : '🔓'}
                                </button>
                                <div className="absolute w-[60%] h-[60%] left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 rounded-lg" style={{ backgroundColor: combo.middle }}>
                                    <div className="absolute w-[50%] h-[50%] left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 rounded-md" style={{ backgroundColor: combo.inner }} />
                                </div>
                                {customCombos[idx] && (
                                    <div className="absolute top-1 right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[8px]">✏️</div>
                                )}
                            </div>
                            
                            {editingComboIndex === idx ? (
                                <div className="p-2 bg-card rounded-lg border border-border space-y-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[8px] text-muted-foreground w-8">{t.externalColorLabel}:</span>
                                        <input 
                                            type="color" 
                                            value={combo.outer} 
                                            onChange={(e) => updateComboColor(idx, 'outer', e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            value={combo.outer} 
                                            onChange={(e) => updateComboColor(idx, 'outer', e.target.value)}
                                            className="flex-1 text-[9px] font-mono px-1 py-0.5 border rounded w-16"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[8px] text-muted-foreground w-8">Mid:</span>
                                        <input 
                                            type="color" 
                                            value={combo.middle} 
                                            onChange={(e) => updateComboColor(idx, 'middle', e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            value={combo.middle} 
                                            onChange={(e) => updateComboColor(idx, 'middle', e.target.value)}
                                            className="flex-1 text-[9px] font-mono px-1 py-0.5 border rounded w-16"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[8px] text-muted-foreground w-8">{t.internalColorLabel}:</span>
                                        <input 
                                            type="color" 
                                            value={combo.inner} 
                                            onChange={(e) => updateComboColor(idx, 'inner', e.target.value)}
                                            className="w-6 h-6 rounded cursor-pointer"
                                        />
                                        <input 
                                            type="text" 
                                            value={combo.inner} 
                                            onChange={(e) => updateComboColor(idx, 'inner', e.target.value)}
                                            className="flex-1 text-[9px] font-mono px-1 py-0.5 border rounded w-16"
                                        />
                                    </div>
                                    {customCombos[idx] && (
                                        <button 
                                            onClick={() => resetCombo(idx)}
                                            className="w-full text-[8px] text-red-500 hover:text-red-700 py-1"
                                        >
                                            {t.resetCombo}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="flex justify-center gap-0.5 mb-0.5">
                                        <span className={`${cardCount > 12 ? 'w-2 h-2' : 'w-3 h-3'} rounded border border-border`} style={{ backgroundColor: combo.outer }} title={combo.outer}></span>
                                        <span className={`${cardCount > 12 ? 'w-2 h-2' : 'w-3 h-3'} rounded border border-border`} style={{ backgroundColor: combo.middle }} title={combo.middle}></span>
                                        <span className={`${cardCount > 12 ? 'w-2 h-2' : 'w-3 h-3'} rounded border border-border`} style={{ backgroundColor: combo.inner }} title={combo.inner}></span>
                                    </div>
                                    <span className={`font-mono text-muted-foreground ${cardCount > 12 ? 'text-[6px]' : 'text-[8px]'}`}>{combo.weight.toFixed(0)}% • {getContrastRatio(combo.middle, combo.inner).toFixed(1)}:1</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-secondary/40 rounded-[2rem] p-8 border border-border/60 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{t.preview4Title.toUpperCase()}</h3>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.cardsLabel}:</span>
                        <input 
                            type="range" 
                            min="4" 
                            max="16" 
                            value={contrastCardCount} 
                            onChange={(e) => setContrastCardCount(Number(e.target.value))} 
                            className="w-24 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-black"
                        />
                        <span className="font-mono text-sm font-bold w-6 text-center">{contrastCardCount}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {contrastPairs.slice(0, contrastCardCount).map((pair, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden shadow-sm border border-border/60">
                            <div className="p-4 flex flex-col items-center justify-center h-24" style={{ backgroundColor: pair.bg }}>
                                <span className="text-2xl font-bold" style={{ color: pair.fg }}>Aa</span>
                                <span className="text-xs font-mono" style={{ color: pair.fg }}>{pair.fg}</span>
                            </div>
                            <div className="bg-card p-3 text-center border-t border-border/60">
                                <span className={`font-mono text-[10px] font-bold block ${pair.ratio >= 7 ? 'text-emerald-600' : pair.ratio >= 4.5 ? 'text-amber-600' : 'text-red-500'}`}>{pair.ratio.toFixed(1)}:1</span>
                                <span className={`font-mono text-[9px] ${pair.ratio >= 7 ? 'text-emerald-500' : pair.ratio >= 4.5 ? 'text-amber-500' : 'text-red-400'}`}>{pair.ratio >= 7 ? 'AAA' : pair.ratio >= 4.5 ? 'AA' : 'FAIL'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

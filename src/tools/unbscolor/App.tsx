import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InfoGrid } from './components/InfoGrid';
import { PaletteGenerator } from './components/PaletteGenerator';
import { SwatchStrip } from './components/SwatchStrip';
import { SimilarityGrid } from './components/SimilarityGrid';
import { ColorGuide } from './components/ColorGuide';
import { PaletteBuilder } from './components/PaletteBuilder';
import { GeneratedPalettes } from './components/GeneratedPalettes';
import { PaletteMagic } from './components/PaletteMagic';
import { BatchAnalyzer } from './components/BatchAnalyzer';
import { useLanguage, Language } from './i18n';
import {
    hexToRgb,
    rgbToHex,
    rgbToCmyk,
    rgbToHsl,
    findReferenceMatches,
    isValidHex,
    rgbToHsv,
    hexToLab,
    getClosestColorName,
    enrichLibraryWithLab,
    cmykToRgb,
    hslToRgb
} from './utils/colorMath';
import { analyzeColor } from './services/analysisService';
import { triggerFakeColorTraffic } from './services/obfuscatedColorService';
import { fetchMatchesWithFallback } from './services/matchApi';
import { RGB, CMYK, HSL, HSV, LAB, ColorMatch, AnalysisResult, ReferenceColor, HarmonyColor } from './types';
import { LIBRARY_OPTIONS, getLibraryById, DEFAULT_LIBRARY } from './constants';

const defaultLibraryId = LIBRARY_OPTIONS[0]?.id || '';
const LIBRARY_SHORT_LABELS: Record<string, string> = {
    sys_a_fin_c: 'BR C',
    sys_a_fin_u: 'BR U',
    sys_b_fin_c: 'SOL C',
    sys_b_fin_u: 'SOL U'
};

type SettingsState = {
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
};

const App: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'matcher' | 'batch' | 'guide' | 'palette' | 'generated' | 'magic'>('matcher');
    const [showSettings, setShowSettings] = useState(false);
    const [batchColors, setBatchColors] = useState<string[]>(['#F7E043', '#1A1A1A', '#FFFFFF', '#E5E5E5', '#333333']);

    const [settings, setSettings] = useState<SettingsState>({
        showHex: true,
        showRgb: true,
        showHsl: true,
        showHsb: true,
        showLab: true,
        showCmyk: true,
        showPmsC: true,
        showPmsU: true,
        showPmsSolidC: true,
        showPmsSolidU: true,
        mixFormat: 'rgb(80, 184, 72)'
    });

    const [hex, setHex] = useState<string>('#F7E043');
    const [rgb, setRgb] = useState<RGB>(() => hexToRgb('#F7E043'));
    const [cmyk, setCmyk] = useState<CMYK>(() => rgbToCmyk(hexToRgb('#F7E043')));
    const [hsl, setHsl] = useState<HSL>(() => rgbToHsl(hexToRgb('#F7E043')));
    const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb('#F7E043')));
    const [lab, setLab] = useState<LAB>(() => hexToLab('#F7E043'));

    const [libraryType, setLibraryType] = useState<string>(defaultLibraryId);
    const [library, setLibrary] = useState<ReferenceColor[]>(DEFAULT_LIBRARY);
    const [matches, setMatches] = useState<ColorMatch[]>([]);
    const [stripColors, setStripColors] = useState<HarmonyColor[]>([]);
    const [analysis, setAnalysis] = useState<{ description: string; usageTips: string[]; psychology: string } | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [showRefMatch, setShowRefMatch] = useState(false);

    const bridgeCoatedLibrary = useMemo(() => {
        return (
            LIBRARY_OPTIONS.find((lib) => lib.systemId === 'sys_a' && lib.finishId === 'fin_c')?.colors ||
            LIBRARY_OPTIONS.find((lib) => lib.finishId === 'coated')?.colors ||
            DEFAULT_LIBRARY
        );
    }, []);

    const bridgeUncoatedLibrary = useMemo(() => {
        return (
            LIBRARY_OPTIONS.find((lib) => lib.systemId === 'sys_a' && lib.finishId === 'fin_u')?.colors ||
            LIBRARY_OPTIONS.find((lib) => lib.finishId === 'uncoated')?.colors ||
            DEFAULT_LIBRARY
        );
    }, []);

    const solidCoatedLibrary = useMemo(() => {
        return (
            LIBRARY_OPTIONS.find((lib) => lib.systemId === 'sys_b' && lib.finishId === 'fin_c')?.colors ||
            LIBRARY_OPTIONS.find((lib) => lib.systemId === 'sys_b')?.colors ||
            DEFAULT_LIBRARY
        );
    }, []);

    const solidUncoatedLibrary = useMemo(() => {
        return (
            LIBRARY_OPTIONS.find((lib) => lib.systemId === 'sys_b' && lib.finishId === 'fin_u')?.colors ||
            LIBRARY_OPTIONS.find((lib) => lib.systemId === 'sys_b')?.colors ||
            DEFAULT_LIBRARY
        );
    }, []);

    const formatRgbDisplay = (r: number, g: number, b: number) => {
        if (settings.mixFormat === 'R=80, G=184, B=72') return `R=${r}, G=${g}, B=${b}`;
        if (settings.mixFormat === 'RGB 80, 184, 72') return `RGB ${r}, ${g}, ${b}`;
        return `rgb(${r}, ${g}, ${b})`;
    };

    const normalizeRefCode = (code?: string) => {
        if (!code) return '';
        const upper = code.toUpperCase();
        return upper.replace(/\s+CP\b/g, ' C').replace(/\s+UP\b/g, ' U');
    };

    const sendObfuscationTraffic = useCallback((value: string) => {
        if (isValidHex(value)) {
            triggerFakeColorTraffic(value);
        }
    }, []);

    const obfuscationOnce = useRef(false);
    const obfuscationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateDerivedFromRgb = (currentRgb: RGB, currentHex: string) => {
        setCmyk(rgbToCmyk(currentRgb));
        setHsl(rgbToHsl(currentRgb));
        setHsv(rgbToHsv(currentRgb));
        setLab(hexToLab(currentHex));
    };

    const handleHexChange = useCallback((newHex: string) => {
        setHex(newHex);
        if (isValidHex(newHex)) {
            const newRgb = hexToRgb(newHex);
            setRgb(newRgb);
            updateDerivedFromRgb(newRgb, newHex);
            setBatchColors((prev) => {
                const updated = [...prev];
                updated[0] = newHex;
                return updated;
            });
        }
    }, [sendObfuscationTraffic]);

    const updateBatchSlot0 = useCallback((newHex: string) => {
        setBatchColors((prev) => {
            const updated = [...prev];
            updated[0] = newHex;
            return updated;
        });
    }, []);

    const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
        const newRgb = { ...rgb, [channel]: value };
        setRgb(newRgb);
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHex(newHex);
        updateDerivedFromRgb(newRgb, newHex);
        updateBatchSlot0(newHex);
    };

    const handleCmykChange = (channel: keyof CMYK, value: number) => {
        const newCmyk = { ...cmyk, [channel]: value };
        setCmyk(newCmyk);
        const newRgb = cmykToRgb(newCmyk);
        setRgb(newRgb);
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHex(newHex);
        setHsl(rgbToHsl(newRgb));
        setHsv(rgbToHsv(newRgb));
        setLab(hexToLab(newHex));
        updateBatchSlot0(newHex);
    };

    const handleHslChange = (channel: keyof HSL, value: number) => {
        const newHsl = { ...hsl, [channel]: value };
        setHsl(newHsl);
        const newRgb = hslToRgb(newHsl);
        setRgb(newRgb);
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHex(newHex);
        setCmyk(rgbToCmyk(newRgb));
        setHsv(rgbToHsv(newRgb));
        setLab(hexToLab(newHex));
        updateBatchSlot0(newHex);
    };

    const handleBatchColorUpdate = (index: number, newHex: string) => {
        const updated = [...batchColors];
        updated[index] = newHex;
        setBatchColors(updated);
        if (index === 0 && isValidHex(newHex)) {
            setHex(newHex);
            const newRgb = hexToRgb(newHex);
            setRgb(newRgb);
            updateDerivedFromRgb(newRgb, newHex);
        }
    };

    useEffect(() => {
        if (!obfuscationOnce.current && library.length > 0 && isValidHex(hex)) {
            sendObfuscationTraffic(hex);
            obfuscationOnce.current = true;
        }
    }, [library, hex, sendObfuscationTraffic]);

    useEffect(() => {
        if (!library.length || !isValidHex(hex)) return;
        if (obfuscationTimer.current) {
            clearTimeout(obfuscationTimer.current);
        }
        obfuscationTimer.current = setTimeout(() => {
            sendObfuscationTraffic(hex);
        }, 2500);

        return () => {
            if (obfuscationTimer.current) {
                clearTimeout(obfuscationTimer.current);
                obfuscationTimer.current = null;
            }
        };
    }, [hex, library, sendObfuscationTraffic]);

    interface CardExportPayload {
        index: number;
        hex: string;
        name: string;
        stats: string[];
        matches: { label: string; code: string; swatch: string }[];
        strip: { hex: string; name: string; code?: string }[];
    }

    const buildCardExportData = (color: string, index: number): CardExportPayload | null => {
        if (!isValidHex(color)) return null;

        const outOfGamutLabel = t.outOfGamut.toUpperCase();

        const rBatch = hexToRgb(color);
        const hBatch = rgbToHsl(rBatch);
        const sBatch = rgbToHsv(rBatch);
        const kBatch = rgbToCmyk(rBatch);
        const lBatch = hexToLab(color);

        const matchC = findReferenceMatches(color, bridgeCoatedLibrary, 1)[0];
        const matchU = findReferenceMatches(color, bridgeUncoatedLibrary, 1)[0];
        const matchSolidC = findReferenceMatches(color, solidCoatedLibrary, 1)[0];
        const matchSolidU = findReferenceMatches(color, solidUncoatedLibrary, 1)[0];

        const stats: string[] = [];
        if (settings.showHex) stats.push(`HEX ${color}`);
        if (settings.showRgb) stats.push(formatRgbDisplay(rBatch.r, rBatch.g, rBatch.b));
        if (settings.showCmyk) stats.push(`CMYK ${kBatch.c}, ${kBatch.m}, ${kBatch.y}, ${kBatch.k}`);
        if (settings.showHsb) stats.push(`HSB ${sBatch.h}, ${sBatch.s}, ${sBatch.v}`);
        if (settings.showHsl) stats.push(`HSL ${hBatch.h}, ${hBatch.s}%, ${hBatch.l}%`);
        if (settings.showLab) stats.push(`LAB ${Math.round(lBatch.l)}, ${Math.round(lBatch.a)}, ${Math.round(lBatch.b)}`);

        const matchesList: { label: string; code: string; swatch: string }[] = [];

        if (settings.showPmsC) {
            matchesList.push({
                label: t.refBridgeC,
                    code: matchC && matchC.deltaE < 10 ? normalizeRefCode(matchC.reference.code) : outOfGamutLabel,
                swatch: matchC ? matchC.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showPmsU) {
            matchesList.push({
                label: t.refBridgeU,
                    code: matchU && matchU.deltaE < 10 ? normalizeRefCode(matchU.reference.code) : outOfGamutLabel,
                swatch: matchU ? matchU.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showPmsSolidC) {
            matchesList.push({
                label: t.refSolidC,
                    code: matchSolidC && matchSolidC.deltaE < 10 ? normalizeRefCode(matchSolidC.reference.code) : outOfGamutLabel,
                swatch: matchSolidC ? matchSolidC.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showPmsSolidU) {
            matchesList.push({
                label: t.refSolidU,
                    code: matchSolidU && matchSolidU.deltaE < 10 ? normalizeRefCode(matchSolidU.reference.code) : outOfGamutLabel,
                swatch: matchSolidU ? matchSolidU.reference.hex : '#e5e7eb'
            });
        }

        const strip = findReferenceMatches(color, library, 6).map((m) => ({
            hex: m.reference.hex,
            name: m.reference.name,
            code: normalizeRefCode(m.reference.code)
        }));

        return {
            index,
            hex: color,
            name: getClosestColorName(color),
            stats,
            matches: matchesList,
            strip
        };
    };

    const generateCardSvg = (payload: CardExportPayload) => {
        const width = 420;
        const padding = 24;
        const headerHeight = 160;

        const hexRgb = hexToRgb(payload.hex);
        const luminance = (0.299 * hexRgb.r + 0.587 * hexRgb.g + 0.114 * hexRgb.b) / 255;
        const headerTextColor = luminance > 0.5 ? '#0f172a' : '#ffffff';
        const headerTextOpacity = luminance > 0.5 ? '0.7' : '0.8';

        let cursor = padding + headerHeight + 24;

        const statLines = payload.stats
            .map((line, idx) => {
                const y = cursor + idx * 22;
                return `<text x="${padding}" y="${y}" font-size="13" font-family="Arial, sans-serif" fill="#374151">${line}</text>`;
            })
            .join('');

        cursor += (payload.stats.length ? payload.stats.length * 22 : 0) + 32;

        const matchBlock = payload.matches
            .map((match, idx) => {
                const y = cursor + idx * 72;
                const isOutOfGamut = match.code === t.outOfGamut.toUpperCase();
                return `
                <g transform="translate(${padding}, ${y})">
                    <rect width="${width - padding * 2}" height="60" rx="12" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" />
                    <text x="16" y="22" font-size="10" font-family="Arial, sans-serif" fill="#9ca3af" font-weight="700" letter-spacing="1.5">${match.label.toUpperCase()}</text>
                    <text x="16" y="44" font-size="16" font-family="Arial, sans-serif" fill="${isOutOfGamut ? '#9ca3af' : '#0f172a'}" font-weight="700">${match.code}</text>
                    <rect x="${width - padding * 2 - 60}" y="10" width="44" height="40" rx="10" fill="${match.swatch}" stroke="#e5e7eb" stroke-width="1" />
                </g>
            `;
            })
            .join('');

        cursor += (payload.matches.length ? payload.matches.length * 72 : 0) + 28;

        const stripLabelY = cursor;
        cursor += 24;

        const stripWidth = width - padding * 2;
        const slotWidth = stripWidth / Math.max(payload.strip.length, 1);
        const stripY = cursor;
        const stripRects = payload.strip
            .map((s, idx) => {
                const x = padding + idx * slotWidth;
                const isFirst = idx === 0;
                const isLast = idx === payload.strip.length - 1;
                let rect = '';
                if (isFirst) {
                    rect = `<path d="M${x + 10},${stripY} h${slotWidth - 10} v40 h-${slotWidth - 10} q-10,0 -10,-10 v-20 q0,-10 10,-10 z" fill="${s.hex}" />`;
                } else if (isLast) {
                    rect = `<path d="M${x},${stripY} h${slotWidth - 10} q10,0 10,10 v20 q0,10 -10,10 h-${slotWidth - 10} v-40 z" fill="${s.hex}" />`;
                } else {
                    rect = `<rect x="${x}" y="${stripY}" width="${slotWidth}" height="40" fill="${s.hex}" />`;
                }
                // Add reference code below the swatch
                if (s.code) {
                    rect += `<text x="${x + slotWidth / 2}" y="${stripY + 54}" font-size="8" font-family="Arial, sans-serif" fill="#9ca3af" text-anchor="middle">${s.code}</text>`;
                }
                return rect;
            })
            .join('');

        cursor += 74; // extra space for codes below strip
        const height = cursor + padding;

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${t.slotLabel} ${payload.index + 1} ${t.colorCardAria}" shape-rendering="geometricPrecision" text-rendering="optimizeLegibility">
    <defs>
        <style>text { font-family: Arial, sans-serif; }</style>
        <clipPath id="headerClip"><rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${headerHeight}" rx="24" /></clipPath>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff" rx="28" />
    <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${headerHeight}" rx="24" fill="${payload.hex}" />
    <text x="${padding + 20}" y="${padding + 32}" font-size="11" fill="${headerTextColor}" opacity="${headerTextOpacity}" font-weight="700" letter-spacing="2">${t.slotLabel.toUpperCase()} ${payload.index + 1}</text>
    <text x="${padding + 20}" y="${padding + 72}" font-size="28" fill="${headerTextColor}" font-weight="800">${payload.name}</text>
    <text x="${padding + 20}" y="${padding + 100}" font-size="15" fill="${headerTextColor}" opacity="${headerTextOpacity}" font-weight="600">${payload.hex.toUpperCase()}</text>
    ${statLines}
    ${matchBlock}
    <text x="${padding}" y="${stripLabelY}" font-size="11" fill="#9ca3af" font-weight="700" letter-spacing="1.5">${t.nearbyAlternatives.toUpperCase()}</text>
    <rect x="${padding}" y="${stripY}" width="${stripWidth}" height="40" rx="10" fill="#f3f4f6" />
    <g clip-path="url(#stripClip)">
        <clipPath id="stripClip"><rect x="${padding}" y="${stripY}" width="${stripWidth}" height="40" rx="10" /></clipPath>
        ${stripRects}
    </g>
</svg>`;

        return { svg, width, height };
    };

    const downloadFromUrl = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const svgStringToPng = (svgString: string, width: number, height: number, filename: string) => {
        return new Promise<void>((resolve, reject) => {
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            const scale = 2;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width * scale;
                canvas.height = height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    return reject(new Error('Canvas unavailable'));
                }

                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, width, height);
                const pngUrl = canvas.toDataURL('image/png');
                downloadFromUrl(pngUrl, filename);
                URL.revokeObjectURL(url);
                resolve();
            };

            img.onerror = (e) => {
                URL.revokeObjectURL(url);
                reject(e);
            };

            img.src = url;
        });
    };

    const handleDownloadCards = async (format: 'svg' | 'png') => {
        const payloads = batchColors
            .map((color, idx) => buildCardExportData(color, idx))
            .filter((card): card is CardExportPayload => Boolean(card));

        for (const card of payloads) {
            const { svg, width, height } = generateCardSvg(card);
            const fileBase = `slot-${card.index + 1}-${card.name.replace(/\s+/g, '-').toLowerCase()}`;

            if (format === 'svg') {
                const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(svgBlob);
                downloadFromUrl(url, `${fileBase}.svg`);
                URL.revokeObjectURL(url);
            } else {
                await svgStringToPng(svg, width, height, `${fileBase}.png`);
            }
        }
    };

    const handleDownloadCard = async (format: 'svg' | 'png', index: number) => {
        const card = buildCardExportData(batchColors[index], index);
        if (!card) return;
        const { svg, width, height } = generateCardSvg(card);
        const fileBase = `slot-${card.index + 1}-${card.name.replace(/\s+/g, '-').toLowerCase()}`;

        if (format === 'svg') {
            const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            downloadFromUrl(url, `${fileBase}.svg`);
            URL.revokeObjectURL(url);
        } else {
            await svgStringToPng(svg, width, height, `${fileBase}.png`);
        }
    };

    const handleCopyAll = () => {
        const text = batchColors
            .map((c) => {
                if (!isValidHex(c)) return '';
                const name = getClosestColorName(c);
                const r = hexToRgb(c);
                const h = rgbToHsl(r);
                const s = rgbToHsv(r);
                const k = rgbToCmyk(r);
                const l = hexToLab(c);

                const matchC = findReferenceMatches(c, bridgeCoatedLibrary, 1)[0];
                const matchU = findReferenceMatches(c, bridgeUncoatedLibrary, 1)[0];
                const matchSolidC = findReferenceMatches(c, solidCoatedLibrary, 1)[0];
                const matchSolidU = findReferenceMatches(c, solidUncoatedLibrary, 1)[0];

                const output = [name];
                if (settings.showHex) output.push(c);
                if (settings.showRgb) output.push(formatRgbDisplay(r.r, r.g, r.b));
                if (settings.showCmyk) output.push(`CMYK: ${k.c}, ${k.m}, ${k.y}, ${k.k}`);
                if (settings.showHsb) output.push(`hsb(${s.h}, ${s.s}, ${s.v})`);
                if (settings.showHsl) output.push(`hsl(${h.h}, ${h.s}%, ${h.l}%)`);
                if (settings.showLab) output.push(`lab(${Math.round(l.l)}, ${Math.round(l.a)}, ${Math.round(l.b)})`);
                if (settings.showPmsC) output.push(matchC && matchC.deltaE < 10 ? normalizeRefCode(matchC.reference.code) : `${t.outOfGamut} C`);
                if (settings.showPmsU) output.push(matchU && matchU.deltaE < 10 ? normalizeRefCode(matchU.reference.code) : `${t.outOfGamut} U`);
                if (settings.showPmsSolidC) output.push(matchSolidC && matchSolidC.deltaE < 10 ? normalizeRefCode(matchSolidC.reference.code) : `${t.outOfGamut} C (SOLID)`);
                if (settings.showPmsSolidU) output.push(matchSolidU && matchSolidU.deltaE < 10 ? normalizeRefCode(matchSolidU.reference.code) : `${t.outOfGamut} U (SOLID)`);

                return output.join('\n');
            })
            .join('\n\n');

        navigator.clipboard.writeText(text);
        setCopyFeedback(t.copyAllSlotsData);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    useEffect(() => {
        const rawLib = getLibraryById(libraryType);
        const enriched = enrichLibraryWithLab(rawLib);
        setLibrary(enriched);
    }, [libraryType]);

    // Synchronous local matching for instant updates
    const computedMatches = useMemo(() => {
        if (!isValidHex(hex) || !library.length) return [];
        return findReferenceMatches(hex, library, 12);
    }, [hex, library]);

    const computedStripColors = useMemo(() => {
        return computedMatches.map((m) => ({
            hex: m.reference.hex,
            name: getClosestColorName(m.reference.hex),
            refCode: normalizeRefCode(m.reference.code),
            type: `ΔE ${m.deltaE.toFixed(2)}`
        }));
    }, [computedMatches]);

    // Keep state in sync for components that read from state
    useEffect(() => {
        setMatches(computedMatches);
        setStripColors(computedStripColors);
        setAnalysis(null);
    }, [computedMatches, computedStripColors]);

    const triggerAiAnalysis = async () => {
        if (!matches[0]) return;
        setLoadingAi(true);
        try {
            const result = await analyzeColor(hex, matches[0].reference.code, language);
            setAnalysis(result);
        } finally {
            setLoadingAi(false);
        }
    };

    const getPmsC = () => findReferenceMatches(hex, bridgeCoatedLibrary, 1)[0];
    const getPmsU = () => findReferenceMatches(hex, bridgeUncoatedLibrary, 1)[0];
    const getPmsSolidC = () => findReferenceMatches(hex, solidCoatedLibrary, 1)[0];
    const getPmsSolidU = () => findReferenceMatches(hex, solidUncoatedLibrary, 1)[0];

    return (
        <div className="font-sans w-full">
            {showSettings && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-card/20 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                    <div className="relative w-full max-w-[440px] border-l border-border bg-card p-12 shadow-[0_0_100px_rgba(0,0,0,0.05)] h-full animate-in slide-in-from-right duration-500 overflow-y-auto">
                        <div className="flex justify-between items-center mb-16">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-normal tracking-tighter">{t.settings}</h2>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="w-10 h-10 border border-border/60 rounded-full flex items-center justify-center hover:bg-foreground hover:text-background transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-16">
                            <div>
                                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/70 mb-8 border-b border-border/40 pb-2">{t.language}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { code: 'en' as Language, label: t.english, flag: '🇺🇸' },
                                        { code: 'pt' as Language, label: t.portuguese, flag: '🇧🇷' },
                                        { code: 'es' as Language, label: t.spanish, flag: '🇪🇸' }
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLanguage(lang.code)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${language === lang.code ? 'border-transparent' : 'border-border hover:shadow-sm'}`}
                                            style={language === lang.code ? { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--accent))' } : { backgroundColor: 'hsl(var(--card) / 0.5)' }}
                                        >
                                            <span className="text-2xl">{lang.flag}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/70 mb-8 border-b border-border/40 pb-2">{t.visibleColorModels}</h3>
                                <div className="grid grid-cols-1 gap-4 mb-6">
                                    {[
                                        { key: 'showHex', label: t.hexadecimal },
                                        { key: 'showRgb', label: t.rgbStandard },
                                        { key: 'showHsl', label: t.hslWeb },
                                        { key: 'showHsb', label: t.hsbHsv },
                                        { key: 'showLab', label: t.cieLabHighPrec },
                                        { key: 'showCmyk', label: t.cmykProcess }
                                    ].map((opt) => (
                                        <div
                                            key={opt.key}
                                            className="flex items-center justify-between p-4 bg-secondary/40/50 rounded-2xl border border-border/60/50 cursor-pointer group hover:bg-card hover:shadow-sm transition-all"
                                            onClick={() => setSettings((s) => ({ ...s, [opt.key]: !s[opt.key as keyof SettingsState] }))}
                                        >
                                            <span className="text-sm font-medium text-foreground/80">{opt.label}</span>
                                             <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? '' : 'bg-muted'}`} style={settings[opt.key as keyof SettingsState] ? { backgroundColor: 'hsl(var(--accent))' } : {}}>
                                                 <div className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? 'left-6' : 'left-1 bg-card'}`} style={settings[opt.key as keyof SettingsState] ? { backgroundColor: 'hsl(var(--foreground))' } : {}}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">WEB REFERENCE SEARCH</p>
                                    {[
                                        { key: 'showPmsC', label: t.refBridgeC },
                                        { key: 'showPmsU', label: t.refBridgeU },
                                        { key: 'showPmsSolidC', label: t.refSolidC },
                                        { key: 'showPmsSolidU', label: t.refSolidU }
                                    ].map((opt) => (
                                        <div
                                            key={opt.key}
                                            className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/70 cursor-pointer group hover:shadow-sm transition-all"
                                            onClick={() => setSettings((s) => ({ ...s, [opt.key]: !s[opt.key as keyof SettingsState] }))}
                                        >
                                            <span className="text-sm font-medium text-foreground/80">{opt.label}</span>
                                             <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? '' : 'bg-muted'}`} style={settings[opt.key as keyof SettingsState] ? { backgroundColor: 'hsl(var(--accent))' } : {}}>
                                                 <div className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? 'left-6' : 'left-1 bg-card'}`} style={settings[opt.key as keyof SettingsState] ? { backgroundColor: 'hsl(var(--foreground))' } : {}}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/70 mb-8 border-b border-border/40 pb-2">{t.mixedFormatSyntax}</h3>
                                <div className="space-y-3">
                                    {['R=80, G=184, B=72', 'RGB 80, 184, 72', 'rgb(80, 184, 72)'].map((fmt) => (
                                        <label
                                            key={fmt}
                                            className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl hover:bg-secondary/40 transition-all border border-transparent hover:border-border/60"
                                        >
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="mixFormat"
                                                    className="sr-only"
                                                    checked={settings.mixFormat === fmt}
                                                    onChange={() => setSettings((s) => ({ ...s, mixFormat: fmt }))}
                                                />
                                                <div className={`w-6 h-6 rounded-full border-2 transition-all ${settings.mixFormat === fmt ? 'border-foreground bg-foreground' : 'border-border'}`}></div>
                                                {settings.mixFormat === fmt && <div className="absolute w-2 h-2 bg-card rounded-full"></div>}
                                            </div>
                                            <span className={`text-sm font-mono transition-colors ${settings.mixFormat === fmt ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                                                {fmt}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 pt-8 border-t border-border/60">
                            <p className="text-[10px] font-mono text-muted-foreground leading-relaxed uppercase tracking-widest">{t.changesAppliedRealtime}</p>
                        </div>
                    </div>
                </div>
            )}

            {copyFeedback && (
                <div className="fixed top-4 right-4 bg-foreground text-background px-4 py-2 text-xs font-mono font-bold uppercase z-[250] shadow-2xl">
                    {copyFeedback}
                </div>
            )}

            <header className="tool-subheader">
                <div className="max-w-[1600px] mx-auto w-full space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-6">
                            <nav className="flex items-center gap-5 md:gap-7">
                                <button onClick={() => setActiveTab('matcher')} className={`nav-tab ${activeTab === 'matcher' ? 'is-active' : ''}`}>{t.matcher}</button>
                                <button onClick={() => setActiveTab('batch')} className={`nav-tab ${activeTab === 'batch' ? 'is-active' : ''}`}>{t.multiSlotMatchAnalysis}</button>
                                <button onClick={() => setActiveTab('palette')} className={`nav-tab ${activeTab === 'palette' ? 'is-active' : ''}`}>{t.contrastPalette}</button>
                                <button onClick={() => setActiveTab('generated')} className={`nav-tab ${activeTab === 'generated' ? 'is-active' : ''}`}>{t.generatedPalettes}</button>
                                <button onClick={() => setActiveTab('magic')} className={`nav-tab ${activeTab === 'magic' ? 'is-active' : ''}`}>{t.paletteMagic}</button>
                                <button onClick={() => setActiveTab('guide')} className={`nav-tab ${activeTab === 'guide' ? 'is-active' : ''}`}>{t.printGuide}</button>
                            </nav>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end text-[10px] font-mono">
                            <PaletteGenerator
                                onColorSelect={handleHexChange}
                                onPaletteDetected={(colors) => {
                                    setBatchColors(colors);
                                    handleHexChange(colors[0]);
                                }}
                            />

                            <button
                                onClick={() => setShowSettings(true)}
                                className="h-7 w-7 border border-[#232323]/30 bg-white text-[#232323] flex items-center justify-center shrink-0 hover:bg-[#F7E043]/40"
                                title={t.settings}
                                aria-label={t.settings}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 13.5a7.97 7.97 0 000-3l1.4-1.1a.9.9 0 00.2-1.2l-1.6-2.7a.9.9 0 00-1.1-.4l-1.6.6a8 8 0 00-2.6-1.5l-.2-1.7A.9.9 0 0013 2h-3a.9.9 0 00-.9.8l-.2 1.7a8 8 0 00-2.6 1.5l-1.6-.6a.9.9 0 00-1.1.4L2 8.2a.9.9 0 00.2 1.2l1.4 1.1a7.97 7.97 0 000 3L2.2 14.6a.9.9 0 00-.2 1.2l1.6 2.7a.9.9 0 001.1.4l1.6-.6a8 8 0 002.6 1.5l.2 1.7A.9.9 0 0010 22h3a.9.9 0 00.9-.8l.2-1.7a8 8 0 002.6-1.5l1.6.6a.9.9 0 001.1-.4l1.6-2.7a.9.9 0 00-.2-1.2l-1.4-1.1z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-8 pb-20 pt-8 w-full flex-grow">
                {activeTab === 'guide' ? (
                    <ColorGuide selectedHex={hex} batchColors={batchColors} />
                ) : activeTab === 'magic' ? (
                    <PaletteMagic initialHex={hex} batchColors={batchColors} onHexChange={handleHexChange} onBatchColorsChange={setBatchColors} />
                ) : activeTab === 'palette' ? (
                    <PaletteBuilder initialHex={hex} onHexChange={handleHexChange} batchColors={batchColors} onBatchColorsChange={setBatchColors} />
                ) : activeTab === 'generated' ? (
                    <GeneratedPalettes initialHex={hex} settings={settings} externalColors={batchColors} />
                ) : activeTab === 'batch' ? (
                    <BatchAnalyzer
                        t={t}
                        batchColors={batchColors}
                        settings={settings}
                        onBatchColorUpdate={handleBatchColorUpdate}
                        onDownloadCard={handleDownloadCard}
                        onCopyAll={handleCopyAll}
                        library={library}
                        bridgeCoatedLibrary={bridgeCoatedLibrary}
                        bridgeUncoatedLibrary={bridgeUncoatedLibrary}
                        solidCoatedLibrary={solidCoatedLibrary}
                        solidUncoatedLibrary={solidUncoatedLibrary}
                        formatRgbDisplay={formatRgbDisplay}
                        getClosestColorName={getClosestColorName}
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mt-4 mb-12">
                            <div className="lg:col-span-5">
                                <h2 className="font-mono text-sm font-medium mb-8">{t.color}</h2>
                                <input
                                    type="text"
                                    value={hex}
                                    onChange={(e) => handleHexChange(e.target.value)}
                                    className="text-7xl md:text-8xl font-sans font-normal tracking-tighter outline-none w-full bg-transparent placeholder-gray-200"
                                    maxLength={7}
                                />
                                <div className="mb-12 font-mono text-muted-foreground uppercase tracking-widest text-sm">{getClosestColorName(hex)}</div>

                                <div className="space-y-6 max-w-md">
                                    {['r', 'g', 'b'].map((channel) => (
                                        <div key={channel} className="flex items-center gap-4">
                                            <span className="font-mono text-xs font-bold uppercase w-4">{channel}</span>
                                            <input
                                                type="range"
                                                min="0"
                                                max="255"
                                                value={rgb[channel as keyof RGB]}
                                                onChange={(e) => handleRgbChange(channel as 'r' | 'g' | 'b', Number(e.target.value))}
                                                className="w-full h-[2px] bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-transform"
                                            />
                                            <span className="font-mono text-xs w-8 text-right text-muted-foreground">{rgb[channel as keyof RGB]}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-mono text-foreground/80 uppercase tracking-tight">
                                    <span className="text-muted-foreground">HEX</span>
                                    <span className="text-left text-foreground">{hex.toUpperCase()}</span>
                                    <span className="text-muted-foreground">RGB</span>
                                    <span className="text-left text-foreground">{formatRgbDisplay(rgb.r, rgb.g, rgb.b)}</span>
                                    <span className="text-muted-foreground">CMYK</span>
                                    <span className="text-left text-foreground">{cmyk.c}, {cmyk.m}, {cmyk.y}, {cmyk.k}</span>
                                    <span className="text-muted-foreground">LAB</span>
                                    <span className="text-left text-foreground">{Math.round(lab.l)}, {Math.round(lab.a)}, {Math.round(lab.b)}</span>
                                    <span className="text-muted-foreground">HSL</span>
                                    <span className="text-left text-foreground">{hsl.h}, {hsl.s}%, {hsl.l}%</span>
                                    <span className="text-muted-foreground">HSB</span>
                                    <span className="text-left text-foreground">{hsv.h}, {hsv.s}, {hsv.v}</span>
                                </div>
                            </div>

                            <div className="lg:col-span-7">
                                <div className="flex items-center gap-3 mb-8 flex-wrap">
                                    <h2 className="font-mono text-sm font-medium">{t.matchCie2000}</h2>
                                    {!showRefMatch && matches[0] && (
                                        <button
                                            onClick={() => setShowRefMatch(true)}
                                            className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-border bg-card rounded-lg hover:border-foreground hover:text-foreground transition-all"
                                        >
                                            {t.analyzeWithAi}
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row gap-12 items-start">
                                    <div className="flex flex-col items-center">
                                        <div className="flex gap-8 items-center mb-6">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-inner" style={{ backgroundColor: hex }}></div>
                                                <span className="font-mono text-xs text-muted-foreground">{getClosestColorName(hex)}</span>
                                            </div>
                                            {showRefMatch && matches[0] ? (
                                                <>
                                                    <span className="text-muted-foreground/70 text-2xl">→</span>
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-inner" style={{ backgroundColor: matches[0].reference.hex }}></div>
                                                        <span className="font-mono text-xs text-muted-foreground">{normalizeRefCode(matches[0].reference.code)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 text-muted-foreground/70">
                                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-dashed border-border flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em]">
                                                        Reference
                                                    </div>
                                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{t.analyzeWithAi}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-12 w-full mt-8">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-4">DELTA E 00</span>
                                                <span className="text-6xl font-light tracking-tighter">{showRefMatch && matches[0] ? matches[0].deltaE.toFixed(2) : '--'}</span>
                                            </div>
                                            {showRefMatch && matches[0] && (
                                                <div className="flex flex-col gap-1 border-l border-border/60 pl-8">
                                                    <span className="font-bold text-sm mb-1">{getClosestColorName(matches[0].reference.hex)}</span>
                                                    <div className="font-mono text-[11px] text-muted-foreground space-y-1.5">
                                                        {settings.showHex && <p className="text-muted-foreground mb-1">{matches[0].reference.hex}</p>}
                                                        {settings.showRgb && <p>{formatRgbDisplay(matches[0].reference.rgb.r, matches[0].reference.rgb.g, matches[0].reference.rgb.b)}</p>}
                                                        {settings.showCmyk && (
                                                            <p className="uppercase">
                                                                CMYK: {rgbToCmyk(matches[0].reference.rgb).c}, {rgbToCmyk(matches[0].reference.rgb).m}, {rgbToCmyk(matches[0].reference.rgb).y}, {rgbToCmyk(matches[0].reference.rgb).k}
                                                            </p>
                                                        )}
                                                        {settings.showLab && <p>LAB: {Math.round(hexToLab(matches[0].reference.hex).l)}, {Math.round(hexToLab(matches[0].reference.hex).a)}, {Math.round(hexToLab(matches[0].reference.hex).b)}</p>}
                                                        {settings.showHsl && <p>HSL: {rgbToHsl(matches[0].reference.rgb).h}, {rgbToHsl(matches[0].reference.rgb).s}, {rgbToHsl(matches[0].reference.rgb).l}</p>}
                                                        {settings.showHsb && <p>HSB: {rgbToHsv(matches[0].reference.rgb).h}, {rgbToHsv(matches[0].reference.rgb).s}, {rgbToHsv(matches[0].reference.rgb).v}</p>}

                                                        {settings.showPmsC && (
                                                            <div className="mt-4 pt-3 border-t border-border/40">
                                                                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block mb-1">{t.refBridgeC}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-foreground">{normalizeRefCode(getPmsC()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                        {settings.showPmsU && (
                                                            <div className={`${!settings.showPmsC ? 'mt-4 pt-3 border-t border-border/40' : 'mt-2'}`}>
                                                                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block mb-1">{t.refBridgeU}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-foreground">{normalizeRefCode(getPmsU()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                        {settings.showPmsSolidC && (
                                                            <div className="mt-2 pt-3 border-t border-border/40">
                                                                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block mb-1">{t.refSolidC}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-foreground">{normalizeRefCode(getPmsSolidC()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                        {settings.showPmsSolidU && (
                                                            <div className="mt-2 pt-3 border-t border-border/40">
                                                                <span className="text-[9px] font-bold text-muted-foreground/70 uppercase block mb-1">{t.refSolidU}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-foreground">{normalizeRefCode(getPmsSolidU()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 w-full md:w-auto ml-auto">
                                        <span className="font-mono text-xs text-muted-foreground uppercase mb-4 tracking-widest">{t.actions}</span>
                                        <button
                                            onClick={() => handleHexChange(rgbToHex((Math.random() * 255) | 0, (Math.random() * 255) | 0, (Math.random() * 255) | 0))}
                                             className="px-6 py-4 text-left font-mono text-xs transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = ''; }}
                                         >
                                             {t.randomizeColor}
                                         </button>
                                         <button
                                             onClick={triggerAiAnalysis}
                                             disabled={loadingAi}
                                             className="px-6 py-4 text-left font-mono text-xs transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'; e.currentTarget.style.color = 'hsl(var(--foreground))'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = ''; }}
                                        >
                                            {loadingAi ? t.thinking : t.analyzeWithAi}
                                        </button>
                                        {analysis && (
                                            <div className="mt-4 p-6 bg-secondary/40 border border-border/60 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500 max-w-xs">
                                                <h3 className="font-mono text-[10px] font-bold text-foreground mb-3 uppercase tracking-widest">{t.aiResult}</h3>
                                                <p className="text-sm italic text-foreground/80 leading-relaxed mb-4">"{analysis.description}"</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                                                    {t.mood}: {analysis.psychology}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {analysis.usageTips.map((tip, i) => (
                                                        <span key={i} className="px-2 py-1 bg-card border border-border text-[9px] font-mono">
                                                            {tip}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-12">
                            <h3 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">{t.nearbyRefs}</h3>
                            <SwatchStrip colors={stripColors} selectedHex={hex} onSelect={handleHexChange} showRefMatch={showRefMatch} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-12 gap-x-8 border-t border-border/60 pt-12 mb-16">
                            <InfoGrid
                                rgb={rgb}
                                cmyk={cmyk}
                                hsl={hsl}
                                analysis={analysis}
                                onCmykChange={handleCmykChange}
                                onHslChange={handleHslChange}
                                onRgbChange={handleRgbChange}
                            />
                        </div>

                        <SimilarityGrid matches={matches} selectedHex={hex} onSelect={handleHexChange} showRefMatch={showRefMatch} />
                    </>
                )}
            </main>

            <footer className="py-8 text-center border-t border-border mt-auto">
                <a
                    href="https://www.instagram.com/unbserved/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] font-bold text-muted-foreground hover:text-foreground tracking-widest uppercase transition-colors"
                >
                    {t.poweredBy}
                </a>
            </footer>
        </div>
    );
};

export default App;


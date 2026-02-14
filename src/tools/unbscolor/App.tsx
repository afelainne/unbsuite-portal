import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { InfoGrid } from './components/InfoGrid';
import { PaletteGenerator } from './components/PaletteGenerator';
import { SwatchStrip } from './components/SwatchStrip';
import { SimilarityGrid } from './components/SimilarityGrid';
import { ColorGuide } from './components/ColorGuide';
import { PaletteBuilder } from './components/PaletteBuilder';
import { GeneratedPalettes } from './components/GeneratedPalettes';
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
    const [activeTab, setActiveTab] = useState<'matcher' | 'batch' | 'guide' | 'palette' | 'generated'>('matcher');
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
    const [showPantoneMatch, setShowPantoneMatch] = useState(false);

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

    const normalizePantoneCode = (code?: string) => {
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

    const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
        const newRgb = { ...rgb, [channel]: value };
        setRgb(newRgb);
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setHex(newHex);
        updateDerivedFromRgb(newRgb, newHex);
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
        strip: { hex: string; name: string }[];
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
                label: t.pantoneBridgeC,
                    code: matchC && matchC.deltaE < 10 ? normalizePantoneCode(matchC.reference.code) : outOfGamutLabel,
                swatch: matchC ? matchC.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showPmsU) {
            matchesList.push({
                label: t.pantoneBridgeU,
                    code: matchU && matchU.deltaE < 10 ? normalizePantoneCode(matchU.reference.code) : outOfGamutLabel,
                swatch: matchU ? matchU.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showPmsSolidC) {
            matchesList.push({
                label: t.pantoneC,
                    code: matchSolidC && matchSolidC.deltaE < 10 ? normalizePantoneCode(matchSolidC.reference.code) : outOfGamutLabel,
                swatch: matchSolidC ? matchSolidC.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showPmsSolidU) {
            matchesList.push({
                label: t.pantoneU,
                    code: matchSolidU && matchSolidU.deltaE < 10 ? normalizePantoneCode(matchSolidU.reference.code) : outOfGamutLabel,
                swatch: matchSolidU ? matchSolidU.reference.hex : '#e5e7eb'
            });
        }

        const strip = findReferenceMatches(color, library, 6).map((m) => ({
            hex: m.reference.hex,
            name: m.reference.name
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
                const isOutOfGamut = match.code === 'OUT OF GAMUT';
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
                if (isFirst) {
                    return `<path d="M${x + 10},${stripY} h${slotWidth - 10} v40 h-${slotWidth - 10} q-10,0 -10,-10 v-20 q0,-10 10,-10 z" fill="${s.hex}" />`;
                } else if (isLast) {
                    return `<path d="M${x},${stripY} h${slotWidth - 10} q10,0 10,10 v20 q0,10 -10,10 h-${slotWidth - 10} v-40 z" fill="${s.hex}" />`;
                }
                return `<rect x="${x}" y="${stripY}" width="${slotWidth}" height="40" fill="${s.hex}" />`;
            })
            .join('');

        cursor += 60;
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
                if (settings.showPmsC) output.push(matchC && matchC.deltaE < 10 ? normalizePantoneCode(matchC.reference.code) : `${t.outOfGamut} C`);
                if (settings.showPmsU) output.push(matchU && matchU.deltaE < 10 ? normalizePantoneCode(matchU.reference.code) : `${t.outOfGamut} U`);
                if (settings.showPmsSolidC) output.push(matchSolidC && matchSolidC.deltaE < 10 ? normalizePantoneCode(matchSolidC.reference.code) : `${t.outOfGamut} C (SOLID)`);
                if (settings.showPmsSolidU) output.push(matchSolidU && matchSolidU.deltaE < 10 ? normalizePantoneCode(matchSolidU.reference.code) : `${t.outOfGamut} U (SOLID)`);

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

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (!isValidHex(hex)) {
                setMatches([]);
                setStripColors([]);
                return;
            }

            try {
                const fetched = await fetchMatchesWithFallback({
                    hex,
                    libraryId: libraryType,
                    count: 12,
                    fallbackLibrary: library
                });

                if (cancelled) return;

                setMatches(fetched);
                const similarForStrip = fetched.map((m) => ({
                    hex: m.reference.hex,
                    name: getClosestColorName(m.reference.hex),
                    pantoneCode: normalizePantoneCode(m.reference.code),
                    type: `ΔE ${m.deltaE.toFixed(2)}`
                }));
                setStripColors(similarForStrip);
                setAnalysis(null);
            } catch (err) {
                if (!cancelled) {
                    setMatches([]);
                    setStripColors([]);
                }
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [library, hex, libraryType]);

    const triggerAiAnalysis = async () => {
        if (!matches[0]) return;
        setLoadingAi(true);
        const result = await analyzeColor(hex, matches[0].reference.code, language);
        setAnalysis(result);
        setLoadingAi(false);
    };

    const getPmsC = () => findReferenceMatches(hex, bridgeCoatedLibrary, 1)[0];
    const getPmsU = () => findReferenceMatches(hex, bridgeUncoatedLibrary, 1)[0];
    const getPmsSolidC = () => findReferenceMatches(hex, solidCoatedLibrary, 1)[0];
    const getPmsSolidU = () => findReferenceMatches(hex, solidUncoatedLibrary, 1)[0];

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col relative overflow-x-hidden">
            {showSettings && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                    <div className="relative w-full max-w-[440px] bg-white border-l border-gray-100 p-12 shadow-[0_0_100px_rgba(0,0,0,0.05)] h-full animate-in slide-in-from-right duration-500 overflow-y-auto">
                        <div className="flex justify-between items-center mb-16">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-normal tracking-tighter">{t.settings}</h2>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-16">
                            <div>
                                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 mb-8 border-b border-gray-50 pb-2">{t.language}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { code: 'en' as Language, label: t.english, flag: '🇺🇸' },
                                        { code: 'pt' as Language, label: t.portuguese, flag: '🇧🇷' },
                                        { code: 'es' as Language, label: t.spanish, flag: '🇪🇸' }
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLanguage(lang.code)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${language === lang.code ? 'bg-black text-white border-black' : 'bg-gray-50/50 border-gray-100/50 hover:bg-white hover:shadow-sm'}`}
                                        >
                                            <span className="text-2xl">{lang.flag}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 mb-8 border-b border-gray-50 pb-2">{t.visibleColorModels}</h3>
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
                                            className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 cursor-pointer group hover:bg-white hover:shadow-sm transition-all"
                                            onClick={() => setSettings((s) => ({ ...s, [opt.key]: !s[opt.key as keyof SettingsState] }))}
                                        >
                                            <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? 'bg-black' : 'bg-gray-200'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400">SEARCH WEB PANTONE</p>
                                    {[
                                        { key: 'showPmsC', label: t.pantoneBridgeC },
                                        { key: 'showPmsU', label: t.pantoneBridgeU },
                                        { key: 'showPmsSolidC', label: t.pantoneC },
                                        { key: 'showPmsSolidU', label: t.pantoneU }
                                    ].map((opt) => (
                                        <div
                                            key={opt.key}
                                            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200/70 cursor-pointer group hover:shadow-sm transition-all"
                                            onClick={() => setSettings((s) => ({ ...s, [opt.key]: !s[opt.key as keyof SettingsState] }))}
                                        >
                                            <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                                            <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? 'bg-emerald-600' : 'bg-gray-200'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${settings[opt.key as keyof SettingsState] ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-gray-300 mb-8 border-b border-gray-50 pb-2">{t.mixedFormatSyntax}</h3>
                                <div className="space-y-3">
                                    {['R=80, G=184, B=72', 'RGB 80, 184, 72', 'rgb(80, 184, 72)'].map((fmt) => (
                                        <label
                                            key={fmt}
                                            className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                                        >
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="radio"
                                                    name="mixFormat"
                                                    className="sr-only"
                                                    checked={settings.mixFormat === fmt}
                                                    onChange={() => setSettings((s) => ({ ...s, mixFormat: fmt }))}
                                                />
                                                <div className={`w-6 h-6 rounded-full border-2 transition-all ${settings.mixFormat === fmt ? 'border-black bg-black' : 'border-gray-200'}`}></div>
                                                {settings.mixFormat === fmt && <div className="absolute w-2 h-2 bg-white rounded-full"></div>}
                                            </div>
                                            <span className={`text-sm font-mono transition-colors ${settings.mixFormat === fmt ? 'text-black font-bold' : 'text-gray-400'}`}>
                                                {fmt}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 pt-8 border-t border-gray-100">
                            <p className="text-[10px] font-mono text-gray-400 leading-relaxed uppercase tracking-widest">{t.changesAppliedRealtime}</p>
                        </div>
                    </div>
                </div>
            )}

            {copyFeedback && (
                <div className="fixed top-4 right-4 bg-black text-white px-4 py-2 text-xs font-mono font-bold uppercase z-[250] shadow-2xl">
                    {copyFeedback}
                </div>
            )}

            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100 px-6 md:px-8 py-6">
                <div className="max-w-[1600px] mx-auto w-full space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-6">
                            <button
                                type="button"
                                className="h-12 px-3 py-1 bg-transparent transition-colors flex items-center justify-center shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                onClick={() => setActiveTab('matcher')}
                                aria-label="UNBSCOLOR"
                            >
                                <svg className="h-7 w-auto" width="3022" height="728" viewBox="0 0 3022 728" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1568.24 0C1669.31 0.000100032 1715.42 52.3123 1715.42 195.062V297.026H1648.92V190.629C1648.92 97.531 1631.19 66.4981 1568.24 66.498C1506.17 66.498 1488.44 97.5309 1488.44 190.629V535.535C1488.44 629.52 1506.17 660.553 1568.24 660.553C1631.19 660.553 1648.92 629.52 1648.92 535.535V430.024H1715.42V531.102C1715.42 673.852 1669.31 727.051 1568.24 727.051C1468.05 727.051 1421.94 673.852 1421.94 531.102V195.062C1421.94 52.3121 1468.05 0 1568.24 0ZM1919.78 0C2020.86 6.31784e-05 2066.96 52.3122 2066.96 195.062V531.102C2066.96 673.852 2020.86 727.051 1919.78 727.051C1819.59 727.051 1773.48 673.852 1773.48 531.102V195.062C1773.48 52.3121 1819.59 0 1919.78 0ZM2512.03 0C2613.11 0 2659.21 52.3121 2659.21 195.062V531.102C2659.21 673.852 2613.11 727.051 2512.03 727.051C2411.84 727.051 2365.73 673.852 2365.73 531.102V195.062C2365.73 52.3121 2411.84 0 2512.03 0ZM1161.48 0.614258C1218.77 0.614258 1261 18.6272 1288.17 54.6533C1315.33 90.0889 1328.92 145.9 1328.92 222.087H1181.86C1181.86 194.329 1180.09 175.135 1176.54 164.504C1173.59 153.873 1168.57 148.558 1161.48 148.558C1154.4 148.558 1149.67 152.102 1147.31 159.188C1144.95 165.685 1143.77 175.725 1143.77 189.309C1143.77 204.664 1145.83 217.657 1149.97 228.288C1154.69 238.328 1161.48 247.482 1170.34 255.75C1179.79 264.018 1193.97 275.535 1212.87 290.3C1242.39 312.742 1265.72 333.414 1282.85 352.312C1299.98 371.211 1313.56 395.13 1323.6 424.069C1334.23 452.418 1339.55 487.853 1339.55 530.376C1339.55 595.932 1325.96 645.246 1298.8 678.319C1272.22 710.802 1229.7 727.044 1171.23 727.044C1129.89 727.044 1096.81 719.956 1072.01 705.782C1047.2 691.608 1028.6 665.917 1016.2 628.71C1014.7 624.206 1013.29 619.472 1011.97 614.51C1009.34 623.438 1006.21 631.715 1002.56 639.341C990.161 665.917 969.786 685.702 941.438 698.695C913.089 711.688 874.7 718.185 826.271 718.185H556.768L463.749 409.009V718.185H315.806V651.489C288.662 701.859 240.386 727.044 170.977 727.044C56.9922 727.044 4.72325e-05 659.125 0 523.289V9.47266H147.943V511.772C147.943 531.852 148.239 546.322 148.829 555.181C150.01 563.449 152.077 569.65 155.03 573.784C157.983 577.328 163.299 579.1 170.977 579.1C178.654 579.1 183.97 577.328 186.923 573.784C189.876 569.65 191.647 563.449 192.237 555.181C193.418 546.322 194.01 531.852 194.01 511.772V9.47266H463.749L556.768 318.648V9.47266H826.271C875.881 9.47266 914.27 15.9699 941.438 28.9629C968.604 41.9559 987.503 62.6264 998.134 90.9746C1000.64 97.3118 1002.87 104.196 1004.82 111.625C1024.55 37.6181 1076.77 0.614364 1161.48 0.614258ZM2191.52 651.686H2337.82V718.185H2125.02V8.86621H2191.52V651.686ZM2816.58 8.86621C2981.5 8.86624 3012.53 72.7047 3012.53 202.155V218.115C3012.53 301.46 2996.57 362.639 2927.41 391.898C2981.5 408.745 3011.64 447.757 3011.64 538.195V655.232C3011.64 681.832 3012.53 707.545 3021.4 718.185H2954.9C2946.03 707.545 2945.14 681.832 2945.14 655.232V531.988C2945.14 421.158 2874.21 418.497 2817.47 418.497H2783.78V718.185H2717.28V8.86621H2816.58ZM1919.78 66.498C1857.71 66.498 1839.98 97.5309 1839.98 190.629V535.535C1839.98 629.52 1857.71 660.553 1919.78 660.553C1982.73 660.553 2000.46 629.52 2000.46 535.535V190.629C2000.46 97.531 1982.73 66.4981 1919.78 66.498ZM2512.03 66.498C2449.97 66.498 2432.23 97.5309 2432.23 190.629V535.535C2432.23 629.52 2449.97 660.553 2512.03 660.553C2574.98 660.553 2592.72 629.52 2592.72 535.535V190.629C2592.72 97.5309 2574.98 66.498 2512.03 66.498ZM1006.3 273.886C995.759 307.37 975.616 331.741 945.866 346.997C990.207 370.714 1015.19 411.76 1020.82 470.136H1145.54C1145.54 514.43 1147.61 543.665 1151.74 557.839C1155.87 572.013 1162.37 579.1 1171.23 579.1C1180.09 579.1 1185.7 575.557 1188.06 568.47C1190.42 561.383 1191.6 548.684 1191.6 530.376C1191.6 514.43 1190.42 501.733 1188.06 492.283C1185.7 482.243 1180.38 471.907 1172.11 461.276C1163.85 450.646 1150.56 437.653 1132.25 422.298L1110.99 405.466C1085 384.795 1064.33 366.486 1048.98 350.54C1034.21 334.594 1021.51 313.628 1010.88 287.643C1009.22 283.228 1007.69 278.642 1006.3 273.886ZM826.271 570.241H827.157C844.284 570.241 856.391 566.993 863.479 560.496C870.566 554 874.109 541.302 874.109 522.403V476.337C874.109 457.438 870.861 445.036 864.365 439.13C857.869 433.224 845.466 430.271 827.157 430.271H826.271V570.241ZM2783.78 351.999H2816.58C2928.3 351.999 2946.03 306.78 2946.03 218.115V202.155C2946.03 107.284 2928.3 75.3643 2816.58 75.3643H2783.78V351.999ZM826.271 282.327H827.157C840.15 282.327 849.305 280.85 854.62 277.897C859.935 274.945 863.184 270.22 864.365 263.724C866.137 257.227 867.022 246.301 867.022 230.945V208.798C867.022 188.127 864.365 174.543 859.05 168.047C854.325 160.96 843.694 157.417 827.157 157.417H826.271V282.327Z" fill="black"/>
                                </svg>
                            </button>

                            <nav className="flex items-center gap-4 text-xs md:text-sm font-bold uppercase">
                                <button onClick={() => setActiveTab('matcher')} className={`pb-1 border-b-2 transition-colors ${activeTab === 'matcher' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>{t.matcher}</button>
                                <button onClick={() => setActiveTab('batch')} className={`pb-1 border-b-2 transition-colors ${activeTab === 'batch' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>{t.multiSlotMatchAnalysis}</button>
                                <button onClick={() => setActiveTab('palette')} className={`pb-1 border-b-2 transition-colors ${activeTab === 'palette' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>{t.contrastPalette}</button>
                                <button onClick={() => setActiveTab('generated')} className={`pb-1 border-b-2 transition-colors ${activeTab === 'generated' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>{t.generatedPalettes}</button>
                                <button onClick={() => setActiveTab('guide')} className={`pb-1 border-b-2 transition-colors ${activeTab === 'guide' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>{t.printGuide}</button>
                            </nav>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end text-[10px] font-mono">
                            {activeTab === 'matcher' && (
                                <PaletteGenerator
                                    onColorSelect={handleHexChange}
                                    onPaletteDetected={(colors) => {
                                        handleHexChange(colors[0]);
                                    }}
                                />
                            )}

                            {activeTab === 'batch' && (
                                <PaletteGenerator
                                    onColorSelect={handleHexChange}
                                    onPaletteDetected={(colors) => {
                                        setBatchColors(colors);
                                        handleHexChange(colors[0]);
                                    }}
                                />
                            )}

                            <button
                                onClick={() => setShowSettings(true)}
                                className="h-10 w-10 rounded-md border border-gray-200 bg-white transition-colors flex items-center justify-center shrink-0 hover:bg-black/5 hover:border-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                style={{ appearance: 'none', WebkitAppearance: 'none', padding: 0, margin: 0, background: 'transparent', lineHeight: 0 }}
                                title={t.settings}
                                aria-label={t.settings}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                                <div className="mb-12 font-mono text-gray-500 uppercase tracking-widest text-sm">{getClosestColorName(hex)}</div>

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
                                                className="w-full h-[2px] bg-gray-200 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-transform"
                                            />
                                            <span className="font-mono text-xs w-8 text-right text-gray-400">{rgb[channel as keyof RGB]}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-mono text-gray-700 uppercase tracking-tight">
                                    <span className="text-gray-400">HEX</span>
                                    <span className="text-left text-black">{hex.toUpperCase()}</span>
                                    <span className="text-gray-400">RGB</span>
                                    <span className="text-left text-black">{formatRgbDisplay(rgb.r, rgb.g, rgb.b)}</span>
                                    <span className="text-gray-400">CMYK</span>
                                    <span className="text-left text-black">{cmyk.c}, {cmyk.m}, {cmyk.y}, {cmyk.k}</span>
                                    <span className="text-gray-400">LAB</span>
                                    <span className="text-left text-black">{Math.round(lab.l)}, {Math.round(lab.a)}, {Math.round(lab.b)}</span>
                                    <span className="text-gray-400">HSL</span>
                                    <span className="text-left text-black">{hsl.h}, {hsl.s}%, {hsl.l}%</span>
                                    <span className="text-gray-400">HSB</span>
                                    <span className="text-left text-black">{hsv.h}, {hsv.s}, {hsv.v}</span>
                                </div>
                            </div>

                            <div className="lg:col-span-7">
                                <div className="flex items-center gap-3 mb-8 flex-wrap">
                                    <h2 className="font-mono text-sm font-medium">{t.matchCie2000}</h2>
                                    {!showPantoneMatch && matches[0] && (
                                        <button
                                            onClick={() => setShowPantoneMatch(true)}
                                            className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-gray-200 bg-white rounded-lg hover:border-black hover:text-black transition-all"
                                        >
                                            Buscar Pantone
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col md:flex-row gap-12 items-start">
                                    <div className="flex flex-col items-center">
                                        <div className="flex gap-8 items-center mb-6">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-inner" style={{ backgroundColor: hex }}></div>
                                                <span className="font-mono text-xs text-gray-400">{getClosestColorName(hex)}</span>
                                            </div>
                                            {showPantoneMatch && matches[0] ? (
                                                <>
                                                    <span className="text-gray-300 text-2xl">→</span>
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full shadow-inner" style={{ backgroundColor: matches[0].reference.hex }}></div>
                                                        <span className="font-mono text-xs text-gray-400">{normalizePantoneCode(matches[0].reference.code)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3 text-gray-300">
                                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border border-dashed border-gray-200 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em]">
                                                        Pantone
                                                    </div>
                                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Busque para ver</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-12 w-full mt-8">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4">DELTA E 00</span>
                                                <span className="text-6xl font-light tracking-tighter">{showPantoneMatch && matches[0] ? matches[0].deltaE.toFixed(2) : '--'}</span>
                                            </div>
                                            {showPantoneMatch && matches[0] && (
                                                <div className="flex flex-col gap-1 border-l border-gray-100 pl-8">
                                                    <span className="font-bold text-sm mb-1">{getClosestColorName(matches[0].reference.hex)}</span>
                                                    <div className="font-mono text-[11px] text-gray-500 space-y-1.5">
                                                        {settings.showHex && <p className="text-gray-400 mb-1">{matches[0].reference.hex}</p>}
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
                                                            <div className="mt-4 pt-3 border-t border-gray-50">
                                                                <span className="text-[9px] font-bold text-gray-300 uppercase block mb-1">{t.pantoneBridgeC}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-black">{normalizePantoneCode(getPmsC()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                        {settings.showPmsU && (
                                                            <div className={`${!settings.showPmsC ? 'mt-4 pt-3 border-t border-gray-50' : 'mt-2'}`}>
                                                                <span className="text-[9px] font-bold text-gray-300 uppercase block mb-1">{t.pantoneBridgeU}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-black">{normalizePantoneCode(getPmsU()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                        {settings.showPmsSolidC && (
                                                            <div className="mt-2 pt-3 border-t border-gray-50">
                                                                <span className="text-[9px] font-bold text-gray-300 uppercase block mb-1">{t.pantoneC}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-black">{normalizePantoneCode(getPmsSolidC()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                        {settings.showPmsSolidU && (
                                                            <div className="mt-2 pt-3 border-t border-gray-50">
                                                                <span className="text-[9px] font-bold text-gray-300 uppercase block mb-1">{t.pantoneU}</span>
                                                                <span className="font-bold text-xs uppercase tracking-tight text-black">{normalizePantoneCode(getPmsSolidU()?.reference.code) || t.outOfGamut}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 w-full md:w-auto ml-auto">
                                        <span className="font-mono text-xs text-gray-400 uppercase mb-4 tracking-widest">{t.actions}</span>
                                        <button
                                            onClick={() => handleHexChange(rgbToHex((Math.random() * 255) | 0, (Math.random() * 255) | 0, (Math.random() * 255) | 0))}
                                            className="bg-gray-100 hover:bg-black hover:text-white px-6 py-4 text-left font-mono text-xs transition-colors"
                                        >
                                            {t.randomizeColor}
                                        </button>
                                        <button
                                            onClick={triggerAiAnalysis}
                                            disabled={loadingAi}
                                            className="bg-gray-100 hover:bg-black hover:text-white px-6 py-4 text-left font-mono text-xs transition-colors"
                                        >
                                            {loadingAi ? t.thinking : t.analyzeWithAi}
                                        </button>
                                        {analysis && (
                                            <div className="mt-4 p-6 bg-gray-50 border border-gray-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500 max-w-xs">
                                                <h3 className="font-mono text-[10px] font-bold text-black mb-3 uppercase tracking-widest">{t.aiResult}</h3>
                                                <p className="text-sm italic text-gray-700 leading-relaxed mb-4">"{analysis.description}"</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                                                    {t.mood}: {analysis.psychology}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {analysis.usageTips.map((tip, i) => (
                                                        <span key={i} className="px-2 py-1 bg-white border border-gray-200 text-[9px] font-mono">
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
                            <h3 className="font-mono text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t.nearbyPantones}</h3>
                            <SwatchStrip colors={stripColors} selectedHex={hex} onSelect={handleHexChange} showPantoneMatch={showPantoneMatch} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-12 gap-x-8 border-t border-gray-100 pt-12 mb-16">
                            <InfoGrid
                                rgb={rgb}
                                cmyk={cmyk}
                                hsl={hsl}
                                analysis={null as AnalysisResult | null}
                                onCmykChange={handleCmykChange}
                                onHslChange={handleHslChange}
                                onRgbChange={handleRgbChange}
                            />
                        </div>

                        <SimilarityGrid matches={matches} selectedHex={hex} onSelect={handleHexChange} showPantoneMatch={showPantoneMatch} />
                    </>
                )}
            </main>

            <footer className="py-8 text-center border-t border-gray-100 mt-auto">
                <a
                    href="https://www.instagram.com/unbserved/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] font-bold text-gray-400 hover:text-black tracking-widest uppercase transition-colors"
                >
                    {t.poweredBy}
                </a>
            </footer>
        </div>
    );
};

export default App;


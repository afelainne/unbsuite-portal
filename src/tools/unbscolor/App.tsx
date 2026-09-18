import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PaletteGenerator } from './components/PaletteGenerator';
import { ColorGuide } from './components/ColorGuide';
import { PaletteBuilder } from './components/PaletteBuilder';
import { GeneratedPalettes } from './components/GeneratedPalettes';
import { MatcherView, MatcherValueRow } from './components/MatcherView';
import { PaletteMagic } from './components/PaletteMagic';
import { BatchAnalyzer } from './components/BatchAnalyzer';
import { useLanguage, Language } from './i18n';
import { Settings2, X } from 'lucide-react';
import { IconButton, LegendToggle, TextTabs } from './components/ui';
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
    hslToRgb,
    normalizeHex
} from './utils/colorMath';
import { escapeXml, toSafeFileName } from './utils/escape';
import { formatReferenceCode } from './utils/reference';
import { formatOklch } from './utils/oklab';
import { copyText, downloadBlob, downloadUrl, revokeObjectUrlLater, useTransientState } from './utils/browser';
import { analyzeColor } from './services/analysisService';
import { triggerFakeColorTraffic } from './services/obfuscatedColorService';
import { fetchMatchesWithFallback } from './services/matchApi';
import { RGB, CMYK, HSL, HSV, LAB, ColorMatch, AnalysisResult, ReferenceColor } from './types';
import { LIBRARY_OPTIONS, getLibraryById, DEFAULT_LIBRARY } from './constants';

const defaultLibraryId = LIBRARY_OPTIONS[0]?.id || '';

type SettingsState = {
    showHex: boolean;
    showRgb: boolean;
    showHsl: boolean;
    showHsb: boolean;
    showLab: boolean;
    showCmyk: boolean;
    showRefBridgeC: boolean;
    showRefBridgeU: boolean;
    showRefSolidC: boolean;
    showRefSolidU: boolean;
    mixFormat: string;
};

const App: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'matcher' | 'batch' | 'guide' | 'palette' | 'generated' | 'magic'>('matcher');
    const [showSettings, setShowSettings] = useState(false);
    const [batchColors, setBatchColors] = useState<string[]>(['#F0FF00', '#1A1A1A', '#FFFFFF', '#E5E5E5', '#333333']);

    const [settings, setSettings] = useState<SettingsState>({
        showHex: true,
        showRgb: true,
        showHsl: true,
        showHsb: true,
        showLab: true,
        showCmyk: true,
        showRefBridgeC: true,
        showRefBridgeU: true,
        showRefSolidC: true,
        showRefSolidU: true,
        mixFormat: 'rgb(80, 184, 72)'
    });

    const [hex, setHex] = useState<string>('#F0FF00');
    const [rgb, setRgb] = useState<RGB>(() => hexToRgb('#F0FF00'));
    const [cmyk, setCmyk] = useState<CMYK>(() => rgbToCmyk(hexToRgb('#F0FF00')));
    const [hsl, setHsl] = useState<HSL>(() => rgbToHsl(hexToRgb('#F0FF00')));
    const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(hexToRgb('#F0FF00')));
    const [lab, setLab] = useState<LAB>(() => hexToLab('#F0FF00'));

    const [libraryType, setLibraryType] = useState<string>(defaultLibraryId);
    const [library, setLibrary] = useState<ReferenceColor[]>(DEFAULT_LIBRARY);
    const [matches, setMatches] = useState<ColorMatch[]>([]);
    const [analysis, setAnalysis] = useState<{ description: string; usageTips: string[]; psychology: string } | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [copyFeedback, showCopyFeedback] = useTransientState<string>(2000);
    const [showRefMatch, setShowRefMatch] = useState(false);

    type CardTemplate = 'classic' | 'compact' | 'editorial' | 'swatchcard' | 'minimal' | 'mono';
    const [cardTemplate, setCardTemplate] = useState<CardTemplate>('classic');
    const [showAlternatives, setShowAlternatives] = useState<Set<number>>(new Set());

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

    /** Every code on screen or in an export goes through the one formatter. */
    const normalizeRefCode = (code?: string) => formatReferenceCode(code);

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

    const handleHexChange = useCallback((rawHex: string) => {
        // Callers may pass lowercase or "#"-less hex; derive and propagate only the normalized value.
        const newHex = typeof rawHex === 'string' ? normalizeHex(rawHex) : null;
        if (!newHex) return;
        setHex(newHex);
        const newRgb = hexToRgb(newHex);
        setRgb(newRgb);
        updateDerivedFromRgb(newRgb, newHex);
        setBatchColors((prev) => {
            const updated = [...prev];
            updated[0] = newHex;
            return updated;
        });
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

    const handleBatchColorUpdate = (index: number, rawHex: string) => {
        const newHex = normalizeHex(rawHex) ?? rawHex;
        setBatchColors((prev) => {
            const updated = [...prev];
            updated[index] = newHex;
            return updated;
        });
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
        alternatives?: { hex: string; name: string; code?: string; deltaE: number }[];
        template: CardTemplate;
    }

    const buildCardExportData = (color: string, index: number, includeAlternatives = false, template: CardTemplate = cardTemplate): CardExportPayload | null => {
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

        if (settings.showRefSolidC) {
            matchesList.push({
                label: t.refSolidC,
                    code: matchSolidC && matchSolidC.deltaE < 10 ? normalizeRefCode(matchSolidC.reference.code) : outOfGamutLabel,
                swatch: matchSolidC ? matchSolidC.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showRefSolidU) {
            matchesList.push({
                label: t.refSolidU,
                    code: matchSolidU && matchSolidU.deltaE < 10 ? normalizeRefCode(matchSolidU.reference.code) : outOfGamutLabel,
                swatch: matchSolidU ? matchSolidU.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showRefBridgeC) {
            matchesList.push({
                label: t.refBridgeC,
                    code: matchC && matchC.deltaE < 10 ? normalizeRefCode(matchC.reference.code) : outOfGamutLabel,
                swatch: matchC ? matchC.reference.hex : '#e5e7eb'
            });
        }

        if (settings.showRefBridgeU) {
            matchesList.push({
                label: t.refBridgeU,
                    code: matchU && matchU.deltaE < 10 ? normalizeRefCode(matchU.reference.code) : outOfGamutLabel,
                swatch: matchU ? matchU.reference.hex : '#e5e7eb'
            });
        }

        const stripMatches = findReferenceMatches(color, library, 6);
        const strip = stripMatches.map((m) => ({
            hex: m.reference.hex,
            name: getClosestColorName(m.reference.hex),
            code: normalizeRefCode(m.reference.code)
        }));
        const alternatives = includeAlternatives ? stripMatches.map((m) => ({
            hex: m.reference.hex,
            name: getClosestColorName(m.reference.hex),
            code: normalizeRefCode(m.reference.code),
            deltaE: m.deltaE
        })) : undefined;

        return {
            index,
            hex: color,
            name: getClosestColorName(color),
            stats,
            matches: matchesList,
            strip,
            alternatives,
            template
        };
    };

    const renderClassicCard = (payload: CardExportPayload) => {
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
                return `<text x="${padding}" y="${y}" font-size="13" font-family="'BDO Grotesk', Arial, sans-serif" fill="#374151">${escapeXml(line)}</text>`;
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
                    <text x="16" y="22" font-size="10" font-family="'BDO Grotesk', Arial, sans-serif" fill="#9ca3af" font-weight="700" letter-spacing="1.5">${escapeXml(match.label.toUpperCase())}</text>
                    <text x="16" y="44" font-size="16" font-family="'BDO Grotesk', Arial, sans-serif" fill="${isOutOfGamut ? '#9ca3af' : '#0f172a'}" font-weight="700">${escapeXml(match.code)}</text>
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
                    rect += `<text x="${x + slotWidth / 2}" y="${stripY + 54}" font-size="8" font-family="'BDO Grotesk', Arial, sans-serif" fill="#9ca3af" text-anchor="middle">${escapeXml(s.code)}</text>`;
                }
                return rect;
            })
            .join('');

        cursor += 74; // extra space for codes below strip

        // Alternatives expanded grid
        let altSvg = '';
        if (payload.alternatives && payload.alternatives.length) {
            cursor += 8;
            const altLabelY = cursor;
            cursor += 24;
            const cols = 2;
            const cellW = (width - padding * 2 - 12 * (cols - 1)) / cols;
            const cellH = 84;
            const cells = payload.alternatives.map((a, i) => {
                const r = Math.floor(i / cols);
                const c = i % cols;
                const x = padding + c * (cellW + 12);
                const y = cursor + r * (cellH + 10);
                return `<g transform="translate(${x}, ${y})">
                    <rect width="${cellW}" height="${cellH}" rx="10" fill="#ffffff" stroke="#e5e7eb" />
                    <rect x="8" y="8" width="44" height="${cellH - 16}" rx="8" fill="${a.hex}" />
                    <text x="62" y="26" font-size="11" font-family="'BDO Grotesk', Arial, sans-serif" fill="#0f172a" font-weight="700">${escapeXml(a.code || a.name)}</text>
                    <text x="62" y="46" font-size="10" font-family="'BDO Grotesk', Arial, sans-serif" fill="#9ca3af">${escapeXml(a.name)}</text>
                    <text x="62" y="66" font-size="10" font-family="'BDO Grotesk', Arial, sans-serif" fill="#9ca3af">ΔE ${a.deltaE.toFixed(1)}</text>
                </g>`;
            }).join('');
            const rows = Math.ceil(payload.alternatives.length / cols);
            cursor += rows * (cellH + 10);
            altSvg = `<text x="${padding}" y="${altLabelY}" font-size="11" fill="#9ca3af" font-weight="700" letter-spacing="1.5">${escapeXml(t.nearbyAlternatives.toUpperCase())}</text>${cells}`;
        }

        const height = cursor + padding;

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(t.slotLabel)} ${payload.index + 1} ${escapeXml(t.colorCardAria)}" shape-rendering="geometricPrecision" text-rendering="optimizeLegibility">
    <defs>
        <style>text { font-family: 'BDO Grotesk', Arial, sans-serif; }</style>
        <clipPath id="headerClip"><rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${headerHeight}" rx="24" /></clipPath>
    </defs>
    <rect width="100%" height="100%" fill="#ffffff" rx="28" />
    <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${headerHeight}" rx="24" fill="${payload.hex}" />
    <text x="${padding + 20}" y="${padding + 32}" font-size="11" fill="${headerTextColor}" opacity="${headerTextOpacity}" font-weight="700" letter-spacing="2">${escapeXml(t.slotLabel.toUpperCase())} ${payload.index + 1}</text>
    <text x="${padding + 20}" y="${padding + 72}" font-size="28" fill="${headerTextColor}" font-weight="800">${escapeXml(payload.name)}</text>
    <text x="${padding + 20}" y="${padding + 100}" font-size="15" fill="${headerTextColor}" opacity="${headerTextOpacity}" font-weight="600">${escapeXml(payload.hex.toUpperCase())}</text>
    ${statLines}
    ${matchBlock}
    <text x="${padding}" y="${stripLabelY}" font-size="11" fill="#9ca3af" font-weight="700" letter-spacing="1.5">${escapeXml(t.nearbyAlternatives.toUpperCase())}</text>
    <rect x="${padding}" y="${stripY}" width="${stripWidth}" height="40" rx="10" fill="#f3f4f6" />
    <g clip-path="url(#stripClip)">
        <clipPath id="stripClip"><rect x="${padding}" y="${stripY}" width="${stripWidth}" height="40" rx="10" /></clipPath>
        ${stripRects}
    </g>
    ${altSvg}
</svg>`;

        return { svg, width, height };
    };

    const renderCompactCard = (payload: CardExportPayload) => {
        const width = 360;
        const pad = 16;
        const headerH = 64;
        let y = pad + headerH + 16;
        const rgbH = hexToRgb(payload.hex);
        const lum = (0.299 * rgbH.r + 0.587 * rgbH.g + 0.114 * rgbH.b) / 255;
        const tc = lum > 0.5 ? '#0f172a' : '#fff';
        // stats in 2 columns
        const colW = (width - pad * 2) / 2;
        const statRows = Math.ceil(payload.stats.length / 2);
        const statSvg = payload.stats.map((s, i) => {
            const c = i % 2, r = Math.floor(i / 2);
            return `<text x="${pad + c * colW}" y="${y + r * 16}" font-size="10" font-family="Arial, monospace" fill="#374151">${escapeXml(s)}</text>`;
        }).join('');
        y += statRows * 16 + 12;
        const matchSvg = payload.matches.map((m, i) => {
            const my = y + i * 26;
            return `<rect x="${pad}" y="${my}" width="20" height="20" rx="4" fill="${m.swatch}" stroke="#e5e7eb" />
                <text x="${pad + 28}" y="${my + 9}" font-size="8" font-family="'BDO Grotesk', Arial, sans-serif" fill="#9ca3af" font-weight="700">${escapeXml(m.label.toUpperCase())}</text>
                <text x="${pad + 28}" y="${my + 20}" font-size="11" font-family="'BDO Grotesk', Arial, sans-serif" fill="#0f172a" font-weight="700">${escapeXml(m.code)}</text>`;
        }).join('');
        y += payload.matches.length * 26 + 12;
        const stripW = width - pad * 2;
        const sw = stripW / Math.max(payload.strip.length, 1);
        const stripSvg = payload.strip.map((s, i) => `<rect x="${pad + i * sw}" y="${y}" width="${sw}" height="22" fill="${s.hex}" />`).join('');
        y += 28;
        let altSvg = '';
        if (payload.alternatives) {
            altSvg = payload.alternatives.map((a, i) => {
                const ay = y + i * 22;
                return `<rect x="${pad}" y="${ay}" width="16" height="16" fill="${a.hex}" />
                    <text x="${pad + 22}" y="${ay + 12}" font-size="9" font-family="'BDO Grotesk', Arial, sans-serif" fill="#0f172a">${escapeXml(a.code || a.name)} · ΔE ${a.deltaE.toFixed(1)}</text>`;
            }).join('');
            y += payload.alternatives.length * 22;
        }
        const height = y + pad;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#fff" rx="14" />
            <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${headerH}" rx="10" fill="${payload.hex}" />
            <text x="${pad + 12}" y="${pad + 26}" font-size="14" fill="${tc}" font-weight="800">${escapeXml(payload.name)}</text>
            <text x="${pad + 12}" y="${pad + 48}" font-size="11" fill="${tc}" opacity="0.85" font-family="monospace">${escapeXml(payload.hex)}</text>
            ${statSvg}${matchSvg}${stripSvg}${altSvg}
        </svg>`;
        return { svg, width, height };
    };

    const renderEditorialCard = (payload: CardExportPayload) => {
        const width = 480;
        const pad = 0;
        const headerH = 220;
        const rgbH = hexToRgb(payload.hex);
        const lum = (0.299 * rgbH.r + 0.587 * rgbH.g + 0.114 * rgbH.b) / 255;
        const tc = lum > 0.5 ? '#0f172a' : '#fff';
        let y = headerH + 32;
        const innerPad = 32;
        const statSvg = payload.stats.map((s, i) => `<text x="${innerPad}" y="${y + i * 18}" font-size="11" font-family="monospace" fill="#374151">${escapeXml(s)}</text>`).join('');
        y += payload.stats.length * 18 + 24;
        const matchSvg = payload.matches.map((m, i) => {
            const my = y + i * 36;
            return `<line x1="${innerPad}" y1="${my + 30}" x2="${width - innerPad}" y2="${my + 30}" stroke="#e5e7eb" />
                <text x="${innerPad}" y="${my + 18}" font-size="10" font-family="'BDO Grotesk', Arial, sans-serif" fill="#6b7280" letter-spacing="2">${escapeXml(m.label.toUpperCase())}</text>
                <text x="${width - innerPad - 80}" y="${my + 18}" font-size="14" font-family="'BDO Grotesk', Arial, sans-serif" fill="#0f172a" font-weight="700">${escapeXml(m.code)}</text>
                <rect x="${width - innerPad - 28}" y="${my + 4}" width="20" height="20" fill="${m.swatch}" />`;
        }).join('');
        y += payload.matches.length * 36 + 24;
        const stripW = width - innerPad * 2;
        const sw = stripW / Math.max(payload.strip.length, 1);
        const stripSvg = payload.strip.map((s, i) => `<rect x="${innerPad + i * sw}" y="${y}" width="${sw}" height="36" fill="${s.hex}" />`).join('');
        y += 44;
        let altSvg = '';
        if (payload.alternatives) {
            altSvg = payload.alternatives.map((a, i) => {
                const ay = y + i * 28;
                return `<rect x="${innerPad}" y="${ay}" width="20" height="20" fill="${a.hex}" />
                    <text x="${innerPad + 28}" y="${ay + 14}" font-size="11" fill="#0f172a" font-weight="700">${escapeXml(a.code || a.name)}</text>
                    <text x="${width - innerPad}" y="${ay + 14}" text-anchor="end" font-size="10" fill="#9ca3af">ΔE ${a.deltaE.toFixed(1)}</text>`;
            }).join('');
            y += payload.alternatives.length * 28;
        }
        const height = y + 32;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#fafafa" />
            <rect x="0" y="0" width="${width}" height="${headerH}" fill="${payload.hex}" />
            <text x="${innerPad}" y="80" font-size="48" font-family="Georgia, serif" font-weight="700" fill="${tc}">${escapeXml(payload.name)}</text>
            <text x="${innerPad}" y="120" font-size="20" font-family="monospace" fill="${tc}" opacity="0.85">${escapeXml(payload.hex.toUpperCase())}</text>
            <text x="${innerPad}" y="${headerH - 24}" font-size="11" font-family="'BDO Grotesk', Arial, sans-serif" fill="${tc}" opacity="0.7" letter-spacing="3">${escapeXml(t.slotLabel.toUpperCase())} ${payload.index + 1}</text>
            ${statSvg}${matchSvg}${stripSvg}${altSvg}
        </svg>`;
        return { svg, width, height };
    };

    const renderSwatchCard = (payload: CardExportPayload) => {
        const size = 420;
        const swatchH = Math.round(size * 0.6);
        const rgbH = hexToRgb(payload.hex);
        const lum = (0.299 * rgbH.r + 0.587 * rgbH.g + 0.114 * rgbH.b) / 255;
        const tc = lum > 0.5 ? '#0f172a' : '#fff';
        let y = swatchH + 24;
        const pad = 20;
        const statSvg = payload.stats.slice(0, 4).map((s, i) => `<text x="${pad}" y="${y + i * 14}" font-size="10" font-family="monospace" fill="#374151">${escapeXml(s)}</text>`).join('');
        y += Math.min(payload.stats.length, 4) * 14 + 12;
        const sw = (size - pad * 2) / Math.max(payload.matches.length || 1, 1);
        const matchSvg = payload.matches.map((m, i) => `<rect x="${pad + i * sw}" y="${y}" width="${sw - 4}" height="20" fill="${m.swatch}" />
            <text x="${pad + i * sw}" y="${y + 32}" font-size="8" font-family="monospace" fill="#6b7280">${escapeXml(m.code.slice(0, 14))}</text>`).join('');
        y += 44;
        let altSvg = '';
        if (payload.alternatives) {
            const aw = (size - pad * 2) / payload.alternatives.length;
            altSvg = payload.alternatives.map((a, i) => `<rect x="${pad + i * aw}" y="${y}" width="${aw - 2}" height="24" fill="${a.hex}" />`).join('');
            y += 28;
        }
        const height = y + pad;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">
            <rect width="100%" height="100%" fill="#fff" />
            <rect x="0" y="0" width="${size}" height="${swatchH}" fill="${payload.hex}" />
            <text x="${pad}" y="${swatchH - 40}" font-size="24" font-family="'BDO Grotesk', Arial, sans-serif" font-weight="800" fill="${tc}">${escapeXml(payload.name)}</text>
            <text x="${pad}" y="${swatchH - 18}" font-size="13" font-family="monospace" fill="${tc}" opacity="0.85">${escapeXml(payload.hex.toUpperCase())}</text>
            ${statSvg}${matchSvg}${altSvg}
        </svg>`;
        return { svg, width: size, height };
    };

    const renderMinimalCard = (payload: CardExportPayload) => {
        const width = 400;
        const pad = 16;
        const swatchH = 80;
        let y = swatchH + 28;
        const rgbH = hexToRgb(payload.hex);
        const lum = (0.299 * rgbH.r + 0.587 * rgbH.g + 0.114 * rgbH.b) / 255;
        const tc = lum > 0.5 ? '#0f172a' : '#fff';
        const sw = (width - pad * 2) / Math.max(payload.matches.length || 1, 1);
        const matchSvg = payload.matches.map((m, i) => `<rect x="${pad + i * sw}" y="${y}" width="${sw - 4}" height="36" fill="${m.swatch}" />
            <text x="${pad + i * sw + 4}" y="${y + 50}" font-size="8" font-family="monospace" fill="#6b7280">${escapeXml(m.code.slice(0, 14))}</text>`).join('');
        y += 60;
        let altSvg = '';
        if (payload.alternatives) {
            const aw = (width - pad * 2) / payload.alternatives.length;
            altSvg = payload.alternatives.map((a, i) => `<rect x="${pad + i * aw}" y="${y}" width="${aw - 2}" height="20" fill="${a.hex}" />`).join('');
            y += 24;
        }
        const height = y + pad;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#fff" />
            <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${swatchH}" fill="${payload.hex}" />
            <text x="${pad + 12}" y="${pad + 36}" font-size="18" font-family="'BDO Grotesk', Arial, sans-serif" font-weight="800" fill="${tc}">${escapeXml(payload.name)}</text>
            <text x="${pad + 12}" y="${pad + 60}" font-size="12" font-family="monospace" fill="${tc}" opacity="0.85">${escapeXml(payload.hex.toUpperCase())}</text>
            ${matchSvg}${altSvg}
        </svg>`;
        return { svg, width, height };
    };

    const renderMonoCard = (payload: CardExportPayload) => {
        const width = 420;
        const pad = 24;
        const headerH = 160;
        let y = pad + headerH + 24;
        const statSvg = payload.stats.map((s, i) => `<text x="${pad}" y="${y + i * 22}" font-size="13" font-family="monospace" fill="#d1d5db">${escapeXml(s)}</text>`).join('');
        y += payload.stats.length * 22 + 24;
        const matchSvg = payload.matches.map((m, i) => {
            const my = y + i * 60;
            return `<rect x="${pad}" y="${my}" width="${width - pad * 2}" height="48" rx="10" fill="#1a1a1a" stroke="#333" />
                <text x="${pad + 16}" y="${my + 18}" font-size="9" fill="#9ca3af" font-weight="700" letter-spacing="1.5">${escapeXml(m.label.toUpperCase())}</text>
                <text x="${pad + 16}" y="${my + 36}" font-size="14" fill="#fff" font-weight="700">${escapeXml(m.code)}</text>
                <rect x="${width - pad - 48}" y="${my + 6}" width="36" height="36" rx="8" fill="${m.swatch}" stroke="#444" />`;
        }).join('');
        y += payload.matches.length * 60 + 16;
        const stripW = width - pad * 2;
        const sw = stripW / Math.max(payload.strip.length, 1);
        const stripSvg = payload.strip.map((s, i) => `<rect x="${pad + i * sw}" y="${y}" width="${sw}" height="36" fill="${s.hex}" stroke="#222" />`).join('');
        y += 44;
        let altSvg = '';
        if (payload.alternatives) {
            altSvg = payload.alternatives.map((a, i) => {
                const ay = y + i * 26;
                return `<rect x="${pad}" y="${ay}" width="20" height="20" fill="${a.hex}" stroke="#333" />
                    <text x="${pad + 28}" y="${ay + 14}" font-size="10" fill="#fff" font-weight="700">${escapeXml(a.code || a.name)}</text>
                    <text x="${width - pad}" y="${ay + 14}" text-anchor="end" font-size="10" fill="#9ca3af">ΔE ${a.deltaE.toFixed(1)}</text>`;
            }).join('');
            y += payload.alternatives.length * 26;
        }
        const height = y + pad;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#0a0a0a" rx="20" />
            <rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${headerH}" rx="16" fill="${payload.hex}" stroke="#333" />
            <text x="${pad + 16}" y="${pad + 32}" font-size="11" fill="#fff" opacity="0.85" font-weight="700" letter-spacing="2">${escapeXml(t.slotLabel.toUpperCase())} ${payload.index + 1}</text>
            <text x="${pad + 16}" y="${pad + 76}" font-size="26" fill="#fff" font-weight="800">${escapeXml(payload.name)}</text>
            <text x="${pad + 16}" y="${pad + 104}" font-size="14" fill="#fff" opacity="0.85" font-family="monospace">${escapeXml(payload.hex.toUpperCase())}</text>
            ${statSvg}${matchSvg}${stripSvg}${altSvg}
        </svg>`;
        return { svg, width, height };
    };

    const generateCardSvg = (payload: CardExportPayload) => {
        switch (payload.template) {
            case 'compact': return renderCompactCard(payload);
            case 'editorial': return renderEditorialCard(payload);
            case 'swatchcard': return renderSwatchCard(payload);
            case 'minimal': return renderMinimalCard(payload);
            case 'mono': return renderMonoCard(payload);
            default: return renderClassicCard(payload);
        }
    };

    const downloadFromUrl = downloadUrl;

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
                revokeObjectUrlLater(url);
                resolve();
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Could not render card image'));
            };

            img.src = url;
        });
    };

    const handleDownloadCards = async (format: 'svg' | 'png') => {
        const payloads = batchColors
            .map((color, idx) => buildCardExportData(color, idx, showAlternatives.has(idx)))
            .filter((card): card is CardExportPayload => Boolean(card));

        for (const card of payloads) {
            await downloadCardPayload(card, format);
        }
    };

    const downloadCardPayload = async (card: CardExportPayload, format: 'svg' | 'png') => {
        const { svg, width, height } = generateCardSvg(card);
        const fileBase = toSafeFileName(`slot-${card.index + 1}-${card.name}`, `slot-${card.index + 1}`);

        if (format === 'svg') {
            downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${fileBase}.svg`);
            return;
        }
        try {
            await svgStringToPng(svg, width, height, `${fileBase}.png`);
        } catch (err) {
            console.error(err);
            showCopyFeedback(t.fail);
        }
    };

    const handleDownloadCard = async (format: 'svg' | 'png', index: number) => {
        const card = buildCardExportData(batchColors[index], index, showAlternatives.has(index));
        if (!card) return;
        await downloadCardPayload(card, format);
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
                if (settings.showRefSolidC) output.push(matchSolidC && matchSolidC.deltaE < 10 ? normalizeRefCode(matchSolidC.reference.code) : `${t.outOfGamut.toUpperCase()} C`);
                if (settings.showRefSolidU) output.push(matchSolidU && matchSolidU.deltaE < 10 ? normalizeRefCode(matchSolidU.reference.code) : `${t.outOfGamut.toUpperCase()} U`);
                if (settings.showRefBridgeC) output.push(matchC && matchC.deltaE < 10 ? normalizeRefCode(matchC.reference.code) : `${t.outOfGamut.toUpperCase()} CP`);
                if (settings.showRefBridgeU) output.push(matchU && matchU.deltaE < 10 ? normalizeRefCode(matchU.reference.code) : `${t.outOfGamut.toUpperCase()} UP`);

                return output.join('\n');
            })
            .join('\n\n');

        void copyText(text).then((ok) => showCopyFeedback(ok ? t.copyAllSlotsData : t.copyFailed));
    };

    const copyValue = (value: string) => {
        void copyText(value).then((ok) => showCopyFeedback(ok ? `${t.copiedToClipboard} ${value}` : t.copyFailed));
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

    // Keep state in sync for components that read from state
    useEffect(() => {
        setMatches(computedMatches);
        setAnalysis(null);
    }, [computedMatches]);

    // Latest hex (for discarding stale analysis results) and the hex of the pending request.
    const currentHexRef = useRef(hex);
    currentHexRef.current = hex;
    const analysisRequestRef = useRef<string | null>(null);

    /** `referenceCode` is the code the Matcher is showing, so the notes match it. */
    const triggerAiAnalysis = async (referenceCode?: string) => {
        const code = referenceCode || (matches[0] ? matches[0].reference.code : '');
        if (!code) return;
        const requestHex = hex;
        analysisRequestRef.current = requestHex;
        setLoadingAi(true);
        try {
            const result = await analyzeColor(requestHex, code, language);
            if (analysisRequestRef.current === requestHex && currentHexRef.current === requestHex) {
                setAnalysis(result);
            }
        } catch (err) {
            console.error(err);
        } finally {
            if (analysisRequestRef.current === requestHex) {
                analysisRequestRef.current = null;
                setLoadingAi(false);
            }
        }
    };

    // The selected color changed: any in-flight analysis is stale.
    useEffect(() => {
        if (analysisRequestRef.current && analysisRequestRef.current !== hex) {
            analysisRequestRef.current = null;
            setLoadingAi(false);
        }
    }, [hex]);

    const matcherValueRows: MatcherValueRow[] = [
        { label: 'HEX', value: hex.toUpperCase() },
        { label: 'RGB', value: formatRgbDisplay(rgb.r, rgb.g, rgb.b) },
        { label: 'CMYK', value: `${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}` },
        { label: 'LAB', value: `${Math.round(lab.l)}, ${Math.round(lab.a)}, ${Math.round(lab.b)}` },
        { label: 'HSL', value: `${hsl.h}, ${hsl.s}%, ${hsl.l}%` },
        { label: 'HSB', value: `${hsv.h}, ${hsv.s}, ${hsv.v}` },
        { label: 'OKLCH', value: formatOklch(hex) }
    ];

    /**
     * The same value rows for any colour: the Matcher uses it to describe the
     * reference finish it is showing. The reference codes are not repeated
     * here — they are the finish chips on the match card.
     */
    const buildReferenceRows = (refHex: string): MatcherValueRow[] => {
        if (!isValidHex(refHex)) return [];
        const refRgb = hexToRgb(refHex);
        return [
            settings.showHex ? { label: 'HEX', value: refHex.toUpperCase() } : null,
            settings.showRgb ? { label: 'RGB', value: formatRgbDisplay(refRgb.r, refRgb.g, refRgb.b) } : null,
            settings.showCmyk ? (() => { const c = rgbToCmyk(refRgb); return { label: 'CMYK', value: `${c.c}, ${c.m}, ${c.y}, ${c.k}` }; })() : null,
            settings.showLab ? (() => { const l = hexToLab(refHex); return { label: 'LAB', value: `${Math.round(l.l)}, ${Math.round(l.a)}, ${Math.round(l.b)}` }; })() : null,
            settings.showHsl ? (() => { const h = rgbToHsl(refRgb); return { label: 'HSL', value: `${h.h}, ${h.s}%, ${h.l}%` }; })() : null,
            settings.showHsb ? (() => { const h = rgbToHsv(refRgb); return { label: 'HSB', value: `${h.h}, ${h.s}, ${h.v}` }; })() : null
        ].filter((row): row is MatcherValueRow => row !== null);
    };

    type TabId = typeof activeTab;
    const sectionTabs: { value: TabId; label: string }[] = [
        { value: 'matcher', label: t.matcher },
        { value: 'generated', label: t.generatedPalettes },
        { value: 'batch', label: t.multiSlotMatchAnalysis },
        { value: 'palette', label: t.contrastPalette },
        { value: 'magic', label: t.paletteMagic },
        { value: 'guide', label: t.printGuide }
    ];
    const sectionTitle = sectionTabs.find((tab) => tab.value === activeTab)?.label ?? t.matcher;

    const languageOptions: { code: Language; label: string }[] = [
        { code: 'pt', label: t.portuguese },
        { code: 'en', label: t.english },
        { code: 'es', label: t.spanish }
    ];

    const modelToggles: { key: keyof SettingsState; label: string }[] = [
        { key: 'showHex', label: t.hexadecimal },
        { key: 'showRgb', label: t.rgbStandard },
        { key: 'showHsl', label: t.hslWeb },
        { key: 'showHsb', label: t.hsbHsv },
        { key: 'showLab', label: t.cieLabHighPrec },
        { key: 'showCmyk', label: t.cmykProcess }
    ];
    const referenceToggles: { key: keyof SettingsState; label: string }[] = [
        { key: 'showRefSolidC', label: t.refSolidC },
        { key: 'showRefSolidU', label: t.refSolidU },
        { key: 'showRefBridgeC', label: t.refBridgeC },
        { key: 'showRefBridgeU', label: t.refBridgeU }
    ];

    const renderSwitchRows = (items: { key: keyof SettingsState; label: string }[]) => (
        <div className="flex flex-col">
            {items.map((opt, index) => {
                const on = Boolean(settings[opt.key]);
                return (
                    <button
                        type="button"
                        key={opt.key}
                        role="switch"
                        aria-checked={on}
                        onClick={() => setSettings((s) => ({ ...s, [opt.key]: !s[opt.key] }))}
                        className={`flex items-center justify-between gap-4 min-h-11 text-left ${index < items.length - 1 ? 'hairline-b' : ''}`}
                    >
                        <span className="text-[14px] text-foreground">{opt.label}</span>
                        <span className={`w-10 h-[22px] p-0.5 rounded-pill flex items-center shrink-0 transition-colors duration-fast ease-out ${on ? 'bg-primary justify-end' : 'bg-fill-3 justify-start'}`} aria-hidden="true">
                            <span className={`w-[18px] h-[18px] rounded-pill ${on ? 'bg-primary-foreground' : 'bg-card'}`} />
                        </span>
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="font-sans w-full h-full overflow-y-auto">
            {showSettings && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-foreground/30" onClick={() => setShowSettings(false)}></div>
                    <div role="dialog" aria-modal="true" aria-label={t.settings} className="relative w-full max-w-[440px] material-sheet rounded-r-none px-6 py-8 md:p-10 h-full animate-in slide-in-from-right duration-base ease-out overflow-y-auto">
                        <div className="flex justify-between items-center gap-4 mb-10">
                            <h2 className="text-[28px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground">{t.settings}</h2>
                            <IconButton label={t.close} variant="surface" onClick={() => setShowSettings(false)}>
                                <X aria-hidden="true" />
                            </IconButton>
                        </div>

                        <div className="flex flex-col gap-10">
                            <section className="flex flex-col gap-4">
                                <h3 className="label">{t.language}</h3>
                                <div role="radiogroup" aria-label={t.language} className="flex flex-wrap gap-x-6 gap-y-3">
                                    {languageOptions.map((lang) => (
                                        <LegendToggle
                                            key={lang.code}
                                            role="radio"
                                            label={lang.label}
                                            on={language === lang.code}
                                            onClick={() => setLanguage(lang.code)}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className="flex flex-col gap-2">
                                <h3 className="label">{t.visibleColorModels}</h3>
                                {renderSwitchRows(modelToggles)}
                            </section>

                            <section className="flex flex-col gap-2">
                                <h3 className="label">{t.referenceLibraries}</h3>
                                {renderSwitchRows(referenceToggles)}
                            </section>

                            <section className="flex flex-col gap-4">
                                <h3 className="label">{t.mixedFormatSyntax}</h3>
                                <div role="radiogroup" aria-label={t.mixedFormatSyntax} className="flex flex-col gap-3">
                                    {['R=80, G=184, B=72', 'RGB 80, 184, 72', 'rgb(80, 184, 72)'].map((fmt) => (
                                        <LegendToggle
                                            key={fmt}
                                            role="radio"
                                            label={<span className="tabular">{fmt}</span>}
                                            on={settings.mixFormat === fmt}
                                            onClick={() => setSettings((s) => ({ ...s, mixFormat: fmt }))}
                                        />
                                    ))}
                                </div>
                            </section>
                        </div>

                        <p className="mt-12 text-[12px] text-muted-foreground">{t.changesAppliedRealtime}</p>
                    </div>
                </div>
            )}

            {copyFeedback && (
                <div role="status" className="fixed top-4 right-4 material-popover materialize px-4 py-2.5 text-[13px] text-foreground z-[250]">
                    {copyFeedback}
                </div>
            )}

            {/* Title row: the section name is the page title, the text tabs switch it. */}
            <div className="max-w-[1240px] mx-auto px-5 md:px-10 pt-6 md:pt-8 w-full">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 min-w-0">
                        <h1 className="text-[30px] md:text-[40px] font-normal leading-[1.1] tracking-[-0.015em] text-foreground">
                            {sectionTitle}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <PaletteGenerator
                            onColorSelect={handleHexChange}
                            onPaletteDetected={(colors) => {
                                if (!colors || colors.length === 0) return;
                                setBatchColors(colors);
                                handleHexChange(colors[0]);
                            }}
                        />

                        {/* Language stays reachable from the title row, not buried in Settings. */}
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as Language)}
                            className="field w-auto shrink-0 h-10 pl-3.5 pr-8 text-[14px]"
                            title={t.language}
                            aria-label={t.language}
                        >
                            {languageOptions.map((lang) => (
                                <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                        </select>

                        <IconButton label={t.settings} variant="surface" onClick={() => setShowSettings(true)}>
                            <Settings2 aria-hidden="true" />
                        </IconButton>
                    </div>
                </div>

                <TextTabs<TabId>
                    className="mt-6 md:mt-8"
                    ariaLabel={t.sections}
                    items={sectionTabs}
                    value={activeTab}
                    onChange={setActiveTab}
                />
            </div>

            <main className="max-w-[1240px] mx-auto px-5 md:px-10 pb-24 pt-8 md:pt-10 w-full flex-grow">
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
                        cardTemplate={cardTemplate}
                        onCardTemplateChange={setCardTemplate}
                        showAlternatives={showAlternatives}
                        onShowAlternativesChange={setShowAlternatives}
                        onDownloadAll={handleDownloadCards}
                        renderCardSvg={(color, idx, includeAlternatives) => {
                            const p = buildCardExportData(color, idx, includeAlternatives);
                            return p ? generateCardSvg(p).svg : '';
                        }}
                    />
                ) : (
                    <MatcherView
                        t={t}
                        hex={hex}
                        rgb={rgb}
                        cmyk={cmyk}
                        hsl={hsl}
                        valueRows={matcherValueRows}
                        buildReferenceRows={buildReferenceRows}
                        showRefMatch={showRefMatch}
                        analysis={analysis}
                        loadingAi={loadingAi}
                        onSearchReference={(referenceCode) => { setShowRefMatch(true); void triggerAiAnalysis(referenceCode); }}
                        onHexChange={handleHexChange}
                        onRgbChange={handleRgbChange}
                        onCmykChange={handleCmykChange}
                        onHslChange={handleHslChange}
                        onRandomize={() => handleHexChange(rgbToHex(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)))}
                        onCopy={copyValue}
                        onFeedback={showCopyFeedback}
                    />
                )}
            </main>

            <footer className="pb-10 text-center mt-auto">
                <a
                    href="https://www.instagram.com/unbserved/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-fast ease-out"
                >
                    {t.poweredBy}
                </a>
            </footer>
        </div>
    );
};

export default App;


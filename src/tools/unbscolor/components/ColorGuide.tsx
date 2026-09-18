import { Check, Shuffle } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { hexToRgb, rgbToHex, rgbToCmyk, isValidHex, normalizeHex, getContrastColor, rgbToHsl, hslToRgb, mixColors, adjustSaturation, cmykToRgb } from '../utils/colorMath';
import { contrastRatio as wcagContrastRatio, wcagLevelFor } from '../utils/contrast';
import { useLanguage } from '../i18n';
import { Card, IconButton, LegendDot, Metric, SectionHeading } from './ui';

interface ColorGuideProps {
    selectedHex: string;
    batchColors?: string[];
}

/** Pass is a filled ink dot, fail a hollow ring: the legend language, no chips. */
const Grade: React.FC<{ label: string; pass: boolean; passText: string; failText: string }> = ({ label, pass, passText, failText }) => {
    const text = `${label}: ${pass ? passText : failText}`;
    return (
        <span title={text} aria-label={text}>
            <LegendDot label={label} hollow={!pass} className={pass ? '' : 'text-muted-foreground'} />
        </span>
    );
};

/** One visual print test: what it checks, the specimen, and what to look for. */
const TestCard: React.FC<{ label: string; lead?: string; note: React.ReactNode; children: React.ReactNode }> = ({ label, lead, note, children }) => (
    <Card as="article" label={label}>
        {lead && <p className="text-[14px] text-foreground">{lead}</p>}
        <div className="flex-1 flex flex-col min-h-[200px]">{children}</div>
        <div className="text-[12px] text-muted-foreground">{note}</div>
    </Card>
);

/** A background choice: swatch, what it is, its hex and the ratio it reaches. */
const BackgroundRow: React.FC<{ hex: string; name: string; ratio: string; selected: boolean; onSelect: () => void }> = ({ hex, name, ratio, selected, onSelect }) => (
    <button
        type="button"
        aria-pressed={selected}
        className={`row gap-3 py-2 min-h-12 -mx-2.5 w-[calc(100%+1.25rem)] ${selected ? 'is-active' : ''}`}
        onClick={onSelect}
    >
        <span className="w-8 h-8 shrink-0 rounded-sm shadow-hairline" style={{ backgroundColor: hex }} aria-hidden="true" />
        <span className="flex flex-col min-w-0 text-left">
            <span className={`text-[12px] truncate ${selected ? 'opacity-70' : 'text-muted-foreground'}`}>{name}</span>
            <span className="text-[14px] tabular">{hex}</span>
        </span>
        <span className="ml-auto text-[14px] tabular">{ratio}</span>
    </button>
);

export const ColorGuide: React.FC<ColorGuideProps> = ({ selectedHex, batchColors = [] }) => {
    const { t } = useLanguage();
    const safeHex = isValidHex(selectedHex) ? selectedHex : '#F0FF00';
    
    const [manualCmyk, setManualCmyk] = useState({ c: 0, m: 76, y: 73, k: 3 });
    const [bgHex, setBgHex] = useState('#000000');
    const [localHex, setLocalHex] = useState(safeHex);
    const [hueVariation, setHueVariation] = useState(0); // Para variar as sugestões
    
    // Sincroniza com prop externa
    useEffect(() => {
        const normalized = normalizeHex(selectedHex);
        if (normalized) {
            setLocalHex(normalized);
        }
    }, [selectedHex]);

    // localHex is a draft (may be partial or "#"-less); all math uses the normalized currentHex.
    const currentHex = normalizeHex(localHex) ?? safeHex;
    const currentRgb = hexToRgb(currentHex);

    // Keep the manual CMYK mixer in sync with the active color.
    useEffect(() => {
        setManualCmyk(rgbToCmyk(hexToRgb(currentHex)));
    }, [currentHex]);

    const totalInk = manualCmyk.c + manualCmyk.m + manualCmyk.y + manualCmyk.k;

    const handleCmykSliderChange = (channel: keyof typeof manualCmyk, val: number) => {
        setManualCmyk(prev => ({ ...prev, [channel]: val }));
    };

    const getSubstrateSim = (hex: string, type: 'coated' | 'uncoated' | 'gain10' | 'gain20' | 'recycled' | 'lowDensity') => {
        const rgb = hexToRgb(hex);
        switch (type) {
            case 'coated': return hex; 
            case 'uncoated':
                const uncRgb = adjustSaturation(rgb, -15);
                const warmRgb = mixColors(uncRgb, {r: 253, g: 250, b: 235}, 10);
                return rgbToHex(warmRgb.r, warmRgb.g, warmRgb.b);
            case 'gain10':
                const g10 = mixColors(rgb, {r: 0, g: 0, b: 0}, 10);
                return rgbToHex(g10.r, g10.g, g10.b);
            case 'gain20':
                const g20 = mixColors(rgb, {r: 0, g: 0, b: 0}, 20);
                return rgbToHex(g20.r, g20.g, g20.b);
            case 'recycled':
                const recRgb = mixColors(rgb, {r: 160, g: 160, b: 155}, 20);
                return rgbToHex(recRgb.r, recRgb.g, recRgb.b);
            case 'lowDensity':
                const lowRgb = mixColors(rgb, {r: 255, g: 255, b: 255}, 15);
                return rgbToHex(lowRgb.r, lowRgb.g, lowRgb.b);
            default: return hex;
        }
    };

    // WCAG ratio from utils/contrast (invalid input falls back to 1:1).
    const getContrastRatio = (f: string, b: string) => {
        const ratio = wcagContrastRatio(f, b);
        return Number.isNaN(ratio) ? 1 : ratio;
    };

    const contrastRatio = getContrastRatio(currentHex, bgHex);
    const isPassAA = wcagLevelFor(contrastRatio, 'normal') !== 'Fail';
    const isPassAAA = wcagLevelFor(contrastRatio, 'normal') === 'AAA';

    const findHarmonicBackground = (foregroundHex: string, hueShift: number, targetRatio: number, dark: boolean, saturationBoost: number = 0) => {
        const fgRgb = hexToRgb(foregroundHex);
        const fgHsl = rgbToHsl(fgRgb);
        let bestColor = dark ? '#000000' : '#FFFFFF';
        const baseSat = fgHsl.s > 25 ? Math.min(40, 12 + saturationBoost) : Math.min(25, 5 + saturationBoost);
        for (let l = 0; l <= 100; l += 0.5) {
            const candidateRgb = hslToRgb({ h: (fgHsl.h + hueShift + 360) % 360, s: baseSat, l: l });
            const candidateHex = rgbToHex(candidateRgb.r, candidateRgb.g, candidateRgb.b);
            const ratio = getContrastRatio(foregroundHex, candidateHex);
            if (ratio >= targetRatio) {
                if (dark && l < 35) { bestColor = candidateHex; break; }
                if (!dark && l > 75) { bestColor = candidateHex; break; }
                bestColor = candidateHex;
            }
        }
        return { hex: bestColor, ratio: getContrastRatio(foregroundHex, bestColor).toFixed(1) + ':1' };
    };

    // Gera sugestões variadas baseadas no hueVariation
    const automatedCorrections = useMemo(() => {
        const variations = [
            { type: t.harmonyComplementary, shift: 180 + hueVariation, dark: true, sat: 15 },
            { type: t.harmonyAnalogWarm, shift: 30 + hueVariation, dark: false, sat: 20 },
            { type: t.harmonyAnalogCool, shift: -30 + hueVariation, dark: false, sat: 20 },
            { type: t.harmonyTriadic, shift: 120 + hueVariation, dark: true, sat: 25 },
            { type: t.harmonySplitComplementary, shift: 150 + hueVariation, dark: false, sat: 18 },
            { type: t.harmonyTetradic, shift: 90 + hueVariation, dark: true, sat: 22 },
        ];
        
        return variations.map(v => ({
            type: v.type,
            ...findHarmonicBackground(currentHex, v.shift, 4.5, v.dark, v.sat)
        }));
    }, [currentHex, hueVariation, t]);

    const shuffleSuggestions = () => {
        setHueVariation(prev => (prev + 45 + Math.floor(Math.random() * 30)) % 360);
    };

    const industrialNeutrals = [
        '#FFFFFF', '#F5F5F5', '#E5E5E5', '#D4D4D4', 
        '#737373', '#404040', '#262626', '#000000'
    ];

    // Selected swatch: the system's selected state (black fill, white glyph) as a corner mark,
    // because the swatch itself is data and keeps its colour.
    const selectedMark = (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-pill bg-primary text-primary-foreground flex items-center justify-center" aria-hidden="true">
            <Check className="w-3 h-3" strokeWidth={3} />
        </span>
    );

    const currentCmyk = rgbToCmyk(currentRgb);
    const inkIsHigh = totalInk > 300;

    return (
        <div className="flex flex-col gap-16">
            {/* The colour, and how it separates. */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <Card className="lg:col-span-5" label={t.spotColor2}>
                    {/* The colour itself is data. */}
                    <span
                        className="block h-40 lg:h-auto lg:flex-1 lg:min-h-40 w-full rounded-md shadow-hairline transition-colors duration-base ease-out"
                        style={{ backgroundColor: currentHex }}
                        aria-hidden="true"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                        <input
                            id="unbscolor-guide-hex"
                            type="text"
                            value={localHex}
                            onChange={(e) => setLocalHex(e.target.value)}
                            onBlur={() => setLocalHex(currentHex)}
                            className="w-full uppercase bg-transparent outline-none rounded-sm focus-visible:shadow-focus text-[34px] md:text-[44px] leading-[1.08] tracking-[-0.02em] font-normal tabular text-foreground"
                            maxLength={7}
                            placeholder="#000000"
                            spellCheck={false}
                            autoComplete="off"
                            aria-label={t.spotColor2}
                        />
                        <span className="text-[13px] text-muted-foreground">{t.clickToEdit}</span>
                    </div>
                    {batchColors.length > 0 && (
                        <div className="flex flex-col gap-3 pt-5 hairline-t">
                            <span className="text-[13px] text-muted-foreground">{t.paletteColorsLabel}</span>
                            <div className="flex flex-wrap gap-2">
                                {batchColors.map((color, idx) => {
                                    const isActive = color.toUpperCase() === currentHex.toUpperCase();
                                    return (
                                        <button
                                            type="button"
                                            key={idx}
                                            onClick={() => setLocalHex(color)}
                                            aria-label={color}
                                            aria-pressed={isActive}
                                            className="relative w-10 h-10 rounded-md shadow-hairline hover:shadow-hairline-strong press transition-shadow duration-fast ease-out"
                                            style={{ backgroundColor: color }}
                                            title={`${color}${isActive ? ` (${t.active})` : ''}`}
                                        >
                                            {isActive && selectedMark}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="lg:col-span-7" label={t.cmykSeparationLogic}>
                    {/* Process-ink diagram: fixed CMY(K) colours, data, not theme. */}
                    <div className="flex justify-center items-center h-48 relative flex-1 overflow-hidden" aria-hidden="true">
                        <div className="w-32 h-32 rounded-full bg-[#00FFFF] mix-blend-multiply absolute -translate-x-12 opacity-60"></div>
                        <div className="w-32 h-32 rounded-full bg-[#FF00FF] mix-blend-multiply absolute translate-x-0 opacity-60"></div>
                        <div className="w-32 h-32 rounded-full bg-[#FFFF00] mix-blend-multiply absolute translate-x-12 opacity-60"></div>
                        <div className="w-32 h-32 rounded-full bg-[#000000] mix-blend-multiply absolute translate-x-24 opacity-20"></div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 pt-5 hairline-t" aria-label={t.colorChannelsLabel}>
                        {(['C', 'M', 'Y', 'K'] as const).map((ch) => (
                            <Metric
                                key={ch}
                                size="md"
                                value={`${currentCmyk[ch.toLowerCase() as keyof typeof currentCmyk]}%`}
                                caption={ch}
                            />
                        ))}
                    </div>
                </Card>
            </div>

            {/* Substrates */}
            <section className="flex flex-col gap-5">
                <SectionHeading title={t.simulatedPaperDotGain} />
                <Card label={t.substrates}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-5 gap-y-6">
                        {[
                            { name: t.original, sub: t.digitalD65, type: 'original' as const },
                            { name: t.coated, sub: t.coatedPaper, type: 'coated' as const },
                            { name: t.uncoated, sub: t.uncoatedPaper, type: 'uncoated' as const },
                            { name: t.dotGain10, sub: t.mediumGain, type: 'gain10' as const },
                            { name: t.dotGain20, sub: t.heavyGain, type: 'gain20' as const },
                            { name: t.lowDensity, sub: t.reducedDensity, type: 'lowDensity' as const },
                            { name: t.recycledPaper, sub: t.grayBase, type: 'recycled' as const },
                        ].map((p) => {
                            const simHex = p.type === 'original' ? currentHex : getSubstrateSim(currentHex, p.type);
                            return (
                                <div key={p.type} className="flex flex-col gap-3 min-w-0">
                                    <div className="aspect-[4/3] rounded-md shadow-hairline transition-colors duration-base ease-out" style={{ backgroundColor: simHex }}></div>
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <p className="text-[14px] text-foreground truncate" title={p.name}>{p.name}</p>
                                        <p className="text-[12px] text-muted-foreground truncate" title={p.sub}>{p.sub}</p>
                                        <p className="text-[12px] tabular text-muted-foreground">{simHex}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </section>

            {/* Legibility */}
            <section className="flex flex-col gap-5">
                <SectionHeading title={t.contrastAnalysis} />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* The pair under test, and how it reads. */}
                    <Card className="lg:col-span-4" label={t.preview}>
                        <div className="flex flex-col">
                            {[
                                { hex: currentHex, caption: t.foreground },
                                { hex: bgHex, caption: t.background },
                            ].map((item, i) => (
                                <div key={item.caption} className={`flex items-center gap-4 py-3 ${i === 0 ? 'pt-0 hairline-b' : 'pb-0'}`}>
                                    <span className="w-10 h-10 shrink-0 rounded-md shadow-hairline" style={{ backgroundColor: item.hex }} aria-hidden="true" />
                                    <Metric size="sm" value={item.hex} caption={item.caption} />
                                </div>
                            ))}
                        </div>
                        {/* Contrast preview: data, both ways round. */}
                        <div className="rounded-md overflow-hidden shadow-hairline">
                            <div className="p-5 flex flex-col gap-2" style={{ backgroundColor: bgHex }}>
                                <span className="text-[28px] leading-[1.14]" style={{ color: currentHex }}>Aa Bb Cc</span>
                                <span className="text-[14px]" style={{ color: currentHex }}>{t.legibleText}</span>
                                <span className="text-[12px]" style={{ color: currentHex }}>Lorem ipsum dolor sit amet</span>
                            </div>
                            <div className="p-5 flex flex-col gap-2" style={{ backgroundColor: currentHex }}>
                                <span className="text-[28px] leading-[1.14]" style={{ color: bgHex }}>Aa Bb Cc</span>
                                <span className="text-[14px]" style={{ color: bgHex }}>{t.legibleText}</span>
                                <span className="text-[12px]" style={{ color: bgHex }}>Lorem ipsum dolor sit amet</span>
                            </div>
                        </div>
                    </Card>

                    {/* The ratio, and the neutral backgrounds to test it against. */}
                    <Card className="lg:col-span-4" label={t.contrastRatio}>
                        <div className="flex flex-col gap-4">
                            <Metric size="lg" value={`${contrastRatio.toFixed(2)}:1`} caption={`${t.foreground} / ${t.background}`} />
                            <div className="flex gap-4">
                                <Grade label="AA" pass={isPassAA} passText={t.pass} failText={t.fail} />
                                <Grade label="AAA" pass={isPassAAA} passText={t.pass} failText={t.fail} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 pt-5 hairline-t">
                            <span className="text-[13px] text-muted-foreground">{t.neutralMatchMatrix}</span>
                            <div className="grid grid-cols-4 gap-3">
                                {industrialNeutrals.map(n => {
                                    const ratio = getContrastRatio(currentHex, n);
                                    const isSelected = n.toUpperCase() === bgHex.toUpperCase();
                                    return (
                                        <button type="button" key={n} onClick={() => setBgHex(n)} aria-label={`${n} ${ratio.toFixed(1)}:1`} aria-pressed={isSelected} className="flex flex-col items-center gap-1.5 press">
                                            <span className="relative w-full aspect-square rounded-md shadow-hairline hover:shadow-hairline-strong transition-shadow duration-fast ease-out" style={{ backgroundColor: n }}>
                                                {isSelected && selectedMark}
                                            </span>
                                            <span className={`text-[12px] tabular ${ratio >= 4.5 ? 'text-foreground' : 'text-muted-foreground'}`}>{ratio.toFixed(1)}:1</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>

                    {/* Backgrounds that pass, derived from the colour. */}
                    <Card
                        className="lg:col-span-4"
                        label={t.accessibleVariations}
                        actions={
                            <IconButton label={t.varyTones} onClick={shuffleSuggestions}>
                                <Shuffle aria-hidden="true" />
                            </IconButton>
                        }
                    >
                        {batchColors.length > 1 && (
                            <div className="flex flex-col gap-2">
                                <span className="text-[13px] text-muted-foreground">{t.paletteColorsLabel}</span>
                                <div className="flex flex-wrap gap-1">
                                    {batchColors.filter(c => c.toUpperCase() !== currentHex.toUpperCase()).map((color, idx) => {
                                        const ratio = getContrastRatio(currentHex, color);
                                        const isSelected = color.toUpperCase() === bgHex.toUpperCase();
                                        return (
                                            <button
                                                type="button"
                                                key={idx}
                                                onClick={() => setBgHex(color)}
                                                aria-pressed={isSelected}
                                                aria-label={`${color} ${ratio.toFixed(1)}:1`}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-md press transition-colors duration-fast ease-out ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-fill'}`}
                                                title={color}
                                            >
                                                <span className="w-8 h-8 rounded-sm shadow-hairline" style={{ backgroundColor: color }} aria-hidden="true" />
                                                <span className={`text-[12px] tabular ${isSelected ? '' : ratio >= 4.5 ? 'text-foreground' : 'text-muted-foreground'}`}>{ratio.toFixed(1)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col">
                            {automatedCorrections.map((c, i) => (
                                <BackgroundRow
                                    key={i}
                                    hex={c.hex}
                                    name={c.type}
                                    ratio={c.ratio}
                                    selected={c.hex.toUpperCase() === bgHex.toUpperCase()}
                                    onSelect={() => setBgHex(c.hex)}
                                />
                            ))}
                        </div>

                        <div className="flex flex-col pt-3 hairline-t">
                            {[
                                { name: t.darkUi, hue: 10, dark: true },
                                { name: t.surface, hue: -15, dark: false },
                            ].map((template, idx) => {
                                const res = findHarmonicBackground(currentHex, template.hue, 4.5, template.dark);
                                return (
                                    <BackgroundRow
                                        key={idx}
                                        hex={res.hex}
                                        name={template.name}
                                        ratio={res.ratio}
                                        selected={res.hex.toUpperCase() === bgHex.toUpperCase()}
                                        onSelect={() => setBgHex(res.hex)}
                                    />
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </section>

            {/* Tests between the palette's colours */}
            {batchColors.length >= 2 && (
                <section className="flex flex-col gap-5">
                    <SectionHeading title={t.testsBetweenColors} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {batchColors.flatMap((color1, i) =>
                            batchColors.slice(i + 1).map((color2, j) => {
                                const ratio = getContrastRatio(color1, color2);
                                const passAA = ratio >= 4.5;
                                const passAAA = ratio >= 7.0;
                                return (
                                    <Card as="article" key={`${i}-${j}`}>
                                        <div className="flex rounded-md overflow-hidden shadow-hairline">
                                            <div className="flex-1 min-w-0 p-6" style={{ backgroundColor: color1 }}>
                                                <span className="text-[20px]" style={{ color: color2 }}>Aa Bb</span>
                                                <p className="text-[12px] mt-1" style={{ color: color2 }}>{t.textOnBackground}</p>
                                            </div>
                                            <div className="flex-1 min-w-0 p-6" style={{ backgroundColor: color2 }}>
                                                <span className="text-[20px]" style={{ color: color1 }}>Aa Bb</span>
                                                <p className="text-[12px] mt-1" style={{ color: color1 }}>{t.textOnBackground}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-end justify-between gap-3">
                                            <Metric size="md" value={`${ratio.toFixed(2)}:1`} caption={`${color1} × ${color2}`} />
                                            <div className="flex gap-4 pb-0.5">
                                                <Grade label="AA" pass={passAA} passText={t.pass} failText={t.fail} />
                                                <Grade label="AAA" pass={passAAA} passText={t.pass} failText={t.fail} />
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </section>
            )}

            {/* Production check */}
            <section className="flex flex-col gap-5">
                <SectionHeading title={t.productionCheck} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <Card label={t.trappingRegistration} bodyClassName="items-center justify-center min-h-[260px]">
                        <div className="relative w-48 h-48">
                            <div className="absolute inset-0 rounded-full border-4 border-[#00FFFF] mix-blend-multiply opacity-50 translate-x-0.5"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-[#FF00FF] mix-blend-multiply opacity-50 -translate-x-0.5 translate-y-0.5"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-[#FFFF00] mix-blend-multiply opacity-50 translate-y-0.5"></div>
                            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: currentHex }}>
                                <span className="text-[12px]" style={{ color: getContrastColor(currentHex) }}>{t.trapTest}</span>
                            </div>
                        </div>
                    </Card>
                    <Card label={t.lpiHalftone} bodyClassName="justify-center min-h-[260px]">
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="flex flex-col gap-2">
                                <div className="aspect-square rounded-md bg-fill shadow-hairline overflow-hidden" style={{ backgroundImage: `radial-gradient(circle, ${currentHex} 2px, transparent 2px)`, backgroundSize: '12px 12px' }}></div>
                                <span className="text-[14px] tabular text-foreground">85 LPI</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="aspect-square rounded-md bg-fill shadow-hairline overflow-hidden" style={{ backgroundImage: `radial-gradient(circle, ${currentHex} 1px, transparent 1px)`, backgroundSize: '4px 4px' }}></div>
                                <span className="text-[14px] tabular text-foreground">175 LPI</span>
                            </div>
                        </div>
                    </Card>
                    <Card label={t.colorSpaceGamut} bodyClassName="items-center justify-center min-h-[260px]">
                        <div className="relative aspect-square w-full max-w-[220px] rounded-full border-2 border-dashed border-separator-strong flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full shadow-hairline" style={{ backgroundColor: currentHex }}></div>
                        </div>
                    </Card>
                </div>
            </section>

            {/* Visual print tests */}
            <section className="flex flex-col gap-5">
                <SectionHeading title={t.visualPrintTests} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {/* Bleed: the lines are drawn in ink, the legend names them. */}
                    <TestCard label={t.bleedTest} lead={t.bleedArea} note={
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                <LegendDot label={t.bleed3mm} hollow className="text-[12px] text-muted-foreground" />
                                <LegendDot label={t.cutLine} className="text-[12px] text-muted-foreground" />
                            </div>
                        }
                    >
                        <div className="flex flex-col items-center py-3">
                            <div className="relative">
                                <div className="w-40 h-52 border border-dashed border-muted-foreground absolute -inset-3 rounded-sm"></div>
                                <div className="w-36 h-48 border border-foreground absolute -inset-1 rounded-sm"></div>
                                <div className="w-32 h-44 rounded-sm shadow-hairline flex items-center justify-center" style={{ backgroundColor: currentHex }}>
                                    <span className="text-[12px]" style={{ color: getContrastColor(currentHex) }}>{t.safeArea}</span>
                                </div>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.overprintTest} lead={t.colorOverlay} note={t.overprintSimulationNote}>
                        <div className="flex items-center justify-center">
                            <div className="relative w-40 h-40">
                                <div className="absolute w-24 h-24 rounded-full top-0 left-0" style={{ backgroundColor: currentHex, opacity: 0.8 }}></div>
                                <div className="absolute w-24 h-24 rounded-full top-4 left-12 mix-blend-multiply" style={{ backgroundColor: '#000000', opacity: 0.9 }}></div>
                                <div className="absolute w-24 h-24 rounded-full top-12 left-4 mix-blend-multiply" style={{ backgroundColor: getSubstrateSim(currentHex, 'uncoated'), opacity: 0.7 }}></div>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.gradientTest} lead={t.bandingCheck} note={t.observeBanding}>
                        <div className="flex flex-col gap-4">
                            <div className="h-12 rounded-md shadow-hairline" style={{ background: `linear-gradient(90deg, ${currentHex}, #FFFFFF)` }}></div>
                            <div className="h-12 rounded-md shadow-hairline" style={{ background: `linear-gradient(90deg, #000000, ${currentHex})` }}></div>
                            <div className="h-12 rounded-md shadow-hairline" style={{ background: `linear-gradient(90deg, ${currentHex}, transparent)` }}></div>
                        </div>
                    </TestCard>

                    <TestCard label={t.minimumText} lead={t.textLegibility} note={t.highResRequired}>
                        <div className="flex flex-col gap-3">
                            {[
                                { text: t.bodyText, size: '14px' },
                                { text: t.footnotes, size: '10px' },
                                { text: t.minimumReadLimit, size: '7px' },
                                { text: t.microPrint, size: '5px' },
                            ].map((row) => (
                                <div key={row.size} className="p-3 rounded-md" style={{ backgroundColor: currentHex }}>
                                    <p style={{ color: getContrastColor(currentHex), fontSize: row.size }}>{row.text}</p>
                                </div>
                            ))}
                        </div>
                    </TestCard>

                    <TestCard label={t.adjacencyTest} lead={t.neighboringColors} note={t.colorBehavior}>
                        <div className="flex flex-col gap-4">
                            <div className="flex h-32 rounded-md overflow-hidden shadow-hairline">
                                <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }}></div>
                                <div className="flex-1" style={{ backgroundColor: currentHex }}></div>
                                <div className="flex-1" style={{ backgroundColor: '#000000' }}></div>
                            </div>
                            <div className="flex h-16 rounded-md overflow-hidden shadow-hairline">
                                <div className="flex-1" style={{ backgroundColor: getSubstrateSim(currentHex, 'gain20') }}></div>
                                <div className="flex-1" style={{ backgroundColor: currentHex }}></div>
                                <div className="flex-1" style={{ backgroundColor: getSubstrateSim(currentHex, 'lowDensity') }}></div>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.reversalTest} lead={t.positiveNegative} note={t.knockoutApplication}>
                        <div className="flex gap-4">
                            <div className="flex-1 rounded-md p-6 flex flex-col items-center justify-center shadow-hairline" style={{ backgroundColor: '#FFFFFF' }}>
                                <div className="w-16 h-16 rounded-full mb-3" style={{ backgroundColor: currentHex }}></div>
                                <span className="text-[12px]" style={{ color: currentHex }}>{t.positive}</span>
                            </div>
                            <div className="flex-1 rounded-md p-6 flex flex-col items-center justify-center" style={{ backgroundColor: currentHex }}>
                                <div className="w-16 h-16 rounded-full mb-3" style={{ backgroundColor: '#FFFFFF' }}></div>
                                <span className="text-[12px] text-white">{t.negative}</span>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.screenAngles} lead={t.cmykPlateAngles} note={t.standardAngles}>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: 'C 15°', angle: 15, color: '#00FFFF' },
                                    { label: 'M 75°', angle: 75, color: '#FF00FF' },
                                    { label: 'Y 0°', angle: 0, color: '#FFFF00' },
                                    { label: 'K 45°', angle: 45, color: '#000000' },
                                ].map((ch, i) => (
                                    <div key={i} className="flex flex-col gap-2 min-w-0">
                                        <div
                                            className="aspect-square rounded-md overflow-hidden shadow-hairline"
                                            style={{
                                                backgroundImage: `repeating-linear-gradient(${ch.angle}deg, ${ch.color} 0px, ${ch.color} 1px, transparent 1px, transparent 4px)`,
                                                backgroundColor: '#f5f5f5'
                                            }}
                                        ></div>
                                        <span className="text-[12px] tabular text-foreground text-center whitespace-nowrap">{ch.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-28 rounded-md overflow-hidden relative shadow-hairline">
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(15deg, #00FFFF33 0px, #00FFFF33 1px, transparent 1px, transparent 3px)` }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(75deg, #FF00FF33 0px, #FF00FF33 1px, transparent 1px, transparent 3px)` }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg, #FFFF0033 0px, #FFFF0033 1px, transparent 1px, transparent 3px)` }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(45deg, #00000033 0px, #00000033 1px, transparent 1px, transparent 3px)` }}></div>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.metamerismTest} lead={t.lightingSimulation} note={t.colorsChangeLight}>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: t.lightingD65, filter: 'none', bg: '#FFFFFF' },
                                { label: t.lightingTungsten, filter: 'sepia(20%) saturate(110%)', bg: '#FFF8E7' },
                                { label: t.lightingFluorescent, filter: 'hue-rotate(-5deg) saturate(90%)', bg: '#F0FFF0' },
                            ].map((light, i) => (
                                <div key={i} className="flex flex-col gap-2 min-w-0 text-center">
                                    <div
                                        className="aspect-square rounded-md flex items-center justify-center shadow-hairline"
                                        style={{ backgroundColor: light.bg }}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-full shadow-hairline"
                                            style={{ backgroundColor: currentHex, filter: light.filter }}
                                        ></div>
                                    </div>
                                    <span className="text-[12px] text-muted-foreground">{light.label}</span>
                                </div>
                            ))}
                        </div>
                    </TestCard>

                    <TestCard label={t.blackTest} lead={t.richBlackVsPure} note={t.richBlackDense}>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4 h-28">
                                <div className="flex-1 min-w-0 rounded-md flex items-center justify-center p-2" style={{ backgroundColor: '#000000' }}>
                                    <div className="flex flex-col gap-1 text-center">
                                        <span className="text-[14px] tabular text-white">100K</span>
                                        <span className="text-[12px] text-white/60">{t.pureBlack}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 rounded-md flex items-center justify-center p-2" style={{ backgroundColor: '#0F0F0F' }}>
                                    <div className="flex flex-col gap-1 text-center">
                                        <span className="text-[14px] tabular text-white">60C 40M 40Y 100K</span>
                                        <span className="text-[12px] text-white/60">{t.richBlack}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-md" style={{ backgroundColor: currentHex }}>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-8 rounded-sm" style={{ backgroundColor: '#000000' }}></div>
                                    <div className="flex-1 h-8 rounded-sm" style={{ backgroundColor: '#0F0F0F' }}></div>
                                </div>
                                <span className="text-[12px] mt-2 block text-center" style={{ color: getContrastColor(currentHex) }}>{t.comparisonOnColor}</span>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.tintRamp} lead={t.densityScale} note={t.tintUniformity}>
                        <div className="flex rounded-md overflow-hidden shadow-hairline">
                            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct, i) => {
                                const rgb = hexToRgb(currentHex);
                                const tinted = mixColors({ r: 255, g: 255, b: 255 }, rgb, pct);
                                const tintHex = rgbToHex(tinted.r, tinted.g, tinted.b);
                                return (
                                    <div key={i} className="flex-1 min-w-0 h-24 flex items-end justify-center pb-2" style={{ backgroundColor: tintHex }}>
                                        <span className="text-[10px] sm:text-[11px] tabular" style={{ color: pct > 50 ? '#fff' : '#000' }}>{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </TestCard>

                    <TestCard label={t.hairlineTest} lead={t.fineLines} note={t.linesPrintFail}>
                        <div className="flex flex-col gap-4">
                            {[
                                { label: '0.25pt', height: '0.5px' },
                                { label: '0.5pt', height: '1px' },
                                { label: '1pt', height: '1.5px' },
                                { label: '2pt', height: '3px' },
                            ].map((line, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="text-[12px] tabular w-12 text-muted-foreground">{line.label}</span>
                                    <div className="flex-1 rounded-sm" style={{ backgroundColor: currentHex, height: line.height }}></div>
                                </div>
                            ))}
                            <div className="p-4 rounded-md flex flex-col gap-2" style={{ backgroundColor: currentHex }}>
                                {[
                                    { label: '0.25pt', height: '0.5px' },
                                    { label: '0.5pt', height: '1px' },
                                    { label: '1pt', height: '1.5px' },
                                ].map((line, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <span className="text-[12px] tabular w-12" style={{ color: getContrastColor(currentHex) }}>{line.label}</span>
                                        <div className="flex-1 rounded-sm bg-card" style={{ height: line.height }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.registrationMarks} note={t.alignCmykPlates}>
                        <div className="flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                {/* Crosshair */}
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-foreground -translate-y-1/2"></div>
                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-foreground -translate-x-1/2"></div>
                                {/* Circles */}
                                <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-foreground rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 border-2 border-foreground rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                {/* Plate dots: process inks, data. */}
                                <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[#00FFFF]"></div>
                                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#FF00FF]"></div>
                                <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#FFFF00]"></div>
                                <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-foreground"></div>
                                {/* Center with color */}
                                <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: currentHex }}></div>
                            </div>
                        </div>
                    </TestCard>

                    <TestCard label={t.textKnockout} lead={t.knockoutVsOverprint} note={t.knockoutRemoves}>
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-md p-5 min-w-0 relative overflow-hidden" style={{ backgroundColor: currentHex }}>
                                    <span className="text-[12px] text-white/60 block mb-2">{t.knockoutLabel}</span>
                                    <span className="text-[24px] font-medium text-white break-words">{t.textLabel}</span>
                                    <p className="text-[12px] mt-2 text-white/70">{t.knockoutDesc}</p>
                                </div>
                                <div className="rounded-md p-5 min-w-0 relative overflow-hidden" style={{ backgroundColor: currentHex }}>
                                    <span className="text-[12px] text-white/60 block mb-2">{t.overprintLabel}</span>
                                    <span className="text-[24px] font-medium mix-blend-multiply break-words" style={{ color: '#000000' }}>{t.textLabel}</span>
                                    <p className="text-[12px] mt-2 text-white/70">{t.overprintDesc}</p>
                                </div>
                            </div>
                            <p className="text-[12px] text-foreground">{t.smallBlackText}</p>
                        </div>
                    </TestCard>

                    <TestCard label={t.colorBars} lead={t.controlBars} note={t.densityRegistration}>
                        <div className="flex flex-col gap-4">
                            {/* CMYK Bars */}
                            <div className="flex gap-1">
                                {['#00FFFF', '#FF00FF', '#FFFF00', '#000000'].map((c, i) => (
                                    <div key={i} className="flex-1 h-6 rounded-sm" style={{ backgroundColor: c }}></div>
                                ))}
                            </div>
                            {/* Gray Ramp */}
                            <div className="flex gap-0.5">
                                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((g, i) => (
                                    <div key={i} className="flex-1 h-4 rounded-sm" style={{ backgroundColor: `rgb(${255 - g * 2.55}, ${255 - g * 2.55}, ${255 - g * 2.55})` }}></div>
                                ))}
                            </div>
                            {/* Color Ramp */}
                            <div className="flex gap-0.5">
                                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct, i) => {
                                    const rgb = hexToRgb(currentHex);
                                    const tinted = mixColors({ r: 255, g: 255, b: 255 }, rgb, pct);
                                    return <div key={i} className="flex-1 h-4 rounded-sm" style={{ backgroundColor: rgbToHex(tinted.r, tinted.g, tinted.b) }}></div>;
                                })}
                            </div>
                            {/* Slur/Doubling Test */}
                            <div className="flex gap-2">
                                <div className="flex-1 h-8 rounded-sm shadow-hairline" style={{ background: `repeating-linear-gradient(90deg, ${currentHex} 0px, ${currentHex} 2px, white 2px, white 4px)` }}></div>
                                <div className="flex-1 h-8 rounded-sm shadow-hairline" style={{ background: `repeating-linear-gradient(0deg, ${currentHex} 0px, ${currentHex} 2px, white 2px, white 4px)` }}></div>
                            </div>
                        </div>
                    </TestCard>
                </div>
            </section>

            {/* Technical integrity: total ink coverage */}
            <section className="flex flex-col gap-5">
                <SectionHeading title={t.totalInkCoverage} hint={t.ticTacDesc} />
                <Card
                    label={t.technicalIntegrity}
                    actions={
                        /* Over the limit reads in ink; the safe state is the one place yellow belongs here. */
                        <LegendDot
                            label={inkIsHigh ? t.highCoverage : t.safeCoverage}
                            color={inkIsHigh ? undefined : 'hsl(var(--accent))'}
                            className="text-[13px]"
                        />
                    }
                >
                    <Metric
                        size="lg"
                        value={`${totalInk}%`}
                        caption={`${t.totalInk} · ${t.status}: ${inkIsHigh ? t.highRisk : t.idealDrying}`}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 pt-5 hairline-t">
                        {[
                            { label: 'C', key: 'c', color: '#00AEEF' },
                            { label: 'M', key: 'm', color: '#ec4899' },
                            { label: 'Y', key: 'y', color: '#eab308' },
                            { label: t.keyBlack, key: 'k', color: '#111111' }
                        ].map((item) => {
                            const val = manualCmyk[item.key as keyof typeof manualCmyk];
                            return (
                                <div key={item.label} className="flex flex-col gap-3">
                                    <div className="flex justify-between items-baseline gap-3">
                                        {/* The dot is the plate's ink: data. */}
                                        <LegendDot label={item.label} color={item.color} className="text-muted-foreground" />
                                        <span className="text-[20px] leading-[1.2] tabular text-foreground">{val}%</span>
                                    </div>
                                    <input type="range" min="0" max="100" value={val} onChange={(e) => handleCmykSliderChange(item.key as keyof typeof manualCmyk, Number(e.target.value))} className="tool-slider w-full" aria-label={String(item.label)} />
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </section>

            {/* Knowledge base */}
            <section className="flex flex-col gap-5">
                <SectionHeading title={t.printColorEducation} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[
                        { title: t.subtractiveTheory, desc: t.subtractiveDesc },
                        { title: t.offsetVsDigital, desc: t.offsetVsDigitalDesc },
                        { title: t.dotGainTitle, desc: t.dotGainDesc },
                        { title: t.spotRefColors, desc: t.spotRefDesc },
                        { title: t.metamerism, desc: t.metamerismDesc },
                        { title: t.varnishLamination, desc: t.varnishLaminationDesc },
                        { title: t.coucheVsOffset, desc: t.coucheVsOffsetDesc },
                        { title: t.trapping, desc: t.trappingDesc },
                        { title: t.gcrUcr, desc: t.gcrUcrDesc },
                        { title: t.lineature, desc: t.lineatureDesc },
                        { title: t.colorGamut, desc: t.colorGamutDesc },
                        { title: t.weightVsThickness, desc: t.weightVsThicknessDesc },
                    ].map((item, i) => (
                        <Card as="article" key={i} bodyClassName="gap-2">
                            <h3 className="text-[16px] leading-[1.35] font-normal text-foreground">{item.title}</h3>
                            <p className="text-[14px] text-muted-foreground">{item.desc}</p>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
};

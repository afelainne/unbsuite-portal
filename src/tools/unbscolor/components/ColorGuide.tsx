
import React, { useState, useEffect, useMemo } from 'react';
import { hexToRgb, rgbToHex, rgbToCmyk, isValidHex, getContrastColor, rgbToHsl, hslToRgb, mixColors, adjustSaturation, cmykToRgb } from '../utils/colorMath';
import { useLanguage } from '../i18n';

interface ColorGuideProps {
    selectedHex: string;
    batchColors?: string[];
}

const SectionHeader: React.FC<{ category: string; title: string }> = ({ category, title }) => (
    <div className="mb-8">
        <h2 className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mb-1">{category}</h2>
        <p className="text-3xl font-normal tracking-tight text-foreground">{title}</p>
    </div>
);

export const ColorGuide: React.FC<ColorGuideProps> = ({ selectedHex, batchColors = [] }) => {
    const { t } = useLanguage();
    const safeHex = isValidHex(selectedHex) ? selectedHex : '#F7E043';
    
    const [manualCmyk, setManualCmyk] = useState({ c: 0, m: 76, y: 73, k: 3 });
    const [bgHex, setBgHex] = useState('#000000');
    const [localHex, setLocalHex] = useState(safeHex);
    const [hueVariation, setHueVariation] = useState(0); // Para variar as sugestões
    
    // Sincroniza com prop externa
    useEffect(() => {
        if (isValidHex(selectedHex)) {
            setLocalHex(selectedHex);
        }
    }, [selectedHex]);
    
    const currentRgb = hexToRgb(localHex);
    const currentHex = isValidHex(localHex) ? localHex : safeHex;

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

    const getLuminance = (hex: string) => {
        const r = hexToRgb(hex);
        const a = [r.r, r.g, r.b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const getContrastRatio = (f: string, b: string) => {
        const l1 = getLuminance(f);
        const l2 = getLuminance(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    const contrastRatio = getContrastRatio(currentHex, bgHex);
    const isPassAA = contrastRatio >= 4.5;
    const isPassAAA = contrastRatio >= 7.0;

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

    return (
        <div className="max-w-[1600px] mx-auto py-12 space-y-24">
            {/* Seção 1: Master Color */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5">
                    <SectionHeader category={t.masterColorReference} title={t.digitalVsPrint} />
                    <div className="aspect-square rounded-[3rem] flex flex-col justify-end p-12 relative overflow-hidden transition-all duration-300" style={{ backgroundColor: currentHex }}>
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/5 to-transparent"></div>
                         <div className="relative z-10">
                            <span className="font-mono text-xs font-bold text-foreground/40 uppercase tracking-widest block mb-2">{t.spotColor2}</span>
                            <input 
                                type="text"
                                value={localHex}
                                onChange={(e) => setLocalHex(e.target.value)}
                                className="text-7xl font-normal tracking-tighter bg-transparent outline-none w-full uppercase"
                                style={{ color: getContrastColor(currentHex) }}
                                maxLength={7}
                                placeholder="#000000"
                            />
                            <span className="font-mono text-[10px] mt-2 block opacity-50" style={{ color: getContrastColor(currentHex) }}>
                                {t.clickToEdit}
                            </span>
                         </div>
                    </div>
                    {/* Seletor de cores do batch/paleta */}
                    {batchColors.length > 0 && (
                        <div className="mt-4 p-4 bg-secondary/40 rounded-2xl border border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-3">{t.paletteColorsLabel}</span>
                            <div className="flex flex-wrap gap-2">
                                {batchColors.map((color, idx) => {
                                    const isActive = color.toUpperCase() === localHex.toUpperCase();
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setLocalHex(color)}
                                            className={`w-10 h-10 rounded-lg transition-all ${isActive ? 'ring-2 ring-black ring-offset-2 scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                            title={`${color}${isActive ? ` (${t.active})` : ''}`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-7">
                    <SectionHeader category={t.technicalBreakdown} title={t.cmykSeparationLogic} />
                    <div className="bg-secondary/40 rounded-[3rem] p-12 border border-border/60 h-[calc(100%-80px)] flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t.colorChannelsLabel}</span>
                        </div>
                        <div className="flex justify-center items-center h-48 relative">
                            <div className="w-32 h-32 rounded-full bg-[#00FFFF] mix-blend-multiply absolute -translate-x-12 opacity-60"></div>
                            <div className="w-32 h-32 rounded-full bg-[#FF00FF] mix-blend-multiply absolute translate-x-0 opacity-60"></div>
                            <div className="w-32 h-32 rounded-full bg-[#FFFF00] mix-blend-multiply absolute translate-x-12 opacity-60"></div>
                            <div className="w-32 h-32 rounded-full bg-[#000000] mix-blend-multiply absolute translate-x-24 opacity-20"></div>
                        </div>
                        <div className="grid grid-cols-4 text-center mt-8">
                            {['C','M','Y','K'].map(ch => {
                                const val = rgbToCmyk(currentRgb)[ch.toLowerCase() as keyof typeof manualCmyk];
                                return (
                                    <div key={ch}>
                                        <span className="font-mono text-[10px] text-muted-foreground block mb-1">{ch}</span>
                                        <span className="text-3xl font-light tracking-tighter">{val}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção 2: Substrates */}
            <section>
                <SectionHeader category={t.substrates} title={t.simulatedPaperDotGain} />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                    {[
                        { name: t.original, sub: t.digitalD65, type: 'original' as any },
                        { name: t.coated, sub: t.coatedPaper, type: 'coated' as any },
                        { name: t.uncoated, sub: t.uncoatedPaper, type: 'uncoated' as any },
                        { name: t.dotGain10, sub: t.mediumGain, type: 'gain10' as any },
                        { name: t.dotGain20, sub: t.heavyGain, type: 'gain20' as any },
                        { name: t.lowDensity, sub: t.reducedDensity, type: 'lowDensity' as any },
                        { name: t.recycledPaper, sub: t.grayBase, type: 'recycled' as any },
                    ].map((p, i) => {
                        const simHex = p.type === 'original' ? currentHex : getSubstrateSim(currentHex, p.type);
                        return (
                            <div key={i} className="space-y-4">
                                <div className="aspect-[4/3] rounded-2xl shadow-sm border border-foreground/5 transition-colors duration-500" style={{ backgroundColor: simHex }}></div>
                                <div className="font-mono text-center">
                                    <p className="text-[10px] font-bold text-foreground uppercase">{p.name}</p>
                                    <p className="text-[8px] text-muted-foreground uppercase">{p.sub}</p>
                                    <p className="text-[9px] text-muted-foreground/70">{simHex}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* SEÇÃO: Legibility Analysis */}
            <section className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4 space-y-12">
                    <div>
                        <SectionHeader category={t.legibilityStandards} title={t.contrastAnalysis} />
                        <div className="p-8 bg-secondary/40/50 rounded-[2.5rem] border border-border/60 space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl shadow-lg" style={{ backgroundColor: currentHex }}></div>
                                <span className="font-mono text-xl font-bold tracking-tight">{currentHex}</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl border-2 border-white shadow-md" style={{ backgroundColor: bgHex }}></div>
                                <span className="font-mono text-xl font-bold tracking-tight">{bgHex}</span>
                            </div>
                            
                            {/* Preview de Contraste */}
                            <div className="mt-6 pt-6 border-t border-border space-y-3">
                                <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.preview}</span>
                                <div className="rounded-2xl overflow-hidden shadow-md">
                                    {/* Texto na cor sobre fundo */}
                                    <div className="p-5 flex flex-col gap-2" style={{ backgroundColor: bgHex }}>
                                        <span className="text-2xl font-bold" style={{ color: currentHex }}>Aa Bb Cc</span>
                                        <span className="text-sm" style={{ color: currentHex }}>{t.legibleText}</span>
                                        <span className="text-xs" style={{ color: currentHex }}>Lorem ipsum dolor sit amet</span>
                                    </div>
                                    {/* Fundo na cor com texto */}
                                    <div className="p-5 flex flex-col gap-2" style={{ backgroundColor: currentHex }}>
                                        <span className="text-2xl font-bold" style={{ color: bgHex }}>Aa Bb Cc</span>
                                        <span className="text-sm" style={{ color: bgHex }}>{t.legibleText}</span>
                                        <span className="text-xs" style={{ color: bgHex }}>Lorem ipsum dolor sit amet</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-6">{t.neutralMatchMatrix}</h3>
                        <div className="grid grid-cols-4 gap-4">
                            {industrialNeutrals.map(n => {
                                const ratio = getContrastRatio(currentHex, n);
                                const isSelected = n.toUpperCase() === bgHex.toUpperCase();
                                return (
                                    <button key={n} onClick={() => setBgHex(n)} className={`flex flex-col items-center gap-3 transition-all ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
                                        <div className={`w-full aspect-square rounded-xl border-2 transition-all ${isSelected ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-transparent'}`} style={{ backgroundColor: n }}></div>
                                        <span className={`text-[10px] font-mono font-bold ${ratio >= 4.5 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{ratio.toFixed(1)}:1</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 flex flex-col items-center justify-center p-12 bg-secondary/40/30 rounded-[4rem] border border-border/60/50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent"></div>
                    <span className="text-[12rem] md:text-[14rem] font-light tracking-tighter leading-none text-foreground z-10">{contrastRatio.toFixed(2)}</span>
                    <div className="mt-6 z-10">
                        <div className={`px-8 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border-2 shadow-sm ${!isPassAA ? 'bg-card text-red-500 border-red-50' : 'bg-card text-emerald-600 border-emerald-50'}`}>{isPassAAA ? t.wcagAAA : isPassAA ? t.wcagAA : t.fail}</div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-12">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{t.accessibleVariations}</h3>
                            <button 
                                onClick={shuffleSuggestions}
                                className="flex items-center gap-2 px-3 py-1.5 bg-foreground text-background rounded-full font-mono text-[9px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-all"
                            >
                                <span>🎲</span> {t.varyTones}
                            </button>
                        </div>
                        
                        {/* Cores do batch como opções de fundo */}
                        {batchColors.length > 1 && (
                            <div className="mb-4">
                                <span className="font-mono text-[8px] font-bold text-muted-foreground/70 uppercase tracking-widest block mb-2">{t.paletteColorsLabel}</span>
                                <div className="flex flex-wrap gap-2">
                                    {batchColors.filter(c => c.toUpperCase() !== localHex.toUpperCase()).map((color, idx) => {
                                        const ratio = getContrastRatio(currentHex, color);
                                        const isSelected = color.toUpperCase() === bgHex.toUpperCase();
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setBgHex(color)}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isSelected ? 'bg-foreground/5 ring-1 ring-black' : 'hover:bg-secondary/40'}`}
                                                title={color}
                                            >
                                                <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: color }}></div>
                                                <span className={`font-mono text-[9px] font-bold ${ratio >= 4.5 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{ratio.toFixed(1)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {automatedCorrections.map((c, i) => (
                                <button key={i} className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border border-border/60 shadow-sm hover:border-foreground transition-all" onClick={() => setBgHex(c.hex)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                        <div className="text-left">
                                            <span className="text-[8px] font-bold text-muted-foreground/70 uppercase block mb-0.5">{c.type}</span>
                                            <span className="font-mono text-sm font-bold">{c.hex}</span>
                                        </div>
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{c.ratio}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border/60 grid grid-cols-2 gap-6">
                         {[
                            { name: t.darkUi, hue: 10, dark: true },
                            { name: t.surface, hue: -15, dark: false },
                         ].map((template, idx) => {
                             const res = findHarmonicBackground(currentHex, template.hue, 4.5, template.dark);
                             return (
                                 <button key={idx} onClick={() => setBgHex(res.hex)} className="p-6 bg-secondary/40 rounded-[2rem] border border-border/60 text-left hover:bg-card transition-all">
                                     <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block mb-2">{template.name}</span>
                                     <span className="text-xl font-mono font-bold text-emerald-600 block">{res.ratio}</span>
                                 </button>
                             );
                         })}
                    </div>
                </div>
            </section>

            {/* SEÇÃO: Testes entre cores da paleta */}
            {batchColors.length >= 2 && (
                <section>
                    <SectionHeader category={t.paletteContrastTest} title={t.testsBetweenColors} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {batchColors.flatMap((color1, i) => 
                            batchColors.slice(i + 1).map((color2, j) => {
                                const ratio = getContrastRatio(color1, color2);
                                const passAA = ratio >= 4.5;
                                const passAAA = ratio >= 7.0;
                                return (
                                    <div key={`${i}-${j}`} className="bg-secondary/40 rounded-2xl border border-border/60 overflow-hidden">
                                        <div className="flex">
                                            <div className="flex-1 p-6" style={{ backgroundColor: color1 }}>
                                                <span className="text-lg font-bold" style={{ color: color2 }}>Aa Bb</span>
                                                <p className="text-xs mt-1" style={{ color: color2 }}>{t.textOnBackground}</p>
                                            </div>
                                            <div className="flex-1 p-6" style={{ backgroundColor: color2 }}>
                                                <span className="text-lg font-bold" style={{ color: color1 }}>Aa Bb</span>
                                                <p className="text-xs mt-1" style={{ color: color1 }}>{t.textOnBackground}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-card flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded" style={{ backgroundColor: color1 }}></div>
                                                <span className="font-mono text-[10px] text-muted-foreground">×</span>
                                                <div className="w-6 h-6 rounded" style={{ backgroundColor: color2 }}></div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-lg font-bold">{ratio.toFixed(2)}:1</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${passAAA ? 'bg-emerald-100 text-emerald-700' : passAA ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {passAAA ? 'AAA' : passAA ? 'AA' : 'FAIL'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            )}

            {/* SEÇÃO: Production Tools */}
            <section className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <SectionHeader category={t.productionCheck} title={t.trappingRegistration} />
                    <div className="p-8 bg-secondary/40 rounded-[2rem] border border-border/60 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
                        <div className="relative w-48 h-48">
                            <div className="absolute inset-0 rounded-full border-4 border-cyan-400 mix-blend-multiply opacity-50 translate-x-0.5"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-magenta-400 mix-blend-multiply opacity-50 -translate-x-0.5 translate-y-0.5"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-yellow-400 mix-blend-multiply opacity-50 translate-y-0.5"></div>
                            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: currentHex }}>
                                <span className="font-mono text-[10px] text-background font-bold">{t.trapTest}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <SectionHeader category={t.resolution} title={t.lpiHalftone} />
                    <div className="p-8 bg-secondary/40 rounded-[2rem] border border-border/60 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="space-y-2">
                                <div className="aspect-square rounded-xl bg-muted overflow-hidden" style={{ backgroundImage: `radial-gradient(circle, ${currentHex} 2px, transparent 2px)`, backgroundSize: '12px 12px' }}></div>
                                <span className="block text-center font-mono text-[9px] font-bold">85 LPI</span>
                            </div>
                            <div className="space-y-2">
                                <div className="aspect-square rounded-xl bg-muted overflow-hidden" style={{ backgroundImage: `radial-gradient(circle, ${currentHex} 1px, transparent 1px)`, backgroundSize: '4px 4px' }}></div>
                                <span className="block text-center font-mono text-[9px] font-bold">175 LPI</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <SectionHeader category={t.gamut} title={t.colorSpaceGamut} />
                    <div className="p-8 bg-secondary/40 rounded-[2rem] border border-border/60 flex flex-col justify-between min-h-[300px]">
                        <div className="relative aspect-square w-full rounded-full border-2 border-dashed border-border flex items-center justify-center">
                            <div className={`w-12 h-12 rounded-full shadow-lg`} style={{ backgroundColor: currentHex }}></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO: Visual Print Tests */}
            <section>
                <SectionHeader category={t.printSimulationTests} title={t.visualPrintTests} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    
                    {/* Teste 1: Sangria (Bleed) */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.bleedTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.bleedArea}</h4>
                        </div>
                        <div className="p-8 flex items-center justify-center min-h-[200px] bg-card">
                            <div className="relative">
                                <div className="w-40 h-52 border-2 border-dashed border-red-300 absolute -inset-3 rounded"></div>
                                <div className="w-36 h-48 border-2 border-dashed border-blue-300 absolute -inset-1 rounded"></div>
                                <div className="w-32 h-44 rounded shadow-lg flex items-center justify-center" style={{ backgroundColor: currentHex }}>
                                    <span className="font-mono text-[8px] font-bold uppercase" style={{ color: getContrastColor(currentHex) }}>{t.safeArea}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">
                                <span className="inline-block w-2 h-2 bg-red-300 mr-1"></span>{t.bleed3mm}
                                <span className="inline-block w-2 h-2 bg-blue-300 ml-3 mr-1"></span>{t.cutLine}
                            </span>
                        </div>
                    </div>

                    {/* Teste 2: Overprint */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.overprintTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.colorOverlay}</h4>
                        </div>
                        <div className="p-8 flex items-center justify-center min-h-[200px] bg-card">
                            <div className="relative w-40 h-40">
                                <div className="absolute w-24 h-24 rounded-full top-0 left-0" style={{ backgroundColor: currentHex, opacity: 0.8 }}></div>
                                <div className="absolute w-24 h-24 rounded-full top-4 left-12 mix-blend-multiply" style={{ backgroundColor: '#000000', opacity: 0.9 }}></div>
                                <div className="absolute w-24 h-24 rounded-full top-12 left-4 mix-blend-multiply" style={{ backgroundColor: getSubstrateSim(currentHex, 'uncoated'), opacity: 0.7 }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.overprintSimulationNote}</span>
                        </div>
                    </div>

                    {/* Teste 3: Gradiente / Banding */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.gradientTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.bandingCheck}</h4>
                        </div>
                        <div className="p-8 flex flex-col gap-4 min-h-[200px] bg-card">
                            <div className="h-12 rounded-lg" style={{ background: `linear-gradient(90deg, ${currentHex}, #FFFFFF)` }}></div>
                            <div className="h-12 rounded-lg" style={{ background: `linear-gradient(90deg, #000000, ${currentHex})` }}></div>
                            <div className="h-12 rounded-lg" style={{ background: `linear-gradient(90deg, ${currentHex}, transparent)` }}></div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.observeBanding}</span>
                        </div>
                    </div>

                    {/* Teste 4: Texto Mínimo */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.minimumText}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.textLegibility}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card space-y-3">
                            <div className="p-3 rounded-lg" style={{ backgroundColor: currentHex }}>
                                <p style={{ color: getContrastColor(currentHex), fontSize: '14px' }}>{t.bodyText}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: currentHex }}>
                                <p style={{ color: getContrastColor(currentHex), fontSize: '10px' }}>{t.footnotes}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: currentHex }}>
                                <p style={{ color: getContrastColor(currentHex), fontSize: '7px' }}>{t.minimumReadLimit}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ backgroundColor: currentHex }}>
                                <p style={{ color: getContrastColor(currentHex), fontSize: '5px' }}>{t.microPrint}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.highResRequired}</span>
                        </div>
                    </div>

                    {/* Teste 5: Cores Vizinhas */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.adjacencyTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.neighboringColors}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card">
                            <div className="flex h-32 rounded-xl overflow-hidden shadow-sm">
                                <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }}></div>
                                <div className="flex-1" style={{ backgroundColor: currentHex }}></div>
                                <div className="flex-1" style={{ backgroundColor: '#000000' }}></div>
                            </div>
                            <div className="flex h-16 mt-4 rounded-xl overflow-hidden shadow-sm">
                                <div className="flex-1" style={{ backgroundColor: getSubstrateSim(currentHex, 'gain20') }}></div>
                                <div className="flex-1" style={{ backgroundColor: currentHex }}></div>
                                <div className="flex-1" style={{ backgroundColor: getSubstrateSim(currentHex, 'lowDensity') }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.colorBehavior}</span>
                        </div>
                    </div>

                    {/* Teste 6: Inversão Positivo/Negativo */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.reversalTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.positiveNegative}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card flex gap-4">
                            <div className="flex-1 rounded-xl p-6 flex flex-col items-center justify-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #e5e5e5' }}>
                                <div className="w-16 h-16 rounded-full mb-3" style={{ backgroundColor: currentHex }}></div>
                                <span className="font-mono text-[9px] font-bold" style={{ color: currentHex }}>{t.positive}</span>
                            </div>
                            <div className="flex-1 rounded-xl p-6 flex flex-col items-center justify-center" style={{ backgroundColor: currentHex }}>
                                <div className="w-16 h-16 rounded-full mb-3 bg-card"></div>
                                <span className="font-mono text-[9px] font-bold text-background">{t.negative}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.knockoutApplication}</span>
                        </div>
                    </div>

                    {/* Teste 7: Ângulos de Retícula */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.screenAngles}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.cmykPlateAngles}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card">
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: 'C 15°', angle: 15, color: '#00FFFF' },
                                    { label: 'M 75°', angle: 75, color: '#FF00FF' },
                                    { label: 'Y 0°', angle: 0, color: '#FFFF00' },
                                    { label: 'K 45°', angle: 45, color: '#000000' },
                                ].map((ch, i) => (
                                    <div key={i} className="text-center">
                                        <div 
                                            className="aspect-square rounded-lg mb-2 overflow-hidden"
                                            style={{ 
                                                backgroundImage: `repeating-linear-gradient(${ch.angle}deg, ${ch.color} 0px, ${ch.color} 1px, transparent 1px, transparent 4px)`,
                                                backgroundColor: '#f5f5f5'
                                            }}
                                        ></div>
                                        <span className="font-mono text-[8px] font-bold">{ch.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 aspect-square rounded-lg overflow-hidden relative">
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(15deg, #00FFFF33 0px, #00FFFF33 1px, transparent 1px, transparent 3px)` }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(75deg, #FF00FF33 0px, #FF00FF33 1px, transparent 1px, transparent 3px)` }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg, #FFFF0033 0px, #FFFF0033 1px, transparent 1px, transparent 3px)` }}></div>
                                <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(45deg, #00000033 0px, #00000033 1px, transparent 1px, transparent 3px)` }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.standardAngles}</span>
                        </div>
                    </div>

                    {/* Teste 8: Metamerismo / Iluminação */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.metamerismTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.lightingSimulation}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: t.lightingD65, filter: 'none', bg: '#FFFFFF' },
                                    { label: t.lightingTungsten, filter: 'sepia(20%) saturate(110%)', bg: '#FFF8E7' },
                                    { label: t.lightingFluorescent, filter: 'hue-rotate(-5deg) saturate(90%)', bg: '#F0FFF0' },
                                ].map((light, i) => (
                                    <div key={i} className="text-center">
                                        <div 
                                            className="aspect-square rounded-xl mb-2 flex items-center justify-center"
                                            style={{ backgroundColor: light.bg }}
                                        >
                                            <div 
                                                className="w-12 h-12 rounded-full shadow-lg"
                                                style={{ backgroundColor: currentHex, filter: light.filter }}
                                            ></div>
                                        </div>
                                        <span className="font-mono text-[8px] font-bold text-muted-foreground">{light.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.colorsChangeLight}</span>
                        </div>
                    </div>

                    {/* Teste 9: Rich Black vs Pure Black */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.blackTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.richBlackVsPure}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card">
                            <div className="flex gap-4 h-28">
                                <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#000000' }}>
                                    <div className="text-center">
                                        <span className="font-mono text-[9px] text-background font-bold block">100K</span>
                                        <span className="font-mono text-[7px] text-muted-foreground">{t.pureBlack}</span>
                                    </div>
                                </div>
                                <div className="flex-1 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#0F0F0F' }}>
                                    <div className="text-center">
                                        <span className="font-mono text-[9px] text-background font-bold block">60C 40M 40Y 100K</span>
                                        <span className="font-mono text-[7px] text-muted-foreground">{t.richBlack}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: currentHex }}>
                                <div className="flex gap-2">
                                    <div className="flex-1 h-8 rounded" style={{ backgroundColor: '#000000' }}></div>
                                    <div className="flex-1 h-8 rounded" style={{ backgroundColor: '#0F0F0F' }}></div>
                                </div>
                                <span className="font-mono text-[8px] mt-2 block text-center" style={{ color: getContrastColor(currentHex) }}>{t.comparisonOnColor}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.richBlackDense}</span>
                        </div>
                    </div>

                    {/* Teste 10: Densidades / Tints */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.tintRamp}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.densityScale}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card">
                            <div className="flex rounded-xl overflow-hidden shadow-sm">
                                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct, i) => {
                                    const rgb = hexToRgb(currentHex);
                                    const tinted = mixColors({ r: 255, g: 255, b: 255 }, rgb, pct);
                                    const tintHex = rgbToHex(tinted.r, tinted.g, tinted.b);
                                    return (
                                        <div key={i} className="flex-1 h-24 flex items-end justify-center pb-2" style={{ backgroundColor: tintHex }}>
                                            <span className="font-mono text-[7px] font-bold" style={{ color: pct > 50 ? '#fff' : '#000' }}>{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.tintUniformity}</span>
                        </div>
                    </div>

                    {/* Teste 11: Linhas Finas (Hairlines) */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.hairlineTest}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.fineLines}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card space-y-4">
                            {[
                                { label: '0.25pt', height: '0.5px' },
                                { label: '0.5pt', height: '1px' },
                                { label: '1pt', height: '1.5px' },
                                { label: '2pt', height: '3px' },
                            ].map((line, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="font-mono text-[8px] w-12 text-muted-foreground">{line.label}</span>
                                    <div className="flex-1 rounded" style={{ backgroundColor: currentHex, height: line.height }}></div>
                                </div>
                            ))}
                            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: currentHex }}>
                                {[
                                    { label: '0.25pt', height: '0.5px' },
                                    { label: '0.5pt', height: '1px' },
                                    { label: '1pt', height: '1.5px' },
                                ].map((line, i) => (
                                    <div key={i} className="flex items-center gap-4 mb-2">
                                        <span className="font-mono text-[8px] w-12" style={{ color: getContrastColor(currentHex) }}>{line.label}</span>
                                        <div className="flex-1 rounded bg-card" style={{ height: line.height }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.linesPrintFail}</span>
                        </div>
                    </div>

                    {/* Teste 12: Marcas de Registro */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.registrationMarks}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.registrationMarks}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                {/* Crosshair */}
                                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-foreground -translate-y-1/2"></div>
                                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-foreground -translate-x-1/2"></div>
                                {/* Circles */}
                                <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-foreground rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                <div className="absolute top-1/2 left-1/2 w-8 h-8 border-2 border-foreground rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                                {/* Color dots */}
                                <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-cyan-400"></div>
                                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-pink-500"></div>
                                <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-foreground"></div>
                                {/* Center with color */}
                                <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: currentHex }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.alignCmykPlates}</span>
                        </div>
                    </div>

                    {/* Teste 13: Knockout vs Overprint Text */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.textKnockout}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.knockoutVsOverprint}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl p-6 relative overflow-hidden" style={{ backgroundColor: currentHex }}>
                                    <span className="font-mono text-[8px] text-background/50 block mb-2">{t.knockoutLabel.toUpperCase()}</span>
                                    <span className="text-2xl font-bold text-background">{t.textLabel}</span>
                                    <p className="text-[9px] mt-2 text-background/70">{t.knockoutDesc}</p>
                                </div>
                                <div className="rounded-xl p-6 relative overflow-hidden" style={{ backgroundColor: currentHex }}>
                                    <span className="font-mono text-[8px] text-background/50 block mb-2">{t.overprintLabel.toUpperCase()}</span>
                                    <span className="text-2xl font-bold mix-blend-multiply" style={{ color: '#000000' }}>{t.textLabel}</span>
                                    <p className="text-[9px] mt-2 text-background/70">{t.overprintDesc}</p>
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-secondary rounded-xl">
                                <p className="text-[9px] text-foreground/80 text-center">⚠️ {t.smallBlackText}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.knockoutRemoves}</span>
                        </div>
                    </div>

                    {/* Teste 14: Barras de Cor (Color Bars) */}
                    <div className="bg-secondary/40 rounded-[2rem] border border-border/60 overflow-hidden">
                        <div className="p-6 border-b border-border/60">
                            <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t.colorBars}</span>
                            <h4 className="font-mono text-sm font-bold mt-1">{t.controlBars}</h4>
                        </div>
                        <div className="p-8 min-h-[200px] bg-card space-y-4">
                            {/* CMYK Bars */}
                            <div className="flex gap-1">
                                {['#00FFFF', '#FF00FF', '#FFFF00', '#000000'].map((c, i) => (
                                    <div key={i} className="flex-1 h-6 rounded" style={{ backgroundColor: c }}></div>
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
                            <div className="flex gap-2 mt-4">
                                <div className="flex-1 h-8 rounded" style={{ background: `repeating-linear-gradient(90deg, ${currentHex} 0px, ${currentHex} 2px, white 2px, white 4px)` }}></div>
                                <div className="flex-1 h-8 rounded" style={{ background: `repeating-linear-gradient(0deg, ${currentHex} 0px, ${currentHex} 2px, white 2px, white 4px)` }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-secondary/40 text-center">
                            <span className="text-[9px] text-muted-foreground">{t.densityRegistration}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÃO: TECHNICAL INTEGRITY (TIC / TAC) */}
            <section className="bg-[#f3fcf5] rounded-[4rem] p-16 md:p-24 relative overflow-hidden border border-[#e6f4e9]">
                <div className="relative z-10 max-w-[1400px] mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        <div>
                            <h2 className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mb-4">{t.technicalIntegrity}</h2>
                            <h3 className="text-5xl font-normal tracking-tight text-foreground mb-12">{t.totalInkCoverage}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-lg">
                                {t.ticTacDesc}
                            </p>
                            <div className="px-4 py-2 border border-emerald-600/30 bg-card rounded-full font-mono text-[10px] font-bold uppercase text-emerald-600 inline-block">
                                {t.status}: {totalInk > 300 ? t.highRisk : t.idealDrying}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className={`text-[12rem] md:text-[16rem] font-light leading-none tracking-tighter transition-colors ${totalInk > 300 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {totalInk}%
                            </span>
                            <div className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${totalInk > 300 ? 'bg-red-500 text-background' : 'bg-emerald-500 text-background'}`}>
                                {totalInk > 300 ? t.highCoverage : t.safeCoverage}
                            </div>
                        </div>
                    </div>
                    <div className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-x-12 gap-y-12">
                        {[
                            { label: 'C', key: 'c', color: '#111111' },
                            { label: 'M', key: 'm', color: '#ec4899' },
                            { label: 'Y', key: 'y', color: '#eab308' },
                            { label: t.keyBlack, key: 'k', color: '#111111' }
                        ].map((item) => {
                            const val = manualCmyk[item.key as keyof typeof manualCmyk];
                            return (
                                <div key={item.label} className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <span className="font-mono text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{item.label}</span>
                                        <span className="text-5xl font-light tracking-tighter text-foreground">{val}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/40 rounded-full relative overflow-hidden">
                                        <div className="h-full transition-all duration-300" style={{ width: `${val}%`, backgroundColor: item.color }}></div>
                                    </div>
                                    <input type="range" min="0" max="100" value={val} onChange={(e) => handleCmykSliderChange(item.key as any, Number(e.target.value))} className="w-full h-8 accent-black cursor-ew-resize" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Seção Knowledge Base - ATUALIZADA COM AS NOVAS DICAS */}
            <section>
                <SectionHeader category={t.knowledgeBase} title={t.printColorEducation} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                        { title: t.subtractiveTheory, icon: '🔬', desc: t.subtractiveDesc },
                        { title: t.offsetVsDigital, icon: '🖨️', desc: t.offsetVsDigitalDesc },
                        { title: t.dotGainTitle, icon: '📏', desc: t.dotGainDesc },
                        { title: t.spotRefColors, icon: '🎨', desc: t.spotRefDesc },
                        { title: t.metamerism, icon: '👁️', desc: t.metamerismDesc },
                        { title: t.varnishLamination, icon: '🛡️', desc: t.varnishLaminationDesc },
                        { title: t.coucheVsOffset, icon: '📜', desc: t.coucheVsOffsetDesc },
                        { title: t.trapping, icon: '🚥', desc: t.trappingDesc },
                        { title: t.gcrUcr, icon: '🖋️', desc: t.gcrUcrDesc },
                        { title: t.lineature, icon: '📐', desc: t.lineatureDesc },
                        { title: t.colorGamut, icon: '🌈', desc: t.colorGamutDesc },
                        { title: t.weightVsThickness, icon: '📑', desc: t.weightVsThicknessDesc },
                    ].map((item, i) => (
                        <div key={i} className="p-8 bg-secondary/40 rounded-3xl border border-border/60">
                            <span className="text-2xl mb-4 block">{item.icon}</span>
                            <h4 className="font-mono text-[10px] font-bold text-foreground uppercase tracking-widest mb-3">{item.title}</h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};


import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { hexToRgb, rgbToHex, isValidHex, mixColors, adjustHue, adjustSaturation, getContrastColor, getClosestColorName, findReferenceMatches } from '../utils/colorMath';
import { DEFAULT_LIBRARY } from '../constants';
import { useLanguage } from '../i18n';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface ControlSliderProps {
    label: string;
    paramKey: string;
    min: number;
    max: number;
    unit?: string;
    value: number;
    onChange: (key: string, val: number) => void;
}

// Slider como componente separado e memoizado
const ControlSlider = memo(({ label, paramKey, min, max, unit = "", value, onChange }: ControlSliderProps) => {
    const isCount = paramKey.includes('Count');
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        onChange(paramKey, isCount ? Math.round(val) : val);
    };

    return (
        <div className="flex flex-col gap-1 mb-6">
            <div className="flex justify-between items-center mb-1">
                <label className="font-mono text-[9px] font-bold uppercase text-gray-400 tracking-widest">{label}</label>
                <span className="font-mono text-[10px] font-bold text-black bg-gray-50 px-2 py-0.5 rounded">
                    {isCount ? value : Math.round(value)}{unit}
                </span>
            </div>
            <input 
                type="range" 
                min={min} 
                max={max} 
                step="any"
                value={value}
                onChange={handleChange}
                className="w-full h-[2px] bg-gray-200 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-transform [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:rounded-full"
            />
        </div>
    );
});

interface PaletteBuilderProps {
    initialHex: string;
    onHexChange: (hex: string) => void;
    batchColors?: string[];
    onBatchColorsChange?: (colors: string[]) => void;
}

export const PaletteBuilder: React.FC<PaletteBuilderProps> = ({ initialHex, onHexChange, batchColors = [], onBatchColorsChange }) => {
    const { t } = useLanguage();
    const [baseHex, setBaseHex] = useState(initialHex);
    const [useReference, setUseReference] = useState(false);
    const [showBatchPalettes, setShowBatchPalettes] = useState(false);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | null>(null);
    
    const [darkCount, setDarkCount] = useState(4);
    const [lightCount, setLightCount] = useState(4);
    const [darknessIntensity, setDarknessIntensity] = useState(12);
    const [lightnessIntensity, setLightnessIntensity] = useState(12);
    const [hueRotDark, setHueRotDark] = useState(0);
    const [hueRotLight, setHueRotLight] = useState(0);
    const [satDark, setSatDark] = useState(0);
    const [satLight, setSatLight] = useState(0);

    // Sincroniza hex externo
    useEffect(() => {
        if (isValidHex(initialHex)) setBaseHex(initialHex);
    }, [initialHex]);

    // Handler único para todos os sliders
    const handleSliderChange = useCallback((key: string, val: number) => {
        switch (key) {
            case 'darkCount': setDarkCount(val); break;
            case 'lightCount': setLightCount(val); break;
            case 'darknessIntensity': setDarknessIntensity(val); break;
            case 'lightnessIntensity': setLightnessIntensity(val); break;
            case 'hueRotDark': setHueRotDark(val); break;
            case 'hueRotLight': setHueRotLight(val); break;
            case 'satDark': setSatDark(val); break;
            case 'satLight': setSatLight(val); break;
        }
    }, []);

    // Cálculo da paleta
    const palette = useMemo(() => {
        if (!isValidHex(baseHex)) return [];
        const baseRgb = hexToRgb(baseHex);
        const newPalette: { hex: string; isBase?: boolean; referenceCode?: string }[] = [];

        // Shades
        for (let i = darkCount; i >= 1; i--) {
            let color = adjustHue(baseRgb, hueRotDark * (i / Math.max(1, darkCount)));
            color = mixColors(color, { r: 0, g: 0, b: 0 }, Math.min(100, i * darknessIntensity));
            color = adjustSaturation(color, satDark * (i / Math.max(1, darkCount)));
            const hexVal = rgbToHex(color.r, color.g, color.b);
            newPalette.push({ hex: hexVal, referenceCode: useReference ? findReferenceMatches(hexVal, DEFAULT_LIBRARY, 1)[0]?.reference.code : undefined });
        }

        // Base
        const baseP = useReference ? findReferenceMatches(baseHex, DEFAULT_LIBRARY, 1)[0]?.reference.code : undefined;
        newPalette.push({ hex: baseHex, isBase: true, referenceCode: baseP });

        // Tints
        for (let i = 1; i <= lightCount; i++) {
             let color = adjustHue(baseRgb, hueRotLight * (i / Math.max(1, lightCount)));
             color = mixColors(color, { r: 255, g: 255, b: 255 }, Math.min(100, i * lightnessIntensity));
             color = adjustSaturation(color, satLight * (i / Math.max(1, lightCount)));
             const hexVal = rgbToHex(color.r, color.g, color.b);
             newPalette.push({ hex: hexVal, referenceCode: useReference ? findReferenceMatches(hexVal, DEFAULT_LIBRARY, 1)[0]?.reference.code : undefined });
        }
        return newPalette;
    }, [baseHex, darkCount, lightCount, darknessIntensity, lightnessIntensity, hueRotDark, hueRotLight, satDark, satLight, useReference]);

    const [bgContext, setBgContext] = useState<'white' | 'black' | 'darkest' | 'lightest'>('white');
    const [feedback, setFeedback] = useState<string | null>(null);

    const renderBg = useMemo(() => {
        if (bgContext === 'black') return '#000000';
        if (bgContext === 'darkest' && palette.length > 0) return palette[0].hex;
        if (bgContext === 'lightest' && palette.length > 0) return palette[palette.length - 1].hex;
        return '#FFFFFF';
    }, [bgContext, palette]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-12">
            {/* Seção Batch Palettes */}
            {batchColors && batchColors.length > 0 && (
                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.batchPalette} ({batchColors.length} {t.colors})</h3>
                        <button 
                            onClick={() => setShowBatchPalettes(!showBatchPalettes)}
                            className={`px-4 py-2 font-mono text-[10px] uppercase rounded-full transition-all font-bold border shadow-sm ${showBatchPalettes ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}
                        >
                            {showBatchPalettes ? t.hideBatch : t.showBatch}
                        </button>
                    </div>
                    {showBatchPalettes && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-3">
                                {batchColors.map((color, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setBaseHex(color);
                                            onHexChange(color);
                                            setSelectedBatchIndex(idx);
                                        }}
                                        className={`group relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selectedBatchIndex === idx ? 'ring-2 ring-black scale-105' : 'hover:scale-105'}`}
                                    >
                                        <div 
                                            className="w-16 h-16 rounded-lg shadow-md border border-gray-200"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="font-mono text-[8px] text-gray-500 uppercase">{color}</span>
                                        <span className="font-mono text-[7px] text-gray-400">{getClosestColorName(color)}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono">{t.clickToUseAsBase}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-5">
                    <h2 className="font-mono text-sm font-medium mb-8 text-gray-400 uppercase tracking-widest">{t.baseColor}</h2>
                    <input 
                        type="text" 
                        value={baseHex}
                        onChange={(e) => { 
                            const val = e.target.value;
                            setBaseHex(val); 
                            if (isValidHex(val)) onHexChange(val); 
                        }}
                        className="text-7xl md:text-8xl font-sans font-normal tracking-tighter outline-none w-full bg-transparent"
                        maxLength={7}
                    />
                    <div className="flex flex-wrap items-center gap-4 mt-2 mb-8">
                         <div className="font-mono text-gray-500 uppercase tracking-widest text-sm font-bold">{getClosestColorName(baseHex)}</div>
                         <div className="flex gap-2">
                            <button onClick={() => {
                                const h = rgbToHex(Math.random()*255|0, Math.random()*255|0, Math.random()*255|0);
                                setBaseHex(h); onHexChange(h);
                            }} className="bg-gray-50 hover:bg-black hover:text-white px-4 py-2 font-mono text-[10px] uppercase rounded-full transition-all font-bold shadow-sm">{t.randomize}</button>
                            <button onClick={() => setUseReference(!useReference)} className={`px-4 py-2 font-mono text-[10px] uppercase rounded-full transition-all font-bold border shadow-sm ${useReference ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}>{t.usePantone}</button>
                         </div>
                    </div>
                </div>
                <div className="lg:col-span-7 grid md:grid-cols-2 gap-x-12">
                     <div>
                        <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-8 border-b border-gray-100 pb-2">{t.shades}</h3>
                        <ControlSlider label={t.count} paramKey="darkCount" min={0} max={10} value={darkCount} onChange={handleSliderChange} />
                        <ControlSlider label={t.step} paramKey="darknessIntensity" min={1} max={30} unit="%" value={darknessIntensity} onChange={handleSliderChange} />
                        <ControlSlider label={t.hue} paramKey="hueRotDark" min={-60} max={60} unit="°" value={hueRotDark} onChange={handleSliderChange} />
                     </div>
                     <div>
                        <h3 className="font-mono text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-8 border-b border-gray-100 pb-2">{t.tints}</h3>
                        <ControlSlider label={t.count} paramKey="lightCount" min={0} max={10} value={lightCount} onChange={handleSliderChange} />
                        <ControlSlider label={t.step} paramKey="lightnessIntensity" min={1} max={30} unit="%" value={lightnessIntensity} onChange={handleSliderChange} />
                        <ControlSlider label={t.hue} paramKey="hueRotLight" min={-60} max={60} unit="°" value={hueRotLight} onChange={handleSliderChange} />
                     </div>
                </div>
            </div>

            <div className="relative w-full rounded-[3rem] shadow-2xl ring-1 ring-black/5 px-10 py-10" style={{ backgroundColor: renderBg }}>
                <div className="flex w-full justify-center">
                    <div className="w-[88%] max-w-[1400px] h-[260px] rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-black/5 bg-white/40 backdrop-blur-sm">
                        <div className="flex w-full h-full">
                            {palette.map((color, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => { 
                                        const val = useReference && color.referenceCode ? color.referenceCode : color.hex;
                                        navigator.clipboard.writeText(val); 
                                        setFeedback(`${t.copiedToClipboard} ${val}`); 
                                        setTimeout(()=>setFeedback(null),1500); 
                                    }}
                                    className={`relative flex flex-col justify-end items-center pb-8 cursor-pointer transition-[flex] duration-500 ease-out group ${color.isBase ? 'flex-[6] z-10 shadow-2xl ring-1 ring-white/10' : 'flex-[1] hover:flex-[3]'}`}
                                    style={{ backgroundColor: color.hex }}
                                >
                                    <span 
                                        className={`font-mono text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${color.isBase ? 'opacity-100 text-lg mb-2' : 'opacity-0 group-hover:opacity-100 mb-10 vertical-text'}`}
                                        style={{ 
                                            color: getContrastColor(color.hex), 
                                            writingMode: color.isBase ? 'horizontal-tb' : 'vertical-lr', 
                                            transform: color.isBase ? 'none' : 'rotate(180deg)' 
                                        }}
                                    >
                                        {useReference && color.referenceCode ? color.referenceCode : color.hex}
                                    </span>
                                    {color.isBase && <span className="font-mono text-[9px] uppercase tracking-[0.4em] opacity-30 font-black" style={{ color: getContrastColor(color.hex) }}>{t.baseBadge}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {feedback && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white px-8 py-3 font-mono text-[10px] uppercase tracking-widest rounded-full shadow-2xl z-30 pointer-events-none animate-in fade-in zoom-in duration-300">
                        {feedback}
                    </div>
                )}
            </div>
            <div className="flex justify-center gap-4 pt-4">
                {(['white', 'black', 'darkest', 'lightest'] as const).map(ctx => (
                    <button key={ctx} onClick={() => setBgContext(ctx)} className={`w-6 h-6 rounded-full border border-gray-200 transition-all ${bgContext === ctx ? 'scale-150 ring-2 ring-black ring-offset-2' : 'hover:scale-125 shadow-sm'}`} style={{ backgroundColor: ctx === 'white' ? '#fff' : ctx === 'black' ? '#000' : ctx === 'darkest' ? palette[0]?.hex : palette[palette.length-1]?.hex }} />
                ))}
            </div>
        </div>
    );
};


import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { hexToRgb, rgbToHex, isValidHex, normalizeHex, mixColors, adjustHue, adjustSaturation, getContrastColor, getClosestColorName, findReferenceMatches } from '../utils/colorMath';
import { DEFAULT_LIBRARY } from '../constants';
import { formatReferenceCode } from '../utils/reference';
import { useLanguage } from '../i18n';
import type { Translations } from '../i18n';
import { copyText, useTransientState } from '../utils/browser';
import { HexField } from './HexField';
import { Shuffle } from 'lucide-react';
import { Card, IconButton, LegendToggle, TextTabs } from './ui';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type BgContext = 'white' | 'black' | 'darkest' | 'lightest';

const bgContextLabel = (t: Translations, ctx: BgContext): string => {
    switch (ctx) {
        case 'white':
            return t.backgroundWhite;
        case 'black':
            return t.backgroundBlack;
        case 'darkest':
            return t.bgDarkest;
        case 'lightest':
            return t.bgLightest;
    }
};

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
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-baseline gap-3">
                <span className="text-[14px] text-muted-foreground">{label}</span>
                <span className="text-[14px] tabular text-foreground">
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
                className="tool-slider w-full"
                aria-label={label}
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
        const normalized = normalizeHex(initialHex);
        if (normalized) setBaseHex(normalized);
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
            newPalette.push({ hex: hexVal, referenceCode: useReference ? formatReferenceCode(findReferenceMatches(hexVal, DEFAULT_LIBRARY, 1)[0]?.reference.code) : undefined });
        }

        // Base
        const baseP = useReference ? formatReferenceCode(findReferenceMatches(baseHex, DEFAULT_LIBRARY, 1)[0]?.reference.code) : undefined;
        newPalette.push({ hex: baseHex, isBase: true, referenceCode: baseP });

        // Tints
        for (let i = 1; i <= lightCount; i++) {
             let color = adjustHue(baseRgb, hueRotLight * (i / Math.max(1, lightCount)));
             color = mixColors(color, { r: 255, g: 255, b: 255 }, Math.min(100, i * lightnessIntensity));
             color = adjustSaturation(color, satLight * (i / Math.max(1, lightCount)));
             const hexVal = rgbToHex(color.r, color.g, color.b);
             newPalette.push({ hex: hexVal, referenceCode: useReference ? formatReferenceCode(findReferenceMatches(hexVal, DEFAULT_LIBRARY, 1)[0]?.reference.code) : undefined });
        }
        return newPalette;
    }, [baseHex, darkCount, lightCount, darknessIntensity, lightnessIntensity, hueRotDark, hueRotLight, satDark, satLight, useReference]);

    const [bgContext, setBgContext] = useState<'white' | 'black' | 'darkest' | 'lightest'>('white');
    const [feedback, showFeedback] = useTransientState<string>(1500);

    const renderBg = useMemo(() => {
        if (bgContext === 'black') return '#000000';
        if (bgContext === 'darkest' && palette.length > 0) return palette[0].hex;
        if (bgContext === 'lightest' && palette.length > 0) return palette[palette.length - 1].hex;
        return '#FFFFFF';
    }, [bgContext, palette]);

    const bgSwatch = (ctx: BgContext) =>
        ctx === 'white' ? '#FFFFFF' : ctx === 'black' ? '#000000' : ctx === 'darkest' ? palette[0]?.hex : palette[palette.length - 1]?.hex;


    return (
        <div className="flex flex-col gap-5">
            {/* Seção Batch Palettes */}
            {batchColors && batchColors.length > 0 && (
                <Card
                    aria-label={t.batchPalette}
                    label={<>{t.batchPalette} <span className="tabular">· {batchColors.length} {t.colors}</span></>}
                    actions={
                        <button
                            type="button"
                            onClick={() => setShowBatchPalettes(!showBatchPalettes)}
                            aria-expanded={showBatchPalettes}
                            className="ctl ctl-outline ctl-sm px-3"
                        >
                            {showBatchPalettes ? t.hideBatch : t.showBatch}
                        </button>
                    }
                >
                    {showBatchPalettes && (
                        <>
                            <div className="flex flex-wrap gap-2">
                                {batchColors.map((color, idx) => (
                                    <button
                                        type="button"
                                        key={idx}
                                        onClick={() => {
                                            const normalized = normalizeHex(color);
                                            if (!normalized) return;
                                            setBaseHex(normalized);
                                            onHexChange(normalized);
                                            setSelectedBatchIndex(idx);
                                        }}
                                        aria-pressed={selectedBatchIndex === idx}
                                        className={`flex flex-col items-start gap-1.5 p-2 rounded-md press transition-colors duration-fast ease-out ${selectedBatchIndex === idx ? 'bg-primary text-primary-foreground' : 'hover:bg-fill'}`}
                                    >
                                        <span className="w-16 h-16 rounded-sm shadow-hairline" style={{ backgroundColor: color }} aria-hidden="true" />
                                        <span className="text-[13px] tabular">{color.toUpperCase()}</span>
                                        <span className="text-[12px] opacity-70 max-w-[4.5rem] truncate">{getClosestColorName(color)}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[13px] text-muted-foreground">{t.clickToUseAsBase}</p>
                        </>
                    )}
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
                {/* The base colour: the same anatomy as the Matcher's input card. */}
                <Card
                    className="md:col-span-2 lg:col-span-4"
                    aria-label={t.baseColor}
                    label={t.baseColor}
                    actions={
                        <IconButton
                            label={t.randomize}
                            onClick={() => {
                                const h = rgbToHex(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256));
                                setBaseHex(h);
                                onHexChange(h);
                            }}
                        >
                            <Shuffle aria-hidden="true" />
                        </IconButton>
                    }
                >
                    <span className="block h-24 w-full rounded-md shadow-hairline" style={{ backgroundColor: baseHex }} aria-hidden="true" />
                    <div className="flex flex-col gap-1 min-w-0">
                        <HexField
                            value={baseHex}
                            onCommit={(hex) => {
                                // HexField only commits normalized, valid "#RRGGBB"
                                setBaseHex(hex);
                                onHexChange(hex);
                            }}
                            className="w-full bg-transparent outline-none rounded-sm focus-visible:shadow-focus text-[34px] md:text-[44px] leading-[1.08] tracking-[-0.02em] font-normal tabular text-foreground"
                            maxLength={7}
                            aria-label={t.baseColor}
                        />
                        <span className="text-[13px] text-muted-foreground truncate">{getClosestColorName(baseHex)}</span>
                    </div>
                    <LegendToggle label={t.useRefMatch} on={useReference} onClick={() => setUseReference(!useReference)} />
                </Card>

                <Card className="lg:col-span-4" aria-label={t.shades} label={t.shades} bodyClassName="gap-6">
                        <ControlSlider label={t.count} paramKey="darkCount" min={0} max={10} value={darkCount} onChange={handleSliderChange} />
                        <ControlSlider label={t.step} paramKey="darknessIntensity" min={1} max={30} unit="%" value={darknessIntensity} onChange={handleSliderChange} />
                        <ControlSlider label={t.hue} paramKey="hueRotDark" min={-60} max={60} unit="°" value={hueRotDark} onChange={handleSliderChange} />
                </Card>

                <Card className="lg:col-span-4" aria-label={t.tints} label={t.tints} bodyClassName="gap-6">
                        <ControlSlider label={t.count} paramKey="lightCount" min={0} max={10} value={lightCount} onChange={handleSliderChange} />
                        <ControlSlider label={t.step} paramKey="lightnessIntensity" min={1} max={30} unit="%" value={lightnessIntensity} onChange={handleSliderChange} />
                        <ControlSlider label={t.hue} paramKey="hueRotLight" min={-60} max={60} unit="°" value={hueRotLight} onChange={handleSliderChange} />
                </Card>
            </div>

            {/* The palette on its background. The strip and the backdrop are data: they keep their colours. */}
            <Card aria-label={t.preview} label={t.preview}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="text-[13px] text-muted-foreground">{t.background}</span>
                    <TextTabs<BgContext>
                        ariaLabel={t.background}
                        value={bgContext}
                        onChange={setBgContext}
                        items={(['white', 'black', 'darkest', 'lightest'] as const).map((ctx) => ({
                            value: ctx,
                            label: (
                                <span className="inline-flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-pill shadow-hairline-strong" style={{ backgroundColor: bgSwatch(ctx) }} aria-hidden="true" />
                                    {bgContextLabel(t, ctx)}
                                </span>
                            )
                        }))}
                    />
                </div>
                    <div
                        className="relative w-full rounded-md shadow-hairline px-4 py-6 md:px-10 md:py-10 transition-colors duration-base ease-out"
                        style={{ backgroundColor: renderBg }}
                    >
                        <div className="w-full max-w-[1100px] mx-auto h-[220px] md:h-[260px] rounded-md overflow-hidden shadow-hairline">
                            <div className="flex w-full h-full">
                                {palette.map((color, idx) => {
                                    const shown = useReference && color.referenceCode ? color.referenceCode : color.hex;
                                    return (
                                        <button
                                            type="button"
                                            key={idx}
                                            onClick={() => {
                                                void copyText(shown).then((ok) => showFeedback(ok ? `${t.copiedToClipboard} ${shown}` : t.copyFailed));
                                            }}
                                            title={`${t.copy} ${shown}`}
                                            aria-label={`${t.copy} ${shown}`}
                                            className={`relative min-w-0 flex flex-col justify-end items-center pb-6 md:pb-8 transition-[flex-grow] duration-slow ease-out group ${color.isBase ? 'flex-[6] z-10' : 'flex-[1] hover:flex-[3] focus-visible:flex-[3]'}`}
                                            style={{ backgroundColor: color.hex }}
                                        >
                                            <span
                                                className={`tabular uppercase transition-opacity duration-base ease-out ${color.isBase ? 'opacity-100 text-[24px] leading-[1.2] mb-1' : 'text-[12px] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 mb-10'}`}
                                                style={{
                                                    color: getContrastColor(color.hex),
                                                    writingMode: color.isBase ? 'horizontal-tb' : 'vertical-lr',
                                                    transform: color.isBase ? 'none' : 'rotate(180deg)'
                                                }}
                                            >
                                                {shown}
                                            </span>
                                            {color.isBase && (
                                                <span className="text-[12px] opacity-60" style={{ color: getContrastColor(color.hex) }}>
                                                    {t.baseBadge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {feedback && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 material-popover rounded-pill px-5 py-2.5 text-[13px] text-foreground z-30 pointer-events-none fade-in-up" role="status">
                                {feedback}
                            </div>
                        )}
                    </div>
            </Card>
        </div>
    );
};

import React, { useState } from 'react';
import { hexToRgb, rgbToHsl, rgbToHsv, rgbToCmyk, hexToLab, findReferenceMatches, isValidHex } from '../utils/colorMath';
import { ReferenceColor } from '../types';

interface BatchAnalyzerProps {
    t: any;
    batchColors: string[];
    settings: {
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
    onBatchColorUpdate: (index: number, newHex: string) => void;
    onDownloadCard: (format: 'svg' | 'png', index: number) => void;
    onCopyAll: () => void;
    library: ReferenceColor[];
    bridgeCoatedLibrary: ReferenceColor[];
    bridgeUncoatedLibrary: ReferenceColor[];
    solidCoatedLibrary: ReferenceColor[];
    solidUncoatedLibrary: ReferenceColor[];
    formatRgbDisplay: (r: number, g: number, b: number) => string;
    getClosestColorName: (hex: string) => string;
}

export const BatchAnalyzer: React.FC<BatchAnalyzerProps> = ({
    t,
    batchColors,
    settings,
    onBatchColorUpdate,
    onDownloadCard,
    onCopyAll,
    library,
    bridgeCoatedLibrary,
    bridgeUncoatedLibrary,
    solidCoatedLibrary,
    solidUncoatedLibrary,
    formatRgbDisplay,
    getClosestColorName
}) => {
    const [showAlternatives, setShowAlternatives] = useState<Set<number>>(new Set());

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center mb-8 border-b border-border/60 pb-4">
                <h2 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.multiSlotMatchAnalysis}</h2>
                <div className="flex items-center gap-3">
                    <button onClick={onCopyAll} className="bg-foreground text-background px-6 py-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-foreground/80 transition-all shadow-lg">{t.copyAllSlotsData}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {batchColors.map((c, idx) => {
                    if (!isValidHex(c)) return null;
                    const rBatch = hexToRgb(c);
                    const hBatch = rgbToHsl(rBatch);
                    const sBatch = rgbToHsv(rBatch);
                    const realCmykBatch = rgbToCmyk(rBatch);
                    const lBatch = hexToLab(c);

                    const matchC = findReferenceMatches(c, bridgeCoatedLibrary, 1)[0];
                    const matchU = findReferenceMatches(c, bridgeUncoatedLibrary, 1)[0];
                    const matchSolidC = findReferenceMatches(c, solidCoatedLibrary, 1)[0];
                    const matchSolidU = findReferenceMatches(c, solidUncoatedLibrary, 1)[0];

                    const strip = findReferenceMatches(c, library, 6).map(m => ({
                        hex: m.reference.hex,
                        name: m.reference.name,
                        type: `ΔE ${m.deltaE.toFixed(1)}`
                    }));

                    return (
                        <div key={idx} className="bg-secondary/40 p-6 rounded-[2rem] border border-border/60 flex flex-col gap-6">
                            <div className="flex gap-4 items-center">
                                <input
                                    type="color"
                                    value={c}
                                    onChange={(e) => onBatchColorUpdate(idx, e.target.value)}
                                    className="w-12 h-12 cursor-pointer"
                                    aria-label={`Selecionar cor do slot ${idx + 1}`}
                                    style={{
                                        appearance: 'none' as any,
                                        WebkitAppearance: 'none',
                                        padding: 0,
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)'
                                    }}
                                />
                                <div className="flex flex-col">
                                    <input
                                        type="text"
                                        value={c}
                                        onChange={(e) => onBatchColorUpdate(idx, e.target.value)}
                                        className="font-mono text-sm font-bold bg-transparent outline-none w-20"
                                        maxLength={7}
                                    />
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{getClosestColorName(c)}</span>
                                </div>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={() => onDownloadCard('svg', idx)}
                                        className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border border-border bg-card hover:border-foreground hover:text-foreground transition-all"
                                        aria-label={`${t.downloadSlot} ${idx + 1} SVG`}
                                    >
                                        SVG
                                    </button>
                                    <button
                                        onClick={() => onDownloadCard('png', idx)}
                                        className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border border-border bg-card hover:border-foreground hover:text-foreground transition-all"
                                        aria-label={`${t.downloadSlot} ${idx + 1} PNG`}
                                    >
                                        PNG
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 font-mono text-[11px] text-muted-foreground bg-card/50 p-5 rounded-xl border border-foreground/5 min-h-[140px]">
                                {settings.showHex && <p className="font-bold text-foreground/80 mb-2">{c}</p>}
                                {settings.showRgb && <p className="mb-1">{formatRgbDisplay(rBatch.r, rBatch.g, rBatch.b)}</p>}
                                {settings.showCmyk && <p className="mb-1 uppercase">CMYK: {realCmykBatch.c}, {realCmykBatch.m}, {realCmykBatch.y}, {realCmykBatch.k}</p>}
                                {settings.showHsb && <p className="mb-1">{`hsb(${sBatch.h}, ${sBatch.s}, ${sBatch.v})`}</p>}
                                {settings.showHsl && <p className="mb-1">{`hsl(${hBatch.h}, ${hBatch.s}%, ${hBatch.l}%)`}</p>}
                                {settings.showLab && <p>{`lab(${Math.round(lBatch.l)}, ${Math.round(lBatch.a)}, ${Math.round(lBatch.b)})`}</p>}
                            </div>

                            <div className="p-4 bg-card rounded-2xl shadow-sm border border-foreground/5 space-y-4">
                                {settings.showPmsC && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase">{t.pantoneBridgeC}</span>
                                            <span className="font-bold text-[12px] uppercase tracking-tight truncate">{matchC && matchC.deltaE < 10 ? matchC.reference.code : t.outOfGamut}</span>
                                        </div>
                                        {matchC && <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: matchC.reference.hex }}></div>}
                                    </div>
                                )}
                                {settings.showPmsU && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase">{t.pantoneBridgeU}</span>
                                            <span className="font-bold text-[12px] uppercase tracking-tight truncate">{matchU && matchU.deltaE < 10 ? matchU.reference.code : t.outOfGamut}</span>
                                        </div>
                                        {matchU && <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: matchU.reference.hex }}></div>}
                                    </div>
                                )}
                                {settings.showPmsSolidC && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase">{t.pantoneC}</span>
                                            <span className="font-bold text-[12px] uppercase tracking-tight truncate">{matchSolidC && matchSolidC.deltaE < 10 ? matchSolidC.reference.code : t.outOfGamut}</span>
                                        </div>
                                        {matchSolidC && <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: matchSolidC.reference.hex }}></div>}
                                    </div>
                                )}
                                {settings.showPmsSolidU && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase">{t.pantoneU}</span>
                                            <span className="font-bold text-[12px] uppercase tracking-tight truncate">{matchSolidU && matchSolidU.deltaE < 10 ? matchSolidU.reference.code : t.outOfGamut}</span>
                                        </div>
                                        {matchSolidU && <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: matchSolidU.reference.hex }}></div>}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.2em]">{t.nearbyAlternatives}</div>
                                    {!showAlternatives.has(idx) && (
                                        <button
                                            onClick={() => setShowAlternatives(prev => {
                                                const next = new Set(prev);
                                                next.add(idx);
                                                return next;
                                            })}
                                            className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-border bg-card rounded-lg hover:border-foreground hover:text-foreground transition-all"
                                        >
                                            {t.analyzeWithAi}
                                        </button>
                                    )}
                                </div>

                                {showAlternatives.has(idx) && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {strip.map((s, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-foreground/5">
                                                <div className="w-10 h-10 rounded-lg shadow-inner" style={{ backgroundColor: s.hex }}></div>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-[11px] font-bold uppercase tracking-tight">{s.name}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground">{s.type}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

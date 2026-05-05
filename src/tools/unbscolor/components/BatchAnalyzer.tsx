import React from 'react';
import { hexToRgb, rgbToHsl, rgbToHsv, rgbToCmyk, hexToLab, findReferenceMatches, isValidHex } from '../utils/colorMath';
import { ReferenceColor } from '../types';

type CardTemplate = 'classic' | 'compact' | 'editorial' | 'swatchcard' | 'minimal' | 'mono';

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
    cardTemplate: CardTemplate;
    onCardTemplateChange: (t: CardTemplate) => void;
    showAlternatives: Set<number>;
    onShowAlternativesChange: (s: Set<number>) => void;
    onDownloadAll: (format: 'svg' | 'png') => void;
    renderCardSvg: (color: string, idx: number, includeAlternatives: boolean) => string;
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
    getClosestColorName,
    cardTemplate,
    onCardTemplateChange,
    showAlternatives,
    onShowAlternativesChange,
    onDownloadAll,
    renderCardSvg
}) => {
    return (
        <div className="space-y-12">
            <div className="flex justify-between items-center mb-8 border-b border-border/60 pb-4">
                <h2 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest">{t.multiSlotMatchAnalysis}</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase">{t.cardTemplateLabel}:</span>
                        <select
                            value={cardTemplate}
                            onChange={(e) => onCardTemplateChange(e.target.value as CardTemplate)}
                            className="px-3 py-1.5 border border-border rounded-lg font-mono text-[10px] focus:outline-none focus:border-foreground bg-card"
                        >
                            <option value="classic">{t.cardTemplateClassic}</option>
                            <option value="compact">{t.cardTemplateCompact}</option>
                            <option value="editorial">{t.cardTemplateEditorial}</option>
                            <option value="swatchcard">{t.cardTemplateSwatch}</option>
                            <option value="minimal">{t.cardTemplateMinimal}</option>
                            <option value="mono">{t.cardTemplateMono}</option>
                        </select>
                    </div>
                    <button onClick={() => onDownloadAll('svg')} className="px-3 py-2 border border-border rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/40">↓ ALL SVG</button>
                    <button onClick={() => onDownloadAll('png')} className="px-3 py-2 border border-border rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/40">↓ ALL PNG</button>
                    <button onClick={onCopyAll} className="bg-foreground text-background px-6 py-2 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-foreground/80 transition-all shadow-lg">{t.copyAllSlotsData}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {batchColors.map((c, idx) => {
                    if (!isValidHex(c)) return null;
                    const isOpen = showAlternatives.has(idx);
                    const cardSvg = renderCardSvg(c, idx, isOpen);
                    return (
                        <div key={idx} className="bg-secondary/30 p-4 rounded-2xl border border-border/60 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={c}
                                    onChange={(e) => onBatchColorUpdate(idx, e.target.value)}
                                    className="w-9 h-9 cursor-pointer rounded-md border border-border"
                                    style={{ appearance: 'none' as any, WebkitAppearance: 'none', padding: 0, background: 'transparent' }}
                                    aria-label={`Slot ${idx + 1}`}
                                />
                                <input
                                    type="text"
                                    value={c}
                                    onChange={(e) => onBatchColorUpdate(idx, e.target.value)}
                                    className="font-mono text-xs font-bold bg-transparent outline-none w-20"
                                    maxLength={7}
                                />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase truncate flex-1">{getClosestColorName(c)}</span>
                                <button
                                    onClick={() => {
                                        const next = new Set(showAlternatives);
                                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                                        onShowAlternativesChange(next);
                                    }}
                                    className={`px-2 py-1 text-[9px] font-mono font-bold uppercase border rounded transition-all ${isOpen ? 'bg-foreground text-background border-foreground' : 'border-border bg-card hover:border-foreground'}`}
                                    title={t.analyzeWithAi}
                                >
                                    {isOpen ? '✓' : 'REF'}
                                </button>
                                <button onClick={() => onDownloadCard('svg', idx)} className="px-2 py-1 text-[9px] font-mono font-bold uppercase border border-border bg-card rounded hover:border-foreground transition-all">SVG</button>
                                <button onClick={() => onDownloadCard('png', idx)} className="px-2 py-1 text-[9px] font-mono font-bold uppercase border border-border bg-card rounded hover:border-foreground transition-all">PNG</button>
                            </div>
                            <div className="bg-card rounded-xl overflow-hidden border border-border/60 [&>svg]:w-full [&>svg]:h-auto [&>svg]:block" dangerouslySetInnerHTML={{ __html: cardSvg }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

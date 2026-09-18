import React from 'react';
import { Download, ImageDown } from 'lucide-react';
import { isValidHex, normalizeHex } from '../utils/colorMath';
import { HexField } from './HexField';
import { ReferenceColor } from '../types';
import type { Translations } from '../i18n';
import { Card, IconButton, LegendToggle, TextTabs } from './ui';

type CardTemplate = 'classic' | 'compact' | 'editorial' | 'swatchcard' | 'minimal' | 'mono';

interface BatchAnalyzerProps {
    t: Translations;
    batchColors: string[];
    settings: {
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
    const templates: { value: CardTemplate; label: string }[] = [
        { value: 'classic', label: t.cardTemplateClassic },
        { value: 'compact', label: t.cardTemplateCompact },
        { value: 'editorial', label: t.cardTemplateEditorial },
        { value: 'swatchcard', label: t.cardTemplateSwatch },
        { value: 'minimal', label: t.cardTemplateMinimal },
        { value: 'mono', label: t.cardTemplateMono }
    ];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
                <div className="flex flex-col gap-2 min-w-0 max-w-full">
                    <span className="text-[13px] text-muted-foreground">{t.cardTemplateLabel}</span>
                    <TextTabs<CardTemplate>
                        ariaLabel={t.cardTemplateLabel}
                        items={templates}
                        value={cardTemplate}
                        onChange={onCardTemplateChange}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onDownloadAll('svg')} className="ctl ctl-outline h-10 px-4">
                        <Download aria-hidden="true" />
                        {t.downloadAll} SVG
                    </button>
                    <button type="button" onClick={() => onDownloadAll('png')} className="ctl ctl-outline h-10 px-4">
                        <Download aria-hidden="true" />
                        {t.downloadAll} PNG
                    </button>
                    {/* The one committing action on this view. */}
                    <button type="button" onClick={onCopyAll} className="ctl ctl-tinted h-10 px-4">{t.copyAllSlotsData}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {batchColors.map((c, idx) => {
                    // Keep the card (and its input) visible while a hex is being typed;
                    // only the SVG preview and the name need a valid color.
                    const valid = isValidHex(c);
                    const isOpen = showAlternatives.has(idx);
                    const cardSvg = valid ? renderCardSvg(c, idx, isOpen) : '';
                    return (
                        <Card
                            key={idx}
                            label={`${t.slotLabel} ${idx + 1}`}
                            actions={
                                <>
                                    <IconButton label={`${t.downloadSlot} SVG`} onClick={() => onDownloadCard('svg', idx)} disabled={!valid}>
                                        <Download aria-hidden="true" />
                                    </IconButton>
                                    <IconButton label={`${t.downloadSlot} PNG`} onClick={() => onDownloadCard('png', idx)} disabled={!valid}>
                                        <ImageDown aria-hidden="true" />
                                    </IconButton>
                                </>
                            }
                        >
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={valid ? (normalizeHex(c) ?? '#000000').toLowerCase() : '#000000'}
                                        onChange={(e) => onBatchColorUpdate(idx, e.target.value)}
                                        className="w-10 h-10 shrink-0 cursor-pointer rounded-md"
                                        style={{ appearance: 'none', WebkitAppearance: 'none', padding: 0, background: 'transparent' }}
                                        aria-label={`${t.slotLabel} ${idx + 1}`}
                                    />
                                    <HexField
                                        value={c}
                                        onCommit={(hex) => onBatchColorUpdate(idx, hex)}
                                        className="field h-10 w-28 shrink-0 tabular"
                                        maxLength={7}
                                        aria-label={`${t.slotLabel} ${idx + 1} hex`}
                                    />
                                    <span className="text-[13px] text-muted-foreground truncate flex-1 min-w-0">{valid ? getClosestColorName(c) : ''}</span>
                                </div>
                                <LegendToggle
                                    label={t.nearbyAlternatives}
                                    on={isOpen}
                                    title={t.nearbyAlternatives}
                                    onClick={() => {
                                        const next = new Set(showAlternatives);
                                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                                        onShowAlternativesChange(next);
                                    }}
                                />
                            </div>
                            {/* The exported card is a mock, so it sits in the recessed frame, as media does. */}
                            {valid ? (
                                <div className="bg-canvas rounded-md p-4 [&>svg]:w-full [&>svg]:h-auto [&>svg]:block" dangerouslySetInnerHTML={{ __html: cardSvg }} />
                            ) : (
                                <div className="bg-canvas rounded-md aspect-[4/5]" aria-hidden="true" />
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

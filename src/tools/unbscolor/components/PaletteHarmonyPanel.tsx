import { Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Translations } from '../i18n';
import { hexToRgb, rgbToHsl } from '../utils/colorMath';
import { HARMONY_KINDS, HarmonyKind, harmonyFrom, PaletteColor } from './GeneratedPaletteLogic';
import { TextTabs } from './ui';

interface PaletteHarmonyPanelProps {
    t: Translations;
    colors: PaletteColor[];
    onAdd: (hexes: string[]) => void;
}

const kindLabel = (t: Translations, kind: HarmonyKind) => {
    switch (kind) {
        case 'complementary': return t.gpHarmonyComplementary;
        case 'analogous': return t.gpHarmonyAnalogous;
        case 'triad': return t.gpHarmonyTriad;
        default: return t.gpHarmonyMonochromatic;
    }
};

/** Complementary, analogous, triad or monochromatic colours from one palette colour. */
export const PaletteHarmonyPanel: React.FC<PaletteHarmonyPanelProps> = ({ t, colors, onAdd }) => {
    const heaviest = useMemo(
        () => colors.reduce((best, c, i) => (c.weight > colors[best].weight ? i : best), 0),
        [colors]
    );
    const [baseIndex, setBaseIndex] = useState<number | null>(null);
    const [kind, setKind] = useState<HarmonyKind>('complementary');
    const index = baseIndex !== null && baseIndex < colors.length ? baseIndex : heaviest;
    const base = colors[index];

    const results = useMemo(() => (base ? harmonyFrom(base.hex, kind) : []), [base, kind]);
    const inPalette = useMemo(() => new Set(colors.map((c) => c.hex.toUpperCase())), [colors]);
    const fresh = results.filter((hex) => !inPalette.has(hex.toUpperCase()));
    const neutral = base ? rgbToHsl(hexToRgb(base.hex)).s < 8 && kind !== 'monochromatic' : false;

    if (!base) return null;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex items-center gap-2">
                    <span className="text-[13px] text-muted-foreground">{t.gpBase}</span>
                    <select
                        value={index}
                        onChange={(e) => setBaseIndex(Number(e.target.value))}
                        className="field h-10 w-auto max-w-[14rem]"
                    >
                        {colors.map((c, i) => (
                            <option key={`${c.hex}-${i}`} value={i}>{`${c.hex.toUpperCase()} · ${c.name}`}</option>
                        ))}
                    </select>
                </label>
                <TextTabs<HarmonyKind>
                    className="max-w-full"
                    ariaLabel={t.gpHarmonyTitle}
                    value={kind}
                    onChange={setKind}
                    items={HARMONY_KINDS.map((k) => ({ value: k, label: kindLabel(t, k) }))}
                />
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col items-center gap-1">
                    <span className="h-14 w-14 rounded-md shadow-hairline" style={{ backgroundColor: base.hex }} aria-hidden="true" />
                    <span className="text-[12px] tabular text-muted-foreground">{base.hex.toUpperCase()}</span>
                </div>
                <span className="self-center text-muted-foreground" aria-hidden="true">→</span>
                {results.map((hex) => {
                    const already = inPalette.has(hex.toUpperCase());
                    return (
                        <div key={hex} className="flex flex-col items-center gap-1">
                            <span className="relative h-14 w-14 rounded-md shadow-hairline" style={{ backgroundColor: hex }}>
                                <button
                                    type="button"
                                    onClick={() => onAdd([hex])}
                                    disabled={already}
                                    aria-label={already ? `${hex} · ${t.gpInPalette}` : t.gpAddHexAria.replace('{hex}', hex)}
                                    title={already ? t.gpInPalette : t.gpAddToPalette}
                                    className="ctl ctl-outline ctl-icon ctl-sm absolute -bottom-2 -right-2 h-7 w-7 rounded-pill"
                                >
                                    <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                                </button>
                            </span>
                            <span className="text-[12px] tabular text-foreground">{hex}</span>
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={() => onAdd(fresh)}
                    disabled={fresh.length === 0}
                    className="ctl ctl-outline h-10 px-4 ml-auto self-center"
                >
                    {t.gpAddAll}
                </button>
            </div>
            {neutral && <p className="text-[13px] text-muted-foreground">{t.gpNeutralBase}</p>}
        </div>
    );
};

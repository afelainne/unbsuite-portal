import React from 'react';
import type { Translations } from '../i18n';
import { inkOn } from './GeneratedPaletteSheets';
import { formatPercent, PaletteColor } from './GeneratedPaletteLogic';
import { simulateVision, VisionMode } from './ColorVisionToggle';
import { useElementWidth } from './PaletteElementWidth';

interface PaletteProportionBarProps {
    t: Translations;
    colors: PaletteColor[];
    vision: VisionMode;
    onFixTotal: () => void;
}

/**
 * The palette as one strip: each colour as wide as its weight, with its
 * percentage and hex inside when there is room, and a legend underneath so
 * narrow colours are never lost. Shows the total and, calmly, when it is off.
 */
export const PaletteProportionBar: React.FC<PaletteProportionBarProps> = ({ t, colors, vision, onFixTotal }) => {
    const [ref, width] = useElementWidth<HTMLDivElement>(960);
    const total = colors.reduce((sum, c) => sum + c.weight, 0);
    const safeTotal = total > 0 ? total : 1;

    return (
        <div className="flex flex-col gap-3">
            <div
                ref={ref}
                className="flex h-20 w-full overflow-hidden rounded-md shadow-hairline"
                role="img"
                aria-label={colors.map((c) => `${c.name || c.hex} ${formatPercent(c.weight)}`).join(', ')}
            >
                {colors.map((c, i) => {
                    const shown = simulateVision(c.hex, vision);
                    const px = (c.weight / safeTotal) * width;
                    const ink = inkOn(shown);
                    return (
                        <div
                            key={`${c.hex}-${i}`}
                            className="flex min-w-0 flex-col justify-end px-2 pb-1.5 transition-[flex-grow] duration-base ease-out"
                            style={{ flexGrow: Math.max(c.weight, 0), flexBasis: 0, backgroundColor: shown, color: ink }}
                        >
                            {px >= 56 && <span className="text-[14px] leading-tight tabular">{formatPercent(c.weight)}</span>}
                            {px >= 76 && <span className="text-[11px] leading-tight tabular opacity-80">{c.hex.toUpperCase()}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {colors.map((c, i) => (
                    <span key={`${c.hex}-legend-${i}`} className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-pill shadow-hairline" style={{ backgroundColor: simulateVision(c.hex, vision) }} aria-hidden="true" />
                        <span className="tabular text-foreground">{c.hex.toUpperCase()}</span>
                        <span className="tabular">{formatPercent(c.weight)}</span>
                    </span>
                ))}
                <span className="ml-auto inline-flex items-center gap-2">
                    <span className="text-[13px] text-muted-foreground">
                        {t.totalLabel} <span className="tabular text-foreground">{formatPercent(total)}</span>
                    </span>
                </span>
            </div>
            {total !== 100 && (
                <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground" role="status">
                    <span>{t.gpSumWarning.replace('{n}', String(Math.round(total)))}</span>
                    <button type="button" onClick={onFixTotal} className="ctl ctl-outline ctl-sm">
                        {t.gpFixSum}
                    </button>
                </div>
            )}
        </div>
    );
};

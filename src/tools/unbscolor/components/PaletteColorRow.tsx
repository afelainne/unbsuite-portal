import { ChevronDown, GripVertical, Lock, Unlock, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Translations } from '../i18n';
import { HexField } from './HexField';
import { PaletteColor } from './GeneratedPaletteLogic';
import { simulateVision, VisionMode } from './ColorVisionToggle';

interface PaletteColorRowProps {
    t: Translations;
    color: PaletteColor;
    index: number;
    count: number;
    vision: VisionMode;
    codes: string[];
    expanded: boolean;
    canRemove: boolean;
    dragging: boolean;
    dropTarget: boolean;
    onToggleExpand: () => void;
    onHex: (hex: string) => void;
    onName: (name: string) => void;
    onWeight: (weight: number) => void;
    onToggleLock: () => void;
    onRemove: () => void;
    onMove: (to: number) => void;
    onDragStart: (index: number) => void;
    onDragOverRow: (index: number) => void;
    onDrop: (index: number) => void;
    onDragEnd: () => void;
}

/**
 * One palette colour on one line: handle, swatch, hex, name, weight
 * (slider and number), lock, codes and remove. Codes open under the row.
 * The row only becomes draggable while the handle is held, so the fields
 * inside keep normal text selection; the handle also moves with arrow keys.
 */
export const PaletteColorRow: React.FC<PaletteColorRowProps> = ({
    t, color, index, count, vision, codes, expanded, canRemove, dragging, dropTarget,
    onToggleExpand, onHex, onName, onWeight, onToggleLock, onRemove, onMove,
    onDragStart, onDragOverRow, onDrop, onDragEnd
}) => {
    const [armed, setArmed] = useState(false);
    const [draft, setDraft] = useState(String(color.weight));
    useEffect(() => setDraft(String(color.weight)), [color.weight]);

    const commitDraft = () => {
        const value = Number.parseInt(draft, 10);
        if (Number.isFinite(value)) onWeight(value);
        else setDraft(String(color.weight));
    };

    const shown = simulateVision(color.hex, vision);
    const codesId = `palette-codes-${index}`;

    return (
        <div
            draggable={armed}
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
                onDragStart(index);
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onDragOverRow(index);
            }}
            onDrop={(e) => {
                e.preventDefault();
                setArmed(false);
                onDrop(index);
            }}
            onDragEnd={() => {
                setArmed(false);
                onDragEnd();
            }}
            className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md px-1 py-3 transition-[opacity,background-color] duration-fast ease-out ${dragging ? 'opacity-40' : ''} ${dropTarget ? 'bg-fill' : ''}`}
        >
            <div className="flex min-w-0 flex-1 basis-[260px] items-center gap-2">
                <button
                    type="button"
                    onPointerDown={() => setArmed(true)}
                    onPointerUp={() => setArmed(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' && index > 0) {
                            e.preventDefault();
                            onMove(index - 1);
                        } else if (e.key === 'ArrowDown' && index < count - 1) {
                            e.preventDefault();
                            onMove(index + 1);
                        }
                    }}
                    className="ctl ctl-plain ctl-icon ctl-sm cursor-grab text-muted-foreground active:cursor-grabbing"
                    aria-label={`${t.gpReorderAria} (${index + 1}/${count})`}
                    title={t.gpReorderAria}
                >
                    <GripVertical aria-hidden="true" />
                </button>
                <span
                    className="h-10 w-10 flex-shrink-0 rounded-sm shadow-hairline"
                    style={{ backgroundColor: shown }}
                    title={vision === 'normal' ? color.hex : `${color.hex} → ${shown}`}
                    aria-hidden="true"
                />
                <HexField
                    value={color.hex}
                    onCommit={onHex}
                    className="field h-10 w-[6.75rem] flex-shrink-0 tabular"
                    placeholder="#FFFFFF"
                    maxLength={7}
                    aria-label={`${t.colorHexAria} ${index + 1}`}
                />
                <input
                    type="text"
                    value={color.name}
                    onChange={(e) => onName(e.target.value)}
                    className="field h-10 min-w-0 flex-1"
                    placeholder={t.colorNameAria}
                    aria-label={`${t.colorNameAria} ${index + 1}`}
                />
            </div>
            <div className="flex min-w-0 flex-1 basis-[240px] items-center gap-2">
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={color.weight}
                    onChange={(e) => onWeight(Number.parseInt(e.target.value, 10))}
                    disabled={color.locked}
                    aria-label={`${t.colorWeightAria} ${index + 1}`}
                    className="tool-slider min-w-[80px] flex-1"
                />
                <label className="relative flex-shrink-0">
                    <span className="sr-only">{`${t.colorWeightAria} ${index + 1}`}</span>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        value={draft}
                        disabled={color.locked}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitDraft}
                        onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
                        className="field h-10 tabular w-[4.5rem] pr-6 text-right [appearance:textfield] disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground" aria-hidden="true">%</span>
                </label>
                <button
                    type="button"
                    onClick={onToggleLock}
                    aria-pressed={color.locked}
                    aria-label={color.locked ? t.unlockWeightAria : t.lockWeightAria}
                    title={color.locked ? t.unlockWeightAria : t.lockWeightAria}
                    className={`ctl ctl-plain ctl-icon ctl-sm ${color.locked ? '' : 'text-muted-foreground'}`}
                >
                    {color.locked ? <Lock aria-hidden="true" /> : <Unlock aria-hidden="true" />}
                </button>
                <button
                    type="button"
                    onClick={onToggleExpand}
                    aria-expanded={expanded}
                    aria-controls={codesId}
                    aria-label={expanded ? t.gpCollapseCodes : t.gpExpandCodes}
                    title={expanded ? t.gpCollapseCodes : t.gpExpandCodes}
                    className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                >
                    <ChevronDown aria-hidden="true" className={`transition-transform duration-fast ease-out ${expanded ? 'rotate-180' : ''}`} />
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={!canRemove}
                    aria-label={`${t.removeColorAria} ${index + 1}`}
                    title={t.removeColorAria}
                    className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground hover:text-destructive"
                >
                    <X aria-hidden="true" />
                </button>
            </div>
            {expanded && (
                <div id={codesId} className="flex basis-full flex-wrap gap-x-4 gap-y-1 pl-[5.25rem]">
                    {codes.length > 0
                        ? codes.map((code) => <span key={code} className="text-[13px] tabular text-muted-foreground">{code}</span>)
                        : <span className="text-[13px] text-muted-foreground">{t.gpNoCodes}</span>}
                </div>
            )}
        </div>
    );
};

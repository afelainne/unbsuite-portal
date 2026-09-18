import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Shuffle } from 'lucide-react';
import { findReferenceMatches, getClosestColorName, isValidHex } from '../utils/colorMath';
import { groupReferenceMatches } from '../utils/reference';
import { parseColorInput } from '../utils/parseColorInput';
import { sortFinishes } from '../constants';
import { useActiveBooks } from '../libraries/store';
import { AccessibilityCard } from './AccessibilityCard';
import { BestMatchCard, ReferenceAlternatives } from './ReferenceMatchPanel';
import { DiscoveriesPanel } from './DiscoveriesPanel';
import { HexField } from './HexField';
import { InfoGrid } from './InfoGrid';
import { TonalScaleCard } from './TonalScaleCard';
import { Card, IconButton } from './ui';
import type { Translations } from '../i18n';
import type { CMYK, HSL, RGB } from '../types';

export interface MatcherValueRow {
  label: string;
  value: string;
}

interface MatcherViewProps {
  t: Translations;
  hex: string;
  rgb: RGB;
  cmyk: CMYK;
  hsl: HSL;
  /** HEX, RGB, CMYK, LAB, HSL, HSB, OKLCH, already formatted by the host. */
  valueRows: MatcherValueRow[];
  /** Same formats for any colour, so the shown reference can be described too. */
  buildReferenceRows: (hex: string) => MatcherValueRow[];
  analysis: { description: string; usageTips: string[]; psychology: string } | null;
  loadingAi: boolean;
  /** Reference codes appear only after this action; it also loads the notes. */
  showRefMatch: boolean;
  onSearchReference: (referenceCode?: string) => void;
  onHexChange: (hex: string) => void;
  onRgbChange: (channel: keyof RGB, value: number) => void;
  onCmykChange: (channel: keyof CMYK, value: number) => void;
  onHslChange: (channel: keyof HSL, value: number) => void;
  onRandomize: () => void;
  onCopy: (value: string) => void;
  onFeedback: (message: string) => void;
  /** Opens the settings sheet on the libraries. */
  onManageLibraries: () => void;
  /** The code of the reference on screen, so its notes can follow it. */
  onShownReferenceChange: (code: string) => void;
}

/** How many references each book contributes before the rows are grouped. */
const PER_BOOK = 8;
/** Rows on the alternatives list. */
const GROUP_LIMIT = 8;

/**
 * The Matcher: the colour on the left, the reference it matches on the right,
 * then the values, then what the search discovered around it. One card per
 * question, all white on the page, no inverted card.
 */
export const MatcherView: React.FC<MatcherViewProps> = ({
  t,
  hex,
  rgb,
  cmyk,
  hsl,
  valueRows,
  buildReferenceRows,
  analysis,
  loadingAi,
  showRefMatch,
  onSearchReference,
  onHexChange,
  onRgbChange,
  onCmykChange,
  onHslChange,
  onRandomize,
  onCopy,
  onFeedback,
  onManageLibraries,
  onShownReferenceChange
}) => {
  const colorName = getClosestColorName(hex);
  const books = useActiveBooks();
  /** Finishes only exist when an imported library carries them. */
  const allFinishes = useMemo(() => sortFinishes(books.map((book) => book.finish)), [books]);
  const [excludedFinishes, setExcludedFinishes] = useState<string[]>([]);
  const finishes = useMemo(() => allFinishes.filter((finish) => !excludedFinishes.includes(finish)), [allFinishes, excludedFinishes]);
  const [selectedFinish, setSelectedFinish] = useState<string | null>(null);

  // Books without a finish (the open palettes) are never filtered out here:
  // they are switched on and off in the libraries.
  const activeLibraries = useMemo(
    () => books.filter((book) => !book.finish || finishes.includes(book.finish)),
    [books, finishes]
  );

  // One search per book, then the same reference across books collapses into
  // a single row carrying its finishes.
  const groups = useMemo(() => {
    if (!isValidHex(hex) || activeLibraries.length === 0) return [];
    const flat = activeLibraries.flatMap((library) => findReferenceMatches(hex, library.colors, PER_BOOK));
    return groupReferenceMatches(flat, GROUP_LIMIT);
  }, [hex, activeLibraries]);

  const best = groups[0] || null;
  const variant = useMemo(() => {
    if (!best) return null;
    return best.variants.find((item) => item.finish === selectedFinish) || best.variants[0];
  }, [best, selectedFinish]);

  const shownCode = variant ? variant.code : '';
  useEffect(() => {
    onShownReferenceChange(shownCode);
  }, [shownCode, onShownReferenceChange]);

  const referenceRows = useMemo(
    () => (variant ? buildReferenceRows(variant.hex) : []),
    [variant, buildReferenceRows]
  );

  /** Neighbours and harmonic partners read from the book of the shown finish. */
  const readingLibrary = useMemo(() => {
    const bookKey = variant?.reference.finishId;
    const book = activeLibraries.find((library) => library.key === bookKey) || activeLibraries[0];
    return book ? book.colors : [];
  }, [activeLibraries, variant]);

  return (
    <div className="flex flex-col gap-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* The active colour: a large swatch, the hex as the card's numeral. */}
        <Card
          className="lg:col-span-5"
          aria-label={t.color}
          label={t.color}
          actions={
            <>
              <IconButton label={`${t.copy} HEX`} onClick={() => onCopy(hex.toUpperCase())}>
                <Copy aria-hidden="true" />
              </IconButton>
              <IconButton label={t.randomizeColor} onClick={onRandomize}>
                <Shuffle aria-hidden="true" />
              </IconButton>
            </>
          }
        >
          <span
            className="block h-40 lg:h-auto lg:flex-1 lg:min-h-40 w-full rounded-md shadow-hairline"
            style={{ backgroundColor: hex }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1 min-w-0">
            <HexField
              value={hex}
              onCommit={onHexChange}
              parse={parseColorInput}
              className="w-full bg-transparent outline-none rounded-sm focus-visible:shadow-focus text-[34px] md:text-[44px] leading-[1.08] tracking-[-0.02em] font-normal tabular text-foreground"
              maxLength={48}
              placeholder="#F0FF00"
              title="#RRGGBB · rgb() · CSS"
              aria-label={t.inputColor}
            />
            <span className="text-[13px] text-muted-foreground truncate">{colorName}</span>
          </div>
        </Card>

        <BestMatchCard
          className="lg:col-span-7"
          t={t}
          hex={hex}
          best={best}
          variant={variant}
          referenceRows={referenceRows}
          revealed={showRefMatch}
          loading={loadingAi}
          onSearch={() => onSearchReference(variant ? variant.code : undefined)}
          onSelectHex={onHexChange}
          onSelectFinish={setSelectedFinish}
          onCopy={onCopy}
        />

        <ReferenceAlternatives
          className="lg:col-span-12"
          t={t}
          groups={groups}
          finishes={finishes}
          allFinishes={allFinishes}
          revealed={showRefMatch}
          hasLibraries={books.length > 0}
          onFinishesChange={(next) => setExcludedFinishes(allFinishes.filter((finish) => !next.includes(finish)))}
          onManageLibraries={onManageLibraries}
          onSelectHex={onHexChange}
          onCopy={onCopy}
        />

        {/* Every value, then every channel. */}
        <Card className="lg:col-span-4" aria-label={t.visibleColorModels} label={t.visibleColorModels} bodyClassName="gap-0">
          {valueRows.map((item, index, all) => (
            <button
              type="button"
              key={item.label}
              onClick={() => onCopy(item.value)}
              className={`group flex w-full items-center gap-4 text-left min-h-11 transition-colors duration-fast ease-out ${index < all.length - 1 ? 'hairline-b' : ''}`}
              title={`${t.copy} ${item.label}`}
              aria-label={`${t.copy} ${item.label}: ${item.value}`}
            >
              <span className="w-14 shrink-0 text-[14px] text-muted-foreground">{item.label}</span>
              <span className="text-[14px] tabular text-foreground truncate">{item.value}</span>
              <Copy
                className="ml-auto w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-fast ease-out"
                aria-hidden="true"
              />
            </button>
          ))}
        </Card>

        <Card className="lg:col-span-8" aria-label={t.colorChannelsLabel} label={t.colorChannelsLabel}>
          <InfoGrid rgb={rgb} cmyk={cmyk} hsl={hsl} onCmykChange={onCmykChange} onHslChange={onHslChange} onRgbChange={onRgbChange} />
        </Card>

        <AccessibilityCard t={t} hex={hex} onApply={onHexChange} className="lg:col-span-5" />
        <TonalScaleCard t={t} hex={hex} onSelect={onHexChange} onFeedback={onFeedback} className="lg:col-span-7" />
      </div>

      <DiscoveriesPanel
        t={t}
        hex={hex}
        library={readingLibrary}
        best={best}
        showFinishes={allFinishes.length > 0}
        revealed={showRefMatch}
        loading={loadingAi}
        analysis={analysis}
        onSelectHex={onHexChange}
      />
    </div>
  );
};

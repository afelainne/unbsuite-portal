import React, { useMemo } from 'react';
import type { Translations } from '../i18n';
import type { ReferenceColor } from '../types';
import type { ReferenceGroup } from '../utils/reference';
import { deltaVerdict } from '../utils/reference';
import { findHarmonyPartners, findNeighbours, readColor, readPress } from '../utils/discoveries';
import { getClosestColorName } from '../utils/colorMath';
import { disambiguateColorNames } from '../utils/colorNames';
import { Card, LegendDot, Metric, SectionHeading, ValueRow } from './ui';
import {
  familyLabel,
  finishLabelOf,
  harmonyLabel,
  lightnessLabel,
  modifierLabels,
  neighbourLabel,
  saturationLabel,
  temperatureLabel,
  verdictLabel
} from './referenceLabels';

interface DiscoveriesPanelProps {
  t: Translations;
  hex: string;
  /** The book the neighbours and the harmonic partners are read from. */
  library: ReferenceColor[];
  /** Closest reference, already grouped across finishes. */
  best: ReferenceGroup | null;
  revealed: boolean;
  loading: boolean;
  analysis: { description: string; usageTips: string[]; psychology: string } | null;
  onSelectHex: (hex: string) => void;
}


const SwatchItem: React.FC<{
  hex: string;
  title: string;
  caption: string;
  meta?: string;
  onSelect: () => void;
  ariaLabel: string;
}> = ({ hex, title, caption, meta, onSelect, ariaLabel }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-label={ariaLabel}
    className="group flex items-center gap-4 min-w-0 w-full text-left"
  >
    <span className="w-11 h-11 rounded-sm shadow-hairline shrink-0 transition-opacity duration-fast ease-out group-hover:opacity-85" style={{ backgroundColor: hex }} aria-hidden="true" />
    <span className="min-w-0 flex-1 flex flex-col gap-1">
      <span className="text-[14px] tabular text-foreground truncate">{caption}</span>
      <span className="text-[12px] text-muted-foreground truncate">{title}</span>
    </span>
    {meta && <span className="text-[12px] text-muted-foreground tabular shrink-0">{meta}</span>}
  </button>
);

/**
 * What the search found around the colour: what it is, which siblings sit one
 * step to each side, the same reference on other paper, who it harmonizes
 * with and how it behaves on press. A reading, not a data dump.
 */
export const DiscoveriesPanel: React.FC<DiscoveriesPanelProps> = ({
  t,
  hex,
  library,
  best,
  revealed,
  loading,
  analysis,
  onSelectHex
}) => {
  const reading = useMemo(() => readColor(hex), [hex]);
  const press = useMemo(() => readPress(hex), [hex]);
  const neighbours = useMemo(() => (revealed ? findNeighbours(hex, library) : []), [hex, library, revealed]);
  const partners = useMemo(() => findHarmonyPartners(hex, library), [hex, library]);

  const partnerNames = useMemo(() => {
    const items = partners.map((partner) => ({ hex: partner.hex, name: getClosestColorName(partner.hex) }));
    return disambiguateColorNames(items, modifierLabels(t));
  }, [partners, t]);

  const otherFinishes = best ? best.variants.slice(1) : [];

  return (
    <section className="flex flex-col gap-5" aria-label={t.discoveries}>
      <SectionHeading title={t.discoveries} hint={t.discoveriesHint} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* What this colour is */}
        <Card as="article" className="lg:col-span-4" aria-label={t.whatThisColorIs} label={t.whatThisColorIs} bodyClassName="gap-0">
            <ValueRow label={t.familyLabel} value={familyLabel(t, reading.family)} />
            <ValueRow label={t.temperatureLabel} value={temperatureLabel(t, reading.temperature)} />
            <ValueRow label={t.saturation} value={saturationLabel(t, reading.saturation)} />
            <ValueRow label={t.lightness} value={lightnessLabel(t, reading.lightness)} />
            <div className="flex items-end gap-8 pt-5">
              <Metric size="md" value={<>{reading.l.toFixed(1)}</>} caption={<>L*</>} />
              <Metric size="md" value={<>{reading.chroma.toFixed(1)}</>} caption={<>C*</>} />
              <Metric size="md" value={<>{Math.round(reading.hue)}°</>} caption={<>{t.hue}</>} />
            </div>
        </Card>

        {/* On press */}
        <Card as="article" className="lg:col-span-4" aria-label={t.pressTitle} label={t.pressTitle}>
            <div className="flex items-end justify-between gap-4">
              <Metric size="md" value={<>{press.totalInk}%</>} caption={<>{t.totalInk}</>} />
              {!press.withinProcess && (
                <Metric size="md" align="right" value={<>+{press.chromaOverflow.toFixed(1)}</>} caption={<>{t.chromaOverflowLabel}</>} />
              )}
            </div>
            <p className="text-[14px] text-foreground">
              {press.withinProcess ? t.pressWithinProcess : t.pressBeyondProcess}
            </p>
            <p className="text-[14px] text-muted-foreground">{press.heavyInk ? t.pressHeavyInk : t.pressInkOk}</p>
            <p className="text-[13px] tabular text-muted-foreground">
              CMYK {press.cmyk.c}, {press.cmyk.m}, {press.cmyk.y}, {press.cmyk.k}
            </p>
            <p className="text-[12px] text-muted-foreground">{t.pressEstimate}</p>
        </Card>

        {/* Neighbours */}
        <Card as="article" className="lg:col-span-4" aria-label={t.neighboursTitle} label={t.neighboursTitle}>
            <p className="text-[14px] text-muted-foreground">{t.neighboursHint}</p>
            {neighbours.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">{revealed ? t.noReferenceFound : t.analyzeWithAi}</p>
            ) : (
              neighbours.map((neighbour) => (
                <SwatchItem
                  key={neighbour.kind}
                  hex={neighbour.hex}
                  title={neighbourLabel(t, neighbour.kind)}
                  caption={neighbour.code}
                  meta={`ΔE ${neighbour.deltaE.toFixed(1)}`}
                  onSelect={() => onSelectHex(neighbour.hex)}
                  ariaLabel={`${neighbourLabel(t, neighbour.kind)}: ${neighbour.code}`}
                />
              ))
            )}
        </Card>

        {/* The same reference on other paper */}
        <Card as="article" className="lg:col-span-5" aria-label={t.otherFinishesTitle} label={t.otherFinishesTitle}>
            <p className="text-[14px] text-muted-foreground">{t.otherFinishesHint}</p>
            {!revealed || otherFinishes.length === 0 ? (
              <p className="text-[14px] text-muted-foreground">{revealed ? t.noReferenceFound : t.analyzeWithAi}</p>
            ) : (
              otherFinishes.map((variant) => (
                <SwatchItem
                  key={variant.code}
                  hex={variant.hex}
                  title={finishLabelOf(t, variant.finish)}
                  caption={variant.code}
                  meta={`ΔE ${variant.deltaE.toFixed(1)} · ${verdictLabel(t, deltaVerdict(variant.deltaE))}`}
                  onSelect={() => onSelectHex(variant.hex)}
                  ariaLabel={`${finishLabelOf(t, variant.finish)}: ${variant.code}`}
                />
              ))
            )}
        </Card>

        {/* Harmonic partners */}
        <Card as="article" className="lg:col-span-7" aria-label={t.harmonyTitle} label={t.harmonyTitle}>
            <p className="text-[14px] text-muted-foreground">{t.harmonyHint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {partners.map((partner, index) => (
                <SwatchItem
                  key={partner.kind}
                  hex={partner.hex}
                  title={harmonyLabel(t, partner.kind)}
                  caption={revealed && partner.code ? partner.code : partnerNames[index]?.displayName || partner.hex}
                  meta={partner.hex}
                  onSelect={() => onSelectHex(partner.hex)}
                  ariaLabel={`${harmonyLabel(t, partner.kind)}: ${partner.hex}`}
                />
              ))}
            </div>
        </Card>

        {/* Notes for the matched reference */}
        {(loading || analysis) && (
          <Card as="article" className="lg:col-span-12" aria-label={t.usageTitle} aria-live="polite" label={t.usageTitle}>
              {analysis ? (
                <>
                  <p className="text-[16px] leading-[1.5] text-foreground max-w-[70ch]">{analysis.description}</p>
                  <p className="text-[14px] text-muted-foreground">
                    {t.mood}: {analysis.psychology}
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {analysis.usageTips.map((tip) => (
                      <li key={tip} className="flex items-baseline gap-2 text-[14px] text-foreground min-w-0">
                        <span className="w-2 h-2 rounded-pill bg-foreground shrink-0 translate-y-[-1px]" aria-hidden="true" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[14px] text-muted-foreground pulse-dot">{t.thinking}</p>
              )}
          </Card>
        )}
      </div>
    </section>
  );
};

import React, { useMemo } from 'react';
import { Copy } from 'lucide-react';
import type { Translations } from '../i18n';
import type { ReferenceGroup, ReferenceVariant } from '../utils/reference';
import { deltaVerdict } from '../utils/reference';
import { getClosestColorName } from '../utils/colorMath';
import { disambiguateColorNames } from '../utils/colorNames';
import { finishLabelOf, modifierLabels, verdictLabel } from './referenceLabels';
import { Card, IconButton, LegendToggle, Metric, TextTabs, ValueRow } from './ui';

export interface ReferenceValueRow {
  label: string;
  value: string;
}

interface BestMatchCardProps {
  t: Translations;
  hex: string;
  best: ReferenceGroup | null;
  /** The finish currently on screen, chosen from the finish tabs. */
  variant: ReferenceVariant | null;
  /** Values of the shown variant: HEX, RGB, CMYK, LAB… */
  referenceRows: ReferenceValueRow[];
  /** Reference codes stay hidden until the search action runs. */
  revealed: boolean;
  loading: boolean;
  className?: string;
  onSearch: () => void;
  onSelectHex: (hex: string) => void;
  onSelectFinish: (finish: string) => void;
  onCopy: (value: string) => void;
}

/**
 * The colour that was typed beside the reference the books answer with; the
 * distance between them is the card's numeral and its verdict the caption.
 * Every finish of that one reference is a quiet tab.
 */
export const BestMatchCard: React.FC<BestMatchCardProps> = ({
  t,
  hex,
  best,
  variant,
  referenceRows,
  revealed,
  loading,
  className = '',
  onSearch,
  onSelectHex,
  onSelectFinish,
  onCopy
}) => {
  const shown = revealed ? variant : null;

  return (
    <Card
      className={className}
      aria-label={t.bestMatch}
      label={t.bestMatch}
      actions={
        shown ? (
          <IconButton label={`${t.copyCode}: ${shown.code}`} onClick={() => onCopy(shown.code)}>
            <Copy aria-hidden="true" />
          </IconButton>
        ) : (
          /* The one committing action on the screen: the only yellow control. */
          <button type="button" onClick={onSearch} disabled={loading || !best} className="ctl ctl-tinted px-4">
            {loading ? t.thinking : t.analyzeWithAi}
          </button>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="block h-32 md:h-40 w-full rounded-md shadow-hairline" style={{ backgroundColor: hex }} aria-hidden="true" />
          <span className="text-[13px] text-muted-foreground truncate">
            {t.input} <span className="text-foreground tabular">{hex.toUpperCase()}</span>
          </span>
        </div>

        {shown ? (
          <button
            type="button"
            onClick={() => onSelectHex(shown.hex)}
            className="flex flex-col gap-2 min-w-0 text-left group"
            title={`${t.referenceCode} ${shown.code}`}
            aria-label={`${t.referenceCode} ${shown.code} · ${shown.hex}`}
          >
            <span
              className="block h-32 md:h-40 w-full rounded-md shadow-hairline transition-opacity duration-fast ease-out group-hover:opacity-90"
              style={{ backgroundColor: shown.hex }}
              aria-hidden="true"
            />
            <span className="text-[13px] text-muted-foreground truncate">
              {t.referenceCode} <span className="text-foreground tabular">{shown.code}</span>
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 min-w-0">
            <span className="h-32 md:h-40 w-full rounded-md bg-fill-2 flex items-center justify-center text-[13px] text-muted-foreground">
              {t.referencePlaceholder}
            </span>
            <span className="text-[13px] text-muted-foreground truncate">{t.referenceCode} —</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <Metric
          size="lg"
          value={shown ? shown.deltaE.toFixed(2) : '—'}
          caption={shown ? `${t.deltaE00} · ${verdictLabel(t, deltaVerdict(shown.deltaE))}` : `${t.deltaE00} · ${t.matchQuality}`}
        />
        {shown && best && best.variants.length > 1 && (
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-[13px] text-muted-foreground">{t.variantsLabel}</span>
            <TextTabs<string>
              ariaLabel={t.variantsLabel}
              value={shown.finish}
              onChange={onSelectFinish}
              items={best.variants.map((item) => ({
                value: item.finish,
                title: `${finishLabelOf(t, item.finish)} · ΔE ${item.deltaE.toFixed(2)}`,
                label: (
                  <>
                    {item.finish || '—'} <span className="tabular opacity-60">{item.deltaE.toFixed(1)}</span>
                  </>
                )
              }))}
            />
          </div>
        )}
      </div>

      {shown && referenceRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {referenceRows.map((row) => (
            <ValueRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}
    </Card>
  );
};

interface ReferenceAlternativesProps {
  t: Translations;
  groups: ReferenceGroup[];
  finishes: string[];
  allFinishes: string[];
  revealed: boolean;
  className?: string;
  onFinishesChange: (finishes: string[]) => void;
  onSelectHex: (hex: string) => void;
  onCopy: (value: string) => void;
}

/**
 * The alternatives, one row per reference: its finishes are listed inside the
 * row with their own ΔE, so the same reference never shows up four times.
 */
export const ReferenceAlternatives: React.FC<ReferenceAlternativesProps> = ({
  t,
  groups,
  finishes,
  allFinishes,
  revealed,
  className = '',
  onFinishesChange,
  onSelectHex,
  onCopy
}) => {
  const names = useMemo(() => {
    const items = groups.map((group) => ({ hex: group.hex, name: getClosestColorName(group.hex) }));
    return disambiguateColorNames(items, modifierLabels(t));
  }, [groups, t]);

  const toggleFinish = (finish: string) => {
    const next = finishes.includes(finish) ? finishes.filter((item) => item !== finish) : [...finishes, finish];
    // At least one book has to stay in the search.
    onFinishesChange(next.length ? allFinishes.filter((item) => next.includes(item)) : [finish]);
  };

  const allActive = finishes.length === allFinishes.length;

  return (
    <Card className={className} aria-label={t.rankedAlternatives} label={t.rankedAlternatives}>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <p className="text-[14px] text-muted-foreground">{t.alternativesHint}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label={t.variantsLabel}>
          <LegendToggle label={t.finishAll} on={allActive} onClick={() => onFinishesChange(allFinishes)} title={t.finishAll} />
          {allFinishes.map((finish) => (
            <LegendToggle
              key={finish}
              label={finish}
              on={finishes.includes(finish)}
              onClick={() => toggleFinish(finish)}
              title={finishLabelOf(t, finish)}
            />
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">{t.noReferenceFound}</p>
      ) : (
        <ul className="flex flex-col">
          {groups.map((group, index) => (
            <li
              key={group.key}
              className={`flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5 ${index < groups.length - 1 ? 'hairline-b' : ''} ${index === 0 ? 'pt-0' : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelectHex(group.hex)}
                className="w-11 h-11 rounded-sm shadow-hairline shrink-0 transition-opacity duration-fast ease-out hover:opacity-85"
                style={{ backgroundColor: group.hex }}
                title={group.hex}
                aria-label={`${revealed ? group.code : group.hex} · ${group.hex}`}
              />

              <div className="min-w-0 flex-1 basis-0 sm:basis-40 flex flex-col gap-1">
                <span className="text-[16px] tabular text-foreground truncate">{revealed ? group.code : group.hex}</span>
                <span className="text-[12px] text-muted-foreground truncate">{names[index]?.displayName}</span>
              </div>

              {revealed && (
                <div className="order-last basis-full pl-16 sm:order-none sm:basis-auto sm:pl-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                  {group.variants.map((variant) => (
                    <span
                      key={variant.code}
                      className="whitespace-nowrap"
                      title={`${finishLabelOf(t, variant.finish)} · ΔE ${variant.deltaE.toFixed(2)}`}
                    >
                      <span className="text-foreground">{variant.finish || '—'}</span>{' '}
                      <span className="tabular">{variant.deltaE.toFixed(1)}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="ml-auto flex items-center gap-4">
                <Metric size="sm" align="right" value={group.deltaE.toFixed(2)} caption={verdictLabel(t, deltaVerdict(group.deltaE))} />
                {revealed && (
                  <IconButton label={`${t.copyCode}: ${group.code}`} onClick={() => onCopy(group.code)}>
                    <Copy aria-hidden="true" />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

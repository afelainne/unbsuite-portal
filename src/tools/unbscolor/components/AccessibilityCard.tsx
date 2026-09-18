import React, { useEffect, useMemo, useState } from 'react';
import { apcaContrast, bestTextColor, getWcagContrast, suggestAccessibleColor } from '../utils/contrast';
import { isValidHex } from '../utils/colorMath';
import { parseColorInput } from '../utils/parseColorInput';
import { HexField } from './HexField';
import type { Translations } from '../i18n';
import { Card, LegendDot, Metric } from './ui';

interface AccessibilityCardProps {
  t: Translations;
  hex: string;
  onApply: (hex: string) => void;
  className?: string;
}

/** Pass is a filled ink dot, fail a hollow ring: the legend language, no chips. */
const Grade: React.FC<{ label: string; pass: boolean; t: Translations; context: string }> = ({ label, pass, t, context }) => {
  const text = `${context} ${label}: ${pass ? t.pass : t.fail}`;
  return (
    <span title={text} aria-label={text}>
      <LegendDot label={label} hollow={!pass} className={pass ? '' : 'text-muted-foreground'} />
    </span>
  );
};

const ContrastRow: React.FC<{ t: Translations; fg: string; bg: string; label: string; last?: boolean }> = ({ t, fg, bg, label, last }) => {
  const wcag = getWcagContrast(fg, bg);
  if (!wcag) return null;
  const lc = apcaContrast(fg, bg);
  return (
    <div className={`flex flex-col gap-3 py-4 ${last ? 'pb-0' : 'hairline-b'}`}>
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 shrink-0 rounded-sm shadow-hairline flex items-center justify-center text-[16px]"
          style={{ backgroundColor: bg, color: fg }}
          aria-hidden="true"
        >
          Aa
        </div>
        <Metric size="md" value={wcag.display} caption={label} />
        <Metric size="sm" align="right" className="ml-auto" value={Number.isFinite(lc) ? lc.toFixed(1) : '—'} caption={t.apcaLc} />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pl-[3.75rem]">
        <span className="inline-flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground">{t.normalText}</span>
          <Grade t={t} context={t.normalText} label="AA" pass={wcag.aa.normal} />
          <Grade t={t} context={t.normalText} label="AAA" pass={wcag.aaa.normal} />
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground">{t.largeText}</span>
          <Grade t={t} context={t.largeText} label="AA" pass={wcag.aa.large} />
          <Grade t={t} context={t.largeText} label="AAA" pass={wcag.aaa.large} />
        </span>
      </div>
    </div>
  );
};

export const AccessibilityCard: React.FC<AccessibilityCardProps> = ({ t, hex, onApply, className = '' }) => {
  const [customBg, setCustomBg] = useState('#F5F5F5');
  const [suggestion, setSuggestion] = useState<{ value: string | null; requested: boolean }>({ value: null, requested: false });

  // A suggestion is only valid for the pair it was computed for.
  useEffect(() => {
    setSuggestion({ value: null, requested: false });
  }, [hex, customBg]);

  const bestText = useMemo(() => (isValidHex(hex) ? bestTextColor(hex) : '#000000'), [hex]);

  if (!isValidHex(hex)) return null;

  const suggestionIsSame = suggestion.value !== null && suggestion.value.toUpperCase() === hex.toUpperCase();
  const suggestionRatio = suggestion.value ? getWcagContrast(suggestion.value, customBg) : null;

  return (
    <Card
      className={className}
      aria-labelledby="unbscolor-a11y-title"
      label={<span id="unbscolor-a11y-title">{t.accessibility}</span>}
      actions={
        /* Sample of the colour as a background: data, so it keeps the colour. */
        <span
          className="inline-flex items-center gap-2 h-8 px-3 rounded-sm shadow-hairline text-[12px]"
          style={{ backgroundColor: hex, color: bestText }}
          title={t.bestTextColor}
          aria-label={`${t.bestTextColor}: ${bestText}`}
        >
          Aa
          <span className="tabular">{bestText}</span>
        </span>
      }
      bodyClassName="gap-0"
    >
      <ContrastRow t={t} fg={hex} bg="#FFFFFF" label={t.onWhite} />
      <ContrastRow t={t} fg={hex} bg="#000000" label={t.onBlack} />
      <ContrastRow t={t} fg={hex} bg={customBg} label={t.customBackground} last />

      <div className="mt-6 flex flex-col gap-3">
        <label className="text-[14px] text-muted-foreground" htmlFor="unbscolor-a11y-bg">{t.customBackground}</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={customBg}
            onChange={(e) => {
              const parsed = parseColorInput(e.target.value);
              if (parsed) setCustomBg(parsed);
            }}
            className="w-10 h-10 shrink-0 cursor-pointer rounded-md"
            style={{ appearance: 'none', WebkitAppearance: 'none', padding: 0, background: 'transparent' }}
            aria-label={t.customBackground}
          />
          <HexField
            id="unbscolor-a11y-bg"
            value={customBg}
            onCommit={setCustomBg}
            parse={parseColorInput}
            className="field h-10 w-32 tabular"
            aria-label={`${t.customBackground} hex`}
          />
          <button
            type="button"
            className="ctl ctl-outline h-10 px-4"
            onClick={() => setSuggestion({ value: suggestAccessibleColor(hex, customBg), requested: true })}
          >
            {t.suggestAccessibleColor}
          </button>
        </div>
      </div>

      {suggestion.requested && (
        <div className="mt-5 pt-5 hairline-t flex flex-wrap items-center gap-4 fade-in-up" role="status">
          {suggestion.value === null ? (
            <span className="text-[14px] text-foreground">{t.noAccessibleColor}</span>
          ) : suggestionIsSame ? (
            <span className="text-[14px] text-muted-foreground">{t.alreadyAccessible}</span>
          ) : (
            <>
              <span
                className="inline-flex items-center justify-center w-11 h-11 rounded-sm shadow-hairline text-[16px]"
                style={{ backgroundColor: customBg, color: suggestion.value }}
                aria-hidden="true"
              >
                Aa
              </span>
              <Metric
                size="sm"
                value={suggestion.value}
                caption={suggestionRatio ? `${t.suggestion} · ${suggestionRatio.display}` : t.suggestion}
              />
              <button type="button" className="ctl ctl-filled h-10 px-4 ml-auto" onClick={() => suggestion.value && onApply(suggestion.value)}>
                {t.applySuggestion}
              </button>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

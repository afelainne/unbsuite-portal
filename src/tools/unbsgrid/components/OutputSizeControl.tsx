import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Slider } from './ui/slider';
import InfoTooltip from './InfoTooltip';
import { useLanguage, fill } from '../i18n';

/** Longest side (px) the logo gets when a scene is generated for export. */
export type LogoSizeOption = 512 | 1024 | 2048 | 4096 | 'original';

export const LOGO_SIZE_OPTIONS: LogoSizeOption[] = [512, 1024, 2048, 4096, 'original'];

export const DEFAULT_LOGO_SIZE: LogoSizeOption = 1024;
export const DEFAULT_GUIDE_SCALE = 1;
export const GUIDE_SCALE_MIN = 0.5;
export const GUIDE_SCALE_MAX = 3;
export const GUIDE_SCALE_STEP = 0.1;

/**
 * Resolve the option to a px value. "original" uses the SVG's own longest
 * side, so a 4000px artwork exports at 4000px instead of being squeezed into
 * the default.
 */
export function resolveLogoSize(option: LogoSizeOption, originalLongestSide: number | null): number {
  if (option !== 'original') return option;
  const side = Math.round(originalLongestSide ?? 0);
  return side > 0 ? Math.max(16, Math.min(20000, side)) : 1024;
}

interface Props {
  logoSizeOption: LogoSizeOption;
  onLogoSizeOptionChange: (option: LogoSizeOption) => void;
  /** Longest side of the loaded SVG, in its own units (null when nothing is loaded). */
  originalLongestSide: number | null;
  /** Estimated size of the exported scene, e.g. "≈ 1024 × 683 px". */
  estimate?: string | null;
  guideScale: number;
  onGuideScaleChange: (value: number) => void;
  disabled?: boolean;
}

const OutputSizeControl: React.FC<Props> = ({
  logoSizeOption, onLogoSizeOptionChange, originalLongestSide, estimate,
  guideScale, onGuideScaleChange, disabled,
}) => {
  const { t } = useLanguage();
  const o = t.outputSize;
  const originalPx = originalLongestSide ? Math.round(originalLongestSide) : null;
  const isDefaultScale = Math.abs(guideScale - DEFAULT_GUIDE_SCALE) < 1e-6;

  const optionLabel = (option: LogoSizeOption) =>
    option === 'original' ? (originalPx ? fill(o.original, { px: originalPx }) : o.originalEmpty) : `${option} px`;

  return (
    <section className="pb-6">
      <div className="flex h-11 items-center gap-1">
        <span className="label text-foreground flex-1 truncate">{o.title}</span>
        <InfoTooltip content={o.hint} />
      </div>

      <span className="label block mb-2">{o.logoSize}</span>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label={o.logoSizeAria}>
        {LOGO_SIZE_OPTIONS.map(option => {
          const isActive = logoSizeOption === option;
          return (
            <button
              key={String(option)}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => onLogoSizeOptionChange(option)}
              className={`ctl ctl-sm justify-center ${option === 'original' ? 'col-span-2' : ''} ${isActive ? 'ctl-active' : 'ctl-plain text-muted-foreground hover:text-foreground'}`}
              title={option === 'original' ? o.originalHint : fill(o.sizeHint, { size: option })}
            >
              {optionLabel(option)}
            </button>
          );
        })}
      </div>
      {estimate && (
        <p className="text-footnote text-muted-foreground tabular-nums mt-2">{estimate}</p>
      )}

      <div className="flex items-center gap-1.5 mt-5 mb-2">
        <span className="label">{o.guideScale}</span>
        <span className="text-value text-foreground ml-auto">{guideScale.toFixed(1)}×</span>
        <button
          type="button"
          onClick={() => onGuideScaleChange(DEFAULT_GUIDE_SCALE)}
          disabled={isDefaultScale}
          className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
          title={o.guideScaleReset}
          aria-label={o.guideScaleResetAria}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <Slider
        min={GUIDE_SCALE_MIN * 10}
        max={GUIDE_SCALE_MAX * 10}
        step={GUIDE_SCALE_STEP * 10}
        value={[Math.round(guideScale * 10)]}
        onValueChange={(v) => onGuideScaleChange(v[0] / 10)}
        aria-label={o.guideScaleAria}
        className="w-full"
      />
    </section>
  );
};

export default OutputSizeControl;

/**
 * Minimum size: the smallest reproduction where the logo still reads.
 *
 * The limit is never the logo's own box — it is the first feature that breaks:
 * the thinnest stem (it greys out, or disappears under dot gain) and the
 * narrowest counter / gap (it fills in). Both are measured on the artwork by
 * `lib/clearspace.ts` (`minStrokeWidth`, `minGap`), so this module only has to
 * turn "this stem must stay at least X" into "the logo must be at least Y
 * wide", separately for screen and for print.
 *
 * Every threshold below is a constant with its reasoning written down, so a
 * studio that prints on kraft or embroiders can raise them knowingly instead
 * of guessing.
 */
import { activeT } from '../i18n/runtime';
import { fill, type FillVars } from '../i18n/format';
import type { Translations } from '../i18n/types';
import {
  MM_PER_INCH, DEFAULT_SCREEN_DPI, DEFAULT_PRINT_DPI,
  mmToPx, pxToMm, formatNumber,
  type ReferenceUnits,
} from './clearspace';

export type MinSizeMediumKind = 'screen' | 'print';

export interface MinSizeLimits {
  /**
   * Thinnest stem on screen, in CSS px at 1×.
   *
   * Below ~1px a stem no longer covers a whole device pixel: anti-aliasing
   * turns it into a grey smear whose weight changes with sub-pixel position,
   * so the logo flickers between sizes. 1.5px keeps a solid core pixel plus
   * some coverage on the neighbour, which survives both 1× and 2× displays.
   */
  screenStrokePx: number;
  /**
   * Narrowest counter on screen, in CSS px at 1×. A gap needs more room than a
   * stem because it is squeezed from both sides by the anti-aliasing of the
   * two shapes around it; under ~2px the counter visually closes.
   */
  screenGapPx: number;
  /**
   * Thinnest stem in print, in mm. Commercial offset at 150 lpi holds a
   * 0.2mm (≈0.57pt) line; thinner rules break up on uncoated stock and
   * disappear on newsprint.
   */
  printStrokeMm: number;
  /**
   * Narrowest counter in print, in mm. Dot gain thickens ink towards the gap
   * from both sides, so a counter closes earlier than a line breaks: 0.3mm is
   * the usual safe floor for coated offset.
   */
  printGapMm: number;
}

export const DEFAULT_MIN_SIZE_LIMITS: MinSizeLimits = {
  screenStrokePx: 1.5,
  screenGapPx: 2,
  printStrokeMm: 0.2,
  printGapMm: 0.3,
};

/** Harsher substrates: silkscreen, embroidery, engraving, newsprint. */
export const ROUGH_MIN_SIZE_LIMITS: MinSizeLimits = {
  screenStrokePx: 2,
  screenGapPx: 3,
  printStrokeMm: 0.5,
  printGapMm: 0.8,
};

export type MinSizeLimitedBy = 'stroke' | 'gap' | 'none';

export interface MinSizeMedium {
  medium: MinSizeMediumKind;
  /** Minimum size of the LOGO box. */
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  /** Output units per drawing unit at the minimum (px per unit on screen, mm per unit in print). */
  scale: number;
  /** Which feature sets the limit. */
  limitedBy: MinSizeLimitedBy;
  /** Size of the thinnest stem at the minimum, in the medium's own unit. */
  strokeAt: number;
  /** Size of the narrowest gap at the minimum, or null when the logo has none. */
  gapAt: number | null;
  /** Raster density used for the mm <-> px cross conversion. */
  dpi: number;
}

export interface MinSizeResult {
  screen: MinSizeMedium;
  print: MinSizeMedium;
  units: ReferenceUnits;
  limits: MinSizeLimits;
  warnings: string[];
  /** false when the artwork could not be measured; every number is then 0. */
  valid: boolean;
}

export interface MinSizeOptions {
  limits?: Partial<MinSizeLimits>;
  /** Screen density used to express the screen minimum in mm (default 96). */
  screenDpi?: number;
  /** Print raster used to express the print minimum in px (default 300). */
  printDpi?: number;
}

function resolveLimits(partial?: Partial<MinSizeLimits>): MinSizeLimits {
  const base = DEFAULT_MIN_SIZE_LIMITS;
  const pick = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
  return {
    screenStrokePx: pick(partial?.screenStrokePx, base.screenStrokePx),
    screenGapPx: pick(partial?.screenGapPx, base.screenGapPx),
    printStrokeMm: pick(partial?.printStrokeMm, base.printStrokeMm),
    printGapMm: pick(partial?.printGapMm, base.printGapMm),
  };
}

const emptyMedium = (medium: MinSizeMediumKind, dpi: number): MinSizeMedium => ({
  medium, widthPx: 0, heightPx: 0, widthMm: 0, heightMm: 0,
  scale: 0, limitedBy: 'none', strokeAt: 0, gapAt: null, dpi,
});

/**
 * Smallest reproduction of the logo, for screen and for print.
 *
 * The maths is one division per constraint: if the thinnest stem measures
 * `minStrokeWidth` drawing units and must come out at `limit` output units,
 * the whole drawing has to be scaled by `limit / minStrokeWidth`. The binding
 * constraint is whichever of stem / gap demands the larger scale.
 */
export function computeMinSize(units: ReferenceUnits, options: MinSizeOptions = {}): MinSizeResult {
  const limits = resolveLimits(options.limits);
  const screenDpi = options.screenDpi && options.screenDpi > 0 ? options.screenDpi : DEFAULT_SCREEN_DPI;
  const printDpi = options.printDpi && options.printDpi > 0 ? options.printDpi : DEFAULT_PRINT_DPI;
  const warnings: string[] = [];

  const stroke = units?.minStrokeWidth ?? 0;
  const gap = units?.minGap ?? null;
  const w = units?.logoWidth ?? 0;
  const h = units?.logoHeight ?? 0;

  if (!units?.measured || !(stroke > 0) || !(w > 0) || !(h > 0)) {
    return {
      screen: emptyMedium('screen', screenDpi),
      print: emptyMedium('print', printDpi),
      units,
      limits,
      warnings: [tr('warningNoMeasures')],
      valid: false,
    };
  }
  if (gap === null) {
    warnings.push(tr('warningNoGaps'));
  }

  const build = (medium: MinSizeMediumKind, strokeLimit: number, gapLimit: number): MinSizeMedium => {
    const strokeScale = strokeLimit / stroke;
    const gapScale = gap !== null && gap > 0 ? gapLimit / gap : 0;
    const scale = Math.max(strokeScale, gapScale);
    const limitedBy: MinSizeLimitedBy = gapScale > strokeScale ? 'gap' : 'stroke';
    const width = w * scale;
    const height = h * scale;
    if (medium === 'screen') {
      return {
        medium, scale, limitedBy,
        widthPx: width, heightPx: height,
        widthMm: pxToMm(width, screenDpi), heightMm: pxToMm(height, screenDpi),
        strokeAt: stroke * scale,
        gapAt: gap !== null ? gap * scale : null,
        dpi: screenDpi,
      };
    }
    return {
      medium, scale, limitedBy,
      widthMm: width, heightMm: height,
      widthPx: mmToPx(width, printDpi), heightPx: mmToPx(height, printDpi),
      strokeAt: stroke * scale,
      gapAt: gap !== null ? gap * scale : null,
      dpi: printDpi,
    };
  };

  return {
    screen: build('screen', limits.screenStrokePx, limits.screenGapPx),
    print: build('print', limits.printStrokeMm, limits.printGapMm),
    units,
    limits,
    warnings,
    valid: true,
  };
}

// ---------------------------------------------------------------------------
// Preview strip
// ---------------------------------------------------------------------------

/** Sizes a designer actually specifies; the strip snaps onto this ladder. */
export const NICE_PX_STEPS: readonly number[] = [
  12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256, 320, 384, 512,
];
/** Millimetre ladder for the print strip (favicon → letterhead → sign). */
export const NICE_MM_STEPS: readonly number[] = [
  4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200,
];

export interface PreviewStep {
  /** Stable React key. */
  key: string;
  /** "24 px", "18,4 px (mínimo)", "40 mm"… */
  label: string;
  /** Logo width in the medium's own unit (px on screen, mm in print). */
  size: number;
  /** Always in px, for rendering the thumbnail. */
  widthPx: number;
  heightPx: number;
  /** size / minimum. 1 = exactly at the limit. */
  ratio: number;
  /** false when the step is below the computed minimum. */
  ok: boolean;
  /** true for the entry that marks the minimum itself. */
  isMinimum: boolean;
  /** Thinnest stem at this step, in the medium's own unit. */
  strokeAt: number;
  /** Narrowest gap at this step, or null. */
  gapAt: number | null;
}

export interface PreviewStripOptions {
  medium?: MinSizeMediumKind;
  /** Steps above the minimum (default 4). */
  above?: number;
  /** Steps below the minimum, shown as failing (default 1). */
  below?: number;
  /** Override the ladder entirely (values in the medium's own unit). */
  steps?: number[];
  /** Thumbnail width (px) used for the print strip, where `size` is in mm. */
  printPreviewDpi?: number;
}

/**
 * The strip of sizes shown under the logo: a couple of steps below the
 * minimum (marked as failing), the exact minimum, then the usual ladder above
 * it. Pure and deterministic, so the panel can render it without state.
 */
export function buildPreviewStrip(result: MinSizeResult, options: PreviewStripOptions = {}): PreviewStep[] {
  const medium: MinSizeMediumKind = options.medium === 'print' ? 'print' : 'screen';
  const info = medium === 'print' ? result.print : result.screen;
  if (!result.valid || !(info.scale > 0)) return [];

  const minSize = medium === 'print' ? info.widthMm : info.widthPx;
  const unitLabel = medium === 'print' ? 'mm' : 'px';
  const digits = medium === 'print' ? 1 : 0;
  const ladder = options.steps?.length
    ? [...options.steps].filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b)
    : [...(medium === 'print' ? NICE_MM_STEPS : NICE_PX_STEPS)];

  const above = Math.max(0, Math.round(options.above ?? 4));
  const below = Math.max(0, Math.round(options.below ?? 1));
  const smaller = ladder.filter(v => v < minSize).slice(-below);
  const larger = ladder.filter(v => v > minSize).slice(0, above);

  const aspect = info.widthPx > 0 ? info.heightPx / info.widthPx : 1;
  const previewDpi = options.printPreviewDpi && options.printPreviewDpi > 0
    ? options.printPreviewDpi
    : DEFAULT_SCREEN_DPI;

  const toPx = (size: number) => medium === 'print' ? mmToPx(size, previewDpi) : size;

  const make = (size: number, isMinimum: boolean): PreviewStep => {
    const ratio = minSize > 0 ? size / minSize : 0;
    const widthPx = toPx(size);
    return {
      key: `${medium}-${isMinimum ? 'min' : formatNumber(size, 2)}`,
      label: isMinimum
        ? tr('minimumSuffix', { value: formatNumber(size, digits === 0 ? 1 : digits), unit: unitLabel })
        : `${formatNumber(size, digits)} ${unitLabel}`,
      size,
      widthPx,
      heightPx: widthPx * aspect,
      ratio,
      ok: ratio >= 1 - 1e-9,
      isMinimum,
      strokeAt: info.strokeAt * ratio,
      gapAt: info.gapAt !== null ? info.gapAt * ratio : null,
    };
  };

  return [
    ...smaller.map(v => make(v, false)),
    make(minSize, true),
    ...larger.map(v => make(v, false)),
  ];
}

// ---------------------------------------------------------------------------
// Manual-ready text (pt-BR)
// ---------------------------------------------------------------------------

export interface MinSizeTextOptions {
  logoName?: string;
  /** Round the published numbers up to the next ladder step (what a manual does). */
  roundUp?: boolean;
}

/** Next ladder value at or above `size`, so the manual publishes a clean number. */
export function roundUpToStep(size: number, ladder: readonly number[]): number {
  for (const v of ladder) if (v >= size - 1e-9) return v;
  return Math.ceil(size);
}

type MinSizeKey = keyof Translations['minSize'];
/** A minimum-size message in the active language. */
function tr(key: MinSizeKey, vars?: FillVars): string { return fill(activeT().minSize[key], vars); }

const LIMITED_BY_KEY: Record<MinSizeLimitedBy, MinSizeKey> = {
  stroke: 'manualReasonStroke',
  gap: 'manualReasonGap',
  none: 'manualReasonNone',
};

export function minSizeManualText(result: MinSizeResult, options: MinSizeTextOptions = {}): string {
  const name = options.logoName?.trim() || tr('manualDefaultName');
  if (!result.valid) {
    return `${tr('manualHeading')}\n\n${tr('manualNotMeasured', { name })}`;
  }
  const roundUp = options.roundUp ?? true;
  const screenPx = roundUp ? roundUpToStep(result.screen.widthPx, NICE_PX_STEPS) : result.screen.widthPx;
  const printMm = roundUp ? roundUpToStep(result.print.widthMm, NICE_MM_STEPS) : result.print.widthMm;

  const lines: string[] = [tr('manualHeading'), ''];
  lines.push(tr('manualScreen', { name, value: formatNumber(screenPx, 0) }));
  lines.push(tr('manualPrint', { name, value: formatNumber(printMm, 1) }));
  lines.push('');
  lines.push(tr('manualLimit', {
    reason: tr(LIMITED_BY_KEY[result.screen.limitedBy]),
    px: formatNumber(result.limits.screenStrokePx, 2),
    mm: formatNumber(result.limits.printStrokeMm, 2),
  }));
  lines.push(tr('manualSmaller', { name }));
  return lines.join('\n');
}

/** Convenience for the panel header: "≥ 24 px · ≥ 8 mm". */
export function minSizeSummary(result: MinSizeResult, roundUp = true): string {
  if (!result.valid) return '—';
  const px = roundUp ? roundUpToStep(result.screen.widthPx, NICE_PX_STEPS) : result.screen.widthPx;
  const mm = roundUp ? roundUpToStep(result.print.widthMm, NICE_MM_STEPS) : result.print.widthMm;
  return tr('summary', { px: formatNumber(px, 0), mm: formatNumber(mm, 1) });
}

/** Re-exported so panels do not have to import two modules for one constant. */
export { MM_PER_INCH, DEFAULT_SCREEN_DPI, DEFAULT_PRINT_DPI };

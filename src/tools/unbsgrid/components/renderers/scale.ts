/**
 * Guide metrics: every decorative length a renderer draws (stroke width, dash
 * pattern, label size, dot radius, arrow head, tick length) must be a function
 * of how big the logo is on screen — never a fixed pixel number.
 *
 * Why: the same renderer code draws the 600px preview and a 4096px export.
 * With hardcoded `strokeWidth = 1` and `fontSize = 9`, a large export gets
 * invisible hairlines and ant-sized labels, and a tiny one gets guides that
 * bury the logo. Expressing them in guide units keeps the drawing looking
 * identical at any output size.
 *
 * One guide unit ≈ 1px when the logo's bounding-box diagonal is REFERENCE px.
 * So `m.stroke(1)` is a 1px hairline on a typical preview and grows
 * proportionally when the scene is rendered larger.
 */
import paper from 'paper';

/** Diagonal (px) at which one guide unit equals one pixel. */
export const REFERENCE_DIAGONAL = 1000;

export interface GuideMetrics {
  /** Canvas px per guide unit. */
  readonly unit: number;
  /** Bounding-box diagonal the metrics were derived from (px). */
  readonly reference: number;
  /** User multiplier (UI: "guide scale"). */
  readonly guideScale: number;
  /** Generic length in guide units → px. */
  len(units: number): number;
  /** Stroke width in guide units → px (never 0, so lines stay visible). */
  stroke(units?: number): number;
  /** Dash pattern in guide units → px. */
  dash(...pattern: number[]): number[];
  /** Label size in guide units → px (clamped so text stays readable). */
  font(units?: number): number;
  /** Dot / handle radius in guide units → px. */
  dot(units?: number): number;
}

export interface GuideMetricsOptions {
  /** User-facing multiplier for all guide weights (default 1). */
  guideScale?: number;
  /** Override the reference length instead of using the bounds diagonal. */
  reference?: number;
  /** Smallest stroke in px, so guides never vanish on screen (default 0.4). */
  minStroke?: number;
  /** Smallest label size in px (default 7). */
  minFont?: number;
}

export interface RectLike {
  width: number;
  height: number;
}

function diagonalOf(rect: RectLike | null | undefined): number {
  const w = rect && Number.isFinite(rect.width) ? Math.abs(rect.width) : 0;
  const h = rect && Number.isFinite(rect.height) ? Math.abs(rect.height) : 0;
  const d = Math.hypot(w, h);
  return d > 0 ? d : REFERENCE_DIAGONAL;
}

/**
 * Build metrics from the logo bounds (scene space, already scaled).
 * `createGuideMetrics(bounds)` on a 1000px-diagonal logo returns unit = 1.
 */
export function createGuideMetrics(
  bounds: RectLike | null | undefined,
  options: GuideMetricsOptions = {},
): GuideMetrics {
  const reference = Number.isFinite(options.reference) && (options.reference as number) > 0
    ? (options.reference as number)
    : diagonalOf(bounds);
  const guideScale = Number.isFinite(options.guideScale) && (options.guideScale as number) > 0
    ? (options.guideScale as number)
    : 1;
  const minStroke = Number.isFinite(options.minStroke) ? (options.minStroke as number) : 0.4;
  const minFont = Number.isFinite(options.minFont) ? (options.minFont as number) : 7;
  const unit = (reference / REFERENCE_DIAGONAL) * guideScale;

  const len = (units: number) => (Number.isFinite(units) ? units * unit : 0);

  return {
    unit,
    reference,
    guideScale,
    len,
    stroke(units = 1) {
      return Math.max(minStroke, len(units));
    },
    dash(...pattern: number[]) {
      return pattern.map(v => Math.max(0.5, len(v)));
    },
    font(units = 9) {
      return Math.max(minFont, len(units));
    },
    dot(units = 3) {
      return Math.max(0.5, len(units));
    },
  };
}

/** Metrics for code paths that have no bounds yet (1 unit = 1px). */
export const IDENTITY_METRICS: GuideMetrics = createGuideMetrics({ width: REFERENCE_DIAGONAL, height: 0 });

/**
 * Renderers take `context.metrics` when the pipeline provides it and fall
 * back to deriving from their own bounds, so a renderer called directly
 * (tests, older call sites) still scales correctly.
 */
export function metricsFor(
  context: { metrics?: GuideMetrics } | undefined,
  bounds: RectLike | paper.Rectangle | null | undefined,
): GuideMetrics {
  return context?.metrics ?? createGuideMetrics(bounds as RectLike | null);
}

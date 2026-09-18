import * as React from 'react';

/**
 * A number and its caption. The number always uses the display font at regular
 * weight with tabular figures and tight leading; the caption is 14px muted and
 * sits UNDER the number, never above it.
 *
 * @startingPoint section="Data" subtitle="Hero, large, medium and small metric readouts" viewport="700x220"
 */
export interface MetricBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  /** Muted caption below the number, e.g. "Exports". */
  caption?: React.ReactNode;
  /** Currency or unit glyph rendered tight against the value. */
  prefix?: React.ReactNode;
  /** Pill shown to the right of the number, e.g. "+32%". */
  delta?: React.ReactNode;
  /** @default "accent" */
  deltaTone?: 'accent' | 'invert';
  /** hero 88px / lg 44px / md 36px / sm 24px. @default "md" */
  size?: 'hero' | 'lg' | 'md' | 'sm';
  /** @default "left" */
  align?: 'left' | 'center';
}
export function MetricBlock(props: MetricBlockProps): JSX.Element;

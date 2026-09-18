import * as React from 'react';

/**
 * Half-circle progress arc — the "insight" / score visual. 5px round-capped
 * stroke, light-gray track, black or mint fill. Left-to-right always means
 * before-to-after.
 */
export interface GaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  /** @default 100 */
  max?: number;
  /** Outer diameter in px. @default 200 */
  size?: number;
  /** Stroke width in px. @default 5 */
  thickness?: number;
  /** @default "ink" */
  tone?: 'ink' | 'accent';
  /** Big number under the arc. */
  label?: React.ReactNode;
  /** Muted caption under the label. */
  caption?: React.ReactNode;
}
export function Gauge(props: GaugeProps): JSX.Element;

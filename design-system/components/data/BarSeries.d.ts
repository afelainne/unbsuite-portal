import * as React from 'react';

/**
 * Dense hairline bar chart — the system's signature data texture: many 1-3px
 * bars, no axes, no gridlines, no tooltips of their own. Feed it 40-120 values.
 */
export interface BarDatum { value: number; label?: string; tone?: 'ink' | 'gray' | 'accent' }
export interface BarSeriesProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Array<BarDatum | number>;
  /** Chart height in px. @default 120 */
  height?: number;
  /** px gap between bars. @default 2 */
  gap?: number;
  /** Default bar colour. @default "ink" */
  tone?: 'ink' | 'gray' | 'accent';
  /** Paints one bar mint to mark the focused period. @default -1 */
  highlightIndex?: number;
  /** Fixed bar width in px; omit to let bars flex. */
  barWidth?: number;
  /** 6px corner radius on each bar. @default false */
  rounded?: boolean;
  /** Draws a 1px hairline under the plot. @default false */
  baseline?: boolean;
}
export function BarSeries(props: BarSeriesProps): JSX.Element;

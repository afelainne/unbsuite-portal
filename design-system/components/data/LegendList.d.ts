import * as React from 'react';

/**
 * Chart legend: 9px colour dot, label, optional value. Laid out on a grid so
 * two-by-two legends line up exactly, as they do in the source dashboard cards.
 */
export interface LegendItem { label: string; color?: string; value?: React.ReactNode }
export interface LegendListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: LegendItem[];
  /** @default 2 */
  columns?: number;
}
export function LegendList(props: LegendListProps): JSX.Element;

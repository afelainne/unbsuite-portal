import * as React from 'react';

/**
 * Horizontal radio row used to pick which data series a chart shows. Selected =
 * filled dot in the series colour; unselected = 1.5px ring. No pills, no boxes.
 */
export interface SeriesOption {
  value: string;
  label: string;
  /** Fill colour of the dot when selected. @default "var(--ink-900)" */
  color?: string;
}
export interface SeriesToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  options: Array<SeriesOption | string>;
  value?: string;
  onChange?: (value: string) => void;
  /** CSS gap between options. @default "var(--space-5)" */
  gap?: string;
}
export function SeriesToggle(props: SeriesToggleProps): JSX.Element;

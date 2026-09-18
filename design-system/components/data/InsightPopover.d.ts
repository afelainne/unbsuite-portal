import * as React from 'react';

/**
 * The floating explanation that sits over a chart: a number, a mint delta pill,
 * one sentence of plain-language cause, and an x. Translucent with a 14px blur
 * so the chart texture stays readable underneath.
 */
export interface InsightPopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Headline figure, e.g. "115k". */
  value?: React.ReactNode;
  /** Delta pill, e.g. "+32%". */
  delta?: React.ReactNode;
  /** @default "accent" */
  deltaTone?: 'accent' | 'invert';
  /** One sentence of explanation. */
  children?: React.ReactNode;
  /** Shows the x affordance when provided. */
  onDismiss?: () => void;
  /** "dark" over inverted surfaces. @default "light" */
  tone?: 'light' | 'dark';
}
export function InsightPopover(props: InsightPopoverProps): JSX.Element;

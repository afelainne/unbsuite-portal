import * as React from 'react';

/**
 * Suggested-prompt chip. 32px tall, 10px radius. The light tone sits on the page
 * or a card; the dark tone sits on the black command bar.
 */
export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** @default "light" */
  tone?: 'light' | 'dark';
  /** Phosphor icon class rendered before the label. */
  icon?: string;
  /** Renders the trailing 20px mint "+" affordance and calls this on click. */
  onAdd?: (e: React.MouseEvent) => void;
}
export function Chip(props: ChipProps): JSX.Element;

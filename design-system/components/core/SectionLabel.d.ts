import * as React from 'react';

/**
 * Dot plus uppercase tracked label. This is the brand's section marker — every
 * major block on a marketing page or case study opens with one.
 */
export interface SectionLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** Dot colour. @default "accent" */
  tone?: 'accent' | 'ink' | 'muted';
  /** @default "md" */
  size?: 'sm' | 'md';
}
export function SectionLabel(props: SectionLabelProps): JSX.Element;

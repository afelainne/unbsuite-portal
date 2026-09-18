import * as React from 'react';

/**
 * 22px pill for deltas, counts and plan flags. Mint is the default because in
 * this system a badge almost always means "this number moved in a good way".
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  /** @default "accent" */
  tone?: 'accent' | 'invert' | 'neutral' | 'outline' | 'quiet';
  /** Leading 6px dot in the current text colour. */
  dot?: boolean;
}
export function Badge(props: BadgeProps): JSX.Element;

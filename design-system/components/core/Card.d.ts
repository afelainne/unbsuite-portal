import * as React from 'react';

/**
 * The system's one container. 16px radius, 24px padding, hairline plus a barely
 * visible shadow. The optional header is always an uppercase tracked micro label
 * on the left with icon actions on the right.
 *
 * @startingPoint section="Core" subtitle="Raised, quiet, inset and invert card shells" viewport="700x300"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Uppercase micro label in the header. */
  label?: React.ReactNode;
  /** Right-aligned header actions — usually two size-sm IconButtons. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** @default "raised" */
  tone?: 'raised' | 'quiet' | 'inset' | 'invert';
  /** CSS padding override. @default "var(--pad-card)" */
  padding?: string;
  /** CSS radius override. @default "var(--radius-lg)" */
  radius?: string;
  /** true for a mint status dot before the label, or any CSS colour string. */
  dot?: boolean | string;
}
export function Card(props: CardProps): JSX.Element;

import * as React from 'react';

/**
 * Primary text action. Mint = the one committing action on a view; invert (black)
 * = a peer action or an action on a light card; secondary = white pill with a
 * hairline; ghost = tertiary/inline.
 *
 * @startingPoint section="Core" subtitle="Mint, invert, secondary and ghost actions in three sizes" viewport="700x200"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  /** Visual weight. @default "primary" */
  variant?: 'primary' | 'invert' | 'secondary' | 'ghost';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Phosphor icon class placed before the label, e.g. "ph ph-plus". */
  icon?: string;
  /** Phosphor icon class placed after the label. */
  iconAfter?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}
export function Button(props: ButtonProps): JSX.Element;

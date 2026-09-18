import * as React from 'react';

/**
 * Square glyph-only control. 52px is the canonical size used by the workspace
 * nav rail and header cluster (18px glyph inside); 40/32px for dense toolbars.
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Phosphor icon class, e.g. "ph-fill ph-house". */
  icon?: string;
  /** Accessible name — required, rendered as aria-label + title. */
  label: string;
  /** @default "md" (sm 32 / md 40 / lg 52) */
  size?: 'sm' | 'md' | 'lg';
  /** @default "surface" */
  variant?: 'surface' | 'quiet' | 'invert' | 'accent';
  /** Selected state — forces the invert (black) skin. */
  active?: boolean;
  /** Mint dot in the top-right corner. */
  badge?: boolean;
  disabled?: boolean;
}
export function IconButton(props: IconButtonProps): JSX.Element;

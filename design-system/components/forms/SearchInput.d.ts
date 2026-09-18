import * as React from 'react';

/**
 * The system's only text field. Search is the canonical use; pass a different
 * placeholder for any other single-line input. Focus is a 1px black inset ring,
 * never a glow.
 */
export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Splits the magnifier into its own square button, as in the workspace header. */
  detached?: boolean;
  /** "dark" for use inside the black command bar. @default "light" */
  tone?: 'light' | 'dark';
  /** Node rendered at the right edge inside the field. */
  trailing?: React.ReactNode;
}
export function SearchInput(props: SearchInputProps): JSX.Element;

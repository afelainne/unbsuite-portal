import * as React from 'react';

/**
 * Two tab treatments and no more. "underline" is the in-card period switcher
 * (Week / Month / Quarter / Year). "pill" is the black-filled nav tab used in
 * the marketing header and section filters.
 */
export interface TabItem { value: string; label: string }
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  items: Array<TabItem | string>;
  value?: string;
  onChange?: (value: string) => void;
  /** @default "underline" */
  variant?: 'underline' | 'pill';
  /** @default "md" */
  size?: 'sm' | 'md';
}
export function Tabs(props: TabsProps): JSX.Element;

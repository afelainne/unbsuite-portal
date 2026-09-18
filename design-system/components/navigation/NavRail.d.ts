import * as React from 'react';

/**
 * The workspace's primary navigation: a centred horizontal run of 52px icon
 * buttons with an 18px glyph, the active one filled black. No labels, no
 * sidebar — this system navigates by glyph.
 *
 * @startingPoint section="Navigation" subtitle="Centred 52px icon rail with the active item filled black" viewport="700x140"
 */
export interface NavRailItem {
  value: string;
  label: string;
  /** Phosphor class for the resting state, e.g. "ph ph-house". */
  icon: string;
  /** Phosphor class swapped in when active, e.g. "ph-fill ph-house". */
  iconActive?: string;
  badge?: boolean;
}
export interface NavRailProps extends React.HTMLAttributes<HTMLElement> {
  items: NavRailItem[];
  value?: string;
  onChange?: (value: string) => void;
  /** px gap between buttons. @default 8 */
  gap?: number;
  /** @default "lg" (52px) */
  size?: 'sm' | 'md' | 'lg';
}
export function NavRail(props: NavRailProps): JSX.Element;

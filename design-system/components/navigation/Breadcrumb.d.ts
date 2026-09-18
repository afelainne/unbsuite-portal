import * as React from 'react';

/**
 * Small muted trail placed to the right of a page title, on the same baseline.
 * Each crumb may carry a leading glyph; the last crumb is the darkest.
 */
export interface Crumb { label: string; icon?: string }
export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: Crumb[];
  /** @default "/" */
  separator?: React.ReactNode;
}
export function Breadcrumb(props: BreadcrumbProps): JSX.Element;

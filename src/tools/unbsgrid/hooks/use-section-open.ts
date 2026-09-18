/**
 * Collapsible section state that works both ways.
 *
 * A panel keeps owning its open/closed state (so it still works on its own,
 * in a test or outside the tool), but the page can take control of it by
 * passing `open` — which is what lets the sidebar behave as an accordion with
 * a single heavy section expanded at a time.
 */
import { useCallback, useState } from 'react';

export function useSectionOpen(
  defaultOpen: boolean,
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
): [boolean, (value: boolean) => void] {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const controlled = open !== undefined;
  const value = controlled ? open : selfOpen;
  const setValue = useCallback((next: boolean) => {
    if (!controlled) setSelfOpen(next);
    onOpenChange?.(next);
  }, [controlled, onOpenChange]);
  return [value, setValue];
}

export default useSectionOpen;

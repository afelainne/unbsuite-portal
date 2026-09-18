/**
 * Generic undo / redo for any snapshot type.
 *
 * The stack lives in `lib/session-history.ts` (pure, tested there); this hook
 * adds React state and the Ctrl+Z / Ctrl+Shift+Z (and Ctrl+Y) shortcuts,
 * which stay out of the way while the focus is in a text field so typing keeps
 * its own undo.
 *
 * Two ways to use it:
 *  - as the owner of the state: read `state`, call `record(next)`;
 *  - alongside existing `useState` calls (what unbsgrid's Index does): call
 *    `record(snapshot, { group: 'clearspaceValue' })` whenever settings change
 *    and apply what comes back through `onApply`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo as stackCanUndo,
  canRedo as stackCanRedo,
  undoLabel as stackUndoLabel,
  redoLabel as stackRedoLabel,
  historyDepth,
  isTextEntryTarget,
  type History,
  type HistoryOptions,
  type PushMeta,
} from '../lib/session-history';

export interface UseUndoHistoryOptions<T> extends HistoryOptions {
  /**
   * Called when undo or redo restores a state. Required when the hook is used
   * next to existing state: this is where you push the snapshot back into your
   * own setters.
   */
  onApply?: (state: T, direction: 'undo' | 'redo') => void;
  /** Register the keyboard shortcuts (default true). */
  shortcuts?: boolean;
  /** Where to listen for them (default `document`). */
  target?: Document | HTMLElement | null;
  /** Turn the whole thing off without unmounting (default true). */
  enabled?: boolean;
}

export interface UndoHistoryApi<T> {
  /** Current snapshot. */
  state: T;
  /** Record a change. Same `group` inside the coalescing window = one step. */
  record: (next: T, meta?: PushMeta) => void;
  /** Returns true when a step was actually taken. */
  undo: () => boolean;
  redo: () => boolean;
  /** Drop the whole history and start again from `next` (new file loaded). */
  reset: (next: T, label?: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  /** Steps stored, undo + redo. */
  depth: number;
}

export function useUndoHistory<T>(initial: T, options: UseUndoHistoryOptions<T> = {}): UndoHistoryApi<T> {
  const { limit, groupWindowMs, onApply, shortcuts = true, target, enabled = true } = options;

  const [history, setHistory] = useState<History<T>>(() => createHistory(initial));

  // Kept in sync on every render so the callbacks below stay stable and can
  // read the newest stack without going through a state update first.
  const historyRef = useRef(history);
  historyRef.current = history;

  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;

  const stackOptions = useMemo<HistoryOptions>(() => ({ limit, groupWindowMs }), [limit, groupWindowMs]);
  const stackOptionsRef = useRef(stackOptions);
  stackOptionsRef.current = stackOptions;

  const commit = useCallback((next: History<T>) => {
    historyRef.current = next;
    setHistory(next);
  }, []);

  const record = useCallback((next: T, meta: PushMeta = {}) => {
    const updated = pushHistory(historyRef.current, next, meta, stackOptionsRef.current);
    if (updated !== historyRef.current) commit(updated);
  }, [commit]);

  const undo = useCallback((): boolean => {
    const current = historyRef.current;
    if (!stackCanUndo(current)) return false;
    const next = undoHistory(current);
    commit(next);
    onApplyRef.current?.(next.present.state, 'undo');
    return true;
  }, [commit]);

  const redo = useCallback((): boolean => {
    const current = historyRef.current;
    if (!stackCanRedo(current)) return false;
    const next = redoHistory(current);
    commit(next);
    onApplyRef.current?.(next.present.state, 'redo');
    return true;
  }, [commit]);

  const reset = useCallback((next: T, label?: string) => {
    commit(createHistory(next, label));
  }, [commit]);

  useEffect(() => {
    if (!enabled || !shortcuts) return;
    const node: Document | HTMLElement | null =
      target ?? (typeof document !== 'undefined' ? document : null);
    if (!node) return;

    const onKeyDown = (event: Event) => {
      const e = event as KeyboardEvent;
      if (e.defaultPrevented) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = (e.key || '').toLowerCase();
      const isUndoKey = key === 'z';
      const isRedoKey = key === 'y';
      if (!isUndoKey && !isRedoKey) return;
      // Typing has its own undo stack; never take it over.
      if (isTextEntryTarget(e.target)) return;
      const didSomething = isRedoKey || e.shiftKey ? redo() : undo();
      // Swallow the browser's own undo either way, so a full stack does not
      // suddenly fall through to the page.
      e.preventDefault();
      void didSomething;
    };

    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [enabled, shortcuts, target, undo, redo]);

  return {
    state: history.present.state,
    record,
    undo,
    redo,
    reset,
    canUndo: stackCanUndo(history),
    canRedo: stackCanRedo(history),
    undoLabel: stackUndoLabel(history),
    redoLabel: stackRedoLabel(history),
    depth: historyDepth(history),
  };
}

export default useUndoHistory;

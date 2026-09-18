/**
 * Session history — two independent things the tool needs to remember.
 *
 * 1. Recent files: name, date and a reduced SVG thumbnail in `localStorage`.
 *    Thumbnails are the part that can blow the ~5 MB quota, so each one is
 *    minified and capped, the list is capped, and a failed write drops the
 *    oldest entry and retries instead of throwing.
 *
 * 2. Undo / redo for settings changes: pure stack operations with a 50-step
 *    limit and time-based coalescing, so dragging one slider is one step
 *    instead of two hundred. The React side lives in
 *    `hooks/use-undo-history.ts`.
 */

import { stableStringify } from './memo';
import { activeT } from '../i18n/runtime';
import { fill } from '../i18n/format';

// ===========================================================================
// 1. Recent files
// ===========================================================================

export interface RecentEntry {
  id: string;
  /** File name or a label like "SVG colado". */
  name: string;
  /** Epoch milliseconds. */
  at: number;
  /** Reduced SVG markup for the preview, or null when it did not fit. */
  thumbnail: string | null;
  /** Size of the original input, in characters. */
  bytes: number;
  /** Content hash, used to recognize the same logo coming back. */
  hash: string;
}

export const RECENTS_STORAGE_KEY = 'unbsgrid-recent-svgs';
/** How many files stay in the list. */
export const MAX_RECENTS = 8;
/** Per-thumbnail ceiling, in characters. Bigger ones are dropped, not stored. */
export const MAX_THUMBNAIL_CHARS = 6000;
/** Whole-list ceiling, in characters of serialized JSON. */
export const MAX_RECENTS_CHARS = 120_000;
/** Inputs larger than this are not even scanned for a thumbnail. */
const THUMBNAIL_INPUT_LIMIT = 600_000;

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // sandboxed iframe / privacy mode: touching it throws
  }
}

/** cyrb-style short hash, enough to spot "same file again". */
export function hashContent(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Shrink an (already sanitized) SVG into something small enough to keep in
 * `localStorage`: comments and whitespace go, coordinates are rounded to two
 * decimals. Returns null when the result still does not fit `maxChars` — the
 * entry is then stored without a preview instead of eating the quota.
 */
export function makeThumbnail(svg: unknown, maxChars = MAX_THUMBNAIL_CHARS): string | null {
  if (typeof svg !== 'string') return null;
  const src = svg.trim();
  if (!src || src.length > THUMBNAIL_INPUT_LIMIT) return null;
  let out = src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/\s+data-[\w-]+="[^"]*"/g, '')
    .replace(/\s+aria-[\w-]+="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Round long decimals: path data is where the bytes are.
  out = out.replace(/-?\d+\.\d{3,}/g, m => {
    const n = Number(m);
    return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : m;
  });
  if (!out || out.length > maxChars) return null;
  return out;
}

function isRecentEntry(value: unknown): value is RecentEntry {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return typeof e.id === 'string'
    && typeof e.name === 'string'
    && typeof e.at === 'number'
    && Number.isFinite(e.at)
    && (e.thumbnail === null || typeof e.thumbnail === 'string')
    && typeof e.hash === 'string';
}

/** Read the recents list. Corrupt or foreign content yields an empty list. */
export function loadRecents(): RecentEntry[] {
  try {
    const raw = getStorage()?.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecentEntry)
      .map(e => ({
        id: e.id,
        name: e.name,
        at: e.at,
        thumbnail: typeof e.thumbnail === 'string' && e.thumbnail.length <= MAX_THUMBNAIL_CHARS ? e.thumbnail : null,
        bytes: typeof e.bytes === 'number' && Number.isFinite(e.bytes) ? e.bytes : 0,
        hash: e.hash,
      }))
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

/** Trim the list so the serialized payload stays under `MAX_RECENTS_CHARS`. */
function fitToBudget(list: RecentEntry[]): RecentEntry[] {
  const out = list.slice(0, MAX_RECENTS);
  while (out.length && JSON.stringify(out).length > MAX_RECENTS_CHARS) {
    // Drop the oldest thumbnail first; only then drop the oldest entry.
    const withThumb = out.map((e, i) => ({ e, i })).filter(x => x.e.thumbnail !== null);
    if (withThumb.length > 1) {
      const oldest = withThumb[withThumb.length - 1];
      out[oldest.i] = { ...oldest.e, thumbnail: null };
      continue;
    }
    out.pop();
  }
  return out;
}

/**
 * Write the list. Never throws: on a full / blocked storage it retries with
 * fewer entries and finally reports `false` so the UI can say so once.
 */
export function saveRecents(list: RecentEntry[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  let attempt = fitToBudget(list);
  for (;;) {
    try {
      storage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(attempt));
      return true;
    } catch {
      if (!attempt.length) {
        try {
          storage.removeItem(RECENTS_STORAGE_KEY);
        } catch {
          /* nothing else to do */
        }
        return false;
      }
      // Quota / security error: shed the oldest entry and try again.
      attempt = attempt.slice(0, -1);
    }
  }
}

export interface RecentInput {
  name: string;
  /** Sanitized SVG — the thumbnail is built from this. */
  svg: string;
  /** Size of the original input, in characters (defaults to the SVG length). */
  bytes?: number;
  at?: number;
}

let recentSeq = 0;

/**
 * Prepend a file to the recents list (pure). The same content re-opened moves
 * back to the top instead of duplicating.
 */
export function addRecent(list: RecentEntry[], input: RecentInput): RecentEntry[] {
  const hash = hashContent(input.svg ?? '');
  const entry: RecentEntry = {
    id: `recent-${Date.now().toString(36)}-${(recentSeq++).toString(36)}`,
    name: input.name?.trim() || 'SVG sem nome',
    at: input.at ?? Date.now(),
    thumbnail: makeThumbnail(input.svg),
    bytes: input.bytes ?? (input.svg?.length ?? 0),
    hash,
  };
  const rest = list.filter(e => e.hash !== hash);
  return fitToBudget([entry, ...rest]);
}

/** Add a file and persist. Returns the new list plus whether the write stuck. */
export function rememberRecent(input: RecentInput): { list: RecentEntry[]; stored: boolean } {
  const list = addRecent(loadRecents(), input);
  return { list, stored: saveRecents(list) };
}

export function removeRecent(list: RecentEntry[], id: string): RecentEntry[] {
  return list.filter(e => e.id !== id);
}

/** Forget every recent file. */
export function clearRecents(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(RECENTS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** "agora", "há 5 min", "há 3 h", "12/03" — short label for the list. */
export function formatRecentDate(at: number, now = Date.now()): string {
  if (!Number.isFinite(at)) return '';
  const diff = Math.max(0, now - at);
  const min = Math.floor(diff / 60000);
  const text = activeT().input;
  if (min < 1) return text.recentNow;
  if (min < 60) return fill(text.recentMinutes, { n: min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return fill(text.recentHours, { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return fill(text.recentDays, { n: days });
  const d = new Date(at);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

// ===========================================================================
// 2. Undo / redo for settings
// ===========================================================================

export interface HistoryEntry<T> {
  state: T;
  /** Short label for the tooltip: "Desfazer espaçamento". */
  label: string;
  /**
   * Control identity. Consecutive pushes with the same group inside
   * `groupWindowMs` collapse into one step (one slider drag = one undo).
   */
  group: string | null;
  at: number;
}

export interface History<T> {
  past: HistoryEntry<T>[];
  present: HistoryEntry<T>;
  future: HistoryEntry<T>[];
}

export interface HistoryOptions {
  /** Maximum number of undoable steps (default 50). */
  limit?: number;
  /** Coalescing window for same-group changes, in ms (default 400). */
  groupWindowMs?: number;
}

export const HISTORY_LIMIT = 50;
export const HISTORY_GROUP_WINDOW_MS = 400;

export interface PushMeta {
  label?: string;
  group?: string | null;
  at?: number;
}

export function createHistory<T>(state: T, label = 'Estado inicial', at = Date.now()): History<T> {
  return { past: [], present: { state, label, group: null, at }, future: [] };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0;
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0;
}

/** Label of the step an undo would take back to (for a tooltip). */
export function undoLabel<T>(h: History<T>): string | null {
  return h.past.length ? h.present.label : null;
}

/** Label of the step a redo would reapply. */
export function redoLabel<T>(h: History<T>): string | null {
  return h.future.length ? h.future[0].label : null;
}

function sameState<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  return stableStringify(a) === stableStringify(b);
}

/**
 * Record a new state (pure).
 *
 * - identical state → no step at all;
 * - same `group` within `groupWindowMs` → replaces the current step;
 * - anything else → pushes a step, clears the redo stack and trims to `limit`.
 */
export function pushHistory<T>(h: History<T>, state: T, meta: PushMeta = {}, options: HistoryOptions = {}): History<T> {
  const limit = Math.max(1, options.limit ?? HISTORY_LIMIT);
  const window = Math.max(0, options.groupWindowMs ?? HISTORY_GROUP_WINDOW_MS);
  const at = meta.at ?? Date.now();
  const group = meta.group ?? null;
  const label = meta.label ?? h.present.label;

  if (sameState(h.present.state, state)) return h;

  const entry: HistoryEntry<T> = { state, label, group, at };

  const coalesce =
    group !== null
    && h.present.group === group
    && at - h.present.at <= window;

  if (coalesce) {
    // Keep the timestamp moving so a continuous drag keeps collapsing.
    return { past: h.past, present: entry, future: [] };
  }

  const past = [...h.past, h.present];
  if (past.length > limit) past.splice(0, past.length - limit);
  return { past, present: entry, future: [] };
}

export function undoHistory<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  const past = h.past.slice(0, -1);
  const present = h.past[h.past.length - 1];
  return { past, present, future: [h.present, ...h.future] };
}

export function redoHistory<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next, future: rest };
}

/** Throw away the history and start over from `state`. */
export function resetHistory<T>(h: History<T>, state: T, label = 'Novo início', at = Date.now()): History<T> {
  void h;
  return createHistory(state, label, at);
}

/** How many steps are stored (undo + redo). */
export function historyDepth<T>(h: History<T>): number {
  return h.past.length + h.future.length;
}

// ===========================================================================
// Shared DOM helper
// ===========================================================================

/**
 * True when the event target is a text field. Page-level shortcuts (Ctrl+V to
 * import, Ctrl+Z to undo) must leave those alone so typing keeps its own
 * paste / undo.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el !== 'object' || !('tagName' in el)) return false;
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return typeof el.closest === 'function' && !!el.closest('input, textarea, select, [contenteditable="true"]');
}

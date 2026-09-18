import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RECENTS_STORAGE_KEY,
  MAX_RECENTS,
  MAX_THUMBNAIL_CHARS,
  makeThumbnail,
  hashContent,
  loadRecents,
  saveRecents,
  addRecent,
  rememberRecent,
  removeRecent,
  clearRecents,
  formatRecentDate,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  resetHistory,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  historyDepth,
  isTextEntryTarget,
  HISTORY_LIMIT,
  HISTORY_GROUP_WINDOW_MS,
  type RecentEntry,
} from '../lib/session-history';

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
const RECT = svg('<rect x="10" y="10" width="40" height="40" fill="#111"/>');

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Recents
// ---------------------------------------------------------------------------

describe('makeThumbnail', () => {
  it('strips comments and whitespace and rounds long decimals', () => {
    const bulky = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
      <!-- comentário -->
      <path  d="M1.123456 2.987654 L3 4"  data-name="camada 1" />
    </svg>`;
    const thumb = makeThumbnail(bulky);
    expect(thumb).toBeTruthy();
    if (!thumb) return;
    expect(thumb).not.toContain('<!--');
    expect(thumb).not.toContain('data-name');
    expect(thumb).toContain('M1.12 2.99');
    expect(thumb.length).toBeLessThan(bulky.length);
  });

  it('returns null instead of storing something oversized', () => {
    const huge = svg('<path d="M0 0"/>'.repeat(5000));
    expect(makeThumbnail(huge, 500)).toBeNull();
    expect(makeThumbnail(RECT, 10)).toBeNull();
    expect(makeThumbnail('')).toBeNull();
    expect(makeThumbnail(null)).toBeNull();
    expect((makeThumbnail(RECT) ?? '').length).toBeLessThanOrEqual(MAX_THUMBNAIL_CHARS);
  });
});

describe('recents list', () => {
  it('keeps newest first, deduplicates the same drawing and caps the list', () => {
    let list: RecentEntry[] = [];
    for (let i = 0; i < MAX_RECENTS + 6; i++) {
      list = addRecent(list, { name: `logo-${i}.svg`, svg: svg(`<rect width="${i + 1}" height="10"/>`), at: 1000 + i });
    }
    expect(list).toHaveLength(MAX_RECENTS);
    expect(list[0].name).toBe(`logo-${MAX_RECENTS + 5}.svg`);

    const before = list.length;
    const again = addRecent(list, { name: 'outro-nome.svg', svg: svg('<rect width="1" height="10"/>') });
    expect(again).toHaveLength(before);
    expect(again[0].name).toBe('outro-nome.svg');
    expect(again.filter(e => e.hash === again[0].hash)).toHaveLength(1);
  });

  it('stores a thumbnail and the metadata the UI shows', () => {
    const list = addRecent([], { name: 'marca.svg', svg: RECT, bytes: 999, at: 42 });
    expect(list[0]).toMatchObject({ name: 'marca.svg', bytes: 999, at: 42 });
    expect(list[0].thumbnail).toContain('<rect');
    expect(list[0].hash).toBe(hashContent(RECT));
  });

  it('round-trips through localStorage and survives corrupt content', () => {
    const list = addRecent([], { name: 'marca.svg', svg: RECT });
    expect(saveRecents(list)).toBe(true);
    expect(loadRecents()).toHaveLength(1);
    expect(loadRecents()[0].name).toBe('marca.svg');

    localStorage.setItem(RECENTS_STORAGE_KEY, 'isto não é json');
    expect(loadRecents()).toEqual([]);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify({ nope: true }));
    expect(loadRecents()).toEqual([]);
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify([{ name: 'sem id' }, null, 7]));
    expect(loadRecents()).toEqual([]);
  });

  it('never throws when the storage is full: it sheds entries and reports failure', () => {
    const quota = () => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    };
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
    let list: RecentEntry[] = [];
    for (let i = 0; i < 4; i++) list = addRecent(list, { name: `l-${i}.svg`, svg: svg(`<rect width="${i + 1}" height="9"/>`) });

    expect(() => saveRecents(list)).not.toThrow();
    expect(saveRecents(list)).toBe(false);
    expect(spy).toHaveBeenCalled();

    // The list itself is untouched — only persistence failed.
    expect(list).toHaveLength(4);
    spy.mockRestore();
    expect(saveRecents(list)).toBe(true);
  });

  it('keeps the whole payload inside its budget by dropping old thumbnails first', () => {
    const fat = svg('<path d="M0 0 L1 1"/>'.repeat(200));
    let list: RecentEntry[] = [];
    for (let i = 0; i < MAX_RECENTS; i++) {
      list = addRecent(list, { name: `pesado-${i}.svg`, svg: `${fat}<!--${i}-->`, at: 1000 + i });
    }
    expect(JSON.stringify(list).length).toBeLessThanOrEqual(120_000);
    // The newest entry keeps its preview.
    expect(list[0].thumbnail).toBeTruthy();
  });

  it('remembers, removes one and clears everything', () => {
    const { list, stored } = rememberRecent({ name: 'a.svg', svg: RECT });
    expect(stored).toBe(true);
    expect(list).toHaveLength(1);
    expect(removeRecent(list, list[0].id)).toEqual([]);
    expect(removeRecent(list, 'inexistente')).toHaveLength(1);
    expect(clearRecents()).toBe(true);
    expect(loadRecents()).toEqual([]);
  });

  it('formats dates in short Portuguese', () => {
    const now = Date.UTC(2026, 2, 12, 12, 0, 0);
    expect(formatRecentDate(now, now)).toBe('agora');
    expect(formatRecentDate(now - 5 * 60_000, now)).toBe('há 5 min');
    expect(formatRecentDate(now - 3 * 3_600_000, now)).toBe('há 3 h');
    expect(formatRecentDate(now - 2 * 86_400_000, now)).toBe('há 2 d');
    expect(formatRecentDate(now - 40 * 86_400_000, now)).toMatch(/^\d{2}\/\d{2}$/);
    expect(formatRecentDate(Number.NaN, now)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Undo / redo
// ---------------------------------------------------------------------------

interface Settings { clearspace: number; grid: number }

const S = (clearspace: number, grid = 8): Settings => ({ clearspace, grid });

describe('history stack', () => {
  it('records steps and walks back and forth', () => {
    let h = createHistory(S(1), 'Início', 0);
    h = pushHistory(h, S(2), { label: 'Espaçamento', group: 'clearspace', at: 1000 });
    h = pushHistory(h, S(3), { label: 'Grade', group: 'grid', at: 5000 });
    expect(h.present.state).toEqual(S(3));
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
    expect(historyDepth(h)).toBe(2);

    h = undoHistory(h);
    expect(h.present.state).toEqual(S(2));
    expect(canRedo(h)).toBe(true);
    h = undoHistory(h);
    expect(h.present.state).toEqual(S(1));
    expect(canUndo(h)).toBe(false);
    expect(undoHistory(h).present.state).toEqual(S(1)); // no-op at the bottom

    h = redoHistory(h);
    h = redoHistory(h);
    expect(h.present.state).toEqual(S(3));
    expect(redoHistory(h)).toBe(h); // no-op at the top
  });

  it('ignores a push that does not change anything', () => {
    const h = createHistory(S(1), 'Início', 0);
    expect(pushHistory(h, S(1), { at: 1000 })).toBe(h);
    expect(pushHistory(h, { clearspace: 1, grid: 8 }, { at: 1000 })).toBe(h);
  });

  it('groups consecutive changes of the same control inside the window', () => {
    let h = createHistory(S(1), 'Início', 0);
    for (let i = 1; i <= 40; i++) {
      h = pushHistory(h, S(1 + i * 0.1), { label: 'Espaçamento', group: 'clearspace', at: 1000 + i * 30 });
    }
    // One drag = one step, whatever the frame rate.
    expect(h.past).toHaveLength(1);
    expect(h.present.state.clearspace).toBeCloseTo(5);
    expect(undoHistory(h).present.state).toEqual(S(1));
  });

  it('starts a new step once the window closes or the control changes', () => {
    let h = createHistory(S(1), 'Início', 0);
    h = pushHistory(h, S(2), { group: 'clearspace', at: 1000 });
    h = pushHistory(h, S(3), { group: 'clearspace', at: 1000 + HISTORY_GROUP_WINDOW_MS + 1 });
    expect(h.past).toHaveLength(2);

    let g = createHistory(S(1), 'Início', 0);
    g = pushHistory(g, S(2), { group: 'clearspace', at: 1000 });
    g = pushHistory(g, S(4), { group: 'grid', at: 1050 });
    expect(g.past).toHaveLength(2);

    // No group at all never coalesces.
    let n = createHistory(S(1), 'Início', 0);
    n = pushHistory(n, S(2), { at: 1000 });
    n = pushHistory(n, S(3), { at: 1010 });
    expect(n.past).toHaveLength(2);
  });

  it('honours the coalescing window given in options', () => {
    // A window of 0 only ever merges changes landing in the same instant.
    let h = createHistory(S(1), 'Início', 0);
    h = pushHistory(h, S(2), { group: 'clearspace', at: 1000 }, { groupWindowMs: 0 });
    h = pushHistory(h, S(3), { group: 'clearspace', at: 1001 }, { groupWindowMs: 0 });
    expect(h.past).toHaveLength(2);

    // A wider window merges what the default would have split.
    let wide = createHistory(S(1), 'Início', 0);
    wide = pushHistory(wide, S(2), { group: 'clearspace', at: 1000 }, { groupWindowMs: 5000 });
    wide = pushHistory(wide, S(3), { group: 'clearspace', at: 4000 }, { groupWindowMs: 5000 });
    expect(wide.past).toHaveLength(1);
  });

  it('keeps at most 50 steps, dropping the oldest', () => {
    let h = createHistory(S(0), 'Início', 0);
    for (let i = 1; i <= 120; i++) h = pushHistory(h, S(i), { label: `Passo ${i}`, at: i * 10_000 });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(HISTORY_LIMIT).toBe(50);
    expect(h.present.state).toEqual(S(120));
    // 50 undos are available and the oldest reachable state is 120 - 50.
    for (let i = 0; i < HISTORY_LIMIT; i++) h = undoHistory(h);
    expect(h.present.state).toEqual(S(120 - HISTORY_LIMIT));
    expect(canUndo(h)).toBe(false);
  });

  it('clears the redo branch when a new change lands', () => {
    let h = createHistory(S(1), 'Início', 0);
    h = pushHistory(h, S(2), { at: 1000 });
    h = pushHistory(h, S(3), { at: 2000 });
    h = undoHistory(h);
    expect(canRedo(h)).toBe(true);
    h = pushHistory(h, S(9), { at: 3000 });
    expect(canRedo(h)).toBe(false);
    expect(h.present.state).toEqual(S(9));
  });

  it('exposes labels for the buttons and resets on a new file', () => {
    let h = createHistory(S(1), 'Início', 0);
    expect(undoLabel(h)).toBeNull();
    expect(redoLabel(h)).toBeNull();
    h = pushHistory(h, S(2), { label: 'Espaçamento', at: 1000 });
    expect(undoLabel(h)).toBe('Espaçamento');
    h = undoHistory(h);
    expect(redoLabel(h)).toBe('Espaçamento');

    const fresh = resetHistory(h, S(7), 'Novo logo');
    expect(fresh.past).toEqual([]);
    expect(fresh.future).toEqual([]);
    expect(fresh.present.state).toEqual(S(7));
    expect(fresh.present.label).toBe('Novo logo');
  });
});

describe('isTextEntryTarget', () => {
  it('protects typing from page-level shortcuts', () => {
    const input = document.createElement('input');
    const div = document.createElement('div');
    document.body.append(input, div);
    expect(isTextEntryTarget(input)).toBe(true);
    expect(isTextEntryTarget(div)).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
    input.remove(); div.remove();
  });
});

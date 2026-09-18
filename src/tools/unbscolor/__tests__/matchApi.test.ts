import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchMatchesWithFallback } from '../services/matchApi';
import { hexToRgb } from '../utils/colorMath';
import type { ReferenceColor } from '../types';

const lib: ReferenceColor[] = ['#FF0000', '#00FF00', '#0000FF'].map((hex, i) => ({
  code: `R${i}`,
  name: `R${i}`,
  hex,
  rgb: hexToRgb(hex)
}));

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchMatchesWithFallback', () => {
  it('returns API matches when valid and sends a normalized hex', async () => {
    const matches = [{ reference: lib[0], deltaE: 0, ranking: 'Exact' }];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ matches }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchMatchesWithFallback({ hex: 'f00', fallbackLibrary: lib })).resolves.toEqual(matches);
    expect(String(fetchMock.mock.calls[0][0])).toContain('hex=%23FF0000');
  });

  it('falls back when the SPA returns index.html (200 text/html)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    );
    const res = await fetchMatchesWithFallback({ hex: '#FE0000', fallbackLibrary: lib, count: 1 });
    expect(res[0].reference.hex).toBe('#FF0000');
  });

  it('falls back when the payload shape is wrong (bug: any truthy `matches` was accepted)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ matches: 'oops' })));
    const res = await fetchMatchesWithFallback({ hex: '#00FE00', fallbackLibrary: lib, count: 1 });
    expect(res[0].reference.hex).toBe('#00FF00');
  });

  it('falls back on HTTP errors and rethrows without fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 })));
    await expect(fetchMatchesWithFallback({ hex: '#0000FE', fallbackLibrary: lib, count: 1 })).resolves.toHaveLength(1);
    await expect(fetchMatchesWithFallback({ hex: '#0000FE' })).rejects.toThrow(/500/);
  });

  it('times out a hanging request and uses the fallback (bug: no timeout)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
      )
    );
    const res = await fetchMatchesWithFallback({ hex: '#FF0000', fallbackLibrary: lib, count: 1, timeoutMs: 20 });
    expect(res[0].reference.hex).toBe('#FF0000');
  });

  it('caller abort does not trigger the fallback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
      )
    );
    const controller = new AbortController();
    const p = fetchMatchesWithFallback({ hex: '#FF0000', fallbackLibrary: lib, signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toThrow();
  });

  it('invalid hex never hits the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchMatchesWithFallback({ hex: '#GGG', fallbackLibrary: lib })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

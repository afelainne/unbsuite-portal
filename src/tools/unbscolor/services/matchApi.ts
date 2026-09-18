import type { ColorMatch, ReferenceColor } from '../types';
import { findReferenceMatches, normalizeHex } from '../utils/colorMath';

export type MatchApiOptions = {
  hex: string;
  libraryId?: string;
  count?: number;
  fallbackLibrary?: ReferenceColor[];
  /** Request timeout in ms (default 4000). */
  timeoutMs?: number;
  /** External abort (e.g. a newer request superseded this one). */
  signal?: AbortSignal;
};

const DEFAULT_COUNT = 12;
const DEFAULT_TIMEOUT_MS = 4000;

const isMatchArray = (value: unknown): value is ColorMatch[] =>
  Array.isArray(value) &&
  value.every(
    (m: any) =>
      m && typeof m === 'object' && m.reference && typeof m.reference.hex === 'string' && typeof m.deltaE === 'number'
  );

export async function fetchMatchesWithFallback(options: MatchApiOptions): Promise<ColorMatch[]> {
  const { hex, libraryId, count = DEFAULT_COUNT, fallbackLibrary, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;

  const normalized = normalizeHex(hex);
  if (!normalized) {
    // Invalid input never hits the network
    return [];
  }

  const params = new URLSearchParams({ hex: normalized, count: String(count) });
  if (libraryId) params.set('libraryId', libraryId);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const res = await fetch(`/api/match?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    // SPA hosts often answer unknown routes with index.html (200 + text/html)
    const contentType = res.headers?.get?.('content-type') || '';
    if (contentType && !contentType.includes('json')) throw new Error('Response is not JSON');
    const json = await res.json();
    if (!isMatchArray(json?.matches)) throw new Error('Invalid response');
    return json.matches;
  } catch (err) {
    // An explicit cancellation by the caller must not trigger the fallback
    if (signal?.aborted) throw err;
    if (fallbackLibrary && fallbackLibrary.length) {
      return findReferenceMatches(normalized, fallbackLibrary, count);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}

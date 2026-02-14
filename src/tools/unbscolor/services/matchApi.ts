import type { ColorMatch, ReferenceColor } from '../types';
import { findReferenceMatches } from '../utils/colorMath';

export type MatchApiOptions = {
  hex: string;
  libraryId?: string;
  count?: number;
  fallbackLibrary?: ReferenceColor[];
};

const DEFAULT_COUNT = 12;

export async function fetchMatchesWithFallback(options: MatchApiOptions): Promise<ColorMatch[]> {
  const { hex, libraryId, count = DEFAULT_COUNT, fallbackLibrary } = options;

  const params = new URLSearchParams({ hex, count: String(count) });
  if (libraryId) params.set('libraryId', libraryId);

  try {
    const res = await fetch(`/api/match?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    if (!json?.matches) throw new Error('Resposta inválida');
    return json.matches as ColorMatch[];
  } catch (err) {
    if (fallbackLibrary) {
      return findReferenceMatches(hex, fallbackLibrary, count);
    }
    throw err;
  }
}

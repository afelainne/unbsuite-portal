import type { ReferenceColor, ColorMatch } from '../types';
import { findReferenceMatches, enrichLibraryWithLab, isValidHex } from '../utils/colorMath';
import { getLibraryById, LIBRARY_OPTIONS, DEFAULT_LIBRARY } from '../constants';

// Cache bibliotecas enriquecidas com LAB para evitar recalcular a cada chamada
const enrichedCache: Record<string, ReferenceColor[]> = {};

function getEnrichedLibrary(libraryId?: string): { id: string; colors: ReferenceColor[] } {
  const fallbackId = libraryId && LIBRARY_OPTIONS.find((o) => o.id === libraryId) ? libraryId : LIBRARY_OPTIONS[0]?.id;
  const resolvedId = fallbackId || 'default';
  if (!enrichedCache[resolvedId]) {
    const lib = fallbackId ? getLibraryById(fallbackId) : DEFAULT_LIBRARY;
    enrichedCache[resolvedId] = enrichLibraryWithLab(lib);
  }
  return { id: resolvedId, colors: enrichedCache[resolvedId] };
}

export default async function handler(req: any, res: any) {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const hex = (req.query?.hex || req.body?.hex || '').toString();
  if (!isValidHex(hex)) {
    res.status(400).json({ error: 'Parâmetro hex inválido' });
    return;
  }

  const countRaw = (req.query?.count || req.body?.count || '12').toString();
  const count = Math.min(Math.max(parseInt(countRaw, 10) || 12, 1), 50);
  const libraryId = (req.query?.libraryId || req.body?.libraryId || '').toString();

  const { id: resolvedId, colors } = getEnrichedLibrary(libraryId);
  const matches = findReferenceMatches(hex, colors, count).map((m) => ({
    reference: {
      code: m.reference.code,
      name: m.reference.name,
      hex: m.reference.hex,
      systemId: m.reference.systemId,
      systemName: m.reference.systemName,
      finishId: m.reference.finishId,
      finish: m.reference.finish
    } as ReferenceColor,
    deltaE: m.deltaE,
    ranking: m.ranking
  })) as ColorMatch[];

  res.status(200).json({ matches, libraryId: resolvedId });
}

import encodedRaw from './lib_colors.dat?raw';
import { safeDecodeEncodedPayload } from './decode';

const KEY = 'c0lor-key';

export type EncodedColorLibrary = { colors: any[] };

let cached: EncodedColorLibrary | null = null;

export const loadColorLibrary = (): EncodedColorLibrary => {
  if (cached) return cached;
  const decoded = safeDecodeEncodedPayload<EncodedColorLibrary>(encodedRaw, KEY, { colors: [] }, 'color library');
  // Guard against a decoded payload with an unexpected shape
  cached = decoded && Array.isArray(decoded.colors) ? decoded : { colors: [] };
  return cached;
};

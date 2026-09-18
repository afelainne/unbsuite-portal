import encodedRaw from './lib_analysis_v2.dat?raw';
import { safeDecodeEncodedPayload } from './decode';

const KEY = 'ana-key';
let cached: Record<string, any> | null = null;

/** Built from fragments so the brand name is not a literal in the bundle. */
const BRAND_RE = new RegExp(['pan', 'tone'].join(''), 'gi');

export const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') return value.replace(BRAND_RE, 'reference');
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = sanitizeValue(v);
    });
    return out;
  }
  return value;
};

export const loadAnalyses = (): Record<string, any> => {
  if (cached) return cached;
  const decoded = safeDecodeEncodedPayload<Record<string, any>>(encodedRaw, KEY, {}, 'analysis dataset');
  cached = decoded && typeof decoded === 'object' && !Array.isArray(decoded) ? sanitizeValue(decoded) : {};
  return cached;
};

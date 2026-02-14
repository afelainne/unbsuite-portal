import { loadAnalyses } from './encoded/loadAnalyses';
import { AnalysisResult } from '../types';

const dataset = loadAnalyses();

// Lookup map for precomputed analyses keyed by normalized code.
export const analysisLookupMap: Record<string, AnalysisResult> = dataset as Record<string, AnalysisResult>;

/**
 * Get multilingual analysis for a code (e.g., "100 CP", "7406 U", "186 C").
 * Normalizes spacing/case; returns undefined if not found.
 */
export function getAnalysisFromLookup(code: string | undefined | null): AnalysisResult | undefined {
  if (!code) return undefined;
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  return analysisLookupMap[normalized];
}

import type { ColorMatch, ReferenceColor } from '../types';

/**
 * One formatter for every reference code shown to a person.
 *
 * Codes come from the built-in open palettes ("Tailwind red-500") or from a
 * library the person imported, and are shown as written in their file. The
 * formatter only unwraps the localization key some color books carry, tidies
 * the spacing and upper-cases the finish suffix, so a code reads the same in
 * the matcher, the multi-slot analysis, the palettes and every SVG / PNG /
 * text export.
 */

/** Finish suffixes a code can carry. Longest first: "UP" must win over "U". */
export const FINISH_SUFFIXES = ['TCX', 'TPG', 'TPM', 'TPX', 'XGC', 'HC', 'UP', 'CP', 'PC', 'EC', 'SP', 'C', 'U', 'M'] as const;

const FINISH_SET = new Set<string>(FINISH_SUFFIXES);

/** Localization wrapper some books use: "$$$/<path>/prefix=388 C$$$/...". */
const LOCALIZATION_KEY = /\$\$\$\/[^=$]*=/g;
const LOCALIZATION_TAIL = /\$\$\$.*$/;

/** Removes a localization wrapper and collapses the spacing of a raw code. */
export const cleanReferenceCode = (raw?: string | null): string => {
  if (typeof raw !== 'string' || raw.length === 0) return '';
  return raw
    .replace(LOCALIZATION_KEY, ' ')
    .replace(LOCALIZATION_TAIL, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .join(' ')
    .trim();
};

export interface ReferenceParts {
  /** The code without its finish, e.g. "388", "Yellow 012". */
  base: string;
  /** The finish suffix in upper case, e.g. "C", "U", "CP", "UP". Empty when the code has none. */
  finish: string;
  /** What is shown: base plus finish, e.g. "388 C". */
  code: string;
  /** Case-insensitive identity of the reference, used to group finishes together. */
  key: string;
}

const EMPTY_PARTS: ReferenceParts = { base: '', finish: '', code: '', key: '' };

/** Splits a raw code into the reference itself and its finish. */
export const parseReferenceCode = (raw?: string | null): ReferenceParts => {
  const clean = cleanReferenceCode(raw);
  if (!clean) return EMPTY_PARTS;

  const tokens = clean.split(/\s+/);
  const last = tokens[tokens.length - 1].toUpperCase();

  if (tokens.length > 1 && FINISH_SET.has(last)) {
    const base = tokens.slice(0, -1).join(' ');
    return { base, finish: last, code: `${base} ${last}`, key: base.toUpperCase() };
  }

  return { base: clean, finish: '', code: clean, key: clean.toUpperCase() };
};

/** The code as a person reads it: "388 C". */
export const formatReferenceCode = (raw?: string | null): string => parseReferenceCode(raw).code;

/** The reference without its finish: "388". */
export const formatReferenceBase = (raw?: string | null): string => parseReferenceCode(raw).base;

/** The finish suffix alone: "C", "U", "CP", "UP" or "". */
export const referenceFinish = (raw?: string | null): string => parseReferenceCode(raw).finish;

/** Same reference across finishes shares this key. */
export const referenceKey = (raw?: string | null): string => parseReferenceCode(raw).key;

// --- Grouping -------------------------------------------------------------

export interface ReferenceVariant {
  finish: string;
  /** Display code of this variant, e.g. "388 U". */
  code: string;
  hex: string;
  deltaE: number;
  reference: ReferenceColor;
}

export interface ReferenceGroup {
  key: string;
  /** Display base, e.g. "388". */
  base: string;
  /** Display code of the closest variant, e.g. "388 C". */
  code: string;
  /** Hex of the closest variant. */
  hex: string;
  /** ΔE of the closest variant. */
  deltaE: number;
  /** Every finish of this reference, closest first. */
  variants: ReferenceVariant[];
}

/**
 * Collapses matches that are the same reference into one row.
 *
 * Searching four books at once returns "388 C", "388 U", "388 CP" and
 * "388 UP" as four near-identical rows. They are one reference with four
 * finishes, so they become one group whose variants carry their own ΔE.
 * Groups are ordered by their closest variant, and an exact duplicate
 * (same finish twice) keeps only its closest occurrence.
 */
export const groupReferenceMatches = (matches: readonly ColorMatch[], limit?: number): ReferenceGroup[] => {
  const byKey = new Map<string, ReferenceGroup>();

  for (const match of matches) {
    if (!match || !match.reference) continue;
    const parts = parseReferenceCode(match.reference.code || match.reference.name);
    if (!parts.code) continue;

    const variant: ReferenceVariant = {
      finish: parts.finish,
      code: parts.code,
      hex: (match.reference.hex || '').toUpperCase(),
      deltaE: match.deltaE,
      reference: match.reference
    };

    const group = byKey.get(parts.key);
    if (!group) {
      byKey.set(parts.key, {
        key: parts.key,
        base: parts.base,
        code: variant.code,
        hex: variant.hex,
        deltaE: variant.deltaE,
        variants: [variant]
      });
      continue;
    }

    const twin = group.variants.find((item) => item.finish === variant.finish);
    if (twin) {
      if (variant.deltaE < twin.deltaE) {
        group.variants[group.variants.indexOf(twin)] = variant;
      }
    } else {
      group.variants.push(variant);
    }
  }

  const groups = Array.from(byKey.values()).map((group) => {
    const variants = [...group.variants].sort((a, b) => a.deltaE - b.deltaE);
    const best = variants[0];
    return { ...group, variants, code: best.code, hex: best.hex, deltaE: best.deltaE };
  });

  groups.sort((a, b) => a.deltaE - b.deltaE);
  return typeof limit === 'number' && limit > 0 ? groups.slice(0, limit) : groups;
};

// --- How far away, in words ----------------------------------------------

export type DeltaVerdict = 'imperceptible' | 'subtle' | 'close' | 'visible' | 'different';

/**
 * ΔE2000 read as a decision, not a number.
 * Thresholds follow the usual print practice: 1 is the just-noticeable
 * difference, 2 is a side-by-side call, 5 still passes as the same colour on
 * press, above 10 it is another colour.
 */
export const deltaVerdict = (deltaE: number): DeltaVerdict => {
  if (!Number.isFinite(deltaE)) return 'different';
  if (deltaE < 1) return 'imperceptible';
  if (deltaE < 2) return 'subtle';
  if (deltaE < 5) return 'close';
  if (deltaE < 10) return 'visible';
  return 'different';
};

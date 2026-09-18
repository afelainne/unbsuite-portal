import { getClosestColorName, hexToLab, normalizeHex } from './colorMath';
import type { LAB } from '../types';

/**
 * Descriptive names come from a fixed vocabulary, so a row of near colours
 * ends up with the same name four times over. When that happens the name is
 * kept and a modifier is added, derived from the actual Lab difference inside
 * the group: the one above the group's average lightness reads "light", the
 * one below reads "dark", and so on for temperature and saturation.
 */

export type NameModifier = 'lighter' | 'darker' | 'warmer' | 'cooler' | 'vivid' | 'muted';

export type NameModifierLabels = Record<NameModifier, string>;

export interface NamedColorItem {
  hex: string;
  name: string;
}

export interface DisambiguatedName<T> {
  item: T;
  /** The name to show: either the original or the original plus a modifier. */
  displayName: string;
  /** The modifier that was needed, when one was. */
  modifier: NameModifier | null;
}

interface Axis {
  id: 'lightness' | 'warmth' | 'chroma';
  value: (lab: LAB) => number;
  above: NameModifier;
  below: NameModifier;
  /** Ties go to the axis a person notices first. */
  weight: number;
}

/** Warmth reads as the yellow/red pull against the blue/green one. */
const AXES: Axis[] = [
  { id: 'lightness', value: (lab) => lab.l, above: 'lighter', below: 'darker', weight: 1 },
  { id: 'warmth', value: (lab) => lab.a + lab.b, above: 'warmer', below: 'cooler', weight: 0.9 },
  { id: 'chroma', value: (lab) => Math.hypot(lab.a, lab.b), above: 'vivid', below: 'muted', weight: 0.8 }
];

/**
 * Returns, for every item, a name that is unique inside the list.
 * Items whose name is already unique are left untouched.
 */
export const disambiguateColorNames = <T extends NamedColorItem>(
  items: readonly T[],
  labels: NameModifierLabels
): DisambiguatedName<T>[] => {
  const labs = items.map((item) => hexToLab(item.hex));
  const buckets = new Map<string, number[]>();

  items.forEach((item, index) => {
    const key = item.name.trim().toLowerCase();
    const bucket = buckets.get(key);
    if (bucket) bucket.push(index);
    else buckets.set(key, [index]);
  });

  const result: DisambiguatedName<T>[] = items.map((item) => ({ item, displayName: item.name, modifier: null }));

  for (const indices of buckets.values()) {
    if (indices.length < 2) continue;

    const spreads = AXES.map((axis) => {
      const values = indices.map((i) => axis.value(labs[i]));
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      return { axis, mean, spread: max - min };
    }).filter((entry) => entry.spread > 0.01);

    const taken = new Set<string>();

    for (const index of indices) {
      const lab = labs[index];
      const name = items[index].name;

      const ranked = spreads
        .map((entry) => ({
          entry,
          delta: entry.axis.value(lab) - entry.mean
        }))
        .filter((candidate) => Math.abs(candidate.delta) > 1e-6)
        // The axis that actually moved the most, in Lab units.
        .sort((a, b) => Math.abs(b.delta) * b.entry.axis.weight - Math.abs(a.delta) * a.entry.axis.weight);

      let chosen: { displayName: string; modifier: NameModifier } | null = null;

      for (const candidate of ranked) {
        const modifier = candidate.delta > 0 ? candidate.entry.axis.above : candidate.entry.axis.below;
        const displayName = `${name} ${labels[modifier]}`;
        if (!taken.has(displayName.toLowerCase())) {
          chosen = { displayName, modifier };
          break;
        }
      }

      // Colours identical on every axis: the code or the hex is the only thing left.
      const fallbackBase = normalizeHex(items[index].hex) || items[index].hex;
      let displayName = chosen ? chosen.displayName : `${name} ${fallbackBase}`;
      let suffix = 2;
      while (taken.has(displayName.toLowerCase())) {
        displayName = `${name} ${fallbackBase} (${suffix})`;
        suffix += 1;
      }

      taken.add(displayName.toLowerCase());
      result[index] = { item: items[index], displayName, modifier: chosen ? chosen.modifier : null };
    }
  }

  return result;
};

/**
 * Convenience wrapper for lists that only carry a hex: the descriptive name is
 * looked up first, then disambiguated.
 */
export const describeAndDisambiguate = (
  hexes: readonly string[],
  labels: NameModifierLabels
): DisambiguatedName<NamedColorItem>[] =>
  disambiguateColorNames(
    hexes.map((hex) => ({ hex, name: getClosestColorName(hex) })),
    labels
  );

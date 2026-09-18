/**
 * `{placeholder}` interpolation.
 *
 * Every message in the dictionary is a plain string, so the whole dictionary
 * can be diffed, counted and checked by the coverage test. The numbers are
 * filled in here instead of being concatenated inside the logic.
 */
export type FillVars = Record<string, string | number>;

const TOKEN = /\{(\w+)\}/g;

/** `fill('Ratio {r} is {d}% off', { r: '1.62', d: 3 })`. Unknown tokens stay. */
export const fill = (template: string, vars: FillVars = {}): string =>
  template.replace(TOKEN, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match);

/** Picks the singular or the plural message and fills `{n}`. */
export const plural = (n: number, one: string, other: string, vars: FillVars = {}): string =>
  fill(Math.abs(n) === 1 ? one : other, { n, ...vars });

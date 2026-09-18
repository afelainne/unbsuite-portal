// Unidades. O motor trabalha em milímetros; tudo o que entra e sai passa por aqui.
// 1 pt = 1/72 in (ponto PostScript/DTP), 1 px = 1/96 in (CSS), 1 in = 25,4 mm.

export type Unit = 'mm' | 'pt' | 'in' | 'px';

export const MM_PER_IN = 25.4;
export const MM_PER_PT = MM_PER_IN / 72;
export const MM_PER_PX = MM_PER_IN / 96;

const PER_UNIT: Record<Unit, number> = {
  mm: 1,
  pt: MM_PER_PT,
  in: MM_PER_IN,
  px: MM_PER_PX,
};

export const UNITS: Unit[] = ['mm', 'pt', 'in', 'px'];

/** Converte milímetros para a unidade pedida. */
export const toUnit = (mm: number, unit: Unit): number => mm / PER_UNIT[unit];

/** Converte um valor na unidade dada para milímetros. */
export const fromUnit = (value: number, unit: Unit): number => value * PER_UNIT[unit];

export const mmToPt = (mm: number) => toUnit(mm, 'pt');
export const ptToMm = (pt: number) => fromUnit(pt, 'pt');
export const mmToPx = (mm: number) => toUnit(mm, 'px');
export const pxToMm = (px: number) => fromUnit(px, 'px');

/** Casas decimais que fazem sentido para cada unidade. */
export const UNIT_DIGITS: Record<Unit, number> = { mm: 2, pt: 2, in: 3, px: 1 };

/** Arredonda sem deixar "-0" nem ruído de ponto flutuante. */
export function round(v: number, digits = 2): number {
  const f = 10 ** digits;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
}

/** Número em português: vírgula decimal, zeros finais removidos. "12,5", "210". */
export function fmt(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '—';
  const r = round(v, digits);
  let s = r.toFixed(digits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',').replace(/^-0$/, '0');
}

/** Valor em mm formatado na unidade de exibição, com sufixo. "12,7 mm", "36 pt". */
export function fmtUnit(mm: number, unit: Unit, digits = UNIT_DIGITS[unit]): string {
  return `${fmt(toUnit(mm, unit), digits)} ${unit}`;
}

/** Lê número digitado em português ou inglês ("12,5" ou "12.5"). NaN se inválido. */
export function parseNum(raw: string): number {
  const s = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
  return parseFloat(s);
}

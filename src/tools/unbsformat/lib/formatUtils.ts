import { CATEGORY_LABEL, FormatPreset } from './formats';
import { fmt } from './units';

/** "210 × 297 mm", "1080 × 1350 px" */
export const formatDimensions = (f: { width: number; height: number; unit?: 'mm' | 'px' }) =>
  `${fmt(f.width, 2)} × ${fmt(f.height, 2)} ${f.unit ?? 'mm'}`;

/**
 * Proporção legível: tenta uma razão inteira pequena (3:2, 16:9, 1:1…)
 * e, quando não existe, cai para "1 : 1,414".
 */
export function aspectRatioLabel(width: number, height: number): string {
  if (!(width > 0) || !(height > 0)) return '—';
  const target = width / height;
  let best: { p: number; q: number; err: number } | null = null;
  // Só razões que um designer reconhece (16:9, 3:2, 21:9…): denominador até 9.
  for (let q = 1; q <= 9; q++) {
    const p = Math.round(target * q);
    if (p < 1) continue;
    const err = Math.abs(p / q - target) / target;
    if (!best || err < best.err) best = { p, q, err };
  }
  if (best && best.err < 0.005) return `${best.p}:${best.q}`;
  const dec = (v: number) => v.toFixed(3).replace('.', ',');
  return target >= 1 ? `${dec(target)} : 1` : `1 : ${dec(1 / target)}`;
}

/** Formato com largura/altura trocadas, mantendo id e categoria. */
export const swapOrientation = <T extends { width: number; height: number }>(f: T): T => ({
  ...f,
  width: f.height,
  height: f.width,
});

/**
 * Busca por nome ou por dimensão.
 * Aceita "a4", "210", "210x297", "297 × 210" (qualquer ordem), "1080x1350".
 */
export function matchesQuery(f: FormatPreset, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const near = (x: number, y: number) => Math.abs(x - y) <= 1;

  const pair = q.match(/^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(mm|px)?$/);
  if (pair) {
    const a = parseFloat(pair[1].replace(',', '.'));
    const b = parseFloat(pair[2].replace(',', '.'));
    return (near(f.width, a) && near(f.height, b)) || (near(f.width, b) && near(f.height, a));
  }

  const single = q.match(/^(\d+(?:[.,]\d+)?)\s*(mm|px)?$/);
  if (single) {
    const v = parseFloat(single[1].replace(',', '.'));
    return near(f.width, v) || near(f.height, v);
  }

  const haystack = `${f.name} ${f.id} ${CATEGORY_LABEL[f.category]}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const needle = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return needle.split(/\s+/).every(word => haystack.includes(word));
}

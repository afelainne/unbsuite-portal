// Configuração: valores iniciais, troca de formato e validação de JSON externo.

import { FORMAT_PRESETS, FormatPreset, FoldType, presetSizeMm, Sides } from './formats';
import { closeGrid, GridConfig, MethodId } from './grid';
import { applyMethod, METHODS } from './methods';
import { ptToMm, pxToMm } from './units';

/** Sangria-padrão: 3 mm (Europa, Brasil). O padrão americano é 0,125 in = 3,175 mm. */
export const BLEED_PRESETS = [
  { label: '3 mm', value: 3 },
  { label: '1/8 in', value: 3.175 },
  { label: '5 mm', value: 5 },
];

const uniform = (v: number): Sides => ({ top: v, right: v, bottom: v, left: v });

/** Configuração inicial: A4, 6 × 8 campos sobre linha de base de 12 pt, já fechada. */
export function defaultConfig(): GridConfig {
  const a4 = FORMAT_PRESETS.find(f => f.id === 'a4')!;
  const base: GridConfig = {
    version: 2,
    formatId: a4.id,
    formatName: a4.name,
    docUnit: 'mm',
    width: 210,
    height: 297,
    bleed: 3,
    safe: uniform(5),
    margins: { top: 20, bottom: 25, inside: 20, outside: 15 },
    facing: false,
    fold: 'none',
    foldTuck: 3,
    foldSide: 'inside',
    columns: 6,
    columnGutter: ptToMm(12),
    columnRatios: null,
    rows: 8,
    rowGutter: ptToMm(12),
    baseline: { enabled: true, leading: ptToMm(12), offset: 0, rowGutterLines: 1, columnGutterLines: 1 },
    fontSize: ptToMm(9.5),
    method: 'livre',
  };
  return closeGrid(base).config;
}

/** Tipografia de partida para cada tipo de documento. */
function typographyFor(docUnit: 'mm' | 'px') {
  return docUnit === 'px'
    ? { leading: pxToMm(8), fontSize: pxToMm(16) }
    : { leading: ptToMm(12), fontSize: ptToMm(9.5) };
}

/**
 * Troca o formato mantendo a grade escolhida: colunas, linhas e método ficam;
 * margens de cânone são recalculadas para a nova página.
 */
export function configForPreset(preset: FormatPreset, prev: GridConfig, landscape?: boolean): GridConfig {
  const size = presetSizeMm(preset);
  const portrait = size.width <= size.height;
  // Sem orientação pedida, o formato fica como a norma o descreve.
  const wantSwap = landscape !== undefined && landscape === portrait && size.width !== size.height;
  const width = wantSwap ? size.height : size.width;
  const height = wantSwap ? size.width : size.height;
  const docUnit = preset.unit;
  const unitChanged = docUnit !== prev.docUnit;
  const fold: FoldType = preset.fold ?? 'none';

  let safe: Sides;
  if (preset.safeArea) {
    const s = preset.safeArea;
    const k = preset.unit === 'px' ? pxToMm : (v: number) => v;
    safe = wantSwap
      ? { top: k(s.left), right: k(s.top), bottom: k(s.right), left: k(s.bottom) }
      : { top: k(s.top), right: k(s.right), bottom: k(s.bottom), left: k(s.left) };
  } else if (docUnit === 'px') {
    safe = uniform(0);
  } else {
    safe = unitChanged ? uniform(5) : prev.safe;
  }

  const typo = typographyFor(docUnit);
  const short = Math.min(width, height);
  // Margem de partida proporcional ao formato, para um cartão não herdar a margem de um cartaz.
  const m = docUnit === 'px' ? pxToMm(Math.max(16, Math.round((short / pxToMm(1)) * 0.06 / 8) * 8)) : Math.max(4, Math.round(short * 0.08));

  const next: GridConfig = {
    ...prev,
    formatId: preset.id,
    formatName: preset.name,
    docUnit,
    width,
    height,
    bleed: docUnit === 'px' ? 0 : prev.docUnit === 'px' ? 3 : prev.bleed,
    safe,
    fold,
    facing: fold !== 'none' || docUnit === 'px' ? false : prev.facing,
    margins: { top: m, bottom: m, inside: m, outside: m },
    baseline: unitChanged ? { ...prev.baseline, leading: typo.leading, offset: 0 } : { ...prev.baseline },
    fontSize: unitChanged ? typo.fontSize : prev.fontSize,
    columnGutter: unitChanged ? (docUnit === 'px' ? pxToMm(24) : ptToMm(12)) : prev.columnGutter,
    rowGutter: unitChanged ? (docUnit === 'px' ? pxToMm(24) : ptToMm(12)) : prev.rowGutter,
  };
  // Grade de tela não herda linha de base de impresso nem vice-versa: reaplica o método.
  if (next.method === 'livre') return next.baseline.enabled ? closeGrid(next).config : next;
  return applyMethod(next.method, next, { columns: next.columns, rows: next.rows });
}

/** Formato personalizado, em mm ou px. */
export function customPreset(width: number, height: number, unit: 'mm' | 'px'): FormatPreset {
  return { id: 'custom', name: 'Personalizado', width, height, unit, category: 'custom' };
}

// ---------- Validação ----------

const num = (v: unknown, min: number, max: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
const int = (v: unknown, min: number, max: number, def: number) => Math.round(num(v, min, max, def));
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

const FOLDS: FoldType[] = ['none', 'half', 'roll', 'z', 'gate'];
const METHOD_IDS = METHODS.map(m => m.id);

/** Valida uma configuração vinda do armazenamento ou de um arquivo JSON. */
export function sanitizeConfig(raw: unknown): GridConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const d = defaultConfig();
  const width = num(r.width, 0, 20000, NaN);
  const height = num(r.height, 0, 20000, NaN);
  if (!(width >= 1) || !(height >= 1)) return null;

  const m = obj(r.margins);
  const s = obj(r.safe);
  const b = obj(r.baseline);
  const maxM = Math.max(width, height);
  const ratios = Array.isArray(r.columnRatios)
    ? (r.columnRatios as unknown[]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0).slice(0, 24)
    : null;

  return {
    version: 2,
    formatId: typeof r.formatId === 'string' ? r.formatId.slice(0, 64) : 'custom',
    formatName: typeof r.formatName === 'string' ? r.formatName.slice(0, 120) : 'Personalizado',
    docUnit: r.docUnit === 'px' ? 'px' : 'mm',
    width,
    height,
    bleed: num(r.bleed, 0, 50, d.bleed),
    safe: {
      top: num(s.top, 0, maxM, 0),
      right: num(s.right, 0, maxM, 0),
      bottom: num(s.bottom, 0, maxM, 0),
      left: num(s.left, 0, maxM, 0),
    },
    margins: {
      top: num(m.top, 0, maxM, d.margins.top),
      bottom: num(m.bottom, 0, maxM, d.margins.bottom),
      inside: num(m.inside, 0, maxM, d.margins.inside),
      outside: num(m.outside, 0, maxM, d.margins.outside),
    },
    facing: r.facing === true,
    fold: FOLDS.includes(r.fold as FoldType) ? (r.fold as FoldType) : 'none',
    foldTuck: num(r.foldTuck, 0, 20, 3),
    foldSide: r.foldSide === 'outside' ? 'outside' : 'inside',
    columns: int(r.columns, 1, 48, d.columns),
    columnGutter: num(r.columnGutter, 0, maxM, d.columnGutter),
    columnRatios: ratios && ratios.length ? ratios : null,
    rows: int(r.rows, 1, 48, d.rows),
    rowGutter: num(r.rowGutter, 0, maxM, d.rowGutter),
    baseline: {
      enabled: b.enabled === true,
      leading: num(b.leading, 0.5, 200, d.baseline.leading),
      offset: num(b.offset, 0, 200, 0),
      rowGutterLines: int(b.rowGutterLines, 0, 20, 1),
      columnGutterLines: int(b.columnGutterLines, 0, 20, 0),
    },
    fontSize: num(r.fontSize, 0.5, 200, d.fontSize),
    method: METHOD_IDS.includes(r.method as MethodId) ? (r.method as MethodId) : 'livre',
  };
}

/** Texto do arquivo .json salvo pelo usuário. */
export function configToJson(c: GridConfig): string {
  return JSON.stringify({ app: 'UNBSFORMAT', ...c }, null, 2);
}

/** Lê um arquivo .json. Devolve null quando não é uma configuração válida. */
export function configFromJson(text: string): GridConfig | null {
  try {
    return sanitizeConfig(JSON.parse(text));
  } catch {
    return null;
  }
}

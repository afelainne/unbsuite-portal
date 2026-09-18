// Cena: a lista de formas que a prévia, o SVG e o PDF desenham.
// Um único lugar decide o que cada camada contém, então os três saem iguais.
// Coordenadas da folha, em mm. As cores seguem a convenção das guias do InDesign
// (margem magenta, coluna violeta, sangria vermelha, linha de base azul-clara):
// são cor de dado, não token de interface.

import type { GridConfig, GridResult } from './grid';
import { constructionLines } from './methods';

export type LayerId =
  | 'sangria'
  | 'seguranca'
  | 'margens'
  | 'modulos'
  | 'colunas'
  | 'medianizes'
  | 'linhasBase'
  | 'construcao'
  | 'dobras'
  | 'cotas';

export type Layers = Record<LayerId, boolean>;

export const LAYER_LABEL: Record<LayerId, string> = {
  sangria: 'Sangria',
  seguranca: 'Segurança',
  margens: 'Margens',
  modulos: 'Módulos',
  colunas: 'Colunas e linhas',
  medianizes: 'Medianizes',
  linhasBase: 'Linha de base',
  construcao: 'Construção',
  dobras: 'Dobras e lombada',
  cotas: 'Cotas',
};

export const LAYER_ORDER: LayerId[] = [
  'modulos', 'colunas', 'medianizes', 'linhasBase', 'margens', 'seguranca', 'sangria', 'dobras', 'construcao', 'cotas',
];

export const DEFAULT_LAYERS: Layers = {
  sangria: true,
  seguranca: true,
  margens: true,
  modulos: true,
  colunas: true,
  medianizes: false,
  linhasBase: true,
  construcao: true,
  dobras: true,
  cotas: true,
};

export const GUIDE_COLORS = {
  trim: '#000000',
  bleed: '#FF2D2D',
  safe: '#00A3D9',
  margin: '#FF00FF',
  column: '#8B3DFF',
  moduleA: '#8B3DFF',
  moduleB: '#8B3DFF',
  gutter: '#FF00FF',
  baseline: '#4DB8FF',
  leftover: '#FF2D2D',
  construction: '#1A1A1A',
  fold: '#00A36C',
} as const;

export interface SceneRect {
  type: 'rect';
  layer: LayerId | 'corte' | 'sobra';
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: string;
  fill?: string;
  fillOpacity?: number;
  /** Espessura em pt na saída; na prévia, em px de tela. */
  weight?: number;
  dash?: number[];
}

export interface SceneLine {
  type: 'line';
  layer: LayerId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  weight?: number;
  dash?: number[];
  opacity?: number;
}

export type SceneItem = SceneRect | SceneLine;

export function buildScene(c: GridConfig, r: GridResult, layers: Layers): SceneItem[] {
  const items: SceneItem[] = [];
  const on = (l: LayerId) => layers[l];

  r.pages.forEach(p => {
    if (on('modulos')) {
      p.modules.forEach(m => {
        items.push({
          type: 'rect', layer: 'modulos', x: m.x, y: m.y, w: m.w, h: m.h,
          fill: (m.row + m.col) % 2 === 0 ? GUIDE_COLORS.moduleA : GUIDE_COLORS.moduleB,
          fillOpacity: (m.row + m.col) % 2 === 0 ? 0.1 : 0.05,
        });
      });
    }
    if (p.leftover && (on('modulos') || on('colunas'))) {
      items.push({ type: 'rect', layer: 'sobra', ...p.leftover, fill: GUIDE_COLORS.leftover, fillOpacity: 0.14 });
    }
    if (on('medianizes')) {
      [...p.columnGutters, ...p.rowGutters].forEach(g =>
        items.push({ type: 'rect', layer: 'medianizes', ...g, fill: GUIDE_COLORS.gutter, fillOpacity: 0.08 }),
      );
    }
    if (on('colunas')) {
      p.columns.forEach(col => items.push({ type: 'rect', layer: 'colunas', ...col, stroke: GUIDE_COLORS.column, weight: 0.5 }));
      if (p.rows.length > 1) {
        p.rows.forEach(row => items.push({ type: 'rect', layer: 'colunas', ...row, stroke: GUIDE_COLORS.column, weight: 0.5 }));
      }
    }
  });

  if (on('linhasBase')) {
    r.pages.forEach(p => {
      r.baselines.forEach(y =>
        items.push({ type: 'line', layer: 'linhasBase', x1: p.textBlock.x, y1: y, x2: p.textBlock.x + p.textBlock.w, y2: y, stroke: GUIDE_COLORS.baseline, weight: 0.35 }),
      );
    });
  }

  r.pages.forEach(p => {
    if (on('margens') && p.textBlock.w > 0 && p.textBlock.h > 0) {
      items.push({ type: 'rect', layer: 'margens', ...p.textBlock, stroke: GUIDE_COLORS.margin, weight: 0.75 });
    }
    if (on('seguranca') && (c.safe.top || c.safe.right || c.safe.bottom || c.safe.left)) {
      items.push({ type: 'rect', layer: 'seguranca', ...p.safe, stroke: GUIDE_COLORS.safe, weight: 0.75, dash: [4, 3] });
    }
  });

  if (on('sangria') && r.bleed > 0) {
    items.push({ type: 'rect', layer: 'sangria', ...r.bleedBox, stroke: GUIDE_COLORS.bleed, weight: 0.75 });
  }

  if (on('dobras')) {
    r.folds.forEach(x =>
      items.push({ type: 'line', layer: 'dobras', x1: x, y1: -r.bleed, x2: x, y2: r.height + r.bleed, stroke: GUIDE_COLORS.fold, weight: 0.75, dash: [6, 4] }),
    );
  }

  if (on('construcao')) {
    const segs = constructionLines({ method: c.method, width: c.width, height: c.height, pages: r.pages });
    segs.forEach(s =>
      items.push({
        type: 'line', layer: 'construcao', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2,
        stroke: GUIDE_COLORS.construction, weight: s.kind === 'main' ? 0.5 : 0.35,
        dash: s.kind === 'main' ? undefined : [3, 3], opacity: s.kind === 'main' ? 0.55 : 0.4,
      }),
    );
  }

  // Corte: sempre, por cima.
  // Folheto com dobra é uma folha só: um corte; as dobras vão na camada delas.
  const trims = c.fold !== 'none' ? [{ x: 0, y: 0, w: r.width, h: r.height }] : r.pages.map(p => p.trim);
  trims.forEach(t => items.push({ type: 'rect', layer: 'corte', ...t, stroke: GUIDE_COLORS.trim, weight: 0.75 }));

  return items;
}

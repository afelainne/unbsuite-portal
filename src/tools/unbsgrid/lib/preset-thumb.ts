/**
 * Miniatura esquemática de um preset.
 *
 * Um preset é um conjunto de construções ligadas. Em vez de renderizar o logo
 * com paper.js em cada cartão — caro e inútil num quadrado de 40 px — aqui a
 * lista de construções vira um punhado de *motivos*: caixa, círculo, eixo,
 * diagonal, áurea, grade, tipografia, pontos, escala. O cartão desenha os três
 * motivos mais presentes, cada um na cor que aquela construção tem na cena.
 *
 * Lógica pura, sem React e sem DOM: o componente só traduz o resultado em SVG.
 */
import { GEOMETRY_KEYS, type GeometryOptions, type GeometryStyles } from '../types/geometry';

export type MotifId =
  | 'box' | 'circle' | 'cross' | 'diagonal' | 'golden'
  | 'grid' | 'type' | 'points' | 'scale';

type GeometryKey = keyof GeometryOptions;

/**
 * Que construções alimentam cada motivo. Toda chave de `GEOMETRY_KEYS` aparece
 * exatamente uma vez — o teste da biblioteca de presets garante isso, para que
 * uma construção nova nunca fique sem miniatura.
 */
export const MOTIF_KEYS: Record<MotifId, readonly GeometryKey[]> = {
  box: ['boundingRects', 'safeZone', 'kenBurnsSafe', 'alignmentGuides', 'opticalEdges'],
  circle: ['circles', 'underlyingCircles', 'vesicaPiscis', 'flowerOfLife', 'polarGrid', 'reuleauxTriangle'],
  cross: ['centerLines', 'symmetryAxes', 'opticalCenter', 'skeletonCenterline', 'letterAxes'],
  diagonal: ['diagonals', 'dominantDiagonals', 'parallelFlowLines', 'slantAngle', 'angleMeasurements', 'tangentLines', 'tangentIntersections'],
  golden: ['goldenRatio', 'goldenSpiral', 'fibonacciOverlay', 'rootRectangles', 'thirdLines', 'ruleOfOdds', 'harmonicDivisions', 'modularScale'],
  grid: ['isometricGrid', 'hexGrid', 'triangularGrid', 'pixelGrid', 'constructionGrid', 'concentricSquares', 'xHeightGrid'],
  type: ['typographicProportions', 'wordBaselines', 'letterHeights', 'inkHeightBands', 'letterRhythm', 'densityCurve', 'counterAreas', 'letterStemWidth'],
  points: ['anchorPoints', 'anchoringPoints', 'bezierHandles', 'curvatureComb', 'pathDirectionArrows', 'cornerRadii'],
  scale: ['reductionTest', 'spacingGuides', 'componentRatioLabels', 'visualWeightMap', 'contrastGuide', 'strokeWeight', 'signatureRelation', 'dynamicBaseline'],
};

/** Ordem de desenho, também o desempate quando dois motivos empatam. */
export const MOTIF_IDS = Object.keys(MOTIF_KEYS) as MotifId[];

export interface PresetMotif {
  id: MotifId;
  /** Cor da primeira construção daquele motivo, como ela sai na cena. */
  color: string;
}

const FALLBACK_COLOR = '#1c1c1e';

export interface ThumbSource {
  geometryOptions: GeometryOptions;
  geometryStyles?: GeometryStyles;
  showGrid?: boolean;
}

/** Quantas construções o preset liga (a grade da cena conta como uma). */
export const constructionCount = (preset: ThumbSource): number =>
  (GEOMETRY_KEYS as readonly GeometryKey[]).filter(key => preset.geometryOptions?.[key] === true).length
  + (preset.showGrid ? 1 : 0);

/**
 * Os motivos do preset, do mais presente ao menos, no máximo `max`.
 * Um preset sem nenhuma construção devolve lista vazia — o cartão mostra só a
 * silhueta neutra.
 */
export function presetMotifs(preset: ThumbSource, max = 3): PresetMotif[] {
  const options = preset.geometryOptions;
  if (!options) return [];
  const scored: Array<{ motif: PresetMotif; count: number; order: number }> = [];

  MOTIF_IDS.forEach((id, order) => {
    const on = MOTIF_KEYS[id].filter(key => options[key] === true);
    if (on.length === 0) return;
    const color = preset.geometryStyles?.[on[0]]?.color ?? FALLBACK_COLOR;
    scored.push({ motif: { id, color }, count: on.length, order });
  });

  if (preset.showGrid && !scored.some(s => s.motif.id === 'grid')) {
    scored.push({
      motif: { id: 'grid', color: preset.geometryStyles?.constructionGrid?.color ?? FALLBACK_COLOR },
      count: 1,
      order: MOTIF_IDS.indexOf('grid'),
    });
  }

  return scored
    .sort((a, b) => (b.count - a.count) || (a.order - b.order))
    .slice(0, Math.max(0, max))
    .map(s => s.motif);
}

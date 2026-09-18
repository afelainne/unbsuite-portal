/**
 * Sugestões de construção a partir do diagnóstico.
 *
 * Cada ponto fraco medido em `diagnosis.ts` aponta para as construções
 * geométricas que permitem INVESTIGAR aquele número no canvas — nunca para
 * "melhorar o logo". A sugestão devolve as chaves de `GeometryOptions` que o
 * painel liga e o motivo, sempre com o número medido dentro da frase.
 *
 * Módulo puro: sem paper, sem DOM, sem estado. Recebe `LogoDiagnosis` e
 * devolve uma lista ordenada por urgência.
 */
import type { GeometryOptions } from '../types/geometry';
import {
  CRITERION_LABELS, OK_SCORE, CRITICAL_SCORE, fmt,
  type CriterionKey, type CriterionScore, type LogoDiagnosis,
} from './diagnosis';
import { activeT } from '../i18n/runtime';
import { fill, type FillVars } from '../i18n/format';
import type { Translations } from '../i18n/types';

type SuggestKey = keyof Translations['suggest'];
/** A suggestion message in the active language. */
const tr = (key: SuggestKey, vars?: FillVars): string => fill(activeT().suggest[key], vars);

export type GeometryKeyList = Array<keyof GeometryOptions>;

export interface GeometrySuggestion {
  /** Identificador estável (critério + variante), útil como `key` no React. */
  id: string;
  criterion: CriterionKey;
  /** Rótulo do botão, curto e no imperativo. */
  label: string;
  /** Por que essa construção, com o número medido. */
  reason: string;
  /** Construções a ligar. */
  keys: GeometryKeyList;
  /**
   * Urgência = peso do critério × (100 − nota). Quanto maior, mais alto na
   * lista. Exposta para o painel poder destacar as primeiras.
   */
  urgency: number;
}

export interface SuggestOptions {
  /**
   * Nota abaixo da qual o critério vira sugestão. Padrão `OK_SCORE` (80): é o
   * mesmo limite que pinta o critério como resolvido no painel, então a lista
   * de sugestões é exatamente "o que não está resolvido".
   */
  threshold?: number;
  /** Máximo de sugestões devolvidas (padrão 6, o que cabe no painel sem rolagem). */
  limit?: number;
}

/**
 * Construções por critério. As chaves saem de `GEOMETRY_KEYS`
 * (`types/geometry.ts`) e foram escolhidas pelo que cada renderizador mede:
 *
 * - proporção → retângulos de raiz, seção áurea e rótulos de razão desenham a
 *   proporção notável por cima do bounding box.
 * - equilíbrio → centro óptico e mapa de peso visual mostram para onde a
 *   massa de tinta puxa; terços e linhas de centro dão a referência.
 * - simetria → eixos de simetria desenham a cópia espelhada sobre o desenho.
 * - redução → teste de redução, relatório de espessura, grade de pixel e zona
 *   de segurança mostram onde o traço morre.
 * - complexidade → nós, alças e pente de curvatura expõem nó a nó o excesso;
 *   grade de construção e círculos-base expõem a falta de estrutura.
 * - consistência → raios de canto, espessura, guias de espaçamento e de
 *   alinhamento comparam peça por peça.
 * - higiene → nós e setas de direção de path revelam pontos duplicados,
 *   subpaths soltos e elementos fora do lugar.
 */
const SUGGESTION_KEYS: Record<string, GeometryKeyList> = {
  proporcao: ['boundingRects', 'rootRectangles', 'goldenRatio', 'componentRatioLabels'],
  equilibrio: ['opticalCenter', 'visualWeightMap', 'centerLines', 'thirdLines'],
  simetria: ['symmetryAxes', 'centerLines'],
  reducao: ['reductionTest', 'strokeWeight', 'pixelGrid', 'safeZone'],
  'complexidade-alta': ['anchorPoints', 'bezierHandles', 'curvatureComb', 'skeletonCenterline'],
  'complexidade-baixa': ['constructionGrid', 'underlyingCircles', 'circles'],
  consistencia: ['cornerRadii', 'strokeWeight', 'spacingGuides', 'alignmentGuides'],
  higiene: ['anchorPoints', 'pathDirectionArrows', 'boundingRects'],
};

/** Button label of each suggestion (`suggest` namespace of the dictionary). */
const LABEL_KEYS: Record<string, SuggestKey> = {
  proporcao: 'labelProportion',
  equilibrio: 'labelBalance',
  simetria: 'labelSymmetry',
  reducao: 'labelReduction',
  'complexidade-alta': 'labelComplexityHigh',
  'complexidade-baixa': 'labelComplexityLow',
  consistencia: 'labelConsistency',
  higiene: 'labelHygiene',
};

function urgencyOf(c: CriterionScore): number {
  return Math.round(c.weight * (100 - c.score) * 100) / 100;
}

function reasonFor(d: LogoDiagnosis, c: CriterionScore): string {
  switch (c.key) {
    case 'proporcao': {
      const n = d.proportion.nearest;
      return n
        ? tr('reasonProportionNear', { ratio: fmt(d.proportion.ratio), deviation: fmt(n.deviationPercent, 1), name: n.name })
        : tr('reasonProportionNone');
    }
    case 'equilibrio':
      return tr('reasonBalance', { deviation: fmt(d.balance.deviationPercent, 1), spread: fmt(d.balance.quadrantSpread * 100, 0) });
    case 'simetria':
      return tr('reasonSymmetry', {
        axis: activeT().diagnosis[d.symmetry.bestAxis === 'vertical' ? 'axisVertical' : 'axisHorizontal'],
        percent: fmt(d.symmetry.bestPercent, 0),
      });
    case 'reducao':
      return d.reduction.losesAt
        ? tr('reasonReductionLoses', { size: d.reduction.losesAt, stroke: fmt(d.reduction.minStroke) })
        : tr('reasonReductionLimit', { stroke: fmt(d.reduction.minStroke) });
    case 'complexidade':
      return d.complexity.reading === 'detalhado-demais'
        ? tr('reasonComplexityHigh', { anchors: d.complexity.anchorCount, subpaths: d.complexity.subpathCount })
        : tr('reasonComplexityLow', { anchors: d.complexity.anchorCount, subpaths: d.complexity.subpathCount });
    case 'consistencia': {
      const spread = d.consistency.strokeSpread;
      const out = d.consistency.radiusOutliers.length;
      const parts: string[] = [];
      if (spread !== null) parts.push(tr('reasonConsistencySpread', { spread: `${fmt(spread * 100, 0)}%` }));
      if (out) parts.push(tr('reasonConsistencyRadii', { count: out }));
      const text = parts.join(' · ') || tr('reasonConsistencyFallback');
      return tr('reasonConsistency', { parts: text.charAt(0).toUpperCase() + text.slice(1) });
    }
    case 'higiene': {
      const worst = c.issues[0] ?? tr('reasonHygieneFallback');
      return tr('reasonHygiene', { worst });
    }
    default:
      return c.summary;
  }
}

/**
 * Sugere construções para cada critério abaixo do limite.
 *
 * Critérios com `applicable: false` não geram sugestão — não há o que
 * investigar. A lista sai ordenada por urgência (peso × distância de 100) e
 * cortada em `limit`.
 */
export function suggestGeometries(
  diagnosis: LogoDiagnosis | null | undefined,
  options: SuggestOptions = {},
): GeometrySuggestion[] {
  if (!diagnosis?.ok || !Array.isArray(diagnosis.criteria)) return [];
  const threshold = Number.isFinite(options.threshold) ? (options.threshold as number) : OK_SCORE;
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.round(options.limit as number)) : 6;

  const out: GeometrySuggestion[] = [];
  for (const c of diagnosis.criteria) {
    if (!c.applicable || c.score >= threshold) continue;
    const variant = c.key === 'complexidade'
      ? (diagnosis.complexity.reading === 'simples-demais' ? 'complexidade-baixa' : 'complexidade-alta')
      : c.key;
    const keys = SUGGESTION_KEYS[variant];
    if (!keys?.length) continue;
    out.push({
      id: variant,
      criterion: c.key,
      label: LABEL_KEYS[variant] ? tr(LABEL_KEYS[variant]) : tr('labelFallback', { criterion: CRITERION_LABELS[c.key].toLowerCase() }),
      reason: reasonFor(diagnosis, c),
      keys: [...keys],
      urgency: urgencyOf(c),
    });
  }

  return out.sort((a, b) => b.urgency - a.urgency || a.id.localeCompare(b.id)).slice(0, limit);
}

/**
 * União das chaves de todas as sugestões, sem repetição — o que o botão
 * "ligar tudo" do painel envia.
 */
export function allSuggestedKeys(suggestions: GeometrySuggestion[]): GeometryKeyList {
  const seen = new Set<keyof GeometryOptions>();
  const out: GeometryKeyList = [];
  for (const s of suggestions || []) {
    for (const k of s.keys || []) {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** Sugestões que vieram de critérios reprovados (nota < CRITICAL_SCORE). */
export function criticalSuggestions(
  diagnosis: LogoDiagnosis | null | undefined,
  suggestions: GeometrySuggestion[],
): GeometrySuggestion[] {
  if (!diagnosis?.criteria) return [];
  const critical = new Set(
    diagnosis.criteria.filter(c => c.applicable && c.score < CRITICAL_SCORE).map(c => c.key),
  );
  return (suggestions || []).filter(s => critical.has(s.criterion));
}

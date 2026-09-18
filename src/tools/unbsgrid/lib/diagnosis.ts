/**
 * Diagnóstico do logo: sete critérios medidos no vetor, cada um com nota de
 * 0 a 100 e explicação curta, mais uma nota geral composta.
 *
 * Regra do módulo: nenhum critério é opinião. Toda nota sai de um número
 * medido no desenho (unidades do SVG ou px do teste de redução) comparado a
 * um limite declarado como constante, com o motivo do limite no comentário.
 * Quando um critério não se aplica ao desenho (por exemplo, cantos
 * arredondados num logo sem cantos), ele entra com `applicable: false` e sai
 * do cálculo da nota geral em vez de receber uma nota inventada.
 *
 * Sem UI, sem rede, sem `Date`: a mesma entrada devolve sempre a mesma saída,
 * o que torna o módulo testável e memoizável.
 */
import paper from 'paper';
import { sanitizeSVG, SvgParseError } from './svg-sanitize';
import { collectPaths } from './svg-engine';
import { computeLogoMetrics, type LogoMetrics, type Quadrants } from './metrics';
import { hashKey, LRUCache } from './memo';
import { activeT, activeLanguage, activeLocale } from '../i18n/runtime';
import { fill, type FillVars } from '../i18n/format';
import type { Translations } from '../i18n/types';

type DiagnosisKey = keyof Translations['diagnosis'];
/** A diagnosis message in the active language, with its numbers filled in. */
const tr = (key: DiagnosisKey, vars?: FillVars): string => fill(activeT().diagnosis[key], vars);
import { measureMirrorSymmetry, type SymmetryMeasurement } from '../components/renderers/measurement';
import {
  inkShapes, scanInk, transposeShapes, boxOf,
  measureStrokeWeight, reductionSteps, REDUCTION_SIZES,
  detectCornerRadii, clusterRadii,
  type Box, type Pt2, type StrokeWeightStats, type ReductionStep, type CornerArc,
} from '../components/renderers/extra';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type CriterionKey =
  | 'proporcao' | 'equilibrio' | 'simetria' | 'reducao'
  | 'complexidade' | 'consistencia' | 'higiene';

export type CriterionLevel = 'ok' | 'atencao' | 'critico';

export interface DiagnosisDetail {
  label: string;
  /** Já formatado para leitura (número + unidade). */
  value: string;
}

export interface CriterionScore {
  key: CriterionKey;
  label: string;
  /** 0..100. Sempre finito; 0 quando não há o que medir. */
  score: number;
  /** Peso no cálculo da nota geral (ver `CRITERION_WEIGHTS`). */
  weight: number;
  level: CriterionLevel;
  /** Uma frase com o número que gerou a nota. */
  summary: string;
  details: DiagnosisDetail[];
  /** Problemas concretos encontrados, um por linha. Vazio quando não há. */
  issues: string[];
  /** false quando o critério não tem o que medir neste desenho. */
  applicable: boolean;
}

export interface ProportionReport {
  width: number;
  height: number;
  /** largura ÷ altura. */
  ratio: number;
  /** Rótulo legível ("1:1", "φ", "1,37:1"). */
  ratioLabel: string;
  orientation: 'landscape' | 'portrait' | 'square';
  /** Proporção notável mais próxima e o quanto o logo se afasta dela. */
  nearest: { name: string; value: number; deviationPercent: number } | null;
  /** true quando o desvio para a proporção notável está dentro de MATCH. */
  matches: boolean;
}

export interface BalanceReport {
  geometricCenter: Pt2;
  visualCenter: Pt2 | null;
  /** Desvio do centro visual em % da largura / altura (positivo = direita / baixo). */
  offsetPercent: Pt2;
  /** |desvio| em % da diagonal do bounding box. */
  deviationPercent: number;
  quadrants: Quadrants;
  /** Maior − menor participação entre os quatro quadrantes (0..1). */
  quadrantSpread: number;
  heaviestQuadrant: keyof Quadrants | null;
  lightestQuadrant: keyof Quadrants | null;
}

export interface SymmetryReport {
  vertical: SymmetryMeasurement;
  horizontal: SymmetryMeasurement;
  /** Tolerância usada na medição, em unidades do SVG. */
  tolerance: number;
  /** Eixo com maior simetria. */
  bestAxis: 'vertical' | 'horizontal';
  bestPercent: number;
  /** Espelhamento por varredura de tinta (0..1), medido em `metrics`. */
  inkMirror: { vertical: number; horizontal: number };
}

export interface ReductionReport {
  /** Traço mais fino, em unidades do SVG. */
  minStroke: number;
  minStrokeAt: Pt2 | null;
  /** Menor vão (contraforma / espaçamento), em unidades do SVG. */
  minGap: number | null;
  minGapAt: Pt2 | null;
  /** Altura usada como referência para converter em px. */
  contentHeight: number;
  steps: ReductionStep[];
  /** Maior tamanho (px) em que algum detalhe fica abaixo de 1 px. null = nenhum. */
  losesAt: number | null;
  /** Maior tamanho (px) em que algum detalhe fica entre 1 e 1,5 px. */
  riskAt: number | null;
}

export type ComplexityReading = 'simples-demais' | 'equilibrado' | 'detalhado-demais';

export interface ComplexityReport {
  anchorCount: number;
  subpathCount: number;
  smoothAnchorRatio: number;
  reading: ComplexityReading;
}

export interface ConsistencyReport {
  /** Espessuras medidas: percentis em unidades do SVG. */
  strokeQuantiles: { p10: number; p25: number; p50: number; p75: number; p90: number } | null;
  /** (p75 − p25) ÷ p50. 0 = monolinear. */
  strokeSpread: number | null;
  strokeSamples: number;
  /** Raios agrupados, do grupo mais numeroso para o menos. */
  radiiClusters: Array<{ radius: number; count: number }>;
  cornerCount: number;
  /** Participação do grupo de raios dominante (0..1). */
  dominantRadiusShare: number | null;
  /** Raios que não pertencem ao grupo dominante. */
  radiusOutliers: Array<{ radius: number; count: number }>;
  /**
   * A tinta é uma massa cheia (disco, bloco) e não um sistema de traços: a
   * dispersão de espessura mede a geometria da silhueta, não o acabamento.
   */
  solidMass: boolean;
}

export interface HygieneReport {
  emptyPaths: number;
  duplicateNodes: number;
  redundantGroups: number;
  textElements: number;
  danglingTransforms: number;
  offCanvasElements: number;
  /** Avisos do saneamento do arquivo (elementos removidos, viewBox inválido…). */
  warnings: string[];
}

export interface LogoDiagnosis {
  /** false quando não há desenho mensurável (arquivo vazio, inválido ou sem tinta). */
  ok: boolean;
  /** Motivo quando `ok` é false. */
  reason: string | null;
  overall: {
    /** 0..100, média ponderada dos critérios aplicáveis. */
    score: number;
    label: string;
    /** Como a nota foi composta, com os pesos efetivos. */
    summary: string;
    /** Soma dos pesos usados (menor que 1 quando algum critério não se aplica). */
    weightUsed: number;
  };
  criteria: CriterionScore[];
  proportion: ProportionReport;
  balance: BalanceReport;
  symmetry: SymmetryReport;
  reduction: ReductionReport;
  complexity: ComplexityReport;
  consistency: ConsistencyReport;
  hygiene: HygieneReport;
  metrics: LogoMetrics;
}

export type DiagnosisInput = string | { originalSVG: string; sourceSVG?: string };

export interface DiagnoseOptions {
  /** Linhas de varredura das métricas (padrão 256). */
  resolution?: number;
  /** Amostras por eixo na medição de simetria (padrão 120). */
  symmetrySamples?: number;
  /** Tamanhos do teste de redução, em px (padrão 16 / 24 / 32 / 48). */
  reductionSizes?: number[];
}

// ---------------------------------------------------------------------------
// Pesos da nota geral
// ---------------------------------------------------------------------------

/**
 * Peso de cada critério na nota geral. Soma 1.
 *
 * Justificativa de cada peso:
 * - `reducao` 0,25 — é o único critério que reprova o arquivo para uso real:
 *   um traço que some a 16 px inviabiliza favicon, app icon e bordado.
 * - `equilibrio` 0,20 — desvio do centro visual afeta todo posicionamento do
 *   logo em layout e é caro de corrigir depois (mexe no desenho).
 * - `complexidade` 0,15 — número de nós e de subpaths determina se o desenho
 *   sobrevive à redução e quanto custa manter o arquivo.
 * - `proporcao` 0,10 — define o encaixe em grades e assinaturas; desvio é
 *   corrigível sem redesenhar.
 * - `simetria` 0,10 — descritivo: nem todo logo precisa ser simétrico, então
 *   pesa pouco, mas expõe desalinhamentos não intencionais.
 * - `consistencia` 0,10 — raios e espessuras fora do padrão são acabamento.
 * - `higiene` 0,10 — não muda o desenho, muda a entrega do arquivo.
 */
export const CRITERION_WEIGHTS: Record<CriterionKey, number> = {
  reducao: 0.25,
  equilibrio: 0.20,
  complexidade: 0.15,
  proporcao: 0.10,
  simetria: 0.10,
  consistencia: 0.10,
  higiene: 0.10,
};

const CRITERION_DICT: Record<CriterionKey, DiagnosisKey> = {
  proporcao: 'criterionProportion',
  equilibrio: 'criterionBalance',
  simetria: 'criterionSymmetry',
  reducao: 'criterionReduction',
  complexidade: 'criterionComplexity',
  consistencia: 'criterionConsistency',
  higiene: 'criterionHygiene',
};

/** Criterion names, read in the active language on every access. */
export const CRITERION_LABELS: Readonly<Record<CriterionKey, string>> = Object.defineProperties(
  {} as Record<CriterionKey, string>,
  Object.fromEntries((Object.keys(CRITERION_DICT) as CriterionKey[]).map(k => [
    k, { enumerable: true, get: () => activeT().diagnosis[CRITERION_DICT[k]] },
  ])),
);

/** Level names ("settled", "watch", "critical") in the active language. */
export const levelLabel = (level: CriterionLevel): string =>
  tr(level === 'ok' ? 'levelOk' : level === 'atencao' ? 'levelWarning' : 'levelCritical');

/** Ordem de exibição (do mais pesado ao mais leve, higiene por último). */
export const CRITERION_ORDER: CriterionKey[] = [
  'reducao', 'equilibrio', 'complexidade', 'proporcao', 'simetria', 'consistencia', 'higiene',
];

/** Acima disso o critério está resolvido; abaixo de CRITICAL_SCORE ele reprova. */
export const OK_SCORE = 80;
export const CRITICAL_SCORE = 50;

// ---------------------------------------------------------------------------
// Utilidades numéricas
// ---------------------------------------------------------------------------

const clamp = (v: number, lo = 0, hi = 100) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

/** Nota linear: 100 em `best`, 0 em `worst`. `best` pode ser maior ou menor que `worst`. */
function ramp(value: number, best: number, worst: number): number {
  if (!Number.isFinite(value) || best === worst) return 0;
  const t = (value - worst) / (best - worst);
  return clamp(t * 100);
}

const round1 = (v: number) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);
const round2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
const finite = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);

/** Number in the active locale, never in scientific notation. */
export function fmt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(activeLocale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const pct = (v: number, decimals = 0) => `${fmt(finite(v) * 100, decimals)}%`;

function levelOf(score: number): CriterionLevel {
  if (score >= OK_SCORE) return 'ok';
  if (score >= CRITICAL_SCORE) return 'atencao';
  return 'critico';
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ---------------------------------------------------------------------------
// 1. Proporção
// ---------------------------------------------------------------------------

/**
 * Proporções notáveis: as que um designer reconhece num sistema de grade.
 * Guardadas sempre >= 1 (a razão do logo é normalizada antes da comparação,
 * então um retrato 2:3 casa com "3:2" e o rótulo é invertido na exibição).
 */
const NOTABLE_RATIOS: Array<[string, number]> = [
  ['1:1', 1],
  ['5:4', 5 / 4],
  ['4:3', 4 / 3],
  ['3:2', 3 / 2],
  ['√2', Math.SQRT2],
  ['φ', (1 + Math.sqrt(5)) / 2],
  ['16:9', 16 / 9],
  ['√3', Math.sqrt(3)],
  ['2:1', 2],
  ['√5', Math.sqrt(5)],
  ['3:1', 3],
];

/**
 * Desvio relativo abaixo do qual a razão "é" a proporção notável: 1,5%.
 * Num logo de 300 px de largura, 1,5% são 4,5 px — a espessura de uma
 * compensação óptica, não uma proporção diferente.
 */
const RATIO_MATCH = 0.015;
/**
 * Desvio a partir do qual a proporção deixa de ler como a notável: 8%.
 * Acima disso um quadrado vira retângulo a olho nu (300 × 324 px).
 */
const RATIO_MISS = 0.08;
/**
 * Razão acima da qual o logo é uma faixa: 4:1. Reserva sozinho uma linha
 * inteira de layout e não cabe em espaços quadrados (avatar, favicon).
 */
const RATIO_EXTREME = 4;

export function nearestNotableRatio(ratio: number): { name: string; value: number; deviationPercent: number } | null {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return null;
  const normalized = ratio >= 1 ? ratio : 1 / ratio;
  let best: { name: string; value: number; deviationPercent: number } | null = null;
  for (const [name, value] of NOTABLE_RATIOS) {
    const dev = Math.abs(normalized - value) / value;
    if (!best || dev < best.deviationPercent / 100) {
      const label = ratio >= 1 || name === '1:1'
        ? name
        : name.includes(':') ? name.split(':').reverse().join(':') : `1:${name}`;
      best = { name: label, value: ratio >= 1 ? value : 1 / value, deviationPercent: dev * 100 };
    }
  }
  return best ? { ...best, deviationPercent: round2(best.deviationPercent) } : null;
}

function scoreProportion(m: LogoMetrics): { report: ProportionReport; criterion: CriterionScore } {
  const ratio = finite(m.aspectRatio);
  const nearest = nearestNotableRatio(ratio);
  const matches = !!nearest && nearest.deviationPercent <= RATIO_MATCH * 100;
  const report: ProportionReport = {
    width: round2(m.width),
    height: round2(m.height),
    ratio: round2(ratio),
    ratioLabel: m.aspectRatioLabel,
    orientation: m.orientation,
    nearest,
    matches,
  };

  const dev = nearest ? nearest.deviationPercent / 100 : 1;
  // 100 quando o desvio está dentro de RATIO_MATCH, 0 quando passa de RATIO_MISS.
  let score = ramp(dev, RATIO_MATCH, RATIO_MISS);
  const issues: string[] = [];
  if (!matches && nearest) {
    issues.push(tr('proportionIssueFar', { ratio: fmt(ratio), deviation: fmt(nearest.deviationPercent, 1), name: nearest.name }));
  }
  // Penalidade por formato em faixa: cada unidade acima de 4:1 tira 15 pontos.
  const longSide = ratio >= 1 ? ratio : 1 / ratio;
  if (longSide > RATIO_EXTREME) {
    score = clamp(score - (longSide - RATIO_EXTREME) * 15);
    issues.push(tr('proportionIssueSquare', { ratio: fmt(longSide, 2) }));
  }
  score = clamp(score);

  const summary = nearest
    ? matches
      ? tr('proportionSummaryMatch', { ratio: fmt(ratio), label: report.ratioLabel, name: nearest.name, deviation: fmt(nearest.deviationPercent, 1) })
      : tr('proportionSummaryNear', { ratio: fmt(ratio), label: report.ratioLabel, name: nearest.name, deviation: fmt(nearest.deviationPercent, 1) })
    : tr('proportionSummaryNone');

  return {
    report,
    criterion: {
      key: 'proporcao',
      label: CRITERION_LABELS.proporcao,
      score: Math.round(score),
      weight: CRITERION_WEIGHTS.proporcao,
      level: levelOf(score),
      summary,
      details: [
        { label: tr('proportionDetailSize'), value: `${fmt(m.width)} × ${fmt(m.height)}` },
        { label: tr('proportionDetailRatio'), value: `${fmt(ratio)} (${report.ratioLabel})` },
        { label: tr('proportionDetailNotable'), value: nearest ? tr('proportionDetailNotableValue', { name: nearest.name, deviation: fmt(nearest.deviationPercent, 1) }) : '—' },
        { label: tr('proportionDetailOrientation'), value: tr(ORIENTATION_KEY[m.orientation]) },
      ],
      issues,
      applicable: m.width > 0 && m.height > 0,
    },
  };
}

const ORIENTATION_KEY = { landscape: 'orientationLandscape', portrait: 'orientationPortrait', square: 'orientationSquare' } as const;

// ---------------------------------------------------------------------------
// 2. Equilíbrio
// ---------------------------------------------------------------------------

/**
 * Desvio do centro visual, em % da diagonal, que ainda não é perceptível:
 * 1%. Num logo de 200 px de diagonal, 2 px — dentro do arredondamento de
 * rasterização, ninguém enxerga.
 */
const BALANCE_OK_DEVIATION = 1;
/**
 * Desvio em que o logo lê como torto: 6% da diagonal (12 px num logo de
 * 200 px). A partir daí qualquer centralização automática erra visivelmente.
 */
const BALANCE_BAD_DEVIATION = 6;
/**
 * Diferença aceitável entre o quadrante mais cheio e o mais vazio: 0,15
 * (por exemplo 32% × 17%). Desenhos com um elemento dominante (uma seta, uma
 * letra) passam disso naturalmente; 0,45 é um desenho concentrado num canto.
 */
const QUADRANT_OK_SPREAD = 0.15;
const QUADRANT_BAD_SPREAD = 0.45;

const QUADRANT_KEY: Record<keyof Quadrants, DiagnosisKey> = {
  topLeft: 'quadrantTopLeft',
  topRight: 'quadrantTopRight',
  bottomLeft: 'quadrantBottomLeft',
  bottomRight: 'quadrantBottomRight',
};
const quadrantName = (k: keyof Quadrants) => tr(QUADRANT_KEY[k]);

function scoreBalance(m: LogoMetrics): { report: BalanceReport; criterion: CriterionScore } {
  const keys = Object.keys(m.quadrants) as Array<keyof Quadrants>;
  const values = keys.map(k => finite(m.quadrants[k]));
  const maxV = values.length ? Math.max(...values) : 0;
  const minV = values.length ? Math.min(...values) : 0;
  const spread = m.visualCenter ? maxV - minV : 0;
  const heaviest = m.visualCenter ? keys[values.indexOf(maxV)] ?? null : null;
  const lightest = m.visualCenter ? keys[values.indexOf(minV)] ?? null : null;

  const report: BalanceReport = {
    geometricCenter: { x: round2(m.geometricCenter.x), y: round2(m.geometricCenter.y) },
    visualCenter: m.visualCenter ? { x: round2(m.visualCenter.x), y: round2(m.visualCenter.y) } : null,
    offsetPercent: { x: round2(m.offsetPercent.x), y: round2(m.offsetPercent.y) },
    deviationPercent: round2(m.deviationPercent),
    quadrants: m.quadrants,
    quadrantSpread: round2(spread),
    heaviestQuadrant: heaviest,
    lightestQuadrant: lightest,
  };

  const applicable = !!m.visualCenter;
  // 60% do peso no desvio do centro (o que move o logo no layout) e 40% na
  // distribuição por quadrante (o que denuncia massa concentrada num canto).
  const devScore = ramp(finite(m.deviationPercent), BALANCE_OK_DEVIATION, BALANCE_BAD_DEVIATION);
  const quadScore = ramp(spread, QUADRANT_OK_SPREAD, QUADRANT_BAD_SPREAD);
  const score = applicable ? clamp(devScore * 0.6 + quadScore * 0.4) : 0;

  const issues: string[] = [];
  if (applicable && m.deviationPercent > BALANCE_OK_DEVIATION) {
    const dirX = tr(m.offsetPercent.x > 0 ? 'balanceDirRight' : 'balanceDirLeft');
    const dirY = tr(m.offsetPercent.y > 0 ? 'balanceDirDown' : 'balanceDirUp');
    issues.push(tr('balanceIssueOffset', {
      deviation: fmt(m.deviationPercent, 1),
      x: fmt(Math.abs(m.offsetPercent.x), 1), dirX,
      y: fmt(Math.abs(m.offsetPercent.y), 1), dirY,
    }));
  }
  if (applicable && spread > QUADRANT_OK_SPREAD && heaviest && lightest) {
    issues.push(
      tr('balanceIssueQuadrant', { heavy: quadrantName(heaviest), max: pct(maxV), min: pct(minV), light: quadrantName(lightest) }),
    );
  }

  return {
    report,
    criterion: {
      key: 'equilibrio',
      label: CRITERION_LABELS.equilibrio,
      score: Math.round(score),
      weight: CRITERION_WEIGHTS.equilibrio,
      level: levelOf(score),
      summary: applicable
        ? tr('balanceSummary', { deviation: fmt(m.deviationPercent, 1), spread: pct(spread, 1) })
        : tr('balanceSummaryNone'),
      details: [
        { label: tr('balanceDetailDeviation'), value: tr('balanceDetailDeviationValue', { value: fmt(m.deviationPercent, 1) }) },
        { label: tr('balanceDetailHorizontal'), value: tr('balanceDetailHorizontalValue', { value: signed(m.offsetPercent.x) }) },
        { label: tr('balanceDetailVertical'), value: tr('balanceDetailVerticalValue', { value: signed(m.offsetPercent.y) }) },
        ...keys.map(k => ({ label: tr('balanceDetailQuadrant', { name: quadrantName(k) }), value: pct(m.quadrants[k], 1) })),
      ],
      issues,
      applicable,
    },
  };
}

const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(finite(v)), 1)}%`;

// ---------------------------------------------------------------------------
// 3. Simetria
// ---------------------------------------------------------------------------

/**
 * Tolerância da medição de espelhamento: 3% da diagonal do desenho. É a
 * distância em que a cópia espelhada ainda "encosta" no original; acima
 * disso o olho já vê duas formas diferentes. `measureMirrorSymmetry` devolve
 * 0% quando o desvio médio chega nessa tolerância.
 */
const SYMMETRY_TOLERANCE_RATIO = 0.03;
/**
 * Um logo não precisa ser simétrico nos dois eixos — a esmagadora maioria
 * tem no máximo um. Por isso a nota usa o MELHOR eixo, e o eixo fraco entra
 * só como detalhe. Abaixo de 60% de espelhamento o eixo não lê como eixo.
 */
const SYMMETRY_WEAK = 60;

const NO_SYMMETRY: SymmetryMeasurement = { percent: 0, meanDeviation: 0, maxDeviation: 0, samples: 0 };

function scoreSymmetry(
  paths: paper.Path[],
  m: LogoMetrics,
  samples: number,
): { report: SymmetryReport; criterion: CriterionScore } {
  const diag = Math.hypot(finite(m.width), finite(m.height));
  const tolerance = diag * SYMMETRY_TOLERANCE_RATIO;
  const usable = paths.length > 0 && tolerance > 0;

  const vertical = usable
    ? measureMirrorSymmetry(paths, 'vertical', m.geometricCenter.x, tolerance, samples)
    : NO_SYMMETRY;
  const horizontal = usable
    ? measureMirrorSymmetry(paths, 'horizontal', m.geometricCenter.y, tolerance, samples)
    : NO_SYMMETRY;

  const bestAxis: 'vertical' | 'horizontal' = vertical.percent >= horizontal.percent ? 'vertical' : 'horizontal';
  const bestPercent = Math.max(finite(vertical.percent), finite(horizontal.percent));

  const report: SymmetryReport = {
    vertical: sanitizeSymmetry(vertical),
    horizontal: sanitizeSymmetry(horizontal),
    tolerance: round2(tolerance),
    bestAxis,
    bestPercent: round1(bestPercent),
    inkMirror: { vertical: round2(finite(m.symmetry.vertical)), horizontal: round2(finite(m.symmetry.horizontal)) },
  };

  // A nota é o melhor eixo direto: já é uma escala 0..100 medida.
  const score = clamp(bestPercent);
  const issues: string[] = [];
  if (usable && bestPercent < SYMMETRY_WEAK) {
    issues.push(tr('symmetryIssueBest', { percent: fmt(bestPercent, 0), tolerance: fmt(tolerance) }));
  }
  const AXIS_PT = { vertical: tr('axisVertical'), horizontal: tr('axisHorizontal') } as const;
  if (usable && bestPercent >= SYMMETRY_WEAK) {
    const worst = bestAxis === 'vertical' ? horizontal : vertical;
    if (worst.percent < SYMMETRY_WEAK) {
      issues.push(tr('symmetryIssueOneAxis', { axis: AXIS_PT[bestAxis], percent: fmt(finite(worst.percent), 0) }));
    }
  }

  return {
    report,
    criterion: {
      key: 'simetria',
      label: CRITERION_LABELS.simetria,
      score: Math.round(score),
      weight: CRITERION_WEIGHTS.simetria,
      level: levelOf(score),
      summary: usable
        ? tr('symmetrySummary', { axis: AXIS_PT[bestAxis], percent: fmt(bestPercent, 0), deviation: fmt(report[bestAxis].meanDeviation) })
        : tr('symmetrySummaryNone'),
      details: [
        { label: tr('symmetryDetailVertical'), value: tr('symmetryAxisValue', { percent: fmt(finite(vertical.percent), 0), deviation: fmt(finite(vertical.meanDeviation)) }) },
        { label: tr('symmetryDetailHorizontal'), value: tr('symmetryAxisValue', { percent: fmt(finite(horizontal.percent), 0), deviation: fmt(finite(horizontal.meanDeviation)) }) },
        { label: tr('symmetryDetailTolerance'), value: tr('symmetryToleranceValue', { value: fmt(tolerance) }) },
        { label: tr('symmetryDetailInk'), value: tr('symmetryInkValue', { vertical: pct(m.symmetry.vertical), horizontal: pct(m.symmetry.horizontal) }) },
      ],
      issues,
      applicable: usable,
    },
  };
}

function sanitizeSymmetry(s: SymmetryMeasurement): SymmetryMeasurement {
  return {
    percent: round1(finite(s.percent)),
    meanDeviation: round2(finite(s.meanDeviation)),
    maxDeviation: round2(finite(s.maxDeviation)),
    samples: finite(s.samples),
  };
}

// ---------------------------------------------------------------------------
// 4. Redução
// ---------------------------------------------------------------------------

/**
 * Limites do teste de redução, iguais aos do renderizador `reductionTest`:
 * abaixo de 1 px de dispositivo um traço ou um vão desaparece na
 * rasterização (vira antialiasing cinza); entre 1 e 1,5 px ele sobrevive mas
 * some em tela de baixa densidade ou em impressão pequena.
 */
const DETAIL_FLOOR_PX = 1;
const DETAIL_WARN_PX = 1.5;
/**
 * Peso de cada tamanho na nota: o tamanho menor manda, porque é onde a
 * redução falha primeiro (16 px = favicon, 48 px = app icon grande).
 */
const REDUCTION_SIZE_WEIGHT: Record<number, number> = { 16: 0.4, 24: 0.3, 32: 0.2, 48: 0.1 };

function worstPx(step: ReductionStep): number {
  const gap = step.gapPx === null ? Infinity : step.gapPx;
  return Math.min(finite(step.strokePx, 0), Number.isFinite(gap) ? gap : Infinity);
}

/** Nota de um passo: 100 acima de 1,5 px, 50 em 1 px, 0 em 0 px. */
function stepScore(step: ReductionStep): number {
  const w = worstPx(step);
  if (!Number.isFinite(w)) return 100;
  if (w >= DETAIL_WARN_PX) return 100;
  if (w >= DETAIL_FLOOR_PX) return 50 + ((w - DETAIL_FLOOR_PX) / (DETAIL_WARN_PX - DETAIL_FLOOR_PX)) * 50;
  return clamp((w / DETAIL_FLOOR_PX) * 50);
}

function scoreReduction(
  stats: StrokeWeightStats | null,
  contentHeight: number,
  sizes: number[],
): { report: ReductionReport; criterion: CriterionScore } {
  const steps = stats && contentHeight > 0 ? reductionSteps(stats, contentHeight, sizes) : [];
  const lost = steps.filter(s => s.status === 'lost').map(s => s.size);
  const risk = steps.filter(s => s.status === 'risk').map(s => s.size);

  const report: ReductionReport = {
    minStroke: round2(finite(stats?.min ?? 0)),
    minStrokeAt: stats?.minAt ? { x: round2(stats.minAt.x), y: round2(stats.minAt.y) } : null,
    minGap: stats?.minGap != null ? round2(stats.minGap) : null,
    minGapAt: stats?.minGapAt ? { x: round2(stats.minGapAt.x), y: round2(stats.minGapAt.y) } : null,
    contentHeight: round2(contentHeight),
    steps: steps.map(s => ({
      size: s.size,
      strokePx: round2(finite(s.strokePx)),
      gapPx: s.gapPx === null ? null : round2(finite(s.gapPx)),
      status: s.status,
    })),
    losesAt: lost.length ? Math.max(...lost) : null,
    riskAt: risk.length ? Math.max(...risk) : null,
  };

  const applicable = steps.length > 0;
  let score = 0;
  if (applicable) {
    let acc = 0;
    let wsum = 0;
    for (const s of steps) {
      const w = REDUCTION_SIZE_WEIGHT[s.size] ?? 1 / steps.length;
      acc += stepScore(s) * w;
      wsum += w;
    }
    score = wsum > 0 ? clamp(acc / wsum) : 0;
  }

  const issues: string[] = [];
  for (const s of report.steps) {
    if (s.status === 'lost') {
      issues.push(tr('reductionIssueLost', { size: s.size, px: fmt(worstPx(s)) }));
    } else if (s.status === 'risk') {
      issues.push(tr('reductionIssueRisk', { size: s.size, px: fmt(worstPx(s)), limit: fmt(DETAIL_WARN_PX, 1) }));
    }
  }

  const summary = !applicable
    ? tr('reductionSummaryNone')
    : report.losesAt
      ? tr('reductionSummaryLoses', { size: report.losesAt, stroke: fmt(report.minStroke), gap: report.minGap === null ? '—' : fmt(report.minGap) })
      : tr('reductionSummarySurvives', { size: Math.min(...report.steps.map(s => s.size)), stroke: fmt(report.minStroke) });

  return {
    report,
    criterion: {
      key: 'reducao',
      label: CRITERION_LABELS.reducao,
      score: Math.round(score),
      weight: CRITERION_WEIGHTS.reducao,
      level: levelOf(score),
      summary,
      details: [
        { label: tr('reductionDetailStroke'), value: `${fmt(report.minStroke)} ${activeT().common.units}` },
        { label: tr('reductionDetailGap'), value: report.minGap === null ? '—' : `${fmt(report.minGap)} ${activeT().common.units}` },
        ...report.steps.map(s => ({
          label: tr('reductionDetailAt', { size: s.size }),
          value: tr('reductionStepValue', { stroke: fmt(s.strokePx), gap: s.gapPx === null ? '—' : fmt(s.gapPx), status: tr(REDUCTION_STATUS_KEY[s.status]) }),
        })),
        { label: tr('reductionDetailLoses'), value: report.losesAt ? `${report.losesAt} px` : tr('reductionLosesNone') },
      ],
      issues,
      applicable,
    },
  };
}

const REDUCTION_STATUS_KEY = { ok: 'statusOk', risk: 'statusRisk', lost: 'statusLost' } as const;

// ---------------------------------------------------------------------------
// 5. Complexidade
// ---------------------------------------------------------------------------

/**
 * Faixa de nós em que um logo é desenhável e reduzível.
 *
 * - Mínimo 8: abaixo disso o arquivo não passa de um retângulo ou triângulo;
 *   não há desenho para diagnosticar (nem para proteger juridicamente).
 * - Máximo 120: a 16 px o logo ocupa uma grade de 16 × 16 = 256 pixels. Com
 *   mais de 120 nós sobra menos de 2 px por nó — a rasterização apaga a
 *   diferença entre eles, e o detalhe vira ruído.
 */
const ANCHORS_MIN = 8;
const ANCHORS_MAX = 120;
/** Zero de nota: o dobro do máximo, quando o arquivo já é ilustração. */
const ANCHORS_ZERO = 240;
/**
 * Subpaths (formas independentes). Até 12 o desenho ainda é um sistema de
 * peças alinháveis; acima de 48 cada peça some antes da outra na redução.
 */
const SUBPATHS_OK = 12;
const SUBPATHS_ZERO = 48;

const COMPLEXITY_READING_KEY: Record<ComplexityReading, DiagnosisKey> = {
  'simples-demais': 'readingTooSimple',
  equilibrado: 'readingBalanced',
  'detalhado-demais': 'readingTooDetailed',
};
const readingLabel = (r: ComplexityReading) => tr(COMPLEXITY_READING_KEY[r]);

function scoreComplexity(m: LogoMetrics): { report: ComplexityReport; criterion: CriterionScore } {
  const anchors = finite(m.anchorCount);
  const subpaths = finite(m.componentCount);
  const smooth = finite(m.smoothAnchorRatio);

  const reading: ComplexityReading =
    anchors < ANCHORS_MIN ? 'simples-demais'
      : anchors > ANCHORS_MAX ? 'detalhado-demais'
        : 'equilibrado';

  const report: ComplexityReport = {
    anchorCount: anchors,
    subpathCount: subpaths,
    smoothAnchorRatio: round2(smooth),
    reading,
  };

  // Nós: 100 dentro da faixa; fora dela cai linearmente até 0 em ANCHORS_ZERO
  // (excesso) ou até 60 em zero nós (falta — falta de nós não é defeito grave).
  const anchorScore = anchors >= ANCHORS_MIN && anchors <= ANCHORS_MAX
    ? 100
    : anchors < ANCHORS_MIN
      ? 60 + (anchors / ANCHORS_MIN) * 40
      : ramp(anchors, ANCHORS_MAX, ANCHORS_ZERO);
  const subpathScore = subpaths <= SUBPATHS_OK ? 100 : ramp(subpaths, SUBPATHS_OK, SUBPATHS_ZERO);
  // 60/40: o número de nós pesa mais porque é o que a rasterização apaga.
  const score = clamp(anchorScore * 0.6 + subpathScore * 0.4);

  const issues: string[] = [];
  if (reading === 'detalhado-demais') {
    issues.push(tr('complexityIssueTooMany', { anchors, max: ANCHORS_MAX }));
  }
  if (reading === 'simples-demais') {
    issues.push(tr('complexityIssueTooFew', { anchors, min: ANCHORS_MIN }));
  }
  if (subpaths > SUBPATHS_OK) {
    issues.push(tr('complexityIssueSubpaths', { subpaths, max: SUBPATHS_OK }));
  }

  return {
    report,
    criterion: {
      key: 'complexidade',
      label: CRITERION_LABELS.complexidade,
      score: Math.round(score),
      weight: CRITERION_WEIGHTS.complexidade,
      level: levelOf(score),
      summary: tr('complexitySummary', { anchors, subpaths, smooth: pct(smooth), reading: readingLabel(reading) }),
      details: [
        { label: tr('complexityDetailAnchors'), value: String(anchors) },
        { label: tr('complexityDetailSubpaths'), value: String(subpaths) },
        { label: tr('complexityDetailSmooth'), value: pct(smooth) },
        { label: tr('complexityDetailReading'), value: readingLabel(reading) },
      ],
      issues,
      applicable: anchors > 0,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. Consistência
// ---------------------------------------------------------------------------

/**
 * Dispersão relativa de espessura, (p75 − p25) ÷ p50.
 *
 * Usa o intervalo interquartil em vez de max/min porque terminais e junções
 * sempre produzem extremos: o que interessa é a espessura do miolo do
 * desenho. Até 0,15 o logo é monolinear (num traço de 10 un., meia unidade
 * de variação não se enxerga). A partir de 0,80 há pelo menos dois pesos
 * distintos convivendo sem sistema.
 */
const STROKE_SPREAD_OK = 0.15;
const STROKE_SPREAD_BAD = 0.80;
/**
 * Participação do grupo de raios dominante. Com 80% dos cantos no mesmo raio
 * o arredondamento é um sistema; com 25% ou menos cada canto tem o seu.
 */
const RADIUS_SHARE_OK = 0.80;
const RADIUS_SHARE_BAD = 0.25;
/** Raios dentro de 8% um do outro são o mesmo raio (mesma tolerância de `clusterRadii`). */
const RADIUS_TOLERANCE = 0.08;
/** Abaixo de 4 cantos detectados não há padrão de raio para comparar. */
const MIN_CORNERS_FOR_PATTERN = 4;
/**
 * Fatia sólida: quando até a espessura mais fina medida (p10) passa de 35% do
 * lado maior do desenho, não existe traço — existe massa. Num disco cheio a
 * "espessura" é a corda, que encurta perto da borda por geometria, e não por
 * falta de acabamento; o mesmo vale para um bloco ou um quadrado cheio. Nesses
 * casos o critério sai como NÃO APLICÁVEL em vez de virar nota média (ou nota
 * cheia, no caso do bloco), e o peso é redistribuído entre os outros critérios.
 * Um anel, uma haste ou um logotipo têm p10 bem abaixo disso e continuam sendo
 * avaliados.
 */
const SOLID_MASS_RATIO = 0.35;

/**
 * Amostras de espessura local: para cada linha de varredura, o menor entre o
 * comprimento do traço horizontal e o do traço vertical que passam pelo mesmo
 * ponto. É a mesma definição usada por `measureStrokeWeight`, reconstruída
 * aqui porque o diagnóstico precisa da DISTRIBUIÇÃO (percentis), e não só de
 * mínimo / mediana / máximo.
 */
export function strokeThicknessSamples(paths: paper.Item[], box: Box): number[] {
  const shapes = inkShapes(paths);
  if (!shapes.length) return [];
  const rows = Math.max(24, Math.min(192, Math.round(box.height)));
  const cols = Math.max(24, Math.min(192, Math.round(box.width)));
  const rowScan = scanInk(shapes, box, rows);
  const colScan = scanInk(transposeShapes(shapes), { x: box.y, y: box.x, width: box.height, height: box.width }, cols);

  const nearest = (values: number[], v: number) => {
    if (!values.length) return -1;
    const step = values.length > 1 ? values[1] - values[0] : 1;
    if (!(step > 0)) return 0;
    return Math.max(0, Math.min(values.length - 1, Math.round((v - values[0]) / step)));
  };
  const runAt = (runs: Array<[number, number]>, v: number) => {
    for (const r of runs) if (v >= r[0] - 1e-9 && v <= r[1] + 1e-9) return r;
    return null;
  };

  const out: number[] = [];
  for (let i = 0; i < rowScan.ys.length; i++) {
    const y = rowScan.ys[i];
    for (const r of rowScan.runs[i]) {
      const x = (r[0] + r[1]) / 2;
      const j = nearest(colScan.ys, x);
      if (j < 0) continue;
      const cr = runAt(colScan.runs[j], y);
      const t = Math.min(r[1] - r[0], cr ? cr[1] - cr[0] : Infinity);
      if (Number.isFinite(t) && t > 0) out.push(t);
    }
  }
  return out;
}

function scoreConsistency(
  paths: paper.Path[],
  box: Box | null,
): { report: ConsistencyReport; criterion: CriterionScore } {
  const samples = box ? strokeThicknessSamples(paths, box) : [];
  const sorted = [...samples].sort((a, b) => a - b);
  const q = sorted.length
    ? {
      p10: round2(quantile(sorted, 0.10)),
      p25: round2(quantile(sorted, 0.25)),
      p50: round2(quantile(sorted, 0.50)),
      p75: round2(quantile(sorted, 0.75)),
      p90: round2(quantile(sorted, 0.90)),
    }
    : null;
  const p50 = q && q.p50 > 0 ? q.p50 : 0;
  const strokeSpread = q && p50 > 0 ? round2((q.p75 - q.p25) / p50) : null;

  // Massa cheia: a espessura medida é a corda da silhueta, não uma haste.
  const formSize = box ? Math.max(finite(box.width), finite(box.height)) : 0;
  const solidMass = !!q && formSize > 0 && q.p10 >= SOLID_MASS_RATIO * formSize;

  const corners: CornerArc[] = paths.length ? detectCornerRadii(paths) : [];
  const clusters = corners.length ? clusterRadii(corners, RADIUS_TOLERANCE) : [];
  const totalCorners = clusters.reduce((s, c) => s + c.count, 0);
  const dominant = clusters[0] ?? null;
  const dominantShare = dominant && totalCorners > 0 ? dominant.count / totalCorners : null;
  const outliers = dominant
    ? clusters.filter(c => c !== dominant && Math.abs(c.radius - dominant.radius) > dominant.radius * RADIUS_TOLERANCE)
    : [];

  const report: ConsistencyReport = {
    strokeQuantiles: q,
    strokeSpread,
    strokeSamples: samples.length,
    radiiClusters: clusters.map(c => ({ radius: round2(c.radius), count: c.count })),
    cornerCount: totalCorners,
    dominantRadiusShare: dominantShare === null ? null : round2(dominantShare),
    radiusOutliers: outliers.map(c => ({ radius: round2(c.radius), count: c.count })),
    solidMass,
  };

  const strokeApplicable = strokeSpread !== null && !solidMass;
  const radiiApplicable = totalCorners >= MIN_CORNERS_FOR_PATTERN;
  const strokeScore = strokeApplicable ? ramp(strokeSpread as number, STROKE_SPREAD_OK, STROKE_SPREAD_BAD) : 0;
  const radiiScore = radiiApplicable ? ramp(dominantShare as number, RADIUS_SHARE_OK, RADIUS_SHARE_BAD) : 0;

  // Metade para espessura, metade para raios; se só um dos dois existe, ele
  // leva a nota inteira (em vez de ser diluído por um zero artificial).
  const applicable = strokeApplicable || radiiApplicable;
  const score = !applicable ? 0
    : strokeApplicable && radiiApplicable ? clamp(strokeScore * 0.5 + radiiScore * 0.5)
      : strokeApplicable ? clamp(strokeScore) : clamp(radiiScore);

  const issues: string[] = [];
  if (strokeApplicable && (strokeSpread as number) > STROKE_SPREAD_OK && q) {
    issues.push(tr('consistencyIssueStroke', { spread: pct(strokeSpread as number, 0), p25: fmt(q.p25), p50: fmt(q.p50), p75: fmt(q.p75) }));
  }
  if (radiiApplicable && outliers.length) {
    issues.push(tr('consistencyIssueRadii', {
      count: outliers.length,
      dominant: fmt(dominant!.radius),
      list: outliers.map(c => `${fmt(c.radius)} ${activeT().common.units} ×${c.count}`).join(', '),
    }));
  }

  const summary = !applicable
    ? (solidMass
      ? tr('consistencySummarySolid')
      : tr('consistencySummaryNone'))
    : [
      strokeApplicable ? tr('consistencySummaryStroke', { median: fmt(q!.p50), spread: pct(strokeSpread as number, 0) }) : null,
      radiiApplicable ? tr('consistencySummaryCorners', { corners: totalCorners, groups: clusters.length }) : null,
    ].filter(Boolean).join('; ') + '.';

  return {
    report,
    criterion: {
      key: 'consistencia',
      label: CRITERION_LABELS.consistencia,
      score: Math.round(score),
      weight: CRITERION_WEIGHTS.consistencia,
      level: levelOf(score),
      summary,
      details: [
        { label: tr('consistencyDetailStroke'), value: q ? `${fmt(q.p25)} · ${fmt(q.p50)} · ${fmt(q.p75)} ${activeT().common.units}` : '—' },
        {
          label: tr('consistencyDetailSpread'),
          value: solidMass ? tr('consistencySpreadNotApplicable') : strokeSpread === null ? '—' : pct(strokeSpread, 0),
        },
        { label: tr('consistencyDetailCorners'), value: String(totalCorners) },
        { label: tr('consistencyDetailGroups'), value: clusters.length ? clusters.map(c => `${fmt(c.radius)} ${activeT().common.units} ×${c.count}`).join(' · ') : '—' },
        { label: tr('consistencyDetailOutliers'), value: outliers.length ? String(outliers.length) : tr('consistencyOutliersNone') },
      ],
      issues,
      applicable,
    },
  };
}

// ---------------------------------------------------------------------------
// 7. Higiene do arquivo
// ---------------------------------------------------------------------------

/**
 * Penalidades da higiene. A nota parte de 100 e desconta por ocorrência, com
 * teto por categoria para que um arquivo com 300 nós duplicados não fique
 * mais reprovado do que um com texto vivo — que é o defeito que quebra a
 * entrega em qualquer máquina sem a fonte instalada.
 */
const HYGIENE_PENALTY = {
  emptyPath: { each: 4, max: 20 },
  duplicateNode: { each: 1, max: 15 },
  redundantGroup: { each: 2, max: 15 },
  /** Texto não convertido é binário: existe ou não. */
  text: { each: 25, max: 25 },
  danglingTransform: { each: 2, max: 15 },
  offCanvas: { each: 5, max: 20 },
} as const;

/** Atributos que dão função a um `<g>`; sem nenhum deles o grupo só aninha. */
const MEANINGFUL_GROUP_ATTRS = [
  'transform', 'clip-path', 'mask', 'opacity', 'style', 'fill', 'stroke',
  'fill-opacity', 'stroke-opacity', 'filter', 'id', 'class',
];

const IDENTITY_TRANSFORM = /^\s*(?:translate\(\s*0(?:[\s,]+0)?\s*\)|matrix\(\s*1[\s,]+0[\s,]+0[\s,]+1[\s,]+0[\s,]+0\s*\)|scale\(\s*1(?:[\s,]+1)?\s*\)|rotate\(\s*0\s*\))?\s*$/i;

function localName(el: Element): string {
  return (el.localName || el.tagName || '').toLowerCase();
}

/** `d` sem nenhum comando de desenho depois do moveto inicial. */
function isEmptyPathData(d: string | null): boolean {
  if (!d || !d.trim()) return true;
  return !/[LlHhVvCcSsQqTtAaZz]/.test(d);
}

function analyzeHygieneDom(svgText: string): Omit<HygieneReport, 'duplicateNodes' | 'offCanvasElements' | 'warnings'> {
  const out = { emptyPaths: 0, redundantGroups: 0, textElements: 0, danglingTransforms: 0 };
  let doc: Document | null = null;
  try {
    doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  } catch {
    return out;
  }
  const root = doc?.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length > 0) return out;

  const all = Array.from(root.getElementsByTagName('*')) as Element[];
  for (const el of all) {
    const tag = localName(el);
    if (tag === 'path' && isEmptyPathData(el.getAttribute('d'))) out.emptyPaths++;
    if (tag === 'rect' && !(num(el.getAttribute('width')) > 0 && num(el.getAttribute('height')) > 0)) out.emptyPaths++;
    if (tag === 'circle' && !(num(el.getAttribute('r')) > 0)) out.emptyPaths++;
    if (tag === 'ellipse' && !(num(el.getAttribute('rx')) > 0 && num(el.getAttribute('ry')) > 0)) out.emptyPaths++;
    if ((tag === 'polygon' || tag === 'polyline') && !(el.getAttribute('points') || '').trim()) out.emptyPaths++;
    if (tag === 'text') out.textElements++;
    if (tag === 'g') {
      const children = Array.from(el.children);
      const meaningful = MEANINGFUL_GROUP_ATTRS.some(a => (el.getAttribute(a) || '').trim().length > 0);
      if (children.length === 0 || (children.length === 1 && !meaningful)) out.redundantGroups++;
    }
    const tr = el.getAttribute('transform');
    if (tr && !IDENTITY_TRANSFORM.test(tr)) out.danglingTransforms++;
  }
  return out;
}

function num(v: string | null): number {
  const n = v === null ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Nós coincidentes no mesmo path (a distância menor que `eps`). */
function countDuplicateNodes(paths: paper.Path[], eps: number): number {
  let dup = 0;
  for (const p of paths) {
    const segs = p?.segments;
    if (!segs || segs.length < 2) continue;
    const count = p.closed ? segs.length : segs.length - 1;
    for (let i = 0; i < count; i++) {
      const a = segs[i]?.point;
      const b = segs[(i + 1) % segs.length]?.point;
      if (!a || !b) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < eps) dup++;
    }
  }
  return dup;
}

/** Itens cujo bounding box não toca a prancheta. */
function countOffCanvas(paths: paper.Path[], artboard: { x: number; y: number; width: number; height: number } | null): number {
  if (!artboard || !(artboard.width > 0) || !(artboard.height > 0)) return 0;
  const right = artboard.x + artboard.width;
  const bottom = artboard.y + artboard.height;
  let n = 0;
  for (const p of paths) {
    const b = p?.bounds;
    if (!b || ![b.x, b.y, b.width, b.height].every(Number.isFinite)) continue;
    if (b.x + b.width <= artboard.x || b.x >= right || b.y + b.height <= artboard.y || b.y >= bottom) n++;
  }
  return n;
}

function scoreHygiene(report: HygieneReport): CriterionScore {
  const penalties: Array<[number, { each: number; max: number }, string]> = [
    [report.textElements, HYGIENE_PENALTY.text, tr('hygieneIssueText', { n: report.textElements })],
    [report.emptyPaths, HYGIENE_PENALTY.emptyPath, tr('hygieneIssueEmptyPath', { n: report.emptyPaths })],
    [report.duplicateNodes, HYGIENE_PENALTY.duplicateNode, tr('hygieneIssueDuplicateNode', { n: report.duplicateNodes })],
    [report.redundantGroups, HYGIENE_PENALTY.redundantGroup, tr('hygieneIssueRedundantGroup', { n: report.redundantGroups })],
    [report.danglingTransforms, HYGIENE_PENALTY.danglingTransform, tr('hygieneIssueDanglingTransform', { n: report.danglingTransforms })],
    [report.offCanvasElements, HYGIENE_PENALTY.offCanvas, tr('hygieneIssueOffCanvas', { n: report.offCanvasElements })],
  ];

  let score = 100;
  const issues: string[] = [];
  for (const [count, rule, message] of penalties) {
    if (count > 0) {
      score -= Math.min(rule.max, count * rule.each);
      issues.push(message);
    }
  }
  score = clamp(score);

  return {
    key: 'higiene',
    label: CRITERION_LABELS.higiene,
    score: Math.round(score),
    weight: CRITERION_WEIGHTS.higiene,
    level: levelOf(score),
    summary: issues.length
      ? tr('hygieneSummaryIssues', { issues: issues.length, points: 100 - Math.round(score) })
      : tr('hygieneSummaryClean'),
    details: [
      { label: tr('hygieneDetailEmptyPaths'), value: String(report.emptyPaths) },
      { label: tr('hygieneDetailDuplicateNodes'), value: String(report.duplicateNodes) },
      { label: tr('hygieneDetailRedundantGroups'), value: String(report.redundantGroups) },
      { label: tr('hygieneDetailText'), value: String(report.textElements) },
      { label: tr('hygieneDetailTransforms'), value: String(report.danglingTransforms) },
      { label: tr('hygieneDetailOffCanvas'), value: String(report.offCanvasElements) },
    ],
    issues,
    applicable: true,
  };
}

// ---------------------------------------------------------------------------
// Nota geral
// ---------------------------------------------------------------------------

/**
 * Faixas da nota geral. Nomes descrevem o que falta fazer, não o quanto o
 * logo é bonito.
 */
const OVERALL_BANDS: Array<[number, DiagnosisKey]> = [
  [85, 'band85'],
  [70, 'band70'],
  [50, 'band50'],
  [0, 'band0'],
];

export function overallLabel(score: number): string {
  for (const [floor, key] of OVERALL_BANDS) if (score >= floor) return tr(key);
  return tr(OVERALL_BANDS[OVERALL_BANDS.length - 1][1]);
}

function composeOverall(criteria: CriterionScore[]) {
  const usable = criteria.filter(c => c.applicable);
  const weightUsed = usable.reduce((s, c) => s + c.weight, 0);
  const score = weightUsed > 0
    ? clamp(usable.reduce((s, c) => s + c.score * c.weight, 0) / weightUsed)
    : 0;
  const rounded = Math.round(score);
  const parts = usable
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .map(c => `${c.label} ${c.score}×${fmt(c.weight / weightUsed, 2)}`);
  const skipped = criteria.filter(c => !c.applicable).map(c => c.label);

  return {
    score: rounded,
    label: overallLabel(rounded),
    weightUsed: round2(weightUsed),
    summary:
      (usable.length
        ? tr('overallWeighted', { n: usable.length, parts: parts.join(' + ') })
        : tr('overallNone')) +
      (skipped.length ? tr('overallSkipped', { list: skipped.join(', ') }) : ''),
  };
}

// ---------------------------------------------------------------------------
// Entrada / importação
// ---------------------------------------------------------------------------

let diagnosisScope: paper.PaperScope | null = null;

function importForDiagnosis(svg: string): paper.Item | null {
  if (!diagnosisScope) {
    diagnosisScope = new paper.PaperScope();
    diagnosisScope.setup(new diagnosisScope.Size(1, 1));
  }
  const scope = diagnosisScope;
  scope.activate();
  try {
    scope.project.clear();
    return scope.project.importSVG(svg, { expandShapes: true }) as paper.Item | null;
  } catch {
    return null;
  } finally {
    paper.activate();
  }
}

function emptyDiagnosis(reason: string, metrics: LogoMetrics, hygiene: HygieneReport): LogoDiagnosis {
  const criteria: CriterionScore[] = CRITERION_ORDER.map(key => ({
    key,
    label: CRITERION_LABELS[key],
    score: 0,
    weight: CRITERION_WEIGHTS[key],
    level: 'critico' as CriterionLevel,
    summary: tr('noDrawing'),
    details: [],
    issues: [],
    applicable: false,
  }));
  return {
    ok: false,
    reason,
    overall: { score: 0, label: overallLabel(0), summary: tr('noDrawingReason', { reason }), weightUsed: 0 },
    criteria,
    proportion: { width: 0, height: 0, ratio: 0, ratioLabel: '—', orientation: 'square', nearest: null, matches: false },
    balance: {
      geometricCenter: { x: 0, y: 0 }, visualCenter: null, offsetPercent: { x: 0, y: 0 },
      deviationPercent: 0, quadrants: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
      quadrantSpread: 0, heaviestQuadrant: null, lightestQuadrant: null,
    },
    symmetry: {
      vertical: { ...NO_SYMMETRY }, horizontal: { ...NO_SYMMETRY }, tolerance: 0,
      bestAxis: 'vertical', bestPercent: 0, inkMirror: { vertical: 0, horizontal: 0 },
    },
    reduction: {
      minStroke: 0, minStrokeAt: null, minGap: null, minGapAt: null,
      contentHeight: 0, steps: [], losesAt: null, riskAt: null,
    },
    complexity: { anchorCount: 0, subpathCount: 0, smoothAnchorRatio: 0, reading: 'simples-demais' },
    consistency: {
      strokeQuantiles: null, strokeSpread: null, strokeSamples: 0,
      radiiClusters: [], cornerCount: 0, dominantRadiusShare: null, radiusOutliers: [],
      solidMass: false,
    },
    hygiene,
    metrics,
  };
}

const ZERO_METRICS: LogoMetrics = {
  width: 0, height: 0, aspectRatio: 0, aspectRatioLabel: '—', orientation: 'square',
  boundsArea: 0, inkArea: 0, inkCoverage: 0,
  geometricCenter: { x: 0, y: 0 }, visualCenter: null, opticalCenterTarget: { x: 0, y: 0 },
  offset: { x: 0, y: 0 }, offsetPercent: { x: 0, y: 0 }, deviationPercent: 0,
  balance: { horizontal: 'centered', vertical: 'centered' },
  quadrants: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
  symmetry: { vertical: 0, horizontal: 0 },
  componentCount: 0, anchorCount: 0, smoothAnchorRatio: 0, resolution: 0,
};

const EMPTY_HYGIENE: HygieneReport = {
  emptyPaths: 0, duplicateNodes: 0, redundantGroups: 0,
  textElements: 0, danglingTransforms: 0, offCanvasElements: 0, warnings: [],
};

const diagnosisCache = new LRUCache<string, LogoDiagnosis>(8);

/**
 * Diagnóstico completo do logo.
 *
 * Nunca lança: arquivo vazio, não-SVG ou sem formas devolve `ok: false` com o
 * motivo preenchido e todas as notas em 0 (sem NaN).
 */
export function diagnoseLogo(input: DiagnosisInput, options: DiagnoseOptions = {}): LogoDiagnosis {
  const raw = typeof input === 'string' ? input : input?.originalSVG ?? '';
  const source = typeof input === 'string' ? input : input?.sourceSVG ?? input?.originalSVG ?? '';
  // The language is part of the key: every sentence of the result is written in it.
  const key = hashKey(raw, source, options, activeLanguage());
  const cached = diagnosisCache.get(key);
  if (cached) return cached;

  let sanitized: { svg: string; artboard: { x: number; y: number; width: number; height: number } | null; warnings: string[] };
  try {
    sanitized = sanitizeSVG(raw);
  } catch (err) {
    const reason = err instanceof SvgParseError ? err.message : err instanceof Error ? err.message : tr('invalidFile');
    const result = emptyDiagnosis(reason, ZERO_METRICS, { ...EMPTY_HYGIENE });
    diagnosisCache.set(key, result);
    return result;
  }

  // A higiene lê o arquivo ENTREGUE (antes do saneamento): o saneamento expande
  // `<use>` e injeta transforms, o que inflaria a contagem artificialmente.
  const domSource = source.trim() ? source : sanitized.svg;
  const dom = analyzeHygieneDom(domSource);

  const item = importForDiagnosis(sanitized.svg);
  const paths = collectPaths(item).filter(p => !!p && Number.isFinite(p.length));
  const metrics = computeLogoMetrics(sanitized.svg, { resolution: options.resolution });

  const hygiene: HygieneReport = {
    ...dom,
    duplicateNodes: countDuplicateNodes(paths, Math.max(1e-6, Math.hypot(metrics.width, metrics.height) * 1e-4)),
    offCanvasElements: countOffCanvas(paths, sanitized.artboard),
    warnings: sanitized.warnings,
  };

  if (!(metrics.width > 0) || !(metrics.height > 0) || !paths.length) {
    const result = emptyDiagnosis(tr('noShapes'), metrics, hygiene);
    diagnosisCache.set(key, result);
    return result;
  }

  const box = boxOf({ x: metrics.geometricCenter.x - metrics.width / 2, y: metrics.geometricCenter.y - metrics.height / 2, width: metrics.width, height: metrics.height });
  const strokeStats = box ? measureStrokeWeight(paths, box) : null;

  const proportion = scoreProportion(metrics);
  const balance = scoreBalance(metrics);
  const symmetry = scoreSymmetry(paths, metrics, options.symmetrySamples ?? 120);
  const reduction = scoreReduction(strokeStats, metrics.height, options.reductionSizes ?? REDUCTION_SIZES);
  const complexity = scoreComplexity(metrics);
  const consistency = scoreConsistency(paths, box);
  const hygieneCriterion = scoreHygiene(hygiene);

  const byKey: Record<CriterionKey, CriterionScore> = {
    proporcao: proportion.criterion,
    equilibrio: balance.criterion,
    simetria: symmetry.criterion,
    reducao: reduction.criterion,
    complexidade: complexity.criterion,
    consistencia: consistency.criterion,
    higiene: hygieneCriterion,
  };
  const criteria = CRITERION_ORDER.map(k => byKey[k]);

  const result: LogoDiagnosis = {
    ok: true,
    reason: null,
    overall: composeOverall(criteria),
    criteria,
    proportion: proportion.report,
    balance: balance.report,
    symmetry: symmetry.report,
    reduction: reduction.report,
    complexity: complexity.report,
    consistency: consistency.report,
    hygiene,
    metrics,
  };
  diagnosisCache.set(key, result);
  return result;
}

/** Limpa o cache de diagnósticos (testes). */
export function clearDiagnosisCache(): void {
  diagnosisCache.clear();
}

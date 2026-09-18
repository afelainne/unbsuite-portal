import { GEOMETRY_KEYS, GEOMETRY_STYLE_DEFAULTS, isHexColor, type GeometryOptions, type GeometryStyle, type GeometryStyles } from '../types/geometry';
import type { ClearspaceUnit } from './svg-engine';
import { activeT } from '../i18n/runtime';
import type { Translations } from '../i18n/types';

// Local guard: importing it from svg-engine would pull paper.js into this
// otherwise DOM/canvas-free module.
const CLEARSPACE_UNITS: readonly ClearspaceUnit[] = ['logomark', 'pixels', 'centimeters', 'inches'];
const isClearspaceUnit = (v: unknown): v is ClearspaceUnit => typeof v === 'string' && (CLEARSPACE_UNITS as readonly string[]).includes(v);

/**
 * Which kind of mark a preset is meant for. The three questions are different:
 * a symbol is judged by its geometry, a wordmark by its typographic anatomy,
 * and a signature by the relation between the two parts.
 */
export type PresetFamily = 'logo' | 'wordmark' | 'lockup';

/** `label` and `hint` read the active language every time they are accessed. */
const family = (id: PresetFamily): { id: PresetFamily; readonly label: string; readonly hint: string } => ({
  id,
  get label() { return activeT().presetFamilies[id]; },
  get hint() { return activeT().presetFamilies[`${id}Hint`]; },
});

export const PRESET_FAMILIES: ReadonlyArray<{ id: PresetFamily; readonly label: string; readonly hint: string }> = [
  family('logo'),
  family('wordmark'),
  family('lockup'),
];

const FAMILY_IDS: readonly PresetFamily[] = PRESET_FAMILIES.map(f => f.id);

export const isPresetFamily = (value: unknown): value is PresetFamily =>
  typeof value === 'string' && (FAMILY_IDS as readonly string[]).includes(value);

/** Human name of a family, for labels and headings. */
export const presetFamilyLabel = (id: PresetFamily): string =>
  PRESET_FAMILIES.find(f => f.id === id)?.label ?? activeT().presetFamilies.logo;

/**
 * Name shown for a preset. Built-ins are translated by id; the name stored in
 * the preset (and written to exported files) stays the original one. User
 * presets keep the name the person typed.
 */
export const presetDisplayName = (
  preset: Pick<GeometryPreset, 'id' | 'name' | 'isBuiltin'>,
  t: Translations = activeT(),
): string => (preset.isBuiltin && (t.presetNames as Record<string, string>)[preset.id]) || preset.name;

/** Description shown for a preset, translated for built-ins like the name. */
export const presetDisplayDescription = (
  preset: Pick<GeometryPreset, 'id' | 'description' | 'isBuiltin'>,
  t: Translations = activeT(),
): string => (preset.isBuiltin && (t.presetDescriptions as Record<string, string>)[preset.id]) || preset.description || '';

export interface GeometryPreset {
  id: string;
  name: string;
  description?: string;
  /** Kind of mark the preset is for. Defaults to "logo" when absent. */
  family: PresetFamily;
  isBuiltin?: boolean;
  geometryOptions: GeometryOptions;
  geometryStyles: GeometryStyles;
  clearspaceValue: number;
  clearspaceUnit: ClearspaceUnit;
  showGrid: boolean;
  gridSubdivisions: number;
  createdAt: number;
}

const STORAGE_KEY = 'unbsgrid-presets';

/**
 * Every construction, off. Derived from GEOMETRY_KEYS on purpose: a renderer
 * added to the registry lands here without anyone remembering to edit a
 * literal, so a preset can never carry a stale set of keys.
 */
const allOff: GeometryOptions = Object.fromEntries(
  GEOMETRY_KEYS.map(key => [key, false]),
) as unknown as GeometryOptions;

const defaultStyle = (color: string, opacity: number, strokeWidth: number) => ({ color, opacity, strokeWidth });

const defaultStyles: GeometryStyles = {
  boundingRects:          defaultStyle('#d94040', 0.6, 1),
  circles:                defaultStyle('#33b380', 0.5, 1),
  centerLines:            defaultStyle('#e69a1a', 0.5, 1),
  diagonals:              defaultStyle('#b34dd6', 0.4, 1),
  goldenRatio:            defaultStyle('#f2c00a', 0.45, 1),
  tangentLines:           defaultStyle('#66ccdd', 0.35, 0.5),
  goldenSpiral:           defaultStyle('#ff8c42', 0.5, 1.5),
  isometricGrid:          defaultStyle('#5eaaf7', 0.3, 0.5),
  bezierHandles:          defaultStyle('#ff5577', 0.6, 1),
  typographicProportions: defaultStyle('#88ddaa', 0.5, 1),
  thirdLines:             defaultStyle('#aa88ff', 0.4, 1),
  symmetryAxes:           defaultStyle('#ff66b2', 0.5, 1),
  angleMeasurements:      defaultStyle('#ffaa33', 0.55, 1),
  spacingGuides:          defaultStyle('#33ccff', 0.5, 1),
  rootRectangles:         defaultStyle('#cc77ff', 0.45, 1),
  modularScale:           defaultStyle('#77ddaa', 0.4, 1),
  alignmentGuides:        defaultStyle('#ff7744', 0.4, 0.8),
  safeZone:               defaultStyle('#44cc88', 0.35, 1.2),
  pixelGrid:              defaultStyle('#999999', 0.2, 0.5),
  opticalCenter:          defaultStyle('#ff4488', 0.6, 1.5),
  contrastGuide:          defaultStyle('#ffcc00', 0.4, 1),
  dynamicBaseline:        defaultStyle('#66aadd', 0.4, 0.8),
  fibonacciOverlay:       defaultStyle('#e6a833', 0.45, 1),
  kenBurnsSafe:           defaultStyle('#ff6644', 0.35, 1.2),
  componentRatioLabels:   defaultStyle('#88bbff', 0.7, 1),
  vesicaPiscis:           defaultStyle('#bb77cc', 0.45, 1),
  ruleOfOdds:             defaultStyle('#77aacc', 0.35, 0.8),
  visualWeightMap:        defaultStyle('#cc8844', 0.3, 1),
  anchoringPoints:        defaultStyle('#44ddbb', 0.6, 1.5),
  harmonicDivisions:      defaultStyle('#aa66dd', 0.4, 0.8),
  parallelFlowLines:     defaultStyle('#55aaee', 0.45, 0.8),
  underlyingCircles:     defaultStyle('#ee6688', 0.4, 1),
  dominantDiagonals:     defaultStyle('#dd7733', 0.45, 0.8),
  curvatureComb:         defaultStyle('#77cc55', 0.5, 0.5),
  skeletonCenterline:    defaultStyle('#cc55aa', 0.5, 1.2),
  constructionGrid:      defaultStyle('#7799dd', 0.35, 0.6),
  pathDirectionArrows:   defaultStyle('#ee8844', 0.55, 1),
  tangentIntersections:  defaultStyle('#aa55cc', 0.45, 0.8),
  anchorPoints:          defaultStyle('#ff5566', 0.7, 1),
  flowerOfLife:          defaultStyle('#b8a87a', 0.4, 0.8),
  reuleauxTriangle:      defaultStyle('#c08a4a', 0.5, 1),
  hexGrid:               defaultStyle('#7ab896', 0.3, 0.5),
  triangularGrid:        defaultStyle('#88aabb', 0.3, 0.5),
  polarGrid:             defaultStyle('#cc99bb', 0.4, 0.6),
  concentricSquares:     defaultStyle('#a8b878', 0.45, 0.8),
  inkHeightBands:        defaultStyle('#4ecdc4', 0.6, 1),
  slantAngle:            defaultStyle('#f7b267', 0.6, 1),
  strokeWeight:          defaultStyle('#ff6b6b', 0.7, 1),
  reductionTest:         defaultStyle('#9ad1f5', 0.75, 1),
  cornerRadii:           defaultStyle('#c792ea', 0.55, 1),
  // Constructions added after this table was written bring their own default
  // look with them (types/geometry.ts), so every key always has a style.
  ...GEOMETRY_STYLE_DEFAULTS,
};

// ---------------------------------------------------------------------------
// Built-in library
// ---------------------------------------------------------------------------

/** Turn a list of construction keys on, everything else off. */
function turnOn(keys: readonly (keyof GeometryOptions)[]): GeometryOptions {
  const options = { ...allOff };
  for (const key of keys) options[key] = true;
  return options;
}

interface BuiltinSpec {
  id: string;
  name: string;
  /** One line, in a sentence, saying what the preset shows. */
  description: string;
  family: PresetFamily;
  /** Constructions the preset turns on. */
  on: readonly (keyof GeometryOptions)[];
  /** Style overrides; everything else keeps the tuned default. */
  styles?: Partial<GeometryStyles>;
  /** Clearspace in `unit` (default: none). */
  clearspace?: number;
  unit?: ClearspaceUnit;
  /** Background grid of the scene (not a construction). */
  grid?: boolean;
  subdivisions?: number;
}

const builtin = (spec: BuiltinSpec): GeometryPreset => ({
  id: spec.id,
  name: spec.name,
  description: spec.description,
  family: spec.family,
  isBuiltin: true,
  geometryOptions: turnOn(spec.on),
  geometryStyles: { ...createDefaultGeometryStyles(), ...(spec.styles ?? {}) },
  clearspaceValue: spec.clearspace ?? 0,
  clearspaceUnit: spec.unit ?? 'logomark',
  showGrid: spec.grid ?? false,
  gridSubdivisions: spec.subdivisions ?? 8,
  createdAt: 0,
});

/** Quiet weights, for the presets meant to be shown to a client. */
const quiet = (color: string, opacity: number, strokeWidth: number) => defaultStyle(color, opacity, strokeWidth);

/**
 * The curated library.
 *
 * Three families, because the questions are different: a symbol is judged by
 * its geometry, a wordmark by its typographic anatomy, and a signature by the
 * relation between the two parts. Every preset only turns on constructions
 * that draw something for the kind of mark its family names.
 */
export function getBuiltinPresets(): GeometryPreset[] {
  return [
    // =====================================================================
    // Logo — symbol and graphic mark
    // =====================================================================
    builtin({
      id: 'builtin-quick-check',
      name: 'Verificação rápida',
      description: 'Primeiro olhar: limites, eixos centrais, diagonais e a proporção da caixa.',
      family: 'logo',
      on: ['boundingRects', 'centerLines', 'diagonals', 'componentRatioLabels'],
      styles: {
        boundingRects: quiet('#d94040', 0.5, 1),
        centerLines: quiet('#e69a1a', 0.4, 0.8),
        diagonals: quiet('#b34dd6', 0.3, 0.8),
      },
      clearspace: 1,
    }),
    builtin({
      id: 'builtin-minimal',
      name: 'Mínimo',
      description: 'Três linhas apenas: caixa, eixos e centro óptico.',
      family: 'logo',
      on: ['boundingRects', 'centerLines', 'opticalCenter'],
    }),
    builtin({
      id: 'builtin-golden',
      name: 'Proporção áurea',
      description: 'Espiral, círculos e divisões derivados de φ (1,618).',
      family: 'logo',
      on: ['goldenRatio', 'goldenSpiral', 'fibonacciOverlay', 'thirdLines'],
      styles: {
        fibonacciOverlay: quiet('#e6a833', 0.35, 0.8),
        thirdLines: quiet('#aa88ff', 0.3, 0.8),
      },
    }),
    builtin({
      id: 'builtin-mathematical',
      name: 'Construção geométrica',
      description: 'Retângulos raiz, vesica piscis, quadrados concêntricos e círculos inscritos.',
      family: 'logo',
      on: ['rootRectangles', 'vesicaPiscis', 'concentricSquares', 'circles'],
      styles: { circles: quiet('#33b380', 0.35, 0.8) },
    }),
    builtin({
      id: 'builtin-circles',
      name: 'Círculos construtivos',
      description: 'Círculos inscritos, círculos subjacentes ao traçado e vesica piscis.',
      family: 'logo',
      on: ['circles', 'underlyingCircles', 'vesicaPiscis', 'anchoringPoints'],
    }),
    builtin({
      id: 'builtin-monogram',
      name: 'Monograma',
      description: 'Vesica piscis, círculos áureos, eixos de simetria e quadrados concêntricos.',
      family: 'logo',
      on: ['vesicaPiscis', 'goldenRatio', 'symmetryAxes', 'circles', 'concentricSquares'],
      styles: { circles: quiet('#33b380', 0.4, 0.8) },
    }),
    builtin({
      id: 'builtin-sacred-geometry',
      name: 'Geometria sagrada',
      description: 'Flor da vida, vesica piscis, malha hexagonal e triângulo de Reuleaux.',
      family: 'logo',
      on: ['flowerOfLife', 'vesicaPiscis', 'hexGrid', 'reuleauxTriangle', 'circles'],
      styles: { circles: quiet('#33b380', 0.35, 0.8) },
    }),
    builtin({
      id: 'builtin-structural',
      name: 'Anatomia do traçado',
      description: 'Alças bezier, tangentes, círculos subjacentes e interseções de tangentes.',
      family: 'logo',
      on: ['bezierHandles', 'tangentLines', 'underlyingCircles', 'tangentIntersections'],
      styles: { tangentLines: quiet('#66ccdd', 0.4, 0.5) },
    }),
    builtin({
      id: 'builtin-skeleton',
      name: 'Análise de curvas',
      description: 'Pente de curvatura, esqueleto do traço e interseções de tangentes.',
      family: 'logo',
      on: ['curvatureComb', 'skeletonCenterline', 'tangentIntersections'],
    }),
    builtin({
      id: 'builtin-corner-audit',
      name: 'Auditoria de cantos',
      description: 'Raios de canto medidos no vetor, com os pontos de ancoragem do traçado.',
      family: 'logo',
      on: ['cornerRadii', 'anchorPoints', 'boundingRects'],
      styles: { boundingRects: quiet('#d94040', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-stroke-weight',
      name: 'Espessura de traço',
      description: 'Espessura mínima, média e máxima do traço, com o esqueleto da forma.',
      family: 'logo',
      on: ['strokeWeight', 'skeletonCenterline', 'boundingRects'],
      styles: { boundingRects: quiet('#d94040', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-angles',
      name: 'Ângulos e tangentes',
      description: 'Ângulos medidos no contorno, retas tangentes e seus cruzamentos.',
      family: 'logo',
      on: ['angleMeasurements', 'tangentLines', 'tangentIntersections'],
    }),
    builtin({
      id: 'builtin-flow',
      name: 'Fluxo e direção',
      description: 'Linhas de fluxo paralelas, diagonais dominantes, esqueleto e sentido dos traçados.',
      family: 'logo',
      on: ['parallelFlowLines', 'dominantDiagonals', 'skeletonCenterline', 'pathDirectionArrows'],
    }),
    builtin({
      id: 'builtin-diagonal',
      name: 'Diagonais e linhas de força',
      description: 'Diagonais da caixa, diagonais dominantes do desenho e regra dos terços.',
      family: 'logo',
      on: ['diagonals', 'dominantDiagonals', 'thirdLines', 'centerLines'],
      styles: { centerLines: quiet('#e69a1a', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-balance',
      name: 'Simetria',
      description: 'Eixos de simetria do desenho, eixos centrais e alinhamentos entre partes.',
      family: 'logo',
      on: ['symmetryAxes', 'centerLines', 'alignmentGuides'],
      styles: { centerLines: quiet('#e69a1a', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-optical-balance',
      name: 'Equilíbrio óptico',
      description: 'Centro óptico, mapa de peso visual e as divisões ímpares da composição.',
      family: 'logo',
      on: ['opticalCenter', 'visualWeightMap', 'centerLines', 'ruleOfOdds'],
      styles: { centerLines: quiet('#e69a1a', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-contrast-weight',
      name: 'Massa e contraste',
      description: 'Onde a tinta se concentra: densidade, mediana da massa e peso visual.',
      family: 'logo',
      on: ['contrastGuide', 'visualWeightMap', 'boundingRects'],
      styles: { boundingRects: quiet('#d94040', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-grid-spacing',
      name: 'Sistema de grade',
      description: 'Grade de construção sobre o desenho, guias de alinhamento e pontos de ancoragem.',
      family: 'logo',
      on: ['constructionGrid', 'alignmentGuides', 'anchoringPoints'],
      grid: true,
      subdivisions: 8,
    }),
    builtin({
      id: 'builtin-brutalist',
      name: 'Grade triangular',
      description: 'Malha triangular de 60 graus com a grade de construção, para marcas angulares.',
      family: 'logo',
      on: ['triangularGrid', 'constructionGrid', 'boundingRects'],
      styles: { boundingRects: quiet('#d94040', 0.35, 0.8) },
    }),
    builtin({
      id: 'builtin-modular-type',
      name: 'Escala modular',
      description: 'Escala modular, divisões harmônicas e a sequência de Fibonacci sobre a caixa.',
      family: 'logo',
      on: ['modularScale', 'harmonicDivisions', 'fibonacciOverlay'],
    }),
    builtin({
      id: 'builtin-brand-guidelines',
      name: 'Área de proteção',
      description: 'Respiro de uma vez e meia a marca, com a área segura e os limites do desenho.',
      family: 'logo',
      on: ['boundingRects', 'safeZone', 'centerLines'],
      styles: {
        boundingRects: quiet('#d94040', 0.4, 1),
        centerLines: quiet('#e69a1a', 0.3, 0.8),
      },
      clearspace: 1.5,
    }),
    builtin({
      id: 'builtin-accessibility',
      name: 'Área segura digital',
      description: 'Área segura, recorte de movimento e respiro para aplicações em tela.',
      family: 'logo',
      on: ['safeZone', 'kenBurnsSafe', 'boundingRects'],
      styles: { boundingRects: quiet('#d94040', 0.35, 0.8) },
      clearspace: 1.5,
    }),
    builtin({
      id: 'builtin-favicon',
      name: 'Ícone e favicon',
      description: 'Grade de pixels, área segura e teste de redução para tamanhos pequenos.',
      family: 'logo',
      on: ['pixelGrid', 'safeZone', 'reductionTest', 'boundingRects', 'centerLines'],
      styles: {
        pixelGrid: quiet('#999999', 0.3, 0.5),
        boundingRects: quiet('#d94040', 0.4, 0.8),
        centerLines: quiet('#e69a1a', 0.35, 0.6),
      },
      clearspace: 0.25,
      grid: true,
      subdivisions: 16,
    }),
    builtin({
      id: 'builtin-responsive',
      name: 'Teste de redução',
      description: 'A marca redesenhada em 16, 24, 32 e 48 px, com a espessura mínima do traço.',
      family: 'logo',
      on: ['reductionTest', 'strokeWeight', 'boundingRects'],
      styles: { boundingRects: quiet('#d94040', 0.3, 0.8) },
      clearspace: 0.5,
    }),
    builtin({
      id: 'builtin-presentation',
      name: 'Apresentação',
      description: 'Sobreposição discreta, para mostrar a construção ao cliente.',
      family: 'logo',
      on: ['circles', 'goldenSpiral', 'centerLines', 'boundingRects'],
      styles: {
        circles: quiet('#33b380', 0.3, 0.8),
        goldenSpiral: quiet('#ff8c42', 0.35, 1.2),
        centerLines: quiet('#e69a1a', 0.25, 0.5),
        boundingRects: quiet('#d94040', 0.25, 0.8),
      },
      clearspace: 1,
    }),
    builtin({
      id: 'builtin-full-audit',
      name: 'Auditoria completa',
      description: 'Todas as construções ligadas de uma vez, para varrer a marca inteira.',
      family: 'logo',
      on: GEOMETRY_KEYS,
      clearspace: 1,
      grid: true,
    }),

    // =====================================================================
    // Wordmark — typography only
    // =====================================================================
    builtin({
      id: 'builtin-typography',
      name: 'Anatomia do wordmark',
      description: 'Alturas de maiúscula, de x e de cada letra, medidas na tinta, sobre a linha de base.',
      family: 'wordmark',
      on: ['inkHeightBands', 'letterHeights', 'wordBaselines'],
      styles: { dynamicBaseline: quiet('#66aadd', 0.45, 0.8) },
    }),
    builtin({
      id: 'builtin-wordmark',
      name: 'Ritmo tipográfico',
      description: 'Vão entre cada letra, com o mais apertado e o mais folgado marcados.',
      family: 'wordmark',
      on: ['letterRhythm', 'opticalEdges', 'wordBaselines'],
      styles: { dynamicBaseline: quiet('#66aadd', 0.35, 0.7) },
      clearspace: 0.5,
    }),
    builtin({
      id: 'builtin-wordmark-slant',
      name: 'Inclinação do wordmark',
      description: 'Eixo vertical de cada letra contra o ângulo médio, para achar a que foge.',
      family: 'wordmark',
      on: ['letterAxes', 'slantAngle', 'wordBaselines'],
      styles: { boundingRects: quiet('#d94040', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-wordmark-weight',
      name: 'Peso do wordmark',
      description: 'Espessura de haste letra a letra, com a mais fina e a mais grossa marcadas.',
      family: 'wordmark',
      on: ['letterStemWidth', 'strokeWeight'],
    }),
    builtin({
      id: 'builtin-wordmark-alignment',
      name: 'Alinhamento do wordmark',
      description: 'Borda óptica contra a borda geométrica: o quanto os redondos precisam avançar.',
      family: 'wordmark',
      on: ['opticalEdges', 'wordBaselines', 'alignmentGuides'],
      styles: { centerLines: quiet('#e69a1a', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-wordmark-grid',
      name: 'Grade do wordmark',
      description: 'Grade em múltiplos da altura de x medida no próprio desenho.',
      family: 'wordmark',
      on: ['xHeightGrid', 'constructionGrid', 'wordBaselines'],
      grid: true,
      subdivisions: 12,
    }),
    builtin({
      id: 'builtin-wordmark-curves',
      name: 'Curvas das letras',
      description: 'Pente de curvatura, raios de canto e interseções de tangentes nos desenhos das letras.',
      family: 'wordmark',
      on: ['curvatureComb', 'cornerRadii', 'tangentIntersections'],
    }),
    builtin({
      id: 'builtin-wordmark-counters',
      name: 'Contraformas',
      description: 'Área interna de cada letra, com a menor marcada: é ela que fecha primeiro na redução.',
      family: 'wordmark',
      on: ['counterAreas', 'letterHeights'],
    }),
    builtin({
      id: 'builtin-wordmark-density',
      name: 'Densidade da palavra',
      description: 'Onde a palavra pesa mais, com o pico e a média de cobertura por coluna.',
      family: 'wordmark',
      on: ['densityCurve', 'wordBaselines'],
    }),
    builtin({
      id: 'builtin-wordmark-reduction',
      name: 'Wordmark em redução',
      description: 'A palavra reduzida a 16, 24, 32 e 48 px, com a espessura mínima e as alturas da tinta.',
      family: 'wordmark',
      on: ['reductionTest', 'strokeWeight', 'inkHeightBands'],
      clearspace: 0.5,
    }),

    // =====================================================================
    // Lockup — symbol and text together
    // =====================================================================
    builtin({
      id: 'builtin-lockup-check',
      name: 'Verificação da assinatura',
      description: 'Altura do símbolo em maiúsculas do texto, espaço entre as partes e desvio dos centros.',
      family: 'lockup',
      on: ['signatureRelation', 'boundingRects', 'centerLines'],
      styles: { centerLines: quiet('#e69a1a', 0.35, 0.8) },
      clearspace: 1,
    }),
    builtin({
      id: 'builtin-lockup-proportion',
      name: 'Proporção da assinatura',
      description: 'Proporção entre símbolo e texto, medida em múltiplos da altura de x.',
      family: 'lockup',
      on: ['signatureRelation', 'componentRatioLabels', 'xHeightGrid'],
      styles: { centerLines: quiet('#e69a1a', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-lockup-spacing',
      name: 'Espaçamento da assinatura',
      description: 'Vãos entre símbolo e texto, com o respiro de uma vez a marca ao redor.',
      family: 'lockup',
      on: ['spacingGuides', 'boundingRects', 'safeZone'],
      styles: { boundingRects: quiet('#d94040', 0.35, 0.8) },
      clearspace: 1,
    }),
    builtin({
      id: 'builtin-lockup-optical',
      name: 'Alinhamento óptico',
      description: 'Centro óptico da assinatura, eixos de simetria e guias de alinhamento entre as partes.',
      family: 'lockup',
      on: ['opticalCenter', 'alignmentGuides', 'symmetryAxes', 'centerLines'],
      styles: { centerLines: quiet('#e69a1a', 0.3, 0.8) },
    }),
    builtin({
      id: 'builtin-lockup-baseline',
      name: 'Base comum',
      description: 'Linha de base e alturas de tinta partilhadas entre o símbolo e o texto.',
      family: 'lockup',
      on: ['wordBaselines', 'inkHeightBands', 'signatureRelation'],
    }),
    builtin({
      id: 'builtin-lockup-reduction',
      name: 'Assinatura em redução',
      description: 'A assinatura inteira em 16, 24, 32 e 48 px, com espessura mínima e vãos.',
      family: 'lockup',
      on: ['reductionTest', 'strokeWeight', 'spacingGuides'],
      clearspace: 0.5,
    }),
    builtin({
      id: 'builtin-lockup-manual',
      name: 'Apresentação para manual',
      description: 'Página de manual: respiro de duas marcas, área segura e proporção de cada parte.',
      family: 'lockup',
      on: ['safeZone', 'componentRatioLabels', 'boundingRects'],
      styles: {
        safeZone: quiet('#44cc88', 0.35, 1),
        boundingRects: quiet('#d94040', 0.25, 0.8),
        componentRatioLabels: quiet('#88bbff', 0.6, 1),
      },
      clearspace: 2,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Defaults (exported so the UI can stop duplicating them)
// ---------------------------------------------------------------------------

export const ALL_GEOMETRY_OFF: Readonly<GeometryOptions> = Object.freeze({ ...allOff });
export const DEFAULT_GEOMETRY_STYLES: Readonly<GeometryStyles> = Object.freeze(
  Object.fromEntries(Object.entries(defaultStyles).map(([k, v]) => [k, Object.freeze({ ...v })])) as GeometryStyles,
);

export function createDefaultGeometryOptions(): GeometryOptions {
  return { ...allOff };
}

export function createDefaultGeometryStyles(): GeometryStyles {
  return Object.fromEntries(Object.entries(defaultStyles).map(([k, v]) => [k, { ...v }])) as GeometryStyles;
}

// ---------------------------------------------------------------------------
// Validation / normalization
// ---------------------------------------------------------------------------

/** Current schema version of a preset (bump when fields are added). */
export const PRESET_SCHEMA_VERSION = 3;
/** Format marker of exported preset files. */
export const PRESET_FILE_FORMAT = 'unbsgrid-presets';
export const PRESET_FILE_VERSION = 1;

const MAX_NAME = 80;
const MAX_DESCRIPTION = 500;
const MAX_IMPORT_PRESETS = 500;

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

function normalizeStyle(raw: unknown, fallback: GeometryStyle): GeometryStyle {
  if (!isRecord(raw)) return { ...fallback };
  return {
    color: isHexColor(raw.color) ? raw.color.toLowerCase() : fallback.color,
    opacity: finite(raw.opacity, fallback.opacity, 0, 1),
    strokeWidth: finite(raw.strokeWidth, fallback.strokeWidth, 0.05, 50),
  };
}

/**
 * Merge a (possibly old, partial or hand-edited) preset with the defaults.
 * Returns null when it lacks the minimum identity (id + name). Presets saved
 * before a construction existed used to have `geometryStyles[key]` undefined,
 * which crashed the sidebar (`geometryStyles[key].color`).
 */
export function normalizePreset(raw: unknown): GeometryPreset | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_NAME) : '';
  if (!id || !name) return null;

  const rawOptions = isRecord(raw.geometryOptions) ? raw.geometryOptions : {};
  const rawStyles = isRecord(raw.geometryStyles) ? raw.geometryStyles : {};
  const geometryOptions = { ...allOff };
  const geometryStyles = createDefaultGeometryStyles();
  for (const key of GEOMETRY_KEYS) {
    geometryOptions[key] = rawOptions[key] === true;
    geometryStyles[key] = normalizeStyle(rawStyles[key], defaultStyles[key]);
  }

  const preset: GeometryPreset = {
    id,
    name,
    family: isPresetFamily(raw.family) ? raw.family : 'logo',
    geometryOptions,
    geometryStyles,
    clearspaceValue: finite(raw.clearspaceValue, 0, 0, 1000),
    clearspaceUnit: isClearspaceUnit(raw.clearspaceUnit) ? raw.clearspaceUnit : 'logomark',
    showGrid: raw.showGrid === true,
    gridSubdivisions: Math.round(finite(raw.gridSubdivisions, 8, 2, 64)),
    createdAt: finite(raw.createdAt, 0, 0),
  };
  if (typeof raw.description === 'string' && raw.description.trim()) {
    preset.description = raw.description.trim().slice(0, MAX_DESCRIPTION);
  }
  if (raw.isBuiltin === true) preset.isBuiltin = true;
  return preset;
}

/** True when the value can be turned into a usable preset. */
export function validatePreset(p: unknown): boolean {
  return normalizePreset(p) !== null;
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // sandboxed iframe / privacy mode: accessing localStorage throws
  }
}

/** Load user presets; invalid JSON / entries are ignored, old ones are upgraded. */
export function loadPresetsFromStorage(): GeometryPreset[] {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.presets) ? parsed.presets : [];
    const seen = new Set<string>();
    const out: GeometryPreset[] = [];
    for (const item of list) {
      const p = normalizePreset(item);
      if (!p || p.isBuiltin || seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Persist user presets (built-ins are skipped). Never throws: returns false on
 * quota / security errors so the UI can warn instead of crashing.
 */
export function savePresetsToStorage(presets: GeometryPreset[]): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    const user = presets.filter(p => !p.isBuiltin).map(p => ({ ...p, schemaVersion: PRESET_SCHEMA_VERSION }));
    storage.setItem(STORAGE_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
}

/** A preset saved from the current scene. Without a family it lands in "Logo". */
export function createPreset(
  config: Omit<GeometryPreset, 'id' | 'createdAt' | 'isBuiltin' | 'family'> & { family?: PresetFamily },
): GeometryPreset {
  return {
    ...config,
    family: isPresetFamily(config.family) ? config.family : 'logo',
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Versioned preset files (export / import)
// ---------------------------------------------------------------------------

export interface PresetFile {
  format: typeof PRESET_FILE_FORMAT;
  version: number;
  exportedAt: string;
  app: 'unbsgrid';
  presets: Array<Omit<GeometryPreset, 'isBuiltin'> & { schemaVersion: number }>;
}

/** Serialize presets (built-ins excluded unless `includeBuiltin`) into a versioned JSON file. */
export function exportPresetsToJSON(presets: GeometryPreset[], options: { includeBuiltin?: boolean; pretty?: boolean } = {}): string {
  const file: PresetFile = {
    format: PRESET_FILE_FORMAT,
    version: PRESET_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'unbsgrid',
    presets: presets
      .filter(p => options.includeBuiltin || !p.isBuiltin)
      .map(p => {
        const { isBuiltin, ...rest } = p;
        void isBuiltin;
        return { ...rest, schemaVersion: PRESET_SCHEMA_VERSION };
      }),
  };
  return options.pretty === false ? JSON.stringify(file) : JSON.stringify(file, null, 2);
}

export function exportPresetsBlob(presets: GeometryPreset[], options?: { includeBuiltin?: boolean }): Blob {
  return new Blob([exportPresetsToJSON(presets, options)], { type: 'application/json' });
}

export interface PresetImportResult {
  /** Normalized presets ready to be appended (ids / names made unique). */
  presets: GeometryPreset[];
  /** Entries skipped (or the whole file rejected), with a reason. */
  errors: string[];
  /** Human-readable notes (renamed, upgraded…). */
  warnings: string[];
  fileVersion: number | null;
}

function uniqueId(): string {
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate and normalize an imported preset file. Accepts the versioned
 * format, a bare array (localStorage dump) or a single preset object.
 * Imported presets never become built-ins; id/name collisions with
 * `existing` are resolved by renaming.
 */
export function importPresetsFromJSON(text: string, existing: GeometryPreset[] = []): PresetImportResult {
  const result: PresetImportResult = { presets: [], errors: [], warnings: [], fileVersion: null };
  if (typeof text !== 'string' || !text.trim()) {
    result.errors.push('Arquivo vazio.');
    return result;
  }
  if (text.length > 5 * 1024 * 1024) {
    result.errors.push('Arquivo muito grande (máx. 5 MB).');
    return result;
  }
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    result.errors.push('JSON inválido.');
    return result;
  }

  let list: unknown[];
  if (Array.isArray(data)) {
    list = data;
    result.warnings.push('Arquivo sem cabeçalho de versão (formato antigo); campos ausentes receberam valores padrão.');
  } else if (isRecord(data) && data.format === PRESET_FILE_FORMAT) {
    const version = typeof data.version === 'number' ? data.version : NaN;
    if (!Number.isInteger(version) || version < 1 || !Array.isArray(data.presets)) {
      result.errors.push('Arquivo de presets com versão ou conteúdo inválido.');
      return result;
    }
    result.fileVersion = version;
    if (version > PRESET_FILE_VERSION) {
      result.warnings.push(`Arquivo gerado por uma versão mais nova (v${version}); campos desconhecidos foram ignorados.`);
    }
    list = data.presets;
  } else if (isRecord(data) && isRecord(data.geometryOptions)) {
    list = [data];
  } else {
    result.errors.push('Formato não reconhecido (esperado um arquivo de presets do UNBSGRID).');
    return result;
  }

  if (list.length > MAX_IMPORT_PRESETS) {
    result.warnings.push(`Apenas os primeiros ${MAX_IMPORT_PRESETS} presets foram considerados.`);
    list = list.slice(0, MAX_IMPORT_PRESETS);
  }

  const usedIds = new Set(existing.map(p => p.id));
  const usedNames = new Set(existing.map(p => p.name.toLowerCase()));
  list.forEach((entry, index) => {
    const withId = isRecord(entry) && typeof entry.id !== 'string' ? { ...entry, id: uniqueId() } : entry;
    const p = normalizePreset(withId);
    if (!p) {
      result.errors.push(`Preset #${index + 1} ignorado: falta "name" ou o conteúdo é inválido.`);
      return;
    }
    const schema = isRecord(entry) && typeof entry.schemaVersion === 'number' ? entry.schemaVersion : 1;
    if (schema < PRESET_SCHEMA_VERSION) result.warnings.push(`"${p.name}" atualizado do esquema v${schema}.`);
    delete p.isBuiltin;
    if (usedIds.has(p.id)) p.id = uniqueId();
    if (usedNames.has(p.name.toLowerCase())) {
      const base = p.name;
      let n = 2;
      while (usedNames.has(`${base} (${n})`.toLowerCase())) n++;
      p.name = `${base} (${n})`;
      result.warnings.push(`"${base}" já existia e foi importado como "${p.name}".`);
    }
    if (!p.createdAt) p.createdAt = Date.now();
    usedIds.add(p.id);
    usedNames.add(p.name.toLowerCase());
    result.presets.push(p);
  });
  return result;
}

/** Read a File (from an <input type=file>) and import it. */
export async function importPresetsFromFile(file: Blob, existing: GeometryPreset[] = []): Promise<PresetImportResult> {
  const text = typeof file.text === 'function'
    ? await file.text()
    : await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  return importPresetsFromJSON(text, existing);
}

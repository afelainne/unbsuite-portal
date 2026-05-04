import type { GeometryOptions, GeometryStyles } from '../types/geometry';
import type { ClearspaceUnit } from './svg-engine';

export interface GeometryPreset {
  id: string;
  name: string;
  description?: string;
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

const allOff: GeometryOptions = {
  boundingRects: false, circles: false, diagonals: false, goldenRatio: false,
  centerLines: false, tangentLines: false, goldenSpiral: false, isometricGrid: false,
  bezierHandles: false, typographicProportions: false, thirdLines: false,
  symmetryAxes: false, angleMeasurements: false, spacingGuides: false,
  rootRectangles: false, modularScale: false, alignmentGuides: false, safeZone: false,
  pixelGrid: false, opticalCenter: false, contrastGuide: false,
  dynamicBaseline: false, fibonacciOverlay: false, kenBurnsSafe: false, componentRatioLabels: false,
  vesicaPiscis: false, ruleOfOdds: false, visualWeightMap: false, anchoringPoints: false, harmonicDivisions: false,
  parallelFlowLines: false, underlyingCircles: false, dominantDiagonals: false, curvatureComb: false,
  skeletonCenterline: false, constructionGrid: false, pathDirectionArrows: false, tangentIntersections: false,
  anchorPoints: false,
  flowerOfLife: false, reuleauxTriangle: false, hexGrid: false,
  triangularGrid: false, polarGrid: false, concentricSquares: false,
};

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
};

export function getBuiltinPresets(): GeometryPreset[] {
  return [
    // --- Quick check: what a designer turns on first ---
    {
      id: 'builtin-quick-check',
      name: 'Verificação Rápida',
      description: 'Primeiro olhar: limites, centro e proporções básicas do logo',
      isBuiltin: true,
      geometryOptions: { ...allOff, boundingRects: true, centerLines: true, diagonals: true, componentRatioLabels: true },
      geometryStyles: {
        ...defaultStyles,
        boundingRects: defaultStyle('#d94040', 0.5, 1),
        centerLines: defaultStyle('#e69a1a', 0.4, 0.8),
        diagonals: defaultStyle('#b34dd6', 0.3, 0.8),
        componentRatioLabels: defaultStyle('#88bbff', 0.6, 1),
      },
      clearspaceValue: 1, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Golden proportions: the classic composition analysis ---
    {
      id: 'builtin-golden',
      name: 'Proporção Áurea',
      description: 'Espiral, círculos e divisões baseadas na proporção áurea (φ 1.618)',
      isBuiltin: true,
      geometryOptions: { ...allOff, goldenRatio: true, goldenSpiral: true, fibonacciOverlay: true, thirdLines: true },
      geometryStyles: {
        ...defaultStyles,
        goldenRatio: defaultStyle('#f2c00a', 0.5, 1),
        goldenSpiral: defaultStyle('#ff8c42', 0.55, 1.5),
        fibonacciOverlay: defaultStyle('#e6a833', 0.35, 0.8),
        thirdLines: defaultStyle('#aa88ff', 0.3, 0.8),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Structural anatomy: how the logo is built ---
    {
      id: 'builtin-structural',
      name: 'Anatomia Estrutural',
      description: 'Curvas bezier, tangentes, curvatura e construção geométrica do logo',
      isBuiltin: true,
      geometryOptions: { ...allOff, bezierHandles: true, tangentLines: true, curvatureComb: true, tangentIntersections: true, underlyingCircles: true, anchorPoints: true },
      geometryStyles: {
        ...defaultStyles,
        bezierHandles: defaultStyle('#ff5577', 0.6, 1),
        tangentLines: defaultStyle('#66ccdd', 0.4, 0.5),
        curvatureComb: defaultStyle('#77cc55', 0.5, 0.5),
        tangentIntersections: defaultStyle('#aa55cc', 0.45, 0.8),
        underlyingCircles: defaultStyle('#ee6688', 0.4, 1),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Symmetry & alignment: balance check ---
    {
      id: 'builtin-balance',
      name: 'Equilíbrio & Simetria',
      description: 'Eixos de simetria, centro óptico e distribuição de peso visual',
      isBuiltin: true,
      geometryOptions: { ...allOff, symmetryAxes: true, opticalCenter: true, visualWeightMap: true, centerLines: true },
      geometryStyles: {
        ...defaultStyles,
        symmetryAxes: defaultStyle('#ff66b2', 0.5, 1),
        opticalCenter: defaultStyle('#ff4488', 0.6, 1.5),
        visualWeightMap: defaultStyle('#cc8844', 0.35, 1),
        centerLines: defaultStyle('#e69a1a', 0.3, 0.8),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Grid & spacing: pixel-perfect alignment ---
    {
      id: 'builtin-grid-spacing',
      name: 'Grid & Espaçamento',
      description: 'Grids, guias de alinhamento e espaçamento entre componentes',
      isBuiltin: true,
      geometryOptions: { ...allOff, isometricGrid: true, alignmentGuides: true, spacingGuides: true, anchoringPoints: true, constructionGrid: true },
      geometryStyles: {
        ...defaultStyles,
        isometricGrid: defaultStyle('#5eaaf7', 0.2, 0.5),
        alignmentGuides: defaultStyle('#ff7744', 0.4, 0.8),
        spacingGuides: defaultStyle('#33ccff', 0.45, 1),
        anchoringPoints: defaultStyle('#44ddbb', 0.5, 1.5),
        constructionGrid: defaultStyle('#7799dd', 0.3, 0.6),
      },
      clearspaceValue: 1, clearspaceUnit: 'logomark', showGrid: true, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Typography: for logotypes and wordmarks ---
    {
      id: 'builtin-typography',
      name: 'Tipografia & Baseline',
      description: 'Proporções tipográficas, baseline, ritmo vertical e divisões harmônicas',
      isBuiltin: true,
      geometryOptions: { ...allOff, typographicProportions: true, dynamicBaseline: true, harmonicDivisions: true, modularScale: true },
      geometryStyles: {
        ...defaultStyles,
        typographicProportions: defaultStyle('#88ddaa', 0.45, 1),
        dynamicBaseline: defaultStyle('#66aadd', 0.4, 0.8),
        harmonicDivisions: defaultStyle('#aa66dd', 0.35, 0.8),
        modularScale: defaultStyle('#77ddaa', 0.3, 0.8),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Brand guidelines: clearspace & safe zones ---
    {
      id: 'builtin-brand-guidelines',
      name: 'Manual de Marca',
      description: 'Área de proteção, safe zone e limites para aplicação do logo',
      isBuiltin: true,
      geometryOptions: { ...allOff, boundingRects: true, safeZone: true, kenBurnsSafe: true, contrastGuide: true },
      geometryStyles: {
        ...defaultStyles,
        boundingRects: defaultStyle('#d94040', 0.4, 1),
        safeZone: defaultStyle('#44cc88', 0.4, 1.2),
        kenBurnsSafe: defaultStyle('#ff6644', 0.35, 1),
        contrastGuide: defaultStyle('#ffcc00', 0.35, 1),
      },
      clearspaceValue: 1.5, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Mathematical: deep geometric analysis ---
    {
      id: 'builtin-mathematical',
      name: 'Geometria Avançada',
      description: 'Retângulos raiz, vesica piscis, divisões e escala modular',
      isBuiltin: true,
      geometryOptions: { ...allOff, rootRectangles: true, vesicaPiscis: true, ruleOfOdds: true, modularScale: true },
      geometryStyles: {
        ...defaultStyles,
        rootRectangles: defaultStyle('#cc77ff', 0.4, 1),
        vesicaPiscis: defaultStyle('#bb77cc', 0.4, 1),
        ruleOfOdds: defaultStyle('#77aacc', 0.35, 0.8),
        modularScale: defaultStyle('#77ddaa', 0.35, 0.8),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Presentation: clean overlay for client presentations ---
    {
      id: 'builtin-presentation',
      name: 'Apresentação',
      description: 'Overlay limpo para apresentar construção geométrica ao cliente',
      isBuiltin: true,
      geometryOptions: { ...allOff, circles: true, goldenSpiral: true, centerLines: true, boundingRects: true },
      geometryStyles: {
        ...defaultStyles,
        circles: defaultStyle('#33b380', 0.3, 0.8),
        goldenSpiral: defaultStyle('#ff8c42', 0.35, 1.2),
        centerLines: defaultStyle('#e69a1a', 0.25, 0.5),
        boundingRects: defaultStyle('#d94040', 0.25, 0.8),
      },
      clearspaceValue: 1, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Fluxo Dinâmico ---
    {
      id: 'builtin-flow',
      name: 'Fluxo Dinâmico',
      description: 'Análise de movimento, direção visual e linhas de fluxo',
      isBuiltin: true,
      geometryOptions: { ...allOff, parallelFlowLines: true, dominantDiagonals: true, skeletonCenterline: true, pathDirectionArrows: true },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Círculos Construtivos ---
    {
      id: 'builtin-circles',
      name: 'Círculos Construtivos',
      description: 'Geometria circular: inscritos, subjacentes e vesica piscis',
      isBuiltin: true,
      geometryOptions: { ...allOff, circles: true, underlyingCircles: true, vesicaPiscis: true, anchoringPoints: true },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Minimalista ---
    {
      id: 'builtin-minimal',
      name: 'Minimalista',
      description: 'Overlay super limpo com poucos elementos essenciais',
      isBuiltin: true,
      geometryOptions: { ...allOff, boundingRects: true, centerLines: true, opticalCenter: true },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Contraste & Peso ---
    {
      id: 'builtin-contrast-weight',
      name: 'Contraste & Peso',
      description: 'Análise de peso visual, equilíbrio e distribuição',
      isBuiltin: true,
      geometryOptions: { ...allOff, contrastGuide: true, visualWeightMap: true, ruleOfOdds: true, anchoringPoints: true },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Diagonal & Perspectiva ---
    {
      id: 'builtin-diagonal',
      name: 'Diagonal & Perspectiva',
      description: 'Linhas de força, diagonais dominantes e composição',
      isBuiltin: true,
      geometryOptions: { ...allOff, diagonals: true, dominantDiagonals: true, thirdLines: true, goldenRatio: true },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Skeleton & Curvas ---
    {
      id: 'builtin-skeleton',
      name: 'Skeleton & Curvas',
      description: 'Análise de forma, curvatura e estrutura de curvas',
      isBuiltin: true,
      geometryOptions: { ...allOff, skeletonCenterline: true, curvatureComb: true, bezierHandles: true, tangentIntersections: true, anchorPoints: true },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Full audit: everything on ---
    {
      id: 'builtin-full-audit',
      name: 'Auditoria Completa',
      description: 'Todas as ferramentas ativas para análise exaustiva',
      isBuiltin: true,
      geometryOptions: {
        boundingRects: true, circles: true, diagonals: true, goldenRatio: true,
        centerLines: true, tangentLines: true, goldenSpiral: true, isometricGrid: true,
        bezierHandles: true, typographicProportions: true, thirdLines: true,
        symmetryAxes: true, angleMeasurements: true, spacingGuides: true,
        rootRectangles: true, modularScale: true, alignmentGuides: true, safeZone: true,
        pixelGrid: true, opticalCenter: true, contrastGuide: true,
        dynamicBaseline: true, fibonacciOverlay: true, kenBurnsSafe: true, componentRatioLabels: true,
        vesicaPiscis: true, ruleOfOdds: true, visualWeightMap: true, anchoringPoints: true, harmonicDivisions: true,
        parallelFlowLines: true, underlyingCircles: true, dominantDiagonals: true, curvatureComb: true,
        skeletonCenterline: true, constructionGrid: true, pathDirectionArrows: true, tangentIntersections: true,
        anchorPoints: true,
        flowerOfLife: true, reuleauxTriangle: true, hexGrid: true,
        triangularGrid: true, polarGrid: true, concentricSquares: true,
      },
      geometryStyles: { ...defaultStyles },
      clearspaceValue: 1, clearspaceUnit: 'logomark', showGrid: true, gridSubdivisions: 8,
      createdAt: 0,
    },

    // === New built-ins (Wave 2) ===

    // --- Wordmark / Logotipo ---
    {
      id: 'builtin-wordmark',
      name: 'Wordmark & Logotipo',
      description: 'Baseline dinâmico, x-height, proporções tipográficas e espaçamento entre letras',
      isBuiltin: true,
      geometryOptions: { ...allOff, dynamicBaseline: true, harmonicDivisions: true, typographicProportions: true, componentRatioLabels: true, spacingGuides: true },
      geometryStyles: {
        ...defaultStyles,
        dynamicBaseline: defaultStyle('#66aadd', 0.5, 0.8),
        harmonicDivisions: defaultStyle('#aa66dd', 0.4, 0.8),
        typographicProportions: defaultStyle('#88ddaa', 0.5, 1),
        componentRatioLabels: defaultStyle('#88bbff', 0.7, 1),
        spacingGuides: defaultStyle('#33ccff', 0.5, 1),
      },
      clearspaceValue: 0.5, clearspaceUnit: 'logomark', showGrid: true, gridSubdivisions: 12,
      createdAt: 0,
    },

    // --- Monograma ---
    {
      id: 'builtin-monogram',
      name: 'Monograma',
      description: 'Vesica piscis, círculos áureos, simetria dupla e quadrados concêntricos',
      isBuiltin: true,
      geometryOptions: { ...allOff, vesicaPiscis: true, goldenRatio: true, symmetryAxes: true, circles: true, concentricSquares: true },
      geometryStyles: {
        ...defaultStyles,
        vesicaPiscis: defaultStyle('#bb77cc', 0.5, 1),
        goldenRatio: defaultStyle('#f2c00a', 0.5, 1),
        symmetryAxes: defaultStyle('#ff66b2', 0.55, 1),
        circles: defaultStyle('#33b380', 0.4, 0.8),
        concentricSquares: defaultStyle('#a8b878', 0.45, 0.8),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Favicon / App Icon ---
    {
      id: 'builtin-favicon',
      name: 'Favicon / App Icon',
      description: 'Pixel grid, safe zone reforçada e contraste para ícones em tamanhos pequenos',
      isBuiltin: true,
      geometryOptions: { ...allOff, pixelGrid: true, safeZone: true, contrastGuide: true, boundingRects: true, centerLines: true },
      geometryStyles: {
        ...defaultStyles,
        pixelGrid: defaultStyle('#999999', 0.3, 0.5),
        safeZone: defaultStyle('#44cc88', 0.5, 1.2),
        contrastGuide: defaultStyle('#ffcc00', 0.5, 1),
        boundingRects: defaultStyle('#d94040', 0.4, 0.8),
        centerLines: defaultStyle('#e69a1a', 0.35, 0.6),
      },
      clearspaceValue: 0.5, clearspaceUnit: 'pixels', showGrid: true, gridSubdivisions: 16,
      createdAt: 0,
    },

    // --- Responsivo / Multi-escala ---
    {
      id: 'builtin-responsive',
      name: 'Responsivo Multi-escala',
      description: 'Clearspace, grid de construção, centro óptico e safe zones para escala',
      isBuiltin: true,
      geometryOptions: { ...allOff, safeZone: true, constructionGrid: true, opticalCenter: true, kenBurnsSafe: true, componentRatioLabels: true },
      geometryStyles: {
        ...defaultStyles,
        safeZone: defaultStyle('#44cc88', 0.4, 1.2),
        constructionGrid: defaultStyle('#7799dd', 0.35, 0.6),
        opticalCenter: defaultStyle('#ff4488', 0.55, 1.5),
        kenBurnsSafe: defaultStyle('#ff6644', 0.35, 1),
        componentRatioLabels: defaultStyle('#88bbff', 0.6, 1),
      },
      clearspaceValue: 1, clearspaceUnit: 'logomark', showGrid: true, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Auditoria de Acessibilidade ---
    {
      id: 'builtin-accessibility',
      name: 'Auditoria de Acessibilidade',
      description: 'Contraste, peso visual, centro óptico e área segura para uso acessível',
      isBuiltin: true,
      geometryOptions: { ...allOff, contrastGuide: true, visualWeightMap: true, safeZone: true, opticalCenter: true },
      geometryStyles: {
        ...defaultStyles,
        contrastGuide: defaultStyle('#ffcc00', 0.5, 1),
        visualWeightMap: defaultStyle('#cc8844', 0.4, 1),
        safeZone: defaultStyle('#44cc88', 0.45, 1.2),
        opticalCenter: defaultStyle('#ff4488', 0.6, 1.5),
      },
      clearspaceValue: 1.5, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Geometria Sagrada ---
    {
      id: 'builtin-sacred-geometry',
      name: 'Geometria Sagrada',
      description: 'Flor da vida, vesica piscis, malha hexagonal e triângulo de Reuleaux',
      isBuiltin: true,
      geometryOptions: { ...allOff, flowerOfLife: true, vesicaPiscis: true, hexGrid: true, reuleauxTriangle: true, circles: true },
      geometryStyles: {
        ...defaultStyles,
        flowerOfLife: defaultStyle('#b8a87a', 0.5, 0.8),
        vesicaPiscis: defaultStyle('#bb77cc', 0.45, 1),
        hexGrid: defaultStyle('#7ab896', 0.3, 0.5),
        reuleauxTriangle: defaultStyle('#c08a4a', 0.55, 1),
        circles: defaultStyle('#33b380', 0.35, 0.8),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },

    // --- Brutalist Grid ---
    {
      id: 'builtin-brutalist',
      name: 'Brutalist Grid',
      description: 'Grid de construção denso, diagonais dominantes e malha triangular para composições marcantes',
      isBuiltin: true,
      geometryOptions: { ...allOff, constructionGrid: true, dominantDiagonals: true, pixelGrid: true, boundingRects: true, triangularGrid: true },
      geometryStyles: {
        ...defaultStyles,
        constructionGrid: defaultStyle('#7799dd', 0.5, 0.8),
        dominantDiagonals: defaultStyle('#dd7733', 0.55, 1),
        pixelGrid: defaultStyle('#999999', 0.3, 0.5),
        boundingRects: defaultStyle('#d94040', 0.5, 1),
        triangularGrid: defaultStyle('#88aabb', 0.4, 0.6),
      },
      clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: true, gridSubdivisions: 16,
      createdAt: 0,
    },

    // --- Modular Type System ---
    {
      id: 'builtin-modular-type',
      name: 'Modular Type System',
      description: 'Escala modular, divisões harmônicas, baseline e grid radial para sistemas tipográficos',
      isBuiltin: true,
      geometryOptions: { ...allOff, modularScale: true, harmonicDivisions: true, dynamicBaseline: true, typographicProportions: true, polarGrid: true },
      geometryStyles: {
        ...defaultStyles,
        modularScale: defaultStyle('#77ddaa', 0.45, 0.8),
        harmonicDivisions: defaultStyle('#aa66dd', 0.4, 0.8),
        dynamicBaseline: defaultStyle('#66aadd', 0.45, 0.8),
        typographicProportions: defaultStyle('#88ddaa', 0.5, 1),
        polarGrid: defaultStyle('#cc99bb', 0.35, 0.6),
      },
      clearspaceValue: 0.5, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
      createdAt: 0,
    },
  ];
}

export function loadPresetsFromStorage(): GeometryPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validatePreset);
  } catch {
    return [];
  }
}

export function savePresetsToStorage(presets: GeometryPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.filter(p => !p.isBuiltin)));
}

export function createPreset(config: Omit<GeometryPreset, 'id' | 'createdAt' | 'isBuiltin'>): GeometryPreset {
  return {
    ...config,
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
}

function validatePreset(p: any): p is GeometryPreset {
  return p && typeof p.id === 'string' && typeof p.name === 'string' && p.geometryOptions && p.geometryStyles;
}

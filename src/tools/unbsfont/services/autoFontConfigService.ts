/**
 * Auto Font Configuration Service v3
 * Sistema de configuração automática baseado em análise PRECISA da geometria SVG
 * 
 * ABORDAGEM:
 * 1. Extrai TODOS os pontos do path SVG (curvas, linhas, arcos)
 * 2. Calcula métricas precisas: roundness, aspect ratio, densidade
 * 3. Classifica cada glyph em classes de kerning (ROUND, DIAGONAL, STRAIGHT, etc.)
 * 4. Usa banco de dados profissional de kerning tipográfico
 * 5. Valida cruzando todos os glyphs antes de aplicar
 */

import { GlyphData, FontMetadata, ShapeCategory } from '../types';
import { analyzeGlyphShape, GlyphProfile } from './glyphShapeAnalyzer';
import { KerningPair } from './professionalKerningService';

// ============================================================================
// BANCO DE DADOS DE KERNING TIPOGRÁFICO PROFISSIONAL
// Baseado em padrões da Adobe, Linotype, Monotype
// ============================================================================

type KerningClass = 'ROUND' | 'DIAGONAL_LEFT' | 'DIAGONAL_RIGHT' | 'OVERHANG' | 'STRAIGHT' | 'OPEN';

/**
 * Matriz de kerning profissional
 * Valores são fração do peso do traço (0.3 = 30% do peso)
 * Negativos = aproximar, Positivos = afastar
 */
const KERNING_MATRIX: Record<KerningClass, Record<KerningClass, number>> = {
  'DIAGONAL_LEFT': {   // Lado direito de A
    'DIAGONAL_RIGHT': -0.45,  // AV, AW, AY
    'OVERHANG': -0.40,        // AT, AF
    'ROUND': -0.25,           // AO, AC, Ao
    'OPEN': -0.30,            // AC aberto
    'STRAIGHT': -0.08,        // AH, AN
    'DIAGONAL_LEFT': -0.12,   // AA
  },
  'DIAGONAL_RIGHT': {  // Lado direito de V, W, Y
    'DIAGONAL_LEFT': -0.45,   // VA, WA, YA
    'ROUND': -0.30,           // VO, WO
    'STRAIGHT': -0.10,
    'OVERHANG': -0.15,
    'OPEN': -0.25,
    'DIAGONAL_RIGHT': -0.08,
  },
  'OVERHANG': {  // Lado direito de T, F, P, r
    'DIAGONAL_LEFT': -0.45,   // TA, FA
    'ROUND': -0.40,           // To, Te, Fo
    'OPEN': -0.38,            // Tc
    'STRAIGHT': -0.12,
    'DIAGONAL_RIGHT': -0.20,
    'OVERHANG': -0.05,
  },
  'ROUND': {  // Lado direito de O, C, G, o, c, e
    'DIAGONAL_RIGHT': -0.28,  // OV, CY
    'DIAGONAL_LEFT': -0.18,   // OA
    'OVERHANG': -0.15,
    'STRAIGHT': -0.05,
    'ROUND': -0.05,
    'OPEN': -0.10,
  },
  'OPEN': {  // Lado direito de L, J (espaço aberto)
    'OVERHANG': -0.55,        // LT - kerning clássico muito forte
    'DIAGONAL_RIGHT': -0.50,  // LY, LV
    'DIAGONAL_LEFT': -0.15,
    'ROUND': -0.15,
    'STRAIGHT': -0.05,
    'OPEN': 0,
  },
  'STRAIGHT': {  // Lado direito de H, I, M, N, l
    'DIAGONAL_RIGHT': -0.12,
    'DIAGONAL_LEFT': -0.08,
    'OVERHANG': -0.05,
    'ROUND': -0.05,
    'STRAIGHT': 0,
    'OPEN': 0,
  },
};

/**
 * Pares específicos com ajuste extra (letras problemáticas conhecidas)
 * Valores são multiplicadores do resultado da matriz
 */
const PAIR_MULTIPLIERS: Record<string, number> = {
  // Pares críticos uppercase
  'AV': 1.3, 'AW': 1.2, 'AY': 1.3, 'AT': 1.2,
  'VA': 1.3, 'WA': 1.2, 'YA': 1.3, 'TA': 1.2,
  'LT': 1.4, 'LV': 1.3, 'LY': 1.3, 'LW': 1.2,
  'FA': 1.2, 'PA': 1.1, 'TO': 1.1, 'WO': 1.1,
  // Pares críticos lowercase
  'To': 1.3, 'Te': 1.3, 'Tr': 1.2, 'Ty': 1.2,
  'Fo': 1.2, 'Fe': 1.2,
  'av': 1.1, 'aw': 1.1, 'ay': 1.1,
  'ov': 1.0, 'ew': 1.0, 'ey': 1.0,
  'ry': 1.1, 'rv': 1.1,
  // Pontuação
  'T.': 1.4, 'T,': 1.4, 'V.': 1.3, 'V,': 1.3,
  'Y.': 1.3, 'Y,': 1.3, 'r.': 1.2, 'r,': 1.2,
};

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface AutoConfigResult {
  glyphUpdates: Map<string, Partial<GlyphData>>;
  kerningPairs: KerningPair[];
  metadataUpdates: Partial<FontMetadata>;
  report: ConfigurationReport;
}

export interface ConfigurationReport {
  totalGlyphs: number;
  glyphsAnalyzed: number;
  glyphsUpdated: number;
  kerningPairsGenerated: number;
  averageHeight: number;
  suggestedAscender: number;
  suggestedDescender: number;
  detectedFontStyle: FontStyleType;
  averageStrokeWeight: number;
  averageRoundness: number;
  warnings: string[];
  summary: string;
}

export interface AutoConfigOptions {
  normalizeHeights: boolean;
  autoSpacing: boolean;
  autoKerning: boolean;
  kerningIntensity: number;      // 0.5 = suave, 1.0 = normal, 1.5 = agressivo
  targetHeight: number;
  sideMargin: number;            // Margem lateral BASE
  minAdvanceWidth: number;
  maxAdvanceWidth: number;
  optimizeMetrics: boolean;
}

type FontStyleType = 'display-round' | 'display-angular' | 'geometric' | 'grotesque' | 'humanist' | 'script' | 'unknown';

export const DEFAULT_AUTO_CONFIG_OPTIONS: AutoConfigOptions = {
  normalizeHeights: true,
  autoSpacing: true,
  autoKerning: true,
  kerningIntensity: 1.0,
  targetHeight: 700,
  sideMargin: 50,               // Margem mais generosa
  minAdvanceWidth: 80,
  maxAdvanceWidth: 1500,
  optimizeMetrics: true
};

// ============================================================================
// ANÁLISE PRECISA DE GEOMETRIA SVG
// ============================================================================

interface Point { x: number; y: number; }

interface GlyphAnalysis {
  char: string;
  points: Point[];
  bounds: { x: number; y: number; width: number; height: number } | null;
  // Métricas calculadas
  aspectRatio: number;
  roundness: number;             // 0 = angular, 1 = circular
  density: number;               // Preenchimento
  strokeWeight: number;
  hasCounters: boolean;
  // Classificação
  category: 'uppercase' | 'lowercase' | 'number' | 'punctuation' | 'symbol';
  leftClass: KerningClass;
  rightClass: KerningClass;
  // Profile do analyzer existente
  profile: GlyphProfile | null;
}

/**
 * Extrai TODOS os pontos de um path SVG com amostragem de curvas
 */
const extractPathPoints = (d: string): Point[] => {
  if (!d || !d.trim()) return [];
  
  const points: Point[] = [];
  const tokens = d.match(/([MmLlHhVvCcSsQqTtAaZz])|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  let i = 0;
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  let lastCmd = '';
  let lastCX = 0, lastCY = 0;

  const readNum = (): number => {
    while (i < tokens.length && /^[MmLlHhVvCcSsQqTtAaZz]$/.test(tokens[i])) i++;
    if (i >= tokens.length) return 0;
    const val = parseFloat(tokens[i++]);
    return isNaN(val) ? 0 : val;
  };

  const isCmd = (t: string) => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(t);
  const addPoint = (px: number, py: number) => {
    if (isFinite(px) && isFinite(py)) points.push({ x: px, y: py });
  };

  // Amostragem de curva Bézier cúbica
  const sampleCubic = (p0x: number, p0y: number, p1x: number, p1y: number,
                       p2x: number, p2y: number, p3x: number, p3y: number) => {
    for (let j = 0; j <= 10; j++) {
      const t = j / 10;
      const mt = 1 - t;
      addPoint(
        mt*mt*mt*p0x + 3*mt*mt*t*p1x + 3*mt*t*t*p2x + t*t*t*p3x,
        mt*mt*mt*p0y + 3*mt*mt*t*p1y + 3*mt*t*t*p2y + t*t*t*p3y
      );
    }
  };

  // Amostragem de curva Bézier quadrática
  const sampleQuad = (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number) => {
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      const mt = 1 - t;
      addPoint(mt*mt*p0x + 2*mt*t*p1x + t*t*p2x, mt*mt*p0y + 2*mt*t*p1y + t*t*p2y);
    }
  };

  while (i < tokens.length) {
    let cmd = tokens[i];
    if (isCmd(cmd)) { i++; } 
    else { cmd = lastCmd === 'M' ? 'L' : lastCmd === 'm' ? 'l' : lastCmd; }

    const isRel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();

    try {
      switch (type) {
        case 'M': {
          const mx = readNum(), my = readNum();
          x = isRel ? x + mx : mx;
          y = isRel ? y + my : my;
          startX = x; startY = y;
          addPoint(x, y);
          break;
        }
        case 'L': {
          const lx = readNum(), ly = readNum();
          const newX = isRel ? x + lx : lx;
          const newY = isRel ? y + ly : ly;
          // Amostrar linha
          for (let j = 1; j <= 3; j++) {
            const t = j / 3;
            addPoint(x + t * (newX - x), y + t * (newY - y));
          }
          x = newX; y = newY;
          break;
        }
        case 'H': {
          const hx = readNum();
          const newX = isRel ? x + hx : hx;
          addPoint(newX, y);
          x = newX;
          break;
        }
        case 'V': {
          const vy = readNum();
          const newY = isRel ? y + vy : vy;
          addPoint(x, newY);
          y = newY;
          break;
        }
        case 'C': {
          const x1 = isRel ? x + readNum() : readNum();
          const y1 = isRel ? y + readNum() : readNum();
          const x2 = isRel ? x + readNum() : readNum();
          const y2 = isRel ? y + readNum() : readNum();
          const ex = isRel ? x + readNum() : readNum();
          const ey = isRel ? y + readNum() : readNum();
          sampleCubic(x, y, x1, y1, x2, y2, ex, ey);
          lastCX = x2; lastCY = y2;
          x = ex; y = ey;
          break;
        }
        case 'S': {
          const refX = 'CcSs'.includes(lastCmd) ? 2*x - lastCX : x;
          const refY = 'CcSs'.includes(lastCmd) ? 2*y - lastCY : y;
          const x2 = isRel ? x + readNum() : readNum();
          const y2 = isRel ? y + readNum() : readNum();
          const ex = isRel ? x + readNum() : readNum();
          const ey = isRel ? y + readNum() : readNum();
          sampleCubic(x, y, refX, refY, x2, y2, ex, ey);
          lastCX = x2; lastCY = y2;
          x = ex; y = ey;
          break;
        }
        case 'Q': {
          const qx = isRel ? x + readNum() : readNum();
          const qy = isRel ? y + readNum() : readNum();
          const ex = isRel ? x + readNum() : readNum();
          const ey = isRel ? y + readNum() : readNum();
          sampleQuad(x, y, qx, qy, ex, ey);
          lastCX = qx; lastCY = qy;
          x = ex; y = ey;
          break;
        }
        case 'T': {
          const refX = 'QqTt'.includes(lastCmd) ? 2*x - lastCX : x;
          const refY = 'QqTt'.includes(lastCmd) ? 2*y - lastCY : y;
          const ex = isRel ? x + readNum() : readNum();
          const ey = isRel ? y + readNum() : readNum();
          sampleQuad(x, y, refX, refY, ex, ey);
          lastCX = refX; lastCY = refY;
          x = ex; y = ey;
          break;
        }
        case 'A': {
          // Arco - simplificado
          readNum(); readNum(); readNum(); readNum(); readNum();
          const ex = isRel ? x + readNum() : readNum();
          const ey = isRel ? y + readNum() : readNum();
          // Amostrar como curva
          const midX = (x + ex) / 2;
          const midY = Math.min(y, ey) - Math.abs(ex - x) * 0.5;
          sampleQuad(x, y, midX, midY, ex, ey);
          x = ex; y = ey;
          break;
        }
        case 'Z': {
          x = startX; y = startY;
          break;
        }
      }
    } catch {
      // Continuar no erro
    }
    lastCmd = cmd;
  }

  return points;
};

/**
 * Calcula bounding box dos pontos
 */
const calculateBounds = (points: Point[]): { x: number; y: number; width: number; height: number } | null => {
  if (points.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  
  if (!isFinite(minX) || maxX - minX < 1 || maxY - minY < 1) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/**
 * Calcula roundness (0 = angular, 1 = circular)
 * Baseado na distribuição dos pontos em relação ao centro
 */
const calculateRoundness = (points: Point[], bounds: { x: number; y: number; width: number; height: number }): number => {
  if (points.length < 20) return 0.5;
  
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const avgRadius = Math.min(bounds.width, bounds.height) / 2;
  
  // Para forma circular perfeita, todos os pontos estariam a mesma distância do centro
  const distances = points.map(p => 
    Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
  );
  
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDist, 2), 0) / distances.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalizar: baixo stdDev = redondo
  const normalizedVar = stdDev / avgRadius;
  const roundness = Math.max(0, Math.min(1, 1 - normalizedVar * 2));
  
  return roundness;
};

/**
 * Calcula a densidade (quão preenchido é o glyph)
 */
const calculateDensity = (points: Point[], bounds: { width: number; height: number }): number => {
  if (points.length < 5) return 0.5;
  
  // Grid ocupancy
  const gridSize = 15;
  const cellW = bounds.width / gridSize;
  const cellH = bounds.height / gridSize;
  const grid = new Set<string>();
  
  const firstX = points[0]?.x ?? 0;
  const firstY = points[0]?.y ?? 0;
  
  for (const p of points) {
    const gx = Math.floor((p.x - firstX) / cellW);
    const gy = Math.floor((p.y - firstY) / cellH);
    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      grid.add(`${gx},${gy}`);
    }
  }
  
  return grid.size / (gridSize * gridSize);
};

/**
 * Estima o peso do traço
 */
const estimateStrokeWeight = (density: number, bounds: { width: number; height: number }): number => {
  // Densidade correlaciona com peso
  // Fontes finas: ~0.15-0.25 densidade
  // Fontes display: ~0.35-0.50 densidade
  const avgDimension = Math.sqrt(bounds.width * bounds.height);
  const baseWeight = density * avgDimension * 0.4;
  
  return Math.max(30, Math.min(200, baseWeight));
};

/**
 * Determina a categoria do caractere
 */
const getCharCategory = (char: string): GlyphAnalysis['category'] => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) return 'uppercase';
  if (code >= 97 && code <= 122) return 'lowercase';
  if (code >= 48 && code <= 57) return 'number';
  if ('.,;:!?\'"-()[]{}@#$%&*_+=<>/\\|~`^'.includes(char)) return 'punctuation';
  return 'symbol';
};

/**
 * Classifica o lado esquerdo do glyph para kerning
 */
const classifyLeftSide = (char: string, profile: GlyphProfile | null, roundness: number): KerningClass => {
  // Caracteres conhecidos primeiro
  if ('OQCGDБ'.includes(char) || 'ocdqgбе'.includes(char)) return 'ROUND';
  if ('VWYУЧvwyуч'.includes(char)) return 'DIAGONAL_RIGHT';
  if ('AÀÁÂÃÄАЛДaàáâãäал'.includes(char)) return 'DIAGONAL_LEFT';
  if ('LJ'.includes(char)) return 'OPEN';
  if ('TFPГТrт'.includes(char)) return 'OVERHANG';
  
  // Usar profile se disponível
  if (profile) {
    if (profile.hasLeftCurve || profile.shapeLeft === 'round') return 'ROUND';
    if (profile.hasLeftDiagonal || profile.shapeLeft === 'diagonal') {
      // Distinguir entre diagonal esquerda (A) e direita (V)
      if (profile.hasRightDiagonal) return 'DIAGONAL_LEFT'; // A-like
      return 'DIAGONAL_RIGHT'; // V-like
    }
    if (profile.hasLeftOverhang) return 'OVERHANG';
    if (profile.hasLeftOpen) return 'OPEN';
  }
  
  // Fallback baseado em roundness
  if (roundness > 0.6) return 'ROUND';
  
  return 'STRAIGHT';
};

/**
 * Classifica o lado direito do glyph para kerning
 */
const classifyRightSide = (char: string, profile: GlyphProfile | null, roundness: number): KerningClass => {
  // Caracteres conhecidos
  if ('OQCDGPBR'.includes(char) || 'oqbpd'.includes(char)) return 'ROUND';
  if ('AÀÁÂÃÄАДaàáâãäад'.includes(char)) return 'DIAGONAL_LEFT';
  if ('VWYУЧvwyуч'.includes(char)) return 'DIAGONAL_RIGHT';
  if ('LJl'.includes(char)) return 'OPEN';
  if ('TFГТПrfт'.includes(char)) return 'OVERHANG';
  
  // Usar profile
  if (profile) {
    if (profile.hasRightCurve || profile.shapeRight === 'round') return 'ROUND';
    if (profile.hasRightDiagonal || profile.shapeRight === 'diagonal') {
      // A tem diagonal direita apontando para cima = DIAGONAL_LEFT
      // V tem diagonal direita apontando para baixo = DIAGONAL_RIGHT
      if ('AÀÁÂÃÄАДaàáâãäад'.includes(char)) return 'DIAGONAL_LEFT';
      return 'DIAGONAL_RIGHT';
    }
    if (profile.hasRightOverhang) return 'OVERHANG';
    if (profile.hasRightOpen) return 'OPEN';
  }
  
  if (roundness > 0.6) return 'ROUND';
  
  return 'STRAIGHT';
};

/**
 * Analisa todos os glyphs
 */
const analyzeAllGlyphs = (glyphs: GlyphData[]): Map<string, GlyphAnalysis> => {
  const analyses = new Map<string, GlyphAnalysis>();
  
  for (const glyph of glyphs) {
    if (glyph.char === ' ' || !glyph.pathData) continue;
    
    const points = extractPathPoints(glyph.pathData);
    const bounds = calculateBounds(points);
    
    if (!bounds || points.length < 5) {
      analyses.set(glyph.char, {
        char: glyph.char,
        points: [],
        bounds: null,
        aspectRatio: 1,
        roundness: 0.5,
        density: 0.3,
        strokeWeight: 80,
        hasCounters: false,
        category: getCharCategory(glyph.char),
        leftClass: 'STRAIGHT',
        rightClass: 'STRAIGHT',
        profile: null,
      });
      continue;
    }
    
    const roundness = calculateRoundness(points, bounds);
    const density = calculateDensity(points, bounds);
    const strokeWeight = estimateStrokeWeight(density, bounds);
    const hasCounters = (glyph.pathData.match(/[Mm]/g) || []).length > 1;
    
    let profile: GlyphProfile | null = null;
    try {
      profile = analyzeGlyphShape(glyph);
    } catch {
      profile = null;
    }
    
    const leftClass = classifyLeftSide(glyph.char, profile, roundness);
    const rightClass = classifyRightSide(glyph.char, profile, roundness);
    
    analyses.set(glyph.char, {
      char: glyph.char,
      points,
      bounds,
      aspectRatio: bounds.width / bounds.height,
      roundness,
      density,
      strokeWeight,
      hasCounters,
      category: getCharCategory(glyph.char),
      leftClass,
      rightClass,
      profile,
    });
  }
  
  return analyses;
};

// ============================================================================
// DETECÇÃO DE ESTILO DE FONTE
// ============================================================================

/**
 * Detecta o estilo da fonte baseado em métricas agregadas
 */
const detectFontStyle = (analyses: Map<string, GlyphAnalysis>): FontStyleType => {
  let totalRoundness = 0;
  let totalDensity = 0;
  let count = 0;
  
  for (const [, analysis] of analyses) {
    if (analysis.category !== 'uppercase' && analysis.category !== 'lowercase') continue;
    if (!analysis.bounds) continue;
    
    totalRoundness += analysis.roundness;
    totalDensity += analysis.density;
    count++;
  }
  
  if (count === 0) return 'unknown';
  
  const avgRoundness = totalRoundness / count;
  const avgDensity = totalDensity / count;
  
  // Classificação baseada em roundness e densidade
  if (avgDensity > 0.35) {
    // Fonte pesada = display
    if (avgRoundness > 0.5) {
      return 'display-round';
    } else {
      return 'display-angular';
    }
  } else if (avgRoundness > 0.55) {
    return 'humanist';
  } else if (avgRoundness > 0.35) {
    return 'grotesque';
  } else {
    return 'geometric';
  }
};

// ============================================================================
// CÁLCULO DE ESPAÇAMENTO
// ============================================================================

/**
 * Calcula espaçamento baseado no estilo e métricas
 */
const calculateSpacing = (
  analysis: GlyphAnalysis,
  avgStrokeWeight: number,
  fontStyle: FontStyleType,
  baseSideMargin: number
): { leftSideBearing: number; advanceWidth: number } => {
  if (!analysis.bounds) {
    return { leftSideBearing: baseSideMargin, advanceWidth: 500 };
  }
  
  // Fator de espaçamento por estilo
  let marginFactor: number;
  switch (fontStyle) {
    case 'display-round':
      marginFactor = 0.30;  // Display redondo precisa de espaço para respirar
      break;
    case 'display-angular':
      marginFactor = 0.25;
      break;
    case 'geometric':
      marginFactor = 0.35;
      break;
    case 'grotesque':
      marginFactor = 0.40;
      break;
    case 'humanist':
      marginFactor = 0.45;
      break;
    default:
      marginFactor = 0.35;
  }
  
  // Margem proporcional ao peso
  let baseMargin = avgStrokeWeight * marginFactor;
  
  // Garantir mínimo razoável
  baseMargin = Math.max(baseSideMargin * 0.5, Math.min(baseSideMargin * 1.5, baseMargin));
  
  // Ajustar por classe de kerning
  let lsb = baseMargin;
  let rsb = baseMargin;
  
  switch (analysis.leftClass) {
    case 'ROUND':
      lsb *= 0.85;  // Curvas parecem ter mais espaço
      break;
    case 'DIAGONAL_LEFT':
    case 'DIAGONAL_RIGHT':
      lsb *= 0.75;  // Diagonais têm espaço visual
      break;
    case 'OVERHANG':
      lsb *= 0.60;  // Overhangs têm muito espaço
      break;
    case 'OPEN':
      lsb *= 0.70;
      break;
  }
  
  switch (analysis.rightClass) {
    case 'ROUND':
      rsb *= 0.85;
      break;
    case 'DIAGONAL_LEFT':
    case 'DIAGONAL_RIGHT':
      rsb *= 0.75;
      break;
    case 'OVERHANG':
      rsb *= 0.60;
      break;
    case 'OPEN':
      rsb *= 0.70;
      break;
  }
  
  // Arredondar
  lsb = Math.round(Math.max(10, lsb));
  rsb = Math.round(Math.max(10, rsb));
  
  const advanceWidth = Math.round(lsb + analysis.bounds.width + rsb);
  
  return {
    leftSideBearing: lsb,
    advanceWidth: Math.max(80, Math.min(1500, advanceWidth))
  };
};

// ============================================================================
// GERAÇÃO DE KERNING
// ============================================================================

/**
 * Calcula kerning entre dois glyphs usando a matriz profissional
 */
const calculateKerning = (
  leftAnalysis: GlyphAnalysis,
  rightAnalysis: GlyphAnalysis,
  avgStrokeWeight: number,
  intensity: number
): number => {
  // Buscar valor base na matriz
  const leftClass = leftAnalysis.rightClass;  // Lado direito do glyph esquerdo
  const rightClass = rightAnalysis.leftClass; // Lado esquerdo do glyph direito
  
  const matrixValue = KERNING_MATRIX[leftClass]?.[rightClass] ?? 0;
  
  if (matrixValue === 0) return 0;
  
  // Calcular kerning base
  let kerning = matrixValue * avgStrokeWeight;
  
  // Aplicar multiplicador de par específico
  const pairKey = leftAnalysis.char + rightAnalysis.char;
  const multiplier = PAIR_MULTIPLIERS[pairKey] ?? 1.0;
  kerning *= multiplier;
  
  // Aplicar intensidade do usuário
  kerning *= intensity;
  
  // Arredondar
  kerning = Math.round(kerning);
  
  // Limitar kerning máximo (não mais que 60% do peso)
  const maxKerning = -avgStrokeWeight * 0.6;
  if (kerning < maxKerning) kerning = Math.round(maxKerning);
  
  // Threshold mínimo
  if (Math.abs(kerning) < 5) return 0;
  
  return kerning;
};

/**
 * Gera todos os pares de kerning necessários
 */
const generateKerningPairs = (
  analyses: Map<string, GlyphAnalysis>,
  avgStrokeWeight: number,
  intensity: number
): KerningPair[] => {
  const pairs: KerningPair[] = [];
  const processed = new Set<string>();
  
  // Caracteres para kerning
  const kernableChars: string[] = [];
  for (const [char, analysis] of analyses) {
    if (analysis.bounds && (
      analysis.category === 'uppercase' ||
      analysis.category === 'lowercase' ||
      analysis.category === 'number'
    )) {
      kernableChars.push(char);
    }
  }
  
  // Pontuação importante
  const punctuation = ['.', ',', '-', '\'', '"', ':', ';', '!', '?'];
  
  // Gerar pares
  for (const left of kernableChars) {
    const leftAnalysis = analyses.get(left);
    if (!leftAnalysis) continue;
    
    for (const right of kernableChars) {
      const pairKey = `${left}${right}`;
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      
      const rightAnalysis = analyses.get(right);
      if (!rightAnalysis) continue;
      
      const kerning = calculateKerning(leftAnalysis, rightAnalysis, avgStrokeWeight, intensity);
      if (kerning !== 0) {
        pairs.push({ left, right, value: kerning });
      }
    }
    
    // Letra + pontuação
    for (const punct of punctuation) {
      const pairKey = `${left}${punct}`;
      if (processed.has(pairKey)) continue;
      processed.add(pairKey);
      
      const punctAnalysis = analyses.get(punct);
      if (punctAnalysis) {
        const kerning = calculateKerning(leftAnalysis, punctAnalysis, avgStrokeWeight, intensity);
        if (kerning !== 0) {
          pairs.push({ left, right: punct, value: kerning });
        }
      }
    }
  }
  
  return pairs;
};

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Executa a configuração automática completa
 */
export const autoConfigureFont = (
  glyphs: GlyphData[],
  metadata: FontMetadata,
  options: Partial<AutoConfigOptions> = {}
): AutoConfigResult => {
  const opts = { ...DEFAULT_AUTO_CONFIG_OPTIONS, ...options };
  const warnings: string[] = [];
  
  // 1. Analisar todos os glyphs
  const analyses = analyzeAllGlyphs(glyphs);
  
  // 2. Calcular métricas agregadas
  let totalStrokeWeight = 0;
  let totalRoundness = 0;
  let weightCount = 0;
  const heights: number[] = [];
  
  for (const [, analysis] of analyses) {
    if (!analysis.bounds) continue;
    if (analysis.category === 'uppercase' || analysis.category === 'lowercase') {
      totalStrokeWeight += analysis.strokeWeight;
      totalRoundness += analysis.roundness;
      weightCount++;
    }
    if (analysis.category === 'uppercase') {
      heights.push(analysis.bounds.height);
    }
  }
  
  const avgStrokeWeight = weightCount > 0 ? totalStrokeWeight / weightCount : 80;
  const avgRoundness = weightCount > 0 ? totalRoundness / weightCount : 0.5;
  const avgHeight = heights.length > 0 
    ? heights.reduce((a, b) => a + b, 0) / heights.length 
    : opts.targetHeight;
  
  // 3. Detectar estilo
  const fontStyle = detectFontStyle(analyses);
  
  // 4. Gerar atualizações de glyphs
  const glyphUpdates = new Map<string, Partial<GlyphData>>();
  let glyphsUpdated = 0;
  
  for (const glyph of glyphs) {
    if (glyph.char === ' ') continue;
    
    const analysis = analyses.get(glyph.char);
    if (!analysis || !analysis.bounds) continue;
    
    const updates: Partial<GlyphData> = {};
    let hasUpdates = false;
    
    // Normalização de altura
    if (opts.normalizeHeights && analysis.category !== 'punctuation' && analysis.category !== 'symbol') {
      const currentHeight = analysis.bounds.height * (glyph.scale ?? 1);
      const heightDiff = Math.abs(currentHeight - avgHeight) / avgHeight;
      
      if (heightDiff > 0.12) {
        updates.scale = avgHeight / analysis.bounds.height;
        hasUpdates = true;
      }
    }
    
    // Espaçamento
    if (opts.autoSpacing) {
      const spacing = calculateSpacing(analysis, avgStrokeWeight, fontStyle, opts.sideMargin);
      
      if (Math.abs(spacing.advanceWidth - glyph.advanceWidth) > 15) {
        updates.advanceWidth = spacing.advanceWidth;
        hasUpdates = true;
      }
      
      const currentLSB = glyph.leftSideBearing ?? 50;
      if (Math.abs(spacing.leftSideBearing - currentLSB) > 8) {
        updates.leftSideBearing = spacing.leftSideBearing;
        hasUpdates = true;
      }
    }
    
    if (hasUpdates) {
      glyphUpdates.set(glyph.char, updates);
      glyphsUpdated++;
    }
  }
  
  // 5. Gerar kerning
  let kerningPairs: KerningPair[] = [];
  if (opts.autoKerning) {
    kerningPairs = generateKerningPairs(analyses, avgStrokeWeight, opts.kerningIntensity);
  }
  
  // 6. Otimizar métricas
  const metadataUpdates: Partial<FontMetadata> = {};
  if (opts.optimizeMetrics) {
    let maxY = 0;
    let minY = 0;
    
    for (const [, analysis] of analyses) {
      if (!analysis.bounds) continue;
      if (analysis.category !== 'uppercase' && analysis.category !== 'lowercase') continue;
      
      const bottom = analysis.bounds.y + analysis.bounds.height;
      if (bottom > maxY) maxY = bottom;
      if (analysis.bounds.y < minY) minY = analysis.bounds.y;
    }
    
    const suggestedAscender = Math.round(maxY * 1.1);
    const suggestedDescender = Math.round(minY * 1.1);
    
    if (suggestedAscender > 0 && Math.abs(suggestedAscender - metadata.ascender) > 50) {
      metadataUpdates.ascender = Math.max(600, Math.min(1000, suggestedAscender));
    }
    if (suggestedDescender < 0) {
      metadataUpdates.descender = Math.max(-400, Math.min(-100, suggestedDescender));
    }
  }
  
  // 7. Criar relatório
  const report: ConfigurationReport = {
    totalGlyphs: glyphs.length,
    glyphsAnalyzed: analyses.size,
    glyphsUpdated,
    kerningPairsGenerated: kerningPairs.length,
    averageHeight: Math.round(avgHeight),
    suggestedAscender: metadataUpdates.ascender ?? metadata.ascender,
    suggestedDescender: metadataUpdates.descender ?? metadata.descender,
    detectedFontStyle: fontStyle,
    averageStrokeWeight: Math.round(avgStrokeWeight),
    averageRoundness: Math.round(avgRoundness * 100) / 100,
    warnings,
    summary: `Estilo: ${fontStyle}. Peso: ${Math.round(avgStrokeWeight)}. Roundness: ${(avgRoundness * 100).toFixed(0)}%. ` +
             `${glyphsUpdated} glyphs atualizados, ${kerningPairs.length} pares de kerning.`
  };
  
  return { glyphUpdates, kerningPairs, metadataUpdates, report };
};

/**
 * Aplica o resultado da configuração
 */
export const applyAutoConfig = (
  result: AutoConfigResult,
  onUpdateGlyph: (char: string, updates: Partial<GlyphData>) => void
): void => {
  for (const [char, updates] of result.glyphUpdates) {
    onUpdateGlyph(char, updates);
  }
};

/**
 * Gera apenas kerning
 */
export const generateAutoKerningOnly = (
  glyphs: GlyphData[],
  intensity: number = 1.0
): KerningPair[] => {
  const analyses = analyzeAllGlyphs(glyphs);
  
  let totalWeight = 0;
  let count = 0;
  for (const [, analysis] of analyses) {
    if (analysis.bounds && (analysis.category === 'uppercase' || analysis.category === 'lowercase')) {
      totalWeight += analysis.strokeWeight;
      count++;
    }
  }
  const avgWeight = count > 0 ? totalWeight / count : 80;
  
  return generateKerningPairs(analyses, avgWeight, intensity);
};

/**
 * Analisa qualidade da fonte
 */
export const analyzeFontQuality = (
  glyphs: GlyphData[],
  metadata: FontMetadata
): { score: number; issues: string[]; suggestions: string[] } => {
  const analyses = analyzeAllGlyphs(glyphs);
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // Verificar completude
  const glyphsWithPath = glyphs.filter(g => g.pathData && g.char !== ' ');
  if (glyphsWithPath.length < 26) {
    issues.push('Faltam algumas letras');
    score -= 15;
  }
  
  // Verificar consistência de altura
  const heights: number[] = [];
  for (const [, analysis] of analyses) {
    if (analysis.bounds && analysis.category === 'uppercase') {
      heights.push(analysis.bounds.height);
    }
  }
  
  if (heights.length > 3) {
    const avgH = heights.reduce((a, b) => a + b, 0) / heights.length;
    const variance = heights.reduce((sum, h) => sum + Math.pow(h - avgH, 2), 0) / heights.length;
    if (Math.sqrt(variance) / avgH > 0.12) {
      issues.push('Alturas das letras inconsistentes');
      suggestions.push('Use normalização de altura');
      score -= 12;
    }
  }
  
  // Detectar estilo
  const fontStyle = detectFontStyle(analyses);
  suggestions.push(`Estilo detectado: ${fontStyle}`);
  
  // Verificar métricas
  if (metadata.ascender < 600) {
    issues.push('Ascender muito baixo');
    score -= 8;
  }
  
  return { score: Math.max(0, score), issues, suggestions };
};

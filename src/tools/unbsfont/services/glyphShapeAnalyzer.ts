/**
 * Glyph Shape Analyzer
 * Analisa a geometria real do path SVG para determinar características de kerning.
 * 
 * Em vez de usar categorias estáticas baseadas em letras padrão,
 * este módulo analisa o formato real de cada glyph para gerar kerning preciso.
 */

import { GlyphData, ShapeCategory } from '../types';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface GlyphProfile {
  // Bounding box normalizado (0-1)
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
  
  // Perfil de densidade por coluna (10 colunas, valores 0-1)
  leftEdgeProfile: number[];   // Perfil da borda esquerda
  rightEdgeProfile: number[];  // Perfil da borda direita
  
  // Características geométricas
  hasLeftDiagonal: boolean;    // Diagonal na esquerda (A, V, W)
  hasRightDiagonal: boolean;   // Diagonal na direita (A, V, W)
  hasLeftOverhang: boolean;    // Projeção superior esquerda (T, F, r)
  hasRightOverhang: boolean;   // Projeção superior direita (L, T)
  hasLeftCurve: boolean;       // Curva na esquerda (O, C, G)
  hasRightCurve: boolean;      // Curva na direita (O, D, P)
  hasLeftOpen: boolean;        // Abertura/buraco esquerdo (C)
  hasRightOpen: boolean;       // Abertura/buraco direito (quase nunca)
  
  // Metrics de espaço negativo
  leftNegativeSpace: number;   // Espaço vazio à esquerda (0-1)
  rightNegativeSpace: number;  // Espaço vazio à direita (0-1)
  
  // Centro de massa
  centerOfMass: { x: number; y: number };
  
  // Formato inferido
  shapeLeft: ShapeCategory;
  shapeRight: ShapeCategory;
}

export interface KerningRecommendation {
  pair: string;
  value: number;
  confidence: number;  // 0-1
  reason: string;
}

// ============================================================================
// PARSING DO PATH SVG
// ============================================================================

interface Point {
  x: number;
  y: number;
}

/**
 * Extrai pontos de um path SVG para análise
 */
const extractPathPoints = (d: string, numSamples: number = 100): Point[] => {
  if (!d || !d.trim()) return [];
  
  const points: Point[] = [];
  const tokens = d.match(/([MmLlHhVvCcSsQqTtAaZz])|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  let i = 0;
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  let lastCmd = '';

  const readNum = () => {
    if (i >= tokens.length) return 0;
    const val = parseFloat(tokens[i]);
    if (!isNaN(val)) i++;
    return isNaN(val) ? 0 : val;
  };

  const isCmd = (t: string) => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(t);

  const addPoint = (px: number, py: number) => {
    points.push({ x: px, y: py });
  };

  // Interpola pontos em uma curva Bézier cúbica
  const sampleCubic = (
    p0x: number, p0y: number,
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number,
    samples: number = 10
  ) => {
    for (let j = 0; j <= samples; j++) {
      const t = j / samples;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      addPoint(
        mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x,
        mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y
      );
    }
  };

  // Interpola pontos em uma curva Bézier quadrática
  const sampleQuadratic = (
    p0x: number, p0y: number,
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    samples: number = 10
  ) => {
    for (let j = 0; j <= samples; j++) {
      const t = j / samples;
      const mt = 1 - t;
      addPoint(
        mt * mt * p0x + 2 * mt * t * p1x + t * t * p2x,
        mt * mt * p0y + 2 * mt * t * p1y + t * t * p2y
      );
    }
  };

  let lastCX = 0, lastCY = 0;

  while (i < tokens.length) {
    let cmd = tokens[i];

    if (isCmd(cmd)) {
      i++;
    } else {
      if (lastCmd === 'M') cmd = 'L';
      else if (lastCmd === 'm') cmd = 'l';
      else cmd = lastCmd;
    }

    const isRel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();

    switch (type) {
      case 'M': {
        const mx = readNum();
        const my = readNum();
        x = isRel ? x + mx : mx;
        y = isRel ? y + my : my;
        startX = x;
        startY = y;
        addPoint(x, y);
        break;
      }
      case 'L': {
        const lx = readNum();
        const ly = readNum();
        const newX = isRel ? x + lx : lx;
        const newY = isRel ? y + ly : ly;
        // Sample line
        for (let j = 1; j <= 5; j++) {
          const t = j / 5;
          addPoint(x + t * (newX - x), y + t * (newY - y));
        }
        x = newX;
        y = newY;
        break;
      }
      case 'H': {
        const hx = readNum();
        const newX = isRel ? x + hx : hx;
        for (let j = 1; j <= 5; j++) {
          const t = j / 5;
          addPoint(x + t * (newX - x), y);
        }
        x = newX;
        break;
      }
      case 'V': {
        const vy = readNum();
        const newY = isRel ? y + vy : vy;
        for (let j = 1; j <= 5; j++) {
          const t = j / 5;
          addPoint(x, y + t * (newY - y));
        }
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
        lastCX = x2;
        lastCY = y2;
        x = ex;
        y = ey;
        break;
      }
      case 'S': {
        const refX = lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's'
          ? 2 * x - lastCX : x;
        const refY = lastCmd === 'C' || lastCmd === 'c' || lastCmd === 'S' || lastCmd === 's'
          ? 2 * y - lastCY : y;
        const x2 = isRel ? x + readNum() : readNum();
        const y2 = isRel ? y + readNum() : readNum();
        const ex = isRel ? x + readNum() : readNum();
        const ey = isRel ? y + readNum() : readNum();
        sampleCubic(x, y, refX, refY, x2, y2, ex, ey);
        lastCX = x2;
        lastCY = y2;
        x = ex;
        y = ey;
        break;
      }
      case 'Q': {
        const qx = isRel ? x + readNum() : readNum();
        const qy = isRel ? y + readNum() : readNum();
        const ex = isRel ? x + readNum() : readNum();
        const ey = isRel ? y + readNum() : readNum();
        sampleQuadratic(x, y, qx, qy, ex, ey);
        lastCX = qx;
        lastCY = qy;
        x = ex;
        y = ey;
        break;
      }
      case 'T': {
        const refX = lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't'
          ? 2 * x - lastCX : x;
        const refY = lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't'
          ? 2 * y - lastCY : y;
        const ex = isRel ? x + readNum() : readNum();
        const ey = isRel ? y + readNum() : readNum();
        sampleQuadratic(x, y, refX, refY, ex, ey);
        lastCX = refX;
        lastCY = refY;
        x = ex;
        y = ey;
        break;
      }
      case 'A': {
        // Simplified: just add endpoints
        readNum(); readNum(); readNum(); readNum(); readNum();
        const ex = isRel ? x + readNum() : readNum();
        const ey = isRel ? y + readNum() : readNum();
        addPoint(ex, ey);
        x = ex;
        y = ey;
        break;
      }
      case 'Z': {
        x = startX;
        y = startY;
        break;
      }
    }
    lastCmd = cmd;
  }

  return points;
};

// ============================================================================
// ANÁLISE DE PERFIL
// ============================================================================

/**
 * Calcula o perfil de borda (onde a forma começa/termina em cada linha horizontal)
 */
const calculateEdgeProfile = (
  points: Point[],
  bbox: { xMin: number; yMin: number; xMax: number; yMax: number },
  numRows: number = 20
): { leftEdge: number[]; rightEdge: number[] } => {
  const width = bbox.xMax - bbox.xMin || 1;
  const height = bbox.yMax - bbox.yMin || 1;
  
  const leftEdge: number[] = new Array(numRows).fill(1);  // Default: borda bem à direita
  const rightEdge: number[] = new Array(numRows).fill(0); // Default: borda bem à esquerda
  
  for (const p of points) {
    const normalizedY = (p.y - bbox.yMin) / height;
    const normalizedX = (p.x - bbox.xMin) / width;
    
    const row = Math.min(numRows - 1, Math.max(0, Math.floor(normalizedY * numRows)));
    
    if (normalizedX < leftEdge[row]) {
      leftEdge[row] = normalizedX;
    }
    if (normalizedX > rightEdge[row]) {
      rightEdge[row] = normalizedX;
    }
  }
  
  return { leftEdge, rightEdge };
};

/**
 * Detecta se há diagonal no perfil
 */
const detectDiagonal = (profile: number[], isLeft: boolean): boolean => {
  if (profile.length < 5) return false;
  
  // Pega a parte superior (topo do glifo)
  const topHalf = profile.slice(0, Math.floor(profile.length / 2));
  const bottomHalf = profile.slice(Math.floor(profile.length / 2));
  
  const topAvg = topHalf.reduce((a, b) => a + b, 0) / topHalf.length;
  const bottomAvg = bottomHalf.reduce((a, b) => a + b, 0) / bottomHalf.length;
  
  // Para borda esquerda: diagonal se topo > bottom (V, A forma)
  // Para borda direita: diagonal se topo < bottom (V, A forma)
  const diff = Math.abs(topAvg - bottomAvg);
  
  if (isLeft) {
    return diff > 0.15 && topAvg > bottomAvg;
  } else {
    return diff > 0.15 && topAvg < bottomAvg;
  }
};

/**
 * Detecta overhang (projeção horizontal no topo, como T, F, L)
 */
const detectOverhang = (profile: number[], isLeft: boolean): boolean => {
  if (profile.length < 5) return false;
  
  // Olha os primeiros 25% (topo)
  const topQuarter = profile.slice(0, Math.floor(profile.length / 4));
  const restOfProfile = profile.slice(Math.floor(profile.length / 4));
  
  const topAvg = topQuarter.reduce((a, b) => a + b, 0) / topQuarter.length;
  const restAvg = restOfProfile.reduce((a, b) => a + b, 0) / restOfProfile.length;
  
  const diff = Math.abs(topAvg - restAvg);
  
  // Overhang: topo se estende mais que o resto
  if (isLeft) {
    return diff > 0.2 && topAvg < restAvg; // Topo mais à esquerda
  } else {
    return diff > 0.2 && topAvg > restAvg; // Topo mais à direita
  }
};

/**
 * Detecta curva suave (O, C, D)
 */
const detectCurve = (profile: number[]): boolean => {
  if (profile.length < 5) return false;
  
  // Calcula variância - curvas têm transições suaves
  let changes = 0;
  for (let i = 1; i < profile.length; i++) {
    changes += Math.abs(profile[i] - profile[i - 1]);
  }
  const avgChange = changes / (profile.length - 1);
  
  // Perfil curvo tem mudanças graduais e consistentes
  // Verifica se forma um arco (meio diferente das pontas)
  const third = Math.floor(profile.length / 3);
  const start = profile.slice(0, third).reduce((a, b) => a + b, 0) / third;
  const middle = profile.slice(third, 2 * third).reduce((a, b) => a + b, 0) / third;
  const end = profile.slice(2 * third).reduce((a, b) => a + b, 0) / third;
  
  // Curva se o meio é diferente das pontas de forma consistente
  return Math.abs(middle - start) > 0.1 && Math.abs(middle - end) > 0.1 && avgChange < 0.15;
};

/**
 * Calcula espaço negativo
 */
const calculateNegativeSpace = (profile: number[], isLeft: boolean): number => {
  if (profile.length === 0) return 0;
  
  // Soma a distância da borda para o limite
  const sum = profile.reduce((acc, val) => {
    return acc + (isLeft ? val : (1 - val));
  }, 0);
  
  return sum / profile.length;
};

// ============================================================================
// ANÁLISE PRINCIPAL
// ============================================================================

/**
 * Analisa um glyph e retorna seu perfil geométrico
 */
export const analyzeGlyphShape = (glyph: GlyphData): GlyphProfile | null => {
  const pathData = glyph.pathData || '';
  if (!pathData || !pathData.trim()) return null;
  
  const points = extractPathPoints(pathData);
  if (points.length < 10) return null;
  
  // Calcular bounding box
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p.x < xMin) xMin = p.x;
    if (p.y < yMin) yMin = p.y;
    if (p.x > xMax) xMax = p.x;
    if (p.y > yMax) yMax = p.y;
  }
  
  const bbox = { xMin, yMin, xMax, yMax };
  const { leftEdge, rightEdge } = calculateEdgeProfile(points, bbox);
  
  // Calcular centro de massa
  const centerX = points.reduce((a, p) => a + p.x, 0) / points.length;
  const centerY = points.reduce((a, p) => a + p.y, 0) / points.length;
  const normalizedCenter = {
    x: (centerX - xMin) / (xMax - xMin || 1),
    y: (centerY - yMin) / (yMax - yMin || 1)
  };
  
  // Detectar características
  const hasLeftDiagonal = detectDiagonal(leftEdge, true);
  const hasRightDiagonal = detectDiagonal(rightEdge, false);
  const hasLeftOverhang = detectOverhang(leftEdge, true);
  const hasRightOverhang = detectOverhang(rightEdge, false);
  const hasLeftCurve = detectCurve(leftEdge);
  const hasRightCurve = detectCurve(rightEdge);
  
  // Detectar abertura (C shape) - borda direita não atinge o máximo no meio
  const midSection = rightEdge.slice(
    Math.floor(rightEdge.length * 0.3),
    Math.floor(rightEdge.length * 0.7)
  );
  const hasRightOpen = midSection.length > 0 && 
    midSection.every(v => v < 0.7) && 
    rightEdge[0] > 0.8 && 
    rightEdge[rightEdge.length - 1] > 0.8;
  
  const leftMidSection = leftEdge.slice(
    Math.floor(leftEdge.length * 0.3),
    Math.floor(leftEdge.length * 0.7)
  );
  const hasLeftOpen = leftMidSection.length > 0 && 
    leftMidSection.every(v => v > 0.3) && 
    leftEdge[0] < 0.2 && 
    leftEdge[leftEdge.length - 1] < 0.2;
  
  // Calcular espaço negativo
  const leftNegativeSpace = calculateNegativeSpace(leftEdge, true);
  const rightNegativeSpace = calculateNegativeSpace(rightEdge, false);
  
  // Inferir categoria de forma
  let shapeLeft: ShapeCategory = 'straight';
  let shapeRight: ShapeCategory = 'straight';
  
  if (hasLeftDiagonal) shapeLeft = 'diagonal';
  else if (hasLeftCurve) shapeLeft = 'round';
  else if (hasLeftOverhang) shapeLeft = 'overhang';
  else if (hasLeftOpen) shapeLeft = 'round';
  
  if (hasRightDiagonal) shapeRight = 'diagonal';
  else if (hasRightCurve) shapeRight = 'round';
  else if (hasRightOverhang) shapeRight = 'overhang';
  else if (hasRightOpen) shapeRight = 'round';
  
  return {
    bbox: {
      xMin: 0,
      yMin: 0,
      xMax: 1,
      yMax: 1
    },
    leftEdgeProfile: leftEdge,
    rightEdgeProfile: rightEdge,
    hasLeftDiagonal,
    hasRightDiagonal,
    hasLeftOverhang,
    hasRightOverhang,
    hasLeftCurve,
    hasRightCurve,
    hasLeftOpen,
    hasRightOpen,
    leftNegativeSpace,
    rightNegativeSpace,
    centerOfMass: normalizedCenter,
    shapeLeft,
    shapeRight
  };
};

// ============================================================================
// CÁLCULO DE KERNING BASEADO EM GEOMETRIA
// ============================================================================

/**
 * Calcula o valor de kerning ideal entre dois glyphs baseado em suas geometrias reais
 * 
 * IMPORTANTE: O kerning deve ser CONSERVADOR. A maioria dos pairs não precisa de kerning.
 * Apenas pairs problemáticos (diagonal+round, overhang+small, etc.) precisam de ajustes.
 */
export const calculateOptimalKerning = (
  leftProfile: GlyphProfile,
  rightProfile: GlyphProfile,
  targetDensity: number = 0.15 // Densidade alvo de espaço entre glyphs (0-1)
): number => {
  // === CÁLCULO BASEADO EM PERFIS DE BORDA ===
  // Usa os edge profiles para calcular o gap real entre os dois glyphs
  
  const leftEdge = leftProfile.rightEdgeProfile;
  const rightEdge = rightProfile.leftEdgeProfile;
  
  if (leftEdge.length > 0 && rightEdge.length > 0) {
    const numRows = Math.min(leftEdge.length, rightEdge.length);
    let totalGap = 0;
    let validRows = 0;
    
    for (let i = 0; i < numRows; i++) {
      // Gap = espaço vazio à direita do left glyph + espaço vazio à esquerda do right glyph
      const gap = (1 - leftEdge[i]) + rightEdge[i];
      if (Number.isFinite(gap)) {
        totalGap += gap;
        validRows++;
      }
    }
    
    if (validRows > 0) {
      const avgGap = totalGap / validRows;
      
      // Se o gap médio é maior que a densidade alvo, precisa de kerning negativo
      if (avgGap > targetDensity) {
        let kerningValue = Math.round(-(avgGap - targetDensity) * 100);
        
        // Limitar a valores razoáveis
        kerningValue = Math.max(-120, Math.min(kerningValue, 0));
        
        // Ignorar valores muito pequenos
        if (Math.abs(kerningValue) < 5) {
          return 0;
        }
        
        return kerningValue;
      }
    }
  }
  
  // === FALLBACK: REGRAS BASEADAS EM CARACTERÍSTICAS GEOMÉTRICAS ===
  let kerningValue = 0;
  
  const leftSpace = leftProfile.rightNegativeSpace;
  const rightSpace = rightProfile.leftNegativeSpace;
  
  // Se ambos os lados têm pouco espaço negativo, não precisa de kerning
  if (leftSpace < 0.1 && rightSpace < 0.1) {
    return 0;
  }
  
  // 1. Overhang à direita (T, F, L, r) + qualquer coisa que cabe embaixo
  if (leftProfile.hasRightOverhang) {
    if (rightProfile.hasLeftDiagonal) kerningValue = -70;
    else if (rightProfile.hasLeftCurve) kerningValue = -50;
    else if (rightSpace > 0.15) kerningValue = -35;
  }
  // 2. Diagonal à direita (V, W, Y, A) + algo que encaixa
  else if (leftProfile.hasRightDiagonal) {
    if (rightProfile.hasLeftDiagonal) kerningValue = -60;
    else if (rightProfile.hasLeftCurve) kerningValue = -45;
    else if (rightProfile.hasLeftOverhang) kerningValue = -40;
  }
  // 3. Curva à direita (O, D, P, b) + diagonal
  else if (leftProfile.hasRightCurve) {
    if (rightProfile.hasLeftDiagonal) kerningValue = -30;
    else if (rightProfile.hasLeftOverhang) kerningValue = -25;
  }
  // 4. Abertura à direita (C) precisa de menos kerning
  else if (leftProfile.hasRightOpen) {
    kerningValue = Math.min(kerningValue + 10, 0);
  }
  // 5. Se nenhuma característica especial, usa espaço negativo
  else if (leftSpace > 0.2 && rightSpace > 0.2) {
    kerningValue = -20;
  }
  
  // Limitar e filtrar
  kerningValue = Math.max(-120, Math.min(kerningValue, 0));
  
  if (Math.abs(kerningValue) < 5) {
    return 0;
  }
  
  return kerningValue;
};

/**
 * Analisa todos os glyphs e atualiza seus shapes baseado na geometria real
 */
export const analyzeAllGlyphShapes = (glyphs: GlyphData[]): Map<string, GlyphProfile> => {
  const profiles = new Map<string, GlyphProfile>();
  
  for (const glyph of glyphs) {
    const profile = analyzeGlyphShape(glyph);
    if (profile) {
      profiles.set(glyph.char, profile);
    }
  }
  
  return profiles;
};

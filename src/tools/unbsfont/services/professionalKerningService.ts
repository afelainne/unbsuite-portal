/**
 * Professional Kerning Service
 * 
 * Sistema de kerning profissional baseado em estudos tipográficos e práticas
 * de type design usadas em foundries como Adobe, Monotype, e Google Fonts.
 * 
 * REFERÊNCIAS TIPOGRÁFICAS:
 * - "Designing Type" por Karen Cheng
 * - "The Elements of Typographic Style" por Robert Bringhurst
 * - OpenType spec: https://docs.microsoft.com/en-us/typography/opentype/spec/kern
 * - Adobe Font Development Kit: https://adobe-type-tools.github.io/afdko/
 * 
 * CONCEITOS FUNDAMENTAIS:
 * 
 * 1. ESPAÇO ÓPTICO vs MÉTRICO
 *    O olho humano percebe espaço de forma não-linear. Duas letras retas
 *    lado a lado (como HH) parecem mais próximas que duas redondas (OO)
 *    mesmo com o mesmo espaço métrico. O kerning compensa isso.
 * 
 * 2. CATEGORIAS MORFOLÓGICAS
 *    Letras são agrupadas por forma, não por nome:
 *    - RETAS: H, I, M, N, l, i
 *    - DIAGONAIS: A, V, W, X, Y, v, w, y
 *    - REDONDAS: O, C, G, Q, o, c, e
 *    - ABERTAS: C, L, T, F, r, f (têm espaço vazio em um lado)
 * 
 * 3. SIDEBEARINGS
 *    O espaço à esquerda (LSB) e à direita (RSB) de cada glifo.
 *    Um bom spacing reduz a necessidade de kerning.
 * 
 * 4. KERNING CLASSES
 *    Em vez de definir kerning para cada par (n²), agrupa-se letras
 *    com comportamento similar e define kerning entre classes.
 */

import { GlyphData, ShapeCategory } from '../types';
import { analyzeGlyphShape, GlyphProfile } from './glyphShapeAnalyzer';

// ============================================================================
// CONHECIMENTO TIPOGRÁFICO - DADOS DE ESTUDO
// ============================================================================

/**
 * Valores de kerning típicos usados em fontes profissionais
 * Baseado em análise de Helvetica, Futura, Garamond, Times, etc.
 * Valores em unidades de design (assumindo UPM 1000)
 */
export const PROFESSIONAL_KERNING_VALUES = {
  // Pares mais críticos (requerem kerning forte: -60 a -120)
  critical: {
    'AV': -80, 'AW': -60, 'AY': -80, 'AT': -80,
    'Av': -60, 'Aw': -40, 'Ay': -60,
    'FA': -40, 'Fe': -30, 'Fi': -20, 'Fo': -30, 'Fr': -20,
    'LT': -80, 'LV': -80, 'LW': -60, 'LY': -80, "L'": -100, 'L"': -100,
    'PA': -30, 'Pe': -20, 'P.': -100, 'P,': -100,
    'TA': -80, 'Te': -40, 'Ti': -20, 'To': -50, 'Tr': -20, 'Tu': -20, 'Ty': -60,
    'VA': -80, 'Ve': -40, 'Vi': -20, 'Vo': -50, 'Vu': -20, 'Vy': -40,
    'WA': -60, 'We': -30, 'Wi': -10, 'Wo': -30, 'Wu': -10, 'Wy': -20,
    'YA': -80, 'Ya': -60, 'Ye': -40, 'Yi': -20, 'Yo': -50, 'Yu': -30, 'Yp': -40,
    'Y.': -100, 'Y,': -100,
    'T.': -80, 'T,': -80,
    'V.': -100, 'V,': -100,
    'W.': -80, 'W,': -80,
  },
  
  // Pares importantes (kerning médio: -30 a -60)
  important: {
    'AC': -20, 'AG': -20, 'AO': -20, 'AQ': -20, 'AU': -20,
    'Ca': -10, 'Ce': -10, 'Co': -10,
    'Da': -10, 'De': -10, 'Do': -10,
    'Fa': -20, 'Fy': -30,
    'Ga': -10, 'Ge': -10, 'Go': -10,
    'Ja': -15, 'Jo': -15,
    'Ka': -20, 'Ke': -20, 'Ko': -20, 'Ky': -30,
    'Oa': -10, 'Oe': -10,
    'Qa': -10, 'Qe': -10,
    'Ra': -15, 'Re': -15, 'Ro': -15, 'Ry': -20,
    'Sa': -10, 'Se': -10, 'So': -10,
    'Ua': -10, 'Ue': -10, 'Uo': -10,
    'XO': -20, 'Xo': -20,
  },
  
  // Pares de minúsculas (kerning leve: -10 a -40)
  lowercase: {
    'av': -20, 'aw': -15, 'ay': -20,
    'ev': -15, 'ew': -10, 'ey': -15,
    'fa': -20, 'fe': -15, 'fi': -10, 'fo': -15, 'fy': -20,
    'gy': -10,
    'ke': -15, 'ko': -15, 'ky': -20,
    'ly': -15,
    'ov': -15, 'ow': -10, 'oy': -15,
    'ra': -10, 're': -10, 'ro': -10, 'ry': -15, 'r.': -40, 'r,': -40,
    'va': -15, 've': -10, 'vo': -10, 'vy': -10, 'v.': -60, 'v,': -60,
    'wa': -10, 'we': -5, 'wo': -5, 'wy': -5, 'w.': -40, 'w,': -40,
    'ya': -15, 'ye': -10, 'yo': -10, 'y.': -60, 'y,': -60,
  },
  
  // Pontuação e símbolos
  punctuation: {
    '"A': -60, '"O': -40, '"T': -20, '"V': -20, '"W': -20,
    "'A": -60, "'O": -40, "'T": -20, "'V": -20, "'W": -20,
    'A"': -40, 'A\'': -40,
    'O"': -20, 'O\'': -20,
    '".': -80, '",': -80, "'.": -80, "',": -80,
    '("': -40, '["': -40,
    '")': -40, '\')': -40, '"]': -40,
  },
  
  // Números (geralmente tabulares, mas alguns pares)
  numbers: {
    '1.': -40, '1,': -40,
    '7.': -40, '7,': -40,
    '10': -15, '11': -30, '17': -30,
    '70': -20, '71': -20, '74': -20,
  },
};

/**
 * Classes de kerning baseadas em forma
 * Letras na mesma classe recebem kerning similar
 */
export const KERNING_CLASSES = {
  // Lado direito reto
  rightStraight: ['B', 'D', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'R', 'b', 'd', 'h', 'i', 'k', 'l', 'm', 'n', 'p', 'r'],
  
  // Lado direito diagonal
  rightDiagonal: ['A', 'X', 'Z', 'z'],
  
  // Lado direito redondo
  rightRound: ['C', 'G', 'O', 'Q', 'c', 'e', 'o', 'q'],
  
  // Lado direito com overhang (projeção para direita no topo)
  rightOverhang: ['T', 'V', 'W', 'Y', 'f', 'v', 'w', 'y', 't'],
  
  // Lado esquerdo reto
  leftStraight: ['B', 'D', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'R', 'h', 'i', 'k', 'l', 'm', 'n', 'u'],
  
  // Lado esquerdo diagonal
  leftDiagonal: ['V', 'W', 'X', 'Y', 'v', 'w', 'x', 'y'],
  
  // Lado esquerdo redondo
  leftRound: ['C', 'G', 'O', 'Q', 'c', 'e', 'o', 'q', 'd'],
  
  // Lado esquerdo com abertura (espaço vazio)
  leftOpen: ['A', 'a'],
};

/**
 * Matriz de kerning por categoria morfológica
 * Valores baseados em médias de fontes profissionais
 */
export const CATEGORY_MATRIX: Record<string, Record<string, number>> = {
  rightStraight: {
    leftStraight: 0,
    leftDiagonal: -15,
    leftRound: -10,
    leftOpen: -5,
  },
  rightDiagonal: {
    leftStraight: -30,
    leftDiagonal: -50,
    leftRound: -35,
    leftOpen: -60,
  },
  rightRound: {
    leftStraight: -10,
    leftDiagonal: -25,
    leftRound: -5,
    leftOpen: -20,
  },
  rightOverhang: {
    leftStraight: -25,
    leftDiagonal: -70,
    leftRound: -45,
    leftOpen: -80,
  },
};

// ============================================================================
// ESTILOS DE FONTE E SEUS KERNING CARACTERÍSTICOS
// ============================================================================

export type FontStyle = 'geometric-sans' | 'humanist-sans' | 'neo-grotesque' | 'serif-oldstyle' | 'serif-modern' | 'slab' | 'display' | 'script';

export const FONT_STYLE_PROFILES: Record<FontStyle, {
  name: string;
  description: string;
  examples: string[];
  kerningMultiplier: number;
  tightPairs: string[];
  loosePairs: string[];
  notes: string;
}> = {
  'geometric-sans': {
    name: 'Geometric Sans',
    description: 'Fontes baseadas em formas geométricas puras (círculos, quadrados)',
    examples: ['Futura', 'Avant Garde', 'Century Gothic', 'Gotham'],
    kerningMultiplier: 1.1,
    tightPairs: ['AV', 'AT', 'LT', 'TA', 'VA', 'WA', 'YA'],
    loosePairs: ['OO', 'CO', 'OC'],
    notes: 'Círculos perfeitos criam mais espaço óptico - precisa de kerning mais forte',
  },
  
  'humanist-sans': {
    name: 'Humanist Sans',
    description: 'Sans-serif com proporções humanistas e variação de traço',
    examples: ['Gill Sans', 'Frutiger', 'Myriad', 'Calibri', 'Lucida Grande'],
    kerningMultiplier: 0.95,
    tightPairs: ['gy', 'ry', 'va', 'wa', 'ya'],
    loosePairs: [],
    notes: 'Formas mais orgânicas - kerning moderado funciona bem',
  },
  
  'neo-grotesque': {
    name: 'Neo-Grotesque',
    description: 'Sans-serif com formas neutras e uniformes',
    examples: ['Helvetica', 'Arial', 'Univers', 'SF Pro', 'Roboto'],
    kerningMultiplier: 1.0,
    tightPairs: ['AV', 'AT', 'Ty', 'Ya'],
    loosePairs: [],
    notes: 'Kerning padrão - muito equilibrado',
  },
  
  'serif-oldstyle': {
    name: 'Oldstyle Serif',
    description: 'Serifas clássicas com eixo inclinado e baixo contraste',
    examples: ['Garamond', 'Palatino', 'Caslon', 'Bembo', 'Minion'],
    kerningMultiplier: 1.05,
    tightPairs: ['ff', 'fi', 'fl', 'AV', 'To'],
    loosePairs: [],
    notes: 'Serifas ajudam no ritmo - kerning ligeiramente mais forte',
  },
  
  'serif-modern': {
    name: 'Modern Serif',
    description: 'Serifas com alto contraste e eixo vertical',
    examples: ['Bodoni', 'Didot', 'Times New Roman', 'Georgia'],
    kerningMultiplier: 1.15,
    tightPairs: ['AV', 'AT', 'LT', 'VA', 'WA', 'YA'],
    loosePairs: ['gy'],
    notes: 'Alto contraste cria ilusões ópticas - precisa kerning mais forte',
  },
  
  'slab': {
    name: 'Slab Serif',
    description: 'Serifas retangulares/quadradas',
    examples: ['Rockwell', 'Clarendon', 'Courier', 'Roboto Slab'],
    kerningMultiplier: 0.9,
    tightPairs: [],
    loosePairs: ['To', 'Ta'],
    notes: 'Serifas pesadas - kerning mais leve para não colidir',
  },
  
  'display': {
    name: 'Display',
    description: 'Fontes decorativas para títulos grandes',
    examples: ['Cooper Black', 'Impact', 'Playfair Display'],
    kerningMultiplier: 1.25,
    tightPairs: ['AV', 'AT', 'VA', 'WA', 'YA', 'Ty', 'To'],
    loosePairs: [],
    notes: 'Tamanhos grandes expõem problemas - kerning agressivo',
  },
  
  'script': {
    name: 'Script',
    description: 'Fontes cursivas que simulam escrita à mão',
    examples: ['Brush Script', 'Zapfino', 'Pacifico'],
    kerningMultiplier: 0.7,
    tightPairs: [],
    loosePairs: [],
    notes: 'Letras conectam - menos kerning necessário',
  },
};

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface KerningPair {
  left: string;
  right: string;
  value: number;
}

export interface ProfessionalKerningOptions {
  style?: FontStyle;
  intensity?: number;           // 0.5 a 2.0 (1.0 = normal)
  useClasses?: boolean;         // Usar kerning por classes
  includeNumbers?: boolean;
  includePunctuation?: boolean;
  onlyProblemPairs?: boolean;   // Só pares com problemas detectados
  minValue?: number;            // Ignorar valores menores que isso
  targetOpticalBalance?: number; // 0.0 a 1.0 (quão "equilibrado" deve parecer)
}

const DEFAULT_OPTIONS: ProfessionalKerningOptions = {
  style: 'neo-grotesque',
  intensity: 1.0,
  useClasses: true,
  includeNumbers: true,
  includePunctuation: true,
  onlyProblemPairs: false,
  minValue: 10,
  targetOpticalBalance: 0.5,
};

// ============================================================================
// ANÁLISE DE MÉTRICAS
// ============================================================================

/**
 * Calcula o bounding box de um path SVG
 */
function getPathBounds(pathData: string): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } | null {
  if (!pathData?.trim()) return null;
  
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);
    
    const bbox = path.getBBox();
    document.body.removeChild(svg);
    
    return {
      minX: bbox.x,
      maxX: bbox.x + bbox.width,
      minY: bbox.y,
      maxY: bbox.y + bbox.height,
      width: bbox.width,
      height: bbox.height,
    };
  } catch {
    return null;
  }
}

/**
 * Centraliza um glifo baseado no centro real do vetor (path SVG)
 * Calcula o centro geométrico do path e posiciona-o no centro do advance width
 * 
 * @param glyph - O glifo a ser centralizado
 * @param targetMargin - Margem lateral desejada (espaço em cada lado)
 * @returns Novos valores de leftSideBearing e advanceWidth
 */
export function centerGlyphInBox(
  glyph: GlyphData,
  targetMargin: number = 50
): { leftSideBearing: number; advanceWidth: number } {
  const pathData = glyph.pathData || glyph.svgPathData;
  if (!pathData) {
    return {
      leftSideBearing: glyph.leftSideBearing,
      advanceWidth: glyph.advanceWidth,
    };
  }
  
  const bounds = getPathBounds(pathData);
  if (!bounds) {
    return {
      leftSideBearing: glyph.leftSideBearing,
      advanceWidth: glyph.advanceWidth,
    };
  }
  
  // Calcular dimensões reais considerando a escala do glifo
  const scaledWidth = bounds.width * glyph.scale;
  const scaledMinX = bounds.minX * glyph.scale;
  
  // Centro geométrico do vetor (em coordenadas escaladas)
  const vectorCenterX = scaledMinX + (scaledWidth / 2);
  
  // Novo advance width: margem + largura do vetor + margem
  const newAdvanceWidth = Math.round(targetMargin + scaledWidth + targetMargin);
  
  // Centro do novo advance width
  const boxCenterX = newAdvanceWidth / 2;
  
  // LSB necessário para alinhar o centro do vetor com o centro da caixa
  // O LSB move o vetor para a direita, então:
  // vectorCenterX + LSB = boxCenterX
  // LSB = boxCenterX - vectorCenterX
  const newLSB = Math.round(boxCenterX - vectorCenterX);
  
  return {
    leftSideBearing: newLSB,
    advanceWidth: Math.max(200, Math.min(1500, newAdvanceWidth)),
  };
}

/**
 * Centraliza todos os glifos
 */
export function centerAllGlyphs(
  glyphs: GlyphData[],
  targetMargin: number,
  onUpdate: (char: string, data: Partial<GlyphData>) => void
): number {
  let count = 0;
  
  for (const glyph of glyphs) {
    if (!glyph.pathData && !glyph.svgPathData) continue;
    
    const centered = centerGlyphInBox(glyph, targetMargin);
    
    if (centered.leftSideBearing !== glyph.leftSideBearing ||
        centered.advanceWidth !== glyph.advanceWidth) {
      onUpdate(glyph.char, centered);
      count++;
    }
  }
  
  return count;
}

// ============================================================================
// GERAÇÃO DE KERNING PROFISSIONAL
// ============================================================================

/**
 * Determina a classe de kerning de um caractere
 */
function getCharacterClass(char: string, side: 'left' | 'right'): string | null {
  const classes = side === 'left' 
    ? ['leftStraight', 'leftDiagonal', 'leftRound', 'leftOpen'] as const
    : ['rightStraight', 'rightDiagonal', 'rightRound', 'rightOverhang'] as const;
  
  for (const cls of classes) {
    if (KERNING_CLASSES[cls].includes(char)) {
      return cls;
    }
  }
  
  return null;
}

/**
 * Gera kerning profissional baseado em tabelas de referência
 */
export function generateProfessionalKerning(
  glyphs: GlyphData[],
  options: ProfessionalKerningOptions = {}
): KerningPair[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pairs: KerningPair[] = [];
  const processed = new Set<string>();
  
  const style = FONT_STYLE_PROFILES[opts.style || 'neo-grotesque'];
  const multiplier = style.kerningMultiplier * (opts.intensity || 1.0);
  
  const glyphChars = new Set(glyphs.filter(g => g.pathData || g.svgPathData).map(g => g.char));
  
  // 1. Aplica pares críticos da tabela profissional
  for (const [pair, value] of Object.entries(PROFESSIONAL_KERNING_VALUES.critical)) {
    const [left, right] = [pair[0], pair.slice(1)];
    if (glyphChars.has(left) && glyphChars.has(right)) {
      const adjustedValue = Math.round(value * multiplier);
      if (Math.abs(adjustedValue) >= opts.minValue!) {
        pairs.push({ left, right, value: adjustedValue });
        processed.add(pair);
      }
    }
  }
  
  // 2. Aplica pares importantes
  for (const [pair, value] of Object.entries(PROFESSIONAL_KERNING_VALUES.important)) {
    if (processed.has(pair)) continue;
    const [left, right] = [pair[0], pair.slice(1)];
    if (glyphChars.has(left) && glyphChars.has(right)) {
      const adjustedValue = Math.round(value * multiplier);
      if (Math.abs(adjustedValue) >= opts.minValue!) {
        pairs.push({ left, right, value: adjustedValue });
        processed.add(pair);
      }
    }
  }
  
  // 3. Aplica pares de minúsculas
  for (const [pair, value] of Object.entries(PROFESSIONAL_KERNING_VALUES.lowercase)) {
    if (processed.has(pair)) continue;
    const [left, right] = [pair[0], pair.slice(1)];
    if (glyphChars.has(left) && glyphChars.has(right)) {
      const adjustedValue = Math.round(value * multiplier);
      if (Math.abs(adjustedValue) >= opts.minValue!) {
        pairs.push({ left, right, value: adjustedValue });
        processed.add(pair);
      }
    }
  }
  
  // 4. Pontuação
  if (opts.includePunctuation) {
    for (const [pair, value] of Object.entries(PROFESSIONAL_KERNING_VALUES.punctuation)) {
      if (processed.has(pair)) continue;
      const [left, right] = [pair[0], pair.slice(1)];
      if (glyphChars.has(left) && glyphChars.has(right)) {
        const adjustedValue = Math.round(value * multiplier);
        if (Math.abs(adjustedValue) >= opts.minValue!) {
          pairs.push({ left, right, value: adjustedValue });
          processed.add(pair);
        }
      }
    }
  }
  
  // 5. Números
  if (opts.includeNumbers) {
    for (const [pair, value] of Object.entries(PROFESSIONAL_KERNING_VALUES.numbers)) {
      if (processed.has(pair)) continue;
      const [left, right] = [pair[0], pair.slice(1)];
      if (glyphChars.has(left) && glyphChars.has(right)) {
        const adjustedValue = Math.round(value * multiplier);
        if (Math.abs(adjustedValue) >= opts.minValue!) {
          pairs.push({ left, right, value: adjustedValue });
          processed.add(pair);
        }
      }
    }
  }
  
  // 6. Se useClasses, gera pares adicionais baseado em categorias
  if (opts.useClasses) {
    const charArray = Array.from(glyphChars);
    
    for (const left of charArray) {
      const leftClass = getCharacterClass(left, 'right');
      if (!leftClass) continue;
      
      for (const right of charArray) {
        const pairKey = `${left}${right}`;
        if (processed.has(pairKey)) continue;
        
        const rightClass = getCharacterClass(right, 'left');
        if (!rightClass) continue;
        
        // Busca valor na matriz de categorias
        const matrixValue = CATEGORY_MATRIX[leftClass]?.[rightClass];
        if (matrixValue && matrixValue !== 0) {
          const adjustedValue = Math.round(matrixValue * multiplier);
          if (Math.abs(adjustedValue) >= opts.minValue!) {
            pairs.push({ left, right, value: adjustedValue });
            processed.add(pairKey);
          }
        }
      }
    }
  }
  
  return pairs;
}

/**
 * Gera kerning usando análise geométrica real dos glifos
 */
export function generateGeometricKerning(
  glyphs: GlyphData[],
  options: ProfessionalKerningOptions = {}
): KerningPair[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const pairs: KerningPair[] = [];
  const processed = new Set<string>();
  
  // Analisa geometria de cada glifo
  const profiles = new Map<string, GlyphProfile>();
  for (const glyph of glyphs) {
    const profile = analyzeGlyphShape(glyph);
    if (profile) {
      profiles.set(glyph.char, profile);
    }
  }
  
  const multiplier = (opts.intensity || 1.0);
  
  // Processa todos os pares
  const chars = Array.from(profiles.keys());
  
  for (const left of chars) {
    const leftProfile = profiles.get(left)!;
    
    for (const right of chars) {
      if (left === right) continue;
      
      const pairKey = `${left}${right}`;
      if (processed.has(pairKey)) continue;
      
      const rightProfile = profiles.get(right)!;
      
      // Calcula kerning baseado em geometria
      let kernValue = 0;
      
      // Regra 1: Overhang direito + qualquer coisa
      if (leftProfile.hasRightOverhang) {
        if (rightProfile.hasLeftDiagonal) kernValue = -70;
        else if (rightProfile.hasLeftCurve) kernValue = -50;
        else if (rightProfile.leftNegativeSpace > 0.2) kernValue = -35;
      }
      // Regra 2: Diagonal direita
      else if (leftProfile.hasRightDiagonal) {
        if (rightProfile.hasLeftDiagonal) kernValue = -60;
        else if (rightProfile.hasLeftCurve) kernValue = -45;
        else if (rightProfile.hasLeftOverhang) kernValue = -40;
      }
      // Regra 3: Curva direita
      else if (leftProfile.hasRightCurve) {
        if (rightProfile.hasLeftDiagonal) kernValue = -30;
        else if (rightProfile.hasLeftOverhang) kernValue = -25;
      }
      // Regra 4: Muito espaço negativo em ambos
      else if (leftProfile.rightNegativeSpace > 0.25 && rightProfile.leftNegativeSpace > 0.25) {
        kernValue = -20;
      }
      
      // Aplica multiplicador
      kernValue = Math.round(kernValue * multiplier);
      
      // Só adiciona se significativo
      if (Math.abs(kernValue) >= opts.minValue!) {
        pairs.push({ left, right, value: kernValue });
        processed.add(pairKey);
      }
    }
  }
  
  return pairs;
}

/**
 * Combina kerning profissional (tabelas) com geométrico (análise real)
 * Melhor dos dois mundos!
 */
export function generateHybridKerning(
  glyphs: GlyphData[],
  options: ProfessionalKerningOptions = {}
): KerningPair[] {
  // Começa com kerning profissional (valores de referência)
  const professionalPairs = generateProfessionalKerning(glyphs, { ...options, useClasses: false });
  const processed = new Set(professionalPairs.map(p => `${p.left}${p.right}`));
  
  // Adiciona kerning geométrico para pares não cobertos
  const geometricPairs = generateGeometricKerning(glyphs, options);
  
  for (const pair of geometricPairs) {
    const key = `${pair.left}${pair.right}`;
    if (!processed.has(key)) {
      professionalPairs.push(pair);
    }
  }
  
  return professionalPairs;
}

// ============================================================================
// ANÁLISE DE QUALIDADE
// ============================================================================

export interface KerningQualityReport {
  totalPairs: number;
  coverage: number;           // % de pares críticos cobertos
  averageValue: number;
  strongestPairs: Array<{ pair: string; value: number }>;
  missingCritical: string[];
  suggestions: string[];
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Analisa a qualidade do kerning
 */
export function analyzeKerningQuality(
  glyphs: GlyphData[],
  pairs: KerningPair[]
): KerningQualityReport {
  const glyphChars = new Set(glyphs.filter(g => g.pathData || g.svgPathData).map(g => g.char));
  const pairSet = new Set(pairs.map(p => `${p.left}${p.right}`));
  
  // Verifica pares críticos
  const criticalPairs = Object.keys(PROFESSIONAL_KERNING_VALUES.critical);
  const applicableCritical = criticalPairs.filter(pair => {
    const [left, right] = [pair[0], pair.slice(1)];
    return glyphChars.has(left) && glyphChars.has(right);
  });
  
  const coveredCritical = applicableCritical.filter(pair => pairSet.has(pair));
  const missingCritical = applicableCritical.filter(pair => !pairSet.has(pair));
  
  const coverage = applicableCritical.length > 0
    ? (coveredCritical.length / applicableCritical.length) * 100
    : 100;
  
  // Estatísticas
  const values = pairs.map(p => p.value);
  const averageValue = values.length > 0
    ? values.reduce((a, b) => a + Math.abs(b), 0) / values.length
    : 0;
  
  // Top 5 pares mais fortes
  const sortedPairs = [...pairs].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const strongestPairs = sortedPairs.slice(0, 5).map(p => ({
    pair: `${p.left}${p.right}`,
    value: p.value,
  }));
  
  // Sugestões
  const suggestions: string[] = [];
  
  if (coverage < 50) {
    suggestions.push('Cobertura baixa - adicione kerning para pares críticos como AV, To, LT');
  }
  if (averageValue < 20 && pairs.length > 0) {
    suggestions.push('Valores de kerning parecem muito fracos - considere aumentar intensidade');
  }
  if (averageValue > 80) {
    suggestions.push('Valores de kerning parecem muito fortes - pode causar colisões');
  }
  if (missingCritical.length > 0 && missingCritical.length <= 5) {
    suggestions.push(`Pares importantes faltando: ${missingCritical.join(', ')}`);
  }
  if (pairs.length < 20 && glyphChars.size > 50) {
    suggestions.push('Poucos pares de kerning - considere usar o modo "Completo"');
  }
  
  // Nota
  let grade: KerningQualityReport['grade'];
  if (coverage >= 90 && averageValue >= 30 && averageValue <= 70) grade = 'A';
  else if (coverage >= 70 && averageValue >= 20) grade = 'B';
  else if (coverage >= 50 && pairs.length >= 30) grade = 'C';
  else if (coverage >= 30 || pairs.length >= 15) grade = 'D';
  else grade = 'F';
  
  return {
    totalPairs: pairs.length,
    coverage,
    averageValue,
    strongestPairs,
    missingCritical: missingCritical.slice(0, 10),
    suggestions,
    grade,
  };
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export {
  PROFESSIONAL_KERNING_VALUES as KERNING_DATA,
};

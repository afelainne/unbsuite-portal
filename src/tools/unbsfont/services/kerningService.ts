/**
 * Kerning Service
 * Sistema de kerning inteligente baseado em análise geométrica real dos glyphs.
 */

import { GlyphData } from "../types";
import { 
  analyzeGlyphShape, 
  analyzeAllGlyphShapes, 
  calculateOptimalKerning,
  GlyphProfile 
} from "./glyphShapeAnalyzer";

// ============================================================================
// TIPOS E CONFIGURAÇÕES
// ============================================================================

const buildPairKey = (leftToken: string, rightToken: string) => `${leftToken}${rightToken}`;

type KerningProfile = 'display' | 'geometric' | 'mono' | 'sans' | 'serif';

const PROFILE_MULTIPLIER: Record<KerningProfile, number> = {
  display: 1.2,
  geometric: 1.0,
  mono: 0.55,
  sans: 1.0,
  serif: 1.15,
};

const sanitizeToken = (value: string | undefined): string | undefined => (value && value.length > 0 ? value : undefined);

// ============================================================================
// RESOLUÇÃO DE KERNING
// ============================================================================

export const resolveKerningValue = (
  leftGlyph: GlyphData | null,
  rightGlyph: GlyphData | null,
  kerning: Record<string, number>
): number => {
  if (!leftGlyph || !rightGlyph) return 0;
  const biasLeft = leftGlyph.kerningBias ?? 0;
  const biasRight = rightGlyph.kerningBias ?? 0;

  let base = 0;
  const directKey = buildPairKey(leftGlyph.char, rightGlyph.char);
  if (kerning[directKey] !== undefined) {
      base = kerning[directKey];
  } else {
      const leftClass = sanitizeToken(leftGlyph.groups.right);
      const rightClass = sanitizeToken(rightGlyph.groups.left);
      if (leftClass && rightClass) {
          const classKey = buildPairKey(leftClass, rightClass);
          if (kerning[classKey] !== undefined) {
              base = kerning[classKey];
          }
      }
  }

  return base + biasLeft + biasRight;
};

// ============================================================================
// GERAÇÃO DE KERNING INTELIGENTE (BASEADO EM GEOMETRIA REAL)
// ============================================================================

// ============================================================================
// GERAÇÃO DE KERNING INTELIGENTE (BASEADO EM GEOMETRIA REAL)
// ============================================================================

export interface SmartKerningOptions {
  intensity: number;           // 0.0 a 2.0
  profile: KerningProfile;
  targetDensity: number;       // Densidade alvo de espaço (0.1 a 0.3)
  includeNumbers: boolean;
  includePunctuation: boolean;
  onlyMissingPairs: boolean;   // Só gerar para pairs sem kerning
}

const DEFAULT_OPTIONS: SmartKerningOptions = {
  intensity: 1.0,
  profile: 'sans',
  targetDensity: 0.15,
  includeNumbers: true,
  includePunctuation: true,
  onlyMissingPairs: true,
};

/**
 * Gera kerning inteligente analisando a geometria real de cada glyph
 * 
 * ABORDAGEM CONSERVADORA: Só gera kerning para pairs que realmente precisam.
 * A maioria das combinações de letras funciona bem com espaçamento padrão.
 */
export const generateSmartAutoKerning = (
  glyphs: GlyphData[], 
  existingKerning: Record<string, number>,
  options: Partial<SmartKerningOptions> = {}
): Record<string, number> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const newKerning = { ...existingKerning };
  
  // Analisa todos os glyphs
  const profiles = analyzeAllGlyphShapes(glyphs);
  
  // Filtra apenas glyphs alfabéticos com path data
  const validGlyphs = glyphs.filter(g => {
    const hasPath = (g.pathData || '').trim().length > 0;
    if (!hasPath) return false;
    
    const isAlpha = /[a-zA-Z]/.test(g.char);
    const isNumber = /[0-9]/.test(g.char);
    const isPunct = /[^a-zA-Z0-9\s]/.test(g.char);
    if (isAlpha) return true;
    if (opts.includeNumbers && isNumber) return true;
    if (opts.includePunctuation && isPunct) return true;
    return false;
  });
  
  // Identifica glyphs com características problemáticas que PRECISAM de kerning
  const problematicLeft = new Set<string>(); // Glyphs que têm problemas à direita
  const problematicRight = new Set<string>(); // Glyphs que têm problemas à esquerda
  
  for (const glyph of validGlyphs) {
    const profile = profiles.get(glyph.char);
    if (!profile) continue;
    
    // Glyphs com overhang ou diagonal à direita causam problemas
    if (profile.hasRightOverhang || profile.hasRightDiagonal || profile.rightNegativeSpace > 0.15) {
      problematicLeft.add(glyph.char);
    }
    
    // Glyphs com diagonal ou curva à esquerda podem se beneficiar de kerning
    if (profile.hasLeftDiagonal || profile.hasLeftCurve || profile.leftNegativeSpace > 0.15) {
      problematicRight.add(glyph.char);
    }
  }
  
  // Só gera pairs entre glyphs problemáticos
  const processedPairs = new Set<string>();
  
  for (const leftChar of problematicLeft) {
    const leftGlyph = validGlyphs.find(g => g.char === leftChar);
    const leftProfile = profiles.get(leftChar);
    if (!leftGlyph || !leftProfile) continue;
    
    for (const rightChar of problematicRight) {
      if (leftChar === rightChar) continue;
      
      const pairKey = buildPairKey(leftChar, rightChar);
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);
      
      // Verifica se já existe kerning definido
      if (opts.onlyMissingPairs && existingKerning[pairKey] !== undefined) continue;
      
      const rightProfile = profiles.get(rightChar);
      if (!rightProfile) continue;
      
      // Calcula kerning baseado em geometria
      const kernValue = calculateOptimalKerning(leftProfile, rightProfile, opts.targetDensity);
      
      // Só salva se o valor for significativo
      if (kernValue !== 0) {
        // Aplica intensidade e perfil
        const profileBoost = PROFILE_MULTIPLIER[opts.profile] ?? 1.0;
        const adjusted = Math.round(kernValue * opts.intensity * profileBoost);
        
        if (Math.abs(adjusted) >= 5) {
          newKerning[pairKey] = adjusted;
        }
      }
    }
  }
  
  // Também processa pairs com pontuação se habilitado
  if (opts.includePunctuation) {
    const punctGlyphs = glyphs.filter(g => {
      const hasPath = (g.pathData || '').trim().length > 0;
      return hasPath && /[.,:;!?'"\-]/.test(g.char);
    });
    
    // Pontuação baixa (.,) depois de letras com overhang
    for (const leftChar of problematicLeft) {
      const leftProfile = profiles.get(leftChar);
      if (!leftProfile?.hasRightOverhang) continue;
      
      for (const punctGlyph of punctGlyphs) {
        if (!/[.,]/.test(punctGlyph.char)) continue;
        
        const pairKey = buildPairKey(leftChar, punctGlyph.char);
        if (existingKerning[pairKey] !== undefined) continue;
        
        // Kerning moderado para pontuação
        newKerning[pairKey] = Math.round(-35 * opts.intensity);
      }
    }
  }
  
  return newKerning;
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Gera kerning apenas para pairs problemáticos comuns
 */
export const generateCommonPairsKerning = (
  glyphs: GlyphData[],
  existingKerning: Record<string, number>,
  intensity: number = 1.0
): Record<string, number> => {
  const newKerning = { ...existingKerning };
  const profiles = analyzeAllGlyphShapes(glyphs);
  
  // Pares problemáticos mais comuns
  const problematicPairs = [
    // T combinations
    'TA', 'Ta', 'Te', 'To', 'Tr', 'Tu', 'Ty',
    // V/W/Y combinations  
    'VA', 'Va', 'Ve', 'Vo', 'WA', 'Wa', 'We', 'Wo', 'YA', 'Ya', 'Ye', 'Yo',
    // A combinations
    'AV', 'AW', 'AY', 'AT', 'Av', 'Aw', 'Ay',
    // L combinations
    'LT', 'LV', 'LW', 'LY', 'L"', "L'",
    // P combinations
    'PA', 'Pa', 'P.', 'P,',
    // F combinations
    'FA', 'Fa', 'Fe', 'Fo', 'F.', 'F,',
    // r combinations
    'ra', 're', 'ro', 'r.', 'r,',
    // Punctuation
    'T.', 'T,', 'V.', 'V,', 'W.', 'W,', 'Y.', 'Y,',
    // Quotes
    '"A', '"O', "'A", "'O", 'A"', 'O"', "A'", "O'",
  ];
  
  for (const pair of problematicPairs) {
    if (pair.length !== 2) continue;
    if (existingKerning[pair] !== undefined) continue;
    
    const leftChar = pair[0];
    const rightChar = pair[1];
    
    const leftProfile = profiles.get(leftChar);
    const rightProfile = profiles.get(rightChar);
    
    if (leftProfile && rightProfile) {
      const kernValue = calculateOptimalKerning(leftProfile, rightProfile, 0.12);
      const adjusted = Math.round(kernValue * intensity);
      
      if (Math.abs(adjusted) >= 5) {
        newKerning[pair] = adjusted;
      }
    }
  }
  
  return newKerning;
};

/**
 * Atualiza os shapes dos glyphs baseado na análise geométrica real
 */
export const updateGlyphShapesFromGeometry = (glyphs: GlyphData[]): GlyphData[] => {
  return glyphs.map(glyph => {
    const profile = analyzeGlyphShape(glyph);
    if (!profile) return glyph;
    
    return {
      ...glyph,
      shapeLeft: profile.shapeLeft,
      shapeRight: profile.shapeRight,
    };
  });
};

/**
 * Retorna estatísticas sobre a análise de kerning
 */
export const getKerningStats = (kerning: Record<string, number>) => {
  const values = Object.values(kerning);
  if (values.length === 0) return null;
  
  return {
    totalPairs: values.length,
    minValue: Math.min(...values),
    maxValue: Math.max(...values),
    avgValue: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    negativePairs: values.filter(v => v < 0).length,
    positivePairs: values.filter(v => v > 0).length,
  };
};

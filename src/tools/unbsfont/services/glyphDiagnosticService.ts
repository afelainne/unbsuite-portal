/**
 * Glyph Diagnostic Service
 * Sistema robusto de detecção e correção automática de problemas em glyphs
 */

import { GlyphData, FontMetadata } from '../types';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface GlyphDiagnostic {
  glyphChar: string;
  glyphName: string;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  suggestion: string;
  autoFixAvailable: boolean;
  autoFixAction?: () => Partial<GlyphData>;
}

export interface DiagnosticSummary {
  totalGlyphs: number;
  glyphsWithIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  diagnostics: GlyphDiagnostic[];
}

// Constantes de referência para diagnóstico
const REFERENCE_HEIGHT = 700; // Altura padrão normalizada
const TOLERANCE_SCALE = 0.20; // 20% de tolerância no scale
const TOLERANCE_BASELINE = 150; // Tolerância no baseline offset
const MIN_ADVANCE_WIDTH = 50;
const MAX_ADVANCE_WIDTH = 2000;
const MIN_LSB = -200;
const MAX_LSB = 500;

// Categorias de caracteres - cada uma tem seu próprio padrão de tamanho
type CharCategory = 'uppercase' | 'lowercase' | 'number' | 'punctuation' | 'symbol' | 'smallSymbol';

const getCharCategory = (char: string): CharCategory => {
  const code = char.charCodeAt(0);
  // Maiúsculas A-Z
  if (code >= 65 && code <= 90) return 'uppercase';
  // Minúsculas a-z
  if (code >= 97 && code <= 122) return 'lowercase';
  // Números 0-9
  if (code >= 48 && code <= 57) return 'number';
  // Symbols pequenos (pontuação, bullets, etc)
  const smallSymbols = '.·•,;:\'"`^~';
  if (smallSymbols.includes(char)) return 'smallSymbol';
  // Pontuação geral
  const punctuation = '!?@#$%&*()-_+=[]{}|\\/<>';
  if (punctuation.includes(char)) return 'punctuation';
  // Resto é símbolo
  return 'symbol';
};

// Caracteres que devem ser comparados apenas com sua própria categoria
const CATEGORY_ISOLATED = new Set<CharCategory>(['smallSymbol']);

// Caracteres que naturalmente têm tamanhos diferentes
const SPECIAL_SIZE_CHARS = new Set(['.', ',', ';', ':', '\'', '"', '`', '^', '~', '·', '•', '-', '_']);

/**
 * Mede o bounding box de um path SVG
 */
export const measurePathBBox = (pathData: string): { x: number; y: number; width: number; height: number } | null => {
  if (!pathData || !pathData.trim()) return null;
  
  try {
    // Parse path commands e calcular bounding box
    const coords: { x: number; y: number }[] = [];
    const numRegex = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
    // Suporta todos os comandos SVG: M, L, H, V, C, S, Q, T, A, Z
    const cmdRegex = /([MLHVCSQTAZ])\s*((?:[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?[\s,]*)*)/gi;
    
    let currentX = 0, currentY = 0;
    let match;
    
    while ((match = cmdRegex.exec(pathData)) !== null) {
      const rawCmd = match[1];
      const cmd = rawCmd.toUpperCase();
      const isRelative = rawCmd !== cmd;
      const args = match[2];
      if (!args && cmd !== 'Z') continue;
      
      const nums: number[] = [];
      if (args) {
        let numMatch;
        while ((numMatch = numRegex.exec(args)) !== null) {
          nums.push(parseFloat(numMatch[0]));
        }
      }
      
      if (cmd === 'M' || cmd === 'L') {
        for (let i = 0; i < nums.length; i += 2) {
          if (i + 1 < nums.length) {
            if (isRelative) { currentX += nums[i]; currentY += nums[i + 1]; }
            else { currentX = nums[i]; currentY = nums[i + 1]; }
            coords.push({ x: currentX, y: currentY });
          }
        }
      } else if (cmd === 'H') {
        for (const x of nums) {
          if (isRelative) currentX += x; else currentX = x;
          coords.push({ x: currentX, y: currentY });
        }
      } else if (cmd === 'V') {
        for (const y of nums) {
          if (isRelative) currentY += y; else currentY = y;
          coords.push({ x: currentX, y: currentY });
        }
      } else if (cmd === 'C') {
        for (let i = 0; i < nums.length; i += 6) {
          if (i + 5 < nums.length) {
            const ox = isRelative ? currentX : 0;
            const oy = isRelative ? currentY : 0;
            coords.push({ x: ox + nums[i], y: oy + nums[i + 1] });
            coords.push({ x: ox + nums[i + 2], y: oy + nums[i + 3] });
            currentX = ox + nums[i + 4];
            currentY = oy + nums[i + 5];
            coords.push({ x: currentX, y: currentY });
          }
        }
      } else if (cmd === 'S') {
        for (let i = 0; i < nums.length; i += 4) {
          if (i + 3 < nums.length) {
            const ox = isRelative ? currentX : 0;
            const oy = isRelative ? currentY : 0;
            coords.push({ x: ox + nums[i], y: oy + nums[i + 1] });
            currentX = ox + nums[i + 2];
            currentY = oy + nums[i + 3];
            coords.push({ x: currentX, y: currentY });
          }
        }
      } else if (cmd === 'Q') {
        for (let i = 0; i < nums.length; i += 4) {
          if (i + 3 < nums.length) {
            const ox = isRelative ? currentX : 0;
            const oy = isRelative ? currentY : 0;
            coords.push({ x: ox + nums[i], y: oy + nums[i + 1] });
            currentX = ox + nums[i + 2];
            currentY = oy + nums[i + 3];
            coords.push({ x: currentX, y: currentY });
          }
        }
      } else if (cmd === 'T') {
        for (let i = 0; i < nums.length; i += 2) {
          if (i + 1 < nums.length) {
            if (isRelative) { currentX += nums[i]; currentY += nums[i + 1]; }
            else { currentX = nums[i]; currentY = nums[i + 1]; }
            coords.push({ x: currentX, y: currentY });
          }
        }
      } else if (cmd === 'A') {
        for (let i = 0; i < nums.length; i += 7) {
          if (i + 6 < nums.length) {
            if (isRelative) { currentX += nums[i + 5]; currentY += nums[i + 6]; }
            else { currentX = nums[i + 5]; currentY = nums[i + 6]; }
            coords.push({ x: currentX, y: currentY });
          }
        }
      }
    }
    
    if (coords.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of coords) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  } catch {
    return null;
  }
};

/**
 * Calcula estatísticas de referência baseadas nos glyphs existentes, por categoria
 */
interface CategoryStats {
  avgScale: number;
  avgHeight: number;
  avgBaseline: number;
  avgAdvanceWidth: number;
  medianScale: number;
  count: number;
}

interface ReferenceStats {
  global: CategoryStats;
  byCategory: Map<CharCategory, CategoryStats>;
}

const calculateReferenceStats = (glyphs: GlyphData[]): ReferenceStats => {
  const validGlyphs = glyphs.filter(g => g.pathData && g.pathData.trim());
  
  const defaultStats: CategoryStats = { 
    avgScale: 1, 
    avgHeight: REFERENCE_HEIGHT, 
    avgBaseline: 0, 
    avgAdvanceWidth: 600, 
    medianScale: 1,
    count: 0
  };
  
  if (validGlyphs.length === 0) {
    return { global: defaultStats, byCategory: new Map() };
  }
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  
  // Calcular stats por categoria
  const byCategory = new Map<CharCategory, CategoryStats>();
  const categoryGroups = new Map<CharCategory, GlyphData[]>();
  
  for (const g of validGlyphs) {
    const cat = getCharCategory(g.char);
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(g);
  }
  
  for (const [cat, catGlyphs] of categoryGroups) {
    const scales = catGlyphs.map(g => g.scale ?? 1);
    const baselines = catGlyphs.map(g => g.baselineOffset ?? 0);
    const widths = catGlyphs.map(g => g.advanceWidth ?? 600);
    const heights = catGlyphs.map(g => {
      const bbox = measurePathBBox(g.pathData);
      return bbox ? bbox.height * (g.scale ?? 1) : REFERENCE_HEIGHT;
    });
    
    byCategory.set(cat, {
      avgScale: avg(scales),
      avgHeight: avg(heights),
      avgBaseline: avg(baselines),
      avgAdvanceWidth: avg(widths),
      medianScale: median(scales),
      count: catGlyphs.length
    });
  }
  
  // Calcular stats globais (usando apenas maiúsculas/minúsculas/números como referência principal)
  const mainGlyphs = validGlyphs.filter(g => {
    const cat = getCharCategory(g.char);
    return cat === 'uppercase' || cat === 'lowercase' || cat === 'number';
  });
  
  const refGlyphs = mainGlyphs.length >= 5 ? mainGlyphs : validGlyphs;
  
  const globalScales = refGlyphs.map(g => g.scale ?? 1);
  const globalBaselines = refGlyphs.map(g => g.baselineOffset ?? 0);
  const globalWidths = refGlyphs.map(g => g.advanceWidth ?? 600);
  const globalHeights = refGlyphs.map(g => {
    const bbox = measurePathBBox(g.pathData);
    return bbox ? bbox.height * (g.scale ?? 1) : REFERENCE_HEIGHT;
  });
  
  return {
    global: {
      avgScale: avg(globalScales),
      avgHeight: avg(globalHeights),
      avgBaseline: avg(globalBaselines),
      avgAdvanceWidth: avg(globalWidths),
      medianScale: median(globalScales),
      count: refGlyphs.length
    },
    byCategory
  };
};

/**
 * Diagnostics principal de um glyph individual
 */
const diagnoseGlyph = (
  glyph: GlyphData,
  referenceStats: ReferenceStats,
  metadata: FontMetadata
): GlyphDiagnostic[] => {
  const diagnostics: GlyphDiagnostic[] = [];
  
  // Skip espaço
  if (glyph.char === ' ' || !glyph.pathData) return diagnostics;
  
  const category = getCharCategory(glyph.char);
  
  // Determinar quais estatísticas usar
  // Para símbolos pequenos, usar sua própria categoria se disponível
  const categoryStats = referenceStats.byCategory.get(category);
  const useGlobal = !CATEGORY_ISOLATED.has(category) || !categoryStats || categoryStats.count < 3;
  const stats = useGlobal ? referenceStats.global : categoryStats;
  
  // Se é um caractere especial que naturalmente tem tamanho diferente, ser menos rigoroso
  const isSpecialSizeChar = SPECIAL_SIZE_CHARS.has(glyph.char);
  const toleranceMultiplier = isSpecialSizeChar ? 3 : 1;
  
  const bbox = measurePathBBox(glyph.pathData);
  const scale = glyph.scale ?? 1;
  const baselineOffset = glyph.baselineOffset ?? 0;
  const advanceWidth = glyph.advanceWidth ?? 600;
  const lsb = glyph.leftSideBearing ?? 50;
  
  // 1. ERRO: Glyph sem path válido
  if (!bbox || bbox.width < 1 || bbox.height < 1) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'error',
      code: 'INVALID_PATH',
      message: 'Path SVG inválido ou vazio',
      suggestion: 'Cole um novo SVG para este glyph',
      autoFixAvailable: false
    });
    return diagnostics;
  }
  
  const actualHeight = bbox.height * scale;
  const { medianScale, avgHeight, avgBaseline } = stats;
  
  // 2. ERRO: Scale muito diferente da média (glyph gigante ou minúsculo)
  // Caracteres especiais têm tolerância maior
  const effectiveTolerance = TOLERANCE_SCALE * toleranceMultiplier;
  const scaleDiff = Math.abs(scale - medianScale) / medianScale;
  
  if (scaleDiff > effectiveTolerance * 3 && !isSpecialSizeChar) {
    const suggestedScale = medianScale;
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'error',
      code: 'SCALE_OUTLIER',
      message: `Scale (${scale.toFixed(2)}) muito diferente dos outros glyphs da categoria (média: ${medianScale.toFixed(2)})`,
      suggestion: `Ajustar scale para aproximadamente ${suggestedScale.toFixed(2)}`,
      autoFixAvailable: true,
      autoFixAction: () => ({ scale: suggestedScale })
    });
  } else if (scaleDiff > effectiveTolerance && !isSpecialSizeChar) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'warning',
      code: 'SCALE_WARNING',
      message: `Scale (${scale.toFixed(2)}) ligeiramente diferente da média (${medianScale.toFixed(2)})`,
      suggestion: 'Verifique se o tamanho está correto em relação aos outros glyphs',
      autoFixAvailable: true,
      autoFixAction: () => ({ scale: medianScale })
    });
  }
  
  // 3. ERRO: Altura do glyph muito diferente (apenas para caracteres principais)
  const heightDiff = Math.abs(actualHeight - avgHeight) / avgHeight;
  if (heightDiff > 0.5 && diagnostics.length === 0 && !isSpecialSizeChar) {
    const suggestedScale = avgHeight / bbox.height;
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'error',
      code: 'HEIGHT_MISMATCH',
      message: `Altura do glyph (${actualHeight.toFixed(0)}) muito diferente da média (${avgHeight.toFixed(0)})`,
      suggestion: `Ajustar scale para ${suggestedScale.toFixed(2)} para normalizar altura`,
      autoFixAvailable: true,
      autoFixAction: () => ({ scale: suggestedScale })
    });
  }
  
  // 4. WARNING: Baseline offset muito diferente
  const baselineDiff = Math.abs(baselineOffset - avgBaseline);
  if (baselineDiff > TOLERANCE_BASELINE * 2) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'warning',
      code: 'BASELINE_OFFSET',
      message: `Baseline offset (${baselineOffset}) muito diferente da média (${avgBaseline.toFixed(0)})`,
      suggestion: `Ajustar Y Off para aproximadamente ${avgBaseline.toFixed(0)}`,
      autoFixAvailable: true,
      autoFixAction: () => ({ baselineOffset: Math.round(avgBaseline) })
    });
  }
  
  // 5. WARNING: Advance width muito diferente para letras similares
  if (advanceWidth < MIN_ADVANCE_WIDTH) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'warning',
      code: 'WIDTH_TOO_SMALL',
      message: `Advance width (${advanceWidth}) muito pequeno`,
      suggestion: `Aumentar width para pelo menos ${MIN_ADVANCE_WIDTH}`,
      autoFixAvailable: true,
      autoFixAction: () => ({ advanceWidth: Math.round(bbox.width * scale + Math.abs(lsb) * 2) })
    });
  } else if (advanceWidth > MAX_ADVANCE_WIDTH) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'warning',
      code: 'WIDTH_TOO_LARGE',
      message: `Advance width (${advanceWidth}) muito grande`,
      suggestion: `Reduzir width para um valor razoável`,
      autoFixAvailable: true,
      autoFixAction: () => ({ advanceWidth: Math.round(bbox.width * scale + Math.abs(lsb) * 2) })
    });
  }
  
  // 6. WARNING: LSB fora dos limites
  if (lsb < MIN_LSB) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'warning',
      code: 'LSB_TOO_NEGATIVE',
      message: `Left side bearing (${lsb}) muito negativo`,
      suggestion: `Ajustar LSB para pelo menos ${MIN_LSB}`,
      autoFixAvailable: true,
      autoFixAction: () => ({ leftSideBearing: 50 })
    });
  } else if (lsb > MAX_LSB) {
    diagnostics.push({
      glyphChar: glyph.char,
      glyphName: glyph.name,
      severity: 'warning',
      code: 'LSB_TOO_LARGE',
      message: `Left side bearing (${lsb}) muito grande`,
      suggestion: `Reduzir LSB para um valor razoável`,
      autoFixAvailable: true,
      autoFixAction: () => ({ leftSideBearing: 50 })
    });
  }
  
  // Removed NO_VIEWBOX and PATH_NOT_AT_ORIGIN diagnostics - they generated noise without actionable value
  
  return diagnostics;
};

/**
 * Executa diagnóstico completo em todos os glyphs
 */
export const runFullDiagnostics = (
  glyphs: GlyphData[],
  metadata: FontMetadata
): DiagnosticSummary => {
  const glyphsWithPath = glyphs.filter(g => g.pathData && g.pathData.trim() && g.char !== ' ');
  const referenceStats = calculateReferenceStats(glyphsWithPath);
  
  const allDiagnostics: GlyphDiagnostic[] = [];
  
  for (const glyph of glyphs) {
    if (glyph.char === ' ') continue;
    const glyphDiags = diagnoseGlyph(glyph, referenceStats, metadata);
    allDiagnostics.push(...glyphDiags);
  }
  
  // Ordenar por severidade
  const severityOrder: Record<DiagnosticSeverity, number> = { error: 0, warning: 1, info: 2 };
  allDiagnostics.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  const uniqueGlyphsWithIssues = new Set(allDiagnostics.map(d => d.glyphChar)).size;
  
  return {
    totalGlyphs: glyphs.filter(g => g.pathData && g.char !== ' ').length,
    glyphsWithIssues: uniqueGlyphsWithIssues,
    errors: allDiagnostics.filter(d => d.severity === 'error').length,
    warnings: allDiagnostics.filter(d => d.severity === 'warning').length,
    infos: allDiagnostics.filter(d => d.severity === 'info').length,
    diagnostics: allDiagnostics
  };
};

/**
 * Auto-corrige todos os problemas que têm autoFix disponível
 */
export const autoFixAllIssues = (
  glyphs: GlyphData[],
  metadata: FontMetadata,
  onUpdateGlyph: (char: string, updates: Partial<GlyphData>) => void
): { fixed: number; failed: number } => {
  const diagnostics = runFullDiagnostics(glyphs, metadata);
  let fixed = 0;
  let failed = 0;
  
  // Agrupar por glyph para aplicar todas as correções de uma vez
  const fixesByGlyph = new Map<string, Partial<GlyphData>>();
  
  for (const diag of diagnostics.diagnostics) {
    if (diag.autoFixAvailable && diag.autoFixAction) {
      try {
        const fix = diag.autoFixAction();
        const existing = fixesByGlyph.get(diag.glyphChar) || {};
        fixesByGlyph.set(diag.glyphChar, { ...existing, ...fix });
        fixed++;
      } catch (e) {
        failed++;
      }
    }
  }
  
  // Aplicar correções
  for (const [char, fixes] of fixesByGlyph) {
    onUpdateGlyph(char, fixes);
  }
  
  return { fixed, failed };
};

/**
 * Normaliza um glyph problemático baseado nos parâmetros de referência
 */
export const normalizeGlyphToReference = (
  glyph: GlyphData,
  glyphs: GlyphData[]
): Partial<GlyphData> | null => {
  const glyphsWithPath = glyphs.filter(g => g.pathData && g.pathData.trim() && g.char !== ' ' && g.char !== glyph.char);
  
  if (glyphsWithPath.length < 3) {
    // Não há glyphs suficientes para referência
    return null;
  }
  
  const referenceStats = calculateReferenceStats(glyphsWithPath);
  const bbox = measurePathBBox(glyph.pathData);
  
  if (!bbox || bbox.height < 1) return null;
  
  // Determinar categoria e usar stats apropriados
  const category = getCharCategory(glyph.char);
  const isSpecialSizeChar = SPECIAL_SIZE_CHARS.has(glyph.char);
  
  // Para caracteres especiais, usar sua própria categoria ou não normalizar
  if (isSpecialSizeChar) {
    const catStats = referenceStats.byCategory.get(category);
    if (catStats && catStats.count >= 2) {
      return {
        scale: catStats.medianScale,
        baselineOffset: Math.round(catStats.avgBaseline),
        leftSideBearing: 50,
        advanceWidth: Math.round(bbox.width * catStats.medianScale + 100)
      };
    }
    // Se não há suficientes na categoria, manter o tamanho atual mas ajustar posição
    return {
      leftSideBearing: 50,
      advanceWidth: Math.round(bbox.width * (glyph.scale ?? 1) + 100)
    };
  }
  
  // Calcular scale para atingir altura média da categoria ou global
  const catStats = referenceStats.byCategory.get(category);
  const targetHeight = (catStats && catStats.count >= 3) ? catStats.avgHeight : referenceStats.global.avgHeight;
  const targetBaseline = (catStats && catStats.count >= 3) ? catStats.avgBaseline : referenceStats.global.avgBaseline;
  const suggestedScale = targetHeight / bbox.height;
  
  return {
    scale: suggestedScale,
    baselineOffset: Math.round(targetBaseline),
    leftSideBearing: 50,
    advanceWidth: Math.round(bbox.width * suggestedScale + 100)
  };
};

/**
 * Normaliza automaticamente os tamanhos de todos os glyphs por categoria.
 * Usa a altura visual mediana (bbox.height * scale) como alvo,
 * e calcula o scale individual por glyph para atingir essa altura.
 */
export const autoNormalizeAllSizes = (
  glyphs: GlyphData[],
  _metadata: FontMetadata
): Map<string, Partial<GlyphData>> => {
  const fixes = new Map<string, Partial<GlyphData>>();
  const validGlyphs = glyphs.filter(g => g.pathData && g.pathData.trim() && g.char !== ' ');

  if (validGlyphs.length < 3) return fixes;

  // Group by category
  const categoryGroups = new Map<CharCategory, GlyphData[]>();
  for (const g of validGlyphs) {
    const cat = getCharCategory(g.char);
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(g);
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  for (const [_cat, catGlyphs] of categoryGroups) {
    if (catGlyphs.length < 3) continue;

    // Calculate visual heights: bbox.height * scale
    const visualHeights: { g: GlyphData; vh: number; bboxH: number }[] = [];
    for (const g of catGlyphs) {
      const bbox = measurePathBBox(g.pathData);
      if (!bbox || bbox.height < 1) continue;
      const scale = g.scale ?? 1;
      visualHeights.push({ g, vh: bbox.height * scale, bboxH: bbox.height });
    }

    if (visualHeights.length < 3) continue;

    const medianVH = median(visualHeights.map(v => v.vh));
    const medianBaseline = median(catGlyphs.map(g => g.baselineOffset ?? 0));

    for (const { g, vh, bboxH } of visualHeights) {
      const deviation = Math.abs(vh - medianVH) / medianVH;
      if (deviation > 0.25) {
        const newScale = medianVH / bboxH;
        const lsb = g.leftSideBearing ?? 50;
        const bbox = measurePathBBox(g.pathData)!;
        fixes.set(g.char, {
          scale: newScale,
          baselineOffset: Math.round(medianBaseline),
          advanceWidth: Math.round(bbox.width * newScale + Math.abs(lsb) * 2),
        });
      }
    }
  }

  return fixes;
};

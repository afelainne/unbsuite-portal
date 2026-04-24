/**
 * Path Sanitizer Service
 * Limpa paths SVG removendo pontos duplicados/sobrepostos e valida
 * que o resultado visual é equivalente ao original.
 */

import opentype from "opentype.js";

export interface Point {
  x: number;
  y: number;
}

export interface PathBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PathMetrics {
  bounds: PathBounds;
  area: number;
  samplePoints: Point[];
  commandCount: number;
}

export interface SanitizeResult {
  success: boolean;
  originalPath: string;
  sanitizedPath: string;
  strategy: string;
  metrics: {
    original: PathMetrics;
    sanitized: PathMetrics;
  };
  similarity: number;
  warnings: string[];
}

// Tolerância para comparação de pontos
const POINT_EPSILON = 0.5;
const BOUNDS_TOLERANCE = 2;
const AREA_TOLERANCE = 0.02; // 2%
const SIMILARITY_THRESHOLD = 0.95;

// ============ SAMPLING E MÉTRICAS ============

const sampleCubicBezier = (
  p0: Point, p1: Point, p2: Point, p3: Point, samples: number
): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    points.push({ x, y });
  }
  return points;
};

const sampleQuadBezier = (
  p0: Point, p1: Point, p2: Point, samples: number
): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
    const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
    points.push({ x, y });
  }
  return points;
};

const samplePathCommands = (commands: opentype.PathCommand[], samplesPerCurve = 16): Point[] => {
  const points: Point[] = [];
  let cx = 0, cy = 0;

  for (const cmd of commands) {
    const c = cmd as any;
    switch (c.type) {
      case 'M':
        cx = c.x; cy = c.y;
        points.push({ x: cx, y: cy });
        break;
      case 'L':
        points.push({ x: c.x, y: c.y });
        cx = c.x; cy = c.y;
        break;
      case 'C':
        points.push(...sampleCubicBezier(
          { x: cx, y: cy },
          { x: c.x1, y: c.y1 },
          { x: c.x2, y: c.y2 },
          { x: c.x, y: c.y },
          samplesPerCurve
        ));
        cx = c.x; cy = c.y;
        break;
      case 'Q':
        points.push(...sampleQuadBezier(
          { x: cx, y: cy },
          { x: c.x1, y: c.y1 },
          { x: c.x, y: c.y },
          samplesPerCurve
        ));
        cx = c.x; cy = c.y;
        break;
      case 'Z':
        break;
    }
  }
  return points;
};

const computeBounds = (points: Point[]): PathBounds => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

// Shoelace formula para área aproximada
const computeApproxArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
};

const getPathMetrics = (commands: opentype.PathCommand[]): PathMetrics => {
  const samplePoints = samplePathCommands(commands, 16);
  const bounds = computeBounds(samplePoints);
  const area = computeApproxArea(samplePoints);
  return { bounds, area, samplePoints, commandCount: commands.length };
};

// ============ COMPARAÇÃO ============

const compareBounds = (a: PathBounds, b: PathBounds): boolean => {
  return (
    Math.abs(a.minX - b.minX) <= BOUNDS_TOLERANCE &&
    Math.abs(a.minY - b.minY) <= BOUNDS_TOLERANCE &&
    Math.abs(a.maxX - b.maxX) <= BOUNDS_TOLERANCE &&
    Math.abs(a.maxY - b.maxY) <= BOUNDS_TOLERANCE
  );
};

const compareArea = (a: number, b: number): boolean => {
  if (a === 0 && b === 0) return true;
  const larger = Math.max(a, b);
  if (larger === 0) return true;
  return Math.abs(a - b) / larger <= AREA_TOLERANCE;
};

const hausdorffDistance = (setA: Point[], setB: Point[]): number => {
  const distToSet = (p: Point, set: Point[]): number => {
    let minDist = Infinity;
    for (const q of set) {
      const d = Math.sqrt((p.x - q.x) ** 2 + (p.y - q.y) ** 2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  let maxDistA = 0;
  for (const p of setA) {
    const d = distToSet(p, setB);
    if (d > maxDistA) maxDistA = d;
  }

  let maxDistB = 0;
  for (const p of setB) {
    const d = distToSet(p, setA);
    if (d > maxDistB) maxDistB = d;
  }

  return Math.max(maxDistA, maxDistB);
};

const computeSimilarity = (original: PathMetrics, sanitized: PathMetrics): number => {
  // Normalizar Hausdorff pela diagonal do bounding box
  const diagonal = Math.sqrt(original.bounds.width ** 2 + original.bounds.height ** 2) || 1;
  const hausdorff = hausdorffDistance(original.samplePoints, sanitized.samplePoints);
  const normalizedHausdorff = Math.max(0, 1 - hausdorff / diagonal);

  // Similaridade de área
  const maxArea = Math.max(original.area, sanitized.area) || 1;
  const areaSimilarity = 1 - Math.abs(original.area - sanitized.area) / maxArea;

  // Similaridade de bounds
  const boundsSimilarity =
    compareBounds(original.bounds, sanitized.bounds) ? 1 : 0.5;

  // Peso: Hausdorff é o mais importante
  return normalizedHausdorff * 0.6 + areaSimilarity * 0.3 + boundsSimilarity * 0.1;
};

// ============ ESTRATÉGIAS DE SANITIZAÇÃO ============

const almostEqual = (a: number, b: number, eps = POINT_EPSILON) => Math.abs(a - b) <= eps;

// Estratégia 1: Remover segmentos zero-length
const removeZeroLengthSegments = (commands: opentype.PathCommand[]): opentype.PathCommand[] => {
  const result: opentype.PathCommand[] = [];
  let lastX: number | undefined, lastY: number | undefined;

  for (const cmd of commands) {
    const c = cmd as any;
    const x = c.x as number | undefined;
    const y = c.y as number | undefined;

    if (c.type !== 'M' && c.type !== 'Z' && x !== undefined && y !== undefined) {
      if (lastX !== undefined && lastY !== undefined &&
          almostEqual(x, lastX) && almostEqual(y, lastY)) {
        continue;
      }
    }

    result.push(cmd);
    if (x !== undefined) lastX = x;
    if (y !== undefined) lastY = y;
    if (c.type === 'Z') {
      lastX = undefined;
      lastY = undefined;
    }
  }
  return result;
};

// Estratégia 2: Remover pontos colineares em sequências de linhas
const removeColinearPoints = (commands: opentype.PathCommand[]): opentype.PathCommand[] => {
  const result: opentype.PathCommand[] = [];

  for (let i = 0; i < commands.length; i++) {
    const curr = commands[i] as any;

    if (curr.type === 'L' && i > 0 && i < commands.length - 1) {
      const prev = commands[i - 1] as any;
      const next = commands[i + 1] as any;

      if (prev.type === 'L' || prev.type === 'M') {
        if (next.type === 'L') {
          const v1x = curr.x - prev.x;
          const v1y = curr.y - prev.y;
          const v2x = next.x - curr.x;
          const v2y = next.y - curr.y;
          const cross = v1x * v2y - v1y * v2x;
          const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
          const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
          if (len1 > 0 && len2 > 0 && Math.abs(cross) / (len1 * len2) < 0.001) {
            continue; // ponto colinear, skip
          }
        }
      }
    }
    result.push(commands[i]);
  }
  return result;
};

// Estratégia 3: Remover curvas degeneradas (controles no mesmo ponto)
const removeDegenerateCurves = (commands: opentype.PathCommand[]): opentype.PathCommand[] => {
  const result: opentype.PathCommand[] = [];
  let lastX = 0, lastY = 0;

  for (const cmd of commands) {
    const c = cmd as any;

    if (c.type === 'C') {
      const allSame =
        almostEqual(lastX, c.x1) && almostEqual(lastY, c.y1) &&
        almostEqual(lastX, c.x2) && almostEqual(lastY, c.y2) &&
        almostEqual(lastX, c.x) && almostEqual(lastY, c.y);
      if (allSame) continue;

      // Converter curva reta em linha
      const isLine =
        almostEqual(lastX, c.x1) && almostEqual(lastY, c.y1) &&
        almostEqual(c.x, c.x2) && almostEqual(c.y, c.y2);
      if (isLine) {
        result.push({ type: 'L', x: c.x, y: c.y } as opentype.PathCommand);
        lastX = c.x; lastY = c.y;
        continue;
      }
    }

    if (c.type === 'Q') {
      const allSame =
        almostEqual(lastX, c.x1) && almostEqual(lastY, c.y1) &&
        almostEqual(lastX, c.x) && almostEqual(lastY, c.y);
      if (allSame) continue;
    }

    result.push(cmd);
    if (c.x !== undefined) lastX = c.x;
    if (c.y !== undefined) lastY = c.y;
  }
  return result;
};

// Estratégia 4: Fechar subpaths abertos quando o último ponto está próximo do primeiro
const closeNearOpenPaths = (commands: opentype.PathCommand[]): opentype.PathCommand[] => {
  const result: opentype.PathCommand[] = [];
  let startX = 0, startY = 0;
  let lastX = 0, lastY = 0;
  let hasMove = false;

  for (let i = 0; i < commands.length; i++) {
    const c = commands[i] as any;

    if (c.type === 'M') {
      // Fechar path anterior se necessário
      if (hasMove && almostEqual(lastX, startX, 1) && almostEqual(lastY, startY, 1)) {
        const lastCmd = result[result.length - 1] as any;
        if (lastCmd && lastCmd.type !== 'Z') {
          result.push({ type: 'Z' } as opentype.PathCommand);
        }
      }
      startX = c.x; startY = c.y;
      hasMove = true;
    }

    result.push(commands[i]);
    if (c.x !== undefined) lastX = c.x;
    if (c.y !== undefined) lastY = c.y;
  }

  // Fechar último path
  if (hasMove && almostEqual(lastX, startX, 1) && almostEqual(lastY, startY, 1)) {
    const lastCmd = result[result.length - 1] as any;
    if (lastCmd && lastCmd.type !== 'Z') {
      result.push({ type: 'Z' } as opentype.PathCommand);
    }
  }

  return result;
};

// Estratégia 5: Arredondar coordenadas para evitar floating point noise
const roundCoordinates = (commands: opentype.PathCommand[], precision = 2): opentype.PathCommand[] => {
  const factor = Math.pow(10, precision);
  const round = (n: number) => Math.round(n * factor) / factor;

  return commands.map(cmd => {
    const c = { ...cmd } as any;
    if (c.x !== undefined) c.x = round(c.x);
    if (c.y !== undefined) c.y = round(c.y);
    if (c.x1 !== undefined) c.x1 = round(c.x1);
    if (c.y1 !== undefined) c.y1 = round(c.y1);
    if (c.x2 !== undefined) c.x2 = round(c.x2);
    if (c.y2 !== undefined) c.y2 = round(c.y2);
    return c as opentype.PathCommand;
  });
};

// Estratégia 6: Não fazer nada (baseline)
const passthrough = (commands: opentype.PathCommand[]): opentype.PathCommand[] => [...commands];

type SanitizeStrategy = {
  name: string;
  apply: (cmds: opentype.PathCommand[]) => opentype.PathCommand[];
};

const STRATEGIES: SanitizeStrategy[] = [
  { name: 'passthrough', apply: passthrough },
  { name: 'roundCoordinates', apply: cmds => roundCoordinates(cmds, 2) },
  { name: 'removeZeroLength', apply: removeZeroLengthSegments },
  { name: 'removeDegenerateCurves', apply: removeDegenerateCurves },
  { name: 'removeColinear', apply: removeColinearPoints },
  { name: 'closeNearOpen', apply: closeNearOpenPaths },
  { name: 'combined_light', apply: cmds => removeZeroLengthSegments(roundCoordinates(cmds, 2)) },
  { name: 'combined_full', apply: cmds =>
      closeNearOpenPaths(
        removeColinearPoints(
          removeDegenerateCurves(
            removeZeroLengthSegments(
              roundCoordinates(cmds, 2)
            )
          )
        )
      )
  },
];

// ============ API PRINCIPAL ============

const commandsToPathD = (commands: opentype.PathCommand[]): string => {
  let d = '';
  for (const cmd of commands) {
    const c = cmd as any;
    switch (c.type) {
      case 'M': d += `M${c.x} ${c.y}`; break;
      case 'L': d += `L${c.x} ${c.y}`; break;
      case 'C': d += `C${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`; break;
      case 'Q': d += `Q${c.x1} ${c.y1} ${c.x} ${c.y}`; break;
      case 'Z': d += 'Z'; break;
    }
  }
  return d;
};

export const sanitizePath = (pathD: string): SanitizeResult => {
  const warnings: string[] = [];

  let originalCommands: opentype.PathCommand[];
  try {
    originalCommands = opentype.Path.fromSVG(pathD).commands;
  } catch (err) {
    return {
      success: false,
      originalPath: pathD,
      sanitizedPath: pathD,
      strategy: 'none',
      metrics: {
        original: { bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }, area: 0, samplePoints: [], commandCount: 0 },
        sanitized: { bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }, area: 0, samplePoints: [], commandCount: 0 }
      },
      similarity: 0,
      warnings: [`Failed to parse path: ${err}`]
    };
  }

  const originalMetrics = getPathMetrics(originalCommands);

  let bestResult = {
    commands: originalCommands,
    strategy: 'passthrough',
    similarity: 1,
    metrics: originalMetrics
  };

  for (const strategy of STRATEGIES) {
    try {
      const sanitized = strategy.apply(originalCommands);
      if (sanitized.length === 0) continue;

      const sanitizedMetrics = getPathMetrics(sanitized);
      const similarity = computeSimilarity(originalMetrics, sanitizedMetrics);

      // Se a similaridade é alta o suficiente e reduz comandos, é uma boa opção
      if (similarity >= SIMILARITY_THRESHOLD) {
        const reduction = originalCommands.length - sanitized.length;
        const bestReduction = originalCommands.length - bestResult.commands.length;

        // Preferir estratégias que reduzem mais comandos mantendo similaridade
        if (reduction > bestReduction || 
            (reduction === bestReduction && similarity > bestResult.similarity)) {
          bestResult = {
            commands: sanitized,
            strategy: strategy.name,
            similarity,
            metrics: sanitizedMetrics
          };
        }
      }
    } catch (err) {
      warnings.push(`Strategy ${strategy.name} failed: ${err}`);
    }
  }

  const sanitizedPath = commandsToPathD(bestResult.commands);

  return {
    success: bestResult.similarity >= SIMILARITY_THRESHOLD,
    originalPath: pathD,
    sanitizedPath,
    strategy: bestResult.strategy,
    metrics: {
      original: originalMetrics,
      sanitized: bestResult.metrics
    },
    similarity: bestResult.similarity,
    warnings
  };
};

export const sanitizeGlyphPaths = (
  glyphs: Array<{ char: string; pathData?: string; svgPathData?: string }>
): Map<string, SanitizeResult> => {
  const results = new Map<string, SanitizeResult>();

  for (const g of glyphs) {
    const pathD = (g.svgPathData ?? g.pathData ?? '').trim();
    if (!pathD) continue;

    const result = sanitizePath(pathD);
    results.set(g.char, result);

    if (!result.success) {
      console.warn(`[PathSanitizer] Glyph '${g.char}' sanitization may have altered shape. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    }
  }

  return results;
};

export const applySanitizedPaths = <T extends { char: string; pathData?: string; svgPathData?: string }>(
  glyphs: T[],
  results: Map<string, SanitizeResult>
): T[] => {
  return glyphs.map(g => {
    const result = results.get(g.char);
    if (!result || !result.success) return g;

    return {
      ...g,
      pathData: result.sanitizedPath,
      svgPathData: result.sanitizedPath
    };
  });
};

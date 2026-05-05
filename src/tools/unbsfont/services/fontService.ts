import * as opentype from "opentype.js";
import { FontMetadata, GlyphData } from "../types";
import { sanitizeGlyphPaths, applySanitizedPaths } from "./pathSanitizer";

export type FontExportErrorCode = 'ENV_UNAVAILABLE' | 'EMPTY_FONT' | 'UNKNOWN';

export class FontExportError extends Error {
  code: FontExportErrorCode;

  constructor(code: FontExportErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'FontExportError';
    this.code = code;
    if (cause) {
      (this as unknown as { cause?: unknown }).cause = cause;
    }
  }
}

const almostEqual = (a: number, b: number, eps = 0.001) => Math.abs(a - b) <= eps;

export const sanitizeOpenTypeCommands = (commands: opentype.PathCommand[], eps = 0.001): opentype.PathCommand[] => {
  const cleaned: opentype.PathCommand[] = [];
  let lastX: number | undefined;
  let lastY: number | undefined;

  const samePoint = (x?: number, y?: number) =>
    x !== undefined && y !== undefined && lastX !== undefined && lastY !== undefined && almostEqual(x, lastX, eps) && almostEqual(y, lastY, eps);

  for (const cmd of commands) {
    const { type } = cmd as any;
    const x = (cmd as any).x as number | undefined;
    const y = (cmd as any).y as number | undefined;

    // Drop zero-length moves/lines/curves
    if (type !== 'M' && samePoint(x, y)) {
      continue;
    }

    // Drop curves whose end matches start and all controls overlap start
    if (type === 'C' || type === 'Q') {
      const x1 = (cmd as any).x1 as number | undefined;
      const y1 = (cmd as any).y1 as number | undefined;
      const x2 = (cmd as any).x2 as number | undefined;
      const y2 = (cmd as any).y2 as number | undefined;
      const controlsAtStart = samePoint(x1, y1) && (type === 'Q' || samePoint(x2, y2));
      if (controlsAtStart && samePoint(x, y)) {
        continue;
      }
    }

    cleaned.push(cmd);
    if (x !== undefined) lastX = x;
    if (y !== undefined) lastY = y;
    if (type === 'Z') {
      lastX = undefined;
      lastY = undefined;
    }
  }

  return cleaned;
};

export interface FontExportResult {
  fileName: string;
  styleName: string;
  glyphCount: number;
}

type GlyphExportData = Pick<GlyphData, 'char' | 'name' | 'unicode' | 'pathData' | 'advanceWidth' | 'leftSideBearing' | 'baselineOffset' | 'scale' | 'groups' | 'kerningBias' | 'svgViewBox' | 'svgPathData'>;

type ExportOptions = {
  onProgress?: (value: number) => void;
};

interface ExportJob {
  metadata: FontMetadata;
  glyphs: GlyphExportData[];
  resolve: (value: FontExportResult) => void;
  reject: (reason: FontExportError) => void;
  onProgress?: (value: number) => void;
}

const exportQueue: ExportJob[] = [];
let isProcessingQueue = false;

const getWeightAndWidth = (styleName: string) => {
    const s = styleName.toLowerCase();
    let weight = 400; // Regular
    let width = 5;    // Medium (Normal)

    // Weight Map
    if (s.includes('thin')) weight = 100;
    else if (s.includes('extra') && s.includes('light')) weight = 200;
    else if (s.includes('light')) weight = 300;
    else if (s.includes('medium')) weight = 500;
    else if (s.includes('semi') && s.includes('bold')) weight = 600;
    else if (s.includes('bold')) weight = 700;
    else if (s.includes('extra') && s.includes('bold')) weight = 800;
    else if (s.includes('black') || s.includes('heavy')) weight = 900;

    // Width Map
    if (s.includes('condensed') || s.includes('narrow')) width = 3;
    else if (s.includes('expanded') || s.includes('wide')) width = 7;
    return { weight, width };
};

export const exportFont = (metadata: FontMetadata, glyphs: GlyphData[], options: ExportOptions = {}): Promise<FontExportResult> => {
  return new Promise((resolve, reject) => {
    exportQueue.push({
      metadata: snapshotMetadata(metadata),
      glyphs: snapshotGlyphs(glyphs),
      resolve,
      reject,
      onProgress: options.onProgress,
    });
    processExportQueue();
  });
};

const processExportQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (exportQueue.length) {
    const job = exportQueue.shift();
    if (!job) break;
    try {
      const result = await runExport(job.metadata, job.glyphs, job.onProgress);
      job.resolve(result);
    } catch (error) {
      const normalized =
        error instanceof FontExportError
          ? error
          : new FontExportError('UNKNOWN', 'Failed to export font.', error);
      job.reject(normalized);
    }
  }

  isProcessingQueue = false;
};
const snapshotMetadata = (metadata: FontMetadata): FontMetadata => ({
  ...metadata,
  styleName: metadata.styleName || 'Regular',
  familyName: metadata.familyName || 'font',
  kerning: { ...(metadata.kerning || {}) }
});

const snapshotGlyphs = (glyphs: GlyphData[]): GlyphExportData[] =>
  glyphs.map(g => ({
    char: g.char,
    name: g.name,
    unicode: g.unicode,
    pathData: g.pathData,
    svgPathData: g.svgPathData,
    advanceWidth: g.advanceWidth,
    leftSideBearing: g.leftSideBearing,
    baselineOffset: g.baselineOffset,
    scale: g.scale,
    svgViewBox: g.svgViewBox,
    groups: {
      left: g.groups?.left || '',
      right: g.groups?.right || ''
    },
    kerningBias: g.kerningBias ?? 0
  }));

const runExport = async (metadata: FontMetadata, glyphs: GlyphExportData[], onProgress?: (value: number) => void): Promise<FontExportResult> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new FontExportError('ENV_UNAVAILABLE', 'Exportação disponível apenas no navegador.');
  }

  try {
    // Sanitize all glyph paths before export
    const sanitizeResults = sanitizeGlyphPaths(glyphs);
    const sanitizedGlyphs = applySanitizedPaths(glyphs, sanitizeResults);
    glyphs = sanitizedGlyphs;
    const notdefGlyph = new opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 500,
      path: new opentype.Path()
    });

    const fontGlyphs = [notdefGlyph];
    const globalTracking = metadata.tracking ?? 0;

    const drawable = glyphs.filter(g => g.pathData && g.pathData.trim());
    const totalDrawn = drawable.length;
    let processed = 0;

    drawable.forEach(g => {
      const rawPath = (g.svgPathData && g.svgPathData.trim()) ? g.svgPathData : g.pathData;
      const path = parseSVGPathToOpenTypePath(
        rawPath,
        g.scale,
        g.leftSideBearing,
        g.baselineOffset,
        metadata.ascender,
        g.svgViewBox,
        metadata.unitsPerEm,
        metadata.baselineShift ?? 0
      );
      fontGlyphs.push(
        new opentype.Glyph({
          name: g.name,
          unicode: g.unicode,
          advanceWidth: g.advanceWidth + globalTracking,
          leftSideBearing: g.leftSideBearing ?? 0,
          path
        })
      );

      processed += 1;
      if (onProgress && totalDrawn > 0) {
        onProgress(Math.min(1, processed / totalDrawn));
      }
    });

    const drawnGlyphs = fontGlyphs.length - 1;
    if (drawnGlyphs <= 0) {
      throw new FontExportError('EMPTY_FONT', 'No glyphs drawn for this weight.');
    }

    const styleLabel = metadata.styleName || 'Regular';
    const familyLabel = metadata.familyName || 'font';
    const { weight, width } = getWeightAndWidth(styleLabel);

    const font = new opentype.Font({
      familyName: familyLabel,
      styleName: styleLabel,
      postScriptName: `${familyLabel.replace(/\s+/g, '')}-${styleLabel.replace(/\s+/g, '')}`,
      unitsPerEm: metadata.unitsPerEm || 1000,
      ascender: metadata.ascender,
      descender: metadata.descender,
      glyphs: fontGlyphs,
      usWeightClass: weight,
      usWidthClass: width
    });

    const rightGroupMap: Record<string, string[]> = {};
    const leftGroupMap: Record<string, string[]> = {};
    const glyphBiasMap = new Map<string, number>();

    glyphs.forEach(g => {
      const bias = g.kerningBias ?? 0;
      glyphBiasMap.set(g.char, bias);

      if (!rightGroupMap[g.char]) rightGroupMap[g.char] = [];
      rightGroupMap[g.char].push(g.char);

      if (!leftGroupMap[g.char]) leftGroupMap[g.char] = [];
      leftGroupMap[g.char].push(g.char);

      if (g.groups.right) {
        if (!rightGroupMap[g.groups.right]) rightGroupMap[g.groups.right] = [];
        rightGroupMap[g.groups.right].push(g.char);
      }
      if (g.groups.left) {
        if (!leftGroupMap[g.groups.left]) leftGroupMap[g.groups.left] = [];
        leftGroupMap[g.groups.left].push(g.char);
      }
    });

    const kerningPairs = (font as unknown as { kerningPairs: Record<number, Record<number, number>> }).kerningPairs ||
      ((font as unknown as { kerningPairs: Record<number, Record<number, number>> }).kerningPairs = {});

    const resolveGlyphByChar = (char: string) => {
      if (!char) return null;
      const glyphIndex = font.charToGlyphIndex(char);
      if (glyphIndex === null || glyphIndex === undefined) {
        return null;
      }
      try {
        return font.glyphs.get(glyphIndex) || null;
      } catch (err) {
        console.warn('Skipping kerning pair: glyph not resolvable', char, err);
        return null;
      }
    };

    Object.entries(metadata.kerning || {}).forEach(([rawKey, rawVal]) => {
      const pairKey = typeof rawKey === 'string' ? rawKey : String(rawKey ?? '');
      if (pairKey.length < 2) return;

      const charL = pairKey.charAt(0);
      const charR = pairKey.charAt(1);
      if (!charL || !charR) return;

      const val = typeof rawVal === 'number' ? rawVal : Number(rawVal);
      if (!Number.isFinite(val)) return;

      const gL = glyphs.find(g => g.char === charL);
      const gR = glyphs.find(g => g.char === charR);

      if (gL && gR) {
        const groupLName = gL.groups.right || charL;
        const groupRName = gR.groups.left || charR;

        const leftSet = rightGroupMap[groupLName] || [charL];
        const rightSet = leftGroupMap[groupRName] || [charR];

        leftSet.forEach(l => {
          rightSet.forEach(r => {
            const glyphL = resolveGlyphByChar(l);
            const glyphR = resolveGlyphByChar(r);
            if (glyphL && glyphR) {
              const biasOffset = (glyphBiasMap.get(l) ?? 0) + (glyphBiasMap.get(r) ?? 0);
              const finalValue = val + biasOffset;
              if (!kerningPairs[glyphL.index]) kerningPairs[glyphL.index] = {};
              kerningPairs[glyphL.index][glyphR.index] = finalValue;
            } else {
              if (!glyphL) console.warn('Glyph missing for kerning left char:', l);
              if (!glyphR) console.warn('Glyph missing for kerning right char:', r);
            }
          });
        });
      }
    });

    const safeFamily = familyLabel.replace(/\s+/g, '-');
    const safeStyle = styleLabel.replace(/\s+/g, '-');
    const fileName = `${safeFamily}-${safeStyle}.otf`;

    const arrayBuffer = font.toArrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'font/otf' });
    triggerDownload(fileName, blob);

    if (onProgress) onProgress(1);

    return {
      fileName,
      styleName: styleLabel,
      glyphCount: drawnGlyphs
    };
  } catch (error) {
    if (error instanceof FontExportError) {
      throw error;
    }
    console.error('Failed to export font', error);
    throw new FontExportError('UNKNOWN', 'Failed to export font.', error);
  }
};

const triggerDownload = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const parseSVGPathToOpenTypePath = (
  svgPath: string,
  scale: number,
  dx: number,
  dy: number,
  ascender: number,
  svgViewBox?: [number, number, number, number],
  unitsPerEm?: number,
  baselineShift = 0
) => {
  const baselineY = (ascender || 800) + (Number.isFinite(baselineShift) ? baselineShift : 0);
  const safe = (v: number, fallback = 0) => Number.isFinite(v) ? v : fallback;

  // When we have an original viewBox, normalize coordinates to UPM space before applying user offsets/scale.
  const useViewBox = !!(
    svgViewBox &&
    svgViewBox.length === 4 &&
    Number.isFinite(svgViewBox[2]) && Number.isFinite(svgViewBox[3]) &&
    svgViewBox[2] !== 0 && svgViewBox[3] !== 0
  );
  const [minX, minY, vbWidth] = useViewBox ? svgViewBox! : [0, 0, 0];
  const vbHeight = useViewBox ? svgViewBox![3] : 0;
  const baseUpm = unitsPerEm || 1000;
  const viewScaleX = useViewBox ? safe(baseUpm / vbWidth, 1) : 1;
  const viewScaleY = useViewBox ? safe(baseUpm / vbHeight, 1) : 1;

  // Quando temos viewBox, o scale do viewBox já normaliza para UPM
  // O userScale só é usado quando NÃO temos viewBox (path já normalizado no import)
  const userScale = useViewBox ? 1 : (Number.isFinite(scale) ? scale : 1);
  const effectiveScaleX = userScale;
  const effectiveScaleY = userScale;

  const tx = (x: number) => {
    const base = useViewBox ? (x - minX) * viewScaleX : x;
    const offsetX = useViewBox ? 0 : dx;
    return (safe(base, 0) * effectiveScaleX) + offsetX;
  };
  const ty = (y: number) => {
    const base = useViewBox ? (y - minY) * viewScaleY : y;
    const offsetY = useViewBox ? 0 : dy;
    return baselineY - ((safe(base, 0) * effectiveScaleY) + offsetY);
  };

  // High-fidelity path conversion: parse via opentype to keep arcs/H/V intact, then transform points.
  try {
    const source = opentype.Path.fromSVG(svgPath);
    const commands = sanitizeOpenTypeCommands(source.commands);
    const path = new opentype.Path();

    commands.forEach(cmd => {
      const clone = { ...cmd } as any;
      if (clone.x !== undefined && clone.y !== undefined) {
        clone.x = tx(clone.x);
        clone.y = ty(clone.y);
      }
      if (clone.x1 !== undefined && clone.y1 !== undefined) {
        clone.x1 = tx(clone.x1);
        clone.y1 = ty(clone.y1);
      }
      if (clone.x2 !== undefined && clone.y2 !== undefined) {
        clone.x2 = tx(clone.x2);
        clone.y2 = ty(clone.y2);
      }

      switch (clone.type) {
        case 'M': path.moveTo(clone.x, clone.y); break;
        case 'L': path.lineTo(clone.x, clone.y); break;
        case 'C': path.curveTo(clone.x1, clone.y1, clone.x2, clone.y2, clone.x, clone.y); break;
        case 'Q': path.quadraticCurveTo(clone.x1, clone.y1, clone.x, clone.y); break;
        case 'Z': path.close(); break;
        default:
          // opentype already converted H/V/A to absolute curves/lines; ignore unknowns.
          break;
      }
    });

    return path;
  } catch (err) {
    console.warn('Falling back to legacy SVG parser for path', err);
    const fallback = new opentype.Path();
    const tokens = svgPath.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?\d*\.?\d+(?:e[-+]?\d+)?/g);
    if (!tokens) return fallback;

    let index = 0;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let lastCX: number | null = null;
    let lastCY: number | null = null;
    let lastQX: number | null = null;
    let lastQY: number | null = null;
    let currentCommand = '';

    const readNumber = () => Number(tokens[index++]);
    const isCommand = (t: string) => /^[AaCcHhLlMmQqSsTtVvZz]$/.test(t);

    const arcToCubic = (
      x1: number,
      y1: number,
      rx: number,
      ry: number,
      angle: number,
      largeArc: number,
      sweep: number,
      x2: number,
      y2: number
    ): Array<[number, number, number, number, number, number]> => {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const dx2 = (x1 - x2) / 2;
      const dy2 = (y1 - y2) / 2;
      let x1p = cos * dx2 + sin * dy2;
      let y1p = -sin * dx2 + cos * dy2;

      rx = Math.abs(rx);
      ry = Math.abs(ry);

      if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];

      const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lambda > 1) {
        const factor = Math.sqrt(lambda);
        rx *= factor;
        ry *= factor;
      }

      const sign = largeArc === sweep ? -1 : 1;
      const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
      const denom = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
      const coef = denom === 0 ? 0 : sign * Math.sqrt(Math.max(0, num / denom));
      const cxp = (coef * rx * y1p) / ry;
      const cyp = (-coef * ry * x1p) / rx;

      const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
      const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

      const angleBetween = (ux: number, uy: number, vx: number, vy: number) => {
        const dot = ux * vx + uy * vy;
        const mag = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1;
        const sign = ux * vy - uy * vx < 0 ? -1 : 1;
        return sign * Math.acos(Math.min(Math.max(dot / mag, -1), 1));
      };

      const theta = angleBetween(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let delta = angleBetween(
        (x1p - cxp) / rx,
        (y1p - cyp) / ry,
        (-x1p - cxp) / rx,
        (-y1p - cyp) / ry
      );

      if (!sweep && delta > 0) delta -= 2 * Math.PI;
      if (sweep && delta < 0) delta += 2 * Math.PI;

      const segments = Math.ceil(Math.abs(delta / (Math.PI / 2)));
      const deltaSeg = delta / segments;
      const t = (8 / 6) * Math.sin(deltaSeg / 4) ** 2 / Math.sin(deltaSeg / 2);

      const result: Array<[number, number, number, number, number, number]> = [];
      for (let i = 0; i < segments; i++) {
        const angleStart = theta + i * deltaSeg;
        const angleEnd = angleStart + deltaSeg;

        const sinStart = Math.sin(angleStart);
        const cosStart = Math.cos(angleStart);
        const sinEnd = Math.sin(angleEnd);
        const cosEnd = Math.cos(angleEnd);

        const x1Seg = cx + rx * cosStart * cos - ry * sinStart * sin;
        const y1Seg = cy + rx * cosStart * sin + ry * sinStart * cos;
        const x2Seg = cx + rx * cosEnd * cos - ry * sinEnd * sin;
        const y2Seg = cy + rx * cosEnd * sin + ry * sinEnd * cos;

        const dx1 = t * (-rx * sinStart * cos - ry * cosStart * sin);
        const dy1 = t * (-rx * sinStart * sin + ry * cosStart * cos);
        const dx2 = t * (rx * sinEnd * cos + ry * cosEnd * sin);
        const dy2 = t * (rx * sinEnd * sin - ry * cosEnd * cos);

        result.push([x1Seg + dx1, y1Seg + dy1, x2Seg + dx2, y2Seg + dy2, x2Seg, y2Seg]);
      }

      return result;
    };

    const drawCommand = (cmd: string) => {
      const relative = cmd === cmd.toLowerCase();
      const type = cmd.toUpperCase();

      const ensure = (count: number) => index + count <= tokens.length && !isCommand(tokens[index]);

      const pushCurve = (cx1: number, cy1: number, cx2: number, cy2: number, px: number, py: number) => {
        if ([cx1, cy1, cx2, cy2, px, py].some(v => !Number.isFinite(v))) return;
        fallback.curveTo(tx(cx1), ty(cy1), tx(cx2), ty(cy2), tx(px), ty(py));
      };

      const pushLine = (px: number, py: number) => {
        if ([px, py].some(v => !Number.isFinite(v))) return;
        fallback.lineTo(tx(px), ty(py));
      };

      const pushMove = (px: number, py: number) => {
        if ([px, py].some(v => !Number.isFinite(v))) return;
        fallback.moveTo(tx(px), ty(py));
      };

      switch (type) {
        case 'M': {
          let isFirst = true;
          while (ensure(2)) {
            const x = readNumber();
            const y = readNumber();
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            if (isFirst) {
              pushMove(px, py);
              startX = px; startY = py; isFirst = false;
            } else {
              pushLine(px, py);
            }
            lastX = px; lastY = py;
          }
          lastCX = lastCY = lastQX = lastQY = null;
          break;
        }
        case 'L': {
          while (ensure(2)) {
            const x = readNumber();
            const y = readNumber();
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            pushLine(px, py);
            lastX = px; lastY = py;
          }
          lastCX = lastCY = lastQX = lastQY = null;
          break;
        }
        case 'H': {
          while (ensure(1)) {
            const x = readNumber();
            const px = relative ? lastX + x : x;
            pushLine(px, lastY);
            lastX = px;
          }
          lastCX = lastCY = lastQX = lastQY = null;
          break;
        }
        case 'V': {
          while (ensure(1)) {
            const y = readNumber();
            const py = relative ? lastY + y : y;
            pushLine(lastX, py);
            lastY = py;
          }
          lastCX = lastCY = lastQX = lastQY = null;
          break;
        }
        case 'C': {
          while (ensure(6)) {
            const x1 = readNumber();
            const y1 = readNumber();
            const x2 = readNumber();
            const y2 = readNumber();
            const x = readNumber();
            const y = readNumber();
            const cx1 = relative ? lastX + x1 : x1;
            const cy1 = relative ? lastY + y1 : y1;
            const cx2 = relative ? lastX + x2 : x2;
            const cy2 = relative ? lastY + y2 : y2;
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            pushCurve(cx1, cy1, cx2, cy2, px, py);
            lastCX = cx2; lastCY = cy2; lastQX = lastQY = null; lastX = px; lastY = py;
          }
          break;
        }
        case 'S': {
          while (ensure(4)) {
            const x2 = readNumber();
            const y2 = readNumber();
            const x = readNumber();
            const y = readNumber();
            const refX = (lastCX !== null && lastCY !== null) ? (2 * lastX - lastCX) : lastX;
            const refY = (lastCX !== null && lastCY !== null) ? (2 * lastY - lastCY) : lastY;
            const cx2 = relative ? lastX + x2 : x2;
            const cy2 = relative ? lastY + y2 : y2;
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            pushCurve(refX, refY, cx2, cy2, px, py);
            lastCX = cx2; lastCY = cy2; lastQX = lastQY = null; lastX = px; lastY = py;
          }
          break;
        }
        case 'Q': {
          while (ensure(4)) {
            const x1 = readNumber();
            const y1 = readNumber();
            const x = readNumber();
            const y = readNumber();
            const cx1 = relative ? lastX + x1 : x1;
            const cy1 = relative ? lastY + y1 : y1;
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            if ([cx1, cy1, px, py].every(Number.isFinite)) {
              fallback.quadraticCurveTo(tx(cx1), ty(cy1), tx(px), ty(py));
            }
            lastQX = cx1; lastQY = cy1; lastCX = lastCY = null; lastX = px; lastY = py;
          }
          break;
        }
        case 'T': {
          while (ensure(2)) {
            const x = readNumber();
            const y = readNumber();
            const cx1 = (lastQX !== null && lastQY !== null) ? (2 * lastX - lastQX) : lastX;
            const cy1 = (lastQX !== null && lastQY !== null) ? (2 * lastY - lastQY) : lastY;
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            if ([cx1, cy1, px, py].every(Number.isFinite)) {
              fallback.quadraticCurveTo(tx(cx1), ty(cy1), tx(px), ty(py));
            }
            lastQX = cx1; lastQY = cy1; lastCX = lastCY = null; lastX = px; lastY = py;
          }
          break;
        }
        case 'A': {
          while (ensure(7)) {
            const rx = readNumber();
            const ry = readNumber();
            const angle = readNumber();
            const largeArc = readNumber();
            const sweep = readNumber();
            const x = readNumber();
            const y = readNumber();
            const px = relative ? lastX + x : x;
            const py = relative ? lastY + y : y;
            const curves = arcToCubic(lastX, lastY, rx, ry, angle, largeArc, sweep, px, py);
            curves.forEach(([cx1, cy1, cx2, cy2, ex, ey]) => {
              pushCurve(cx1, cy1, cx2, cy2, ex, ey);
            });
            lastCX = curves.length ? curves[curves.length - 1][2] : null;
            lastCY = curves.length ? curves[curves.length - 1][3] : null;
            lastQX = lastQY = null; lastX = px; lastY = py;
          }
          break;
        }
        case 'Z': {
          fallback.close();
          lastX = startX; lastY = startY;
          lastCX = lastCY = lastQX = lastQY = null;
          break;
        }
      }
    };

    while (index < tokens.length) {
      const token = tokens[index];
      if (isCommand(token)) {
        currentCommand = token;
        index += 1;
      } else if (!currentCommand) {
        // Invalid stream, stop early
        break;
      }

      if (currentCommand) {
        drawCommand(currentCommand);
      }
    }

    return fallback;
  }
};
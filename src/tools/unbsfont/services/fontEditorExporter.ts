/**
 * Font Exporter using fonteditor-core
 * Motor alternativo de conversão SVG → TTF com alta fidelidade de paths.
 * Usa conversão de curvas cúbicas para quadráticas com subdivisão adaptativa.
 */

import { Font } from 'fonteditor-core';
import { GlyphData, FontMetadata } from '../types';

// ============================================================================
// NAME RECORDS (OpenType `name` table) — single source of truth
// ============================================================================

const RIBBI_STYLES = new Set(['Regular', 'Italic', 'Bold', 'Bold Italic']);

/**
 * Apply OpenType name table records consistently. When the style is non-RIBBI
 * (i.e. not Regular / Italic / Bold / Bold Italic), also fills the Preferred
 * Family (ID 16) and Preferred Subfamily (ID 17) records so apps like Word,
 * Figma and the OS group all weights under a single family.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyNameRecords = (ttfData: any, metadata: FontMetadata) => {
  const family = metadata.familyName || 'CustomFont';
  const style = metadata.styleName || 'Regular';
  const compactFamily = family.replace(/\s+/g, '');
  const compactStyle = style.replace(/\s+/g, '');

  ttfData.name.fontFamily = family;
  ttfData.name.fontSubFamily = style;
  ttfData.name.fullName = `${family} ${style}`;
  ttfData.name.postScriptName = `${compactFamily}-${compactStyle}`;
  ttfData.name.version = `Version ${metadata.version || '1.0'}`;

  // For non-standard styles (Light, Medium, Black, Thin, etc.), expose the
  // preferred family/subfamily so the OS keeps the family grouped.
  if (!RIBBI_STYLES.has(style)) {
    ttfData.name.preferredFamily = family;
    ttfData.name.preferredSubFamily = style;
  } else {
    delete ttfData.name.preferredFamily;
    delete ttfData.name.preferredSubFamily;
  }
};

interface Point {
  x: number;
  y: number;
  onCurve: boolean;
}

interface FontEditorGlyph {
  name: string;
  unicode?: number[];
  advanceWidth: number;
  leftSideBearing: number;
  xMin?: number;
  yMin?: number;
  xMax?: number;
  yMax?: number;
  contours: Point[][];
}

// ============================================================================
// CONVERSÃO CÚBICA → QUADRÁTICA DE ALTA FIDELIDADE
// ============================================================================

/**
 * Calcula ponto em uma curva Bézier cúbica no parâmetro t
 */
const cubicBezierPoint = (
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  t: number
): [number, number] => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  
  return [
    mt3 * p0x + 3 * mt2 * t * p1x + 3 * mt * t2 * p2x + t3 * p3x,
    mt3 * p0y + 3 * mt2 * t * p1y + 3 * mt * t2 * p2y + t3 * p3y
  ];
};

/**
 * Subdivide uma curva cúbica em duas no parâmetro t usando de Casteljau
 */
const subdivideCubic = (
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  t: number
): [[number, number, number, number, number, number, number, number],
    [number, number, number, number, number, number, number, number]] => {
  
  const q0x = p0x + t * (p1x - p0x);
  const q0y = p0y + t * (p1y - p0y);
  const q1x = p1x + t * (p2x - p1x);
  const q1y = p1y + t * (p2y - p1y);
  const q2x = p2x + t * (p3x - p2x);
  const q2y = p2y + t * (p3y - p2y);
  
  const r0x = q0x + t * (q1x - q0x);
  const r0y = q0y + t * (q1y - q0y);
  const r1x = q1x + t * (q2x - q1x);
  const r1y = q1y + t * (q2y - q1y);
  
  const sx = r0x + t * (r1x - r0x);
  const sy = r0y + t * (r1y - r0y);
  
  return [
    [p0x, p0y, q0x, q0y, r0x, r0y, sx, sy],
    [sx, sy, r1x, r1y, q2x, q2y, p3x, p3y]
  ];
};

/**
 * Calcula o erro máximo entre uma curva cúbica e sua aproximação quadrática
 */
const maxCubicQuadraticError = (
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number
): number => {
  // Ponto de controle da quadrática aproximada (interseção das tangentes)
  const qx = (3 * p1x + 3 * p2x - p0x - p3x) / 4;
  const qy = (3 * p1y + 3 * p2y - p0y - p3y) / 4;
  
  let maxErr = 0;
  // Amostra em múltiplos pontos para encontrar erro máximo
  for (let i = 1; i < 20; i++) {
    const t = i / 20;
    const [cx, cy] = cubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, t);
    
    // Ponto na quadrática: B(t) = (1-t)²P0 + 2(1-t)tQ + t²P3
    const mt = 1 - t;
    const qPx = mt * mt * p0x + 2 * mt * t * qx + t * t * p3x;
    const qPy = mt * mt * p0y + 2 * mt * t * qy + t * t * p3y;
    
    const dx = cx - qPx;
    const dy = cy - qPy;
    const err = Math.sqrt(dx * dx + dy * dy);
    if (err > maxErr) maxErr = err;
  }
  
  return maxErr;
};

/**
 * Converte uma curva Bézier cúbica para uma ou mais quadráticas com alta fidelidade.
 * Usa subdivisão adaptativa quando o erro excede a tolerância.
 * 
 * @param tolerance Erro máximo permitido (em unidades de fonte, tipicamente 0.5-2)
 */
const cubicToQuadratics = (
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  tolerance: number = 0.5,
  depth: number = 0
): Array<{ qx: number; qy: number; ex: number; ey: number }> => {
  // Limite de recursão para evitar loops infinitos
  if (depth > 12) {
    const qx = (3 * p1x + 3 * p2x - p0x - p3x) / 4;
    const qy = (3 * p1y + 3 * p2y - p0y - p3y) / 4;
    return [{ qx, qy, ex: p3x, ey: p3y }];
  }
  
  const error = maxCubicQuadraticError(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);
  
  if (error <= tolerance) {
    // Erro aceitável, retorna uma única quadrática
    const qx = (3 * p1x + 3 * p2x - p0x - p3x) / 4;
    const qy = (3 * p1y + 3 * p2y - p0y - p3y) / 4;
    return [{ qx, qy, ex: p3x, ey: p3y }];
  }
  
  // Subdivide no meio e processa recursivamente
  const [left, right] = subdivideCubic(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, 0.5);
  
  const leftQuads = cubicToQuadratics(
    left[0], left[1], left[2], left[3], left[4], left[5], left[6], left[7],
    tolerance, depth + 1
  );
  
  const rightQuads = cubicToQuadratics(
    right[0], right[1], right[2], right[3], right[4], right[5], right[6], right[7],
    tolerance, depth + 1
  );
  
  return [...leftQuads, ...rightQuads];
};

// ============================================================================
// CONVERSÃO SVG PATH → CONTORNOS TRUETYPE
// ============================================================================

/**
 * Converte path SVG 'd' para array de contornos no formato TrueType.
 * Usa curvas quadráticas nativas com alta fidelidade.
 */
const svgPathToContours = (
  d: string,
  scale: number,
  offsetX: number,
  offsetY: number,
  flipY: boolean,
  baselineY: number,
  tolerance: number = 0.5
): Point[][] => {
  if (!d || !d.trim()) return [];

  const contours: Point[][] = [];
  let currentContour: Point[] = [];

  // Parse SVG path commands
  const tokens = d.match(/([MmLlHhVvCcSsQqTtAaZz])|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  let i = 0;
  let x = 0, y = 0;
  let startX = 0, startY = 0;
  let lastCmd = '';
  let lastCX = 0, lastCY = 0; // Last control point for S/T commands

  const readNum = () => {
    if (i >= tokens.length) return 0;
    const val = parseFloat(tokens[i]);
    if (!isNaN(val)) i++;
    return isNaN(val) ? 0 : val;
  };

  const isCmd = (t: string) => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(t);

  // Transformação de coordenadas (com precisão máxima, arredonda só no final)
  const tx = (px: number) => px * scale + offsetX;
  const ty = (py: number) => flipY ? baselineY - (py * scale + offsetY) : py * scale + offsetY;

  const addPoint = (px: number, py: number, onCurve: boolean) => {
    currentContour.push({ x: Math.round(tx(px)), y: Math.round(ty(py)), onCurve });
  };

  const addPointRaw = (transformedX: number, transformedY: number, onCurve: boolean) => {
    currentContour.push({ x: Math.round(transformedX), y: Math.round(transformedY), onCurve });
  };

  const closeContour = () => {
    if (currentContour.length > 0) {
      // Remove ponto duplicado no final se igual ao início
      if (currentContour.length > 1) {
        const first = currentContour[0];
        const last = currentContour[currentContour.length - 1];
        if (first.x === last.x && first.y === last.y && first.onCurve && last.onCurve) {
          currentContour.pop();
        }
      }
      if (currentContour.length > 0) {
        contours.push(currentContour);
      }
      currentContour = [];
    }
  };

  // Arc to cubic bezier conversion
  const arcToCubics = (
    x1: number, y1: number,
    rx: number, ry: number,
    angle: number, largeArc: number, sweep: number,
    x2: number, y2: number
  ): number[][] => {
    if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];

    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx2 = (x1 - x2) / 2;
    const dy2 = (y1 - y2) / 2;
    const x1p = cos * dx2 + sin * dy2;
    const y1p = -sin * dx2 + cos * dy2;

    rx = Math.abs(rx);
    ry = Math.abs(ry);

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
      const sn = ux * vy - uy * vx < 0 ? -1 : 1;
      return sn * Math.acos(Math.min(Math.max(dot / mag, -1), 1));
    };

    const theta = angleBetween(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let delta = angleBetween(
      (x1p - cxp) / rx, (y1p - cyp) / ry,
      (-x1p - cxp) / rx, (-y1p - cyp) / ry
    );

    if (!sweep && delta > 0) delta -= 2 * Math.PI;
    if (sweep && delta < 0) delta += 2 * Math.PI;

    const segments = Math.ceil(Math.abs(delta / (Math.PI / 4))); // Mais segmentos para arcos
    const deltaSeg = delta / segments;
    const kappa = (4 / 3) * Math.tan(deltaSeg / 4);

    const result: number[][] = [];
    for (let j = 0; j < segments; j++) {
      const angleStart = theta + j * deltaSeg;
      const angleEnd = angleStart + deltaSeg;

      const sinStart = Math.sin(angleStart);
      const cosStart = Math.cos(angleStart);
      const sinEnd = Math.sin(angleEnd);
      const cosEnd = Math.cos(angleEnd);

      const x1Seg = cx + rx * cosStart * cos - ry * sinStart * sin;
      const y1Seg = cy + rx * cosStart * sin + ry * sinStart * cos;
      const x2Seg = cx + rx * cosEnd * cos - ry * sinEnd * sin;
      const y2Seg = cy + rx * cosEnd * sin + ry * sinEnd * cos;

      const dx1 = kappa * (-rx * sinStart * cos - ry * cosStart * sin);
      const dy1 = kappa * (-rx * sinStart * sin + ry * cosStart * cos);
      const dx2 = kappa * (rx * sinEnd * cos + ry * cosEnd * sin);
      const dy2 = kappa * (rx * sinEnd * sin - ry * cosEnd * cos);

      result.push([x1Seg + dx1, y1Seg + dy1, x2Seg - dx2, y2Seg - dy2, x2Seg, y2Seg]);
    }
    return result;
  };

  /**
   * Processa uma curva cúbica, convertendo para quadráticas de alta fidelidade
   */
  const processCubic = (
    startX: number, startY: number,
    cp1x: number, cp1y: number,
    cp2x: number, cp2y: number,
    endX: number, endY: number
  ) => {
    // Transforma para coordenadas de fonte antes de converter
    const p0x = tx(startX), p0y = ty(startY);
    const p1x = tx(cp1x), p1y = ty(cp1y);
    const p2x = tx(cp2x), p2y = ty(cp2y);
    const p3x = tx(endX), p3y = ty(endY);
    
    // Converte cúbica para quadráticas com subdivisão adaptativa
    const quads = cubicToQuadratics(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, tolerance);
    
    for (const q of quads) {
      // Ponto de controle (off-curve)
      addPointRaw(q.qx, q.qy, false);
      // Ponto final (on-curve)
      addPointRaw(q.ex, q.ey, true);
    }
  };

  while (i < tokens.length) {
    let cmd = tokens[i];

    if (isCmd(cmd)) {
      i++;
    } else {
      // Implicit command repetition
      if (lastCmd === 'M') cmd = 'L';
      else if (lastCmd === 'm') cmd = 'l';
      else cmd = lastCmd;
    }

    const isRel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();

    switch (type) {
      case 'M': {
        closeContour();
        const mx = readNum();
        const my = readNum();
        x = isRel ? x + mx : mx;
        y = isRel ? y + my : my;
        startX = x;
        startY = y;
        addPoint(x, y, true);
        break;
      }
      case 'L': {
        const lx = readNum();
        const ly = readNum();
        x = isRel ? x + lx : lx;
        y = isRel ? y + ly : ly;
        addPoint(x, y, true);
        break;
      }
      case 'H': {
        const hx = readNum();
        x = isRel ? x + hx : hx;
        addPoint(x, y, true);
        break;
      }
      case 'V': {
        const vy = readNum();
        y = isRel ? y + vy : vy;
        addPoint(x, y, true);
        break;
      }
      case 'C': {
        const x1 = isRel ? x + readNum() : readNum();
        const y1 = isRel ? y + readNum() : readNum();
        const x2 = isRel ? x + readNum() : readNum();
        const y2 = isRel ? y + readNum() : readNum();
        const ex = isRel ? x + readNum() : readNum();
        const ey = isRel ? y + readNum() : readNum();
        
        processCubic(x, y, x1, y1, x2, y2, ex, ey);
        
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
        
        processCubic(x, y, refX, refY, x2, y2, ex, ey);
        
        lastCX = x2;
        lastCY = y2;
        x = ex;
        y = ey;
        break;
      }
      case 'Q': {
        // Curva quadrática nativa - perfeita para TrueType!
        const qx = isRel ? x + readNum() : readNum();
        const qy = isRel ? y + readNum() : readNum();
        const qex = isRel ? x + readNum() : readNum();
        const qey = isRel ? y + readNum() : readNum();
        
        addPoint(qx, qy, false);  // Control point
        addPoint(qex, qey, true); // End point
        
        lastCX = qx;
        lastCY = qy;
        x = qex;
        y = qey;
        break;
      }
      case 'T': {
        const refQX = lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't'
          ? 2 * x - lastCX : x;
        const refQY = lastCmd === 'Q' || lastCmd === 'q' || lastCmd === 'T' || lastCmd === 't'
          ? 2 * y - lastCY : y;
        const tex = isRel ? x + readNum() : readNum();
        const tey = isRel ? y + readNum() : readNum();
        
        addPoint(refQX, refQY, false);
        addPoint(tex, tey, true);
        
        lastCX = refQX;
        lastCY = refQY;
        x = tex;
        y = tey;
        break;
      }
      case 'A': {
        const arx = readNum();
        const ary = readNum();
        const angle = readNum();
        const largeArc = readNum();
        const sweep = readNum();
        const aex = isRel ? x + readNum() : readNum();
        const aey = isRel ? y + readNum() : readNum();
        
        // Converte arco para cúbicas, depois para quadráticas
        const cubics = arcToCubics(x, y, arx, ary, angle, largeArc, sweep, aex, aey);
        let prevX = x, prevY = y;
        for (const cubic of cubics) {
          processCubic(prevX, prevY, cubic[0], cubic[1], cubic[2], cubic[3], cubic[4], cubic[5]);
          prevX = cubic[4];
          prevY = cubic[5];
        }
        
        x = aex;
        y = aey;
        break;
      }
      case 'Z': {
        closeContour();
        x = startX;
        y = startY;
        break;
      }
    }
    lastCmd = cmd;
  }

  closeContour();
  return contours;
};

// ============================================================================
// EXPORTAÇÃO DE FONTE
// ============================================================================

/**
 * Exporta fonte usando fonteditor-core com alta fidelidade de curvas.
 */
export const exportFontWithFontEditor = async (
  metadata: FontMetadata,
  glyphs: GlyphData[]
): Promise<ArrayBuffer> => {
  const upm = metadata.unitsPerEm || 1000;
  const ascender = metadata.ascender || 800;
  const descender = metadata.descender || -200;
  const tracking = metadata.tracking || 0;
  const lineGap = metadata.lineGap ?? 200;
  const wordSpacing = metadata.wordSpacing ?? 250;

  // Tolerância de erro para conversão cúbica→quadrática
  // Valor menor = mais fidelidade, mais pontos
  // 0.5 é muito preciso para fontes com UPM 1000
  const curveTolerance = 0.5;

  // Create empty font and get its ttf object
  const font = new Font();
  const ttfData = font.get();

  // Update font metadata
  ttfData.head.unitsPerEm = upm;
  applyNameRecords(ttfData, metadata);
  
  // Métricas verticais (entrelinhas)
  ttfData.hhea.ascent = ascender;
  ttfData.hhea.descent = descender;
  ttfData.hhea.lineGap = lineGap; // Entrelinhas configurável!
  
  ttfData['OS/2'].sTypoAscender = ascender;
  ttfData['OS/2'].sTypoDescender = descender;
  ttfData['OS/2'].sTypoLineGap = lineGap; // Também no OS/2
  ttfData['OS/2'].usWinAscent = ascender;
  ttfData['OS/2'].usWinDescent = Math.abs(descender);

  // Build glyph list
  const fontGlyphs: FontEditorGlyph[] = [];

  // Keep .notdef from empty font
  if (ttfData.glyf && ttfData.glyf.length > 0) {
    fontGlyphs.push(ttfData.glyf[0] as unknown as FontEditorGlyph);
  }
  
  // Adiciona glyph de espaço com largura configurável
  const spaceGlyph: FontEditorGlyph = {
    name: 'space',
    unicode: [32], // ASCII space
    advanceWidth: wordSpacing,
    leftSideBearing: 0,
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    contours: []
  };
  fontGlyphs.push(spaceGlyph);

  // Process each glyph
  for (const g of glyphs) {
    // Pula o espaço pois já adicionamos com largura configurada
    if (g.char === ' ' || g.unicode === 32) continue;
    
    const pathD = (g.svgPathData ?? g.pathData ?? '').trim();
    if (!pathD) continue;

    // Estratégia de scale:
    // - Se temos svgViewBox: usar scale baseado no viewBox (normaliza para UPM)
    //   O svgPathData + svgViewBox já contém a informação completa do glyph original
    // - Sem svgViewBox: usar o g.scale do usuário (path já normalizado para ~700px)
    let scale = 1;
    let offsetX = g.leftSideBearing ?? 0;
    let offsetY = 0;
    let baselineY = ascender;

    if (g.svgViewBox && g.svgViewBox[3] > 0) {
      const [vbX, vbY, vbW, vbH] = g.svgViewBox;
      // ViewBox scale normaliza o glyph para UPM
      // svgViewBox já tem altura normalizada (700), então scale base = upm / vbH
      // O g.scale é o ajuste do usuário por cima disso
      const baseScale = upm / vbH;
      const userScale = g.scale ?? 1;
      scale = baseScale * userScale;
      offsetX = -vbX * scale + (g.leftSideBearing ?? 0);
      offsetY = 0;
      // baselineOffset está em unidades do editor (altura ~700)
      // No transform SVG: translate(x, baselineOffset) scale(scale) - offset é pré-scale
      // Convertemos para UPM usando baseScale (não userScale)
      const baseOffset = (g.baselineOffset ?? 0) * baseScale;
      baselineY = (vbY + vbH) * scale - baseOffset;
    } else {
      // Sem viewBox, usar o scale do usuário (path normalizado para ~700px no import)
      scale = g.scale ?? 1;
    }

    const contours = svgPathToContours(pathD, scale, offsetX, offsetY, true, baselineY, curveTolerance);
    
    if (contours.length === 0) continue;

    // Calculate bounding box
    let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
    for (const contour of contours) {
      for (const pt of contour) {
        if (pt.x < xMin) xMin = pt.x;
        if (pt.y < yMin) yMin = pt.y;
        if (pt.x > xMax) xMax = pt.x;
        if (pt.y > yMax) yMax = pt.y;
      }
    }

    fontGlyphs.push({
      name: g.name || g.char,
      unicode: [g.unicode],
      advanceWidth: Math.round((g.advanceWidth ?? 600) + tracking),
      leftSideBearing: Math.round(g.leftSideBearing ?? 0),
      xMin: Math.round(xMin === Infinity ? 0 : xMin),
      yMin: Math.round(yMin === Infinity ? 0 : yMin),
      xMax: Math.round(xMax === -Infinity ? 0 : xMax),
      yMax: Math.round(yMax === -Infinity ? 0 : yMax),
      contours
    });
  }

  // Set glyphs (using type assertion since fonteditor-core types are incomplete)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ttfData as any).glyf = fontGlyphs;

  // Update font with new data
  font.set(ttfData);

  // Export as TTF buffer
  const buffer = font.write({
    type: 'ttf',
    hinting: true
  });

  return buffer as ArrayBuffer;
};

// ============================================================================
// KERNING PAIR TYPE (para evitar dependência circular)
// ============================================================================
interface KerningPairInput {
  left: string;
  right: string;
  value: number;
}

/**
 * Exporta fonte com tabela de kerning incluída.
 * O kerning é adicionado via tabela 'kern' do OpenType.
 */
export const exportFontWithKerning = async (
  metadata: FontMetadata,
  glyphs: GlyphData[],
  kerningPairs: KerningPairInput[]
): Promise<ArrayBuffer> => {
  // Primeiro exporta a fonte base
  const upm = metadata.unitsPerEm || 1000;
  const ascender = metadata.ascender || 800;
  const descender = metadata.descender || -200;
  const tracking = metadata.tracking || 0;
  const lineGap = metadata.lineGap ?? 200;
  const wordSpacing = metadata.wordSpacing ?? 250;
  const curveTolerance = 0.5;

  const font = new Font();
  const ttfData = font.get();

  // Update font metadata
  ttfData.head.unitsPerEm = upm;
  applyNameRecords(ttfData, metadata);
  
  ttfData.hhea.ascent = ascender;
  ttfData.hhea.descent = descender;
  ttfData.hhea.lineGap = lineGap;
  
  ttfData['OS/2'].sTypoAscender = ascender;
  ttfData['OS/2'].sTypoDescender = descender;
  ttfData['OS/2'].sTypoLineGap = lineGap;
  ttfData['OS/2'].usWinAscent = ascender;
  ttfData['OS/2'].usWinDescent = Math.abs(descender);

  const fontGlyphs: FontEditorGlyph[] = [];

  if (ttfData.glyf && ttfData.glyf.length > 0) {
    fontGlyphs.push(ttfData.glyf[0] as unknown as FontEditorGlyph);
  }
  
  const spaceGlyph: FontEditorGlyph = {
    name: 'space',
    unicode: [32],
    advanceWidth: wordSpacing,
    leftSideBearing: 0,
    xMin: 0, yMin: 0, xMax: 0, yMax: 0,
    contours: []
  };
  fontGlyphs.push(spaceGlyph);

  // Mapa de char para índice no glyf array (para kerning)
  const charToGlyphIndex = new Map<string, number>();
  charToGlyphIndex.set(' ', 1); // space é índice 1

  for (const g of glyphs) {
    if (g.char === ' ' || g.unicode === 32) continue;
    
    const pathD = (g.svgPathData ?? g.pathData ?? '').trim();
    if (!pathD) continue;

    // Estratégia de scale (igual ao exportTTF acima):
    // - Se temos svgViewBox: usar scale baseado no viewBox (normaliza para UPM)
    // - Sem svgViewBox: usar o g.scale do usuário
    let scale = 1;
    let offsetX = g.leftSideBearing ?? 0;
    let offsetY = 0;
    let baselineY = ascender;

    if (g.svgViewBox && g.svgViewBox[3] > 0) {
      const [vbX, vbY, vbW, vbH] = g.svgViewBox;
      // ViewBox scale normaliza o glyph para UPM
      // svgViewBox já tem altura normalizada (700), então scale base = upm / vbH
      // O g.scale é o ajuste do usuário por cima disso
      const baseScale = upm / vbH;
      const userScale = g.scale ?? 1;
      scale = baseScale * userScale;
      offsetX = -vbX * scale + (g.leftSideBearing ?? 0);
      offsetY = 0;
      // baselineOffset está em unidades do editor (altura ~700)
      // No transform SVG: translate(x, baselineOffset) scale(scale) - offset é pré-scale
      // Convertemos para UPM usando baseScale (não userScale)
      const baseOffset = (g.baselineOffset ?? 0) * baseScale;
      baselineY = (vbY + vbH) * scale - baseOffset;
    } else {
      // Sem viewBox, usar o scale do usuário
      scale = g.scale ?? 1;
    }

    const contours = svgPathToContours(pathD, scale, offsetX, offsetY, true, baselineY, curveTolerance);
    
    if (contours.length === 0) continue;

    let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
    for (const contour of contours) {
      for (const pt of contour) {
        if (pt.x < xMin) xMin = pt.x;
        if (pt.y < yMin) yMin = pt.y;
        if (pt.x > xMax) xMax = pt.x;
        if (pt.y > yMax) yMax = pt.y;
      }
    }

    // Guardar índice do glifo
    charToGlyphIndex.set(g.char, fontGlyphs.length);

    fontGlyphs.push({
      name: g.name || g.char,
      unicode: [g.unicode],
      advanceWidth: Math.round((g.advanceWidth ?? 600) + tracking),
      leftSideBearing: Math.round(g.leftSideBearing ?? 0),
      xMin: Math.round(xMin === Infinity ? 0 : xMin),
      yMin: Math.round(yMin === Infinity ? 0 : yMin),
      xMax: Math.round(xMax === -Infinity ? 0 : xMax),
      yMax: Math.round(yMax === -Infinity ? 0 : yMax),
      contours
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ttfData as any).glyf = fontGlyphs;

  // =========================================================================
  // ADICIONAR TABELA KERN
  // =========================================================================
  if (kerningPairs.length > 0) {
    // Converter pares de caracteres para pares de índices de glifo
    const kernSubtable: Array<{ left: number; right: number; value: number }> = [];
    
    for (const pair of kerningPairs) {
      const leftIdx = charToGlyphIndex.get(pair.left);
      const rightIdx = charToGlyphIndex.get(pair.right);
      
      // Só adiciona se ambos os glifos existem na fonte
      if (leftIdx !== undefined && rightIdx !== undefined) {
        kernSubtable.push({
          left: leftIdx,
          right: rightIdx,
          value: Math.round(pair.value)
        });
      }
    }

    if (kernSubtable.length > 0) {
      // Estrutura da tabela kern para fonteditor-core
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ttfData as any).kern = {
        version: 0,
        subtables: [{
          format: 0,
          coverage: {
            horizontal: true,
            minimum: false,
            crossStream: false,
            override: false
          },
          pairs: kernSubtable.reduce((acc, pair) => {
            if (!acc[pair.left]) acc[pair.left] = {};
            acc[pair.left][pair.right] = pair.value;
            return acc;
          }, {} as Record<number, Record<number, number>>)
        }]
      };
    }
  }

  font.set(ttfData);

  const buffer = font.write({
    type: 'ttf',
    hinting: true
  });

  return buffer as ArrayBuffer;
};

/**
 * Download helper
 */
export const downloadFontEditorFont = async (
  metadata: FontMetadata,
  glyphs: GlyphData[]
): Promise<{ fileName: string; glyphCount: number }> => {
  const buffer = await exportFontWithFontEditor(metadata, glyphs);

  const safeFamily = (metadata.familyName || 'font').replace(/\s+/g, '-');
  const safeStyle = (metadata.styleName || 'Regular').replace(/\s+/g, '-');
  const fileName = `${safeFamily}-${safeStyle}.ttf`;

  const blob = new Blob([buffer], { type: 'font/ttf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  const glyphCount = glyphs.filter(g => (g.svgPathData ?? g.pathData ?? '').trim()).length;
  return { fileName, glyphCount };
};

/**
 * Download helper com kerning
 */
export const downloadFontEditorFontWithKerning = async (
  metadata: FontMetadata,
  glyphs: GlyphData[],
  kerningPairs: KerningPairInput[]
): Promise<{ fileName: string; glyphCount: number; kerningCount: number }> => {
  const buffer = await exportFontWithKerning(metadata, glyphs, kerningPairs);

  const safeFamily = (metadata.familyName || 'font').replace(/\s+/g, '-');
  const safeStyle = (metadata.styleName || 'Regular').replace(/\s+/g, '-');
  const fileName = `${safeFamily}-${safeStyle}.ttf`;

  const blob = new Blob([buffer], { type: 'font/ttf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  const glyphCount = glyphs.filter(g => (g.svgPathData ?? g.pathData ?? '').trim()).length;
  return { fileName, glyphCount, kerningCount: kerningPairs.length };
};

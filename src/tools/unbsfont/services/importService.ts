import { GlyphData, GlyphComponent } from "../types";

// Standard Glyph Name to Character Map
export const GLYPH_NAME_MAP: Record<string, string> = {
    'space': ' ', 'period': '.', 'comma': ',', 'colon': ':', 'semicolon': ';',
    'exclam': '!', 'question': '?', 'hyphen': '-', 'underscore': '_',
    'equal': '=', 'plus': '+', 'asterisk': '*', 'numbersign': '#',
    'slash': '/', 'backslash': '\\', 'bar': '|', 'at': '@',
    'ampersand': '&', 'dollar': '$', 'percent': '%',
    'parenleft': '(', 'parenright': ')', 'bracketleft': '[', 'bracketright': ']',
    'braceleft': '{', 'braceright': '}', 'less': '<', 'greater': '>',
    'quotedbl': '"', 'quotesingle': "'", 'grave': '`', 'asciitilde': '~',
    'circumflex': '^', 'acute': '´', 'dieresis': '¨', 'cedilla': '¸',
    'copyright': '©', 'registered': '®', 'trademark': '™', 'degree': '°', 'bullet': '•'
};

interface ExtractedPath {
    d: string;
    bbox: DOMRect;
    id: string;
}

const elementToPathD = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const getAttr = (n: string) => parseFloat(el.getAttribute(n) || "0");
  
  if (tag === 'path') return el.getAttribute('d') || "";
  
  if (tag === 'rect') {
    const x = getAttr('x'), y = getAttr('y'), w = getAttr('width'), h = getAttr('height');
    return `M${x} ${y}H${x+w}V${y+h}H${x}Z`; 
  }
  
  if (tag === 'circle') {
    const cx = getAttr('cx'), cy = getAttr('cy'), r = getAttr('r');
    return `M${cx-r} ${cy}A${r} ${r} 0 1 0 ${cx+r} ${cy}A${r} ${r} 0 1 0 ${cx-r} ${cy}Z`;
  }
  
  if (tag === 'ellipse') {
    const cx = getAttr('cx'), cy = getAttr('cy'), rx = getAttr('rx'), ry = getAttr('ry');
    return `M${cx-rx} ${cy}A${rx} ${ry} 0 1 0 ${cx+rx} ${cy}A${rx} ${ry} 0 1 0 ${cx-rx} ${cy}Z`;
  }
  
  if (tag === 'line') {
    const x1 = getAttr('x1'), y1 = getAttr('y1'), x2 = getAttr('x2'), y2 = getAttr('y2');
    return `M${x1} ${y1}L${x2} ${y2}`;
  }
  
  if (tag === 'polygon' || tag === 'polyline') {
    const points = el.getAttribute('points');
    if (!points) return "";
    const pts = points.trim().split(/[\s,]+/).map(Number);
    if (pts.length < 2) return "";
    let d = `M${pts[0]} ${pts[1]}`;
    for (let i = 2; i < pts.length; i += 2) d += `L${pts[i]} ${pts[i+1]}`;
    if (tag === 'polygon') d += "Z";
    return d;
  }
  
  return "";
};

/**
 * Processes a single SVG file content containing multiple glyphs.
 */
export const processSVGSheet = (svgString: string, targetGlyphs: GlyphData[]): Map<string, Partial<GlyphData>> => {
    const extracted = collectExtractedPaths(svgString);

    const result = new Map<string, Partial<GlyphData>>();

    // Strategy 1: ID Match
    let idMatches = 0;
    const unmatchedItems: ExtractedPath[] = [];

    extracted.forEach((item) => {
        let matched = false;
        if (item.id) {
            let cleanId = item.id.replace(/_/g, '');
            
            // Check Map for Names (e.g., 'period' -> '.')
            if (GLYPH_NAME_MAP[cleanId.toLowerCase()]) {
                cleanId = GLYPH_NAME_MAP[cleanId.toLowerCase()];
            } else {
                cleanId = cleanId.toUpperCase();
            }

            const target = targetGlyphs.find(g => {
                if (g.char === item.id) return true;
                if (g.char === cleanId) return true; // Direct match (e.g. '.')
                if (g.char.toUpperCase() === cleanId) return true;
                if (`GLYPH${g.char}`.toUpperCase() === cleanId) return true;
                if (`UNI${g.unicode.toString(16).toUpperCase().padStart(4, '0')}` === cleanId) return true;
                return false;
            });

            if (target) {
                const normalized = normalizePathData(item.d, item.bbox);
                result.set(target.char, normalized);
                idMatches++;
                matched = true;
            }
        }
        
        if (!matched) {
            unmatchedItems.push(item);
        }
    });

    if (idMatches > 0) return result;

    // Strategy 2: Spatial Sorting
    unmatchedItems.sort((a, b) => {
        const ay = a.bbox.y + a.bbox.height / 2;
        const by = b.bbox.y + b.bbox.height / 2;
        const rowHeight = Math.max(a.bbox.height, b.bbox.height);
        
        if (Math.abs(ay - by) > rowHeight * 0.5) return ay - by; 
        return a.bbox.x - b.bbox.x; 
    });

    // FILTER OUT SPACE
    const visualTargets = targetGlyphs.filter(g => g.char !== ' ');

    unmatchedItems.forEach((item, index) => {
        if (index < visualTargets.length) {
            const normalized = normalizePathData(item.d, item.bbox);
            result.set(visualTargets[index].char, normalized);
        }
    });

    return result;
};

// --- Helpers ---

// Calculate exact BBox of a path string (Geometric center)
export const measurePath = (d: string): { x: number, y: number, width: number, height: number } => {
    const points = flattenPath(d, 4);
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        if(p.x < minX) minX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.x > maxX) maxX = p.x;
        if(p.y > maxY) maxY = p.y;
    });
    
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
};

const getElementId = (el: SVGElement): string => {
    let id = el.id || el.getAttribute('id') || "";
    if (!id) id = el.getAttribute('data-name') || "";
    if (!id) id = el.getAttribute('inkscape:label') || "";
    if (!id) id = el.getAttribute('name') || "";
    return id;
};

const getCombinedBBox = (bboxes: DOMRect[]): DOMRect => {
    if (bboxes.length === 0) return new DOMRect(0,0,0,0);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    bboxes.forEach(b => {
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.width > maxX) maxX = b.x + b.width;
        if (b.y + b.height > maxY) maxY = b.y + b.height;
    });
    return new DOMRect(minX, minY, maxX - minX, maxY - minY);
};

const getStrokeWidth = (el: SVGElement): number => {
    let wStr = el.getAttribute('stroke-width');
    if (!wStr && el.style) wStr = el.style.strokeWidth;
    if (wStr) return parseFloat(wStr.replace(/px|em|rem/, '')) || 0;
    const s = el.getAttribute('stroke') || (el.style && el.style.stroke);
    if (s && s !== 'none') return 1; 
    return 0;
};

interface Point { x: number; y: number; }

export const expandStrokeToPath = (d: string, width: number): string => {
    const points = flattenPath(d, 8); 
    if (points.length < 2) return "";
    
    const half = width / 2;
    const outer: Point[] = [];
    const inner: Point[] = [];
    
    const isClosed = dist(points[0], points[points.length-1]) < 0.01;
    if (isClosed) points.pop();
    
    const n = points.length;
    
    const getNormal = (idx: number) => {
        const p1 = points[idx];
        const p2 = points[(idx + 1) % (isClosed ? n : points.length)];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len === 0) return { x: 0, y: 0 };
        return { x: -dy/len, y: dx/len };
    };

    for (let i = 0; i <= (isClosed ? n : n - 1); i++) {
        const p = points[i % n];
        let n1, n2;

        if (!isClosed) {
            if (i === 0) {
                 const normal = getNormal(0);
                 outer.push({ x: p.x + normal.x * half, y: p.y + normal.y * half });
                 inner.push({ x: p.x - normal.x * half, y: p.y - normal.y * half });
                 continue;
            } else if (i === n) {
                 const normal = getNormal(n - 1);
                 outer.push({ x: p.x + normal.x * half, y: p.y + normal.y * half });
                 inner.push({ x: p.x - normal.x * half, y: p.y - normal.y * half });
                 continue;
            }
            n1 = getNormal(i - 1);
            n2 = getNormal(i);
        } else {
            n1 = getNormal((i - 1 + n) % n);
            n2 = getNormal(i % n);
        }

        const miter = getMiterJoin(p, n1, n2, half);
        outer.push(miter.outer);
        inner.push(miter.inner);
    }
    
    let res = "";
    if (outer.length > 0) {
        res += `M ${outer[0].x} ${outer[0].y}`;
        for (let i = 1; i < outer.length; i++) res += ` L ${outer[i].x} ${outer[i].y}`;
        if (isClosed) {
             res += " Z";
             res += ` M ${inner[0].x} ${inner[0].y}`;
             for (let i = inner.length - 1; i > 0; i--) res += ` L ${inner[i].x} ${inner[i].y}`;
             res += " Z";
        } else {
             for (let i = inner.length - 1; i >= 0; i--) res += ` L ${inner[i].x} ${inner[i].y}`;
             res += " Z";
        }
    }
    return res;
};

const getMiterJoin = (p: Point, n1: Point, n2: Point, halfWidth: number) => {
     const dot = n1.x * n2.x + n1.y * n2.y;
     if (dot > 0.999) {
         return {
             outer: { x: p.x + n1.x * halfWidth, y: p.y + n1.y * halfWidth },
             inner: { x: p.x - n1.x * halfWidth, y: p.y - n1.y * halfWidth }
         };
     }
     const tx = n1.x + n2.x;
     const ty = n1.y + n2.y;
     const len = Math.sqrt(tx*tx + ty*ty);
     if (len < 0.1) {
         return {
             outer: { x: p.x + n1.x * halfWidth, y: p.y + n1.y * halfWidth },
             inner: { x: p.x - n1.x * halfWidth, y: p.y - n1.y * halfWidth }
         };
     }
     const k = halfWidth / Math.sqrt((1 + dot) / 2);
     const mx = (tx / len);
     const my = (ty / len);
     return {
         outer: { x: p.x + mx * k, y: p.y + my * k },
         inner: { x: p.x - mx * k, y: p.y - my * k }
     };
};

const dist = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p1.x-p2.x,2) + Math.pow(p1.y-p2.y,2));

const flattenPath = (d: string, samplesPerCurve = 8): Point[] => {
    const absD = absolutizePath(d);
    const tokens = absD.match(/([MLCQZ])|[\-+]?(?:\d+\.?\d*|\.?\d+)(?:e[\-+]?\d+)?/gi) || [];
    const points: Point[] = [];
    let x = 0, y = 0;
    let i = 0;
    while(i < tokens.length) {
        const cmd = tokens[i++];
        switch(cmd) {
            case 'M': case 'L': {
                const nx = parseFloat(tokens[i++]); const ny = parseFloat(tokens[i++]);
                points.push({x: nx, y: ny}); x = nx; y = ny; break;
            }
            case 'C': {
                const c1x = parseFloat(tokens[i++]); const c1y = parseFloat(tokens[i++]);
                const c2x = parseFloat(tokens[i++]); const c2y = parseFloat(tokens[i++]);
                const ex = parseFloat(tokens[i++]); const ey = parseFloat(tokens[i++]);
                for(let t=1; t<=samplesPerCurve; t++) {
                    const step = t/samplesPerCurve;
                    const p = cubicBezier(x, y, c1x, c1y, c2x, c2y, ex, ey, step);
                    points.push({x: p[0], y: p[1]});
                }
                x = ex; y = ey; break;
            }
            case 'Q': {
                const c1x = parseFloat(tokens[i++]); const c1y = parseFloat(tokens[i++]);
                const ex = parseFloat(tokens[i++]); const ey = parseFloat(tokens[i++]);
                 for(let t=1; t<=samplesPerCurve; t++) {
                    const step = t/samplesPerCurve;
                    const p = quadraticBezier(x, y, c1x, c1y, ex, ey, step);
                    points.push({x: p[0], y: p[1]});
                }
                x = ex; y = ey; break;
            }
        }
    }
    return points;
};

const cubicBezier = (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, t: number): [number, number] => {
    const u = 1 - t; const tt = t * t; const uu = u * u; const uuu = uu * u; const ttt = tt * t;
    const x = uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x;
    const y = uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y;
    return [x, y];
};

const quadraticBezier = (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, t: number): [number, number] => {
    const u = 1 - t;
    const x = u * u * p0x + 2 * u * t * p1x + t * t * p2x;
    const y = u * u * p0y + 2 * u * t * p1y + t * t * p2y;
    return [x, y];
};

export { shiftPath, generateCompositePath };

/**
 * Transforma um path SVG aplicando scale e translação
 * Suporta todos os comandos absolutos: M, L, C, Q, Z, H, V, S, T, A
 */
const transformPath = (d: string, scale: number, dx: number, dy: number): string => {
    // Tokenize: comandos e números
    const tokens = d.match(/([MLCQZSHVTA])|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/gi) || [];
    let result = "";
    let i = 0;
    let lastCmd = "";
    
    const readNum = () => {
        if (i >= tokens.length) return 0;
        const val = parseFloat(tokens[i]);
        if (!isNaN(val)) { i++; return val; }
        return 0;
    };
    
    const isCmd = (t: string) => /^[MLCQZSHVTA]$/i.test(t);
    
    while (i < tokens.length) {
        let cmd = tokens[i];
        
        if (isCmd(cmd)) {
            i++;
        } else {
            // Repetição implícita
            if (lastCmd === 'M') cmd = 'L';
            else if (lastCmd) cmd = lastCmd;
            else { i++; continue; }
        }
        
        const upperCmd = cmd.toUpperCase();
        
        switch (upperCmd) {
            case 'M':
            case 'L': {
                const x = readNum() * scale + dx;
                const y = readNum() * scale + dy;
                result += `${upperCmd}${x} ${y} `;
                break;
            }
            case 'H': {
                // Horizontal line - converte para L
                const x = readNum() * scale + dx;
                result += `H${x} `;
                break;
            }
            case 'V': {
                // Vertical line - converte para L
                const y = readNum() * scale + dy;
                result += `V${y} `;
                break;
            }
            case 'C': {
                const x1 = readNum() * scale + dx;
                const y1 = readNum() * scale + dy;
                const x2 = readNum() * scale + dx;
                const y2 = readNum() * scale + dy;
                const x = readNum() * scale + dx;
                const y = readNum() * scale + dy;
                result += `C${x1} ${y1} ${x2} ${y2} ${x} ${y} `;
                break;
            }
            case 'S': {
                const x2 = readNum() * scale + dx;
                const y2 = readNum() * scale + dy;
                const x = readNum() * scale + dx;
                const y = readNum() * scale + dy;
                result += `S${x2} ${y2} ${x} ${y} `;
                break;
            }
            case 'Q': {
                const x1 = readNum() * scale + dx;
                const y1 = readNum() * scale + dy;
                const x = readNum() * scale + dx;
                const y = readNum() * scale + dy;
                result += `Q${x1} ${y1} ${x} ${y} `;
                break;
            }
            case 'T': {
                const x = readNum() * scale + dx;
                const y = readNum() * scale + dy;
                result += `T${x} ${y} `;
                break;
            }
            case 'A': {
                // Arc: rx ry x-axis-rotation large-arc-flag sweep-flag x y
                const rx = readNum() * scale;
                const ry = readNum() * scale;
                const xAxisRotation = readNum();
                const largeArcFlag = readNum();
                const sweepFlag = readNum();
                const x = readNum() * scale + dx;
                const y = readNum() * scale + dy;
                result += `A${rx} ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${x} ${y} `;
                break;
            }
            case 'Z': {
                result += "Z ";
                break;
            }
        }
        
        lastCmd = upperCmd;
    }
    
    return result.trim();
};

const generateCompositePath = (components: GlyphComponent[], glyphs: GlyphData[]): string => {
    let combinedD = "";
    components.forEach(comp => {
        const refGlyph = glyphs.find(g => g.char === comp.char);
        if (refGlyph && refGlyph.pathData) {
            const scaleFactor = comp.scale ?? 1;
            const d = transformPath(refGlyph.pathData, scaleFactor, comp.dx, comp.dy);
            combinedD += ` ${d}`;
        }
    });
    return combinedD.trim();
};

const shiftPath = (d: string, dx: number, dy: number): string => transformPath(d, 1, dx, dy);

const normalizePathData = (d: string, bbox: DOMRect): Partial<GlyphData> => {
    // Editor-friendly normalized path (keeps current UI expectations: origin at 0,0 and target height ~700)
    const shiftedPath = shiftPath(d, -bbox.x, -bbox.y);
    const targetHeight = 700; 
    const h = bbox.height || 1; 
    const scaleFactor = targetHeight / h;
    const w = bbox.width || 100;
    const scaledWidth = w * scaleFactor;
    const sideBearing = 50;
    const advanceWidth = Math.round(scaledWidth + (sideBearing * 2));
    // baselineOffset começa em 0, usuário ajusta conforme necessário
    const baselineOffset = 0;

    // SVG viewBox normalizado para altura padrão (700)
    // O svgPathData é o path escalado para caber no svgViewBox (altura 700)
    const svgViewBox: [number, number, number, number] = [0, 0, scaledWidth, targetHeight];
    // svgPathData = path movido para origem E escalado para altura 700
    const svgPathData = transformPath(shiftedPath, scaleFactor, 0, 0);
    // pathData = svgPathData (já normalizado) para o editor usar com scale=1
    const pathData = svgPathData;

    return {
        pathData,
        scale: 1, // scale=1 porque o path já está normalizado para altura 700
        leftSideBearing: sideBearing,
        baselineOffset,
        advanceWidth,
        svgViewBox,
        svgPathData
    };
};

const arcToCubic = (px: number, py: number, rx: number, ry: number, xAxisRotation: number, largeArcFlag: number, sweepFlag: number, ax: number, ay: number): number[][] => {
  const TAU = Math.PI * 2;
  const sinphi = Math.sin(xAxisRotation * TAU / 360);
  const cosphi = Math.cos(xAxisRotation * TAU / 360);

  const pxp = cosphi * (px - ax) / 2 + sinphi * (py - ay) / 2;
  const pyp = -sinphi * (px - ax) / 2 + cosphi * (py - ay) / 2;

  if (pxp === 0 && pyp === 0) return [];

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  const lambda = (pxp * pxp) / (rx * rx) + (pyp * pyp) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  let rxsq = rx * rx;
  let rysq = ry * ry;
  let pxpsq = pxp * pxp;
  let pypsq = pyp * pyp;

  let radicant = (rxsq * rysq) - (rxsq * pypsq) - (rysq * pxpsq);
  if (radicant < 0) radicant = 0;
  radicant /= (rxsq * pypsq) + (rysq * pxpsq);
  radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

  const cxp = radicant * rx / ry * pyp;
  const cyp = radicant * -ry / rx * pxp;

  const cx = cosphi * cxp - sinphi * cyp + (px + ax) / 2;
  const cy = sinphi * cxp + cosphi * cyp + (py + ay) / 2;

  const v1x = (pxp - cxp) / rx;
  const v1y = (pyp - cyp) / ry;
  const v2x = (-pxp - cxp) / rx;
  const v2y = (-pyp - cyp) / ry;

  const angle1 = Math.atan2(v1y, v1x);
  const angle2 = Math.atan2(v2y, v2x);

  let ratio = angle2 - angle1;
  if (ratio >= 0 && sweepFlag === 0) ratio -= TAU;
  if (ratio < 0 && sweepFlag === 1) ratio += TAU;

  const segments = Math.max(Math.ceil(Math.abs(ratio) / (TAU / 4)), 1);
  const curves: number[][] = [];
  
  for (let i = 0; i < segments; i++) {
      const step = ratio / segments;
      const t1 = angle1 + i * step;
      const t2 = angle1 + (i + 1) * step;
      
      const alpha = Math.sin(step) * (Math.sqrt(4 + 3 * Math.tan(step / 2) * Math.tan(step / 2)) - 1) / 3;

      const x1 = cx + rx * Math.cos(t1) * cosphi - ry * Math.sin(t1) * sinphi;
      const y1 = cy + rx * Math.cos(t1) * sinphi + ry * Math.sin(t1) * cosphi;
      
      const x2 = cx + rx * Math.cos(t2) * cosphi - ry * Math.sin(t2) * sinphi;
      const y2 = cy + rx * Math.cos(t2) * sinphi + ry * Math.sin(t2) * cosphi;
      
      const dx1 = -rx * Math.sin(t1) * cosphi - ry * Math.cos(t1) * sinphi;
      const dy1 = -rx * Math.sin(t1) * sinphi + ry * Math.cos(t1) * cosphi;
      
      const dx2 = -rx * Math.sin(t2) * cosphi - ry * Math.cos(t2) * sinphi;
      const dy2 = -rx * Math.sin(t2) * sinphi + ry * Math.cos(t2) * cosphi;
      
      curves.push([
          x1 + alpha * dx1, 
          y1 + alpha * dy1, 
          x2 - alpha * dx2, 
          y2 - alpha * dy2, 
          x2, 
          y2
      ]);
  }

  return curves;
};

const absolutizePath = (d: string): string => {
    const tokens = d.match(/([a-df-z])|[\-+]?(?:\d+\.?\d*|\.?\d+)(?:e[\-+]?\d+)?/gi) || [];
    let result = ""; let x = 0, y = 0; let startX = 0, startY = 0; let lastCx = 0, lastCy = 0; let lastCmd = "";
    let i = 0;
    while (i < tokens.length) {
        let cmd = tokens[i];
        if (/[a-df-z]/i.test(cmd)) { i++; } 
        else {
             if (lastCmd && lastCmd.toUpperCase() !== 'Z') {
                 if (lastCmd === 'M') cmd = 'L'; else if (lastCmd === 'm') cmd = 'l'; else cmd = lastCmd;
             } else { i++; continue; }
        }
        const upperCmd = cmd.toUpperCase(); const isRelative = cmd === cmd.toLowerCase();
        const getNum = () => { if (i >= tokens.length) return 0; const val = parseFloat(tokens[i++] || '0'); return isNaN(val) ? 0 : val; };
        const getCoord = (isX: boolean, val: number) => isRelative ? (isX ? x + val : y + val) : val;

        switch (upperCmd) {
            case 'M': { const nx = getCoord(true, getNum()); const ny = getCoord(false, getNum()); x = nx; y = ny; startX = x; startY = y; result += `M${x} ${y}`; lastCx = x; lastCy = y; break; }
            case 'L': { const nx = getCoord(true, getNum()); const ny = getCoord(false, getNum()); x = nx; y = ny; result += `L${x} ${y}`; lastCx = x; lastCy = y; break; }
            case 'H': { const nx = getCoord(true, getNum()); x = nx; result += `L${x} ${y}`; lastCx = x; lastCy = y; break; }
            case 'V': { const ny = getCoord(false, getNum()); y = ny; result += `L${x} ${y}`; lastCx = x; lastCy = y; break; }
            case 'C': {
                const c1x = getCoord(true, getNum()); const c1y = getCoord(false, getNum()); const c2x = getCoord(true, getNum()); const c2y = getCoord(false, getNum()); const ex = getCoord(true, getNum()); const ey = getCoord(false, getNum());
                x = ex; y = ey; result += `C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`; lastCx = c2x; lastCy = c2y; break;
            }
            case 'S': {
                let c1x = x, c1y = y; if (lastCmd.toUpperCase() === 'C' || lastCmd.toUpperCase() === 'S') { c1x = 2 * x - lastCx; c1y = 2 * y - lastCy; }
                const c2x = getCoord(true, getNum()); const c2y = getCoord(false, getNum()); const ex = getCoord(true, getNum()); const ey = getCoord(false, getNum());
                x = ex; y = ey; result += `C${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`; lastCx = c2x; lastCy = c2y; break;
            }
            case 'Q': {
                const c1x = getCoord(true, getNum()); const c1y = getCoord(false, getNum()); const ex = getCoord(true, getNum()); const ey = getCoord(false, getNum());
                x = ex; y = ey; result += `Q${c1x} ${c1y} ${ex} ${ey}`; lastCx = c1x; lastCy = c1y; break;
            }
            case 'T': {
                let c1x = x, c1y = y; if (lastCmd.toUpperCase() === 'Q' || lastCmd.toUpperCase() === 'T') { c1x = 2 * x - lastCx; c1y = 2 * y - lastCy; }
                const ex = getCoord(true, getNum()); const ey = getCoord(false, getNum());
                x = ex; y = ey; result += `Q${c1x} ${c1y} ${ex} ${ey}`; lastCx = c1x; lastCy = c1y; break;
            }
            case 'A': {
                const rx = getNum(); const ry = getNum(); const xAxisRotation = getNum(); const largeArcFlag = getNum(); const sweepFlag = getNum(); const ex = getCoord(true, getNum()); const ey = getCoord(false, getNum());
                const curves = arcToCubic(x, y, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, ex, ey);
                curves.forEach(curve => { result += `C${curve[0]} ${curve[1]} ${curve[2]} ${curve[3]} ${curve[4]} ${curve[5]}`; });
                x = ex; y = ey; if (curves.length > 0) { lastCx = curves[curves.length-1][2]; lastCy = curves[curves.length-1][3]; } else { lastCx = x; lastCy = y; } break;
            }
            case 'Z': { result += "Z"; x = startX; y = startY; lastCx = x; lastCy = y; lastCmd = ""; continue; }
        }
        lastCmd = cmd;
    }
    return result;
};

export const extractSingleGlyphFromSVG = (svgString: string): Partial<GlyphData> | null => {
    const extracted = collectExtractedPaths(svgString);
    if (extracted.length === 0) return null;
    const combinedD = extracted.map(item => item.d).join(' ');
    const combinedBBox = getCombinedBBox(extracted.map(item => item.bbox));
    return normalizePathData(combinedD, combinedBBox);
};

function collectExtractedPaths(svgString: string): ExtractedPath[] {
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
        width: '0px', height: '0px', overflow: 'hidden'
    });
    document.body.appendChild(container);

    container.innerHTML = svgString;
    const svg = container.querySelector('svg');
    if (!svg) {
        document.body.removeChild(container);
        throw new Error("Invalid SVG content");
    }

    const aggregates = new Map<string | Element, {
        dParts: string[];
        bboxes: DOMRect[];
        id: string;
    }>();

    const shapes = Array.from(svg.querySelectorAll('path, rect, polygon, polyline, circle, ellipse, line'));

    shapes.forEach(el => {
        const shape = el as SVGGraphicsElement;

        // Ignore definition-only content such as masks/defs/clipPaths/symbols to avoid importing construction helpers.
        if (shape.closest('mask, defs, clipPath, pattern, symbol')) {
            return;
        }

        let d = elementToPathD(shape);
        if (!d) return;

        const strokeWidth = getStrokeWidth(shape);
        const fill = shape.getAttribute('fill') || (shape.style && shape.style.fill);
        const hasVisibleFill = fill && fill !== 'none' && fill !== 'transparent';
        const tag = shape.tagName.toLowerCase();

        if (strokeWidth > 0) {
            const expandedD = expandStrokeToPath(d, strokeWidth);
            d = hasVisibleFill ? `${d} ${expandedD}` : expandedD;
        } else if (!hasVisibleFill && tag !== 'path') {
            return;
        }

        let bbox: DOMRect;
        try {
            bbox = shape.getBBox();
            if (bbox.width < 0.01 && bbox.height < 0.01) {
                return;
            }
        } catch (err) {
            return;
        }

        let id = getElementId(shape);
        let groupKey: string | Element;

        if (id) {
            groupKey = id;
        } else {
            const parent = shape.parentElement;
            if (parent && (parent.tagName === 'g' || parent.tagName === 'symbol' || parent.tagName === 'a')) {
                const parentId = getElementId(parent as unknown as SVGElement);
                if (parentId) {
                    id = parentId;
                    groupKey = parentId;
                } else {
                    groupKey = parent;
                }
            } else {
                groupKey = shape;
            }
        }

        if (!aggregates.has(groupKey)) {
            aggregates.set(groupKey, { dParts: [], bboxes: [], id: id });
        }
        const entry = aggregates.get(groupKey)!;
        entry.dParts.push(d);
        entry.bboxes.push(bbox);
    });

    const extracted: ExtractedPath[] = [];

    aggregates.forEach(val => {
        const combinedD = val.dParts.join(' ');
        const combinedBBox = getCombinedBBox(val.bboxes);
        const finalD = absolutizePath(combinedD);

        extracted.push({
            d: finalD,
            bbox: combinedBBox,
            id: val.id
        });
    });

    document.body.removeChild(container);
    return extracted;
}
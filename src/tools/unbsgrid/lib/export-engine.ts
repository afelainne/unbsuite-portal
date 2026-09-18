/**
 * Export helpers: layered SVG (named groups per construction), high-res PNG
 * rasterized from that SVG, dependency-free vector PDF, outline SVG and a
 * safe download helper. Everything renders in a private PaperScope, so the
 * result does not depend on the preview's zoom, pan or window size.
 */
import paper from 'paper';
import { resetPaperProject, finalizeSVGString, type ParsedSVG } from './svg-engine';
import { renderScene, labelExportedLayers, applyLogoAppearance, type SceneSettings } from './render-pipeline';
import { hashKey, LRUCache } from './memo';

let exportScope: paper.PaperScope | null = null;
function getExportScope(): paper.PaperScope {
  if (!exportScope) exportScope = new paper.PaperScope();
  return exportScope;
}

export interface LayeredExportOptions {
  /** Longest side of the logo in px inside the export (default 800). Overlay strokes/labels are sized for this scale, like in the preview. */
  logoSize?: number;
  /** Margin around everything, px (default 24). */
  margin?: number;
}

export interface LayeredScene {
  project: paper.Project;
  scale: number;
  errors: Array<{ key: string; message: string }>;
}

/** Render the scene with one named layer per construction in the export scope. */
export function buildLayeredScene(parsed: ParsedSVG, settings: SceneSettings, options: LayeredExportOptions = {}): LayeredScene {
  const scope = getExportScope();
  const logoSize = Math.max(16, Math.min(20000, options.logoSize ?? 800));
  const fw = parsed.fullBounds.width;
  const fh = parsed.fullBounds.height;
  const k = logoSize / Math.max(fw || 0, fh || 0, 1e-9);
  const pad = 400; // room for labels/extensions; cropped to content afterwards
  const width = Math.ceil((fw || 1) * k + pad * 2);
  const height = Math.ceil((fh || 1) * k + pad * 2);
  try {
    const project = resetPaperProject(null, scope, { width, height });
    const result = renderScene(parsed, settings, { width, height, padding: pad, zoom: 1 }, { layered: true, scope });
    return { project, scale: result.scale, errors: result.errors };
  } finally {
    paper.activate();
  }
}

const layeredCache = new LRUCache<string, { svg: string; errors: LayeredScene['errors'] }>(6);

/**
 * SVG with the logo and each construction in its own `<g id="…" data-name="…">`
 * (opens as organized layers in Illustrator / Figma). Memoized by
 * SVG + settings + options.
 */
export function exportLayeredSVG(parsed: ParsedSVG, settings: SceneSettings, options: LayeredExportOptions = {}): string {
  const key = hashKey(parsed.originalSVG, settings, options);
  const hit = layeredCache.get(key);
  if (hit) return hit.svg;
  const scene = buildLayeredScene(parsed, settings, options);
  const raw = scene.project.exportSVG({ asString: true, bounds: contentBounds(scene.project, options.margin ?? 24) }) as string;
  const svg = finalizeSVGString(labelExportedLayers(raw, scene.project));
  layeredCache.set(key, { svg, errors: scene.errors });
  return svg;
}

function contentBounds(project: paper.Project, margin: number): paper.Rectangle | 'view' {
  let b: paper.Rectangle | null = null;
  for (const layer of project.layers) {
    if (!layer.children.length) continue;
    const lb = layer.strokeBounds;
    if (!(lb.width > 0 || lb.height > 0)) continue;
    b = b ? b.unite(lb) : lb.clone();
  }
  return b ? b.expand(margin * 2) : 'view';
}

// ---------------------------------------------------------------------------
// Outline SVG
// ---------------------------------------------------------------------------

export interface OutlineExportOptions {
  color?: string | null;
  strokeWidth?: number;
  dash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  margin?: number;
  /**
   * Longest side of the logo in px inside the export. Omitted = the SVG's own
   * size. The stroke, dash and margin scale with it, so a 4096px outline keeps
   * the same visual weight as a 512px one instead of turning into a hairline.
   */
  logoSize?: number;
}

/**
 * Logo converted to outlines, cropped to its own bounds. (The previous inline
 * version exported an 800×600 viewport, cropping or shrinking the logo.)
 */
export function exportOutlineSVG(parsed: ParsedSVG, options: OutlineExportOptions = {}): string {
  const scope = getExportScope();
  try {
    const project = resetPaperProject(null, scope, { width: 16, height: 16 });
    const item = project.importSVG(parsed.originalSVG, { expandShapes: true }) as paper.Item | null;
    if (!item) throw new Error('SVG import failed');

    // Scale first, then style: stroke weight is meant for the exported size.
    const natural = Math.max(item.bounds.width || 0, item.bounds.height || 0);
    const target = options.logoSize;
    const k = Number.isFinite(target) && (target as number) > 0 && natural > 0
      ? Math.max(16, Math.min(20000, target as number)) / natural
      : 1;
    if (k !== 1) {
      item.scale(k, item.bounds.center);
      item.position = new paper.Point(item.bounds.width / 2, item.bounds.height / 2);
    }

    applyLogoAppearance(item, {
      svgColorOverride: options.color ?? null,
      svgOutlineMode: true,
      svgOutlineWidth: (options.strokeWidth ?? 1) * k,
      svgOutlineDash: (options.dash ?? []).map(d => d * k),
      svgOutlineLineCap: options.lineCap ?? 'butt',
    });
    const svg = project.exportSVG({ asString: true, bounds: item.strokeBounds.expand((options.margin ?? 0) * 2 * k) }) as string;
    return finalizeSVGString(svg);
  } finally {
    paper.activate();
  }
}

// ---------------------------------------------------------------------------
// PNG
// ---------------------------------------------------------------------------

export interface RasterLimits { maxSide?: number; maxPixels?: number }

/**
 * Pixel size for rasterizing (w×h)×scale, reduced to stay within browser
 * canvas limits (default 16384 px per side, 268 M pixels).
 */
export function computeRasterSize(width: number, height: number, scale: number, limits: RasterLimits = {}) {
  const maxSide = limits.maxSide ?? 16384;
  const maxPixels = limits.maxPixels ?? 268_000_000;
  const w = Math.max(0, width || 0);
  const h = Math.max(0, height || 0);
  let s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  if (!(w > 0 && h > 0)) return { width: 0, height: 0, scale: s, clamped: false };
  let clamped = false;
  const sideLimit = maxSide / Math.max(w, h);
  if (s > sideLimit) { s = sideLimit; clamped = true; }
  const areaLimit = Math.sqrt(maxPixels / (w * h));
  if (s > areaLimit) { s = areaLimit; clamped = true; }
  return {
    width: Math.max(1, Math.floor(w * s)),
    height: Math.max(1, Math.floor(h * s)),
    scale: s,
    clamped,
  };
}

/** Read the intrinsic size of an SVG string (width/height, else viewBox). */
export function getSVGSize(svg: string): { width: number; height: number } {
  const open = /<svg\b[^>]*>/i.exec(svg)?.[0] ?? '';
  const attr = (n: string) => new RegExp(`\\s${n}\\s*=\\s*["']([^"']+)["']`, 'i').exec(open)?.[1];
  const w = parseFloat(attr('width') ?? '');
  const h = parseFloat(attr('height') ?? '');
  if (w > 0 && h > 0) return { width: w, height: h };
  const vb = (attr('viewBox') ?? '').split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: vb[2], height: vb[3] };
  return { width: 0, height: 0 };
}

export interface PngExportOptions extends RasterLimits {
  /** Resolution multiplier relative to the SVG size (2 = 2x). Default 2. */
  scale?: number;
  /** Optional solid background (CSS color). Transparent by default. */
  background?: string | null;
}

export interface PngExportResult { blob: Blob; width: number; height: number; scale: number; clamped: boolean }

/**
 * Rasterize an SVG string to PNG at `scale`× its size (true re-rendering of
 * the vectors, not an upscale of the on-screen canvas bitmap).
 */
export function svgToPngBlob(svg: string, options: PngExportOptions = {}): Promise<PngExportResult> {
  const size = getSVGSize(svg);
  const target = computeRasterSize(size.width, size.height, options.scale ?? 2, options);
  if (!target.width || !target.height) return Promise.reject(new Error('SVG has no size to rasterize.'));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    const cleanup = () => URL.revokeObjectURL(url);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable.');
        if (options.background) {
          ctx.fillStyle = options.background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          cleanup();
          if (blob) resolve({ blob, ...target });
          else reject(new Error('PNG encoding failed (canvas too large?).'));
        }, 'image/png');
      } catch (err) {
        cleanup();
        reject(err);
      }
    };
    img.onerror = () => { cleanup(); reject(new Error('Could not load the SVG for rasterization.')); };
    img.src = url;
  });
}

/** Layered scene -> PNG at 1x/2x/4x… */
export function exportScenePNG(parsed: ParsedSVG, settings: SceneSettings, options: PngExportOptions & LayeredExportOptions = {}): Promise<PngExportResult> {
  return svgToPngBlob(exportLayeredSVG(parsed, settings, options), options);
}

// ---------------------------------------------------------------------------
// PDF (vector, no dependency)
// ---------------------------------------------------------------------------

const PDF_CHAR_FALLBACK: Record<string, string> = {
  '√': 'sqrt', 'φ': 'phi', 'Φ': 'Phi', '✓': 'ok', '✗': 'x', '○': 'o', '□': '#', '→': '->', '←': '<-',
  '≤': '<=', '≥': '>=', '…': '...', '—': '-', '–': '-', '“': '"', '”': '"', '‘': "'", '’': "'",
};

/** Encode text as a PDF literal string (WinAnsi/Latin-1 subset, escaped). */
export function pdfString(text: string): string {
  let out = '';
  for (const ch of text) {
    const mapped = PDF_CHAR_FALLBACK[ch] ?? ch;
    for (const c of mapped) {
      const code = c.charCodeAt(0);
      if (c === '(' || c === ')' || c === '\\') out += '\\' + c;
      else if (code >= 32 && code < 127) out += c;
      else if (code >= 160 && code <= 255) out += '\\' + code.toString(8).padStart(3, '0');
      else out += '?';
    }
  }
  return `(${out})`;
}

const num = (n: number) => {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

interface PdfColor { r: number; g: number; b: number; a: number }

function toPdfColor(color: paper.Color | null | undefined, opacity: number): PdfColor | null {
  if (!color) return null;
  let c = color;
  if (c.type === 'gradient') {
    const stop = c.gradient?.stops?.[0];
    if (!stop) return null;
    c = stop.color;
  }
  // paper's red/green/blue getters convert gray/hsb/hsl on the fly
  const alpha = (Number.isFinite(c.alpha) ? c.alpha : 1) * opacity;
  if (alpha <= 0) return null;
  const ch = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
  return { r: ch(c.red), g: ch(c.green), b: ch(c.blue), a: Math.min(1, alpha) };
}

export interface PdfOptions {
  /** Page margin in pt (default 0 — the bounds already include the margin). */
  margin?: number;
  title?: string;
}

/**
 * Serialize a paper project into a single-page vector PDF (1 px = 1 pt).
 * Supports paths/compound paths (fill rule, fill+stroke, dash, caps, joins,
 * alpha), text (Helvetica / Helvetica-Bold) and group opacity. Rasters and
 * clip masks are skipped.
 */
export function projectToPDF(project: paper.Project, bounds?: paper.Rectangle, options: PdfOptions = {}): Uint8Array {
  const margin = options.margin ?? 0;
  const b = bounds ?? (contentBounds(project, 0) as paper.Rectangle);
  const box = b instanceof paper.Rectangle ? b : new paper.Rectangle(0, 0, 1, 1);
  const pageW = Math.max(1, box.width + margin * 2);
  const pageH = Math.max(1, box.height + margin * 2);
  const ox = box.x - margin;
  const oy = box.y - margin;
  const X = (x: number) => num(x - ox);
  const Y = (y: number) => num(pageH - (y - oy));

  const gStates = new Map<string, string>();
  const gs = (fa: number, sa: number) => {
    const key = `${num(fa)}|${num(sa)}`;
    let name = gStates.get(key);
    if (!name) { name = `GS${gStates.size}`; gStates.set(key, name); }
    return name;
  };

  const ops: string[] = [];
  const capMap: Record<string, number> = { butt: 0, round: 1, square: 2 };
  const joinMap: Record<string, number> = { miter: 0, round: 1, bevel: 2 };

  const emitPath = (path: paper.Path, m: paper.Matrix | null) => {
    const segs = path.segments;
    if (!segs.length) return;
    const tp = (p: paper.Point) => (m ? m.transform(p) : p);
    const p0 = tp(segs[0].point);
    ops.push(`${X(p0.x)} ${Y(p0.y)} m`);
    const count = path.closed ? segs.length : segs.length - 1;
    for (let i = 0; i < count; i++) {
      const a = segs[i];
      const c = segs[(i + 1) % segs.length];
      const pEnd = tp(c.point);
      if (a.handleOut.isZero() && c.handleIn.isZero()) {
        if (path.closed && i === count - 1) continue; // 'h' draws the closing line
        ops.push(`${X(pEnd.x)} ${Y(pEnd.y)} l`);
      } else {
        const c1 = tp(a.point.add(a.handleOut));
        const c2 = tp(c.point.add(c.handleIn));
        ops.push(`${X(c1.x)} ${Y(c1.y)} ${X(c2.x)} ${Y(c2.y)} ${X(pEnd.x)} ${Y(pEnd.y)} c`);
      }
    }
    if (path.closed) ops.push('h');
  };

  const walk = (item: paper.Item, parentOpacity: number) => {
    if (!item.visible || item.clipMask) return;
    const opacity = parentOpacity * (Number.isFinite(item.opacity) ? item.opacity : 1);
    if (opacity <= 0) return;
    if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
      const fill = toPdfColor(item.fillColor, opacity);
      const hasStroke = !!item.strokeColor && item.strokeWidth > 0;
      const stroke = hasStroke ? toPdfColor(item.strokeColor, opacity) : null;
      if (!fill && !stroke) return;
      const m = (item as unknown as { globalMatrix: paper.Matrix }).globalMatrix;
      const matrix = m && !m.isIdentity() ? m : null;
      ops.push('q');
      ops.push(`/${gs(fill?.a ?? 1, stroke?.a ?? 1)} gs`);
      if (fill) ops.push(`${num(fill.r)} ${num(fill.g)} ${num(fill.b)} rg`);
      if (stroke) {
        ops.push(`${num(stroke.r)} ${num(stroke.g)} ${num(stroke.b)} RG`);
        ops.push(`${num(item.strokeWidth)} w`);
        ops.push(`${capMap[item.strokeCap] ?? 0} J ${joinMap[item.strokeJoin] ?? 0} j`);
        const dash = (item.dashArray || []).filter(d => Number.isFinite(d) && d >= 0);
        ops.push(dash.length && dash.some(d => d > 0) ? `[${dash.map(num).join(' ')}] ${num(item.dashOffset || 0)} d` : '[] 0 d');
      }
      const paths = item instanceof paper.CompoundPath ? (item.children as paper.Path[]) : [item];
      paths.forEach(p => emitPath(p, matrix));
      const evenOdd = item.fillRule === 'evenodd';
      ops.push(fill && stroke ? (evenOdd ? 'B*' : 'B') : fill ? (evenOdd ? 'f*' : 'f') : 'S');
      ops.push('Q');
      return;
    }
    if (item instanceof paper.PointText) {
      const fill = toPdfColor(item.fillColor, opacity);
      const content = String(item.content ?? '');
      if (!fill || !content) return;
      const size = item.fontSize && Number(item.fontSize) > 0 ? Number(item.fontSize) : 10;
      const bold = /bold|[6-9]00/i.test(String(item.fontWeight ?? ''));
      const approxWidth = content.length * size * 0.55;
      const pt = (item as unknown as { globalMatrix: paper.Matrix }).globalMatrix.transform(item.point);
      const justification = item.justification;
      const dx = justification === 'center' ? -approxWidth / 2 : justification === 'right' ? -approxWidth : 0;
      ops.push('q', `/${gs(fill.a, 1)} gs`, `${num(fill.r)} ${num(fill.g)} ${num(fill.b)} rg`);
      ops.push('BT', `/${bold ? 'F2' : 'F1'} ${num(size)} Tf`, `${X(pt.x + dx)} ${Y(pt.y)} Td`, `${pdfString(content)} Tj`, 'ET', 'Q');
      return;
    }
    for (const child of item.children || []) walk(child, opacity);
  };
  project.layers.forEach(l => walk(l, 1));

  const content = ops.join('\n');
  const extG = Array.from(gStates.entries())
    .map(([key, name]) => { const [fa, sa] = key.split('|'); return `/${name} << /Type /ExtGState /ca ${fa} /CA ${sa} >>`; })
    .join(' ');
  const title = options.title ? `/Title ${pdfString(options.title)} ` : '';

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageW)} ${num(pageH)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /ExtGState << ${extG} >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
    `<< ${title}/Producer (UNBSGRID) >>`,
  ];
  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { pdf += `${String(o).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Every char is < 256 (text escaped above), so 1 char == 1 byte.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

/** Layered scene -> vector PDF. */
export function exportScenePDF(parsed: ParsedSVG, settings: SceneSettings, options: LayeredExportOptions & PdfOptions = {}): Blob {
  const scene = buildLayeredScene(parsed, settings, options);
  const bounds = contentBounds(scene.project, options.margin ?? 24);
  const bytes = projectToPDF(scene.project, bounds === 'view' ? undefined : bounds, { title: options.title ?? 'UNBSGRID export' });
  return new Blob([bytes], { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Trigger a download. The object URL is revoked asynchronously: revoking it
 * right after `click()` (as the page did) can cancel the download in
 * Firefox/Safari.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadText(text: string, filename: string, type = 'image/svg+xml'): void {
  downloadBlob(new Blob([text], { type }), filename);
}

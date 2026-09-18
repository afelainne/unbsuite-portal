import './paper-env';
import paper from 'paper';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseSVG, resetPaperProject } from '../lib/svg-engine';
import {
  exportLayeredSVG, buildLayeredScene, exportOutlineSVG, computeRasterSize, getSVGSize, svgToPngBlob,
  projectToPDF, pdfString, exportScenePDF, downloadBlob,
} from '../lib/export-engine';
import { renderScene, computeFitScale, mapComponentBounds, geometryLayerLabel, type SceneSettings } from '../lib/render-pipeline';
import { createDefaultGeometryOptions, createDefaultGeometryStyles, getBuiltinPresets } from '../lib/preset-engine';
import { GEOMETRY_KEYS, geometryLayerId } from '../types/geometry';

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
  <circle cx="60" cy="60" r="50" fill="#112233"/>
  <path d="M130 20h90v20h-90z M130 60h60v20h-60z" fill="#445566"/>
  <path d="M130 100 C 150 80, 180 120, 220 100" fill="none" stroke="#778899" stroke-width="3"/>
</svg>`;

const settings = (over: Partial<SceneSettings> = {}): SceneSettings => ({
  clearspaceValue: 0,
  clearspaceUnit: 'logomark',
  showGrid: false,
  gridSubdivisions: 8,
  geometryOptions: { ...createDefaultGeometryOptions(), goldenRatio: true, boundingRects: true },
  geometryStyles: createDefaultGeometryStyles(),
  ...over,
});

// jsdom has no object URLs
const urlApi = URL as unknown as { createObjectURL?: unknown; revokeObjectURL?: unknown };
if (!urlApi.createObjectURL) urlApi.createObjectURL = () => 'blob:jsdom';
if (!urlApi.revokeObjectURL) urlApi.revokeObjectURL = () => {};

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('layered SVG export', () => {
  it('puts the logo and each construction in named groups', () => {
    const parsed = parseSVG(LOGO);
    const out = exportLayeredSVG(parsed, settings({ clearspaceValue: 1, showGrid: true }));
    expect(out.startsWith('<?xml')).toBe(true);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    for (const [id, label] of [['logo', 'Logo'], ['clearspace', 'Clearspace'], ['grid', 'Grid'], ['golden-ratio', 'Golden Ratio'], ['bounding-rects', 'Bounding Rects']]) {
      expect(out).toContain(`<g id="${id}" data-name="${label}"`);
    }
    expect(out).not.toContain('id="circles"');
    // original colors kept, construction color + opacity preserved
    expect(out).toContain('#112233');
    expect(out).not.toContain('data-paper-data');
    expect(out).toMatch(/stroke="#f2c00a"[^>]*stroke-opacity="0\.45"|stroke-opacity="0\.45"[^>]*stroke="#f2c00a"/);
    // layer order: logo first
    expect(out.indexOf('id="logo"')).toBeLessThan(out.indexOf('id="golden-ratio"'));
    const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('is independent from the preview state and memoized', () => {
    const parsed = parseSVG(LOGO);
    const a = exportLayeredSVG(parsed, settings());
    const b = exportLayeredSVG(parsed, settings());
    expect(b).toBe(a);
    const bigger = exportLayeredSVG(parsed, settings(), { logoSize: 1600 });
    const w = (s: string) => parseFloat(/width="([\d.]+)"/.exec(s)![1]);
    expect(w(bigger)).toBeGreaterThan(w(a) * 1.8);
  });

  it('renders every construction without errors (full audit smoke test)', () => {
    const parsed = parseSVG(LOGO);
    const audit = getBuiltinPresets().find(p => p.id === 'builtin-full-audit')!;
    for (const useReal of [true, false]) {
      const scene = buildLayeredScene(parsed, settings({
        geometryOptions: audit.geometryOptions, clearspaceValue: 1, showGrid: true, useRealDataInterpretation: useReal,
      }));
      expect(scene.errors).toEqual([]);
      const ids = scene.project.layers.map(l => l.name);
      expect(ids[0]).toBe('logo');
      // every construction that produced something has its own layer
      for (const id of ids) expect(['logo', 'clearspace', 'grid', ...GEOMETRY_KEYS.map(geometryLayerId)]).toContain(id);
      expect(ids.length).toBeGreaterThan(30);
    }
    paper.activate();
  });

  it('reports renderer failures instead of swallowing them', () => {
    const parsed = parseSVG(LOGO);
    const scope = new paper.PaperScope();
    resetPaperProject(null, scope, { width: 500, height: 300 });
    const bad = settings({ geometryStyles: { ...createDefaultGeometryStyles(), goldenRatio: null as never } });
    const res = renderScene(parsed, bad, { width: 500, height: 300 }, { scope });
    expect(res.errors.map(e => e.key)).toEqual(['goldenRatio']);
    scope.project.remove();
    paper.activate();
  });
});

describe('render pipeline helpers', () => {
  it('computeFitScale never flips or explodes', () => {
    expect(computeFitScale(100, 50, { width: 50, height: 50, padding: 60 })).toBeGreaterThan(0);
    expect(computeFitScale(0, 0, { width: 500, height: 500 })).toBe(1);
    expect(computeFitScale(0, 50, { width: 500, height: 170, padding: 10 })).toBe(3);
    expect(computeFitScale(100, 100, { width: 320, height: 320, padding: 10, zoom: 2 })).toBe(6);
    expect(computeFitScale(100, 100, { width: 320, height: 320, padding: 10, zoom: -1 })).toBe(3);
  });

  it('mapComponentBounds handles zero-size full bounds', () => {
    const comps = [{ id: 'a', isIcon: true, path: null as never, bounds: new paper.Rectangle(0, 0, 10, 0) }];
    const out = mapComponentBounds(comps, { left: 0, top: 0, width: 10, height: 0 }, new paper.Rectangle(0, 0, 100, 0));
    expect([out[0].x, out[0].y, out[0].width, out[0].height].every(Number.isFinite)).toBe(true);
    expect(geometryLayerLabel('kenBurnsSafe')).toBe('Ken Burns Safe');
  });

  it('clearspace in absolute units follows the zoom', () => {
    const parsed = parseSVG(LOGO);
    const scope = new paper.PaperScope();
    const measure = (zoom: number) => {
      resetPaperProject(null, scope, { width: 800, height: 600 });
      const res = renderScene(parsed, settings({ geometryOptions: createDefaultGeometryOptions(), clearspaceValue: 10, clearspaceUnit: 'pixels' }), { width: 800, height: 600, zoom }, { scope });
      const outer = (scope.project.activeLayer.children as paper.Item[]).find(i => (i as paper.Path).dashArray?.length)!;
      return (outer.bounds.width - res.bounds!.width) / 2 / res.scale;
    };
    expect(measure(1)).toBeCloseTo(10);
    expect(measure(2.5)).toBeCloseTo(10);
    scope.project.remove();
    paper.activate();
  });
});

describe('outline export', () => {
  it('crops to the logo and converts fills to strokes', () => {
    const parsed = parseSVG(LOGO);
    const out = exportOutlineSVG(parsed, { color: '#ff0000', strokeWidth: 2, dash: [4, 2], lineCap: 'round' });
    const size = getSVGSize(out);
    expect(size.width).toBeCloseTo(220 - 10 + 2, 0); // circle left edge 10 .. path right edge 220, + stroke
    expect(out).not.toMatch(/fill="#112233"/);
    expect(out).toContain('stroke="#ff0000"');
    expect(out).toContain('stroke-dasharray="4,2"');
    expect(out).not.toMatch(/width="800"/);
    paper.activate();
  });
});

describe('PNG export', () => {
  it('computeRasterSize clamps to canvas limits', () => {
    expect(computeRasterSize(100, 50, 4)).toEqual({ width: 400, height: 200, scale: 4, clamped: false });
    const side = computeRasterSize(5000, 1000, 4);
    expect(side.width).toBe(16384);
    expect(side.clamped).toBe(true);
    const area = computeRasterSize(10000, 10000, 4, { maxSide: 1e9, maxPixels: 1e8 });
    expect(area.width * area.height).toBeLessThanOrEqual(1e8);
    expect(computeRasterSize(0, 10, 2).width).toBe(0);
    expect(computeRasterSize(10, 10, -1).scale).toBe(1);
  });

  it('getSVGSize reads width/height or viewBox', () => {
    expect(getSVGSize('<svg width="10" height="20" viewBox="0 0 1 1">')).toEqual({ width: 10, height: 20 });
    expect(getSVGSize('<svg viewBox="0,0,30,40">')).toEqual({ width: 30, height: 40 });
    expect(getSVGSize('<svg>')).toEqual({ width: 0, height: 0 });
  });

  it('svgToPngBlob re-renders the vectors at the requested scale', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const drawn: number[][] = [];
    const ctxProto = HTMLCanvasElement.prototype as unknown as { toBlob: unknown };
    ctxProto.toBlob = function (this: HTMLCanvasElement, cb: (b: Blob) => void) {
      drawn.push([this.width, this.height]);
      cb(new Blob(['png'], { type: 'image/png' }));
    };
    class FakeImage { onload?: () => void; onerror?: () => void; set src(_v: string) { setTimeout(() => this.onload?.(), 0); } }
    vi.stubGlobal('Image', FakeImage);
    const res = await svgToPngBlob('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"></svg>', { scale: 4, background: '#fff' });
    expect(res).toMatchObject({ width: 480, height: 320, scale: 4 });
    expect(drawn).toEqual([[480, 320]]);
    expect(revoke).toHaveBeenCalledWith('blob:mock');

    class BrokenImage { onload?: () => void; onerror?: () => void; set src(_v: string) { setTimeout(() => this.onerror?.(), 0); } }
    vi.stubGlobal('Image', BrokenImage);
    await expect(svgToPngBlob('<svg width="1" height="1"></svg>')).rejects.toThrow(/load/);
    await expect(svgToPngBlob('<svg></svg>')).rejects.toThrow(/size/);
    vi.unstubAllGlobals();
  });
});

describe('PDF export', () => {
  const parsePdf = (bytes: Uint8Array) => String.fromCharCode(...bytes);

  it('pdfString escapes and maps non-Latin-1 glyphs', () => {
    expect(pdfString('a(b)c\\')).toBe('(a\\(b\\)c\\\\)');
    expect(pdfString('√2 ✓ 45°')).toBe('(sqrt2 ok 45\\260)');
    expect(pdfString('漢')).toBe('(?)');
  });

  it('produces a structurally valid single-page vector PDF', () => {
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(200, 100));
    const r = new scope.Path.Rectangle(new scope.Rectangle(10, 10, 50, 20));
    r.fillColor = new scope.Color(1, 0, 0, 0.5);
    r.strokeColor = new scope.Color(0, 0, 1);
    r.strokeWidth = 2;
    r.dashArray = [4, 2];
    const c = new scope.Path.Circle(new scope.Point(100, 50), 20);
    c.strokeColor = new scope.Color('#00ff00');
    const t = new scope.PointText(new scope.Point(20, 80));
    t.content = 'Golden (φ)';
    t.fillColor = new scope.Color('black');
    t.fontWeight = 'bold';
    const pdf = parsePdf(projectToPDF(scope.project, new scope.Rectangle(0, 0, 200, 100), { title: 'Test' }));

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf).toContain('/MediaBox [0 0 200 100]');
    expect(pdf).toContain('1 0 0 rg');
    expect(pdf).toContain('0 0 1 RG');
    expect(pdf).toContain('[4 2] 0 d');
    expect(pdf).toMatch(/\/GS\d+ << \/Type \/ExtGState \/ca 0\.5 \/CA 1 >>/);
    expect(pdf).toContain('10 70 m\n10 90 l\n60 90 l\n60 70 l\nh'); // y flipped; 'h' closes
    expect(pdf).toMatch(/ c\n/); // circle uses Béziers
    expect(pdf).toContain('/F2 ');
    expect(pdf).toContain('(Golden \\(phi\\)) Tj');
    expect(pdf).toContain('/Title (Test)');

    // xref offsets point at the objects
    const xrefPos = Number(/startxref\n(\d+)/.exec(pdf)![1]);
    expect(pdf.slice(xrefPos, xrefPos + 4)).toBe('xref');
    const entries = pdf.slice(xrefPos).split('\n').slice(3, 10);
    entries.forEach((line, i) => {
      const off = Number(line.slice(0, 10));
      expect(pdf.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
    // stream length is exact
    const len = Number(/\/Length (\d+) >>\nstream\n/.exec(pdf)![1]);
    const start = pdf.indexOf('stream\n') + 7;
    expect(pdf.slice(start + len, start + len + 10)).toBe('\nendstream');
    scope.project.remove();
    paper.activate();
  });

  it('exportScenePDF returns an application/pdf blob', () => {
    const blob = exportScenePDF(parseSVG(LOGO), settings());
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(500);
  });
});

describe('downloadBlob', () => {
  it('revokes the object URL asynchronously', () => {
    vi.useFakeTimers();
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(['x']), 'a.svg');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(10_000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});

import './paper-env';
import paper from 'paper';
import { describe, it, expect } from 'vitest';
import {
  parseSVG, getParseProjectCount, resetPaperProject, collectPaths, extractBezierHandles, handleThreshold,
  pickIconIndex, invertComponents, getLogomarkSize, getIconBounds, convertToPixels, computeClearspace,
  generateGridLines, clampSubdivisions, exportSVG, finalizeSVGString, circleIntersectsPath, isClearspaceUnit,
  SvgParseError, type SVGComponent,
} from '../lib/svg-engine';

const svg = (body: string, attrs = 'viewBox="0 0 200 100"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${body}</svg>`;

const comp = (id: string, x: number, y: number, w: number, h: number, isIcon = false): SVGComponent => ({
  id, isIcon, bounds: new paper.Rectangle(x, y, w, h), path: null as unknown as paper.Path,
});

describe('parseSVG', () => {
  it('ignores the artboard clip mask: bounds = drawn content, clip not a component', () => {
    const parsed = parseSVG(svg('<rect x="50" y="20" width="40" height="30" fill="#000"/>'));
    expect(parsed.components).toHaveLength(1);
    expect(parsed.fullBounds.x).toBeCloseTo(50);
    expect(parsed.fullBounds.width).toBeCloseTo(40);
    expect(parsed.artboard).toEqual({ x: 0, y: 0, width: 200, height: 100 });
    expect(parsed.components[0].isIcon).toBe(true);
  });

  it('counts a compound path once (not once per sub-path)', () => {
    const ring = 'M0 0H40V40H0Z M10 10H30V30H10Z';
    const parsed = parseSVG(svg(`<path d="${ring}" fill-rule="evenodd"/><rect x="60" width="10" height="10"/>`));
    expect(parsed.components).toHaveLength(2);
    expect(parsed.pathGeometry.allPaths).toHaveLength(3); // outer, inner, rect
  });

  it('applies group transforms and ignores hidden items', () => {
    const parsed = parseSVG(svg(`
      <g transform="translate(100,0) scale(2)"><rect width="10" height="5"/></g>
      <rect x="0" y="0" width="5" height="5" display="none"/>
    `));
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0].bounds.x).toBeCloseTo(100);
    expect(parsed.components[0].bounds.width).toBeCloseTo(20);
  });

  it('parses in user units whatever the width/height units are', () => {
    const a = parseSVG(svg('<rect width="100" height="50"/>', 'width="50mm" height="25mm" viewBox="0 0 100 50"'));
    const b = parseSVG(svg('<rect width="100" height="50"/>', 'width="100%" viewBox="0 0 100 50"'));
    expect(a.fullBounds.width).toBeCloseTo(100);
    expect(b.fullBounds.width).toBeCloseTo(100);
  });

  it('sees geometry referenced through <use>/<symbol>', () => {
    const parsed = parseSVG(svg(`
      <defs><symbol id="s" viewBox="0 0 10 10"><rect width="10" height="10"/></symbol></defs>
      <use href="#s" x="10" y="10" width="20" height="20"/>
      <use href="#s" x="50" y="10" width="20" height="20"/>
    `));
    expect(parsed.components).toHaveLength(2);
    expect(parsed.components[1].bounds.x).toBeCloseTo(50);
    expect(parsed.components[1].bounds.width).toBeCloseTo(20);
  });

  it('returns the sanitized SVG as originalSVG and keeps the raw input apart', () => {
    const raw = svg('<script>alert(1)</script><rect width="1" height="1" onclick="x()"/>');
    const parsed = parseSVG(raw);
    expect(parsed.originalSVG).not.toMatch(/script|onclick/);
    expect(parsed.sourceSVG).toBe(raw);
    expect(parsed.warnings!.length).toBeGreaterThan(0);
  });

  it('handles an SVG with no drawable shapes', () => {
    const parsed = parseSVG(svg('<title>empty</title>'));
    expect(parsed.components).toEqual([]);
    expect(parsed.segments).toEqual([]);
    expect(parsed.warnings!.join()).toMatch(/no drawable/);
  });

  it('throws SvgParseError on invalid input', () => {
    expect(() => parseSVG('not an svg')).toThrowError(SvgParseError);
    expect(() => parseSVG('')).toThrowError(SvgParseError);
  });

  it('does not leak paper projects across repeated parses', () => {
    const canvas = document.createElement('canvas');
    for (let i = 0; i < 15; i++) parseSVG(svg(`<rect width="${i + 1}" height="10"/>`), canvas);
    expect(getParseProjectCount()).toBe(1);
    for (let i = 0; i < 5; i++) parseSVG(svg('<rect width="5" height="10"/>'));
    expect(getParseProjectCount()).toBe(1);
  });

  it('leaves the default paper scope active', () => {
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(10, 10));
    paper.setup(new paper.Size(10, 10));
    parseSVG(svg('<rect width="5" height="10"/>'));
    const p = new paper.Path.Rectangle(new paper.Rectangle(0, 0, 1, 1));
    expect(p.project).toBe(paper.project);
    p.remove();
    scope.project.remove();
  });

  it('detects Bézier handles on small-viewBox icons (relative threshold)', () => {
    const parsed = parseSVG(svg('<circle cx="12" cy="12" r="2"/>', 'viewBox="0 0 24 24"'));
    expect(parsed.segments.length).toBe(4);
    expect(parsed.segments.every(s => s.hasHandleIn && s.hasHandleOut)).toBe(true);
    const lines = parseSVG(svg('<path d="M0 0L2 0L2 2Z"/>', 'viewBox="0 0 24 24"'));
    expect(lines.segments.some(s => s.hasHandleIn || s.hasHandleOut)).toBe(false);
  });
});

describe('paper scope helpers', () => {
  it('resetPaperProject reuses the project for the same canvas and frees it for a new one', () => {
    const scope = new paper.PaperScope();
    const c1 = document.createElement('canvas');
    const c2 = document.createElement('canvas');
    const p1 = resetPaperProject(c1, scope);
    new scope.Path.Circle(new scope.Point(0, 0), 5);
    const p1b = resetPaperProject(c1, scope, { width: 50, height: 40 });
    expect(p1b).toBe(p1);
    expect(p1b.activeLayer.children.length).toBe(0);
    expect(scope.view.viewSize.width).toBe(50);
    const p2 = resetPaperProject(c2, scope);
    expect(p2).not.toBe(p1);
    expect(scope.projects).toHaveLength(1);
    p2.remove();
  });

  it('collectPaths skips clip masks and hidden items, expands compound paths', () => {
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(10, 10));
    const group = new scope.Group();
    const clip = new scope.Path.Rectangle(new scope.Rectangle(0, 0, 100, 100));
    clip.clipMask = true;
    const hidden = new scope.Path.Rectangle(new scope.Rectangle(0, 0, 1, 1));
    hidden.visible = false;
    const compound = new scope.CompoundPath('M0 0H10V10H0Z M2 2H8V8H2Z');
    group.addChildren([clip, hidden, compound]);
    expect(collectPaths(group)).toHaveLength(2);
    expect(collectPaths(null)).toEqual([]);
    expect(extractBezierHandles(group)).toHaveLength(8);
    scope.project.remove();
  });

  it('handleThreshold scales with the drawing', () => {
    expect(handleThreshold({ width: 24, height: 24 })).toBeLessThan(0.01);
    expect(handleThreshold({ width: 0, height: 0 })).toBe(1e-6);
    expect(handleThreshold(null)).toBe(1e-6);
  });

  it('circleIntersectsPath does not leave probe items behind', () => {
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(10, 10));
    const target = new scope.Path.Rectangle(new scope.Rectangle(0, 0, 10, 10));
    const before = scope.project.activeLayer.children.length;
    expect(circleIntersectsPath(new scope.Point(10, 5), 2, [target])).toBe(true);
    expect(circleIntersectsPath(new scope.Point(50, 50), 2, [target])).toBe(false);
    expect(scope.project.activeLayer.children.length).toBe(before);
    scope.project.remove();
  });
});

describe('logomark / inversion', () => {
  it('pickIconIndex prefers a large square shape over a tiny dot', () => {
    const idx = pickIconIndex([
      { width: 300, height: 80 }, // wordmark
      { width: 4, height: 4 },    // dot of an "i"
      { width: 90, height: 100 }, // symbol
    ]);
    expect(idx).toBe(2);
    expect(pickIconIndex([])).toBe(-1);
  });

  it('invertComponents keeps a single component as the logomark', () => {
    const one = [comp('a', 0, 0, 10, 10, true)];
    expect(invertComponents(one)[0].isIcon).toBe(true);
    const two = [comp('a', 0, 0, 10, 10, true), comp('b', 20, 0, 50, 10)];
    expect(invertComponents(two).map(c => c.isIcon)).toEqual([false, true]);
    expect(two[0].isIcon).toBe(true); // input not mutated
  });

  it('getLogomarkSize uses the union of all icon components after inversion', () => {
    const comps = invertComponents([
      comp('icon', 0, 0, 10, 10, true),
      comp('w1', 20, 0, 30, 40),
      comp('w2', 60, 0, 30, 20),
    ]);
    // union of w1+w2 = x 20..90, y 0..40 -> min side 40
    expect(getLogomarkSize(comps)).toBe(40);
    expect(getIconBounds(comps)!.width).toBe(70);
  });

  it('getLogomarkSize falls back to the whole drawing, then 0', () => {
    expect(getLogomarkSize([comp('a', 0, 0, 30, 60)])).toBe(30);
    expect(getLogomarkSize([])).toBe(0);
  });
});

describe('clearspace units', () => {
  it('scales absolute units with the preview scale, logomark is already scaled', () => {
    expect(convertToPixels(2, 'logomark', 50, 3)).toBe(100);
    expect(convertToPixels(10, 'pixels', 50, 3)).toBe(30);
    expect(convertToPixels(1, 'inches', 0, 2)).toBe(144);
    expect(convertToPixels(2.54, 'centimeters', 0, 1)).toBeCloseTo(72);
  });

  it('guards invalid values', () => {
    expect(convertToPixels(-1, 'pixels', 10)).toBe(0);
    expect(convertToPixels(NaN, 'pixels', 10)).toBe(0);
    expect(convertToPixels(1, 'logomark', NaN)).toBe(0);
    expect(convertToPixels(1, 'pixels', 10, 0)).toBe(1);
    const zones = computeClearspace(new paper.Rectangle(0, 0, 1, 1), 5, 'pixels', 0, 2);
    expect(zones).toEqual({ top: 10, bottom: 10, left: 10, right: 10 });
  });

  it('isClearspaceUnit', () => {
    expect(isClearspaceUnit('inches')).toBe(true);
    expect(isClearspaceUnit('mm')).toBe(false);
  });
});

describe('generateGridLines', () => {
  const bounds = new paper.Rectangle(0, 0, 100, 50);

  it('aligns lines to the icon and covers the bounds', () => {
    const grid = generateGridLines(bounds, [comp('i', 10, 0, 40, 40, true)], 4);
    expect(grid.vertical).toContain(10);
    expect(grid.vertical).toContain(20);
    expect(Math.min(...grid.vertical)).toBeLessThanOrEqual(0);
    expect(Math.max(...grid.vertical)).toBeGreaterThanOrEqual(100);
    expect(grid.horizontal).toContain(0);
    expect(grid.horizontal).toContain(50);
  });

  it('terminates for zero-size references and negative / huge subdivisions', () => {
    const flat = generateGridLines(new paper.Rectangle(0, 0, 100, 0), [], 8);
    expect(flat.horizontal).toEqual([]);
    const neg = generateGridLines(bounds, [comp('i', 0, 0, 10, 10, true)], -4);
    expect(neg.vertical.length).toBeGreaterThan(0);
    expect(neg.vertical.length).toBeLessThan(20);
    const huge = generateGridLines(bounds, [comp('i', 0, 0, 0.001, 0.001, true)], 256);
    expect(huge.vertical.length).toBeLessThanOrEqual(2001);
    expect(clampSubdivisions(-3)).toBe(1);
    expect(clampSubdivisions(1e9)).toBe(256);
    expect(clampSubdivisions(NaN)).toBe(8);
  });
});

describe('exportSVG', () => {
  it('crops to content and keeps namespaces, colors and opacity', () => {
    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(800, 600));
    const r = new scope.Path.Rectangle(new scope.Rectangle(100, 100, 50, 20));
    r.strokeColor = new scope.Color(1, 0, 0, 0.5);
    r.strokeWidth = 2;
    r.fillColor = new scope.Color(0, 0, 1, 0.25);
    const out = exportSVG(scope.project, { margin: 10 });
    expect(out.startsWith('<?xml')).toBe(true);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toMatch(/viewBox="89,89,72,42"/);
    expect(out).toMatch(/stroke="#ff0000"/);
    expect(out).toMatch(/stroke-opacity="0.5"/);
    expect(out).toMatch(/fill-opacity="0.25"/);
    const full = exportSVG(scope.project, { fitToContent: false });
    expect(full).toMatch(/viewBox="0,0,800,600"/);
    scope.project.remove();
  });

  it('finalizeSVGString adds missing namespaces once', () => {
    const out = finalizeSVGString('<svg><use xlink:href="#a"/></svg>');
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toContain('xmlns:xlink=');
    expect(finalizeSVGString(out).match(/<\?xml/g)).toHaveLength(1);
  });
});

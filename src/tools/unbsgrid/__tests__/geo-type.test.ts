import './paper-env';
import paper from 'paper';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  bandFromProfile, segmentLetters, wordmarkScan, groupWords, classifyLetter,
  fitLetterAxis, measureLetterStems, opticalEdgesOf, detectCounters, splitSignature,
  profileInRange, coverageInRange, formatArea, ItemBudget,
  renderWordBaselines, renderLetterHeights, renderLetterRhythm, renderLetterAxes,
  renderLetterStemWidth, renderOpticalEdges, renderCounterAreas, renderDensityCurve,
  renderSignatureRelation, renderXHeightGrid,
  MAX_LETTERS, MAX_COUNTERS,
} from '../components/renderers/type';
import { inkShapes, scanInk, transposeShapes, type Box } from '../components/renderers/extra';
import { MAX_RENDER_ITEMS, type RenderContext } from '../components/renderers/utils';
import { parseSVG, resetPaperProject } from '../lib/svg-engine';
import { renderScene } from '../lib/render-pipeline';
import { createDefaultGeometryStyles } from '../lib/preset-engine';
import { GEOMETRY_KEYS, GEOMETRY_STYLE_DEFAULTS, type GeometryOptions } from '../types/geometry';
import { effectiveGeometryGroups, labelFor } from '../lib/geometry-meta';

const style = { color: '#ff0000', opacity: 1, strokeWidth: 1 };
let scope: paper.PaperScope;

beforeEach(() => {
  scope = new paper.PaperScope();
  scope.setup(new scope.Size(1000, 1000));
});
afterEach(() => {
  scope.project.remove();
  paper.activate();
});

/** Everything the renderers drew (the project's own layers are not items). */
const items = () => scope.project.getItems({}).filter(i => !(i instanceof paper.Layer));
const texts = () => scope.project.getItems({ class: paper.PointText }) as paper.PointText[];
const allText = () => texts().map(t => String(t.content)).join(' | ');
const allFinite = () => items().every(i =>
  [i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));

/** A filled, detached rectangle (what the pipeline hands the renderers). */
function bar(x: number, y: number, w: number, h: number): paper.Path {
  const p = new paper.Path.Rectangle(new paper.Rectangle(x, y, w, h));
  p.fillColor = new paper.Color('black');
  p.remove();
  return p;
}

/** A ring: an outer circle with a hole, i.e. one real counter. */
function ring(cx: number, cy: number, outer: number, inner: number): paper.CompoundPath {
  const cp = new paper.CompoundPath({ insert: false });
  cp.addChild(new paper.Path.Circle(new paper.Point(cx, cy), outer));
  cp.addChild(new paper.Path.Circle(new paper.Point(cx, cy), inner));
  cp.fillColor = new paper.Color('black');
  cp.fillRule = 'evenodd';
  return cp;
}

const ctxOf = (paths: paper.Item[], box: paper.Rectangle): RenderContext =>
  ({ useRealData: true, actualPaths: paths as paper.Path[], contentBounds: box });

/** Three even stems: a minimal "wordmark" with two identical gaps. */
const stemsRect = new paper.Rectangle(0, 0, 200, 100);
const stems = () => [bar(10, 10, 20, 80), bar(70, 10, 20, 80), bar(130, 10, 20, 80)];

// ---------------------------------------------------------------------------

describe('height bands from a coverage profile', () => {
  it('reads top, baseline and x-height out of a profile', () => {
    // 20 rows: rows 2..5 narrow (an ascender), rows 6..15 wide (x-height band).
    const ys = Array.from({ length: 20 }, (_, i) => i + 0.5);
    const covered = ys.map((_, i) => (i < 2 || i > 15 ? 0 : i < 6 ? 10 : 100));
    const band = bandFromProfile(ys, covered, 1)!;
    expect(band).not.toBeNull();
    expect(band.topY).toBeCloseTo(2, 5);
    expect(band.bottomY).toBeCloseTo(16, 5);
    expect(band.xY).not.toBeNull();
    expect(band.xY!).toBeGreaterThan(band.topY);
    expect(band.xY!).toBeLessThan(band.baselineY);
    expect(band.capHeight).toBeGreaterThan(0);
    expect(band.xHeight!).toBeLessThan(band.capHeight);
  });

  it('returns null for empty, flat or degenerate input', () => {
    expect(bandFromProfile([], [], 1)).toBeNull();
    expect(bandFromProfile([0, 1], [0, 0], 1)).toBeNull();
    expect(bandFromProfile([0, 1], [5, 5], 0)).toBeNull();
    const flat = bandFromProfile([0.5, 1.5, 2.5], [4, 4, 4], 1)!;
    expect(flat.xY).toBeNull();
    expect(flat.baselineY).toBeCloseTo(flat.bottomY, 5);
  });
});

describe('letter segmentation', () => {
  it('splits a row of stems into letters and measures the gaps', () => {
    const scan = wordmarkScan(stems(), { x: 0, y: 0, width: 200, height: 100 })!;
    expect(scan).not.toBeNull();
    expect(scan.letters).toHaveLength(3);
    expect(scan.letters[0].left).toBeCloseTo(10, 0);
    expect(scan.letters[0].right).toBeCloseTo(30, 0);
    expect(scan.letters.map(l => Math.round(l.width))).toEqual([20, 20, 20]);
    expect(scan.gaps).toHaveLength(2);
    for (const g of scan.gaps) expect(g.width).toBeCloseTo(40, 0);
    expect(scan.area).toBeGreaterThan(0);
    expect(scan.band).not.toBeNull();
  });

  it('memoizes the scan per (paths, box)', () => {
    const paths = stems();
    const box: Box = { x: 0, y: 0, width: 200, height: 100 };
    expect(wordmarkScan(paths, box)).toBe(wordmarkScan(paths, box));
    expect(wordmarkScan(undefined, box)).toBeNull();
    expect(wordmarkScan(paths, null)).toBeNull();
    expect(wordmarkScan([], box)).toBeNull();
  });

  it('keeps a hairline gap inside one letter and never exceeds MAX_LETTERS', () => {
    const shapes = inkShapes([bar(0, 0, 100, 100)]);
    const box: Box = { x: 0, y: 0, width: 100, height: 100 };
    const cols = scanInk(transposeShapes(shapes), { x: 0, y: 0, width: 100, height: 100 }, 64);
    const rows = scanInk(shapes, box, 64);
    // A huge minimum gap must not shatter a solid block.
    expect(segmentLetters(cols, rows, 50).letters).toHaveLength(1);
    expect(segmentLetters(cols, rows, 0).letters.length).toBeLessThanOrEqual(MAX_LETTERS);
  });

  it('exposes the range helpers it is built on', () => {
    expect(coverageInRange([[0, 10], [20, 30]], 5, 25)).toBeCloseTo(10, 6);
    expect(coverageInRange([], 0, 10)).toBe(0);
    const scan = wordmarkScan(stems(), { x: 0, y: 0, width: 200, height: 100 })!;
    const profile = profileInRange(scan.rows, 0, 200);
    expect(profile).toHaveLength(scan.rows.ys.length);
    expect(Math.max(...profile)).toBeCloseTo(60, 0);
  });
});

describe('words, classes and axes', () => {
  it('splits letters into words at a wide gap only', () => {
    const even = wordmarkScan(stems(), { x: 0, y: 0, width: 200, height: 100 })!;
    expect(groupWords(even)).toHaveLength(1);

    const spaced = [bar(0, 10, 20, 80), bar(26, 10, 20, 80), bar(150, 10, 20, 80), bar(176, 10, 20, 80)];
    const scan = wordmarkScan(spaced, { x: 0, y: 0, width: 200, height: 100 })!;
    const words = groupWords(scan);
    expect(words).toHaveLength(2);
    expect(words[0].to).toBe(1);
    expect(words[1].from).toBe(2);
  });

  it('classifies a letter against the band of the whole set', () => {
    const paths = [bar(0, 0, 20, 100), bar(40, 40, 20, 60), bar(80, 40, 20, 90)];
    const scan = wordmarkScan(paths, { x: 0, y: 0, width: 110, height: 100 })!;
    const tol = Math.max(scan.rows.step, (scan.band!.capHeight) * 0.03);
    const classes = scan.letters.map(l => classifyLetter(l, scan.band!, tol));
    // The set has an x-height step, so a full-height letter reads as an
    // ascender; without that step the same letter would read as a capital.
    expect(['cap', 'asc']).toContain(classes[0]);
    expect(classes).toContain('x');
    expect(classes).toContain('desc');
  });

  it('fits the vertical axis and reads a real slant', () => {
    const upright = wordmarkScan([bar(40, 0, 20, 100)], { x: 0, y: 0, width: 100, height: 100 })!;
    const straight = fitLetterAxis(upright, upright.letters[0])!;
    expect(Math.abs(straight.angle)).toBeLessThan(0.5);

    const slanted = new paper.Path([
      new paper.Point(40, 100), new paper.Point(60, 100),
      new paper.Point(80, 0), new paper.Point(60, 0),
    ]);
    slanted.closed = true;
    slanted.fillColor = new paper.Color('black');
    slanted.remove();
    const scan = wordmarkScan([slanted], { x: 0, y: 0, width: 120, height: 100 })!;
    const axis = fitLetterAxis(scan, scan.letters[0])!;
    // Top is 20px to the right over 100px of height -> about 11.3 degrees.
    expect(axis.angle).toBeGreaterThan(8);
    expect(axis.angle).toBeLessThan(15);
    expect([axis.topX, axis.bottomX, axis.topY, axis.bottomY].every(Number.isFinite)).toBe(true);
  });
});

describe('stems, edges and counters', () => {
  it('measures the median stem of each letter', () => {
    const paths = [bar(10, 10, 10, 80), bar(50, 10, 30, 80)];
    const scan = wordmarkScan(paths, { x: 0, y: 0, width: 100, height: 100 })!;
    const stemStats = measureLetterStems(scan);
    expect(stemStats).toHaveLength(2);
    expect(stemStats[0].median).toBeCloseTo(10, 0);
    expect(stemStats[1].median).toBeCloseTo(30, 0);
    expect(stemStats.every(s => s.samples > 0 && s.min > 0)).toBe(true);
  });

  it('puts the optical edge inside the geometric one for a round shape', () => {
    const circle = new paper.Path.Circle(new paper.Point(50, 50), 40);
    circle.fillColor = new paper.Color('black');
    circle.remove();
    const scan = wordmarkScan([circle], { x: 0, y: 0, width: 100, height: 100 })!;
    const edges = opticalEdgesOf(scan)!;
    expect(edges.left).toBeGreaterThan(edges.geomLeft);
    expect(edges.right).toBeLessThan(edges.geomRight);
    expect(edges.top).toBeGreaterThan(edges.geomTop);
    expect(edges.bottom).toBeLessThan(edges.geomBottom);

    // A square has (almost) no optical overshoot.
    const square = wordmarkScan([bar(10, 10, 80, 80)], { x: 0, y: 0, width: 100, height: 100 })!;
    const flat = opticalEdgesOf(square)!;
    expect(flat.left - flat.geomLeft).toBeLessThan(4);
  });

  it('finds the closed counter of a ring and ignores the open gap of an H', () => {
    const r = ring(50, 50, 40, 22);
    const scan = wordmarkScan([r], { x: 0, y: 0, width: 100, height: 100 })!;
    const counters = detectCounters(scan, scan.letters[0]);
    expect(counters).toHaveLength(1);
    expect(counters[0].area).toBeGreaterThan(Math.PI * 22 * 22 * 0.75);
    expect(counters[0].area).toBeLessThan(Math.PI * 22 * 22 * 1.25);
    expect([counters[0].center.x, counters[0].center.y].every(Number.isFinite)).toBe(true);

    // H: two stems joined by a crossbar. The space above and below the bar
    // reaches the top and the bottom of the letter, so it is not a counter.
    const h = [bar(10, 10, 12, 80), bar(58, 10, 12, 80), bar(10, 44, 60, 12)];
    const hScan = wordmarkScan(h, { x: 0, y: 0, width: 100, height: 100 })!;
    expect(hScan.letters).toHaveLength(1);
    expect(detectCounters(hScan, hScan.letters[0])).toHaveLength(0);
  });

  it('caps the counters a single render outlines', () => {
    expect(MAX_COUNTERS).toBeLessThanOrEqual(MAX_RENDER_ITEMS);
    const budget = new ItemBudget(3);
    expect(budget.take(2)).toBe(true);
    expect(budget.take(2)).toBe(false);
    expect(budget.take(1)).toBe(true);
    expect(budget.left).toBe(0);
  });
});

describe('signature split', () => {
  it('prefers the component flags over the ink gaps', () => {
    const scan = wordmarkScan(stems(), { x: 0, y: 0, width: 200, height: 100 })!;
    const comps = [new paper.Rectangle(0, 0, 40, 100), new paper.Rectangle(80, 30, 120, 40)];
    const parts = splitSignature(scan, comps, [true, false])!;
    expect(parts.fromComponents).toBe(true);
    expect(parts.symbol.width).toBeCloseTo(40, 5);
    expect(parts.text.width).toBeCloseTo(120, 5);
  });

  it('falls back to the widest gap, and refuses an evenly spaced wordmark', () => {
    const even = wordmarkScan(stems(), { x: 0, y: 0, width: 200, height: 100 })!;
    expect(splitSignature(even, [], [])).toBeNull();

    const lockup = [bar(0, 10, 60, 80), bar(160, 40, 14, 40), bar(182, 40, 14, 40), bar(204, 40, 14, 40)];
    const scan = wordmarkScan(lockup, { x: 0, y: 0, width: 240, height: 100 })!;
    const parts = splitSignature(scan, [], [])!;
    expect(parts).not.toBeNull();
    expect(parts.fromComponents).toBe(false);
    expect(parts.symbol.x).toBeCloseTo(0, 0);
    expect(parts.text.x).toBeCloseTo(160, 0);
  });
});

describe('renderers draw finite geometry and survive missing data', () => {
  const allRenderers: Array<[string, (b: paper.Rectangle, c?: RenderContext) => void]> = [
    ['wordBaselines', (b, c) => renderWordBaselines(b, style, c)],
    ['letterHeights', (b, c) => renderLetterHeights(b, style, c)],
    ['letterRhythm', (b, c) => renderLetterRhythm(b, style, c)],
    ['letterAxes', (b, c) => renderLetterAxes(b, style, c)],
    ['letterStemWidth', (b, c) => renderLetterStemWidth(b, style, c)],
    ['opticalEdges', (b, c) => renderOpticalEdges(b, style, c)],
    ['counterAreas', (b, c) => renderCounterAreas(b, style, c)],
    ['densityCurve', (b, c) => renderDensityCurve(b, style, c)],
    ['xHeightGrid', (b, c) => renderXHeightGrid(b, style, c)],
    ['signatureRelation', (b, c) => renderSignatureRelation(b, [], [], style, c)],
  ];

  it('draws nothing at all without real paths, an empty box or a degenerate rect', () => {
    for (const [name, run] of allRenderers) {
      scope.project.clear();
      expect(() => run(stemsRect), name).not.toThrow();
      expect(() => run(stemsRect, { useRealData: true, actualPaths: [] }), name).not.toThrow();
      expect(() => run(new paper.Rectangle(0, 0, 0, 0), ctxOf([bar(0, 0, 1, 1)], new paper.Rectangle(0, 0, 0, 0))), name).not.toThrow();
      expect(items(), name).toHaveLength(0);
    }
  });

  it('stays inside MAX_RENDER_ITEMS and finite for every construction', () => {
    const paths = [...stems(), ring(180, 50, 22, 11)];
    const box = new paper.Rectangle(0, 0, 220, 100);
    for (const [name, run] of allRenderers) {
      scope.project.clear();
      run(box, ctxOf(paths, box));
      expect(items().length, name).toBeLessThan(MAX_RENDER_ITEMS);
      expect(allFinite(), name).toBe(true);
    }
  });

  it('reports the numbers a designer reads', () => {
    const paths = stems();
    const box = new paper.Rectangle(0, 0, 200, 100);
    const ctx = ctxOf(paths, box);

    scope.project.clear();
    renderLetterRhythm(box, style, ctx);
    expect(allText()).toMatch(/ritmo/);
    expect(allText()).toMatch(/variação/);

    scope.project.clear();
    renderLetterStemWidth(box, style, ctx);
    expect(allText()).toMatch(/haste/);
    expect(allText()).toMatch(/contraste/);

    scope.project.clear();
    renderLetterAxes(box, style, ctx);
    expect(allText()).toMatch(/eixo/);

    scope.project.clear();
    renderXHeightGrid(box, style, ctx);
    expect(allText()).toMatch(/módulo/);

    scope.project.clear();
    renderDensityCurve(box, style, ctx);
    expect(allText()).toMatch(/densidade/);

    scope.project.clear();
    renderWordBaselines(box, style, ctx);
    expect(allText()).toMatch(/palavra|palavras/);

    scope.project.clear();
    renderCounterAreas(box, style, ctxOf([ring(50, 50, 40, 20)], new paper.Rectangle(0, 0, 100, 100)));
    expect(allText()).toMatch(/contraforma/);

    scope.project.clear();
    renderOpticalEdges(box, style, ctx);
    expect(allText()).toMatch(/óptica/);

    scope.project.clear();
    renderSignatureRelation(
      new paper.Rectangle(0, 0, 200, 100),
      [new paper.Rectangle(0, 0, 40, 100), new paper.Rectangle(80, 30, 120, 40)],
      [true, false], style, ctx,
    );
    expect(allText()).toMatch(/símbolo/);
  });

  it('labels use SVG units when the context knows the scale', () => {
    const box = new paper.Rectangle(0, 0, 200, 100);
    renderLetterRhythm(box, style, { ...ctxOf(stems(), box), unitsPerPixel: 0.5 });
    expect(allText()).toMatch(/u\b/);
    expect(formatArea(400, { unitsPerPixel: 0.5 })).toBe('100u²');
    expect(formatArea(400)).toBe('400px²');
    expect(formatArea(-1)).toBe('—');
  });
});

describe('registration', () => {
  it('every new construction is registered, labelled and grouped', () => {
    const newKeys = [
      'wordBaselines', 'letterHeights', 'letterRhythm', 'letterAxes', 'letterStemWidth',
      'opticalEdges', 'counterAreas', 'densityCurve', 'signatureRelation', 'xHeightGrid',
    ] as const;
    const grouped = new Set(effectiveGeometryGroups.flatMap(g => g.keys as string[]));
    for (const key of newKeys) {
      expect(GEOMETRY_KEYS as readonly string[], key).toContain(key);
      expect(GEOMETRY_STYLE_DEFAULTS[key], key).toBeDefined();
      expect(labelFor(key), key).not.toBe(key);
      expect(grouped.has(key), key).toBe(true);
    }
    expect(effectiveGeometryGroups.map(g => g.label)).toEqual(expect.arrayContaining(['Tipografia', 'Assinatura']));
    // No key ends up in the "Outras" bucket.
    expect(effectiveGeometryGroups.some(g => g.label === 'Outras')).toBe(false);
  });
});

describe('pipeline wiring', () => {
  const WORDMARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 196 56">
    <g fill="none" stroke="#111" stroke-width="8">
      <path d="M14 12 V44 H34"/>
      <circle cx="62" cy="28" r="16"/>
      <path d="M92 12 V44"/>
      <path d="M110 44 V12 L134 44 V12"/>
      <path d="M152 12 V44 M152 28 H176 M176 12 V44"/>
    </g>
  </svg>`;

  it('renders every construction, the typographic ones included, without errors', () => {
    const parsed = parseSVG(WORDMARK);
    const on = Object.fromEntries(GEOMETRY_KEYS.map(k => [k, true])) as unknown as GeometryOptions;
    resetPaperProject(null, scope, { width: 900, height: 600 });
    const res = renderScene(
      parsed,
      {
        clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
        geometryOptions: on, geometryStyles: createDefaultGeometryStyles(),
      },
      { width: 900, height: 600 },
      { scope, layered: true },
    );
    expect(res.errors).toEqual([]);
    const layers = scope.project.layers.map(l => l.name);
    for (const id of ['word-baselines', 'letter-heights', 'letter-rhythm', 'letter-axes',
      'letter-stem-width', 'optical-edges', 'density-curve', 'x-height-grid']) {
      expect(layers, id).toContain(id);
    }
    const bad = scope.project.getItems({}).filter(i =>
      ![i.bounds.x, i.bounds.y, i.bounds.width, i.bounds.height].every(Number.isFinite));
    expect(bad).toHaveLength(0);
  });

  it('falls back to the registered default style when the preset has none', () => {
    const parsed = parseSVG(WORDMARK);
    const on = { wordBaselines: true } as unknown as GeometryOptions;
    resetPaperProject(null, scope, { width: 900, height: 600 });
    const res = renderScene(
      parsed,
      {
        clearspaceValue: 0, clearspaceUnit: 'logomark', showGrid: false, gridSubdivisions: 8,
        geometryOptions: on,
        // A preset written before these constructions existed: no style at all.
        geometryStyles: {} as never,
      },
      { width: 900, height: 600 },
      { scope, layered: true },
    );
    expect(res.errors).toEqual([]);
    const drawn = scope.project.getItems({ class: paper.Path }) as paper.Path[];
    expect(drawn.length).toBeGreaterThan(0);
    const expected = new paper.Color(GEOMETRY_STYLE_DEFAULTS.wordBaselines!.color);
    const stroked = drawn.filter(p => p.strokeColor);
    expect(stroked.length).toBeGreaterThan(0);
    expect(stroked.some(p => Math.abs(p.strokeColor!.red - expected.red) < 0.02
      && Math.abs(p.strokeColor!.green - expected.green) < 0.02
      && Math.abs(p.strokeColor!.blue - expected.blue) < 0.02)).toBe(true);
  });
});

describe('extreme inputs never break the typographic analysis', () => {
  it('handles a microscopic and a gigantic wordmark', () => {
    for (const [paths, box] of [
      [[bar(0, 0, 0.4, 0.9), bar(0.6, 0, 0.4, 0.9)], new paper.Rectangle(0, 0, 1, 0.9)],
      [[bar(0, 0, 40000, 90000), bar(60000, 0, 40000, 90000)], new paper.Rectangle(0, 0, 100000, 90000)],
    ] as Array<[paper.Path[], paper.Rectangle]>) {
      scope.project.clear();
      const ctx = ctxOf(paths, box);
      expect(() => {
        renderWordBaselines(box, style, ctx);
        renderLetterHeights(box, style, ctx);
        renderLetterRhythm(box, style, ctx);
        renderLetterAxes(box, style, ctx);
        renderLetterStemWidth(box, style, ctx);
        renderOpticalEdges(box, style, ctx);
        renderCounterAreas(box, style, ctx);
        renderDensityCurve(box, style, ctx);
        renderXHeightGrid(box, style, ctx);
        renderSignatureRelation(box, [], [], style, ctx);
      }).not.toThrow();
      expect(allFinite()).toBe(true);
      expect(items().length).toBeLessThan(MAX_RENDER_ITEMS);
    }
  });
});

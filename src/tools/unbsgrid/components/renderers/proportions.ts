/**
 * Proportion constructions: golden ratio, golden spiral, thirds, typographic
 * guides and the rule of odds.
 *
 * Every decorative length goes through `metricsFor` (see ./scale) and every
 * construction prefers the real ink (`context.contentBounds` /
 * `context.actualPaths`) over the item bounding box.
 */
import paper from 'paper';
import {
  hexToColor, showIfIntersects, fitGoldenRect, computeGoldenSpiralSteps, arcPoint, isUsableRect,
  formatLength, ratioMatchPercent, PHI,
  type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor } from './scale';
import { frameOf } from './basic';

const SUPERSCRIPT = ['', '¹', '²', '³', '⁴', '⁵', '⁶'];

/**
 * GOLDEN RATIO
 * Concentric circles in a true φ progression (r, r/φ, r/φ², …) plus the
 * largest golden rectangle that fits the logo, cut at its golden section.
 */
export function renderGoldenRatio(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const cx = frame.center.x;
  const cy = frame.center.y;
  const baseRadius = Math.min(frame.width, frame.height) / 2;

  // The old code used Fibonacci integers (1,2,3,5,8,13) as radii: the inner
  // steps are 2.0 and 1.5, not φ. A φ progression is exact at every step.
  const STEPS = 6;
  for (let k = 0; k < STEPS; k++) {
    const r = baseRadius / Math.pow(PHI, k);
    if (!(r > 0) || !Number.isFinite(r)) break;
    const circle = new paper.Path.Circle(new paper.Point(cx, cy), r);
    showIfIntersects(circle, context, () => {
      circle.strokeColor = color;
      circle.strokeWidth = m.stroke(style.strokeWidth);
      circle.fillColor = null;
      if (r > m.len(12)) {
        const label = new paper.PointText(new paper.Point(cx + r + m.len(4), cy - m.len(2)));
        label.content = k === 0 ? 'r' : `φ⁻${SUPERSCRIPT[k] ?? k}`;
        label.fillColor = hexToColor(style.color, style.opacity * 0.8);
        label.fontSize = m.font(9);
        label.fontWeight = 'bold';
      }
    });
  }

  // Golden rectangle fitted inside the frame, in the frame's orientation.
  const gr = fitGoldenRect(frame);
  const grRect = new paper.Path.Rectangle(new paper.Point(gr.x, gr.y), new paper.Size(gr.width, gr.height));
  showIfIntersects(grRect, context, () => {
    grRect.strokeColor = dimColor;
    grRect.strokeWidth = m.stroke(style.strokeWidth);
    grRect.fillColor = null;
    grRect.dashArray = m.dash(6, 4);
  });

  // The golden section itself: the cut that leaves a square and a smaller
  // golden rectangle (drawn as a line, not a square, to stay legible).
  const [cut] = computeGoldenSpiralSteps(gr, 1, 0);
  if (cut) {
    const [x1, y1, x2, y2] = cut.divider;
    const div = new paper.Path.Line(new paper.Point(x1, y1), new paper.Point(x2, y2));
    div.strokeColor = dimColor;
    div.strokeWidth = m.stroke(style.strokeWidth * 0.6);
    div.dashArray = m.dash(3, 3);
  }

  // Measured aspect ratio of the logo vs φ.
  const long = Math.max(frame.width, frame.height);
  const short = Math.min(frame.width, frame.height);
  if (short > 0) {
    const ratio = long / short;
    const pct = ratioMatchPercent(ratio, PHI);
    const label = new paper.PointText(new paper.Point(cx, frame.bottom + m.len(14)));
    label.content = pct >= 99 ? `${ratio.toFixed(3)} · φ ✓` : `${ratio.toFixed(3)} · φ ${pct.toFixed(0)}%`;
    label.fillColor = hexToColor(style.color, style.opacity * (pct >= 99 ? 0.85 : 0.5));
    label.fontSize = m.font(8);
    label.justification = 'center';
  }
}

/**
 * GOLDEN SPIRAL
 * One continuous polyline of quarter arcs over the square cuts of the fitted
 * golden rectangle (landscape starts left, portrait starts top).
 */
export function renderGoldenSpiral(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);

  const golden = fitGoldenRect(frame);
  const outerRect = new paper.Path.Rectangle(
    new paper.Point(golden.x, golden.y), new paper.Size(golden.width, golden.height)
  );
  showIfIntersects(outerRect, context, () => {
    outerRect.strokeColor = dimColor;
    outerRect.strokeWidth = m.stroke(style.strokeWidth * 0.7);
    outerRect.fillColor = null;
    outerRect.dashArray = m.dash(4, 3);
  });

  // The smallest square worth drawing scales with the output, so a big export
  // does not spend 12 steps on sub-pixel arcs.
  const steps = computeGoldenSpiralSteps(golden, 12, Math.max(0.25, m.len(0.5)));
  if (!steps.length) return;

  for (const step of steps) {
    const [x1, y1, x2, y2] = step.divider;
    const div = new paper.Path.Line(new paper.Point(x1, y1), new paper.Point(x2, y2));
    div.strokeColor = dimColor;
    div.strokeWidth = m.stroke(style.strokeWidth * 0.4);
    div.dashArray = m.dash(2, 2);
  }

  // One path: each quarter arc starts exactly where the previous one ended,
  // so the spiral is a single continuous stroke instead of 12 loose arcs.
  const spiral = new paper.Path();
  const start = arcPoint(steps[0], steps[0].startAngle);
  spiral.add(new paper.Point(start.x, start.y));
  for (const step of steps) {
    const through = arcPoint(step, step.startAngle + 45);
    const to = arcPoint(step, step.startAngle + 90);
    spiral.arcTo(new paper.Point(through.x, through.y), new paper.Point(to.x, to.y));
  }
  showIfIntersects(spiral, context, () => {
    spiral.strokeColor = color;
    spiral.strokeWidth = m.stroke(style.strokeWidth);
    spiral.fillColor = null;
  });
}

/**
 * RULE OF THIRDS
 * Exact 1/3 and 2/3 divisions of the real ink frame, with power points at the
 * intersections that survived the real-data filter.
 */
export function renderThirdLines(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dotColor = hexToColor(style.color, style.opacity * 0.8);
  const over = m.len(20);

  const shownVLines: number[] = [];
  const shownHLines: number[] = [];

  for (let i = 1; i <= 2; i++) {
    const x = frame.left + (frame.width * i) / 3;
    const line = new paper.Path.Line(new paper.Point(x, frame.top - over), new paper.Point(x, frame.bottom + over));
    showIfIntersects(line, context, () => {
      line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth); line.dashArray = m.dash(6, 4);
      shownVLines.push(x);
    });

    const y = frame.top + (frame.height * i) / 3;
    const hLine = new paper.Path.Line(new paper.Point(frame.left - over, y), new paper.Point(frame.right + over, y));
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = color; hLine.strokeWidth = m.stroke(style.strokeWidth); hLine.dashArray = m.dash(6, 4);
      shownHLines.push(y);
    });
  }

  // Power points only where two drawn lines actually cross. Without real data
  // every line is drawn, so all four points appear.
  const r = m.dot(2) + m.stroke(style.strokeWidth);
  for (const x of shownVLines) {
    for (const y of shownHLines) {
      const dot = new paper.Path.Circle(new paper.Point(x, y), r);
      dot.fillColor = dotColor; dot.strokeColor = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Typographic proportions derived from the real vertical ink distribution
// ---------------------------------------------------------------------------

/** Total covered length of a set of 1D spans (overlaps counted once). */
export function unionLength(spans: Array<[number, number]>): number {
  if (!spans.length) return 0;
  const sorted = spans
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((p, q) => p[0] - q[0]);
  let total = 0;
  let start = NaN;
  let end = NaN;
  for (const [a, b] of sorted) {
    if (Number.isNaN(start)) { start = a; end = b; continue; }
    if (a > end) { total += end - start; start = a; end = b; }
    else if (b > end) end = b;
  }
  if (!Number.isNaN(start)) total += end - start;
  return total;
}

/**
 * Horizontal ink coverage per scan row — the histogram that reveals baseline,
 * x-height and cap-height of a real drawing. Closed contours contribute the
 * spans between paired crossings; open (stroked) paths contribute their
 * stroke width around each crossing.
 */
export function inkRowProfile(
  paths: readonly paper.Path[] | undefined,
  rect: { top: number; bottom: number; left: number; right: number },
  rows = 96,
): number[] | null {
  if (!paths || paths.length === 0) return null;
  const height = rect.bottom - rect.top;
  const width = rect.right - rect.left;
  if (!(height > 0) || !(width > 0) || !Number.isFinite(height) || !Number.isFinite(width)) return null;

  const n = Math.max(8, Math.min(256, Math.round(rows)));
  const step = height / n;
  const pad = Math.max(width * 0.02, 1e-6);
  const profile = new Array<number>(n).fill(0);

  const probe = new paper.Path.Line(
    new paper.Point(rect.left - pad, rect.top),
    new paper.Point(rect.right + pad, rect.top),
  );
  probe.remove();

  for (let i = 0; i < n; i++) {
    const y = rect.top + (i + 0.5) * step;
    probe.firstSegment.point = new paper.Point(rect.left - pad, y);
    probe.lastSegment.point = new paper.Point(rect.right + pad, y);
    const spans: Array<[number, number]> = [];
    for (const p of paths) {
      const pb = p.bounds;
      if (pb.top > y || pb.bottom < y) continue;
      const xs = probe.getIntersections(p)
        .map(loc => loc.point.x)
        .filter(v => Number.isFinite(v))
        .sort((a, b) => a - b);
      if (!xs.length) continue;
      if (p.closed) {
        for (let k = 0; k + 1 < xs.length; k += 2) spans.push([xs[k], xs[k + 1]]);
      } else {
        const t = Math.max(p.strokeWidth || 0, step) / 2;
        for (const x of xs) spans.push([x - t, x + t]);
      }
    }
    profile[i] = unionLength(spans);
  }
  return profile;
}

export interface TypographicGuides {
  ascender: number;
  capHeight: number;
  xHeight: number;
  baseline: number;
  descender: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Turn a coverage histogram into type metrics:
 *  - ascender / descender: first and last row holding ink;
 *  - baseline: the sharpest coverage drop in the lower part (where the stems
 *    end and only descenders continue);
 *  - x-height: the sharpest coverage rise in the upper part (where lowercase
 *    bodies start);
 *  - cap height: the first row reaching half the median coverage of the body.
 * Returns null when the histogram has no usable ink.
 */
export function deriveTypographicGuides(
  profile: readonly number[] | null | undefined,
  top: number,
  height: number,
): TypographicGuides | null {
  if (!profile || profile.length < 8) return null;
  const n = profile.length;
  const step = height / n;
  if (!(step > 0) || !Number.isFinite(top)) return null;

  let max = 0;
  for (const v of profile) if (Number.isFinite(v) && v > max) max = v;
  if (!(max > 0)) return null;

  const thr = max * 0.02;
  let first = -1, last = -1;
  for (let i = 0; i < n; i++) {
    if (profile[i] > thr) { if (first < 0) first = i; last = i; }
  }
  if (first < 0 || last <= first) return null;

  const edge = (i: number) => top + i * step;
  const ascender = edge(first);
  const descender = edge(last + 1);
  const span = last - first + 1;

  let baselineRow = last + 1;
  let bestDrop = 0;
  for (let i = first + Math.floor(span * 0.4); i <= last; i++) {
    const next = i + 1 <= last ? profile[i + 1] : 0;
    const drop = profile[i] - next;
    if (drop > bestDrop) { bestDrop = drop; baselineRow = i + 1; }
  }
  if (bestDrop < max * 0.15) baselineRow = last + 1;

  let xRow = -1;
  let bestRise = 0;
  const highTo = Math.min(first + Math.floor(span * 0.7), baselineRow - 1);
  for (let i = first; i < highTo; i++) {
    const rise = profile[i + 1] - profile[i];
    if (rise > bestRise) { bestRise = rise; xRow = i + 1; }
  }
  const hasX = xRow > first && bestRise >= max * 0.15;

  const body = profile.slice(hasX ? xRow : first, Math.max(baselineRow, (hasX ? xRow : first) + 1));
  const med = median(body) || max;
  let capRow = first;
  for (let i = first; i < baselineRow; i++) {
    if (profile[i] >= med * 0.5) { capRow = i; break; }
  }

  const baseline = edge(baselineRow);
  const capHeight = edge(capRow);
  const xHeight = hasX ? edge(xRow) : capHeight + (baseline - capHeight) * 0.5;

  // Keep the classic ordering even if the histogram is noisy.
  const a = ascender;
  const c = Math.max(a, Math.min(capHeight, baseline));
  const x = Math.max(c, Math.min(xHeight, baseline));
  const b = Math.max(x, Math.min(baseline, descender));
  return { ascender: a, capHeight: c, xHeight: x, baseline: b, descender: Math.max(b, descender) };
}

/**
 * TYPOGRAPHIC PROPORTIONS
 * With real data the five lines come from the vertical ink histogram of the
 * logo. Without it they fall back to a conventional ratio table (the old
 * behaviour), which is clearly a guess and is labelled as such.
 */
export function renderTypographicProportions(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);

  let guides: Array<{ name: string; y: number }> = [];
  let derived: TypographicGuides | null = null;

  if (context?.useRealData && context.actualPaths?.length) {
    // Row count follows the path count: a 400-path logo still scans in a
    // bounded number of intersection queries.
    const rows = Math.max(48, Math.min(128, Math.round(8192 / context.actualPaths.length)));
    const profile = inkRowProfile(context.actualPaths, {
      top: frame.top, bottom: frame.bottom, left: frame.left, right: frame.right,
    }, rows);
    derived = deriveTypographicGuides(profile, frame.top, frame.height);
  }

  if (derived) {
    guides = [
      { name: 'Ascender', y: derived.ascender },
      { name: 'Cap height', y: derived.capHeight },
      { name: 'x-height', y: derived.xHeight },
      { name: 'Baseline', y: derived.baseline },
      { name: 'Descender', y: derived.descender },
    ];
  } else {
    // Fallback ratios (no real data): conventional, not measured.
    guides = [
      { name: 'Ascender', y: frame.top - 0.1 * frame.height },
      { name: 'Cap height', y: frame.top },
      { name: 'x-height', y: frame.top + 0.4 * frame.height },
      { name: 'Baseline', y: frame.top + frame.height },
      { name: 'Descender', y: frame.top + 1.15 * frame.height },
    ];
  }

  // Merge lines that land on the same row (a solid mark has no ascender above
  // its cap height) so their labels do not overlap.
  const merged: Array<{ names: string[]; y: number }> = [];
  const eps = Math.max(m.len(1), frame.height / 256);
  for (const g of guides) {
    if (!Number.isFinite(g.y)) continue;
    const prev = merged[merged.length - 1];
    if (prev && Math.abs(prev.y - g.y) <= eps) prev.names.push(g.name);
    else merged.push({ names: [g.name], y: g.y });
  }

  const capY = derived ? derived.capHeight : frame.top;
  const baseY = derived ? derived.baseline : frame.bottom;
  const capSpan = baseY - capY;

  merged.forEach(g => {
    const line = new paper.Path.Line(
      new paper.Point(frame.left - m.len(60), g.y),
      new paper.Point(frame.right + m.len(30), g.y),
    );
    const apply = () => {
      line.strokeColor = color;
      line.strokeWidth = m.stroke(style.strokeWidth);
      line.dashArray = m.dash(6, 3);
      const label = new paper.PointText(new paper.Point(frame.left - m.len(65), g.y + m.len(3)));
      let text = g.names.join(' / ');
      // x-height is the one ratio a designer reads off this construction.
      if (derived && g.names.includes('x-height') && capSpan > 0) {
        const pct = Math.round(((baseY - g.y) / capSpan) * 100);
        text += ` · ${pct}% · ${formatLength(baseY - g.y, context)}`;
      }
      label.content = text;
      label.fillColor = labelColor;
      label.fontSize = m.font(8);
      label.justification = 'right';
    };
    // Derived lines describe the ink by construction; only the fallback table
    // needs the intersection filter to stay attached to the drawing.
    if (derived) apply(); else showIfIntersects(line, context, apply);
  });
}

/**
 * RULE OF ODDS
 * Exact fifths (and lighter sevenths) of the real ink frame.
 */
export function renderRuleOfOdds(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const frame = frameOf(bounds, context);
  if (!isUsableRect(frame)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.6);
  const dimColor = hexToColor(style.color, style.opacity * 0.4);

  const over5 = m.len(15);
  for (let i = 1; i < 5; i++) {
    const x = frame.left + (frame.width * i) / 5;
    const line = new paper.Path.Line(new paper.Point(x, frame.top - over5), new paper.Point(x, frame.bottom + over5));
    showIfIntersects(line, context, () => {
      line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth); line.dashArray = m.dash(6, 3);
    });

    const y = frame.top + (frame.height * i) / 5;
    const hLine = new paper.Path.Line(new paper.Point(frame.left - over5, y), new paper.Point(frame.right + over5, y));
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = color; hLine.strokeWidth = m.stroke(style.strokeWidth); hLine.dashArray = m.dash(6, 3);
    });
  }

  const over7 = m.len(8);
  for (let i = 1; i < 7; i++) {
    const x = frame.left + (frame.width * i) / 7;
    const line = new paper.Path.Line(new paper.Point(x, frame.top - over7), new paper.Point(x, frame.bottom + over7));
    showIfIntersects(line, context, () => {
      line.strokeColor = dimColor; line.strokeWidth = m.stroke(style.strokeWidth * 0.5); line.dashArray = m.dash(2, 4);
    });

    const y = frame.top + (frame.height * i) / 7;
    const hLine = new paper.Path.Line(new paper.Point(frame.left - over7, y), new paper.Point(frame.right + over7, y));
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = dimColor; hLine.strokeWidth = m.stroke(style.strokeWidth * 0.5); hLine.dashArray = m.dash(2, 4);
    });
  }

  const l5 = new paper.PointText(new paper.Point(frame.right + m.len(18), frame.top + frame.height / 5 + m.len(3)));
  l5.content = '1/5'; l5.fillColor = labelColor; l5.fontSize = m.font(7);
  const l7 = new paper.PointText(new paper.Point(frame.right + m.len(18), frame.top + frame.height / 7 + m.len(3)));
  l7.content = '1/7'; l7.fillColor = hexToColor(style.color, style.opacity * 0.35); l7.fontSize = m.font(7);
}

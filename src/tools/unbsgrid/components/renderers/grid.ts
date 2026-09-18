import paper from 'paper';
import {
  hexToColor, showIfIntersects, isUsableRect, sanitizeSubdivisions, clipLineToRect,
  formatLength, MAX_RENDER_ITEMS,
  type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor } from './scale';
import { boxOf, inkMassProfile } from './extra';
import { computeInkCentroid, paperToShapes, scanlineCoverage, strokeInk } from '../../lib/metrics';

/** Ink fraction per quadrant (TL, TR, BL, BR) around the bounds center, or null. */
export function inkQuadrantWeights(paths: paper.Item[], bounds: paper.Rectangle): number[] | null {
  const { fills, strokes } = paperToShapes(paths, 0.75);
  const split = { x: bounds.center.x, y: bounds.center.y };
  const cov = fills.length ? scanlineCoverage(fills, { rows: 128, split }) : null;
  const st = strokeInk(strokes, split);
  const total = (cov?.area ?? 0) + st.area;
  if (!(total > 0)) return null;
  const fa = cov?.area ?? 0;
  const q = cov?.quadrants ?? { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 };
  return [
    (q.topLeft * fa + st.q.topLeft) / total,
    (q.topRight * fa + st.q.topRight) / total,
    (q.bottomLeft * fa + st.q.bottomLeft) / total,
    (q.bottomRight * fa + st.q.bottomRight) / total,
  ];
}

/** The rectangle the guides should be built on: the real ink box when known. */
function referenceRect(bounds: paper.Rectangle, context?: RenderContext): paper.Rectangle {
  const cb = context?.useRealData ? context?.contentBounds : null;
  return cb && isUsableRect(cb) ? cb : bounds;
}

export function renderIsometricGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  subdivisions: number,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const ref = referenceRect(bounds, context);
  if (!isUsableRect(ref)) return;
  const m = metricsFor(context, bounds);
  const subs = sanitizeSubdivisions(subdivisions);
  const color = hexToColor(style.color, style.opacity);
  const cx = ref.center.x;
  const cy = ref.center.y;
  const extent = Math.max(ref.width, ref.height) * 1.2;
  const step = Math.min(ref.width, ref.height) / subs;
  if (!(step > 0) || !Number.isFinite(step)) return;
  // Enough lines to cover the LONG side too (±subdivisions only covered a
  // square around the center of wide wordmarks), capped for performance.
  const count = Math.min(Math.ceil((extent * 1.2) / step), Math.floor(MAX_RENDER_ITEMS / 6));
  // Lines are clipped to the reference rect: an isometric grid drifting far
  // outside the artwork is only off-canvas noise.
  const left = ref.left, right = ref.right, top = ref.top, bottom = ref.bottom;

  const angles = [30, 150];
  angles.forEach(angleDeg => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const perpDx = -dy;
    const perpDy = dx;

    for (let i = -count; i <= count; i++) {
      const ox = cx + perpDx * step * i;
      const oy = cy + perpDy * step * i;
      const clipped = clipLineToRect(
        ox - dx * extent, oy - dy * extent, ox + dx * extent, oy + dy * extent,
        left, top, right, bottom,
      );
      if (!clipped) continue;
      const line = new paper.Path.Line(
        new paper.Point(clipped[0], clipped[1]),
        new paper.Point(clipped[2], clipped[3])
      );
      showIfIntersects(line, context, () => {
        line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth);
        if (i !== 0) line.dashArray = m.dash(4, 4);
      });
    }
  });

  for (let i = -count; i <= count; i++) {
    const x = cx + step * i;
    if (x < left - 1e-9 || x > right + 1e-9) continue;
    const line = new paper.Path.Line(new paper.Point(x, top), new paper.Point(x, bottom));
    showIfIntersects(line, context, () => {
      line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth * 0.5); line.dashArray = m.dash(2, 4);
    });
  }
}

/**
 * Module the artwork is actually drawn on: the largest step that a strong
 * majority of the anchor coordinates snap to. Returns null when nothing fits,
 * so the caller can fall back to the subdivision-derived step.
 */
export function inferPixelStep(
  paths: paper.Item[] | undefined,
  box: { x: number; y: number; width: number; height: number },
  options: { minStep?: number; maxDivisions?: number; minScore?: number } = {},
): { step: number; score: number; divisions: number } | null {
  if (!paths || paths.length === 0) return null;
  if (!isUsableRect(box)) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of paths) {
    const segs = (p as paper.Path).segments;
    if (!segs) continue;
    for (const s of segs) {
      const pt = s.point;
      if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
      xs.push(pt.x - box.x);
      ys.push(pt.y - box.y);
      if (xs.length > 4000) break;
    }
    if (xs.length > 4000) break;
  }
  if (xs.length < 4) return null;

  const minStep = options.minStep ?? 0;
  const maxDiv = Math.max(2, Math.min(64, options.maxDivisions ?? 32));
  const minScore = options.minScore ?? 0.7;
  let best: { step: number; score: number; divisions: number } | null = null;

  for (let n = 2; n <= maxDiv; n++) {
    const step = box.width / n;
    if (!(step > 0) || step < minStep) continue;
    // a pixel module must also divide the height
    const rows = box.height / step;
    if (Math.abs(rows - Math.round(rows)) > 0.15) continue;
    const tol = step * 0.08;
    let hits = 0;
    const snap = (v: number) => {
      const d = Math.abs(v / step - Math.round(v / step)) * step;
      if (d <= tol) hits++;
    };
    for (const v of xs) snap(v);
    for (const v of ys) snap(v);
    const score = hits / (xs.length + ys.length);
    if (score >= minScore && (!best || score > best.score + 0.02 || (Math.abs(score - best.score) <= 0.02 && step > best.step))) {
      best = { step, score, divisions: n };
    }
  }
  return best;
}

export function renderPixelGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  subdivisions: number,
  context?: RenderContext
) {
  // Old loop: `for (x = left; x <= right; x += step)` never ended with step <= 0
  // (zero-height bounds or a negative subdivision typed in the input).
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const ref = referenceRect(bounds, context);
  let step = Math.min(ref.width, ref.height) / (sanitizeSubdivisions(subdivisions) * 2);
  if (!(step > 0) || !Number.isFinite(step)) return;

  // Align to the module the drawing is really built on, when one can be
  // inferred from the anchor coordinates.
  const inferred = context?.useRealData
    ? inferPixelStep(context.actualPaths, { x: ref.left, y: ref.top, width: ref.width, height: ref.height }, { minStep: m.len(3) })
    : null;
  if (inferred) step = inferred.step;

  // Keep the grid readable: a step under ~3 guide units is a solid block.
  const minReadable = m.len(3);
  while (step < minReadable && step > 0) step *= 2;
  if (!(step > 0) || !Number.isFinite(step)) return;

  const cols = Math.min(Math.floor(ref.width / step + 1e-9), MAX_RENDER_ITEMS / 2);
  const rows = Math.min(Math.floor(ref.height / step + 1e-9), MAX_RENDER_ITEMS / 2);

  for (let i = 0; i <= cols; i++) {
    const x = ref.left + i * step;
    const line = new paper.Path.Line(new paper.Point(x, ref.top), new paper.Point(x, ref.bottom));
    showIfIntersects(line, context, () => { line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth * 0.3); });
  }
  for (let i = 0; i <= rows; i++) {
    const y = ref.top + i * step;
    const line = new paper.Path.Line(new paper.Point(ref.left, y), new paper.Point(ref.right, y));
    showIfIntersects(line, context, () => { line.strokeColor = color; line.strokeWidth = m.stroke(style.strokeWidth * 0.3); });
  }

  if (inferred) {
    const label = new paper.PointText(new paper.Point(ref.left, ref.top - m.len(4)));
    label.content = `module ${formatLength(step, context)} · ${inferred.divisions}×${Math.round(ref.height / step)} · ${Math.round(inferred.score * 100)}% snap`;
    label.fillColor = hexToColor(style.color, Math.min(1, style.opacity * 2.5));
    label.fontSize = m.font(9);
    label.justification = 'left';
  }
}

/**
 * Contrast guide — where the mass of the drawing really is. The box holds the
 * middle 50% of the ink on each axis (quartiles of the scanline profile), the
 * crosshair is the median of the mass, and the label reports the real ink
 * density. (It used to draw a fixed circle of 35% of the bounds, which
 * measured nothing.)
 */
export function renderContrastGuide(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const ref = referenceRect(bounds, context);
  const box = boxOf({ x: ref.left, y: ref.top, width: ref.width, height: ref.height });
  if (!box) return;

  const inset = Math.min(box.width, box.height) * 0.15;
  const bracketSize = inset * 0.6;
  const corners = [
    { x: ref.left, y: ref.top, dx: 1, dy: 1 },
    { x: ref.right, y: ref.top, dx: -1, dy: 1 },
    { x: ref.left, y: ref.bottom, dx: 1, dy: -1 },
    { x: ref.right, y: ref.bottom, dx: -1, dy: -1 },
  ];
  corners.forEach(c => {
    const h = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x + bracketSize * c.dx, c.y));
    h.strokeColor = color; h.strokeWidth = m.stroke(style.strokeWidth * 1.5);
    const v = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x, c.y + bracketSize * c.dy));
    v.strokeColor = color; v.strokeWidth = m.stroke(style.strokeWidth * 1.5);
  });

  const profile = context?.actualPaths?.length ? inkMassProfile(context.actualPaths, box) : null;
  const font = m.font(8);

  if (!profile) {
    // No vector data: fall back to a centered reading zone, clearly labelled.
    const radius = Math.min(box.width, box.height) * 0.35;
    const zone = new paper.Path.Circle(ref.center, radius);
    zone.strokeColor = hexToColor(style.color, style.opacity * 0.5);
    zone.strokeWidth = m.stroke(style.strokeWidth);
    zone.fillColor = hexToColor(style.color, style.opacity * 0.04);
    zone.dashArray = m.dash(6, 4);
    const label = new paper.PointText(new paper.Point(ref.center.x, ref.center.y + radius + m.len(14)));
    label.content = 'CONTRAST ZONE'; label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = font; label.fontWeight = 'bold'; label.justification = 'center';
    return;
  }

  const core = new paper.Path.Rectangle(
    new paper.Point(profile.x.q25, profile.y.q25),
    new paper.Point(profile.x.q75, profile.y.q75),
  );
  core.strokeColor = hexToColor(style.color, style.opacity * 0.7);
  core.strokeWidth = m.stroke(style.strokeWidth);
  core.fillColor = hexToColor(style.color, style.opacity * 0.06);
  core.dashArray = m.dash(6, 4);

  const cross = m.len(10);
  const hx = new paper.Path.Line(
    new paper.Point(profile.x.q50 - cross, profile.y.q50),
    new paper.Point(profile.x.q50 + cross, profile.y.q50),
  );
  const vx = new paper.Path.Line(
    new paper.Point(profile.x.q50, profile.y.q50 - cross),
    new paper.Point(profile.x.q50, profile.y.q50 + cross),
  );
  [hx, vx].forEach(p => { p.strokeColor = color; p.strokeWidth = m.stroke(style.strokeWidth * 1.2); });

  const label = new paper.PointText(new paper.Point(
    (profile.x.q25 + profile.x.q75) / 2,
    profile.y.q75 + m.len(12),
  ));
  label.content = `50% INK · density ${Math.round(profile.density * 100)}% · peak ${profile.peakRatio.toFixed(1)}×`;
  label.fillColor = hexToColor(style.color, Math.min(1, style.opacity * 1.4));
  label.fontSize = font;
  label.fontWeight = 'bold';
  label.justification = 'center';
}

export function renderKenBurnsSafe(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.7);

  const margin = 0.1;
  const insetX = bounds.width * margin;
  const insetY = bounds.height * margin;

  const safeRect = new paper.Path.Rectangle(
    new paper.Point(bounds.left + insetX, bounds.top + insetY),
    new paper.Point(bounds.right - insetX, bounds.bottom - insetY)
  );
  showIfIntersects(safeRect, context, () => {
    safeRect.strokeColor = color; safeRect.strokeWidth = m.stroke(style.strokeWidth * 1.5);
    safeRect.fillColor = null; safeRect.dashArray = m.dash(10, 4, 2, 4);
  });

  const markerLen = Math.min(insetX, insetY) * 0.7;
  const corners = [
    { x: bounds.left + insetX, y: bounds.top + insetY, dx: 1, dy: 1 },
    { x: bounds.right - insetX, y: bounds.top + insetY, dx: -1, dy: 1 },
    { x: bounds.left + insetX, y: bounds.bottom - insetY, dx: 1, dy: -1 },
    { x: bounds.right - insetX, y: bounds.bottom - insetY, dx: -1, dy: -1 },
  ];
  corners.forEach(c => {
    const h = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x + markerLen * c.dx, c.y));
    h.strokeColor = color; h.strokeWidth = m.stroke(style.strokeWidth * 2);
    const v = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x, c.y + markerLen * c.dy));
    v.strokeColor = color; v.strokeWidth = m.stroke(style.strokeWidth * 2);
  });

  const label = new paper.PointText(new paper.Point(bounds.center.x, bounds.bottom - insetY - m.len(6)));
  label.content = 'BROADCAST SAFE'; label.fillColor = labelColor;
  label.fontSize = m.font(8); label.fontWeight = 'bold'; label.justification = 'center';
}

export function renderOpticalCenter(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);
  let cx = bounds.center.x;
  const size = Math.min(bounds.width, bounds.height) * 0.08;
  const font = m.font(8);

  let opticalY = bounds.center.y - bounds.height * 0.05;
  if (context?.useRealData && context?.actualPaths?.length) {
    // Area-weighted center of mass of the ink (x AND y). The old version
    // averaged anchor-point Y only, so a curve with many nodes dragged it.
    const ink = computeInkCentroid(context.actualPaths);
    if (ink && Number.isFinite(ink.x) && Number.isFinite(ink.y)) {
      cx = ink.x;
      opticalY = ink.y;
    }
  }

  const hLine = new paper.Path.Line(new paper.Point(cx - size, opticalY), new paper.Point(cx + size, opticalY));
  hLine.strokeColor = color; hLine.strokeWidth = m.stroke(style.strokeWidth);
  const vLine = new paper.Path.Line(new paper.Point(cx, opticalY - size), new paper.Point(cx, opticalY + size));
  vLine.strokeColor = color; vLine.strokeWidth = m.stroke(style.strokeWidth);

  const circle = new paper.Path.Circle(new paper.Point(cx, opticalY), size * 0.6);
  circle.strokeColor = color; circle.strokeWidth = m.stroke(style.strokeWidth);
  circle.fillColor = hexToColor(style.color, style.opacity * 0.1);

  const geoDot = new paper.Path.Circle(bounds.center, m.dot(2) + m.stroke(style.strokeWidth));
  geoDot.fillColor = hexToColor(style.color, style.opacity * 0.4);
  geoDot.strokeColor = hexToColor(style.color, style.opacity * 0.6);
  geoDot.strokeWidth = m.stroke(style.strokeWidth * 0.5);

  const connector = new paper.Path.Line(bounds.center, new paper.Point(cx, opticalY));
  // (geometric label stays anchored on the geometric center below)
  connector.strokeColor = hexToColor(style.color, style.opacity * 0.3);
  connector.strokeWidth = m.stroke(style.strokeWidth * 0.5); connector.dashArray = m.dash(3, 3);

  const optLabel = new paper.PointText(new paper.Point(cx + size + m.len(6), opticalY + font * 0.35));
  optLabel.content = context?.useRealData ? 'Visual Center' : 'Optical';
  optLabel.fillColor = labelColor; optLabel.fontSize = font;

  const geoLabel = new paper.PointText(new paper.Point(bounds.center.x + m.len(8), bounds.center.y + font * 0.35));
  geoLabel.content = 'Geometric'; geoLabel.fillColor = hexToColor(style.color, style.opacity * 0.4); geoLabel.fontSize = font;
}

export function renderVisualWeightMap(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);
  // Quadrants are split on the real ink box, not on the artboard.
  const ref = referenceRect(bounds, context);
  const cx = ref.center.x;
  const cy = ref.center.y;
  const font = m.font(10);

  const quads = [
    { label: 'TL', rect: new paper.Rectangle(ref.left, ref.top, ref.width / 2, ref.height / 2) },
    { label: 'TR', rect: new paper.Rectangle(cx, ref.top, ref.width / 2, ref.height / 2) },
    { label: 'BL', rect: new paper.Rectangle(ref.left, cy, ref.width / 2, ref.height / 2) },
    { label: 'BR', rect: new paper.Rectangle(cx, cy, ref.width / 2, ref.height / 2) },
  ];

  const draw = (rect: paper.Rectangle, weight: number) => {
    const fill = hexToColor(style.color, style.opacity * (weight / 100) * 0.3);
    const r = new paper.Path.Rectangle(rect);
    r.fillColor = fill; r.strokeColor = hexToColor(style.color, style.opacity * 0.2);
    r.strokeWidth = m.stroke(style.strokeWidth * 0.5); r.dashArray = m.dash(4, 4);
    const label = new paper.PointText(new paper.Point(rect.center.x, rect.center.y + font * 0.35));
    label.content = `${weight}%`; label.fillColor = labelColor; label.fontSize = font;
    label.fontWeight = 'bold'; label.justification = 'center';
  };

  if (context?.useRealData && context?.actualPaths) {
    // Ink AREA per quadrant. The old count of anchor points double-counted
    // points on the center lines and was biased by node density.
    const weights = inkQuadrantWeights(context.actualPaths, ref) ?? [0, 0, 0, 0];
    quads.forEach((q, qi) => draw(q.rect, Math.round(weights[qi] * 100)));
  } else {
    const totalArea = scaledCompBounds.reduce((sum, cb) => sum + cb.width * cb.height, 0) || 1;
    quads.forEach(q => {
      let overlapArea = 0;
      scaledCompBounds.forEach(cb => {
        const ox = Math.max(0, Math.min(cb.right, q.rect.right) - Math.max(cb.left, q.rect.left));
        const oy = Math.max(0, Math.min(cb.bottom, q.rect.bottom) - Math.max(cb.top, q.rect.top));
        overlapArea += ox * oy;
      });
      draw(q.rect, Math.round((overlapArea / totalArea) * 100));
    });
  }
}

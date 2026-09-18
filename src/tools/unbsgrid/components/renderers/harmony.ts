/**
 * Harmony constructions: root rectangles, modular scale, safe zone,
 * Fibonacci overlay and vesica piscis.
 *
 * All decorative lengths come from `metricsFor` (see ./scale); geometry
 * prefers the real ink (`context.contentBounds`, `context.actualPaths`).
 */
import paper from 'paper';
import {
  hexToColor, intersectsAnyPath, showIfIntersects, isUsableRect, formatLength,
  fitGoldenRect, computeGoldenSpiralSteps, vesicaLens, ratioMatchPercent, computeVisualCentroid,
  PHI, type StyleConfig, type RenderContext,
} from './utils';
import { metricsFor } from './scale';
import { frameOf, samplePathPoints, radialExtent } from './basic';

/**
 * ROOT RECTANGLES (√2, √3, √5)
 * Concentric rectangles in the logo's own orientation, fitted inside the real
 * ink frame and scored against the logo's aspect ratio.
 */
export function renderRootRectangles(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = frameOf(bounds, context);
  if (!isUsableRect(eb)) return; // zero height => ratio Infinity / NaN labels
  const m = metricsFor(context, bounds);
  const actualRatio = eb.width / eb.height;
  const portrait = eb.height > eb.width;

  const roots = [
    { name: '√2', value: Math.SQRT2 },
    { name: '√3', value: Math.sqrt(3) },
    { name: '√5', value: Math.sqrt(5) },
  ];

  const cx = eb.center.x;
  const cy = eb.center.y;

  // The rectangles follow the LOGO's orientation (a landscape logo never gets
  // a portrait √5 rectangle just because the number happens to be closer).
  const targetOf = (value: number) => (portrait ? 1 / value : value);

  let bestScore = Infinity;
  roots.forEach(root => {
    const diff = Math.abs(actualRatio - targetOf(root.value));
    if (diff < bestScore) bestScore = diff;
  });

  roots.forEach(root => {
    const targetRatio = targetOf(root.value);
    const diff = Math.abs(actualRatio - targetRatio);

    // Symmetric similarity: the old formula gave 0% for a ratio half the target
    // but 50% for a ratio twice the target.
    const matchPct = ratioMatchPercent(actualRatio, targetRatio);
    const isBestMatch = diff <= bestScore + 1e-9;

    // Fit rectangle INSIDE the frame (never exceeding), concentric with it.
    let rw: number, rh: number;
    if (targetRatio >= 1) {
      rw = eb.width;
      rh = rw / targetRatio;
      if (rh > eb.height) { rh = eb.height; rw = rh * targetRatio; }
    } else {
      rh = eb.height;
      rw = rh * targetRatio;
      if (rw > eb.width) { rw = eb.width; rh = rw / targetRatio; }
    }
    if (!(rw > 0) || !(rh > 0) || !Number.isFinite(rw) || !Number.isFinite(rh)) return;

    const isGoodMatch = matchPct > 90;
    const isDecentMatch = matchPct > 75;
    const opacity = isGoodMatch ? 1.0 : isDecentMatch ? 0.6 : 0.3;
    const sw = isGoodMatch ? style.strokeWidth * 2.5 : isDecentMatch ? style.strokeWidth * 1.2 : style.strokeWidth * 0.7;

    const color = hexToColor(style.color, style.opacity * opacity);
    const rect = new paper.Path.Rectangle(
      new paper.Point(cx - rw / 2, cy - rh / 2),
      new paper.Size(rw, rh)
    );
    showIfIntersects(rect, context, () => {
      rect.strokeColor = color;
      rect.strokeWidth = m.stroke(sw);
      rect.fillColor = isGoodMatch ? hexToColor(style.color, style.opacity * 0.04) : null;
      rect.dashArray = isGoodMatch ? [] : m.dash(6, 4);

      const labelX = cx + rw / 2 - m.len(4);
      const labelY = cy - rh / 2 + m.len(12);
      const labelStr = isGoodMatch
        ? `${root.name} ✓ ${matchPct.toFixed(0)}%`
        : `${root.name} ${matchPct.toFixed(0)}%${isBestMatch ? ' · best' : ''}`;
      const label = new paper.PointText(new paper.Point(labelX, labelY));
      label.content = labelStr;
      label.fillColor = color;
      label.fontSize = isGoodMatch ? m.font(11) : m.font(8);
      label.fontWeight = isGoodMatch ? 'bold' : 'normal';
      label.justification = 'right';
    });
  });

  const ratioLabel = new paper.PointText(new paper.Point(cx, eb.bottom + m.len(14)));
  ratioLabel.content = `Aspect ratio: ${actualRatio.toFixed(3)}:1`;
  ratioLabel.fillColor = hexToColor(style.color, style.opacity * 0.5);
  ratioLabel.fontSize = m.font(8);
  ratioLabel.justification = 'center';
}

/** Largest usable step count for a modular scale (guards runaway loops). */
export const MAX_MODULAR_STEPS = 12;

/**
 * MODULAR SCALE
 * Concentric circles from the visual center of the drawing, each step exactly
 * `ratio` times the previous one.
 */
export function renderModularScale(
  bounds: paper.Rectangle,
  style: StyleConfig,
  ratio: number = PHI,
  context?: RenderContext
) {
  const eb = frameOf(bounds, context);
  if (!isUsableRect(eb)) return;
  const m = metricsFor(context, bounds);

  // A ratio of 0, 1, NaN or a negative number made every step identical (or
  // produced an empty / infinite progression).
  let k = Number.isFinite(ratio) ? Math.abs(ratio) : 0;
  if (k > 0 && k < 1) k = 1 / k;
  if (!(k > 1.0001)) k = PHI;

  const paths = context?.useRealData ? context.actualPaths : undefined;
  // Real center of mass of the ink, not the middle of the box.
  const center = paths && paths.length ? computeVisualCentroid(paths as paper.Path[]) : eb.center;
  const cx = center.x;
  const cy = center.y;

  // Base unit: the real inscribed radius (nearest contour point) when we have
  // the paths, else half of the shorter side.
  let inscribed = Math.min(eb.width, eb.height) / 2;
  if (paths && paths.length) {
    const ext = radialExtent(samplePathPoints(paths), new paper.Point(cx, cy));
    if (ext && ext.min > 0 && Number.isFinite(ext.min)) inscribed = ext.min;
  }
  if (!(inscribed > 0) || !Number.isFinite(inscribed)) return;

  const corners = [eb.topLeft, eb.topRight, eb.bottomLeft, eb.bottomRight];
  const maxRadius = Math.max(...corners.map(p => Math.hypot(p.x - cx, p.y - cy)));
  if (!(maxRadius > 0)) return;

  const targetSteps = 6;
  const baseRadius = inscribed / Math.pow(k, targetSteps - 1);
  if (!(baseRadius > 0) || !Number.isFinite(baseRadius)) return;

  const marker = new paper.Path.Circle(new paper.Point(cx, cy), m.dot(2.5));
  marker.fillColor = hexToColor(style.color, style.opacity * 0.9);
  marker.strokeColor = null;

  const chSize = m.len(6);
  const chH = new paper.Path.Line(new paper.Point(cx - chSize, cy), new paper.Point(cx + chSize, cy));
  chH.strokeColor = hexToColor(style.color, style.opacity * 0.4);
  chH.strokeWidth = m.stroke(style.strokeWidth * 0.5);
  const chV = new paper.Path.Line(new paper.Point(cx, cy - chSize), new paper.Point(cx, cy + chSize));
  chV.strokeColor = hexToColor(style.color, style.opacity * 0.4);
  chV.strokeWidth = m.stroke(style.strokeWidth * 0.5);

  for (let i = 0; i < MAX_MODULAR_STEPS; i++) {
    const r = baseRadius * Math.pow(k, i);
    if (!(r > 0) || !Number.isFinite(r) || r > maxRadius) break;

    const circle = new paper.Path.Circle(new paper.Point(cx, cy), r);
    let pathCount = 0;
    if (paths) {
      for (const p of paths) {
        if (circle.getIntersections(p).length > 0) pathCount++;
      }
    }
    const isSignificant = pathCount > 0;

    const beyondContent = r > inscribed;
    const fade = beyondContent ? Math.max(0.15, 1 - (r - inscribed) / inscribed) : 1;
    const circleColor = hexToColor(style.color, style.opacity * fade * (isSignificant ? 1 : 0.5));

    showIfIntersects(circle, context, () => {
      circle.strokeColor = circleColor;
      circle.strokeWidth = isSignificant ? m.stroke(style.strokeWidth * 1.5) : m.stroke(style.strokeWidth * 0.7);
      circle.fillColor = null;
      circle.dashArray = isSignificant ? [] : m.dash(3, 3);

      if (r > m.len(12) && !beyondContent) {
        const angle = -Math.PI / 4; // 45° top-right
        const lx = cx + r * Math.cos(angle);
        const ly = cy + r * Math.sin(angle);
        const label = new paper.PointText(new paper.Point(lx + m.len(3), ly - m.len(3)));
        label.content = isSignificant ? `${i + 1} (${pathCount})` : `${i + 1}`;
        label.fillColor = hexToColor(style.color, style.opacity * 0.6);
        label.fontSize = m.font(7);
      }
    });
  }

  const infoLabel = new paper.PointText(new paper.Point(eb.center.x, eb.bottom + m.len(14)));
  infoLabel.content = `Modular scale ×${k.toFixed(3)}`;
  infoLabel.fillColor = hexToColor(style.color, style.opacity * 0.4);
  infoLabel.fontSize = m.font(7);
  infoLabel.justification = 'center';
}

/**
 * Largest uniform margin (as a fraction of the frame) that still contains all
 * the ink. 0 when the ink touches the frame, null when it cannot be measured.
 */
export function maxFittingMargin(
  frame: { left: number; top: number; right: number; bottom: number; width: number; height: number },
  ink: { left: number; top: number; right: number; bottom: number } | null | undefined,
): number | null {
  if (!ink || !(frame.width > 0) || !(frame.height > 0)) return null;
  const mx = Math.min(ink.left - frame.left, frame.right - ink.right) / frame.width;
  const my = Math.min(ink.top - frame.top, frame.bottom - ink.bottom) / frame.height;
  const v = Math.min(mx, my);
  return Number.isFinite(v) ? Math.max(0, v) : null;
}

/**
 * SAFE ZONE
 * Proportional margin (a fraction of the frame, never a pixel amount) with a
 * bleed test against the real ink.
 */
export function renderSafeZone(
  bounds: paper.Rectangle,
  style: StyleConfig,
  margin: number = 0.1,
  context?: RenderContext
) {
  const eb = bounds; // the frame being protected, not the ink inside it
  if (!isUsableRect(eb)) return;
  const m = metricsFor(context, bounds);
  // A margin of 0.5+ collapses (or inverts) the safe rectangle.
  const frac = Number.isFinite(margin) ? Math.min(0.49, Math.max(0, margin)) : 0.1;
  const color = hexToColor(style.color, style.opacity);
  const fillColor = hexToColor(style.color, style.opacity * 0.06);
  const insetX = eb.width * frac;
  const insetY = eb.height * frac;

  const safeRect = new paper.Path.Rectangle(
    new paper.Point(eb.left + insetX, eb.top + insetY),
    new paper.Point(eb.right - insetX, eb.bottom - insetY)
  );
  safeRect.strokeColor = color;
  safeRect.strokeWidth = m.stroke(style.strokeWidth * 1.5);
  safeRect.fillColor = null;
  safeRect.dashArray = m.dash(8, 4);

  const outerRects = [
    [eb.left, eb.top, eb.right, eb.top + insetY],
    [eb.left, eb.bottom - insetY, eb.right, eb.bottom],
    [eb.left, eb.top + insetY, eb.left + insetX, eb.bottom - insetY],
    [eb.right - insetX, eb.top + insetY, eb.right, eb.bottom - insetY],
  ];

  let bleedCount = 0;
  outerRects.forEach(([x1, y1, x2, y2]) => {
    if (!(x2 > x1) || !(y2 > y1)) return;
    const r = new paper.Path.Rectangle(new paper.Point(x1, y1), new paper.Point(x2, y2));
    if (context?.useRealData && context?.actualPaths) {
      const hasPathOutside = intersectsAnyPath(r, context.actualPaths);
      if (hasPathOutside) bleedCount++;
      r.fillColor = hasPathOutside ? hexToColor('#ff4444', style.opacity * 0.12) : fillColor;
    } else {
      r.fillColor = fillColor;
    }
    r.strokeColor = null;
  });

  const marginLabel = new paper.PointText(new paper.Point(eb.center.x, eb.top + insetY / 2 + m.len(3)));
  marginLabel.content = formatLength(insetX, context);
  marginLabel.fillColor = hexToColor(style.color, style.opacity * 0.4);
  marginLabel.fontSize = m.font(7);
  marginLabel.justification = 'center';

  const status = new paper.PointText(new paper.Point(eb.left + insetX + m.len(4), eb.top + insetY + m.len(12)));
  status.fontSize = m.font(8);
  status.fontWeight = 'bold';
  if (context?.useRealData && context?.actualPaths) {
    const fitsInside = bleedCount === 0;
    // "4/4 bleeds" alone is useless when the frame IS the logo box: also say
    // which margin the drawing would actually fit into.
    const fit = maxFittingMargin(eb, context.contentBounds);
    const fitTxt = fit !== null ? ` · fits ≤ ${(fit * 100).toFixed(0)}%` : '';
    status.content = fitsInside
      ? `SAFE ZONE ✓ (${(frac * 100).toFixed(0)}%)`
      : `SAFE ZONE ✗ (${(frac * 100).toFixed(0)}%) ${bleedCount}/4${fitTxt}`;
    status.fillColor = fitsInside ? hexToColor('#22cc44', style.opacity * 0.8) : hexToColor('#ff4444', style.opacity * 0.8);
  } else {
    status.content = `SAFE ZONE (${(frac * 100).toFixed(0)}%)`;
    status.fillColor = hexToColor(style.color, style.opacity * 0.6);
  }
}

/**
 * FIBONACCI OVERLAY
 * The same golden rectangle and square sequence as the golden spiral, so the
 * two overlays line up. Squares that cover real ink are emphasised.
 */
export function renderFibonacciOverlay(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = frameOf(bounds, context);
  if (!isUsableRect(eb)) return;
  const m = metricsFor(context, bounds);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);

  const golden = fitGoldenRect(eb);
  const outerRect = new paper.Path.Rectangle(
    new paper.Point(golden.x, golden.y), new paper.Size(golden.width, golden.height)
  );
  outerRect.strokeColor = dimColor;
  outerRect.strokeWidth = m.stroke(style.strokeWidth * 0.7);
  outerRect.fillColor = null;
  outerRect.dashArray = m.dash(4, 3);

  // Max 8 squares for a clean visual.
  const squares = computeGoldenSpiralSteps(golden, 8, Math.max(0.5, m.len(1)))
    .map(st => ({ sx: st.square.x, sy: st.square.y, s: st.square.width }));

  // Classic Fibonacci labels, reversed so the biggest square gets the biggest
  // number (the squares come back largest-first).
  const fibSeq = [1, 1, 2, 3, 5, 8, 13, 21];
  const fibLabels = fibSeq.slice(0, squares.length).reverse();

  squares.forEach((sq, i) => {
    const { sx, sy, s } = sq;
    const sqRect = new paper.Rectangle(new paper.Point(sx, sy), new paper.Size(s, s));
    const rect = new paper.Path.Rectangle(sqRect);

    // Coverage against the real contours, not just bbox-vs-bbox.
    let coverage = 0;
    if (context?.useRealData && context?.actualPaths) {
      for (const p of context.actualPaths) {
        if (intersectsAnyPath(rect, [p]) || rect.contains(p.bounds.center)) coverage++;
      }
    }

    const hasCoverage = context?.useRealData ? coverage > 0 : true;
    rect.strokeColor = hexToColor(style.color, style.opacity * (hasCoverage ? 0.7 : 0.2));
    rect.strokeWidth = hasCoverage ? m.stroke(style.strokeWidth * 1.2) : m.stroke(style.strokeWidth * 0.5);
    rect.fillColor = hexToColor(style.color, style.opacity * (hasCoverage ? 0.05 : 0.01));

    if (s > m.len(8) && i < fibLabels.length) {
      const size = Math.max(m.font(7), Math.min(m.font(16), s * 0.2));
      const label = new paper.PointText(new paper.Point(sx + s / 2, sy + s / 2 + size * 0.36));
      label.content = String(fibLabels[i]);
      label.fillColor = labelColor;
      label.fontSize = size;
      label.justification = 'center';
      label.fontWeight = 'bold';
    }
  });
}

/**
 * VESICA PISCIS
 * Two circles of radius r whose centers are exactly r apart, fitted inside
 * the frame, plus the real mandorla (their intersection).
 */
export function renderVesicaPiscis(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = frameOf(bounds, context);
  if (!isUsableRect(eb)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const fillColor = hexToColor(style.color, style.opacity * 0.06);

  const cxVal = eb.center.x;
  const cyVal = eb.center.y;

  // Separation d = r => total width 3r, total height 2r.
  const r = Math.min(eb.width / 3, eb.height / 2);
  if (!(r > 0) || !Number.isFinite(r)) return;
  const d = r;

  const c1 = new paper.Path.Circle(new paper.Point(cxVal - d / 2, cyVal), r);
  showIfIntersects(c1, context, () => {
    c1.strokeColor = color;
    c1.strokeWidth = m.stroke(style.strokeWidth);
    c1.fillColor = null;
  });

  const c2 = new paper.Path.Circle(new paper.Point(cxVal + d / 2, cyVal), r);
  showIfIntersects(c2, context, () => {
    c2.strokeColor = color;
    c2.strokeWidth = m.stroke(style.strokeWidth);
    c2.fillColor = null;
  });

  // Real mandorla: two arcs between the cusps. The old code drew an ellipse
  // 1.73r wide (it used the lens half-HEIGHT as half-width), i.e. a near circle.
  const lens = vesicaLens(cxVal, cyVal, r);
  const top = new paper.Point(lens.top.x, lens.top.y);
  const bottom = new paper.Point(lens.bottom.x, lens.bottom.y);
  const vesica = new paper.Path.Arc(top, new paper.Point(lens.left.x, lens.left.y), bottom);
  vesica.arcTo(new paper.Point(lens.right.x, lens.right.y), top);
  vesica.closed = true;
  showIfIntersects(vesica, context, () => {
    vesica.strokeColor = hexToColor(style.color, style.opacity * 0.8);
    vesica.strokeWidth = m.stroke(style.strokeWidth * 0.8);
    vesica.fillColor = fillColor;
    vesica.dashArray = m.dash(4, 3);
  });

  const axis = new paper.Path.Line(new paper.Point(cxVal, cyVal - r), new paper.Point(cxVal, cyVal + r));
  showIfIntersects(axis, context, () => {
    axis.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    axis.strokeWidth = m.stroke(style.strokeWidth * 0.5);
    axis.dashArray = m.dash(3, 3);
  });

  const hAxis = new paper.Path.Line(
    new paper.Point(cxVal - d / 2 - r, cyVal), new paper.Point(cxVal + d / 2 + r, cyVal)
  );
  showIfIntersects(hAxis, context, () => {
    hAxis.strokeColor = hexToColor(style.color, style.opacity * 0.3);
    hAxis.strokeWidth = m.stroke(style.strokeWidth * 0.5);
    hAxis.dashArray = m.dash(3, 3);
  });

  [cxVal - d / 2, cxVal + d / 2].forEach(circCx => {
    const dot = new paper.Path.Circle(new paper.Point(circCx, cyVal), m.dot(2));
    dot.fillColor = hexToColor(style.color, style.opacity * 0.6);
    dot.strokeColor = null;
  });

  const label = new paper.PointText(new paper.Point(cxVal, eb.top - m.len(6)));
  label.fillColor = hexToColor(style.color, style.opacity * 0.5);
  label.fontSize = m.font(7);
  label.justification = 'center';

  if (context?.useRealData && context?.actualPaths?.length) {
    let insideVesica = 0;
    let insideCircles = 0;
    let total = 0;
    for (const p of context.actualPaths) {
      total++;
      const pc = p.bounds.center;
      const dLeft = pc.getDistance(new paper.Point(cxVal - d / 2, cyVal));
      const dRight = pc.getDistance(new paper.Point(cxVal + d / 2, cyVal));
      if (dLeft <= r && dRight <= r) insideVesica++;
      if (dLeft <= r || dRight <= r) insideCircles++;
    }
    const vpPct = total > 0 ? Math.round((insideVesica / total) * 100) : 0;
    const cPct = total > 0 ? Math.round((insideCircles / total) * 100) : 0;
    label.content = `Vesica: ${vpPct}% | Circles: ${cPct}%`;
  } else {
    label.content = 'VESICA PISCIS';
    label.fontWeight = 'bold';
  }
}

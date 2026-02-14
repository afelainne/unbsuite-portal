import paper from 'paper';
import { hexToColor, intersectsAnyPath, showIfIntersects, type StyleConfig, type RenderContext } from './utils';

const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * ROOT RECTANGLES (√2, √3, √5)
 * Analyzes the SVG's actual aspect ratio and shows how it compares to
 * classical root rectangles. Rectangles are fitted INSIDE the content
 * and scored by how well they match.
 */
export function renderRootRectangles(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = bounds; // always use the SVG item bounds
  const actualRatio = eb.width / eb.height;

  const roots = [
    { name: '√2', value: Math.SQRT2 },
    { name: '√3', value: Math.sqrt(3) },
    { name: '√5', value: Math.sqrt(5) },
  ];

  const cx = eb.center.x;
  const cy = eb.center.y;

  // Find best match among all roots
  let bestScore = Infinity;
  roots.forEach((root) => {
    const diffL = Math.abs(actualRatio - root.value);
    const diffP = Math.abs(actualRatio - 1 / root.value);
    const best = Math.min(diffL, diffP);
    if (best < bestScore) bestScore = best;
  });

  roots.forEach((root) => {
    const ratioL = root.value;
    const ratioP = 1 / root.value;
    const diffL = Math.abs(actualRatio - ratioL);
    const diffP = Math.abs(actualRatio - ratioP);
    const bestDiff = Math.min(diffL, diffP);
    const usePortrait = diffP < diffL;
    const targetRatio = usePortrait ? ratioP : ratioL;

    // Match percentage: how close the SVG ratio is to this root ratio
    const matchPct = Math.max(0, (1 - Math.abs(actualRatio - targetRatio) / actualRatio) * 100);
    const isBestMatch = bestDiff <= bestScore + 0.001;

    // Fit rectangle INSIDE the content bounds (never exceeding)
    let rw: number, rh: number;
    if (targetRatio >= 1) {
      // Landscape: width is the limiting dimension
      rw = eb.width;
      rh = rw / targetRatio;
      if (rh > eb.height) { rh = eb.height; rw = rh * targetRatio; }
    } else {
      // Portrait: height is the limiting dimension
      rh = eb.height;
      rw = rh * targetRatio;
      if (rw > eb.width) { rw = eb.width; rh = rw / targetRatio; }
    }

    // Visual emphasis based on match quality
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
      rect.strokeWidth = sw;
      rect.fillColor = isGoodMatch ? hexToColor(style.color, style.opacity * 0.04) : null;
      rect.dashArray = isGoodMatch ? [] : [6, 4];

      // Label inside the rectangle (top-right corner)
      const labelX = cx + rw / 2 - 4;
      const labelY = cy - rh / 2 + 12;
      const labelStr = isGoodMatch
        ? `${root.name} ✓ ${matchPct.toFixed(0)}%`
        : `${root.name} ${matchPct.toFixed(0)}%`;
      const label = new paper.PointText(new paper.Point(labelX, labelY));
      label.content = labelStr;
      label.fillColor = color;
      label.fontSize = isGoodMatch ? 11 : 8;
      label.fontWeight = isGoodMatch ? 'bold' : 'normal';
      label.justification = 'right';
    });
  });

  // Show actual ratio label at bottom
  const ratioLabel = new paper.PointText(new paper.Point(cx, eb.bottom + 14));
  ratioLabel.content = `Aspect ratio: ${actualRatio.toFixed(3)}:1`;
  ratioLabel.fillColor = hexToColor(style.color, style.opacity * 0.5);
  ratioLabel.fontSize = 8;
  ratioLabel.justification = 'center';
}

/**
 * MODULAR SCALE
 * Concentric circles from the visual center of the SVG.
 * Base radius = inscribed circle radius. Circles are CLAMPED
 * to not exceed the content area. Highlights circles that
 * intersect actual SVG paths.
 */
export function renderModularScale(
  bounds: paper.Rectangle,
  style: StyleConfig,
  ratio: number = 1.618,
  context?: RenderContext
) {
  const eb = bounds;
  const cx = eb.center.x;
  const cy = eb.center.y;

  const minDim = Math.min(eb.width, eb.height);
  const maxRadius = Math.sqrt(eb.width * eb.width + eb.height * eb.height) / 2; // diagonal / 2

  // Base radius: inscribed circle (fits inside content)
  // Then scale down by ratio to show the scale progression starting small
  const inscribed = minDim / 2;
  // Find how many steps fit: inscribed = base * ratio^n => base = inscribed / ratio^n
  // We want about 6-7 visible circles
  const targetSteps = 6;
  const baseRadius = inscribed / Math.pow(ratio, targetSteps - 1);

  // Centroid marker
  const marker = new paper.Path.Circle(new paper.Point(cx, cy), 2.5);
  marker.fillColor = hexToColor(style.color, style.opacity * 0.9);
  marker.strokeColor = null;

  // Small crosshair at center
  const chSize = 6;
  const chH = new paper.Path.Line(
    new paper.Point(cx - chSize, cy), new paper.Point(cx + chSize, cy)
  );
  chH.strokeColor = hexToColor(style.color, style.opacity * 0.4);
  chH.strokeWidth = 0.5;
  const chV = new paper.Path.Line(
    new paper.Point(cx, cy - chSize), new paper.Point(cx, cy + chSize)
  );
  chV.strokeColor = hexToColor(style.color, style.opacity * 0.4);
  chV.strokeWidth = 0.5;

  for (let i = 0; i < 10; i++) {
    const r = baseRadius * Math.pow(ratio, i);
    if (r > maxRadius) break;

    // Check if this circle intersects actual SVG paths
    const circle = new paper.Path.Circle(new paper.Point(cx, cy), r);
    let pathCount = 0;
    if (context?.useRealData && context?.actualPaths) {
      for (const p of context.actualPaths) {
        if (circle.getIntersections(p as any).length > 0) pathCount++;
      }
    }
    const isSignificant = pathCount > 0;

    // Opacity fades as circles grow beyond content
    const beyondContent = r > inscribed;
    const fade = beyondContent ? Math.max(0.15, 1 - (r - inscribed) / inscribed) : 1;
    const circleColor = hexToColor(style.color, style.opacity * fade * (isSignificant ? 1 : 0.5));

    showIfIntersects(circle, context, () => {
      circle.strokeColor = circleColor;
      circle.strokeWidth = isSignificant ? style.strokeWidth * 1.5 : style.strokeWidth * 0.7;
      circle.fillColor = null;
      circle.dashArray = isSignificant ? [] : [3, 3];

      // Label: only for circles within content area
      if (r > 12 && !beyondContent) {
        const angle = -Math.PI / 4; // 45° top-right
        const lx = cx + r * Math.cos(angle);
        const ly = cy + r * Math.sin(angle);
        const label = new paper.PointText(new paper.Point(lx + 3, ly - 3));
        label.content = isSignificant ? `${i + 1} (${pathCount})` : `${i + 1}`;
        label.fillColor = hexToColor(style.color, style.opacity * 0.6);
        label.fontSize = 7;
      }
    });
  }

  // Scale info label
  const infoLabel = new paper.PointText(new paper.Point(cx, eb.bottom + 14));
  infoLabel.content = `Modular scale ×${ratio.toFixed(3)}`;
  infoLabel.fillColor = hexToColor(style.color, style.opacity * 0.4);
  infoLabel.fontSize = 7;
  infoLabel.justification = 'center';
}

/**
 * SAFE ZONE
 * Shows a margin zone around the actual content. Detects if SVG
 * paths bleed into the margin areas.
 */
export function renderSafeZone(
  bounds: paper.Rectangle,
  style: StyleConfig,
  margin: number = 0.1,
  context?: RenderContext
) {
  const eb = bounds;
  const color = hexToColor(style.color, style.opacity);
  const fillColor = hexToColor(style.color, style.opacity * 0.06);
  const insetX = eb.width * margin;
  const insetY = eb.height * margin;

  const safeRect = new paper.Path.Rectangle(
    new paper.Point(eb.left + insetX, eb.top + insetY),
    new paper.Point(eb.right - insetX, eb.bottom - insetY)
  );
  safeRect.strokeColor = color;
  safeRect.strokeWidth = style.strokeWidth * 1.5;
  safeRect.fillColor = null;
  safeRect.dashArray = [8, 4];

  // Fill the outside area (4 rects) – red if paths bleed into margins
  const outerRects = [
    [eb.left, eb.top, eb.right, eb.top + insetY],
    [eb.left, eb.bottom - insetY, eb.right, eb.bottom],
    [eb.left, eb.top + insetY, eb.left + insetX, eb.bottom - insetY],
    [eb.right - insetX, eb.top + insetY, eb.right, eb.bottom - insetY],
  ];

  let bleedCount = 0;
  outerRects.forEach(([x1, y1, x2, y2]) => {
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

  // Dimension labels on margins
  const marginPx = Math.round(insetX);
  const topLabel = new paper.PointText(new paper.Point(cx(eb), eb.top + insetY / 2 + 3));
  topLabel.content = `${marginPx}px`;
  topLabel.fillColor = hexToColor(style.color, style.opacity * 0.4);
  topLabel.fontSize = 7;
  topLabel.justification = 'center';

  // Status label
  if (context?.useRealData && context?.actualPaths) {
    const fitsInside = bleedCount === 0;
    const statusLabel = new paper.PointText(new paper.Point(eb.left + insetX + 4, eb.top + insetY + 12));
    statusLabel.content = fitsInside ? `SAFE ZONE ✓ (${(margin * 100).toFixed(0)}%)` : `SAFE ZONE ✗ ${bleedCount}/4 bleeds`;
    statusLabel.fillColor = fitsInside ? hexToColor('#22cc44', style.opacity * 0.8) : hexToColor('#ff4444', style.opacity * 0.8);
    statusLabel.fontSize = 8;
    statusLabel.fontWeight = 'bold';
  } else {
    const label = new paper.PointText(new paper.Point(eb.left + insetX + 4, eb.top + insetY + 12));
    label.content = `SAFE ZONE (${(margin * 100).toFixed(0)}%)`;
    label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = 8;
    label.fontWeight = 'bold';
  }
}

// Helper for safe zone
function cx(r: paper.Rectangle) { return r.center.x; }

/**
 * FIBONACCI OVERLAY
 * Golden rectangle subdivided into Fibonacci squares.
 * Limited to 8 subdivisions. Labels use correct Fibonacci sequence
 * (largest square = largest number).
 */
export function renderFibonacciOverlay(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = bounds;
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);

  // Fit a golden rectangle INSIDE the content bounds
  let w: number, h: number;
  if (eb.width / eb.height >= PHI) {
    h = eb.height;
    w = h * PHI;
  } else {
    w = eb.width;
    h = w / PHI;
  }

  let startX = eb.center.x - w / 2;
  let startY = eb.center.y - h / 2;

  // Outer golden rectangle
  const outerRect = new paper.Path.Rectangle(
    new paper.Point(startX, startY), new paper.Size(w, h)
  );
  outerRect.strokeColor = dimColor;
  outerRect.strokeWidth = style.strokeWidth * 0.7;
  outerRect.fillColor = null;
  outerRect.dashArray = [4, 3];

  // Compute all squares (max 8 for clean visual)
  const MAX_SQUARES = 8;
  const squares: { sx: number; sy: number; s: number }[] = [];
  {
    let tw = w, th = h, tx = startX, ty = startY;
    for (let i = 0; i < MAX_SQUARES; i++) {
      const s = Math.min(tw, th);
      if (s < 1) break;
      const dir = i % 4;
      let sqx: number, sqy: number;
      switch (dir) {
        case 0: { sqx = tx; sqy = ty; tx += s; tw -= s; break; }
        case 1: { sqx = tx; sqy = ty; ty += s; th -= s; break; }
        case 2: { sqx = tx + tw - s; sqy = ty; tw -= s; break; }
        case 3: { sqx = tx; sqy = ty + th - s; th -= s; break; }
        default: continue;
      }
      squares.push({ sx: sqx, sy: sqy, s });
    }
  }

  // Classic Fibonacci labels: 1, 1, 2, 3, 5, 8, 13, 21
  // Reversed so biggest square = biggest number
  const fibSeq = [1, 1, 2, 3, 5, 8, 13, 21];
  const fibLabels = fibSeq.slice(0, squares.length).reverse();

  // Draw squares
  squares.forEach((sq, i) => {
    const { sx, sy, s } = sq;
    const sqRect = new paper.Rectangle(new paper.Point(sx, sy), new paper.Size(s, s));

    // Check content coverage
    let coverage = 0;
    if (context?.useRealData && context?.actualPaths) {
      for (const p of context.actualPaths) {
        if (sqRect.intersects(p.bounds)) coverage++;
      }
    }

    const hasCoverage = context?.useRealData ? coverage > 0 : true;
    const rectColor = hexToColor(style.color, style.opacity * (hasCoverage ? 0.7 : 0.2));
    const fillC = hexToColor(style.color, style.opacity * (hasCoverage ? 0.05 : 0.01));
    const rect = new paper.Path.Rectangle(sqRect);
    rect.strokeColor = rectColor;
    rect.strokeWidth = hasCoverage ? style.strokeWidth * 1.2 : style.strokeWidth * 0.5;
    rect.fillColor = fillC;

    if (s > 8 && i < fibLabels.length) {
      const label = new paper.PointText(
        new paper.Point(sx + s / 2, sy + s / 2 + 4)
      );
      label.content = String(fibLabels[i]);
      label.fillColor = labelColor;
      label.fontSize = Math.max(7, Math.min(16, s * 0.2));
      label.justification = 'center';
      label.fontWeight = 'bold';
    }
  });
}

/**
 * VESICA PISCIS
 * Two overlapping circles fitted WITHIN the SVG content bounds.
 * Classic construction: two circles of radius r separated by distance r,
 * creating the mandorla (lens shape) at their intersection.
 */
export function renderVesicaPiscis(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = bounds;
  const color = hexToColor(style.color, style.opacity);
  const fillColor = hexToColor(style.color, style.opacity * 0.06);

  const cxVal = eb.center.x;
  const cyVal = eb.center.y;

  // Fit two overlapping circles WITHIN the content bounds
  // With separation d = r, total width = 2r + d = 3r, total height = 2r
  // So: 3r ≤ width and 2r ≤ height
  const rFromWidth = eb.width / 3;
  const rFromHeight = eb.height / 2;
  const r = Math.min(rFromWidth, rFromHeight);
  const d = r; // classic vesica piscis separation

  // Left circle
  const c1 = new paper.Path.Circle(new paper.Point(cxVal - d / 2, cyVal), r);
  showIfIntersects(c1, context, () => {
    c1.strokeColor = color;
    c1.strokeWidth = style.strokeWidth;
    c1.fillColor = null;
  });

  // Right circle
  const c2 = new paper.Path.Circle(new paper.Point(cxVal + d / 2, cyVal), r);
  showIfIntersects(c2, context, () => {
    c2.strokeColor = color;
    c2.strokeWidth = style.strokeWidth;
    c2.fillColor = null;
  });

  // Vesica piscis area (lens/mandorla)
  const halfW = Math.sqrt(r * r - (d / 2) * (d / 2));
  const vesica = new paper.Path.Ellipse(new paper.Rectangle(
    new paper.Point(cxVal - halfW, cyVal - r * 0.87),
    new paper.Point(cxVal + halfW, cyVal + r * 0.87)
  ));
  showIfIntersects(vesica, context, () => {
    vesica.strokeColor = hexToColor(style.color, style.opacity * 0.8);
    vesica.strokeWidth = style.strokeWidth * 0.8;
    vesica.fillColor = fillColor;
    vesica.dashArray = [4, 3];
  });

  // Center vertical axis
  const axis = new paper.Path.Line(
    new paper.Point(cxVal, cyVal - r), new paper.Point(cxVal, cyVal + r)
  );
  showIfIntersects(axis, context, () => {
    axis.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    axis.strokeWidth = style.strokeWidth * 0.5;
    axis.dashArray = [3, 3];
  });

  // Horizontal axis
  const hAxis = new paper.Path.Line(
    new paper.Point(cxVal - d / 2 - r, cyVal), new paper.Point(cxVal + d / 2 + r, cyVal)
  );
  showIfIntersects(hAxis, context, () => {
    hAxis.strokeColor = hexToColor(style.color, style.opacity * 0.3);
    hAxis.strokeWidth = style.strokeWidth * 0.5;
    hAxis.dashArray = [3, 3];
  });

  // Center marks of each circle
  [cxVal - d / 2, cxVal + d / 2].forEach(circCx => {
    const dot = new paper.Path.Circle(new paper.Point(circCx, cyVal), 2);
    dot.fillColor = hexToColor(style.color, style.opacity * 0.6);
    dot.strokeColor = null;
  });

  // Analysis: how much content is inside the vesica vs circles
  if (context?.useRealData && context?.actualPaths) {
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

    const label = new paper.PointText(new paper.Point(cxVal, eb.top - 6));
    label.content = `Vesica: ${vpPct}% | Circles: ${cPct}%`;
    label.fillColor = hexToColor(style.color, style.opacity * 0.5);
    label.fontSize = 7;
    label.justification = 'center';
  } else {
    const label = new paper.PointText(new paper.Point(cxVal, eb.top - 6));
    label.content = 'VESICA PISCIS';
    label.fillColor = hexToColor(style.color, style.opacity * 0.5);
    label.fontSize = 7;
    label.fontWeight = 'bold';
    label.justification = 'center';
  }
}

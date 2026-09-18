import paper from 'paper';
import {
  hexToColor,
  clipLineToRect,
  showIfIntersects,
  isUsableRect,
  formatLength,
  MAX_RENDER_ITEMS,
  type StyleConfig,
  type RenderContext,
} from './utils';
import { metricsFor } from './scale';
import { resolveAnchor } from './sacred';

/**
 * Triangular Grid — three families of parallel lines at 0°, 60° and 120° with
 * the SAME spacing, all three passing through the anchor, so every cell is an
 * equilateral triangle of side 2·spacing/√3. Lines are clipped to the content
 * box and, in real-data mode, kept only where they cross an actual path.
 */
export function renderTriangularGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  if (!isUsableRect(refRect)) return;
  const diag = Math.hypot(refRect.width, refRect.height);
  // at most MAX_RENDER_ITEMS/3 lines per family (tall, narrow content used to explode)
  const spacing = Math.max(
    m.len(4),
    Math.min(refRect.width, refRect.height) / 8,
    (2 * diag) / (MAX_RENDER_ITEMS / 3),
  );
  if (!(spacing > 0) || !Number.isFinite(spacing)) return;
  const cx = center.x;
  const cy = center.y;

  const families = [0, Math.PI / 3, (2 * Math.PI) / 3]; // 0°, 60°, 120°

  for (const angle of families) {
    const perpDx = -Math.sin(angle);
    const perpDy = Math.cos(angle);
    const half = Math.ceil(diag / spacing);

    for (let i = -half; i <= half; i++) {
      const ox = cx + perpDx * i * spacing;
      const oy = cy + perpDy * i * spacing;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const clipped = clipLineToRect(
        ox - dx * diag, oy - dy * diag, ox + dx * diag, oy + dy * diag,
        refRect.left, refRect.top, refRect.right, refRect.bottom
      );
      if (!clipped) continue;
      const line = new paper.Path.Line(
        new paper.Point(clipped[0], clipped[1]),
        new paper.Point(clipped[2], clipped[3])
      );
      showIfIntersects(line, context, () => {
        line.strokeColor = color;
        line.strokeWidth = m.stroke(style.strokeWidth);
      });
    }
  }
}

/** Rings and spokes of a polar grid. */
export const POLAR_RINGS = 6;
export const POLAR_SPOKES = 12;

/**
 * Polar / Radial Grid — equally spaced rings and equally spaced spokes around
 * the ink center. The outer ring reaches the farthest corner of the content,
 * so the grid actually covers the drawing (it used to stop at half the SHORT
 * side, leaving wide wordmarks mostly outside).
 */
export function renderPolarGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);
  const { center, refRect } = resolveAnchor(bounds, context);
  if (!isUsableRect(refRect)) return;
  const corners = [
    [refRect.left, refRect.top], [refRect.right, refRect.top],
    [refRect.left, refRect.bottom], [refRect.right, refRect.bottom],
  ];
  const maxR = corners.reduce((acc, [x, y]) => Math.max(acc, Math.hypot(x - center.x, y - center.y)), 0);
  if (!(maxR >= 1) || !Number.isFinite(maxR)) return;

  const ringStep = maxR / POLAR_RINGS;
  for (let i = 1; i <= POLAR_RINGS; i++) {
    const c = new paper.Path.Circle(center, ringStep * i);
    const isOuter = i === POLAR_RINGS;
    showIfIntersects(c, context, () => {
      c.strokeColor = isOuter ? color : dimColor;
      c.strokeWidth = m.stroke(style.strokeWidth);
      c.fillColor = null;
    });
  }

  for (let i = 0; i < POLAR_SPOKES; i++) {
    const a = (i * 2 * Math.PI) / POLAR_SPOKES;
    const x2 = center.x + maxR * Math.cos(a);
    const y2 = center.y + maxR * Math.sin(a);
    const line = new paper.Path.Line(center, new paper.Point(x2, y2));
    const isMajor = i % 3 === 0;
    showIfIntersects(line, context, () => {
      line.strokeColor = isMajor ? color : dimColor;
      line.strokeWidth = m.stroke(style.strokeWidth * (isMajor ? 1 : 0.7));
    });
  }

  // Center mark always visible (anchors the grid)
  const dot = new paper.Path.Circle(center, m.dot(1.5) + m.stroke(style.strokeWidth) * 0.5);
  dot.fillColor = color;
  dot.strokeColor = null;

  const label = new paper.PointText(new paper.Point(center.x + m.len(5), center.y - m.len(5)));
  label.content = `${POLAR_SPOKES}×${360 / POLAR_SPOKES}° · r ${formatLength(ringStep, context)}`;
  label.fillColor = dimColor;
  label.fontSize = m.font(8);
  label.justification = 'left';
}

/** Number of nested squares drawn by {@link renderConcentricSquares}. */
export const CONCENTRIC_COUNT = 5;

/**
 * Concentric Squares — nested squares with a CONSTANT step, centered on the
 * ink center (they used to shrink by 1/φ each time, so the "step" changed at
 * every ring and could not be read as a module).
 */
export function renderConcentricSquares(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!isUsableRect(bounds)) return;
  const m = metricsFor(context, bounds);
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  if (!isUsableRect(refRect)) return;
  const minDim = Math.min(refRect.width, refRect.height);
  if (!(minDim >= 1)) return;

  // Keep the outer square inside the content box around the chosen center;
  // if the ink center is too close to an edge, fall back to the box center.
  let cx = center.x;
  let cy = center.y;
  let half = Math.min(
    minDim / 2,
    cx - refRect.left, refRect.right - cx,
    cy - refRect.top, refRect.bottom - cy,
  );
  if (!(half >= minDim * 0.25)) {
    cx = refRect.center.x;
    cy = refRect.center.y;
    half = minDim / 2;
  }

  const step = half / CONCENTRIC_COUNT; // constant inset between rings
  if (!(step > 0) || !Number.isFinite(step)) return;

  for (let i = 0; i < CONCENTRIC_COUNT; i++) {
    const h = half - step * i;
    if (!(h > 0)) break;
    const rect = new paper.Path.Rectangle(
      new paper.Point(cx - h, cy - h),
      new paper.Point(cx + h, cy + h)
    );
    // Outermost square always visible (defines the system); inner ones filtered
    if (i === 0) {
      rect.strokeColor = color;
      rect.strokeWidth = m.stroke(style.strokeWidth);
      rect.fillColor = null;
    } else {
      showIfIntersects(rect, context, () => {
        rect.strokeColor = color;
        rect.strokeWidth = m.stroke(style.strokeWidth);
        rect.fillColor = null;
        rect.dashArray = m.dash(4, 3);
      });
    }
  }

  // Diagonal guides through all squares for proportion reading
  const diag1 = new paper.Path.Line(
    new paper.Point(cx - half, cy - half),
    new paper.Point(cx + half, cy + half)
  );
  const diag2 = new paper.Path.Line(
    new paper.Point(cx - half, cy + half),
    new paper.Point(cx + half, cy - half)
  );
  [diag1, diag2].forEach(d => {
    showIfIntersects(d, context, () => {
      d.strokeColor = hexToColor(style.color, style.opacity * 0.4);
      d.strokeWidth = m.stroke(style.strokeWidth * 0.5);
      d.dashArray = m.dash(2, 3);
    });
  });

  const label = new paper.PointText(new paper.Point(cx, cy - half - m.len(5)));
  label.content = `step ${formatLength(step, context)}`;
  label.fillColor = hexToColor(style.color, style.opacity * 0.8);
  label.fontSize = m.font(8);
  label.justification = 'center';
}

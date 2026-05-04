import paper from 'paper';
import {
  hexToColor,
  PHI,
  clipLineToRect,
  showIfIntersects,
  computeContentBounds,
  computeVisualCentroid,
  type StyleConfig,
  type RenderContext,
} from './utils';

/** Resolve geometric anchor (centroid + reference rect) preferring real path data. */
function resolveAnchor(bounds: paper.Rectangle, context?: RenderContext): {
  center: paper.Point;
  refRect: paper.Rectangle;
} {
  if (context?.useRealData && context?.actualPaths && context.actualPaths.length > 0) {
    const cb = context.contentBounds || computeContentBounds(context.actualPaths) || bounds;
    const center = computeVisualCentroid(context.actualPaths);
    return { center, refRect: cb };
  }
  return { center: bounds.center, refRect: bounds };
}

/**
 * Triangular Grid — three families of parallel lines at 0°, 60° and 120°,
 * producing equilateral triangles. In real-data mode, lines are clipped to
 * the content bounds and only kept where they cross an actual SVG path.
 */
export function renderTriangularGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const spacing = Math.max(4, refRect.width / 12);
  const cx = center.x;
  const cy = center.y;
  const diag = Math.sqrt(refRect.width * refRect.width + refRect.height * refRect.height);

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
      const x1 = ox - dx * diag;
      const y1 = oy - dy * diag;
      const x2 = ox + dx * diag;
      const y2 = oy + dy * diag;
      const clipped = clipLineToRect(
        x1, y1, x2, y2,
        refRect.left, refRect.top, refRect.right, refRect.bottom
      );
      if (!clipped) continue;
      const line = new paper.Path.Line(
        new paper.Point(clipped[0], clipped[1]),
        new paper.Point(clipped[2], clipped[3])
      );
      showIfIntersects(line, context, () => {
        line.strokeColor = color;
        line.strokeWidth = style.strokeWidth;
      });
    }
  }
}

/**
 * Polar / Radial Grid — concentric circles + 12 radial spokes around the bounds center.
 */
export function renderPolarGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);
  const { center, refRect } = resolveAnchor(bounds, context);
  const maxR = Math.min(refRect.width, refRect.height) / 2;
  if (maxR < 1) return;

  const ringCount = 6;
  for (let i = 1; i <= ringCount; i++) {
    const r = (maxR * i) / ringCount;
    const c = new paper.Path.Circle(center, r);
    const isOuter = i === ringCount;
    showIfIntersects(c, context, () => {
      c.strokeColor = isOuter ? color : dimColor;
      c.strokeWidth = style.strokeWidth;
      c.fillColor = null;
    });
  }

  const spokeCount = 12;
  for (let i = 0; i < spokeCount; i++) {
    const a = (i * 2 * Math.PI) / spokeCount;
    const x2 = center.x + maxR * Math.cos(a);
    const y2 = center.y + maxR * Math.sin(a);
    const line = new paper.Path.Line(center, new paper.Point(x2, y2));
    const isMajor = i % 3 === 0;
    showIfIntersects(line, context, () => {
      line.strokeColor = isMajor ? color : dimColor;
      line.strokeWidth = style.strokeWidth * (isMajor ? 1 : 0.7);
    });
  }

  // Center mark always visible (anchors the grid)
  const dot = new paper.Path.Circle(center, Math.max(1.5, style.strokeWidth));
  dot.fillColor = color;
  dot.strokeColor = null;
}

/**
 * Concentric Squares — 5 nested squares centered on the bounds, scaled by 1/φ.
 */
export function renderConcentricSquares(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const { center, refRect } = resolveAnchor(bounds, context);
  const baseSize = Math.min(refRect.width, refRect.height);
  if (baseSize < 1) return;
  const ratio = 1 / PHI;

  const count = 5;
  for (let i = 0; i < count; i++) {
    const size = baseSize * Math.pow(ratio, i);
    const half = size / 2;
    const rect = new paper.Path.Rectangle(
      new paper.Point(center.x - half, center.y - half),
      new paper.Point(center.x + half, center.y + half)
    );
    // Outermost square always visible (defines the system); inner ones filtered
    if (i === 0) {
      rect.strokeColor = color;
      rect.strokeWidth = style.strokeWidth;
      rect.fillColor = null;
    } else {
      showIfIntersects(rect, context, () => {
        rect.strokeColor = color;
        rect.strokeWidth = style.strokeWidth;
        rect.fillColor = null;
        rect.dashArray = [4, 3];
      });
    }
  }

  // Diagonal guides through all squares for proportion reading
  const diag1 = new paper.Path.Line(
    new paper.Point(center.x - baseSize / 2, center.y - baseSize / 2),
    new paper.Point(center.x + baseSize / 2, center.y + baseSize / 2)
  );
  showIfIntersects(diag1, context, () => {
    diag1.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    diag1.strokeWidth = style.strokeWidth * 0.5;
    diag1.dashArray = [2, 3];
  });

  const diag2 = new paper.Path.Line(
    new paper.Point(center.x - baseSize / 2, center.y + baseSize / 2),
    new paper.Point(center.x + baseSize / 2, center.y - baseSize / 2)
  );
  showIfIntersects(diag2, context, () => {
    diag2.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    diag2.strokeWidth = style.strokeWidth * 0.5;
    diag2.dashArray = [2, 3];
  });
}

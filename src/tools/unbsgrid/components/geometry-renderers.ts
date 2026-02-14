import paper from 'paper';
import type { BezierSegmentData } from '../lib/svg-engine';

const PHI = (1 + Math.sqrt(5)) / 2;

function hexToColor(hex: string, opacity: number): paper.Color {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new paper.Color(r, g, b, opacity);
}

interface StyleConfig {
  color: string;
  opacity: number;
  strokeWidth: number;
}

interface RenderContext {
  actualPaths?: paper.Path[];
  useRealData?: boolean;
  contentBounds?: paper.Rectangle;
}

/** Compute the visual centroid (weighted by path length) of all paths */
function computeVisualCentroid(paths: paper.Path[]): paper.Point {
  let totalWeight = 0;
  let cx = 0;
  let cy = 0;
  for (const p of paths) {
    const w = p.length || 1;
    cx += p.bounds.center.x * w;
    cy += p.bounds.center.y * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return paths[0].bounds.center;
  return new paper.Point(cx / totalWeight, cy / totalWeight);
}

/** Check if a Paper.js item intersects with any actual SVG path */
function intersectsAnyPath(item: paper.PathItem, paths: paper.Path[]): boolean {
  for (const path of paths) {
    if (item.getIntersections(path).length > 0) return true;
  }
  return false;
}

/** Conditionally show or remove an item based on real-data intersection */
function showIfIntersects(
  item: paper.PathItem,
  context: RenderContext | undefined,
  applyStyle: () => void
): void {
  if (context?.useRealData && context?.actualPaths) {
    if (intersectsAnyPath(item, context.actualPaths)) {
      applyStyle();
    } else {
      item.remove();
    }
  } else {
    applyStyle();
  }
}

export function renderBoundingRects(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  scaledCompBounds.forEach(cb => {
    const rect = new paper.Path.Rectangle(cb);
    rect.strokeColor = color;
    rect.strokeWidth = style.strokeWidth;
    rect.fillColor = null;
    rect.dashArray = [4, 3];
  });
  const fullRect = new paper.Path.Rectangle(bounds);
  fullRect.strokeColor = hexToColor(style.color, style.opacity * 0.7);
  fullRect.strokeWidth = style.strokeWidth * 1.2;
  fullRect.fillColor = null;
}

export function renderCircles(
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);
  
  scaledCompBounds.forEach(cb => {
    const cx = cb.center.x;
    const cy = cb.center.y;
    const inscribedR = Math.min(cb.width, cb.height) / 2;
    const circumR = Math.sqrt(cb.width * cb.width + cb.height * cb.height) / 2;
    
    // When using real data, only show circles that intersect with actual paths
    if (context?.useRealData && context?.actualPaths) {
      const inscribedCircle = new paper.Path.Circle(new paper.Point(cx, cy), inscribedR);
      let inscribedIntersects = false;
      for (const path of context.actualPaths) {
        const intersections = inscribedCircle.getIntersections(path);
        if (intersections.length > 0) {
          inscribedIntersects = true;
          break;
        }
      }
      
      if (inscribedIntersects) {
        inscribedCircle.strokeColor = color;
        inscribedCircle.strokeWidth = style.strokeWidth;
        inscribedCircle.fillColor = null;
      } else {
        inscribedCircle.remove();
      }
      
      const circumCircle = new paper.Path.Circle(new paper.Point(cx, cy), circumR);
      let circumIntersects = false;
      for (const path of context.actualPaths) {
        const intersections = circumCircle.getIntersections(path);
        if (intersections.length > 0) {
          circumIntersects = true;
          break;
        }
      }
      
      if (circumIntersects) {
        circumCircle.strokeColor = dimColor;
        circumCircle.strokeWidth = style.strokeWidth;
        circumCircle.fillColor = null;
        circumCircle.dashArray = [6, 4];
      } else {
        circumCircle.remove();
      }
    } else {
      // Original behavior: show all circles
      const inscribed = new paper.Path.Circle(new paper.Point(cx, cy), inscribedR);
      inscribed.strokeColor = color;
      inscribed.strokeWidth = style.strokeWidth;
      inscribed.fillColor = null;

      const circum = new paper.Path.Circle(new paper.Point(cx, cy), circumR);
      circum.strokeColor = dimColor;
      circum.strokeWidth = style.strokeWidth;
      circum.fillColor = null;
      circum.dashArray = [6, 4];
    }
  });
}

export function renderCenterLines(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);

  // Main horizontal and vertical center lines
  const hLine = new paper.Path.Line(
    new paper.Point(bounds.left - 30, bounds.center.y),
    new paper.Point(bounds.right + 30, bounds.center.y)
  );
  
  const vLine = new paper.Path.Line(
    new paper.Point(bounds.center.x, bounds.top - 30),
    new paper.Point(bounds.center.x, bounds.bottom + 30)
  );

  // When using real data, only show lines if they intersect with actual paths
  if (context?.useRealData && context?.actualPaths) {
    let hIntersects = false;
    let vIntersects = false;
    
    for (const path of context.actualPaths) {
      if (!hIntersects && hLine.getIntersections(path).length > 0) {
        hIntersects = true;
      }
      if (!vIntersects && vLine.getIntersections(path).length > 0) {
        vIntersects = true;
      }
      if (hIntersects && vIntersects) break;
    }
    
    if (hIntersects) {
      hLine.strokeColor = color;
      hLine.strokeWidth = style.strokeWidth;
      hLine.dashArray = [8, 4];
    } else {
      hLine.remove();
    }
    
    if (vIntersects) {
      vLine.strokeColor = color;
      vLine.strokeWidth = style.strokeWidth;
      vLine.dashArray = [8, 4];
    } else {
      vLine.remove();
    }
  } else {
    // Original behavior: always show center lines
    hLine.strokeColor = color;
    hLine.strokeWidth = style.strokeWidth;
    hLine.dashArray = [8, 4];
    
    vLine.strokeColor = color;
    vLine.strokeWidth = style.strokeWidth;
    vLine.dashArray = [8, 4];
  }

  // Component center lines
  scaledCompBounds.forEach(cb => {
    if (Math.abs(cb.center.x - bounds.center.x) > 2 || Math.abs(cb.center.y - bounds.center.y) > 2) {
      const ch = new paper.Path.Line(
        new paper.Point(cb.left - 10, cb.center.y),
        new paper.Point(cb.right + 10, cb.center.y)
      );
      
      const cv = new paper.Path.Line(
        new paper.Point(cb.center.x, cb.top - 10),
        new paper.Point(cb.center.x, cb.bottom + 10)
      );
      
      if (context?.useRealData && context?.actualPaths) {
        let chIntersects = false;
        let cvIntersects = false;
        
        for (const path of context.actualPaths) {
          if (!chIntersects && ch.getIntersections(path).length > 0) {
            chIntersects = true;
          }
          if (!cvIntersects && cv.getIntersections(path).length > 0) {
            cvIntersects = true;
          }
          if (chIntersects && cvIntersects) break;
        }
        
        if (chIntersects) {
          ch.strokeColor = dimColor;
          ch.strokeWidth = style.strokeWidth * 0.5;
          ch.dashArray = [4, 3];
        } else {
          ch.remove();
        }
        
        if (cvIntersects) {
          cv.strokeColor = dimColor;
          cv.strokeWidth = style.strokeWidth * 0.5;
          cv.dashArray = [4, 3];
        } else {
          cv.remove();
        }
      } else {
        ch.strokeColor = dimColor;
        ch.strokeWidth = style.strokeWidth * 0.5;
        ch.dashArray = [4, 3];
        
        cv.strokeColor = dimColor;
        cv.strokeWidth = style.strokeWidth * 0.5;
        cv.dashArray = [4, 3];
      }
    }
  });
}

export function renderDiagonals(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);

  const d1 = new paper.Path.Line(new paper.Point(bounds.left, bounds.top), new paper.Point(bounds.right, bounds.bottom));
  const d2 = new paper.Path.Line(new paper.Point(bounds.right, bounds.top), new paper.Point(bounds.left, bounds.bottom));

  // When using real data, only show diagonals that intersect with actual paths
  if (context?.useRealData && context?.actualPaths) {
    let d1Intersects = false;
    let d2Intersects = false;
    
    for (const path of context.actualPaths) {
      if (!d1Intersects && d1.getIntersections(path).length > 0) {
        d1Intersects = true;
      }
      if (!d2Intersects && d2.getIntersections(path).length > 0) {
        d2Intersects = true;
      }
      if (d1Intersects && d2Intersects) break;
    }
    
    if (d1Intersects) {
      d1.strokeColor = color;
      d1.strokeWidth = style.strokeWidth;
    } else {
      d1.remove();
    }
    
    if (d2Intersects) {
      d2.strokeColor = color;
      d2.strokeWidth = style.strokeWidth;
    } else {
      d2.remove();
    }
  } else {
    d1.strokeColor = color;
    d1.strokeWidth = style.strokeWidth;
    d2.strokeColor = color;
    d2.strokeWidth = style.strokeWidth;
  }

  scaledCompBounds.forEach(cb => {
    const cd1 = new paper.Path.Line(new paper.Point(cb.left, cb.top), new paper.Point(cb.right, cb.bottom));
    const cd2 = new paper.Path.Line(new paper.Point(cb.right, cb.top), new paper.Point(cb.left, cb.bottom));

    if (context?.useRealData && context?.actualPaths) {
      let cd1Intersects = false;
      let cd2Intersects = false;
      
      for (const path of context.actualPaths) {
        if (!cd1Intersects && cd1.getIntersections(path).length > 0) {
          cd1Intersects = true;
        }
        if (!cd2Intersects && cd2.getIntersections(path).length > 0) {
          cd2Intersects = true;
        }
        if (cd1Intersects && cd2Intersects) break;
      }
      
      if (cd1Intersects) {
        cd1.strokeColor = dimColor;
        cd1.strokeWidth = style.strokeWidth * 0.5;
      } else {
        cd1.remove();
      }
      
      if (cd2Intersects) {
        cd2.strokeColor = dimColor;
        cd2.strokeWidth = style.strokeWidth * 0.5;
      } else {
        cd2.remove();
      }
    } else {
      cd1.strokeColor = dimColor;
      cd1.strokeWidth = style.strokeWidth * 0.5;
      cd2.strokeColor = dimColor;
      cd2.strokeWidth = style.strokeWidth * 0.5;
    }
  });
}

export function renderGoldenRatio(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const cx = bounds.center.x;
  const cy = bounds.center.y;
  const baseRadius = Math.min(bounds.width, bounds.height) / 2;

  const fibSequence = [1, 1, 2, 3, 5, 8, 13];
  const maxFib = fibSequence[fibSequence.length - 1];

  fibSequence.forEach(fib => {
    const r = (fib / maxFib) * baseRadius;
    const circle = new paper.Path.Circle(new paper.Point(cx, cy), r);
    showIfIntersects(circle, context, () => {
      circle.strokeColor = color;
      circle.strokeWidth = style.strokeWidth;
      circle.fillColor = null;

      if (r > 12) {
        const label = new paper.PointText(new paper.Point(cx + r + 4, cy - 2));
        label.content = String(fib);
        label.fillColor = hexToColor(style.color, style.opacity * 0.8);
        label.fontSize = 9;
        label.fontWeight = 'bold';
      }
    });
  });

  const grWidth = bounds.width;
  const grHeight = grWidth / PHI;
  const grRect = new paper.Path.Rectangle(
    new paper.Point(cx - grWidth / 2, cy - grHeight / 2),
    new paper.Point(cx + grWidth / 2, cy + grHeight / 2)
  );
  showIfIntersects(grRect, context, () => {
    grRect.strokeColor = dimColor;
    grRect.strokeWidth = style.strokeWidth;
    grRect.fillColor = null;
    grRect.dashArray = [6, 4];
  });
}

export function renderTangentLines(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  scaledCompBounds.forEach(cb => {
    [cb.top, cb.bottom].forEach(y => {
      const line = new paper.Path.Line(new paper.Point(bounds.left - 40, y), new paper.Point(bounds.right + 40, y));
      
      if (context?.useRealData && context?.actualPaths) {
        let intersects = false;
        for (const path of context.actualPaths) {
          if (line.getIntersections(path).length > 0) {
            intersects = true;
            break;
          }
        }
        
        if (intersects) {
          line.strokeColor = color;
          line.strokeWidth = style.strokeWidth;
          line.dashArray = [2, 3];
        } else {
          line.remove();
        }
      } else {
        line.strokeColor = color;
        line.strokeWidth = style.strokeWidth;
        line.dashArray = [2, 3];
      }
    });
    [cb.left, cb.right].forEach(x => {
      const line = new paper.Path.Line(new paper.Point(x, bounds.top - 40), new paper.Point(x, bounds.bottom + 40));
      
      if (context?.useRealData && context?.actualPaths) {
        let intersects = false;
        for (const path of context.actualPaths) {
          if (line.getIntersections(path).length > 0) {
            intersects = true;
            break;
          }
        }
        
        if (intersects) {
          line.strokeColor = color;
          line.strokeWidth = style.strokeWidth;
          line.dashArray = [2, 3];
        } else {
          line.remove();
        }
      } else {
        line.strokeColor = color;
        line.strokeWidth = style.strokeWidth;
        line.dashArray = [2, 3];
      }
    });
  });
}

export function renderGoldenSpiral(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);

  // Fit a golden rectangle inside the bounds
  let w: number, h: number;
  if (bounds.width / bounds.height >= PHI) {
    h = bounds.height;
    w = h * PHI;
  } else {
    w = bounds.width;
    h = w / PHI;
  }

  let x = bounds.center.x - w / 2;
  let y = bounds.center.y - h / 2;

  // Draw outer golden rectangle
  const outerRect = new paper.Path.Rectangle(
    new paper.Point(x, y), new paper.Size(w, h)
  );
  showIfIntersects(outerRect, context, () => {
    outerRect.strokeColor = dimColor;
    outerRect.strokeWidth = style.strokeWidth * 0.7;
    outerRect.fillColor = null;
    outerRect.dashArray = [4, 3];
  });

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Draw spiral arcs: cycle LEFT → TOP → RIGHT → BOTTOM
  for (let i = 0; i < 12; i++) {
    const s = Math.min(w, h);
    if (s < 0.5) break;

    const dir = i % 4;
    let cx: number, cy: number;
    let startAngle: number;

    switch (dir) {
      case 0: { // LEFT: center at bottom-right of square, arc 180°→270°
        cx = x + s;
        cy = y + s;
        startAngle = 180;
        const div0 = new paper.Path.Line(new paper.Point(x + s, y), new paper.Point(x + s, y + s));
        div0.strokeColor = dimColor; div0.strokeWidth = style.strokeWidth * 0.4; div0.dashArray = [2, 2];
        x += s; w -= s;
        break;
      }
      case 1: { // TOP: center at bottom-left of square, arc 270°→360°
        cx = x;
        cy = y + s;
        startAngle = 270;
        const div1 = new paper.Path.Line(new paper.Point(x, y + s), new paper.Point(x + s, y + s));
        div1.strokeColor = dimColor; div1.strokeWidth = style.strokeWidth * 0.4; div1.dashArray = [2, 2];
        y += s; h -= s;
        break;
      }
      case 2: { // RIGHT: center at top-left of square, arc 0°→90°
        cx = x + w - s;
        cy = y;
        startAngle = 0;
        const div2 = new paper.Path.Line(new paper.Point(x + w - s, y), new paper.Point(x + w - s, y + s));
        div2.strokeColor = dimColor; div2.strokeWidth = style.strokeWidth * 0.4; div2.dashArray = [2, 2];
        w -= s;
        break;
      }
      case 3: { // BOTTOM: center at top-right of square, arc 90°→180°
        cx = x + s;
        cy = y + h - s;
        startAngle = 90;
        const div3 = new paper.Path.Line(new paper.Point(x, y + h - s), new paper.Point(x + s, y + h - s));
        div3.strokeColor = dimColor; div3.strokeWidth = style.strokeWidth * 0.4; div3.dashArray = [2, 2];
        h -= s;
        break;
      }
      default: continue;
    }

    const midAngle = startAngle + 45;
    const endAngle = startAngle + 90;

    const from = new paper.Point(
      cx + s * Math.cos(toRad(startAngle)),
      cy + s * Math.sin(toRad(startAngle))
    );
    const through = new paper.Point(
      cx + s * Math.cos(toRad(midAngle)),
      cy + s * Math.sin(toRad(midAngle))
    );
    const to = new paper.Point(
      cx + s * Math.cos(toRad(endAngle)),
      cy + s * Math.sin(toRad(endAngle))
    );

    const arc = new paper.Path.Arc(from, through, to);
    showIfIntersects(arc, context, () => {
      arc.strokeColor = color;
      arc.strokeWidth = style.strokeWidth;
      arc.fillColor = null;
    });
  }
}

export function renderIsometricGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  subdivisions: number,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const cx = bounds.center.x;
  const cy = bounds.center.y;
  const extent = Math.max(bounds.width, bounds.height) * 1.2;
  const step = Math.min(bounds.width, bounds.height) / subdivisions;

  const angles = [30, 150]; // isometric angles

  angles.forEach(angleDeg => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const perpDx = -dy;
    const perpDy = dx;

    for (let i = -subdivisions; i <= subdivisions; i++) {
      const offsetX = perpDx * step * i;
      const offsetY = perpDy * step * i;
      const line = new paper.Path.Line(
        new paper.Point(cx + offsetX - dx * extent, cy + offsetY - dy * extent),
        new paper.Point(cx + offsetX + dx * extent, cy + offsetY + dy * extent)
      );
      showIfIntersects(line, context, () => {
        line.strokeColor = color;
        line.strokeWidth = style.strokeWidth;
        if (i !== 0) line.dashArray = [4, 4];
      });
    }
  });

  // Vertical lines
  for (let i = -subdivisions; i <= subdivisions; i++) {
    const x = cx + step * i;
    const line = new paper.Path.Line(
      new paper.Point(x, cy - extent),
      new paper.Point(x, cy + extent)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = style.strokeWidth * 0.5;
      line.dashArray = [2, 4];
    });
  }
}

export function renderBezierHandles(
  segments: BezierSegmentData[],
  originalBounds: paper.Rectangle,
  canvasBounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const handleColor = hexToColor(style.color, style.opacity * 0.7);

  // Prefer actual transformed paths from the render context (accurate positioning)
  if (context?.useRealData && context?.actualPaths && context.actualPaths.length > 0) {
    for (const path of context.actualPaths) {
      if (!path.curves || path.curves.length === 0) continue;

      // Use curves to get accurate handle positions
      for (const curve of path.curves) {
        const p1 = new paper.Point(curve.point1.x, curve.point1.y);
        const p2 = new paper.Point(curve.point2.x, curve.point2.y);

        // handleOut from first segment (relative to point1)
        const h1 = curve.handle1;
        if (h1 && (Math.abs(h1.x) > 0.1 || Math.abs(h1.y) > 0.1)) {
          const hPt = new paper.Point(p1.x + h1.x, p1.y + h1.y);
          const line = new paper.Path.Line(p1, hPt);
          line.strokeColor = handleColor;
          line.strokeWidth = style.strokeWidth * 0.6;
          const hdot = new paper.Path.Circle(hPt, style.strokeWidth + 0.5);
          hdot.fillColor = handleColor;
          hdot.strokeColor = null;
        }

        // handleIn from second segment (relative to point2)
        const h2 = curve.handle2;
        if (h2 && (Math.abs(h2.x) > 0.1 || Math.abs(h2.y) > 0.1)) {
          const hPt = new paper.Point(p2.x + h2.x, p2.y + h2.y);
          const line = new paper.Path.Line(p2, hPt);
          line.strokeColor = handleColor;
          line.strokeWidth = style.strokeWidth * 0.6;
          const hdot = new paper.Path.Circle(hPt, style.strokeWidth + 0.5);
          hdot.fillColor = handleColor;
          hdot.strokeColor = null;
        }
      }

      // Draw anchor points on top
      for (const seg of path.segments) {
        const pt = new paper.Point(seg.point.x, seg.point.y);
        const dot = new paper.Path.Circle(pt, style.strokeWidth * 1.5 + 1);
        dot.fillColor = color;
        dot.strokeColor = null;
      }
    }
    return;
  }

  // Fallback: use pre-extracted segments with coordinate mapping
  const mapX = (x: number) =>
    canvasBounds.left + ((x - originalBounds.left) / originalBounds.width) * canvasBounds.width;
  const mapY = (y: number) =>
    canvasBounds.top + ((y - originalBounds.top) / originalBounds.height) * canvasBounds.height;

  segments.forEach(seg => {
    const ax = mapX(seg.anchor.x);
    const ay = mapY(seg.anchor.y);

    const dot = new paper.Path.Circle(new paper.Point(ax, ay), style.strokeWidth * 1.5 + 1);
    dot.fillColor = color;
    dot.strokeColor = null;

    if (seg.hasHandleIn) {
      const hx = mapX(seg.handleIn.x);
      const hy = mapY(seg.handleIn.y);
      const line = new paper.Path.Line(new paper.Point(ax, ay), new paper.Point(hx, hy));
      line.strokeColor = handleColor;
      line.strokeWidth = style.strokeWidth * 0.6;
      const hdot = new paper.Path.Circle(new paper.Point(hx, hy), style.strokeWidth + 0.5);
      hdot.fillColor = handleColor;
      hdot.strokeColor = null;
    }

    if (seg.hasHandleOut) {
      const hx = mapX(seg.handleOut.x);
      const hy = mapY(seg.handleOut.y);
      const line = new paper.Path.Line(new paper.Point(ax, ay), new paper.Point(hx, hy));
      line.strokeColor = handleColor;
      line.strokeWidth = style.strokeWidth * 0.6;
      const hdot = new paper.Path.Circle(new paper.Point(hx, hy), style.strokeWidth + 0.5);
      hdot.fillColor = handleColor;
      hdot.strokeColor = null;
    }
  });
}

export function renderTypographicProportions(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);

  const guides = [
    { name: 'Descender', ratio: 1.15 },
    { name: 'Baseline', ratio: 1.0 },
    { name: 'x-height', ratio: 0.4 },
    { name: 'Cap height', ratio: 0.0 },
    { name: 'Ascender', ratio: -0.1 },
  ];

  guides.forEach(g => {
    const y = bounds.top + g.ratio * bounds.height;
    const line = new paper.Path.Line(
      new paper.Point(bounds.left - 60, y),
      new paper.Point(bounds.right + 30, y)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = style.strokeWidth;
      line.dashArray = [6, 3];

      const label = new paper.PointText(new paper.Point(bounds.left - 65, y + 3));
      label.content = g.name;
      label.fillColor = labelColor;
      label.fontSize = 8;
      label.justification = 'right';
    });
  });
}

export function renderThirdLines(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dotColor = hexToColor(style.color, style.opacity * 0.8);

  const shownVLines: number[] = [];
  const shownHLines: number[] = [];

  for (let i = 1; i <= 2; i++) {
    const x = bounds.left + (bounds.width * i) / 3;
    const line = new paper.Path.Line(
      new paper.Point(x, bounds.top - 20),
      new paper.Point(x, bounds.bottom + 20)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = style.strokeWidth;
      line.dashArray = [6, 4];
      shownVLines.push(x);
    });

    const y = bounds.top + (bounds.height * i) / 3;
    const hLine = new paper.Path.Line(
      new paper.Point(bounds.left - 20, y),
      new paper.Point(bounds.right + 20, y)
    );
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = color;
      hLine.strokeWidth = style.strokeWidth;
      hLine.dashArray = [6, 4];
      shownHLines.push(y);
    });
  }

  // Intersection markers - only at intersections of shown lines
  for (const x of (shownVLines.length ? shownVLines : [bounds.left + bounds.width / 3, bounds.left + (bounds.width * 2) / 3])) {
    for (const y of (shownHLines.length ? shownHLines : [bounds.top + bounds.height / 3, bounds.top + (bounds.height * 2) / 3])) {
      if (context?.useRealData && (!shownVLines.length || !shownHLines.length)) continue;
      const dot = new paper.Path.Circle(new paper.Point(x, y), style.strokeWidth * 2 + 1);
      dot.fillColor = dotColor;
      dot.strokeColor = null;
    }
  }
}

// ===================== NEW GEOMETRY RENDERERS =====================

export function renderSymmetryAxes(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);

  // Global symmetry axes
  const vAxis = new paper.Path.Line(
    new paper.Point(bounds.center.x, bounds.top - 40),
    new paper.Point(bounds.center.x, bounds.bottom + 40)
  );
  showIfIntersects(vAxis, context, () => {
    vAxis.strokeColor = color;
    vAxis.strokeWidth = style.strokeWidth * 1.2;
    vAxis.dashArray = [10, 4, 2, 4];
  });

  const hAxis = new paper.Path.Line(
    new paper.Point(bounds.left - 40, bounds.center.y),
    new paper.Point(bounds.right + 40, bounds.center.y)
  );
  showIfIntersects(hAxis, context, () => {
    hAxis.strokeColor = color;
    hAxis.strokeWidth = style.strokeWidth * 1.2;
    hAxis.dashArray = [10, 4, 2, 4];
  });

  // Small diamond markers at center
  const diamond = new paper.Path.RegularPolygon(bounds.center, 4, 5);
  diamond.strokeColor = color;
  diamond.strokeWidth = style.strokeWidth;
  diamond.fillColor = hexToColor(style.color, style.opacity * 0.2);
  diamond.rotation = 45;

  // Per-component axes
  scaledCompBounds.forEach(cb => {
    const cv = new paper.Path.Line(
      new paper.Point(cb.center.x, cb.top - 15),
      new paper.Point(cb.center.x, cb.bottom + 15)
    );
    showIfIntersects(cv, context, () => {
      cv.strokeColor = dimColor;
      cv.strokeWidth = style.strokeWidth * 0.6;
      cv.dashArray = [6, 3, 2, 3];
    });

    const ch = new paper.Path.Line(
      new paper.Point(cb.left - 15, cb.center.y),
      new paper.Point(cb.right + 15, cb.center.y)
    );
    showIfIntersects(ch, context, () => {
      ch.strokeColor = dimColor;
      ch.strokeWidth = style.strokeWidth * 0.6;
      ch.dashArray = [6, 3, 2, 3];
    });
  });
}

export function renderAngleMeasurements(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.9);

  // Measure diagonal angle of the full bounds
  const diagAngle = Math.atan2(bounds.height, bounds.width) * (180 / Math.PI);
  const arcRadius = Math.min(bounds.width, bounds.height) * 0.15;

  // Bottom-left corner arc - check if the diagonal intersects paths
  const diagonal = new paper.Path.Line(
    new paper.Point(bounds.left, bounds.bottom),
    new paper.Point(bounds.right, bounds.top)
  );
  let showMainAngle = true;
  if (context?.useRealData && context?.actualPaths) {
    showMainAngle = intersectsAnyPath(diagonal, context.actualPaths);
  }
  diagonal.remove();

  if (showMainAngle) {
    const arcPath = new paper.Path.Arc(
      new paper.Point(bounds.left + arcRadius, bounds.bottom),
      new paper.Point(
        bounds.left + arcRadius * Math.cos(diagAngle * Math.PI / 360),
        bounds.bottom - arcRadius * Math.sin(diagAngle * Math.PI / 360)
      ),
      new paper.Point(
        bounds.left + arcRadius * Math.cos(diagAngle * Math.PI / 180),
        bounds.bottom - arcRadius * Math.sin(diagAngle * Math.PI / 180)
      )
    );
    arcPath.strokeColor = color;
    arcPath.strokeWidth = style.strokeWidth;
    arcPath.fillColor = null;

    const labelPt = new paper.Point(
      bounds.left + arcRadius * 1.4 * Math.cos(diagAngle * Math.PI / 360),
      bounds.bottom - arcRadius * 1.4 * Math.sin(diagAngle * Math.PI / 360)
    );
    const label = new paper.PointText(labelPt);
    label.content = `${diagAngle.toFixed(1)}°`;
    label.fillColor = labelColor;
    label.fontSize = 9;
    label.fontWeight = 'bold';
  }

  // Per-component aspect ratio angles
  scaledCompBounds.forEach(cb => {
    const angle = Math.atan2(cb.height, cb.width) * (180 / Math.PI);
    const r = Math.min(cb.width, cb.height) * 0.2;
    if (r < 8) return;

    const compDiag = new paper.Path.Line(
      new paper.Point(cb.left, cb.bottom),
      new paper.Point(cb.right, cb.top)
    );
    let showComp = true;
    if (context?.useRealData && context?.actualPaths) {
      showComp = intersectsAnyPath(compDiag, context.actualPaths);
    }
    compDiag.remove();

    if (showComp) {
      const arc = new paper.Path.Arc(
        new paper.Point(cb.left + r, cb.bottom),
        new paper.Point(cb.left + r * 0.85, cb.bottom - r * 0.5),
        new paper.Point(
          cb.left + r * Math.cos(angle * Math.PI / 180),
          cb.bottom - r * Math.sin(angle * Math.PI / 180)
        )
      );
      arc.strokeColor = hexToColor(style.color, style.opacity * 0.6);
      arc.strokeWidth = style.strokeWidth * 0.7;
      arc.fillColor = null;

      if (r > 15) {
        const lbl = new paper.PointText(new paper.Point(cb.left + r * 1.5, cb.bottom - r * 0.3));
        lbl.content = `${angle.toFixed(1)}°`;
        lbl.fillColor = hexToColor(style.color, style.opacity * 0.7);
        lbl.fontSize = 8;
      }
    }
  });
}

export function renderSpacingGuides(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.9);
  const fillColor = hexToColor(style.color, style.opacity * 0.08);

  if (scaledCompBounds.length < 2) return;

  for (let i = 0; i < scaledCompBounds.length; i++) {
    for (let j = i + 1; j < scaledCompBounds.length; j++) {
      const a = scaledCompBounds[i];
      const b = scaledCompBounds[j];

      // Horizontal spacing
      const leftComp = a.center.x < b.center.x ? a : b;
      const rightComp = a.center.x < b.center.x ? b : a;
      const hGap = rightComp.left - leftComp.right;

      if (hGap > 5) {
        const midY = (leftComp.center.y + rightComp.center.y) / 2;
        // Spacing area
        const rect = new paper.Path.Rectangle(
          new paper.Point(leftComp.right, Math.min(leftComp.top, rightComp.top)),
          new paper.Point(rightComp.left, Math.max(leftComp.bottom, rightComp.bottom))
        );
        rect.fillColor = fillColor;
        rect.strokeColor = null;

        // Arrow line
        const line = new paper.Path.Line(
          new paper.Point(leftComp.right, midY),
          new paper.Point(rightComp.left, midY)
        );
        line.strokeColor = color;
        line.strokeWidth = style.strokeWidth;

        // Arrowheads
        const arrowSize = 4;
        const leftArrow = new paper.Path([
          new paper.Point(leftComp.right + arrowSize, midY - arrowSize),
          new paper.Point(leftComp.right, midY),
          new paper.Point(leftComp.right + arrowSize, midY + arrowSize),
        ]);
        leftArrow.strokeColor = color;
        leftArrow.strokeWidth = style.strokeWidth;

        const rightArrow = new paper.Path([
          new paper.Point(rightComp.left - arrowSize, midY - arrowSize),
          new paper.Point(rightComp.left, midY),
          new paper.Point(rightComp.left - arrowSize, midY + arrowSize),
        ]);
        rightArrow.strokeColor = color;
        rightArrow.strokeWidth = style.strokeWidth;

        // Label
        const lbl = new paper.PointText(new paper.Point((leftComp.right + rightComp.left) / 2, midY - 6));
        lbl.content = `${Math.round(hGap)}px`;
        lbl.fillColor = labelColor;
        lbl.fontSize = 9;
        lbl.fontWeight = 'bold';
        lbl.justification = 'center';
      }

      // Vertical spacing
      const topComp = a.center.y < b.center.y ? a : b;
      const bottomComp = a.center.y < b.center.y ? b : a;
      const vGap = bottomComp.top - topComp.bottom;

      if (vGap > 5) {
        const midX = (topComp.center.x + bottomComp.center.x) / 2;
        const line = new paper.Path.Line(
          new paper.Point(midX, topComp.bottom),
          new paper.Point(midX, bottomComp.top)
        );
        line.strokeColor = color;
        line.strokeWidth = style.strokeWidth;

        const arrowSize = 4;
        const topArrow = new paper.Path([
          new paper.Point(midX - arrowSize, topComp.bottom + arrowSize),
          new paper.Point(midX, topComp.bottom),
          new paper.Point(midX + arrowSize, topComp.bottom + arrowSize),
        ]);
        topArrow.strokeColor = color;
        topArrow.strokeWidth = style.strokeWidth;

        const bottomArrow = new paper.Path([
          new paper.Point(midX - arrowSize, bottomComp.top - arrowSize),
          new paper.Point(midX, bottomComp.top),
          new paper.Point(midX + arrowSize, bottomComp.top - arrowSize),
        ]);
        bottomArrow.strokeColor = color;
        bottomArrow.strokeWidth = style.strokeWidth;

        const lbl = new paper.PointText(new paper.Point(midX + 8, (topComp.bottom + bottomComp.top) / 2 + 3));
        lbl.content = `${Math.round(vGap)}px`;
        lbl.fillColor = labelColor;
        lbl.fontSize = 9;
        lbl.fontWeight = 'bold';
      }
    }
  }
}

// Helper: get effective bounds from real content when available
function getEffectiveBounds(bounds: paper.Rectangle, context?: RenderContext): paper.Rectangle {
  if (context?.useRealData && context?.contentBounds) {
    return context.contentBounds;
  }
  return bounds;
}

export function renderRootRectangles(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = bounds;
  const actualRatio = eb.width / eb.height;

  const roots = [
    { name: '√2', value: Math.SQRT2 },
    { name: '√3', value: Math.sqrt(3) },
    { name: '√5', value: Math.sqrt(5) },
  ];

  const cx = eb.center.x;
  const cy = eb.center.y;

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

    const matchPct = Math.max(0, (1 - Math.abs(actualRatio - targetRatio) / actualRatio) * 100);

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

  const ratioLabel = new paper.PointText(new paper.Point(cx, eb.bottom + 14));
  ratioLabel.content = `Aspect ratio: ${actualRatio.toFixed(3)}:1`;
  ratioLabel.fillColor = hexToColor(style.color, style.opacity * 0.5);
  ratioLabel.fontSize = 8;
  ratioLabel.justification = 'center';
}

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
  const diagonal = Math.sqrt(eb.width * eb.width + eb.height * eb.height);
  const inscribed = minDim / 2;

  const targetSteps = 6;
  const baseRadius = inscribed / Math.pow(ratio, targetSteps - 1);
  const maxRadius = diagonal / 2;

  // Center marker / crosshair
  const hLine = new paper.Path.Line(
    new paper.Point(cx - 6, cy),
    new paper.Point(cx + 6, cy)
  );
  hLine.strokeColor = hexToColor(style.color, style.opacity * 0.8);
  hLine.strokeWidth = 1;
  const vLine = new paper.Path.Line(
    new paper.Point(cx, cy - 6),
    new paper.Point(cx, cy + 6)
  );
  vLine.strokeColor = hexToColor(style.color, style.opacity * 0.8);
  vLine.strokeWidth = 1;

  for (let i = 0; i < 10; i++) {
    const r = baseRadius * Math.pow(ratio, i);
    if (r > maxRadius) break;

    const beyondContent = r > inscribed;
    const opacity = beyondContent ? 0.25 : 1 - i * 0.08;

    const circle = new paper.Path.Circle(new paper.Point(cx, cy), r);
    showIfIntersects(circle, context, () => {
      circle.strokeColor = hexToColor(style.color, style.opacity * opacity);
      circle.strokeWidth = beyondContent ? style.strokeWidth * 0.6 : style.strokeWidth;
      circle.fillColor = null;
      circle.dashArray = beyondContent ? [3, 5] : [4, 4];

      if (r > 12) {
        const angle = Math.PI / 4;
        const lx = cx + r * Math.cos(angle) + 3;
        const ly = cy - r * Math.sin(angle) - 3;
        const label = new paper.PointText(new paper.Point(lx, ly));
        label.content = `×${ratio.toFixed(2)}^${i}`;
        label.fillColor = hexToColor(style.color, style.opacity * opacity * 0.8);
        label.fontSize = 8;
      }
    });
  }
}

export function renderAlignmentGuides(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  if (scaledCompBounds.length < 2) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.4);
  const threshold = 3; // pixel tolerance for alignment detection

  const edges = scaledCompBounds.map(cb => ({
    top: cb.top, bottom: cb.bottom, left: cb.left, right: cb.right,
    centerX: cb.center.x, centerY: cb.center.y,
  }));

  // Check alignment between all pairs
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const a = edges[i], b = edges[j];
      const checks = [
        { aVal: a.top, bVal: b.top, y: true, label: 'top' },
        { aVal: a.bottom, bVal: b.bottom, y: true, label: 'bottom' },
        { aVal: a.centerY, bVal: b.centerY, y: true, label: 'center-y' },
        { aVal: a.left, bVal: b.left, y: false, label: 'left' },
        { aVal: a.right, bVal: b.right, y: false, label: 'right' },
        { aVal: a.centerX, bVal: b.centerX, y: false, label: 'center-x' },
      ];

      checks.forEach(check => {
        if (Math.abs(check.aVal - check.bVal) < threshold) {
          const avgVal = (check.aVal + check.bVal) / 2;
          if (check.y) {
            const line = new paper.Path.Line(
              new paper.Point(bounds.left - 30, avgVal),
              new paper.Point(bounds.right + 30, avgVal)
            );
            showIfIntersects(line, context, () => {
              line.strokeColor = check.label.includes('center') ? color : dimColor;
              line.strokeWidth = style.strokeWidth;
              line.dashArray = [3, 3];
            });
          } else {
            const line = new paper.Path.Line(
              new paper.Point(avgVal, bounds.top - 30),
              new paper.Point(avgVal, bounds.bottom + 30)
            );
            showIfIntersects(line, context, () => {
              line.strokeColor = check.label.includes('center') ? color : dimColor;
              line.strokeWidth = style.strokeWidth;
              line.dashArray = [3, 3];
            });
          }
        }
      });
    }
  }
}

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

  // margin dimension label
  const dimLabel = new paper.PointText(new paper.Point(eb.left + insetX / 2, eb.top + insetY / 2));
  dimLabel.content = `${insetX.toFixed(0)}px`;
  dimLabel.fillColor = hexToColor(style.color, style.opacity * 0.5);
  dimLabel.fontSize = 7;
  dimLabel.justification = 'center';

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

  if (context?.useRealData && context?.contentBounds) {
    const cb = context.contentBounds;
    const safeL = eb.left + insetX;
    const safeT = eb.top + insetY;
    const safeR = eb.right - insetX;
    const safeB = eb.bottom - insetY;
    const fitsInside = cb.left >= safeL && cb.top >= safeT && cb.right <= safeR && cb.bottom <= safeB;

    const statusLabel = new paper.PointText(new paper.Point(eb.left + insetX + 4, eb.top + insetY + 12));
    statusLabel.content = fitsInside ? 'SAFE ZONE ✓' : `SAFE ZONE ✗ (${bleedCount}/4 bleeds)`;
    statusLabel.fillColor = fitsInside ? hexToColor('#22cc44', style.opacity * 0.8) : hexToColor('#ff4444', style.opacity * 0.8);
    statusLabel.fontSize = 8;
    statusLabel.fontWeight = 'bold';
  } else {
    const label = new paper.PointText(new paper.Point(eb.left + insetX + 4, eb.top + insetY + 12));
    label.content = 'SAFE ZONE';
    label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = 8;
    label.fontWeight = 'bold';
  }
}

// ===================== NEW TOOLS =====================

export function renderPixelGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  subdivisions: number,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const step = Math.min(bounds.width, bounds.height) / (subdivisions * 2);

  for (let x = bounds.left; x <= bounds.right; x += step) {
    const line = new paper.Path.Line(
      new paper.Point(x, bounds.top),
      new paper.Point(x, bounds.bottom)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = style.strokeWidth * 0.3;
    });
  }
  for (let y = bounds.top; y <= bounds.bottom; y += step) {
    const line = new paper.Path.Line(
      new paper.Point(bounds.left, y),
      new paper.Point(bounds.right, y)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = style.strokeWidth * 0.3;
    });
  }
}

export function renderOpticalCenter(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.8);

  const cx = bounds.center.x;
  const size = Math.min(bounds.width, bounds.height) * 0.08;

  // When using real data, compute optical center from actual path vertical distribution
  let opticalY = bounds.center.y - bounds.height * 0.05; // default 5% above center
  if (context?.useRealData && context?.actualPaths) {
    // Calculate centroid of all path points to determine visual weight center
    let totalY = 0;
    let count = 0;
    for (const path of context.actualPaths) {
      if (path.segments) {
        for (const seg of path.segments) {
          totalY += seg.point.y;
          count++;
        }
      }
    }
    if (count > 0) {
      opticalY = totalY / count;
    }
  }

  // Crosshair
  const hLine = new paper.Path.Line(
    new paper.Point(cx - size, opticalY),
    new paper.Point(cx + size, opticalY)
  );
  hLine.strokeColor = color;
  hLine.strokeWidth = style.strokeWidth;

  const vLine = new paper.Path.Line(
    new paper.Point(cx, opticalY - size),
    new paper.Point(cx, opticalY + size)
  );
  vLine.strokeColor = color;
  vLine.strokeWidth = style.strokeWidth;

  // Circle around optical center
  const circle = new paper.Path.Circle(new paper.Point(cx, opticalY), size * 0.6);
  circle.strokeColor = color;
  circle.strokeWidth = style.strokeWidth;
  circle.fillColor = hexToColor(style.color, style.opacity * 0.1);

  // Geometric center marker (small dot for comparison)
  const geoDot = new paper.Path.Circle(bounds.center, 2 + style.strokeWidth);
  geoDot.fillColor = hexToColor(style.color, style.opacity * 0.4);
  geoDot.strokeColor = hexToColor(style.color, style.opacity * 0.6);
  geoDot.strokeWidth = style.strokeWidth * 0.5;

  // Dashed line connecting both
  const connector = new paper.Path.Line(bounds.center, new paper.Point(cx, opticalY));
  connector.strokeColor = hexToColor(style.color, style.opacity * 0.3);
  connector.strokeWidth = style.strokeWidth * 0.5;
  connector.dashArray = [3, 3];

  // Labels
  const optLabel = new paper.PointText(new paper.Point(cx + size + 6, opticalY + 3));
  optLabel.content = context?.useRealData ? 'Visual Center' : 'Optical';
  optLabel.fillColor = labelColor;
  optLabel.fontSize = 8;

  const geoLabel = new paper.PointText(new paper.Point(cx + 8, bounds.center.y + 3));
  geoLabel.content = 'Geometric';
  geoLabel.fillColor = hexToColor(style.color, style.opacity * 0.4);
  geoLabel.fontSize = 8;
}

export function renderContrastGuide(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);

  // Draw contrast zones: highlight edges of the logo bounding box
  const inset = Math.min(bounds.width, bounds.height) * 0.15;

  // Corner brackets
  const bracketSize = inset * 0.6;
  const corners = [
    { x: bounds.left, y: bounds.top, dx: 1, dy: 1 },
    { x: bounds.right, y: bounds.top, dx: -1, dy: 1 },
    { x: bounds.left, y: bounds.bottom, dx: 1, dy: -1 },
    { x: bounds.right, y: bounds.bottom, dx: -1, dy: -1 },
  ];

  corners.forEach(c => {
    const h = new paper.Path.Line(
      new paper.Point(c.x, c.y),
      new paper.Point(c.x + bracketSize * c.dx, c.y)
    );
    h.strokeColor = color;
    h.strokeWidth = style.strokeWidth * 1.5;

    const v = new paper.Path.Line(
      new paper.Point(c.x, c.y),
      new paper.Point(c.x, c.y + bracketSize * c.dy)
    );
    v.strokeColor = color;
    v.strokeWidth = style.strokeWidth * 1.5;
  });

  // Center contrast zone circle
  const radius = Math.min(bounds.width, bounds.height) * 0.35;
  const zone = new paper.Path.Circle(bounds.center, radius);
  showIfIntersects(zone, context, () => {
    zone.strokeColor = hexToColor(style.color, style.opacity * 0.5);
    zone.strokeWidth = style.strokeWidth;
    zone.fillColor = hexToColor(style.color, style.opacity * 0.04);
    zone.dashArray = [6, 4];

    // Label
    const label = new paper.PointText(new paper.Point(bounds.center.x, bounds.center.y + radius + 14));
    label.content = 'HIGH CONTRAST ZONE';
    label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = 8;
    label.fontWeight = 'bold';
    label.justification = 'center';
  });
}

// ===================== BATCH 2 NEW TOOLS =====================

export function renderDynamicBaseline(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.7);

  // Baseline grid: 12 evenly spaced horizontal lines based on bounds height
  const lineCount = 12;
  const step = bounds.height / lineCount;

  for (let i = 0; i <= lineCount; i++) {
    const y = bounds.top + step * i;
    const line = new paper.Path.Line(
      new paper.Point(bounds.left - 20, y),
      new paper.Point(bounds.right + 20, y)
    );
    const isMajor = i % 4 === 0;
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = isMajor ? style.strokeWidth : style.strokeWidth * 0.4;
      line.dashArray = isMajor ? [] : [2, 4];

      if (isMajor && i > 0 && i < lineCount) {
        const label = new paper.PointText(new paper.Point(bounds.right + 25, y + 3));
        label.content = `${Math.round(step * i)}`;
        label.fillColor = labelColor;
        label.fontSize = 7;
      }
    });
  }

  // Label
  const title = new paper.PointText(new paper.Point(bounds.left - 25, bounds.top - 6));
  title.content = 'BASELINE';
  title.fillColor = labelColor;
  title.fontSize = 7;
  title.fontWeight = 'bold';
  title.justification = 'right';
}

export function renderFibonacciOverlay(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = bounds;
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const labelColor = hexToColor(style.color, style.opacity * 0.7);

  const MAX_SQUARES = 8;
  const fibSeq = [1, 1, 2, 3, 5, 8, 13, 21];

  // Fit a golden rectangle inside the content bounds
  let w: number, h: number;
  if (eb.width / eb.height >= PHI) {
    h = eb.height;
    w = h * PHI;
  } else {
    w = eb.width;
    h = w / PHI;
  }

  let x = eb.center.x - w / 2;
  let y = eb.center.y - h / 2;

  // Outer golden rectangle
  const outerRect = new paper.Path.Rectangle(
    new paper.Point(x, y), new paper.Size(w, h)
  );
  outerRect.strokeColor = dimColor;
  outerRect.strokeWidth = style.strokeWidth * 0.7;
  outerRect.fillColor = null;
  outerRect.dashArray = [4, 3];

  // Compute all square positions
  const squares: { sx: number; sy: number; s: number }[] = [];
  {
    let tw = w, th = h, tx = x, ty = y;
    for (let i = 0; i < MAX_SQUARES; i++) {
      const s = Math.min(tw, th);
      if (s < 0.5) break;
      const dir = i % 4;
      let sx: number, sy: number;
      switch (dir) {
        case 0: { sx = tx; sy = ty; tx += s; tw -= s; break; }
        case 1: { sx = tx; sy = ty; ty += s; th -= s; break; }
        case 2: { sx = tx + tw - s; sy = ty; tw -= s; break; }
        case 3: { sx = tx; sy = ty + th - s; th -= s; break; }
        default: continue;
      }
      squares.push({ sx, sy, s });
    }
  }

  // Build Fibonacci labels (largest square → largest number)
  const count = squares.length;
  const labels = fibSeq.slice(0, count).reverse();

  // Draw the squares
  squares.forEach((sq, i) => {
    const { sx, sy, s } = sq;
    const rectColor = hexToColor(style.color, style.opacity * 0.5);
    const fillC = hexToColor(style.color, style.opacity * 0.04);
    const rect = new paper.Path.Rectangle(
      new paper.Point(sx, sy), new paper.Size(s, s)
    );
    rect.strokeColor = rectColor;
    rect.strokeWidth = style.strokeWidth;
    rect.fillColor = fillC;

    if (s > 8) {
      const label = new paper.PointText(
        new paper.Point(sx + s / 2, sy + s / 2 + 3)
      );
      label.content = String(labels[i]);
      label.fillColor = labelColor;
      label.fontSize = Math.max(6, Math.min(14, s * 0.25));
      label.fontWeight = 'bold';
      label.justification = 'center';
    }
  });
}

export function renderKenBurnsSafe(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const fillColor = hexToColor(style.color, style.opacity * 0.05);
  const labelColor = hexToColor(style.color, style.opacity * 0.7);

  const margin = 0.1; // 10% broadcast safe
  const insetX = bounds.width * margin;
  const insetY = bounds.height * margin;

  const safeRect = new paper.Path.Rectangle(
    new paper.Point(bounds.left + insetX, bounds.top + insetY),
    new paper.Point(bounds.right - insetX, bounds.bottom - insetY)
  );
  showIfIntersects(safeRect, context, () => {
    safeRect.strokeColor = color;
    safeRect.strokeWidth = style.strokeWidth * 1.5;
    safeRect.fillColor = null;
    safeRect.dashArray = [10, 4, 2, 4];
  });

  // Corner markers
  const markerLen = Math.min(insetX, insetY) * 0.7;
  const corners = [
    { x: bounds.left + insetX, y: bounds.top + insetY, dx: 1, dy: 1 },
    { x: bounds.right - insetX, y: bounds.top + insetY, dx: -1, dy: 1 },
    { x: bounds.left + insetX, y: bounds.bottom - insetY, dx: 1, dy: -1 },
    { x: bounds.right - insetX, y: bounds.bottom - insetY, dx: -1, dy: -1 },
  ];
  corners.forEach(c => {
    const h = new paper.Path.Line(
      new paper.Point(c.x, c.y),
      new paper.Point(c.x + markerLen * c.dx, c.y)
    );
    h.strokeColor = color; h.strokeWidth = style.strokeWidth * 2;
    const v = new paper.Path.Line(
      new paper.Point(c.x, c.y),
      new paper.Point(c.x, c.y + markerLen * c.dy)
    );
    v.strokeColor = color; v.strokeWidth = style.strokeWidth * 2;
  });

  // Label
  const label = new paper.PointText(new paper.Point(bounds.center.x, bounds.top + insetY - 6));
  label.content = 'BROADCAST SAFE';
  label.fillColor = labelColor;
  label.fontSize = 8;
  label.fontWeight = 'bold';
  label.justification = 'center';
}

export function renderComponentRatioLabels(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig
) {
  const labelColor = hexToColor(style.color, style.opacity);

  // Helper to find closest standard ratio
  const findRatio = (w: number, h: number): string => {
    const ratio = w / h;
    const standards = [
      { name: '1:1', value: 1 },
      { name: '4:3', value: 4/3 },
      { name: '3:2', value: 3/2 },
      { name: '16:9', value: 16/9 },
      { name: '√2', value: Math.SQRT2 },
      { name: 'φ', value: (1 + Math.sqrt(5)) / 2 },
      { name: '2:1', value: 2 },
    ];
    let closest = standards[0];
    let minDiff = Infinity;
    standards.forEach(s => {
      const diff = Math.abs(ratio - s.value);
      if (diff < minDiff) { minDiff = diff; closest = s; }
    });
    return minDiff < 0.1 ? closest.name : `${ratio.toFixed(2)}:1`;
  };

  scaledCompBounds.forEach(cb => {
    const ratioText = findRatio(cb.width, cb.height);
    const dimText = `${Math.round(cb.width)}×${Math.round(cb.height)}`;

    // Ratio label above component
    const ratioLabel = new paper.PointText(new paper.Point(cb.center.x, cb.top - 8));
    ratioLabel.content = ratioText;
    ratioLabel.fillColor = labelColor;
    ratioLabel.fontSize = 10;
    ratioLabel.fontWeight = 'bold';
    ratioLabel.justification = 'center';

    // Dimensions below
    const dimLabel = new paper.PointText(new paper.Point(cb.center.x, cb.bottom + 14));
    dimLabel.content = dimText;
    dimLabel.fillColor = hexToColor(style.color, style.opacity * 0.6);
    dimLabel.fontSize = 8;
    dimLabel.justification = 'center';
  });

  // Full bounds ratio
  const fullRatio = findRatio(bounds.width, bounds.height);
  const fullLabel = new paper.PointText(new paper.Point(bounds.right + 8, bounds.top + 12));
  fullLabel.content = `Full: ${fullRatio}`;
  fullLabel.fillColor = hexToColor(style.color, style.opacity * 0.5);
  fullLabel.fontSize = 8;
}

// ===================== BATCH 3 NEW TOOLS =====================

export function renderVesicaPiscis(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const eb = bounds;
  const color = hexToColor(style.color, style.opacity);
  const fillColor = hexToColor(style.color, style.opacity * 0.06);

  const cx = eb.center.x;
  const cy = eb.center.y;

  // Fit vesica piscis WITHIN content bounds
  // Total width = 3r (two circles separated by r), total height = 2r
  const r = Math.min(eb.width / 3, eb.height / 2);
  const d = r;

  const c1 = new paper.Path.Circle(new paper.Point(cx - d / 2, cy), r);
  showIfIntersects(c1, context, () => {
    c1.strokeColor = color;
    c1.strokeWidth = style.strokeWidth;
    c1.fillColor = null;
  });

  const c2 = new paper.Path.Circle(new paper.Point(cx + d / 2, cy), r);
  showIfIntersects(c2, context, () => {
    c2.strokeColor = color;
    c2.strokeWidth = style.strokeWidth;
    c2.fillColor = null;
  });

  // Center dots on each circle
  const dot1 = new paper.Path.Circle(new paper.Point(cx - d / 2, cy), 2.5);
  dot1.fillColor = color; dot1.strokeColor = null;
  const dot2 = new paper.Path.Circle(new paper.Point(cx + d / 2, cy), 2.5);
  dot2.fillColor = color; dot2.strokeColor = null;

  // Vesica (lens) region
  const halfW = Math.sqrt(r * r - (d / 2) * (d / 2));
  const vesica = new paper.Path.Ellipse(new paper.Rectangle(
    new paper.Point(cx - halfW * 0.95, cy - r * 0.87),
    new paper.Point(cx + halfW * 0.95, cy + r * 0.87)
  ));
  showIfIntersects(vesica, context, () => {
    vesica.strokeColor = hexToColor(style.color, style.opacity * 0.7);
    vesica.strokeWidth = style.strokeWidth * 0.8;
    vesica.fillColor = fillColor;
    vesica.dashArray = [4, 3];
  });

  // Vertical axis
  const axis = new paper.Path.Line(new paper.Point(cx, cy - r), new paper.Point(cx, cy + r));
  showIfIntersects(axis, context, () => {
    axis.strokeColor = hexToColor(style.color, style.opacity * 0.4);
    axis.strokeWidth = style.strokeWidth * 0.5;
    axis.dashArray = [3, 3];
  });

  // Horizontal axis
  const hAxis = new paper.Path.Line(
    new paper.Point(cx - d / 2 - r, cy),
    new paper.Point(cx + d / 2 + r, cy)
  );
  showIfIntersects(hAxis, context, () => {
    hAxis.strokeColor = hexToColor(style.color, style.opacity * 0.3);
    hAxis.strokeWidth = style.strokeWidth * 0.5;
    hAxis.dashArray = [3, 3];
  });

  // Analysis
  if (context?.useRealData && context?.actualPaths) {
    let insideVesica = 0;
    let insideCircles = 0;
    let total = 0;
    for (const p of context.actualPaths) {
      total++;
      const pc = p.bounds.center;
      const dLeft = pc.getDistance(new paper.Point(cx - d / 2, cy));
      const dRight = pc.getDistance(new paper.Point(cx + d / 2, cy));
      if (dLeft <= r && dRight <= r) insideVesica++;
      if (dLeft <= r || dRight <= r) insideCircles++;
    }
    const vesicaPct = total > 0 ? Math.round((insideVesica / total) * 100) : 0;
    const circlesPct = total > 0 ? Math.round((insideCircles / total) * 100) : 0;

    const label = new paper.PointText(new paper.Point(cx, eb.top - 8));
    label.content = `VESICA ${vesicaPct}% · CIRCLES ${circlesPct}%`;
    label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = 7;
    label.fontWeight = 'bold';
    label.justification = 'center';
  } else {
    const label = new paper.PointText(new paper.Point(cx, eb.top - 8));
    label.content = 'VESICA PISCIS';
    label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = 7;
    label.fontWeight = 'bold';
    label.justification = 'center';
  }
}

export function renderRuleOfOdds(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.6);

  // Fifths
  for (let i = 1; i < 5; i++) {
    const x = bounds.left + (bounds.width * i) / 5;
    const line = new paper.Path.Line(
      new paper.Point(x, bounds.top - 15),
      new paper.Point(x, bounds.bottom + 15)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = style.strokeWidth;
      line.dashArray = [6, 3];
    });

    const y = bounds.top + (bounds.height * i) / 5;
    const hLine = new paper.Path.Line(
      new paper.Point(bounds.left - 15, y),
      new paper.Point(bounds.right + 15, y)
    );
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = color;
      hLine.strokeWidth = style.strokeWidth;
      hLine.dashArray = [6, 3];
    });
  }

  // Sevenths (dimmer)
  const dimColor = hexToColor(style.color, style.opacity * 0.4);
  for (let i = 1; i < 7; i++) {
    const x = bounds.left + (bounds.width * i) / 7;
    const line = new paper.Path.Line(
      new paper.Point(x, bounds.top - 8),
      new paper.Point(x, bounds.bottom + 8)
    );
    showIfIntersects(line, context, () => {
      line.strokeColor = dimColor;
      line.strokeWidth = style.strokeWidth * 0.5;
      line.dashArray = [2, 4];
    });

    const y = bounds.top + (bounds.height * i) / 7;
    const hLine = new paper.Path.Line(
      new paper.Point(bounds.left - 8, y),
      new paper.Point(bounds.right + 8, y)
    );
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = dimColor;
      hLine.strokeWidth = style.strokeWidth * 0.5;
      hLine.dashArray = [2, 4];
    });
  }

  // Labels
  const l5 = new paper.PointText(new paper.Point(bounds.right + 18, bounds.top + bounds.height / 5 + 3));
  l5.content = '1/5';
  l5.fillColor = labelColor;
  l5.fontSize = 7;

  const l7 = new paper.PointText(new paper.Point(bounds.right + 18, bounds.top + bounds.height / 7 + 3));
  l7.content = '1/7';
  l7.fillColor = hexToColor(style.color, style.opacity * 0.35);
  l7.fontSize = 7;
}

export function renderVisualWeightMap(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const labelColor = hexToColor(style.color, style.opacity * 0.8);

  // Split into 4 quadrants
  const cx = bounds.center.x;
  const cy = bounds.center.y;
  const quads = [
    { label: 'TL', rect: new paper.Rectangle(bounds.left, bounds.top, bounds.width / 2, bounds.height / 2) },
    { label: 'TR', rect: new paper.Rectangle(cx, bounds.top, bounds.width / 2, bounds.height / 2) },
    { label: 'BL', rect: new paper.Rectangle(bounds.left, cy, bounds.width / 2, bounds.height / 2) },
    { label: 'BR', rect: new paper.Rectangle(cx, cy, bounds.width / 2, bounds.height / 2) },
  ];

  if (context?.useRealData && context?.actualPaths) {
    // Calculate weight from actual path point density per quadrant
    let totalPoints = 0;
    const quadPoints = [0, 0, 0, 0];

    for (const path of context.actualPaths) {
      if (path.segments) {
        for (const seg of path.segments) {
          const pt = seg.point;
          totalPoints++;
          quads.forEach((q, qi) => {
            if (pt.x >= q.rect.left && pt.x <= q.rect.right &&
                pt.y >= q.rect.top && pt.y <= q.rect.bottom) {
              quadPoints[qi]++;
            }
          });
        }
      }
    }

    quads.forEach((q, qi) => {
      const weight = totalPoints > 0 ? Math.round((quadPoints[qi] / totalPoints) * 100) : 0;
      const fill = hexToColor(style.color, style.opacity * (weight / 100) * 0.3);
      const rect = new paper.Path.Rectangle(q.rect);
      rect.fillColor = fill;
      rect.strokeColor = hexToColor(style.color, style.opacity * 0.2);
      rect.strokeWidth = style.strokeWidth * 0.5;
      rect.dashArray = [4, 4];

      const label = new paper.PointText(new paper.Point(q.rect.center.x, q.rect.center.y + 4));
      label.content = `${weight}%`;
      label.fillColor = labelColor;
      label.fontSize = 10;
      label.fontWeight = 'bold';
      label.justification = 'center';
    });
  } else {
    // Original behavior: calculate from component bounding box overlap
    const totalArea = scaledCompBounds.reduce((sum, cb) => sum + cb.width * cb.height, 0) || 1;

    quads.forEach(q => {
      let overlapArea = 0;
      scaledCompBounds.forEach(cb => {
        const ox = Math.max(0, Math.min(cb.right, q.rect.right) - Math.max(cb.left, q.rect.left));
        const oy = Math.max(0, Math.min(cb.bottom, q.rect.bottom) - Math.max(cb.top, q.rect.top));
        overlapArea += ox * oy;
      });
      const weight = Math.round((overlapArea / totalArea) * 100);

      const fill = hexToColor(style.color, style.opacity * (weight / 100) * 0.3);
      const rect = new paper.Path.Rectangle(q.rect);
      rect.fillColor = fill;
      rect.strokeColor = hexToColor(style.color, style.opacity * 0.2);
      rect.strokeWidth = style.strokeWidth * 0.5;
      rect.dashArray = [4, 4];

      const label = new paper.PointText(new paper.Point(q.rect.center.x, q.rect.center.y + 4));
      label.content = `${weight}%`;
      label.fillColor = labelColor;
      label.fontSize = 10;
      label.fontWeight = 'bold';
      label.justification = 'center';
    });
  }
}

export function renderAnchoringPoints(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const size = 4 + style.strokeWidth * 2;

  const points = [
    bounds.topLeft, new paper.Point(bounds.center.x, bounds.top), bounds.topRight,
    new paper.Point(bounds.left, bounds.center.y), bounds.center, new paper.Point(bounds.right, bounds.center.y),
    bounds.bottomLeft, new paper.Point(bounds.center.x, bounds.bottom), bounds.bottomRight,
  ];

  points.forEach(pt => {
    // In real data mode, only show anchoring points that are near actual paths
    if (context?.useRealData && context?.actualPaths) {
      let nearPath = false;
      for (const path of context.actualPaths) {
        const nearest = path.getNearestPoint(pt);
        if (nearest.getDistance(pt) < Math.max(bounds.width, bounds.height) * 0.05) {
          nearPath = true;
          break;
        }
      }
      if (!nearPath) return;
    }

    // Crosshair
    const h = new paper.Path.Line(
      new paper.Point(pt.x - size, pt.y),
      new paper.Point(pt.x + size, pt.y)
    );
    h.strokeColor = color;
    h.strokeWidth = style.strokeWidth;

    const v = new paper.Path.Line(
      new paper.Point(pt.x, pt.y - size),
      new paper.Point(pt.x, pt.y + size)
    );
    v.strokeColor = color;
    v.strokeWidth = style.strokeWidth;

    // Small circle
    const dot = new paper.Path.Circle(pt, 1.5 + style.strokeWidth);
    dot.fillColor = color;
    dot.strokeColor = hexToColor('#ffffff', style.opacity * 0.6);
    dot.strokeWidth = style.strokeWidth * 0.3;
  });
}

export function renderHarmonicDivisions(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.6);

  const divisions = [
    { n: 2, label: '1/2' },
    { n: 3, label: '1/3' },
    { n: 4, label: '1/4' },
    { n: 5, label: '1/5' },
    { n: 6, label: '1/6' },
  ];

  divisions.forEach((div, di) => {
    const opacity = 1 - di * 0.15;
    const c = hexToColor(style.color, style.opacity * opacity);

    for (let i = 1; i < div.n; i++) {
      // Vertical
      const x = bounds.left + (bounds.width * i) / div.n;
      const vLine = new paper.Path.Line(
        new paper.Point(x, bounds.top - 5 - di * 3),
        new paper.Point(x, bounds.bottom + 5 + di * 3)
      );
      showIfIntersects(vLine, context, () => {
        vLine.strokeColor = c;
        vLine.strokeWidth = style.strokeWidth * (1 - di * 0.12);
        vLine.dashArray = [3 + di, 3 + di];
      });

      // Horizontal
      const y = bounds.top + (bounds.height * i) / div.n;
      const hLine = new paper.Path.Line(
        new paper.Point(bounds.left - 5 - di * 3, y),
        new paper.Point(bounds.right + 5 + di * 3, y)
      );
      showIfIntersects(hLine, context, () => {
        hLine.strokeColor = c;
        hLine.strokeWidth = style.strokeWidth * (1 - di * 0.12);
        hLine.dashArray = [3 + di, 3 + di];
      });
    }

    // Label on right side
    const labelY = bounds.top + bounds.height / div.n;
    const label = new paper.PointText(new paper.Point(bounds.right + 20 + di * 12, labelY + 3));
    label.content = div.label;
    label.fillColor = labelColor;
    label.fontSize = 7;
  });
}

// ============================================================
// ADVANCED SVG ANALYSIS TOOLS
// Inspired by logo construction techniques from design literature
// (Geometry of Design, Logo Modernism, Grid Systems in Graphic Design)
// ============================================================

/**
 * Parallel Flow Lines
 * Detects dominant directions in the SVG paths by sampling tangent vectors,
 * then draws parallel construction lines along those directions.
 * Reference: Kimberly Elam - Geometry of Design
 */
export function renderParallelFlowLines(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext,
  maxFlowLines: number = 5
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const paths = context.actualPaths;

  // Cohen-Sutherland line clipping
  const clipLineToRect = (x1: number, y1: number, x2: number, y2: number,
    xmin: number, ymin: number, xmax: number, ymax: number
  ): [number, number, number, number] | null => {
    const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
    const code = (x: number, y: number) => {
      let c = INSIDE;
      if (x < xmin) c |= LEFT; else if (x > xmax) c |= RIGHT;
      if (y < ymin) c |= TOP; else if (y > ymax) c |= BOTTOM;
      return c;
    };
    let c1 = code(x1, y1), c2 = code(x2, y2);
    while (true) {
      if (!(c1 | c2)) return [x1, y1, x2, y2];
      if (c1 & c2) return null;
      const co = c1 ? c1 : c2;
      let x = 0, y = 0;
      if (co & BOTTOM) { x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1); y = ymax; }
      else if (co & TOP) { x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1); y = ymin; }
      else if (co & RIGHT) { y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1); x = xmax; }
      else if (co & LEFT) { y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1); x = xmin; }
      if (co === c1) { x1 = x; y1 = y; c1 = code(x1, y1); }
      else { x2 = x; y2 = y; c2 = code(x2, y2); }
    }
  };

  interface SegmentInfo {
    angle: number; // 0-180 normalized
    midX: number;
    midY: number;
    dx: number;
    dy: number;
  }

  const segments: SegmentInfo[] = [];

  // Extract segment directions from actual path geometry
  for (const path of paths) {
    if (!path.segments || path.segments.length < 2) continue;

    for (let i = 0; i < path.segments.length; i++) {
      const seg = path.segments[i];
      const nextSeg = path.segments[(i + 1) % path.segments.length];
      if (!nextSeg || (i === path.segments.length - 1 && !path.closed)) continue;

      const p1 = seg.point;
      const p2 = nextSeg.point;
      const segDx = p2.x - p1.x;
      const segDy = p2.y - p1.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      if (segLen < 1) continue;

      // Normalize direction
      const ndx = segDx / segLen;
      const ndy = segDy / segLen;

      let angle = Math.round(Math.atan2(ndy, ndx) * 180 / Math.PI);
      if (angle < 0) angle += 180;
      angle = angle % 180;

      segments.push({
        angle,
        midX: (p1.x + p2.x) / 2,
        midY: (p1.y + p2.y) / 2,
        dx: ndx,
        dy: ndy,
      });
    }

    // Also sample curves for their tangent directions at key points
    if (path.curves) {
      for (const curve of path.curves) {
        if (!curve.hasHandles()) continue;
        const curveLen = curve.length;
        if (curveLen < 2) continue;
        // Sample at 5%, 50%, 95% (avoid exact endpoints)
        for (const t of [0.05, 0.5, 0.95]) {
          try {
            const pt = curve.getPointAt(curveLen * t);
            const tan = curve.getTangentAt(curveLen * t);
            if (!pt || !tan) continue;
            let angle = Math.round(Math.atan2(tan.y, tan.x) * 180 / Math.PI);
            if (angle < 0) angle += 180;
            angle = angle % 180;
            segments.push({ angle, midX: pt.x, midY: pt.y, dx: tan.x, dy: tan.y });
          } catch { /* skip */ }
        }
      }
    }
  }

  if (segments.length === 0) return;

  // Group segments by angle (tolerance ±3°)
  const angleTolerance = 3;
  interface AngleGroup {
    angle: number;
    dx: number;
    dy: number;
    points: { x: number; y: number }[];
  }
  const groups: AngleGroup[] = [];

  for (const seg of segments) {
    let found = false;
    for (const g of groups) {
      const diff = Math.abs(g.angle - seg.angle);
      if (diff <= angleTolerance || diff >= 180 - angleTolerance) {
        g.points.push({ x: seg.midX, y: seg.midY });
        found = true;
        break;
      }
    }
    if (!found) {
      groups.push({ angle: seg.angle, dx: seg.dx, dy: seg.dy, points: [{ x: seg.midX, y: seg.midY }] });
    }
  }

  // Sort by point count (most used direction first), take top 5
  groups.sort((a, b) => b.points.length - a.points.length);
  const topGroups = groups.slice(0, maxFlowLines);

  const diag = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);
  const ext = 30;
  const clipLeft = bounds.left - ext;
  const clipTop = bounds.top - ext;
  const clipRight = bounds.right + ext;
  const clipBottom = bounds.bottom + ext;

  topGroups.forEach((group, gIdx) => {
    const rad = group.angle * Math.PI / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const lineColor = gIdx < 2 ? color : dimColor;
    const sw = style.strokeWidth * (gIdx < 2 ? 1 : 0.7);

    // Deduplicate points that are too close along perpendicular axis
    const perpDx = -dy;
    const perpDy = dx;
    // Project each point onto perpendicular axis to find unique parallel line positions
    const projections: { proj: number; x: number; y: number }[] = group.points.map(p => ({
      proj: p.x * perpDx + p.y * perpDy,
      x: p.x,
      y: p.y,
    }));
    projections.sort((a, b) => a.proj - b.proj);

    // Merge close projections
    const minSpacing = Math.min(bounds.width, bounds.height) * 0.04;
    const uniqueLines: { x: number; y: number }[] = [];
    for (const p of projections) {
      if (uniqueLines.length === 0 || Math.abs(p.proj - (uniqueLines[uniqueLines.length - 1].x * perpDx + uniqueLines[uniqueLines.length - 1].y * perpDy)) > minSpacing) {
        uniqueLines.push({ x: p.x, y: p.y });
      }
    }

    // Draw a construction line through each unique position
    uniqueLines.forEach((pt, lIdx) => {
      const lx1 = pt.x - dx * diag;
      const ly1 = pt.y - dy * diag;
      const lx2 = pt.x + dx * diag;
      const ly2 = pt.y + dy * diag;

      const clipped = clipLineToRect(lx1, ly1, lx2, ly2, clipLeft, clipTop, clipRight, clipBottom);
      if (!clipped) return;

      const line = new paper.Path.Line(
        new paper.Point(clipped[0], clipped[1]),
        new paper.Point(clipped[2], clipped[3])
      );
      line.strokeColor = lineColor;
      line.strokeWidth = sw;
      line.dashArray = lIdx === 0 ? [] : [5, 3];
    });

    // Angle label for top groups
    if (gIdx < 3) {
      const label = new paper.PointText(new paper.Point(bounds.right + 8, bounds.top + 12 + gIdx * 14));
      label.content = `${group.angle}° (${group.points.length})`;
      label.fillColor = gIdx < 2 ? color : dimColor;
      label.fontSize = 9;
      label.fontWeight = 'bold';
    }
  });
}

/**
 * Underlying Circles
 * Finds circular arcs in the SVG by fitting circles through path curvature.
 * Draws the full underlying circles that the logo curves sit on.
 * Reference: Logo Modernism - Jens Müller (construction grids)
 */
export function renderUnderlyingCircles(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const paths = context.actualPaths;

  interface CircleCandidate {
    cx: number; cy: number; r: number; score: number;
  }

  const candidates: CircleCandidate[] = [];

  for (const path of paths) {
    if (!path.curves || path.curves.length < 1) continue;

    for (const curve of path.curves) {
      if (!curve.hasHandles()) continue;

      // Sample 3 points on the curve
      try {
        const cLen = curve.length;
        if (cLen < 1) continue;
        const p1 = curve.getPointAt(cLen * 0.05);
        const p2 = curve.getPointAt(cLen * 0.5);
        const p3 = curve.getPointAt(cLen * 0.95);
        if (!p1 || !p2 || !p3) continue;

        // Circumscribed circle from 3 points
        const ax = p1.x, ay = p1.y;
        const bx = p2.x, by = p2.y;
        const cx2 = p3.x, cy2 = p3.y;

        const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
        if (Math.abs(D) < 0.001) continue;

        const ux = ((ax * ax + ay * ay) * (by - cy2) + (bx * bx + by * by) * (cy2 - ay) + (cx2 * cx2 + cy2 * cy2) * (ay - by)) / D;
        const uy = ((ax * ax + ay * ay) * (cx2 - bx) + (bx * bx + by * by) * (ax - cx2) + (cx2 * cx2 + cy2 * cy2) * (bx - ax)) / D;
        const r = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));

        // Filter: reasonable radius (not too tiny, not astronomically large)
        const maxR = Math.max(bounds.width, bounds.height) * 2;
        const minR = Math.min(bounds.width, bounds.height) * 0.05;
        if (r < minR || r > maxR) continue;

        // Check if this circle is near an existing candidate (dedup)
        const exists = candidates.some(c =>
          Math.abs(c.cx - ux) < r * 0.15 &&
          Math.abs(c.cy - uy) < r * 0.15 &&
          Math.abs(c.r - r) < r * 0.15
        );
        if (exists) {
          const match = candidates.find(c =>
            Math.abs(c.cx - ux) < r * 0.15 &&
            Math.abs(c.cy - uy) < r * 0.15 &&
            Math.abs(c.r - r) < r * 0.15
          );
          if (match) match.score++;
          continue;
        }

        candidates.push({ cx: ux, cy: uy, r, score: 1 });
      } catch { /* skip invalid curves */ }
    }
  }

  // Sort by score (most curves match this circle) and show all
  candidates.sort((a, b) => b.score - a.score);

  candidates.forEach((c, idx) => {
    const circle = new paper.Path.Circle(new paper.Point(c.cx, c.cy), c.r);
    circle.strokeColor = idx < 2 ? color : dimColor;
    circle.strokeWidth = style.strokeWidth * (idx < 2 ? 1 : 0.7);
    circle.fillColor = null;
    circle.dashArray = [6, 3];

    // Draw center crosshair
    const crossSize = Math.min(c.r * 0.15, 6);
    const hCross = new paper.Path.Line(
      new paper.Point(c.cx - crossSize, c.cy),
      new paper.Point(c.cx + crossSize, c.cy)
    );
    hCross.strokeColor = idx < 2 ? color : dimColor;
    hCross.strokeWidth = style.strokeWidth * 0.5;
    const vCross = new paper.Path.Line(
      new paper.Point(c.cx, c.cy - crossSize),
      new paper.Point(c.cx, c.cy + crossSize)
    );
    vCross.strokeColor = idx < 2 ? color : dimColor;
    vCross.strokeWidth = style.strokeWidth * 0.5;
  });
}

/**
 * Dominant Diagonals
 * Traces the primary diagonal axes that run through the SVG paths.
 * Extends short path segments into full construction lines to reveal
 * the underlying diagonal grid.
 * Reference: Grid Systems in Graphic Design - Josef Müller-Brockmann
 */
export function renderDominantDiagonals(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.4);
  const paths = context.actualPaths;
  const diag = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);

  interface LineCandidate {
    x: number; y: number; angle: number; score: number;
  }

  const lineCandidates: LineCandidate[] = [];

  for (const path of paths) {
    if (!path.segments || path.segments.length < 2) continue;

    for (let i = 0; i < path.segments.length - 1; i++) {
      const p1 = path.segments[i].point;
      const p2 = path.segments[i + 1].point;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < Math.min(bounds.width, bounds.height) * 0.03) continue;

      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      // Normalize to 0-180
      if (angle < 0) angle += 180;

      // Skip near-horizontal and near-vertical (already covered by center lines)
      if (angle < 10 || angle > 170 || (angle > 80 && angle < 100)) continue;

      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;

      // Dedup with existing
      const match = lineCandidates.find(c =>
        Math.abs(c.angle - angle) < 5 &&
        Math.abs(c.x - mx) < bounds.width * 0.1 &&
        Math.abs(c.y - my) < bounds.height * 0.1
      );
      if (match) {
        match.score++;
        continue;
      }

      lineCandidates.push({ x: mx, y: my, angle, score: 1 });
    }
  }

  lineCandidates.sort((a, b) => b.score - a.score);
  const topLines = lineCandidates.slice(0, 6);

  // Cohen-Sutherland line clipping
  const clipLineToRect = (x1: number, y1: number, x2: number, y2: number,
    xmin: number, ymin: number, xmax: number, ymax: number
  ): [number, number, number, number] | null => {
    const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;
    const code = (x: number, y: number) => {
      let c = INSIDE;
      if (x < xmin) c |= LEFT; else if (x > xmax) c |= RIGHT;
      if (y < ymin) c |= TOP; else if (y > ymax) c |= BOTTOM;
      return c;
    };
    let c1 = code(x1, y1), c2 = code(x2, y2);
    while (true) {
      if (!(c1 | c2)) return [x1, y1, x2, y2];
      if (c1 & c2) return null;
      const co = c1 ? c1 : c2;
      let x = 0, y = 0;
      if (co & BOTTOM) { x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1); y = ymax; }
      else if (co & TOP) { x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1); y = ymin; }
      else if (co & RIGHT) { y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1); x = xmax; }
      else if (co & LEFT) { y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1); x = xmin; }
      if (co === c1) { x1 = x; y1 = y; c1 = code(x1, y1); }
      else { x2 = x; y2 = y; c2 = code(x2, y2); }
    }
  };

  const ext = 15;
  const clipLeft = bounds.left - ext;
  const clipTop = bounds.top - ext;
  const clipRight = bounds.right + ext;
  const clipBottom = bounds.bottom + ext;

  topLines.forEach((l, idx) => {
    const rad = l.angle * Math.PI / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    const lx1 = l.x - dx * diag;
    const ly1 = l.y - dy * diag;
    const lx2 = l.x + dx * diag;
    const ly2 = l.y + dy * diag;

    const clipped = clipLineToRect(lx1, ly1, lx2, ly2, clipLeft, clipTop, clipRight, clipBottom);
    if (!clipped) return;

    const line = new paper.Path.Line(
      new paper.Point(clipped[0], clipped[1]),
      new paper.Point(clipped[2], clipped[3])
    );
    line.strokeColor = idx < 2 ? color : dimColor;
    line.strokeWidth = style.strokeWidth * (idx < 2 ? 1 : 0.6);
    line.dashArray = [8, 4];

    // Angle label
    if (idx < 3) {
      const labelPt = new paper.Point(bounds.right + 8, bounds.bottom - 8 - idx * 14);
      const label = new paper.PointText(labelPt);
      label.content = `${Math.round(l.angle)}°`;
      label.fillColor = idx < 2 ? color : dimColor;
      label.fontSize = 8;
    }
  });
}

/**
 * Curvature Comb
 * Draws curvature combs along bezier curves to visualize smoothness.
 * Longer "teeth" = higher curvature. Helps verify curve quality.
 * Reference: The Anatomy of Type - Stephen Coles / type design curvature analysis
 */
export function renderCurvatureComb(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const paths = context.actualPaths;
  const maxTeeth = Math.min(bounds.width, bounds.height) * 0.12;

  for (const path of paths) {
    if (!path.length || path.length < 5) continue;

    const steps = Math.min(100, Math.max(20, Math.floor(path.length / 2)));
    for (let i = 0; i < steps; i++) {
      const offset = (i / steps) * path.length;
      try {
        const point = path.getPointAt(offset);
        const normal = path.getNormalAt(offset);
        const curvature = path.getCurvatureAt(offset);
        if (!point || !normal || curvature === null || curvature === undefined || isNaN(curvature)) continue;

        // Scale curvature to visual length
        const toothLen = Math.min(Math.abs(curvature) * 800, maxTeeth);
        if (toothLen < 1) continue;

        const tooth = new paper.Path.Line(
          point,
          new paper.Point(
            point.x + normal.x * toothLen,
            point.y + normal.y * toothLen
          )
        );
        tooth.strokeColor = color;
        tooth.strokeWidth = style.strokeWidth * 0.4;
      } catch { /* skip invalid offsets */ }
    }
  }
}

/**
 * Skeleton Centerline
 * Approximates the centerline/skeleton of the SVG shapes by connecting
 * midpoints of opposite path segments. For thick strokes and letterforms,
 * this reveals the underlying "spine" of the design.
 * Reference: Calligraphy & Lettering - stroke skeleton analysis
 */
export function renderSkeletonCenterline(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const paths = context.actualPaths;

  for (const path of paths) {
    if (!path.length || path.length < 5 || !path.closed) continue;

    // Sample points around the closed path and find pairs of opposite points
    const totalLen = path.length;
    const numSamples = Math.min(60, Math.max(20, Math.floor(totalLen / 4)));
    const halfLen = totalLen / 2;
    const midpoints: paper.Point[] = [];

    for (let i = 0; i < numSamples; i++) {
      const offset1 = (i / numSamples) * totalLen;
      try {
        const clampedO1 = Math.min(offset1, totalLen - 0.1);
        const p1 = path.getPointAt(clampedO1);
        if (!p1) continue;

        // Find the nearest point on the path to the "opposite side"
        const offset2 = (offset1 + halfLen) % totalLen;
        const clampedO2 = Math.min(offset2, totalLen - 0.1);
        const p2 = path.getPointAt(clampedO2);
        if (!p2) continue;

        const mid = new paper.Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        midpoints.push(mid);
      } catch { /* skip */ }
    }

    if (midpoints.length < 3) continue;

    // Draw smooth path through midpoints
    const skeleton = new paper.Path();
    skeleton.strokeColor = color;
    skeleton.strokeWidth = style.strokeWidth;
    skeleton.fillColor = null;
    skeleton.dashArray = [3, 2];

    midpoints.forEach((pt) => {
      skeleton.add(new paper.Segment(pt));
    });
    skeleton.smooth({ type: 'catmull-rom', factor: 0.5 });
  }
}

/**
 * Construction Grid
 * Detects the implicit grid that the logo is built on by finding
 * recurring x/y coordinates in path anchor points.
 * Reference: Grid Systems in Graphic Design - Josef Müller-Brockmann
 */
export function renderConstructionGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.3);
  const paths = context.actualPaths;

  // Collect all anchor point coordinates
  const xCoords: number[] = [];
  const yCoords: number[] = [];

  for (const path of paths) {
    if (!path.segments) continue;
    for (const seg of path.segments) {
      xCoords.push(seg.point.x);
      yCoords.push(seg.point.y);
    }
  }

  if (xCoords.length < 3) return;

  // Cluster nearby coordinates (within tolerance)
  const tolerance = Math.min(bounds.width, bounds.height) * 0.015;

  function cluster(coords: number[]): { value: number; count: number }[] {
    const sorted = [...coords].sort((a, b) => a - b);
    const clusters: { value: number; count: number; sum: number }[] = [];
    for (const v of sorted) {
      const match = clusters.find(c => Math.abs(c.sum / c.count - v) < tolerance);
      if (match) {
        match.sum += v;
        match.count++;
      } else {
        clusters.push({ value: v, count: 1, sum: v });
      }
    }
    return clusters
      .filter(c => c.count >= 2)
      .map(c => ({ value: c.sum / c.count, count: c.count }))
      .sort((a, b) => b.count - a.count);
  }

  const xClusters = cluster(xCoords);
  const yClusters = cluster(yCoords);

  // Draw vertical lines at dominant X positions
  const ext = 15;
  xClusters.slice(0, 12).forEach((c, idx) => {
    const line = new paper.Path.Line(
      new paper.Point(c.value, bounds.top - ext),
      new paper.Point(c.value, bounds.bottom + ext)
    );
    const isPrimary = c.count >= 3;
    line.strokeColor = isPrimary ? color : dimColor;
    line.strokeWidth = style.strokeWidth * (isPrimary ? 0.8 : 0.5);
    line.dashArray = isPrimary ? [6, 3] : [2, 3];
  });

  // Draw horizontal lines at dominant Y positions
  yClusters.slice(0, 12).forEach((c, idx) => {
    const line = new paper.Path.Line(
      new paper.Point(bounds.left - ext, c.value),
      new paper.Point(bounds.right + ext, c.value)
    );
    const isPrimary = c.count >= 3;
    line.strokeColor = isPrimary ? color : dimColor;
    line.strokeWidth = style.strokeWidth * (isPrimary ? 0.8 : 0.5);
    line.dashArray = isPrimary ? [6, 3] : [2, 3];
  });

  // Label grid count
  const total = xClusters.length + yClusters.length;
  if (total > 0) {
    const label = new paper.PointText(new paper.Point(bounds.left - 5, bounds.top - 8));
    label.content = `${xClusters.length}×${yClusters.length} grid`;
    label.fillColor = color;
    label.fontSize = 8;
    label.justification = 'left';
  }
}

/**
 * Path Direction Arrows
 * Shows the direction of each SVG path with small arrows along the path.
 * Useful for debugging winding rules and understanding path construction.
 * Reference: SVG specification / vector path construction theory
 */
export function renderPathDirectionArrows(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const paths = context.actualPaths;
  const arrowSize = Math.min(bounds.width, bounds.height) * 0.02 + style.strokeWidth * 1.5;

  for (const path of paths) {
    if (!path.length || path.length < 5) continue;

    // Place arrows at 25%, 50%, 75% of path
    const positions = [0.25, 0.5, 0.75];

    for (const pos of positions) {
      const offset = pos * path.length;
      try {
        const point = path.getPointAt(offset);
        const tangent = path.getTangentAt(offset);
        if (!point || !tangent) continue;

        const angle = Math.atan2(tangent.y, tangent.x);
        const size = Math.max(arrowSize, 3);

        // Arrow head triangle
        const tip = new paper.Point(
          point.x + Math.cos(angle) * size,
          point.y + Math.sin(angle) * size
        );
        const left = new paper.Point(
          point.x + Math.cos(angle + 2.5) * size * 0.7,
          point.y + Math.sin(angle + 2.5) * size * 0.7
        );
        const right = new paper.Point(
          point.x + Math.cos(angle - 2.5) * size * 0.7,
          point.y + Math.sin(angle - 2.5) * size * 0.7
        );

        const arrow = new paper.Path([
          new paper.Segment(tip),
          new paper.Segment(left),
          new paper.Segment(right),
        ]);
        arrow.closed = true;
        arrow.fillColor = color;
        arrow.strokeColor = null;
      } catch { /* skip */ }
    }
  }
}

/**
 * Tangent Intersections
 * Extends tangent lines from curve endpoints until they intersect,
 * revealing the implicit construction points of the logo.
 * Reference: Bezier curve construction / Industrial Design drafting
 */
export function renderTangentIntersections(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.35);
  const paths = context.actualPaths;
  const diag = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);

  const intersectionPoints: paper.Point[] = [];

  for (const path of paths) {
    if (!path.curves || path.curves.length < 1) continue;

    for (let i = 0; i < path.curves.length; i++) {
      const curve = path.curves[i];
      if (!curve.hasHandles()) continue;

      try {
        // Get tangent at start and end of curve
        const cLen = curve.length;
        if (cLen < 0.5) continue;
        const t1Point = curve.getPointAt(0.1);
        const t1Dir = curve.getTangentAt(0.1);
        const t2Point = curve.getPointAt(cLen - 0.1);
        const t2Dir = curve.getTangentAt(cLen - 0.1);
        if (!t1Point || !t1Dir || !t2Point || !t2Dir) continue;

        // Find intersection of the two tangent lines
        // Line 1: t1Point + s * t1Dir
        // Line 2: t2Point + t * t2Dir
        const cross = t1Dir.x * t2Dir.y - t1Dir.y * t2Dir.x;
        if (Math.abs(cross) < 0.001) continue; // parallel

        const dx = t2Point.x - t1Point.x;
        const dy = t2Point.y - t1Point.y;
        const s = (dx * t2Dir.y - dy * t2Dir.x) / cross;

        const ix = t1Point.x + s * t1Dir.x;
        const iy = t1Point.y + s * t1Dir.y;

        // Check if intersection is in reasonable range
        const dist = Math.sqrt((ix - bounds.center.x) ** 2 + (iy - bounds.center.y) ** 2);
        if (dist > diag) continue;

        intersectionPoints.push(new paper.Point(ix, iy));

        // Draw tangent lines to intersection
        const line1 = new paper.Path.Line(t1Point, new paper.Point(ix, iy));
        line1.strokeColor = dimColor;
        line1.strokeWidth = style.strokeWidth * 0.5;
        line1.dashArray = [3, 3];

        const line2 = new paper.Path.Line(t2Point, new paper.Point(ix, iy));
        line2.strokeColor = dimColor;
        line2.strokeWidth = style.strokeWidth * 0.5;
        line2.dashArray = [3, 3];
      } catch { /* skip */ }
    }
  }

  // Draw diamonds at intersection points (construction points)
  const markerSize = Math.max(3, Math.min(bounds.width, bounds.height) * 0.012) + style.strokeWidth;
  intersectionPoints.slice(0, 20).forEach(pt => {
    const diamond = new paper.Path([
      new paper.Segment(new paper.Point(pt.x, pt.y - markerSize)),
      new paper.Segment(new paper.Point(pt.x + markerSize, pt.y)),
      new paper.Segment(new paper.Point(pt.x, pt.y + markerSize)),
      new paper.Segment(new paper.Point(pt.x - markerSize, pt.y)),
    ]);
    diamond.closed = true;
    diamond.fillColor = color;
    diamond.strokeColor = null;
  });
}

/**
 * Anchor Points
 * Displays all anchor points (nodes) of the SVG paths with adjustable marker size.
 * Shows the skeleton of the vector construction.
 */
export function renderAnchorPoints(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext,
  pointSize: number = 3
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const paths = context.actualPaths;
  let totalPoints = 0;
  let smoothCount = 0;
  let cornerCount = 0;

  for (const path of paths) {
    if (!path.segments || path.segments.length === 0) continue;

    // Draw thin path outline to show connectivity
    const outline = path.clone() as paper.Path;
    outline.strokeColor = hexToColor(style.color, style.opacity * 0.2);
    outline.strokeWidth = style.strokeWidth * 0.3;
    outline.fillColor = null;
    outline.dashArray = [2, 2];

    for (const seg of path.segments) {
      const pt = new paper.Point(seg.point.x, seg.point.y);
      totalPoints++;

      // Determine if this is a corner or smooth point
      const hasHandles = (seg.handleIn && (Math.abs(seg.handleIn.x) > 0.1 || Math.abs(seg.handleIn.y) > 0.1)) ||
                          (seg.handleOut && (Math.abs(seg.handleOut.x) > 0.1 || Math.abs(seg.handleOut.y) > 0.1));

      if (hasHandles) {
        smoothCount++;
        // Smooth point: circle
        const dot = new paper.Path.Circle(pt, pointSize);
        dot.fillColor = color;
        dot.strokeColor = hexToColor('#ffffff', style.opacity * 0.8);
        dot.strokeWidth = style.strokeWidth * 0.3;
      } else {
        cornerCount++;
        // Corner point: square
        const half = pointSize;
        const sq = new paper.Path.Rectangle(
          new paper.Rectangle(pt.x - half, pt.y - half, half * 2, half * 2)
        );
        sq.fillColor = color;
        sq.strokeColor = hexToColor('#ffffff', style.opacity * 0.8);
        sq.strokeWidth = style.strokeWidth * 0.3;
      }
    }
  }

  // Summary label
  if (totalPoints > 0) {
    const label = new paper.PointText(new paper.Point(bounds.right + 8, bounds.top + 12));
    label.content = `${totalPoints} pts (${smoothCount}○ ${cornerCount}□)`;
    label.fillColor = color;
    label.fontSize = 9;
    label.fontWeight = 'bold';
  }
}

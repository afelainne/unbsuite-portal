import paper from 'paper';
import { hexToColor, intersectsAnyPath, showIfIntersects, type StyleConfig, type RenderContext } from './utils';

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
    
    if (context?.useRealData && context?.actualPaths) {
      const inscribedCircle = new paper.Path.Circle(new paper.Point(cx, cy), inscribedR);
      if (intersectsAnyPath(inscribedCircle, context.actualPaths)) {
        inscribedCircle.strokeColor = color;
        inscribedCircle.strokeWidth = style.strokeWidth;
        inscribedCircle.fillColor = null;
      } else {
        inscribedCircle.remove();
      }
      
      const circumCircle = new paper.Path.Circle(new paper.Point(cx, cy), circumR);
      if (intersectsAnyPath(circumCircle, context.actualPaths)) {
        circumCircle.strokeColor = dimColor;
        circumCircle.strokeWidth = style.strokeWidth;
        circumCircle.fillColor = null;
        circumCircle.dashArray = [6, 4];
      } else {
        circumCircle.remove();
      }
    } else {
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

  const hLine = new paper.Path.Line(
    new paper.Point(bounds.left - 30, bounds.center.y),
    new paper.Point(bounds.right + 30, bounds.center.y)
  );
  const vLine = new paper.Path.Line(
    new paper.Point(bounds.center.x, bounds.top - 30),
    new paper.Point(bounds.center.x, bounds.bottom + 30)
  );

  if (context?.useRealData && context?.actualPaths) {
    let hIntersects = false;
    let vIntersects = false;
    for (const path of context.actualPaths) {
      if (!hIntersects && hLine.getIntersections(path).length > 0) hIntersects = true;
      if (!vIntersects && vLine.getIntersections(path).length > 0) vIntersects = true;
      if (hIntersects && vIntersects) break;
    }
    if (hIntersects) { hLine.strokeColor = color; hLine.strokeWidth = style.strokeWidth; hLine.dashArray = [8, 4]; }
    else { hLine.remove(); }
    if (vIntersects) { vLine.strokeColor = color; vLine.strokeWidth = style.strokeWidth; vLine.dashArray = [8, 4]; }
    else { vLine.remove(); }
  } else {
    hLine.strokeColor = color; hLine.strokeWidth = style.strokeWidth; hLine.dashArray = [8, 4];
    vLine.strokeColor = color; vLine.strokeWidth = style.strokeWidth; vLine.dashArray = [8, 4];
  }

  scaledCompBounds.forEach(cb => {
    if (Math.abs(cb.center.x - bounds.center.x) > 2 || Math.abs(cb.center.y - bounds.center.y) > 2) {
      const ch = new paper.Path.Line(new paper.Point(cb.left - 10, cb.center.y), new paper.Point(cb.right + 10, cb.center.y));
      const cv = new paper.Path.Line(new paper.Point(cb.center.x, cb.top - 10), new paper.Point(cb.center.x, cb.bottom + 10));
      
      if (context?.useRealData && context?.actualPaths) {
        let chI = false, cvI = false;
        for (const path of context.actualPaths) {
          if (!chI && ch.getIntersections(path).length > 0) chI = true;
          if (!cvI && cv.getIntersections(path).length > 0) cvI = true;
          if (chI && cvI) break;
        }
        if (chI) { ch.strokeColor = dimColor; ch.strokeWidth = style.strokeWidth * 0.5; ch.dashArray = [4, 3]; }
        else { ch.remove(); }
        if (cvI) { cv.strokeColor = dimColor; cv.strokeWidth = style.strokeWidth * 0.5; cv.dashArray = [4, 3]; }
        else { cv.remove(); }
      } else {
        ch.strokeColor = dimColor; ch.strokeWidth = style.strokeWidth * 0.5; ch.dashArray = [4, 3];
        cv.strokeColor = dimColor; cv.strokeWidth = style.strokeWidth * 0.5; cv.dashArray = [4, 3];
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

  if (context?.useRealData && context?.actualPaths) {
    let d1I = false, d2I = false;
    for (const path of context.actualPaths) {
      if (!d1I && d1.getIntersections(path).length > 0) d1I = true;
      if (!d2I && d2.getIntersections(path).length > 0) d2I = true;
      if (d1I && d2I) break;
    }
    if (d1I) { d1.strokeColor = color; d1.strokeWidth = style.strokeWidth; } else { d1.remove(); }
    if (d2I) { d2.strokeColor = color; d2.strokeWidth = style.strokeWidth; } else { d2.remove(); }
  } else {
    d1.strokeColor = color; d1.strokeWidth = style.strokeWidth;
    d2.strokeColor = color; d2.strokeWidth = style.strokeWidth;
  }

  scaledCompBounds.forEach(cb => {
    const cd1 = new paper.Path.Line(new paper.Point(cb.left, cb.top), new paper.Point(cb.right, cb.bottom));
    const cd2 = new paper.Path.Line(new paper.Point(cb.right, cb.top), new paper.Point(cb.left, cb.bottom));
    if (context?.useRealData && context?.actualPaths) {
      let cd1I = false, cd2I = false;
      for (const path of context.actualPaths) {
        if (!cd1I && cd1.getIntersections(path).length > 0) cd1I = true;
        if (!cd2I && cd2.getIntersections(path).length > 0) cd2I = true;
        if (cd1I && cd2I) break;
      }
      if (cd1I) { cd1.strokeColor = dimColor; cd1.strokeWidth = style.strokeWidth * 0.5; } else { cd1.remove(); }
      if (cd2I) { cd2.strokeColor = dimColor; cd2.strokeWidth = style.strokeWidth * 0.5; } else { cd2.remove(); }
    } else {
      cd1.strokeColor = dimColor; cd1.strokeWidth = style.strokeWidth * 0.5;
      cd2.strokeColor = dimColor; cd2.strokeWidth = style.strokeWidth * 0.5;
    }
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
        if (intersectsAnyPath(line, context.actualPaths)) {
          line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [2, 3];
        } else { line.remove(); }
      } else {
        line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [2, 3];
      }
    });
    [cb.left, cb.right].forEach(x => {
      const line = new paper.Path.Line(new paper.Point(x, bounds.top - 40), new paper.Point(x, bounds.bottom + 40));
      if (context?.useRealData && context?.actualPaths) {
        if (intersectsAnyPath(line, context.actualPaths)) {
          line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [2, 3];
        } else { line.remove(); }
      } else {
        line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [2, 3];
      }
    });
  });
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
    if (context?.useRealData && context?.actualPaths) {
      let nearPath = false;
      for (const path of context.actualPaths) {
        const nearest = path.getNearestPoint(pt);
        if (nearest.getDistance(pt) < Math.max(bounds.width, bounds.height) * 0.05) {
          nearPath = true; break;
        }
      }
      if (!nearPath) return;
    }

    const h = new paper.Path.Line(new paper.Point(pt.x - size, pt.y), new paper.Point(pt.x + size, pt.y));
    h.strokeColor = color; h.strokeWidth = style.strokeWidth;
    const v = new paper.Path.Line(new paper.Point(pt.x, pt.y - size), new paper.Point(pt.x, pt.y + size));
    v.strokeColor = color; v.strokeWidth = style.strokeWidth;
    const dot = new paper.Path.Circle(pt, 1.5 + style.strokeWidth);
    dot.fillColor = color;
    dot.strokeColor = hexToColor('#ffffff', style.opacity * 0.6);
    dot.strokeWidth = style.strokeWidth * 0.3;
  });
}

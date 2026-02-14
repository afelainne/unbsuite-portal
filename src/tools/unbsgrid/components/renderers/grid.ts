import paper from 'paper';
import { hexToColor, showIfIntersects, intersectsAnyPath, type StyleConfig, type RenderContext } from './utils';

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

  const angles = [30, 150];
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
        line.strokeColor = color; line.strokeWidth = style.strokeWidth;
        if (i !== 0) line.dashArray = [4, 4];
      });
    }
  });

  for (let i = -subdivisions; i <= subdivisions; i++) {
    const x = cx + step * i;
    const line = new paper.Path.Line(new paper.Point(x, cy - extent), new paper.Point(x, cy + extent));
    showIfIntersects(line, context, () => {
      line.strokeColor = color; line.strokeWidth = style.strokeWidth * 0.5; line.dashArray = [2, 4];
    });
  }
}

export function renderPixelGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  subdivisions: number,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const step = Math.min(bounds.width, bounds.height) / (subdivisions * 2);

  for (let x = bounds.left; x <= bounds.right; x += step) {
    const line = new paper.Path.Line(new paper.Point(x, bounds.top), new paper.Point(x, bounds.bottom));
    showIfIntersects(line, context, () => { line.strokeColor = color; line.strokeWidth = style.strokeWidth * 0.3; });
  }
  for (let y = bounds.top; y <= bounds.bottom; y += step) {
    const line = new paper.Path.Line(new paper.Point(bounds.left, y), new paper.Point(bounds.right, y));
    showIfIntersects(line, context, () => { line.strokeColor = color; line.strokeWidth = style.strokeWidth * 0.3; });
  }
}

export function renderContrastGuide(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const inset = Math.min(bounds.width, bounds.height) * 0.15;
  const bracketSize = inset * 0.6;

  const corners = [
    { x: bounds.left, y: bounds.top, dx: 1, dy: 1 },
    { x: bounds.right, y: bounds.top, dx: -1, dy: 1 },
    { x: bounds.left, y: bounds.bottom, dx: 1, dy: -1 },
    { x: bounds.right, y: bounds.bottom, dx: -1, dy: -1 },
  ];

  corners.forEach(c => {
    const h = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x + bracketSize * c.dx, c.y));
    h.strokeColor = color; h.strokeWidth = style.strokeWidth * 1.5;
    const v = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x, c.y + bracketSize * c.dy));
    v.strokeColor = color; v.strokeWidth = style.strokeWidth * 1.5;
  });

  const radius = Math.min(bounds.width, bounds.height) * 0.35;
  const zone = new paper.Path.Circle(bounds.center, radius);
  showIfIntersects(zone, context, () => {
    zone.strokeColor = hexToColor(style.color, style.opacity * 0.5); zone.strokeWidth = style.strokeWidth;
    zone.fillColor = hexToColor(style.color, style.opacity * 0.04); zone.dashArray = [6, 4];
    const label = new paper.PointText(new paper.Point(bounds.center.x, bounds.center.y + radius + 14));
    label.content = 'HIGH CONTRAST ZONE'; label.fillColor = hexToColor(style.color, style.opacity * 0.6);
    label.fontSize = 8; label.fontWeight = 'bold'; label.justification = 'center';
  });
}

export function renderKenBurnsSafe(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
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
    safeRect.strokeColor = color; safeRect.strokeWidth = style.strokeWidth * 1.5;
    safeRect.fillColor = null; safeRect.dashArray = [10, 4, 2, 4];
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
    h.strokeColor = color; h.strokeWidth = style.strokeWidth * 2;
    const v = new paper.Path.Line(new paper.Point(c.x, c.y), new paper.Point(c.x, c.y + markerLen * c.dy));
    v.strokeColor = color; v.strokeWidth = style.strokeWidth * 2;
  });

  const label = new paper.PointText(new paper.Point(bounds.center.x, bounds.bottom - insetY - 6));
  label.content = 'BROADCAST SAFE'; label.fillColor = labelColor;
  label.fontSize = 8; label.fontWeight = 'bold'; label.justification = 'center';
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

  let opticalY = bounds.center.y - bounds.height * 0.05;
  if (context?.useRealData && context?.actualPaths) {
    let totalY = 0; let count = 0;
    for (const path of context.actualPaths) {
      if (path.segments) {
        for (const seg of path.segments) { totalY += seg.point.y; count++; }
      }
    }
    if (count > 0) { opticalY = totalY / count; }
  }

  const hLine = new paper.Path.Line(new paper.Point(cx - size, opticalY), new paper.Point(cx + size, opticalY));
  hLine.strokeColor = color; hLine.strokeWidth = style.strokeWidth;
  const vLine = new paper.Path.Line(new paper.Point(cx, opticalY - size), new paper.Point(cx, opticalY + size));
  vLine.strokeColor = color; vLine.strokeWidth = style.strokeWidth;

  const circle = new paper.Path.Circle(new paper.Point(cx, opticalY), size * 0.6);
  circle.strokeColor = color; circle.strokeWidth = style.strokeWidth;
  circle.fillColor = hexToColor(style.color, style.opacity * 0.1);

  const geoDot = new paper.Path.Circle(bounds.center, 2 + style.strokeWidth);
  geoDot.fillColor = hexToColor(style.color, style.opacity * 0.4);
  geoDot.strokeColor = hexToColor(style.color, style.opacity * 0.6);
  geoDot.strokeWidth = style.strokeWidth * 0.5;

  const connector = new paper.Path.Line(bounds.center, new paper.Point(cx, opticalY));
  connector.strokeColor = hexToColor(style.color, style.opacity * 0.3);
  connector.strokeWidth = style.strokeWidth * 0.5; connector.dashArray = [3, 3];

  const optLabel = new paper.PointText(new paper.Point(cx + size + 6, opticalY + 3));
  optLabel.content = context?.useRealData ? 'Visual Center' : 'Optical';
  optLabel.fillColor = labelColor; optLabel.fontSize = 8;

  const geoLabel = new paper.PointText(new paper.Point(cx + 8, bounds.center.y + 3));
  geoLabel.content = 'Geometric'; geoLabel.fillColor = hexToColor(style.color, style.opacity * 0.4); geoLabel.fontSize = 8;
}

export function renderVisualWeightMap(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const labelColor = hexToColor(style.color, style.opacity * 0.8);
  const cx = bounds.center.x;
  const cy = bounds.center.y;

  const quads = [
    { label: 'TL', rect: new paper.Rectangle(bounds.left, bounds.top, bounds.width / 2, bounds.height / 2) },
    { label: 'TR', rect: new paper.Rectangle(cx, bounds.top, bounds.width / 2, bounds.height / 2) },
    { label: 'BL', rect: new paper.Rectangle(bounds.left, cy, bounds.width / 2, bounds.height / 2) },
    { label: 'BR', rect: new paper.Rectangle(cx, cy, bounds.width / 2, bounds.height / 2) },
  ];

  if (context?.useRealData && context?.actualPaths) {
    let totalPoints = 0;
    const quadPoints = [0, 0, 0, 0];
    for (const path of context.actualPaths) {
      if (path.segments) {
        for (const seg of path.segments) {
          const pt = seg.point; totalPoints++;
          quads.forEach((q, qi) => {
            if (pt.x >= q.rect.left && pt.x <= q.rect.right && pt.y >= q.rect.top && pt.y <= q.rect.bottom) { quadPoints[qi]++; }
          });
        }
      }
    }
    quads.forEach((q, qi) => {
      const weight = totalPoints > 0 ? Math.round((quadPoints[qi] / totalPoints) * 100) : 0;
      const fill = hexToColor(style.color, style.opacity * (weight / 100) * 0.3);
      const rect = new paper.Path.Rectangle(q.rect);
      rect.fillColor = fill; rect.strokeColor = hexToColor(style.color, style.opacity * 0.2);
      rect.strokeWidth = style.strokeWidth * 0.5; rect.dashArray = [4, 4];
      const label = new paper.PointText(new paper.Point(q.rect.center.x, q.rect.center.y + 4));
      label.content = `${weight}%`; label.fillColor = labelColor; label.fontSize = 10; label.fontWeight = 'bold'; label.justification = 'center';
    });
  } else {
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
      rect.fillColor = fill; rect.strokeColor = hexToColor(style.color, style.opacity * 0.2);
      rect.strokeWidth = style.strokeWidth * 0.5; rect.dashArray = [4, 4];
      const label = new paper.PointText(new paper.Point(q.rect.center.x, q.rect.center.y + 4));
      label.content = `${weight}%`; label.fillColor = labelColor; label.fontSize = 10; label.fontWeight = 'bold'; label.justification = 'center';
    });
  }
}

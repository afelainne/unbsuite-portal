import paper from 'paper';
import type { BezierSegmentData } from '../../lib/svg-engine';
import { hexToColor, clipLineToRect, type StyleConfig, type RenderContext } from './utils';

export function renderBezierHandles(
  segments: BezierSegmentData[],
  originalBounds: paper.Rectangle,
  canvasBounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const handleColor = hexToColor(style.color, style.opacity * 0.7);

  if (context?.useRealData && context?.actualPaths && context.actualPaths.length > 0) {
    for (const path of context.actualPaths) {
      if (!path.curves || path.curves.length === 0) continue;
      for (const curve of path.curves) {
        const p1 = new paper.Point(curve.point1.x, curve.point1.y);
        const p2 = new paper.Point(curve.point2.x, curve.point2.y);
        const h1 = curve.handle1;
        if (h1 && (Math.abs(h1.x) > 0.1 || Math.abs(h1.y) > 0.1)) {
          const hPt = new paper.Point(p1.x + h1.x, p1.y + h1.y);
          const line = new paper.Path.Line(p1, hPt);
          line.strokeColor = handleColor; line.strokeWidth = style.strokeWidth * 0.6;
          const hdot = new paper.Path.Circle(hPt, style.strokeWidth + 0.5);
          hdot.fillColor = handleColor; hdot.strokeColor = null;
        }
        const h2 = curve.handle2;
        if (h2 && (Math.abs(h2.x) > 0.1 || Math.abs(h2.y) > 0.1)) {
          const hPt = new paper.Point(p2.x + h2.x, p2.y + h2.y);
          const line = new paper.Path.Line(p2, hPt);
          line.strokeColor = handleColor; line.strokeWidth = style.strokeWidth * 0.6;
          const hdot = new paper.Path.Circle(hPt, style.strokeWidth + 0.5);
          hdot.fillColor = handleColor; hdot.strokeColor = null;
        }
      }
      for (const seg of path.segments) {
        const pt = new paper.Point(seg.point.x, seg.point.y);
        const dot = new paper.Path.Circle(pt, style.strokeWidth * 1.5 + 1);
        dot.fillColor = color; dot.strokeColor = null;
      }
    }
    return;
  }

  const mapX = (x: number) => canvasBounds.left + ((x - originalBounds.left) / originalBounds.width) * canvasBounds.width;
  const mapY = (y: number) => canvasBounds.top + ((y - originalBounds.top) / originalBounds.height) * canvasBounds.height;

  segments.forEach(seg => {
    const ax = mapX(seg.anchor.x); const ay = mapY(seg.anchor.y);
    const dot = new paper.Path.Circle(new paper.Point(ax, ay), style.strokeWidth * 1.5 + 1);
    dot.fillColor = color; dot.strokeColor = null;

    if (seg.hasHandleIn) {
      const hx = mapX(seg.handleIn.x); const hy = mapY(seg.handleIn.y);
      const line = new paper.Path.Line(new paper.Point(ax, ay), new paper.Point(hx, hy));
      line.strokeColor = handleColor; line.strokeWidth = style.strokeWidth * 0.6;
      const hdot = new paper.Path.Circle(new paper.Point(hx, hy), style.strokeWidth + 0.5);
      hdot.fillColor = handleColor; hdot.strokeColor = null;
    }
    if (seg.hasHandleOut) {
      const hx = mapX(seg.handleOut.x); const hy = mapY(seg.handleOut.y);
      const line = new paper.Path.Line(new paper.Point(ax, ay), new paper.Point(hx, hy));
      line.strokeColor = handleColor; line.strokeWidth = style.strokeWidth * 0.6;
      const hdot = new paper.Path.Circle(new paper.Point(hx, hy), style.strokeWidth + 0.5);
      hdot.fillColor = handleColor; hdot.strokeColor = null;
    }
  });
}

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

  interface SegmentInfo { angle: number; midX: number; midY: number; dx: number; dy: number; }
  const segments: SegmentInfo[] = [];

  for (const path of paths) {
    if (!path.segments || path.segments.length < 2) continue;
    for (let i = 0; i < path.segments.length; i++) {
      const seg = path.segments[i];
      const nextSeg = path.segments[(i + 1) % path.segments.length];
      if (!nextSeg || (i === path.segments.length - 1 && !path.closed)) continue;
      const p1 = seg.point; const p2 = nextSeg.point;
      const segDx = p2.x - p1.x; const segDy = p2.y - p1.y;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      if (segLen < 1) continue;
      const ndx = segDx / segLen; const ndy = segDy / segLen;
      let angle = Math.round(Math.atan2(ndy, ndx) * 180 / Math.PI);
      if (angle < 0) angle += 180;
      angle = angle % 180;
      segments.push({ angle, midX: (p1.x + p2.x) / 2, midY: (p1.y + p2.y) / 2, dx: ndx, dy: ndy });
    }
    if (path.curves) {
      for (const curve of path.curves) {
        if (!curve.hasHandles()) continue;
        const curveLen = curve.length;
        if (curveLen < 2) continue;
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

  const angleTolerance = 3;
  interface AngleGroup { angle: number; dx: number; dy: number; points: { x: number; y: number }[]; }
  const groups: AngleGroup[] = [];

  for (const seg of segments) {
    let found = false;
    for (const g of groups) {
      const diff = Math.abs(g.angle - seg.angle);
      if (diff <= angleTolerance || diff >= 180 - angleTolerance) {
        g.points.push({ x: seg.midX, y: seg.midY }); found = true; break;
      }
    }
    if (!found) { groups.push({ angle: seg.angle, dx: seg.dx, dy: seg.dy, points: [{ x: seg.midX, y: seg.midY }] }); }
  }

  groups.sort((a, b) => b.points.length - a.points.length);
  const topGroups = groups.slice(0, maxFlowLines);
  const diag = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);
  const ext = 30;
  const clipLeft = bounds.left - ext; const clipTop = bounds.top - ext;
  const clipRight = bounds.right + ext; const clipBottom = bounds.bottom + ext;

  topGroups.forEach((group, gIdx) => {
    const rad = group.angle * Math.PI / 180;
    const dx = Math.cos(rad); const dy = Math.sin(rad);
    const lineColor = gIdx < 2 ? color : dimColor;
    const sw = style.strokeWidth * (gIdx < 2 ? 1 : 0.7);
    const perpDx = -dy; const perpDy = dx;

    const projections: { proj: number; x: number; y: number }[] = group.points.map(p => ({
      proj: p.x * perpDx + p.y * perpDy, x: p.x, y: p.y,
    }));
    projections.sort((a, b) => a.proj - b.proj);

    const minSpacing = Math.min(bounds.width, bounds.height) * 0.04;
    const uniqueLines: { x: number; y: number }[] = [];
    for (const p of projections) {
      if (uniqueLines.length === 0 || Math.abs(p.proj - (uniqueLines[uniqueLines.length - 1].x * perpDx + uniqueLines[uniqueLines.length - 1].y * perpDy)) > minSpacing) {
        uniqueLines.push({ x: p.x, y: p.y });
      }
    }

    uniqueLines.forEach((pt, lIdx) => {
      const clipped = clipLineToRect(pt.x - dx * diag, pt.y - dy * diag, pt.x + dx * diag, pt.y + dy * diag, clipLeft, clipTop, clipRight, clipBottom);
      if (!clipped) return;
      const line = new paper.Path.Line(new paper.Point(clipped[0], clipped[1]), new paper.Point(clipped[2], clipped[3]));
      line.strokeColor = lineColor; line.strokeWidth = sw; line.dashArray = lIdx === 0 ? [] : [5, 3];
    });

    if (gIdx < 3) {
      const label = new paper.PointText(new paper.Point(bounds.right + 8, bounds.top + 12 + gIdx * 14));
      label.content = `${group.angle}° (${group.points.length})`; label.fillColor = gIdx < 2 ? color : dimColor;
      label.fontSize = 9; label.fontWeight = 'bold';
    }
  });
}

export function renderUnderlyingCircles(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.5);
  const paths = context.actualPaths;

  interface CircleCandidate { cx: number; cy: number; r: number; score: number; }
  const candidates: CircleCandidate[] = [];

  for (const path of paths) {
    if (!path.curves || path.curves.length < 1) continue;
    for (const curve of path.curves) {
      if (!curve.hasHandles()) continue;
      try {
        const cLen = curve.length;
        if (cLen < 1) continue;
        const p1 = curve.getPointAt(cLen * 0.05);
        const p2 = curve.getPointAt(cLen * 0.5);
        const p3 = curve.getPointAt(cLen * 0.95);
        if (!p1 || !p2 || !p3) continue;

        const ax = p1.x, ay = p1.y, bx = p2.x, by = p2.y, cx2 = p3.x, cy2 = p3.y;
        const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
        if (Math.abs(D) < 0.001) continue;

        const ux = ((ax * ax + ay * ay) * (by - cy2) + (bx * bx + by * by) * (cy2 - ay) + (cx2 * cx2 + cy2 * cy2) * (ay - by)) / D;
        const uy = ((ax * ax + ay * ay) * (cx2 - bx) + (bx * bx + by * by) * (ax - cx2) + (cx2 * cx2 + cy2 * cy2) * (bx - ax)) / D;
        const r = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));

        const maxR = Math.max(bounds.width, bounds.height) * 2;
        const minR = Math.min(bounds.width, bounds.height) * 0.05;
        if (r < minR || r > maxR) continue;

        const exists = candidates.some(c => Math.abs(c.cx - ux) < r * 0.15 && Math.abs(c.cy - uy) < r * 0.15 && Math.abs(c.r - r) < r * 0.15);
        if (exists) {
          const match = candidates.find(c => Math.abs(c.cx - ux) < r * 0.15 && Math.abs(c.cy - uy) < r * 0.15 && Math.abs(c.r - r) < r * 0.15);
          if (match) match.score++;
          continue;
        }
        candidates.push({ cx: ux, cy: uy, r, score: 1 });
      } catch { /* skip */ }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  candidates.forEach((c, idx) => {
    const circle = new paper.Path.Circle(new paper.Point(c.cx, c.cy), c.r);
    circle.strokeColor = idx < 2 ? color : dimColor; circle.strokeWidth = style.strokeWidth * (idx < 2 ? 1 : 0.7);
    circle.fillColor = null; circle.dashArray = [6, 3];

    const crossSize = Math.min(c.r * 0.15, 6);
    const hCross = new paper.Path.Line(new paper.Point(c.cx - crossSize, c.cy), new paper.Point(c.cx + crossSize, c.cy));
    hCross.strokeColor = idx < 2 ? color : dimColor; hCross.strokeWidth = style.strokeWidth * 0.5;
    const vCross = new paper.Path.Line(new paper.Point(c.cx, c.cy - crossSize), new paper.Point(c.cx, c.cy + crossSize));
    vCross.strokeColor = idx < 2 ? color : dimColor; vCross.strokeWidth = style.strokeWidth * 0.5;
  });
}

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

  interface LineCandidate { x: number; y: number; angle: number; score: number; }
  const lineCandidates: LineCandidate[] = [];

  for (const path of paths) {
    if (!path.segments || path.segments.length < 2) continue;
    for (let i = 0; i < path.segments.length - 1; i++) {
      const p1 = path.segments[i].point; const p2 = path.segments[i + 1].point;
      const dx = p2.x - p1.x; const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < Math.min(bounds.width, bounds.height) * 0.03) continue;
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 180;
      if (angle < 10 || angle > 170 || (angle > 80 && angle < 100)) continue;
      const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
      const match = lineCandidates.find(c => Math.abs(c.angle - angle) < 5 && Math.abs(c.x - mx) < bounds.width * 0.1 && Math.abs(c.y - my) < bounds.height * 0.1);
      if (match) { match.score++; continue; }
      lineCandidates.push({ x: mx, y: my, angle, score: 1 });
    }
  }

  lineCandidates.sort((a, b) => b.score - a.score);
  const topLines = lineCandidates.slice(0, 6);
  const ext = 15;

  topLines.forEach((l, idx) => {
    const rad = l.angle * Math.PI / 180;
    const dx = Math.cos(rad); const dy = Math.sin(rad);
    const clipped = clipLineToRect(l.x - dx * diag, l.y - dy * diag, l.x + dx * diag, l.y + dy * diag,
      bounds.left - ext, bounds.top - ext, bounds.right + ext, bounds.bottom + ext);
    if (!clipped) return;
    const line = new paper.Path.Line(new paper.Point(clipped[0], clipped[1]), new paper.Point(clipped[2], clipped[3]));
    line.strokeColor = idx < 2 ? color : dimColor; line.strokeWidth = style.strokeWidth * (idx < 2 ? 1 : 0.6); line.dashArray = [8, 4];
    if (idx < 3) {
      const labelPt = new paper.Point(bounds.right + 8, bounds.bottom - 8 - idx * 14);
      const label = new paper.PointText(labelPt);
      label.content = `${Math.round(l.angle)}°`; label.fillColor = idx < 2 ? color : dimColor; label.fontSize = 8;
    }
  });
}

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
        const toothLen = Math.min(Math.abs(curvature) * 800, maxTeeth);
        if (toothLen < 1) continue;
        const tooth = new paper.Path.Line(point, new paper.Point(point.x + normal.x * toothLen, point.y + normal.y * toothLen));
        tooth.strokeColor = color; tooth.strokeWidth = style.strokeWidth * 0.4;
      } catch { /* skip */ }
    }
  }
}

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
    const totalLen = path.length;
    const numSamples = Math.min(60, Math.max(20, Math.floor(totalLen / 4)));
    const halfLen = totalLen / 2;
    const midpoints: paper.Point[] = [];

    for (let i = 0; i < numSamples; i++) {
      const offset1 = (i / numSamples) * totalLen;
      try {
        const p1 = path.getPointAt(Math.min(offset1, totalLen - 0.1));
        if (!p1) continue;
        const p2 = path.getPointAt(Math.min((offset1 + halfLen) % totalLen, totalLen - 0.1));
        if (!p2) continue;
        midpoints.push(new paper.Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2));
      } catch { /* skip */ }
    }

    if (midpoints.length < 3) continue;
    const skeleton = new paper.Path();
    skeleton.strokeColor = color; skeleton.strokeWidth = style.strokeWidth;
    skeleton.fillColor = null; skeleton.dashArray = [3, 2];
    midpoints.forEach(pt => { skeleton.add(new paper.Segment(pt)); });
    skeleton.smooth({ type: 'catmull-rom', factor: 0.5 });
  }
}

export function renderConstructionGrid(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.3);
  const paths = context.actualPaths;

  const xCoords: number[] = [];
  const yCoords: number[] = [];

  for (const path of paths) {
    if (!path.segments) continue;
    for (const seg of path.segments) { xCoords.push(seg.point.x); yCoords.push(seg.point.y); }
  }

  if (xCoords.length < 3) return;

  const tolerance = Math.min(bounds.width, bounds.height) * 0.015;

  function cluster(coords: number[]): { value: number; count: number }[] {
    const sorted = [...coords].sort((a, b) => a - b);
    const clusters: { value: number; count: number; sum: number }[] = [];
    for (const v of sorted) {
      const match = clusters.find(c => Math.abs(c.sum / c.count - v) < tolerance);
      if (match) { match.sum += v; match.count++; } else { clusters.push({ value: v, count: 1, sum: v }); }
    }
    return clusters.filter(c => c.count >= 2).map(c => ({ value: c.sum / c.count, count: c.count })).sort((a, b) => b.count - a.count);
  }

  const xClusters = cluster(xCoords);
  const yClusters = cluster(yCoords);
  const ext = 15;

  xClusters.slice(0, 12).forEach(c => {
    const line = new paper.Path.Line(new paper.Point(c.value, bounds.top - ext), new paper.Point(c.value, bounds.bottom + ext));
    const isPrimary = c.count >= 3;
    line.strokeColor = isPrimary ? color : dimColor; line.strokeWidth = style.strokeWidth * (isPrimary ? 0.8 : 0.5);
    line.dashArray = isPrimary ? [6, 3] : [2, 3];
  });

  yClusters.slice(0, 12).forEach(c => {
    const line = new paper.Path.Line(new paper.Point(bounds.left - ext, c.value), new paper.Point(bounds.right + ext, c.value));
    const isPrimary = c.count >= 3;
    line.strokeColor = isPrimary ? color : dimColor; line.strokeWidth = style.strokeWidth * (isPrimary ? 0.8 : 0.5);
    line.dashArray = isPrimary ? [6, 3] : [2, 3];
  });

  const total = xClusters.length + yClusters.length;
  if (total > 0) {
    const label = new paper.PointText(new paper.Point(bounds.left - 5, bounds.top - 8));
    label.content = `${xClusters.length}×${yClusters.length} grid`; label.fillColor = color; label.fontSize = 8; label.justification = 'left';
  }
}

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
    for (const pos of [0.25, 0.5, 0.75]) {
      const offset = pos * path.length;
      try {
        const point = path.getPointAt(offset);
        const tangent = path.getTangentAt(offset);
        if (!point || !tangent) continue;
        const angle = Math.atan2(tangent.y, tangent.x);
        const size = Math.max(arrowSize, 3);
        const tip = new paper.Point(point.x + Math.cos(angle) * size, point.y + Math.sin(angle) * size);
        const left = new paper.Point(point.x + Math.cos(angle + 2.5) * size * 0.7, point.y + Math.sin(angle + 2.5) * size * 0.7);
        const right = new paper.Point(point.x + Math.cos(angle - 2.5) * size * 0.7, point.y + Math.sin(angle - 2.5) * size * 0.7);
        const arrow = new paper.Path([new paper.Segment(tip), new paper.Segment(left), new paper.Segment(right)]);
        arrow.closed = true; arrow.fillColor = color; arrow.strokeColor = null;
      } catch { /* skip */ }
    }
  }
}

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
        const cLen = curve.length;
        if (cLen < 0.5) continue;
        const t1Point = curve.getPointAt(0.1); const t1Dir = curve.getTangentAt(0.1);
        const t2Point = curve.getPointAt(cLen - 0.1); const t2Dir = curve.getTangentAt(cLen - 0.1);
        if (!t1Point || !t1Dir || !t2Point || !t2Dir) continue;

        const cross = t1Dir.x * t2Dir.y - t1Dir.y * t2Dir.x;
        if (Math.abs(cross) < 0.001) continue;

        const dx = t2Point.x - t1Point.x; const dy = t2Point.y - t1Point.y;
        const s = (dx * t2Dir.y - dy * t2Dir.x) / cross;
        const ix = t1Point.x + s * t1Dir.x; const iy = t1Point.y + s * t1Dir.y;

        const dist = Math.sqrt((ix - bounds.center.x) ** 2 + (iy - bounds.center.y) ** 2);
        if (dist > diag) continue;

        intersectionPoints.push(new paper.Point(ix, iy));

        const line1 = new paper.Path.Line(t1Point, new paper.Point(ix, iy));
        line1.strokeColor = dimColor; line1.strokeWidth = style.strokeWidth * 0.5; line1.dashArray = [3, 3];
        const line2 = new paper.Path.Line(t2Point, new paper.Point(ix, iy));
        line2.strokeColor = dimColor; line2.strokeWidth = style.strokeWidth * 0.5; line2.dashArray = [3, 3];
      } catch { /* skip */ }
    }
  }

  const markerSize = Math.max(3, Math.min(bounds.width, bounds.height) * 0.012) + style.strokeWidth;
  intersectionPoints.slice(0, 20).forEach(pt => {
    const diamond = new paper.Path([
      new paper.Segment(new paper.Point(pt.x, pt.y - markerSize)),
      new paper.Segment(new paper.Point(pt.x + markerSize, pt.y)),
      new paper.Segment(new paper.Point(pt.x, pt.y + markerSize)),
      new paper.Segment(new paper.Point(pt.x - markerSize, pt.y)),
    ]);
    diamond.closed = true; diamond.fillColor = color; diamond.strokeColor = null;
  });
}

export function renderAnchorPoints(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext,
  pointSize: number = 3
) {
  if (!context?.useRealData || !context?.actualPaths || context.actualPaths.length === 0) return;

  const color = hexToColor(style.color, style.opacity);
  const paths = context.actualPaths;
  let totalPoints = 0; let smoothCount = 0; let cornerCount = 0;

  for (const path of paths) {
    if (!path.segments || path.segments.length === 0) continue;

    const outline = path.clone() as paper.Path;
    outline.strokeColor = hexToColor(style.color, style.opacity * 0.2);
    outline.strokeWidth = style.strokeWidth * 0.3; outline.fillColor = null; outline.dashArray = [2, 2];

    for (const seg of path.segments) {
      const pt = new paper.Point(seg.point.x, seg.point.y);
      totalPoints++;
      const hasHandles = (seg.handleIn && (Math.abs(seg.handleIn.x) > 0.1 || Math.abs(seg.handleIn.y) > 0.1)) ||
                          (seg.handleOut && (Math.abs(seg.handleOut.x) > 0.1 || Math.abs(seg.handleOut.y) > 0.1));
      if (hasHandles) {
        smoothCount++;
        const dot = new paper.Path.Circle(pt, pointSize);
        dot.fillColor = color; dot.strokeColor = hexToColor('#ffffff', style.opacity * 0.8); dot.strokeWidth = style.strokeWidth * 0.3;
      } else {
        cornerCount++;
        const half = pointSize;
        const sq = new paper.Path.Rectangle(new paper.Rectangle(pt.x - half, pt.y - half, half * 2, half * 2));
        sq.fillColor = color; sq.strokeColor = hexToColor('#ffffff', style.opacity * 0.8); sq.strokeWidth = style.strokeWidth * 0.3;
      }
    }
  }

  if (totalPoints > 0) {
    const label = new paper.PointText(new paper.Point(bounds.right + 8, bounds.top + 12));
    label.content = `${totalPoints} pts (${smoothCount}○ ${cornerCount}□)`; label.fillColor = color; label.fontSize = 9; label.fontWeight = 'bold';
  }
}

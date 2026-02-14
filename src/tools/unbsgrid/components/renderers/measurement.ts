import paper from 'paper';
import { hexToColor, intersectsAnyPath, showIfIntersects, type StyleConfig, type RenderContext } from './utils';

export function renderSymmetryAxes(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const dimColor = hexToColor(style.color, style.opacity * 0.6);

  const vAxis = new paper.Path.Line(new paper.Point(bounds.center.x, bounds.top - 40), new paper.Point(bounds.center.x, bounds.bottom + 40));
  showIfIntersects(vAxis, context, () => { vAxis.strokeColor = color; vAxis.strokeWidth = style.strokeWidth * 1.2; vAxis.dashArray = [10, 4, 2, 4]; });

  const hAxis = new paper.Path.Line(new paper.Point(bounds.left - 40, bounds.center.y), new paper.Point(bounds.right + 40, bounds.center.y));
  showIfIntersects(hAxis, context, () => { hAxis.strokeColor = color; hAxis.strokeWidth = style.strokeWidth * 1.2; hAxis.dashArray = [10, 4, 2, 4]; });

  const diamond = new paper.Path.RegularPolygon(bounds.center, 4, 5);
  diamond.strokeColor = color; diamond.strokeWidth = style.strokeWidth;
  diamond.fillColor = hexToColor(style.color, style.opacity * 0.2); diamond.rotation = 45;

  scaledCompBounds.forEach(cb => {
    const cv = new paper.Path.Line(new paper.Point(cb.center.x, cb.top - 15), new paper.Point(cb.center.x, cb.bottom + 15));
    showIfIntersects(cv, context, () => { cv.strokeColor = dimColor; cv.strokeWidth = style.strokeWidth * 0.6; cv.dashArray = [6, 3, 2, 3]; });
    const ch = new paper.Path.Line(new paper.Point(cb.left - 15, cb.center.y), new paper.Point(cb.right + 15, cb.center.y));
    showIfIntersects(ch, context, () => { ch.strokeColor = dimColor; ch.strokeWidth = style.strokeWidth * 0.6; ch.dashArray = [6, 3, 2, 3]; });
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

  const diagAngle = Math.atan2(bounds.height, bounds.width) * (180 / Math.PI);
  const arcRadius = Math.min(bounds.width, bounds.height) * 0.15;

  const diagonal = new paper.Path.Line(new paper.Point(bounds.left, bounds.bottom), new paper.Point(bounds.right, bounds.top));
  let showMainAngle = true;
  if (context?.useRealData && context?.actualPaths) {
    showMainAngle = intersectsAnyPath(diagonal, context.actualPaths);
  }
  diagonal.remove();

  if (showMainAngle) {
    const arcPath = new paper.Path.Arc(
      new paper.Point(bounds.left + arcRadius, bounds.bottom),
      new paper.Point(bounds.left + arcRadius * Math.cos(diagAngle * Math.PI / 360), bounds.bottom - arcRadius * Math.sin(diagAngle * Math.PI / 360)),
      new paper.Point(bounds.left + arcRadius * Math.cos(diagAngle * Math.PI / 180), bounds.bottom - arcRadius * Math.sin(diagAngle * Math.PI / 180))
    );
    arcPath.strokeColor = color; arcPath.strokeWidth = style.strokeWidth; arcPath.fillColor = null;

    const labelPt = new paper.Point(bounds.left + arcRadius * 1.4 * Math.cos(diagAngle * Math.PI / 360), bounds.bottom - arcRadius * 1.4 * Math.sin(diagAngle * Math.PI / 360));
    const label = new paper.PointText(labelPt);
    label.content = `${diagAngle.toFixed(1)}°`; label.fillColor = labelColor; label.fontSize = 9; label.fontWeight = 'bold';
  }

  scaledCompBounds.forEach(cb => {
    const angle = Math.atan2(cb.height, cb.width) * (180 / Math.PI);
    const r = Math.min(cb.width, cb.height) * 0.2;
    if (r < 8) return;

    const compDiag = new paper.Path.Line(new paper.Point(cb.left, cb.bottom), new paper.Point(cb.right, cb.top));
    let showComp = true;
    if (context?.useRealData && context?.actualPaths) { showComp = intersectsAnyPath(compDiag, context.actualPaths); }
    compDiag.remove();

    if (showComp) {
      const arc = new paper.Path.Arc(
        new paper.Point(cb.left + r, cb.bottom),
        new paper.Point(cb.left + r * 0.85, cb.bottom - r * 0.5),
        new paper.Point(cb.left + r * Math.cos(angle * Math.PI / 180), cb.bottom - r * Math.sin(angle * Math.PI / 180))
      );
      arc.strokeColor = hexToColor(style.color, style.opacity * 0.6); arc.strokeWidth = style.strokeWidth * 0.7; arc.fillColor = null;

      if (r > 15) {
        const lbl = new paper.PointText(new paper.Point(cb.left + r * 1.5, cb.bottom - r * 0.3));
        lbl.content = `${angle.toFixed(1)}°`; lbl.fillColor = hexToColor(style.color, style.opacity * 0.7); lbl.fontSize = 8;
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

      const leftComp = a.center.x < b.center.x ? a : b;
      const rightComp = a.center.x < b.center.x ? b : a;
      const hGap = rightComp.left - leftComp.right;

      if (hGap > 5) {
        const midY = (leftComp.center.y + rightComp.center.y) / 2;
        const rect = new paper.Path.Rectangle(
          new paper.Point(leftComp.right, Math.min(leftComp.top, rightComp.top)),
          new paper.Point(rightComp.left, Math.max(leftComp.bottom, rightComp.bottom))
        );
        rect.fillColor = fillColor; rect.strokeColor = null;

        const line = new paper.Path.Line(new paper.Point(leftComp.right, midY), new paper.Point(rightComp.left, midY));
        line.strokeColor = color; line.strokeWidth = style.strokeWidth;

        const arrowSize = 4;
        const leftArrow = new paper.Path([
          new paper.Point(leftComp.right + arrowSize, midY - arrowSize),
          new paper.Point(leftComp.right, midY),
          new paper.Point(leftComp.right + arrowSize, midY + arrowSize),
        ]);
        leftArrow.strokeColor = color; leftArrow.strokeWidth = style.strokeWidth;

        const rightArrow = new paper.Path([
          new paper.Point(rightComp.left - arrowSize, midY - arrowSize),
          new paper.Point(rightComp.left, midY),
          new paper.Point(rightComp.left - arrowSize, midY + arrowSize),
        ]);
        rightArrow.strokeColor = color; rightArrow.strokeWidth = style.strokeWidth;

        const lbl = new paper.PointText(new paper.Point((leftComp.right + rightComp.left) / 2, midY - 6));
        lbl.content = `${Math.round(hGap)}px`; lbl.fillColor = labelColor; lbl.fontSize = 9; lbl.fontWeight = 'bold'; lbl.justification = 'center';
      }

      const topComp = a.center.y < b.center.y ? a : b;
      const bottomComp = a.center.y < b.center.y ? b : a;
      const vGap = bottomComp.top - topComp.bottom;

      if (vGap > 5) {
        const midX = (topComp.center.x + bottomComp.center.x) / 2;
        const line = new paper.Path.Line(new paper.Point(midX, topComp.bottom), new paper.Point(midX, bottomComp.top));
        line.strokeColor = color; line.strokeWidth = style.strokeWidth;

        const arrowSize = 4;
        const topArrow = new paper.Path([
          new paper.Point(midX - arrowSize, topComp.bottom + arrowSize),
          new paper.Point(midX, topComp.bottom),
          new paper.Point(midX + arrowSize, topComp.bottom + arrowSize),
        ]);
        topArrow.strokeColor = color; topArrow.strokeWidth = style.strokeWidth;

        const bottomArrow = new paper.Path([
          new paper.Point(midX - arrowSize, bottomComp.top - arrowSize),
          new paper.Point(midX, bottomComp.top),
          new paper.Point(midX + arrowSize, bottomComp.top - arrowSize),
        ]);
        bottomArrow.strokeColor = color; bottomArrow.strokeWidth = style.strokeWidth;

        const lbl = new paper.PointText(new paper.Point(midX + 8, (topComp.bottom + bottomComp.top) / 2 + 3));
        lbl.content = `${Math.round(vGap)}px`; lbl.fillColor = labelColor; lbl.fontSize = 9; lbl.fontWeight = 'bold';
      }
    }
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
  const threshold = 3;

  const edges = scaledCompBounds.map(cb => ({
    top: cb.top, bottom: cb.bottom, left: cb.left, right: cb.right,
    centerX: cb.center.x, centerY: cb.center.y,
  }));

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
            const line = new paper.Path.Line(new paper.Point(bounds.left - 30, avgVal), new paper.Point(bounds.right + 30, avgVal));
            showIfIntersects(line, context, () => {
              line.strokeColor = check.label.includes('center') ? color : dimColor;
              line.strokeWidth = style.strokeWidth; line.dashArray = [3, 3];
            });
          } else {
            const line = new paper.Path.Line(new paper.Point(avgVal, bounds.top - 30), new paper.Point(avgVal, bounds.bottom + 30));
            showIfIntersects(line, context, () => {
              line.strokeColor = check.label.includes('center') ? color : dimColor;
              line.strokeWidth = style.strokeWidth; line.dashArray = [3, 3];
            });
          }
        }
      });
    }
  }
}

export function renderDynamicBaseline(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.7);

  const lineCount = 12;
  const step = bounds.height / lineCount;

  for (let i = 0; i <= lineCount; i++) {
    const y = bounds.top + step * i;
    const line = new paper.Path.Line(new paper.Point(bounds.left - 20, y), new paper.Point(bounds.right + 20, y));
    const isMajor = i % 4 === 0;
    showIfIntersects(line, context, () => {
      line.strokeColor = color;
      line.strokeWidth = isMajor ? style.strokeWidth : style.strokeWidth * 0.4;
      line.dashArray = isMajor ? [] : [2, 4];
      if (isMajor && i > 0 && i < lineCount) {
        const label = new paper.PointText(new paper.Point(bounds.right + 25, y + 3));
        label.content = `${Math.round(step * i)}`; label.fillColor = labelColor; label.fontSize = 7;
      }
    });
  }

  const title = new paper.PointText(new paper.Point(bounds.left - 25, bounds.top - 6));
  title.content = 'BASELINE'; title.fillColor = labelColor; title.fontSize = 7; title.fontWeight = 'bold'; title.justification = 'right';
}

export function renderComponentRatioLabels(
  bounds: paper.Rectangle,
  scaledCompBounds: paper.Rectangle[],
  style: StyleConfig
) {
  const labelColor = hexToColor(style.color, style.opacity);

  const findRatio = (w: number, h: number): string => {
    const ratio = w / h;
    const standards = [
      { name: '1:1', value: 1 }, { name: '4:3', value: 4/3 }, { name: '3:2', value: 3/2 },
      { name: '16:9', value: 16/9 }, { name: '√2', value: Math.SQRT2 },
      { name: 'φ', value: (1 + Math.sqrt(5)) / 2 }, { name: '2:1', value: 2 },
    ];
    let closest = standards[0]; let minDiff = Infinity;
    standards.forEach(s => { const diff = Math.abs(ratio - s.value); if (diff < minDiff) { minDiff = diff; closest = s; } });
    return minDiff < 0.1 ? closest.name : `${ratio.toFixed(2)}:1`;
  };

  scaledCompBounds.forEach(cb => {
    const ratioText = findRatio(cb.width, cb.height);
    const dimText = `${Math.round(cb.width)}×${Math.round(cb.height)}`;

    const ratioLabel = new paper.PointText(new paper.Point(cb.center.x, cb.top - 8));
    ratioLabel.content = ratioText; ratioLabel.fillColor = labelColor; ratioLabel.fontSize = 10;
    ratioLabel.fontWeight = 'bold'; ratioLabel.justification = 'center';

    const dimLabel = new paper.PointText(new paper.Point(cb.center.x, cb.bottom + 14));
    dimLabel.content = dimText; dimLabel.fillColor = hexToColor(style.color, style.opacity * 0.6);
    dimLabel.fontSize = 8; dimLabel.justification = 'center';
  });

  const fullRatio = findRatio(bounds.width, bounds.height);
  const fullLabel = new paper.PointText(new paper.Point(bounds.right + 8, bounds.top + 12));
  fullLabel.content = `Full: ${fullRatio}`; fullLabel.fillColor = hexToColor(style.color, style.opacity * 0.5); fullLabel.fontSize = 8;
}

export function renderHarmonicDivisions(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.6);

  const divisions = [
    { n: 2, label: '1/2' }, { n: 3, label: '1/3' }, { n: 4, label: '1/4' },
    { n: 5, label: '1/5' }, { n: 6, label: '1/6' },
  ];

  divisions.forEach((div, di) => {
    const opacity = 1 - di * 0.15;
    const c = hexToColor(style.color, style.opacity * opacity);

    for (let i = 1; i < div.n; i++) {
      const x = bounds.left + (bounds.width * i) / div.n;
      const vLine = new paper.Path.Line(new paper.Point(x, bounds.top - 5 - di * 3), new paper.Point(x, bounds.bottom + 5 + di * 3));
      showIfIntersects(vLine, context, () => {
        vLine.strokeColor = c; vLine.strokeWidth = style.strokeWidth * (1 - di * 0.12); vLine.dashArray = [3 + di, 3 + di];
      });

      const y = bounds.top + (bounds.height * i) / div.n;
      const hLine = new paper.Path.Line(new paper.Point(bounds.left - 5 - di * 3, y), new paper.Point(bounds.right + 5 + di * 3, y));
      showIfIntersects(hLine, context, () => {
        hLine.strokeColor = c; hLine.strokeWidth = style.strokeWidth * (1 - di * 0.12); hLine.dashArray = [3 + di, 3 + di];
      });
    }

    const labelY = bounds.top + bounds.height / div.n;
    const label = new paper.PointText(new paper.Point(bounds.right + 20 + di * 12, labelY + 3));
    label.content = div.label; label.fillColor = labelColor; label.fontSize = 7;
  });
}

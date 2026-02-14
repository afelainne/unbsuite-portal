import paper from 'paper';
import { hexToColor, showIfIntersects, PHI, type StyleConfig, type RenderContext } from './utils';

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
  // Each step cuts a square (side = min(w,h)) from that edge
  // and draws a quarter-circle arc inside it.
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
    const line = new paper.Path.Line(new paper.Point(x, bounds.top - 20), new paper.Point(x, bounds.bottom + 20));
    showIfIntersects(line, context, () => {
      line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [6, 4];
      shownVLines.push(x);
    });

    const y = bounds.top + (bounds.height * i) / 3;
    const hLine = new paper.Path.Line(new paper.Point(bounds.left - 20, y), new paper.Point(bounds.right + 20, y));
    showIfIntersects(hLine, context, () => {
      hLine.strokeColor = color; hLine.strokeWidth = style.strokeWidth; hLine.dashArray = [6, 4];
      shownHLines.push(y);
    });
  }

  for (const x of (shownVLines.length ? shownVLines : [bounds.left + bounds.width / 3, bounds.left + (bounds.width * 2) / 3])) {
    for (const y of (shownHLines.length ? shownHLines : [bounds.top + bounds.height / 3, bounds.top + (bounds.height * 2) / 3])) {
      if (context?.useRealData && (!shownVLines.length || !shownHLines.length)) continue;
      const dot = new paper.Path.Circle(new paper.Point(x, y), style.strokeWidth * 2 + 1);
      dot.fillColor = dotColor; dot.strokeColor = null;
    }
  }
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
    const line = new paper.Path.Line(new paper.Point(bounds.left - 60, y), new paper.Point(bounds.right + 30, y));
    showIfIntersects(line, context, () => {
      line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [6, 3];
      const label = new paper.PointText(new paper.Point(bounds.left - 65, y + 3));
      label.content = g.name; label.fillColor = labelColor; label.fontSize = 8; label.justification = 'right';
    });
  });
}

export function renderRuleOfOdds(
  bounds: paper.Rectangle,
  style: StyleConfig,
  context?: RenderContext
) {
  const color = hexToColor(style.color, style.opacity);
  const labelColor = hexToColor(style.color, style.opacity * 0.6);

  for (let i = 1; i < 5; i++) {
    const x = bounds.left + (bounds.width * i) / 5;
    const line = new paper.Path.Line(new paper.Point(x, bounds.top - 15), new paper.Point(x, bounds.bottom + 15));
    showIfIntersects(line, context, () => { line.strokeColor = color; line.strokeWidth = style.strokeWidth; line.dashArray = [6, 3]; });

    const y = bounds.top + (bounds.height * i) / 5;
    const hLine = new paper.Path.Line(new paper.Point(bounds.left - 15, y), new paper.Point(bounds.right + 15, y));
    showIfIntersects(hLine, context, () => { hLine.strokeColor = color; hLine.strokeWidth = style.strokeWidth; hLine.dashArray = [6, 3]; });
  }

  const dimColor = hexToColor(style.color, style.opacity * 0.4);
  for (let i = 1; i < 7; i++) {
    const x = bounds.left + (bounds.width * i) / 7;
    const line = new paper.Path.Line(new paper.Point(x, bounds.top - 8), new paper.Point(x, bounds.bottom + 8));
    showIfIntersects(line, context, () => { line.strokeColor = dimColor; line.strokeWidth = style.strokeWidth * 0.5; line.dashArray = [2, 4]; });

    const y = bounds.top + (bounds.height * i) / 7;
    const hLine = new paper.Path.Line(new paper.Point(bounds.left - 8, y), new paper.Point(bounds.right + 8, y));
    showIfIntersects(hLine, context, () => { hLine.strokeColor = dimColor; hLine.strokeWidth = style.strokeWidth * 0.5; hLine.dashArray = [2, 4]; });
  }

  const l5 = new paper.PointText(new paper.Point(bounds.right + 18, bounds.top + bounds.height / 5 + 3));
  l5.content = '1/5'; l5.fillColor = labelColor; l5.fontSize = 7;
  const l7 = new paper.PointText(new paper.Point(bounds.right + 18, bounds.top + bounds.height / 7 + 3));
  l7.content = '1/7'; l7.fillColor = hexToColor(style.color, style.opacity * 0.35); l7.fontSize = 7;
}

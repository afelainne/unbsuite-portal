import { GlyphModelState, AnchorPoint, HandlePosition } from '../core/glyphModel';
import { OverlaySnapshot, StemOverlay, ZoneRenderInfo } from '../core/overlays';
import { ViewTransform, fontToCanvas, canvasToFont } from './coordinates';

export interface SelectionState {
  pointId: string | null;
  handle: 'handleIn' | 'handleOut' | null;
}

export interface HoverState {
  type: 'point' | 'handle' | 'stem';
  referenceId: string;
  handle?: 'handleIn' | 'handleOut';
}

export interface RenderPayload {
  glyph: GlyphModelState;
  overlays: OverlaySnapshot;
  selection: SelectionState;
  hover: HoverState | null;
  view: ViewTransform;
  cursorWorld: { x: number; y: number } | null;
}

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const backgroundGradient = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f8f6f1');
  gradient.addColorStop(1, '#f0f4f6');
  return gradient;
};

const projectPoint = (point: HandlePosition | AnchorPoint, view: ViewTransform) =>
  fontToCanvas(point.x, point.y, view);

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private size: { width: number; height: number } = { width: 0, height: 0 };
  private dpr = window.devicePixelRatio || 1;
  private lastPayload: RenderPayload | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D API indisponível.');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.size = { width: rect.width, height: rect.height };
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    if (this.lastPayload) {
      this.render(this.lastPayload);
    }
  }

  render(payload: RenderPayload): void {
    this.lastPayload = deepClone(payload);
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    ctx.fillStyle = backgroundGradient(ctx, this.size.width, this.size.height);
    ctx.fillRect(0, 0, this.size.width, this.size.height);

    if (payload.overlays.options.showGrid) {
      this.drawGrid(payload.view);
    }

    const snapHighlight = payload.overlays.snapHighlight;
    const highlightedZone = snapHighlight?.type === 'zone' ? snapHighlight.zoneId : null;
    const highlightedStem = snapHighlight?.type === 'stem' ? snapHighlight.stemId : null;

    if (payload.overlays.options.showZones) {
      this.drawAlignmentZones(payload.overlays.zones, payload.view, highlightedZone);
    }

    if (payload.overlays.options.showStems) {
      this.drawStemOverlays(payload.overlays.stems, payload.view, highlightedStem);
    }

    this.renderGlyph(payload.glyph, payload.view);
    this.drawPoints(payload.glyph, payload.view, payload.selection, payload.hover);
    this.drawCursor(payload.cursorWorld, payload.view);
  }

  private drawGrid(view: ViewTransform) {
    const ctx = this.ctx;
    const gridStep = this.pickGridStep(view.zoom);
    const bounds = this.getWorldBounds(view);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(10,17,40,0.08)';

    const startX = Math.floor(bounds.minX / gridStep) * gridStep;
    const endX = Math.ceil(bounds.maxX / gridStep) * gridStep;
    for (let x = startX; x <= endX; x += gridStep) {
      const { x: screenX } = fontToCanvas(x, 0, view);
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, this.size.height);
      ctx.stroke();
    }

    const startY = Math.floor(bounds.minY / gridStep) * gridStep;
    const endY = Math.ceil(bounds.maxY / gridStep) * gridStep;
    for (let y = startY; y <= endY; y += gridStep) {
      const { y: screenY } = fontToCanvas(0, y, view);
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(this.size.width, screenY);
      ctx.stroke();
    }

    ctx.restore();
  }

  private pickGridStep(zoom: number): number {
    if (zoom > 1.5) return 25;
    if (zoom > 0.8) return 50;
    return 100;
  }

  /** drawAlignmentZones – converte AlignmentZone em faixas e linhas auxiliares no canvas. */
  private drawAlignmentZones(zones: ZoneRenderInfo[], view: ViewTransform, highlightedZoneId: string | null) {
    const ctx = this.ctx;
    ctx.save();
    for (const zone of zones) {
      const topWorld = zone.position + zone.size / 2;
      const bottomWorld = zone.position - zone.size / 2;
      const { y: top } = fontToCanvas(0, topWorld, view);
      const { y: bottom } = fontToCanvas(0, bottomWorld, view);
      const height = bottom - top;
      const isHighlighted = highlightedZoneId === zone.id;
      ctx.globalAlpha = isHighlighted ? 0.35 : 0.14;
      ctx.fillStyle = zone.color;
      ctx.fillRect(0, Math.min(top, bottom), this.size.width, Math.abs(height));

      ctx.globalAlpha = 1;
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = isHighlighted ? 2 : 1.3;
      ctx.setLineDash(isHighlighted ? [6, 4] : []);
      const { y } = fontToCanvas(0, zone.position, view);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.size.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /** drawStemOverlays – renderiza hastes detectadas para dar feedback visual do snapping. */
  private drawStemOverlays(stems: StemOverlay[], view: ViewTransform, highlightedStemId: string | null) {
    const ctx = this.ctx;
    ctx.save();
    for (const stem of stems) {
      const isHighlighted = highlightedStemId === stem.id;
      ctx.globalAlpha = isHighlighted ? 0.35 : 0.18;
      const topLeft = fontToCanvas(stem.bounds.x1, stem.bounds.y2, view);
      const bottomRight = fontToCanvas(stem.bounds.x2, stem.bounds.y1, view);
      const width = bottomRight.x - topLeft.x;
      const height = bottomRight.y - topLeft.y;
      ctx.fillStyle = stem.color;
      ctx.fillRect(Math.min(topLeft.x, bottomRight.x), Math.min(topLeft.y, bottomRight.y), Math.abs(width), Math.abs(height));

      ctx.globalAlpha = 1;
      ctx.strokeStyle = stem.color;
      ctx.setLineDash(isHighlighted ? [10, 4] : [4, 4]);
      ctx.lineWidth = isHighlighted ? 2 : 1.2;
      ctx.strokeRect(
        Math.min(topLeft.x, bottomRight.x),
        Math.min(topLeft.y, bottomRight.y),
        Math.abs(width),
        Math.abs(height)
      );
      ctx.setLineDash([]);

      const labelX = Math.min(topLeft.x, bottomRight.x) + Math.abs(width) + 6;
      const labelY = Math.min(topLeft.y, bottomRight.y) + 14;
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.fillStyle = stem.color;
      ctx.fillText(`${stem.targetStem}u`, labelX, labelY);
    }
    ctx.restore();
  }

  /**
   * renderGlyph – desenha cada contorno do glifo respeitando handles Bézier.
   */
  private renderGlyph(glyph: GlyphModelState, view: ViewTransform) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const path of glyph.paths) {
      if (!path.points.length) continue;
      ctx.beginPath();
      const firstPoint = path.points[0];
      const move = projectPoint(firstPoint, view);
      ctx.moveTo(move.x, move.y);

      for (let i = 1; i < path.points.length; i += 1) {
        const prev = path.points[i - 1];
        const current = path.points[i];
        this.renderSegment(prev, current, view);
      }

      if (path.closed && path.points.length > 1) {
        const last = path.points[path.points.length - 1];
        this.renderSegment(last, firstPoint, view);
        ctx.closePath();
      }

      ctx.fillStyle = 'rgba(20,20,20,0.08)';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderSegment(from: AnchorPoint, to: AnchorPoint, view: ViewTransform) {
    const ctx = this.ctx;
    const start = projectPoint(from, view);
    const end = projectPoint(to, view);
    const cp1 = from.handleOut ? projectPoint(from.handleOut, view) : start;
    const cp2 = to.handleIn ? projectPoint(to.handleIn, view) : end;
    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
  }

  private drawPoints(
    glyph: GlyphModelState,
    view: ViewTransform,
    selection: SelectionState,
    hover: HoverState | null
  ) {
    const ctx = this.ctx;
    ctx.save();
    for (const path of glyph.paths) {
      for (const point of path.points) {
        const pointSelected = selection.pointId === point.id;
        const pointHovered = hover?.type === 'point' && hover.referenceId === point.id;
        this.drawHandles(point, view, selection, hover);
        const { x, y } = projectPoint(point, view);
        ctx.fillStyle = pointSelected ? '#111' : pointHovered ? '#0081A7' : '#0A1128';
        ctx.strokeStyle = '#fdfdfd';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, pointSelected ? 6 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawHandles(
    point: AnchorPoint,
    view: ViewTransform,
    selection: SelectionState,
    hover: HoverState | null
  ) {
    const ctx = this.ctx;
    const anchor = projectPoint(point, view);
    const drawHandle = (handle: HandlePosition | null, key: 'handleIn' | 'handleOut') => {
      if (!handle) return;
      const handlePos = projectPoint(handle, view);
      ctx.strokeStyle = '#F07167';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(handlePos.x, handlePos.y);
      ctx.stroke();

      const isSelected = selection.pointId === point.id && selection.handle === key;
      const isHover = hover?.type === 'handle' && hover.referenceId === point.id && hover.handle === key;
      ctx.fillStyle = isSelected ? '#F07167' : isHover ? '#FFB5A7' : '#fff5ef';
      ctx.strokeStyle = '#F07167';
      ctx.beginPath();
      ctx.arc(handlePos.x, handlePos.y, isSelected ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawHandle(point.handleIn, 'handleIn');
    drawHandle(point.handleOut, 'handleOut');
  }

  private drawCursor(cursorWorld: { x: number; y: number } | null, view: ViewTransform) {
    if (!cursorWorld) return;
    const ctx = this.ctx;
    const { x, y } = fontToCanvas(cursorWorld.x, cursorWorld.y, view);
    ctx.save();
    ctx.strokeStyle = 'rgba(10,17,40,0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.size.height);
    ctx.moveTo(0, y);
    ctx.lineTo(this.size.width, y);
    ctx.stroke();
    ctx.restore();
  }

  private getWorldBounds(view: ViewTransform) {
    const topLeft = canvasToFont(0, 0, view);
    const bottomRight = canvasToFont(this.size.width, this.size.height, view);
    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y)
    };
  }
}

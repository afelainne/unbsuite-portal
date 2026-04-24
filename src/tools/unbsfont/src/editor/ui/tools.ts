import { GlyphModel, AnchorPoint, HandlePosition } from '../core/glyphModel';
import { AlignmentZone } from '../core/fontState';
import { SnapHighlight, StemOverlay } from '../core/overlays';
import { SelectionState, HoverState } from './canvasRenderer';
import { ViewTransform, canvasToFont, fontToCanvas } from './coordinates';

export type ToolMode = 'select' | 'pen' | 'pan';

interface Pointer {
  x: number;
  y: number;
}

interface DragPointState {
  type: 'point';
  pointId: string;
  lastWorld: { x: number; y: number };
}

interface DragHandleState {
  type: 'handle';
  pointId: string;
  handle: 'handleIn' | 'handleOut';
}

interface DragPanState {
  type: 'pan';
  origin: { x: number; y: number };
  offsetStart: { x: number; y: number };
}

export type DragState = DragPointState | DragHandleState | DragPanState | null;

interface ToolCallbacks {
  onStateChange: () => void;
  onCursorMove?: (world: { x: number; y: number } | null) => void;
  onSelectionChange?: (selection: SelectionState) => void;
}

interface SnappingDependencies {
  getZones: () => AlignmentZone[];
  getStems: () => StemOverlay[];
  reportSnap: (highlight: SnapHighlight | null) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class ToolController {
  private mode: ToolMode = 'select';
  private selection: SelectionState = { pointId: null, handle: null };
  private hover: HoverState | null = null;
  private drag: DragState = null;
  private spacePressed = false;
  private cursorWorld: { x: number; y: number } | null = null;
  private view: ViewTransform;
  private snapping: SnappingDependencies;
  private currentSnap: SnapHighlight | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private model: GlyphModel,
    private callbacks: ToolCallbacks,
    snapping?: Partial<SnappingDependencies>
  ) {
    const rect = this.canvas.getBoundingClientRect();
    this.view = {
      zoom: 0.6,
      offsetX: rect.width / 2,
      offsetY: rect.height * 0.7
    };
    this.snapping = {
      getZones: snapping?.getZones ?? (() => []),
      getStems: snapping?.getStems ?? (() => []),
      reportSnap: snapping?.reportSnap ?? (() => undefined)
    };
    this.attachEvents();
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.handleMouseDown);
    this.canvas.removeEventListener('pointermove', this.handleMouseMove);
    this.canvas.removeEventListener('pointerup', this.handleMouseUp);
    this.canvas.removeEventListener('pointerleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel as EventListener);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  setMode(mode: ToolMode) {
    this.mode = mode;
  }

  getMode(): ToolMode {
    return this.mode;
  }

  getSelection(): SelectionState {
    return { ...this.selection };
  }

  getHover(): HoverState | null {
    return this.hover ? { ...this.hover } : null;
  }

  getView(): ViewTransform {
    return { ...this.view };
  }

  getCursorWorld(): { x: number; y: number } | null {
    return this.cursorWorld ? { ...this.cursorWorld } : null;
  }

  clearSelection() {
    this.selection = { pointId: null, handle: null };
    this.callbacks.onSelectionChange?.(this.getSelection());
  }

  resetView() {
    const rect = this.canvas.getBoundingClientRect();
    this.view.offsetX = rect.width / 2;
    this.view.offsetY = rect.height * 0.7;
    this.view.zoom = 0.6;
    this.callbacks.onStateChange();
  }

  updateCanvasMetrics() {
    const rect = this.canvas.getBoundingClientRect();
    this.view.offsetX = rect.width / 2;
    this.view.offsetY = rect.height * 0.7;
  }

  setSelection(pointId: string | null) {
    this.selection = { pointId, handle: null };
    this.callbacks.onSelectionChange?.(this.getSelection());
    this.callbacks.onStateChange();
  }

  private attachEvents() {
    this.canvas.addEventListener('pointerdown', this.handleMouseDown);
    this.canvas.addEventListener('pointermove', this.handleMouseMove);
    this.canvas.addEventListener('pointerup', this.handleMouseUp);
    this.canvas.addEventListener('pointerleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * handleMouseDown – inicia seleções, snaps e drag de pontos/handles.
   */
  private handleMouseDown = (event: PointerEvent) => {
    if (!this.canvas.contains(event.target as Node)) return;
    this.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    const pointer = this.getPointer(event);
    const world = canvasToFont(pointer.x, pointer.y, this.view);
    const hit = this.hitTest(pointer);

    const shouldPan = this.mode === 'pan' || event.button === 1 || this.spacePressed;
    if (shouldPan && event.button !== 2) {
      this.drag = {
        type: 'pan',
        origin: pointer,
        offsetStart: { x: this.view.offsetX, y: this.view.offsetY }
      };
      return;
    }

    if (hit) {
      if (hit.type === 'handle') {
        this.selection = { pointId: hit.referenceId, handle: hit.handle ?? null };
        this.drag = {
          type: 'handle',
          pointId: hit.referenceId,
          handle: hit.handle ?? 'handleOut'
        };
      } else if (hit.type === 'point') {
        this.selection = { pointId: hit.referenceId, handle: null };
        this.drag = { type: 'point', pointId: hit.referenceId, lastWorld: world };
      }
      this.callbacks.onSelectionChange?.(this.getSelection());
      this.callbacks.onStateChange();
      return;
    }

    if ((this.mode === 'pen' || event.shiftKey) && event.button === 0) {
      const added = this.model.addAnchor({ x: world.x, y: world.y, smooth: false });
      this.selection = { pointId: added.id, handle: null };
      this.drag = { type: 'point', pointId: added.id, lastWorld: world };
      this.callbacks.onSelectionChange?.(this.getSelection());
      this.callbacks.onStateChange();
      return;
    }

    if (event.button === 0) {
      // fallback to pan if nothing hit
      this.drag = {
        type: 'pan',
        origin: pointer,
        offsetStart: { x: this.view.offsetX, y: this.view.offsetY }
      };
    }
  };

  /**
   * handleMouseMove – atualiza drag, aplica snapping e emite hover feedback.
   */
  private handleMouseMove = (event: PointerEvent) => {
    const pointer = this.getPointer(event);
    const world = canvasToFont(pointer.x, pointer.y, this.view);
    this.cursorWorld = world;
    this.callbacks.onCursorMove?.(world);

    if (this.drag) {
      if (this.drag.type === 'pan') {
        const dx = pointer.x - this.drag.origin.x;
        const dy = pointer.y - this.drag.origin.y;
        this.view.offsetX = this.drag.offsetStart.x + dx;
        this.view.offsetY = this.drag.offsetStart.y + dy;
        this.callbacks.onStateChange();
        return;
      }

      if (this.drag.type === 'point') {
        const snapped = this.applySnapping(world, 'point');
        const delta = {
          x: snapped.x - this.drag.lastWorld.x,
          y: snapped.y - this.drag.lastWorld.y
        };
        if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
          this.model.translateAnchor(this.drag.pointId, delta);
          this.drag.lastWorld = snapped;
        }
        return;
      }

      if (this.drag.type === 'handle') {
        const snapped = this.applySnapping(world, 'handle');
        this.model.updateHandle(this.drag.pointId, this.drag.handle, snapped);
        return;
      }
    }

    this.hover = this.hitTest(pointer);
    this.callbacks.onStateChange();
  };

  /**
   * handleMouseUp – encerra drags e reseta estados de snap.
   */
  private handleMouseUp = (event: PointerEvent) => {
    if ((event.target as HTMLElement)?.tagName === 'CANVAS') {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.drag = null;
    this.hover = null;
    this.cursorWorld = null;
    this.updateSnapHighlight(null);
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const pointer = this.getPointer(event);
    if (event.ctrlKey || event.metaKey) {
      const scaleFactor = Math.exp(-event.deltaY / 400);
      this.zoomAt(pointer, scaleFactor);
    } else {
      this.view.offsetX -= event.deltaX;
      this.view.offsetY -= event.deltaY;
      this.callbacks.onStateChange();
    }
  };

  private zoomAt(pointer: Pointer, scaleFactor: number) {
    const before = canvasToFont(pointer.x, pointer.y, this.view);
    const newZoom = clamp(this.view.zoom * scaleFactor, 0.25, 3);
    this.view.zoom = newZoom;
    this.view.offsetX = pointer.x - before.x * this.view.zoom;
    this.view.offsetY = pointer.y + before.y * this.view.zoom;
    this.callbacks.onStateChange();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      this.spacePressed = true;
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      this.spacePressed = false;
    }
  };

  private getPointer(event: PointerEvent | WheelEvent): Pointer {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private hitTest(pointer: Pointer): HoverState | null {
    const state = this.model.getState();
    let closest: HoverState | null = null;
    let minDistance = Infinity;

    for (const path of state.paths) {
      for (const point of path.points) {
        const anchor = fontToCanvas(point.x, point.y, this.view);
        const distance = Math.hypot(anchor.x - pointer.x, anchor.y - pointer.y);
        if (distance < 10 && distance < minDistance) {
          closest = { type: 'point', referenceId: point.id };
          minDistance = distance;
        }

        if (point.handleIn) {
          const handleScreen = fontToCanvas(point.handleIn.x, point.handleIn.y, this.view);
          const handleDistance = Math.hypot(handleScreen.x - pointer.x, handleScreen.y - pointer.y);
          if (handleDistance < 10 && handleDistance < minDistance) {
            closest = { type: 'handle', referenceId: point.id, handle: 'handleIn' };
            minDistance = handleDistance;
          }
        }

        if (point.handleOut) {
          const handleScreen = fontToCanvas(point.handleOut.x, point.handleOut.y, this.view);
          const handleDistance = Math.hypot(handleScreen.x - pointer.x, handleScreen.y - pointer.y);
          if (handleDistance < 10 && handleDistance < minDistance) {
            closest = { type: 'handle', referenceId: point.id, handle: 'handleOut' };
            minDistance = handleDistance;
          }
        }
      }
    }

    return closest;
  }

  /**
   * applySnapping – usa alignment zones e hastes detectadas para alinhar pontos/handles.
   */
  private applySnapping(world: { x: number; y: number }, context: 'point' | 'handle'): { x: number; y: number } {
    let snapped = { ...world };
    let highlight: SnapHighlight | null = null;
    const zones = this.snapping.getZones();
    const stems = context === 'point' ? this.snapping.getStems() : [];
    const zoneTolerance = 6;

    for (const zone of zones) {
      const distance = Math.abs(snapped.y - zone.position);
      const allowed = Math.max(zone.size / 2, zoneTolerance);
      if (distance <= allowed) {
        snapped = { ...snapped, y: zone.position };
        highlight = { type: 'zone', zoneId: zone.id };
        break;
      }
    }

    if (!highlight && stems.length) {
      const edgeTolerance = 6;
      for (const stem of stems) {
        if (stem.orientation === 'vertical') {
          const insideY = snapped.y >= stem.bounds.y1 - 4 && snapped.y <= stem.bounds.y2 + 4;
          if (!insideY) continue;
          if (Math.abs(snapped.x - stem.bounds.x1) <= edgeTolerance) {
            snapped = { ...snapped, x: stem.bounds.x1 };
            highlight = { type: 'stem', stemId: stem.id };
            break;
          }
          if (Math.abs(snapped.x - stem.bounds.x2) <= edgeTolerance) {
            snapped = { ...snapped, x: stem.bounds.x2 };
            highlight = { type: 'stem', stemId: stem.id };
            break;
          }
        } else {
          const insideX = snapped.x >= stem.bounds.x1 - 4 && snapped.x <= stem.bounds.x2 + 4;
          if (!insideX) continue;
          if (Math.abs(snapped.y - stem.bounds.y1) <= edgeTolerance) {
            snapped = { ...snapped, y: stem.bounds.y1 };
            highlight = { type: 'stem', stemId: stem.id };
            break;
          }
          if (Math.abs(snapped.y - stem.bounds.y2) <= edgeTolerance) {
            snapped = { ...snapped, y: stem.bounds.y2 };
            highlight = { type: 'stem', stemId: stem.id };
            break;
          }
        }
      }
    }

    this.updateSnapHighlight(highlight);
    return snapped;
  }

  private updateSnapHighlight(next: SnapHighlight | null) {
    const sameZone =
      this.currentSnap?.type === 'zone' &&
      next?.type === 'zone' &&
      this.currentSnap.zoneId === next.zoneId;
    const sameStem =
      this.currentSnap?.type === 'stem' &&
      next?.type === 'stem' &&
      this.currentSnap.stemId === next.stemId;

    if ((sameZone || sameStem) || (!next && !this.currentSnap)) {
      return;
    }

    this.currentSnap = next ?? null;
    this.snapping.reportSnap(this.currentSnap);
  }
}

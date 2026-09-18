import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_VALUE,
  SNAP_KIND_LABEL,
  boxSnapCandidates,
  canvasToSvg,
  collectIntersections,
  constrainToAngleSteps,
  createMeasurementId,
  describeMeasurement,
  distance,
  hitTestMeasurements,
  snapPoint,
  svgToCanvas,
  type CanvasTransform,
  type Measurement,
  type MeasureBox,
  type MeasurePoint,
  type MeasureSegment,
  type PointIndex,
  type SnapCandidate,
  type SnapKind,
  type SnapResult,
} from '../lib/measure';

/**
 * The measuring overlay: a single 2D canvas stacked over the paper canvas.
 *
 * Design constraints it has to satisfy:
 * - the cota must follow the pointer 1:1, with the first segment appearing on
 *   POINTER DOWN, not on the first move. So the drag state lives in refs and
 *   the drawing happens inside one requestAnimationFrame — a drag never sets
 *   React state and never makes paper redraw the scene;
 * - pointer capture keeps the drag alive when the cursor leaves the canvas;
 * - Alt-drag and the middle button are left alone so they still pan the view
 *   (the event bubbles to the canvas container).
 */

export interface MeasureSnapSources {
  /** Real artwork nodes, canvas space, indexed for fast lookup. */
  nodes: PointIndex | null;
  /** Straight construction guides, canvas space. */
  segments: MeasureSegment[];
  /** Named single points (logo centre, optical centre), canvas space. */
  extras: SnapCandidate[];
  /** Logo bounding box, canvas space. */
  box: MeasureBox | null;
}

export const EMPTY_SNAP_SOURCES: MeasureSnapSources = { nodes: null, segments: [], extras: [], box: null };

export interface MeasureLayerProps {
  /** Tool on/off. When off the layer is inert and lets every event through. */
  active: boolean;
  width: number;
  height: number;
  transform: CanvasTransform | null;
  /** Logo bounds in SVG units, used for the "% of the longest side" readout. */
  logoBox: MeasureBox | null;
  sources?: MeasureSnapSources;
  measurements: readonly Measurement[];
  selectedId: string | null;
  onCreate(measurement: Measurement): void;
  onSelect(id: string | null): void;
  /** A click that hit no cota — the parent may hit-test the constructions. */
  onInspect?(canvasPoint: MeasurePoint): void;
  /** True when the canvas background is dark. */
  dark?: boolean;
  /** Snap radius in canvas pixels (default 12). */
  snapRadius?: number;
  /** Label for one SVG user unit (default "u"). */
  unitLabel?: string;
  /** Overrides the `prefers-reduced-motion` media query. */
  reducedMotion?: boolean;
}

/** `prefers-reduced-motion: reduce`, kept in sync with the media query. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(query.matches);
    handler();
    query.addEventListener?.('change', handler);
    return () => query.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

interface Palette {
  ink: string;
  halo: string;
  draft: string;
  pill: string;
  pillText: string;
  selectedPill: string;
  selectedPillText: string;
  snap: string;
}

const DARK: Palette = {
  ink: '#FFFFFF',
  halo: 'rgba(0, 0, 0, 0.6)',
  draft: 'rgba(255, 255, 255, 0.85)',
  pill: 'rgba(22, 22, 24, 0.92)',
  pillText: '#FFFFFF',
  selectedPill: '#FFFFFF',
  selectedPillText: '#161618',
  snap: '#FFFFFF',
};

const LIGHT: Palette = {
  ink: '#1C1C1E',
  halo: 'rgba(255, 255, 255, 0.8)',
  draft: 'rgba(28, 28, 30, 0.85)',
  pill: 'rgba(252, 252, 253, 0.94)',
  pillText: '#1C1C1E',
  selectedPill: '#1C1C1E',
  selectedPillText: '#FFFFFF',
  snap: '#1C1C1E',
};

const LABEL_FONT = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
const BADGE_FONT = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
/** Below this many pixels a drag counts as a click, not as a cota. */
const CLICK_SLOP = 4;
const HIT_TOLERANCE = 7;

function ratio(): number {
  return Math.min(typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1, 2);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  color: string,
  font = LABEL_FONT,
): void {
  ctx.font = font;
  const padX = 6;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 18;
  const left = x - w / 2;
  const top = y - h / 2;
  ctx.fillStyle = fill;
  roundedRect(ctx, left, top, w, h, 6);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + padX, top + h / 2 + 0.5);
}

/** A different mark per snap kind, so the type is readable without the text. */
function drawSnapMark(ctx: CanvasRenderingContext2D, point: MeasurePoint, kind: SnapKind, color: string): void {
  const x = point.x;
  const y = point.y;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  switch (kind) {
    case 'node':
      ctx.rect(x - 4, y - 4, 8, 8);
      ctx.stroke();
      break;
    case 'intersection':
      ctx.moveTo(x - 5, y - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.moveTo(x + 5, y - 5);
      ctx.lineTo(x - 5, y + 5);
      ctx.stroke();
      break;
    case 'center':
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'edge':
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.stroke();
      break;
    default:
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

const MeasureLayer: React.FC<MeasureLayerProps> = ({
  active,
  width,
  height,
  transform,
  logoBox,
  sources = EMPTY_SNAP_SOURCES,
  measurements,
  selectedId,
  onCreate,
  onSelect,
  onInspect,
  dark = true,
  snapRadius = 12,
  unitLabel = 'u',
  reducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const loopRef = useRef(0);
  const dashRef = useRef(0);

  const dragRef = useRef<{ active: boolean; pointerId: number; start: SnapResult; current: SnapResult; locked: boolean } | null>(null);
  const hoverRef = useRef<SnapResult | null>(null);

  const systemReduced = useReducedMotion();
  const reduced = reducedMotion ?? systemReduced;
  const palette = dark ? DARK : LIGHT;

  // Everything the rAF callback needs, without re-creating the callback.
  const stateRef = useRef({ measurements, selectedId, transform, logoBox, palette, unitLabel, width, height, reduced, active });
  stateRef.current = { measurements, selectedId, transform, logoBox, palette, unitLabel, width, height, reduced, active };

  const draw = useCallback(() => {
    frameRef.current = 0;
    const canvas = canvasRef.current;
    const s = stateRef.current;
    if (!canvas || s.width <= 0 || s.height <= 0) return;
    const r = ratio();
    const w = Math.max(1, Math.round(s.width * r));
    const h = Math.max(1, Math.round(s.height * r));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(r, 0, 0, r, 0, 0);
    ctx.clearRect(0, 0, s.width, s.height);
    if (!s.transform) return;
    const t = s.transform;

    const cota = (a: MeasurePoint, b: MeasurePoint, label: string, mode: 'idle' | 'selected' | 'draft') => {
      if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = len > 0.001 ? -dy / len : 0;
      const ny = len > 0.001 ? dx / len : 0;
      const tick = 6;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (mode === 'draft' && !s.reduced) {
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -dashRef.current;
      } else if (mode === 'draft') {
        ctx.setLineDash([5, 4]);
      }

      const path = () => {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.moveTo(a.x + nx * tick, a.y + ny * tick);
        ctx.lineTo(a.x - nx * tick, a.y - ny * tick);
        ctx.moveTo(b.x + nx * tick, b.y + ny * tick);
        ctx.lineTo(b.x - nx * tick, b.y - ny * tick);
      };

      // Halo first, so the cota stays readable over the artwork itself.
      ctx.strokeStyle = s.palette.halo;
      ctx.lineWidth = mode === 'selected' ? 4.5 : 3.5;
      path();
      ctx.stroke();

      ctx.strokeStyle = mode === 'draft' ? s.palette.draft : s.palette.ink;
      ctx.lineWidth = mode === 'selected' ? 2 : 1.25;
      path();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (label && label !== EMPTY_VALUE) {
        const mid = { x: (a.x + b.x) / 2 + nx * 14, y: (a.y + b.y) / 2 + ny * 14 };
        const selected = mode === 'selected';
        drawPill(
          ctx,
          label,
          mid.x,
          mid.y,
          selected ? s.palette.selectedPill : s.palette.pill,
          selected ? s.palette.selectedPillText : s.palette.pillText,
        );
      }
    };

    for (const m of s.measurements) {
      const a = svgToCanvas(m.a, t);
      const b = svgToCanvas(m.b, t);
      const readout = describeMeasurement(m.a, m.b, s.logoBox, s.unitLabel);
      cota(a, b, readout.primaryLabel, m.id === s.selectedId ? 'selected' : 'idle');
    }

    if (!s.active) return;

    const drag = dragRef.current;
    if (drag?.active) {
      const a = drag.start.point;
      const b = drag.current.point;
      const readout = describeMeasurement(canvasToSvg(a, t), canvasToSvg(b, t), s.logoBox, s.unitLabel);
      cota(a, b, readout.primaryLabel, 'draft');
      if (drag.start.snapped) drawSnapMark(ctx, a, drag.start.kind, s.palette.snap);
      if (drag.current.snapped) drawSnapMark(ctx, b, drag.current.kind, s.palette.snap);
      if (drag.locked) {
        drawPill(ctx, `Trava ${readout.angleLabel}`, b.x, b.y - 26, s.palette.pill, s.palette.pillText, BADGE_FONT);
      } else if (drag.current.snapped) {
        drawPill(ctx, drag.current.label, b.x + 34, b.y - 18, s.palette.pill, s.palette.pillText, BADGE_FONT);
      }
      return;
    }

    const hover = hoverRef.current;
    if (hover?.snapped) {
      drawSnapMark(ctx, hover.point, hover.kind, s.palette.snap);
      drawPill(ctx, hover.label, hover.point.x + 34, hover.point.y - 18, s.palette.pill, s.palette.pillText, BADGE_FONT);
    }
  }, []);

  const requestDraw = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // Marching ants on the draft cota, skipped under prefers-reduced-motion.
  const startLoop = useCallback(() => {
    if (loopRef.current || reduced) return;
    const tick = () => {
      dashRef.current = (dashRef.current + 0.6) % 18;
      draw();
      loopRef.current = dragRef.current?.active ? requestAnimationFrame(tick) : 0;
    };
    loopRef.current = requestAnimationFrame(tick);
  }, [draw, reduced]);

  const stopLoop = useCallback(() => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    loopRef.current = 0;
  }, []);

  useEffect(() => {
    requestDraw();
  }, [requestDraw, measurements, selectedId, transform, width, height, dark, active, logoBox, unitLabel]);

  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
  }, []);

  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  /** Candidates near `raw` (canvas space): nodes, intersections, centre, box. */
  const candidatesNear = useCallback((raw: MeasurePoint, radius: number): SnapCandidate[] => {
    const src = sourcesRef.current;
    const out: SnapCandidate[] = [];
    const nodes = src.nodes?.query(raw, radius) ?? [];
    for (const point of nodes) out.push({ point, kind: 'node' });
    if (src.segments.length > 1) {
      out.push(...collectIntersections(src.segments, { near: raw, radius, maxSegments: 60, maxResults: 40 }));
    }
    for (const extra of src.extras) out.push(extra);
    out.push(...boxSnapCandidates(src.box, raw));
    return out;
  }, []);

  const resolve = useCallback((raw: MeasurePoint): SnapResult => {
    const radius = snapRadius > 0 ? snapRadius : 12;
    return snapPoint(raw, candidatesNear(raw, radius), radius);
  }, [candidatesNear, snapRadius]);

  const toLocal = useCallback((e: React.PointerEvent<HTMLCanvasElement>): MeasurePoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    stopLoop();
    requestDraw();
  }, [requestDraw, stopLoop]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Leave panning (Alt-drag / middle button) to the container below.
    if (!active || e.button !== 0 || e.altKey) return;
    if (!stateRef.current.transform) return;
    e.preventDefault();
    const raw = toLocal(e);
    const snapped = resolve(raw);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    dragRef.current = { active: true, pointerId: e.pointerId, start: snapped, current: snapped, locked: false };
    hoverRef.current = null;
    // Feedback on pointer DOWN, before any movement.
    draw();
    startLoop();
  }, [active, draw, resolve, startLoop, toLocal]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    const raw = toLocal(e);
    const drag = dragRef.current;
    if (drag?.active) {
      if (e.shiftKey) {
        // The angle lock wins over snapping: the point stays exactly on the
        // 0 / 45 / 90 ray so the reading is unambiguous.
        const locked = constrainToAngleSteps(drag.start.point, raw, 45);
        drag.current = { point: locked, kind: 'free', label: SNAP_KIND_LABEL.free, snapped: false, distance: 0 };
        drag.locked = true;
      } else {
        drag.current = resolve(raw);
        drag.locked = false;
      }
      if (reduced) requestDraw();
      return;
    }
    const next = resolve(raw);
    const prev = hoverRef.current;
    if (!prev || prev.kind !== next.kind || Math.abs(prev.point.x - next.point.x) > 0.5 || Math.abs(prev.point.y - next.point.y) > 0.5) {
      hoverRef.current = next;
      requestDraw();
    }
  }, [active, reduced, requestDraw, resolve, toLocal]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const t = stateRef.current.transform;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!drag?.active || !t) {
      cancelDrag();
      return;
    }
    const a = drag.start;
    const b = drag.current;
    dragRef.current = null;
    stopLoop();

    if (distance(a.point, b.point) < CLICK_SLOP) {
      const hit = hitTestMeasurements(
        stateRef.current.measurements,
        a.point,
        HIT_TOLERANCE,
        p => svgToCanvas(p, t),
      );
      if (hit) onSelect(hit);
      else {
        onSelect(null);
        onInspect?.(a.point);
      }
      requestDraw();
      return;
    }

    onCreate({
      id: createMeasurementId(),
      a: canvasToSvg(a.point, t),
      b: canvasToSvg(b.point, t),
      aKind: a.kind,
      bKind: b.kind,
    });
    requestDraw();
  }, [cancelDrag, onCreate, onInspect, onSelect, requestDraw, stopLoop]);

  const handlePointerLeave = useCallback(() => {
    if (dragRef.current?.active) return;
    if (hoverRef.current) {
      hoverRef.current = null;
      requestDraw();
    }
  }, [requestDraw]);

  // Esc aborts the cota being drawn (the parent handles Esc when idle).
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current?.active) {
        e.preventDefault();
        e.stopPropagation();
        cancelDrag();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [active, cancelDrag]);

  // Dropping the tool clears the transient state.
  useEffect(() => {
    if (active) return;
    dragRef.current = null;
    hoverRef.current = null;
    stopLoop();
    requestDraw();
  }, [active, requestDraw, stopLoop]);

  const style = useMemo<React.CSSProperties>(() => ({
    touchAction: 'none',
    cursor: active ? 'crosshair' : 'default',
    pointerEvents: active ? 'auto' : 'none',
  }), [active]);

  if (!transform) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[6] h-full w-full"
      style={style}
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelDrag}
      onPointerLeave={handlePointerLeave}
    />
  );
};

export default MeasureLayer;

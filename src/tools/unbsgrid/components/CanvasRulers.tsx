import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  canvasToSvg,
  computeRulerTicks,
  svgToCanvas,
  type CanvasTransform,
  type MeasurePoint,
  type RulerTicks,
} from '../lib/measure';

/**
 * Horizontal + vertical rulers drawn over the canvas edges, graduated in SVG
 * user units and following zoom and pan, plus a guide line that tracks the
 * cursor.
 *
 * Two stacked canvases on purpose:
 * - the STATIC one (strips, ticks, labels) is redrawn only when the size or
 *   the transform changes;
 * - the CURSOR one is cleared and redrawn inside a requestAnimationFrame,
 *   and holds nothing but two lines and two little markers.
 * So following the pointer never repaints the tick labels, and never touches
 * React state — `setCursor` is imperative.
 */

export interface CanvasRulersHandle {
  /** Point in SVG units, or `null` to hide the guide. */
  setCursor(point: MeasurePoint | null): void;
}

export interface CanvasRulersProps {
  /** Size of the canvas area, in CSS pixels. */
  width: number;
  height: number;
  /** `null` disables the rulers (no artwork / degenerate scene). */
  transform: CanvasTransform | null;
  /** True when the canvas background is dark (drives the ruler palette). */
  dark?: boolean;
  /** Strip thickness in CSS pixels (default 20). */
  thickness?: number;
  /** Draw the full-canvas crosshair following the cursor (default true). */
  crosshair?: boolean;
}

interface RulerPalette {
  strip: string;
  corner: string;
  tick: string;
  tickMinor: string;
  text: string;
  guide: string;
  marker: string;
}

const DARK_PALETTE: RulerPalette = {
  strip: 'rgba(22, 22, 24, 0.86)',
  corner: 'rgba(32, 32, 35, 0.92)',
  tick: 'rgba(255, 255, 255, 0.55)',
  tickMinor: 'rgba(255, 255, 255, 0.24)',
  text: 'rgba(255, 255, 255, 0.72)',
  guide: 'rgba(255, 255, 255, 0.3)',
  marker: 'rgba(255, 255, 255, 0.92)',
};

const LIGHT_PALETTE: RulerPalette = {
  strip: 'rgba(252, 252, 253, 0.9)',
  corner: 'rgba(240, 240, 242, 0.95)',
  tick: 'rgba(28, 28, 30, 0.5)',
  tickMinor: 'rgba(28, 28, 30, 0.22)',
  text: 'rgba(28, 28, 30, 0.72)',
  guide: 'rgba(28, 28, 30, 0.28)',
  marker: 'rgba(28, 28, 30, 0.92)',
};

const TICK_FONT = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

function dpr(): number {
  return Math.min(typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1, 2);
}

/** Size the bitmap for the device pixel ratio and return a ready 2D context. */
function prepare(canvas: HTMLCanvasElement | null, width: number, height: number): CanvasRenderingContext2D | null {
  if (!canvas || width <= 0 || height <= 0) return null;
  const ratio = dpr();
  const w = Math.max(1, Math.round(width * ratio));
  const h = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return ctx;
}

const CanvasRulers = forwardRef<CanvasRulersHandle, CanvasRulersProps>(function CanvasRulers(
  { width, height, transform, dark = true, thickness = 20, crosshair = true },
  ref,
) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLCanvasElement>(null);
  const cursorPoint = useRef<MeasurePoint | null>(null);
  const frame = useRef(0);

  const palette = dark ? DARK_PALETTE : LIGHT_PALETTE;

  const ticks = useMemo<{ h: RulerTicks; v: RulerTicks } | null>(() => {
    if (!transform || width <= 0 || height <= 0) return null;
    const origin = canvasToSvg({ x: 0, y: 0 }, transform);
    return {
      h: computeRulerTicks({ originValue: origin.x, pixelsPerUnit: transform.scale, length: width }),
      v: computeRulerTicks({ originValue: origin.y, pixelsPerUnit: transform.scale, length: height }),
    };
  }, [transform, width, height]);

  // Static layer: strips, ticks and labels.
  useEffect(() => {
    const ctx = prepare(baseRef.current, width, height);
    if (!ctx) return;
    if (!ticks) return;

    ctx.fillStyle = palette.strip;
    ctx.fillRect(0, 0, width, thickness);
    ctx.fillRect(0, 0, thickness, height);
    ctx.fillStyle = palette.corner;
    ctx.fillRect(0, 0, thickness, thickness);

    ctx.font = TICK_FONT;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 1;

    // Horizontal ruler.
    ctx.save();
    ctx.beginPath();
    ctx.rect(thickness, 0, Math.max(0, width - thickness), thickness);
    ctx.clip();
    ctx.textAlign = 'left';
    for (const tick of ticks.h.ticks) {
      const x = Math.round(tick.position) + 0.5;
      ctx.strokeStyle = tick.major ? palette.tick : palette.tickMinor;
      ctx.beginPath();
      ctx.moveTo(x, tick.major ? thickness - 9 : thickness - 4);
      ctx.lineTo(x, thickness);
      ctx.stroke();
      if (tick.major && tick.label) {
        ctx.fillStyle = palette.text;
        ctx.fillText(tick.label, x + 3, 10);
      }
    }
    ctx.restore();

    // Vertical ruler: labels rotated so they read bottom-up, like a drawing board.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, thickness, thickness, Math.max(0, height - thickness));
    ctx.clip();
    for (const tick of ticks.v.ticks) {
      const y = Math.round(tick.position) + 0.5;
      ctx.strokeStyle = tick.major ? palette.tick : palette.tickMinor;
      ctx.beginPath();
      ctx.moveTo(tick.major ? thickness - 9 : thickness - 4, y);
      ctx.lineTo(thickness, y);
      ctx.stroke();
      if (tick.major && tick.label) {
        ctx.save();
        ctx.translate(10, y + 3);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = palette.text;
        ctx.textAlign = 'left';
        ctx.fillText(tick.label, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    ctx.strokeStyle = palette.tickMinor;
    ctx.beginPath();
    ctx.moveTo(0, thickness + 0.5);
    ctx.lineTo(width, thickness + 0.5);
    ctx.moveTo(thickness + 0.5, 0);
    ctx.lineTo(thickness + 0.5, height);
    ctx.stroke();
  }, [ticks, width, height, thickness, palette]);

  const drawCursor = useCallback(() => {
    frame.current = 0;
    const ctx = prepare(cursorRef.current, width, height);
    if (!ctx) return;
    const point = cursorPoint.current;
    if (!point || !transform) return;
    const c = svgToCanvas(point, transform);
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) return;
    const x = Math.round(c.x) + 0.5;
    const y = Math.round(c.y) + 0.5;

    if (crosshair) {
      ctx.strokeStyle = palette.guide;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, thickness);
      ctx.lineTo(x, height);
      ctx.moveTo(thickness, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = palette.marker;
    ctx.fillRect(x - 0.5, 0, 1.5, thickness);
    ctx.fillRect(0, y - 0.5, thickness, 1.5);
  }, [width, height, thickness, transform, palette, crosshair]);

  useImperativeHandle(ref, () => ({
    setCursor(point) {
      cursorPoint.current = point && Number.isFinite(point.x) && Number.isFinite(point.y)
        ? { x: point.x, y: point.y }
        : null;
      if (frame.current) return;
      frame.current = requestAnimationFrame(drawCursor);
    },
  }), [drawCursor]);

  // Size / transform changed: repaint the guide in its new place.
  useEffect(() => {
    drawCursor();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [drawCursor]);

  if (!transform) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={cursorRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
});

export default CanvasRulers;

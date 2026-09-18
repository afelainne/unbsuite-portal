import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage, fill } from '../i18n';

/**
 * Side-by-side viewer for two versions of the same logo.
 *
 * The two images are ALWAYS mounted: switching mode or flipping A/B only
 * changes opacity / clip, never the DOM, so "alternar" swaps instantly with no
 * flash of an empty frame. Both sources are expected to come from
 * `lib/compare.ts` (`toAlignedSVG` + `svgToDataUrl`), whose viewBox is exactly
 * the ink bounds: drawing both at the same height therefore aligns them by
 * centre and by height with no transform here.
 *
 * No paper.js, no canvas: two `<img>` and CSS.
 */

export type CompareViewMode = 'overlay' | 'toggle' | 'curtain' | 'side';

export interface CompareViewProps {
  /** Data URL (or any image src) of version A. */
  srcA: string;
  /** Data URL (or any image src) of version B. */
  srcB: string;
  labelA?: string;
  labelB?: string;
  mode: CompareViewMode;
  /** width / height of a frame that fits both versions at the same height. */
  frameAspect: number;
  /** Opacity of B over A in "sobrepor" mode (0…1). */
  overlayOpacity?: number;
  /** Space flips A/B while the pointer is over the view (default true). */
  enableSpaceShortcut?: boolean;
  /** Notifies which version is on top in "alternar" mode. */
  onActiveChange?: (side: 'a' | 'b') => void;
  className?: string;
}

/** True when the user asked the system for less movement. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const Badge: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => (
  <span className={`chip ${muted ? 'chip-outline text-muted-foreground' : 'bg-primary text-primary-foreground'} pointer-events-none select-none`}>
    {children}
  </span>
);

interface LayerProps {
  src: string;
  alt: string;
  opacity: number;
  clipPath?: string;
  transition?: string;
}

const Layer: React.FC<LayerProps> = ({ src, alt, opacity, clipPath, transition }) => (
  <div
    className="absolute inset-0 flex items-center justify-center p-3"
    style={{ opacity, clipPath, transition, willChange: 'opacity' }}
    aria-hidden={opacity === 0 ? true : undefined}
  >
    <img src={src} alt={alt} draggable={false} className="h-full w-auto max-w-none select-none" />
  </div>
);

const CompareView: React.FC<CompareViewProps> = ({
  srcA, srcB, labelA = 'A', labelB = 'B', mode, frameAspect,
  overlayOpacity = 0.5, enableSpaceShortcut = true, onActiveChange, className = '',
}) => {
  const reduced = usePrefersReducedMotion();
  const { t } = useLanguage();
  const c = t.compare;
  const [showB, setShowB] = useState(false);
  const [curtain, setCurtain] = useState(0.5);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hoverRef = useRef(false);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  const aspect = Math.max(0.6, Number.isFinite(frameAspect) && frameAspect > 0 ? frameAspect : 1);

  const flip = useCallback(() => setShowB(v => !v), []);

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!notifiedRef.current) { notifiedRef.current = true; return; }
    onActiveChange?.(showB ? 'b' : 'a');
  }, [showB, onActiveChange]);

  // Space flips A/B while the pointer is over the view. A focused toggle
  // button already gets Space natively, so button targets are ignored here.
  useEffect(() => {
    if (mode !== 'toggle' || !enableSpaceShortcut || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (e.repeat || !hoverRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(input|textarea|select|button)$/i.test(target.tagName))) return;
      e.preventDefault();
      flip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, enableSpaceShortcut, flip]);

  // Curtain follows the pointer 1:1, batched on animation frames.
  const applyCurtain = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!(rect.width > 0)) return;
    pendingRef.current = clamp01((clientX - rect.left) / rect.width);
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingRef.current !== null) setCurtain(pendingRef.current);
    });
  }, []);

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'curtain') return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    applyCurtain(e.clientX);
  }, [mode, applyCurtain]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'curtain' || !draggingRef.current) return;
    applyCurtain(e.clientX);
  }, [mode, applyCurtain]);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const onDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setCurtain(v => clamp01(v - step)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setCurtain(v => clamp01(v + step)); }
    else if (e.key === 'Home') { e.preventDefault(); setCurtain(0); }
    else if (e.key === 'End') { e.preventDefault(); setCurtain(1); }
  }, []);

  // Side by side: two frames of the same size, each drawing its version at
  // full height — still aligned by centre and height.
  if (mode === 'side') {
    return (
      <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
        {[{ src: srcA, label: labelA }, { src: srcB, label: labelB }].map((it, i) => (
          <div
            key={i}
            className="relative w-full overflow-hidden rounded-lg bg-fill shadow-hairline"
            style={{ aspectRatio: String(aspect) }}
          >
            <Layer src={it.src} alt={it.label} opacity={1} />
            <div className="absolute left-1 top-1"><Badge muted={i === 1}>{it.label}</Badge></div>
          </div>
        ))}
      </div>
    );
  }

  const fade = reduced || mode !== 'overlay' ? undefined : 'opacity 120ms cubic-bezier(0.32, 0.72, 0, 1)';
  const opacityA = mode === 'toggle' ? (showB ? 0 : 1) : 1;
  const opacityB = mode === 'toggle' ? (showB ? 1 : 0) : mode === 'overlay' ? clamp01(overlayOpacity) : 1;
  const clipA = mode === 'curtain' ? `inset(0 ${(1 - curtain) * 100}% 0 0)` : undefined;
  const clipB = mode === 'curtain' ? `inset(0 0 0 ${curtain * 100}%)` : undefined;

  return (
    <div className={className}>
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden rounded-lg bg-fill shadow-hairline ${mode === 'curtain' ? 'cursor-ew-resize touch-none' : ''}`}
        style={{ aspectRatio: String(aspect) }}
        onPointerEnter={() => { hoverRef.current = true; }}
        onPointerLeave={(e) => { hoverRef.current = false; endDrag(e); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Layer src={srcA} alt={labelA} opacity={opacityA} clipPath={clipA} transition={fade} />
        <Layer src={srcB} alt={labelB} opacity={opacityB} clipPath={clipB} transition={fade} />

        {mode === 'curtain' && (
          <div
            role="separator"
            aria-label={c.curtainAria}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(curtain * 100)}
            tabIndex={0}
            onKeyDown={onDividerKeyDown}
            className="absolute inset-y-0 z-10 -ml-3 w-6 cursor-ew-resize outline-none"
            style={{ left: `${curtain * 100}%` }}
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/40" />
            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-card shadow-floating flex items-center justify-center">
              <span className="text-caption leading-none text-muted-foreground" aria-hidden="true">↔</span>
            </div>
          </div>
        )}

        {mode === 'toggle' && (
          <button
            type="button"
            aria-label={fill(c.toggleAria, { a: labelA, b: labelB })}
            aria-pressed={showB}
            onClick={flip}
            className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:shadow-focus"
          />
        )}

        {/* Labels only where they disambiguate; in "sobrepor" they would just
            sit on top of the artwork. */}
        {mode === 'toggle' && (
          <div className="pointer-events-none absolute left-1 top-1"><Badge>{showB ? labelB : labelA}</Badge></div>
        )}
        {mode === 'curtain' && (
          <>
            <div className="pointer-events-none absolute left-1 top-1"><Badge>{labelA}</Badge></div>
            <div className="pointer-events-none absolute right-1 top-1"><Badge muted>{labelB}</Badge></div>
          </>
        )}
      </div>

      {mode === 'toggle' && (
        <p className="pt-1 text-caption text-muted-foreground">
          {c.toggleNote}
        </p>
      )}
      {mode === 'curtain' && (
        <p className="pt-1 text-caption text-muted-foreground">
          {fill(c.curtainNote, { a: labelA, b: labelB })}
        </p>
      )}
    </div>
  );
};

export default CompareView;

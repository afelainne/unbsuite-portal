import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import paper from 'paper';
import {
  ZoomIn, ZoomOut, Maximize, Crosshair, Move, FlipHorizontal2,
  Moon, Sun, Grid2x2, Keyboard, ChevronDown, PencilRuler, Ruler, Eraser, X, MousePointerClick,
} from 'lucide-react';
import { type ParsedSVG, type ClearspaceUnit, resetPaperProject } from '../lib/svg-engine';
import { renderScene, geometryLayerLabel, type SceneResult, type SceneSettings } from '../lib/render-pipeline';
import type { GeometryOptions, GeometryStyles, CanvasBackground } from '../types/geometry';
import {
  createPointIndex, formatDistance, formatAngle, formatNumber, makeTransform,
  type CanvasTransform, type Measurement, type MeasureBox, type MeasurePoint,
} from '../lib/measure';
import {
  applyInspectHighlight, collectSnapTargets, describeConstructionLayer,
  hitTestConstruction, layerIdToGeometryKey, type ConstructionSummary,
} from '../lib/measure-scene';
import MeasureLayer, { EMPTY_SNAP_SOURCES, useReducedMotion, type MeasureSnapSources } from './MeasureLayer';
import CanvasRulers, { type CanvasRulersHandle } from './CanvasRulers';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { PILL_GROUP } from './chrome-classes';
import { useLanguage, fill, type Translations } from '../i18n';

export type RenderError = SceneResult['errors'][number];

interface PreviewCanvasProps {
  parsedSVG: ParsedSVG | null;
  clearspaceValue: number;
  clearspaceUnit: ClearspaceUnit;
  showGrid: boolean;
  gridSubdivisions: number;
  geometryOptions: GeometryOptions;
  geometryStyles: GeometryStyles;
  canvasBackground: CanvasBackground;
  modularScaleRatio?: number;
  safeZoneMargin?: number;
  svgColorOverride?: string | null;
  useRealDataInterpretation?: boolean;
  svgOutlineMode?: boolean;
  svgOutlineWidth?: number;
  svgOutlineDash?: number[];
  svgOutlineLineCap?: string;
  maxFlowLines?: number;
  anchorPointSize?: number;
  bezierHandleSize?: number;
  bezierShowAnchors?: boolean;
  bezierShowHandles?: boolean;
  /** Multiplier for every guide weight (stroke, dash, label, dot). */
  guideScale?: number;
  onProjectReady?: (project: paper.Project) => void;
  /** Renderers that threw during the last draw (empty array when all succeeded). */
  onRenderErrors?: (errors: RenderError[]) => void;
  /** Visual center (ink center of mass) in SVG coordinates; draws a marker when set. */
  visualCenter?: { x: number; y: number } | null;
  /** Symbol inversion state + toggle, shown in the floating bar. */
  isInverted?: boolean;
  onInvertToggle?: () => void;
  onCanvasBackgroundChange?: (background: CanvasBackground) => void;
  /** Rendered in the middle of the canvas while no SVG is loaded. */
  emptyState?: React.ReactNode;

  /* ---- measuring tool (all optional: uncontrolled when omitted) ---- */
  /** Controlled state of the measuring tool. */
  measureActive?: boolean;
  onMeasureActiveChange?: (active: boolean) => void;
  /** Controlled state of the edge rulers (forced on while measuring). */
  showRulers?: boolean;
  onShowRulersChange?: (show: boolean) => void;
  /** Inspection tool: click a guide to read the construction behind it. */
  inspectActive?: boolean;
  onInspectActiveChange?: (active: boolean) => void;
  /** Construction selected by clicking a guide, reported to the sidebar. */
  onInspectConstruction?: (key: keyof GeometryOptions | null) => void;
  /** Sidebar label for a construction key (defaults to a humanised key). */
  constructionLabel?: (key: keyof GeometryOptions) => string;
  /** Label of one SVG user unit in the readouts (default "u"). */
  unitLabel?: string;
  /**
   * Shortcuts registered elsewhere in the page, merged into the single help
   * tooltip on this bar so there is only one place to look them up.
   */
  extraShortcuts?: ReadonlyArray<{ keys: string; action: string }>;
}

/** Shortcuts this canvas owns. The page appends its own through `extraShortcuts`. */
const canvasShortcuts = (c: Translations['canvas']): ReadonlyArray<{ keys: string; action: string }> => [
  { keys: 'F', action: c.shortcutFit },
  { keys: '0', action: c.shortcutZoom100 },
  { keys: '+ / −', action: c.shortcutZoomInOut },
  { keys: c.keyWheel, action: c.shortcutWheel },
  { keys: c.keyAltDrag, action: c.shortcutPan },
  { keys: 'M', action: c.shortcutMeasure },
  { keys: 'R', action: c.shortcutRulers },
  { keys: 'I', action: c.shortcutInspect },
  { keys: 'Shift', action: c.shortcutShift },
  { keys: 'Delete', action: c.shortcutDelete },
  { keys: 'Esc', action: c.shortcutEscape },
];

const CANVAS_PADDING = 60;
/** Stable default: a fresh `[]` on every render would invalidate `draw` each time. */
const NO_DASH: number[] = [];
const MARKER_FILL = '#3F3F46';
const MARKER_OUTLINE = '#FFFFFF';
/** Thickness of the edge rulers, in CSS px. */
const RULER_THICKNESS = 20;

/** Zoom is a multiplier over the fit scale, so these are generous on purpose. */
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 60;
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

const bgClasses: Record<CanvasBackground, string> = {
  dark: 'bg-canvas',
  light: 'bg-card',
  checkerboard: '',
};

/**
 * Barra do canvas, desenhada como a barra de comando do sistema: um bloco
 * preto arredondado flutuando sobre o desenho, glifos brancos, e a ferramenta
 * ligada em branco com glifo preto. As ferramentas que a barra comuta (medir,
 * réguas, inspecionar) ganham 40px com glifo de 18px; zoom e enquadramento
 * ficam em 36px (32 no celular) com glifo de 14px, senão a barra come a área
 * de desenho.
 *
 * As utilidades abaixo vencem as cores do `.ctl`, feitas para fundo claro.
 * Repouso e ligado nunca se misturam na mesma classe, para que o hover de um
 * não pinte o outro.
 */
const BAR_BTN = 'ctl ctl-icon h-8 w-8 md:h-9 md:w-9 rounded-sm shadow-none';
const TOOL_BTN = `${BAR_BTN} lg:h-10 lg:w-10 lg:[&>svg]:h-[var(--icon)] lg:[&>svg]:w-[var(--icon)]`;
/** Em repouso: sem fundo, glifo branco a 80%. */
const BAR_IDLE = 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white';
/**
 * Ligado: ficha branca, glifo preto. As variantes `aria-pressed:` existem
 * porque `.ctl[aria-pressed="true"]` (preto) tem mais especificidade que uma
 * utilidade simples.
 */
const BAR_ON =
  'bg-white text-black hover:bg-white/90 aria-pressed:bg-white aria-pressed:text-black aria-pressed:hover:bg-white/90';
const BAR_RULE = 'h-6 w-px mx-1 bg-white/15';
/** Canvas width (CSS px) from which the cursor readout fits inside the bar. */
const READOUT_IN_BAR_MIN = 940;
const SEG_BTN = 'segmented-item px-2';

interface BarButtonProps {
  icon: React.ReactNode;
  /** Screen-reader name. */
  label: string;
  /** Tooltip while the action is available. */
  hint: string;
  onClick?: () => void;
  /** White chip on the black bar: this is the current state. */
  active?: boolean;
  pressed?: boolean;
  /**
   * Why the action makes no sense right now. Setting it disables the button
   * (38% opacity, per the system) and replaces the tooltip with the reason,
   * so nothing on this bar can be clicked and silently do nothing.
   */
  disabledReason?: string | null;
  className?: string;
}

/**
 * Um botão da barra. O motivo de estar desabilitado fica no `span` de fora
 * de propósito: `.ctl:disabled` zera `pointer-events`, então um `title` no
 * próprio botão nunca chegaria ao ponteiro.
 */
const BarButton: React.FC<BarButtonProps> = ({
  icon, label, hint, onClick, active, pressed, disabledReason, className = BAR_BTN,
}) => {
  const off = !!disabledReason;
  return (
    <span className="inline-flex" title={off ? disabledReason : undefined}>
      <button
        type="button"
        className={`${className} ${active ? BAR_ON : BAR_IDLE}`}
        aria-label={label}
        aria-pressed={pressed}
        title={off ? undefined : hint}
        disabled={off}
        onClick={onClick}
      >
        {icon}
      </button>
    </span>
  );
};

const BACKGROUNDS: { value: CanvasBackground; key: keyof Translations['canvas']; icon: React.ReactNode }[] = [
  { value: 'dark', key: 'backgroundDark', icon: <Moon className="h-3.5 w-3.5" /> },
  { value: 'light', key: 'backgroundLight', icon: <Sun className="h-3.5 w-3.5" /> },
  { value: 'checkerboard', key: 'backgroundCheckerboard', icon: <Grid2x2 className="h-3.5 w-3.5" /> },
];

/** Graphite cross with a white outline (readable on any background). */
function drawVisualCenterMarker(center: paper.Point) {
  const arm = 9;
  const makeCross = (color: string, width: number) => {
    const h = new paper.Path.Line(center.add(new paper.Point(-arm, 0)), center.add(new paper.Point(arm, 0)));
    const v = new paper.Path.Line(center.add(new paper.Point(0, -arm)), center.add(new paper.Point(0, arm)));
    [h, v].forEach(l => { l.strokeColor = new paper.Color(color); l.strokeWidth = width; l.strokeCap = 'round'; });
  };
  makeCross(MARKER_OUTLINE, 4.5);
  makeCross(MARKER_FILL, 2);
  const dot = new paper.Path.Circle(center, 3);
  dot.fillColor = new paper.Color(MARKER_FILL);
  dot.strokeColor = new paper.Color(MARKER_OUTLINE);
  dot.strokeWidth = 1.25;
}

/** Same rect? (avoids a state write — and a re-render — on every redraw). */
function sameBox(a: MeasureBox | null, b: MeasureBox | null): boolean {
  if (!a || !b) return a === b;
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6
    && Math.abs(a.width - b.width) < 1e-6 && Math.abs(a.height - b.height) < 1e-6;
}

const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  parsedSVG, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions,
  geometryOptions, geometryStyles, canvasBackground, modularScaleRatio = 1.618,
  safeZoneMargin = 0.1, svgColorOverride, useRealDataInterpretation = true,
  svgOutlineMode = false, svgOutlineWidth = 1, svgOutlineDash = NO_DASH, svgOutlineLineCap = 'butt',
  maxFlowLines = 5, anchorPointSize = 3,
  bezierHandleSize = 3, bezierShowAnchors = true, bezierShowHandles = true,
  guideScale = 1,
  onProjectReady, onRenderErrors, visualCenter = null,
  isInverted = false, onInvertToggle, onCanvasBackgroundChange, emptyState,
  measureActive, onMeasureActiveChange, showRulers, onShowRulersChange,
  inspectActive, onInspectActiveChange,
  onInspectConstruction, constructionLabel, unitLabel = 'u', extraShortcuts,
}) => {
  const { t } = useLanguage();
  const c = t.canvas;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  /** Canvas px per SVG unit in the last draw (fit scale × zoom). */
  const [sceneScale, setSceneScale] = useState(1);
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const [zoomDraft, setZoomDraft] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });

  /* ---- measuring state ---- */
  const [measureInternal, setMeasureInternal] = useState(false);
  const [rulersInternal, setRulersInternal] = useState(false);
  const [inspectInternal, setInspectInternal] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);
  const [inspectLayerId, setInspectLayerId] = useState<string | null>(null);
  const [inspectSummary, setInspectSummary] = useState<ConstructionSummary | null>(null);
  /** Logo rect in canvas px, as drawn by the last renderScene call. */
  const [sceneBox, setSceneBox] = useState<MeasureBox | null>(null);
  const [snapSources, setSnapSources] = useState<MeasureSnapSources>(EMPTY_SNAP_SOURCES);
  /** Measured from the painted background, not from `canvasBackground`. */
  const [darkCanvas, setDarkCanvas] = useState(false);
  const snapSourcesRef = useRef(snapSources);
  snapSourcesRef.current = snapSources;

  const measureOn = (measureActive ?? measureInternal) && !!parsedSVG;
  const inspectOn = (inspectActive ?? inspectInternal) && !!parsedSVG;
  const rulersOn = ((showRulers ?? rulersInternal) || measureOn) && !!parsedSVG;
  /** Per-construction layers: needed both to measure and to inspect. */
  const layered = measureOn || inspectOn;
  const reducedMotion = useReducedMotion();

  const rulersRef = useRef<CanvasRulersHandle>(null);
  const readoutXRef = useRef<HTMLSpanElement>(null);
  const readoutYRef = useRef<HTMLSpanElement>(null);
  const projectRef = useRef<paper.Project | null>(null);
  const readoutFrame = useRef(0);
  const readoutValue = useRef<MeasurePoint | null>(null);

  // Callbacks live in refs so a new parent closure does not trigger a redraw.
  const onProjectReadyRef = useRef(onProjectReady);
  const onRenderErrorsRef = useRef(onRenderErrors);
  const onInspectConstructionRef = useRef(onInspectConstruction);
  onProjectReadyRef.current = onProjectReady;
  onRenderErrorsRef.current = onRenderErrors;
  onInspectConstructionRef.current = onInspectConstruction;

  const vcX = visualCenter?.x;
  const vcY = visualCenter?.y;

  const setMeasureOn = useCallback((value: boolean) => {
    setMeasureInternal(value);
    onMeasureActiveChange?.(value);
    if (!value) {
      setSelectedMeasureId(null);
      setInspectLayerId(null);
      setInspectSummary(null);
      onInspectConstructionRef.current?.(null);
    }
  }, [onMeasureActiveChange]);

  const setRulersOn = useCallback((value: boolean) => {
    setRulersInternal(value);
    onShowRulersChange?.(value);
  }, [onShowRulersChange]);

  const setInspectOn = useCallback((value: boolean) => {
    setInspectInternal(value);
    onInspectActiveChange?.(value);
    if (!value) {
      setInspectLayerId(null);
      setInspectSummary(null);
      onInspectConstructionRef.current?.(null);
    }
  }, [onInspectActiveChange]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !parsedSVG) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    // First setup on this canvas: size the bitmap before paper reads it.
    const currentView = paper.project?.view as paper.View | undefined;
    if (!currentView || currentView.element !== canvas) {
      canvas.width = width;
      canvas.height = height;
    }
    resetPaperProject(canvas, paper, { width, height });
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const settings: SceneSettings = {
      clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions,
      geometryOptions, geometryStyles, modularScaleRatio, safeZoneMargin,
      useRealDataInterpretation, maxFlowLines, anchorPointSize,
      bezierHandleSize, bezierShowAnchors, bezierShowHandles,
      svgColorOverride, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap,
      guideScale,
    };
    // Measuring and inspecting need to know WHICH construction a guide belongs
    // to, and renderScene only exposes that through one paper Layer each.
    const result = renderScene(
      parsedSVG,
      settings,
      { width, height, padding: CANVAS_PADDING, zoom, pan: panOffset },
      { layered, scope: paper },
    );

    if (result.scale > 0 && Number.isFinite(result.scale)) {
      setSceneScale(prev => (Math.abs(prev - result.scale) < 1e-9 ? prev : result.scale));
    }

    const box: MeasureBox | null = result.bounds
      ? { x: result.bounds.left, y: result.bounds.top, width: result.bounds.width, height: result.bounds.height }
      : null;
    setSceneBox(prev => (sameBox(prev, box) ? prev : box));

    if (result.bounds && vcX !== undefined && vcY !== undefined) {
      // With layers the active one may have just been pruned for being empty.
      if (layered) {
        const markerLayer = new paper.Layer();
        markerLayer.name = 'visual-center';
        markerLayer.activate();
      }
      const fb = parsedSVG.fullBounds;
      const kx = fb.width > 0 ? result.bounds.width / fb.width : result.scale;
      const ky = fb.height > 0 ? result.bounds.height / fb.height : result.scale;
      const p = new paper.Point(result.bounds.left + (vcX - fb.left) * kx, result.bounds.top + (vcY - fb.top) * ky);
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) drawVisualCenterMarker(p);
    }

    if (layered) {
      applyInspectHighlight(paper.project, inspectLayerId);
      const targets = collectSnapTargets(paper.project, result.logo, {
        box,
        visualCenter: result.bounds && vcX !== undefined && vcY !== undefined
          ? {
            x: result.bounds.left + (vcX - parsedSVG.fullBounds.left) * result.scale,
            y: result.bounds.top + (vcY - parsedSVG.fullBounds.top) * result.scale,
          }
          : null,
      });
      setSnapSources({
        nodes: createPointIndex(targets.nodes),
        segments: targets.segments,
        extras: targets.extras,
        box,
      });
      setInspectSummary(inspectLayerId && box
        ? describeConstructionLayer(
          paper.project, inspectLayerId, result.scale,
          { x: parsedSVG.fullBounds.left, y: parsedSVG.fullBounds.top },
          { x: box.x, y: box.y },
        )
        : null);
    } else if (snapSourcesRef.current !== EMPTY_SNAP_SOURCES) {
      setSnapSources(EMPTY_SNAP_SOURCES);
    }

    paper.view.update();
    projectRef.current = paper.project;
    onRenderErrorsRef.current?.(result.errors);
    if (result.logo) onProjectReadyRef.current?.(paper.project);
  }, [parsedSVG, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions, geometryOptions, geometryStyles, zoom, panOffset, modularScaleRatio, safeZoneMargin, svgColorOverride, useRealDataInterpretation, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap, maxFlowLines, anchorPointSize, bezierHandleSize, bezierShowAnchors, bezierShowHandles, guideScale, vcX, vcY, layered, inspectLayerId]);

  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  // One observer for the component's lifetime; coalesce bursts into one frame.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    const sync = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    sync();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { sync(); drawRef.current(); });
    });
    ro.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  // Free the paper project/view bound to this canvas on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    return () => {
      const project = paper.project as paper.Project | null;
      if (project && project.view?.element === canvas) project.remove();
    };
  }, []);

  // Non-passive wheel listener: React's onWheel is passive, so preventDefault is ignored there.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => clampZoom(z * (e.deltaY > 0 ? 1 / 1.1 : 1.1)));
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, []);

  /* ------------------------------------------------------------------ *
   * Pointer: panning, the crosshair readout and the ruler guide.
   * Everything here is written straight to the DOM inside one animation
   * frame — no React state, so moving the pointer never re-renders the
   * toolbar and never asks paper to redraw the scene.
   * ------------------------------------------------------------------ */

  const svgBox = useMemo<MeasureBox | null>(() => (parsedSVG ? {
    x: parsedSVG.fullBounds.left,
    y: parsedSVG.fullBounds.top,
    width: parsedSVG.fullBounds.width,
    height: parsedSVG.fullBounds.height,
  } : null), [parsedSVG]);

  const transform = useMemo<CanvasTransform | null>(() => makeTransform(sceneBox, svgBox), [sceneBox, svgBox]);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const flushReadout = useCallback(() => {
    readoutFrame.current = 0;
    const point = readoutValue.current;
    // X and Y each land in their own fixed-width, tabular slot: the number
    // changes on every pointer move and the bar must not breathe with it.
    if (readoutXRef.current) {
      readoutXRef.current.textContent = point ? formatNumber(point.x, { maxDecimals: 2 }) : '—';
    }
    if (readoutYRef.current) {
      readoutYRef.current.textContent = point ? formatNumber(point.y, { maxDecimals: 2 }) : '—';
    }
    rulersRef.current?.setCursor(point);
  }, []);

  const pushCursor = useCallback((point: MeasurePoint | null) => {
    readoutValue.current = point;
    if (readoutFrame.current) return;
    readoutFrame.current = requestAnimationFrame(flushReadout);
  }, [flushReadout]);

  useEffect(() => () => {
    if (readoutFrame.current) cancelAnimationFrame(readoutFrame.current);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* best effort */ }
    }
  }, [panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const t = transformRef.current;
    if (container && t) {
      const rect = container.getBoundingClientRect();
      const local = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      pushCursor({
        x: t.svgLeft + (local.x - t.canvasLeft) / t.scale,
        y: t.svgTop + (local.y - t.canvasTop) / t.scale,
      });
    }
    if (isPanning) {
      setPanOffset({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
    }
  }, [isPanning, pushCursor]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      try { if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      setIsPanning(false);
    }
  }, [isPanning]);

  const handlePointerLeave = useCallback(() => {
    pushCursor(null);
    setIsPanning(false);
  }, [pushCursor]);

  /* ---- measuring callbacks ---- */

  const handleCreateMeasurement = useCallback((measurement: Measurement) => {
    setMeasurements(prev => [...prev, measurement]);
    setSelectedMeasureId(measurement.id);
  }, []);

  const handleInspect = useCallback((canvasPoint: MeasurePoint) => {
    const layerId = hitTestConstruction(projectRef.current, canvasPoint, 6);
    setInspectLayerId(layerId);
    if (!layerId) setInspectSummary(null);
    onInspectConstructionRef.current?.(layerId ? layerIdToGeometryKey(layerId) : null);
  }, []);

  /** With only the inspection tool on, a plain click on the canvas picks a guide. */
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!inspectOn || measureOn || isPanning) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    handleInspect({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [inspectOn, measureOn, isPanning, handleInspect]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setSelectedMeasureId(null);
  }, []);

  const closeInspect = useCallback(() => {
    setInspectLayerId(null);
    setInspectSummary(null);
    onInspectConstructionRef.current?.(null);
  }, []);

  /** Back to the framing a freshly loaded SVG gets: fit + centered. */
  const fitToScreen = useCallback(() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }, []);
  const centerView = useCallback(() => { setPanOffset({ x: 0, y: 0 }); }, []);

  /** Scale of the "fit" framing (zoom = 1), in canvas px per SVG unit. */
  const fitScale = zoom > 0 ? sceneScale / zoom : sceneScale;
  const zoomPercent = Math.round(sceneScale * 100);
  const isCentered = panOffset.x === 0 && panOffset.y === 0;
  const isFitted = Math.abs(zoom - 1) < 1e-6 && isCentered;

  /**
   * Why each control is off right now. Every control on this bar either acts
   * or explains itself: nothing is left clickable-but-inert, which is what
   * made half of them look broken.
   */
  const noSvg = !parsedSVG ? t.common.loadSvgToUse : null;
  const componentCount = parsedSVG?.components.length ?? 0;
  const zoomOutOff = noSvg ?? (zoom <= MIN_ZOOM + 1e-9 ? c.zoomMinLimit : null);
  const zoomInOff = noSvg ?? (zoom >= MAX_ZOOM - 1e-9 ? c.zoomMaxLimit : null);
  const fitOff = noSvg ?? (isFitted ? c.alreadyFitted : null);
  const centerOff = noSvg ?? (isCentered ? c.alreadyCentered : null);
  const invertOff = !onInvertToggle
    ? c.loadToInvert
    : componentCount < 2
      ? c.singleComponent
      : null;
  const rulersOff = noSvg ?? (measureOn ? c.rulersLocked : null);
  const eraseOff = noSvg ?? (measurements.length === 0 ? c.nothingToErase : null);

  /** Set the on-screen scale in percent of the SVG's own size (100% = 1:1). */
  const setZoomPercent = useCallback((percent: number) => {
    if (!(fitScale > 0) || !Number.isFinite(percent)) return;
    setZoom(clampZoom(percent / 100 / fitScale));
  }, [fitScale]);

  // Keyboard shortcuts: F fits, 0 goes to 100%, +/- zoom, M measures,
  // Esc leaves the tool, Delete removes the selected cota.
  useEffect(() => {
    if (!parsedSVG) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fitToScreen(); }
      else if (e.key === '0') { e.preventDefault(); setZoomPercent(100); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(z => clampZoom(z * 1.25)); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(z => clampZoom(z / 1.25)); }
      else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); setMeasureOn(!measureOn); }
      else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); setInspectOn(!inspectOn); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); if (!measureOn) setRulersOn(!(showRulers ?? rulersInternal)); }
      else if (e.key === 'Escape' && (measureOn || inspectOn)) {
        e.preventDefault();
        if (inspectLayerId) closeInspect();
        else if (selectedMeasureId) setSelectedMeasureId(null);
        else if (measureOn) setMeasureOn(false);
        else setInspectOn(false);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedMeasureId) {
        e.preventDefault();
        setMeasurements(prev => prev.filter(m => m.id !== selectedMeasureId));
        setSelectedMeasureId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [parsedSVG, fitToScreen, setZoomPercent, measureOn, setMeasureOn, inspectOn, setInspectOn, setRulersOn, showRulers, rulersInternal, selectedMeasureId, inspectLayerId, closeInspect]);

  const zoomDraftValue = useMemo(() => parseFloat(zoomDraft.replace(',', '.')), [zoomDraft]);
  const zoomDraftValid = Number.isFinite(zoomDraftValue) && zoomDraftValue > 0;

  const commitZoomDraft = useCallback(() => {
    if (!zoomDraftValid) return;
    setZoomPercent(zoomDraftValue);
    setZoomMenuOpen(false);
  }, [zoomDraftValid, zoomDraftValue, setZoomPercent]);

  const checkerStyle = canvasBackground === 'checkerboard' ? {
    backgroundImage: 'linear-gradient(45deg, hsl(0 0% 18%) 25%, transparent 25%), linear-gradient(-45deg, hsl(0 0% 18%) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(0 0% 18%) 75%), linear-gradient(-45deg, transparent 75%, hsl(0 0% 18%) 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: 'hsl(0 0% 22%)',
  } : {};

  const zoomPresets = useMemo(() => ([
    { label: '50%', percent: 50 },
    { label: '100%', percent: 100 },
    { label: '200%', percent: 200 },
  ]), []);

  // `bg-canvas` / `bg-card` are theme tokens, so "fundo escuro" is only dark in
  // the dark theme. Read the painted colour instead of guessing from the
  // option, so the rulers and cotas always contrast with what is behind them.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;
    const sync = () => {
      const background = window.getComputedStyle(container).backgroundColor;
      const match = /rgba?\(([^)]+)\)/.exec(background);
      if (!match) return;
      const [r, g, b] = match[1].split(',').map(part => parseFloat(part));
      if (![r, g, b].every(Number.isFinite)) return;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      setDarkCanvas(prev => (prev === luminance < 0.5 ? prev : luminance < 0.5));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
  }, [canvasBackground]);

  const inspectKey = inspectLayerId ? layerIdToGeometryKey(inspectLayerId) : null;
  const inspectName = inspectKey
    ? (constructionLabel?.(inspectKey) ?? geometryLayerLabel(inspectKey))
    : null;

  /**
   * Cursor readout: two fixed, tabular slots. The value changes on every
   * pointer move and must never resize anything. It rides in the bar when the
   * canvas is wide enough for bar and readout on one line; otherwise it moves
   * to a small chip in the corner, so the bar never wraps onto a second row.
   */
  const readoutInBar = size.width >= READOUT_IN_BAR_MIN;
  const readout = (
    <div
      className="flex items-center gap-1 pl-1 pr-2 text-value text-white/55 whitespace-nowrap"
      aria-label={c.cursorAria}
    >
      <Move className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="shrink-0" aria-hidden="true">X</span>
      <span ref={readoutXRef} aria-live="off" className="w-[52px] shrink-0 overflow-hidden text-right tabular-nums">—</span>
      <span className="shrink-0" aria-hidden="true">Y</span>
      <span ref={readoutYRef} aria-live="off" className="w-[52px] shrink-0 overflow-hidden text-right tabular-nums">—</span>
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Canvas */}
      <div
        ref={containerRef}
        className={`relative flex-1 min-h-0 rounded-xl overflow-hidden ${canvasBackground === 'light' ? 'shadow-hairline ' : ''}${bgClasses[canvasBackground]}`}
        style={{ ...checkerStyle, cursor: isPanning ? 'grabbing' : inspectOn && !measureOn ? 'copy' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleContainerClick}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {!readoutInBar && (
          <div
            className={`pointer-events-none absolute z-10 hidden lg:flex items-center rounded-sm bg-foreground/85 py-1.5 pl-1.5 ${
              rulersOn ? 'left-[32px] top-[32px]' : 'left-3 top-3'
            }`}
          >
            {readout}
          </div>
        )}

        {rulersOn && (
          <CanvasRulers
            ref={rulersRef}
            width={size.width}
            height={size.height}
            transform={transform}
            dark={darkCanvas}
            thickness={RULER_THICKNESS}
          />
        )}

        {parsedSVG && (
          <MeasureLayer
            active={measureOn}
            width={size.width}
            height={size.height}
            transform={transform}
            logoBox={svgBox}
            sources={snapSources}
            measurements={measurements}
            selectedId={selectedMeasureId}
            onCreate={handleCreateMeasurement}
            onSelect={setSelectedMeasureId}
            onInspect={handleInspect}
            dark={darkCanvas}
            unitLabel={unitLabel}
            reducedMotion={reducedMotion}
          />
        )}

        {inspectKey && (
          /* Popover de inspeção: flutua sobre o desenho, então pode ter blur. */
          <div className="absolute right-3 top-3 z-20 w-[248px] material-popover glass p-4 text-foreground card-body">
            <div className="card-head">
              <span className="label truncate" title={inspectName ?? undefined}>{inspectName}</span>
              <span className="card-actions">
                <button type="button" className="ctl ctl-plain ctl-icon -mr-1" aria-label={c.closeInspection} onClick={closeInspect}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="metric metric-sm min-w-0 col-span-2">
                <span className="metric-value truncate">
                  {inspectSummary?.box
                    ? `${formatNumber(inspectSummary.box.width, { maxDecimals: 1 })} × ${formatNumber(inspectSummary.box.height, { maxDecimals: 1 })} ${unitLabel}`
                    : '—'}
                </span>
                <span className="metric-caption">{c.inspectBox}</span>
              </div>
              <div className="metric metric-sm min-w-0">
                <span className="metric-value">{inspectSummary?.itemCount ?? 0}</span>
                <span className="metric-caption">{c.inspectGuides}</span>
              </div>
              <div className="metric metric-sm min-w-0">
                <span className="metric-value truncate">
                  {inspectSummary?.longest
                    ? `${formatDistance(inspectSummary.longest.length, unitLabel)} · ${formatAngle(inspectSummary.longest.angleDeg)}`
                    : '—'}
                </span>
                <span className="metric-caption">{c.inspectLongest}</span>
              </div>
            </div>
            <p className="text-footnote text-muted-foreground">{c.inspectNote}</p>
          </div>
        )}

        {!parsedSVG && (
          <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto">
            {emptyState ?? <p className="text-callout text-muted-foreground">{c.empty}</p>}
          </div>
        )}
      </div>

      {/* Single floating bar: zoom, framing, symbol and background */}
      <div
        role="toolbar"
        aria-label={c.toolbarAria}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex w-max max-w-[calc(100%-1rem)] flex-wrap items-center justify-center gap-1 p-1.5 rounded-lg bg-foreground text-white shadow-floating"
      >
        <BarButton
          icon={<ZoomOut className="h-3.5 w-3.5" />}
          label={c.zoomOut}
          hint={c.zoomOutHint}
          disabledReason={zoomOutOff}
          onClick={() => setZoom(z => clampZoom(z / 1.25))}
        />

        <Popover open={zoomMenuOpen} onOpenChange={(open) => { setZoomMenuOpen(open); if (open) setZoomDraft(String(zoomPercent)); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={fill(c.zoomAria, { pct: zoomPercent })}
              title={noSvg ?? c.zoomHint}
              aria-expanded={zoomMenuOpen}
              disabled={!parsedSVG}
              /* Fixed width + tabular figures: 610% and 1589% take the same
                 room, so reading the zoom never nudges the buttons. */
              className={`ctl h-8 md:h-9 w-[72px] md:w-[80px] shrink-0 gap-0.5 px-2 rounded-sm text-value overflow-hidden bg-transparent text-white shadow-none hover:bg-white/10 ${zoomMenuOpen ? 'bg-white/10' : ''}`}
            >
              <span className="flex-1 text-right tabular-nums">{zoomPercent}%</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-white/55" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" sideOffset={8} className="w-[212px] p-4 rounded-lg space-y-3">
            <div className={`${PILL_GROUP} w-full`} role="group" aria-label={c.zoomPresets}>
              <button type="button" className={`${SEG_BTN} ${isFitted ? 'is-active' : ''}`} onClick={() => { fitToScreen(); setZoomMenuOpen(false); }}>
                {c.fitLabel}
              </button>
              {zoomPresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  className={`${SEG_BTN} ${!isFitted && zoomPercent === preset.percent ? 'is-active' : ''}`}
                  onClick={() => { setZoomPercent(preset.percent); setZoomMenuOpen(false); }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="zoom-percent" className="label shrink-0">{c.zoom}</label>
              <input
                id="zoom-percent"
                type="number"
                min={1}
                max={2000}
                step={5}
                value={zoomDraft}
                onChange={(e) => setZoomDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitZoomDraft(); } }}
                className="field field-sm field-mono flex-1"
                aria-label={c.zoomPercentAria}
              />
              <span className="text-caption text-muted-foreground">%</span>
              {/* Disabled while the draft is not a usable percentage, instead
                  of an "Aplicar" that swallows the click without a word. */}
              <button
                type="button"
                className="ctl ctl-outline ctl-sm"
                disabled={!zoomDraftValid}
                title={zoomDraftValid ? c.applyZoom : c.applyZoomInvalid}
                onClick={commitZoomDraft}
              >
                {t.common.apply}
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <BarButton
          icon={<ZoomIn className="h-3.5 w-3.5" />}
          label={c.zoomIn}
          hint={c.zoomInHint}
          disabledReason={zoomInOff}
          onClick={() => setZoom(z => clampZoom(z * 1.25))}
        />

        <div className={BAR_RULE} aria-hidden="true" />

        <BarButton
          icon={<Maximize className="h-3.5 w-3.5" />}
          label={c.fitToScreen}
          hint={c.fitToScreenHint}
          active={isFitted}
          pressed={isFitted}
          disabledReason={fitOff}
          onClick={fitToScreen}
        />
        <BarButton
          icon={<Crosshair className="h-3.5 w-3.5" />}
          label={c.center}
          hint={c.centerHint}
          disabledReason={centerOff}
          onClick={centerView}
        />
        <BarButton
          icon={<FlipHorizontal2 className="h-3.5 w-3.5" />}
          label={c.invert}
          hint={c.invertHint}
          active={isInverted}
          pressed={isInverted}
          disabledReason={invertOff}
          onClick={() => onInvertToggle?.()}
        />

        <div className={BAR_RULE} aria-hidden="true" />

        <BarButton
          className={TOOL_BTN}
          icon={<PencilRuler className="h-3.5 w-3.5" />}
          label={c.measure}
          hint={c.measureHint}
          active={measureOn}
          pressed={measureOn}
          disabledReason={noSvg}
          onClick={() => setMeasureOn(!measureOn)}
        />
        <BarButton
          className={TOOL_BTN}
          icon={<Ruler className="h-3.5 w-3.5" />}
          label={c.rulers}
          hint={c.rulersHint}
          active={rulersOn}
          pressed={rulersOn}
          disabledReason={rulersOff}
          onClick={() => setRulersOn(!(showRulers ?? rulersInternal))}
        />
        <BarButton
          className={TOOL_BTN}
          icon={<MousePointerClick className="h-3.5 w-3.5" />}
          label={c.inspect}
          hint={c.inspectHint}
          active={inspectOn}
          pressed={inspectOn}
          disabledReason={noSvg}
          onClick={() => setInspectOn(!inspectOn)}
        />
        {/* Always on the bar: showing up only after the first cota made the
            whole bar jump sideways mid-measurement. */}
        <BarButton
          icon={<Eraser className="h-3.5 w-3.5" />}
          label={c.eraseMeasurements}
          hint={measurements.length === 1 ? c.eraseOne : fill(c.eraseMany, { n: measurements.length })}
          disabledReason={eraseOff}
          onClick={clearMeasurements}
        />

        <div className={BAR_RULE} aria-hidden="true" />

        <span className="inline-flex" title={onCanvasBackgroundChange ? undefined : c.backgroundUnavailable}>
          <div className="flex items-center gap-0.5" role="group" aria-label={c.backgroundAria}>
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.value}
                type="button"
                className={`${BAR_BTN} ${canvasBackground === bg.value ? BAR_ON : BAR_IDLE}`}
                aria-label={c[bg.key]}
                aria-pressed={canvasBackground === bg.value}
                title={c[bg.key]}
                disabled={!onCanvasBackgroundChange}
                onClick={() => onCanvasBackgroundChange?.(bg.value)}
              >
                {bg.icon}
              </button>
            ))}
          </div>
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className={`${BAR_BTN} ${BAR_IDLE} hidden md:inline-flex`} aria-label={c.shortcuts}>
              <Keyboard className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px] text-footnote">
            {[...canvasShortcuts(c), ...(extraShortcuts ?? [])].map(s => (
              <span key={`${s.keys}-${s.action}`} className="block">{s.keys} — {s.action}</span>
            ))}
          </TooltipContent>
        </Tooltip>

        {readoutInBar && (
          <>
            <div className={BAR_RULE} aria-hidden="true" />
            {readout}
          </>
        )}
      </div>
    </div>
  );
};

export default PreviewCanvas;

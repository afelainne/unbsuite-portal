import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type paper from "paper";
import { toast } from "sonner";
import {
  Download,
  Layers,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  Search,
  Eraser,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { SectionHead } from "../components/chrome";
import { QUIET_TABLIST, SECTION_BODY, TITLE_ICON_BTN, quietTab } from "../components/chrome-classes";
import PreviewCanvas, { type RenderError } from "../components/PreviewCanvas";
import InfoTooltip from "../components/InfoTooltip";
import MetricsPanel from "../components/MetricsPanel";
import ExportMenu, { type ExportKind } from "../components/ExportMenu";
import OutputSizeControl, {
  DEFAULT_GUIDE_SCALE,
  DEFAULT_LOGO_SIZE,
  resolveLogoSize,
  type LogoSizeOption,
} from "../components/OutputSizeControl";
import SvgInputPanel from "../components/SvgInputPanel";
import ClearspacePanel from "../components/ClearspacePanel";
import MinSizePanel from "../components/MinSizePanel";
import DiagnosisPanel from "../components/DiagnosisPanel";
import BrandSheetPanel from "../components/BrandSheetPanel";
import ComparePanel, { type CompareCanvasView } from "../components/ComparePanel";
import CompareView from "../components/CompareView";
import { Switch } from "../components/ui/switch";
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { ToolInput } from "@/tools/_shared/ui";
import { Slider } from "../components/ui/slider";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet";
import {
  parseSVG, invertComponents, exportSVG, clampSubdivisions, getIconBounds, getLogomarkSize,
  convertToPixels,
  type ParsedSVG, type ClearspaceUnit,
} from "../lib/svg-engine";
import type { SceneSettings } from "../lib/render-pipeline";
import {
  exportLayeredSVG, exportScenePNG, exportScenePDF, exportOutlineSVG,
  downloadBlob, downloadText,
} from "../lib/export-engine";
import {
  getBuiltinPresets,
  presetDisplayName,
  loadPresetsFromStorage,
  savePresetsToStorage,
  createPreset,
  createDefaultGeometryOptions,
  createDefaultGeometryStyles,
  DEFAULT_GEOMETRY_STYLES,
  exportPresetsBlob,
  importPresetsFromFile,
  type GeometryPreset,
  type PresetFamily,
} from "../lib/preset-engine";
import {
  measureReferenceUnits, createClearspaceConfig, resolveClearspace, toLegacySceneClearspace,
  referenceLength,
  type ClearspaceConfig, type Box as CsBox,
} from "../lib/clearspace";
import { diagnoseLogo, type LogoDiagnosis } from "../lib/diagnosis";
import { suggestGeometries } from "../lib/suggest";
import { svgFromClipboard, isSvgInputError, isTextEntryTarget, type SvgInputResult } from "../lib/svg-input";
import { rememberRecent } from "../lib/session-history";
import { useUndoHistory } from "../hooks/use-undo-history";
import { useLogoMetrics } from "../hooks/use-logo-metrics";
import { useIsMobile } from "../hooks/use-mobile";
import PresetManager from "../components/PresetManager";
import RightPanel from "../components/RightPanel";
import SavePresetDialog from "../components/SavePresetDialog";
import LoadPresetDialog from "../components/LoadPresetDialog";
import LanguageSelect from "../components/LanguageSelect";
import { useLanguage, activeT, fill, plural, type Translations } from "../i18n";

export type { GeometryOptions, GeometryStyle, GeometryStyles, CanvasBackground } from '../types/geometry';
import { GEOMETRY_KEYS, type GeometryOptions, type GeometryStyle, type GeometryStyles, type CanvasBackground } from '../types/geometry';
import {
  FALLBACK_STYLE, geometryLabels, humanizeGeometryKey, labelFor,
  geometryGroups, effectiveGeometryGroups, type GeometryGroup,
} from "../lib/geometry-meta";

/** Grid subdivision limits shown in the UI (same range presets accept). */
const GRID_MIN = 2;
const GRID_MAX = 64;

/** Margin the export pipeline adds around the content (export-engine default). */
const EXPORT_MARGIN = 24;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Short "a · b · c (+n)" summary for toasts. */
const summarize = (lines: string[], max = 3) =>
  lines.slice(0, max).join(" · ") + (lines.length > max ? ` (+${lines.length - max})` : "");

/** Accent- and case-insensitive contains, so "proporcao" finds "Proporção". */
const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const storageFailed = () =>
  toast.error(activeT().toast.storageFailedTitle, {
    description: activeT().toast.storageFailedDescription,
  });

/** Where the right panel remembers whether it was open. */
const RIGHT_PANEL_KEY = "unbsgrid-right-panel-open";

/** Reading it can throw in a sandboxed iframe or with site data blocked. */
const readRightPanelOpen = (): boolean => {
  try {
    const stored = localStorage.getItem(RIGHT_PANEL_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
};

const writeRightPanelOpen = (open: boolean): void => {
  try {
    localStorage.setItem(RIGHT_PANEL_KEY, open ? "1" : "0");
  } catch {
    // Quota or privacy mode: the panel still works, it just forgets.
  }
};

/**
 * Shortcuts the PAGE registers. The canvas owns its own list and prints both
 * in the single help tooltip on the canvas bar, so there is one place to look
 * them up and one place to check for collisions.
 */
const pageShortcuts = (t: Translations): ReadonlyArray<{ keys: string; action: string }> => [
  { keys: 'Ctrl/Cmd + Z', action: t.pageShortcuts.undo },
  { keys: 'Ctrl/Cmd + Shift + Z', action: t.pageShortcuts.redo },
  { keys: 'Ctrl/Cmd + V', action: t.pageShortcuts.paste },
  { keys: 'Ctrl + Enter', action: t.pageShortcuts.loadPaste },
  { keys: t.canvas.keySpace, action: t.pageShortcuts.space },
  { keys: t.canvas.keyArrows, action: t.pageShortcuts.arrows },
];

// Always-visible block header: the micro label in ink, no chevron.
const SectionLabel: React.FC<{ label: string; tooltip?: string; children?: React.ReactNode }> = ({ label, tooltip, children }) => (
  <div className="flex h-11 items-center gap-1">
    <span className="label text-foreground truncate">{label}</span>
    {tooltip && <InfoTooltip content={tooltip} />}
    {children && <div className="ml-auto flex items-center gap-1">{children}</div>}
  </div>
);

const chevronStyle = (open: boolean): React.CSSProperties => ({ transform: open ? 'rotate(180deg)' : undefined });
const CHEVRON_CLS = "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-base ease-out";
const SUB_ROW = "flex items-center gap-2";
const SELECT_TRIGGER = "h-8 rounded-md text-footnote text-foreground";
/** Hairline between the sections of a panel. */
const RULE = "h-px bg-border";

/** Collapsible section built by this page (the feature panels bring their own). */
const Section: React.FC<{
  label: string;
  tooltip?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, tooltip, open, onOpenChange, meta, action, children }) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <SectionHead label={label} open={open} meta={meta} tooltip={tooltip} action={action} />
    <CollapsibleContent className={SECTION_BODY}>{children}</CollapsibleContent>
  </Collapsible>
);

type GeometryFilter = "all" | "active" | "basic" | "advanced";

const GEOMETRY_FILTERS: { value: GeometryFilter; key: keyof Translations["app"] }[] = [
  { value: "all", key: "filterAll" },
  { value: "active", key: "filterActive" },
  { value: "basic", key: "filterBasic" },
  { value: "advanced", key: "filterAdvanced" },
];

/** Sidebar tabs. Each one is an accordion: a single heavy section open at a time. */
type SidebarTab = "analisar" | "construir" | "publicar";

const SIDEBAR_TABS: { id: SidebarTab; label: keyof Translations["app"]; hint: keyof Translations["app"] }[] = [
  { id: "analisar", label: "tabAnalyze", hint: "tabAnalyzeHint" },
  { id: "construir", label: "tabBuild", hint: "tabBuildHint" },
  { id: "publicar", label: "tabPublish", hint: "tabPublishHint" },
];

interface StyleControlProps {
  style: GeometryStyle;
  onChange: (s: GeometryStyle) => void;
}

const StyleControl: React.FC<StyleControlProps> = ({ style, onChange }) => {
  const { t } = useLanguage();
  return (
  <div className="pl-8 pr-2 pt-0.5 pb-2 space-y-1.5">
    <div className="flex items-center gap-2">
      <span className="label w-11 shrink-0">{t.app.color}</span>
      <input
        type="color"
        value={style.color}
        onChange={(e) => onChange({ ...style, color: e.target.value })}
        aria-label={t.app.styleColorAria}
        className="h-5 w-5 shrink-0 cursor-pointer"
      />
      <span className="label w-12 shrink-0 text-right">{t.app.opacity}</span>
      <Slider
        min={0} max={100} step={1}
        value={[Math.round(style.opacity * 100)]}
        onValueChange={(v) => onChange({ ...style, opacity: v[0] / 100 })}
        className="flex-1"
        aria-label={t.app.opacity}
      />
      <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{Math.round(style.opacity * 100)}%</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="label w-11 shrink-0">{t.app.stroke}</span>
      <Slider
        min={5} max={50} step={5}
        value={[Math.round(style.strokeWidth * 10)]}
        onValueChange={(v) => onChange({ ...style, strokeWidth: v[0] / 10 })}
        className="flex-1"
        aria-label={t.app.strokeWidthAria}
      />
      <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{style.strokeWidth.toFixed(1)}</span>
    </div>
  </div>
  );
};

/** Everything a single undo step restores. */
interface Snapshot {
  clearspaceConfig: ClearspaceConfig;
  showGrid: boolean;
  gridSubdivisions: number;
  geometryOptions: GeometryOptions;
  geometryStyles: GeometryStyles;
  modularScaleRatio: number;
  safeZoneMargin: number;
  useRealDataInterpretation: boolean;
  maxFlowLines: number;
  anchorPointSize: number;
  bezierHandleSize: number;
  bezierShowAnchors: boolean;
  bezierShowHandles: boolean;
  svgColorOverride: string | null;
  svgOutlineMode: boolean;
  svgOutlineWidth: number;
  svgOutlineDash: number[];
  svgOutlineLineCap: 'butt' | 'round' | 'square';
  guideScale: number;
  logoSizeOption: LogoSizeOption;
  canvasBackground: CanvasBackground;
  showVisualCenter: boolean;
}

const rectToBox = (r?: paper.Rectangle | null): CsBox | null =>
  r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;

const Index = () => {
  const { t } = useLanguage();
  const [parsedSVG, setParsedSVG] = useState<ParsedSVG | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [clearspaceConfig, setClearspaceConfig] = useState<ClearspaceConfig>(() => createClearspaceConfig());
  const [showGrid, setShowGrid] = useState(false);
  const [gridSubdivisions, setGridSubdivisions] = useState(8);
  const [subdivDraft, setSubdivDraft] = useState<string | null>(null);
  const [isInverted, setIsInverted] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>("dark");
  const [modularScaleRatio, setModularScaleRatio] = useState(1.618);
  const [safeZoneMargin, setSafeZoneMargin] = useState(0.1);
  const [maxFlowLines, setMaxFlowLines] = useState(5);
  const [anchorPointSize, setAnchorPointSize] = useState(3);
  const [bezierHandleSize, setBezierHandleSize] = useState(3);
  const [bezierShowAnchors, setBezierShowAnchors] = useState(true);
  const [bezierShowHandles, setBezierShowHandles] = useState(true);
  const [svgColorOverride, setSvgColorOverride] = useState<string | null>(null);
  const [useRealDataInterpretation, setUseRealDataInterpretation] = useState(true);
  const [svgOutlineMode, setSvgOutlineMode] = useState(false);
  const [svgOutlineWidth, setSvgOutlineWidth] = useState(1);
  const [svgOutlineDash, setSvgOutlineDash] = useState<number[]>([]);
  const [svgOutlineLineCap, setSvgOutlineLineCap] = useState<'butt' | 'round' | 'square'>('butt');
  const [geometryOptions, setGeometryOptions] = useState<GeometryOptions>(createDefaultGeometryOptions);
  const [geometryStyles, setGeometryStyles] = useState<GeometryStyles>(createDefaultGeometryStyles);
  const [renderErrors, setRenderErrors] = useState<Partial<Record<keyof GeometryOptions, string>>>({});
  const [showVisualCenter, setShowVisualCenter] = useState(false);
  // Export sizing: how big the scene is generated (not the on-screen zoom).
  const [logoSizeOption, setLogoSizeOption] = useState<LogoSizeOption>(DEFAULT_LOGO_SIZE);
  const [guideScale, setGuideScale] = useState(DEFAULT_GUIDE_SCALE);
  // Construction list: search + filter.
  const [geometryQuery, setGeometryQuery] = useState("");
  const [geometryFilter, setGeometryFilter] = useState<GeometryFilter>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Left panel on a wide screen: a card that folds away to give the canvas
  // the width. On a narrow screen `sidebarOpen` drives the sheet instead.
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  // Right panel (presets). Open by default on a wide screen, and the choice
  // survives a reload. On a narrow screen it is a sheet, which always starts
  // closed so the canvas is the first thing on screen.
  const [rightPanelOpen, setRightPanelOpenState] = useState(readRightPanelOpen);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);
  const setRightPanelOpen = useCallback((open: boolean) => {
    setRightPanelOpenState(open);
    writeRightPanelOpen(open);
  }, []);
  // Canvas tools (measuring, rulers, inspection) mirrored here so the sidebar
  // can react to them.
  const [measuring, setMeasuring] = useState(false);
  const [rulersOn, setRulersOn] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [inspectedGeometry, setInspectedGeometry] = useState<keyof GeometryOptions | null>(null);
  // Comparison taking over the canvas area.
  const [compareCanvas, setCompareCanvas] = useState(false);
  const [compareView, setCompareView] = useState<CompareCanvasView | null>(null);
  const isMobile = useIsMobile();
  const { metrics, loading: metricsLoading, error: metricsError } = useLogoMetrics(parsedSVG?.originalSVG);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ advanced: true });

  // --- Sidebar tabs + accordion -------------------------------------------
  const [tab, setTab] = useState<SidebarTab>("analisar");
  const currentTab = SIDEBAR_TABS.find((item) => item.id === tab) ?? SIDEBAR_TABS[0];
  const [openSection, setOpenSection] = useState<Record<SidebarTab, string | null>>({
    analisar: "entrada",
    construir: "construcoes",
    publicar: "exportacao",
  });
  const sectionProps = useCallback((where: SidebarTab, id: string) => ({
    open: openSection[where] === id,
    onOpenChange: (value: boolean) =>
      setOpenSection((prev) => ({ ...prev, [where]: value ? id : null })),
  }), [openSection]);

  const resetGroup = useCallback((groupKeys: (keyof GeometryOptions)[]) => {
    setGeometryOptions((prev) => {
      const updated = { ...prev };
      groupKeys.forEach((k) => { updated[k] = false; });
      return updated;
    });
    setGeometryStyles((prev) => {
      const updated = { ...prev };
      groupKeys.forEach((k) => { updated[k] = { ...(DEFAULT_GEOMETRY_STYLES[k] ?? FALLBACK_STYLE) }; });
      return updated;
    });
  }, []);
  const [presets, setPresets] = useState<GeometryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const projectRef = useRef<paper.Project | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const userPresets = loadPresetsFromStorage();
    setPresets([...getBuiltinPresets(), ...userPresets]);
  }, []);

  // --- Reference units, clearspace and the bridge to the scene -------------
  const logoBox = useMemo(() => rectToBox(parsedSVG?.fullBounds), [parsedSVG]);

  const referenceUnits = useMemo(() => {
    if (!parsedSVG) return null;
    return measureReferenceUnits(parsedSVG.originalSVG, {
      symbolBounds: rectToBox(getIconBounds(parsedSVG.components)),
    });
  }, [parsedSVG]);

  const logomarkSize = useMemo(
    () => (parsedSVG ? getLogomarkSize(parsedSVG.components) : 0),
    [parsedSVG],
  );

  /**
   * The scene renderer only speaks "one uniform clearspace in logomark units",
   * so the panel's per-side config is converted once, here.
   */
  const legacyClearspace = useMemo<{ clearspaceValue: number; clearspaceUnit: ClearspaceUnit }>(() => {
    if (!referenceUnits?.measured || !logoBox) return { clearspaceValue: 0, clearspaceUnit: "logomark" };
    const resolved = resolveClearspace(logoBox, clearspaceConfig, referenceUnits);
    return toLegacySceneClearspace(resolved, logomarkSize);
  }, [referenceUnits, logoBox, clearspaceConfig, logomarkSize]);

  const clearspaceValue = legacyClearspace.clearspaceValue;
  const clearspaceUnit = legacyClearspace.clearspaceUnit;

  /**
   * Presets still store the legacy pair, so a loaded preset is converted back
   * into a config whose drawn rectangle is exactly the same: the multiplier is
   * the legacy length divided by the length of one reference unit.
   */
  const configFromLegacy = useCallback((value: number, unit: ClearspaceUnit): ClearspaceConfig => {
    const length = convertToPixels(value, unit, logomarkSize, 1);
    const unitLength = referenceUnits?.measured
      ? referenceLength("symbol-height", referenceUnits, "longest-side")
      : 0;
    const multiplier = unitLength > 0 ? length / unitLength : value;
    return createClearspaceConfig({
      reference: "symbol-height",
      locked: true,
      sides: { top: multiplier, right: multiplier, bottom: multiplier, left: multiplier },
    });
  }, [logomarkSize, referenceUnits]);

  // --- Undo / redo ---------------------------------------------------------
  const snapshot = useMemo<Snapshot>(() => ({
    clearspaceConfig, showGrid, gridSubdivisions, geometryOptions, geometryStyles,
    modularScaleRatio, safeZoneMargin, useRealDataInterpretation, maxFlowLines,
    anchorPointSize, bezierHandleSize, bezierShowAnchors, bezierShowHandles,
    svgColorOverride, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap,
    guideScale, logoSizeOption, canvasBackground, showVisualCenter,
  }), [
    clearspaceConfig, showGrid, gridSubdivisions, geometryOptions, geometryStyles,
    modularScaleRatio, safeZoneMargin, useRealDataInterpretation, maxFlowLines,
    anchorPointSize, bezierHandleSize, bezierShowAnchors, bezierShowHandles,
    svgColorOverride, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap,
    guideScale, logoSizeOption, canvasBackground, showVisualCenter,
  ]);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  /** True while undo/redo is writing back, so the change is not recorded again. */
  const applyingRef = useRef(false);

  const applySnapshot = useCallback((s: Snapshot) => {
    applyingRef.current = true;
    setClearspaceConfig(s.clearspaceConfig);
    setShowGrid(s.showGrid); setGridSubdivisions(s.gridSubdivisions);
    setGeometryOptions(s.geometryOptions); setGeometryStyles(s.geometryStyles);
    setModularScaleRatio(s.modularScaleRatio); setSafeZoneMargin(s.safeZoneMargin);
    setUseRealDataInterpretation(s.useRealDataInterpretation); setMaxFlowLines(s.maxFlowLines);
    setAnchorPointSize(s.anchorPointSize); setBezierHandleSize(s.bezierHandleSize);
    setBezierShowAnchors(s.bezierShowAnchors); setBezierShowHandles(s.bezierShowHandles);
    setSvgColorOverride(s.svgColorOverride); setSvgOutlineMode(s.svgOutlineMode);
    setSvgOutlineWidth(s.svgOutlineWidth); setSvgOutlineDash(s.svgOutlineDash);
    setSvgOutlineLineCap(s.svgOutlineLineCap); setGuideScale(s.guideScale);
    setLogoSizeOption(s.logoSizeOption); setCanvasBackground(s.canvasBackground);
    setShowVisualCenter(s.showVisualCenter);
  }, []);

  const history = useUndoHistory<Snapshot>(snapshot, { onApply: applySnapshot });

  /** Who moved last — a whole slider drag collapses into one undo step. */
  const changeRef = useRef<{ group: string | null; label: string }>({ group: null, label: activeT().history.adjustment });
  const markChange = useCallback((group: string | null, label: string) => {
    changeRef.current = { group, label };
  }, []);

  const historyRecord = history.record;
  useEffect(() => {
    if (applyingRef.current) { applyingRef.current = false; return; }
    historyRecord(snapshot, changeRef.current);
    // A one-off change must not glue itself to the next unrelated one.
    changeRef.current = { group: null, label: activeT().history.adjustment };
  }, [snapshot, historyRecord]);

  // --- Presets -------------------------------------------------------------
  const currentConfigSnapshot = useMemo(
    () => JSON.stringify({ geometryOptions, geometryStyles, clearspaceConfig, showGrid, gridSubdivisions }),
    [geometryOptions, geometryStyles, clearspaceConfig, showGrid, gridSubdivisions],
  );
  const isPresetModified = activePresetId !== null && savedSnapshot !== null && currentConfigSnapshot !== savedSnapshot;
  const activePreset = useMemo(() => presets.find((p) => p.id === activePresetId) || null, [presets, activePresetId]);
  const allPresetNames = useMemo(() => presets.map((p) => p.name), [presets]);

  const applyPreset = useCallback((preset: GeometryPreset) => {
    const config = configFromLegacy(preset.clearspaceValue, preset.clearspaceUnit);
    markChange("preset", fill(activeT().history.preset, { name: presetDisplayName(preset) }));
    setGeometryOptions({ ...preset.geometryOptions });
    setGeometryStyles({ ...preset.geometryStyles });
    setClearspaceConfig(config);
    setShowGrid(preset.showGrid);
    setGridSubdivisions(preset.gridSubdivisions);
    setActivePresetId(preset.id);
    setSavedSnapshot(
      JSON.stringify({
        geometryOptions: preset.geometryOptions, geometryStyles: preset.geometryStyles,
        clearspaceConfig: config, showGrid: preset.showGrid, gridSubdivisions: preset.gridSubdivisions,
      }),
    );
  }, [configFromLegacy, markChange]);

  const handleSavePreset = useCallback(
    (name: string, description: string, family: PresetFamily) => {
      const newPreset = createPreset({ name, description, family, geometryOptions, geometryStyles, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions });
      const updated = [...presets, newPreset];
      setPresets(updated);
      if (savePresetsToStorage(updated) === false) storageFailed();
      else toast.success(fill(activeT().toast.presetSaved, { name: newPreset.name }));
      setActivePresetId(newPreset.id);
      setSavedSnapshot(currentConfigSnapshot);
      setSaveDialogOpen(false);
    },
    [presets, geometryOptions, geometryStyles, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions, currentConfigSnapshot],
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      if (savePresetsToStorage(updated) === false) storageFailed();
      if (activePresetId === id) { setActivePresetId(null); setSavedSnapshot(null); }
    },
    [presets, activePresetId],
  );

  const handleRevertPreset = useCallback(() => {
    const preset = presets.find((p) => p.id === activePresetId);
    if (preset) applyPreset(preset);
  }, [presets, activePresetId, applyPreset]);

  // --- Loading a logo ------------------------------------------------------
  const handleSVGLoaded = useCallback((svgString: string) => {
    if (!hiddenCanvasRef.current) {
      const c = document.createElement("canvas"); c.width = 1; c.height = 1;
      hiddenCanvasRef.current = c;
    }
    let parsed: ParsedSVG;
    try {
      parsed = parseSVG(svgString, hiddenCanvasRef.current);
    } catch (err) {
      toast.error(activeT().toast.openSvgFailed, { description: errorMessage(err) });
      return false;
    }
    setParsedSVG(parsed);
    setIsInverted(false);
    setRenderErrors({});
    const warnings = parsed.warnings ?? [];
    if (warnings.length) {
      toast.warning(plural(warnings.length, activeT().toast.loadedWithWarningsOne, activeT().toast.loadedWithWarningsOther), {
        description: summarize(warnings),
      });
    }
    return true;
  }, []);

  const handleInputLoaded = useCallback((result: SvgInputResult) => {
    if (!handleSVGLoaded(result.svg)) return;
    setFileName(result.name);
    // A new logo starts a new history: undoing back into the previous file's
    // settings would be meaningless.
    history.reset(snapshotRef.current, activeT().history.newLogo);
    // Land on the reading that matters first.
    setOpenSection((prev) => ({ ...prev, analisar: "diagnostico" }));
  }, [handleSVGLoaded, history]);

  /**
   * Ctrl+V anywhere on the page. The page owns it (instead of the input panel)
   * because the panel lives inside a collapsed section most of the time.
   */
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      if (isTextEntryTarget(event.target)) return;
      const data = event.clipboardData;
      if (!data) return;
      void svgFromClipboard(data, { source: "clipboard" }).then((outcome) => {
        if (isSvgInputError(outcome)) {
          // Nothing SVG in the clipboard: stay quiet, the user pasted elsewhere.
          if (outcome.code === "no-svg-in-clipboard") return;
          toast.error(outcome.title, { description: outcome.description });
          return;
        }
        rememberRecent({ name: outcome.name, svg: outcome.svg, bytes: outcome.bytes });
        handleInputLoaded(outcome);
      });
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleInputLoaded]);

  const handleInvert = useCallback(() => {
    if (!parsedSVG) return;
    const newComponents = invertComponents(parsedSVG.components);
    setParsedSVG({ ...parsedSVG, components: newComponents });
    setIsInverted((v) => !v);
  }, [parsedSVG]);

  const onProjectReady = useCallback((p: paper.Project) => { projectRef.current = p; }, []);

  const handleRenderErrors = useCallback((errors: RenderError[]) => {
    setRenderErrors((prev) => {
      const next: Partial<Record<keyof GeometryOptions, string>> = {};
      for (const e of errors) next[e.key as keyof GeometryOptions] = e.message;
      const prevKeys = Object.keys(prev) as (keyof GeometryOptions)[];
      const same = prevKeys.length === errors.length && prevKeys.every((k) => prev[k] === next[k]);
      return same ? prev : next;
    });
  }, []);

  const sceneSettings = useMemo<SceneSettings>(() => ({
    clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions,
    geometryOptions, geometryStyles, modularScaleRatio, safeZoneMargin,
    useRealDataInterpretation, maxFlowLines, anchorPointSize,
    bezierHandleSize, bezierShowAnchors, bezierShowHandles,
    svgColorOverride, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap,
    guideScale,
  }), [clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions, geometryOptions, geometryStyles, modularScaleRatio, safeZoneMargin, useRealDataInterpretation, maxFlowLines, anchorPointSize, bezierHandleSize, bezierShowAnchors, bezierShowHandles, svgColorOverride, svgOutlineMode, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap, guideScale]);

  // --- Diagnosis -----------------------------------------------------------
  const [diagnosis, setDiagnosis] = useState<LogoDiagnosis | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  const sourceSVG = parsedSVG?.sourceSVG;
  const originalSVG = parsedSVG?.originalSVG;

  useEffect(() => {
    if (!originalSVG) {
      setDiagnosis(null); setDiagnosisError(null); setDiagnosisLoading(false);
      return;
    }
    let cancelled = false;
    setDiagnosisLoading(true);
    setDiagnosisError(null);
    // After the paint, like the metrics: the scan is heavy.
    const handle = window.setTimeout(() => {
      try {
        const next = diagnoseLogo({ originalSVG, sourceSVG });
        if (!cancelled) { setDiagnosis(next); setDiagnosisLoading(false); }
      } catch (err) {
        if (!cancelled) {
          setDiagnosis(null);
          setDiagnosisError(errorMessage(err));
          setDiagnosisLoading(false);
        }
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(handle); };
    // The diagnosis is written in the active language: recompute on a switch.
  }, [originalSVG, sourceSVG, t]);

  const diagnosisSuggestions = useMemo(() => suggestGeometries(diagnosis), [diagnosis]);

  /** The panel already announces the suggestion; here we only flip the switches. */
  const handleEnableGeometries = useCallback((keys: Array<keyof GeometryOptions>) => {
    markChange("suggestion", activeT().history.suggestion);
    setGeometryOptions((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = true;
      return next;
    });
  }, [markChange]);

  // --- Export size ---------------------------------------------------------
  const originalLongestSide = useMemo(() => {
    if (!parsedSVG) return null;
    const side = Math.max(parsedSVG.fullBounds.width || 0, parsedSVG.fullBounds.height || 0);
    return side > 0 ? side : null;
  }, [parsedSVG]);

  const logoSize = useMemo(
    () => resolveLogoSize(logoSizeOption, originalLongestSide),
    [logoSizeOption, originalLongestSide],
  );

  /** Approximate size of the exported scene (the crop also includes the guides). */
  const estimatedScene = useMemo(() => {
    if (!parsedSVG) return null;
    const w = parsedSVG.fullBounds.width || 0;
    const h = parsedSVG.fullBounds.height || 0;
    const k = logoSize / Math.max(w, h, 1e-9);
    return {
      width: Math.round((w || 1) * k + EXPORT_MARGIN * 2),
      height: Math.round((h || 1) * k + EXPORT_MARGIN * 2),
    };
  }, [parsedSVG, logoSize]);

  const sizeEstimateLabel = estimatedScene
    ? fill(t.app.sizeEstimate, { size: logoSize, width: estimatedScene.width, height: estimatedScene.height })
    : null;

  const exportSizeHints = useMemo<Partial<Record<ExportKind, string>> | undefined>(() => {
    if (!estimatedScene) return undefined;
    const m = t.exportMenu;
    const png = (scale: number) => fill(m.hintPng, { width: estimatedScene.width * scale, height: estimatedScene.height * scale });
    return {
      "layered-svg": fill(m.hintLayered, { size: logoSize }),
      "svg": m.hintScreen,
      "outline-svg": m.hintOriginal,
      "pdf": fill(m.hintPdf, { width: estimatedScene.width, height: estimatedScene.height }),
      "png-1": png(1),
      "png-2": png(2),
      "png-4": png(4),
    };
  }, [estimatedScene, logoSize, t]);

  const exportOptions = useMemo(() => ({ logoSize }), [logoSize]);

  const handleExport = useCallback(() => {
    if (!projectRef.current) return;
    try {
      downloadText(exportSVG(projectRef.current), "unbsgrid-export.svg");
      toast.success(activeT().toast.svgExported, { description: "unbsgrid-export.svg" });
    } catch (err) {
      toast.error(activeT().toast.svgExportFailed, { description: errorMessage(err) });
    }
  }, []);

  const handleExportLayered = useCallback(() => {
    if (!parsedSVG) return;
    try {
      downloadText(exportLayeredSVG(parsedSVG, sceneSettings, exportOptions), "unbsgrid-camadas.svg");
      toast.success(activeT().toast.layeredExported, {
        description: fill(activeT().toast.layeredExportedDescription, { file: "unbsgrid-camadas.svg", size: logoSize }),
      });
    } catch (err) {
      toast.error(activeT().toast.layeredExportFailed, { description: errorMessage(err) });
    }
  }, [parsedSVG, sceneSettings, exportOptions, logoSize]);

  const handleExportPNG = useCallback(async (scale: number) => {
    if (!parsedSVG) return;
    const filename = `unbsgrid-export-${scale}x.png`;
    try {
      const result = await exportScenePNG(parsedSVG, sceneSettings, { ...exportOptions, scale });
      downloadBlob(result.blob, filename);
      toast.success(fill(activeT().toast.pngExported, { scale }), {
        description: fill(activeT().toast.pngExportedDescription, { file: filename, width: result.width, height: result.height })
          + (result.clamped ? activeT().toast.pngClamped : ""),
      });
    } catch (err) {
      toast.error(fill(activeT().toast.pngExportFailed, { scale }), { description: errorMessage(err) });
    }
  }, [parsedSVG, sceneSettings, exportOptions]);

  const handleExportPDF = useCallback(() => {
    if (!parsedSVG) return;
    try {
      downloadBlob(exportScenePDF(parsedSVG, sceneSettings, exportOptions), "unbsgrid-export.pdf");
      toast.success(activeT().toast.pdfExported, { description: fill(activeT().toast.pdfExportedDescription, { file: "unbsgrid-export.pdf", size: logoSize }) });
    } catch (err) {
      toast.error(activeT().toast.pdfExportFailed, { description: errorMessage(err) });
    }
  }, [parsedSVG, sceneSettings, exportOptions, logoSize]);

  const handleExportOutlineSVG = useCallback(() => {
    if (!parsedSVG) return;
    try {
      const svg = exportOutlineSVG(parsedSVG, {
        color: svgColorOverride,
        strokeWidth: svgOutlineWidth,
        dash: svgOutlineDash,
        lineCap: svgOutlineLineCap,
        logoSize,
      });
      downloadText(svg, "unbsgrid-outline.svg");
      toast.success(activeT().toast.outlineExported, { description: "unbsgrid-outline.svg" });
    } catch (err) {
      toast.error(activeT().toast.outlineExportFailed, { description: errorMessage(err) });
    }
  }, [parsedSVG, svgColorOverride, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap, logoSize]);

  const handleExportKind = useCallback(async (kind: ExportKind) => {
    switch (kind) {
      case "layered-svg": return handleExportLayered();
      case "svg": return handleExport();
      case "outline-svg": return handleExportOutlineSVG();
      case "pdf": return handleExportPDF();
      case "png-1": return handleExportPNG(1);
      case "png-2": return handleExportPNG(2);
      case "png-4": return handleExportPNG(4);
    }
  }, [handleExportLayered, handleExport, handleExportOutlineSVG, handleExportPDF, handleExportPNG]);

  const handleExportPresets = useCallback(() => {
    const count = presets.filter((p) => !p.isBuiltin).length;
    if (!count) {
      toast.info(activeT().toast.noPresetsToExport, { description: activeT().toast.noPresetsToExportDescription });
      return;
    }
    downloadBlob(exportPresetsBlob(presets), "unbsgrid-presets.json");
    toast.success(plural(count, activeT().toast.presetsExportedOne, activeT().toast.presetsExportedOther), { description: "unbsgrid-presets.json" });
  }, [presets]);

  const handleImportPresets = useCallback(async (file: File) => {
    let result: Awaited<ReturnType<typeof importPresetsFromFile>>;
    try {
      result = await importPresetsFromFile(file, presets);
    } catch (err) {
      toast.error(activeT().toast.readFileFailed, { description: errorMessage(err) });
      return;
    }
    const { presets: imported, errors, warnings } = result;
    if (imported.length) {
      const updated = [...presets, ...imported];
      setPresets(updated);
      if (savePresetsToStorage(updated) === false) storageFailed();
      const n = imported.length;
      toast.success(plural(n, activeT().toast.presetsImportedOne, activeT().toast.presetsImportedOther), {
        description: summarize(imported.map((p) => p.name), 4),
      });
    } else if (!errors.length) {
      toast.info(activeT().toast.noPresetsInFile);
    }
    if (warnings.length) {
      toast.warning(plural(warnings.length, activeT().toast.importWarningsOne, activeT().toast.importWarningsOther), { description: summarize(warnings) });
    }
    if (errors.length) {
      toast.error(imported.length ? plural(errors.length, activeT().toast.presetsSkippedOne, activeT().toast.presetsSkippedOther) : activeT().toast.importFailed, {
        description: summarize(errors),
      });
    }
  }, [presets]);

  const logomarkLabel = useMemo(() => {
    if (!parsedSVG) return null;
    const total = parsedSVG.components.length;
    const icons = parsedSVG.components.flatMap((c, i) => (c.isIcon ? [i + 1] : []));
    if (!total || !icons.length) return null;
    if (icons.length === 1) return fill(t.app.logomarkOne, { index: icons[0], total });
    return fill(t.app.logomarkMany, { count: icons.length, total });
  }, [parsedSVG, t]);

  const visualCenter = showVisualCenter ? metrics?.visualCenter ?? null : null;

  const toggleGeometry = (key: keyof GeometryOptions) => {
    markChange(`geometry:${String(key)}`, labelFor(key));
    setGeometryOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateStyle = (key: keyof GeometryOptions, style: GeometryStyle) => {
    markChange(`style:${String(key)}`, fill(activeT().history.styleOf, { label: labelFor(key) }));
    setGeometryStyles((prev) => ({ ...prev, [key]: style }));
  };

  const handleResetSvgModifications = useCallback(() => {
    markChange("appearance", activeT().history.appearance);
    setSvgColorOverride(null); setSvgOutlineMode(false); setSvgOutlineWidth(1);
    setSvgOutlineDash([]); setSvgOutlineLineCap('butt');
  }, [markChange]);

  const handleClearspaceChange = useCallback((config: ClearspaceConfig) => {
    markChange("clearspace", activeT().history.clearspace);
    setClearspaceConfig(config);
  }, [markChange]);

  const handleGuideScaleChange = useCallback((value: number) => {
    markChange("guideScale", activeT().history.guideScale);
    setGuideScale(value);
  }, [markChange]);

  const handleLogoSizeOptionChange = useCallback((option: LogoSizeOption) => {
    markChange("logoSize", activeT().history.logoSize);
    setLogoSizeOption(option);
  }, [markChange]);

  // --- Construction list ----------------------------------------------------
  const activeGeometryCount = useMemo(
    () => (GEOMETRY_KEYS as readonly (keyof GeometryOptions)[]).filter((k) => geometryOptions[k]).length,
    [geometryOptions],
  );

  const clearAllGeometry = useCallback(() => {
    markChange("clear-geometry", activeT().history.clearConstructions);
    setGeometryOptions((prev) => {
      const updated = { ...prev };
      (Object.keys(updated) as (keyof GeometryOptions)[]).forEach((k) => { updated[k] = false; });
      return updated;
    });
    toast.success(activeT().toast.constructionsCleared, { description: activeT().toast.constructionsClearedDescription });
  }, [markChange]);

  const filteredGroups = useMemo(() => {
    const query = normalize(geometryQuery.trim());
    return effectiveGeometryGroups
      .map((group) => {
        const tierOk = geometryFilter === "basic" ? group.tier === "basic"
          : geometryFilter === "advanced" ? group.tier === "advanced"
          : true;
        const keys = !tierOk ? [] : group.keys.filter((key) => {
          if (geometryFilter === "active" && !geometryOptions[key]) return false;
          return !query || normalize(t.geometry[key as keyof Translations["geometry"]] ?? labelFor(key)).includes(query);
        });
        return { ...group, visibleKeys: keys, activeCount: group.keys.filter((k) => geometryOptions[k]).length };
      })
      .filter((group) => group.visibleKeys.length > 0);
  }, [geometryQuery, geometryFilter, geometryOptions, t]);

  /** While searching or filtering, every matching group stays open. */
  const isFiltering = geometryQuery.trim() !== "" || geometryFilter !== "all";
  const visibleGeometryCount = filteredGroups.reduce((sum, g) => sum + g.visibleKeys.length, 0);

  // Without a logo there is nothing to build or publish.
  useEffect(() => {
    if (!parsedSVG && tab !== "analisar") setTab("analisar");
  }, [parsedSVG, tab]);

  // The comparison only takes the canvas while there is something to compare.
  useEffect(() => {
    if (!compareView && compareCanvas) setCompareCanvas(false);
  }, [compareView, compareCanvas]);

  const compareOnCanvas = compareCanvas && compareView !== null;

  const fileSummary = parsedSVG ? (
    <>
      {plural(parsedSVG.components.length, t.app.componentOne, t.app.componentOther)}
      {parsedSVG.segments.length > 0 && ` · ${fill(t.app.pointsSuffix, { n: parsedSVG.segments.length })}`}
      {originalLongestSide ? ` · ${Math.round(originalLongestSide)} px` : ""}
    </>
  ) : null;

  const inputPanel = (
    <SvgInputPanel
      onLoad={handleInputLoaded}
      activeName={fileName}
      pasteShortcut={false}
    />
  );

  const sidebarContent = (
    <>
      {/* Cabeçalho do cartão: o modo atual em rótulo micro e, embaixo, o que
          ele reúne. As abas, desfazer, idioma e exportar moram na fila de
          título, acima do espaço de trabalho. */}
      <div className="px-5 pt-4 pb-1">
        <div className="card-head">
          <span className="label truncate">{t.app[currentTab.label]}</span>
          {!isMobile && (
            <span className="card-actions -mr-1.5">
              <button
                type="button"
                onClick={() => setLeftPanelOpen(false)}
                className="ctl ctl-plain ctl-icon text-muted-foreground"
                aria-label={t.app.closePanel}
                title={t.app.closePanel}
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
        <p className="text-footnote text-muted-foreground mt-1">
          {parsedSVG ? t.app[currentTab.hint] : t.app.emptyHint}
        </p>
      </div>

      {/* As seções correm numa coluna só, separadas por um fio. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 pt-2 pb-4">
        {/* ---------------------------------------------------------------- */}
        {tab === "analisar" && (
          <>
            {/* Entrada */}
            <Section
              label={t.app.sectionInput}
              tooltip={t.app.sectionInputHint}
              {...sectionProps("analisar", "entrada")}
            >
              {inputPanel}
            </Section>

            {parsedSVG && (
              <>
                <div className={RULE} />

                {/* Diagnóstico */}
                <DiagnosisPanel
                  diagnosis={diagnosis}
                  suggestions={diagnosisSuggestions}
                  loading={diagnosisLoading}
                  error={diagnosisError}
                  onEnableGeometries={handleEnableGeometries}
                  fileName={fileName ?? undefined}
                  {...sectionProps("analisar", "diagnostico")}
                />

                <div className={RULE} />

                {/* Métricas */}
                <MetricsPanel
                  metrics={metrics}
                  loading={metricsLoading}
                  error={metricsError}
                  showVisualCenter={showVisualCenter}
                  onShowVisualCenterChange={(value) => { markChange("visualCenter", activeT().history.visualCenter); setShowVisualCenter(value); }}
                  {...sectionProps("analisar", "metricas")}
                />

                <div className={RULE} />

                {/* Área de respiro */}
                <ClearspacePanel
                  units={referenceUnits}
                  bounds={logoBox}
                  svg={parsedSVG.originalSVG}
                  artboard={parsedSVG.artboard ?? null}
                  config={clearspaceConfig}
                  onConfigChange={handleClearspaceChange}
                  loading={metricsLoading}
                  {...sectionProps("analisar", "respiro")}
                />

                <div className={RULE} />

                {/* Tamanho mínimo */}
                <MinSizePanel
                  units={referenceUnits}
                  bounds={logoBox}
                  svg={parsedSVG.originalSVG}
                  artboard={parsedSVG.artboard ?? null}
                  loading={metricsLoading}
                  {...sectionProps("analisar", "tamanho-minimo")}
                />

                <div className={RULE} />

                {/* Comparar */}
                <ComparePanel
                  parsedSVG={parsedSVG}
                  nameA={fileName ?? t.compare.versionA}
                  canvasMode={compareCanvas}
                  onCanvasModeChange={setCompareCanvas}
                  onViewStateChange={setCompareView}
                  {...sectionProps("analisar", "comparar")}
                />
              </>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {tab === "construir" && parsedSVG && (
          <>
            {/* Tamanho e guias: o quadro em que tudo é desenhado, sempre à vista */}
            <OutputSizeControl
              logoSizeOption={logoSizeOption}
              onLogoSizeOptionChange={handleLogoSizeOptionChange}
              originalLongestSide={originalLongestSide}
              estimate={sizeEstimateLabel}
              guideScale={guideScale}
              onGuideScaleChange={handleGuideScaleChange}
            />

            <div className={RULE} />

            {/* Grade */}
            <div className="pb-6">
              <SectionLabel label={t.app.sectionGrid} tooltip={t.app.sectionGridHint} />
              <div className="flex items-center gap-2 flex-wrap">
                <Switch
                  checked={showGrid}
                  onCheckedChange={(value) => { markChange("grid", activeT().history.grid); setShowGrid(value); }}
                  aria-label={t.app.showGrid}
                />
                {showGrid && (
                  <>
                    <ToolInput
                      type="number" min={GRID_MIN} max={GRID_MAX} value={subdivDraft ?? String(gridSubdivisions)}
                      onChange={(e) => {
                        // Keep a free-typing draft; commit live only when already in range.
                        const raw = e.target.value;
                        setSubdivDraft(raw);
                        const n = parseInt(raw, 10);
                        if (Number.isFinite(n) && n >= GRID_MIN && n <= GRID_MAX) {
                          markChange("gridSubdivisions", activeT().history.gridSubdivisions);
                          setGridSubdivisions(n);
                        }
                      }}
                      onBlur={() => {
                        if (subdivDraft !== null) {
                          markChange("gridSubdivisions", activeT().history.gridSubdivisions);
                          setGridSubdivisions(Math.min(GRID_MAX, Math.max(GRID_MIN, clampSubdivisions(parseInt(subdivDraft, 10)))));
                          setSubdivDraft(null);
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                      placeholder={`${GRID_MIN}–${GRID_MAX}`}
                      title={fill(t.app.subdivisionsTitle, { min: GRID_MIN, max: GRID_MAX })}
                      mono size="sm"
                      aria-label={fill(t.app.subdivisionsAria, { min: GRID_MIN, max: GRID_MAX })}
                      className="h-7 w-14 shrink-0"
                    />
                    {logomarkLabel && (
                      <span className="chip chip-outline" title={t.app.logomarkHint}>
                        {logomarkLabel}
                      </span>
                    )}
                  </>
                )}
              </div>
              {showGrid && (
                <p className="text-callout text-muted-foreground mt-1">{fill(t.app.subdivisionsRange, { min: GRID_MIN, max: GRID_MAX })}</p>
              )}
            </div>

            <div className={RULE} />

            {/* Aparência do SVG */}
            <Section
              label={t.app.appearance}
              meta={(svgColorOverride || svgOutlineMode || !useRealDataInterpretation)
                ? t.app.appearanceModified
                : undefined}
              {...sectionProps("construir", "aparencia")}
            >
              <div className="space-y-5">
                {/* Cor */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="label">{t.app.color}</span>
                    <button
                      type="button"
                      onClick={handleResetSvgModifications}
                      className="ctl ctl-plain ctl-icon ctl-sm ml-auto text-muted-foreground"
                      title={t.app.resetAppearance}
                      aria-label={t.app.resetAppearanceAria}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { name: t.app.colorYellow, color: "#F0FF00" }, { name: t.app.colorBlack, color: "#000000" }, { name: t.app.colorWhite, color: "#ffffff" },
                      { name: t.app.colorRed, color: "#e53e3e" }, { name: t.app.colorBlue, color: "#3182ce" },
                      { name: t.app.colorGreen, color: "#38a169" }, { name: t.app.colorGray, color: "#718096" },
                      { name: t.app.colorOrange, color: "#ED8936" }, { name: t.app.colorPurple, color: "#805AD5" },
                      { name: t.app.colorPink, color: "#D53F8C" }, { name: t.app.colorTeal, color: "#319795" },
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset.color}
                        onClick={() => { markChange("svgColor", activeT().history.svgColor); setSvgColorOverride(preset.color); }}
                        aria-label={preset.name}
                        aria-pressed={svgColorOverride === preset.color}
                        className="h-5 w-5 rounded-sm shadow-hairline press transition-[transform,box-shadow] duration-fast ease-out"
                        style={{
                          backgroundColor: preset.color,
                          boxShadow: svgColorOverride === preset.color
                            ? '0 0 0 2px hsl(var(--card)), 0 0 0 3.5px hsl(var(--foreground))'
                            : undefined,
                          transform: svgColorOverride === preset.color ? 'scale(1.1)' : undefined,
                        }}
                        title={preset.name}
                      />
                    ))}
                    <div className="relative h-5 w-5">
                      <input
                        type="color" value={svgColorOverride || "#000000"}
                        onChange={(e) => { markChange("svgColor", activeT().history.svgColor); setSvgColorOverride(e.target.value); }}
                        aria-label={t.app.customColor}
                        className="absolute inset-0 h-5 w-5 rounded-sm bg-transparent cursor-pointer opacity-0"
                      />
                      <div className="h-5 w-5 rounded-sm border border-dashed border-separator-strong flex items-center justify-center pointer-events-none"
                        style={{
                          ...(svgColorOverride && !["#000000","#ffffff","#e53e3e","#3182ce","#38a169","#718096","#ED8936","#805AD5","#D53F8C","#319795"].includes(svgColorOverride)
                            ? { backgroundColor: svgColorOverride, borderStyle: "solid" } : {}),
                        }}
                      >
                        <span className="text-caption leading-none text-muted-foreground">+</span>
                      </div>
                    </div>
                    {svgColorOverride && (
                      <button
                        type="button"
                        onClick={() => { markChange("svgColor", activeT().history.svgColor); setSvgColorOverride(null); }}
                        title={t.app.clearColor}
                        aria-label={t.app.clearColor}
                        className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contorno */}
                <div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="svg-outline"
                      checked={svgOutlineMode}
                      onCheckedChange={(value) => { markChange("outline", activeT().history.outline); setSvgOutlineMode(value); }}
                    />
                    <label htmlFor="svg-outline" className="text-callout text-foreground cursor-pointer">
                      {svgOutlineMode ? t.app.outline : t.app.fill}
                    </label>
                  </div>
                  {svgOutlineMode && (
                    <div className="mt-2 space-y-2">
                      <div className={SUB_ROW}>
                        <span className="label w-11 shrink-0">{t.app.stroke}</span>
                        <Slider
                          min={1} max={50} step={1} value={[svgOutlineWidth * 10]}
                          onValueChange={(v) => { markChange("outlineWidth", activeT().history.outlineWidth); setSvgOutlineWidth(v[0] / 10); }}
                          className="flex-1" aria-label={t.app.outlineWidthAria}
                        />
                        <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{svgOutlineWidth.toFixed(1)}</span>
                      </div>
                      <div className="flex gap-1">
                        {[
                          { label: t.app.dashSolid, value: [] as number[] }, { label: t.app.dashDashed, value: [6, 4] },
                          { label: t.app.dashDotted, value: [2, 3] }, { label: t.app.dashMixed, value: [8, 3, 2, 3] },
                        ].map((preset) => {
                          const on = JSON.stringify(svgOutlineDash) === JSON.stringify(preset.value);
                          return (
                            <button
                              type="button" key={preset.value.join("-") || "solid"}
                              onClick={() => { markChange("outlineDash", activeT().history.outlineDash); setSvgOutlineDash(preset.value); }}
                              aria-pressed={on}
                              className={`ctl ctl-sm flex-1 px-0 ${on ? 'ctl-active' : 'ctl-plain text-muted-foreground hover:text-foreground'}`}
                            >{preset.label}</button>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        {[
                          { label: t.app.capButt, value: "butt" as const }, { label: t.app.capRound, value: "round" as const },
                          { label: t.app.capSquare, value: "square" as const },
                        ].map((preset) => {
                          const on = svgOutlineLineCap === preset.value;
                          return (
                            <button
                              type="button" key={preset.value}
                              onClick={() => { markChange("outlineCap", activeT().history.outlineCap); setSvgOutlineLineCap(preset.value); }}
                              aria-pressed={on}
                              className={`ctl ctl-sm flex-1 px-0 ${on ? 'ctl-active' : 'ctl-plain text-muted-foreground hover:text-foreground'}`}
                            >{preset.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interpretação */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="use-real-data"
                    checked={useRealDataInterpretation}
                    onCheckedChange={(value) => { markChange("interpretation", activeT().history.interpretation); setUseRealDataInterpretation(value); }}
                  />
                  <label htmlFor="use-real-data" className="text-callout text-foreground cursor-pointer">
                    {useRealDataInterpretation ? t.app.realPathData : t.app.boundingBox}
                  </label>
                </div>
              </div>
            </Section>

            <div className={RULE} />

            {/* Construções */}
            <Section
              label={t.app.constructions}
              tooltip={t.app.constructionsHint}
              meta={
                <span aria-live="polite">
                  {plural(activeGeometryCount, t.app.activeOne, t.app.activeOther)}
                </span>
              }
              action={
                <button
                  type="button"
                  onClick={clearAllGeometry}
                  disabled={activeGeometryCount === 0}
                  className="ctl ctl-plain ctl-icon text-muted-foreground"
                  title={t.app.clearAllConstructions}
                  aria-label={t.app.clearAllConstructions}
                >
                  <Eraser className="h-3.5 w-3.5" />
                </button>
              }
              {...sectionProps("construir", "construcoes")}
            >
              <div>
              {inspectedGeometry && (
                <div className="flex items-center gap-2 mb-3 rounded-md bg-canvas px-3 py-2">
                  <span className="label shrink-0">{t.app.inspecting}</span>
                  <span className="text-callout text-foreground truncate flex-1">{labelFor(inspectedGeometry)}</span>
                  <button
                    type="button"
                    className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                    aria-label={t.app.clearInspection}
                    title={t.app.clearInspection}
                    onClick={() => setInspectedGeometry(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={geometryQuery}
                  onChange={(e) => setGeometryQuery(e.target.value)}
                  placeholder={t.app.searchConstruction}
                  aria-label={t.app.searchConstructionAria}
                  className="field w-full pl-8"
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex flex-1 min-w-0 flex-wrap items-center gap-x-3 gap-y-1" role="group" aria-label={t.app.filterConstructions}>
                  {GEOMETRY_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      className={quietTab(geometryFilter === filter.value)}
                      aria-pressed={geometryFilter === filter.value}
                      title={filter.value === "active" ? t.app.filterShowActive : fill(t.app.filterShow, { label: t.app[filter.key].toLowerCase() })}
                      onClick={() => setGeometryFilter(filter.value)}
                    >
                      {t.app[filter.key]}
                    </button>
                  ))}
                </div>
              </div>

              {visibleGeometryCount === 0 ? (
                <p className="text-callout text-muted-foreground px-1 py-2">
                  {geometryFilter === "active" && !geometryQuery.trim()
                    ? t.app.noneActive
                    : t.app.noneMatch}
                </p>
              ) : (
                <div className="space-y-0.5 -mx-1">
                  {filteredGroups.map((group) => {
                    const open = isFiltering || (openGroups[group.id] ?? false);
                    const groupName = t.geometryGroups[group.id];
                    return (
                      <Collapsible
                        key={group.id}
                        open={open}
                        onOpenChange={(value) => setOpenGroups((p) => ({ ...p, [group.id]: value }))}
                      >
                        <div className="flex items-center w-full gap-0.5">
                          <CollapsibleTrigger
                            className="flex h-9 flex-1 min-w-0 items-center gap-2 rounded-sm px-1 text-left transition-colors duration-fast ease-out hover:bg-fill outline-none focus-visible:shadow-focus disabled:cursor-default"
                            disabled={isFiltering}
                          >
                            <span className="text-subhead text-foreground truncate">{groupName}</span>
                            <span className="ml-auto text-footnote text-muted-foreground tabular-nums shrink-0">
                              {group.activeCount}/{group.keys.length}
                            </span>
                            <ChevronDown className={CHEVRON_CLS} style={chevronStyle(open)} strokeWidth={2} />
                          </CollapsibleTrigger>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); markChange("reset-group", fill(t.history.resetGroup, { group: groupName })); resetGroup(group.keys); }}
                            className="ctl ctl-plain ctl-icon ctl-sm text-muted-foreground"
                            title={fill(t.app.resetGroup, { group: groupName })}
                            aria-label={fill(t.app.resetGroupAria, { group: groupName })}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <CollapsibleContent className="space-y-0 pb-1">
                          {group.visibleKeys.map((key) => (
                            <div key={key}>
                              <label className={`row cursor-pointer pl-2 ${inspectedGeometry === key ? 'is-active' : ''}`}>
                                <Checkbox checked={!!geometryOptions[key]} onCheckedChange={() => toggleGeometry(key)} />
                                <span className="text-callout text-foreground truncate">
                                  {labelFor(key)}
                                </span>
                                {renderErrors[key] && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span
                                        tabIndex={0}
                                        role="img"
                                        aria-label={fill(t.app.drawErrorAria, { message: renderErrors[key] ?? "" })}
                                        onClick={(e) => e.preventDefault()}
                                        className="ml-auto inline-flex shrink-0 text-destructive rounded-sm outline-none focus-visible:shadow-focus"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[240px] text-footnote">
                                      {fill(t.app.drawError, { message: renderErrors[key] ?? "" })}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span
                                  className={`${renderErrors[key] ? "" : "ml-auto "}h-2.5 w-2.5 shrink-0 rounded-pill shadow-hairline`}
                                  style={{ backgroundColor: (geometryStyles[key] ?? DEFAULT_GEOMETRY_STYLES[key] ?? FALLBACK_STYLE).color }}
                                />
                              </label>
                              {geometryOptions[key] && (
                                <>
                                  <StyleControl
                                    style={geometryStyles[key] ?? DEFAULT_GEOMETRY_STYLES[key] ?? FALLBACK_STYLE}
                                    onChange={(s) => updateStyle(key, s)}
                                  />
                                  {key === "parallelFlowLines" && (
                                    <div className="pl-8 pr-2 pb-2">
                                      <div className={SUB_ROW}>
                                        <span className="label w-11 shrink-0">{t.app.flowLines}</span>
                                        <Slider
                                          min={1} max={20} step={1} value={[maxFlowLines]}
                                          onValueChange={(v) => { markChange("maxFlowLines", activeT().history.flowLines); setMaxFlowLines(v[0]); }}
                                          className="flex-1" aria-label={t.app.flowLinesAria}
                                        />
                                        <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{maxFlowLines}</span>
                                      </div>
                                    </div>
                                  )}
                                  {key === "modularScale" && (
                                    <div className="pl-8 pr-2 pb-2">
                                      <Select
                                        value={String(modularScaleRatio)}
                                        onValueChange={(v) => { markChange("modularScale", activeT().history.modularScale); setModularScaleRatio(parseFloat(v)); }}
                                      >
                                        <SelectTrigger className={SELECT_TRIGGER} aria-label={t.app.modularRatioAria}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1.25" className="text-callout">1.250 ({t.app.ratioMinorThird})</SelectItem>
                                          <SelectItem value="1.333" className="text-callout">1.333 ({t.app.ratioPerfectFourth})</SelectItem>
                                          <SelectItem value="1.5" className="text-callout">1.500 ({t.app.ratioPerfectFifth})</SelectItem>
                                          <SelectItem value="1.618" className="text-callout">1.618 ({t.app.ratioGolden})</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                  {key === "safeZone" && (
                                    <div className="pl-8 pr-2 pb-2">
                                      <div className={SUB_ROW}>
                                        <span className="label w-11 shrink-0">{t.app.margin}</span>
                                        <Slider
                                          min={1} max={30} step={1} value={[Math.round(safeZoneMargin * 100)]}
                                          onValueChange={(v) => { markChange("safeZone", activeT().history.safeZone); setSafeZoneMargin(v[0] / 100); }}
                                          className="flex-1" aria-label={t.app.safeZoneMarginAria}
                                        />
                                        <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{Math.round(safeZoneMargin * 100)}%</span>
                                      </div>
                                    </div>
                                  )}
                                  {key === "anchorPoints" && (
                                    <div className="pl-8 pr-2 pb-2">
                                      <div className={SUB_ROW}>
                                        <span className="label w-11 shrink-0">{t.app.size}</span>
                                        <Slider
                                          min={1} max={15} step={1} value={[anchorPointSize]}
                                          onValueChange={(v) => { markChange("anchorPointSize", activeT().history.anchorSize); setAnchorPointSize(v[0]); }}
                                          className="flex-1" aria-label={t.app.anchorSizeAria}
                                        />
                                        <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{anchorPointSize}</span>
                                      </div>
                                    </div>
                                  )}
                                  {key === "bezierHandles" && (
                                    <div className="pl-8 pr-2 pb-2 space-y-1.5">
                                      <div className={SUB_ROW}>
                                        <span className="label w-11 shrink-0">{t.app.size}</span>
                                        <Slider
                                          min={1} max={10} step={0.5} value={[bezierHandleSize]}
                                          onValueChange={(v) => { markChange("bezierHandleSize", activeT().history.handleSize); setBezierHandleSize(v[0]); }}
                                          className="flex-1" aria-label={t.app.handleSizeAria}
                                        />
                                        <span className="text-value text-muted-foreground w-9 shrink-0 text-right">{bezierHandleSize}</span>
                                      </div>
                                      <label className="flex items-center justify-between gap-2 cursor-pointer">
                                        <span className="label">{t.app.anchors}</span>
                                        <Switch
                                          checked={bezierShowAnchors}
                                          onCheckedChange={(value) => { markChange("bezierAnchors", activeT().history.anchors); setBezierShowAnchors(value); }}
                                        />
                                      </label>
                                      <label className="flex items-center justify-between gap-2 cursor-pointer">
                                        <span className="label">{t.app.handles}</span>
                                        <Switch
                                          checked={bezierShowHandles}
                                          onCheckedChange={(value) => { markChange("bezierHandles", activeT().history.handles); setBezierShowHandles(value); }}
                                        />
                                      </label>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
              </div>
            </Section>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {tab === "publicar" && parsedSVG && (
          <>
            {/* Folha de marca */}
            <BrandSheetPanel
              parsedSVG={parsedSVG}
              settings={sceneSettings}
              metrics={metrics}
              fileName={fileName ?? undefined}
              {...sectionProps("publicar", "folha")}
            />

            <div className={RULE} />

            {/* Exportação */}
            <Section
              label={t.app.exportSection}
              tooltip={t.app.exportSectionHint}
              {...sectionProps("publicar", "exportacao")}
            >
              <div className="space-y-2">
                <button type="button" onClick={handleExportLayered} className="ctl ctl-filled w-full">
                  <Download className="h-3.5 w-3.5" /> {t.app.layeredSvg}
                </button>
                <div className="flex gap-1.5">
                  <button type="button" onClick={handleExport} className="ctl ctl-outline ctl-sm flex-1">{t.app.screenSvg}</button>
                  <button type="button" onClick={handleExportPDF} className="ctl ctl-outline ctl-sm flex-1">PDF</button>
                </div>
                <button type="button" onClick={handleExportOutlineSVG} className="ctl ctl-outline ctl-sm w-full">
                  <Layers className="h-3.5 w-3.5" /> {t.app.outlineSvg}
                </button>
                <div className="flex gap-1.5">
                  {[1, 2, 4].map((scale) => (
                    <button
                      type="button"
                      key={scale}
                      onClick={() => handleExportPNG(scale)}
                      className="ctl ctl-outline ctl-sm flex-1"
                    >
                      PNG {scale}x
                    </button>
                  ))}
                </div>
                {sizeEstimateLabel && (
                  <p className="text-callout text-muted-foreground tabular-nums">{sizeEstimateLabel}</p>
                )}
              </div>
            </Section>
          </>
        )}
      </div>
    </>
  );

  const presetsOpen = isMobile ? rightSheetOpen : rightPanelOpen;
  const togglePresets = () => (isMobile ? setRightSheetOpen(!rightSheetOpen) : setRightPanelOpen(!rightPanelOpen));
  const panelShown = isMobile ? sidebarOpen : leftPanelOpen;
  const togglePanel = () => (isMobile ? setSidebarOpen(!sidebarOpen) : setLeftPanelOpen(!leftPanelOpen));
  const panelToggleLabel = panelShown ? t.app.closePanel : t.app.openPanel;
  const presetsToggleLabel = fill(presetsOpen ? t.common.closePanelOf : t.common.openPanelOf, { name: t.app.presets.toLowerCase() });
  const undoTitle = history.undoLabel ? fill(t.app.undoWhat, { label: history.undoLabel }) : t.app.undo;
  const redoTitle = history.redoLabel ? fill(t.app.redoWhat, { label: history.redoLabel }) : t.app.redo;

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      {/* ---- Fila de título: o nome grande em peso regular com a trilha ao
          lado, os três modos em abas de texto e, à direita, os botões
          quadrados e a única ação amarela da tela. ---- */}
      <div className="shrink-0 px-4 sm:px-6 xl:px-10 pt-1 pb-3 md:pb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-[280px] items-baseline gap-x-4 gap-y-1 flex-wrap">
          <h1
            className="min-w-0 max-w-full truncate text-[28px] md:text-[40px] leading-[1.1] font-normal tracking-[-0.015em] text-foreground"
            title={fileName ?? undefined}
          >
            {fileName ?? "UNBSGRID"}
          </h1>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 text-subhead text-muted-foreground">
            <span className="shrink-0">UNBSGRID</span>
            <span className="text-separator-strong" aria-hidden="true">/</span>
            <span className="truncate text-foreground/70 tabular-nums">
              {parsedSVG ? fileSummary : t.app.noSvgLoaded}
            </span>
          </nav>
        </div>

        <div className="flex w-full md:w-auto flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className={QUIET_TABLIST} role="tablist" aria-label={t.app.panelSections}>
            {SIDEBAR_TABS.map((item) => {
              const disabled = !parsedSVG && item.id !== "analisar";
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  disabled={disabled}
                  title={disabled ? t.app.tabDisabled : t.app[item.hint]}
                  className={quietTab(tab === item.id)}
                  onClick={() => {
                    setTab(item.id);
                    if (isMobile) setSidebarOpen(true);
                    else setLeftPanelOpen(true);
                  }}
                >
                  {t.app[item.label]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2.5">
            <button
              type="button"
              onClick={togglePanel}
              aria-pressed={panelShown}
              className={TITLE_ICON_BTN}
              aria-label={panelToggleLabel}
              title={panelToggleLabel}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              className={TITLE_ICON_BTN}
              title={undoTitle}
              aria-label={history.undoLabel ? fill(t.app.undoWhatAria, { label: history.undoLabel.toLowerCase() }) : t.app.undo}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              className={TITLE_ICON_BTN}
              title={redoTitle}
              aria-label={history.redoLabel ? fill(t.app.redoWhatAria, { label: history.redoLabel.toLowerCase() }) : t.app.redo}
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <LanguageSelect />
            <button
              type="button"
              onClick={togglePresets}
              aria-pressed={presetsOpen}
              className={TITLE_ICON_BTN}
              aria-label={presetsToggleLabel}
              title={presetsToggleLabel}
            >
              <PanelRight className="h-4 w-4" />
            </button>
            {/* A única ação que confirma nesta tela: por isso é a amarela. */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExportLayered}
                disabled={!parsedSVG}
                className="ctl ctl-tinted ctl-icon w-9 h-9 md:h-10 sm:w-auto sm:px-4 rounded-md gap-2"
                aria-label={t.app.exportSvg}
                title={t.app.exportSvg}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t.app.exportSvg}</span>
              </button>
              <ExportMenu disabled={!parsedSVG} onExport={handleExportKind} sizeHints={exportSizeHints} />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Espaço de trabalho: dois cartões brancos flutuando na página e,
          entre eles, a moldura rebaixada do canvas. ---- */}
      <div className="relative flex flex-1 min-h-0 gap-4 xl:gap-5 px-4 sm:px-6 xl:px-10 pb-4 xl:pb-6">
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[340px] max-w-[92vw] gap-0 p-0 flex flex-col">
            <SheetHeader className="sr-only">
              <SheetTitle>{t.app.panel}</SheetTitle>
              <SheetDescription>{t.app.panelDescription}</SheetDescription>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      ) : leftPanelOpen ? (
        <aside
          className="material-card p-0 w-[300px] min-w-[300px] min-h-0 flex flex-col overflow-hidden text-foreground"
          aria-label={t.app.panel}
        >
          {sidebarContent}
        </aside>
      ) : null}

      <main className="relative flex-1 min-w-0 min-h-0">
        {/* O canvas continua montado por baixo da comparação: voltar não perde
            zoom, enquadramento nem as cotas já medidas. */}
        <div className={`h-full w-full ${compareOnCanvas ? 'hidden' : ''}`}>
          <PreviewCanvas
            parsedSVG={parsedSVG} clearspaceValue={clearspaceValue} clearspaceUnit={clearspaceUnit}
            showGrid={showGrid} gridSubdivisions={gridSubdivisions}
            geometryOptions={geometryOptions} geometryStyles={geometryStyles}
            canvasBackground={canvasBackground} modularScaleRatio={modularScaleRatio}
            safeZoneMargin={safeZoneMargin} svgColorOverride={svgColorOverride}
            useRealDataInterpretation={useRealDataInterpretation}
            svgOutlineMode={svgOutlineMode} svgOutlineWidth={svgOutlineWidth}
            svgOutlineDash={svgOutlineDash} svgOutlineLineCap={svgOutlineLineCap}
            maxFlowLines={maxFlowLines} anchorPointSize={anchorPointSize}
            bezierHandleSize={bezierHandleSize}
            bezierShowAnchors={bezierShowAnchors}
            bezierShowHandles={bezierShowHandles}
            guideScale={guideScale}
            onProjectReady={onProjectReady}
            onRenderErrors={handleRenderErrors}
            visualCenter={visualCenter}
            isInverted={isInverted}
            onInvertToggle={parsedSVG ? handleInvert : undefined}
            onCanvasBackgroundChange={(background) => { markChange("canvasBackground", activeT().history.canvasBackground); setCanvasBackground(background); }}
            measureActive={measuring}
            onMeasureActiveChange={setMeasuring}
            showRulers={rulersOn}
            onShowRulersChange={setRulersOn}
            inspectActive={inspecting}
            onInspectActiveChange={setInspecting}
            onInspectConstruction={setInspectedGeometry}
            constructionLabel={labelFor}
            extraShortcuts={pageShortcuts(t)}
            emptyState={
              <SvgInputPanel
                onLoad={handleInputLoaded}
                activeName={fileName}
                pasteShortcut={false}
                showRecents={false}
                className="w-full max-w-[420px] material-card"
              />
            }
          />
        </div>

        {compareOnCanvas && compareView && (
          <div className="h-full w-full material-card card-body">
            <div className="card-head">
              <span className="label truncate" title={`${compareView.nameA} × ${compareView.nameB}`}>
                {fill(t.app.comparisonTitle, { a: compareView.nameA, b: compareView.nameB })}
              </span>
              <span className="card-actions">
                <button
                  type="button"
                  className="ctl ctl-plain ctl-icon"
                  aria-label={t.app.backToCanvas}
                  title={t.app.backToCanvas}
                  onClick={() => setCompareCanvas(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
            <div className="metric metric-lg">
              <span className="metric-value">{compareView.matchPercent.toFixed(1)}%</span>
              <span className="metric-caption">{t.app.comparisonMatchCaption}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-xl bg-canvas p-5 flex items-center justify-center">
              <CompareView
                srcA={compareView.srcA}
                srcB={compareView.srcB}
                labelA={compareView.labelA}
                labelB={compareView.labelB}
                mode={compareView.mode}
                frameAspect={compareView.frameAspect}
                overlayOpacity={compareView.overlayOpacity}
                className="w-full max-w-[760px]"
              />
            </div>
            <p className="text-callout text-muted-foreground">
              {t.app.comparisonFooter}
            </p>
          </div>
        )}
      </main>

      {/* Painel direito: a biblioteca de presets, que fecha para devolver a
          largura ao canvas. O botão de abrir fica na fila de título. */}
      <RightPanel
        open={isMobile ? rightSheetOpen : rightPanelOpen}
        onOpenChange={isMobile ? setRightSheetOpen : setRightPanelOpen}
        asSheet={isMobile}
        title={t.app.presets}
        description={t.app.presetsDescription}
      >
        <PresetManager
          activePreset={activePreset}
          isModified={isPresetModified}
          onSaveClick={() => setSaveDialogOpen(true)}
          onLoadClick={() => setLoadDialogOpen(true)}
          onRevert={handleRevertPreset}
          presets={presets}
          onApplyPreset={applyPreset}
        />
      </RightPanel>
      </div>

      <SavePresetDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} existingNames={allPresetNames} onSave={handleSavePreset} />
      <LoadPresetDialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen} presets={presets} activePresetId={activePresetId} onLoad={applyPreset} onDelete={handleDeletePreset} onExport={handleExportPresets} onImportFile={handleImportPresets} />
    </div>
  );
};

export default Index;

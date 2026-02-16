import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import paper from "paper";
import {
  Download,
  Grid3X3,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  Ruler,
  Hexagon,
  Palette,
  RotateCcw,
  Settings2,
} from "lucide-react";
import SVGDropZone from "../components/SVGDropZone";
import PreviewCanvas from "../components/PreviewCanvas";
import UnitSelector from "../components/UnitSelector";
import InfoTooltip from "../components/InfoTooltip";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Slider } from "../components/ui/slider";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { parseSVG, invertComponents, exportSVG, type ParsedSVG, type ClearspaceUnit } from "../lib/svg-engine";
import {
  getBuiltinPresets,
  loadPresetsFromStorage,
  savePresetsToStorage,
  createPreset,
  type GeometryPreset,
} from "../lib/preset-engine";
import PresetManager from "../components/PresetManager";
import SavePresetDialog from "../components/SavePresetDialog";
import LoadPresetDialog from "../components/LoadPresetDialog";

export type { GeometryOptions, GeometryStyle, GeometryStyles, CanvasBackground } from '../types/geometry';
import type { GeometryOptions, GeometryStyle, GeometryStyles, CanvasBackground } from '../types/geometry';

// Theme constants for UNBSGRID
const THEME = {
  bg: '#FFFFFF',
  text: '#232323',
  accent: '#F0FF00',
  border: '#D0D0C8',
  muted: '#888',
  inputBg: '#F5F5F5',
  hoverBg: '#DDDDD7',
};

const defaultStyles: GeometryStyles = {
  boundingRects: { color: "#d94040", opacity: 0.6, strokeWidth: 1 },
  circles: { color: "#33b380", opacity: 0.5, strokeWidth: 1 },
  centerLines: { color: "#e69a1a", opacity: 0.5, strokeWidth: 1 },
  diagonals: { color: "#b34dd6", opacity: 0.4, strokeWidth: 1 },
  goldenRatio: { color: "#f2c00a", opacity: 0.45, strokeWidth: 1 },
  tangentLines: { color: "#66ccdd", opacity: 0.35, strokeWidth: 0.5 },
  goldenSpiral: { color: "#ff8c42", opacity: 0.5, strokeWidth: 1.5 },
  isometricGrid: { color: "#5eaaf7", opacity: 0.3, strokeWidth: 0.5 },
  bezierHandles: { color: "#ff5577", opacity: 0.6, strokeWidth: 1 },
  typographicProportions: { color: "#88ddaa", opacity: 0.5, strokeWidth: 1 },
  thirdLines: { color: "#aa88ff", opacity: 0.4, strokeWidth: 1 },
  symmetryAxes: { color: "#ff66b2", opacity: 0.5, strokeWidth: 1 },
  angleMeasurements: { color: "#ffaa33", opacity: 0.55, strokeWidth: 1 },
  spacingGuides: { color: "#33ccff", opacity: 0.5, strokeWidth: 1 },
  rootRectangles: { color: "#cc77ff", opacity: 0.45, strokeWidth: 1 },
  modularScale: { color: "#77ddaa", opacity: 0.4, strokeWidth: 1 },
  alignmentGuides: { color: "#ff7744", opacity: 0.4, strokeWidth: 0.8 },
  safeZone: { color: "#44cc88", opacity: 0.35, strokeWidth: 1.2 },
  pixelGrid: { color: "#999999", opacity: 0.2, strokeWidth: 0.5 },
  opticalCenter: { color: "#ff4488", opacity: 0.6, strokeWidth: 1.5 },
  contrastGuide: { color: "#ffcc00", opacity: 0.4, strokeWidth: 1 },
  dynamicBaseline: { color: "#66aadd", opacity: 0.4, strokeWidth: 0.8 },
  fibonacciOverlay: { color: "#e6a833", opacity: 0.45, strokeWidth: 1 },
  kenBurnsSafe: { color: "#ff6644", opacity: 0.35, strokeWidth: 1.2 },
  componentRatioLabels: { color: "#88bbff", opacity: 0.7, strokeWidth: 1 },
  vesicaPiscis: { color: "#bb77cc", opacity: 0.45, strokeWidth: 1 },
  ruleOfOdds: { color: "#77aacc", opacity: 0.35, strokeWidth: 0.8 },
  visualWeightMap: { color: "#cc8844", opacity: 0.3, strokeWidth: 1 },
  anchoringPoints: { color: "#44ddbb", opacity: 0.6, strokeWidth: 1.5 },
  harmonicDivisions: { color: "#aa66dd", opacity: 0.4, strokeWidth: 0.8 },
  parallelFlowLines: { color: "#55aaee", opacity: 0.45, strokeWidth: 0.8 },
  underlyingCircles: { color: "#ee6688", opacity: 0.4, strokeWidth: 1 },
  dominantDiagonals: { color: "#dd7733", opacity: 0.45, strokeWidth: 0.8 },
  curvatureComb: { color: "#77cc55", opacity: 0.5, strokeWidth: 0.5 },
  skeletonCenterline: { color: "#cc55aa", opacity: 0.5, strokeWidth: 1.2 },
  constructionGrid: { color: "#7799dd", opacity: 0.35, strokeWidth: 0.6 },
  pathDirectionArrows: { color: "#ee8844", opacity: 0.55, strokeWidth: 1 },
  tangentIntersections: { color: "#aa55cc", opacity: 0.45, strokeWidth: 0.8 },
  anchorPoints: { color: "#ff5566", opacity: 0.7, strokeWidth: 1 },
};

const geometryLabels: Record<keyof GeometryOptions, string> = {
  boundingRects: "Bounding Rectangles",
  circles: "Inscribed / Circumscribed Circles",
  centerLines: "Center / Axis Lines",
  diagonals: "Diagonal Lines",
  goldenRatio: "Golden Ratio Circles",
  tangentLines: "Tangent Lines",
  goldenSpiral: "Golden Spiral",
  isometricGrid: "Isometric Grid",
  bezierHandles: "Bezier Handles",
  typographicProportions: "Typographic Proportions",
  thirdLines: "Rule of Thirds",
  symmetryAxes: "Symmetry Axes",
  angleMeasurements: "Angle Measurements",
  spacingGuides: "Spacing Guides",
  rootRectangles: "Root Rectangles (√2, √3, √5)",
  modularScale: "Modular Scale",
  alignmentGuides: "Alignment Guides",
  safeZone: "Safe Zone",
  pixelGrid: "Pixel Grid",
  opticalCenter: "Optical Center",
  contrastGuide: "Contrast Guide",
  dynamicBaseline: "Dynamic Baseline Grid",
  fibonacciOverlay: "Fibonacci Overlay",
  kenBurnsSafe: "Ken Burns Safe Area",
  componentRatioLabels: "Component Ratio Labels",
  vesicaPiscis: "Vesica Piscis",
  ruleOfOdds: "Rule of Odds (5ths & 7ths)",
  visualWeightMap: "Visual Weight Map",
  anchoringPoints: "Anchoring Points",
  harmonicDivisions: "Harmonic Divisions",
  parallelFlowLines: "Parallel Flow Lines",
  underlyingCircles: "Underlying Circles",
  dominantDiagonals: "Dominant Diagonals",
  curvatureComb: "Curvature Comb",
  skeletonCenterline: "Skeleton Centerline",
  constructionGrid: "Construction Grid",
  pathDirectionArrows: "Path Direction Arrows",
  tangentIntersections: "Tangent Intersections",
  anchorPoints: "Anchor Points",
};

const geometryGroups: { label: string; keys: (keyof GeometryOptions)[] }[] = [
  {
    label: "Advanced",
    keys: [
      "parallelFlowLines", "underlyingCircles", "dominantDiagonals", "curvatureComb",
      "skeletonCenterline", "constructionGrid", "pathDirectionArrows", "tangentIntersections",
      "anchorPoints", "bezierHandles", "opticalCenter", "visualWeightMap",
    ],
  },
  { label: "Basic", keys: ["boundingRects", "circles", "centerLines", "diagonals", "tangentLines", "anchoringPoints"] },
  { label: "Proportions", keys: ["goldenRatio", "goldenSpiral", "thirdLines", "typographicProportions", "ruleOfOdds"] },
  {
    label: "Measurement",
    keys: ["symmetryAxes", "angleMeasurements", "spacingGuides", "alignmentGuides", "dynamicBaseline", "componentRatioLabels", "harmonicDivisions"],
  },
  { label: "Harmony", keys: ["rootRectangles", "modularScale", "safeZone", "fibonacciOverlay", "vesicaPiscis"] },
  { label: "Grid & Output", keys: ["isometricGrid", "pixelGrid", "contrastGuide", "kenBurnsSafe"] },
];

interface StyleControlProps {
  style: GeometryStyle;
  onChange: (s: GeometryStyle) => void;
}

const StyleControl: React.FC<StyleControlProps> = ({ style, onChange }) => (
  <div className="pl-6 pr-1 pb-1.5" style={{ fontSize: 10 }}>
    <div className="flex items-center gap-1.5 mb-1">
      <span style={{ color: THEME.muted, width: 32 }}>Color</span>
      <input
        type="color"
        value={style.color}
        onChange={(e) => onChange({ ...style, color: e.target.value })}
        className="w-5 h-5 rounded border cursor-pointer"
        style={{ borderColor: THEME.border, backgroundColor: 'transparent' }}
      />
      <span style={{ color: THEME.muted, width: 32 }}>Op</span>
      <Slider
        min={0} max={100} step={1}
        value={[Math.round(style.opacity * 100)]}
        onValueChange={(v) => onChange({ ...style, opacity: v[0] / 100 })}
        className="flex-1"
      />
      <span style={{ color: THEME.muted, width: 24, textAlign: 'right', fontSize: 9 }}>{Math.round(style.opacity * 100)}%</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span style={{ color: THEME.muted, width: 32 }}>Stroke</span>
      <Slider
        min={5} max={50} step={5}
        value={[Math.round(style.strokeWidth * 10)]}
        onValueChange={(v) => onChange({ ...style, strokeWidth: v[0] / 10 })}
        className="flex-1"
      />
      <span style={{ color: THEME.muted, width: 24, textAlign: 'right', fontSize: 9 }}>{style.strokeWidth.toFixed(1)}</span>
    </div>
  </div>
);

const Index = () => {
  const [parsedSVG, setParsedSVG] = useState<ParsedSVG | null>(null);
  const [clearspaceValue, setClearspaceValue] = useState(1);
  const [clearspaceUnit, setClearspaceUnit] = useState<ClearspaceUnit>("logomark");
  const [showGrid, setShowGrid] = useState(false);
  const [gridSubdivisions, setGridSubdivisions] = useState(8);
  const [isInverted, setIsInverted] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState<CanvasBackground>("dark");
  const [modularScaleRatio, setModularScaleRatio] = useState(1.618);
  const [safeZoneMargin, setSafeZoneMargin] = useState(0.1);
  const [maxFlowLines, setMaxFlowLines] = useState(5);
  const [anchorPointSize, setAnchorPointSize] = useState(3);
  const [svgColorOverride, setSvgColorOverride] = useState<string | null>(null);
  const [useRealDataInterpretation, setUseRealDataInterpretation] = useState(true);
  const [svgOutlineMode, setSvgOutlineMode] = useState(false);
  const [svgOutlineWidth, setSvgOutlineWidth] = useState(1);
  const [svgOutlineDash, setSvgOutlineDash] = useState<number[]>([]);
  const [svgOutlineLineCap, setSvgOutlineLineCap] = useState<'butt' | 'round' | 'square'>('butt');
  const [svgSettingsOpen, setSvgSettingsOpen] = useState(false);
  const [geometryOptions, setGeometryOptions] = useState<GeometryOptions>({
    boundingRects: false, circles: false, diagonals: false, goldenRatio: false,
    centerLines: false, tangentLines: false, goldenSpiral: false, isometricGrid: false,
    bezierHandles: false, typographicProportions: false, thirdLines: false,
    symmetryAxes: false, angleMeasurements: false, spacingGuides: false,
    rootRectangles: false, modularScale: false, alignmentGuides: false, safeZone: false,
    pixelGrid: false, opticalCenter: false, contrastGuide: false, dynamicBaseline: false,
    fibonacciOverlay: false, kenBurnsSafe: false, componentRatioLabels: false,
    vesicaPiscis: false, ruleOfOdds: false, visualWeightMap: false, anchoringPoints: false,
    harmonicDivisions: false, parallelFlowLines: false, underlyingCircles: false,
    dominantDiagonals: false, curvatureComb: false, skeletonCenterline: false,
    constructionGrid: false, pathDirectionArrows: false, tangentIntersections: false,
    anchorPoints: false,
  });
  const [geometryStyles, setGeometryStyles] = useState<GeometryStyles>({ ...defaultStyles });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Advanced: true, Basic: false, Proportions: false,
    Measurement: false, Harmony: false, "Grid & Output": false,
  });
  const resetGroup = useCallback((groupKeys: (keyof GeometryOptions)[]) => {
    setGeometryOptions((prev) => {
      const updated = { ...prev };
      groupKeys.forEach((k) => { updated[k] = false; });
      return updated;
    });
    setGeometryStyles((prev) => {
      const updated = { ...prev };
      groupKeys.forEach((k) => { updated[k] = { ...defaultStyles[k] }; });
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

  const currentConfigSnapshot = useMemo(
    () => JSON.stringify({ geometryOptions, geometryStyles, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions }),
    [geometryOptions, geometryStyles, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions],
  );
  const isPresetModified = activePresetId !== null && savedSnapshot !== null && currentConfigSnapshot !== savedSnapshot;
  const activePreset = useMemo(() => presets.find((p) => p.id === activePresetId) || null, [presets, activePresetId]);
  const allPresetNames = useMemo(() => presets.map((p) => p.name), [presets]);

  const applyPreset = useCallback((preset: GeometryPreset) => {
    setGeometryOptions({ ...preset.geometryOptions });
    setGeometryStyles({ ...preset.geometryStyles });
    setClearspaceValue(preset.clearspaceValue);
    setClearspaceUnit(preset.clearspaceUnit);
    setShowGrid(preset.showGrid);
    setGridSubdivisions(preset.gridSubdivisions);
    setActivePresetId(preset.id);
    setSavedSnapshot(
      JSON.stringify({
        geometryOptions: preset.geometryOptions, geometryStyles: preset.geometryStyles,
        clearspaceValue: preset.clearspaceValue, clearspaceUnit: preset.clearspaceUnit,
        showGrid: preset.showGrid, gridSubdivisions: preset.gridSubdivisions,
      }),
    );
  }, []);

  const handleSavePreset = useCallback(
    (name: string, description: string) => {
      const newPreset = createPreset({ name, description, geometryOptions, geometryStyles, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions });
      const updated = [...presets, newPreset];
      setPresets(updated);
      savePresetsToStorage(updated);
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
      savePresetsToStorage(updated);
      if (activePresetId === id) { setActivePresetId(null); setSavedSnapshot(null); }
    },
    [presets, activePresetId],
  );

  const handleRevertPreset = useCallback(() => {
    const preset = presets.find((p) => p.id === activePresetId);
    if (preset) applyPreset(preset);
  }, [presets, activePresetId, applyPreset]);

  const handleSVGLoaded = useCallback((svgString: string) => {
    if (!hiddenCanvasRef.current) {
      const c = document.createElement("canvas"); c.width = 1; c.height = 1;
      hiddenCanvasRef.current = c;
    }
    const parsed = parseSVG(svgString, hiddenCanvasRef.current);
    setParsedSVG(parsed);
    setIsInverted(false);
  }, []);

  const handleInvert = useCallback(() => {
    if (!parsedSVG) return;
    const newComponents = invertComponents(parsedSVG.components);
    setParsedSVG({ ...parsedSVG, components: newComponents });
    setIsInverted(!isInverted);
  }, [parsedSVG, isInverted]);

  const handleExport = useCallback(() => {
    if (!projectRef.current) return;
    const svgString = exportSVG(projectRef.current);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "unbsgrid-export.svg"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPNG = useCallback((scale: number) => {
    if (!projectRef.current) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width * scale; exportCanvas.height = canvas.height * scale;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale); ctx.drawImage(canvas, 0, 0);
    const url = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = `unbsgrid-export-${scale}x.png`; a.click();
  }, []);

  const handleExportOutlineSVG = useCallback(() => {
    if (!parsedSVG) return;
    const tempCanvas = document.createElement("canvas"); tempCanvas.width = 800; tempCanvas.height = 600;
    const tempScope = new paper.PaperScope(); tempScope.setup(tempCanvas);
    const item = tempScope.project.importSVG(parsedSVG.originalSVG, { expandShapes: true });
    if (svgColorOverride) {
      const overrideColor = new tempScope.Color(svgColorOverride);
      const applyColor = (it: paper.Item) => {
        if (it instanceof tempScope.Path || it instanceof tempScope.CompoundPath) {
          if ((it as any).fillColor) (it as any).fillColor = overrideColor;
          if ((it as any).strokeColor) (it as any).strokeColor = overrideColor;
        }
        if ((it as any).children) (it as any).children.forEach((child: paper.Item) => applyColor(child));
      };
      applyColor(item);
    }
    const applyOutline = (it: paper.Item) => {
      if (it instanceof tempScope.Path || it instanceof tempScope.CompoundPath) {
        const pathItem = it as any;
        const color = pathItem.fillColor || pathItem.strokeColor;
        if (color) pathItem.strokeColor = color;
        pathItem.fillColor = null; pathItem.strokeWidth = svgOutlineWidth;
        if (svgOutlineDash.length > 0) pathItem.dashArray = svgOutlineDash;
        pathItem.strokeCap = svgOutlineLineCap;
      }
      if ((it as any).children) (it as any).children.forEach((child: paper.Item) => applyOutline(child));
    };
    applyOutline(item);
    const svgString = tempScope.project.exportSVG({ asString: true }) as string;
    tempScope.project.remove();
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "unbsgrid-outline.svg"; a.click();
    URL.revokeObjectURL(url);
  }, [parsedSVG, svgColorOverride, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap]);

  const toggleGeometry = (key: keyof GeometryOptions) => {
    setGeometryOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateStyle = (key: keyof GeometryOptions, style: GeometryStyle) => {
    setGeometryStyles((prev) => ({ ...prev, [key]: style }));
  };

  const handleResetSvgModifications = useCallback(() => {
    setSvgColorOverride(null); setSvgOutlineMode(false); setSvgOutlineWidth(1);
    setSvgOutlineDash([]); setSvgOutlineLineCap('butt');
  }, []);

  // Compact section header
  const SectionLabel: React.FC<{ icon: React.ReactNode; label: string; tooltip?: string; children?: React.ReactNode }> = ({ icon, label, tooltip, children }) => (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span style={{ color: THEME.muted }}>{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text }}>{label}</span>
      {tooltip && <InfoTooltip content={tooltip} />}
      {children && <div className="ml-auto flex items-center gap-1">{children}</div>}
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="w-[280px] min-w-[280px] flex flex-col border-r"
        style={{ backgroundColor: THEME.bg, borderColor: THEME.border, color: THEME.text }}
      >
        {/* Compact header - no logo, just upload */}
        <div className="px-3 pt-3 pb-2">
          <SVGDropZone onSVGLoaded={handleSVGLoaded} />
          {parsedSVG && (
            <p className="text-[9px] mt-1" style={{ color: THEME.muted }}>
              {parsedSVG.components.length} component{parsedSVG.components.length !== 1 ? "s" : ""}
              {parsedSVG.segments.length > 0 && ` · ${parsedSVG.segments.length} pts`}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3" style={{ scrollbarWidth: 'thin' }}>

          {/* SVG Settings - Collapsible group */}
          <Collapsible open={svgSettingsOpen} onOpenChange={setSvgSettingsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-1 rounded-md transition-colors" style={{ color: THEME.text }}>
              {svgSettingsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Settings2 className="h-3 w-3" style={{ color: THEME.muted }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider">SVG Settings</span>
              {(svgColorOverride || svgOutlineMode || !useRealDataInterpretation) && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: THEME.accent }} />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Color */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Palette className="h-3 w-3" style={{ color: THEME.muted }} />
                  <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: THEME.muted }}>Color</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { name: "Black", color: "#000000" }, { name: "White", color: "#ffffff" },
                    { name: "Red", color: "#e53e3e" }, { name: "Blue", color: "#3182ce" },
                    { name: "Green", color: "#38a169" }, { name: "Gray", color: "#718096" },
                    { name: "Orange", color: "#ED8936" }, { name: "Purple", color: "#805AD5" },
                    { name: "Pink", color: "#D53F8C" }, { name: "Teal", color: "#319795" },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setSvgColorOverride(preset.color)}
                      className="w-4 h-4 rounded-sm border transition-all"
                      style={{
                        backgroundColor: preset.color,
                        borderColor: svgColorOverride === preset.color ? THEME.text : THEME.border,
                        boxShadow: svgColorOverride === preset.color ? `0 0 0 1px ${THEME.text}` : 'none',
                        transform: svgColorOverride === preset.color ? 'scale(1.15)' : 'scale(1)',
                      }}
                      title={preset.name}
                    />
                  ))}
                  <div className="relative w-4 h-4">
                    <input
                      type="color" value={svgColorOverride || "#000000"}
                      onChange={(e) => setSvgColorOverride(e.target.value)}
                      className="absolute inset-0 w-4 h-4 rounded-sm border bg-transparent cursor-pointer opacity-0"
                    />
                    <div className="w-4 h-4 rounded-sm border border-dashed flex items-center justify-center pointer-events-none"
                      style={{
                        borderColor: THEME.muted,
                        ...(svgColorOverride && !["#000000","#ffffff","#e53e3e","#3182ce","#38a169","#718096","#ED8936","#805AD5","#D53F8C","#319795"].includes(svgColorOverride)
                          ? { backgroundColor: svgColorOverride, borderStyle: "solid" } : {}),
                      }}
                    >
                      <span className="text-[7px]" style={{ color: THEME.muted }}>+</span>
                    </div>
                  </div>
                  {svgColorOverride && (
                    <button onClick={() => setSvgColorOverride(null)} title="Reset" style={{ color: THEME.muted }}>
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Outline */}
              <div>
                <div className="flex items-center gap-2">
                  <Switch id="svg-outline" checked={svgOutlineMode} onCheckedChange={setSvgOutlineMode} />
                  <label htmlFor="svg-outline" className="text-[10px] cursor-pointer" style={{ color: THEME.text }}>
                    {svgOutlineMode ? "Outline" : "Fill"}
                  </label>
                </div>
                {svgOutlineMode && (
                  <div className="mt-1.5 space-y-1.5 pl-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px]" style={{ color: THEME.muted, width: 50 }}>Width {svgOutlineWidth.toFixed(1)}</span>
                      <Slider min={1} max={50} step={1} value={[svgOutlineWidth * 10]} onValueChange={(v) => setSvgOutlineWidth(v[0] / 10)} className="flex-1" />
                    </div>
                    <div className="flex gap-0.5">
                      {[
                        { label: "Solid", value: [] as number[] }, { label: "Dash", value: [6, 4] },
                        { label: "Dot", value: [2, 3] }, { label: "Mix", value: [8, 3, 2, 3] },
                      ].map((preset) => (
                        <button key={preset.label} onClick={() => setSvgOutlineDash(preset.value)}
                          className="flex-1 h-5 rounded text-[8px] border transition-all"
                          style={{
                            borderColor: JSON.stringify(svgOutlineDash) === JSON.stringify(preset.value) ? THEME.text : THEME.border,
                            backgroundColor: JSON.stringify(svgOutlineDash) === JSON.stringify(preset.value) ? THEME.accent : 'transparent',
                            color: JSON.stringify(svgOutlineDash) === JSON.stringify(preset.value) ? THEME.text : THEME.muted,
                            fontWeight: JSON.stringify(svgOutlineDash) === JSON.stringify(preset.value) ? 600 : 400,
                          }}
                        >{preset.label}</button>
                      ))}
                    </div>
                    <div className="flex gap-0.5">
                      {[
                        { label: "Butt", value: "butt" as const }, { label: "Round", value: "round" as const },
                        { label: "Square", value: "square" as const },
                      ].map((preset) => (
                        <button key={preset.value} onClick={() => setSvgOutlineLineCap(preset.value)}
                          className="flex-1 h-5 rounded text-[8px] border transition-all"
                          style={{
                            borderColor: svgOutlineLineCap === preset.value ? THEME.text : THEME.border,
                            backgroundColor: svgOutlineLineCap === preset.value ? THEME.accent : 'transparent',
                            color: svgOutlineLineCap === preset.value ? THEME.text : THEME.muted,
                            fontWeight: svgOutlineLineCap === preset.value ? 600 : 400,
                          }}
                        >{preset.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Interpretation */}
              <div className="flex items-center gap-2">
                <Switch id="use-real-data" checked={useRealDataInterpretation} onCheckedChange={setUseRealDataInterpretation} />
                <label htmlFor="use-real-data" className="text-[10px] cursor-pointer" style={{ color: THEME.text }}>
                  {useRealDataInterpretation ? "Real data" : "Bounding box"}
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="h-px" style={{ backgroundColor: THEME.border }} />

          {/* Presets */}
          <PresetManager
            activePreset={activePreset}
            isModified={isPresetModified}
            onSaveClick={() => setSaveDialogOpen(true)}
            onLoadClick={() => setLoadDialogOpen(true)}
            onRevert={handleRevertPreset}
            builtinPresets={presets.filter((p) => p.isBuiltin)}
            onApplyPreset={applyPreset}
          />

          <div className="h-px" style={{ backgroundColor: THEME.border }} />

          {/* Canvas Background - inline */}
          <div className="flex items-center gap-2">
            <Hexagon className="h-3 w-3 flex-shrink-0" style={{ color: THEME.muted }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text }}>Canvas</span>
            <Select value={canvasBackground} onValueChange={(v: CanvasBackground) => setCanvasBackground(v)}>
              <SelectTrigger className="h-6 flex-1 text-[10px] border" style={{ backgroundColor: THEME.inputBg, borderColor: THEME.border, color: THEME.text }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="checkerboard">Checker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-px" style={{ backgroundColor: THEME.border }} />

          {/* Clearspace - inline */}
          <div>
            <SectionLabel icon={<Shield className="h-3 w-3" />} label="Clearspace" tooltip="Clearspace (zona de proteção) é a área mínima ao redor do logo." />
            <div className="flex items-center gap-1.5">
              <Input
                type="number" min={0} step={0.5} value={clearspaceValue}
                onChange={(e) => setClearspaceValue(parseFloat(e.target.value) || 0)}
                className="h-6 w-16 text-[10px] border"
                style={{ backgroundColor: THEME.inputBg, borderColor: THEME.border, color: THEME.text }}
              />
              <UnitSelector value={clearspaceUnit} onChange={setClearspaceUnit} />
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: THEME.border }} />

          {/* Construction Grid - compact */}
          <div>
            <SectionLabel icon={<Grid3X3 className="h-3 w-3" />} label="Grid" tooltip="Grade modular baseada nas proporções do logomark." />
            <div className="flex items-center gap-2">
              <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              {showGrid && (
                <>
                  <Input
                    type="number" min={2} max={32} value={gridSubdivisions}
                    onChange={(e) => setGridSubdivisions(parseInt(e.target.value) || 8)}
                    className="h-6 w-14 text-[10px] border"
                    style={{ backgroundColor: THEME.inputBg, borderColor: THEME.border, color: THEME.text }}
                  />
                  <div className="flex items-center gap-1">
                    <Switch checked={isInverted} onCheckedChange={handleInvert} />
                    <span className="text-[9px]" style={{ color: THEME.muted }}>Inv</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: THEME.border }} />

          {/* Construction Geometry */}
          <section>
            <SectionLabel icon={<Layers className="h-3 w-3" />} label="Geometry" tooltip="Sobreposições geométricas de construção para análise visual." />
            <div className="space-y-0.5">
              {geometryGroups.map((group) => (
                <Collapsible
                  key={group.label}
                  open={openGroups[group.label]}
                  onOpenChange={(open) => setOpenGroups((p) => ({ ...p, [group.label]: open }))}
                >
                  <div className="flex items-center w-full">
                    <CollapsibleTrigger className="flex items-center gap-1 flex-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded px-1 -mx-1 transition-colors"
                      style={{ color: THEME.muted }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {openGroups[group.label] ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                      {group.label}
                    </CollapsibleTrigger>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetGroup(group.keys); setOpenGroups((p) => ({ ...p, [group.label]: false })); }}
                      className="p-0.5 transition-colors" style={{ color: THEME.muted }}
                      title={`Reset ${group.label}`}
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <CollapsibleContent className="space-y-0">
                    {group.keys.map((key) => (
                      <div key={key}>
                        <label className="flex items-center gap-1.5 cursor-pointer py-0.5 rounded px-1 -mx-1 transition-colors"
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = THEME.hoverBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Checkbox checked={geometryOptions[key]} onCheckedChange={() => toggleGeometry(key)} />
                          <span className="text-[10px]" style={{ color: THEME.text }}>
                            {geometryLabels[key]}
                          </span>
                          <span className="ml-auto w-2 h-2 rounded-full border" style={{ backgroundColor: geometryStyles[key].color, borderColor: THEME.border }} />
                        </label>
                        {geometryOptions[key] && (
                          <>
                            <StyleControl style={geometryStyles[key]} onChange={(s) => updateStyle(key, s)} />
                            {key === "parallelFlowLines" && (
                              <div className="pl-6 pr-1 pb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px]" style={{ color: THEME.muted, width: 28 }}>Lines</span>
                                  <Slider min={1} max={20} step={1} value={[maxFlowLines]} onValueChange={(v) => setMaxFlowLines(v[0])} className="flex-1" />
                                  <span className="text-[9px]" style={{ color: THEME.muted, width: 16, textAlign: 'right' }}>{maxFlowLines}</span>
                                </div>
                              </div>
                            )}
                            {key === "modularScale" && (
                              <div className="pl-6 pr-1 pb-1">
                                <Select value={String(modularScaleRatio)} onValueChange={(v) => setModularScaleRatio(parseFloat(v))}>
                                  <SelectTrigger className="h-6 text-[10px] border" style={{ backgroundColor: THEME.inputBg, borderColor: THEME.border, color: THEME.text }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1.25">1.250 (Minor Third)</SelectItem>
                                    <SelectItem value="1.333">1.333 (Perfect Fourth)</SelectItem>
                                    <SelectItem value="1.5">1.500 (Perfect Fifth)</SelectItem>
                                    <SelectItem value="1.618">1.618 (Golden Ratio)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {key === "safeZone" && (
                              <div className="pl-6 pr-1 pb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px]" style={{ color: THEME.muted, width: 36 }}>Margin</span>
                                  <Slider min={1} max={30} step={1} value={[Math.round(safeZoneMargin * 100)]} onValueChange={(v) => setSafeZoneMargin(v[0] / 100)} className="flex-1" />
                                  <span className="text-[9px]" style={{ color: THEME.muted, width: 24, textAlign: 'right' }}>{Math.round(safeZoneMargin * 100)}%</span>
                                </div>
                              </div>
                            )}
                            {key === "anchorPoints" && (
                              <div className="pl-6 pr-1 pb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px]" style={{ color: THEME.muted, width: 28 }}>Size</span>
                                  <Slider min={1} max={15} step={1} value={[anchorPointSize]} onValueChange={(v) => setAnchorPointSize(v[0])} className="flex-1" />
                                  <span className="text-[9px]" style={{ color: THEME.muted, width: 16, textAlign: 'right' }}>{anchorPointSize}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </section>
        </div>

        {/* Export footer */}
        <div className="px-3 py-2 border-t space-y-1.5" style={{ borderColor: THEME.border }}>
          <Button
            onClick={handleExport} disabled={!parsedSVG}
            className="w-full h-7 text-[10px] font-semibold border-0"
            style={{ backgroundColor: THEME.accent, color: THEME.text }}
          >
            <Download className="h-3 w-3 mr-1" /> Export SVG
          </Button>
          {svgOutlineMode && (
            <Button onClick={handleExportOutlineSVG} disabled={!parsedSVG}
              variant="outline" className="w-full h-6 text-[9px] border"
              style={{ borderColor: THEME.border, color: THEME.text }}
            >
              <Layers className="h-3 w-3 mr-1" /> Outline SVG
            </Button>
          )}
          <div className="flex gap-1">
            {[1, 2, 4].map((scale) => (
              <Button key={scale} variant="outline" size="sm" disabled={!parsedSVG}
                onClick={() => handleExportPNG(scale)}
                className="flex-1 h-5 text-[8px] border"
                style={{ borderColor: THEME.border, color: THEME.text }}
              >
                PNG {scale}x
              </Button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background p-4">
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
          onProjectReady={(p) => { projectRef.current = p; }}
        />
      </main>

      <SavePresetDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} existingNames={allPresetNames} onSave={handleSavePreset} />
      <LoadPresetDialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen} presets={presets} activePresetId={activePresetId} onLoad={applyPreset} onDelete={handleDeletePreset} />
    </div>
  );
};

export default Index;

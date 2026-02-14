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
} from "lucide-react";
import SVGDropZone from "../components/SVGDropZone";
import PreviewCanvas from "../components/PreviewCanvas";
import UnitSelector from "../components/UnitSelector";
import InfoTooltip from "../components/InfoTooltip";
import { Logo } from "../components/Logo";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
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
      "parallelFlowLines",
      "underlyingCircles",
      "dominantDiagonals",
      "curvatureComb",
      "skeletonCenterline",
      "constructionGrid",
      "pathDirectionArrows",
      "tangentIntersections",
      "anchorPoints",
      "bezierHandles",
      "opticalCenter",
      "visualWeightMap",
    ],
  },
  { label: "Basic", keys: ["boundingRects", "circles", "centerLines", "diagonals", "tangentLines", "anchoringPoints"] },
  { label: "Proportions", keys: ["goldenRatio", "goldenSpiral", "thirdLines", "typographicProportions", "ruleOfOdds"] },
  {
    label: "Measurement",
    keys: [
      "symmetryAxes",
      "angleMeasurements",
      "spacingGuides",
      "alignmentGuides",
      "dynamicBaseline",
      "componentRatioLabels",
      "harmonicDivisions",
    ],
  },
  { label: "Harmony", keys: ["rootRectangles", "modularScale", "safeZone", "fibonacciOverlay", "vesicaPiscis"] },
  { label: "Grid & Output", keys: ["isometricGrid", "pixelGrid", "contrastGuide", "kenBurnsSafe"] },
];

interface StyleControlProps {
  style: GeometryStyle;
  onChange: (s: GeometryStyle) => void;
}

const StyleControl: React.FC<StyleControlProps> = ({ style, onChange }) => (
  <div className="pl-7 pr-1 space-y-1.5 pb-2">
    <div className="flex items-center gap-2">
      <Label className="text-[10px] text-muted-foreground w-10">Color</Label>
      <input
        type="color"
        value={style.color}
        onChange={(e) => onChange({ ...style, color: e.target.value })}
        className="w-6 h-6 rounded border border-border bg-transparent cursor-pointer"
      />
    </div>
    <div className="flex items-center gap-2">
      <Label className="text-[10px] text-muted-foreground w-10">Opacity</Label>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[Math.round(style.opacity * 100)]}
        onValueChange={(v) => onChange({ ...style, opacity: v[0] / 100 })}
        className="flex-1"
      />
      <span className="text-[9px] text-muted-foreground w-8 text-right">{Math.round(style.opacity * 100)}%</span>
    </div>
    <div className="flex items-center gap-2">
      <Label className="text-[10px] text-muted-foreground w-10">Stroke</Label>
      <Slider
        min={5}
        max={50}
        step={5}
        value={[Math.round(style.strokeWidth * 10)]}
        onValueChange={(v) => onChange({ ...style, strokeWidth: v[0] / 10 })}
        className="flex-1"
      />
      <span className="text-[9px] text-muted-foreground w-8 text-right">{style.strokeWidth.toFixed(1)}</span>
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
  const [geometryOptions, setGeometryOptions] = useState<GeometryOptions>({
    boundingRects: false,
    circles: false,
    diagonals: false,
    goldenRatio: false,
    centerLines: false,
    tangentLines: false,
    goldenSpiral: false,
    isometricGrid: false,
    bezierHandles: false,
    typographicProportions: false,
    thirdLines: false,
    symmetryAxes: false,
    angleMeasurements: false,
    spacingGuides: false,
    rootRectangles: false,
    modularScale: false,
    alignmentGuides: false,
    safeZone: false,
    pixelGrid: false,
    opticalCenter: false,
    contrastGuide: false,
    dynamicBaseline: false,
    fibonacciOverlay: false,
    kenBurnsSafe: false,
    componentRatioLabels: false,
    vesicaPiscis: false,
    ruleOfOdds: false,
    visualWeightMap: false,
    anchoringPoints: false,
    harmonicDivisions: false,
    parallelFlowLines: false,
    underlyingCircles: false,
    dominantDiagonals: false,
    curvatureComb: false,
    skeletonCenterline: false,
    constructionGrid: false,
    pathDirectionArrows: false,
    tangentIntersections: false,
    anchorPoints: false,
  });
  const [geometryStyles, setGeometryStyles] = useState<GeometryStyles>({ ...defaultStyles });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Advanced: true,
    Basic: false,
    Proportions: false,
    Measurement: false,
    Harmony: false,
    "Grid & Output": false,
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

  // Load presets from localStorage on mount
  useEffect(() => {
    const userPresets = loadPresetsFromStorage();
    setPresets([...getBuiltinPresets(), ...userPresets]);
  }, []);

  const currentConfigSnapshot = useMemo(
    () =>
      JSON.stringify({ geometryOptions, geometryStyles, clearspaceValue, clearspaceUnit, showGrid, gridSubdivisions }),
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
        geometryOptions: preset.geometryOptions,
        geometryStyles: preset.geometryStyles,
        clearspaceValue: preset.clearspaceValue,
        clearspaceUnit: preset.clearspaceUnit,
        showGrid: preset.showGrid,
        gridSubdivisions: preset.gridSubdivisions,
      }),
    );
  }, []);

  const handleSavePreset = useCallback(
    (name: string, description: string) => {
      const newPreset = createPreset({
        name,
        description,
        geometryOptions,
        geometryStyles,
        clearspaceValue,
        clearspaceUnit,
        showGrid,
        gridSubdivisions,
      });
      const updated = [...presets, newPreset];
      setPresets(updated);
      savePresetsToStorage(updated);
      setActivePresetId(newPreset.id);
      setSavedSnapshot(currentConfigSnapshot);
      setSaveDialogOpen(false);
    },
    [
      presets,
      geometryOptions,
      geometryStyles,
      clearspaceValue,
      clearspaceUnit,
      showGrid,
      gridSubdivisions,
      currentConfigSnapshot,
    ],
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      const updated = presets.filter((p) => p.id !== id);
      setPresets(updated);
      savePresetsToStorage(updated);
      if (activePresetId === id) {
        setActivePresetId(null);
        setSavedSnapshot(null);
      }
    },
    [presets, activePresetId],
  );

  const handleRevertPreset = useCallback(() => {
    const preset = presets.find((p) => p.id === activePresetId);
    if (preset) applyPreset(preset);
  }, [presets, activePresetId, applyPreset]);

  const handleSVGLoaded = useCallback((svgString: string) => {
    if (!hiddenCanvasRef.current) {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
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
    const a = document.createElement("a");
    a.href = url;
    a.download = "unbsgrid-export.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportPNG = useCallback((scale: number) => {
    if (!projectRef.current) return;
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);
    const url = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `unbsgrid-export-${scale}x.png`;
    a.click();
  }, []);

  const handleExportOutlineSVG = useCallback(() => {
    if (!parsedSVG) return;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 800;
    tempCanvas.height = 600;
    const tempScope = new paper.PaperScope();
    tempScope.setup(tempCanvas);
    const item = tempScope.project.importSVG(parsedSVG.originalSVG, { expandShapes: true });

    if (svgColorOverride) {
      const overrideColor = new tempScope.Color(svgColorOverride);
      const applyColor = (it: paper.Item) => {
        if (it instanceof tempScope.Path || it instanceof tempScope.CompoundPath) {
          if ((it as any).fillColor) (it as any).fillColor = overrideColor;
          if ((it as any).strokeColor) (it as any).strokeColor = overrideColor;
        }
        if ((it as any).children) {
          (it as any).children.forEach((child: paper.Item) => applyColor(child));
        }
      };
      applyColor(item);
    }

    const applyOutline = (it: paper.Item) => {
      if (it instanceof tempScope.Path || it instanceof tempScope.CompoundPath) {
        const pathItem = it as any;
        const color = pathItem.fillColor || pathItem.strokeColor;
        if (color) pathItem.strokeColor = color;
        pathItem.fillColor = null;
        pathItem.strokeWidth = svgOutlineWidth;
        if (svgOutlineDash.length > 0) pathItem.dashArray = svgOutlineDash;
        pathItem.strokeCap = svgOutlineLineCap;
      }
      if ((it as any).children) {
        (it as any).children.forEach((child: paper.Item) => applyOutline(child));
      }
    };
    applyOutline(item);

    const svgString = tempScope.project.exportSVG({ asString: true }) as string;
    tempScope.project.remove();
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "unbsgrid-outline.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedSVG, svgColorOverride, svgOutlineWidth, svgOutlineDash, svgOutlineLineCap]);

  const toggleGeometry = (key: keyof GeometryOptions) => {
    setGeometryOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateStyle = (key: keyof GeometryOptions, style: GeometryStyle) => {
    setGeometryStyles((prev) => ({ ...prev, [key]: style }));
  };

  const handleResetSvgModifications = useCallback(() => {
    setSvgColorOverride(null);
    setSvgOutlineMode(false);
    setSvgOutlineWidth(1);
    setSvgOutlineDash([]);
    setSvgOutlineLineCap('butt');
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-[300px] min-w-[300px] bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <Logo />
            <h1 className="text-xs font-bold tracking-wide text-foreground"></h1>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Upload */}
          <section>
            <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider mb-2 block">
              SVG Upload
            </Label>
            <SVGDropZone onSVGLoaded={handleSVGLoaded} />
            {parsedSVG && (
              <p className="text-[10px] text-muted-foreground mt-2">
                {parsedSVG.components.length} component{parsedSVG.components.length !== 1 ? "s" : ""} detected
                {parsedSVG.segments.length > 0 && ` · ${parsedSVG.segments.length} bezier points`}
              </p>
            )}
          </section>

          <Separator className="bg-sidebar-border" />

          {/* SVG Color Override */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                SVG Color
              </Label>
              <InfoTooltip content="Altere a cor de todos os caminhos do SVG importado. Útil para testar o logo em diferentes cores ou verificar como ele funciona em monocromático." />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: "Black", color: "#000000" },
                { name: "White", color: "#ffffff" },
                { name: "Red", color: "#e53e3e" },
                { name: "Blue", color: "#3182ce" },
                { name: "Green", color: "#38a169" },
                { name: "Gray", color: "#718096" },
                { name: "Orange", color: "#ED8936" },
                { name: "Purple", color: "#805AD5" },
                { name: "Pink", color: "#D53F8C" },
                { name: "Teal", color: "#319795" },
              ].map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setSvgColorOverride(preset.color)}
                  className={`w-5 h-5 rounded-sm border transition-all ${svgColorOverride === preset.color ? "border-foreground ring-1 ring-foreground/50 scale-110" : "border-border/60 hover:border-foreground/40"}`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
              <div className="relative w-5 h-5">
                <input
                  type="color"
                  value={svgColorOverride || "#000000"}
                  onChange={(e) => setSvgColorOverride(e.target.value)}
                  className="absolute inset-0 w-5 h-5 rounded-sm border border-border/60 bg-transparent cursor-pointer opacity-0"
                />
                <div
                  className="w-5 h-5 rounded-sm border border-dashed border-muted-foreground/50 flex items-center justify-center pointer-events-none"
                  style={
                    svgColorOverride &&
                    ![
                      "#000000",
                      "#ffffff",
                      "#e53e3e",
                      "#3182ce",
                      "#38a169",
                      "#718096",
                      "#ED8936",
                      "#805AD5",
                      "#D53F8C",
                      "#319795",
                    ].includes(svgColorOverride)
                      ? { backgroundColor: svgColorOverride, borderStyle: "solid" }
                      : {}
                  }
                >
                  <span className="text-[8px] text-muted-foreground">+</span>
                </div>
              </div>
              {svgColorOverride && (
                <button
                  onClick={() => setSvgColorOverride(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
            {svgColorOverride && (
              <Input
                value={svgColorOverride}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v) && v.length === 7) setSvgColorOverride(v);
                }}
                className="h-6 mt-1.5 bg-input border-border text-foreground text-[10px] font-mono"
              />
            )}
          </section>

          <Separator className="bg-sidebar-border" />

          {/* SVG Outline Mode */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                SVG Outline
              </Label>
              <InfoTooltip content="Converte o SVG para modo outline, removendo o preenchimento e mostrando apenas os contornos dos caminhos vetoriais. Útil para analisar a estrutura do logo." />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Switch
                id="svg-outline"
                checked={svgOutlineMode}
                onCheckedChange={setSvgOutlineMode}
              />
              <Label htmlFor="svg-outline" className="text-[10px] text-muted-foreground cursor-pointer">
                {svgOutlineMode ? "Outline ativo" : "Preenchimento normal"}
              </Label>
            </div>
            {svgOutlineMode && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">
                    Espessura: {svgOutlineWidth.toFixed(1)}px
                  </Label>
                  <Slider
                    min={1}
                    max={50}
                    step={1}
                    value={[svgOutlineWidth * 10]}
                    onValueChange={(v) => setSvgOutlineWidth(v[0] / 10)}
                    className="flex-1"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Estilo da linha</Label>
                  <div className="flex gap-1">
                    {[
                      { label: "Sólida", value: [] as number[] },
                      { label: "Tracejada", value: [6, 4] },
                      { label: "Pontilhada", value: [2, 3] },
                      { label: "Traço-ponto", value: [8, 3, 2, 3] },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setSvgOutlineDash(preset.value)}
                        className={`flex-1 h-6 rounded text-[8px] border transition-all ${JSON.stringify(svgOutlineDash) === JSON.stringify(preset.value) ? "border-foreground bg-foreground/10 text-foreground" : "border-border/60 text-muted-foreground hover:border-foreground/40"}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Terminação</Label>
                  <div className="flex gap-1">
                    {[
                      { label: "Reta", value: "butt" as const },
                      { label: "Redonda", value: "round" as const },
                      { label: "Quadrada", value: "square" as const },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setSvgOutlineLineCap(preset.value)}
                        className={`flex-1 h-6 rounded text-[8px] border transition-all ${svgOutlineLineCap === preset.value ? "border-foreground bg-foreground/10 text-foreground" : "border-border/60 text-muted-foreground hover:border-foreground/40"}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <Separator className="bg-sidebar-border" />

          {/* Real Data Interpretation */}
          <section>
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                Interpretation Mode
              </Label>
              <InfoTooltip content="Quando ativado, as ferramentas de geometria apenas mostram guias que realmente intersectam com os caminhos vetoriais do SVG. Isso garante que as guias estejam analisando dados reais e não apenas sobrepostas às caixas delimitadoras." />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="use-real-data"
                checked={useRealDataInterpretation}
                onCheckedChange={setUseRealDataInterpretation}
              />
              <Label htmlFor="use-real-data" className="text-[10px] text-muted-foreground cursor-pointer">
                {useRealDataInterpretation ? "Interpretar dados reais (SVG vetorial)" : "Modo overlay (caixas delimitadoras)"}
              </Label>
            </div>
          </section>

          <Separator className="bg-sidebar-border" />

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

          <Separator className="bg-sidebar-border" />

          {/* Canvas Background */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Hexagon className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                Canvas
              </Label>
              <InfoTooltip content="Controle o fundo do canvas de visualização. Use 'Checkerboard' para simular transparência, 'Light' para fundos claros e 'Dark' para fundos escuros." />
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Background</Label>
                <Select value={canvasBackground} onValueChange={(v: CanvasBackground) => setCanvasBackground(v)}>
                  <SelectTrigger className="h-7 bg-input border-border text-foreground text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="checkerboard">Checkerboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator className="bg-sidebar-border" />

          {/* Clearspace */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                Clearspace
              </Label>
              <InfoTooltip content="Clearspace (zona de proteção) é a área mínima ao redor do logo onde nenhum outro elemento gráfico deve aparecer. O valor 'X' define a distância em unidades selecionadas. Quanto maior o valor, mais espaço livre ao redor." />
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Value</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={clearspaceValue}
                  onChange={(e) => setClearspaceValue(parseFloat(e.target.value) || 0)}
                  className="h-7 bg-input border-border text-foreground text-[10px]"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Unit</Label>
                <UnitSelector value={clearspaceUnit} onChange={setClearspaceUnit} />
              </div>
            </div>
          </section>

          <Separator className="bg-sidebar-border" />

          {/* Construction Grid */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Grid3X3 className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                Construction Grid
              </Label>
              <InfoTooltip content="Gera uma grade modular baseada nas proporções do logomark. Útil para alinhar elementos em layouts. As subdivisões controlam a densidade da grade." />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-foreground">Show Grid</Label>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>
              {showGrid && (
                <>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Subdivisions</Label>
                    <Input
                      type="number"
                      min={2}
                      max={32}
                      value={gridSubdivisions}
                      onChange={(e) => setGridSubdivisions(parseInt(e.target.value) || 8)}
                      className="h-7 bg-input border-border text-foreground text-[10px]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] text-foreground">Invert Components</Label>
                      <InfoTooltip content="Troca a detecção automática de qual parte do logo é o ícone (logomark) e qual é o texto (wordmark). A grade e as proporções são calculadas com base no elemento identificado como ícone." />
                    </div>
                    <Switch checked={isInverted} onCheckedChange={handleInvert} />
                  </div>
                </>
              )}
            </div>
          </section>

          <Separator className="bg-sidebar-border" />

          {/* Construction Geometry */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <Label className="text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
                Construction Geometry
              </Label>
              <InfoTooltip content="Sobreposições geométricas de construção para análise visual do logo. Cada camada pode ter cor, opacidade e espessura de traço personalizados. Ative múltiplas camadas para uma análise completa." />
            </div>
            <div className="space-y-1">
              {geometryGroups.map((group) => (
                <Collapsible
                  key={group.label}
                  open={openGroups[group.label]}
                  onOpenChange={(open) => setOpenGroups((p) => ({ ...p, [group.label]: open }))}
                >
                  <div className="flex items-center w-full">
                    <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:bg-sidebar-accent rounded-md px-1.5 -mx-1.5 transition-colors">
                      {openGroups[group.label] ? (
                        <ChevronDown className="h-2.5 w-2.5" />
                      ) : (
                        <ChevronRight className="h-2.5 w-2.5" />
                      )}
                      {group.label}
                    </CollapsibleTrigger>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetGroup(group.keys); setOpenGroups((p) => ({ ...p, [group.label]: false })); }}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      title={`Resetar ${group.label}`}
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <CollapsibleContent className="space-y-0.5">
                    {group.keys.map((key) => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer group py-0.5 hover:bg-sidebar-accent rounded-md px-1.5 -mx-1.5 transition-colors">
                          <Checkbox checked={geometryOptions[key]} onCheckedChange={() => toggleGeometry(key)} />
                          <span className="text-[10px] text-foreground group-hover:text-foreground transition-colors">
                            {geometryLabels[key]}
                          </span>
                          <span
                            className="ml-auto w-2.5 h-2.5 rounded-full border border-border"
                            style={{ backgroundColor: geometryStyles[key].color }}
                          />
                        </label>
                        {geometryOptions[key] && (
                          <>
                            <StyleControl style={geometryStyles[key]} onChange={(s) => updateStyle(key, s)} />
                            {/* Extra controls for parallelFlowLines */}
                            {key === "parallelFlowLines" && (
                              <div className="pl-7 pr-1 pb-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-[10px] text-muted-foreground w-8">Lines</Label>
                                  <Slider
                                    min={1}
                                    max={20}
                                    step={1}
                                    value={[maxFlowLines]}
                                    onValueChange={(v) => setMaxFlowLines(v[0])}
                                    className="flex-1"
                                  />
                                  <span className="text-[9px] text-muted-foreground w-6 text-right">
                                    {maxFlowLines}
                                  </span>
                                </div>
                              </div>
                            )}
                            {/* Extra controls for modularScale */}
                            {key === "modularScale" && (
                              <div className="pl-7 pr-1 pb-2">
                                <Label className="text-[10px] text-muted-foreground mb-1 block">Ratio</Label>
                                <Select
                                  value={String(modularScaleRatio)}
                                  onValueChange={(v) => setModularScaleRatio(parseFloat(v))}
                                >
                                  <SelectTrigger className="h-7 bg-input border-border text-foreground text-[10px]">
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
                            {/* Extra controls for safeZone */}
                            {key === "safeZone" && (
                              <div className="pl-7 pr-1 pb-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-[10px] text-muted-foreground w-10">Margin</Label>
                                  <Slider
                                    min={1}
                                    max={30}
                                    step={1}
                                    value={[Math.round(safeZoneMargin * 100)]}
                                    onValueChange={(v) => setSafeZoneMargin(v[0] / 100)}
                                    className="flex-1"
                                  />
                                  <span className="text-[9px] text-muted-foreground w-8 text-right">
                                    {Math.round(safeZoneMargin * 100)}%
                                  </span>
                                </div>
                              </div>
                            )}
                            {/* Extra controls for anchorPoints */}
                            {key === "anchorPoints" && (
                              <div className="pl-7 pr-1 pb-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-[10px] text-muted-foreground w-8">Size</Label>
                                  <Slider
                                    min={1}
                                    max={15}
                                    step={1}
                                    value={[anchorPointSize]}
                                    onValueChange={(v) => setAnchorPointSize(v[0])}
                                    className="flex-1"
                                  />
                                  <span className="text-[9px] text-muted-foreground w-6 text-right">
                                    {anchorPointSize}
                                  </span>
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

        <div className="px-4 py-3 border-t border-sidebar-border space-y-2">
          <Button
            onClick={handleExport}
            disabled={!parsedSVG}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-[10px] font-semibold"
          >
            <Download className="h-3 w-3 mr-1.5" />
            Export SVG
          </Button>
          {svgOutlineMode && (
            <Button
              onClick={handleExportOutlineSVG}
              disabled={!parsedSVG}
              variant="outline"
              className="w-full h-7 text-[10px]"
            >
              <Layers className="h-3 w-3 mr-1.5" />
              Export Outline SVG
            </Button>
          )}
          <div className="flex gap-1.5">
            {[1, 2, 4].map((scale) => (
              <Button
                key={scale}
                variant="outline"
                size="sm"
                disabled={!parsedSVG}
                onClick={() => handleExportPNG(scale)}
                className="flex-1 h-6 text-[9px]"
              >
                PNG {scale}x
              </Button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background p-4">
        <PreviewCanvas
          parsedSVG={parsedSVG}
          clearspaceValue={clearspaceValue}
          clearspaceUnit={clearspaceUnit}
          showGrid={showGrid}
          gridSubdivisions={gridSubdivisions}
          geometryOptions={geometryOptions}
          geometryStyles={geometryStyles}
          canvasBackground={canvasBackground}
          modularScaleRatio={modularScaleRatio}
          safeZoneMargin={safeZoneMargin}
          svgColorOverride={svgColorOverride}
          useRealDataInterpretation={useRealDataInterpretation}
          svgOutlineMode={svgOutlineMode}
          svgOutlineWidth={svgOutlineWidth}
          svgOutlineDash={svgOutlineDash}
          svgOutlineLineCap={svgOutlineLineCap}
          maxFlowLines={maxFlowLines}
          anchorPointSize={anchorPointSize}
          onProjectReady={(p) => {
            projectRef.current = p;
          }}
        />
      </main>

      <SavePresetDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        existingNames={allPresetNames}
        onSave={handleSavePreset}
      />
      <LoadPresetDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        presets={presets}
        activePresetId={activePresetId}
        onLoad={applyPreset}
        onDelete={handleDeletePreset}
      />
    </div>
  );
};

export default Index;

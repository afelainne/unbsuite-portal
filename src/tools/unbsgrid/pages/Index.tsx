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
        {/* Logo + upload */}
        <div className="px-3 pt-3 pb-2">
          <div className="mb-2 flex justify-center">
            <svg width="120" height="auto" viewBox="0 0 1427 434" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M972.941 172.928H902.606V123.218C902.606 102.77 900.844 88.8438 897.318 81.4402C893.793 74.0366 886.742 70.3348 876.165 70.3348C865.588 70.3348 858.537 74.0366 855.012 81.4402C851.486 88.8438 849.724 102.77 849.724 123.218V310.423C849.724 330.871 851.486 344.797 855.012 352.2C858.537 359.604 865.588 363.306 876.165 363.306C886.742 363.306 893.793 359.604 897.318 352.2C900.844 344.797 902.606 330.871 902.606 310.423V280.808H876.165V209.945H972.941V428.352H943.326L932.221 397.68C914.241 421.653 891.854 433.64 865.06 433.64C836.15 433.64 814.645 424.121 800.543 405.083C786.44 385.693 779.389 355.373 779.389 314.125V119.516C779.389 78.2672 787.498 48.124 803.716 29.0862C819.933 9.69584 844.083 0.000649592 876.165 0.000649592C908.247 0.000649592 932.397 9.69584 948.614 29.0862C964.832 48.124 972.941 78.2672 972.941 119.516V172.928ZM1162.52 390.805C1162.52 400.676 1162.87 408.785 1163.57 415.131C1164.28 421.124 1165.87 425.531 1168.33 428.352H1098C1095.53 425.531 1093.95 421.124 1093.24 415.131C1092.54 408.785 1092.18 400.676 1092.18 390.805V310.952C1092.18 298.612 1090.24 289.446 1086.37 283.453C1082.84 277.107 1077.73 273.052 1071.03 271.29C1064.33 269.174 1055.34 268.117 1044.06 268.117H1038.24V428.352H967.908V5.28896H1043C1073.67 5.28896 1097.65 9.16702 1114.92 16.9232C1132.2 24.3268 1144.36 36.3135 1151.41 52.8835C1158.82 69.4534 1162.52 92.0168 1162.52 120.574V151.774C1162.52 175.748 1158.99 195.667 1151.94 211.532C1145.24 227.397 1134.84 239.736 1120.74 248.55C1134.84 253.838 1145.24 262.476 1151.94 274.463C1158.99 286.449 1162.52 303.019 1162.52 324.172V390.805ZM1092.18 120.574C1092.18 108.234 1090.77 98.8915 1087.95 92.5456C1085.13 86.1997 1080.2 81.7928 1073.15 79.3249C1066.45 76.857 1056.58 75.6231 1043.53 75.6231H1038.24V197.782H1043.53C1062.57 197.782 1075.44 194.609 1082.14 188.264C1088.83 181.565 1092.18 169.402 1092.18 151.774V120.574ZM1228.31 428.352H1157.98V5.28896H1228.31V428.352ZM1297.1 5.28896C1327.42 5.28896 1351.22 8.81448 1368.5 15.8655C1385.77 22.9165 1398.29 34.727 1406.04 51.297C1413.8 67.5144 1417.68 90.254 1417.68 119.516V314.125C1417.68 343.034 1413.8 365.774 1406.04 382.344C1398.29 398.913 1385.77 410.724 1368.5 417.775C1351.22 424.826 1327.42 428.352 1297.1 428.352H1223.07V5.28896H1297.1ZM1293.4 75.6231V358.017H1297.63C1310.68 358.017 1320.55 356.96 1327.25 354.844C1334.3 352.729 1339.41 348.498 1342.58 342.153C1345.76 335.807 1347.34 326.464 1347.34 314.125V119.516C1347.34 107.177 1345.76 97.8339 1342.58 91.488C1339.41 85.142 1334.3 80.9114 1327.25 78.7961C1320.55 76.6808 1310.68 75.6231 1297.63 75.6231H1293.4Z" fill="#232323"/>
              <path d="M118.356 5.65092H206.595V312.109C206.595 393.127 172.603 433.635 104.618 433.635C36.6341 433.635 2.64188 393.127 2.64188 312.109V5.65092H90.8806V305.24C90.8806 317.217 91.0568 325.847 91.409 331.13C92.1135 336.062 93.3464 339.761 95.1076 342.226C96.8689 344.34 100.039 345.397 104.618 345.397C109.198 345.397 112.368 344.34 114.129 342.226C115.89 339.761 116.947 336.062 117.299 331.13C118.004 325.847 118.356 317.217 118.356 305.24V5.65092ZM191 5.65092H279.238L334.718 190.054V5.65092H422.957V428.352H334.718L279.238 243.948V428.352H191V5.65092ZM566.79 206.962C597.084 223.166 612.231 252.931 612.231 296.258V317.921C612.231 343.988 608.356 365.123 600.606 381.326C593.209 397.177 581.057 408.978 564.148 416.727C547.24 424.477 524.344 428.352 495.46 428.352H407.221V5.65092H495.46C525.049 5.65092 547.945 9.52567 564.148 17.2752C580.352 25.0247 591.624 37.3535 597.965 54.2615C604.657 71.1695 608.004 94.5942 608.004 124.535V125.592C608.004 165.749 594.266 192.872 566.79 206.962ZM519.765 124.535C519.765 112.207 518.18 104.105 515.01 100.23C512.192 96.0032 505.851 93.8897 495.988 93.8897H495.46V168.391H495.988C503.738 168.391 509.197 167.51 512.368 165.749C515.538 163.988 517.475 161.17 518.18 157.295C519.237 153.42 519.765 146.903 519.765 137.745V124.535ZM495.46 256.629V340.113H495.988C506.203 340.113 513.424 338.175 517.651 334.301C521.878 330.426 523.992 322.853 523.992 311.581V284.105C523.992 272.833 522.055 265.436 518.18 261.913C514.305 258.391 506.908 256.629 495.988 256.629H495.46ZM726.038 173.146C743.65 186.532 757.564 198.86 767.78 210.132C777.995 221.404 786.097 235.671 792.085 252.931C798.425 269.839 801.596 290.974 801.596 316.336C801.596 355.436 793.494 384.849 777.29 404.575C761.439 423.948 736.077 433.635 701.204 433.635C676.547 433.635 656.821 429.408 642.026 420.954C627.232 412.5 616.136 397.177 608.738 374.986C601.341 352.794 597.643 321.267 597.643 280.406H685.881C685.881 306.825 687.114 324.262 689.58 332.716C692.046 341.17 695.92 345.397 701.204 345.397C706.488 345.397 709.834 343.283 711.243 339.056C712.652 334.829 713.357 327.256 713.357 316.336C713.357 306.825 712.652 299.252 711.243 293.616C709.834 287.627 706.664 281.463 701.733 275.123C696.801 268.782 688.875 261.033 677.956 251.874L665.275 241.835C649.776 229.506 637.447 218.586 628.288 209.076C619.482 199.565 611.909 187.06 605.568 171.561C599.58 155.71 596.586 136.16 596.586 112.911C596.586 37.8818 629.521 0.367137 695.392 0.367137C729.56 0.367137 754.746 11.1108 770.95 32.5981C787.153 53.7331 795.255 87.0208 795.255 132.461H707.545C707.545 115.905 706.488 104.457 704.374 98.1167C702.613 91.7762 699.619 88.6059 695.392 88.6059C691.165 88.6059 688.347 90.7194 686.938 94.9464C685.529 98.8212 684.825 104.809 684.825 112.911C684.825 122.07 686.057 129.819 688.523 136.16C691.341 142.148 695.392 147.608 700.676 152.539C706.312 157.471 714.766 164.34 726.038 173.146Z" fill="#232323"/>
            </svg>
          </div>
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

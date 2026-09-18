/**
 * Names, grouping and fallback style of every construction.
 *
 * Lives outside the page on purpose: renderers are registered in
 * types/geometry.ts, and whoever adds one needs to name it without touching
 * the screen. The names themselves live in the i18n dictionary (`geometry`
 * and `geometryGroups`), in the active language. A key with no entry still
 * shows up, in the "other" group, with a name derived from the key itself.
 */
import { GEOMETRY_KEYS, type GeometryOptions, type GeometryStyle } from "../types/geometry";
import { activeT } from "../i18n/runtime";
import type { Translations } from "../i18n/types";

/** Style used when a brand new construction has no entry in the preset defaults yet. */
export const FALLBACK_STYLE: GeometryStyle = { color: "#7a7a85", opacity: 0.5, strokeWidth: 1 };

/**
 * Construction names in the active language. Optional on purpose: a
 * construction added to `GeometryOptions` without an entry still shows up,
 * with a name derived from its key.
 */
export const geometryLabels = (): Partial<Record<keyof GeometryOptions, string>> =>
  activeT().geometry as Partial<Record<keyof GeometryOptions, string>>;

/** "goldenSpiral" -> "Golden spiral"; "hexGrid2" -> "Hex grid 2"; "svgOutline" -> "Svg outline". */
export function humanizeGeometryKey(key: string): string {
  const words = String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Sentence case, but an acronym written in caps in the key stays in caps.
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()));
  if (!words.length) return String(key);
  const [first, ...rest] = words;
  const head = first === first.toUpperCase() && first.length > 1 ? first : first.charAt(0).toUpperCase() + first.slice(1);
  return [head, ...rest].join(" ");
}

export const labelFor = (key: keyof GeometryOptions): string =>
  geometryLabels()[key] ?? humanizeGeometryKey(String(key));

export type GeometryGroupId = keyof Translations["geometryGroups"];

/**
 * `id` is stable (it keys the open / closed state of the group); `label`
 * reads the active language every time it is accessed.
 */
export type GeometryGroup = {
  id: GeometryGroupId;
  readonly label: string;
  tier: "basic" | "advanced";
  keys: (keyof GeometryOptions)[];
};

const group = (id: GeometryGroupId, tier: GeometryGroup["tier"], keys: (keyof GeometryOptions)[]): GeometryGroup => ({
  id,
  get label() { return activeT().geometryGroups[id]; },
  tier,
  keys,
});

export const geometryGroups: GeometryGroup[] = [
  group("advanced", "advanced", [
    "parallelFlowLines", "underlyingCircles", "dominantDiagonals", "curvatureComb",
    "skeletonCenterline", "constructionGrid", "pathDirectionArrows", "tangentIntersections",
    "anchorPoints", "bezierHandles", "opticalCenter", "visualWeightMap",
  ]),
  group("basic", "basic", ["boundingRects", "circles", "centerLines", "diagonals", "tangentLines", "anchoringPoints"]),
  group("proportions", "basic", ["goldenRatio", "goldenSpiral", "thirdLines", "typographicProportions", "ruleOfOdds"]),
  group("measurements", "basic", [
    "symmetryAxes", "angleMeasurements", "spacingGuides", "alignmentGuides", "dynamicBaseline", "componentRatioLabels", "harmonicDivisions",
  ]),
  group("harmony", "basic", ["modularScale", "safeZone", "fibonacciOverlay"]),
  group("sacred", "advanced", ["flowerOfLife", "reuleauxTriangle", "hexGrid", "vesicaPiscis"]),
  group("construction", "advanced", ["triangularGrid", "polarGrid", "concentricSquares", "rootRectangles"]),
  group("brand", "advanced", ["inkHeightBands", "slantAngle", "strokeWeight", "reductionTest", "cornerRadii"]),
  group("type", "advanced", [
    "wordBaselines", "letterHeights", "letterRhythm", "letterAxes",
    "letterStemWidth", "opticalEdges", "counterAreas", "densityCurve",
  ]),
  group("signature", "advanced", ["signatureRelation", "xHeightGrid"]),
  group("gridOutput", "basic", ["isometricGrid", "pixelGrid", "contrastGuide", "kenBurnsSafe"]),
];

/**
 * Groups actually shown: the curated ones plus an "other" bucket with every
 * construction key that no group lists (new renderers land there instead of
 * disappearing from the UI).
 */
export const effectiveGeometryGroups: GeometryGroup[] = (() => {
  const grouped = new Set<string>(geometryGroups.flatMap(g => g.keys as string[]));
  const orphans = (GEOMETRY_KEYS as readonly (keyof GeometryOptions)[]).filter(k => !grouped.has(String(k)));
  return orphans.length ? [...geometryGroups, group("other", "advanced", [...orphans])] : geometryGroups;
})();

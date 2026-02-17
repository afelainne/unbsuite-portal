import opentype from "opentype.js";
import { SvgGlyphData, FontMetadata } from "../types";
import { parseSVGPathToOpenTypePath, sanitizeOpenTypeCommands } from "./fontService";
import { sanitizeGlyphPaths, applySanitizedPaths } from "./pathSanitizer";

type RawSvgData = { d: string | null; viewBox: [number, number, number, number] | null };

const parseViewBox = (value: string | null): [number, number, number, number] | null => {
  if (!value) return null;
  const parts = value.split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
};

const extractRawSvgData = (svg: string | undefined | null): RawSvgData => {
  if (!svg) return { d: null, viewBox: null };
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return { d: null, viewBox: null };

    const viewBox = parseViewBox(svgEl.getAttribute("viewBox"));
    const paths = Array.from(svgEl.querySelectorAll("path"));
    const d = paths
      .map(p => p.getAttribute("d") || "")
      .filter(Boolean)
      .join(" ")
      .trim();

    return { d: d || null, viewBox };
  } catch (err) {
    console.warn("Failed to extract raw SVG data", err);
    return { d: null, viewBox: null };
  }
};

const pathFromSvgWithViewBox = (
  d: string,
  viewBox: [number, number, number, number],
  upm: number
): opentype.Path => {
  const source = opentype.Path.fromSVG(d);
  const commands = sanitizeOpenTypeCommands(source.commands);
  const [minX, minY, width, height] = viewBox;
  const safeHeight = height || 1;
  // ViewBox scale normaliza o glyph para UPM - não aplicar userScale aqui
  const scale = upm / safeHeight;
  const offsetX = -minX * scale;
  // flip Y like the SVG table transform
  const offsetY = (minY + safeHeight) * scale;

  const out = new opentype.Path();
  commands.forEach(cmd => {
    const clone = { ...cmd } as any;
    const tx = (x: number | undefined) => (x === undefined ? x : x * scale + offsetX);
    const ty = (y: number | undefined) => (y === undefined ? y : -y * scale + offsetY);

    if (clone.x !== undefined) clone.x = tx(clone.x);
    if (clone.y !== undefined) clone.y = ty(clone.y);
    if (clone.x1 !== undefined) clone.x1 = tx(clone.x1);
    if (clone.y1 !== undefined) clone.y1 = ty(clone.y1);
    if (clone.x2 !== undefined) clone.x2 = tx(clone.x2);
    if (clone.y2 !== undefined) clone.y2 = ty(clone.y2);

    switch (clone.type) {
      case "M": out.moveTo(clone.x, clone.y); break;
      case "L": out.lineTo(clone.x, clone.y); break;
      case "C": out.curveTo(clone.x1, clone.y1, clone.x2, clone.y2, clone.x, clone.y); break;
      case "Q": out.quadraticCurveTo(clone.x1, clone.y1, clone.x, clone.y); break;
      case "Z": out.close(); break;
      default: break;
    }
  });
  return out;
};

export type ExportSvgFontMode = "outline_only" | "outline_plus_svg";

export interface SvgFontExportOptions {
  mode: ExportSvgFontMode;
  familyName: string;
  styleName: string;
  upm: number;
  ascender?: number;
  descender?: number;
  includeSvgForTextGlyphs?: boolean;
  preserveRawSvg?: boolean;
  debug?: boolean;
}

export interface SvgTableEntry {
  startGlyphID: number;
  endGlyphID: number;
  svg: string;
}

export interface SvgTableStub {
  version: number;
  reserved: number;
  entries: SvgTableEntry[];
}

export const mapSvgToFontCoords = (
  svgViewBox: [number, number, number, number],
  upm: number
): { scale: number; offsetX: number; offsetY: number } => {
  const [minX, minY, width, height] = svgViewBox;
  const safeHeight = height || 1;
  const scale = upm / safeHeight;
  const offsetX = -minX * scale;
  const offsetY = (minY + safeHeight) * scale; // flip eixo Y: leva origem do SVG (top-left) para baseline
  return { scale, offsetX, offsetY };
};

const getMetricsFromOptions = (
  options: SvgFontExportOptions,
  metadata?: Partial<FontMetadata>
) => {
  const upm = options.upm || metadata?.unitsPerEm || 1000;
  const ascender = options.ascender ?? metadata?.ascender ?? Math.round(upm * 0.8);
  const descender = options.descender ?? metadata?.descender ?? -Math.round(upm * 0.2);
  const tracking = metadata?.tracking ?? 0;
  return { upm, ascender, descender, tracking };
};

export const buildOutlineFontFromGlyphs = async (
  glyphs: SvgGlyphData[],
  options: SvgFontExportOptions,
  metadata?: Partial<FontMetadata>
): Promise<ArrayBuffer> => {
  const { upm, ascender, descender, tracking } = getMetricsFromOptions(options, metadata);

  // Sanitize all glyph paths before building outlines
  const sanitizeResults = sanitizeGlyphPaths(glyphs);
  const sanitizedGlyphs = applySanitizedPaths(glyphs, sanitizeResults);
  glyphs = sanitizedGlyphs;

  const notdefGlyph = new opentype.Glyph({
    name: ".notdef",
    unicode: 0,
    advanceWidth: Math.round(upm * 0.5),
    path: new opentype.Path()
  });

  const fontGlyphs = [notdefGlyph];
  const drawable = glyphs.filter(g => {
    const d = (g.svgPathData ?? g.pathData ?? "").trim();
    return Boolean(d);
  });

  drawable.forEach(g => {
    const rawData = options.preserveRawSvg ? extractRawSvgData(g.svgRaw) : { d: null, viewBox: null };
    const d = (rawData.d ?? g.svgPathData ?? g.pathData ?? "").trim();
    if (!d) return;
    const viewBox = rawData.viewBox ?? g.svgViewBox;
    const useRaw = Boolean(options.preserveRawSvg && viewBox);
    // Quando temos viewBox, o scale é calculado pelo viewBox (não usar g.scale)
    const path = useRaw && viewBox
      ? pathFromSvgWithViewBox(d, viewBox, options.upm)
      : parseSVGPathToOpenTypePath(
          d,
          g.scale ?? 1,
          g.leftSideBearing ?? 0,
          g.baselineOffset ?? 0,
          ascender,
          g.svgViewBox,
          options.upm,
          metadata?.baselineShift ?? 0
        );

    fontGlyphs.push(
      new opentype.Glyph({
        name: g.name || g.char,
        unicode: g.unicode,
        advanceWidth: (g.advanceWidth ?? 0) + tracking,
        path
      })
    );
  });

  const font = new opentype.Font({
    familyName: options.familyName,
    styleName: options.styleName,
    unitsPerEm: upm,
    ascender,
    descender,
    glyphs: fontGlyphs
  });

  // Kerning leve baseado no metadata atual (quando existir). Mantém pares diretos char-char.
  const kerningSource = metadata?.kerning || {};
  Object.entries(kerningSource).forEach(([pair, rawVal]) => {
    if (!pair || pair.length < 2) return;
    const leftChar = pair[0];
    const rightChar = pair[1];
    const val = typeof rawVal === "number" ? rawVal : Number(rawVal);
    if (!Number.isFinite(val)) return;

    const leftIndex = font.charToGlyphIndex(leftChar);
    const rightIndex = font.charToGlyphIndex(rightChar);
    if (leftIndex === null || rightIndex === null || leftIndex < 0 || rightIndex < 0) return;
    const kernPairs = (font as unknown as { kerningPairs: Record<number, Record<number, number>> }).kerningPairs || {};
    if (!kernPairs[leftIndex]) kernPairs[leftIndex] = {};
    kernPairs[leftIndex][rightIndex] = val;
    (font as unknown as { kerningPairs: Record<number, Record<number, number>> }).kerningPairs = kernPairs;
  });

  return font.toArrayBuffer();
};

const buildSvgTableFromGlyphs = (
  glyphs: SvgGlyphData[],
  font: opentype.Font,
  options: SvgFontExportOptions
): SvgTableStub => {
  const entries: SvgTableEntry[] = [];
  const includeSvgForTextGlyphs = options.includeSvgForTextGlyphs ?? false;

  glyphs.forEach(g => {
    const hasSvg = Boolean((g.svgPathData ?? g.pathData ?? "").trim() || (g.svgRaw ?? "").trim());
    if (!hasSvg) return;
    if (!g.isIconLike && !includeSvgForTextGlyphs) return;

    const glyphIdFromUnicode = g.unicode ? font.charToGlyphIndex(String.fromCharCode(g.unicode)) : -1;
    const glyphId = glyphIdFromUnicode >= 0 ? glyphIdFromUnicode : font.glyphs.glyphs.findIndex(gl => gl?.name === g.name);
    if (glyphId < 0) return;

    const rawData = options.preserveRawSvg ? extractRawSvgData(g.svgRaw) : { d: null, viewBox: null };
    const viewBox = rawData.viewBox ?? g.svgViewBox ?? [0, 0, options.upm, options.upm];
    const { scale, offsetX, offsetY } = mapSvgToFontCoords(viewBox, options.upm);
    const pathD = (g.svgPathData ?? g.pathData ?? "").trim();
    const raw = g.svgRaw?.trim();

    // Prefer the untouched raw SVG when requested, to preserve authoring exactly.
    const svgDoc = raw && options.preserveRawSvg !== false
      ? raw
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(" ")}"><g transform="translate(${offsetX.toFixed(3)} ${offsetY.toFixed(3)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})"><path d="${pathD}" fill="black" /></g></svg>`;

    entries.push({ startGlyphID: glyphId, endGlyphID: glyphId, svg: svgDoc });

    if (options.debug) {
      console.debug("[svg-first] SVG entry", {
        name: g.name,
        glyphId,
        hasRaw: Boolean(raw),
        viewBox,
        scale,
        offsetX,
        offsetY
      });
    }
  });

  // TODO: Serializar em binário seguindo a especificação OpenType-SVG (SVG Document List).
  // O objeto abaixo é um stub legível para testes internos; opentype.js não escreve a tabela SVG.
  return {
    version: 0,
    reserved: 0,
    entries
  };
};

export const exportSvgBasedFont = async (
  glyphs: SvgGlyphData[],
  options: SvgFontExportOptions,
  metadata?: Partial<FontMetadata>
): Promise<ArrayBuffer> => {
  if (!options || !options.familyName || !options.styleName) {
    throw new Error("Parâmetros de exportação inválidos: defina familyName e styleName.");
  }

  const mode = options.mode ?? "outline_only";

  // Default to embedding SVG for all glyphs when preserving raw content.
  if (options.includeSvgForTextGlyphs === undefined && options.preserveRawSvg !== false) {
    options.includeSvgForTextGlyphs = true;
  }

  // Primeiro, sempre geramos a base outline (fallback). Mantém geometrias fiéis.
  const outlineBuffer = await buildOutlineFontFromGlyphs(glyphs, { ...options, mode: "outline_only" }, metadata);

  if (mode === "outline_only") {
    return outlineBuffer;
  }

  // Esqueleto de OpenType-SVG: anexa uma tabela SVG stub à fonte base.
  const baseFont = opentype.parse(outlineBuffer);
  const svgTable = buildSvgTableFromGlyphs(glyphs, baseFont, options);
  (baseFont as unknown as { tables: Record<string, unknown> }).tables = {
    ...(baseFont as unknown as { tables: Record<string, unknown> }).tables,
    SVG: svgTable
  };

  return baseFont.toArrayBuffer();
};

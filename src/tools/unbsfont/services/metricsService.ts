import { GlyphData } from "../types";
import { measurePath } from "./importService";

interface ScaledBounds {
  leftEdge: number;
  width: number;
}

const getScaledBounds = (glyph: GlyphData): ScaledBounds | null => {
  if (!glyph.pathData) return null;
  const box = measurePath(glyph.pathData);
  if (box.width === 0 && box.height === 0) return null;
  const scale = glyph.scale || 1;
  return {
    leftEdge: box.x * scale,
    width: box.width * scale,
  };
};

/**
 * Returns a glyph with its outline centered according to the desired padding.
 */
export const autoCenterGlyph = (glyph: GlyphData, padding: number): GlyphData => {
  const bounds = getScaledBounds(glyph);
  if (!bounds) return glyph;

  const safePadding = Number.isFinite(padding) ? Math.max(0, padding) : 0;
  const leftSideBearing = Math.round(safePadding - bounds.leftEdge);
  const advanceWidth = Math.max(0, Math.round(leftSideBearing + bounds.width + safePadding));

  return { ...glyph, leftSideBearing, advanceWidth };
};

/**
 * Forces a glyph to adopt a fixed advance width without scaling the outline.
 */
export const enforceMonospaceWidth = (glyph: GlyphData, targetWidth: number): GlyphData => {
  const width = Number.isFinite(targetWidth) ? Math.max(0, targetWidth) : glyph.advanceWidth;
  if (width === 0) return glyph;

  const bounds = getScaledBounds(glyph);
  if (!bounds) {
    return { ...glyph, advanceWidth: width };
  }

  const leftover = Math.max(0, width - bounds.width);
  const targetLeftEdge = leftover / 2;
  const leftSideBearing = Math.round(targetLeftEdge - bounds.leftEdge);

  return { ...glyph, advanceWidth: width, leftSideBearing };
};

/**
 * Applies a multiplier to the advance width (and related side-bearing) without scaling geometry.
 */
export const scaleGlyphWidth = (glyph: GlyphData, multiplier: number): GlyphData => {
  if (!Number.isFinite(multiplier) || multiplier <= 0) return glyph;
  if (multiplier === 1) return glyph;

  const advanceWidth = Math.max(0, Math.round(glyph.advanceWidth * multiplier));
  const leftSideBearing = Math.round(glyph.leftSideBearing * multiplier);

  return { ...glyph, advanceWidth, leftSideBearing };
};

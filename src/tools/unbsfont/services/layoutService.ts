import { GlyphData, TrackingProfile } from "../types";
import { getTrackingBetweenGlyphs, isAllCapsWord } from "./trackingService";
import { resolveKerningValue } from "./kerningService";

export interface GlyphLayoutNode {
    char: string;
    glyph: GlyphData | null;
    x: number;
    advanceWidth: number;
    leftSideBearing: number;
    baselineOffset: number;
    scale: number;
    pathData: string | null;
}

export interface GlyphGapInfo {
    leftIndex: number;
    rightIndex: number;
    leftChar: string;
    rightChar: string;
    startX: number;
    endX: number;
    gap: number;
}

export interface GlyphSequenceLayout {
    nodes: GlyphLayoutNode[];
    gaps: GlyphGapInfo[];
    baselineY: number;
    viewBox: string;
    viewStart: number;
    viewWidth: number;
    viewHeight: number;
    viewOriginY: number;
    minX: number;
    maxX: number;
    totalAdvance: number;
}

interface LayoutOptions {
    sequence: string;
    glyphMap: Map<string, GlyphData>;
    kerning: Record<string, number>;
    trackingProfile: TrackingProfile;
    fontSizePt: number;
    baselineY?: number;
    viewHeight?: number;
    padding?: number;
    fallbackAdvanceWidth?: number;
    spaceAdvanceWidth?: number;
    viewOriginY?: number;
}

const DEFAULT_BASELINE_Y = 800;
const DEFAULT_VIEW_HEIGHT = 1200;
const DEFAULT_PADDING = 300;
const DEFAULT_FALLBACK_WIDTH = 400;
const DEFAULT_SPACE_WIDTH = 250;

export const computeGlyphSequenceLayout = ({
    sequence,
    glyphMap,
    kerning,
    trackingProfile,
    fontSizePt,
    baselineY = DEFAULT_BASELINE_Y,
    viewHeight = DEFAULT_VIEW_HEIGHT,
    padding = DEFAULT_PADDING,
    fallbackAdvanceWidth = DEFAULT_FALLBACK_WIDTH,
    spaceAdvanceWidth = DEFAULT_SPACE_WIDTH,
    viewOriginY,
}: LayoutOptions): GlyphSequenceLayout | null => {
    if (!sequence || sequence.length === 0) {
        return null;
    }

    const nodes: GlyphLayoutNode[] = [];
    const gaps: GlyphGapInfo[] = [];
    const allCapsContext = isAllCapsWord(sequence);

    let penX = 0;
    let minX = 0;
    let maxX = 0;

    const defaultTracking = trackingProfile?.defaultTracking ?? 0;

    for (let i = 0; i < sequence.length; i++) {
        const char = sequence[i];
        const glyph = glyphMap.get(char) ?? null;
        const isSpace = char === " ";

        const advanceWidth = glyph?.advanceWidth
            ?? (isSpace ? (glyphMap.get(" ")?.advanceWidth ?? spaceAdvanceWidth) : fallbackAdvanceWidth);
        const leftSideBearing = glyph?.leftSideBearing ?? 0;
        const baselineOffset = glyph?.baselineOffset ?? 0;
        const scale = glyph?.scale ?? 1;
        const pathData = glyph?.pathData ?? null;

        nodes.push({
            char,
            glyph,
            x: penX,
            advanceWidth,
            leftSideBearing,
            baselineOffset,
            scale,
            pathData,
        });

        const drawStart = penX + leftSideBearing;
        const drawEnd = penX + advanceWidth;
        minX = Math.min(minX, drawStart);
        maxX = Math.max(maxX, drawEnd);

        const nextChar = sequence[i + 1];
        if (!nextChar) {
            continue;
        }

        const nextGlyph = glyphMap.get(nextChar) ?? null;
        const trackingBetween = glyph && nextGlyph
            ? getTrackingBetweenGlyphs(glyph, nextGlyph, trackingProfile, fontSizePt, allCapsContext)
            : defaultTracking;
        const pairKerning = resolveKerningValue(glyph, nextGlyph, kerning);
        const spacingAdjustment = trackingBetween + pairKerning;
        const rightEdge = penX + advanceWidth;
        const nextStart = rightEdge + spacingAdjustment;

        gaps.push({
            leftIndex: i,
            rightIndex: i + 1,
            leftChar: char,
            rightChar: nextChar,
            startX: rightEdge,
            endX: nextStart,
            gap: spacingAdjustment,
        });

        penX = nextStart;
        maxX = Math.max(maxX, penX);
    }

    const paddedStart = Math.min(minX, 0) - padding;
    const contentWidth = Math.max(maxX - minX, 1);
    const viewWidth = contentWidth + padding * 2;
    const normalizedViewOriginY = typeof viewOriginY === 'number'
        ? viewOriginY
        : baselineY - viewHeight / 2;

    return {
        nodes,
        gaps,
        baselineY,
        viewBox: `${paddedStart} ${normalizedViewOriginY} ${viewWidth} ${viewHeight}`,
        viewStart: paddedStart,
        viewWidth,
        viewHeight,
        viewOriginY: normalizedViewOriginY,
        minX,
        maxX,
        totalAdvance: maxX - paddedStart,
    };
};

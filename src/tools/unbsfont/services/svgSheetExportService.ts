import { FontMetadata, GlyphData, generateInitialGlyphs } from '../types';
import { measurePath } from './importService';

interface SvgSheetOptions {
    columns?: number;
    cellWidth?: number;
    cellHeight?: number;
    padding?: number;
    emptyTemplate?: boolean; // when true, render placeholders only (no paths)
}

const DEFAULT_COLUMNS = 14;
const DEFAULT_CELL_WIDTH = 1400;
const DEFAULT_CELL_HEIGHT = 1400;
const DEFAULT_PADDING = 140;

const escapeXml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const formatNumber = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '0';

const triggerDownload = (fileName: string, textContent: string) => {
    const blob = new Blob([textContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const exportGlyphSvgSheet = (
    metadata: FontMetadata,
    glyphs: GlyphData[],
    options: SvgSheetOptions = {}
) => {
    if (typeof document === 'undefined') {
        throw new Error('SVG export only available in browser.');
    }

    if (!glyphs || glyphs.length === 0) {
        throw new Error('No slot available to export.');
    }

    const {
        columns = DEFAULT_COLUMNS,
        cellWidth = DEFAULT_CELL_WIDTH,
        cellHeight = DEFAULT_CELL_HEIGHT,
        padding = DEFAULT_PADDING,
        emptyTemplate = false,
    } = options;

    // When exporting an empty template, swap glyph data for pristine slots but keep order/count.
    const effectiveGlyphs = emptyTemplate ? generateInitialGlyphs() : glyphs;

    const rows = Math.ceil(effectiveGlyphs.length / columns);
    const totalWidth = columns * cellWidth;
    const totalHeight = rows * cellHeight;

    const safeFamily = (metadata.familyName || 'font').replace(/\s+/g, '-');
    const safeStyle = (metadata.styleName || 'Regular').replace(/\s+/g, '-');
    const fileName = `${safeFamily}-${safeStyle}-sheet.svg`;

    const cells: string[] = [];
    const baselineOffsetWithinCell = cellHeight - padding * 1.8;

    effectiveGlyphs.forEach((glyph, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const cellX = col * cellWidth;
        const cellY = row * cellHeight;
        const originX = cellX + padding;
        const baselineY = cellY + baselineOffsetWithinCell;
        const cellCenterX = cellX + cellWidth / 2;

        const hasPath = !emptyTemplate && Boolean(glyph.pathData && glyph.pathData.trim().length > 0);
        let translateX = originX + (glyph.leftSideBearing || 0);
        let translateY = baselineY + (glyph.baselineOffset || 0);
        const scale = glyph.scale || 1;
        const slotLabel = glyph.char || '?';

        // Keep glyph inside its cell: center on cell and clamp within padded bounds using measured path.
        if (hasPath) {
            const bounds = measurePath(glyph.pathData);
            const scaledWidth = bounds.width * scale;
            const scaledHeight = bounds.height * scale;
            const bboxLeft = translateX + bounds.x * scale;
            const bboxTop = translateY + bounds.y * scale;
            const bboxCx = bboxLeft + scaledWidth / 2;
            const bboxCy = bboxTop + scaledHeight / 2;
            const slotCx = cellX + cellWidth / 2;
            const slotCy = cellY + cellHeight / 2;

            // Center glyph in the cell
            translateX += slotCx - bboxCx;
            translateY += slotCy - bboxCy;

            const slotLeft = cellX + padding;
            const slotRight = cellX + cellWidth - padding;
            const slotTop = cellY + padding;
            const slotBottom = cellY + cellHeight - padding;

            const newLeft = translateX + bounds.x * scale;
            const newTop = translateY + bounds.y * scale;
            const newRight = newLeft + scaledWidth;
            const newBottom = newTop + scaledHeight;

            if (newLeft < slotLeft) translateX += slotLeft - newLeft;
            if (newRight > slotRight) translateX -= newRight - slotRight;
            if (newTop < slotTop) translateY += slotTop - newTop;
            if (newBottom > slotBottom) translateY -= newBottom - slotBottom;
        }

        const glyphMarkup = hasPath
            ? `<g transform="translate(${formatNumber(translateX)}, ${formatNumber(translateY)}) scale(${formatNumber(scale)})"><path d="${glyph.pathData}" /></g>`
            : `<text x="${formatNumber(cellCenterX)}" y="${formatNumber(baselineY - padding)}" text-anchor="middle" font-size="240" font-family="monospace" fill="#cbd5f5" opacity="0.35">${escapeXml(slotLabel)}</text>`;

        const cellMarkup = `
            <g id="slot-${index}" aria-label="${escapeXml(slotLabel)}">
                <rect x="${formatNumber(cellX + 12)}" y="${formatNumber(cellY + 12)}" width="${formatNumber(cellWidth - 24)}" height="${formatNumber(cellHeight - 24)}" rx="48" ry="48" fill="none" stroke="#e4e4e7" stroke-width="4" />
                <text x="${formatNumber(cellCenterX)}" y="${formatNumber(cellY + 110)}" text-anchor="middle" font-size="64" font-family="'Space Mono', 'Fira Mono', monospace" fill="#94a3b8" letter-spacing="0.3em">${escapeXml(slotLabel)}</text>
                <text x="${formatNumber(cellX + cellWidth - 120)}" y="${formatNumber(cellY + 110)}" text-anchor="end" font-size="32" font-family="'Space Mono', 'Fira Mono', monospace" fill="#cbd5f5" opacity="0.6">#${index + 1}</text>
                ${glyphMarkup}
            </g>
        `;

        cells.push(cellMarkup);
    });

    const svgHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatNumber(totalWidth)} ${formatNumber(totalHeight)}" width="${formatNumber(totalWidth)}" height="${formatNumber(totalHeight)}" fill="currentColor">
        <style>
            text { font-family: 'Space Mono', 'Fira Mono', monospace; }
            path { fill: currentColor; }
        </style>`;
    const svgClose = '</svg>';

    const sheet = [svgHeader, svgOpen, ...cells, svgClose].join('\n');
    triggerDownload(fileName, sheet);
};

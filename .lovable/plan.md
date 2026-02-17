
# Fix: Auto Position Should Normalize by Visual Height, Not Copy Scale

## Root Cause

The "Auto Position" feature copies `scale` directly from the reference glyph to all others. But each glyph has a **different native SVG path size** (depending on the source SVG's coordinate system). 

Example:
- Glyph "b" native path height: ~500 units. Scale 1.56 makes it 780 units tall -- correct.
- Glyph "r" native path height: ~800 units. Scale 1.56 makes it 1248 units tall -- way too big!

Both have the same `scale` value but look completely different sizes because their source SVGs use different coordinate ranges.

## Solution

Replace the "copy raw scale" approach with a **target-height normalization**. When Auto Position is applied:

1. Measure the **reference glyph's visual height** = `measurePath(refPath).height * refScale`
2. For each target glyph, calculate the correct scale = `targetVisualHeight / measurePath(glyphPath).height`
3. Apply the calculated per-glyph scale (not the reference's raw scale)

This ensures all glyphs reach the same visual height regardless of their native SVG dimensions.

## Changes

### File 1: `types.ts`

Update `autoPosition` to store `targetVisualHeight` instead of raw `scale`:

```text
autoPosition?: {
    targetVisualHeight: number;  // the visual height to match (in font units)
    baselineOffset: number;
    leftSideBearing: number;
    sourceChar: string;
    sourceScale: number;  // keep for display only
};
```

### File 2: `App.tsx` - `applyAutoPositionToAll`

Change the propagation logic:

```text
// OLD (buggy): g.scale = autoPos.scale
// NEW: calculate per-glyph scale based on target visual height
const bbox = measurePath(g.pathData);
if (bbox.height > 0) {
    const newScale = autoPos.targetVisualHeight / bbox.height;
    return { ...g, scale: newScale, baselineOffset: autoPos.baselineOffset, leftSideBearing: autoPos.leftSideBearing };
}
```

### File 3: `EditorModal.tsx` - "Usar como referencia" handler

When setting the reference, calculate and store the visual height:

```text
// When user clicks "Usar como referencia":
const bbox = measurePath(data.pathData);
const visualHeight = bbox.height * data.scale;
onUpdateMetadata(prev => ({
    ...prev,
    autoPosition: {
        targetVisualHeight: visualHeight,
        baselineOffset: data.baselineOffset,
        leftSideBearing: data.leftSideBearing,
        sourceChar: data.char,
        sourceScale: data.scale,
    }
}));
```

Also update "Resetar para auto" to use the same per-glyph calculation.

### File 4: `glyphDiagnosticService.ts` - `autoNormalizeAllSizes`

Apply the same per-glyph scale calculation in the normalize function (if it was already added from the previous plan):

```text
// Instead of: fixes.set(char, { scale: medianScale })
// Use: 
const bbox = measurePath(g.pathData);
const targetHeight = medianVisualHeight; // median of (bbox.height * scale) in category
const newScale = targetHeight / bbox.height;
fixes.set(char, { scale: newScale, ... });
```

## Execution Order

| # | Task | File |
|---|------|------|
| 1 | Update `autoPosition` type to use `targetVisualHeight` | types.ts |
| 2 | Fix `applyAutoPositionToAll` to calculate per-glyph scale | App.tsx |
| 3 | Fix "Usar como referencia" to store visual height | EditorModal.tsx |
| 4 | Fix "Resetar para auto" to use per-glyph calculation | EditorModal.tsx |
| 5 | Add `autoNormalizeAllSizes` with correct per-glyph logic | glyphDiagnosticService.ts |
| 6 | Add "Normalizar Tamanhos" button to GlyphDiagnostics.tsx | GlyphDiagnostics.tsx |

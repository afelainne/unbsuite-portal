

# Fix: Line Gap at 0 Should Mean Lines Touching

## Problem

Each glyph span has `spanHeight = fontSize * (viewBoxHeight / upm)` where `viewBoxHeight = ascender + descender + accentSpace`. For a typical font (ascender=800, descender=200, accentSpace=250, upm=1000):

- spanHeight = 64 * (1250 / 1000) = 80px
- But fontSize is only 64px

The current compensation `marginBottom: -(spanHeight - fontSize) * 0.2` only removes 20% of the excess (3.2px). The remaining 12.8px per line creates the large gap even when lineGap=0.

## Fix

Set each line div to a fixed height based on the font's body (ascender + descender) and let accent marks overflow visually. This way lineGap=0 means the descender of line 1 touches the ascender of line 2.

### TestMode.tsx Changes

1. Calculate `lineBodyHeight` = `fontSize * (ascender + descender) / upm` (the "real" line height without accent space)
2. Set line div to `height: lineBodyHeight` with `overflow: visible`
3. Remove `marginBottom` hack from individual spans (no longer needed since line height is controlled at the container level)
4. Keep `marginTop: lineSpacing` for the gap between lines

### Technical Detail

```
// Line container:
const lineBodyHeight = fontSize * (ascender + descender) / upm;
// For ascender=800, descender=200, upm=1000, fontSize=64:
// lineBodyHeight = 64 * 1000/1000 = 64px (lines touch at lineGap=0)

<div style={{
    height: lineBodyHeight,
    overflow: 'visible',  // accent marks can exceed
    marginTop: lineIdx > 0 ? lineSpacing : 0,
}}>
```

For individual spans, remove `marginBottom: -(spanHeight - fontSize) * 0.2` -- no longer needed since the line container controls height.

### Files to Edit

| File | Change |
|------|--------|
| TestMode.tsx (line 286-293) | Add `height: lineBodyHeight, overflow: 'visible'` to line div style |
| TestMode.tsx (line 352) | Remove `marginBottom` from span style |


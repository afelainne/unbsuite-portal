## Goal

Improve the **Albers Interaction Squares** (section 2) and **Custom Combinations** (section 3) shuffle so results vary more and prefer high-contrast combos, and add a small **SVG paste field** next to the existing Upload SVG button so users can paste raw `<svg>` markup as an alternative to file upload.

## Changes — `src/tools/unbscolor/components/GeneratedPalettes.tsx`

### 1. Smarter combo generation (`albersGrid` useMemo, ~L230–279)

Replace the current naive nested loop + sin-based shuffle with a richer, less repetitive generator:

- For every ordered pair `(outer, middle)` with `outer ≠ middle`, pick the `inner` color from the palette (excluding outer/middle) that maximizes the contrast ratio against `middle`. Today it can pick the same color as `middle` because the loop scans all colors — fix that.
- Score each combo by `comboScore = contrast(middle, inner) * 0.6 + contrast(outer, middle) * 0.3 + weightFactor * 0.1`.
- Deduplicate combos that share the same `{middle, inner}` pair regardless of outer when there are too many; keep the top-N variants per middle to reduce repetition.
- Sort by score descending; in non-FullContrast mode keep all, in FullContrast filter to `contrast(middle, inner) >= 4.5` and `contrast(outer, middle) >= 3.0`.
- Apply a **proper Fisher–Yates shuffle seeded by `albersSeed`** (use a small mulberry32 PRNG from the seed) instead of the broken `Math.sin(...) % range` trick, so each shuffle truly reorders the list.
- Interleave by hue: after shuffle, walk the list and push items so adjacent positions don't share the same `middle` or `inner` hue (greedy reorder). This visibly reduces repetition.

### 2. `shuffleAlbers` (~L364–389)

- Increment `albersSeed` *and* clear `comboOrder` whenever there are no locks (already done), but also bump seed when there are locks so unlocked positions pull from a freshly reshuffled grid (currently locked-mode never advances the seed, so unlocked slots repeat).
- When picking replacements for unlocked slots, prefer combos not already visible to maximize variety.

### 3. SVG paste field (header bar, ~L1212–1217)

Next to the existing "Upload SVG" label, add a compact paste input:

```text
[ Upload SVG ]  [ <svg…/> paste here ▸ Apply ]  [ Sugerir Combinação ] …
```

- A small `<input type="text">` (mono, 220px wide, h-9) with placeholder `Cole código SVG…`.
- An `Apply` button that runs the same color-extraction logic as `handleSvgUpload` but on the pasted string. Refactor the regex/extraction block from `handleSvgUpload` into a `extractColorsFromSvgText(text: string)` helper, called by both file upload and paste.
- On success: replace `colors` (same behavior as upload) and clear the field. On no colors found: brief inline hint text.

### 4. i18n (optional, low priority)

Add keys `pasteSvgPlaceholder` / `pasteSvgApply` to `src/tools/unbscolor/i18n/translations.ts` (en/pt/es). If skipped, hardcode PT strings to match the existing PT-heavy UI in this section.

## Out of scope

- No changes to template SVG generators, layer count, background, or download flow.
- No DB / auth changes.

## Files touched

- `src/tools/unbscolor/components/GeneratedPalettes.tsx` (logic + small UI addition)
- `src/tools/unbscolor/i18n/translations.ts` (3 strings, optional)

# Fix UNBSCOLOR & UNBSFONT chrome regressions

## Diagnostic summary

**UNBSCOLOR**
- `.tool-subheader` uses `sticky top-14` but the global `Header` is `h-12` → 8px misalignment and the subheader visually overlaps the content because the inner `<main>` scroller has no top padding.
- `.nav-tab` uses `text-xs md:text-sm font-bold` (12-14 px, sans) — outside the new mono Swiss system.
- Active/hover underline uses `hsl(var(--accent))` = yellow — user wants **black**.
- Scroll is broken: `Header` is `sticky top-0` inside the flex column, but `<main className="overflow-auto">` is the actual scroller, so `.tool-subheader sticky top-14` is anchored against the *viewport*, not the scroller, so it scrolls away.

**UNBSFONT**
- `Dashboard.tsx` and `ModeSelector.tsx` use `min-h-screen` while sitting inside `ToolLayout` (`h-dvh` − 48 px header). That forces 100 vh inside an already constrained box → vertical overflow and the content shifts off-center.
- `Dashboard.tsx` keeps an empty 256 px sidebar (only an invisible file input), pushing all main content visibly to the right.
- `ModeSelector.tsx` uses generic sans titles (`text-2xl font-black`) — out of sync with the rest of the chrome.

---

## Changes

### 1. `src/index.css` — fix subheader & nav tabs
- `.tool-subheader`: change `sticky top-14 … py-4 bg-card/95` → `sticky top-0 … py-2 bg-white border-[#232323]/15`. (top-0 because it now sits inside the scrolling `<main>`, just below the global Header.)
- `.nav-tab`: replace classes with `font-mono text-[10px] uppercase tracking-[0.2em] font-semibold text-[#232323]/55`.
- Hover/active color → `text-[#232323]` (black). Underline `background: #232323` (black, not accent yellow).
- Reduce underline thickness to `1px`.

### 2. `src/components/ToolLayout.tsx` — make scroll predictable
- For `chrome="page"`: keep `<main className="flex-1 overflow-auto">` but add a wrapping container so `.tool-subheader sticky top-0` works correctly. No structural removal — just ensure the `<header>` sibling is outside the scroller (already is). Remove the `py-6 md:py-10` from `<main>` so the sticky subheader hugs the top; move padding to the inner content wrapper inside each tool when needed.

### 3. `src/tools/unbscolor/App.tsx`
- Wrap content area in a div instead of relying on `<main>` padding.
- Drop `max-w-[1600px] mx-auto px-8 pb-20 pt-8` from the outer `<main>` (which lives inside `ToolLayout`'s main): keep the inner content padding only on the content wrapper after the subheader.
- Settings cog button: remove `h-10 w-10 rounded-md` → use `h-7 w-7` square (matches `ToolButton icon`).
- Remove duplicate `text-sm` on tab nav already handled by `.nav-tab`.

### 4. `src/tools/unbsfont/components/Dashboard.tsx`
- Replace `min-h-screen p-8 font-sans flex overflow-hidden` → `h-full w-full p-8 font-sans flex overflow-hidden`.
- Remove the empty `w-64` sidebar wrapper; keep only the hidden file input as a sibling.
- Make the main column `flex-1 flex flex-col h-full overflow-y-auto` (no `pl-12`, use natural padding).
- Standardize the “Projects” title to `font-mono text-[11px] uppercase tracking-[0.2em] font-semibold` + a smaller secondary line.

### 5. `src/tools/unbsfont/components/ModeSelector.tsx`
- Replace `min-h-screen` → `h-full w-full`.
- Titles: `font-mono text-[11px] uppercase tracking-[0.2em] font-semibold` for "Select Editor Mode"; cards use mono uppercase 10 px labels and 9 px badges.
- Remove emoji icons; use simple square swatches in `#F0FF00` / `#232323` for the Compact / Advanced indicators.
- Cards: `border` (1 px) `border-[#232323]/20 hover:border-[#232323] rounded-none`, accent on hover via `hover:bg-[#F7E043]/20`.

### 6. (Light) `src/tools/unbsfont/App.tsx`
- Ensure the root wrapper around `Dashboard` / `ModeSelector` is `h-full w-full` (no `min-h-screen`) so it inherits the `ToolLayout` height.

## Verification
- UNBSCOLOR: header no longer overlaps content; tabs are small mono uppercase, black underline on hover/active; page scrolls vertically with subheader staying pinned just under the top header.
- UNBSFONT: Dashboard and ModeSelector occupy the available space, content is centered, titles match the rest of the toolset.
- No new dependencies, no DB changes.

# UI kit — UNBSTOOLS Workspace app

Design width **1440px**. Open `index.html`; the nav rail is live.

| File | Surface |
| --- | --- |
| `AppShell.jsx` | Top bar (wordmark, 52px nav rail, detached search, header cluster) and the title row with breadcrumb, quick actions and the black Share pill. |
| `OverviewScreen.jsx` | Front page: centred 88px hero metric, dense dual-layer bar chart with a floating insight, and the four-card metric row. |
| `LibraryScreen.jsx` | Tool grid — pill filter tabs, 4-up tiles with inset media placeholders, hover reveal. |
| `AutomationsScreen.jsx` | Hairline row list with live/paused badges and switches, plus three summary cards. |
| `UsageScreen.jsx` | Score gauge, three staged survey cards, and the 96-bar score distribution. |

Screens consume the design-system primitives from `_ds_bundle.js` via `window.DS`; none of them re-implement a primitive.

**Deliberately blank:** Kits, Docs and Team render an explicit "not part of this kit" state — the source material showed no such screens, so nothing was invented for them.

**Placeholders:** tool thumbnails and avatars are flat tinted slots / initials. No product imagery or photography was supplied.

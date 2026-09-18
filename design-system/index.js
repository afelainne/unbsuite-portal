/**
 * UNBSTOOLS design system — public entry point.
 *
 * Import components from here, never from a component file directly:
 *   import { Button, MetricBlock } from "../../design-system";
 *
 * The adherence lint rule (see eslint.config.js) enforces that, so a later
 * refactor inside `components/` cannot break call sites.
 *
 * These components style themselves with the CSS custom properties defined in
 * `styles.css`. A page that uses them must load that file (or the tokens it
 * imports) first, otherwise every colour, size and radius falls back to the
 * browser default. The UNBS Suite app does NOT load it globally on purpose —
 * see README.md, "Como este sistema convive com o app".
 */

// core
export { Badge } from "./components/core/Badge.jsx";
export { Button } from "./components/core/Button.jsx";
export { Card } from "./components/core/Card.jsx";
export { Chip } from "./components/core/Chip.jsx";
export { IconButton } from "./components/core/IconButton.jsx";
export { SectionLabel } from "./components/core/SectionLabel.jsx";

// forms
export { SearchInput } from "./components/forms/SearchInput.jsx";
export { SeriesToggle } from "./components/forms/SeriesToggle.jsx";
export { Switch } from "./components/forms/Switch.jsx";
export { Tabs } from "./components/forms/Tabs.jsx";

// data
export { BarSeries } from "./components/data/BarSeries.jsx";
export { Gauge } from "./components/data/Gauge.jsx";
export { InsightPopover } from "./components/data/InsightPopover.jsx";
export { LegendList } from "./components/data/LegendList.jsx";
export { MetricBlock } from "./components/data/MetricBlock.jsx";

// navigation
export { AvatarStack } from "./components/navigation/AvatarStack.jsx";
export { Breadcrumb } from "./components/navigation/Breadcrumb.jsx";
export { CommandBar } from "./components/navigation/CommandBar.jsx";
export { NavRail } from "./components/navigation/NavRail.jsx";

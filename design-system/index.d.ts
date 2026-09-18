/**
 * Types for the UNBSTOOLS design system entry point.
 * Each component ships its own `.d.ts` next to the `.jsx`; this file only
 * re-exports them so `import { Button } from "design-system"` is typed.
 */

// core
export { Badge, type BadgeProps } from "./components/core/Badge";
export { Button, type ButtonProps } from "./components/core/Button";
export { Card, type CardProps } from "./components/core/Card";
export { Chip, type ChipProps } from "./components/core/Chip";
export { IconButton, type IconButtonProps } from "./components/core/IconButton";
export { SectionLabel, type SectionLabelProps } from "./components/core/SectionLabel";

// forms
export { SearchInput, type SearchInputProps } from "./components/forms/SearchInput";
export { SeriesToggle, type SeriesToggleProps, type SeriesOption } from "./components/forms/SeriesToggle";
export { Switch, type SwitchProps } from "./components/forms/Switch";
export { Tabs, type TabsProps, type TabItem } from "./components/forms/Tabs";

// data
export { BarSeries, type BarSeriesProps, type BarDatum } from "./components/data/BarSeries";
export { Gauge, type GaugeProps } from "./components/data/Gauge";
export { InsightPopover, type InsightPopoverProps } from "./components/data/InsightPopover";
export { LegendList, type LegendListProps, type LegendItem } from "./components/data/LegendList";
export { MetricBlock, type MetricBlockProps } from "./components/data/MetricBlock";

// navigation
export { AvatarStack, type AvatarStackProps, type Person } from "./components/navigation/AvatarStack";
export { Breadcrumb, type BreadcrumbProps, type Crumb } from "./components/navigation/Breadcrumb";
export { CommandBar, type CommandBarProps } from "./components/navigation/CommandBar";
export { NavRail, type NavRailProps, type NavRailItem } from "./components/navigation/NavRail";

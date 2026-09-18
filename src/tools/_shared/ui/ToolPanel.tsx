import React, { useState } from "react";
import { ChevronRight } from "lucide-react";

interface PanelProps {
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}

/**
 * Sidebar panel: a heavier translucent material than the toolbar, so it
 * reads as structure. Separated by a hairline, never a hard border.
 */
export const ToolPanel: React.FC<PanelProps> = ({ side = "left", children, className = "" }) => (
  <aside
    className={`w-[280px] flex-shrink-0 material-sidebar overflow-y-auto ${
      side === "left" ? "hairline-r" : "hairline-l"
    } ${className}`}
  >
    {children}
  </aside>
);

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  meta?: string;
  children: React.ReactNode;
}

export const ToolPanelSection: React.FC<SectionProps> = ({
  title,
  defaultOpen = true,
  meta,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="px-2 pt-1 pb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="panel-section-head"
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="flex items-center gap-2">
          {meta && <span className="text-[11px] font-normal text-muted-foreground tabular-nums">{meta}</span>}
          <ChevronRight
            className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-base ease-out"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
            strokeWidth={2.25}
          />
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-base ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-3 pt-1 space-y-2.5">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default ToolPanel;

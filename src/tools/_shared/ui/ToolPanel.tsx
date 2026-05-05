import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface PanelProps {
  side?: "left" | "right";
  children: React.ReactNode;
  className?: string;
}

export const ToolPanel: React.FC<PanelProps> = ({ side = "left", children, className = "" }) => (
  <aside
    className={`w-[280px] flex-shrink-0 bg-white overflow-y-auto ${
      side === "left" ? "border-r" : "border-l"
    } border-[#232323]/15 ${className}`}
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
    <section className="border-b border-[#232323]/10">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 h-9 hover:bg-[#F7E043]/20"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#232323]">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {meta && (
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#232323]/50">
              {meta}
            </span>
          )}
          {open ? (
            <ChevronDown className="h-3 w-3 text-[#232323]/60" />
          ) : (
            <ChevronRight className="h-3 w-3 text-[#232323]/60" />
          )}
        </span>
      </button>
      {open && <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>}
    </section>
  );
};

export default ToolPanel;
import { Link } from "react-router-dom";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";
import { Palette, LayoutGrid, Type, Plus, Shield } from "lucide-react";

const tools = [
  {
    name: "UNBSCOLOR",
    description: "Filtro e paleta de cores",
    icon: Palette,
    path: "/unbscolor",
    label: "FEATURED",
  },
  {
    name: "UNBSGRID",
    description: "Grid de logos",
    icon: LayoutGrid,
    path: "/unbsgrid",
    label: "PROJECT",
  },
  {
    name: "UNBSFONT",
    description: "Editor de fontes",
    icon: Type,
    path: "/unbsfont",
    label: "NEW",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
      {/* Device Frame */}
      <div className="relative w-full max-w-4xl border-2 border-foreground rounded-3xl overflow-hidden bg-background">
        {/* Corner decorations */}
        <div className="absolute top-3 left-3 text-foreground/30">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
        <div className="absolute top-3 right-3 text-foreground/30">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-3 left-3 text-foreground/30">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>
        <div className="absolute bottom-3 right-3 text-foreground/30">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        </div>

        {/* Header with logo */}
        <div className="flex items-center justify-center py-5 px-6">
          <UnbsToolsLogo height={28} color="hsl(var(--foreground))" />
        </div>

        {/* Main lime area */}
        <div className="mx-5 mb-3 relative rounded-2xl bg-lime overflow-hidden" style={{ minHeight: "420px" }}>
          {/* Emblem top-left */}
          <div className="absolute top-4 left-4">
            <Shield className="h-6 w-6 text-lime-foreground/60" strokeWidth={1.5} />
          </div>



          {/* Center content */}
          <div className="flex flex-col items-center justify-center h-full pt-16 pb-12 px-12">
            {/* Tool buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-auto mb-auto">
              {tools.map((tool) => (
                <Link
                  key={tool.name}
                  to={tool.path}
                  className="group flex items-center gap-2.5 border border-lime-foreground/80 rounded-full px-5 py-2.5 hover:bg-lime-foreground hover:text-lime transition-all duration-200"
                >
                  <tool.icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-xs font-bold uppercase tracking-wider">{tool.name}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wide opacity-60 border-l border-current pl-2.5">
                    {tool.label}
                  </span>
                </Link>
              ))}
            </div>


          </div>
        </div>

        {/* Status bar */}
        <div className="mx-5 mb-3 flex items-center gap-2 bg-foreground rounded-lg px-4 py-2">
          {/* Barcode visual */}
          <div className="flex items-end gap-[2px] h-4">
            {[3,5,2,6,4,7,3,5,2,4,6,3,5,7,2,4,3,6,5,2,7,4,3,5,6,2,4,7,3,5].map((h, i) => (
              <div
                key={i}
                className="w-[1.5px] bg-primary-foreground/70 rounded-full"
                style={{ height: `${h * 2}px` }}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-[9px] font-mono text-primary-foreground/50 uppercase">
              SYS.ACTIVE
            </span>
            <span className="text-[9px] font-mono text-primary-foreground/50">
              2026.02
            </span>
            <div className="h-1.5 w-1.5 rounded-full bg-lime" />
          </div>
        </div>

        {/* Info cards */}
        <div className="mx-5 mb-5 grid grid-cols-2 gap-3">
          <div className="border border-foreground/20 rounded-lg px-4 py-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              UNBS // LINK_LOAD
            </p>
            <p className="text-[10px] font-mono text-foreground/70">
              unbserved.com/tools
            </p>
          </div>
          <div className="border border-foreground/20 rounded-lg px-4 py-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              UNBS-17 // FEATURED
            </p>
            <p className="text-[10px] font-mono text-foreground/70">
              Curadoria criativa v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

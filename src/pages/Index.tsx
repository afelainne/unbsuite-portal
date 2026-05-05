import { Link } from "react-router-dom";

type Status = "FEATURED" | "STABLE" | "NEW" | "SOON";

interface Tool {
  index: string;
  name: string;
  tagline: string;
  copy: string;
  status: Status;
  path: string;
  year: string;
}

const TOOLS: Tool[] = [
  { index: "01", name: "UNBSCOLOR", tagline: "Filtro & paleta", copy: "Filtro brutal de paletas. PMS, CMYK, LAB.", status: "FEATURED", path: "/unbscolor", year: "2026" },
  { index: "02", name: "UNBSGRID", tagline: "Anatomia de logo", copy: "Malha geométrica. Razão áurea, espirais, eixos.", status: "STABLE", path: "/unbsgrid", year: "2026" },
  { index: "03", name: "UNBSFORMAT", tagline: "Print assistant", copy: "Bleed, sangria, malha. Pronto pra gráfica.", status: "NEW", path: "/unbsformat", year: "2026" },
  { index: "04", name: "UNBSFONT", tagline: "Editor de fontes", copy: "Editor vetorial. Glyphs, kerning, export OTF.", status: "NEW", path: "/unbsfont", year: "2026" },
];

const Index = () => {
  return (
    <div className="min-h-dvh bg-background text-foreground font-sans">
      {/* Top bar — Swiss grid */}
      <header className="border-b border-foreground">
        <div className="container-fluid grid grid-cols-12 items-center h-12">
          <div className="col-span-6 md:col-span-3 font-mono text-[10px] uppercase tracking-[0.2em]">
            UNBS / Suite
          </div>
          <div className="hidden md:block col-span-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Index of applications
          </div>
          <div className="col-span-6 md:col-span-3 text-right font-mono text-[10px] uppercase tracking-[0.2em]">
            <Link to="/login" className="hover:underline">Login</Link>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>2026.04</span>
          </div>
        </div>
      </header>

      {/* Title row */}
      <section className="border-b border-foreground">
        <div className="container-fluid grid grid-cols-12 gap-6 py-10">
          <div className="col-span-12 md:col-span-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            § Apps
          </div>
          <h1 className="col-span-12 md:col-span-8 text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-[-0.03em] leading-[0.95]">
            Applications
          </h1>
          <div className="col-span-12 md:col-span-2 text-right font-mono text-[10px] uppercase tracking-[0.2em]">
            {String(TOOLS.length).padStart(2, "0")} / Total
          </div>
        </div>
      </section>

      {/* Column headers */}
      <div className="border-b border-foreground bg-card/40">
        <div className="container-fluid grid grid-cols-12 gap-6 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          <div className="col-span-1">Nº</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-2 hidden md:block">Function</div>
          <div className="col-span-4 hidden md:block">Description</div>
          <div className="col-span-1 hidden md:block">Year</div>
          <div className="col-span-8 md:col-span-1 text-right">Status</div>
        </div>
      </div>

      {/* App list */}
      <ul>
        {TOOLS.map((t) => (
          <li key={t.name} className="border-b border-border">
            <Link
              to={t.path}
              className="container-fluid grid grid-cols-12 gap-6 items-baseline py-6 group hover:bg-secondary/60 transition-colors"
            >
              <div className="col-span-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                {t.index}
              </div>
              <div className="col-span-7 md:col-span-3">
                <div className="text-2xl md:text-3xl font-bold tracking-[-0.02em] uppercase leading-none group-hover:underline underline-offset-[6px] decoration-1">
                  {t.name}
                </div>
              </div>
              <div className="col-span-12 md:col-span-2 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground/70">
                {t.tagline}
              </div>
              <div className="col-span-12 md:col-span-4 text-sm text-muted-foreground leading-snug">
                {t.copy}
              </div>
              <div className="col-span-6 md:col-span-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                {t.year}
              </div>
              <div className="col-span-4 md:col-span-1 text-right">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] border border-foreground/40 px-1.5 py-0.5">
                  {t.status}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <footer className="border-t border-foreground mt-16">
        <div className="container-fluid grid grid-cols-12 gap-6 py-6 font-mono text-[10px] uppercase tracking-[0.2em]">
          <div className="col-span-6 md:col-span-3 text-muted-foreground">© 2026 Unbserved</div>
          <div className="hidden md:block col-span-6 text-muted-foreground">Built with obsession · Not for everyone</div>
          <div className="col-span-6 md:col-span-3 text-right">
            <a href="mailto:hello@unbserved.com" className="hover:underline">hello@unbserved.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
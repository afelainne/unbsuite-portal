import { Link } from "react-router-dom";
import {
  Palette,
  LayoutGrid,
  FileText,
  Monitor,
  ALargeSmall,
  Type,
  ArrowRight,
  ArrowDown,
  Plus,
  Shield,
  Github,
  Mail,
} from "lucide-react";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";

type ToolStatus = "FEATURED" | "STABLE" | "NEW" | "SOON";

interface Tool {
  index: string;
  name: string;
  tagline: string;
  copy: string;
  status: ToolStatus;
  path: string;
  icon: typeof Palette;
}

const TOOLS: Tool[] = [
  {
    index: "01",
    name: "UNBSCOLOR",
    tagline: "Filtro & paleta",
    copy: "Filtro brutal de paletas. PMS, CMYK, LAB. Sem achismo de cor.",
    status: "FEATURED",
    path: "/unbscolor",
    icon: Palette,
  },
  {
    index: "02",
    name: "UNBSGRID",
    tagline: "Anatomia de logo",
    copy: "Malha geométrica pra logo. Razão áurea, espirais, eixos. Sem desculpa.",
    status: "STABLE",
    path: "/unbsgrid",
    icon: LayoutGrid,
  },
  {
    index: "03",
    name: "UNBSFORMAT",
    tagline: "Print assistant",
    copy: "Assistente de impressão honesto. Bleed, sangria, malha — pronto pra gráfica.",
    status: "NEW",
    path: "/unbsformat",
    icon: FileText,
  },
  {
    index: "04",
    name: "UNBSMOCKUP",
    tagline: "Mockup engine",
    copy: "Mockups que parecem produto, não Behance. Edite o conteúdo, não o estilo.",
    status: "NEW",
    path: "/unbsmockup",
    icon: Monitor,
  },
  {
    index: "05",
    name: "UNBSTYPE",
    tagline: "Pares tipográficos",
    copy: "Pareamentos curados. Sem combinar Roboto com Roboto.",
    status: "NEW",
    path: "/unbstype",
    icon: ALargeSmall,
  },
  {
    index: "06",
    name: "UNBSFONT",
    tagline: "Editor de fontes",
    copy: "Editor de fontes vetorial. Glyphs, kerning, export OTF. Sem floreios.",
    status: "NEW",
    path: "/unbsfont",
    icon: Type,
  },
];

const STATUS_STYLE: Record<ToolStatus, string> = {
  FEATURED: "bg-accent text-accent-foreground border-accent",
  STABLE: "bg-foreground text-background border-foreground",
  NEW: "bg-card text-foreground border-foreground/30",
  SOON: "bg-transparent text-muted-foreground border-border",
};

const STATS = [
  { k: "06", v: "TOOLS" },
  { k: "100%", v: "LOCAL" },
  { k: "0", v: "TRACKERS" },
  { k: "∞", v: "POSSIBILIDADES" },
];

const PRINCIPLES = [
  {
    n: "I.",
    title: "Curadoria brutal",
    body: "A gente corta o que não merece estar aqui. Cada ferramenta passa por dezenas de iterações antes de virar release.",
  },
  {
    n: "II.",
    title: "Ferramentas de ofício",
    body: "Feitas pra designer, não pra demo de pitch. Atalho de teclado, export limpo, zero modal de upgrade.",
  },
  {
    n: "III.",
    title: "Zero ruído",
    body: "Sem upsell, sem onboarding chato, sem dark pattern. Você abre, usa, fecha. Nada vaza.",
  },
];

const Index = () => {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ============================
          TOP BAR
          ============================ */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container-fluid flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <UnbsToolsLogo height={20} color="hsl(var(--foreground))" />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <a
              href="#tools"
              className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              Tools
            </a>
            <a
              href="#manifesto"
              className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              Manifesto
            </a>
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-secondary transition-colors"
            >
              Login
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="pill-status hidden sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
              SYS.ACTIVE · 2026.04
            </span>
          </div>
        </div>
      </header>

      {/* ============================
          HERO
          ============================ */}
      <section className="container-fluid pt-12 md:pt-20 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-stretch">
          {/* Left — copy */}
          <div className="flex flex-col justify-between gap-10">
            <p className="eyebrow-strong">UNBS.SUITE // V2.0 — BRUTALLY CURATED</p>

            <h1 className="text-balance font-bold tracking-[-0.04em] leading-[0.92] text-[clamp(2.5rem,7vw,6rem)]">
              Ferramentas que tratam design como{" "}
              <span className="bg-accent px-2 -mx-1 box-decoration-clone">ofício</span>,
              não como template.
            </h1>

            <p className="max-w-xl text-base md:text-lg text-foreground/70 leading-relaxed">
              Cinco apps. Zero ruído. Cor, grid, formato, mockup e tipografia
              construídos por quem cansou de plugin de Figma meia-boca e
              ferramenta SaaS com nome de start-up.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a href="#tools" className="btn-primary group">
                Explorar a suíte
                <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" strokeWidth={2} />
              </a>
              <a href="#manifesto" className="btn-ghost">
                Ler o manifesto
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
          </div>

          {/* Right — device frame decorative */}
          <div className="relative rounded-2xl border-2 border-foreground bg-background overflow-hidden min-h-[360px]">
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

            <div className="flex items-center justify-center py-5 px-6">
              <UnbsToolsLogo height={20} color="hsl(var(--foreground))" />
            </div>

            <div className="mx-5 mb-3 relative rounded-xl bg-accent overflow-hidden min-h-[220px] flex flex-col">
              <div className="absolute top-4 left-4">
                <Shield className="h-5 w-5 text-accent-foreground/60" strokeWidth={1.5} />
              </div>
              <p className="absolute top-4 right-4 font-mono text-[9px] uppercase tracking-[0.2em] text-accent-foreground/60">
                UNBS-17
              </p>

              <div className="m-auto text-center px-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-foreground/70 mb-3">
                  Curadoria criativa
                </p>
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-accent-foreground leading-none">
                  Built with
                  <br />
                  obsession.
                </p>
              </div>
            </div>

            <div className="mx-5 mb-3 flex items-center gap-2 bg-foreground rounded-md px-4 py-2">
              <div className="flex items-end gap-[2px] h-3.5">
                {[3, 5, 2, 6, 4, 7, 3, 5, 2, 4, 6, 3, 5, 7, 2, 4, 3, 6, 5, 2, 7, 4, 3, 5, 6, 2, 4, 7, 3, 5].map((h, i) => (
                  <div
                    key={i}
                    className="w-[1.5px] bg-primary-foreground/70 rounded-full"
                    style={{ height: `${h * 2}px` }}
                  />
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[9px] font-mono text-primary-foreground/50 uppercase">
                  SYS.ACTIVE
                </span>
                <span className="text-[9px] font-mono text-primary-foreground/50">
                  2026.04
                </span>
                <div className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
              </div>
            </div>

            <div className="mx-5 mb-5 grid grid-cols-2 gap-3">
              <div className="border border-foreground/20 rounded-md px-3 py-2">
                <p className="eyebrow mb-0.5">UNBS // LINK</p>
                <p className="text-[10px] font-mono text-foreground/70">
                  unbserved.com/tools
                </p>
              </div>
              <div className="border border-foreground/20 rounded-md px-3 py-2">
                <p className="eyebrow mb-0.5">FEATURED</p>
                <p className="text-[10px] font-mono text-foreground/70">
                  Suíte v2.0 · 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================
          STATS BAR
          ============================ */}
      <section className="border-y border-border bg-card/60">
        <div className="container-fluid grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {STATS.map((s) => (
            <div key={s.v} className="px-4 py-6 md:py-8 text-center">
              <p className="text-3xl md:text-4xl font-bold tracking-tight">{s.k}</p>
              <p className="mt-1 eyebrow">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================
          TOOLS GRID
          ============================ */}
      <section id="tools" className="container-fluid py-16 md:py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <p className="eyebrow mb-3">§ 01 — A SUÍTE</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl text-balance">
              Cinco ferramentas. Cada uma resolve uma dor real de quem desenha.
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Clique numa peça. Tudo roda no navegador, sem upload, sem conta, sem firula.
          </p>
        </div>

        <div className="grid-fixed-projects">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.name}
                to={tool.path}
                className="group relative flex flex-col rounded-2xl border border-foreground/15 bg-card p-5 hover-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-6">
                  <span className="eyebrow">{tool.index} / 06</span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] ${STATUS_STYLE[tool.status]}`}
                  >
                    {tool.status}
                  </span>
                </div>

                {/* Icon block */}
                <div className="mb-6 flex h-28 items-center justify-center rounded-xl bg-secondary group-hover:bg-accent transition-colors">
                  <Icon className="h-10 w-10 text-foreground" strokeWidth={1.25} />
                </div>

                {/* Body */}
                <div className="space-y-2 flex-1">
                  <p className="eyebrow">{tool.tagline}</p>
                  <h3 className="text-xl font-bold tracking-tight uppercase">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tool.copy}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Abrir tool
                  </span>
                  <ArrowRight className="h-4 w-4 text-foreground transition-transform group-hover:translate-x-1" strokeWidth={2} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================
          MANIFESTO / PRINCIPLES
          ============================ */}
      <section
        id="manifesto"
        className="border-t border-border bg-card/40"
      >
        <div className="container-fluid py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-20">
            <div className="space-y-6">
              <p className="eyebrow">§ 02 — POR QUE UNBSERVED</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
                Não é mais uma suíte de produtividade.
              </h2>
              <p className="text-base text-foreground/70 leading-relaxed max-w-md">
                Unbserved é o que sobra depois que você corta tudo que não
                presta. Três princípios. Sem exceção.
              </p>
              <div className="inline-flex items-center gap-2 pill-status">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Manifesto v2.0 · em breve
              </div>
            </div>

            <ol className="space-y-8">
              {PRINCIPLES.map((p) => (
                <li
                  key={p.title}
                  className="grid grid-cols-[auto_1fr] gap-6 border-t border-border pt-8 first:border-t-0 first:pt-0"
                >
                  <span className="font-mono text-2xl text-muted-foreground/60">
                    {p.n}
                  </span>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight uppercase mb-2">
                      {p.title}
                    </h3>
                    <p className="text-base text-foreground/70 leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============================
          FOOTER
          ============================ */}
      <footer className="border-t border-border">
        <div className="container-fluid py-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div className="flex items-center gap-4">
            <UnbsToolsLogo height={18} color="hsl(var(--foreground))" />
            <span className="hidden sm:inline-block h-4 w-px bg-border" />
            <p className="text-xs text-muted-foreground">
              © 2026 UNBSERVED — Built with obsession.
              <span className="ml-2 font-mono uppercase tracking-[0.2em]">
                Not for everyone.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/afelainne"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" strokeWidth={2} />
              <span className="text-xs uppercase tracking-wider">GitHub</span>
            </a>
            <a href="mailto:hello@unbserved.com" className="btn-ghost" aria-label="Contato">
              <Mail className="h-4 w-4" strokeWidth={2} />
              <span className="text-xs uppercase tracking-wider">Contato</span>
            </a>
          </div>
        </div>
        {/* Barcode */}
        <div className="container-fluid pb-8">
          <div className="flex items-end gap-[2px] h-4 opacity-40">
            {Array.from({ length: 120 }, (_, i) => ((i * 13) % 7) + 2).map((h, i) => (
              <div
                key={i}
                className="w-[1.5px] bg-foreground rounded-full"
                style={{ height: `${h * 2}px` }}
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";
import { ArrowRight, Palette, Grid3X3, FileText, ALargeSmall, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Status = "Destaque" | "Estável" | "Novo" | "Em breve";

interface Tool {
  name: string;
  tagline: string;
  copy: string;
  status: Status;
  path: string;
  icon: LucideIcon;
  /** Termos extras que ajudam a achar a ferramenta na busca. */
  keywords: string;
}

const TOOLS: Tool[] = [
  { name: "UNBSCOLOR", tagline: "Cor e paletas", copy: "Converte entre HEX, CMYK, LAB e OKLCH, acha a referência mais próxima e verifica contraste.", status: "Destaque", path: "/unbscolor", icon: Palette, keywords: "cor cores paleta referencia codigo grafica cmyk rgb lab hex contraste oklch daltonismo" },
  { name: "UNBSGRID", tagline: "Anatomia de logo", copy: "Cinquenta construções geométricas sobre o desenho real, com diagnóstico e folha de marca.", status: "Destaque", path: "/unbsgrid", icon: Grid3X3, keywords: "grid grade malha logo logotipo razao aurea geometria svg construcao diagnostico" },
  { name: "UNBSFORMAT", tagline: "Grades editoriais", copy: "Colunas e linhas reais sobre a linha de base, cânones clássicos e formatos conferidos, com PDF pronto para a gráfica e valores para InDesign e Figma.", status: "Novo", path: "/unbsformat", icon: FileText, keywords: "formato sangria bleed margem impressao grafica a4 a3 cartao colunas pdf" },
  { name: "UNBSFONT", tagline: "Editor de fontes", copy: "Desenha glifos, ajusta espaçamento e kerning, e exporta OTF.", status: "Novo", path: "/unbsfont", icon: ALargeSmall, keywords: "fonte tipo glifo kerning otf ttf editor tipografia" },
];

const FACTS: { value: string; caption: string }[] = [
  { value: "6", caption: "Ferramentas" },
  { value: "50", caption: "Construções geométricas" },
  { value: "0", caption: "Arquivos enviados" },
];

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/**
 * The product mock: UNBSGRID doing its job. Everything is drawn with the
 * system's own tokens, so it restyles with the theme instead of being a
 * screenshot that goes stale.
 */
const HeroMock = () => (
  <div className="rounded-xl overflow-hidden bg-card shadow-sheet" aria-hidden="true">
    {/* window chrome */}
    <div className="h-9 bg-foreground flex items-center gap-3 px-3.5">
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-background/25" />
      </span>
      <span className="mx-auto h-[22px] max-w-[300px] flex-1 rounded-xs bg-background/10 grid place-items-center text-[11px] text-background/60">
        unbs.tools/unbsgrid
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-[132px_1fr] min-h-[280px]">
      {/* sidebar */}
      <div className="hairline-r bg-muted p-3 hidden sm:flex flex-col gap-2.5">
        <span className="label">Construções</span>
        {["Bounding box", "Razão áurea", "Terços", "Simetria", "Espiral"].map((item, i) => (
          <span key={item} className={`flex items-center gap-2 text-[12px] ${i < 3 ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`h-2.5 w-2.5 rounded-xs ${i < 3 ? "bg-foreground" : "shadow-hairline-strong"}`} />
            {item}
          </span>
        ))}
        <span className="mt-auto chip chip-accent self-start">Nota 92</span>
      </div>

      {/* canvas */}
      <div className="bg-canvas grid place-items-center p-6">
        <svg viewBox="0 0 220 160" className="w-full max-w-[280px]" role="img" aria-label="Logo com construções geométricas sobrepostas">
          {/* construction */}
          <g stroke="hsl(var(--foreground))" strokeWidth="0.5" opacity="0.28" fill="none">
            <rect x="40" y="30" width="140" height="100" strokeDasharray="4 3" />
            <line x1="40" y1="63.3" x2="180" y2="63.3" />
            <line x1="40" y1="96.7" x2="180" y2="96.7" />
            <line x1="86.7" y1="30" x2="86.7" y2="130" />
            <line x1="133.3" y1="30" x2="133.3" y2="130" />
          </g>
          <circle cx="110" cy="80" r="50" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" opacity="0.35" />
          <circle cx="110" cy="80" r="30.9" fill="none" stroke="hsl(var(--accent-ink))" strokeWidth="0.75" strokeDasharray="3 2" />
          {/* the mark */}
          <path d="M110 40 L145 80 L110 120 L75 80 Z" fill="hsl(var(--foreground))" />
          <circle cx="110" cy="80" r="13" fill="hsl(var(--card))" />
          {/* measure */}
          <g stroke="hsl(var(--foreground))" strokeWidth="0.75">
            <line x1="40" y1="142" x2="180" y2="142" />
            <line x1="40" y1="139" x2="40" y2="145" />
            <line x1="180" y1="139" x2="180" y2="145" />
          </g>
          <rect x="92" y="134" width="36" height="16" rx="4" fill="hsl(var(--accent))" />
          <text x="110" y="145" textAnchor="middle" className="text-[9px]" fill="hsl(var(--accent-foreground))" style={{ fontSize: 9, fontWeight: 600 }}>
            1 : 1,618
          </text>
        </svg>
      </div>
    </div>
  </div>
);

const Index = () => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return TOOLS;
    return TOOLS.filter((t) => normalize(`${t.name} ${t.tagline} ${t.copy} ${t.keywords}`).includes(q));
  }, [query]);

  // "/" leva o foco para a busca, de qualquer lugar da página.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusItem = (index: number) => {
    if (results.length === 0) return;
    itemRefs.current[(index + results.length) % results.length]?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(results.length - 1); }
    else if (e.key === "Enter" && results.length > 0) { e.preventDefault(); navigate(results[0].path); }
    else if (e.key === "Escape" && query) { e.preventDefault(); setQuery(""); }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(index + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); index === 0 ? inputRef.current?.focus() : focusItem(index - 1); }
    else if (e.key === "Escape") { e.preventDefault(); inputRef.current?.focus(); }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 material-chrome">
        <div className="container-centered flex h-14 items-center justify-between gap-3">
          <UnbsToolsLogo height={16} />
          <nav className="flex items-center gap-2" aria-label="Conta">
            <a href="#ferramentas" className="ctl ctl-plain hidden sm:inline-flex">Ferramentas</a>
            <Link to="/login" className="ctl ctl-outline">Entrar</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: headline in two weights, a button pair, and the product itself. */}
        <section className="container-centered pt-14 pb-10 md:pt-20 md:pb-14 text-center">
          <p className="label">Ferramentas para designers de marca</p>
          <h1 className="text-display mt-5 mx-auto max-w-[16ch] uppercase text-balance">
            Precisão para quem <span className="font-bold">desenha marcas</span>
          </h1>
          <p className="text-body text-muted-foreground mt-6 mx-auto max-w-[52ch] text-pretty">
            Quatro ferramentas que medem, corrigem e exportam o seu trabalho. Tudo roda no navegador:
            nenhum arquivo sai da sua máquina, e não existe cadastro.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-8">
            <Link to="/unbsgrid" className="ctl ctl-tinted ctl-lg">
              Analisar um logo
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </Link>
            <a href="#ferramentas" className="ctl ctl-outline ctl-lg">Ver as quatro ferramentas</a>
          </div>

          <div className="mt-12 md:mt-16 mx-auto max-w-[900px] rounded-xl bg-canvas p-3 sm:p-5">
            <HeroMock />
          </div>
        </section>

        {/* Three numbers, stated flat. */}
        <section className="container-centered pb-4" aria-label="Resumo">
          <dl className="grid grid-cols-3 gap-5 max-w-[720px] mx-auto">
            {FACTS.map((f) => (
              <div key={f.caption} className="text-center">
                <dt className="sr-only">{f.caption}</dt>
                <dd>
                  <span className="block text-title-1 tabular">{f.value}</span>
                  <span className="block label mt-1">{f.caption}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Tools */}
        <section id="ferramentas" className="container-centered pt-16 pb-24 scroll-mt-16" aria-label="Ferramentas">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-5 mb-8 hairline-b">
            <div>
              <p className="label">O catálogo</p>
              <h2 className="text-title-2 mt-2">Quatro ferramentas independentes</h2>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                ref={inputRef}
                id="busca-ferramentas"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar ferramenta"
                aria-label="Buscar ferramenta"
                aria-describedby="busca-dica"
                className="field h-10 pl-9 pr-10"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  aria-label="Limpar busca"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 ctl ctl-plain ctl-icon ctl-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <p id="busca-dica" className="text-footnote text-muted-foreground mt-2">
                Setas navegam, Enter abre. <kbd className="text-value">/</kbd> foca a busca.
              </p>
            </div>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {results.length === 0 ? "Nenhuma ferramenta encontrada" : `${results.length} ferramenta${results.length > 1 ? "s" : ""}`}
          </p>

          {results.length === 0 ? (
            <div className="material-card text-center py-12">
              <p className="text-headline">Nenhuma ferramenta com esse nome.</p>
              <p className="text-subhead text-muted-foreground mt-1">Tente “cor”, “grade”, “formato” ou “fonte”.</p>
              <button type="button" onClick={() => setQuery("")} className="ctl ctl-gray mt-5">Ver todas</button>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((t, i) => {
                const Icon = t.icon;
                return (
                  <li key={t.name}>
                    <Link
                      to={t.path}
                      ref={(el) => (itemRefs.current[i] = el)}
                      onKeyDown={(e) => handleItemKeyDown(e, i)}
                      className="group material-card h-full flex flex-col transition-shadow duration-base ease-out hover:shadow-[inset_0_0_0_1px_hsl(var(--separator-strong))] focus-visible:shadow-focus"
                    >
                      <span className="flex items-start justify-between">
                        {/* feature icon: black glyph in a 40px accent square */}
                        <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className={`chip ${t.status === "Destaque" || t.status === "Novo" ? "chip-accent" : ""}`}>{t.status}</span>
                      </span>
                      <span className="block text-headline mt-5">{t.name}</span>
                      <span className="block text-subhead text-muted-foreground mt-0.5">{t.tagline}</span>
                      <span className="block text-callout text-muted-foreground mt-3 text-pretty">{t.copy}</span>
                      <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-subhead font-medium">
                        Abrir
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast ease-out group-hover:translate-x-1" strokeWidth={2} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Section marker on the left, the point on the right — the system's rhythm. */}
        <section className="container-centered pb-24" aria-label="Como funciona">
          <div className="grid gap-8 md:grid-cols-[180px_1fr] pt-10 hairline-t">
            <p className="label">Como funciona</p>
            <div className="max-w-[62ch]">
              <h2 className="text-title-2">O arquivo não sai do seu navegador.</h2>
              <p className="text-body text-muted-foreground mt-4 text-pretty">
                Nenhuma ferramenta faz upload. O SVG, a fonte e a imagem que você abre são lidos e
                processados na sua máquina, e a exportação também. Não há conta, servidor nem fila.
              </p>
              <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-3 mt-8">
                {[
                  ["Medido, não estimado", "Cada número vem do desenho real, com o cálculo documentado."],
                  ["Exporta pronto", "SVG em camadas, PDF vetorial, PNG em alta e OTF."],
                  ["Sem cadastro", "Abra e use. Os presets ficam salvos no navegador."],
                ].map(([title, copy]) => (
                  <li key={title}>
                    <span className="block text-headline">{title}</span>
                    <span className="block text-footnote text-muted-foreground mt-1 text-pretty">{copy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Wordmark footer, as in the system's marketing kit. */}
      <footer className="hairline-t overflow-hidden">
        <div className="container-centered pt-10">
          <div className="flex flex-wrap items-center justify-between gap-4 text-footnote text-muted-foreground">
            <span>© 2026 Unbserved</span>
            <a href="mailto:hello@unbserved.com" className="text-tint">hello@unbserved.com</a>
          </div>
          <div className="mt-8 -mb-1 select-none text-foreground/10" aria-hidden="true">
            <UnbsToolsLogo height={728} title="" className="block h-auto w-full" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

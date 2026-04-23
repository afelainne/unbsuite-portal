import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 — rota não curada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="container-fluid flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <UnbsToolsLogo height={18} color="hsl(var(--foreground))" />
          </Link>
          <span className="pill-status hidden sm:inline-flex">
            ERR · 404
          </span>
        </div>
      </header>

      <main className="flex-1 container-fluid grid place-items-center py-20">
        <div className="max-w-2xl text-center space-y-8">
          <p className="eyebrow-strong">§ ROTA NÃO CURADA</p>

          <h1 className="font-bold tracking-[-0.05em] leading-[0.85] text-[clamp(5rem,18vw,14rem)]">
            <span className="bg-accent px-3 -mx-1 box-decoration-clone">404</span>
          </h1>

          <p className="text-balance text-lg md:text-xl text-foreground/70 max-w-md mx-auto">
            Esse caminho não passou pela curadoria. Ou nunca existiu, ou a
            gente cortou.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/" className="btn-primary group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={2} />
              Voltar pra suíte
            </Link>
            <a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }} className="btn-ghost">
              Página anterior
            </a>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 pt-8">
            REQ // {location.pathname}
          </p>
        </div>
      </main>
    </div>
  );
};

export default NotFound;

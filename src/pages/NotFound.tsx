import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 — rota não encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 material-chrome">
        <div className="container-centered flex h-12 items-center justify-between">
          <Link to="/" className="flex items-center" aria-label="UNBS Suite">
            <UnbsToolsLogo height={16} color="hsl(var(--foreground))" />
          </Link>
          <span className="chip chip-outline">Erro 404</span>
        </div>
      </header>

      <main className="flex-1 container-centered grid place-items-center py-12 sm:py-20">
        <div className="max-w-md text-center">
          <p className="text-display text-muted-foreground/40 select-none" aria-hidden>
            404
          </p>
          <h1 className="text-title-1 mt-2 text-balance">Essa página não existe.</h1>
          <p className="text-callout text-muted-foreground mt-3 text-pretty">
            O endereço pode ter mudado ou nunca existiu. Volte para a suíte e escolha uma ferramenta.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <Link to="/" className="ctl ctl-filled ctl-lg">
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              Voltar para a suíte
            </Link>
            <button type="button" onClick={() => window.history.back()} className="ctl ctl-plain ctl-lg text-tint">
              Página anterior
            </button>
          </div>

          <p className="font-mono text-caption text-muted-foreground/70 mt-10 break-all">{location.pathname}</p>
        </div>
      </main>
    </div>
  );
};

export default NotFound;

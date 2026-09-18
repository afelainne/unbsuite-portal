import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Info } from "lucide-react";
import { toast } from "sonner";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";

/**
 * A autenticação ainda não existe. Em vez de um botão que não faz nada,
 * a página explica isso antes e depois do envio, e mantém o caminho de uso
 * sem conta em destaque.
 */
const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [notice, setNotice] = useState(false);

  const announce = (origem: "form" | "google") => {
    setNotice(true);
    toast("Contas ainda não estão disponíveis", {
      description:
        origem === "google"
          ? "O login com Google entra junto com as contas. Por enquanto, use as ferramentas direto."
          : "As quatro ferramentas funcionam sem cadastro. Avisamos quando a sincronização abrir.",
    });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 material-chrome">
        <div className="container-centered flex h-12 items-center justify-between gap-2">
          <Link to="/" className="ctl ctl-plain ctl-sm -ml-2 text-tint">
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            Suíte
          </Link>
          <UnbsToolsLogo height={16} color="hsl(var(--foreground))" />
          <span className="w-16" aria-hidden />
        </div>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-title-1 text-balance">{isSignUp ? "Criar conta" : "Entrar"}</h1>
            <p className="text-callout text-muted-foreground mt-2 text-pretty">
              As ferramentas funcionam sem conta. Entre só para sincronizar presets e histórico entre máquinas.
            </p>
          </div>

          {/* Aviso permanente: a conta ainda não existe */}
          <div className="material-card p-4 mb-4 flex gap-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-footnote font-medium">As contas ainda não estão disponíveis.</p>
              <p className="text-footnote text-muted-foreground text-pretty mt-0.5">
                Estamos terminando a sincronização. Enquanto isso, tudo que você ajusta fica salvo neste navegador.
              </p>
              <Link to="/" className="ctl ctl-gray ctl-sm mt-3">
                Usar as ferramentas sem conta
              </Link>
            </div>
          </div>

          <form
            className="material-card p-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              announce("form");
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="label">E-mail</label>
              <input id="email" type="email" autoComplete="email" placeholder="voce@email.com" className="field w-full" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="label">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="field w-full"
              />
            </div>

            <button type="submit" className="ctl ctl-filled ctl-lg w-full">
              {isSignUp ? "Criar conta" : "Entrar"}
            </button>

            <div className="relative py-1 text-center">
              <div className="absolute inset-x-0 top-1/2 h-px bg-separator" aria-hidden="true" />
              <span className="relative bg-card px-3 text-caption text-muted-foreground">ou</span>
            </div>

            <button type="button" onClick={() => announce("google")} className="ctl ctl-outline ctl-lg w-full">
              Continuar com Google
            </button>

            {notice && (
              <p className="text-footnote text-muted-foreground text-pretty text-center" role="alert">
                Ainda não é possível entrar: as contas não foram abertas.{" "}
                <Link to="/" className="text-tint underline underline-offset-4">Voltar para a suíte</Link>.
              </p>
            )}
          </form>

          <p className="text-center text-footnote text-muted-foreground mt-6">
            {isSignUp ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setNotice(false); }}
              className="font-medium text-tint hover:underline underline-offset-4 rounded-md focus-visible:shadow-focus"
            >
              {isSignUp ? "Entrar" : "Pedir convite"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;

import { ReactNode } from "react";
import Header from "./Header";

interface ToolLayoutProps {
  title: string;
  children: ReactNode;
  /**
   * 'page' = container + padding.
   * 'app'  = full-bleed for canvas/sidebars (UnbsColor, UnbsGrid, UnbsFormat, UnbsFont).
   */
  chrome?: "page" | "app";
}

const ToolLayout = ({ title, children, chrome = "page" }: ToolLayoutProps) => {
  return (
    <div className="h-dvh bg-background text-foreground flex flex-col">
      {/* Primeiro alvo do Tab: pula o cabeçalho e cai direto na ferramenta. */}
      <a
        href="#conteudo-da-ferramenta"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 ctl ctl-filled ctl-sm"
      >
        Pular para o conteúdo
      </a>
      <Header title={title} />
      {chrome === "app" ? (
        <main id="conteudo-da-ferramenta" tabIndex={-1} className="focus-visible:shadow-none flex-1 flex min-h-0 overflow-hidden">
          {children}
        </main>
      ) : (
        <main id="conteudo-da-ferramenta" tabIndex={-1} className="focus-visible:shadow-none flex-1 overflow-auto py-6 md:py-8">
          {children}
        </main>
      )}
    </div>
  );
};

export default ToolLayout;

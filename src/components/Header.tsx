import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

/**
 * Header padronizado (industrial e-reader, swiss).
 * Mesmo visual em todas as ferramentas: UNBS / TOOLNAME, mono uppercase.
 */
const Header = ({ showBack = false, title }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 h-12 flex items-center border-b border-[#232323] bg-white px-4 flex-shrink-0">
      {showBack && (
        <Link
          to="/"
          className="inline-flex h-7 w-7 items-center justify-center border border-[#232323]/30 hover:bg-[#F7E043]/40 mr-3"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#232323]" strokeWidth={2} />
        </Link>
      )}

      <Link
        to="/"
        className="font-mono text-[11px] uppercase tracking-[0.2em] font-semibold text-[#232323] hover:underline"
      >
        UNBS{title && <span className="opacity-60"> / {title}</span>}
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#232323]/60 hidden sm:inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-[#F0FF00] border border-[#232323]" />
          SYS.ACTIVE
        </span>
      </div>
    </header>
  );
};

export default Header;

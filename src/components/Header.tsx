import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import UnbsToolsLogo from "./UnbsToolsLogo";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

const Header = ({ showBack = false, title }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container-fluid flex h-14 items-center gap-3">
        {showBack && (
          <Link
            to="/"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
        )}

        <Link to="/" className="flex items-center gap-2">
          <UnbsToolsLogo height={18} color="hsl(var(--foreground))" />
        </Link>

        {title && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-muted-foreground/60 font-mono text-xs">/</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
              {title}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="pill-status hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent pulse-dot" />
            SYS.ACTIVE
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;

import React from "react";
import { Link } from "react-router-dom";

interface Props {
  /** Tool short name, e.g. "UNBSCOLOR" */
  name: string;
  /** Optional center nav: array of { label, onClick, active } */
  nav?: { label: string; onClick?: () => void; active?: boolean; href?: string }[];
  /** Right-side actions */
  actions?: React.ReactNode;
}

/**
 * Translucent toolbar. Content scrolls under it; a hairline (not a border)
 * separates it from the page.
 */
const ToolHeader: React.FC<Props> = ({ name, nav, actions }) => (
  <header className="sticky top-0 z-40 h-12 flex items-center gap-3 material-chrome px-4 flex-shrink-0">
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-[-0.006em] text-foreground rounded-md px-1.5 -mx-1.5 h-7 transition-colors duration-fast ease-out hover:bg-fill press"
    >
      UNBS <span className="text-muted-foreground font-medium">/ {name}</span>
    </Link>

    {nav && nav.length > 0 && (
      <nav className="segmented ml-2 hidden sm:inline-flex" aria-label="Seções">
        {nav.map((n, i) => {
          const cls = `segmented-item ${n.active ? "is-active" : ""}`;
          return n.href ? (
            <a key={i} href={n.href} className={cls} aria-current={n.active ? "page" : undefined}>
              {n.label}
            </a>
          ) : (
            <button key={i} type="button" onClick={n.onClick} className={cls} aria-pressed={n.active}>
              {n.label}
            </button>
          );
        })}
      </nav>
    )}

    <div className="ml-auto flex items-center gap-1.5">{actions}</div>
  </header>
);

export default ToolHeader;

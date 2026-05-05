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

const ToolHeader: React.FC<Props> = ({ name, nav, actions }) => (
  <header className="h-12 flex items-center border-b border-[#232323] bg-white px-4 flex-shrink-0">
    <Link
      to="/"
      className="font-mono text-[11px] uppercase tracking-[0.2em] font-semibold text-[#232323] hover:underline"
    >
      UNBS / <span className="opacity-70">{name}</span>
    </Link>

    {nav && nav.length > 0 && (
      <nav className="flex items-center gap-1 ml-8">
        {nav.map((n, i) => {
          const cls = `font-mono text-[10px] uppercase tracking-[0.2em] px-2 h-7 inline-flex items-center border ${
            n.active
              ? "bg-[#232323] text-[#F0FF00] border-[#232323]"
              : "border-transparent text-[#232323] hover:bg-[#F7E043]/40"
          }`;
          return n.href ? (
            <a key={i} href={n.href} className={cls}>
              {n.label}
            </a>
          ) : (
            <button key={i} onClick={n.onClick} className={cls}>
              {n.label}
            </button>
          );
        })}
      </nav>
    )}

    <div className="ml-auto flex items-center gap-2">{actions}</div>
  </header>
);

export default ToolHeader;
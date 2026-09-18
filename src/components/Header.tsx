import { NavLink, Link } from "react-router-dom";
import { ALargeSmall, FileText, Grid3X3, House, Palette, type LucideIcon } from "lucide-react";
import UnbsToolsLogo from "@/components/UnbsToolsLogo";

interface HeaderProps {
  /** Name of the tool on screen, announced by the logo link. */
  title?: string;
}

interface RailItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const RAIL: RailItem[] = [
  { to: "/", label: "Início", icon: House },
  { to: "/unbscolor", label: "UNBSCOLOR", icon: Palette },
  { to: "/unbsgrid", label: "UNBSGRID", icon: Grid3X3 },
  { to: "/unbsformat", label: "UNBSFORMAT", icon: FileText },
  { to: "/unbsfont", label: "UNBSFONT", icon: ALargeSmall },
];

/**
 * Workspace top bar, as in the design system's workspace kit: wordmark on the
 * left, the tool rail centred (52px squares, 18px glyph, the current tool in
 * black), and an empty right column that keeps the rail optically centred.
 * It sits on the page itself: no bar, no blur, no hairline.
 */
const Header = ({ title }: HeaderProps) => (
  <header className="flex-shrink-0 bg-background px-4 sm:px-6 lg:px-10 pt-3 pb-3 lg:pt-[18px] lg:pb-4 grid grid-cols-[auto_1fr] lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
    <Link
      to="/"
      className="inline-flex items-center h-10 rounded-md text-foreground transition-opacity duration-fast ease-out hover:opacity-70"
      aria-label={title ? `UNBSTOOLS, voltar ao início (${title})` : "UNBSTOOLS, voltar ao início"}
    >
      <UnbsToolsLogo height={16} title="" />
    </Link>

    <nav aria-label="Ferramentas" className="justify-self-end lg:justify-self-center min-w-0 overflow-x-auto scrollbar-hide">
      <ul className="flex items-center gap-1.5 lg:gap-2">
        {RAIL.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                [
                  "inline-flex items-center justify-center rounded-md transition-colors duration-fast ease-out press",
                  "h-10 w-10 lg:h-[52px] lg:w-[52px]",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground shadow-hairline hover:bg-secondary",
                ].join(" ")
              }
            >
              {({ isActive }) => <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>

    <div className="hidden lg:block" aria-hidden="true" />
  </header>
);

export default Header;

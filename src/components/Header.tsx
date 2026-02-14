import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ArrowLeft, Search, Bell, FolderOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

const Header = ({ showBack = false, title }: HeaderProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-[hsl(var(--surface-primary))]/80 backdrop-blur-xl">
      <div className="container flex h-12 items-center justify-between">
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {showBack && (
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <Link to="/" className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-foreground">
              {title || "UNBSERVED."}
            </span>
          </Link>
          {showBack && title && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-muted-foreground text-xs font-medium">{title}</span>
            </>
          )}
        </div>

        {/* Right: desktop controls */}
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md relative">
            <Bell className="h-4 w-4" />
          </Button>

          <div className="ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                      U
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-destructive text-sm">
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-card p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm">
            <Search className="h-4 w-4" /> Buscar
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm">
            <FolderOpen className="h-4 w-4" /> Pastas
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm">
            <Bell className="h-4 w-4" /> Notificações
          </Button>
          <div className="border-t border-border/60 pt-2 mt-2">
            <Link to="/profile">
              <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm">
                <User className="h-4 w-4" /> Perfil
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm text-destructive">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

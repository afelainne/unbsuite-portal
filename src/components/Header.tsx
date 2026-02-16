import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

const Header = ({ showBack = false, title }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white" style={{ borderColor: '#D0D0C8' }}>
      <div className="w-full px-6 flex h-12 items-center gap-2 text-sm">
        {showBack && (
          <Link to="/" className="text-gray-400 hover:text-[#232323] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <Link to="/" className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight" style={{ color: '#232323' }}>
            UNBSERVED.
          </span>
        </Link>
        {showBack && title && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-400 text-xs font-medium">{title}</span>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;

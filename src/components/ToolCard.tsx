import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface ToolCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  status: "active" | "coming-soon";
}

const ToolCard = ({ name, description, icon: Icon, path, status }: ToolCardProps) => {
  const isActive = status === "active";

  const content = (
    <div
      className={`group relative overflow-hidden material-card p-5 ${
        isActive ? "hover-card press cursor-pointer" : "opacity-60 cursor-not-allowed"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-fill-2 transition-colors duration-fast ease-out group-hover:bg-accent">
          <Icon className="h-[18px] w-[18px] text-foreground" strokeWidth={2} />
        </div>
        {!isActive && <span className="chip">Em breve</span>}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="text-headline">{name}</h3>
        <p className="text-footnote text-muted-foreground text-pretty">{description}</p>
      </div>
    </div>
  );

  if (!isActive) return content;

  return (
    <Link to={path} className="block rounded-lg focus-visible:shadow-focus">
      {content}
    </Link>
  );
};

export default ToolCard;

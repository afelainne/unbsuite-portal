import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card
      className={`group relative overflow-hidden transition-all duration-200 rounded-lg ${
        isActive
          ? "hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5 cursor-pointer border-border/60 bg-card"
          : "opacity-50 cursor-not-allowed border-dashed border-border/40 bg-card/50"
      }`}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary transition-colors group-hover:bg-accent">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          {!isActive && (
            <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5">
              Em breve
            </Badge>
          )}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold tracking-tight uppercase text-foreground">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );

  if (!isActive) return content;

  return <Link to={path}>{content}</Link>;
};

export default ToolCard;

import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <Card className={`group relative overflow-hidden transition-all duration-300 ${
      isActive 
        ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer border-border" 
        : "opacity-60 cursor-not-allowed border-dashed"
    }`}>
      <CardHeader className="space-y-3 p-8">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Icon className="h-6 w-6 text-foreground" />
          </div>
          {!isActive && (
            <Badge variant="secondary" className="text-xs font-medium">
              Em breve
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-lg font-extrabold tracking-tight uppercase">
            {name}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );

  if (!isActive) return content;

  return <Link to={path}>{content}</Link>;
};

export default ToolCard;

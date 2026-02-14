import Header from "@/components/Header";
import ToolCard from "@/components/ToolCard";
import { Palette, LayoutGrid } from "lucide-react";

const tools = [
  {
    name: "UNBSCOLOR",
    description: "Filtro e paleta de cores para projetos criativos",
    icon: Palette,
    path: "/unbscolor",
    status: "active" as const,
  },
  {
    name: "UNBSGRID",
    description: "Grid para organização e exibição de logos",
    icon: LayoutGrid,
    path: "/unbsgrid",
    status: "active" as const,
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-lg font-bold tracking-tight">
            Ferramentas
          </h1>
          <p className="text-xs text-muted-foreground">
            Acesse as ferramentas criativas da UNBSERVED
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.name} {...tool} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;

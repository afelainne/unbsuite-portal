import { ReactNode } from "react";
import Header from "./Header";

interface ToolLayoutProps {
  title: string;
  children: ReactNode;
}

const ToolLayout = ({ title, children }: ToolLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header showBack title={title} />
      <main className="container py-8">
        {children}
      </main>
    </div>
  );
};

export default ToolLayout;

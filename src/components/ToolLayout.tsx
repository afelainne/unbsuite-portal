import { ReactNode } from "react";
import Header from "./Header";

interface ToolLayoutProps {
  title: string;
  children: ReactNode;
  /**
   * 'page' = container-fluid + padding (UnbsColor, UnbsType, UnbsMockup).
   * 'app'  = full-bleed para canvas/sidebars (UnbsGrid, UnbsFormat).
   */
  chrome?: "page" | "app";
}

const ToolLayout = ({ title, children, chrome = "page" }: ToolLayoutProps) => {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <Header showBack title={title} />
      {chrome === "app" ? (
        <main className="flex-1 flex flex-col min-h-0">{children}</main>
      ) : (
        <main className="container-fluid py-6 md:py-10 flex-1">{children}</main>
      )}
    </div>
  );
};

export default ToolLayout;

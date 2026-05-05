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
    <div className="h-dvh bg-white text-[#232323] flex flex-col">
      <Header showBack title={title} />
      {chrome === "app" ? (
        <main className="flex-1 flex min-h-0 overflow-hidden">{children}</main>
      ) : (
        <main className="flex-1 overflow-auto">{children}</main>
      )}
    </div>
  );
};

export default ToolLayout;

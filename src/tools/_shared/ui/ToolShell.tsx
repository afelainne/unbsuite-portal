import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

const ToolShell: React.FC<Props> = ({ children, className = "" }) => (
  <div className={`h-dvh w-full flex flex-col bg-background text-foreground ${className}`}>
    {children}
  </div>
);

export default ToolShell;

import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

const ToolShell: React.FC<Props> = ({ children, className = "" }) => (
  <div className={`h-dvh w-full flex flex-col bg-white text-[#232323] ${className}`}>
    {children}
  </div>
);

export default ToolShell;
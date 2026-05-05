import React from "react";

type Variant = "primary" | "ghost" | "icon" | "danger";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-1.5 font-mono uppercase tracking-[0.18em] text-[10px] font-semibold rounded-none border transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "h-7 px-3 bg-[#F0FF00] text-[#232323] border-[#232323] hover:bg-[#F7E043]",
  ghost:
    "h-7 px-3 bg-transparent text-[#232323] border-[#232323]/30 hover:bg-[#F7E043]/30",
  icon:
    "h-7 w-7 p-0 bg-transparent text-[#232323] border-[#232323]/30 hover:bg-[#F7E043]/30",
  danger:
    "h-7 px-3 bg-transparent text-[#232323] border-[#232323]/30 hover:bg-red-500 hover:text-white hover:border-red-500",
};

const ToolButton: React.FC<Props> = ({
  variant = "ghost",
  active = false,
  className = "",
  children,
  ...rest
}) => {
  const activeCls = active ? "bg-[#F0FF00] text-[#232323] border-[#232323]" : "";
  return (
    <button
      {...rest}
      className={`${base} ${variants[variant]} ${activeCls} ${className}`}
    >
      {children}
    </button>
  );
};

export default ToolButton;
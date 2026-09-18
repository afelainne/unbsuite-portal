import React from "react";

type Variant = "primary" | "ghost" | "icon" | "danger" | "tinted" | "gray" | "plain";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  active?: boolean;
  size?: "sm" | "md" | "lg";
}

const variants: Record<Variant, string> = {
  primary: "ctl-filled",
  tinted: "ctl-tinted",
  gray: "ctl-gray",
  ghost: "ctl-outline",
  plain: "ctl-plain",
  icon: "ctl-outline ctl-icon",
  danger: "ctl-danger",
};

const sizes = { sm: "ctl-sm", md: "", lg: "ctl-lg" } as const;

/**
 * Tool control. Feedback lands on pointer-down (scale 0.97) and the active
 * state is the lime accent fill. Text is sentence case, system sans.
 */
const ToolButton: React.FC<Props> = ({
  variant = "ghost",
  active = false,
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}) => (
  <button
    type={type}
    {...rest}
    data-active={active ? "true" : undefined}
    className={`ctl ${variants[variant]} ${sizes[size]} ${active ? "ctl-active" : ""} ${className}`}
  >
    {children}
  </button>
);

export default ToolButton;

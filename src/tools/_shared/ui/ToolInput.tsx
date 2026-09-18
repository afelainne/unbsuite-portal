import React from "react";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Monospace + tabular numerals for values like hex, coordinates, sizes */
  mono?: boolean;
  size?: "sm" | "md";
}

const ToolInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className = "", mono = false, size = "md", ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      className={`field ${size === "sm" ? "field-sm" : ""} ${mono ? "field-mono" : ""} ${className}`}
    />
  )
);
ToolInput.displayName = "ToolInput";

export default ToolInput;

import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

const ToolInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className = "", ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      className={`h-7 px-2 bg-white border border-[#232323]/25 rounded-none font-mono text-[11px] text-[#232323] placeholder:text-[#232323]/40 focus:outline-none focus:border-[#232323] ${className}`}
    />
  )
);
ToolInput.displayName = "ToolInput";

export default ToolInput;
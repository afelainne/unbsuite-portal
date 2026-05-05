import React from "react";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

/**
 * Slider padronizado: track 2px, thumb 16px.
 * Usa input[type=range] nativo + classe global definida em index.css.
 */
const ToolSlider: React.FC<Props> = ({ className = "", ...rest }) => (
  <input
    {...rest}
    type="range"
    className={`tool-slider w-full ${className}`}
  />
);

export default ToolSlider;
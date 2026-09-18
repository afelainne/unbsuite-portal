import React from "react";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

/**
 * Slider: native range with a 4px track and an 18px round thumb.
 * The filled portion of the track follows the value (1:1 with the pointer).
 */
const ToolSlider: React.FC<Props> = ({ className = "", style, ...rest }) => {
  const min = Number(rest.min ?? 0);
  const max = Number(rest.max ?? 100);
  const value = Number(rest.value ?? rest.defaultValue ?? min);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      {...rest}
      type="range"
      className={`tool-slider w-full ${className}`}
      style={{
        ...style,
        // WebKit has no ::-moz-range-progress; paint the fill on the track.
        // Longhand (not the `background` shorthand) so it does not conflict with backgroundClip.
        backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 0 ${pct}%, hsl(var(--fill-3)) ${pct}% 100%)`,
        backgroundClip: "content-box",
        paddingBlock: 8,
        borderRadius: 999,
      }}
    />
  );
};

export default ToolSlider;

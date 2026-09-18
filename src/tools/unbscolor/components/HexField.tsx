import React, { useEffect, useRef, useState } from 'react';
import { normalizeHex } from '../utils/colorMath';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

interface HexFieldProps extends InputProps {
  /** Current committed color. */
  value: string;
  /** Called only with valid, normalized "#RRGGBB" values. */
  onCommit: (hex: string) => void;
  /** Parser for the draft text. Defaults to strict hex (with or without "#"). */
  parse?: (raw: string) => string | null;
}

/**
 * Text input with a local draft: the user can type freely (partial hex,
 * lowercase, no "#") and the parent only receives valid normalized colors.
 * The draft re-syncs when `value` changes from outside and on blur.
 */
export const HexField: React.FC<HexFieldProps> = ({ value, onCommit, parse = normalizeHex, onBlur, ...rest }) => {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef<string | null>(null);

  useEffect(() => {
    if (value !== lastCommitted.current) setDraft(value);
    lastCommitted.current = null;
  }, [value]);

  return (
    <input
      type="text"
      spellCheck={false}
      autoComplete="off"
      {...rest}
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const parsed = parse(next);
        if (parsed && parsed !== value) {
          lastCommitted.current = parsed;
          onCommit(parsed);
        }
      }}
      onBlur={(e) => {
        setDraft(value);
        onBlur?.(e);
      }}
    />
  );
};

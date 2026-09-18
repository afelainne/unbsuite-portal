import React from 'react';

const SIZES = {
  sm: { height: 'var(--control-h-sm)', padding: '0 14px', fontSize: 'var(--fs-body-s)', radius: 'var(--radius-sm)' },
  md: { height: 'var(--control-h)', padding: '0 20px', fontSize: 'var(--fs-body-s)', radius: 'var(--radius-md)' },
  lg: { height: 'var(--control-h-lg)', padding: '0 26px', fontSize: 'var(--fs-body)', radius: 'var(--radius-md)' },
};

const VARIANTS = {
  primary: { background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid transparent' },
  invert: { background: 'var(--surface-invert)', color: 'var(--text-on-invert)', border: '1px solid transparent' },
  secondary: { background: 'var(--surface-000)', color: 'var(--ink-900)', border: '1px solid var(--border-field)' },
  ghost: { background: 'transparent', color: 'var(--ink-900)', border: '1px solid transparent' },
};

export function Button({
  children, variant = 'primary', size = 'md', icon, iconAfter,
  disabled = false, fullWidth = false, type = 'button', onClick, style, ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const hoverStyle = !disabled && hover ? (
    variant === 'primary' ? { background: 'var(--accent-hover)' }
    : variant === 'invert' ? { background: 'var(--surface-invert-soft)' }
    : { background: 'var(--surface-100)' }
  ) : null;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', width: fullWidth ? '100%' : 'auto',
        height: s.height, padding: s.padding, borderRadius: s.radius,
        fontFamily: 'var(--font-core)', fontSize: s.fontSize, fontWeight: 'var(--fw-medium)',
        lineHeight: 1, whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.38 : 1,
        transform: press ? 'scale(.985)' : 'none',
        transition: 'var(--transition-control), transform var(--dur-instant) var(--ease-in-out)',
        ...v, ...hoverStyle, ...style,
      }}
      {...rest}
    >
      {icon ? <i className={icon} style={{ fontSize: 'var(--icon)', lineHeight: 0 }} aria-hidden="true" /> : null}
      {children}
      {iconAfter ? <i className={iconAfter} style={{ fontSize: 'var(--icon)', lineHeight: 0 }} aria-hidden="true" /> : null}
    </button>
  );
}

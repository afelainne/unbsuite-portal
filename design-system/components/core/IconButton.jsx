import React from 'react';

const SIZES = { sm: 32, md: 40, lg: 52 };

export function IconButton({
  icon = 'ph ph-house', label, size = 'md', variant = 'surface',
  active = false, disabled = false, badge = false, onClick, style, ...rest
}) {
  const px = SIZES[size] || SIZES.md;
  const [hover, setHover] = React.useState(false);
  const resolved = active ? 'invert' : variant;

  const skins = {
    surface: { background: 'var(--surface-000)', color: 'var(--ink-900)', border: '1px solid var(--border-field)' },
    quiet: { background: 'var(--surface-100)', color: 'var(--ink-700)', border: '1px solid transparent' },
    invert: { background: 'var(--surface-invert)', color: 'var(--text-on-invert)', border: '1px solid transparent' },
    accent: { background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid transparent' },
  };
  const skin = skins[resolved] || skins.surface;
  const hoverSkin = !disabled && hover ? (
    resolved === 'invert' ? { background: 'var(--surface-invert-soft)' }
    : resolved === 'accent' ? { background: 'var(--accent-hover)' }
    : { background: 'var(--surface-100)' }
  ) : null;

  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', width: px, height: px, flex: '0 0 auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1, transition: 'var(--transition-control)',
        ...skin, ...hoverSkin, ...style,
      }}
      {...rest}
    >
      <i className={icon} style={{ fontSize: size === 'sm' ? 'var(--icon-sm)' : 'var(--icon)', lineHeight: 0 }} aria-hidden="true" />
      {badge ? (
        <span style={{
          position: 'absolute', top: 7, right: 7, width: 6, height: 6,
          borderRadius: 'var(--radius-pill)', background: 'var(--accent)',
        }} />
      ) : null}
    </button>
  );
}

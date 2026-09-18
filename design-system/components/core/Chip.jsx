import React from 'react';

export function Chip({ children, onAdd, onClick, tone = 'light', icon, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const dark = tone === 'dark';
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        height: 32, padding: onAdd ? '0 6px 0 12px' : '0 12px',
        borderRadius: 'var(--radius-sm)',
        background: dark ? (hover ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.08)') : (hover ? 'var(--surface-100)' : 'var(--surface-050)'),
        boxShadow: dark ? 'none' : 'inset 0 0 0 1px var(--hairline-soft)',
        color: dark ? 'rgba(255,255,255,.88)' : 'var(--ink-700)',
        fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)', lineHeight: 1,
        cursor: onClick || onAdd ? 'pointer' : 'default',
        transition: 'var(--transition-control)', whiteSpace: 'nowrap', ...style,
      }}
      {...rest}
    >
      {icon ? <i className={icon} style={{ fontSize: 'var(--icon-sm)', lineHeight: 0 }} aria-hidden="true" /> : null}
      {children}
      {onAdd ? (
        <button
          type="button" aria-label="Add" onClick={(e) => { e.stopPropagation(); onAdd(e); }}
          style={{
            width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: 0, borderRadius: 'var(--radius-pill)', background: 'var(--accent)',
            color: 'var(--text-on-accent)', cursor: 'pointer', padding: 0,
          }}
        >
          <i className="ph-bold ph-plus" style={{ fontSize: 10, lineHeight: 0 }} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

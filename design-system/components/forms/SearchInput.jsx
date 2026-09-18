import React from 'react';

export function SearchInput({
  value, onChange, placeholder = 'Search', size = 'md', detached = false,
  tone = 'light', trailing, style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';
  const dark = tone === 'dark';

  const field = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0,
      height: h, padding: '0 14px', borderRadius: 'var(--radius-md)',
      background: dark ? 'rgba(255,255,255,.08)' : 'var(--surface-000)',
      boxShadow: dark ? 'none' : (focus ? 'inset 0 0 0 1px var(--ink-900)' : 'inset 0 0 0 1px var(--border-field)'),
      transition: 'var(--transition-control)',
    }}>
      {!detached ? (
        <i className="ph ph-magnifying-glass" aria-hidden="true"
           style={{ fontSize: 'var(--icon-sm)', color: dark ? 'rgba(255,255,255,.55)' : 'var(--ink-300)', lineHeight: 0 }} />
      ) : null}
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent',
          fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)',
          color: dark ? 'var(--white)' : 'var(--ink-900)',
        }}
        {...rest}
      />
      {trailing}
    </div>
  );

  if (!detached) return <div style={{ display: 'flex', minWidth: 0, ...style }}>{field}</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, ...style }}>
      <span style={{
        width: h, height: h, flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', background: 'var(--surface-000)',
        boxShadow: 'inset 0 0 0 1px var(--border-field)', color: 'var(--ink-900)',
      }}>
        <i className="ph ph-magnifying-glass" aria-hidden="true" style={{ fontSize: 'var(--icon-sm)', lineHeight: 0 }} />
      </span>
      {field}
    </div>
  );
}

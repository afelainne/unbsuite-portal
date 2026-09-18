import React from 'react';

export function Switch({ checked = false, onChange, label, disabled = false, style, ...rest }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .4 : 1,
      fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)', color: 'var(--ink-700)', ...style,
    }} {...rest}>
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => onChange && onChange(!checked)}
        style={{
          width: 40, height: 22, flex: '0 0 auto', padding: 2, border: 0,
          borderRadius: 'var(--radius-pill)', cursor: 'inherit',
          background: checked ? 'var(--accent)' : 'var(--light-gray)',
          transition: 'var(--transition-control)',
          display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start', alignItems: 'center',
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--ink-900)' : 'var(--white)',
          boxShadow: 'var(--shadow-1)', transition: 'var(--transition-control)',
        }} />
      </button>
      {label}
    </label>
  );
}

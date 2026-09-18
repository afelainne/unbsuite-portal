import React from 'react';

const TONES = {
  accent: { background: 'var(--accent)', color: 'var(--text-on-accent)' },
  invert: { background: 'var(--surface-invert)', color: 'var(--text-on-invert)' },
  neutral: { background: 'var(--surface-100)', color: 'var(--ink-700)' },
  outline: { background: 'var(--surface-000)', color: 'var(--ink-700)', boxShadow: 'inset 0 0 0 1px var(--border-field)' },
  quiet: { background: 'var(--accent-quiet)', color: 'var(--accent-ink)' },
};

export function Badge({ children, tone = 'accent', dot = false, style, ...rest }) {
  const t = TONES[tone] || TONES.accent;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: 22, padding: dot ? '0 10px 0 8px' : '0 10px',
        borderRadius: 'var(--radius-pill)',
        fontFamily: 'var(--font-core)', fontSize: 'var(--fs-caption)',
        fontWeight: 'var(--fw-medium)', lineHeight: 1, whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums', ...t, ...style,
      }}
      {...rest}
    >
      {dot ? <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'currentColor', opacity: .85 }} /> : null}
      {children}
    </span>
  );
}

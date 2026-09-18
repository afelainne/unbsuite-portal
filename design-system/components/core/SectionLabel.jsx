import React from 'react';

export function SectionLabel({ children, tone = 'accent', size = 'md', style, ...rest }) {
  const dot = { accent: 'var(--accent)', ink: 'var(--ink-900)', muted: 'var(--ink-300)' }[tone] || 'var(--accent)';
  const fs = size === 'sm' ? 'var(--fs-micro)' : 'var(--fs-caption)';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        fontFamily: 'var(--font-core)', fontSize: fs, fontWeight: 'var(--fw-medium)',
        letterSpacing: 'var(--ls-eyebrow)', textTransform: 'uppercase',
        color: 'var(--ink-900)', lineHeight: 1.2, ...style,
      }}
      {...rest}
    >
      <span style={{ width: 9, height: 9, borderRadius: 'var(--radius-pill)', background: dot, flex: '0 0 auto' }} />
      {children}
    </span>
  );
}

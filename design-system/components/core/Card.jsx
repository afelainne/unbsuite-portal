import React from 'react';

export function Card({
  label, actions, children, tone = 'raised', padding = 'var(--pad-card)',
  radius = 'var(--radius-lg)', dot, style, ...rest
}) {
  const tones = {
    raised: { background: 'var(--surface-card)', boxShadow: 'var(--shadow-2)', color: 'var(--text-body)', border: '1px solid var(--border-card)' },
    quiet: { background: 'var(--surface-card-quiet)', boxShadow: 'none', color: 'var(--text-body)', border: '1px solid transparent' },
    inset: { background: 'var(--bg-inset)', boxShadow: 'none', color: 'var(--text-body)', border: '1px solid transparent' },
    invert: { background: 'var(--surface-invert)', boxShadow: 'var(--shadow-3)', color: 'rgba(255,255,255,.82)', border: '1px solid transparent' },
  };
  const t = tones[tone] || tones.raised;
  const dotColor = dot === true ? 'var(--accent)' : dot;

  return (
    <section
      style={{ borderRadius: radius, padding, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0, ...t, ...style }}
      {...rest}
    >
      {(label || actions || dot) ? (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-core)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-medium)',
            letterSpacing: 'var(--ls-eyebrow)', textTransform: 'uppercase',
            color: tone === 'invert' ? 'rgba(255,255,255,.55)' : 'var(--text-muted)',
          }}>
            {dot ? <span style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: dotColor }} /> : null}
            {label}
          </span>
          {actions ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{actions}</span> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

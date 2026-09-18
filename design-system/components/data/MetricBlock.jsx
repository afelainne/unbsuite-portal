import React from 'react';

const SIZES = {
  hero: { fs: 'var(--fs-display-xl)', fw: 'var(--fw-regular)' },
  lg: { fs: 'var(--fs-display-m)', fw: 'var(--fw-regular)' },
  md: { fs: 'var(--fs-h1)', fw: 'var(--fw-regular)' },
  sm: { fs: 'var(--fs-h3)', fw: 'var(--fw-regular)' },
};

export function MetricBlock({
  value, caption, prefix, delta, deltaTone = 'accent', size = 'md',
  align = 'left', style, ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: align === 'center' ? 'center' : 'flex-start', minWidth: 0, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: s.fs, fontWeight: s.fw,
          lineHeight: 'var(--lh-tight)', letterSpacing: 'var(--ls-display)',
          color: 'var(--text-display)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>
          {prefix}{value}
        </span>
        {delta ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 10px',
            borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-medium)',
            background: deltaTone === 'invert' ? 'var(--surface-invert)' : 'var(--accent)',
            color: deltaTone === 'invert' ? 'var(--text-on-invert)' : 'var(--text-on-accent)',
            fontVariantNumeric: 'tabular-nums',
          }}>{delta}</span>
        ) : null}
      </div>
      {caption ? (
        <span style={{ fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)', color: 'var(--text-muted)' }}>{caption}</span>
      ) : null}
    </div>
  );
}

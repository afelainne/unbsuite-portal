import React from 'react';

export function InsightPopover({
  value, delta, deltaTone = 'accent', children, onDismiss, tone = 'light', style, ...rest
}) {
  const dark = tone === 'dark';
  return (
    <div style={{
      position: 'relative', display: 'inline-flex', flexDirection: 'column', gap: '8px',
      minWidth: 200, maxWidth: 280, padding: '14px 32px 14px 16px',
      borderRadius: 'var(--radius-md)',
      background: dark ? 'var(--glass-invert)' : 'var(--glass-light)',
      backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
      boxShadow: 'var(--shadow-popover)',
      color: dark ? 'rgba(255,255,255,.8)' : 'var(--text-body)', ...style,
    }} {...rest}>
      {(value || delta) ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {value ? (
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h3)', lineHeight: 1,
              color: dark ? 'var(--white)' : 'var(--text-display)', fontVariantNumeric: 'tabular-nums',
            }}>{value}</span>
          ) : null}
          {delta ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 9px',
              borderRadius: 'var(--radius-pill)', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-medium)',
              background: deltaTone === 'invert' ? 'var(--surface-invert)' : 'var(--accent)',
              color: deltaTone === 'invert' ? 'var(--text-on-invert)' : 'var(--text-on-accent)',
            }}>{delta}</span>
          ) : null}
        </div>
      ) : null}
      {children ? <div style={{ fontSize: 'var(--fs-body-s)', lineHeight: 'var(--lh-normal)' }}>{children}</div> : null}
      {onDismiss ? (
        <button type="button" aria-label="Dismiss" onClick={onDismiss}
          style={{
            position: 'absolute', top: 10, right: 10, width: 18, height: 18, padding: 0, border: 0,
            background: 'transparent', cursor: 'pointer', color: dark ? 'rgba(255,255,255,.5)' : 'var(--ink-300)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <i className="ph ph-x" style={{ fontSize: 11, lineHeight: 0 }} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

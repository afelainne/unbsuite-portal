import React from 'react';

export function LegendList({ items = [], columns = 2, style, ...rest }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(' + columns + ', minmax(0,auto))',
      gap: '6px 18px', justifyContent: 'start', ...style,
    }} {...rest}>
      {items.map((it, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)', color: 'var(--text-body)', whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 9, height: 9, borderRadius: 'var(--radius-pill)', background: it.color || 'var(--ink-300)', flex: '0 0 auto' }} />
          {it.label}
          {it.value ? <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{it.value}</span> : null}
        </span>
      ))}
    </div>
  );
}

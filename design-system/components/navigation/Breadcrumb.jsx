import React from 'react';

export function Breadcrumb({ items = [], separator = '/', style, ...rest }) {
  return (
    <nav style={{
      display: 'inline-flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)', color: 'var(--text-muted)', ...style,
    }} {...rest}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span style={{ color: 'var(--ink-200)' }}>{separator}</span> : null}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: i === items.length - 1 ? 'var(--ink-700)' : 'var(--text-muted)' }}>
            {it.icon ? <i className={it.icon} style={{ fontSize: 'var(--icon-sm)', lineHeight: 0 }} aria-hidden="true" /> : null}
            {it.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

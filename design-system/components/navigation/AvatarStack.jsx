import React from 'react';

export function AvatarStack({
  people = [], size = 30, overlap = 8, action, count, style, ...rest
}) {
  const hasAction = Boolean(action || count);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      padding: hasAction ? '3px 3px 3px 3px' : 0,
      borderRadius: hasAction ? 'var(--radius-sm)' : 0,
      background: hasAction ? 'var(--surface-invert)' : 'transparent', ...style,
    }} {...rest}>
      <span style={{ display: 'inline-flex' }}>
        {people.map((p, i) => (
          <span key={i} title={p.name}
            style={{
              width: size, height: size, marginLeft: i === 0 ? 0 : -overlap,
              borderRadius: 'var(--radius-xs)', overflow: 'hidden',
              background: 'var(--light-gray)', border: '1.5px solid ' + (hasAction ? 'var(--black)' : 'var(--white)'),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 'var(--fw-medium)', color: 'var(--ink-700)',
            }}>
            {p.src ? <img src={p.src} alt={p.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.initials || '')}
          </span>
        ))}
      </span>
      {hasAction ? (
        <span style={{
          padding: '0 12px 0 10px', fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)',
          color: 'var(--text-on-invert)', whiteSpace: 'nowrap',
        }}>{action || count}</span>
      ) : null}
    </div>
  );
}

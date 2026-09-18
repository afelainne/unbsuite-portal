import React from 'react';

export function Tabs({ items = [], value, onChange, variant = 'underline', size = 'md', style, ...rest }) {
  const fs = size === 'sm' ? 'var(--fs-caption)' : 'var(--fs-body-s)';
  const norm = items.map((i) => (typeof i === 'string' ? { value: i, label: i } : i));

  if (variant === 'pill') {
    return (
      <div role="tablist" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', ...style }} {...rest}>
        {norm.map((i) => {
          const on = i.value === value;
          return (
            <button key={i.value} type="button" role="tab" aria-selected={on} onClick={() => onChange && onChange(i.value)}
              style={{
                height: 34, padding: '0 16px', border: 0, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontFamily: 'var(--font-core)', fontSize: fs, fontWeight: 'var(--fw-medium)',
                background: on ? 'var(--surface-invert)' : 'transparent',
                color: on ? 'var(--text-on-invert)' : 'var(--ink-700)',
                transition: 'var(--transition-control)',
              }}>
              {i.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="tablist" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap', ...style }} {...rest}>
      {norm.map((i) => {
        const on = i.value === value;
        return (
          <button key={i.value} type="button" role="tab" aria-selected={on} onClick={() => onChange && onChange(i.value)}
            style={{
              border: 0, background: 'transparent', padding: '0 0 4px', cursor: 'pointer',
              fontFamily: 'var(--font-core)', fontSize: fs,
              color: on ? 'var(--ink-900)' : 'var(--text-muted)',
              borderBottom: on ? '1.5px solid var(--ink-900)' : '1.5px solid transparent',
              transition: 'var(--transition-control)',
            }}>
            {i.label}
          </button>
        );
      })}
    </div>
  );
}

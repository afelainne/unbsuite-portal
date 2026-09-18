import React from 'react';

export function SeriesToggle({ options = [], value, onChange, gap = 'var(--space-5)', style, ...rest }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap, ...style }} {...rest}>
      {options.map((opt) => {
        const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        const on = o.value === value;
        const swatch = o.color || 'var(--ink-900)';
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on}
            onClick={() => onChange && onChange(o.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              border: 0, background: 'transparent', padding: 0, cursor: 'pointer',
              fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body-s)',
              color: on ? 'var(--ink-900)' : 'var(--text-muted)',
              transition: 'var(--transition-control)',
            }}
          >
            <span style={{
              width: 11, height: 11, borderRadius: 'var(--radius-pill)',
              background: on ? swatch : 'transparent',
              boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--ink-200)',
              transition: 'var(--transition-control)',
            }} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

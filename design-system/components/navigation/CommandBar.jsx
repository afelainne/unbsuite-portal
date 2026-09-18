import React from 'react';

export function CommandBar({
  placeholder = 'Ask anything or search', value, onChange, onSubmit,
  suggestions = [], onSuggestion, actions, width = 640, floating = true, style, ...rest
}) {
  const [text, setText] = React.useState('');
  const v = value !== undefined ? value : text;
  const set = (next) => { if (onChange) onChange(next); else setText(next); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0, width, maxWidth: '100%', ...style }} {...rest}>
      {suggestions.length ? (
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'nowrap', overflow: 'hidden',
          padding: '8px 10px 14px', margin: '0 10px -10px',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          background: 'rgba(58,58,60,.82)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        }}>
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => onSuggestion && onSuggestion(s)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', height: 28, padding: '0 6px 0 12px',
                border: 0, borderRadius: 'var(--radius-xs)', background: 'rgba(255,255,255,.1)',
                color: 'rgba(255,255,255,.85)', fontFamily: 'var(--font-core)', fontSize: 'var(--fs-caption)',
                whiteSpace: 'nowrap', cursor: 'pointer',
              }}>
              {s}
              <span style={{
                width: 18, height: 18, borderRadius: 'var(--radius-pill)', background: 'var(--accent)',
                color: 'var(--text-on-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ph-bold ph-plus" style={{ fontSize: 9, lineHeight: 0 }} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(v); }}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: '10px',
          height: 56, padding: '0 8px', borderRadius: 'var(--radius-md)',
          background: 'var(--surface-invert)', boxShadow: floating ? 'var(--shadow-4)' : 'none',
        }}
      >
        <span style={{
          width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--radius-sm)',
          background: 'var(--accent)', color: 'var(--text-on-accent)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ph-fill ph-sparkle" style={{ fontSize: 'var(--icon)', lineHeight: 0 }} aria-hidden="true" />
        </span>
        <input
          value={v} onChange={(e) => set(e.target.value)} placeholder={placeholder}
          style={{
            flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent',
            textAlign: 'center', fontFamily: 'var(--font-core)', fontSize: 'var(--fs-body)',
            color: 'var(--white)',
          }}
        />
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
          {actions || (
            <>
              <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ph-fill ph-microphone" style={{ fontSize: 'var(--icon-sm)', lineHeight: 0 }} aria-hidden="true" />
              </span>
              <span style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.85)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ph-fill ph-squares-four" style={{ fontSize: 'var(--icon-sm)', lineHeight: 0 }} aria-hidden="true" />
              </span>
            </>
          )}
        </span>
      </form>
    </div>
  );
}

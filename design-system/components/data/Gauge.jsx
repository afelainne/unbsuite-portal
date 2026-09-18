import React from 'react';

export function Gauge({
  value = 0, max = 100, size = 200, thickness = 5, tone = 'ink',
  label, caption, style, ...rest
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const arc = (from, to) => {
    const a0 = Math.PI * (1 + from), a1 = Math.PI * (1 + to);
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return 'M ' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1;
  };
  const stroke = tone === 'accent' ? 'var(--mint-400)' : 'var(--ink-900)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', ...style }} {...rest}>
      <svg width={size} height={size / 2 + thickness} viewBox={'0 0 ' + size + ' ' + (size / 2 + thickness)} role="img" aria-label={label ? String(label) : 'gauge'}>
        <path d={arc(0, 1)} fill="none" stroke="var(--light-gray)" strokeWidth={thickness} strokeLinecap="round" />
        {pct > 0 ? <path d={arc(0, pct)} fill="none" stroke={stroke} strokeWidth={thickness} strokeLinecap="round" /> : null}
      </svg>
      {(label || caption) ? (
        <div style={{ textAlign: 'center' }}>
          {label ? <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h1)', lineHeight: 1, color: 'var(--text-display)', fontVariantNumeric: 'tabular-nums' }}>{label}</div> : null}
          {caption ? <div style={{ fontSize: 'var(--fs-body-s)', color: 'var(--text-muted)', marginTop: 4 }}>{caption}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

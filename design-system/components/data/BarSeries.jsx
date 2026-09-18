import React from 'react';

export function BarSeries({
  data = [], height = 120, gap = 2, tone = 'ink', highlightIndex = -1,
  barWidth, rounded = false, baseline = false, style, ...rest
}) {
  const max = Math.max(1, ...data.map((d) => (typeof d === 'number' ? d : d.value)));
  const stroke = { ink: 'var(--ink-900)', gray: 'var(--light-gray)', accent: 'var(--mint-400)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap, height, minWidth: 0 }}>
        {data.map((d, i) => {
          const v = typeof d === 'number' ? d : d.value;
          const t = typeof d === 'number' ? tone : (d.tone || tone);
          const hot = i === highlightIndex;
          return (
            <span key={i} title={typeof d === 'number' ? undefined : d.label}
              style={{
                flex: barWidth ? '0 0 auto' : 1, width: barWidth, minWidth: barWidth ? undefined : 1,
                height: Math.max(2, (v / max) * height),
                background: hot ? 'var(--mint-400)' : stroke[t] || stroke.ink,
                borderRadius: rounded ? 'var(--radius-xs)' : 0,
                transition: 'height var(--dur-base) var(--ease-out), background-color var(--dur-fast) linear',
              }} />
          );
        })}
      </div>
      {baseline ? <div style={{ height: 1, background: 'var(--grid-line)' }} /> : null}
    </div>
  );
}

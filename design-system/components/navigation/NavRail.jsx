import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

export function NavRail({ items = [], value, onChange, gap = 8, size = 'lg', style, ...rest }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap, ...style }} {...rest}>
      {items.map((it) => (
        <IconButton
          key={it.value}
          icon={it.value === value ? (it.iconActive || it.icon) : it.icon}
          label={it.label}
          size={size}
          active={it.value === value}
          badge={it.badge}
          onClick={() => onChange && onChange(it.value)}
        />
      ))}
    </nav>
  );
}

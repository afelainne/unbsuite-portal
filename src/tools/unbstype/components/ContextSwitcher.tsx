import React from 'react';

interface ContextSwitcherProps {
  value: string;
  onChange: (ctx: string) => void;
}

const CONTEXTS = [
  { key: 'hero', label: 'Hero', icon: '◆' },
  { key: 'article', label: 'Artigo', icon: '¶' },
  { key: 'ui', label: 'UI', icon: '⬡' },
  { key: 'poster', label: 'Poster', icon: '▲' },
];

const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ value, onChange }) => {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CONTEXTS.map(ctx => (
        <button
          key={ctx.key}
          onClick={() => onChange(ctx.key)}
          className={`px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] font-bold border transition-all ${
            value === ctx.key
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-border/40 hover:border-border'
          }`}
        >
          {ctx.icon} {ctx.label}
        </button>
      ))}
    </div>
  );
};

export default ContextSwitcher;

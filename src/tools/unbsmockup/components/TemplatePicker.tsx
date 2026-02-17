import React from 'react';
import { TEMPLATES, MockupTemplate } from '../templates';

interface TemplatePickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

const categories = [...new Set(TEMPLATES.map(t => t.category))];

const TemplatePicker: React.FC<TemplatePickerProps> = ({ selected, onSelect }) => {
  return (
    <div className="space-y-4">
      {categories.map(cat => (
        <div key={cat}>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">{cat}</span>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.filter(t => t.category === cat).map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selected === t.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border/30 hover:border-border/60 bg-background'
                }`}
              >
                {/* Mini preview */}
                <div className="w-full aspect-[4/3] mb-2 flex items-center justify-center">
                  <svg
                    viewBox={t.viewBox}
                    className="h-full w-auto"
                    style={{ maxHeight: '60px' }}
                  >
                    <rect x="0" y="0" width={t.width} height={t.height} fill="#2a2a2a" rx="4" />
                    <rect
                      x={t.screen.x}
                      y={t.screen.y}
                      width={t.screen.width}
                      height={t.screen.height}
                      rx={t.screen.rx || 0}
                      fill="#444"
                    />
                  </svg>
                </div>
                <span className="font-mono text-[10px] font-bold text-foreground">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplatePicker;

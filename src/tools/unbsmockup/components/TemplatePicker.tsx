import React, { useState } from 'react';
import { TEMPLATES, MockupTemplate } from '../templates';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface TemplatePickerProps {
  selected: string;
  onSelect: (id: string) => void;
}

const categories = [...new Set(TEMPLATES.map(t => t.category))];

function getCategoryForTemplate(id: string): string | undefined {
  return TEMPLATES.find(t => t.id === id)?.category;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({ selected, onSelect }) => {
  const selectedCategory = getCategoryForTemplate(selected);
  const [openCats, setOpenCats] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (selectedCategory) s.add(selectedCategory);
    else if (categories.length > 0) s.add(categories[0]);
    return s;
  });

  const toggle = (cat: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {categories.map(cat => {
        const templates = TEMPLATES.filter(t => t.category === cat);
        const isOpen = openCats.has(cat);
        return (
          <Collapsible key={cat} open={isOpen} onOpenChange={() => toggle(cat)}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 px-1 hover:bg-muted/30 rounded transition-colors cursor-pointer">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                {cat} <span className="text-[8px] opacity-60">({templates.length})</span>
              </span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-3 gap-1 pt-1 pb-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`p-1 rounded border transition-all text-left ${
                      selected === t.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border/20 hover:border-border/50 bg-background'
                    }`}
                  >
                    <div className="w-full flex items-center justify-center mb-0.5" style={{ height: '32px' }}>
                      <svg
                        viewBox={t.viewBox}
                        className="h-full w-auto"
                        style={{ maxHeight: '32px' }}
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
                    <span className="font-mono text-[7px] leading-tight font-bold text-foreground block truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default TemplatePicker;

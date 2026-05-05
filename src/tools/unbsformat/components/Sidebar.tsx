
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FORMAT_PRESETS } from '../constants';
import { FormatPreset } from '../types';

interface SidebarProps {
  selectedId: string;
  onSelect: (preset: FormatPreset) => void;
}

const CATEGORY_ORDER = ['PRINT', 'EDITORIAL', 'PHOTO', 'PACKAGING', 'SIGNAGE', 'ADVERTISING', 'SOCIAL MEDIA', 'SCREEN', 'STATIONERY'] as const;

export const Sidebar: React.FC<SidebarProps> = ({ selectedId, onSelect }) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['PRINT']));

  const toggle = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: FORMAT_PRESETS.filter(f => f.category === cat),
  }));

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-[#232323]/15 h-full overflow-y-auto bg-white">
      {grouped.map(({ category, items }) => {
        const isOpen = openCategories.has(category);
        return (
          <div key={category} className="border-b border-[#232323]/10">
            <button
              onClick={() => toggle(category)}
              className="w-full flex items-center justify-between px-3 h-9 hover:bg-[#F7E043]/20"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#232323]">
                {category}
              </span>
              {isOpen ? (
                <ChevronDown className="h-3 w-3 text-[#232323]/60" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[#232323]/60" />
              )}
            </button>
            {isOpen && (
              <ul className="pb-2">
                {items.map(item => {
                  const active = selectedId === item.id;
                  return (
                    <li
                      key={item.id}
                      onClick={() => onSelect(item)}
                      className={`flex justify-between items-center px-3 h-7 cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] ${
                        active
                          ? 'bg-[#232323] text-[#F0FF00]'
                          : 'text-[#232323] hover:bg-[#F7E043]/30'
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="opacity-60 text-[9px] shrink-0 ml-2 tabular-nums">
                        {Math.round(item.width)}×{Math.round(item.height)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </aside>
  );
};


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
    <div className="w-64 border-r border-gray-200 h-screen overflow-y-auto bg-white flex flex-col p-4 mono text-[10px] tracking-widest uppercase">
      <div className="mb-6 border-b border-black pb-2">
        <h1 className="font-bold text-sm">FORMAT LAB</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {grouped.map(({ category, items }) => {
          const isOpen = openCategories.has(category);
          return (
            <div key={category}>
              <button
                onClick={() => toggle(category)}
                className="w-full flex items-center justify-between py-2 px-1 text-gray-400 hover:text-black transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                  {category}
                </span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {isOpen && (
                <ul className="space-y-0.5 mb-2">
                  {items.map(item => (
                    <li
                      key={item.id}
                      onClick={() => onSelect(item)}
                      className={`flex justify-between p-2 cursor-pointer transition-colors ${
                        selectedId === item.id ? 'bg-black text-white' : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="opacity-50 text-[8px] shrink-0 ml-2">
                        {Math.round(item.width)}×{Math.round(item.height)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

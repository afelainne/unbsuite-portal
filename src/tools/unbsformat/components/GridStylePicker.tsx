
import React, { useState } from 'react';
import { GridStylePreset, PrintSettings } from '../types';
import { GRID_STYLE_PRESETS } from '../constants';
import { ChevronRight, Grid3X3, Columns2 } from 'lucide-react';

interface GridStylePickerProps {
  onApply: (preset: GridStylePreset) => void;
  currentSettings: PrintSettings;
}

const GRID_CATEGORIES = ['CLASSIC', 'EDITORIAL', 'DIGITAL', 'POSTER', 'MINIMAL', 'MODULAR'] as const;

const isMatch = (preset: GridStylePreset, s: PrintSettings) =>
  preset.columns === s.columns && preset.rows === s.rows &&
  preset.gutter === s.gutter && preset.safeZone === s.safeZone && preset.bleed === s.bleed;

export const GridStylePicker: React.FC<GridStylePickerProps> = ({ onApply, currentSettings }) => {
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['CLASSIC']));

  const toggle = (cat: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  return (
    <div className="w-72 max-h-96 overflow-y-auto py-1">
      {GRID_CATEGORIES.map(cat => {
        const presets = GRID_STYLE_PRESETS.filter(p => p.category === cat);
        const isOpen = openCats.has(cat);
        return (
          <div key={cat}>
            <button
              onClick={() => toggle(cat)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              {cat}
              <span className="ml-auto text-[9px] font-normal text-gray-400">{presets.length}</span>
            </button>
            {isOpen && (
              <div className="pb-1">
                {presets.map(p => {
                  const active = isMatch(p, currentSettings);
                  return (
                    <button
                      key={p.id}
                      onClick={() => onApply(p)}
                      className={`w-full text-left px-4 py-2 transition-colors ${
                        active ? 'bg-black text-white' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium">{p.name}</span>
                        {p.rows > 1 ? (
                          <Grid3X3 className="h-3 w-3 opacity-40" />
                        ) : (
                          <Columns2 className="h-3 w-3 opacity-40" />
                        )}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                        {p.description} · {p.columns}col{p.rows > 1 ? ` × ${p.rows}row` : ''} · {p.gutter}mm · {p.safeZone}mm
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

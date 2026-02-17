import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FONTS, FontEntry, FontCategory, CATEGORY_LABELS, loadGoogleFont } from '../constants';
import { Search } from 'lucide-react';

interface FontSelectorProps {
  value: string;
  onChange: (fontName: string) => void;
  label: string;
}

const FontSelector: React.FC<FontSelectorProps> = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<FontCategory | 'all'>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    return FONTS.filter(f => {
      if (filterCat !== 'all' && f.category !== filterCat) return false;
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filterCat]);

  const handleSelect = (font: FontEntry) => {
    loadGoogleFont(font.name, font.weights);
    onChange(font.name);
    setOpen(false);
    setSearch('');
  };

  // Preload current font
  useEffect(() => {
    if (value) {
      const f = FONTS.find(f => f.name === value);
      if (f) loadGoogleFont(f.name, f.weights);
    }
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1 block">{label}</span>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-all"
      >
        <span className="font-mono text-[11px] font-bold" style={{ fontFamily: `'${value}', sans-serif` }}>
          {value || 'Select font...'}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-[320px] overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fonts..."
                className="w-full pl-7 pr-2 py-1.5 font-mono text-[10px] rounded bg-muted/50 border-none outline-none"
                autoFocus
              />
            </div>
          </div>
          {/* Category filter */}
          <div className="flex gap-1 p-2 border-b border-border/50 flex-wrap">
            <button
              onClick={() => setFilterCat('all')}
              className={`px-2 py-0.5 rounded font-mono text-[8px] uppercase tracking-wider ${filterCat === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
            >All</button>
            {(Object.keys(CATEGORY_LABELS) as FontCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-2 py-0.5 rounded font-mono text-[8px] uppercase tracking-wider ${filterCat === cat ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
              >{CATEGORY_LABELS[cat]}</button>
            ))}
          </div>
          {/* Font list */}
          <div className="overflow-y-auto flex-1">
            {filtered.map(f => (
              <button
                key={f.name}
                onClick={() => handleSelect(f)}
                onMouseEnter={() => loadGoogleFont(f.name, f.weights)}
                className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center justify-between ${value === f.name ? 'bg-accent/10' : ''}`}
              >
                <span className="text-[12px]" style={{ fontFamily: `'${f.name}', sans-serif` }}>{f.name}</span>
                <span className="font-mono text-[8px] text-muted-foreground uppercase">{f.category}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="p-3 text-center font-mono text-[10px] text-muted-foreground">No fonts found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontSelector;

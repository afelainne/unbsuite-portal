import { useState, useMemo } from 'react';
import { FONTS, loadGoogleFont } from '../../unbstype/constants';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdFontSelectorProps {
  value: string;
  onChange: (fontName: string) => void;
  label?: string;
}

const IdFontSelector = ({ value, onChange, label }: IdFontSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => FONTS.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const handleSelect = (fontName: string) => {
    loadGoogleFont(fontName);
    onChange(fontName);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative">
      {label && <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{label}</p>}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 w-full border border-foreground/20 rounded px-2 py-1.5 text-xs bg-background hover:border-primary transition-colors"
        style={{ fontFamily: value }}
      >
        <span>{value || 'Selecionar fonte…'}</span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-foreground/20 rounded-lg shadow-lg">
          <div className="p-2 border-b border-foreground/10">
            <div className="flex items-center gap-1.5 border border-foreground/20 rounded px-2 py-1">
              <Search className="h-3 w-3 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar fonte…"
                className="flex-1 bg-transparent outline-none text-xs"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.map((f) => (
              <button
                key={f.name}
                onClick={() => handleSelect(f.name)}
                onMouseEnter={() => loadGoogleFont(f.name)}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted transition-colors',
                  value === f.name && 'bg-primary/10 text-primary'
                )}
                style={{ fontFamily: f.name }}
              >
                {f.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-4 text-xs text-muted-foreground">Nenhuma fonte encontrada</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdFontSelector;

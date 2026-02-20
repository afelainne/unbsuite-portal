import { useState } from 'react';
import { hexToRgb, rgbToCmyk, rgbToHsl } from '../../unbscolor/utils/colorMath';
import { ColorEntry, ColorRole } from '../types';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import EditableText from './EditableText';
import { cn } from '@/lib/utils';

interface ColorEntryCardProps {
  entry: ColorEntry;
  onChange: (updated: ColorEntry) => void;
  onRemove?: () => void;
}

const ROLE_LABELS: Record<ColorRole, string> = {
  primary: 'Primária',
  secondary: 'Secundária',
  accent: 'Destaque',
  neutral: 'Neutro',
};

export const ColorEntryCard = ({ entry, onChange, onRemove }: ColorEntryCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const rgb = hexToRgb(entry.hex);
  const hsl = rgb ? rgbToHsl(rgb) : null;
  const cmyk = rgb ? rgbToCmyk(rgb) : null;

  const handleHexChange = (val: string) => {
    const cleaned = val.startsWith('#') ? val : `#${val}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      onChange({ ...entry, hex: cleaned.toUpperCase() });
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-foreground/10 bg-background/50 text-xs">
      {/* Swatch */}
      <div
        className="relative h-20 w-full group"
        style={{ backgroundColor: entry.hex }}
      >
        <label
          className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center bg-black/20 transition-opacity"
          title="Mudar cor"
        >
          <input
            type="color"
            value={entry.hex}
            onChange={(e) => onChange({ ...entry, hex: e.target.value.toUpperCase() })}
            className="sr-only"
          />
          <span className="text-white text-[10px] font-mono bg-black/50 px-2 py-0.5 rounded">
            Editar cor
          </span>
        </label>
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-black/30 rounded text-white hover:bg-red-500/80 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-2 space-y-1">
        <EditableText
          value={entry.name}
          onChange={(v) => onChange({ ...entry, name: v })}
          className="font-semibold text-[11px] block"
        />

        {/* HEX editável */}
        <input
          value={entry.hex}
          onChange={(e) => handleHexChange(e.target.value)}
          className="font-mono text-[10px] bg-transparent border-b border-dashed border-foreground/20 outline-none w-full text-muted-foreground"
        />

        {/* Role selector */}
        <select
          value={entry.role}
          onChange={(e) => onChange({ ...entry, role: e.target.value as ColorRole })}
          className="text-[9px] bg-transparent border border-foreground/10 rounded px-1 py-0.5 w-full"
        >
          {(Object.keys(ROLE_LABELS) as ColorRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>

        {/* Toggle expand */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
          Ver códigos
        </button>

        {expanded && (
          <div className="space-y-0.5 pt-1 border-t border-foreground/10">
            {rgb && (
              <p className="font-mono text-[9px] text-muted-foreground">
                RGB {rgb.r}, {rgb.g}, {rgb.b}
              </p>
            )}
            {hsl && (
              <p className="font-mono text-[9px] text-muted-foreground">
                HSL {Math.round(hsl.h)}°, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%
              </p>
            )}
            {cmyk && (
              <p className="font-mono text-[9px] text-muted-foreground">
                CMYK {Math.round(cmyk.c)}, {Math.round(cmyk.m)}, {Math.round(cmyk.y)}, {Math.round(cmyk.k)}
              </p>
            )}
            {entry.accessibilityNote && (
              <p className="text-[9px] text-muted-foreground italic">{entry.accessibilityNote}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Add Color Button ───────────────────────────────────────────────────────────

interface AddColorButtonProps {
  onAdd: (entry: ColorEntry) => void;
}

export const AddColorButton = ({ onAdd }: AddColorButtonProps) => {
  const handleClick = () => {
    const id = `c${Date.now()}`;
    onAdd({ id, name: 'Nova Cor', hex: '#6366F1', role: 'accent' });
  };

  return (
    <button
      onClick={handleClick}
      className="h-full min-h-[140px] rounded-lg border-2 border-dashed border-foreground/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Plus className="h-5 w-5" />
      <span className="text-[10px]">Adicionar cor</span>
    </button>
  );
};

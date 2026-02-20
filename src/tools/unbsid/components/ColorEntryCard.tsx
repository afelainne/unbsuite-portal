import { hexToRgb, rgbToCmyk, rgbToHsl } from '../../unbscolor/utils/colorMath';
import { ColorEntry, ColorRole } from '../types';
import { Plus, Trash2 } from 'lucide-react';
import EditableText from './EditableText';

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

const ROLE_COLORS: Record<ColorRole, string> = {
  primary:   'bg-blue-500/10 text-blue-700 border-blue-200',
  secondary: 'bg-purple-500/10 text-purple-700 border-purple-200',
  accent:    'bg-amber-500/10 text-amber-700 border-amber-200',
  neutral:   'bg-gray-500/10 text-gray-600 border-gray-200',
};

export const ColorEntryCard = ({ entry, onChange, onRemove }: ColorEntryCardProps) => {
  const rgb  = hexToRgb(entry.hex);
  const hsl  = rgb ? rgbToHsl(rgb)  : null;
  const cmyk = rgb ? rgbToCmyk(rgb) : null;

  const handleHexChange = (val: string) => {
    const cleaned = val.startsWith('#') ? val : `#${val}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      onChange({ ...entry, hex: cleaned.toUpperCase() });
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-foreground/10 bg-card shadow-sm flex flex-col text-xs">
      {/* ── Swatch ──────────────────────────────────────────────── */}
      <div
        className="relative h-24 w-full group"
        style={{ backgroundColor: entry.hex }}
      >
        {/* Color picker on hover */}
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
          <span className="text-white text-[9px] font-mono bg-black/50 px-2 py-0.5 rounded">
            Editar cor
          </span>
        </label>

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 bg-black/30 rounded text-white hover:bg-red-500/80 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}

        {/* Role badge */}
        <span className={`absolute bottom-1.5 left-1.5 text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${ROLE_COLORS[entry.role]} bg-white/80`}>
          {ROLE_LABELS[entry.role]}
        </span>
      </div>

      {/* ── Name + role selector ─────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-0 flex items-start justify-between gap-2">
        <EditableText
          value={entry.name}
          onChange={(v) => onChange({ ...entry, name: v })}
          className="font-semibold text-[12px] leading-tight text-foreground"
        />
        <select
          value={entry.role}
          onChange={(e) => onChange({ ...entry, role: e.target.value as ColorRole })}
          className="text-[8px] bg-transparent border border-foreground/10 rounded px-1 py-0.5 shrink-0 mt-0.5"
        >
          {(Object.keys(ROLE_LABELS) as ColorRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {/* ── Codes block — always visible, Multi-Slot style ──────── */}
      <div className="mx-3 mt-2 mb-0 rounded-lg bg-white/50 border border-black/5 p-3 space-y-1.5">
        {/* HEX input — editable, bold */}
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono text-muted-foreground/60 w-8">HEX</span>
          <input
            value={entry.hex}
            onChange={(e) => handleHexChange(e.target.value)}
            className="font-mono font-bold text-[12px] text-foreground bg-transparent outline-none border-b border-dashed border-foreground/20 flex-1 min-w-0"
          />
        </div>

        {/* RGB */}
        {rgb && (
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-muted-foreground/60 w-8">RGB</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {rgb.r}, {rgb.g}, {rgb.b}
            </span>
          </div>
        )}

        {/* HSL */}
        {hsl && (
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-muted-foreground/60 w-8">HSL</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {Math.round(hsl.h)}°, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%
            </span>
          </div>
        )}

        {/* CMYK — separated visually */}
        {cmyk && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-black/5">
            <span className="text-[8px] font-mono text-muted-foreground/60 w-8">CMYK</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {Math.round(cmyk.c)}, {Math.round(cmyk.m)}, {Math.round(cmyk.y)}, {Math.round(cmyk.k)}
            </span>
          </div>
        )}
      </div>

      {/* ── Usage note ──────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-3">
        <EditableText
          value={entry.usageNote || 'Clique para adicionar nota de uso…'}
          onChange={(v) => onChange({ ...entry, usageNote: v })}
          className="text-[10px] italic text-muted-foreground leading-snug"
        />
      </div>
    </div>
  );
};

// ── Add Color Button ─────────────────────────────────────────────────────────

interface AddColorButtonProps {
  onAdd: (entry: ColorEntry) => void;
}

export const AddColorButton = ({ onAdd }: AddColorButtonProps) => {
  const handleClick = () => {
    const id = `c${Date.now()}`;
    onAdd({ id, name: 'Nova Cor', hex: '#6366F1', role: 'accent', usageNote: '' });
  };

  return (
    <button
      onClick={handleClick}
      className="h-full min-h-[200px] rounded-xl border-2 border-dashed border-foreground/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Plus className="h-5 w-5" />
      <span className="text-[10px]">Adicionar cor</span>
    </button>
  );
};

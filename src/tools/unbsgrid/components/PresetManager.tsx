import React from 'react';
import { Bookmark, Save, FolderOpen, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import InfoTooltip from './InfoTooltip';
import type { GeometryPreset } from '../lib/preset-engine';

interface Props {
  activePreset: GeometryPreset | null;
  isModified: boolean;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onRevert: () => void;
  builtinPresets?: GeometryPreset[];
  onApplyPreset?: (preset: GeometryPreset) => void;
}

const PresetManager: React.FC<Props> = ({ activePreset, isModified, onSaveClick, onLoadClick, onRevert, builtinPresets = [], onApplyPreset }) => (
  <section>
    <div className="flex items-center gap-1.5 mb-3">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
      <Label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Presets</Label>
      <InfoTooltip content="Salve e carregue configurações de geometria para reutilização. Use os presets rápidos abaixo ou crie os seus." />
    </div>
    {activePreset && (
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Ativo:</span>
        <span className="text-xs font-medium text-foreground truncate">{activePreset.name}</span>
        {isModified && (
          <span className="text-[9px] text-amber-400 italic">· Modificado</span>
        )}
      </div>
    )}
    <div className="flex gap-2">
      <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px]" onClick={onLoadClick}>
        <FolderOpen className="h-2.5 w-2.5 mr-1" /> Carregar
      </Button>
      <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px]" onClick={onSaveClick}>
        <Save className="h-2.5 w-2.5 mr-1" /> Salvar
      </Button>
    </div>

    {/* Inline builtin preset chips */}
    {builtinPresets.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {builtinPresets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onApplyPreset?.(preset)}
            className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium border transition-all ${
              activePreset?.id === preset.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-sidebar border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
            }`}
            title={preset.description || preset.name}
          >
            {preset.name}
          </button>
        ))}
      </div>
    )}

    {isModified && activePreset && (
      <Button size="sm" variant="ghost" className="w-full h-6 text-[9px] mt-1.5 text-muted-foreground" onClick={onRevert}>
        <RotateCcw className="h-2.5 w-2.5 mr-1" /> Reverter para "{activePreset.name}"
      </Button>
    )}
  </section>
);

export default PresetManager;

import React, { useState } from 'react';
import { Bookmark, Save, FolderOpen, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import InfoTooltip from './InfoTooltip';
import type { GeometryPreset } from '../lib/preset-engine';

const THEME = {
  text: '#232323',
  accent: '#F0FF00',
  border: '#D0D0C8',
  muted: '#888',
};

interface Props {
  activePreset: GeometryPreset | null;
  isModified: boolean;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onRevert: () => void;
  builtinPresets?: GeometryPreset[];
  onApplyPreset?: (preset: GeometryPreset) => void;
}

const PresetManager: React.FC<Props> = ({ activePreset, isModified, onSaveClick, onLoadClick, onRevert, builtinPresets = [], onApplyPreset }) => {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-1 rounded-md transition-colors" style={{ color: THEME.text }}>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Bookmark className="h-3 w-3" style={{ color: THEME.muted }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.text }}>Presets</span>
        <InfoTooltip content="Save and load geometry presets for reuse." />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5 space-y-1.5">
        {activePreset && (
          <div className="flex items-center gap-1">
            <span className="text-[9px]" style={{ color: THEME.muted }}>Active:</span>
            <span className="text-[10px] font-medium truncate" style={{ color: THEME.text }}>{activePreset.name}</span>
            {isModified && <span className="text-[8px] italic" style={{ color: '#d4a017' }}>· Modified</span>}
          </div>
        )}
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="flex-1 h-5 text-[8px] border"
            style={{ borderColor: THEME.border, color: THEME.text }} onClick={onLoadClick}>
            <FolderOpen className="h-2.5 w-2.5 mr-0.5" /> Load
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-5 text-[8px] border"
            style={{ borderColor: THEME.border, color: THEME.text }} onClick={onSaveClick}>
            <Save className="h-2.5 w-2.5 mr-0.5" /> Save
          </Button>
        </div>

        {builtinPresets.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {builtinPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset?.(preset)}
                className="px-1.5 py-0.5 rounded-full text-[8px] font-medium border transition-all"
                style={{
                  backgroundColor: activePreset?.id === preset.id ? THEME.accent : 'transparent',
                  borderColor: activePreset?.id === preset.id ? THEME.text : THEME.border,
                  color: THEME.text,
                  fontWeight: activePreset?.id === preset.id ? 600 : 400,
                }}
                title={preset.description || preset.name}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}

        {isModified && activePreset && (
          <Button size="sm" variant="ghost" className="w-full h-5 text-[8px]" style={{ color: THEME.muted }} onClick={onRevert}>
            <RotateCcw className="h-2.5 w-2.5 mr-0.5" /> Revert to "{activePreset.name}"
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PresetManager;

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { ClearspaceUnit } from '../lib/svg-engine';

interface UnitSelectorProps {
  value: ClearspaceUnit;
  onChange: (value: ClearspaceUnit) => void;
}

const UNITS: { value: ClearspaceUnit; label: string }[] = [
  { value: 'logomark', label: 'Logomark' },
  { value: 'pixels', label: 'Pixels' },
  { value: 'centimeters', label: 'Centimeters' },
  { value: 'inches', label: 'Inches' },
];

const UnitSelector: React.FC<UnitSelectorProps> = ({ value, onChange }) => {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ClearspaceUnit)}>
      <SelectTrigger className="w-full bg-input border-border text-foreground h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {UNITS.map(unit => (
          <SelectItem 
            key={unit.value} 
            value={unit.value}
            className="text-xs text-popover-foreground focus:bg-surface-hover focus:text-foreground"
          >
            {unit.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default UnitSelector;

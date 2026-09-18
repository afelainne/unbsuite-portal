import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { ClearspaceUnit } from '../lib/svg-engine';
import { useLanguage } from '../i18n';

interface UnitSelectorProps {
  value: ClearspaceUnit;
  onChange: (value: ClearspaceUnit) => void;
}

const UNITS: { value: ClearspaceUnit; key: 'unitLogomark' | 'unitPixels' | 'unitCentimeters' | 'unitInches' }[] = [
  { value: 'logomark', key: 'unitLogomark' },
  { value: 'pixels', key: 'unitPixels' },
  { value: 'centimeters', key: 'unitCentimeters' },
  { value: 'inches', key: 'unitInches' },
];

const UnitSelector: React.FC<UnitSelectorProps> = ({ value, onChange }) => {
  const { t } = useLanguage();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ClearspaceUnit)}>
      <SelectTrigger className="w-full h-7 rounded-md text-footnote text-foreground" aria-label={t.common.unitAria}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {UNITS.map(unit => (
          <SelectItem
            key={unit.value}
            value={unit.value}
            className="text-callout text-popover-foreground focus:bg-fill focus:text-foreground"
          >
            {t.common[unit.key]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default UnitSelector;

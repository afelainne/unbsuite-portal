import React from 'react';
import { COLOR_BLINDNESS_TYPES, ColorBlindnessType, simulateColorBlindness } from '../utils/colorBlindness';
import type { Translations } from '../i18n';
import { TextTabs } from './ui';

export type VisionMode = 'normal' | ColorBlindnessType;

export const VISION_MODES: VisionMode[] = ['normal', ...COLOR_BLINDNESS_TYPES];

export const visionLabel = (t: Translations, mode: VisionMode): string => {
  switch (mode) {
    case 'protanopia':
      return t.protanopia;
    case 'deuteranopia':
      return t.deuteranopia;
    case 'tritanopia':
      return t.tritanopia;
    case 'achromatopsia':
      return t.achromatopsia;
    default:
      return t.visionNormal;
  }
};

/** Returns the simulated color for display (the original hex when normal or invalid). */
export const simulateVision = (hex: string, mode: VisionMode): string =>
  mode === 'normal' ? hex : simulateColorBlindness(hex, mode) ?? hex;

interface ColorVisionToggleProps {
  t: Translations;
  value: VisionMode;
  onChange: (mode: VisionMode) => void;
  className?: string;
}

export const ColorVisionToggle: React.FC<ColorVisionToggleProps> = ({ t, value, onChange, className = '' }) => (
  <TextTabs<VisionMode>
    size="sm"
    className={`max-w-full ${className}`}
    ariaLabel={t.colorVision}
    value={value}
    onChange={onChange}
    items={VISION_MODES.map((mode) => ({ value: mode, label: visionLabel(t, mode) }))}
  />
);

export const VisionCaption: React.FC<{ t: Translations; mode: VisionMode; className?: string }> = ({ t, mode, className = '' }) =>
  mode === 'normal' ? null : (
    <p className={`text-[12px] text-muted-foreground ${className}`} role="status">
      {t.simulation}: {visionLabel(t, mode)}
    </p>
  );

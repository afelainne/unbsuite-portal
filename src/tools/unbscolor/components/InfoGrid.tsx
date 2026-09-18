import React from 'react';
import { RGB, CMYK, HSL } from '../types';
import { useLanguage } from '../i18n';
import { Metric } from './ui';

interface InfoGridProps {
  rgb: RGB;
  cmyk: CMYK;
  hsl: HSL;
  /** Kept for compatibility; the analysis is shown with the reference match, not here. */
  analysis?: { description: string; usageTips: string[]; psychology: string } | null;
  onCmykChange: (channel: keyof CMYK, value: number) => void;
  onHslChange: (channel: keyof HSL, value: number) => void;
  onRgbChange: (channel: keyof RGB, value: number) => void;
}

interface ChannelProps {
  label: string;
  value: number;
  unit: string;
  max: number;
  onChange: (val: number) => void;
}

/** One channel: value above its caption (4px), slider underneath. */
const Channel: React.FC<ChannelProps> = ({ label, value, unit, max, onChange }) => (
  <div className="flex flex-col gap-3 min-w-0">
    <Metric size="sm" value={<>{value}{unit}</>} caption={label} />
    <input
      type="range"
      min="0"
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="tool-slider w-full"
      aria-label={label}
    />
  </div>
);

/**
 * The dense area of the Matcher: every editable channel, grouped by model.
 * Each model is one row with its micro label on the left, on a four-column grid
 * so RGB, CMYK and HSL line up under each other.
 */
export const InfoGrid: React.FC<InfoGridProps> = ({ rgb, cmyk, hsl, onCmykChange, onHslChange, onRgbChange }) => {
  const { t } = useLanguage();

  const groups: { id: string; label: string; channels: ChannelProps[] }[] = [
    {
      id: 'rgb',
      label: 'RGB',
      channels: [
        { label: t.red, value: rgb.r, unit: '', max: 255, onChange: (v) => onRgbChange('r', v) },
        { label: t.green, value: rgb.g, unit: '', max: 255, onChange: (v) => onRgbChange('g', v) },
        { label: t.blue, value: rgb.b, unit: '', max: 255, onChange: (v) => onRgbChange('b', v) }
      ]
    },
    {
      id: 'cmyk',
      label: 'CMYK',
      channels: [
        { label: t.cyan, value: cmyk.c, unit: '%', max: 100, onChange: (v) => onCmykChange('c', v) },
        { label: t.magenta, value: cmyk.m, unit: '%', max: 100, onChange: (v) => onCmykChange('m', v) },
        { label: t.yellow, value: cmyk.y, unit: '%', max: 100, onChange: (v) => onCmykChange('y', v) },
        { label: t.keyBlack, value: cmyk.k, unit: '%', max: 100, onChange: (v) => onCmykChange('k', v) }
      ]
    },
    {
      id: 'hsl',
      label: 'HSL',
      channels: [
        { label: t.hue, value: hsl.h, unit: '°', max: 360, onChange: (v) => onHslChange('h', v) },
        { label: t.saturation, value: hsl.s, unit: '%', max: 100, onChange: (v) => onHslChange('s', v) },
        { label: t.lightness, value: hsl.l, unit: '%', max: 100, onChange: (v) => onHslChange('l', v) }
      ]
    }
  ];

  return (
    <div className="col-span-full flex flex-col">
      {groups.map((group, index) => (
        <div
          key={group.id}
          className={`grid grid-cols-1 sm:grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-5 ${index === 0 ? 'pt-0' : 'hairline-t'} ${index === groups.length - 1 ? 'pb-0' : ''}`}
        >
          <span className="text-[14px] text-muted-foreground pt-1">{group.label}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
            {group.channels.map((channel) => (
              <Channel key={channel.label} {...channel} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import { RGB, CMYK, HSL } from '../types';
import { useLanguage } from '../i18n';

interface InfoGridProps {
  rgb: RGB;
  cmyk: CMYK;
  hsl: HSL;
  analysis: { description: string; usageTips: string[]; psychology: string } | null;
  onCmykChange: (channel: keyof CMYK, value: number) => void;
  onHslChange: (channel: keyof HSL, value: number) => void;
  onRgbChange: (channel: keyof RGB, value: number) => void;
}

interface MetricProps {
    label: string;
    value: number;
    unit: string;
    max: number;
    onChange: (val: number) => void;
}

const Metric: React.FC<MetricProps> = ({ label, value, unit, max, onChange }) => (
  <div className="flex flex-col gap-2">
    <h3 className="font-mono text-xs font-bold text-foreground mb-1 min-h-[1.5em]">{label}</h3>
    <div className="flex items-baseline gap-1">
        <span className="text-5xl md:text-6xl font-light tracking-tighter text-foreground">{value}</span>
        {unit && <span className="text-xl text-muted-foreground font-light">{unit}</span>}
    </div>
    <div className="mt-4">
         <input 
            type="range" 
            min="0"
            max={max}
            value={value} 
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-[2px] bg-muted appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all" 
         />
    </div>
  </div>
);

export const InfoGrid: React.FC<InfoGridProps> = ({ rgb, cmyk, hsl, analysis, onCmykChange, onHslChange, onRgbChange }) => {
  const { t } = useLanguage();
  
  return (
    <>
      {/* RGB Columns (Explicitly shown) */}
      <Metric label={t.red} value={rgb.r} unit="" max={255} onChange={(v) => onRgbChange('r', v)} />
      <Metric label={t.green} value={rgb.g} unit="" max={255} onChange={(v) => onRgbChange('g', v)} />
      <Metric label={t.blue} value={rgb.b} unit="" max={255} onChange={(v) => onRgbChange('b', v)} />

      {/* CMYK Columns */}
      <Metric label={t.cyan} value={cmyk.c} unit="%" max={100} onChange={(v) => onCmykChange('c', v)} />
      <Metric label={t.magenta} value={cmyk.m} unit="%" max={100} onChange={(v) => onCmykChange('m', v)} />
      <Metric label={t.yellow} value={cmyk.y} unit="%" max={100} onChange={(v) => onCmykChange('y', v)} />
      <Metric label={t.keyBlack} value={cmyk.k} unit="%" max={100} onChange={(v) => onCmykChange('k', v)} />
      
      {/* HSL Columns */}
      <Metric label={t.hue} value={hsl.h} unit="°" max={360} onChange={(v) => onHslChange('h', v)} />
      <Metric label={t.saturation} value={hsl.s} unit="%" max={100} onChange={(v) => onHslChange('s', v)} />
      <Metric label={t.lightness} value={hsl.l} unit="%" max={100} onChange={(v) => onHslChange('l', v)} />

      {/* AI Insight */}
      {analysis && (
          <div className="col-span-2 md:col-span-4 lg:col-span-6 mt-12 pt-12 border-t border-border/60">
               <h3 className="font-mono text-xs font-bold text-foreground mb-4">{t.aiAnalysis}</h3>
               <p className="text-2xl font-light leading-relaxed text-foreground max-w-4xl">
                   "{analysis.psychology} {analysis.description}"
               </p>
               <div className="flex gap-4 mt-6">
                   {analysis.usageTips.map((tip, i) => (
                       <span key={i} className="px-3 py-1 bg-secondary text-xs font-mono">{tip}</span>
                   ))}
               </div>
          </div>
      )}
    </>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TemplatePreview } from './components/TemplatePreview';
import { GridStylePicker } from './components/GridStylePicker';
import { FormatPreset, PrintSettings, GridStylePreset } from './types';
import { FORMAT_PRESETS } from './constants';
import { Download, LayoutGrid } from 'lucide-react';
import { ToolButton, ToolSlider, LABEL_TEXT } from '@/tools/_shared/ui';

const App: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<FormatPreset>(FORMAT_PRESETS.find(f => f.id === 'a4') || FORMAT_PRESETS[0]);
  const [settings, setSettings] = useState<PrintSettings>({
    bleed: 3,
    safeZone: 5,
    columns: 12,
    rows: 1,
    gutter: 5
  });
  const [showOverlay, setShowOverlay] = useState(true);
  const [showSafety, setShowSafety] = useState(true);
  const [showGridPicker, setShowGridPicker] = useState(false);
  const gridPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gridPickerRef.current && !gridPickerRef.current.contains(e.target as Node)) {
        setShowGridPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyGridStyle = (preset: GridStylePreset) => {
    setSettings({
      columns: preset.columns,
      rows: preset.rows,
      gutter: preset.gutter,
      safeZone: preset.safeZone,
      bleed: preset.bleed,
    });
    setShowGridPicker(false);
  };

  const downloadSVG = () => {
    const svg = document.getElementById('formatlab-canvas');
    if (!svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.includes('xmlns=')) {
      source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    source = '<?xml version="1.0" encoding="UTF-8"?>\n' + source;
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `formatlab_${selectedFormat.id}_template.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 min-h-0 w-full bg-white text-[#232323]">
      <Sidebar 
        selectedId={selectedFormat.id} 
        onSelect={setSelectedFormat} 
      />

      <main className="flex-1 flex flex-col">
        {/* Top Control Bar */}
        <header className="border-b border-[#232323]/15 bg-white flex items-center px-4 h-12 justify-between shrink-0 gap-4 flex-wrap">
          <div className="flex gap-5 items-center">
            {([
              { key: 'columns', label: 'COL', min: 1, max: 24, suffix: '' },
              { key: 'rows', label: 'ROW', min: 1, max: 12, suffix: '' },
              { key: 'gutter', label: 'GUT', min: 0, max: 20, suffix: 'mm' },
              { key: 'safeZone', label: 'SAFE', min: 2, max: 20, suffix: 'mm' },
            ] as const).map(c => (
              <div key={c.key} className="flex items-center gap-2">
                <span className={LABEL_TEXT}>{c.label}</span>
                <span className="font-mono text-[11px] tabular-nums w-9 text-right text-[#232323]">
                  {(settings as any)[c.key]}{c.suffix}
                </span>
                <ToolSlider
                  min={c.min}
                  max={c.max}
                  value={(settings as any)[c.key]}
                  onChange={(e) => setSettings({ ...settings, [c.key]: parseInt(e.target.value) })}
                  className="w-20"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative" ref={gridPickerRef}>
              <ToolButton
                variant="ghost"
                active={showGridPicker}
                onClick={() => setShowGridPicker(!showGridPicker)}
              >
                <LayoutGrid size={12} />
                GRID
              </ToolButton>
              {showGridPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-[#232323] z-50">
                  <GridStylePicker onApply={applyGridStyle} currentSettings={settings} />
                </div>
              )}
            </div>

            <ToolButton variant="ghost" active={showOverlay} onClick={() => setShowOverlay(!showOverlay)}>
              GRID
            </ToolButton>
            <ToolButton variant="ghost" active={showSafety} onClick={() => setShowSafety(!showSafety)}>
              SAFETY
            </ToolButton>

            <ToolButton variant="primary" onClick={downloadSVG}>
              <Download size={12} />
              EXPORT SVG
            </ToolButton>
          </div>
        </header>

        {/* Main Workspace Area - full width now */}
        <div className="flex-1 flex overflow-hidden">
          <TemplatePreview 
            preset={selectedFormat}
            settings={settings}
            showOverlay={showOverlay}
            showSafety={showSafety}
          />
        </div>

        {/* Footer info bar */}
        <footer className="h-8 border-t border-[#232323]/15 bg-white flex items-center px-4 justify-between text-[9px] font-mono text-[#232323]/60 uppercase tracking-[0.2em]">
          <div className="flex gap-4">
            <span>UNITS: MM</span>
            <span>SCALE: 1:1</span>
            <span>COLOR: CMYK SIM</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#F0FF00] border border-[#232323]"></div>
            <span>LIVE EDITOR CONNECTED</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;


import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TemplatePreview } from './components/TemplatePreview';
import { GridStylePicker } from './components/GridStylePicker';
import { FormatPreset, PrintSettings, GridStylePreset } from './types';
import { FORMAT_PRESETS } from './constants';
import { Download, LayoutGrid } from 'lucide-react';

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
    <div className="flex h-screen w-full bg-[#fcfcfc] text-black">
      <Sidebar 
        selectedId={selectedFormat.id} 
        onSelect={setSelectedFormat} 
      />

      <main className="flex-1 flex flex-col">
        {/* Top Control Bar */}
        <header className="h-20 border-b border-gray-200 bg-white flex items-center px-8 justify-between shrink-0">
          <div className="flex gap-12 items-center">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] mono uppercase text-gray-400">Columns</span>
              <div className="flex items-center gap-3">
                <span className="mono text-lg font-bold w-6">{settings.columns}</span>
                <input 
                    type="range" min="1" max="24" 
                    value={settings.columns} 
                    onChange={(e) => setSettings({...settings, columns: parseInt(e.target.value)})}
                    className="w-24 accent-black"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] mono uppercase text-gray-400">Rows</span>
              <div className="flex items-center gap-3">
                <span className="mono text-lg font-bold w-6">{settings.rows}</span>
                <input 
                    type="range" min="1" max="12" 
                    value={settings.rows} 
                    onChange={(e) => setSettings({...settings, rows: parseInt(e.target.value)})}
                    className="w-24 accent-black"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] mono uppercase text-gray-400">Gutter</span>
              <div className="flex items-center gap-3">
                <span className="mono text-lg font-bold w-12">{settings.gutter}mm</span>
                <input 
                    type="range" min="0" max="20" 
                    value={settings.gutter} 
                    onChange={(e) => setSettings({...settings, gutter: parseInt(e.target.value)})}
                    className="w-24 accent-black"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] mono uppercase text-gray-400">Safe Margin</span>
              <div className="flex items-center gap-3">
                <span className="mono text-lg font-bold w-12">{settings.safeZone}mm</span>
                <input 
                    type="range" min="2" max="20" 
                    value={settings.safeZone} 
                    onChange={(e) => setSettings({...settings, safeZone: parseInt(e.target.value)})}
                    className="w-24 accent-black"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center">
             <div className="relative" ref={gridPickerRef}>
               <button
                 onClick={() => setShowGridPicker(!showGridPicker)}
                 className={`flex items-center gap-2 px-3 py-1.5 text-[10px] mono font-bold rounded-sm transition-all ${
                   showGridPicker ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                 }`}
               >
                 <LayoutGrid size={12} />
                 GRID STYLES
               </button>
               {showGridPicker && (
                 <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-xl z-50">
                   <GridStylePicker onApply={applyGridStyle} currentSettings={settings} />
                 </div>
               )}
             </div>

             <div className="flex bg-gray-100 p-1 rounded-sm text-[10px] mono font-bold">
                <button 
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`px-3 py-1.5 rounded-sm transition-all ${showOverlay ? 'bg-black text-white shadow-sm' : 'text-gray-400'}`}
                >
                  GRID
                </button>
                <button 
                  onClick={() => setShowSafety(!showSafety)}
                  className={`px-3 py-1.5 rounded-sm transition-all ${showSafety ? 'bg-black text-white shadow-sm' : 'text-gray-400'}`}
                >
                  SAFETY
                </button>
             </div>

             <button 
                onClick={downloadSVG}
                className="flex items-center gap-2 border border-black px-4 py-2 text-[11px] mono hover:bg-gray-100 transition-all"
             >
                <Download size={14} />
                EXPORT SVG
             </button>
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
        <footer className="h-8 border-t border-gray-200 bg-white flex items-center px-4 justify-between text-[8px] mono text-gray-400 uppercase">
          <div className="flex gap-4">
            <span>UNITS: MM</span>
            <span>SCALE: 1:1</span>
            <span>COLOR: CMYK SIMULATION</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>LIVE EDITOR CONNECTED</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;

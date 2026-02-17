
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TemplatePreview } from './components/TemplatePreview';
import { FormatPreset, PrintSettings } from './types';
import { FORMAT_PRESETS } from './constants';
import { Download } from 'lucide-react';

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

  const downloadSVG = () => {
    const svg = document.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const link = document.createElement("a");
    link.href = url;
    link.download = `formatlab_${selectedFormat.id}_template.svg`;
    link.click();
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

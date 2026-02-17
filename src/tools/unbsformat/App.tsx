
import React, { useState, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TemplatePreview } from './components/TemplatePreview';
import { FormatPreset, PrintSettings, AnalysisResult } from './types';
import { FORMAT_PRESETS } from './constants';
import { analyzePrintImage } from './geminiService';
import { Upload, Download, Settings, Loader2, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<FormatPreset>(FORMAT_PRESETS[4]); // A4 default
  const [settings, setSettings] = useState<PrintSettings>({
    bleed: 3,
    safeZone: 5,
    columns: 12,
    rows: 1,
    gutter: 5
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showSafety, setShowSafety] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setUploadedImage(event.target?.result as string);
      
      setIsAnalyzing(true);
      try {
        const result = await analyzePrintImage(base64, file.name);
        setAnalysis(result);
      } catch (err) {
        console.error("Analysis failed", err);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

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
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 text-[11px] mono hover:bg-gray-800 transition-all"
             >
                <Upload size={14} />
                UPLOAD ART
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

             <button 
                onClick={downloadSVG}
                className="flex items-center gap-2 border border-black px-4 py-2 text-[11px] mono hover:bg-gray-100 transition-all"
             >
                <Download size={14} />
                EXPORT SVG
             </button>
          </div>
        </header>

        {/* Main Workspace Area */}
        <div className="flex-1 flex overflow-hidden">
          <TemplatePreview 
            preset={selectedFormat}
            settings={settings}
            image={uploadedImage}
            showOverlay={showOverlay}
            showSafety={showSafety}
          />

          {/* Right Panel: AI Insights & Presets */}
          <aside className="w-80 border-l border-gray-200 bg-white overflow-y-auto p-6 text-[10px] mono uppercase tracking-wider">
            <div className="mb-10">
                <h3 className="font-bold mb-4 border-b border-black pb-1 flex justify-between">
                    SYSTEM PRESETS
                    <Settings size={12} />
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    <button className="border border-black p-2 hover:bg-black hover:text-white transition-all">TYPOGRAPHY</button>
                    <button className="border border-black p-2 hover:bg-black hover:text-white transition-all">IMAGE</button>
                    <button className="border border-black p-2 bg-black text-white col-span-2">CLASSIC GRID</button>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="font-bold border-b border-black pb-1">AI TECHNICAL REVIEW</h3>
                
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-gray-400">
                    <Loader2 size={24} className="animate-spin text-black" />
                    <p className="text-center animate-pulse">ANALYZING ARTWORK SPECS...</p>
                  </div>
                ) : analysis ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-gray-50 p-4 rounded-sm border-l-2 border-black">
                        <span className="text-gray-400 block mb-1">DETECTED FORMAT</span>
                        <p className="font-bold text-xs">{analysis.detectedFormat}</p>
                    </div>

                    <div className="space-y-2">
                        <span className="text-gray-400 block border-b border-gray-100 pb-1">TECHNICAL ALERTS</span>
                        {analysis.technicalIssues.map((issue, i) => (
                           <div key={i} className="flex gap-2 items-start text-[9px] lowercase normal-case leading-relaxed">
                             <AlertTriangle size={12} className="shrink-0 text-amber-500 mt-0.5" />
                             <span>{issue}</span>
                           </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <span className="text-gray-400 block">PAPER RECOMMENDATIONS</span>
                        {analysis.recommendations.map((paper, i) => (
                          <div key={i} className="group relative p-3 border border-gray-100 hover:border-black transition-all">
                             <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-black">{paper.type}</span>
                                <span className="text-[8px] opacity-50">{paper.weight}</span>
                             </div>
                             <p className="text-[8px] text-gray-400 lowercase normal-case leading-tight mb-2">
                                {paper.description}
                             </p>
                             <div className="flex gap-1">
                                <span className="px-1.5 py-0.5 bg-gray-100 text-[8px] rounded-sm">{paper.finish}</span>
                             </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-300 text-center gap-2">
                    <FileText size={32} />
                    <p>UPLOAD AN IMAGE TO GENERATE TECHNICAL INSIGHTS</p>
                  </div>
                )}
            </div>

            <div className="mt-12 pt-12 border-t border-gray-100 opacity-50 hover:opacity-100 transition-opacity">
                 <h3 className="mb-4">ARCHIVE PRESETS</h3>
                 <ul className="space-y-4">
                    <li className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                        <span>MANUSCRIPT SINGLE</span>
                        <span>1x1</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                        <span>POETRY CENTER</span>
                        <span>1x3</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                        <span>GLOSSARY LIST</span>
                        <span>3x30</span>
                    </li>
                 </ul>
            </div>
          </aside>
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

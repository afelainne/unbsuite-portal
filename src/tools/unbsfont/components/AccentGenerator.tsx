import React, { useState, useMemo } from 'react';
import { GlyphData, COMPOSITE_RECIPES } from '../types';

interface AccentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: GlyphData[];
  onGenerate: (selectedChars: string[], verticalOffset: number) => void;
  isDarkMode?: boolean; 
}

const AccentGenerator: React.FC<AccentGeneratorProps> = ({ isOpen, onClose, glyphs, onGenerate, isDarkMode = false }) => {
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const buildable = useMemo(() => {
    const list: { char: string; base: string; accent: string; status: 'READY' | 'MISSING_PARTS' }[] = [];
    Object.entries(COMPOSITE_RECIPES).forEach(([char, ingredients]) => {
        const [base, accent] = ingredients;
        const hasBase = glyphs.some(g => g.char === base && g.pathData);
        const hasAccent = glyphs.some(g => g.char === accent && g.pathData);
        if (hasBase && hasAccent) list.push({ char, base, accent, status: 'READY' });
    });
    return list;
  }, [glyphs]);

  useMemo(() => { setSelected(new Set(buildable.map(b => b.char))); }, [buildable]);

  const toggleChar = (char: string) => {
      const newSet = new Set(selected);
      if (newSet.has(char)) newSet.delete(char); else newSet.add(char);
      setSelected(newSet);
  };

  const handleRun = () => { onGenerate(Array.from(selected), verticalOffset); onClose(); };

  if (!isOpen) return null;

  const bgMain = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-black';
  const headerBorder = isDarkMode ? 'border-slate-800' : 'border-neutral-200';
  const textMain = isDarkMode ? 'text-white' : 'text-black';
  const textSub = isDarkMode ? 'text-slate-500' : 'text-neutral-500';
  const bgSub = isDarkMode ? 'bg-slate-950' : 'bg-neutral-50';
  const cardSelected = isDarkMode ? 'bg-slate-800 border-white' : 'bg-white border-black';
  const cardNormal = isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-slate-500' : 'bg-white border-neutral-200 hover:border-neutral-400';
  const tagBg = isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-neutral-100 text-neutral-500';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className={`border rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden ${bgMain}`}>
        <div className={`p-6 border-b flex justify-between items-center ${headerBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div>
                <h2 className={`text-xl font-black flex items-center gap-2 ${textMain}`}>Smart Accent Generator</h2>
                <p className={`text-sm mt-1 font-medium ${textSub}`}>Detected {buildable.length} combinations.</p>
            </div>
            <button onClick={onClose} className={`${textSub} hover:text-current`}>✕</button>
        </div>

        <div className={`flex-1 overflow-y-auto p-6 ${bgSub}`}>
            {buildable.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <p className={`font-bold ${textMain}`}>No buildable accents found.</p>
                    <p className={`text-sm mt-2 ${textSub}`}>Draw a Base Letter and an Accent first.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {buildable.map(item => (
                        <div key={item.char} onClick={() => toggleChar(item.char)} className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col items-center gap-2 ${selected.has(item.char) ? cardSelected : cardNormal}`}>
                            <div className={`text-3xl font-black ${textMain}`}>{item.char}</div>
                            <div className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${tagBg}`}>{item.base} + {item.accent}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className={`p-6 border-t space-y-4 ${headerBorder} ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
             <div>
                 <div className={`flex justify-between text-xs mb-2 font-bold uppercase ${textSub}`}><span>Vertical Adjustment</span><span className={textMain}>{verticalOffset} units</span></div>
                 <input type="range" min="-300" max="300" step="10" value={verticalOffset} onChange={(e) => setVerticalOffset(parseInt(e.target.value))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`} />
             </div>
             <button onClick={handleRun} disabled={selected.size === 0} className={`w-full py-3 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>Generate {selected.size} Glyphs</button>
        </div>
      </div>
    </div>
  );
};

export default AccentGenerator;
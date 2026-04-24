import React from 'react';

interface ModeSelectorProps {
    onSelectMode: (mode: 'COMPACT' | 'ADVANCED') => void;
    isDarkMode: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode, isDarkMode }) => {
    const bgMain = isDarkMode ? 'bg-slate-950' : 'bg-white';
    const textMain = isDarkMode ? 'text-white' : 'text-black';
    const textSub = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
    const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-white' : 'bg-white border-neutral-200 hover:border-black';
    const badgeBg = isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-neutral-100 text-neutral-600';

    return (
        <div className={`flex flex-col items-center justify-center min-h-screen ${bgMain} ${textMain} p-8`}>
            <h1 className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-50">UNBSFONT</h1>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-1">Select Editor Mode</h2>
            <p className={`text-xs ${textSub} mb-12 tracking-wide`}>Choose how you want to work on your font</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
                {/* Compact */}
                <button
                    onClick={() => onSelectMode('COMPACT')}
                    className={`flex flex-col items-start p-8 border-2 rounded-2xl transition-all cursor-pointer group text-left ${cardBg}`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">⚡</span>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider">Compact</h3>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>Recommended</span>
                        </div>
                    </div>
                    <ul className={`text-xs space-y-1.5 ${textSub}`}>
                        <li>• Streamlined single-panel interface</li>
                        <li>• Quick glyph editing with inline tools</li>
                        <li>• Auto kerning & spacing controls</li>
                        <li>• Ideal for rapid font creation</li>
                    </ul>
                </button>

                {/* Advanced */}
                <button
                    onClick={() => onSelectMode('ADVANCED')}
                    className={`flex flex-col items-start p-8 border-2 rounded-2xl transition-all cursor-pointer group text-left ${cardBg}`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🔬</span>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider">Advanced</h3>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>Full Control</span>
                        </div>
                    </div>
                    <ul className={`text-xs space-y-1.5 ${textSub}`}>
                        <li>• Complete glyph grid with categories</li>
                        <li>• Full vector canvas editor</li>
                        <li>• Spacing manager & diagnostics</li>
                        <li>• For detailed typographic work</li>
                    </ul>
                </button>
            </div>
        </div>
    );
};

export default ModeSelector;

import React from 'react';

interface ModeSelectorProps {
    onSelectMode: (mode: 'COMPACT' | 'ADVANCED') => void;
    isDarkMode: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onSelectMode, isDarkMode }) => {
    return (
        <div className="h-full w-full bg-white text-[#232323] p-8 flex flex-col items-center justify-center overflow-y-auto">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] font-semibold mb-2">Select Editor Mode</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#232323]/55 mb-10">Choose how you want to work on your font</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                {[
                    { id: 'COMPACT' as const, label: 'Compact', badge: 'Recommended', accent: '#F0FF00', items: [
                        'Streamlined single-panel interface',
                        'Quick glyph editing with inline tools',
                        'Auto kerning & spacing controls',
                        'Ideal for rapid font creation'
                    ]},
                    { id: 'ADVANCED' as const, label: 'Advanced', badge: 'Full Control', accent: '#232323', items: [
                        'Complete glyph grid with categories',
                        'Full vector canvas editor',
                        'Spacing manager & diagnostics',
                        'For detailed typographic work'
                    ]}
                ].map(card => (
                    <button
                        key={card.id}
                        onClick={() => onSelectMode(card.id)}
                        className="flex flex-col items-start p-6 border border-[#232323]/25 hover:border-[#232323] hover:bg-[#F7E043]/15 transition-all cursor-pointer text-left rounded-none"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className="h-3 w-3 border border-[#232323]" style={{ background: card.accent }} />
                            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">{card.label}</h3>
                            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] px-1.5 py-0.5 border border-[#232323]/30 text-[#232323]/70">{card.badge}</span>
                        </div>
                        <ul className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#232323]/60 space-y-1.5">
                            {card.items.map(t => <li key={t}>— {t}</li>)}
                        </ul>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ModeSelector;

import React, { useRef, useState } from 'react';
import { FontMetadata } from '../types';

interface ToolbarProps {
    metadata: FontMetadata;
    setMetadata: (m: FontMetadata) => void;
    onExport: () => void | Promise<void>;
    onExportSvgFirst: () => void | Promise<void>;
    onExportFontEditor: () => void | Promise<void>;
    onExportSvgSheet: () => void;
    onExportEmptySvgSheet: () => void;
    isExporting: boolean;
    exportProgress: number | null;
    onImportSheet: (file: File) => void;
    availableStyles: string[];
    currentStyle: string;
    onChangeStyle: (style: string) => void;
    onAddStyle: (style: string) => void;
    onRemoveStyle: (style: string) => void;
    onDuplicateStyle: (newName: string) => void;
    onGoHome: () => void;
    onSaveProject: () => void;
    onDownloadProjectFile: () => void;
    onImportProjectFile: (file: File) => void;
    isDarkMode: boolean;
    onToggleTheme: () => void;
    onSwitchToCompact?: () => void;
    onOpenFontPreview?: () => void;
    onOpenDiagnostics?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    metadata,
    setMetadata,
    onExportFontEditor,
    onExportSvgSheet,
    onExportEmptySvgSheet,
    isExporting,
    exportProgress,
    onImportSheet,
    availableStyles,
    currentStyle,
    onChangeStyle,
    onAddStyle,
    onGoHome,
    onSaveProject,
    onDownloadProjectFile,
    onImportProjectFile,
    onRemoveStyle,
    onDuplicateStyle,
    isDarkMode,
    onToggleTheme,
    onSwitchToCompact,
    onOpenFontPreview,
    onOpenDiagnostics,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const projectFileInputRef = useRef<HTMLInputElement>(null);
    const [isAddingStyle, setIsAddingStyle] = useState(false);
    const [newStyleName, setNewStyleName] = useState('');
    const [openStyleMenu, setOpenStyleMenu] = useState<string | null>(null);
    const [showAdvancedExport, setShowAdvancedExport] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onImportSheet(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onImportProjectFile(file);
        if (projectFileInputRef.current) projectFileInputRef.current.value = '';
    };

    const handleAddStyleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStyleName.trim()) {
            onAddStyle(newStyleName.trim());
            setNewStyleName('');
            setIsAddingStyle(false);
        }
    };

    const handleSave = async () => {
        try {
            await Promise.resolve(onSaveProject());
        } finally {
            onDownloadProjectFile();
        }
    };

    // Tokens
    const sidebarBg = isDarkMode ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200 text-[#232323]';
    const subtleText = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
    const groupLabel = `uppercase text-[10px] tracking-[0.18em] font-black ${subtleText}`;
    const inputClass = isDarkMode ? 'bg-transparent text-white focus:border-white placeholder-slate-600' : 'bg-transparent text-[#232323] focus:border-black placeholder-neutral-400';
    const divider = `h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`;

    // Two button variants only
    const btnBase = 'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.14em] transition-colors border';
    const btnPrimary = isDarkMode ? `${btnBase} bg-white text-black border-white hover:bg-neutral-200` : `${btnBase} bg-[#232323] text-white border-[#232323] hover:bg-black`;
    const btnGhost = isDarkMode ? `${btnBase} bg-transparent text-white border-slate-800 hover:border-white` : `${btnBase} bg-transparent text-[#232323] border-neutral-300 hover:border-black`;
    const iconBtn = isDarkMode ? 'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-slate-800 hover:border-white text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300 hover:text-white transition-colors' : 'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-neutral-300 hover:border-black text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-600 hover:text-[#232323] transition-colors';

    // Style item
    const styleItemBase = 'group flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm font-bold transition-colors h-11 relative';
    const styleItemActive = isDarkMode ? 'bg-white text-black border-white' : 'bg-[#232323] text-white border-[#232323]';
    const styleItemIdle = isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-white' : 'bg-white border-neutral-200 hover:border-black';

    return (
        <div className={`sticky top-0 self-start h-screen w-72 shrink-0 border-r flex flex-col ${sidebarBg}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".svg" />
            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} className="hidden" accept=".unbsfo,application/json" />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
                {/* HEADER — identidade */}
                <div className="flex flex-col gap-2">
                    <input
                        value={metadata.familyName}
                        onChange={(e) => setMetadata({ ...metadata, familyName: e.target.value })}
                        className={`text-xl font-black border-b border-transparent outline-none transition-colors w-full tracking-tight ${inputClass}`}
                        placeholder="Font Family"
                    />
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-neutral-300 text-neutral-500'}`}>
                            v{metadata.version}
                        </span>
                        <input
                            value={metadata.designer || ''}
                            onChange={(e) => setMetadata({ ...metadata, designer: e.target.value })}
                            placeholder="Designer"
                            className={`flex-1 text-[11px] font-mono border-b border-transparent outline-none transition-colors ${inputClass}`}
                        />
                    </div>
                </div>

                <div className={divider} />

                {/* ESTILOS */}
                <div className="space-y-2">
                    <span className={groupLabel}>Estilos</span>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {availableStyles.map((style) => {
                            const isActive = currentStyle === style;
                            const isMenuOpen = openStyleMenu === style;
                            return (
                                <div key={style} className="relative">
                                    <button
                                        onClick={() => onChangeStyle(style)}
                                        aria-current={isActive}
                                        className={`${styleItemBase} ${isActive ? styleItemActive : styleItemIdle}`}
                                    >
                                        <span className={`flex-1 text-left capitalize truncate text-xs ${isActive ? '' : ''}`}>{style}</span>
                                        {isActive && <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70">Ativo</span>}
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenStyleMenu(isMenuOpen ? null : style);
                                            }}
                                            className={`ml-1 px-1.5 py-0.5 rounded text-base leading-none ${isActive ? 'hover:bg-black/10' : isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                                            aria-label={`Options for ${style}`}
                                        >
                                            ⋯
                                        </span>
                                    </button>
                                    {isMenuOpen && (
                                        <div
                                            className={`absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-lg border shadow-lg overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-200'}`}
                                            onMouseLeave={() => setOpenStyleMenu(null)}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOpenStyleMenu(null);
                                                    const newName = prompt(`Name of the new weight (copy of "${style}"):`);
                                                    if (newName && newName.trim()) onDuplicateStyle(newName.trim());
                                                }}
                                                className={`w-full text-left px-3 py-2 text-[11px] font-semibold ${isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-neutral-100 text-neutral-700'}`}
                                            >
                                                Duplicar
                                            </button>
                                            {availableStyles.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenStyleMenu(null);
                                                        onRemoveStyle(style);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-[11px] font-semibold ${isDarkMode ? 'hover:bg-red-500/20 text-red-300' : 'hover:bg-red-50 text-red-600'}`}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {isAddingStyle ? (
                            <form onSubmit={handleAddStyleSubmit} className="flex items-center gap-1.5">
                                <input
                                    autoFocus
                                    value={newStyleName}
                                    onChange={(e) => setNewStyleName(e.target.value)}
                                    className={`flex-1 text-xs px-2 py-1.5 rounded-lg border outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-neutral-300 text-[#232323]'}`}
                                    placeholder="ex: Bold"
                                />
                                <button type="submit" className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${isDarkMode ? 'bg-white text-black' : 'bg-[#232323] text-white'}`}>OK</button>
                                <button type="button" onClick={() => { setIsAddingStyle(false); setNewStyleName(''); }} className={`text-[10px] font-bold ${subtleText}`}>×</button>
                            </form>
                        ) : (
                            <button onClick={() => setIsAddingStyle(true)} className={`w-full border border-dashed rounded-lg px-3 py-2 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 text-slate-400 hover:border-white hover:text-white' : 'border-neutral-300 text-neutral-500 hover:border-black hover:text-[#232323]'}`}>
                                + Add style
                            </button>
                        )}
                    </div>
                </div>

                <div className={divider} />

                {/* ACTIONS */}
                <div className="space-y-2">
                    <span className={groupLabel}>Actions</span>
                    <button onClick={() => fileInputRef.current?.click()} className={btnGhost}>
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                            Import SVG
                        </span>
                        <span className="text-[9px] tracking-[0.14em] opacity-70">Ctrl+V</span>
                    </button>
                    <button onClick={handleSave} className={btnPrimary}>
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            Save project
                        </span>
                        <span className="text-[9px] tracking-[0.14em] opacity-70">Ctrl+S</span>
                    </button>
                    <button onClick={() => projectFileInputRef.current?.click()} className={btnGhost}>
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                            Open .unbsfo
                        </span>
                    </button>
                </div>

                <div className={divider} />

                {/* EXPORT FONT */}
                <div className="space-y-2">
                    <span className={groupLabel}>Export</span>
                    <button
                        onClick={onExportFontEditor}
                        disabled={isExporting}
                        aria-busy={isExporting}
                        className={`${btnPrimary} ${isExporting ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <span className="flex items-center gap-2">
                            {isExporting ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            )}
                            Export TTF
                        </span>
                        <span className="text-[9px] tracking-[0.14em] opacity-70">Family</span>
                    </button>
                    {isExporting && (
                        <div className="w-full h-1 rounded-full bg-black/10 overflow-hidden">
                            <div className="h-full bg-current transition-[width] duration-200" style={{ width: exportProgress !== null ? `${Math.min(100, Math.max(0, exportProgress * 100))}%` : '20%' }} />
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        {onOpenFontPreview && (
                            <button onClick={onOpenFontPreview} className={iconBtn}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.5 12C3.7 7.9 7.5 5 12 5s8.3 2.9 9.5 7c-1.2 4.1-5 7-9.5 7s-8.3-2.9-9.5-7z" /></svg>
                                Preview
                            </button>
                        )}
                        {onOpenDiagnostics && (
                            <button onClick={onOpenDiagnostics} className={iconBtn}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                                Diagnostics
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAdvancedExport(v => !v)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${subtleText} hover:${isDarkMode ? 'text-white' : 'text-[#232323]'}`}
                    >
                        <span>More options</span>
                        <span className={`transition-transform ${showAdvancedExport ? 'rotate-180' : ''}`}>▾</span>
                    </button>
                    {showAdvancedExport && (
                        <div className="space-y-1.5 pl-1">
                            <button onClick={onExportEmptySvgSheet} className={btnGhost}>
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 12h8M8 15h5" /></svg>
                                    Tabela vazia
                                </span>
                                <span className="text-[9px] tracking-[0.14em] opacity-70">SVG</span>
                            </button>
                            <button onClick={onExportSvgSheet} className={btnGhost}>
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    Current sheet
                                </span>
                                <span className="text-[9px] tracking-[0.14em] opacity-70">Sheet</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER fixo */}
            <div className={`shrink-0 px-3 py-3 border-t ${isDarkMode ? 'border-slate-900 bg-slate-950' : 'border-neutral-200 bg-white'} flex items-center gap-1.5`}>
                <button onClick={onToggleTheme} className={iconBtn} aria-label="Alternar tema">
                    {isDarkMode ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.4 6.4l-.7-.7M6.3 6.3l-.7-.7m12.7 0l-.7.7M6.3 17.7l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.4 15.4A9 9 0 018.6 3.6 9 9 0 1020.4 15.4z" /></svg>
                    )}
                    Tema
                </button>
                {onSwitchToCompact && (
                    <button onClick={onSwitchToCompact} className={iconBtn} aria-label="Mudar para modo Compact">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                        Compact
                    </button>
                )}
                <button onClick={onGoHome} className={iconBtn} aria-label="Voltar ao dashboard">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>
                    Home
                </button>
            </div>
        </div>
    );
};

export default Toolbar;

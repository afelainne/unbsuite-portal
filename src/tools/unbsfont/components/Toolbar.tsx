import React, { useRef, useState } from 'react';
import { FontMetadata } from '../types';
import AppLogo from './AppLogo';

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
    onExport,
    onExportSvgFirst,
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
    const [newStyleName, setNewStyleName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportSheet(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

    const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImportProjectFile(file);
        }
        if (projectFileInputRef.current) projectFileInputRef.current.value = "";
    };

  const handleAddStyleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStyleName.trim()) {
      onAddStyle(newStyleName.trim());
      setNewStyleName("");
      setIsAddingStyle(false);
    }
  };

    const handleDesignerPrompt = () => {
        const current = metadata.designer || "";
        const next = window.prompt("Designer name", current);
        if (next !== null) {
            setMetadata({ ...metadata, designer: next });
        }
    };

    const themeClassSidebar = isDarkMode ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white border-slate-200 text-black';
    const containerClass = `sticky top-0 self-start h-screen w-80 shrink-0 border-r flex flex-col overflow-y-auto ${themeClassSidebar}`;
    const innerWrapClass = 'flex flex-col gap-4 px-4 py-6';
    const inputClass = isDarkMode ? 'bg-transparent text-white focus:border-white placeholder-slate-600' : 'bg-transparent text-black focus:border-black placeholder-neutral-400';
    const subtleText = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
    const groupLabel = `uppercase text-[10px] tracking-[0.18em] font-black ${subtleText}`;
    const primaryButtonBase = `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.16em] transition-colors border`;
    const quickActionButtonBase = `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-white hover:text-white' : 'bg-white border-neutral-300 hover:border-black hover:text-black'}`;
    const activePrimaryClasses = isDarkMode ? 'bg-white text-black border-white hover:bg-neutral-200' : 'bg-black text-white border-black hover:bg-neutral-800';
    const passivePrimaryClasses = isDarkMode ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white';
    const styleItemBase = `flex items-center gap-3 w-full rounded-xl border px-3 py-2 text-sm font-bold transition-colors h-12`;
    const styleItemActive = isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black';
    const styleItemIdle = isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:border-white' : 'bg-white border-slate-200 hover:border-black';
    const panelClass = isDarkMode 
        ? 'rounded-2xl border border-white/10 bg-slate-900/60'
        : 'rounded-2xl border border-slate-200 bg-white';

  return (
    <div className={containerClass}>
        <div className={innerWrapClass}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".svg" />
            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} className="hidden" accept=".unbsfo,application/json" />

            <div className={`${panelClass} flex flex-col gap-4 px-4 py-4`}>
                <div className="flex flex-col gap-2">
                    <AppLogo className={`h-10 w-auto self-start ${isDarkMode ? 'text-white' : 'text-black'}`} />
                    <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden="true"></div>
                    <div className="flex flex-col gap-1">
                        <input 
                            value={metadata.familyName} 
                            onChange={(e) => setMetadata({ ...metadata, familyName: e.target.value })}
                            className={`text-2xl font-black border-b border-transparent outline-none transition-colors w-full tracking-tight ${inputClass}`}
                            placeholder="Font Family"
                        />
                        <div className={`text-xs font-mono ${subtleText}`}>
                            <span 
                                className={`cursor-pointer select-none ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}
                                title={`Designer: ${metadata.designer || 'Double-click to set designer'}`}
                                onDoubleClick={handleDesignerPrompt}
                            >
                                v{metadata.version}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <span className={groupLabel}>Pesos e Estilos</span>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {availableStyles.map((style, index) => {
                            const label = (index + 1).toString().padStart(2, '0');
                            const isActive = currentStyle === style;
                            return (
                                <div key={style} className="flex items-stretch gap-2">
                                    <button
                                        onClick={() => onChangeStyle(style)}
                                        aria-current={isActive}
                                        className={`${styleItemBase} ${isActive ? styleItemActive : styleItemIdle} flex-1`}
                                    >
                                        <span className={`text-[10px] font-black tracking-[0.14em] ${subtleText}`}>{label}</span>
                                        <span className="flex-1 text-left capitalize">{style}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.16em] ${isActive ? 'text-emerald-400' : subtleText}`}>
                                            {isActive ? 'ATIVO' : 'USAR'}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        title={`Duplicar ${style}`}
                                        aria-label={`Duplicar ${style}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newName = prompt(`Nome do novo peso (cópia de "${style}"):`);
                                            if (newName && newName.trim()) onDuplicateStyle(newName.trim());
                                        }}
                                        className={`shrink-0 w-11 h-12 rounded-xl border flex items-center justify-center text-[10px] transition-colors ${isDarkMode ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'bg-white border-neutral-300 text-neutral-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                        </svg>
                                    </button>
                                    {availableStyles.length > 1 && (
                                        <button
                                            type="button"
                                            title={`Excluir ${style}`}
                                            aria-label={`Excluir ${style}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveStyle(style);
                                            }}
                                            className={`shrink-0 w-11 h-12 rounded-xl border flex items-center justify-center text-[10px] transition-colors ${isDarkMode ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-red-400 hover:text-red-300 hover:bg-red-500/20' : 'bg-white border-neutral-300 text-neutral-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50'}`}
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" />
                                                <path d="M6 7l1 12c.1 1.1.9 2 2 2h6c1.1 0 1.9-.9 2-2l1-12" />
                                                <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        {isAddingStyle ? (
                            <form onSubmit={handleAddStyleSubmit} className="flex items-center gap-2">
                                <input 
                                    autoFocus
                                    value={newStyleName}
                                    onChange={(e) => setNewStyleName(e.target.value)}
                                    className={`flex-1 text-xs px-3 py-2 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-neutral-300 text-black'}`}
                                    placeholder="ex: Bold"
                                />
                                <button type="submit" className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>Salvar</button>
                                <button type="button" onClick={() => { setIsAddingStyle(false); setNewStyleName(''); }} className={`text-[10px] font-bold uppercase tracking-[0.2em] ${subtleText}`}>
                                    Cancelar
                                </button>
                            </form>
                        ) : (
                            <button onClick={() => setIsAddingStyle(true)} className={`w-full border-2 border-dashed rounded-xl px-3 py-2 text-[11px] font-semibold ${isDarkMode ? 'border-slate-700 text-slate-200 hover:border-white hover:text-white' : 'border-neutral-300 text-neutral-600 hover:border-black hover:text-black'}`}>
                                + Adicionar estilo
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <span className={groupLabel}>Projeto</span>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={`${primaryButtonBase} ${passivePrimaryClasses}`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                            Import SVG
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">Ctrl+V</span>
                    </button>
                    <button 
                        onClick={onSaveProject}
                        className={`${primaryButtonBase} ${activePrimaryClasses}`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            Salvar projeto
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">Ctrl+S</span>
                    </button>
                    <button 
                        onClick={() => projectFileInputRef.current?.click()}
                        className={quickActionButtonBase}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                            </svg>
                            Abrir projeto (.unbsfo)
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">Load</span>
                    </button>
                    <button 
                        onClick={onDownloadProjectFile}
                        className={quickActionButtonBase}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v12a2 2 0 002 2h12a2 2 0 002-2V4m-4 4l-4 4-4-4" />
                            </svg>
                            Baixar arquivo
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">.unbsfo</span>
                    </button>
                    <button 
                        onClick={onGoHome}
                        className={quickActionButtonBase}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            Dashboard
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">Home</span>
                    </button>
                </div>

                <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden="true"></div>

                <div className="space-y-2">
                    <span className={groupLabel}>Tipografia</span>
                    <div className={`p-3 rounded-lg border text-center ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-neutral-200 bg-neutral-50'}`}>
                        <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`}>
                            Configure entrelinhas e espaços na aba <strong className={isDarkMode ? 'text-white' : 'text-black'}>Teste</strong>
                        </p>
                    </div>
                </div>

                <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden="true"></div>

                <div className="space-y-2">
                    <span className={groupLabel}>Exportação</span>
                    <div className="space-y-1">
                        {/* Botão de Preview da Fonte */}
                        {onOpenFontPreview && (
                            <button 
                                onClick={onOpenFontPreview}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors border ${isDarkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-white' : 'border-neutral-300 bg-neutral-100 hover:bg-neutral-200 text-black'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Preview Final
                                </span>
                                <span className="text-[9px] tracking-[0.14em]">TTF Real</span>
                            </button>
                        )}
                        {onOpenDiagnostics && (
                            <button 
                                onClick={onOpenDiagnostics}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors border ${isDarkMode ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-700'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="M21 21l-4.35-4.35" />
                                    </svg>
                                    Diagnóstico
                                </span>
                                <span className="text-[9px] tracking-[0.14em]">Alertas</span>
                            </button>
                        )}
                        <button 
                            onClick={onExportFontEditor}
                            disabled={isExporting}
                            aria-busy={isExporting}
                            className={`${primaryButtonBase} ${passivePrimaryClasses} ${isExporting ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <span className="flex items-center gap-2">
                                {isExporting ? (
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                )}
                                Exportar TTF
                            </span>
                            <span className="text-[9px] tracking-[0.14em]">Fonte</span>
                        </button>
                        {isExporting && (
                            <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
                                <div
                                    className="h-full bg-black transition-[width] duration-200"
                                    style={{ width: exportProgress !== null ? `${Math.min(100, Math.max(0, exportProgress * 100))}%` : '20%' }}
                                />
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={onExportEmptySvgSheet}
                        className={`${primaryButtonBase} ${passivePrimaryClasses}`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 12h8M8 15h5" /></svg>
                            Exportar Tabela
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">SVG</span>
                    </button>
                    <button 
                        onClick={onExportSvgSheet}
                        className={`${primaryButtonBase} ${passivePrimaryClasses}`}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            Exportar Tabela
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">Sheet</span>
                    </button>
                </div>

                <div className={`h-px w-full ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden="true"></div>

                <div className="space-y-2">
                    <span className={groupLabel}>Preferências</span>
                    {onSwitchToCompact && (
                        <button 
                            onClick={onSwitchToCompact}
                            className={quickActionButtonBase}
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
                                </svg>
                                Modo Compact
                            </span>
                            <span className="text-[9px] tracking-[0.14em]">Simples</span>
                        </button>
                    )}
                    <button 
                        onClick={onToggleTheme}
                        className={quickActionButtonBase}
                    >
                        <span className="flex items-center gap-2">
                            {isDarkMode ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            )}
                            {isDarkMode ? 'Modo claro' : 'Modo escuro'}
                        </span>
                        <span className="text-[9px] tracking-[0.14em]">Tema</span>
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};

export default Toolbar;
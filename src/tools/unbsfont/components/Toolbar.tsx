import React, { useRef, useState } from 'react';
import { Copy, FileDown, FileType, FolderOpen, MoreHorizontal, Plus, Save, Sheet as SheetIcon, Trash2, Upload, X } from 'lucide-react';
import { FontMetadata } from '../types';
import { Field, IconButton, Progress, Spinner } from './ui';

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

/** Botão de ação da coluna: largura inteira, ícone à esquerda, atalho à direita. */
const ACTION = 'ctl ctl-outline w-full justify-between';

/**
 * Coluna lateral do modo avançado: identidade da fonte, estilos, arquivo e
 * exportações secundárias. A exportação principal fica na fila de título.
 */
const Toolbar: React.FC<ToolbarProps> = ({
    metadata,
    setMetadata,
    onExport,
    onExportSvgSheet,
    onExportEmptySvgSheet,
    isExporting,
    exportProgress,
    onImportSheet,
    availableStyles,
    currentStyle,
    onChangeStyle,
    onAddStyle,
    onSaveProject,
    onDownloadProjectFile,
    onImportProjectFile,
    onRemoveStyle,
    onDuplicateStyle,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const projectFileInputRef = useRef<HTMLInputElement>(null);
    const [isAddingStyle, setIsAddingStyle] = useState(false);
    const [newStyleName, setNewStyleName] = useState('');
    const [openStyleMenu, setOpenStyleMenu] = useState<string | null>(null);

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

    return (
        <aside className="material-card p-5 w-full lg:w-72 shrink-0 order-last lg:order-none flex flex-col gap-6 lg:overflow-y-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".svg" />
            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileChange} className="hidden" accept=".unbsfo,application/json" />

            {/* Fonte */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="label">Fonte</span>
                    <span className="chip tabular">v{metadata.version}</span>
                </div>
                <Field label="Nome da família">
                    <input
                        value={metadata.familyName}
                        onChange={(e) => setMetadata({ ...metadata, familyName: e.target.value })}
                        className="field"
                        placeholder="Nome da família"
                    />
                </Field>
                <Field label="Designer">
                    <input
                        value={metadata.designer || ''}
                        onChange={(e) => setMetadata({ ...metadata, designer: e.target.value })}
                        placeholder="Quem desenhou"
                        className="field"
                    />
                </Field>
            </section>

            {/* Estilos */}
            <section className="flex flex-col gap-2 hairline-t pt-5">
                <span className="label">Estilos</span>
                <div className="flex flex-col gap-0.5">
                    {availableStyles.map((style) => {
                        const isActive = currentStyle === style;
                        const isMenuOpen = openStyleMenu === style;
                        return (
                            <div key={style} className="relative flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onChangeStyle(style)}
                                    aria-current={isActive}
                                    className={`row flex-1 min-w-0 ${isActive ? 'is-active' : ''}`}
                                >
                                    <span className="flex-1 truncate">{style}</span>
                                </button>
                                <IconButton
                                    label={`Opções de ${style}`}
                                    variant="plain"
                                    active={isMenuOpen}
                                    onClick={() => setOpenStyleMenu(isMenuOpen ? null : style)}
                                >
                                    <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                                </IconButton>
                                {isMenuOpen && (
                                    <div
                                        className="absolute right-0 top-full mt-1 z-20 min-w-[168px] material-popover p-1 flex flex-col"
                                        onMouseLeave={() => setOpenStyleMenu(null)}
                                        role="menu"
                                    >
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setOpenStyleMenu(null);
                                                const newName = prompt(`Nome do novo estilo (cópia de "${style}"):`);
                                                if (newName && newName.trim()) onDuplicateStyle(newName.trim());
                                            }}
                                            className="row"
                                        >
                                            <Copy className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                                            Duplicar
                                        </button>
                                        {availableStyles.length > 1 && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    setOpenStyleMenu(null);
                                                    onRemoveStyle(style);
                                                }}
                                                className="row text-destructive"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                Excluir
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {isAddingStyle ? (
                    <form onSubmit={handleAddStyleSubmit} className="flex items-center gap-1.5">
                        <input
                            autoFocus
                            value={newStyleName}
                            onChange={(e) => setNewStyleName(e.target.value)}
                            className="field flex-1"
                            placeholder="Ex.: Bold"
                            aria-label="Nome do novo estilo"
                        />
                        <button type="submit" className="ctl ctl-filled">Criar</button>
                        <IconButton label="Cancelar" variant="plain" onClick={() => { setIsAddingStyle(false); setNewStyleName(''); }}>
                            <X className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                    </form>
                ) : (
                    <button type="button" onClick={() => setIsAddingStyle(true)} className="ctl ctl-plain justify-start -ml-1 text-muted-foreground hover:text-foreground">
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        Novo estilo
                    </button>
                )}
            </section>

            {/* Arquivo */}
            <section className="flex flex-col gap-2 hairline-t pt-5">
                <span className="label">Arquivo</span>
                <button type="button" onClick={handleSave} className={ACTION}>
                    <span className="flex items-center gap-2"><Save className="w-3.5 h-3.5" aria-hidden="true" />Salvar projeto</span>
                    <kbd className="text-[12px] text-muted-foreground font-sans">Ctrl+S</kbd>
                </button>
                <button type="button" onClick={() => projectFileInputRef.current?.click()} className={ACTION}>
                    <span className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />Abrir .unbsfo</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className={ACTION}>
                    <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5" aria-hidden="true" />Importar folha SVG</span>
                </button>
            </section>

            {/* Outras exportações */}
            <section className="flex flex-col gap-2 hairline-t pt-5">
                <div className="flex items-center justify-between gap-2">
                    <span className="label">Outras exportações</span>
                    {isExporting && <Spinner className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                {isExporting && (
                    <Progress value={exportProgress ?? 0.2} label="Progresso da exportação" />
                )}
                <button type="button" onClick={() => onExport()} disabled={isExporting} className={ACTION}>
                    <span className="flex items-center gap-2"><FileType className="w-3.5 h-3.5" aria-hidden="true" />Fonte OTF</span>
                    <span className="text-[12px] text-muted-foreground">.otf</span>
                </button>
                <button type="button" onClick={onExportSvgSheet} className={ACTION}>
                    <span className="flex items-center gap-2"><SheetIcon className="w-3.5 h-3.5" aria-hidden="true" />Folha SVG atual</span>
                    <span className="text-[12px] text-muted-foreground">.svg</span>
                </button>
                <button type="button" onClick={onExportEmptySvgSheet} className={ACTION}>
                    <span className="flex items-center gap-2"><FileDown className="w-3.5 h-3.5" aria-hidden="true" />Folha SVG vazia</span>
                    <span className="text-[12px] text-muted-foreground">.svg</span>
                </button>
            </section>
        </aside>
    );
};

export default Toolbar;

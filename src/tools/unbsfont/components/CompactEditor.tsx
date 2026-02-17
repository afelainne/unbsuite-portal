import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GlyphData, FontMetadata } from '../types';
import { useNotice } from '../contexts/NoticeContext';
import { extractSingleGlyphFromSVG } from '../services/importService';
import { generateSmartAutoKerning, generateCommonPairsKerning, getKerningStats } from '../services/kerningService';
import { KERNING_TEMPLATES, applyKerningTemplate, getTemplateById } from '../services/kerningTemplates';
import { 
    generateProfessionalKerning, 
    generateHybridKerning,
    centerGlyphInBox,
    centerAllGlyphs,
    analyzeKerningQuality,
    FONT_STYLE_PROFILES,
    FontStyle,
    KerningPair
} from '../services/professionalKerningService';
import { 
    autoConfigureFont, 
    AutoConfigOptions, 
    DEFAULT_AUTO_CONFIG_OPTIONS,
    analyzeFontQuality 
} from '../services/autoFontConfigService';
import AppLogo from './AppLogo';

interface CompactEditorProps {
    glyphs: GlyphData[];
    metadata: FontMetadata;
    onUpdateGlyph: (char: string, data: Partial<GlyphData>) => void;
    onUpdateMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
    isDarkMode: boolean;
    onSwitchToAdvanced: () => void;
    onGoHome: () => void;
    onSaveProject: () => void;
    onExportFont: (kerningPairs?: KerningPair[]) => void;
    onImportSheet: (file: File) => Promise<void>;
    onToggleTheme: () => void;
}

type GlyphCategory = 'all' | 'uppercase' | 'lowercase' | 'numbers' | 'symbols';
type KerningPreset = 'none' | 'tight' | 'normal' | 'loose' | 'auto-smart' | 'auto-common' | 'professional' | 'hybrid' | string;
type AdvanceWidthMode = 'auto' | 'fixed' | 'scale';

// Função para calcular bounds de um path SVG
function calculatePathBounds(pathData: string): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } | null {
    if (!pathData || pathData.trim() === '') return null;
    
    try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        document.body.appendChild(svg);
        
        const bbox = path.getBBox();
        document.body.removeChild(svg);
        
        return {
            minX: bbox.x,
            maxX: bbox.x + bbox.width,
            minY: bbox.y,
            maxY: bbox.y + bbox.height,
            width: bbox.width,
            height: bbox.height
        };
    } catch {
        return null;
    }
}

// Função para calcular advanceWidth automaticamente
function calculateAutoAdvanceWidth(glyph: GlyphData, sideMargin: number = 50): number {
    if (!glyph.pathData) return 600;
    
    const bounds = calculatePathBounds(glyph.pathData);
    if (!bounds) return glyph.advanceWidth;
    
    const scaledWidth = bounds.width * glyph.scale;
    return Math.round(glyph.leftSideBearing + scaledWidth + sideMargin);
}

const CompactEditor: React.FC<CompactEditorProps> = ({
    glyphs,
    metadata,
    onUpdateGlyph,
    onUpdateMetadata,
    isDarkMode,
    onSwitchToAdvanced,
    onGoHome,
    onSaveProject,
    onExportFont,
    onImportSheet,
    onToggleTheme
}) => {
    const { pushNotice } = useNotice();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    
    // Estados
    const [selectedChar, setSelectedChar] = useState<string | null>(null);
    const [previewText, setPreviewText] = useState('FONTE abcdef 123');
    const [fontSize, setFontSize] = useState(64);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<GlyphCategory>('all');
    const [isDragging, setIsDragging] = useState(false);
    
    // Derivar kerning/tracking/wordSpacing diretamente do metadata (sem estado local)
    const letterSpacing = metadata.tracking || 0;
    const wordSpacing = metadata.wordSpacing || 250;
    const kerning = metadata.kerning || {};
    const [lineHeight, setLineHeight] = useState(1.2);
    const [kerningPreset, setKerningPreset] = useState<KerningPreset>(
        Object.keys(metadata.kerning || {}).length > 0 ? 'auto-smart' : 'none'
    );
    const [kerningIntensity, setKerningIntensity] = useState(1.0);
    
    // Estados de Advance Width Global
    const [advanceWidthMode, setAdvanceWidthMode] = useState<AdvanceWidthMode>('auto');
    const [globalSideMargin, setGlobalSideMargin] = useState(50);
    const [globalFixedWidth, setGlobalFixedWidth] = useState(600);
    const [globalWidthScale, setGlobalWidthScale] = useState(100);
    
    // Estados de Kerning Profissional
    const [fontStyle, setFontStyle] = useState<FontStyle>('neo-grotesque');
    const [kerningPairs, setKerningPairs] = useState<KerningPair[]>([]);
    
    // Estados de Auto-Configuração
    const [showAutoConfigModal, setShowAutoConfigModal] = useState(false);
    const [autoConfigOptions, setAutoConfigOptions] = useState<AutoConfigOptions>({
        ...DEFAULT_AUTO_CONFIG_OPTIONS
    });
    const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);

    // Helper para atualizar tracking/wordSpacing/kerning no metadata
    const setLetterSpacing = useCallback((val: number) => {
        onUpdateMetadata(prev => ({ ...prev, tracking: val }));
    }, [onUpdateMetadata]);
    
    const setWordSpacing = useCallback((val: number) => {
        onUpdateMetadata(prev => ({ ...prev, wordSpacing: val }));
    }, [onUpdateMetadata]);
    
    const setKerning = useCallback((newKerning: Record<string, number>) => {
        onUpdateMetadata(prev => ({ ...prev, kerning: newKerning }));
    }, [onUpdateMetadata]);

    // Temas
    const bgMain = isDarkMode ? 'bg-slate-950' : 'bg-white';
    const bgPanel = isDarkMode ? 'bg-slate-900' : 'bg-neutral-50';
    const borderCol = isDarkMode ? 'border-slate-800' : 'border-neutral-200';
    const textMain = isDarkMode ? 'text-white' : 'text-black';
    const textSub = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
    const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-neutral-300';
    const btnPrimary = isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800';
    const btnSecondary = isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-neutral-300 hover:bg-neutral-100';
    const cardBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-200';
    const cardSelected = isDarkMode ? 'bg-emerald-900/30 border-emerald-500' : 'bg-emerald-50 border-emerald-500';
    const sliderTrack = isDarkMode ? 'bg-slate-700' : 'bg-neutral-200';
    const accentColor = isDarkMode ? 'accent-white' : 'accent-black';

    // Análise de qualidade do kerning
    const kerningQuality = useMemo(() => 
        analyzeKerningQuality(glyphs, kerningPairs)
    , [glyphs, kerningPairs]);
    
    // Converter pares para Record para uso no preview
    const kerningRecord = useMemo(() => {
        const record: Record<string, number> = { ...kerning };
        kerningPairs.forEach(pair => {
            record[`${pair.left}${pair.right}`] = pair.value;
        });
        return record;
    }, [kerning, kerningPairs]);

    // Glifo selecionado
    const selectedGlyph = useMemo(() => 
        glyphs.find(g => g.char === selectedChar) || null
    , [glyphs, selectedChar]);

    // Filtrar glifos
    const filteredGlyphs = useMemo(() => {
        let result = glyphs;
        
        if (activeCategory !== 'all') {
            result = result.filter(g => {
                const code = g.unicode;
                switch (activeCategory) {
                    case 'uppercase': return code >= 65 && code <= 90;
                    case 'lowercase': return code >= 97 && code <= 122;
                    case 'numbers': return code >= 48 && code <= 57;
                    case 'symbols': return (code < 48) || (code > 57 && code < 65) || (code > 90 && code < 97) || code > 122;
                    default: return true;
                }
            });
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(g => 
                g.char.toLowerCase().includes(term) || 
                g.name.toLowerCase().includes(term)
            );
        }
        
        return result;
    }, [glyphs, activeCategory, searchTerm]);

    // Processar SVG
    const processSvgContent = useCallback((content: string, targetChar: string) => {
        const data = extractSingleGlyphFromSVG(content);
        if (data && data.pathData) {
            onUpdateGlyph(targetChar, data);
            pushNotice(`Glifo "${targetChar}" atualizado!`, 'success');
            return true;
        } else {
            pushNotice('Nenhum path encontrado no SVG.', 'error');
            return false;
        }
    }, [onUpdateGlyph, pushNotice]);

    // Upload SVG
    const handleSvgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChar) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            processSvgContent(result, selectedChar);
        };
        reader.readAsText(file);
        e.target.value = '';
    }, [selectedChar, processSvgContent]);

    // Drag and drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (!selectedChar) {
            pushNotice('Selecione um glifo primeiro.', 'warning');
            return;
        }

        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.svg')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                processSvgContent(result, selectedChar);
            };
            reader.readAsText(file);
        }
    }, [selectedChar, processSvgContent, pushNotice]);

    // Colar SVG
    const handlePaste = useCallback(async () => {
        if (!selectedChar) {
            pushNotice('Selecione um glifo primeiro.', 'warning');
            return;
        }

        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                let svgContent = text;
                if (!text.includes('<svg') && !text.includes('<path')) {
                    svgContent = `<svg><path d="${text}" /></svg>`;
                } else if (!text.includes('<svg')) {
                    svgContent = `<svg>${text}</svg>`;
                }
                processSvgContent(svgContent, selectedChar);
            }
        } catch (err) {
            pushNotice('Falha ao acessar clipboard.', 'error');
        }
    }, [selectedChar, processSvgContent, pushNotice]);

    // Limpar glifo
    const handleClearGlyph = useCallback(() => {
        if (!selectedChar) return;
        onUpdateGlyph(selectedChar, { 
            pathData: '', 
            components: [], 
            advanceWidth: selectedChar === ' ' ? 250 : 600,
            leftSideBearing: 50,
            baselineOffset: 0,
            scale: 1
        });
        pushNotice(`Glifo "${selectedChar}" limpo.`, 'success');
    }, [selectedChar, onUpdateGlyph, pushNotice]);

    // Auto-Configuração da fonte
    const handleAutoConfig = useCallback(() => {
        setIsAutoConfiguring(true);
        
        try {
            const result = autoConfigureFont(glyphs, metadata, autoConfigOptions);
            
            // Aplicar atualizações nos glyphs
            result.glyphUpdates.forEach((updates, char) => {
                onUpdateGlyph(char, updates);
            });
            
            // Preparar kerning combinado para sincronização imediata
            const newKerning: Record<string, number> = { ...kerning };
            result.kerningPairs.forEach(pair => {
                newKerning[`${pair.left}${pair.right}`] = pair.value;
            });
            
            // Aplicar kerning localmente
            if (result.kerningPairs.length > 0) {
                setKerningPairs(result.kerningPairs);
                setKerningPreset('professional');
            }
            
            // Sincronizar com metadata
            const newKerningFinal = { ...kerning };
            result.kerningPairs.forEach(pair => {
                newKerningFinal[`${pair.left}${pair.right}`] = pair.value;
            });
            
            onUpdateMetadata(prev => ({
                ...prev,
                ...result.metadataUpdates,
                kerning: newKerningFinal,
            }));
            
            // Mostrar relatório
            const report = result.report;
            pushNotice(
                `Auto-Config: ${report.glyphsUpdated} glifos atualizados, ${report.kerningPairsGenerated} pares de kerning gerados`,
                'success'
            );
            
            if (report.warnings.length > 0) {
                report.warnings.slice(0, 3).forEach(w => {
                    pushNotice(w, 'warning');
                });
            }
            
            setShowAutoConfigModal(false);
        } catch (error) {
            pushNotice(`Erro na auto-configuração: ${error}`, 'error');
        } finally {
            setIsAutoConfiguring(false);
        }
    }, [glyphs, autoConfigOptions, metadata, kerning, letterSpacing, wordSpacing, onUpdateGlyph, onUpdateMetadata, pushNotice]);

    // Aplicar preset de kerning
    const applyKerningPreset = useCallback((preset: KerningPreset) => {
        setKerningPreset(preset);
        
        let newKerning: Record<string, number> = {};
        let generatedPairs: KerningPair[] = [];
        let suggestedIntensity = kerningIntensity;
        
        switch (preset) {
            case 'none':
                newKerning = {};
                generatedPairs = [];
                suggestedIntensity = 1.0;
                pushNotice('Kerning removido.', 'info');
                break;
            case 'tight':
                suggestedIntensity = 1.3;
                generatedPairs = generateProfessionalKerning(glyphs, {
                    style: fontStyle,
                    intensity: suggestedIntensity
                });
                pushNotice(`Tight: ${generatedPairs.length} pares. Intensidade: ${(suggestedIntensity * 100).toFixed(0)}%`, 'success');
                break;
            case 'normal':
                suggestedIntensity = 1.0;
                generatedPairs = generateProfessionalKerning(glyphs, {
                    style: fontStyle,
                    intensity: suggestedIntensity
                });
                pushNotice(`Normal: ${generatedPairs.length} pares.`, 'success');
                break;
            case 'loose':
                suggestedIntensity = 0.5;
                generatedPairs = generateProfessionalKerning(glyphs, {
                    style: fontStyle,
                    intensity: suggestedIntensity
                });
                pushNotice(`Loose: ${generatedPairs.length} pares. Intensidade: ${(suggestedIntensity * 100).toFixed(0)}%`, 'success');
                break;
            case 'auto-smart':
                suggestedIntensity = kerningIntensity;
                newKerning = generateSmartAutoKerning(glyphs, {}, {
                    intensity: suggestedIntensity,
                    profile: 'sans',
                    includePunctuation: true,
                    includeNumbers: true,
                });
                if (Object.keys(newKerning).length === 0) {
                    generatedPairs = generateProfessionalKerning(glyphs, {
                        style: fontStyle,
                        intensity: suggestedIntensity
                    });
                    pushNotice(`Smart (fallback): ${generatedPairs.length} pares.`, 'success');
                } else {
                    const smartStats = getKerningStats(newKerning);
                    pushNotice(`Smart: ${smartStats?.totalPairs || 0} pares.`, 'success');
                }
                break;
            case 'auto-common':
                suggestedIntensity = kerningIntensity;
                newKerning = generateCommonPairsKerning(glyphs, {}, suggestedIntensity);
                if (Object.keys(newKerning).length === 0) {
                    generatedPairs = generateProfessionalKerning(glyphs, {
                        style: fontStyle,
                        intensity: suggestedIntensity
                    });
                    pushNotice(`Comum (fallback): ${generatedPairs.length} pares.`, 'success');
                } else {
                    const commonStats = getKerningStats(newKerning);
                    pushNotice(`Comum: ${commonStats?.totalPairs || 0} pares.`, 'success');
                }
                break;
            case 'professional':
                suggestedIntensity = kerningIntensity;
                generatedPairs = generateProfessionalKerning(glyphs, {
                    style: fontStyle,
                    intensity: suggestedIntensity
                });
                {
                    const profQuality = analyzeKerningQuality(glyphs, generatedPairs);
                    pushNotice(`Pro: ${generatedPairs.length} pares (${profQuality.grade}).`, 'success');
                }
                break;
            case 'hybrid':
                suggestedIntensity = kerningIntensity;
                generatedPairs = generateHybridKerning(glyphs, {
                    style: fontStyle,
                    intensity: suggestedIntensity
                });
                {
                    const hybridQuality = analyzeKerningQuality(glyphs, generatedPairs);
                    pushNotice(`Híbrido: ${generatedPairs.length} pares (${hybridQuality.grade}).`, 'success');
                }
                break;
            default:
                // Template de fonte específico
                suggestedIntensity = kerningIntensity;
                const template = getTemplateById(preset);
                if (template) {
                    newKerning = applyKerningTemplate(template, {}, {
                        scale: suggestedIntensity,
                        overwrite: true,
                    });
                    pushNotice(`Template "${template.name}". Intensidade: ${(suggestedIntensity * 100).toFixed(0)}%`, 'success');
                }
                break;
        }
        
        // Combine kerning without touching tracking
        const combinedKerning: Record<string, number> = { ...newKerning };
        generatedPairs.forEach(pair => {
            combinedKerning[`${pair.left}${pair.right}`] = pair.value;
        });
        
        setKerningPairs(generatedPairs);
        setKerningIntensity(suggestedIntensity);
        
        // Update only kerning in metadata, do NOT modify tracking
        onUpdateMetadata(prev => ({
            ...prev,
            kerning: combinedKerning,
        }));
    }, [glyphs, kerningIntensity, fontStyle, pushNotice, onUpdateMetadata]);

    // Reset kerning
    const handleResetKerning = useCallback(() => {
        setKerningPairs([]);
        setKerningPreset('none');
        setKerningIntensity(1.0);
        
        onUpdateMetadata(prev => ({
            ...prev,
            kerning: {},
        }));
        
        pushNotice('Kerning resetado.', 'info');
    }, [onUpdateMetadata, pushNotice]);

    // Obter valor de kerning para um par de caracteres
    const getKerning = useCallback((char1: string, char2: string): number => {
        const pairKey = `${char1}${char2}`;
        // kerningRecord combina kerning (presets básicos) e kerningPairs (professional/hybrid)
        // Todos os valores já têm intensidade aplicada na geração
        return kerningRecord[pairKey] || 0;
    }, [kerningRecord]);

    // Aplicar Advance Width global a todos os glifos
    const handleApplyGlobalWidth = useCallback(() => {
        let updatedCount = 0;
        
        glyphs.forEach(g => {
            if (!g.pathData) return;
            
            let newWidth: number;
            
            switch (advanceWidthMode) {
                case 'auto':
                    newWidth = calculateAutoAdvanceWidth(g, globalSideMargin);
                    break;
                case 'fixed':
                    newWidth = globalFixedWidth;
                    break;
                case 'scale':
                    newWidth = Math.round(g.advanceWidth * (globalWidthScale / 100));
                    break;
                default:
                    return;
            }
            
            if (newWidth !== g.advanceWidth) {
                onUpdateGlyph(g.char, { advanceWidth: newWidth });
                updatedCount++;
            }
        });
        
        pushNotice(`Advance Width aplicado a ${updatedCount} glifos.`, 'success');
    }, [glyphs, advanceWidthMode, globalSideMargin, globalFixedWidth, globalWidthScale, onUpdateGlyph, pushNotice]);

    // Recalcular width apenas do glifo selecionado
    const handleRecalculateCurrentWidth = useCallback(() => {
        if (!selectedGlyph || !selectedGlyph.pathData) {
            pushNotice('Selecione um glifo com path.', 'warning');
            return;
        }
        
        const newWidth = calculateAutoAdvanceWidth(selectedGlyph, globalSideMargin);
        onUpdateGlyph(selectedGlyph.char, { advanceWidth: newWidth });
        pushNotice(`Width de "${selectedGlyph.char}" atualizado para ${newWidth}.`, 'success');
    }, [selectedGlyph, globalSideMargin, onUpdateGlyph, pushNotice]);

    // Centralizar glifo atual
    const handleCenterCurrentGlyph = useCallback(() => {
        if (!selectedGlyph || !selectedGlyph.pathData) {
            pushNotice('Selecione um glifo com path.', 'warning');
            return;
        }
        
        const centered = centerGlyphInBox(selectedGlyph, globalSideMargin);
        onUpdateGlyph(selectedGlyph.char, { 
            advanceWidth: centered.advanceWidth,
            leftSideBearing: centered.leftSideBearing 
        });
        pushNotice(`Glifo "${selectedGlyph.char}" centralizado.`, 'success');
    }, [selectedGlyph, globalSideMargin, onUpdateGlyph, pushNotice]);

    // Centralizar todos os glifos
    const handleCenterAllGlyphs = useCallback(() => {
        const count = centerAllGlyphs(glyphs, globalSideMargin, onUpdateGlyph);
        pushNotice(`${count} glifos centralizados.`, 'success');
    }, [glyphs, globalSideMargin, onUpdateGlyph, pushNotice]);

    // Renderizar preview de glifo
    const renderGlyphPreview = (g: GlyphData, size: number = 40) => (
        <svg viewBox="0 0 1000 1000" style={{ width: size, height: size }} className="overflow-visible">
            {g.pathData ? (
                <g transform={`translate(${g.leftSideBearing}, ${g.baselineOffset}) scale(${g.scale})`}>
                    <path d={g.pathData} className="fill-current" />
                </g>
            ) : (
                <text x="500" y="600" textAnchor="middle" fontSize="400" className="fill-current opacity-20">
                    {g.char}
                </text>
            )}
        </svg>
    );

    // Obter glifo
    const getGlyph = (char: string) => glyphs.find(g => g.char === char) || null;

    // Estatísticas
    const stats = useMemo(() => {
        const filled = glyphs.filter(g => g.pathData && g.pathData.trim().length > 0).length;
        return {
            filled,
            total: glyphs.length,
            percentage: Math.round((filled / glyphs.length) * 100)
        };
    }, [glyphs]);

    // Categorias
    const categories: { id: GlyphCategory; label: string }[] = [
        { id: 'all', label: 'Todos' },
        { id: 'uppercase', label: 'A-Z' },
        { id: 'lowercase', label: 'a-z' },
        { id: 'numbers', label: '0-9' },
        { id: 'symbols', label: 'Outros' },
    ];

    return (
        <div className={`flex flex-col h-screen ${bgMain} ${textMain}`}>
            {/* Header */}
            <header className={`flex items-center justify-between px-6 py-3 border-b ${borderCol}`}>
                <div className="flex items-center gap-4">
                    <button onClick={onGoHome} className="opacity-70 hover:opacity-100 transition-opacity">
                        <AppLogo className={`h-8 w-auto ${isDarkMode ? 'text-white' : 'text-black'}`} />
                    </button>
                    <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-neutral-300'}`} />
                    <input
                        type="text"
                        value={metadata.familyName}
                        onChange={(e) => onUpdateMetadata({ ...metadata, familyName: e.target.value })}
                        className={`text-xl font-black uppercase tracking-tight bg-transparent border-none outline-none ${textMain}`}
                        placeholder="Nome da Fonte"
                    />
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${isDarkMode ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                        Compact
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleTheme}
                        className={`p-2 rounded-lg transition-colors ${btnSecondary} border`}
                        title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                    >
                        {isDarkMode ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="5" />
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={onSaveProject}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${btnSecondary}`}
                    >
                        Salvar
                    </button>
                    <button
                        onClick={() => importInputRef.current?.click()}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${btnSecondary}`}
                    >
                        Importar
                    </button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".svg"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                await onImportSheet(file);
                                e.target.value = '';
                            }
                        }}
                    />
                    <button
                        onClick={() => setShowAutoConfigModal(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center gap-2 ${isDarkMode ? 'border-amber-600 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50' : 'border-amber-500 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                        title="Configurar fonte automaticamente"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Auto Config
                    </button>
                    <button
                        onClick={() => onExportFont(kerningPairs.length > 0 ? kerningPairs : undefined)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${btnPrimary}`}
                    >
                        Exportar
                    </button>
                    <div className={`w-px h-8 mx-2 ${isDarkMode ? 'bg-slate-700' : 'bg-neutral-300'}`} />
                    <button
                        onClick={onSwitchToAdvanced}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ${btnSecondary}`}
                    >
                        Modo Avancado
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Painel Esquerdo - Glifos */}
                <div className={`w-64 flex flex-col border-r ${borderCol} ${bgPanel}`}>
                    {/* Busca */}
                    <div className="p-3">
                        <div className="relative">
                            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSub}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="11" cy="11" r="8" />
                                <path d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm outline-none ${inputBg}`}
                            />
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="px-3 pb-3 flex flex-wrap gap-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    activeCategory === cat.id
                                        ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')
                                        : `border ${btnSecondary}`
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Grid de Glifos */}
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="grid grid-cols-5 gap-1">
                            {filteredGlyphs.map(g => (
                                <button
                                    key={g.char}
                                    onClick={() => setSelectedChar(g.char)}
                                    className={`aspect-square rounded-lg border flex items-center justify-center transition-all relative ${
                                        selectedChar === g.char ? cardSelected : `${cardBg} hover:border-current`
                                    }`}
                                    title={g.name}
                                >
                                    {renderGlyphPreview(g, 24)}
                                    {g.pathData && (
                                        <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {filteredGlyphs.length === 0 && (
                            <p className={`text-center py-8 text-sm ${textSub}`}>Nenhum glifo.</p>
                        )}
                    </div>

                    {/* Progresso */}
                    <div className={`p-3 border-t ${borderCol}`}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className={textSub}>Progresso</span>
                            <span className="font-bold">{stats.filled}/{stats.total}</span>
                        </div>
                        <div className={`w-full h-2 rounded-full ${sliderTrack}`}>
                            <div 
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Centro - Preview e Edicao */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Preview de Texto */}
                    <div className={`p-4 border-b ${borderCol}`} style={{ minHeight: '280px', maxHeight: '400px', flexShrink: 0 }}>
                        <div className="flex items-center gap-4 mb-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Preview</span>
                            <input
                                type="range"
                                min="24"
                                max="120"
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className={`w-24 ${accentColor}`}
                            />
                            <span className={`text-xs font-mono ${textSub}`}>{fontSize}px</span>
                        </div>
                        <div 
                            className={`p-4 rounded-xl border flex items-center justify-center overflow-auto ${cardBg}`}
                            style={{ lineHeight, minHeight: '120px', maxHeight: '280px' }}
                        >
                        <div 
                                className="flex flex-wrap items-end justify-center" 
                                style={{ 
                                    fontSize,
                                    // Fix: NO letterSpacing/wordSpacing in CSS - handled manually per glyph
                                }}
                            >
                                {previewText.split('').map((char, idx) => {
                                    const g = getGlyph(char);
                                    // Fix: space width converts wordSpacing from design units to pixels
                                    if (char === ' ') {
                                        const upm = metadata.unitsPerEm || 1000;
                                        const spaceWidth = wordSpacing * (fontSize / upm);
                                        return <span key={idx} style={{ width: spaceWidth }}>&nbsp;</span>;
                                    }
                                    if (!g) return <span key={idx} className="opacity-20">{char}</span>;
                                    
                                    const upm = metadata.unitsPerEm || 1000;
                                    const scale = fontSize / upm;
                                    const baseWidth = g.advanceWidth * scale;
                                    
                                    // Kerning
                                    let kernAdjust = 0;
                                    if (idx > 0) {
                                        const prevChar = previewText[idx - 1];
                                        if (prevChar !== ' ') {
                                            kernAdjust = getKerning(prevChar, char) * scale;
                                        }
                                    }
                                    
                                    // Fix: tracking added as marginLeft, not in width
                                    const trackingAdjust = letterSpacing * scale;
                                    const width = baseWidth;
                                    
                                    // Fix: viewBox includes descender
                                    const ascender = metadata.ascender || 800;
                                    const descender = Math.abs(metadata.descender || -200);
                                    const accentSpace = upm * 0.25;
                                    const viewBoxHeight = ascender + descender + accentSpace;
                                    const viewBoxY = -accentSpace;
                                    
                                    // Altura do span proporcional para mostrar acentos
                                    const spanHeight = fontSize * (viewBoxHeight / upm);
                                    
                                    return (
                                        <span 
                                            key={idx} 
                                            style={{ 
                                                width: Math.max(0, width), 
                                                height: spanHeight,
                                                marginLeft: kernAdjust + trackingAdjust,
                                                marginBottom: -(spanHeight - fontSize) * 0.2, // Compensar espaço extra
                                            }}
                                            className="inline-block relative"
                                        >
                                            {g.pathData ? (
                                                <svg 
                                                    viewBox={`0 ${viewBoxY} ${upm} ${viewBoxHeight}`}
                                                    className="absolute inset-0 fill-current overflow-visible"
                                                    style={{ width: fontSize, height: spanHeight }}
                                                    preserveAspectRatio="xMidYMax meet"
                                                >
                                                    <g transform={`translate(${g.leftSideBearing}, ${g.baselineOffset}) scale(${g.scale})`}>
                                                        <path d={g.pathData} />
                                                    </g>
                                                </svg>
                                            ) : (
                                                <span className="opacity-20">{char}</span>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                        <input
                            type="text"
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            placeholder="Digite para visualizar..."
                            className={`w-full mt-3 px-4 py-2 rounded-lg border text-center text-sm outline-none ${inputBg}`}
                        />
                    </div>

                    {/* Editor de Glifo - Area Scrollavel */}
                    <div 
                        className="flex-1 flex items-center justify-center p-6 overflow-auto"
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {selectedGlyph ? (
                            <div className={`w-full max-w-md p-5 rounded-2xl border transition-all ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : cardBg}`}>
                                {/* Header do Glifo */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl font-black">{selectedGlyph.char}</span>
                                        <div>
                                            <p className="font-bold">{selectedGlyph.name}</p>
                                            <p className={`text-xs font-mono ${textSub}`}>
                                                U+{selectedGlyph.unicode.toString(16).toUpperCase().padStart(4, '0')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                        selectedGlyph.pathData 
                                            ? (isDarkMode ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                            : (isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-neutral-100 text-neutral-500')
                                    }`}>
                                        {selectedGlyph.pathData ? 'Desenhado' : 'Vazio'}
                                    </span>
                                </div>

                                {/* Preview */}
                                <div className={`rounded-xl border mb-4 relative ${
                                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-neutral-100 border-neutral-200'
                                }`}>
                                    <div className="aspect-square flex items-center justify-center">
                                        {renderGlyphPreview(selectedGlyph, 160)}
                                        {isDragging && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-xl">
                                                <p className="text-emerald-500 font-bold text-sm">Solte o SVG aqui</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Indicador visual do Advance Width */}
                                    <div className={`h-2 rounded-b-xl relative overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-neutral-200'}`}>
                                        <div 
                                            className="h-full bg-blue-500 transition-all"
                                            style={{ width: `${Math.min((selectedGlyph.advanceWidth / (metadata.unitsPerEm || 1000)) * 100, 100)}%` }}
                                            title={`Advance Width: ${selectedGlyph.advanceWidth}u`}
                                        />
                                    </div>
                                </div>

                                {/* Acoes */}
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".svg"
                                        onChange={handleSvgUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 ${btnPrimary}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Carregar SVG
                                    </button>
                                    
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={handlePaste}
                                            className={`py-2 rounded-xl font-bold text-xs uppercase border ${btnSecondary}`}
                                        >
                                            Colar
                                        </button>
                                        <button
                                            onClick={handleClearGlyph}
                                            disabled={!selectedGlyph.pathData}
                                            className={`py-2 rounded-xl font-bold text-xs uppercase border ${btnSecondary} disabled:opacity-40`}
                                        >
                                            Limpar
                                        </button>
                                        <button
                                            onClick={onSwitchToAdvanced}
                                            className={`py-2 rounded-xl font-bold text-xs uppercase border ${btnSecondary}`}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>

                                {/* Metricas */}
                                <div className={`mt-4 p-3 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-100'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>Metricas</p>
                                        <button
                                            onClick={handleRecalculateCurrentWidth}
                                            disabled={!selectedGlyph.pathData}
                                            className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${
                                                selectedGlyph.pathData
                                                    ? (isDarkMode ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-900' : 'bg-blue-100 text-blue-700 hover:bg-blue-200')
                                                    : 'opacity-40 cursor-not-allowed ' + (isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-neutral-200 text-neutral-400')
                                            }`}
                                            title="Recalcular Advance Width automaticamente"
                                        >
                                            Auto Width
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase ${textSub}`}>Largura</label>
                                            <input
                                                type="number"
                                                value={selectedGlyph.advanceWidth}
                                                onChange={(e) => onUpdateGlyph(selectedGlyph.char, { advanceWidth: parseInt(e.target.value) || 0 })}
                                                className={`w-full mt-1 px-2 py-1.5 rounded-lg border text-center font-bold text-sm outline-none ${inputBg}`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase ${textSub}`}>Offset X</label>
                                            <input
                                                type="number"
                                                value={selectedGlyph.leftSideBearing}
                                                onChange={(e) => onUpdateGlyph(selectedGlyph.char, { leftSideBearing: parseInt(e.target.value) || 0 })}
                                                className={`w-full mt-1 px-2 py-1.5 rounded-lg border text-center font-bold text-sm outline-none ${inputBg}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={`text-center ${textSub}`}>
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                </svg>
                                <p className="font-bold">Selecione um glifo</p>
                                <p className="text-sm mt-1">Clique na lista ao lado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Painel Direito - Espacamento e Kerning */}
                <div className={`w-72 border-l flex flex-col ${borderCol} ${bgPanel}`}>
                    <div className="p-4 space-y-5 overflow-y-auto flex-1">
                        
                        {/* Espacamento */}
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <p className={`text-[10px] font-bold uppercase mb-4 tracking-wider ${textSub}`}>Espacamento</p>
                            
                            {/* Letter Spacing */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className={`text-xs font-semibold ${textSub}`}>Entre Letras</label>
                                    <span className="text-xs font-mono">{letterSpacing}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="200"
                                    value={letterSpacing}
                                    onChange={(e) => setLetterSpacing(parseInt(e.target.value))}
                                    className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                />
                            </div>

                            {/* Word Spacing */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className={`text-xs font-semibold ${textSub}`}>Entre Palavras</label>
                                    <span className="text-xs font-mono">{wordSpacing}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-100"
                                    max="300"
                                    value={wordSpacing}
                                    onChange={(e) => setWordSpacing(parseInt(e.target.value))}
                                    className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                />
                            </div>

                            {/* Line Height */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className={`text-xs font-semibold ${textSub}`}>Entre Linhas</label>
                                    <span className="text-xs font-mono">{lineHeight.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.8"
                                    max="3"
                                    step="0.1"
                                    value={lineHeight}
                                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                                    className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                />
                            </div>
                        </div>

                        {/* Kerning */}
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <p className={`text-[10px] font-bold uppercase mb-4 tracking-wider ${textSub}`}>Kerning Automatico</p>
                            
                            {/* Preset Selector */}
                            <div className="mb-4">
                                <label className={`text-xs font-semibold block mb-2 ${textSub}`}>Preset</label>
                                <select
                                    value={kerningPreset}
                                    onChange={(e) => applyKerningPreset(e.target.value as KerningPreset)}
                                    className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputBg}`}
                                >
                                    <optgroup label="Basico">
                                        <option value="none">Sem kerning</option>
                                        <option value="tight">Tight (apertado)</option>
                                        <option value="normal">Normal</option>
                                        <option value="loose">Loose (solto)</option>
                                    </optgroup>
                                    <optgroup label="Automatico">
                                        <option value="auto-smart">Auto Smart (geometria)</option>
                                        <option value="auto-common">Auto Comum (pares)</option>
                                    </optgroup>
                                    <optgroup label="🌟 Profissional (Real Fonts)">
                                        <option value="professional">🎯 Profissional (Tabelas Reais)</option>
                                        <option value="hybrid">⚡ Híbrido (Tabelas + Geometria)</option>
                                    </optgroup>
                                    <optgroup label="Templates Profissionais">
                                        {KERNING_TEMPLATES.slice(0, 8).map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            {/* Intensity */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <label className={`text-xs font-semibold ${textSub}`}>Intensidade</label>
                                    <span className="text-xs font-mono">{(kerningIntensity * 100).toFixed(0)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.3"
                                    max="2"
                                    step="0.1"
                                    value={kerningIntensity}
                                    onChange={(e) => setKerningIntensity(parseFloat(e.target.value))}
                                    className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                />
                            </div>

                            {/* Font Style Selector - Para modos profissionais */}
                            {(kerningPreset === 'professional' || kerningPreset === 'hybrid') && (
                                <div className="mb-4">
                                    <label className={`text-xs font-semibold block mb-2 ${textSub}`}>Estilo da Fonte</label>
                                    <select
                                        value={fontStyle}
                                        onChange={(e) => {
                                            const newStyle = e.target.value as FontStyle;
                                            setFontStyle(newStyle);
                                            // Reaplicar kerning automaticamente com novo estilo
                                            setTimeout(() => {
                                                if (kerningPreset === 'professional') {
                                                    const profPairs = generateProfessionalKerning(glyphs, {
                                                        style: newStyle,
                                                        intensity: kerningIntensity
                                                    });
                                                    setKerningPairs(profPairs);
                                                    pushNotice(`Kerning ${newStyle} aplicado: ${profPairs.length} pares`, 'success');
                                                } else if (kerningPreset === 'hybrid') {
                                                    const hybridPairs = generateHybridKerning(glyphs, {
                                                        style: newStyle,
                                                        intensity: kerningIntensity
                                                    });
                                                    setKerningPairs(hybridPairs);
                                                    pushNotice(`Kerning híbrido ${newStyle} aplicado: ${hybridPairs.length} pares`, 'success');
                                                }
                                            }, 0);
                                        }}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputBg}`}
                                    >
                                        <option value="geometric-sans">Geométrica Sans (Futura, Avenir)</option>
                                        <option value="humanist-sans">Humanista Sans (Frutiger, Myriad)</option>
                                        <option value="neo-grotesque">Neo-Grotesca (Helvetica, Arial)</option>
                                        <option value="serif-oldstyle">Serifa Old Style (Garamond, Caslon)</option>
                                        <option value="serif-modern">Serifa Moderna (Bodoni, Didot)</option>
                                        <option value="slab">Slab Serif (Rockwell, Clarendon)</option>
                                        <option value="display">Display (Decorativa)</option>
                                        <option value="script">Script (Manuscrita)</option>
                                    </select>
                                    <p className={`text-[10px] mt-1 ${textSub}`}>Ajusta o kerning para o estilo tipográfico</p>
                                </div>
                            )}

                            {/* Kerning Quality Analysis */}
                            {kerningQuality && kerningPairs.length > 0 && (
                                <div className={`p-3 rounded-lg mb-4 ${
                                    kerningQuality.grade === 'A' ? (isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200') :
                                    kerningQuality.grade === 'B' ? (isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200') :
                                    kerningQuality.grade === 'C' ? (isDarkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200') :
                                    (isDarkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200')
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className={`text-[10px] font-bold uppercase ${textSub}`}>Análise de Qualidade</p>
                                        <span className={`text-xl font-black ${
                                            kerningQuality.grade === 'A' ? 'text-green-500' :
                                            kerningQuality.grade === 'B' ? 'text-blue-500' :
                                            kerningQuality.grade === 'C' ? 'text-yellow-500' :
                                            'text-red-500'
                                        }`}>{kerningQuality.grade}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className={textSub}>Pares:</span>
                                            <span className="font-bold ml-1">{kerningPairs.length}</span>
                                        </div>
                                        <div>
                                            <span className={textSub}>Cobertura:</span>
                                            <span className="font-bold ml-1">{kerningQuality.coverage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    {kerningQuality.suggestions.length > 0 && (
                                        <div className="mt-2">
                                            <p className={`text-[10px] ${textSub}`}>💡 {kerningQuality.suggestions[0]}</p>
                                        </div>
                                    )}
                                    {kerningQuality.strongestPairs.length > 0 && (
                                        <div className="mt-2">
                                            <p className={`text-[10px] font-bold ${textSub}`}>Maiores ajustes:</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {kerningQuality.strongestPairs.slice(0, 6).map((sp, i) => (
                                                    <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${isDarkMode ? 'bg-slate-700' : 'bg-white'}`}>
                                                        {sp.pair} {sp.value > 0 ? '+' : ''}{sp.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stats */}
                            {Object.keys(kerning).length > 0 && (
                                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase mb-1 ${textSub}`}>Ativo</p>
                                    <p className="text-sm font-bold">{Object.keys(kerning).length} pares</p>
                                </div>
                            )}

                            {/* Aplicar botao */}
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => applyKerningPreset(kerningPreset)}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border ${btnSecondary}`}
                                >
                                    Reaplicar
                                </button>
                                <button
                                    onClick={handleResetKerning}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border ${isDarkMode ? 'border-red-800 text-red-400 hover:bg-red-900/30' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Advance Width Global */}
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <p className={`text-[10px] font-bold uppercase mb-4 tracking-wider ${textSub}`}>Advance Width Global</p>
                            
                            {/* Modo Selector */}
                            <div className="mb-4">
                                <label className={`text-xs font-semibold block mb-2 ${textSub}`}>Modo</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {(['auto', 'fixed', 'scale'] as AdvanceWidthMode[]).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setAdvanceWidthMode(mode)}
                                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                                advanceWidthMode === mode
                                                    ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')
                                                    : `border ${btnSecondary}`
                                            }`}
                                        >
                                            {mode === 'auto' ? 'Auto' : mode === 'fixed' ? 'Fixo' : 'Escala'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Slider baseado no modo */}
                            {advanceWidthMode === 'auto' && (
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={`text-xs font-semibold ${textSub}`}>Margem Lateral</label>
                                        <span className="text-xs font-mono">{globalSideMargin}u</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="150"
                                        value={globalSideMargin}
                                        onChange={(e) => setGlobalSideMargin(parseInt(e.target.value))}
                                        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                    />
                                    <p className={`text-[10px] mt-1 ${textSub}`}>Espaco extra ao redor do glifo</p>
                                </div>
                            )}

                            {advanceWidthMode === 'fixed' && (
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={`text-xs font-semibold ${textSub}`}>Largura Fixa</label>
                                        <span className="text-xs font-mono">{globalFixedWidth}u</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="300"
                                        max="1000"
                                        value={globalFixedWidth}
                                        onChange={(e) => setGlobalFixedWidth(parseInt(e.target.value))}
                                        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                    />
                                    <p className={`text-[10px] mt-1 ${textSub}`}>Para fontes monospace</p>
                                </div>
                            )}

                            {advanceWidthMode === 'scale' && (
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={`text-xs font-semibold ${textSub}`}>Escala %</label>
                                        <span className="text-xs font-mono">{globalWidthScale}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="150"
                                        value={globalWidthScale}
                                        onChange={(e) => setGlobalWidthScale(parseInt(e.target.value))}
                                        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                    />
                                    <p className={`text-[10px] mt-1 ${textSub}`}>Expande/comprime proporcionalmente</p>
                                </div>
                            )}

                            {/* Aplicar a todos */}
                            <button
                                onClick={handleApplyGlobalWidth}
                                className={`w-full py-2 rounded-lg font-bold text-xs uppercase tracking-wider ${btnPrimary}`}
                            >
                                Aplicar a Todos
                            </button>
                        </div>

                        {/* Centralização */}
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <p className={`text-[10px] font-bold uppercase mb-4 tracking-wider ${textSub}`}>⚖️ Centralização</p>
                            <p className={`text-[10px] mb-3 ${textSub}`}>
                                Centraliza automaticamente os glifos dentro de suas caixas (advance width).
                            </p>
                            
                            {/* Botões de centralização */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCenterCurrentGlyph}
                                    disabled={!selectedGlyph?.pathData}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border transition-colors ${
                                        selectedGlyph?.pathData 
                                            ? btnSecondary 
                                            : 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
                                    }`}
                                >
                                    Atual
                                </button>
                                <button
                                    onClick={handleCenterAllGlyphs}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider ${btnPrimary}`}
                                >
                                    Todos
                                </button>
                            </div>
                        </div>

                        {/* Metricas da Fonte */}
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <p className={`text-[10px] font-bold uppercase mb-4 tracking-wider ${textSub}`}>Fonte</p>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className={`text-xs font-semibold ${textSub}`}>Familia</label>
                                    <input
                                        type="text"
                                        value={metadata.familyName}
                                        onChange={(e) => onUpdateMetadata({ ...metadata, familyName: e.target.value })}
                                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none ${inputBg}`}
                                    />
                                </div>
                                <div>
                                    <label className={`text-xs font-semibold ${textSub}`}>Estilo</label>
                                    <input
                                        type="text"
                                        value={metadata.styleName}
                                        onChange={(e) => onUpdateMetadata({ ...metadata, styleName: e.target.value })}
                                        className={`w-full mt-1 px-3 py-2 rounded-lg border text-sm outline-none ${inputBg}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Metricas Globais */}
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <p className={`text-[10px] font-bold uppercase mb-4 tracking-wider ${textSub}`}>Metricas Globais</p>
                            
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={`text-xs font-semibold ${textSub}`}>UPM</label>
                                        <span className="text-xs font-mono">{metadata.unitsPerEm}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="500"
                                        max="2000"
                                        step="100"
                                        value={metadata.unitsPerEm}
                                        onChange={(e) => onUpdateMetadata({ ...metadata, unitsPerEm: parseInt(e.target.value) })}
                                        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={`text-xs font-semibold ${textSub}`}>Ascender</label>
                                        <span className="text-xs font-mono">{metadata.ascender}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="500"
                                        max="1000"
                                        value={metadata.ascender}
                                        onChange={(e) => onUpdateMetadata({ ...metadata, ascender: parseInt(e.target.value) })}
                                        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className={`text-xs font-semibold ${textSub}`}>Descender</label>
                                        <span className="text-xs font-mono">{metadata.descender}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-500"
                                        max="0"
                                        value={metadata.descender}
                                        onChange={(e) => onUpdateMetadata({ ...metadata, descender: parseInt(e.target.value) })}
                                        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dicas */}
                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-neutral-100'}`}>
                            <p className={`text-xs font-bold mb-2 ${textSub}`}>Dicas</p>
                            <ul className={`text-xs space-y-1 ${textSub}`}>
                                <li>- Arraste SVGs para o glifo</li>
                                <li>- Cole paths com Ctrl+V</li>
                                <li>- Use Auto Smart para kerning inteligente</li>
                                <li>- Modo Avancado para edicao detalhada</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Auto-Configuração */}
            {showAutoConfigModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className={`${cardBg} border rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto m-4 shadow-2xl`}>
                        {/* Header do Modal */}
                        <div className={`p-4 border-b ${borderCol} flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                <div>
                                    <h2 className="text-lg font-bold">Configuração Automática</h2>
                                    <p className={`text-xs ${textSub}`}>Analisa geometria e configura espaçamento/kerning</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAutoConfigModal(false)}
                                className={`p-2 rounded-lg hover:bg-opacity-80 ${btnSecondary} border`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Corpo do Modal */}
                        <div className="p-4 space-y-4">
                            {/* Análise atual */}
                            {(() => {
                                const quality = analyzeFontQuality(glyphs, metadata);
                                return (
                                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-100'}`}>
                                        <p className={`text-xs font-bold mb-2 ${textSub}`}>Análise Atual</p>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className={textSub}>Score:</span>
                                                <span className={`ml-1 font-bold ${
                                                    quality.score >= 80 ? 'text-emerald-500' :
                                                    quality.score >= 60 ? 'text-yellow-500' :
                                                    'text-red-500'
                                                }`}>{quality.score}/100</span>
                                            </div>
                                            <div>
                                                <span className={textSub}>Glifos:</span>
                                                <span className="ml-1 font-bold">{glyphs.filter(g => g.pathData).length}</span>
                                            </div>
                                            <div>
                                                <span className={textSub}>Nota:</span>
                                                <span className={`ml-1 font-bold ${
                                                    quality.score >= 90 ? 'text-emerald-500' :
                                                    quality.score >= 70 ? 'text-yellow-500' :
                                                    'text-orange-500'
                                                }`}>{quality.score >= 90 ? 'A' : quality.score >= 80 ? 'B' : quality.score >= 70 ? 'C' : quality.score >= 60 ? 'D' : 'F'}</span>
                                            </div>
                                        </div>
                                        {quality.suggestions.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-current border-opacity-10">
                                                <p className={`text-xs ${textSub} mb-1`}>Sugestões:</p>
                                                <ul className={`text-xs ${textSub} space-y-0.5`}>
                                                    {quality.suggestions.slice(0, 3).map((s, i) => (
                                                        <li key={i}>• {s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Opções */}
                            <div className="space-y-3">
                                <p className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>O que configurar?</p>
                                
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoConfigOptions.normalizeHeights}
                                        onChange={(e) => setAutoConfigOptions({...autoConfigOptions, normalizeHeights: e.target.checked})}
                                        className={`w-5 h-5 rounded ${accentColor}`}
                                    />
                                    <div>
                                        <span className="text-sm font-medium">Normalizar Alturas</span>
                                        <p className={`text-xs ${textSub}`}>Ajusta escala para altura consistente ({autoConfigOptions.targetHeight}px)</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoConfigOptions.autoSpacing}
                                        onChange={(e) => setAutoConfigOptions({...autoConfigOptions, autoSpacing: e.target.checked})}
                                        className={`w-5 h-5 rounded ${accentColor}`}
                                    />
                                    <div>
                                        <span className="text-sm font-medium">Espaçamento Automático</span>
                                        <p className={`text-xs ${textSub}`}>Calcula advance width, LSB e RSB baseado na geometria</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoConfigOptions.autoKerning}
                                        onChange={(e) => setAutoConfigOptions({...autoConfigOptions, autoKerning: e.target.checked})}
                                        className={`w-5 h-5 rounded ${accentColor}`}
                                    />
                                    <div>
                                        <span className="text-sm font-medium">Kerning Automático</span>
                                        <p className={`text-xs ${textSub}`}>Gera pares de kerning baseado em análise de formas</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoConfigOptions.optimizeMetrics}
                                        onChange={(e) => setAutoConfigOptions({...autoConfigOptions, optimizeMetrics: e.target.checked})}
                                        className={`w-5 h-5 rounded ${accentColor}`}
                                    />
                                    <div>
                                        <span className="text-sm font-medium">Otimizar Métricas Globais</span>
                                        <p className={`text-xs ${textSub}`}>Ajusta ascender/descender baseado nos glyphs</p>
                                    </div>
                                </label>
                            </div>

                            {/* Configurações avançadas */}
                            <details className={`p-3 rounded-lg border ${borderCol}`}>
                                <summary className={`text-xs font-bold uppercase tracking-wider cursor-pointer ${textSub}`}>
                                    Configurações Avançadas
                                </summary>
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className={`text-xs font-semibold ${textSub}`}>Intensidade do Kerning</label>
                                            <span className="text-xs font-mono">{(autoConfigOptions.kerningIntensity * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.3"
                                            max="2"
                                            step="0.1"
                                            value={autoConfigOptions.kerningIntensity}
                                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, kerningIntensity: parseFloat(e.target.value)})}
                                            className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className={`text-xs font-semibold ${textSub}`}>Altura Alvo</label>
                                            <span className="text-xs font-mono">{autoConfigOptions.targetHeight}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="500"
                                            max="900"
                                            step="50"
                                            value={autoConfigOptions.targetHeight}
                                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, targetHeight: parseInt(e.target.value)})}
                                            className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className={`text-xs font-semibold ${textSub}`}>Margem Lateral</label>
                                            <span className="text-xs font-mono">{autoConfigOptions.sideMargin}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="20"
                                            max="150"
                                            step="10"
                                            value={autoConfigOptions.sideMargin}
                                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, sideMargin: parseInt(e.target.value)})}
                                            className={`w-full h-2 rounded-full appearance-none cursor-pointer ${sliderTrack} ${accentColor}`}
                                        />
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Footer do Modal */}
                        <div className={`p-4 border-t ${borderCol} flex justify-end gap-2`}>
                            <button
                                onClick={() => setShowAutoConfigModal(false)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold border ${btnSecondary}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAutoConfig}
                                disabled={isAutoConfiguring}
                                className={`px-6 py-2 rounded-lg text-sm font-bold ${
                                    isDarkMode 
                                        ? 'bg-amber-600 text-white hover:bg-amber-500' 
                                        : 'bg-amber-500 text-white hover:bg-amber-600'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isAutoConfiguring ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processando...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path d="M20 6L9 17l-5-5" />
                                        </svg>
                                        Aplicar Auto Config
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompactEditor;

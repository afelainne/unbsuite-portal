import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    Check,
    ClipboardPaste,
    Download,
    Eraser,
    Home,
    Moon,
    MousePointerClick,
    PenTool,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    Sun,
    Upload,
    Wand2
} from 'lucide-react';
import { Card, Field, IconButton, Metric, Progress, Segmented, Sheet, Spinner, TitleRow, ValueRow } from './ui';
import { cx } from './cx';
import { GlyphData, FontMetadata, DEFAULT_TRACKING_PROFILES } from '../types';
import { useNotice } from '../contexts/NoticeContext';
import { extractSingleGlyphFromSVG } from '../services/importService';
import { generateSmartAutoKerning, generateCommonPairsKerning, getKerningStats } from '../services/kerningService';
import { KERNING_TEMPLATES, applyKerningTemplate, getTemplateById } from '../services/kerningTemplates';
import { getTrackingBetweenGlyphs, isAllCapsWord } from '../services/trackingService';
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
    const [previewText, setPreviewText] = useState('FONT abcdef 123');
    const [fontSize, setFontSize] = useState(64);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<GlyphCategory>('all');
    const [isDragging, setIsDragging] = useState(false);
    
    // Derivar kerning/tracking/wordSpacing diretamente do metadata (sem estado local)
    const letterSpacing = metadata.tracking || 0;
    const wordSpacing = metadata.wordSpacing || 250;
    const kerning = metadata.kerning || {};
    const lineGap = metadata.lineGap ?? 200;
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
        onUpdateMetadata(prev => ({
            ...prev,
            tracking: val,
            trackingProfile: {
                ...(prev.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text']),
                defaultTracking: val,
            }
        }));
    }, [onUpdateMetadata]);
    
    const setWordSpacing = useCallback((val: number) => {
        onUpdateMetadata(prev => ({ ...prev, wordSpacing: val }));
    }, [onUpdateMetadata]);
    
    const setKerning = useCallback((newKerning: Record<string, number>) => {
        onUpdateMetadata(prev => ({ ...prev, kerning: newKerning }));
    }, [onUpdateMetadata]);

    // Análise de qualidade do kerning
    const kerningQuality = useMemo(() => 
        analyzeKerningQuality(glyphs, kerningPairs)
    , [glyphs, kerningPairs]);
    
    // Converter pairs para Record para uso no preview
    const kerningRecord = useMemo(() => {
        const record: Record<string, number> = { ...kerning };
        kerningPairs.forEach(pair => {
            record[`${pair.left}${pair.right}`] = pair.value;
        });
        return record;
    }, [kerning, kerningPairs]);

    // Glyph selecionado
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
            pushNotice(`Glifo "${targetChar}" atualizado.`, 'success');
            return true;
        } else {
            pushNotice('Nenhum traçado encontrado no SVG.', 'error');
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
            pushNotice('Não foi possível acessar a área de transferência.', 'error');
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
        // Validar minimo de glyphs com path
        const glyphsWithPath = glyphs.filter(g => g.pathData && g.pathData.trim().length > 0);
        if (glyphsWithPath.length < 5) {
            pushNotice(`A configuração automática precisa de pelo menos 5 glifos desenhados (encontrados: ${glyphsWithPath.length}). Importe os SVGs primeiro.`, 'warning');
            return;
        }
        
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
                `Configuração automática: ${report.glyphsUpdated} glifos atualizados, ${report.kerningPairsGenerated} pares de kerning gerados.`,
                'success'
            );
            
            if (report.warnings.length > 0) {
                report.warnings.slice(0, 3).forEach(w => {
                    pushNotice(w, 'warning');
                });
            }
            
            setShowAutoConfigModal(false);
        } catch (error) {
            pushNotice(`Erro na configuração automática: ${error}`, 'error');
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
                pushNotice(`Apertado: ${generatedPairs.length} pares. Intensidade de ${(suggestedIntensity * 100).toFixed(0)}%.`, 'success');
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
                pushNotice(`Solto: ${generatedPairs.length} pares. Intensidade de ${(suggestedIntensity * 100).toFixed(0)}%.`, 'success');
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
                    pushNotice(`Inteligente (alternativo): ${generatedPairs.length} pares.`, 'success');
                } else {
                    const smartStats = getKerningStats(newKerning);
                    pushNotice(`Inteligente: ${smartStats?.totalPairs || 0} pares.`, 'success');
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
                    pushNotice(`Comum (alternativo): ${generatedPairs.length} pares.`, 'success');
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
                    pushNotice(`Profissional: ${generatedPairs.length} pares (nota ${profQuality.grade}).`, 'success');
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
                    pushNotice(`Híbrido: ${generatedPairs.length} pares (nota ${hybridQuality.grade}).`, 'success');
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
                    pushNotice(`Modelo "${template.name}". Intensidade de ${(suggestedIntensity * 100).toFixed(0)}%.`, 'success');
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

    // Auto-reapply kerning when intensity changes (debounced)
    const kerningIntensityRef = useRef(kerningIntensity);
    useEffect(() => {
        if (kerningIntensityRef.current === kerningIntensity) return;
        kerningIntensityRef.current = kerningIntensity;
        if (kerningPreset === 'none') return;
        const timer = setTimeout(() => {
            applyKerningPreset(kerningPreset);
        }, 300);
        return () => clearTimeout(timer);
    }, [kerningIntensity, kerningPreset, applyKerningPreset]);

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
        
        pushNotice(`Largura de avanço aplicada a ${updatedCount} glifos.`, 'success');
    }, [glyphs, advanceWidthMode, globalSideMargin, globalFixedWidth, globalWidthScale, onUpdateGlyph, pushNotice]);

    // Recalcular width apenas do glifo selecionado
    const handleRecalculateCurrentWidth = useCallback(() => {
        if (!selectedGlyph || !selectedGlyph.pathData) {
            pushNotice('Selecione um glifo desenhado.', 'warning');
            return;
        }
        
        const newWidth = calculateAutoAdvanceWidth(selectedGlyph, globalSideMargin);
        onUpdateGlyph(selectedGlyph.char, { advanceWidth: newWidth });
        pushNotice(`Largura de "${selectedGlyph.char}" ajustada para ${newWidth}.`, 'success');
    }, [selectedGlyph, globalSideMargin, onUpdateGlyph, pushNotice]);

    // Centralizar glifo atual
    const handleCenterCurrentGlyph = useCallback(() => {
        if (!selectedGlyph || !selectedGlyph.pathData) {
            pushNotice('Selecione um glifo desenhado.', 'warning');
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
        <svg viewBox="0 0 1000 1000" style={{ width: size, height: size }} className="overflow-visible" aria-hidden="true">
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

    const closeAutoConfig = useCallback(() => setShowAutoConfigModal(false), []);

    // Categorias
    const categories: { value: GlyphCategory; label: string }[] = [
        { value: 'all', label: 'Todos' },
        { value: 'uppercase', label: 'A–Z' },
        { value: 'lowercase', label: 'a–z' },
        { value: 'numbers', label: '0–9' },
        { value: 'symbols', label: 'Outros' },
    ];

    const widthModes: { value: AdvanceWidthMode; label: string }[] = [
        { value: 'auto', label: 'Auto' },
        { value: 'fixed', label: 'Fixa' },
        { value: 'scale', label: 'Escala' },
    ];

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto lg:overflow-hidden">
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
            <input
                type="file"
                ref={fileInputRef}
                accept=".svg"
                onChange={handleSvgUpload}
                className="hidden"
            />

            <TitleRow
                className="px-5 md:px-10 pt-6 md:pt-8 shrink-0"
                title={metadata.familyName || 'Sem nome'}
                crumb="Modo compacto"
                actions={
                    <>
                        <IconButton label="Projetos" variant="surface" onClick={onGoHome}>
                            <Home className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label={isDarkMode ? 'Tema claro' : 'Tema escuro'} variant="surface" onClick={onToggleTheme}>
                            {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
                        </IconButton>
                        <IconButton label="Salvar projeto" variant="surface" onClick={onSaveProject}>
                            <Save className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label="Importar folha SVG" variant="surface" onClick={() => importInputRef.current?.click()}>
                            <Upload className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label="Configuração automática" variant="surface" onClick={() => setShowAutoConfigModal(true)}>
                            <Wand2 className="w-4 h-4" aria-hidden="true" />
                        </IconButton>
                        <button type="button" onClick={onSwitchToAdvanced} className="ctl ctl-outline ctl-lg">
                            Modo avançado
                        </button>
                        <button
                            type="button"
                            onClick={() => onExportFont(kerningPairs.length > 0 ? kerningPairs : undefined)}
                            className="ctl ctl-tinted ctl-lg"
                        >
                            <Download className="w-4 h-4" aria-hidden="true" />
                            Exportar fonte
                        </button>
                    </>
                }
            />

            <div className="px-5 md:px-10 pt-6 pb-6 flex flex-col lg:flex-row gap-5 lg:min-h-0 lg:flex-1">
                {/* Painel esquerdo: glifos */}
                <aside className="material-card p-5 flex flex-col gap-4 min-w-0 lg:w-72 lg:shrink-0 lg:min-h-0">
                    <Field label="Nome da família">
                        <input
                            type="text"
                            value={metadata.familyName}
                            onChange={(e) => onUpdateMetadata(prev => ({ ...prev, familyName: e.target.value }))}
                            className="field"
                            placeholder="Nome da fonte"
                        />
                    </Field>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                        <input
                            type="search"
                            placeholder="Buscar glifo"
                            aria-label="Buscar glifo"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="field pl-9"
                        />
                    </div>

                    <Segmented<GlyphCategory>
                        ariaLabel="Filtrar glifos"
                        items={categories}
                        value={activeCategory}
                        onChange={setActiveCategory}
                        className="w-full [&>button]:flex-1 [&>button]:px-1.5"
                    />

                    <div className="max-h-[320px] overflow-y-auto lg:max-h-none lg:flex-1 lg:min-h-0">
                        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-1.5">
                            {filteredGlyphs.map(g => {
                                const on = selectedChar === g.char;
                                return (
                                    <button
                                        type="button"
                                        key={g.char}
                                        onClick={() => setSelectedChar(g.char)}
                                        aria-pressed={on}
                                        aria-label={`${g.name}${g.pathData ? ', desenhado' : ''}`}
                                        title={g.name}
                                        className={cx(
                                            'aspect-square rounded-md flex items-center justify-center relative transition-colors duration-fast ease-out',
                                            on ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-fill-2'
                                        )}
                                    >
                                        {renderGlyphPreview(g, 24)}
                                        {g.pathData && (
                                            <span
                                                aria-hidden="true"
                                                className={cx('absolute bottom-1 right-1 w-1.5 h-1.5 rounded-pill', on ? 'bg-primary-foreground' : 'bg-foreground')}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {filteredGlyphs.length === 0 && (
                            <p className="text-center py-8 text-[14px] text-muted-foreground">Nenhum glifo encontrado.</p>
                        )}
                    </div>

                    <div className="hairline-t pt-4 flex flex-col gap-2 shrink-0">
                        <Progress value={stats.total ? stats.filled / stats.total : 0} label="Progresso do desenho" />
                        <p className="text-[12px] text-muted-foreground tabular">
                            {stats.filled} de {stats.total} desenhados
                        </p>
                    </div>
                </aside>

                {/* Centro: pré-visualização e glifo selecionado */}
                <div className="flex flex-col gap-5 min-w-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                    <Card
                        label="Pré-visualização"
                        className="p-5 shrink-0"
                        actions={
                            <div className="flex items-center gap-3 w-44">
                                <input
                                    type="range"
                                    min="24"
                                    max="120"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    className="tool-slider w-full"
                                    aria-label="Tamanho da pré-visualização"
                                />
                                <span className="text-[12px] text-muted-foreground tabular w-10 text-right shrink-0">{fontSize}px</span>
                            </div>
                        }
                    >
                        <div
                            className="bg-canvas rounded-xl p-5 flex items-center justify-center overflow-auto text-foreground"
                            style={{ minHeight: '140px', maxHeight: '280px' }}
                        >
                            {(() => {
                                const upm = metadata.unitsPerEm || 1000;
                                const ascender = metadata.ascender || 800;
                                const descender = Math.abs(metadata.descender || -200);
                                const lineBodyHeight = fontSize * (ascender + descender) / upm;
                                const lineSpacingPx = (lineGap / upm) * fontSize;
                                const lines = previewText.split('\n').length > 1 ? previewText.split('\n') : [previewText];
                                return (
                                    <div style={{ overflow: 'visible' }}>
                                        {lines.map((lineText, lineIdx) => (
                                            <div
                                                key={lineIdx}
                                                className="flex flex-wrap items-end justify-center"
                                                style={{
                                                    fontSize,
                                                    height: lineBodyHeight,
                                                    overflow: 'visible',
                                                    marginTop: lineIdx > 0 ? lineSpacingPx : 0,
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

                                                    // Kerning + contextual tracking
                                                    let spacingAdjust = 0;
                                                    if (idx > 0) {
                                                        const prevChar = previewText[idx - 1];
                                                        if (prevChar !== ' ') {
                                                            spacingAdjust += getKerning(prevChar, char) * scale;
                                                        }
                                                        const prevG = getGlyph(prevChar);
                                                        if (prevG) {
                                                            const profile = metadata.trackingProfile || DEFAULT_TRACKING_PROFILES['body-text'];
                                                            spacingAdjust += getTrackingBetweenGlyphs(prevG, g, profile, fontSize, isAllCapsWord(previewText)) * scale;
                                                        }
                                                    }
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
                                                                marginLeft: spacingAdjust,
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
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                        <input
                            type="text"
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            placeholder="Digite para visualizar"
                            aria-label="Texto da pré-visualização"
                            className="field text-center"
                        />
                    </Card>

                    {/* Glifo selecionado */}
                    <section
                        className={cx(
                            'material-card p-5 flex flex-col gap-5 min-w-0 shrink-0 transition-shadow duration-fast ease-out',
                            isDragging && 'shadow-hairline-strong ring-2 ring-foreground'
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {selectedGlyph ? (
                            <div className="flex flex-col md:flex-row gap-5 min-w-0">
                                {/* Desenho */}
                                <div className="md:w-60 shrink-0 flex flex-col gap-3">
                                    <div className="bg-canvas rounded-xl relative overflow-hidden text-foreground">
                                        <div className="aspect-square flex items-center justify-center">
                                            {renderGlyphPreview(selectedGlyph, 160)}
                                        </div>
                                        {isDragging && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                                                <p className="text-[14px] font-medium text-foreground">Solte o SVG aqui</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Indicador visual da largura de avanço */}
                                    <div
                                        className="h-1 w-full rounded-pill bg-fill-2 overflow-hidden"
                                        title={`Largura de avanço: ${selectedGlyph.advanceWidth} u`}
                                    >
                                        <div
                                            className="h-full rounded-pill bg-foreground transition-[width] duration-base ease-out"
                                            style={{ width: `${Math.min((selectedGlyph.advanceWidth / (metadata.unitsPerEm || 1000)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Informações, ações e métricas */}
                                <div className="flex-1 min-w-0 flex flex-col gap-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <span className="text-[44px] leading-none font-normal text-foreground">{selectedGlyph.char}</span>
                                            <div className="min-w-0">
                                                <p className="text-[16px] text-foreground truncate">{selectedGlyph.name}</p>
                                                <p className="text-[12px] text-muted-foreground tabular">
                                                    U+{selectedGlyph.unicode.toString(16).toUpperCase().padStart(4, '0')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cx('chip shrink-0', selectedGlyph.pathData ? 'chip-invert' : 'chip-outline')}>
                                            {selectedGlyph.pathData ? 'Desenhado' : 'Vazio'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="ctl ctl-filled"
                                        >
                                            <Upload className="w-4 h-4" aria-hidden="true" />
                                            Carregar SVG
                                        </button>
                                        <button type="button" onClick={handlePaste} className="ctl ctl-outline">
                                            <ClipboardPaste className="w-4 h-4" aria-hidden="true" />
                                            Colar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearGlyph}
                                            disabled={!selectedGlyph.pathData}
                                            className="ctl ctl-outline"
                                        >
                                            <Eraser className="w-4 h-4" aria-hidden="true" />
                                            Limpar
                                        </button>
                                        <button type="button" onClick={onSwitchToAdvanced} className="ctl ctl-outline">
                                            <PenTool className="w-4 h-4" aria-hidden="true" />
                                            Editar
                                        </button>
                                    </div>

                                    <div className="hairline-t pt-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="label">Métricas</span>
                                            <button
                                                type="button"
                                                onClick={handleRecalculateCurrentWidth}
                                                disabled={!selectedGlyph.pathData}
                                                className="ctl ctl-sm ctl-gray"
                                                title="Recalcular a largura de avanço pela forma do glifo"
                                            >
                                                Largura automática
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label="Largura">
                                                <input
                                                    type="number"
                                                    value={selectedGlyph.advanceWidth}
                                                    onChange={(e) => onUpdateGlyph(selectedGlyph.char, { advanceWidth: parseInt(e.target.value) || 0 })}
                                                    className="field tabular"
                                                />
                                            </Field>
                                            <Field label="Deslocamento X">
                                                <input
                                                    type="number"
                                                    value={selectedGlyph.leftSideBearing}
                                                    onChange={(e) => onUpdateGlyph(selectedGlyph.char, { leftSideBearing: parseInt(e.target.value) || 0 })}
                                                    className="field tabular"
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 flex flex-col items-center text-center gap-2 text-muted-foreground">
                                <MousePointerClick className="w-10 h-10 opacity-40 mb-2" aria-hidden="true" />
                                <p className="text-[16px] text-foreground">{isDragging ? 'Selecione um glifo antes de soltar' : 'Selecione um glifo'}</p>
                                <p className="text-[14px]">Escolha um na lista ao lado para carregar o desenho.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Painel direito: espaçamento e kerning */}
                <aside className="flex flex-col gap-5 min-w-0 lg:w-80 lg:shrink-0 lg:min-h-0 lg:overflow-y-auto">
                    <Card label="Espaçamento" className="p-5 shrink-0" bodyClassName="gap-4">
                        <Field label="Entre letras" value={letterSpacing}>
                            <input
                                type="range"
                                min="-100"
                                max="200"
                                value={letterSpacing}
                                onChange={(e) => setLetterSpacing(parseInt(e.target.value))}
                                className="tool-slider w-full"
                            />
                        </Field>
                        <Field label="Entre palavras" value={wordSpacing}>
                            <input
                                type="range"
                                min="-100"
                                max="300"
                                value={wordSpacing}
                                onChange={(e) => setWordSpacing(parseInt(e.target.value))}
                                className="tool-slider w-full"
                            />
                        </Field>
                        <Field
                            label="Entre linhas"
                            value={`${lineGap} u (${Math.round((lineGap / (metadata.unitsPerEm || 1000)) * 100)}%)`}
                        >
                            <input
                                type="range"
                                min="0"
                                max="1000"
                                step="10"
                                value={lineGap}
                                onChange={(e) => onUpdateMetadata(prev => ({ ...prev, lineGap: parseInt(e.target.value) }))}
                                className="tool-slider w-full"
                            />
                        </Field>
                    </Card>

                    <Card label="Kerning automático" className="p-5 shrink-0" bodyClassName="gap-4">
                        <Field label="Predefinição">
                            <select
                                value={kerningPreset}
                                onChange={(e) => applyKerningPreset(e.target.value as KerningPreset)}
                                className="field"
                            >
                                <optgroup label="Básico">
                                    <option value="none">Sem kerning</option>
                                    <option value="tight">Apertado</option>
                                    <option value="normal">Normal</option>
                                    <option value="loose">Solto</option>
                                </optgroup>
                                <optgroup label="Automático">
                                    <option value="auto-smart">Inteligente (geometria)</option>
                                    <option value="auto-common">Comum (pares)</option>
                                </optgroup>
                                <optgroup label="Profissional (fontes reais)">
                                    <option value="professional">Profissional (tabelas reais)</option>
                                    <option value="hybrid">Híbrido (tabelas e geometria)</option>
                                </optgroup>
                                <optgroup label="Modelos profissionais">
                                    {KERNING_TEMPLATES.slice(0, 8).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </Field>

                        <Field label="Intensidade" value={`${(kerningIntensity * 100).toFixed(0)}%`}>
                            <input
                                type="range"
                                min="0.3"
                                max="2"
                                step="0.1"
                                value={kerningIntensity}
                                onChange={(e) => setKerningIntensity(parseFloat(e.target.value))}
                                className="tool-slider w-full"
                            />
                        </Field>

                        {/* Estilo tipográfico, para os modos profissionais */}
                        {(kerningPreset === 'professional' || kerningPreset === 'hybrid') && (
                            <Field label="Estilo tipográfico" hint="Ajusta o kerning ao estilo da fonte.">
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
                                                pushNotice(`Kerning ${newStyle} aplicado: ${profPairs.length} pares.`, 'success');
                                            } else if (kerningPreset === 'hybrid') {
                                                const hybridPairs = generateHybridKerning(glyphs, {
                                                    style: newStyle,
                                                    intensity: kerningIntensity
                                                });
                                                setKerningPairs(hybridPairs);
                                                pushNotice(`Kerning híbrido ${newStyle} aplicado: ${hybridPairs.length} pares.`, 'success');
                                            }
                                        }, 0);
                                    }}
                                    className="field"
                                >
                                    <option value="geometric-sans">Sans geométrica (Futura, Avenir)</option>
                                    <option value="humanist-sans">Sans humanista (Frutiger, Myriad)</option>
                                    <option value="neo-grotesque">Neogrotesca (Helvetica, Arial)</option>
                                    <option value="serif-oldstyle">Serifa antiga (Garamond, Caslon)</option>
                                    <option value="serif-modern">Serifa moderna (Bodoni, Didot)</option>
                                    <option value="slab">Serifa egípcia (Rockwell, Clarendon)</option>
                                    <option value="display">Display (decorativa)</option>
                                    <option value="script">Script (manuscrita)</option>
                                </select>
                            </Field>
                        )}

                        {/* Análise de qualidade do kerning */}
                        {kerningQuality && kerningPairs.length > 0 && (
                            <div className="bg-muted rounded-lg p-4 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="label">Análise de qualidade</span>
                                    <span className="text-[28px] leading-none font-normal text-foreground" aria-label={`Nota ${kerningQuality.grade}`}>
                                        {kerningQuality.grade}
                                    </span>
                                </div>
                                <div>
                                    <ValueRow label="Pares" value={kerningPairs.length} />
                                    <ValueRow label="Cobertura" value={`${kerningQuality.coverage.toFixed(0)}%`} last />
                                </div>
                                {kerningQuality.suggestions.length > 0 && (
                                    <p className="text-[12px] text-muted-foreground">{kerningQuality.suggestions[0]}</p>
                                )}
                                {kerningQuality.strongestPairs.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[12px] text-muted-foreground">Maiores ajustes</span>
                                        <ul className="flex flex-col">
                                            {kerningQuality.strongestPairs.slice(0, 6).map((sp, i) => (
                                                <li key={i} className="row justify-between px-0 hover:bg-transparent">
                                                    <span>{sp.pair}</span>
                                                    <span className="tabular text-muted-foreground">{sp.value > 0 ? '+' : ''}{sp.value}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {Object.keys(kerning).length > 0 && (
                            <ValueRow label="Pares ativos" value={Object.keys(kerning).length} last />
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => applyKerningPreset(kerningPreset)}
                                className="ctl ctl-outline flex-1"
                            >
                                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                                Reaplicar
                            </button>
                            <button
                                type="button"
                                onClick={handleResetKerning}
                                className="ctl ctl-danger flex-1"
                            >
                                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                Zerar
                            </button>
                        </div>
                    </Card>

                    <Card label="Largura de avanço global" className="p-5 shrink-0" bodyClassName="gap-4">
                        <Segmented<AdvanceWidthMode>
                            ariaLabel="Modo da largura de avanço"
                            items={widthModes}
                            value={advanceWidthMode}
                            onChange={setAdvanceWidthMode}
                            className="w-full [&>button]:flex-1"
                        />

                        {advanceWidthMode === 'auto' && (
                            <Field label="Margem lateral" value={`${globalSideMargin} u`} hint="Espaço extra em volta do glifo.">
                                <input
                                    type="range"
                                    min="0"
                                    max="150"
                                    value={globalSideMargin}
                                    onChange={(e) => setGlobalSideMargin(parseInt(e.target.value))}
                                    className="tool-slider w-full"
                                />
                            </Field>
                        )}

                        {advanceWidthMode === 'fixed' && (
                            <Field label="Largura fixa" value={`${globalFixedWidth} u`} hint="Para fontes monoespaçadas.">
                                <input
                                    type="range"
                                    min="300"
                                    max="1000"
                                    value={globalFixedWidth}
                                    onChange={(e) => setGlobalFixedWidth(parseInt(e.target.value))}
                                    className="tool-slider w-full"
                                />
                            </Field>
                        )}

                        {advanceWidthMode === 'scale' && (
                            <Field label="Escala" value={`${globalWidthScale}%`} hint="Expande ou comprime na mesma proporção.">
                                <input
                                    type="range"
                                    min="50"
                                    max="150"
                                    value={globalWidthScale}
                                    onChange={(e) => setGlobalWidthScale(parseInt(e.target.value))}
                                    className="tool-slider w-full"
                                />
                            </Field>
                        )}

                        <button type="button" onClick={handleApplyGlobalWidth} className="ctl ctl-filled w-full">
                            Aplicar a todos
                        </button>
                    </Card>

                    <Card label="Centralização" className="p-5 shrink-0" bodyClassName="gap-4">
                        <p className="text-[13px] text-muted-foreground">
                            Centraliza os glifos dentro da largura de avanço.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCenterCurrentGlyph}
                                disabled={!selectedGlyph?.pathData}
                                className="ctl ctl-outline flex-1"
                            >
                                Glifo atual
                            </button>
                            <button type="button" onClick={handleCenterAllGlyphs} className="ctl ctl-outline flex-1">
                                Todos
                            </button>
                        </div>
                    </Card>

                    <Card label="Fonte" className="p-5 shrink-0" bodyClassName="gap-4">
                        <Field label="Estilo">
                            <input
                                type="text"
                                value={metadata.styleName}
                                onChange={(e) => onUpdateMetadata(prev => ({ ...prev, styleName: e.target.value }))}
                                className="field"
                            />
                        </Field>
                    </Card>

                    <Card label="Métricas globais" className="p-5 shrink-0" bodyClassName="gap-4">
                        <Field label="Unidades por eme (UPM)" value={metadata.unitsPerEm}>
                            <input
                                type="range"
                                min="500"
                                max="2000"
                                step="100"
                                value={metadata.unitsPerEm}
                                onChange={(e) => onUpdateMetadata(prev => ({ ...prev, unitsPerEm: parseInt(e.target.value) }))}
                                className="tool-slider w-full"
                            />
                        </Field>
                        <Field label="Ascendente" value={metadata.ascender}>
                            <input
                                type="range"
                                min="500"
                                max="1000"
                                value={metadata.ascender}
                                onChange={(e) => onUpdateMetadata(prev => ({ ...prev, ascender: parseInt(e.target.value) }))}
                                className="tool-slider w-full"
                            />
                        </Field>
                        <Field label="Descendente" value={metadata.descender}>
                            <input
                                type="range"
                                min="-500"
                                max="0"
                                value={metadata.descender}
                                onChange={(e) => onUpdateMetadata(prev => ({ ...prev, descender: parseInt(e.target.value) }))}
                                className="tool-slider w-full"
                            />
                        </Field>
                    </Card>

                    <Card label="Dicas" tone="quiet" className="p-5 shrink-0">
                        <ul className="text-[13px] text-muted-foreground flex flex-col gap-1.5">
                            <li>Arraste arquivos SVG sobre o glifo selecionado.</li>
                            <li>Cole traçados com Colar ou Ctrl+V.</li>
                            <li>Use o kerning inteligente para um ajuste pela geometria.</li>
                            <li>O modo avançado permite editar cada glifo em detalhe.</li>
                        </ul>
                    </Card>
                </aside>
            </div>

            {/* Folha de configuração automática */}
            <Sheet
                open={showAutoConfigModal}
                onClose={closeAutoConfig}
                title="Configuração automática"
                description="Analisa a geometria e configura espaçamento e kerning."
                size="max-w-xl"
                bodyClassName="flex flex-col gap-5"
                footer={
                    <>
                        <button type="button" onClick={closeAutoConfig} className="ctl ctl-outline ctl-lg">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleAutoConfig}
                            disabled={isAutoConfiguring}
                            className="ctl ctl-filled ctl-lg"
                        >
                            {isAutoConfiguring ? <Spinner /> : <Check className="w-4 h-4" aria-hidden="true" />}
                            {isAutoConfiguring ? 'Processando' : 'Aplicar configuração'}
                        </button>
                    </>
                }
            >
                {showAutoConfigModal && (() => {
                    const quality = analyzeFontQuality(glyphs, metadata);
                    const grade = quality.score >= 90 ? 'A' : quality.score >= 80 ? 'B' : quality.score >= 70 ? 'C' : quality.score >= 60 ? 'D' : 'F';
                    return (
                        <div className="bg-muted rounded-lg p-4 flex flex-col gap-4">
                            <span className="label">Análise atual</span>
                            <div className="grid grid-cols-3 gap-4">
                                <Metric value={`${quality.score}/100`} caption="Pontuação" size="sm" />
                                <Metric value={glyphs.filter(g => g.pathData).length} caption="Glifos" size="sm" />
                                <Metric value={grade} caption="Nota" size="sm" />
                            </div>
                            {quality.suggestions.length > 0 && (
                                <div className="hairline-t pt-3 flex flex-col gap-1">
                                    <span className="text-[12px] text-muted-foreground">Sugestões</span>
                                    <ul className="text-[13px] text-muted-foreground flex flex-col gap-1 list-disc pl-4">
                                        {quality.suggestions.slice(0, 3).map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className="flex flex-col gap-3">
                    <span className="label">O que configurar</span>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoConfigOptions.normalizeHeights}
                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, normalizeHeights: e.target.checked})}
                            className="ctl-check mt-0.5"
                        />
                        <span>
                            <span className="block text-[14px] text-foreground">Normalizar alturas</span>
                            <span className="block text-[12px] text-muted-foreground">Ajusta a escala para uma altura constante ({autoConfigOptions.targetHeight} u).</span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoConfigOptions.autoSpacing}
                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, autoSpacing: e.target.checked})}
                            className="ctl-check mt-0.5"
                        />
                        <span>
                            <span className="block text-[14px] text-foreground">Espaçamento automático</span>
                            <span className="block text-[12px] text-muted-foreground">Calcula largura de avanço, LSB e RSB pela geometria.</span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoConfigOptions.autoKerning}
                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, autoKerning: e.target.checked})}
                            className="ctl-check mt-0.5"
                        />
                        <span>
                            <span className="block text-[14px] text-foreground">Kerning automático</span>
                            <span className="block text-[12px] text-muted-foreground">Gera pares de kerning pela análise das formas.</span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoConfigOptions.optimizeMetrics}
                            onChange={(e) => setAutoConfigOptions({...autoConfigOptions, optimizeMetrics: e.target.checked})}
                            className="ctl-check mt-0.5"
                        />
                        <span>
                            <span className="block text-[14px] text-foreground">Otimizar métricas globais</span>
                            <span className="block text-[12px] text-muted-foreground">Ajusta ascendente e descendente pelos glifos.</span>
                        </span>
                    </label>
                </div>

                <details className="card-quiet p-4 group">
                    <summary className="text-[14px] text-foreground cursor-pointer select-none">
                        Configurações avançadas
                    </summary>
                    <div className="mt-4 flex flex-col gap-4">
                        <Field label="Intensidade do kerning" value={`${(autoConfigOptions.kerningIntensity * 100).toFixed(0)}%`}>
                            <input
                                type="range"
                                min="0.3"
                                max="2"
                                step="0.1"
                                value={autoConfigOptions.kerningIntensity}
                                onChange={(e) => setAutoConfigOptions({...autoConfigOptions, kerningIntensity: parseFloat(e.target.value)})}
                                className="tool-slider w-full"
                            />
                        </Field>
                        <Field label="Altura-alvo" value={autoConfigOptions.targetHeight}>
                            <input
                                type="range"
                                min="500"
                                max="900"
                                step="50"
                                value={autoConfigOptions.targetHeight}
                                onChange={(e) => setAutoConfigOptions({...autoConfigOptions, targetHeight: parseInt(e.target.value)})}
                                className="tool-slider w-full"
                            />
                        </Field>
                        <Field label="Margem lateral" value={autoConfigOptions.sideMargin}>
                            <input
                                type="range"
                                min="20"
                                max="150"
                                step="10"
                                value={autoConfigOptions.sideMargin}
                                onChange={(e) => setAutoConfigOptions({...autoConfigOptions, sideMargin: parseInt(e.target.value)})}
                                className="tool-slider w-full"
                            />
                        </Field>
                    </div>
                </details>
            </Sheet>
        </div>
    );
};

export default CompactEditor;

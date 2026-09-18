
import React, { useState, useEffect, useMemo } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { Card, Field, IconButton, Segmented, TextTabs, Sheet } from './ui';
import { cx } from './cx';
import { GlyphData, FontMetadata, ShapeCategory, DEFAULT_TRACKING_PROFILES } from '../types';
import { generateSmartAutoKerning, resolveKerningValue } from '../services/kerningService';
import { autoCenterGlyph, enforceMonospaceWidth, scaleGlyphWidth } from '../services/metricsService';
import { computeGlyphSequenceLayout } from '../services/layoutService';
import { measurePath } from '../services/importService';
import { useNotice } from '../contexts/NoticeContext';
import { useKerningManager } from '../hooks/useKerningManager';
import { KERNING_TEMPLATES, applyKerningTemplate, mergeTemplateWithGeometry, KerningTemplate } from '../services/kerningTemplates';
import { 
    generateProfessionalKerning, 
    generateHybridKerning, 
    analyzeKerningQuality,
    FONT_STYLE_PROFILES,
    FontStyle,
    KerningPair 
} from '../services/professionalKerningService';

interface SpacingManagerProps {
  isOpen: boolean;
  onClose: () => void;
  glyphs: GlyphData[];
  onUpdateGlyphs: (newGlyphs: GlyphData[]) => void;
  metadata: FontMetadata;
    onUpdateMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
  onUpdateMembers: (parentChar: string, memberChars: string) => void;
  isDarkMode?: boolean;
    focusGlyphChar?: string | null;
    onConsumeKerningFocus?: () => void;
}

const PREVIEW_FONT_SIZE_PT = 64;
const formatGapValue = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

const SpacingManager: React.FC<SpacingManagerProps> = ({ 
        isOpen, onClose, glyphs, onUpdateGlyphs, metadata, onUpdateMetadata, onUpdateMembers, isDarkMode, focusGlyphChar, onConsumeKerningFocus 
}) => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'KERNING'>('METRICS');
  const [targetPadding, setTargetPadding] = useState(50);
  const [fixedWidth, setFixedWidth] = useState(600);
  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});
    const [metricsSearch, setMetricsSearch] = useState('');
    const [testString, setTestString] = useState("");
    const [selectedPair, setSelectedPair] = useState("");
    const [currentKernValue, setCurrentKernValue] = useState(0);
    const [autoKernIntensity, setAutoKernIntensity] = useState(1.0);
    const [kerningProfile, setKerningProfile] = useState<FontMetadata['kerningProfile']>(metadata.kerningProfile || 'sans');
        const [kerningFilterChar, setKerningFilterChar] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [templateScale, setTemplateScale] = useState(1.0);
    const [blendWithGeometry, setBlendWithGeometry] = useState(false);
    const [blendFactor, setBlendFactor] = useState(0.5);
    // Kerning profissional
    const [kerningMode, setKerningMode] = useState<'smart' | 'professional' | 'hybrid'>('smart');
    const [fontStyle, setFontStyle] = useState<FontStyle>('neo-grotesque');
    const { pushNotice } = useNotice();
    const { applyKerningMap, updatePair, removePair, clearAllPairs } = useKerningManager(onUpdateMetadata);

  useEffect(() => {
      if (selectedPair.length === 2 && metadata.kerning[selectedPair] !== undefined) {
          setCurrentKernValue(metadata.kerning[selectedPair]);
      } else {
          setCurrentKernValue(0);
      }
  }, [selectedPair, metadata.kerning]);


  useEffect(() => {
            if (!focusGlyphChar) return;
            setActiveTab('KERNING');
            setKerningFilterChar(focusGlyphChar);
        const targetPair = Object.keys(metadata.kerning).find(pair => pair.includes(focusGlyphChar));
        if (targetPair) {
                setSelectedPair(targetPair);
                setTestString(targetPair);
        } else {
                setSelectedPair(focusGlyphChar);
                setTestString(focusGlyphChar);
        }
            if (onConsumeKerningFocus) onConsumeKerningFocus();
    }, [focusGlyphChar, metadata.kerning, onConsumeKerningFocus]);

    useEffect(() => {
            setKerningProfile(metadata.kerningProfile || 'sans');
    }, [metadata.kerningProfile]);

    const getGlyph = (char: string) => glyphs.find(g => g.char === char);

    const applyAutoCenter = () => {
        const updated = glyphs.map(g => autoCenterGlyph(g, targetPadding));
        onUpdateGlyphs(updated);
    };
    const applyMonospace = () => {
            const updated = glyphs.map(g => enforceMonospaceWidth(g, fixedWidth));
            onUpdateGlyphs(updated);
    };
    const applyScale = () => {
            const updated = glyphs.map(g => scaleGlyphWidth(g, scaleFactor));
            onUpdateGlyphs(updated);
    };
  const handleGroupLChange = (char: string, group: string) => { const updated = glyphs.map(g => g.char === char ? { ...g, groups: { ...g.groups, left: group.toUpperCase() } } : g); onUpdateGlyphs(updated); };
  const handleGroupRChange = (char: string, group: string) => { const updated = glyphs.map(g => g.char === char ? { ...g, groups: { ...g.groups, right: group.toUpperCase() } } : g); onUpdateGlyphs(updated); };
  const handleShapeChange = (char: string, side: 'shapeLeft' | 'shapeRight', val: ShapeCategory) => { const updated = glyphs.map(g => g.char === char ? { ...g, [side]: val } : g); onUpdateGlyphs(updated); };
  const handleMemberAdd = (char: string) => { const val = memberInputs[char] || ""; if (val) { onUpdateMembers(char, val); setMemberInputs(prev => ({ ...prev, [char]: "" })); } };
  const handleMemberSubmit = (char: string, e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleMemberAdd(char); };
  const handleMemberInputChange = (char: string, val: string) => { setMemberInputs(prev => ({ ...prev, [char]: val })); };
    const handleRemoveShare = (char: string) => {
            const updated = glyphs.map(g => g.char === char ? { ...g, inheritsFrom: null } : g);
            onUpdateGlyphs(updated);
    };
    const handleTestInputChange = (value: string) => {
        // Preserve user casing so we can kern lowercase/uppercase/accent combos distinctly.
        setTestString(value);
        if (value.length >= 2) {
            setSelectedPair(value.slice(-2));
        } else {
            setSelectedPair(value);
        }
    };
    const syncPairVariants = (pair: string, val: number) => {
        if (pair.length !== 2) return;
        // Always set the typed pair; if unicase, also mirror casing variants so lower/upper render equally.
        const variants = new Set<string>([pair]);
        if (metadata.isUnicase) {
            variants.add(pair.toUpperCase());
            variants.add(pair.toLowerCase());
        }
        variants.forEach(p => updatePair(p, val));
    };

    const handleKernChange = (val: number) => {
        setCurrentKernValue(val);
        if (selectedPair.length === 2) {
            syncPairVariants(selectedPair, val);
        }
    };
    const handleDeletePair = () => {
        if (selectedPair.length === 2) {
            removePair(selectedPair);
            if (metadata.isUnicase) {
                removePair(selectedPair.toUpperCase());
                removePair(selectedPair.toLowerCase());
            }
            setSelectedPair("");
            setCurrentKernValue(0);
        }
    };
    const selectPair = (pair: string) => {
        const normalized = pair || '';
        setSelectedPair(normalized);
        setTestString(normalized);
    };
    const handleKerningProfileChange = (value: FontMetadata['kerningProfile']) => {
        setKerningProfile(value);
        onUpdateMetadata(prev => ({ ...prev, kerningProfile: value }));
    };

    const handleAutoKern = () => {
        let newKerning: Record<string, number> = {};
        let message = '';

        switch (kerningMode) {
            case 'smart':
                newKerning = generateSmartAutoKerning(glyphs, metadata.kerning, {
                    intensity: autoKernIntensity,
                    profile: kerningProfile as any,
                    includeNumbers: true,
                    includePunctuation: true,
                    onlyMissingPairs: true,
                });
                // Fallback to professional if smart returns too few pairs
                if (Object.keys(newKerning).length < 10) {
                    const profPairs = generateProfessionalKerning(glyphs, {
                        style: fontStyle,
                        intensity: autoKernIntensity,
                        includeNumbers: true,
                        includePunctuation: true,
                    });
                    profPairs.forEach(p => {
                        const key = `${p.left}${p.right}`;
                        if (newKerning[key] === undefined) {
                            newKerning[key] = p.value;
                        }
                    });
                    message = `Kerning geométrico com reforço profissional: ${Object.keys(newKerning).length} pares gerados.`;
                } else {
                    message = `Kerning geométrico: ${Object.keys(newKerning).length} pares gerados.`;
                }
                break;
            case 'professional': {
                const profPairs = generateProfessionalKerning(glyphs, {
                    style: fontStyle,
                    intensity: autoKernIntensity,
                    includeNumbers: true,
                    includePunctuation: true,
                });
                const quality = analyzeKerningQuality(glyphs, profPairs);
                // Converter KerningPair[] para Record<string, number>
                newKerning = { ...metadata.kerning };
                profPairs.forEach(p => {
                    newKerning[`${p.left}${p.right}`] = p.value;
                });
                message = `Kerning profissional (${fontStyle}): ${profPairs.length} pares, nota ${quality.grade}.`;
                break;
            }
            case 'hybrid': {
                const hybridPairs = generateHybridKerning(glyphs, {
                    style: fontStyle,
                    intensity: autoKernIntensity,
                    includeNumbers: true,
                    includePunctuation: true,
                });
                const quality = analyzeKerningQuality(glyphs, hybridPairs);
                newKerning = { ...metadata.kerning };
                hybridPairs.forEach(p => {
                    newKerning[`${p.left}${p.right}`] = p.value;
                });
                message = `Kerning híbrido (${fontStyle}): ${hybridPairs.length} pares, nota ${quality.grade}.`;
                break;
            }
        }

        applyKerningMap(newKerning);
        pushNotice(message, 'success');
    };

    // Manter compatibilidade com código antigo
    const handleSmartAutoKern = handleAutoKern;

    const handleApplyTemplate = () => {
        const template = KERNING_TEMPLATES.find(t => t.id === selectedTemplate);
        if (!template) {
            pushNotice('Selecione um modelo primeiro.', 'warning');
            return;
        }

        let newKerning = applyKerningTemplate(template, metadata.kerning, {
            scale: templateScale,
            overwrite: true,
        });

        if (blendWithGeometry) {
            const geometricKerning = generateSmartAutoKerning(glyphs, {}, {
                intensity: autoKernIntensity,
                profile: kerningProfile as any,
                includeNumbers: true,
                includePunctuation: true,
                onlyMissingPairs: false,
            });
            newKerning = mergeTemplateWithGeometry(newKerning, geometricKerning, blendFactor);
        }

        applyKerningMap(newKerning);
        pushNotice(`Modelo "${template.name}" aplicado com ${Object.keys(newKerning).length} pares.`, 'success');
    };
    const handleResetAutoKern = () => {
        clearAllPairs();
        setSelectedPair("");
        setTestString("");
        setCurrentKernValue(0);
        pushNotice('Todos os pares de kerning foram zerados.', 'info');
    };

    const handleResetSelectedPair = () => {
        if (selectedPair.length < 2) {
            pushNotice('Digite pelo menos dois caracteres para zerar um par.', 'warning');
            return;
        }
        const exists = metadata.kerning[selectedPair] !== undefined;
        removePair(selectedPair);
        setCurrentKernValue(0);
        pushNotice(
            exists ? `Par ${selectedPair} zerado.` : `Nenhum ajuste ativo para ${selectedPair}.`,
            'info'
        );
    };

    const handleInlineKerningInput = (pair: string, value: number) => {
        syncPairVariants(pair, value);
    };

    const leftG = selectedPair.length >= 1 ? getGlyph(selectedPair[0]) : null;
    const rightG = selectedPair.length >= 2 ? getGlyph(selectedPair[1]) : null;
    const filteredPairs = useMemo(() => {
      const entries = Object.entries(metadata.kerning);
            const subset = kerningFilterChar
          ? entries.filter(([pair]) => pair.includes(kerningFilterChar))
          : entries;
      return subset.sort((a, b) => a[0].localeCompare(b[0]));
    }, [metadata.kerning, kerningFilterChar]);
        const baseKerningValue = selectedPair.length === 2 ? (metadata.kerning[selectedPair] ?? 0) : 0;
    const previewKerningValue = leftG && rightG
            ? resolveKerningValue(leftG, rightG, metadata.kerning)
            : baseKerningValue;
    const biasContribution = previewKerningValue - baseKerningValue;

    const glyphMap = useMemo(() => new Map(glyphs.map(g => [g.char, g])), [glyphs]);
    const trackingProfile = useMemo(() => {
        const baseProfile = metadata.trackingProfile ?? DEFAULT_TRACKING_PROFILES['body-text'];
        return {
            ...baseProfile,
            defaultTracking: metadata.tracking,
            rules: { ...baseProfile.rules },
        };
    }, [metadata.tracking, metadata.trackingProfile]);

    const kerningContextLayout = useMemo(() => {
        if (!testString) return null;
        return computeGlyphSequenceLayout({
            sequence: testString,
            glyphMap,
            kerning: metadata.kerning,
            trackingProfile,
            fontSizePt: PREVIEW_FONT_SIZE_PT,
            baselineY: 900,
            viewHeight: 1800,
            padding: 400,
        });
    }, [glyphMap, testString, metadata.kerning, trackingProfile]);

    const kerningNodeBounds = useMemo(() => {
        if (!kerningContextLayout) return null;
        const bounds = new Map<number, { left: number; right: number; top: number; bottom: number }>();
        let minY = Infinity;
        let maxY = -Infinity;

        kerningContextLayout.nodes.forEach((node, index) => {
            if (!node.pathData) return;
            const rawBounds = measurePath(node.pathData);
            const width = (rawBounds.width ?? 0) * (node.scale ?? 1);
            const height = (rawBounds.height ?? 0) * (node.scale ?? 1);
            const left = node.x + node.leftSideBearing + rawBounds.x * (node.scale ?? 1);
            const top = kerningContextLayout.baselineY + node.baselineOffset + rawBounds.y * (node.scale ?? 1);
            const right = left + width;
            const bottom = top + height;

            if (!Number.isFinite(left) || !Number.isFinite(top)) return;
            bounds.set(index, { left, right, top, bottom });
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, bottom);
        });

        if (!bounds.size || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
            return null;
        }

        return { bounds, minY, maxY };
    }, [kerningContextLayout]);

    const kerningGapBandY = kerningContextLayout ? Math.max(140, kerningContextLayout.baselineY - 320) : 0;
    const fallbackOverlayBand = kerningContextLayout ? {
        top: kerningContextLayout.baselineY - 280,
        bottom: kerningContextLayout.baselineY + 60,
    } : null;
    const kerningOverlayBand = kerningNodeBounds ? {
        top: kerningNodeBounds.minY - 24,
        bottom: kerningNodeBounds.maxY + 24,
    } : fallbackOverlayBand;
    const kerningOverlayHeight = kerningOverlayBand ? Math.max(kerningOverlayBand.bottom - kerningOverlayBand.top, 80) : 0;

    if (!isOpen) return null;

    const canResetAutoKern = Object.keys(metadata.kerning).length > 0;
    const metricsTerm = metricsSearch.trim().toLowerCase();
    const visibleGlyphs = glyphs
        .filter(g => g.pathData)
        .filter(g => {
            if (!metricsTerm) return true;
            return g.char.toLowerCase().includes(metricsTerm) || (g.name || '').toLowerCase().includes(metricsTerm);
        });
    const templateGroups: { category: KerningTemplate['category']; label: string }[] = [
        { category: 'sans', label: 'Sem serifa' },
        { category: 'serif', label: 'Serifada' },
        { category: 'geometric', label: 'Geométrica' },
        { category: 'display', label: 'Display' },
        { category: 'humanist', label: 'Humanista' },
        { category: 'script', label: 'Script e manuscrita' },
        { category: 'slab', label: 'Slab serif' },
        { category: 'condensed', label: 'Condensada' },
        { category: 'mono', label: 'Monoespaçada' },
    ];
    const shapeOptions = (
        <>
            <option value="straight">Reta</option>
            <option value="round">Redonda</option>
            <option value="diagonal">Diagonal</option>
            <option value="overhang">Saliente</option>
        </>
    );

    return (
        <Sheet
            open={isOpen}
            onClose={onClose}
            full
            size="max-w-[1240px]"
            zIndex="z-[9999]"
            title="Espaçamento e kerning"
            description="Métricas dos glifos, grupos de classe e ajuste de pares."
            bodyClassName="bg-background hairline-t pt-5"
            footer={
                <button type="button" onClick={onClose} className="ctl ctl-filled">Concluir</button>
            }
        >
            <div className="flex flex-col gap-5 min-w-0">
                <TextTabs<'METRICS' | 'KERNING'>
                    ariaLabel="Seções"
                    items={[
                        { value: 'METRICS', label: 'Métricas' },
                        { value: 'KERNING', label: 'Kerning' },
                    ]}
                    value={activeTab}
                    onChange={setActiveTab}
                />

                {activeTab === 'METRICS' && (
                    <div className="flex flex-col gap-5 min-w-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <Card label="Centralizar" className="p-5">
                                <Field label="Margem lateral (px)">
                                    <input type="number" value={targetPadding} onChange={e => setTargetPadding(parseInt(e.target.value))} className="field tabular" />
                                </Field>
                                <button type="button" onClick={applyAutoCenter} className="ctl ctl-outline w-full">Aplicar</button>
                            </Card>
                            <Card label="Monoespaçar" className="p-5">
                                <Field label="Largura fixa (px)">
                                    <input type="number" value={fixedWidth} onChange={e => setFixedWidth(parseInt(e.target.value))} className="field tabular" />
                                </Field>
                                <button type="button" onClick={applyMonospace} className="ctl ctl-outline w-full">Aplicar</button>
                            </Card>
                            <Card label="Escalar tudo" className="p-5">
                                <Field label="Multiplicador">
                                    <input type="number" step="0.1" value={scaleFactor} onChange={e => setScaleFactor(parseFloat(e.target.value))} className="field tabular" />
                                </Field>
                                <button type="button" onClick={applyScale} className="ctl ctl-outline w-full">Aplicar</button>
                            </Card>
                        </div>

                        <div className="flex flex-col gap-4 min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="label">Dados dos glifos</span>
                                <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
                                    <input
                                        type="text"
                                        value={metricsSearch}
                                        onChange={(e) => setMetricsSearch(e.target.value)}
                                        placeholder="Buscar glifo"
                                        aria-label="Buscar glifo"
                                        className="field"
                                    />
                                    {metricsSearch && (
                                        <IconButton label="Limpar busca" variant="plain" onClick={() => setMetricsSearch('')}>
                                            <X className="w-4 h-4" aria-hidden="true" />
                                        </IconButton>
                                    )}
                                </div>
                                <span className="text-[13px] text-muted-foreground tabular">{visibleGlyphs.length} encontrados</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {visibleGlyphs.map(g => {
                                    const sharers = glyphs.filter(other => other.inheritsFrom === g.char);
                                    return (
                                        <div key={g.char} className="material-card p-4 flex flex-col gap-3 min-w-0">
                                            <div className="flex items-end gap-3">
                                                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md bg-canvas text-[20px] font-normal text-foreground">{g.char}</div>
                                                <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                                                    <Field label="Grupo esquerdo">
                                                        <input type="text" value={g.groups.left || ''} placeholder={g.char} onChange={(e) => handleGroupLChange(g.char, e.target.value)} className="field field-sm" />
                                                    </Field>
                                                    <Field label="Grupo direito">
                                                        <input type="text" value={g.groups.right || ''} placeholder={g.char} onChange={(e) => handleGroupRChange(g.char, e.target.value)} className="field field-sm" />
                                                    </Field>
                                                </div>
                                            </div>
                                            {g.inheritsFrom && (
                                                <div className="flex items-center justify-between gap-2 rounded-md bg-fill px-2.5 py-1.5 text-[12px] text-foreground">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-pill bg-foreground" aria-hidden="true" />
                                                        Herda de {g.inheritsFrom}
                                                    </span>
                                                    <button type="button" onClick={() => handleRemoveShare(g.char)} className="ctl ctl-plain ctl-sm">Remover</button>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Field label="Forma à esquerda">
                                                    <select value={g.shapeLeft} onChange={(e) => handleShapeChange(g.char, 'shapeLeft', e.target.value as any)} className="field field-sm">{shapeOptions}</select>
                                                </Field>
                                                <Field label="Forma à direita">
                                                    <select value={g.shapeRight} onChange={(e) => handleShapeChange(g.char, 'shapeRight', e.target.value as any)} className="field field-sm">{shapeOptions}</select>
                                                </Field>
                                            </div>
                                            <div className="flex items-end gap-3">
                                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                                    <span className="text-[12px] text-muted-foreground">Compartilhar com</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={memberInputs[g.char] || ''}
                                                            placeholder="ex.: VT"
                                                            aria-label={`Compartilhar ${g.char} com`}
                                                            onChange={(e) => handleMemberInputChange(g.char, e.target.value)}
                                                            onKeyDown={(e) => handleMemberSubmit(g.char, e)}
                                                            className="field field-sm"
                                                        />
                                                        <IconButton label="Adicionar" onClick={() => handleMemberAdd(g.char)}>
                                                            <Plus className="w-4 h-4" aria-hidden="true" />
                                                        </IconButton>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                                    <span className="text-[20px] font-normal leading-none tabular text-foreground">{g.advanceWidth}</span>
                                                    <span className="text-[12px] text-muted-foreground">Largura</span>
                                                </div>
                                            </div>
                                            {sharers.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[12px] text-muted-foreground">Compartilhando com</span>
                                                    {sharers.map(other => (
                                                        <span key={`${g.char}-${other.char}`} className="chip chip-outline">{other.char}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'KERNING' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 min-w-0 items-start">
                        <div className="flex flex-col gap-5 min-w-0">
                            <Card
                                label="Par de teste"
                                className="p-5"
                                actions={
                                    <button type="button" onClick={handleResetSelectedPair} disabled={selectedPair.length < 2} className="ctl ctl-outline ctl-sm disabled:opacity-40">
                                        Zerar par
                                    </button>
                                }
                            >
                                <input
                                    type="text"
                                    maxLength={32}
                                    value={testString}
                                    onChange={(e) => handleTestInputChange(e.target.value)}
                                    placeholder="Digite letras para ajustar"
                                    aria-label="Texto de teste"
                                    className="field h-16 text-center text-[28px] font-normal placeholder:text-[16px]"
                                />
                                <p className="text-[13px] text-muted-foreground">
                                    {selectedPair.length >= 2
                                        ? <>Par ativo: <span className="text-foreground">{selectedPair}</span></>
                                        : 'Digite duas letras ou mais para ver cada espaço entre elas. Os valores podem ser editados logo abaixo.'}
                                </p>
                            </Card>

                            <Card label="Pré-visualização" className="p-5">
                                {kerningContextLayout ? (
                                    <>
                                        <div className="bg-canvas rounded-xl p-3 flex items-center justify-center">
                                            <svg
                                                viewBox={kerningContextLayout.viewBox}
                                                className="w-full max-w-3xl h-56 mx-auto text-foreground fill-current"
                                                preserveAspectRatio="xMidYMid meet"
                                            >
                                                <line
                                                    x1={kerningContextLayout.viewStart}
                                                    y1={kerningContextLayout.baselineY}
                                                    x2={kerningContextLayout.viewStart + kerningContextLayout.viewWidth}
                                                    y2={kerningContextLayout.baselineY}
                                                    stroke="currentColor"
                                                    strokeOpacity={0.25}
                                                    strokeWidth={10}
                                                    strokeDasharray="14,14"
                                                />
                                                {kerningContextLayout.gaps.map((gap, idx) => {
                                                    const negative = gap.gap < 0;
                                                    const leftBounds = kerningNodeBounds?.bounds.get(gap.leftIndex);
                                                    const rightBounds = kerningNodeBounds?.bounds.get(gap.rightIndex);
                                                    const startX = leftBounds ? leftBounds.right : gap.startX;
                                                    const endX = rightBounds ? rightBounds.left : gap.endX;
                                                    const mid = (startX + endX) / 2;
                                                    const overlayTop = kerningOverlayBand?.top ?? (kerningGapBandY - 80);
                                                    const overlayBottom = kerningOverlayBand?.bottom ?? (kerningGapBandY + 40);
                                                    const overlayHeight = kerningOverlayBand ? kerningOverlayHeight : Math.max(overlayBottom - overlayTop, 80);
                                                    const rectX = Math.min(startX, endX);
                                                    const rectWidth = Math.max(Math.abs(endX - startX), 8);
                                                    const fillOpacity = negative ? 0.16 : 0.07;
                                                    const strokeOpacity = negative ? 0.6 : 0.35;
                                                    return (
                                                        <g key={`kerning-gap-${gap.leftChar}-${gap.rightChar}-${idx}`}>
                                                            <rect
                                                                x={rectX}
                                                                y={overlayTop}
                                                                width={rectWidth}
                                                                height={overlayHeight}
                                                                fill="currentColor"
                                                                fillOpacity={fillOpacity}
                                                                rx={12}
                                                            />
                                                            <line
                                                                x1={startX}
                                                                x2={startX}
                                                                y1={overlayTop}
                                                                y2={overlayBottom}
                                                                stroke="currentColor"
                                                                strokeWidth={3}
                                                                strokeOpacity={strokeOpacity}
                                                                strokeDasharray="4,6"
                                                            />
                                                            <line
                                                                x1={endX}
                                                                x2={endX}
                                                                y1={overlayTop}
                                                                y2={overlayBottom}
                                                                stroke="currentColor"
                                                                strokeWidth={3}
                                                                strokeOpacity={strokeOpacity}
                                                                strokeDasharray="4,6"
                                                            />
                                                            <line
                                                                x1={startX}
                                                                x2={endX}
                                                                y1={kerningGapBandY}
                                                                y2={kerningGapBandY}
                                                                stroke="currentColor"
                                                                strokeOpacity={negative ? 0.85 : 0.45}
                                                                strokeWidth={10}
                                                                strokeLinecap="round"
                                                            />
                                                            <text
                                                                x={mid}
                                                                y={kerningGapBandY - 18}
                                                                textAnchor="middle"
                                                                fontFamily="inherit"
                                                                fontSize={20}
                                                                fill="currentColor"
                                                            >
                                                                {formatGapValue(gap.gap)}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                                {kerningContextLayout.nodes.map((node, idx) => {
                                                    if (!node.pathData) return null;
                                                    return (
                                                        <g
                                                            key={`kerning-node-${node.char}-${idx}`}
                                                            transform={`translate(${node.x + node.leftSideBearing}, ${kerningContextLayout.baselineY + node.baselineOffset}) scale(${node.scale})`}
                                                        >
                                                            <path d={node.pathData} />
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                        </div>

                                        {selectedPair.length === 2 && (
                                            <div className="flex flex-col gap-4 hairline-b pb-5">
                                                <div className="flex flex-wrap items-end justify-between gap-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="label">Ajuste</span>
                                                        <span className="text-[28px] font-normal leading-[1.14] tabular text-foreground">
                                                            {previewKerningValue >= 0 ? `+${previewKerningValue}` : previewKerningValue}
                                                        </span>
                                                        <span className="text-[13px] text-muted-foreground">
                                                            {selectedPair} · desvio {biasContribution >= 0 ? `+${biasContribution}` : biasContribution}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => handleKernChange(currentKernValue - 10)} className="ctl ctl-outline ctl-sm tabular" aria-label="Diminuir 10">
                                                            <Minus className="w-3.5 h-3.5" aria-hidden="true" />10
                                                        </button>
                                                        <button type="button" onClick={() => handleKernChange(currentKernValue + 10)} className="ctl ctl-outline ctl-sm tabular" aria-label="Aumentar 10">
                                                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />10
                                                        </button>
                                                        <button type="button" onClick={() => handleDeletePair()} className="ctl ctl-danger ctl-sm">
                                                            Excluir par
                                                        </button>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="-300"
                                                    max="300"
                                                    step="5"
                                                    value={currentKernValue}
                                                    onChange={(e) => handleKernChange(parseInt(e.target.value))}
                                                    aria-label={`Kerning de ${selectedPair}`}
                                                    className="tool-slider w-full"
                                                />
                                            </div>
                                        )}

                                        {kerningContextLayout.gaps.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {kerningContextLayout.gaps.map((gap, idx) => {
                                                    const pairKey = `${gap.leftChar}${gap.rightChar}`;
                                                    const normalizedPairKey = pairKey.toUpperCase();
                                                    const kerningValue = metadata.kerning?.[normalizedPairKey] ?? 0;
                                                    const on = selectedPair === normalizedPairKey;
                                                    return (
                                                        <div
                                                            key={`kerning-gap-card-${gap.leftChar}-${gap.rightChar}-${idx}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-pressed={on}
                                                            onClick={() => setSelectedPair(normalizedPairKey)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPair(normalizedPairKey); } }}
                                                            className={cx(
                                                                'rounded-lg p-3 flex flex-col gap-2 cursor-pointer transition-colors duration-fast ease-out',
                                                                on ? 'bg-primary text-primary-foreground' : 'bg-fill text-foreground hover:bg-fill-2'
                                                            )}
                                                        >
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <span className="text-[20px] font-normal leading-none">{gap.leftChar}{gap.rightChar}</span>
                                                                <span className={cx('text-[12px] tabular', on ? 'opacity-70' : 'text-muted-foreground')}>
                                                                    Espaço {formatGapValue(gap.gap)}
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={kerningValue}
                                                                onChange={(e) => handleInlineKerningInput(normalizedPairKey, parseFloat(e.target.value))}
                                                                onClick={(e) => e.stopPropagation()}
                                                                aria-label={`Kerning de ${normalizedPairKey}`}
                                                                className="field field-sm text-center tabular text-foreground"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[13px] text-muted-foreground text-center py-2">
                                                Digite pelo menos duas letras para ver ajustes de kerning.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <div className="h-48 bg-canvas rounded-xl flex items-center justify-center">
                                        <span className="text-[14px] text-muted-foreground">Digite um texto para pré-visualizar</span>
                                    </div>
                                )}
                            </Card>
                        </div>

                        <div className="flex flex-col gap-5 min-w-0">
                            <Card label="Modelos profissionais" className="p-5" bodyClassName="gap-4">
                                <Field label="Modelo">
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className="field"
                                    >
                                        <option value="">Selecione um modelo</option>
                                        {templateGroups.map(group => (
                                            <optgroup key={group.category} label={group.label}>
                                                {KERNING_TEMPLATES.filter(t => t.category === group.category).map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </Field>
                                {selectedTemplate && (
                                    <p className="text-[12px] text-muted-foreground">
                                        {KERNING_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                                    </p>
                                )}
                                <Field label="Escala" value={`${(templateScale * 100).toFixed(0)}%`}>
                                    <input type="range" min="0.5" max="1.5" step="0.05" value={templateScale} onChange={(e) => setTemplateScale(parseFloat(e.target.value))} className="tool-slider w-full" />
                                </Field>
                                <label className="flex items-center gap-2 text-[14px] text-foreground cursor-pointer">
                                    <input type="checkbox" checked={blendWithGeometry} onChange={(e) => setBlendWithGeometry(e.target.checked)} className="ctl-check" />
                                    Mesclar com a análise do SVG
                                </label>
                                {blendWithGeometry && (
                                    <Field label="Peso da geometria" value={`${(blendFactor * 100).toFixed(0)}%`}>
                                        <input type="range" min="0" max="1" step="0.1" value={blendFactor} onChange={(e) => setBlendFactor(parseFloat(e.target.value))} className="tool-slider w-full" />
                                    </Field>
                                )}
                                <button type="button" onClick={handleApplyTemplate} disabled={!selectedTemplate} className="ctl ctl-filled w-full disabled:opacity-40">
                                    Aplicar modelo
                                </button>
                            </Card>

                            <Card label="Kerning automático" className="p-5" bodyClassName="gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] text-muted-foreground">Modo</span>
                                    <Segmented<'smart' | 'professional' | 'hybrid'>
                                        ariaLabel="Modo de kerning"
                                        className="w-full [&>*]:flex-1"
                                        items={[
                                            { value: 'smart', label: 'Geométrico' },
                                            { value: 'professional', label: 'Profissional' },
                                            { value: 'hybrid', label: 'Híbrido' },
                                        ]}
                                        value={kerningMode}
                                        onChange={setKerningMode}
                                    />
                                    <p className="text-[12px] text-muted-foreground">
                                        {kerningMode === 'smart' && 'Análise geométrica do SVG, pelas formas detectadas.'}
                                        {kerningMode === 'professional' && 'Tabelas de fontes reais (Helvetica, Futura e outras).'}
                                        {kerningMode === 'hybrid' && 'Combina as tabelas profissionais com a geometria.'}
                                    </p>
                                </div>

                                {(kerningMode === 'professional' || kerningMode === 'hybrid') && (
                                    <Field label="Estilo tipográfico">
                                        <select
                                            value={fontStyle}
                                            onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                                            className="field"
                                        >
                                            <option value="geometric-sans">Geométrica sem serifa (Futura, Avenir)</option>
                                            <option value="humanist-sans">Humanista sem serifa (Frutiger, Myriad)</option>
                                            <option value="neo-grotesque">Neogrotesca (Helvetica, Arial)</option>
                                            <option value="serif-oldstyle">Serifada old style (Garamond)</option>
                                            <option value="serif-modern">Serifada moderna (Bodoni, Didot)</option>
                                            <option value="slab">Slab serif (Rockwell)</option>
                                            <option value="display">Display (decorativa)</option>
                                            <option value="script">Script (manuscrita)</option>
                                        </select>
                                    </Field>
                                )}

                                {kerningMode === 'smart' && (
                                    <Field label="Tipo de fonte">
                                        <select
                                            value={kerningProfile || 'sans'}
                                            onChange={(e) => handleKerningProfileChange(e.target.value as FontMetadata['kerningProfile'])}
                                            className="field"
                                        >
                                            <option value="display">Display</option>
                                            <option value="geometric">Geométrica</option>
                                            <option value="sans">Sem serifa</option>
                                            <option value="serif">Serifada</option>
                                            <option value="mono">Monoespaçada</option>
                                        </select>
                                    </Field>
                                )}

                                <Field label="Intensidade" value={`${(autoKernIntensity * 100).toFixed(0)}%`}>
                                    <input type="range" min="0" max="2" step="0.1" value={autoKernIntensity} onChange={(e) => setAutoKernIntensity(parseFloat(e.target.value))} className="tool-slider w-full" />
                                </Field>
                                <div className="flex flex-col gap-2">
                                    <button type="button" onClick={handleAutoKern} className="ctl ctl-tinted w-full">
                                        Aplicar kerning automático
                                    </button>
                                    <button type="button" onClick={handleResetAutoKern} disabled={!canResetAutoKern} className="ctl ctl-outline w-full disabled:opacity-40">
                                        Zerar todos os pares
                                    </button>
                                </div>
                            </Card>

                            <Card
                                label="Pares"
                                className="p-5"
                                bodyClassName="gap-3"
                                actions={<span className="chip tabular">{filteredPairs.length}/{Object.keys(metadata.kerning).length}</span>}
                            >
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={kerningFilterChar}
                                        onChange={(e) => setKerningFilterChar(e.target.value)}
                                        placeholder="Filtrar por par ou glifo"
                                        aria-label="Filtrar pares"
                                        className="field field-sm"
                                    />
                                    {kerningFilterChar && (
                                        <IconButton label="Limpar filtro" variant="plain" onClick={() => setKerningFilterChar('')}>
                                            <X className="w-4 h-4" aria-hidden="true" />
                                        </IconButton>
                                    )}
                                </div>
                                <div className="max-h-[420px] overflow-y-auto custom-scrollbar -mx-2.5 flex flex-col gap-0.5">
                                    {filteredPairs.length === 0 && (
                                        <p className="text-[13px] text-muted-foreground text-center py-6">
                                            Nenhum par{kerningFilterChar ? ` com ${kerningFilterChar}` : ''}.
                                        </p>
                                    )}
                                    {filteredPairs.map(([pair, val]) => (
                                        <button
                                            key={pair}
                                            type="button"
                                            onClick={() => selectPair(pair)}
                                            aria-pressed={selectedPair === pair}
                                            className={cx('row min-h-12 justify-between', selectedPair === pair && 'is-active')}
                                        >
                                            <span className="text-[20px] font-normal leading-none">{pair}</span>
                                            <span className="text-[20px] font-normal leading-none tabular">{val as number}</span>
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </Sheet>
    );
};

export default SpacingManager;

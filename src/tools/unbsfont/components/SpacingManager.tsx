
import React, { useState, useEffect, useMemo } from 'react';
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
                    message = `Smart + Fallback Pro: ${Object.keys(newKerning).length} pairs gerados.`;
                } else {
                    message = `Smart Auto-Kern: ${Object.keys(newKerning).length} pairs gerados.`;
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
                message = `Kerning Profissional (${fontStyle}): ${profPairs.length} pairs - Grade: ${quality.grade}`;
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
                message = `Kerning Hybrid (${fontStyle}): ${hybridPairs.length} pairs - Grade: ${quality.grade}`;
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
            pushNotice('Selecione um template primeiro.', 'warning');
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
        pushNotice(`Template "${template.name}" aplicado com ${Object.keys(newKerning).length} pairs.`, 'success');
    };
    const handleResetAutoKern = () => {
        clearAllPairs();
        setSelectedPair("");
        setTestString("");
        setCurrentKernValue(0);
        pushNotice('Todos os pairs de kerning foram resetados.', 'info');
    };

    const handleResetSelectedPair = () => {
        if (selectedPair.length < 2) {
            pushNotice('Digite pelo menos dois caracteres para resetar um par.', 'warning');
            return;
        }
        const exists = metadata.kerning[selectedPair] !== undefined;
        removePair(selectedPair);
        setCurrentKernValue(0);
        pushNotice(
            exists ? `O par ${selectedPair} foi resetado.` : `Nenhum ajuste ativo encontrado para ${selectedPair}.`,
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

  const bgMain = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const textMain = isDarkMode ? 'text-white' : 'text-black';
  const textSub = isDarkMode ? 'text-slate-500' : 'text-neutral-500';
  const borderMain = isDarkMode ? 'border-slate-800' : 'border-black';
  const cardBg = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-neutral-200';
  const inputBg = isDarkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-neutral-300 text-black';
  const btnSec = isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-neutral-300 hover:border-black text-neutral-500 hover:text-black';
    const canResetAutoKern = Object.keys(metadata.kerning).length > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
    <div className={`border rounded-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden ${bgMain} ${borderMain}`}>
        
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-neutral-200'}`}>
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('METRICS')} className={`text-sm uppercase tracking-wider font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'METRICS' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : textSub}`}>Metrics</button>
                <button onClick={() => setActiveTab('KERNING')} className={`text-sm uppercase tracking-wider font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'KERNING' ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : textSub}`}>Kerning</button>
            </div>
            <button onClick={onClose} className={`rounded-full p-2 transition-colors ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-neutral-100 text-black'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-slate-950' : 'bg-neutral-50'}`}>
            {activeTab === 'METRICS' && (
                <div className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <h4 className={`font-bold mb-2 uppercase text-xs ${textMain}`}>Auto Center</h4>
                            <div className="flex gap-2 mb-2">
                                <input type="number" value={targetPadding} onChange={e => setTargetPadding(parseInt(e.target.value))} className={`w-16 rounded px-2 font-bold ${inputBg}`} />
                                <span className={`${textSub} text-sm py-1`}>px padding</span>
                            </div>
                            <button onClick={applyAutoCenter} className={`w-full py-2 rounded text-sm font-bold ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>Apply</button>
                        </div>
                         <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <h4 className={`font-bold mb-2 uppercase text-xs ${textMain}`}>Monospace</h4>
                            <div className="flex gap-2 mb-2">
                                <input type="number" value={fixedWidth} onChange={e => setFixedWidth(parseInt(e.target.value))} className={`w-16 rounded px-2 font-bold ${inputBg}`} />
                                <span className={`${textSub} text-sm py-1`}>px width</span>
                            </div>
                            <button onClick={applyMonospace} className={`w-full py-2 rounded text-sm font-bold ${isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-neutral-200 text-black hover:bg-neutral-300'}`}>Apply</button>
                        </div>
                        <div className={`p-4 rounded-xl border ${cardBg}`}>
                            <h4 className={`font-bold mb-2 uppercase text-xs ${textMain}`}>Scale All</h4>
                            <div className="flex gap-2 mb-2">
                                <input type="number" step="0.1" value={scaleFactor} onChange={e => setScaleFactor(parseFloat(e.target.value))} className={`w-16 rounded px-2 font-bold ${inputBg}`} />
                                <span className={`${textSub} text-sm py-1`}>multiplier</span>
                            </div>
                            <button onClick={applyScale} className={`w-full py-2 rounded text-sm font-bold ${isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-neutral-200 text-black hover:bg-neutral-300'}`}>Apply</button>
                        </div>
                     </div>
                                         <div>
                         <h3 className={`font-black text-xl mb-4 tracking-tight ${textMain}`}>GLYPH DATA</h3>
                                                 <div className="flex items-center gap-3 mb-4">
                                                     <input
                                                         type="text"
                                                         value={metricsSearch}
                                                         onChange={(e) => setMetricsSearch(e.target.value)}
                                                         placeholder="Buscar glyph..."
                                                         className={`w-full max-w-sm rounded-lg border px-3 py-2 text-sm font-medium outline-none ${inputBg}`}
                                                     />
                                                     {metricsSearch && (
                                                         <button
                                                             onClick={() => setMetricsSearch('')}
                                                             className={`text-xs font-bold uppercase px-3 py-2 rounded border ${btnSec}`}
                                                         >
                                                             Limpar
                                                         </button>
                                                     )}
                                                    <div className={`text-[11px] ${textSub}`}>Encontrados: {glyphs.filter(g => g.pathData).filter(g => { if (!metricsSearch.trim()) return true; const term = metricsSearch.trim().toLowerCase(); return g.char.toLowerCase().includes(term) || (g.name || '').toLowerCase().includes(term); }).length}</div>
                                                 </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                                         {glyphs
                                                             .filter(g => g.pathData)
                                                             .filter(g => {
                                                                 if (!metricsSearch.trim()) return true;
                                                                 const term = metricsSearch.trim().toLowerCase();
                                                                 return g.char.toLowerCase().includes(term) || (g.name || '').toLowerCase().includes(term);
                                                             })
                                                             .map(g => (
                                 <div key={g.char} className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-white' : 'bg-white border-neutral-200 hover:border-black'}`}>
                                     <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded font-bold text-lg font-mono ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>{g.char}</div>
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <div><label className={`text-[9px] uppercase font-bold ${textSub}`}>L-Group</label><input type="text" value={g.groups.left || ''} placeholder={g.char} onChange={(e) => handleGroupLChange(g.char, e.target.value)} className={`w-full rounded px-2 py-1 text-sm font-bold outline-none uppercase ${inputBg}`}/></div>
                                            <div><label className={`text-[9px] uppercase font-bold ${textSub}`}>R-Group</label><input type="text" value={g.groups.right || ''} placeholder={g.char} onChange={(e) => handleGroupRChange(g.char, e.target.value)} className={`w-full rounded px-2 py-1 text-sm font-bold outline-none uppercase ${inputBg}`}/></div>
                                        </div>
                                     </div>
                                     {g.inheritsFrom && (
                                         <div className={`flex items-center justify-between text-[10px] font-bold uppercase px-2 py-1 rounded ${isDarkMode ? 'bg-amber-500/10 text-amber-200 border border-amber-500/40' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                             <span>Herda de {g.inheritsFrom}</span>
                                             <button onClick={() => handleRemoveShare(g.char)} className={`text-[9px] underline ${isDarkMode ? 'text-amber-200' : 'text-amber-600'}`}>Remover</button>
                                         </div>
                                     )}
                                     <div className={`flex gap-2 p-1.5 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                                         <div className="flex-1"><label className={`text-[8px] block font-bold uppercase ${textSub}`}>Shape Left</label><select value={g.shapeLeft} onChange={(e) => handleShapeChange(g.char, 'shapeLeft', e.target.value as any)} className={`w-full bg-transparent text-[10px] font-medium outline-none ${textMain}`}><option value="straight">Straight</option><option value="round">Round</option><option value="diagonal">Diagonal</option><option value="overhang">Overhang</option></select></div>
                                         <div className={`w-px ${isDarkMode ? 'bg-slate-600' : 'bg-neutral-300'}`}></div>
                                         <div className="flex-1 text-right"><label className={`text-[8px] block font-bold uppercase ${textSub}`}>Shape Right</label><select value={g.shapeRight} onChange={(e) => handleShapeChange(g.char, 'shapeRight', e.target.value as any)} className={`w-full bg-transparent text-[10px] font-medium outline-none text-right ${textMain}`}><option value="straight">Straight</option><option value="round">Round</option><option value="diagonal">Diagonal</option><option value="overhang">Overhang</option></select></div>
                                     </div>
                                     <div className="flex gap-2">
                                        <div className="flex-1"><label className={`text-[9px] uppercase font-bold ${textSub}`}>Share With</label><div className="flex"><input type="text" value={memberInputs[g.char] || ''} placeholder="e.g. VT" onChange={(e) => handleMemberInputChange(g.char, e.target.value)} onKeyDown={(e) => handleMemberSubmit(g.char, e)} className={`w-full border border-r-0 rounded-l px-2 py-1 text-xs font-medium outline-none ${inputBg}`}/><button onClick={() => handleMemberAdd(g.char)} className={`px-2 rounded-r text-xs font-bold ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>+</button></div></div>
                                        <div className="flex flex-col text-right justify-end"><span className={`text-[10px] font-bold uppercase ${textSub}`}>Width</span><span className={`text-xs font-mono font-bold ${textMain}`}>{g.advanceWidth}</span></div>
                                     </div>
                                     {glyphs.some(other => other.inheritsFrom === g.char) && (
                                         <div className="flex flex-wrap gap-1 text-[10px] uppercase">
                                             <span className={`${textSub} font-bold`}>Compartilhando com:</span>
                                             {glyphs.filter(other => other.inheritsFrom === g.char).map(other => (
                                                 <span key={`${g.char}-${other.char}`} className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${isDarkMode ? 'border-slate-600 text-white' : 'border-neutral-300 text-black'}`}>{other.char}</span>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>
            )}

            {activeTab === 'KERNING' && (
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex flex-col lg:flex-row gap-8 h-full">
                        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
                            <div className={`p-4 rounded-2xl border flex flex-col gap-3 relative ${cardBg}`}>
                                <label className={`text-xs font-bold absolute top-4 left-4 uppercase ${textSub}`}>Test Pair</label>
                                <button
                                    onClick={handleResetSelectedPair}
                                    disabled={selectedPair.length < 2}
                                    className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full absolute top-3 right-3 border transition-colors ${selectedPair.length < 2
                                        ? isDarkMode ? 'border-slate-700 text-slate-600 cursor-not-allowed' : 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                                        : isDarkMode ? 'border-white/40 text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white'
                                    }`}
                                >
                                    Resetar Par
                                </button>
                                <input 
                                    type="text"
                                    maxLength={32}
                                    value={testString}
                                    onChange={(e) => handleTestInputChange(e.target.value)}
                                    placeholder="Digite letras para ajustar"
                                    className={`text-4xl bg-transparent text-center outline-none font-mono tracking-[0.4em] w-full uppercase py-2 font-black ${textMain} placeholder-neutral-500`}
                                />
                                {selectedPair.length >= 2 && (
                                    <p className={`text-[11px] text-center font-mono uppercase ${textSub}`}>
                                        Par ativo: {selectedPair}
                                    </p>
                                )}
                            </div>
                            
                            <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
                                <p className={`text-[11px] ${textSub}`}>
                                    Type 2 or more letters to preview each consecutive spacing. Values can be edited directly below.
                                </p>
                                {kerningContextLayout ? (
                                    <>
                                        <div className={`border rounded-xl p-3 flex items-center justify-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-neutral-200'}`}>
                                            <svg
                                                viewBox={kerningContextLayout.viewBox}
                                                className={`w-full max-w-3xl h-56 mx-auto ${isDarkMode ? 'fill-white' : 'fill-black'}`}
                                                preserveAspectRatio="xMidYMid meet"
                                            >
                                                <line
                                                    x1={kerningContextLayout.viewStart}
                                                    y1={kerningContextLayout.baselineY}
                                                    x2={kerningContextLayout.viewStart + kerningContextLayout.viewWidth}
                                                    y2={kerningContextLayout.baselineY}
                                                    stroke={isDarkMode ? '#475569' : '#94a3b8'}
                                                    strokeWidth={10}
                                                    strokeDasharray="14,14"
                                                />
                                                {kerningContextLayout.gaps.map((gap, idx) => {
                                                    const color = gap.gap >= 0 ? (isDarkMode ? '#4ade80' : '#16a34a') : (isDarkMode ? '#fb7185' : '#dc2626');
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
                                                    const fillOpacity = gap.gap >= 0 ? (isDarkMode ? 0.18 : 0.12) : (isDarkMode ? 0.25 : 0.18);
                                                    const strokeOpacity = isDarkMode ? 0.65 : 0.55;
                                                    return (
                                                        <g key={`kerning-gap-${gap.leftChar}-${gap.rightChar}-${idx}`}>
                                                            <rect
                                                                x={rectX}
                                                                y={overlayTop}
                                                                width={rectWidth}
                                                                height={overlayHeight}
                                                                fill={color}
                                                                fillOpacity={fillOpacity}
                                                                rx={12}
                                                            />
                                                            <line
                                                                x1={startX}
                                                                x2={startX}
                                                                y1={overlayTop}
                                                                y2={overlayBottom}
                                                                stroke={color}
                                                                strokeWidth={3}
                                                                strokeOpacity={strokeOpacity}
                                                                strokeDasharray="4,6"
                                                            />
                                                            <line
                                                                x1={endX}
                                                                x2={endX}
                                                                y1={overlayTop}
                                                                y2={overlayBottom}
                                                                stroke={color}
                                                                strokeWidth={3}
                                                                strokeOpacity={strokeOpacity}
                                                                strokeDasharray="4,6"
                                                            />
                                                            <line
                                                                x1={startX}
                                                                x2={endX}
                                                                y1={kerningGapBandY}
                                                                y2={kerningGapBandY}
                                                                stroke={color}
                                                                strokeWidth={10}
                                                                strokeLinecap="round"
                                                            />
                                                            <text
                                                                x={mid}
                                                                y={kerningGapBandY - 18}
                                                                textAnchor="middle"
                                                                fontFamily="monospace"
                                                                fontSize={20}
                                                                fill={isDarkMode ? '#f8fafc' : '#1f2937'}
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
                                            <div className={`border rounded-xl p-4 space-y-4 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-neutral-200'}`}>
                                                <div className="flex justify-between items-center">
                                                    <span className={`font-black text-lg ${textMain}`}>ADJUSTMENT</span>
                                                    <button onClick={() => handleDeletePair()} className={`text-xs font-bold px-3 py-1 rounded border uppercase ${isDarkMode ? 'text-red-400 border-red-900 hover:bg-red-900/20' : 'text-red-600 border-red-200 hover:bg-red-50'}`}>
                                                        Delete Pair
                                                    </button>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="-300"
                                                    max="300"
                                                    step="5"
                                                    value={currentKernValue}
                                                    onChange={(e) => handleKernChange(parseInt(e.target.value))}
                                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`}
                                                />
                                                <div className={`text-sm text-center font-mono ${textSub}`}>
                                                    {selectedPair}: {previewKerningValue >= 0 ? `+${previewKerningValue}` : previewKerningValue}
                                                    <span className="ml-1 text-xs">
                                                        ({biasContribution >= 0 ? `bias +${biasContribution}` : `bias ${biasContribution}`})
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 justify-center">
                                                    <button onClick={() => handleKernChange(currentKernValue - 10)} className={`w-10 h-10 border rounded font-bold ${btnSec}`}>-10</button>
                                                    <button onClick={() => handleKernChange(currentKernValue + 10)} className={`w-10 h-10 border rounded font-bold ${btnSec}`}>+10</button>
                                                </div>
                                            </div>
                                        )}

                                        {kerningContextLayout.gaps.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {kerningContextLayout.gaps.map((gap, idx) => {
                                                    const pairKey = `${gap.leftChar}${gap.rightChar}`;
                                                    const normalizedPairKey = pairKey.toUpperCase();
                                                    const kerningValue = metadata.kerning?.[normalizedPairKey] ?? 0;
                                                    return (
                                                        <div
                                                            key={`kerning-gap-card-${gap.leftChar}-${gap.rightChar}-${idx}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setSelectedPair(normalizedPairKey)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPair(normalizedPairKey); } }}
                                                            className={`p-3 rounded-lg border text-center font-mono space-y-2 cursor-pointer transition-colors ${selectedPair === normalizedPairKey ? (isDarkMode ? 'border-white bg-white/10 text-white' : 'border-black bg-black/5 text-black') : (isDarkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-neutral-200 bg-white text-black')}`}
                                                        >
                                                            <div className="flex items-center justify-center gap-2 text-[10px] uppercase">
                                                                <span>{gap.leftChar}</span>
                                                                <span className={textSub}>→</span>
                                                                <span>{gap.rightChar}</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={kerningValue}
                                                                onChange={(e) => handleInlineKerningInput(normalizedPairKey, parseFloat(e.target.value))}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className={`w-full text-center text-lg font-bold rounded border px-1 py-0.5 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-neutral-300 text-black'}`}
                                                            />
                                                            <p className={`text-xs ${textSub}`}>
                                                                Gap {formatGapValue(gap.gap)}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className={`p-4 rounded-lg border text-center text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-neutral-200 text-neutral-500'}`}>
                                                Digite pelo menos duas letras para ver ajustes de kerning.
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className={`h-48 rounded-xl flex items-center justify-center border-2 border-dashed ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-100 border-neutral-300'}`}>
                                        <span className={`${textSub} font-bold uppercase text-sm`}>Type text to preview</span>
                                    </div>
                                )}
                            </div>

                        </div>

                        <div className={`w-full lg:w-80 rounded-xl border flex flex-col shrink-0 ${cardBg}`}>
                            <div className={`p-4 border-b space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-neutral-200'}`}>
                                <span className={`text-xs font-bold uppercase tracking-wider block ${textMain}`}>Templates Profissionais</span>
                                <div className="space-y-2">
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className={`w-full rounded px-2 py-2 text-sm font-bold outline-none ${inputBg}`}
                                    >
                                        <option value="">Selecione um template...</option>
                                        <optgroup label="Sans-Serif">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'sans').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Serif">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'serif').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Geometric">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'geometric').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Display">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'display').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Humanist">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'humanist').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Script & Handwritten">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'script').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Slab Serif">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'slab').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Condensed">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'condensed').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Monospace">
                                            {KERNING_TEMPLATES.filter(t => t.category === 'mono').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    {selectedTemplate && (
                                        <p className={`text-[10px] ${textSub}`}>
                                            {KERNING_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                                        </p>
                                    )}
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase ${textSub}`}>Escala: {(templateScale * 100).toFixed(0)}%</label>
                                        <input type="range" min="0.5" max="1.5" step="0.05" value={templateScale} onChange={(e) => setTemplateScale(parseFloat(e.target.value))} className={`w-full h-1 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="blendGeo" checked={blendWithGeometry} onChange={(e) => setBlendWithGeometry(e.target.checked)} className="w-4 h-4" />
                                        <label htmlFor="blendGeo" className={`text-[10px] font-bold uppercase ${textSub}`}>Merge with SVG analysis</label>
                                    </div>
                                    {blendWithGeometry && (
                                        <div className="space-y-1">
                                            <label className={`text-[10px] font-bold uppercase ${textSub}`}>Blend: {(blendFactor * 100).toFixed(0)}% geometria</label>
                                            <input type="range" min="0" max="1" step="0.1" value={blendFactor} onChange={(e) => setBlendFactor(parseFloat(e.target.value))} className={`w-full h-1 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`} />
                                        </div>
                                    )}
                                    <button onClick={handleApplyTemplate} disabled={!selectedTemplate} className={`w-full py-2 rounded text-xs font-bold transition-colors ${selectedTemplate ? (isDarkMode ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-emerald-600 text-white hover:bg-emerald-700') : 'bg-neutral-400 text-neutral-200 cursor-not-allowed'}`}>
                                        Aplicar Template
                                    </button>
                                </div>
                            </div>

                            <div className={`p-4 border-b space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-neutral-200'}`}>
                                <span className={`text-xs font-bold uppercase tracking-wider block ${textMain}`}>Advanced Auto-Kern</span>
                                
                                {/* Seletor de Modo de Kerning */}
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-bold uppercase ${textSub}`}>Modo de Kerning</label>
                                    <div className="grid grid-cols-3 gap-1">
                                        {(['smart', 'professional', 'hybrid'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setKerningMode(mode)}
                                                className={`py-1.5 px-2 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                                    kerningMode === mode
                                                        ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white')
                                                        : `border ${isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-neutral-300 text-neutral-500 hover:text-black'}`
                                                }`}
                                            >
                                                {mode === 'smart' ? '📐 Smart' : mode === 'professional' ? '🎯 Pro' : '⚡ Hybrid'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className={`text-[9px] ${textSub}`}>
                                        {kerningMode === 'smart' && 'SVG geometric analysis (detected shapes)'}
                                        {kerningMode === 'professional' && 'Tabelas de fontes reais (Helvetica, Futura, etc.)'}
                                        {kerningMode === 'hybrid' && 'Combina tabelas profissionais + geometria'}
                                    </p>
                                </div>

                                {/* Estilo da Fonte - para modos profissional/híbrido */}
                                {(kerningMode === 'professional' || kerningMode === 'hybrid') && (
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase ${textSub}`}>Typographic Style</label>
                                        <select
                                            value={fontStyle}
                                            onChange={(e) => setFontStyle(e.target.value as FontStyle)}
                                            className={`w-full rounded px-2 py-2 text-sm font-bold outline-none ${inputBg}`}
                                        >
                                            <option value="geometric-sans">Geometric Sans (Futura, Avenir)</option>
                                            <option value="humanist-sans">Humanista Sans (Frutiger, Myriad)</option>
                                            <option value="neo-grotesque">Neo-Grotesca (Helvetica, Arial)</option>
                                            <option value="serif-oldstyle">Serifa Old Style (Garamond)</option>
                                            <option value="serif-modern">Serifa Moderna (Bodoni, Didot)</option>
                                            <option value="slab">Slab Serif (Rockwell)</option>
                                            <option value="display">Display (Decorativa)</option>
                                            <option value="script">Script (Manuscrita)</option>
                                        </select>
                                    </div>
                                )}

                                {/* Tipo de fonte para modo Smart */}
                                {kerningMode === 'smart' && (
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-bold uppercase ${textSub}`}>Tipo de fonte</label>
                                        <select
                                            value={kerningProfile || 'sans'}
                                            onChange={(e) => handleKerningProfileChange(e.target.value as FontMetadata['kerningProfile'])}
                                            className={`w-full rounded px-2 py-2 text-sm font-bold outline-none ${inputBg}`}
                                        >
                                            <option value="display">Display</option>
                                            <option value="geometric">Geometric</option>
                                            <option value="sans">Sans</option>
                                            <option value="serif">Serif</option>
                                            <option value="mono">Mono</option>
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className={`text-[10px] font-bold uppercase ${textSub}`}>Intensidade: {(autoKernIntensity * 100).toFixed(0)}%</label>
                                    <input type="range" min="0" max="2" step="0.1" value={autoKernIntensity} onChange={(e) => setAutoKernIntensity(parseFloat(e.target.value))} className={`w-full h-1 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`} />
                                </div>
                                <button onClick={handleAutoKern} className={`w-full py-2 rounded text-xs font-bold transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>
                                    {kerningMode === 'smart' ? 'Run Smart Auto-Kern' : kerningMode === 'professional' ? 'Apply Professional Kerning' : 'Aplicar Kerning Hybrid'}
                                </button>
                                <button
                                    onClick={handleResetAutoKern}
                                    disabled={!canResetAutoKern}
                                    className={`w-full py-2 rounded text-xs font-bold transition-colors border ${isDarkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-neutral-300 text-black hover:bg-neutral-100'} ${canResetAutoKern ? '' : 'opacity-40 cursor-not-allowed hover:bg-transparent'}`}
                                >
                                    Reset Auto-Kern
                                </button>
                            </div>
                            <div className={`p-4 border-b space-y-2 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-neutral-200 bg-neutral-50'}`}>
                                <div className="flex justify-between items-center">
                                    <span className={`font-bold text-xs uppercase ${textMain}`}>Pairs</span>
                                    <span className={`text-xs border px-2 py-1 rounded font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-neutral-200 text-black'}`}>{filteredPairs.length}/{Object.keys(metadata.kerning).length}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                    <span className={textSub}>Filter:</span>
                                    <input
                                        type="text"
                                        value={kerningFilterChar}
                                        onChange={(e) => setKerningFilterChar(e.target.value)}
                                        placeholder="Type pair or glyph"
                                        className={`flex-1 rounded px-2 py-1 text-[10px] font-mono uppercase outline-none ${inputBg}`}
                                    />
                                    {kerningFilterChar && (
                                        <button onClick={() => setKerningFilterChar('')} className={`text-[10px] underline ${isDarkMode ? 'text-white' : 'text-black'}`}>Clear</button>
                                    )}
                                </div>
                            </div>
                            <div className={`flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                {filteredPairs.length === 0 && (
                                    <div className={`${textSub} text-[10px] uppercase text-center py-6`}>No pairs{kerningFilterChar ? ` with ${kerningFilterChar}` : ''}.</div>
                                )}
                                {filteredPairs.map(([pair, val]) => (
                                    <button key={pair} onClick={() => selectPair(pair)} className={`w-full flex justify-between items-center p-3 rounded-lg transition-all border ${selectedPair === pair ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'text-slate-400 border-transparent hover:bg-slate-800' : 'text-neutral-500 border-transparent hover:bg-neutral-50 hover:border-neutral-200 hover:text-black')}`}>
                                        <span className="font-mono tracking-widest font-bold text-lg">{pair}</span>
                                        <span className="font-mono text-sm font-bold">{val as number}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        <div className={`p-6 border-t text-right ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-200'}`}>
             <button onClick={onClose} className={`px-8 py-3 rounded-xl font-bold transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default SpacingManager;

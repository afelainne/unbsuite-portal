import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { GlyphData, FontMetadata, COMPOSITE_RECIPES, DEFAULT_TRACKING_PROFILES } from '../types';
import { expandStrokeToPath, measurePath } from '../services/importService';
import { computeGlyphSequenceLayout, GlyphSequenceLayout } from '../services/layoutService';
import { resolveKerningValue } from '../services/kerningService';
import { useNotice } from '../contexts/NoticeContext';
import { centerGlyphInBox } from '../services/professionalKerningService';
import {
  AlignHorizontalJustifyCenter,
  ArrowLeftToLine,
  ArrowRight,
  ChevronDown,
  Ellipsis,
  Minus,
  MoveHorizontal,
  Plus,
  Redo2,
  Undo2,
  X
} from 'lucide-react';
import { Field, IconButton, Segmented } from './ui';
import { cx } from './cx';

interface EditorModalProps {
  glyph: GlyphData;
  allGlyphs?: GlyphData[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (char: string, data: Partial<GlyphData>) => void;
  metadata: FontMetadata;
    onUpdateMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
  onUpdateMembers: (parentChar: string, memberChars: string) => void;
  onBuildDerivatives?: (baseChar: string, globalAnchor: {x:number, y:number}, overrides: Record<string, {x:number, y:number}>, derivatives: string[], baseGlyphOverride?: GlyphData) => void;
  isDarkMode?: boolean;
    onOpenKerningPanel?: (glyphChar: string) => void;
  onApplyAutoPosition?: (autoPos: FontMetadata['autoPosition']) => void;
}

const ensureKerningBias = (g: GlyphData): GlyphData => ({ ...g, kerningBias: g.kerningBias ?? 0 });

const PREVIEW_FONT_SIZE_PT = 64;

type AlignGuide = 'ASCENDER' | 'BASELINE' | 'DESCENDER' | 'GHOST_TOP' | 'GHOST_CENTER' | 'GHOST_BOTTOM';

const ALIGN_GUIDES: { key: AlignGuide; label: string; snap: 'top' | 'center' | 'bottom' }[] = [
    { key: 'ASCENDER', label: 'Ascendente', snap: 'top' },
    { key: 'BASELINE', label: 'Linha de base', snap: 'bottom' },
    { key: 'DESCENDER', label: 'Descendente', snap: 'bottom' },
    { key: 'GHOST_TOP', label: 'Topo do fantasma', snap: 'top' },
    { key: 'GHOST_CENTER', label: 'Centro do fantasma', snap: 'center' },
    { key: 'GHOST_BOTTOM', label: 'Base do fantasma', snap: 'bottom' }
];

type KerningPreviewState = {
    combos: string[];
    layout?: GlyphSequenceLayout | null;
    error?: string;
};

const formatGapValue = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

const describeKerningToken = (token: string) => {
    if (token === ' ') return 'espaço';
    if (!token || !token.trim()) return '∅';
    return token;
};

const EditorModal: React.FC<EditorModalProps> = ({ glyph, allGlyphs, isOpen, onClose, onSave, metadata, onUpdateMetadata, onUpdateMembers, onBuildDerivatives, isDarkMode, onOpenKerningPanel, onApplyAutoPosition }) => {
    const [data, setData] = useState<GlyphData>(() => ensureKerningBias(glyph));
        const [activeTab, setActiveTab] = useState<'METRICS' | 'KERNING' | 'ACCENTS' | 'COMPS' | 'STROKE'>('METRICS');
  const [strokeWidth, setStrokeWidth] = useState(10);
  const [moreTabsOpen, setMoreTabsOpen] = useState(false);
  
  // History State
    const [history, setHistory] = useState<GlyphData[]>([ensureKerningBias(glyph)]);
  const [historyIndex, setHistoryIndex] = useState(0);

    const [draggingGuide, setDraggingGuide] = useState<'ASCENDER' | 'BASELINE' | 'DESCENDER' | 'X_HEIGHT' | 'CAP_HEIGHT' | 'WIDTH' | 'ORIGIN' | 'ANCHOR' | null>(null);
  const [draggingComponentIndex, setDraggingComponentIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number, initialDx: number, initialDy: number} | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const loadedGlyphChar = useRef<string | null>(null);
  const dataRef = useRef(data); // Ref to access current data in event listeners without re-binding
    const { pushNotice } = useNotice();

    const [globalAnchor, setGlobalAnchor] = useState({ x: 500, y: metadata.ascender }); 
  const [anchorOverrides, setAnchorOverrides] = useState<Record<string, {x:number, y:number}>>({});
  const [selectedDerivatives, setSelectedDerivatives] = useState<Set<string>>(new Set());
  const ensureDerivativeSelected = useCallback((char: string) => {
      setSelectedDerivatives(prev => {
          if (prev.has(char)) return prev;
          const updated = new Set(prev);
          updated.add(char);
          return updated;
      });
  }, []);
  const [editingDerivative, setEditingDerivative] = useState<string | null>(null); 
  
  const [contextChar, setContextChar] = useState("");
  const [contextPos, setContextPos] = useState<'OVERLAP' | 'LEFT' | 'RIGHT'>('OVERLAP');
    const [contextOffset, setContextOffset] = useState({ x: 0, y: 0 });
        const [alignmentTarget, setAlignmentTarget] = useState<'glyph' | 'anchor' | 'context'>('glyph');

    const [kerningPartner, setKerningPartner] = useState<string>("");
    const [kerningDirection, setKerningDirection] = useState<'LEFT' | 'BOTH' | 'RIGHT'>('BOTH');
    const previewPanStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

        const [leftKerningPartner, setLeftKerningPartner] = useState("");
        const [rightKerningPartner, setRightKerningPartner] = useState("");
        const [leftKerningValue, setLeftKerningValue] = useState(0);
        const [rightKerningValue, setRightKerningValue] = useState(0);

  const [manualComponentChar, setManualComponentChar] = useState("");

  const VISUAL_BASELINE_Y = 800;

    const glyphMap = useMemo(() => {
        const map = new Map<string, GlyphData>();
        if (allGlyphs) {
            allGlyphs.forEach(gItem => map.set(gItem.char, ensureKerningBias(gItem)));
        }
        map.set(glyph.char, data);
        return map;
    }, [allGlyphs, glyph.char, data]);

    const measureGlyphBounds = useCallback((target: GlyphData | undefined, depth = 0): { x: number; y: number; width: number; height: number } | null => {
        if (!target || depth > 5) return null;
        const boxes: { x: number; y: number; width: number; height: number }[] = [];
        if (target.pathData) boxes.push(measurePath(target.pathData));
        target.components.forEach(comp => {
            const refGlyph = glyphMap.get(comp.char);
            const childBounds = measureGlyphBounds(refGlyph, depth + 1);
            if (!childBounds) return;
            boxes.push({
                x: comp.dx + childBounds.x * comp.scale,
                y: comp.dy + childBounds.y * comp.scale,
                width: childBounds.width * comp.scale,
                height: childBounds.height * comp.scale,
            });
        });
        if (boxes.length === 0) return null;
        let merged = boxes[0];
        for (let i = 1; i < boxes.length; i++) {
            const box = boxes[i];
            const minX = Math.min(merged.x, box.x);
            const minY = Math.min(merged.y, box.y);
            const maxX = Math.max(merged.x + merged.width, box.x + box.width);
            const maxY = Math.max(merged.y + merged.height, box.y + box.height);
            merged = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        return merged;
    }, [glyphMap]);

  // Sync dataRef
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (isOpen && glyph.char !== loadedGlyphChar.current) {
        const normalizedGlyph = ensureKerningBias(glyph);
        setData(normalizedGlyph);
        setHistory([normalizedGlyph]);
        setHistoryIndex(0);
        loadedGlyphChar.current = glyph.char;
        setKerningPartner("");
        setKerningDirection('BOTH');
        setLeftKerningPartner("");
        setRightKerningPartner("");
        setLeftKerningValue(0);
        setRightKerningValue(0);
        
        const massBounds = measureGlyphBounds(normalizedGlyph);
        const massCenter = massBounds ? {
            x: Math.round(massBounds.x + massBounds.width / 2),
            y: Math.round(massBounds.y + massBounds.height / 2)
        } : null;
        if (normalizedGlyph.anchors && normalizedGlyph.anchors.length > 0) {
            setGlobalAnchor({ x: normalizedGlyph.anchors[0].x, y: normalizedGlyph.anchors[0].y });
        } else if (massCenter) {
            setGlobalAnchor(massCenter);
        } else {
            setGlobalAnchor({ x: normalizedGlyph.advanceWidth / 2, y: metadata.ascender });
        }
        if (normalizedGlyph.anchorOverrides) setAnchorOverrides(normalizedGlyph.anchorOverrides);
        else setAnchorOverrides({});
        setEditingDerivative(null);
    }
    }, [glyph, isOpen, metadata.ascender, measureGlyphBounds]);

  // History Management
  const pushToHistory = useCallback((newData: GlyphData) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newData);
          return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          setHistoryIndex(prevIndex);
          setData(history[prevIndex]);
      }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          setHistoryIndex(nextIndex);
          setData(history[nextIndex]);
      }
  }, [historyIndex, history]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!isOpen) return;
          // Undo: Ctrl+Z
          if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
              e.preventDefault();
              e.stopImmediatePropagation();
              handleUndo();
          }
          // Redo: Ctrl+Shift+Z or Ctrl+Y
          if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
              e.preventDefault();
              e.stopImmediatePropagation();
              handleRedo();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  // Pan/zoom removed — visualizer uses fit-to-view only.

    useEffect(() => {
        if (!leftKerningPartner) {
            setLeftKerningValue(0);
            return;
        }
        const pairKey = `${glyph.char}${leftKerningPartner}`;
        setLeftKerningValue(metadata.kerning?.[pairKey] ?? 0);
    }, [glyph.char, leftKerningPartner, metadata.kerning]);

    useEffect(() => {
        if (!rightKerningPartner) {
            setRightKerningValue(0);
            return;
        }
        const pairKey = `${rightKerningPartner}${glyph.char}`;
        setRightKerningValue(metadata.kerning?.[pairKey] ?? 0);
    }, [glyph.char, rightKerningPartner, metadata.kerning]);

  const derivatives = useMemo(() => {
      const list: { char: string; accent: string }[] = [];
      Object.entries(COMPOSITE_RECIPES).forEach(([res, ingredients]) => {
          if (ingredients[0] === glyph.char) {
              list.push({ char: res, accent: ingredients[1] });
          }
      });
      return list;
  }, [glyph.char]);
  
  useEffect(() => {
      setSelectedDerivatives(new Set(derivatives.map(d => d.char)));
  }, [derivatives]);

  const currentAnchor = useMemo(() => {
      if (editingDerivative && anchorOverrides[editingDerivative]) {
          return anchorOverrides[editingDerivative];
      }
      return globalAnchor;
  }, [editingDerivative, anchorOverrides, globalAnchor]);

  const updateAnchorPosition = (x: number, y: number) => {
      if (editingDerivative) {
          setAnchorOverrides(prev => ({ ...prev, [editingDerivative]: { x, y } }));
      } else {
          setGlobalAnchor({ x, y });
      }
  };

  const handleAnchorChange = (field: 'x' | 'y', val: number) => {
      if (field === 'x') updateAnchorPosition(val, currentAnchor.y);
      else updateAnchorPosition(currentAnchor.x, val);
  };

  const handleComponentMouseDown = (e: React.MouseEvent, index: number) => {
      if (activeTab !== 'COMPS') return;
      e.stopPropagation();
      setDraggingComponentIndex(index);
      const comp = data.components[index];
      setDragStart({ x: e.clientX, y: e.clientY, initialDx: comp.dx, initialDy: comp.dy });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        
        const relativeY = e.clientY - rect.top;
        const relativeX = e.clientX - rect.left;
        const percentageY = Math.max(0, Math.min(1, relativeY / rect.height));
        const percentageX = Math.max(0, Math.min(1, relativeX / rect.width));
        
        const vbX = -500; const vbY = -400; const vbW = 2000; const vbH = 1800;
        const svgX = Math.round(vbX + (percentageX * vbW));
        const svgY = Math.round(vbY + (percentageY * vbH));

        if (draggingGuide) {
            if (draggingGuide === 'ASCENDER') {
                onUpdateMetadata(prev => ({ ...prev, ascender: VISUAL_BASELINE_Y - svgY })); 
            }
            else if (draggingGuide === 'BASELINE') {
                const newShift = VISUAL_BASELINE_Y - svgY;
                onUpdateMetadata(prev => ({ ...prev, baselineShift: newShift }));
            }
            else if (draggingGuide === 'DESCENDER') {
                onUpdateMetadata(prev => ({ ...prev, descender: VISUAL_BASELINE_Y - svgY })); 
            }
            else if (draggingGuide === 'X_HEIGHT') {
                onUpdateMetadata(prev => ({ ...prev, xHeight: VISUAL_BASELINE_Y - svgY }));
            }
            else if (draggingGuide === 'CAP_HEIGHT') {
                onUpdateMetadata(prev => ({ ...prev, capHeight: VISUAL_BASELINE_Y - svgY }));
            }
            else if (draggingGuide === 'WIDTH') setData(prev => ({ ...prev, advanceWidth: Math.max(0, svgX) }));
            else if (draggingGuide === 'ORIGIN') setData(prev => ({ ...prev, leftSideBearing: prev.leftSideBearing + (svgX - 0) }));
            else if (draggingGuide === 'ANCHOR') updateAnchorPosition(svgX, svgY);
        } else if (draggingComponentIndex !== null && dragStart) {
             const dxPixels = e.clientX - dragStart.x;
             const dyPixels = e.clientY - dragStart.y;
             const scaleX = vbW / rect.width;
             const scaleY = vbH / rect.height;
             const dxSvg = dxPixels * scaleX;
             const dySvg = dyPixels * scaleY;
             
             setData(prev => {
                 const newComps = [...prev.components];
                 if (newComps[draggingComponentIndex]) {
                     newComps[draggingComponentIndex] = {
                         ...newComps[draggingComponentIndex],
                         dx: Math.round(dragStart.initialDx + dxSvg),
                         dy: Math.round(dragStart.initialDy + dySvg)
                     };
                 }
                 return { ...prev, components: newComps };
             });
        }
    };

    const handleMouseUp = () => {
        if (draggingGuide || draggingComponentIndex !== null) {
            // Commit to history after drag
            pushToHistory(dataRef.current);
        }
        setDraggingGuide(null);
        setDraggingComponentIndex(null);
        setDragStart(null);
    };

    if (draggingGuide || draggingComponentIndex !== null) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingGuide, draggingComponentIndex, dragStart, metadata, onUpdateMetadata, editingDerivative, anchorOverrides, globalAnchor, pushToHistory]); 

  const previewPath = useMemo(() => {
      if (activeTab === 'STROKE' && data.pathData) {
          return expandStrokeToPath(data.pathData, strokeWidth) || data.pathData;
      }
      return data.pathData;
  }, [data.pathData, strokeWidth, activeTab]);

  const contextGlyph = useMemo(() => {
      if (!contextChar || !allGlyphs) return null;
      return allGlyphs.find(g => g.char === contextChar);
  }, [contextChar, allGlyphs]);

    const kerningBiasValue = data.kerningBias ?? 0;

    const activeGlyphBounds = useMemo(() => measureGlyphBounds(data), [data, measureGlyphBounds]);
    const contextBounds = useMemo(() => measureGlyphBounds(contextGlyph || undefined), [contextGlyph, measureGlyphBounds]);

    const renderGlyphLayers = useCallback((target: GlyphData | undefined, fillColor: string, depth = 0): React.ReactNode => {
        if (!target || depth > 5) return null;
        const elements: React.ReactNode[] = [];
        if (target.pathData) {
            elements.push(<path key={`path-${depth}`} d={target.pathData} fill={fillColor} />);
        }
        target.components.forEach((comp, idx) => {
            const refGlyph = glyphMap.get(comp.char);
            elements.push(
                <g key={`comp-${depth}-${idx}`} transform={`translate(${comp.dx}, ${comp.dy}) scale(${comp.scale})`}>
                    {renderGlyphLayers(refGlyph, fillColor, depth + 1)}
                </g>
            );
        });
        return elements;
    }, [glyphMap]);

    const handleOpenKerningPanelClick = () => {
        if (onOpenKerningPanel) {
            onOpenKerningPanel(glyph.char);
        }
        onClose();
    };

  const partnerOptions = useMemo(() => {
      if (!allGlyphs) return [];
      const unique = new Set<string>();
      allGlyphs.forEach(g => {
          if (!g.char) return;
          if (g.char.length !== 1) return;
          const trimmed = g.char.trim();
          if (!trimmed) return;
          unique.add(g.char);
      });
      return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allGlyphs]);


  const previewTrackingProfile = useMemo(() => {
      const baseProfile = metadata.trackingProfile ?? DEFAULT_TRACKING_PROFILES['body-text'];
      return {
          ...baseProfile,
          defaultTracking: metadata.tracking,
          rules: { ...baseProfile.rules }
      };
  }, [metadata.tracking, metadata.trackingProfile]);

    const kerningPreview = useMemo<KerningPreviewState | null>(() => {
      if (!kerningPartner || glyphMap.size === 0) return null;
      const combos = [
          `${glyph.char}${kerningPartner}`,
          `${kerningPartner}${glyph.char}`,
          `${glyph.char}${kerningPartner}${glyph.char}`,
          `${kerningPartner}${glyph.char}${kerningPartner}`
      ].filter(combo => combo.length >= 2);

      if (combos.length === 0) return null;

      if (!glyphMap.has(kerningPartner)) {
          return { combos, error: 'O glifo parceiro não existe neste estilo.' };
      }

      const layout = computeGlyphSequenceLayout({
          sequence: combos.join('   '),
          glyphMap,
          kerning: metadata.kerning,
          trackingProfile: previewTrackingProfile,
          fontSizePt: PREVIEW_FONT_SIZE_PT,
          baselineY: 900,
          viewHeight: 1800,
          padding: 400,
      });

      if (!layout) return null;

      return { combos, layout };
  }, [kerningPartner, glyph.char, glyphMap, metadata.kerning, previewTrackingProfile]);

    const kerningPairsBySide = useMemo(() => {
        const entries = Object.entries(metadata.kerning || {});
        const asLeft = entries
            .filter(([pair]) => pair.startsWith(glyph.char))
            .map(([pair, value]) => ({
                pair,
                partner: pair.slice(glyph.char.length) || '∅',
                value,
            }))
            .sort((a, b) => a.partner.localeCompare(b.partner));
        const asRight = entries
            .filter(([pair]) => pair.endsWith(glyph.char))
            .map(([pair, value]) => ({
                pair,
                partner: pair.slice(0, pair.length - glyph.char.length) || '∅',
                value,
            }))
            .sort((a, b) => a.partner.localeCompare(b.partner));
        return { asLeft, asRight };
    }, [metadata.kerning, glyph.char]);

  const ghostGlyphMissing = contextChar ? !glyphMap.has(contextChar) : false;

  const ghostSpacingLayout = useMemo(() => {
      if (!contextChar) return null;
      return computeGlyphSequenceLayout({
          sequence: `${contextChar}${glyph.char}${contextChar}`,
          glyphMap,
          kerning: metadata.kerning,
          trackingProfile: previewTrackingProfile,
          fontSizePt: PREVIEW_FONT_SIZE_PT,
          baselineY: 900,
          viewHeight: 1800,
          padding: 350,
      });
  }, [contextChar, glyph.char, glyphMap, metadata.kerning, previewTrackingProfile]);

  const ghostGapGuideY = ghostSpacingLayout ? Math.max(80, ghostSpacingLayout.baselineY - 280) : 0;
    const kerningPreviewLayout = kerningPreview?.layout ?? null;
  const kerningPreviewGapY = kerningPreviewLayout ? Math.max(80, kerningPreviewLayout.baselineY - 280) : 0;

  // Unified pair visualizer — one sequence based on direction toggle.
  const pairSequence = useMemo(() => {
      if (!kerningPartner) return '';
      if (kerningDirection === 'LEFT') return `${kerningPartner}${glyph.char}`;
      if (kerningDirection === 'RIGHT') return `${glyph.char}${kerningPartner}`;
      return `${kerningPartner}${glyph.char}${kerningPartner}`;
  }, [kerningPartner, kerningDirection, glyph.char]);

  const pairLayout = useMemo(() => {
      if (!pairSequence || !glyphMap.has(kerningPartner)) return null;
      return computeGlyphSequenceLayout({
          sequence: pairSequence,
          glyphMap,
          kerning: metadata.kerning,
          trackingProfile: previewTrackingProfile,
          fontSizePt: PREVIEW_FONT_SIZE_PT,
          baselineY: 900,
          viewHeight: 1800,
          padding: 350,
      });
  }, [pairSequence, kerningPartner, glyphMap, metadata.kerning, previewTrackingProfile]);

  const pairGapY = pairLayout ? Math.max(80, pairLayout.baselineY - 280) : 0;

  // Active pair key being edited (depends on direction).
  const activePairKey = useMemo(() => {
      if (!kerningPartner) return null;
      // For BOTH, prefer right-side pair (glyph + partner) for editing.
      if (kerningDirection === 'LEFT') return `${kerningPartner}${glyph.char}`;
      return `${glyph.char}${kerningPartner}`;
  }, [kerningPartner, kerningDirection, glyph.char]);

  const activePairValue = activePairKey ? (metadata.kerning?.[activePairKey] ?? 0) : 0;

  // Unified saved pairs list with direction badges.
  const allSavedPairs = useMemo(() => {
      const out = [
          ...kerningPairsBySide.asLeft.map(p => ({ ...p, direction: 'right' as const })),
          ...kerningPairsBySide.asRight.map(p => ({ ...p, direction: 'left' as const })),
      ];
      return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [kerningPairsBySide]);

  const QUICK_PARTNERS = ['A', 'V', 'O', 'T', 'H', 'N', 'o', 'e', 'a'];

        const computedRightSideBearing = useMemo(() => {
                if (!activeGlyphBounds) {
                        return Math.round(data.advanceWidth - data.leftSideBearing);
                }
                const value = data.advanceWidth - (data.leftSideBearing + activeGlyphBounds.width);
                return Math.round(value);
        }, [activeGlyphBounds, data.advanceWidth, data.leftSideBearing]);

    const quickPairGhosts = useMemo(() => {
        const ghosts: Array<{ id: string; glyph: GlyphData; offsetX: number; direction: 'LEFT' | 'RIGHT'; kerning: number; partner: string }> = [];
        const pushGhost = (id: string, partnerChar: string, position: 'LEFT' | 'RIGHT') => {
            if (!partnerChar || partnerChar.length !== 1) return;
            const partnerGlyph = glyphMap.get(partnerChar);
            if (!partnerGlyph || (!partnerGlyph.pathData && partnerGlyph.char !== ' ')) return;
            const kerningValue = position === 'RIGHT'
                ? resolveKerningValue(data, partnerGlyph, metadata.kerning)
                : resolveKerningValue(partnerGlyph, data, metadata.kerning);
            const offsetX = position === 'RIGHT'
                ? data.advanceWidth + kerningValue
                : -(partnerGlyph.advanceWidth + kerningValue);
            ghosts.push({ id, glyph: partnerGlyph, offsetX, direction: position, kerning: kerningValue, partner: partnerGlyph.char });
        };
        if (leftKerningPartner && leftKerningPartner.length === 1) {
            pushGhost('left', leftKerningPartner, 'RIGHT');
        }
        if (rightKerningPartner && rightKerningPartner.length === 1) {
            pushGhost('right', rightKerningPartner, 'LEFT');
        }
        return ghosts;
    }, [data, glyphMap, leftKerningPartner, metadata.kerning, rightKerningPartner]);

    const quickBuilderCards = [
        {
            id: 'left',
            heading: `${glyph.char} à esquerda`,
            caption: `${glyph.char}${leftKerningPartner || '·'}`,
            partner: leftKerningPartner,
            setPartner: setLeftKerningPartner,
            value: leftKerningValue,
            setValue: setLeftKerningValue,
            direction: 'LEFT' as const,
            description: 'Vale quando este glifo vem antes do parceiro.',
            pairKey: leftKerningPartner ? `${glyph.char}${leftKerningPartner}` : null,
        },
        {
            id: 'right',
            heading: `${glyph.char} à direita`,
            caption: `${rightKerningPartner || '·'}${glyph.char}`,
            partner: rightKerningPartner,
            setPartner: setRightKerningPartner,
            value: rightKerningValue,
            setValue: setRightKerningValue,
            direction: 'RIGHT' as const,
            description: 'Vale quando o parceiro vem antes.',
            pairKey: rightKerningPartner ? `${rightKerningPartner}${glyph.char}` : null,
        }
    ];

  if (!isOpen) return null;

  const handleChange = (field: keyof GlyphData, value: number | string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };
  
  // Commit history on input blur or specific actions
  const handleInputCommit = () => {
      pushToHistory(data);
  };

  const handleAddManualComponent = () => {
      if (!manualComponentChar || !allGlyphs) return;
      const targetG = allGlyphs.find(g => g.char === manualComponentChar);
    if (!targetG || !targetG.pathData) { pushNotice('Caractere não encontrado ou vazio.', 'error'); return; }
      const newData = { ...data, components: [...data.components, { char: manualComponentChar, dx: 0, dy: 0, scale: 1 }] };
      setData(newData);
      pushToHistory(newData);
      setManualComponentChar("");
  };

  const handleRemoveComponent = (index: number) => {
      const newData = { ...data, components: data.components.filter((_, i) => i !== index) };
      setData(newData);
      pushToHistory(newData);
  };
  
  const handleUpdateComponent = (index: number, field: keyof any, val: number) => {
      setData(prev => {
          const comps = [...prev.components];
          comps[index] = { ...comps[index], [field]: val };
          return { ...prev, components: comps };
      });
  };

  const buildSavePayload = useCallback(() => {
    const newAnchors = [{ name: 'top', x: globalAnchor.x, y: globalAnchor.y }];
    return { ...data, anchors: newAnchors, anchorOverrides: anchorOverrides };
  }, [data, globalAnchor, anchorOverrides]);

  const handleSave = () => {
    const dataToSave = buildSavePayload();
    onSave(glyph.char, dataToSave);
    if (onBuildDerivatives && selectedDerivatives.size > 0) {
        onBuildDerivatives(glyph.char, globalAnchor, anchorOverrides, Array.from<string>(selectedDerivatives), dataToSave);
    }
    onClose();
  };

  const handleCloseWithAutoSave = useCallback(() => {
    // Auto-save if data changed from original glyph
    const original = ensureKerningBias(glyph);
    const current = dataRef.current;
    const hasChanges = JSON.stringify({ pathData: current.pathData, advanceWidth: current.advanceWidth, leftSideBearing: current.leftSideBearing, kerningBias: current.kerningBias, components: current.components, baselineOffset: current.baselineOffset, scale: current.scale }) !== JSON.stringify({ pathData: original.pathData, advanceWidth: original.advanceWidth, leftSideBearing: original.leftSideBearing, kerningBias: original.kerningBias, components: original.components, baselineOffset: original.baselineOffset, scale: original.scale });
    if (hasChanges) {
        const newAnchors = [{ name: 'top', x: globalAnchor.x, y: globalAnchor.y }];
        const dataToSave = { ...current, anchors: newAnchors, anchorOverrides };
        onSave(glyph.char, dataToSave);
    }
    onClose();
  }, [glyph, globalAnchor, anchorOverrides, onSave, onClose]);
  
  const handleAutoCenter = () => { 
      const newData = { ...data, leftSideBearing: 50 };
      setData(newData);
      pushToHistory(newData);
  };

  // Centralizar glifo baseado no centro real do vetor
  const handleCenterGlyph = () => {
      if (!data.pathData) {
          pushNotice('Este glifo não tem contorno para centralizar.', 'warning');
          return;
      }
      const centered = centerGlyphInBox(data, 50); // 50u de margem
      const newData = { 
          ...data, 
          leftSideBearing: centered.leftSideBearing,
          advanceWidth: centered.advanceWidth 
      };
      setData(newData);
      pushToHistory(newData);
      pushNotice(`Glifo centralizado: margem esquerda ${centered.leftSideBearing}, largura ${centered.advanceWidth}.`, 'success');
  };
  
  const handleBuildDerivativesClick = () => {
      if (onBuildDerivatives) {
          onBuildDerivatives(glyph.char, globalAnchor, anchorOverrides, Array.from<string>(selectedDerivatives), data);
      }
  };

  const toggleDerivative = (char: string) => {
      const newSet = new Set(selectedDerivatives);
      if (newSet.has(char)) newSet.delete(char); else newSet.add(char);
      setSelectedDerivatives(newSet);
  };
  
  const handleSelectDerivativeToEdit = (char: string) => {
      if (editingDerivative === char) setEditingDerivative(null); 
      else {
          if (!selectedDerivatives.has(char)) toggleDerivative(char);
          setEditingDerivative(char);
      }
  };

  const handleAccentDragStart = (e: React.MouseEvent<SVGGElement, MouseEvent>, char: string) => {
      e.stopPropagation();
      ensureDerivativeSelected(char);
      setEditingDerivative(char);
      setDraggingGuide('ANCHOR');
  };

  const handleStrokeExpand = () => {
      if (confirm("Isto converte o traço em contorno preenchido, sem volta. Continuar?")) {
          const newPath = expandStrokeToPath(data.pathData, strokeWidth);
          const newData = { ...data, pathData: newPath };
          setData(newData);
          pushToHistory(newData);
          setActiveTab('METRICS');
      }
  };

  let contextTransform = "";
  if (contextGlyph) {
      let x = contextOffset.x;
      const y = contextOffset.y + contextGlyph.baselineOffset; 
      if (contextPos === 'LEFT') x = -(contextGlyph.advanceWidth) + contextOffset.x; 
      else if (contextPos === 'RIGHT') x = data.advanceWidth + contextOffset.x;
      else x = contextOffset.x;
      x += contextGlyph.leftSideBearing;
      contextTransform = `translate(${x}, ${y}) scale(${contextGlyph.scale})`;
  }

    const baselineShift = metadata.baselineShift ?? 0;
    const visualBaselineY = VISUAL_BASELINE_Y - baselineShift;
    const visualAscenderY = visualBaselineY - metadata.ascender;
    const visualDescenderY = visualBaselineY - metadata.descender; 
    const xHeight = metadata.xHeight ?? 520;
    const capHeight = metadata.capHeight ?? 720;
    const visualXHeightY = visualBaselineY - xHeight;
    const visualCapHeightY = visualBaselineY - capHeight;
    const dynamicOriginX = data.leftSideBearing;
  
  // Canvas em tinta e cinzas. As guias usam `currentColor` (o token de texto,
  // que vira no modo escuro); só os preenchimentos passados por prop precisam
  // de uma cor literal.
  const INK = isDarkMode ? '#F2F2F0' : '#000000';
    const anchorRangeX = { min: -500, max: (metadata.unitsPerEm ?? 1000) + 500 };
    const anchorRangeY = { min: (metadata.descender ?? -200) - 500, max: (metadata.ascender ?? 800) + 500 };

    const getGuideLineY = useCallback((guide: AlignGuide): number | null => {
        switch (guide) {
            case 'ASCENDER':
                return visualAscenderY;
            case 'BASELINE':
                return visualBaselineY;
            case 'DESCENDER':
                return visualDescenderY;
            case 'GHOST_TOP':
            case 'GHOST_CENTER':
            case 'GHOST_BOTTOM': {
                if (!contextGlyph || !contextBounds) return null;
                const ghostBaseY = contextOffset.y + contextGlyph.baselineOffset;
                const ghostTop = ghostBaseY + contextBounds.y;
                const ghostBottom = ghostTop + contextBounds.height;
                const ghostCenter = ghostTop + contextBounds.height / 2;
                if (guide === 'GHOST_TOP') return ghostTop;
                if (guide === 'GHOST_BOTTOM') return ghostBottom;
                return ghostCenter;
            }
            default:
                return null;
        }
    }, [contextBounds, contextGlyph, contextOffset.y, visualAscenderY, visualBaselineY, visualDescenderY]);

    const alignGlyphToLine = useCallback((lineY: number, snap: 'top' | 'center' | 'bottom') => {
        if (!activeGlyphBounds) return;
        const top = data.baselineOffset + activeGlyphBounds.y;
        const bottom = top + activeGlyphBounds.height;
        const center = top + activeGlyphBounds.height / 2;
        const current = snap === 'top' ? top : snap === 'bottom' ? bottom : center;
        const delta = lineY - current;
        if (Math.abs(delta) < 0.5) return;
        const updated = { ...data, baselineOffset: Math.round(data.baselineOffset + delta) };
        setData(updated);
        pushToHistory(updated);
    }, [activeGlyphBounds, data, pushToHistory]);

    const alignContextToLine = useCallback((lineY: number, snap: 'top' | 'center' | 'bottom') => {
        if (!contextGlyph || !contextBounds) return;
        const baseY = contextGlyph.baselineOffset;
        const top = contextOffset.y + baseY + contextBounds.y;
        const bottom = top + contextBounds.height;
        const center = top + contextBounds.height / 2;
        const current = snap === 'top' ? top : snap === 'bottom' ? bottom : center;
        const delta = lineY - current;
        if (Math.abs(delta) < 0.5) return;
        setContextOffset(prev => ({ ...prev, y: Math.round(prev.y + delta) }));
    }, [contextBounds, contextGlyph, contextOffset.y]);

    const handleAlignToGuide = useCallback((guide: AlignGuide) => {
        const guideMeta = ALIGN_GUIDES.find(g => g.key === guide);
        if (!guideMeta) return;
        const lineY = getGuideLineY(guide);
        if (lineY === null) return;
        if (alignmentTarget === 'glyph') {
            alignGlyphToLine(lineY, guideMeta.snap);
        } else if (alignmentTarget === 'anchor') {
            const newY = Math.round(lineY - data.baselineOffset);
            updateAnchorPosition(currentAnchor.x, newY);
        } else {
            alignContextToLine(lineY, guideMeta.snap);
        }
    }, [alignmentTarget, alignContextToLine, alignGlyphToLine, currentAnchor.x, data.baselineOffset, getGuideLineY, updateAnchorPosition]);

    const handleInlineKerningChange = useCallback((pair: string, value: number) => {
        if (!pair || pair.length < 2 || Number.isNaN(value)) return;
        onUpdateMetadata(prev => ({
            ...prev,
            kerning: {
                ...(prev.kerning ?? {}),
                [pair]: value,
            },
        }));
    }, [onUpdateMetadata]);

    const handleApplyKerningBuilder = useCallback((mode: 'LEFT' | 'RIGHT') => {
        if (mode === 'LEFT') {
            if (!leftKerningPartner) return;
            handleInlineKerningChange(`${glyph.char}${leftKerningPartner}`, leftKerningValue);
            return;
        }
        if (!rightKerningPartner) return;
        handleInlineKerningChange(`${rightKerningPartner}${glyph.char}`, rightKerningValue);
    }, [glyph.char, handleInlineKerningChange, leftKerningPartner, leftKerningValue, rightKerningPartner, rightKerningValue]);

    const handleRemoveKerningPair = useCallback((pairKey: string) => {
        if (!pairKey) return;
        onUpdateMetadata(prev => {
            const currentKerning = prev.kerning ?? {};
            if (currentKerning[pairKey] === undefined) return prev;
            const nextKerning = { ...currentKerning };
            delete nextKerning[pairKey];
            return { ...prev, kerning: nextKerning };
        });
    }, [onUpdateMetadata]);

    const isMoreTab = activeTab === 'COMPS' || activeTab === 'STROKE';
    const unicodeLabel = Number.isFinite(glyph.unicode)
        ? `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')}`
        : '';

    const renderHorizontalGuide = (
        y: number,
        guide: 'ASCENDER' | 'BASELINE' | 'DESCENDER' | 'X_HEIGHT' | 'CAP_HEIGHT',
        label: string,
        opts: { opacity: number; width: number; dash?: string; labelAbove?: boolean }
    ) => (
        <g key={guide}>
            <line x1="-500" y1={y} x2="1500" y2={y} stroke="currentColor" strokeOpacity={opts.opacity} strokeWidth={opts.width} strokeDasharray={opts.dash} />
            <line x1="-500" y1={y} x2="1500" y2={y} stroke="transparent" strokeWidth="40" className="cursor-row-resize pointer-events-auto" onMouseDown={() => setDraggingGuide(guide)} />
            <text x={-480} y={opts.labelAbove ? y - 12 : y + 30} fontSize={22} fill="currentColor" fillOpacity={0.55} className="select-none">{label}</text>
        </g>
    );

    return (
    <div
        className="fixed inset-0 z-[60] bg-background text-foreground flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={`Editar o glifo ${glyph.char}`}
    >
      {/* Esconde as setas dos campos numéricos */}
      <style>{`
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Fila de título */}
      <header className="shrink-0 px-5 md:px-8 pt-5 pb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-4 min-w-0">
              <span className="text-[40px] font-normal leading-none text-foreground">{glyph.char}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[14px] text-foreground truncate">{glyph.name}</span>
                  {unicodeLabel && <span className="text-[14px] text-muted-foreground tabular">{unicodeLabel}</span>}
              </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
              <IconButton label="Desfazer (Ctrl+Z)" variant="surface" onClick={handleUndo} disabled={historyIndex <= 0}>
                  <Undo2 className="w-4 h-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Refazer (Ctrl+Y)" variant="surface" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                  <Redo2 className="w-4 h-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Centralizar pelo centro real do desenho" variant="surface" onClick={handleCenterGlyph}>
                  <AlignHorizontalJustifyCenter className="w-4 h-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Redefinir a margem esquerda" variant="surface" onClick={handleAutoCenter}>
                  <ArrowLeftToLine className="w-4 h-4" aria-hidden="true" />
              </IconButton>
              {onOpenKerningPanel && (
                  <IconButton label="Abrir o painel de kerning" variant="surface" onClick={handleOpenKerningPanelClick}>
                      <MoveHorizontal className="w-4 h-4" aria-hidden="true" />
                  </IconButton>
              )}
              <button type="button" onClick={handleSave} className="ctl ctl-filled ctl-lg">Salvar</button>
              <IconButton label="Fechar" variant="surface" onClick={handleCloseWithAutoSave}>
                  <X className="w-4 h-4" aria-hidden="true" />
              </IconButton>
          </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row gap-5 px-5 md:px-8 pb-5">

        {/* Canvas */}
        <div className="relative flex-1 min-w-0 min-h-[360px] lg:min-h-0 bg-canvas rounded-xl overflow-hidden">
           <div
                ref={canvasRef}
                className="absolute inset-4 md:inset-8 select-none text-foreground"
            >
               <svg
                    viewBox="-500 -400 2000 1800"
                    className="w-full h-full fill-current overflow-visible pointer-events-none"
                    preserveAspectRatio="xMidYMid meet"
               >
                      {/* Zonas tipográficas, em cinzas */}
                      <rect x="-500" y={visualAscenderY} width="2000"
                            height={visualCapHeightY - visualAscenderY}
                            fill="currentColor" fillOpacity={0.03} className="pointer-events-none" />
                      <rect x="-500" y={visualCapHeightY} width="2000"
                            height={visualXHeightY - visualCapHeightY}
                            fill="currentColor" fillOpacity={0.015} className="pointer-events-none" />
                      <rect x="-500" y={visualXHeightY} width="2000"
                            height={visualBaselineY - visualXHeightY}
                            fill="currentColor" fillOpacity={0.045} className="pointer-events-none" />
                      <rect x="-500" y={visualBaselineY} width="2000"
                            height={visualDescenderY - visualBaselineY}
                            fill="currentColor" fillOpacity={0.025} className="pointer-events-none" />

                      {/* Origem */}
                      <line x1={dynamicOriginX} y1="-200" x2={dynamicOriginX} y2="1500" stroke="currentColor" strokeOpacity={0.35} strokeWidth="3" strokeDasharray="6,6" />
                      <text x={dynamicOriginX} y={-220} textAnchor="middle" fontSize={22} fill="currentColor" fillOpacity={0.55} className="select-none">x = 0</text>

                 {renderHorizontalGuide(visualAscenderY, 'ASCENDER', 'Ascendente', { opacity: 0.35, width: 3, dash: '4,4' })}
                 {renderHorizontalGuide(visualCapHeightY, 'CAP_HEIGHT', 'Altura das maiúsculas', { opacity: 0.5, width: 2, dash: '6,4' })}
                 {renderHorizontalGuide(visualXHeightY, 'X_HEIGHT', 'Altura-x', { opacity: 0.5, width: 2, dash: '6,4' })}
                 {renderHorizontalGuide(visualBaselineY, 'BASELINE', 'Linha de base', { opacity: 0.85, width: 4, labelAbove: true })}
                 {renderHorizontalGuide(visualDescenderY, 'DESCENDER', 'Descendente', { opacity: 0.35, width: 3, dash: '4,4', labelAbove: true })}

                 {activeTab === 'METRICS' && contextGlyph && (
                     <g transform={contextTransform} className="opacity-10 pointer-events-none">
                         <path d={contextGlyph.pathData} fill="currentColor" />
                     </g>
                 )}

                 {activeTab === 'KERNING' && quickPairGhosts.map(ghost => (
                     <g
                         key={`quick-ghost-${ghost.id}`}
                         transform={`translate(${ghost.offsetX + ghost.glyph.leftSideBearing}, ${ghost.glyph.baselineOffset}) scale(${ghost.glyph.scale})`}
                         className="pointer-events-none"
                         opacity={0.2}
                     >
                         {renderGlyphLayers(ghost.glyph, INK)}
                     </g>
                 ))}

                 {activeTab === 'ACCENTS' && (
                     <g transform={`translate(${currentAnchor.x}, ${currentAnchor.y})`} className="cursor-move pointer-events-auto" onMouseDown={() => setDraggingGuide('ANCHOR')}>
                         <line x1="-60" y1="0" x2="60" y2="0" stroke="currentColor" strokeOpacity={editingDerivative ? 1 : 0.7} strokeWidth="6" />
                         <line x1="0" y1="-60" x2="0" y2="60" stroke="currentColor" strokeOpacity={editingDerivative ? 1 : 0.7} strokeWidth="6" />
                         <circle r="40" fill="transparent" stroke="currentColor" strokeOpacity={editingDerivative ? 0.35 : 0.2} strokeWidth="4" />
                     </g>
                 )}

                 {/* Glifo */}
                 <g transform={`translate(${data.leftSideBearing}, ${data.baselineOffset}) scale(${data.scale})`}>
                    <path d={previewPath} className={activeTab === 'STROKE' ? 'opacity-70' : undefined} />
                    {data.components.map((comp, idx) => {
                        const compG = allGlyphs?.find(g => g.char === comp.char);
                        if (!compG || !compG.pathData) return null;
                        const isDragging = draggingComponentIndex === idx;
                        return (
                            <g key={idx} transform={`translate(${comp.dx}, ${comp.dy}) scale(${comp.scale})`}
                                className={`fill-current transition-opacity duration-fast ease-out ${activeTab === 'COMPS' ? 'cursor-move pointer-events-auto hover:opacity-60' : 'pointer-events-none'} ${isDragging ? 'opacity-90' : 'opacity-40'}`}
                                onMouseDown={(e) => handleComponentMouseDown(e, idx)}>
                                <path d={compG.pathData} />
                                {activeTab === 'COMPS' && (
                                    <rect x={0} y={0} width="1000" height="1000" fill="transparent" stroke={isDragging ? 'currentColor' : 'transparent'} strokeWidth="10" strokeDasharray="20,20" />
                                )}
                            </g>
                        )
                    })}
                    {activeTab === 'ACCENTS' && Array.from<string>(selectedDerivatives).map((char) => {
                        if (editingDerivative && char !== editingDerivative) return null;
                        const recipe = derivatives.find(d => d.char === char);
                        if (!recipe) return null;
                        const accentGlyph = glyphMap.get(recipe.accent);
                        if (!accentGlyph) return null;
                        const accentBounds = measureGlyphBounds(accentGlyph);
                        if (!accentBounds) return null;
                        const accentCenterX = accentBounds.x + (accentBounds.width / 2);
                        const accentCenterY = accentBounds.y + (accentBounds.height / 2);
                        const pos = anchorOverrides[char] || globalAnchor;
                        const baseScale = data.scale && data.scale !== 0 ? data.scale : 1;
                        const accentScale = accentGlyph.scale && accentGlyph.scale !== 0 ? accentGlyph.scale : 1;
                        const accentComponentScale = accentScale / baseScale;
                        const anchorLocalX = (pos.x - data.leftSideBearing) / baseScale;
                        const anchorLocalY = (pos.y - data.baselineOffset) / baseScale;
                        const dx = anchorLocalX - (accentCenterX * accentComponentScale);
                        const dy = anchorLocalY - (accentCenterY * accentComponentScale);
                        const accentShape = renderGlyphLayers(accentGlyph, INK);
                        if (!accentShape) return null;
                        return (
                            <g
                                key={char}
                                transform={`translate(${dx}, ${dy}) scale(${accentComponentScale})`}
                                className={`${editingDerivative === char ? "opacity-100" : "opacity-50"} cursor-move pointer-events-auto`}
                                onMouseDown={(event) => handleAccentDragStart(event, char)}
                            >
                                {accentShape}
                            </g>
                        );
                    })}
                 </g>

                 {/* Caixa da largura de avanço */}
                 <rect
                     x={0}
                     y={Math.min(visualAscenderY, visualDescenderY)}
                     width={Math.max(0, data.advanceWidth)}
                     height={Math.abs(visualAscenderY - visualDescenderY)}
                     fill="currentColor"
                     fillOpacity={0.02}
                     stroke="currentColor"
                     strokeOpacity={0.3}
                     strokeWidth="4"
                     strokeDasharray="12,6"
                     className="pointer-events-none"
                 />
                 {/* Centro da largura de avanço */}
                 <line
                     x1={data.advanceWidth / 2}
                     y1={visualDescenderY + 20}
                     x2={data.advanceWidth / 2}
                     y2={visualAscenderY - 20}
                     stroke="currentColor"
                     strokeOpacity={0.2}
                     strokeWidth="2"
                     strokeDasharray="4,8"
                     className="pointer-events-none"
                 />
                 <text
                     x={data.advanceWidth / 2}
                     y={visualDescenderY + 44}
                     textAnchor="middle"
                     fontSize={18}
                     fill="currentColor"
                     fillOpacity={0.45}
                     className="pointer-events-none select-none"
                 >
                     Centro
                 </text>

                 <line x1={data.advanceWidth} y1="-200" x2={data.advanceWidth} y2="1500" stroke="currentColor" strokeOpacity={0.6} strokeWidth="3" strokeDasharray="8,8" />
                 <line x1={data.advanceWidth} y1="-200" x2={data.advanceWidth} y2="1500" stroke="transparent" strokeWidth="40" className="cursor-col-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('WIDTH')}>
                    <title>Arraste para mudar a largura de avanço</title>
                 </line>
                 <text x={data.advanceWidth + 14} y={56} fontSize={22} fill="currentColor" fillOpacity={0.55} className="select-none">Largura</text>
               </svg>
           </div>
        </div>

        {/* Painel lateral */}
        <aside className="material-card p-0 gap-0 lg:w-80 shrink-0 flex flex-col lg:min-h-0 overflow-visible lg:overflow-hidden">
          <div className="shrink-0 p-5 pb-4 hairline-b">
             <div className="relative flex items-center gap-2">
                 <div role="tablist" aria-label="Seções do editor" className="segmented flex-1 min-w-0">
                     {([
                         { key: 'METRICS', label: 'Glifo' },
                         { key: 'KERNING', label: 'Kerning' },
                         { key: 'ACCENTS', label: 'Acentos' },
                     ] as const).map(tab => (
                         <button
                             key={tab.key}
                             type="button"
                             role="tab"
                             aria-selected={activeTab === tab.key}
                             onClick={() => { setActiveTab(tab.key); setMoreTabsOpen(false); }}
                             className={cx('segmented-item flex-1', activeTab === tab.key && 'is-active')}
                         >
                             {tab.label}
                         </button>
                     ))}
                 </div>
                 <IconButton
                     label="Mais seções"
                     variant="quiet"
                     active={isMoreTab}
                     aria-expanded={moreTabsOpen}
                     onClick={() => setMoreTabsOpen(o => !o)}
                 >
                     <Ellipsis className="w-4 h-4" aria-hidden="true" />
                 </IconButton>
                 {moreTabsOpen && (
                     <div role="menu" className="material-popover absolute right-0 top-full mt-2 z-10 w-44 p-1 flex flex-col gap-0.5">
                         {(['COMPS', 'STROKE'] as const).map(t => (
                             <button
                                 key={t}
                                 type="button"
                                 role="menuitem"
                                 onClick={() => { setActiveTab(t); setMoreTabsOpen(false); }}
                                 className={cx('row', activeTab === t && 'is-active')}
                             >
                                 {t === 'COMPS' ? 'Componentes' : 'Traço'}
                             </button>
                         ))}
                     </div>
                 )}
             </div>
                 <datalist id="kerning-partner-options">
                     {partnerOptions.map(option => (
                          <option key={`partner-${option}`} value={option} />
                     ))}
                 </datalist>
          </div>

          <div className="flex-1 min-h-0 lg:overflow-y-auto p-5 flex flex-col gap-5">
            {activeTab === 'METRICS' && (
                <>
                <PanelGroup label="Geometria do glifo" first>
                    <SliderNumber label="Escala" value={data.scale} min={0.1} max={3} step={0.01} numberStep={0.01}
                        onValue={(raw) => handleChange('scale', parseFloat(raw))} onCommit={handleInputCommit} />
                    <SliderNumber label="Largura de avanço" value={data.advanceWidth} min={0} max={2000} step={10}
                        onValue={(raw) => handleChange('advanceWidth', parseInt(raw))} onCommit={handleInputCommit} />
                    <SliderNumber label="Margem esquerda" value={data.leftSideBearing} min={-500} max={500}
                        onValue={(raw) => handleChange('leftSideBearing', parseInt(raw))} onCommit={handleInputCommit} />
                    <SliderNumber label="Deslocamento vertical" value={data.baselineOffset} min={-500} max={500}
                        onValue={(raw) => handleChange('baselineOffset', parseInt(raw))} onCommit={handleInputCommit} />
                </PanelGroup>

                {/* Métricas da fonte inteira: fechadas por padrão */}
                <details className="group hairline-t pt-5">
                    <summary className="flex items-center justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <span className="label">Métricas globais</span>
                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            Afeta todos os glifos
                            <ChevronDown className="w-4 h-4 transition-transform duration-fast ease-out group-open:rotate-180" aria-hidden="true" />
                        </span>
                    </summary>
                    <div className="pt-4 flex flex-col gap-4">
                        <SliderNumber label="Ascendente" value={metadata.ascender} min={0} max={1500}
                            onValue={(raw) => onUpdateMetadata({...metadata, ascender: parseInt(raw)})}
                            onDecrement={() => onUpdateMetadata({...metadata, ascender: metadata.ascender - 10})}
                            onIncrement={() => onUpdateMetadata({...metadata, ascender: metadata.ascender + 10})} />
                        <SliderNumber label="Altura das maiúsculas" value={capHeight} min={0} max={1200}
                            onValue={(raw) => onUpdateMetadata(prev => ({...prev, capHeight: parseInt(raw)}))}
                            onDecrement={() => onUpdateMetadata(prev => ({...prev, capHeight: (prev.capHeight ?? 720) - 10}))}
                            onIncrement={() => onUpdateMetadata(prev => ({...prev, capHeight: (prev.capHeight ?? 720) + 10}))} />
                        <SliderNumber label="Altura-x" value={xHeight} min={0} max={1000}
                            onValue={(raw) => onUpdateMetadata(prev => ({...prev, xHeight: parseInt(raw)}))}
                            onDecrement={() => onUpdateMetadata(prev => ({...prev, xHeight: (prev.xHeight ?? 520) - 10}))}
                            onIncrement={() => onUpdateMetadata(prev => ({...prev, xHeight: (prev.xHeight ?? 520) + 10}))} />
                        <SliderNumber label="Descendente" value={metadata.descender} min={-500} max={0}
                            onValue={(raw) => onUpdateMetadata({...metadata, descender: parseInt(raw)})}
                            onDecrement={() => onUpdateMetadata({...metadata, descender: metadata.descender - 10})}
                            onIncrement={() => onUpdateMetadata({...metadata, descender: metadata.descender + 10})} />
                        <SliderNumber label="Deslocamento da linha de base" value={baselineShift} min={-400} max={400}
                            onValue={(raw) => onUpdateMetadata({...metadata, baselineShift: parseInt(raw)})}
                            onDecrement={() => onUpdateMetadata({...metadata, baselineShift: (baselineShift - 10)})}
                            onIncrement={() => onUpdateMetadata({...metadata, baselineShift: (baselineShift + 10)})} />
                    </div>
                </details>

                <PanelGroup label="Posição automática">
                    {metadata.autoPosition ? (
                        <div className="rounded-md bg-muted p-3 flex flex-col gap-3">
                            <p className="text-[13px] text-muted-foreground">
                                Referência: <span className="text-foreground">{metadata.autoPosition.sourceChar}</span>
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                <MiniValue caption="Altura" value={metadata.autoPosition.targetVisualHeight.toFixed(0)} />
                                <MiniValue caption="Vertical" value={metadata.autoPosition.baselineOffset} />
                                <MiniValue caption="Margem esq." value={metadata.autoPosition.leftSideBearing} />
                            </div>
                        </div>
                    ) : (
                        <p className="text-[13px] text-muted-foreground">Nenhuma referência definida.</p>
                    )}
                    <label className="flex items-center gap-2.5 text-[14px] text-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.manualPosition ?? false}
                            onChange={(e) => {
                                const newData = { ...data, manualPosition: e.target.checked };
                                setData(newData);
                                pushToHistory(newData);
                            }}
                            className="ctl-check"
                        />
                        Posição manual (ignora a automática)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                const bbox = measurePath(data.pathData);
                                const visualHeight = bbox && bbox.height > 0 ? bbox.height * data.scale : data.scale * 700;
                                const autoPos = {
                                    targetVisualHeight: visualHeight,
                                    baselineOffset: data.baselineOffset,
                                    leftSideBearing: data.leftSideBearing,
                                    sourceChar: glyph.char,
                                    sourceScale: data.scale,
                                };
                                onUpdateMetadata(prev => ({ ...prev, autoPosition: autoPos }));
                                if (onApplyAutoPosition) onApplyAutoPosition(autoPos);
                                pushNotice(`Posição automática definida a partir de '${glyph.char}'.`, 'success');
                            }}
                            className="ctl ctl-outline ctl-sm flex-1"
                        >
                            Usar como referência
                        </button>
                        {metadata.autoPosition && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!metadata.autoPosition) return;
                                    const bbox = measurePath(data.pathData);
                                    const newScale = bbox && bbox.height > 0
                                        ? metadata.autoPosition.targetVisualHeight / bbox.height
                                        : metadata.autoPosition.sourceScale;
                                    const newData = {
                                        ...data,
                                        scale: newScale,
                                        baselineOffset: metadata.autoPosition.baselineOffset,
                                        leftSideBearing: metadata.autoPosition.leftSideBearing,
                                        manualPosition: false,
                                    };
                                    setData(newData);
                                    pushToHistory(newData);
                                }}
                                disabled={!data.manualPosition}
                                className="ctl ctl-gray ctl-sm flex-1"
                            >
                                Voltar para a automática
                            </button>
                        )}
                    </div>
                </PanelGroup>

                {/* Alinhamento por guia: secundário, fechado por padrão */}
                <details className="group hairline-t pt-5">
                    <summary className="flex items-center justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <span className="label">Alinhamento por guia</span>
                        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            Opcional
                            <ChevronDown className="w-4 h-4 transition-transform duration-fast ease-out group-open:rotate-180" aria-hidden="true" />
                        </span>
                    </summary>
                    <div className="pt-4 flex flex-col gap-3">
                        <Segmented<'glyph' | 'anchor' | 'context'>
                            ariaLabel="O que alinhar"
                            value={alignmentTarget}
                            onChange={setAlignmentTarget}
                            items={[
                                { value: 'glyph', label: 'Glifo' },
                                { value: 'anchor', label: 'Âncora' },
                            ]}
                        />
                        <div className="grid grid-cols-3 gap-1.5">
                            {ALIGN_GUIDES.map(guide => {
                                const disabled = getGuideLineY(guide.key) === null;
                                return (
                                    <button
                                        key={guide.key}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleAlignToGuide(guide.key)}
                                        className="ctl ctl-outline ctl-sm px-1"
                                    >
                                        {guide.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[12px] text-muted-foreground">
                            {alignmentTarget === 'glyph' && 'Encaixa o glifo (topo, centro ou base) na guia escolhida.'}
                            {alignmentTarget === 'anchor' && 'Coloca a âncora direto sobre a guia.'}
                        </p>
                    </div>
                </details>
                </>
            )}

            {activeTab === 'KERNING' && (
                <>
                    <PanelGroup label="Diagnóstico" first>
                        <div className="grid grid-cols-4 gap-2">
                            <MiniValue caption="Margem esq." value={data.leftSideBearing} large />
                            <MiniValue caption="Margem dir." value={computedRightSideBearing} large />
                            <MiniValue caption="Avanço" value={data.advanceWidth} large />
                            <MiniValue caption="Viés" value={kerningBiasValue >= 0 ? `+${kerningBiasValue}` : `${kerningBiasValue}`} large />
                        </div>
                        <Field label="Viés de kerning (classe)" value={kerningBiasValue >= 0 ? `+${kerningBiasValue}` : kerningBiasValue}>
                            <input
                                type="range" min={-20} max={20} step={1}
                                value={kerningBiasValue}
                                onChange={(e) => handleChange('kerningBias', parseInt(e.target.value))}
                                onMouseUp={handleInputCommit}
                                onTouchEnd={handleInputCommit}
                                className="tool-slider w-full"
                            />
                        </Field>
                    </PanelGroup>

                    <PanelGroup
                        label="Visualizador de par"
                        aside={
                            <button type="button" onClick={handleOpenKerningPanelClick} className="ctl ctl-plain ctl-sm">
                                Painel completo
                                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                        }
                    >
                        <input
                            type="text" maxLength={1} list="kerning-partner-options"
                            value={kerningPartner}
                            onChange={(e) => setKerningPartner(e.target.value)}
                            placeholder="Parceiro (A, V, O, T…)"
                            aria-label="Glifo parceiro"
                            className="field text-center text-[18px]"
                        />
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_PARTNERS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setKerningPartner(c)}
                                    aria-pressed={kerningPartner === c}
                                    className={cx('ctl ctl-sm ctl-icon ctl-outline', kerningPartner === c && 'ctl-active')}
                                >{c}</button>
                            ))}
                        </div>
                        <Segmented<'LEFT' | 'BOTH' | 'RIGHT'>
                            ariaLabel="Lado do par"
                            value={kerningDirection}
                            onChange={setKerningDirection}
                            className="w-full [&>*]:flex-1"
                            items={[
                                { value: 'LEFT', label: `${kerningPartner || '·'}${glyph.char}` },
                                { value: 'BOTH', label: `${kerningPartner || '·'}${glyph.char}${kerningPartner || '·'}` },
                                { value: 'RIGHT', label: `${glyph.char}${kerningPartner || '·'}` },
                            ]}
                        />

                        {!kerningPartner ? (
                            <p className="text-[13px] text-muted-foreground text-center py-4">Escolha um parceiro para visualizar.</p>
                        ) : !glyphMap.has(kerningPartner) ? (
                            <p className="text-[13px] text-muted-foreground text-center py-4">O glifo "{kerningPartner}" não existe neste estilo.</p>
                        ) : pairLayout ? (
                            <>
                                <div className="bg-canvas rounded-lg p-3 text-foreground">
                                    <svg viewBox={pairLayout.viewBox}
                                        className="w-full h-40 fill-current"
                                        preserveAspectRatio="xMidYMid meet"
                                    >
                                        <line
                                            x1={pairLayout.viewStart}
                                            y1={pairLayout.baselineY}
                                            x2={pairLayout.viewStart + pairLayout.viewWidth}
                                            y2={pairLayout.baselineY}
                                            stroke="currentColor" strokeOpacity={0.3}
                                            strokeWidth={4} strokeDasharray="8,8"
                                        />
                                        {pairLayout.gaps.map((gap, idx) => {
                                            // Espaço positivo em traço cheio, negativo tracejado.
                                            const mid = (gap.startX + gap.endX) / 2;
                                            return (
                                                <g key={`pv-gap-${idx}`}>
                                                    <line x1={gap.startX} x2={gap.endX} y1={pairGapY} y2={pairGapY}
                                                        stroke="currentColor" strokeOpacity={0.75} strokeWidth={6}
                                                        strokeDasharray={gap.gap >= 0 ? undefined : '10,8'} />
                                                    <text x={mid} y={pairGapY - 14} textAnchor="middle"
                                                        fontSize={14} fill="currentColor" fillOpacity={0.6}
                                                    >{formatGapValue(gap.gap)}</text>
                                                </g>
                                            );
                                        })}
                                        {pairLayout.nodes.map((node, idx) => {
                                            if (!node.pathData) return null;
                                            return (
                                                <g key={`pv-node-${idx}`}
                                                    transform={`translate(${node.x + node.leftSideBearing}, ${pairLayout.baselineY + node.baselineOffset}) scale(${node.scale})`}
                                                ><path d={node.pathData} /></g>
                                            );
                                        })}
                                    </svg>
                                </div>
                                {activePairKey && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[12px] text-muted-foreground">
                                                Kerning <span className="text-foreground tabular">{activePairKey}</span>
                                            </span>
                                            <button type="button" onClick={() => handleInlineKerningChange(activePairKey, 0)} className="ctl ctl-plain ctl-sm">
                                                Zerar
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="number" value={activePairValue}
                                                onChange={(e) => handleInlineKerningChange(activePairKey, parseInt(e.target.value, 10) || 0)}
                                                aria-label={`Kerning de ${activePairKey}`}
                                                className="field field-sm tabular text-center w-20 no-spinner"
                                            />
                                            <input type="range" min={-400} max={400} step={5}
                                                value={activePairValue}
                                                onChange={(e) => handleInlineKerningChange(activePairKey, parseInt(e.target.value, 10))}
                                                aria-label={`Kerning de ${activePairKey}`}
                                                className="tool-slider flex-1"
                                            />
                                        </div>
                                        {kerningDirection === 'BOTH' && (
                                            <p className="text-[12px] text-muted-foreground">
                                                Editando o par {glyph.char}{kerningPartner}. Escolha {kerningPartner}{glyph.char} acima para editar o outro lado.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </PanelGroup>

                    <PanelGroup
                        label="Pares salvos"
                        aside={
                            <span className="text-[12px] text-muted-foreground tabular">
                                {allSavedPairs.length} {allSavedPairs.length === 1 ? 'par' : 'pares'}
                            </span>
                        }
                    >
                        {allSavedPairs.length === 0 ? (
                            <p className="text-[13px] text-muted-foreground">Nenhum par salvo com este glifo.</p>
                        ) : (
                            <div className="flex flex-col max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                {allSavedPairs.map(({ pair, partner, value, direction }, idx) => (
                                    <div key={pair} className={cx('flex items-center gap-2 min-h-10', idx < allSavedPairs.length - 1 && 'hairline-b')}>
                                        <span className="flex-1 min-w-0 flex items-center gap-1.5 text-[14px] text-foreground truncate">
                                            <span>{direction === 'right' ? glyph.char : describeKerningToken(partner)}</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                                            <span>{direction === 'right' ? describeKerningToken(partner) : glyph.char}</span>
                                        </span>
                                        <input type="number" value={value}
                                            onChange={(e) => handleInlineKerningChange(pair, parseInt(e.target.value, 10) || 0)}
                                            aria-label={`Kerning de ${pair}`}
                                            className="field field-sm tabular text-center w-16 no-spinner"
                                        />
                                        <IconButton label="Remover par" variant="plain" onClick={() => handleRemoveKerningPair(pair)}>
                                            <X className="w-4 h-4" aria-hidden="true" />
                                        </IconButton>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PanelGroup>
                </>
            )}

            {activeTab === 'ACCENTS' && (
                <>
                    <PanelGroup
                        label={editingDerivative ? `Âncora de ${editingDerivative}` : 'Âncora global'}
                        first
                        aside={editingDerivative ? (
                            <button type="button" onClick={() => setEditingDerivative(null)} className="ctl ctl-plain ctl-sm">
                                Voltar à global
                            </button>
                        ) : undefined}
                    >
                        <SliderNumber label="X" value={currentAnchor.x} min={anchorRangeX.min} max={anchorRangeX.max}
                            onValue={(raw) => handleAnchorChange('x', parseInt(raw))} />
                        <SliderNumber label="Y" value={currentAnchor.y} min={anchorRangeY.min} max={anchorRangeY.max}
                            onValue={(raw) => handleAnchorChange('y', parseInt(raw))} />
                    </PanelGroup>

                    <PanelGroup label="Derivados">
                        {derivatives.length === 0 ? (
                            <p className="text-[13px] text-muted-foreground">Nenhum glifo acentuado usa este como base.</p>
                        ) : (
                            <div className="flex flex-col gap-0.5 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                                {derivatives.map(d => {
                                    const isEditing = editingDerivative === d.char;
                                    return (
                                        <div key={d.char} className={cx('row gap-3', isEditing && 'is-active')}>
                                            <input
                                                type="checkbox"
                                                checked={selectedDerivatives.has(d.char)}
                                                onChange={() => toggleDerivative(d.char)}
                                                aria-label={`Incluir ${d.char}`}
                                                className="ctl-check"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSelectDerivativeToEdit(d.char)}
                                                aria-pressed={isEditing}
                                                className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left min-h-8"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="w-5 text-[14px]">{d.char}</span>
                                                    <span className="text-[12px] opacity-60">{d.accent}</span>
                                                </span>
                                                {anchorOverrides[d.char] && <span className="chip chip-outline">Ajustada</span>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <button type="button" onClick={handleBuildDerivativesClick} className="ctl ctl-filled w-full">
                            Aplicar a {selectedDerivatives.size} {selectedDerivatives.size === 1 ? 'glifo' : 'glifos'}
                        </button>
                        <p className="text-[12px] text-muted-foreground">
                            Atualiza cada derivado marcado com as coordenadas acima.
                        </p>
                    </PanelGroup>
                </>
            )}

            {activeTab === 'COMPS' && (
                <PanelGroup label="Componentes" first>
                     <div className="flex gap-2">
                         <input
                            type="text"
                            value={manualComponentChar}
                            onChange={(e) => setManualComponentChar(e.target.value)}
                            placeholder="Caractere…"
                            aria-label="Caractere do componente"
                            className="field flex-1 min-w-0"
                        />
                        <button type="button" onClick={handleAddManualComponent} className="ctl ctl-outline">Adicionar</button>
                     </div>
                     <div className="flex flex-col gap-2">
                         {data.components.length === 0 && <p className="text-[13px] text-muted-foreground text-center py-4">Nenhum componente ligado.</p>}
                         {data.components.map((comp, i) => (
                             <div key={i} className={cx('rounded-md bg-muted p-3 flex flex-col gap-2', draggingComponentIndex === i && 'ring-1 ring-foreground')}>
                                 <div className="flex justify-between items-center">
                                     <span className="text-[14px] text-foreground">{comp.char}</span>
                                     <IconButton label="Remover componente" variant="danger" onClick={() => handleRemoveComponent(i)}>
                                         <X className="w-4 h-4" aria-hidden="true" />
                                     </IconButton>
                                 </div>
                                 <div className="grid grid-cols-3 gap-2">
                                     <Field label="X">
                                         <input type="number" value={comp.dx} onBlur={handleInputCommit} onChange={(e) => handleUpdateComponent(i, 'dx', parseInt(e.target.value))} className="field field-sm tabular w-full no-spinner" />
                                     </Field>
                                     <Field label="Y">
                                         <input type="number" value={comp.dy} onBlur={handleInputCommit} onChange={(e) => handleUpdateComponent(i, 'dy', parseInt(e.target.value))} className="field field-sm tabular w-full no-spinner" />
                                     </Field>
                                     <Field label="Escala">
                                         <input type="number" step="0.1" value={comp.scale} onBlur={handleInputCommit} onChange={(e) => handleUpdateComponent(i, 'scale', parseFloat(e.target.value))} className="field field-sm tabular w-full no-spinner" />
                                     </Field>
                                 </div>
                             </div>
                         ))}
                     </div>
                </PanelGroup>
            )}

            {activeTab === 'STROKE' && (
                <PanelGroup label="Traço" first>
                    <Field label="Espessura do traço" value={`${strokeWidth}px`}>
                        <input
                            type="range" min="1" max="100"
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className="tool-slider w-full"
                        />
                    </Field>
                    <button type="button" onClick={handleStrokeExpand} className="ctl ctl-outline w-full">
                        Expandir traço
                    </button>
                </PanelGroup>
            )}

          </div>
        </aside>
      </div>
    </div>
  );
};

/* ------------------------------------------------ peças locais do painel */

/** Grupo do painel: rótulo micro, conteúdo, fio acima quando não é o primeiro. */
const PanelGroup: React.FC<{ label: React.ReactNode; aside?: React.ReactNode; first?: boolean; children: React.ReactNode }> = ({ label, aside, first, children }) => (
    <section className={cx('flex flex-col gap-4', !first && 'hairline-t pt-5')}>
        <header className="flex items-center justify-between gap-2 min-h-7">
            <span className="label">{label}</span>
            {aside}
        </header>
        {children}
    </section>
);

/** Número pequeno sobre a legenda cinza. */
const MiniValue: React.FC<{ caption: string; value: React.ReactNode; large?: boolean }> = ({ caption, value, large }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
        <span className={cx('font-normal tabular text-foreground leading-tight', large ? 'text-[20px]' : 'text-[14px]')}>{value}</span>
        <span className="text-[11px] text-muted-foreground truncate">{caption}</span>
    </div>
);

interface SliderNumberProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    numberStep?: number;
    onValue: (raw: string) => void;
    /** Grava no histórico: ao soltar o slider e ao sair do campo. */
    onCommit?: () => void;
    onDecrement?: () => void;
    onIncrement?: () => void;
}

/** Rótulo e campo numérico na mesma linha, slider embaixo; passos de ±10 opcionais. */
const SliderNumber: React.FC<SliderNumberProps> = ({ label, value, min, max, step, numberStep, onValue, onCommit, onDecrement, onIncrement }) => (
    <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-muted-foreground truncate">{label}</span>
            <div className="flex items-center gap-1 shrink-0">
                {onDecrement && (
                    <IconButton label={`Diminuir ${label.toLowerCase()}`} variant="plain" onClick={onDecrement}>
                        <Minus className="w-4 h-4" aria-hidden="true" />
                    </IconButton>
                )}
                <input
                    type="number"
                    step={numberStep}
                    value={value}
                    onBlur={onCommit}
                    onChange={(e) => onValue(e.target.value)}
                    aria-label={label}
                    className="field field-sm tabular text-center w-[4.5rem] no-spinner"
                />
                {onIncrement && (
                    <IconButton label={`Aumentar ${label.toLowerCase()}`} variant="plain" onClick={onIncrement}>
                        <Plus className="w-4 h-4" aria-hidden="true" />
                    </IconButton>
                )}
            </div>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onMouseUp={onCommit}
            onChange={(e) => onValue(e.target.value)}
            aria-label={label}
            className="tool-slider w-full"
        />
    </div>
);

export default EditorModal;

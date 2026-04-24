import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { GlyphData, FontMetadata, COMPOSITE_RECIPES, DEFAULT_TRACKING_PROFILES } from '../types';
import { expandStrokeToPath, measurePath } from '../services/importService';
import { computeGlyphSequenceLayout, GlyphSequenceLayout } from '../services/layoutService';
import { resolveKerningValue } from '../services/kerningService';
import { useNotice } from '../contexts/NoticeContext';
import { centerGlyphInBox } from '../services/professionalKerningService';

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
    { key: 'ASCENDER', label: 'Asc', snap: 'top' },
    { key: 'BASELINE', label: 'Base', snap: 'bottom' },
    { key: 'DESCENDER', label: 'Desc', snap: 'bottom' },
    { key: 'GHOST_TOP', label: 'Ghost ↑', snap: 'top' },
    { key: 'GHOST_CENTER', label: 'Ghost ·', snap: 'center' },
    { key: 'GHOST_BOTTOM', label: 'Ghost ↓', snap: 'bottom' }
];

type KerningPreviewState = {
    combos: string[];
    layout?: GlyphSequenceLayout | null;
    error?: string;
};

const formatGapValue = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

const describeKerningToken = (token: string) => {
    if (token === ' ') return 'SPACE';
    if (!token || !token.trim()) return '∅';
    return token;
};

const EditorModal: React.FC<EditorModalProps> = ({ glyph, allGlyphs, isOpen, onClose, onSave, metadata, onUpdateMetadata, onUpdateMembers, onBuildDerivatives, isDarkMode, onOpenKerningPanel, onApplyAutoPosition }) => {
    const [data, setData] = useState<GlyphData>(() => ensureKerningBias(glyph));
        const [activeTab, setActiveTab] = useState<'METRICS' | 'KERNING' | 'ACCENTS' | 'COMPS' | 'STROKE'>('METRICS');
  const [strokeWidth, setStrokeWidth] = useState(10);
  
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
    const [kerningPreviewZoom, setKerningPreviewZoom] = useState(1);
    const [kerningPreviewPan, setKerningPreviewPan] = useState({ x: 0, y: 0 });
    const [isPreviewPanMode, setIsPreviewPanMode] = useState(false);
    const [isPreviewPanning, setIsPreviewPanning] = useState(false);
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
        setKerningPreviewPan({ x: 0, y: 0 });
        setIsPreviewPanMode(false);
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

  const handleKerningPreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPreviewPanMode || !kerningPreviewLayout) return;
      e.preventDefault();
      e.stopPropagation();
      previewPanStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          originX: kerningPreviewPan.x,
          originY: kerningPreviewPan.y,
      };
      setIsPreviewPanning(true);
  };

  useEffect(() => {
      if (!isPreviewPanning) return;
      const handleMouseMove = (e: MouseEvent) => {
          if (!previewPanStartRef.current) return;
          const deltaX = e.clientX - previewPanStartRef.current.x;
          const deltaY = e.clientY - previewPanStartRef.current.y;
          setKerningPreviewPan({
              x: previewPanStartRef.current.originX + deltaX,
              y: previewPanStartRef.current.originY + deltaY,
          });
      };
      const handleMouseUp = () => {
          setIsPreviewPanning(false);
          previewPanStartRef.current = null;
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isPreviewPanning]);

  useEffect(() => {
      setKerningPreviewPan({ x: 0, y: 0 });
      setIsPreviewPanMode(false);
  }, [kerningPartner]);

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
          return { combos, error: 'Partner glyph not found in this style.' };
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
            heading: `${glyph.char} na esquerda`,
            caption: `${glyph.char}${leftKerningPartner || '·'}`,
            partner: leftKerningPartner,
            setPartner: setLeftKerningPartner,
            value: leftKerningValue,
            setValue: setLeftKerningValue,
            direction: 'LEFT' as const,
            description: 'Aplica quando este glifo antecede o parceiro.',
            pairKey: leftKerningPartner ? `${glyph.char}${leftKerningPartner}` : null,
        },
        {
            id: 'right',
            heading: `${glyph.char} na direita`,
            caption: `${rightKerningPartner || '·'}${glyph.char}`,
            partner: rightKerningPartner,
            setPartner: setRightKerningPartner,
            value: rightKerningValue,
            setValue: setRightKerningValue,
            direction: 'RIGHT' as const,
            description: 'Aplica quando o parceiro vem primeiro.',
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
          pushNotice('Este glifo não tem path para centralizar.', 'warning');
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
      pushNotice(`Glifo centralizado: LSB=${centered.leftSideBearing}, Width=${centered.advanceWidth}`, 'success');
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
      if (confirm("This will permanently convert the stroke to a filled path. Continue?")) {
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
  
  const GUIDE_COLOR_BASELINE = "#ef4444"; 
  const GUIDE_COLOR_METRIC = isDarkMode ? "#64748b" : "#94a3b8"; 
  const GUIDE_COLOR_WIDTH = "#3b82f6"; 
  const GUIDE_COLOR_XHEIGHT = "#22c55e";
  const GUIDE_COLOR_CAPHEIGHT = "#8b5cf6";
  const LABEL_COLOR = isDarkMode ? "fill-slate-400" : "fill-slate-500";

    const themeBg = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-black';
  const panelBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-200';
  const textMain = isDarkMode ? 'text-white' : 'text-black';
  const textSub = isDarkMode ? 'text-slate-500' : 'text-neutral-500';
  const inputBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-neutral-300 text-black';
  const btnSec = isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-neutral-300 hover:border-black text-neutral-500 hover:text-black';
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

    return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      {/* Utility to hide input spinners */}
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
      
    <div className={`border rounded-xl w-full max-w-7xl h-[85vh] flex overflow-hidden ${themeBg}`}>
        
        {/* Left: Preview Canvas */}
        <div className={`flex-1 relative overflow-hidden flex items-center justify-center p-10 [background-size:20px_20px] ${isDarkMode ? 'bg-slate-950 bg-[radial-gradient(#707070_1px,transparent_1px)]' : 'bg-neutral-50 bg-[radial-gradient(#d4d4d4_1px,transparent_1px)]'}`}>
           <div
                ref={canvasRef}
                className={`relative w-full h-full border select-none ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-200'}`}
            >
               <svg
                    viewBox="-500 -400 2000 1800"
                    className={`w-full h-full fill-current overflow-visible pointer-events-none ${textMain}`}
                    preserveAspectRatio="xMidYMid meet"
               >
                 
                      {/* ═══ TYPOGRAPHIC ZONES (Glyphs App style) ═══ */}
                      {/* Ascender zone: above capHeight to ascender (blue) */}
                      <rect x="-500" y={visualAscenderY} width="2000" 
                            height={visualCapHeightY - visualAscenderY} 
                            fill={isDarkMode ? "rgba(139, 92, 246, 0.08)" : "rgba(139, 92, 246, 0.05)"} className="pointer-events-none" />
                      {/* Cap Height to x-Height zone (light purple/blue) */}
                      <rect x="-500" y={visualCapHeightY} width="2000"
                            height={visualXHeightY - visualCapHeightY}
                            fill={isDarkMode ? "rgba(59, 130, 246, 0.06)" : "rgba(59, 130, 246, 0.04)"} className="pointer-events-none" />
                      {/* x-Height zone: baseline to x-Height (green) */}
                      <rect x="-500" y={visualXHeightY} width="2000"
                            height={visualBaselineY - visualXHeightY}
                            fill={isDarkMode ? "rgba(34, 197, 94, 0.08)" : "rgba(34, 197, 94, 0.05)"} className="pointer-events-none" />
                      {/* Descender zone: below baseline (red) */}
                      <rect x="-500" y={visualBaselineY} width="2000"
                            height={visualDescenderY - visualBaselineY}
                            fill={isDarkMode ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)"} className="pointer-events-none" />

                      {/* Origin line */}
                      <line x1={dynamicOriginX} y1="-200" x2={dynamicOriginX} y2="1500" stroke={GUIDE_COLOR_METRIC} strokeWidth="3" strokeDasharray="6,6" />
                      <g transform={`translate(${dynamicOriginX - 15}, -240)`}>
                          <rect x="0" y="0" width="60" height="20" className={`${isDarkMode ? 'fill-slate-800' : 'fill-neutral-200'}`} rx="3" />
                          <text x="30" y="14" textAnchor="middle" className={`text-[10px] font-mono font-bold ${LABEL_COLOR}`}>X=0</text>
                      </g>

                 {/* Ascender */}
                 <line x1="-500" y1={visualAscenderY} x2="1500" y2={visualAscenderY} stroke={GUIDE_COLOR_METRIC} strokeWidth="3" strokeDasharray="4,4" className="pointer-events-auto" />
                 <line x1="-500" y1={visualAscenderY} x2="1500" y2={visualAscenderY} stroke="transparent" strokeWidth="40" className="cursor-row-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('ASCENDER')} />
                 <g transform={`translate(-480, ${visualAscenderY + 6})`}>
                    <rect x="0" y="-12" width="70" height="16" className={`${isDarkMode ? 'fill-slate-800' : 'fill-neutral-200'}`} rx="2" />
                    <text x="5" y="0" className={`text-xs font-bold font-mono tracking-widest select-none ${LABEL_COLOR}`}>ASCENDER</text>
                 </g>

                 {/* Cap Height */}
                 <line x1="-500" y1={visualCapHeightY} x2="1500" y2={visualCapHeightY} stroke={GUIDE_COLOR_CAPHEIGHT} strokeWidth="2" strokeDasharray="6,4" strokeOpacity="0.6" className="pointer-events-auto" />
                 <line x1="-500" y1={visualCapHeightY} x2="1500" y2={visualCapHeightY} stroke="transparent" strokeWidth="40" className="cursor-row-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('CAP_HEIGHT')} />
                 <g transform={`translate(-480, ${visualCapHeightY + 6})`}>
                    <rect x="0" y="-12" width="80" height="16" fill={isDarkMode ? "#1e1b4b" : "#ede9fe"} rx="2" />
                    <text x="5" y="0" className="text-xs font-bold font-mono tracking-widest select-none" fill={GUIDE_COLOR_CAPHEIGHT}>CAP HEIGHT</text>
                 </g>

                 {/* x-Height */}
                 <line x1="-500" y1={visualXHeightY} x2="1500" y2={visualXHeightY} stroke={GUIDE_COLOR_XHEIGHT} strokeWidth="2" strokeDasharray="6,4" strokeOpacity="0.6" className="pointer-events-auto" />
                 <line x1="-500" y1={visualXHeightY} x2="1500" y2={visualXHeightY} stroke="transparent" strokeWidth="40" className="cursor-row-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('X_HEIGHT')} />
                 <g transform={`translate(-480, ${visualXHeightY + 6})`}>
                    <rect x="0" y="-12" width="70" height="16" fill={isDarkMode ? "#052e16" : "#dcfce7"} rx="2" />
                    <text x="5" y="0" className="text-xs font-bold font-mono tracking-widest select-none" fill={GUIDE_COLOR_XHEIGHT}>x-HEIGHT</text>
                 </g>

                 {/* Baseline */}
                 <line x1="-500" y1={visualBaselineY} x2="1500" y2={visualBaselineY} stroke={GUIDE_COLOR_BASELINE} strokeWidth="4" strokeOpacity="0.8" className="pointer-events-auto" />
                 <line x1="-500" y1={visualBaselineY} x2="1500" y2={visualBaselineY} stroke="transparent" strokeWidth="40" className="cursor-row-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('BASELINE')} />
                 <g transform={`translate(-480, ${visualBaselineY - 6})`}>
                    <rect x="0" y="-12" width="70" height="16" className={`${isDarkMode ? 'fill-slate-800' : 'fill-neutral-200'}`} rx="2" />
                    <text x="5" y="0" className={`text-xs font-bold font-mono tracking-widest select-none ${LABEL_COLOR}`}>BASELINE</text>
                 </g>
                 
                 {/* Descender */}
                 <line x1="-500" y1={visualDescenderY} x2="1500" y2={visualDescenderY} stroke={GUIDE_COLOR_METRIC} strokeWidth="3" strokeDasharray="4,4" className="pointer-events-auto" />
                 <line x1="-500" y1={visualDescenderY} x2="1500" y2={visualDescenderY} stroke="transparent" strokeWidth="40" className="cursor-row-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('DESCENDER')} />
                 <g transform={`translate(-480, ${visualDescenderY - 6})`}>
                    <rect x="0" y="-12" width="75" height="16" className={`${isDarkMode ? 'fill-slate-800' : 'fill-neutral-200'}`} rx="2" />
                    <text x="5" y="0" className={`text-xs font-bold font-mono tracking-widest select-none ${LABEL_COLOR}`}>DESCENDER</text>
                 </g>

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
                         {renderGlyphLayers(ghost.glyph, isDarkMode ? '#cbd5f5' : '#94a3b8')}
                     </g>
                 ))}

                 {activeTab === 'ACCENTS' && (
                     <g transform={`translate(${currentAnchor.x}, ${currentAnchor.y})`} className="cursor-move pointer-events-auto" onMouseDown={() => setDraggingGuide('ANCHOR')}>
                         <line x1="-60" y1="0" x2="60" y2="0" stroke={editingDerivative ? "#eab308" : "#ef4444"} strokeWidth="6" />
                         <line x1="0" y1="-60" x2="0" y2="60" stroke={editingDerivative ? "#eab308" : "#ef4444"} strokeWidth="6" />
                         <circle r="40" fill="transparent" stroke={editingDerivative ? "rgba(234, 179, 8, 0.3)" : "rgba(239, 68, 68, 0.2)"} strokeWidth="4" />
                     </g>
                 )}

                 {/* Main Glyph Rendering */}
                 <g transform={`translate(${data.leftSideBearing}, ${data.baselineOffset}) scale(${data.scale})`}>
                    <path d={previewPath} className={activeTab === 'STROKE' ? 'fill-blue-600' : ''} />
                    {data.components.map((comp, idx) => {
                        const compG = allGlyphs?.find(g => g.char === comp.char);
                        if (!compG || !compG.pathData) return null;
                        const isDragging = draggingComponentIndex === idx;
                        return (
                            <g key={idx} transform={`translate(${comp.dx}, ${comp.dy}) scale(${comp.scale})`} 
                                className={`fill-blue-600 ${activeTab === 'COMPS' ? 'cursor-move pointer-events-auto hover:fill-blue-500' : 'pointer-events-none'} ${isDragging ? 'fill-blue-400 opacity-90' : 'opacity-40'}`}
                                onMouseDown={(e) => handleComponentMouseDown(e, idx)}>
                                <path d={compG.pathData} />
                                {activeTab === 'COMPS' && (
                                    <rect x={0} y={0} width="1000" height="1000" fill="transparent" stroke={isDragging ? (isDarkMode ? "white" : "black") : "transparent"} strokeWidth="10" strokeDasharray="20,20" />
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
                        const fillColor = editingDerivative === char ? "#ca8a04" : "#dc2626";
                        const accentShape = renderGlyphLayers(accentGlyph, fillColor);
                        if (!accentShape) return null;
                        return (
                            <g
                                key={char}
                                transform={`translate(${dx}, ${dy}) scale(${accentComponentScale})`}
                                className={`${editingDerivative === char ? "opacity-100" : "opacity-60"} cursor-move pointer-events-auto`}
                                onMouseDown={(event) => handleAccentDragStart(event, char)}
                            >
                                {accentShape}
                            </g>
                        );
                    })}
                 </g>
                 
                 {/* CAIXA VISUAL DO ADVANCE WIDTH - Retângulo que mostra a área do glifo */}
                 <rect 
                     x={0} 
                     y={visualDescenderY} 
                     width={data.advanceWidth} 
                     height={visualAscenderY - visualDescenderY}
                     fill="none"
                     stroke={isDarkMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)'}
                     strokeWidth="4"
                     strokeDasharray="12,6"
                     className="pointer-events-none"
                 />
                 {/* Preenchimento semi-transparente para visualização */}
                 <rect 
                     x={0} 
                     y={visualDescenderY} 
                     width={data.advanceWidth} 
                     height={visualAscenderY - visualDescenderY}
                     fill={isDarkMode ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)'}
                     className="pointer-events-none"
                 />
                 {/* Indicador de centro do advance width */}
                 <line 
                     x1={data.advanceWidth / 2} 
                     y1={visualDescenderY + 20} 
                     x2={data.advanceWidth / 2} 
                     y2={visualAscenderY - 20}
                     stroke={isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}
                     strokeWidth="2"
                     strokeDasharray="4,8"
                     className="pointer-events-none"
                 />
                 {/* Label do centro */}
                 <g transform={`translate(${data.advanceWidth / 2}, ${visualDescenderY + 40})`}>
                     <text 
                         x="0" 
                         y="0" 
                         textAnchor="middle" 
                         className={`text-[9px] font-mono pointer-events-none ${isDarkMode ? 'fill-blue-400' : 'fill-blue-500'}`}
                         opacity="0.6"
                     >
                         CENTER
                     </text>
                 </g>
                 
                 <line x1={data.advanceWidth} y1="-200" x2={data.advanceWidth} y2="1500" stroke={GUIDE_COLOR_WIDTH} strokeWidth="3" strokeDasharray="8,8" />
                 <line x1={data.advanceWidth} y1="-200" x2={data.advanceWidth} y2="1500" stroke="transparent" strokeWidth="40" className="cursor-col-resize pointer-events-auto" onMouseDown={() => setDraggingGuide('WIDTH')}>
                    <title>Drag to change Width</title>
                 </line>
                 <g transform={`translate(${data.advanceWidth + 10}, 50)`}>
                    <rect x="0" y="-12" width="50" height="16" className={`${isDarkMode ? 'fill-slate-800' : 'fill-neutral-200'}`} rx="2" />
                    <text x="5" y="0" className={`text-xs font-bold font-mono tracking-widest select-none ${LABEL_COLOR}`}>WIDTH</text>
                 </g>
               </svg>
           </div>
        </div>

        {/* Right: Controls - Compact */}
        <div className={`w-80 border-l flex flex-col shrink-0 ${panelBg}`}>
          <div className={`p-3 border-b flex flex-col gap-2 ${isDarkMode ? 'border-slate-800' : 'border-neutral-200'}`}>
             <div className="flex justify-between items-center">
                <h2 className={`text-lg font-bold flex items-baseline gap-2 ${textMain}`}>Edit '{glyph.char}' <span className={`text-xs font-normal ${textSub}`}>({glyph.name})</span></h2>
                <div className="flex gap-1">
                    <button onClick={handleCenterGlyph} className={`text-[10px] px-2 h-7 rounded border ${isDarkMode ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300 hover:bg-emerald-800' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-700'}`} title="Centraliza o glifo baseado no centro real do vetor">⚖️ Centralizar</button>
                    <button onClick={handleAutoCenter} className={`text-[10px] px-2 h-7 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-black'}`}>Reset LSB</button>
                </div>
             </div>
             {/* MENU BUTTONS - GRID LAYOUT FIXED - 5 Columns */}
                 <div className={`grid grid-cols-5 gap-1 p-1 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-neutral-100'}`}>
                     {['METRICS', 'KERNING', 'ACCENTS', 'COMPS', 'STROKE'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`text-[9px] py-1.5 px-0.5 rounded font-bold uppercase transition-colors text-center truncate ${activeTab === tab ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-neutral-500 hover:text-black')}`}>{tab}</button>
                ))}
             </div>
                 <datalist id="kerning-partner-options">
                     {partnerOptions.map(option => (
                          <option key={`partner-${option}`} value={option} />
                     ))}
                 </datalist>
          </div>
          
          <div className={`flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar ${textMain}`}>
            {activeTab === 'METRICS' && (
                <>
                {/* Global Metrics */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Global Vertical Limits</label>
                    <div className="space-y-2">
                        {/* Ascender */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                 <label className={`text-[10px] font-bold ${textSub}`}>Ascender</label>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => onUpdateMetadata({...metadata, ascender: metadata.ascender - 10})} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>-</button>
                                    <input type="number" value={metadata.ascender} onChange={(e) => onUpdateMetadata({...metadata, ascender: parseInt(e.target.value)})} className={`w-16 h-7 rounded text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                    <button onClick={() => onUpdateMetadata({...metadata, ascender: metadata.ascender + 10})} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>+</button>
                                 </div>
                             </div>
                             <input type="range" min="0" max="1500" value={metadata.ascender} onChange={(e) => onUpdateMetadata({...metadata, ascender: parseInt(e.target.value)})} className={`w-full h-1.5 rounded-lg cursor-pointer block mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                        </div>
                        {/* Cap Height */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                 <label className={`text-[10px] font-bold ${textSub}`} style={{color: GUIDE_COLOR_CAPHEIGHT}}>Cap Height</label>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => onUpdateMetadata(prev => ({...prev, capHeight: (prev.capHeight ?? 720) - 10}))} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>-</button>
                                    <input type="number" value={capHeight} onChange={(e) => onUpdateMetadata(prev => ({...prev, capHeight: parseInt(e.target.value)}))} className={`w-16 h-7 rounded text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                    <button onClick={() => onUpdateMetadata(prev => ({...prev, capHeight: (prev.capHeight ?? 720) + 10}))} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>+</button>
                                 </div>
                             </div>
                             <input type="range" min="0" max="1200" value={capHeight} onChange={(e) => onUpdateMetadata(prev => ({...prev, capHeight: parseInt(e.target.value)}))} className={`w-full h-1.5 rounded-lg cursor-pointer block mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} style={{accentColor: GUIDE_COLOR_CAPHEIGHT}} />
                        </div>
                        {/* x-Height */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                 <label className={`text-[10px] font-bold ${textSub}`} style={{color: GUIDE_COLOR_XHEIGHT}}>x-Height</label>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => onUpdateMetadata(prev => ({...prev, xHeight: (prev.xHeight ?? 520) - 10}))} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>-</button>
                                    <input type="number" value={xHeight} onChange={(e) => onUpdateMetadata(prev => ({...prev, xHeight: parseInt(e.target.value)}))} className={`w-16 h-7 rounded text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                    <button onClick={() => onUpdateMetadata(prev => ({...prev, xHeight: (prev.xHeight ?? 520) + 10}))} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>+</button>
                                 </div>
                             </div>
                             <input type="range" min="0" max="1000" value={xHeight} onChange={(e) => onUpdateMetadata(prev => ({...prev, xHeight: parseInt(e.target.value)}))} className={`w-full h-1.5 rounded-lg cursor-pointer block mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} style={{accentColor: GUIDE_COLOR_XHEIGHT}} />
                        </div>
                        {/* Descender */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                 <label className={`text-[10px] font-bold ${textSub}`}>Descender</label>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => onUpdateMetadata({...metadata, descender: metadata.descender - 10})} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>-</button>
                                    <input type="number" value={metadata.descender} onChange={(e) => onUpdateMetadata({...metadata, descender: parseInt(e.target.value)})} className={`w-16 h-7 rounded text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                    <button onClick={() => onUpdateMetadata({...metadata, descender: metadata.descender + 10})} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>+</button>
                                 </div>
                             </div>
                             <input type="range" min="-500" max="0" value={metadata.descender} onChange={(e) => onUpdateMetadata({...metadata, descender: parseInt(e.target.value)})} className={`w-full h-1.5 rounded-lg cursor-pointer block mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                        </div>

                        {/* Baseline Shift */}
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                 <label className={`text-[10px] font-bold ${textSub}`}>Baseline Shift</label>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => onUpdateMetadata({...metadata, baselineShift: (baselineShift - 10)})} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>-</button>
                                    <input type="number" value={baselineShift} onChange={(e) => onUpdateMetadata({...metadata, baselineShift: parseInt(e.target.value)})} className={`w-16 h-7 rounded text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                    <button onClick={() => onUpdateMetadata({...metadata, baselineShift: (baselineShift + 10)})} className={`w-6 h-7 flex items-center justify-center rounded border text-xs ${btnSec}`}>+</button>
                                 </div>
                             </div>
                             <input type="range" min="-400" max="400" value={baselineShift} onChange={(e) => onUpdateMetadata({...metadata, baselineShift: parseInt(e.target.value)})} className={`w-full h-1.5 rounded-lg cursor-pointer block mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                        </div>
                    </div>
                </div>

                {/* Geometry */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Glyph Geometry</label>
                    <div className="space-y-3">
                        {/* Scale */}
                        <div className="flex items-center gap-2">
                            <label className={`text-[10px] font-bold w-10 ${textSub}`}>Scale</label>
                            <input type="range" min="0.1" max="3" step="0.01" value={data.scale} onMouseUp={handleInputCommit} onChange={(e) => handleChange('scale', parseFloat(e.target.value))} className={`flex-1 h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                            <input type="number" step="0.01" value={data.scale} onBlur={handleInputCommit} onChange={(e) => handleChange('scale', parseFloat(e.target.value))} className={`w-14 h-7 text-sm rounded text-center font-bold outline-none border no-spinner ${inputBg}`} />
                        </div>
                        {/* Width */}
                        <div className="flex items-center gap-2">
                            <label className={`text-[10px] font-bold w-10 ${textSub}`}>Width</label>
                            <input type="range" min="0" max="2000" step="10" value={data.advanceWidth} onMouseUp={handleInputCommit} onChange={(e) => handleChange('advanceWidth', parseInt(e.target.value))} className={`flex-1 h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                            <input type="number" value={data.advanceWidth} onBlur={handleInputCommit} onChange={(e) => handleChange('advanceWidth', parseInt(e.target.value))} className={`w-14 h-7 text-sm rounded text-center font-bold outline-none border no-spinner ${inputBg}`} />
                        </div>
                        {/* LSB */}
                        <div className="flex items-center gap-2">
                            <label className={`text-[10px] font-bold w-10 ${textSub}`}>X Off</label>
                            <input type="range" min="-500" max="500" value={data.leftSideBearing} onMouseUp={handleInputCommit} onChange={(e) => handleChange('leftSideBearing', parseInt(e.target.value))} className={`flex-1 h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                            <input type="number" value={data.leftSideBearing} onBlur={handleInputCommit} onChange={(e) => handleChange('leftSideBearing', parseInt(e.target.value))} className={`w-14 h-7 text-sm rounded text-center font-bold outline-none border no-spinner ${inputBg}`} />
                        </div>
                        {/* Baseline */}
                        <div className="flex items-center gap-2">
                            <label className={`text-[10px] font-bold w-10 ${textSub}`}>Y Off</label>
                            <input type="range" min="-500" max="500" value={data.baselineOffset} onMouseUp={handleInputCommit} onChange={(e) => handleChange('baselineOffset', parseInt(e.target.value))} className={`flex-1 h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`} />
                            <input type="number" value={data.baselineOffset} onBlur={handleInputCommit} onChange={(e) => handleChange('baselineOffset', parseInt(e.target.value))} className={`w-14 h-7 text-sm rounded text-center font-bold outline-none border no-spinner ${inputBg}`} />
                        </div>
                    </div>
                </div>

                {/* Auto Position */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Auto Position</label>
                    <div className="space-y-2">
                        {metadata.autoPosition ? (
                            <div className={`text-[10px] p-2 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-neutral-200'}`}>
                                <p className={`font-bold ${textSub}`}>Referência: <span className={textMain}>'{metadata.autoPosition.sourceChar}'</span></p>
                                <div className={`grid grid-cols-3 gap-1 mt-1 text-[9px] font-mono ${textSub}`}>
                                    <span>H: {metadata.autoPosition.targetVisualHeight.toFixed(0)}</span>
                                    <span>Y: {metadata.autoPosition.baselineOffset}</span>
                                    <span>LSB: {metadata.autoPosition.leftSideBearing}</span>
                                </div>
                            </div>
                        ) : (
                            <p className={`text-[10px] italic ${textSub}`}>Nenhuma referência definida.</p>
                        )}
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={data.manualPosition ?? false}
                                onChange={(e) => {
                                    const newData = { ...data, manualPosition: e.target.checked };
                                    setData(newData);
                                    pushToHistory(newData);
                                }}
                                className="rounded w-3 h-3 accent-black"
                            />
                            <label className={`text-[10px] font-bold ${textSub}`}>Posição manual (ignora auto)</label>
                        </div>
                        <div className="flex gap-1">
                            <button
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
                                    pushNotice(`Auto Position definida a partir de '${glyph.char}'.`, 'success');
                                }}
                                className={`flex-1 text-[9px] py-1.5 rounded border font-bold uppercase tracking-wide ${isDarkMode ? 'bg-white text-black border-white hover:bg-neutral-200' : 'bg-black text-white border-black hover:bg-neutral-800'}`}
                            >
                                Usar como referência
                            </button>
                            {metadata.autoPosition && (
                                <button
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
                                    className={`flex-1 text-[9px] py-1.5 rounded border font-bold uppercase tracking-wide ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-neutral-300 text-black hover:border-black'} disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                    Resetar para auto
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Context & Ghost Char */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Context & Ghost Char</label>
                    <div className="space-y-3">
                        <input 
                            type="text" maxLength={1}
                            value={contextChar}
                            onChange={(e) => setContextChar(e.target.value)}
                            placeholder="Ghost Char..."
                            className={`w-full border rounded px-3 py-1.5 text-center font-black text-lg uppercase outline-none ${inputBg}`}
                        />
                        <div className="flex gap-1">
                            {['LEFT', 'OVERLAP', 'RIGHT'].map(pos => (
                                <button key={pos} onClick={() => setContextPos(pos as any)} className={`flex-1 text-[9px] py-1.5 rounded border font-bold ${contextPos === pos ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black border-black text-white') : `${textSub} ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-300'}`}`}>
                                    {pos}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`text-[10px] font-bold block mb-1 ${textSub}`}>X</label>
                                <input type="range" min="-500" max="500" value={contextOffset.x} onChange={(e) => setContextOffset(prev => ({ ...prev, x: parseInt(e.target.value) }))} className={`w-full h-1.5 rounded cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`} />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold block mb-1 ${textSub}`}>Y</label>
                                <input type="range" min="-500" max="500" value={contextOffset.y} onChange={(e) => setContextOffset(prev => ({ ...prev, y: parseInt(e.target.value) }))} className={`w-full h-1.5 rounded cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ghost Gap Visualization */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Ghost Gap Visualization</label>
                    {!contextChar ? (
                        <p className={`text-[11px] ${textSub}`}>Defina um ghost char para ver o espaçamento.</p>
                    ) : ghostGlyphMissing ? (
                        <p className={`text-[11px] ${textSub}`}>
                            O glifo <span className="font-mono font-bold">{contextChar}</span> não existe neste estilo.
                        </p>
                    ) : !ghostSpacingLayout ? (
                        <p className={`text-[11px] ${textSub}`}>Pré-visualização indisponível.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className={`text-[10px] font-bold uppercase tracking-[0.3em] ${textSub}`}>
                                {`${contextChar}${glyph.char}${contextChar}`}
                            </div>
                            <div className={`border rounded-lg p-3 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-neutral-200'}`}>
                                <svg
                                    viewBox={ghostSpacingLayout.viewBox}
                                    className={`w-full h-48 ${isDarkMode ? 'fill-white' : 'fill-black'}`}
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    <line
                                        x1={ghostSpacingLayout.viewStart}
                                        y1={ghostSpacingLayout.baselineY}
                                        x2={ghostSpacingLayout.viewStart + ghostSpacingLayout.viewWidth}
                                        y2={ghostSpacingLayout.baselineY}
                                        stroke={isDarkMode ? '#475569' : '#94a3b8'}
                                        strokeWidth={4}
                                        strokeDasharray="8,8"
                                    />
                                    {ghostSpacingLayout.gaps.map((gap, idx) => {
                                        const color = gap.gap >= 0 ? (isDarkMode ? '#22c55e' : '#15803d') : (isDarkMode ? '#fb7185' : '#dc2626');
                                        const mid = (gap.startX + gap.endX) / 2;
                                        return (
                                            <g key={`ghost-gap-${gap.leftChar}-${gap.rightChar}-${idx}`}>
                                                <line
                                                    x1={gap.startX}
                                                    x2={gap.endX}
                                                    y1={ghostGapGuideY}
                                                    y2={ghostGapGuideY}
                                                    stroke={color}
                                                    strokeWidth={6}
                                                    strokeLinecap="round"
                                                />
                                                <text
                                                    x={mid}
                                                    y={ghostGapGuideY - 10}
                                                    textAnchor="middle"
                                                    fontFamily="monospace"
                                                    fontSize={12}
                                                    fill={isDarkMode ? '#cbd5f5' : '#475569'}
                                                >
                                                    {formatGapValue(gap.gap)}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    {ghostSpacingLayout.nodes.map((node, idx) => {
                                        if (!node.pathData) return null;
                                        return (
                                            <g
                                                key={`ghost-node-${node.char}-${idx}`}
                                                transform={`translate(${node.x + node.leftSideBearing}, ${ghostSpacingLayout.baselineY + node.baselineOffset}) scale(${node.scale})`}
                                            >
                                                <path d={node.pathData} />
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {ghostSpacingLayout.gaps.map((gap, idx) => {
                                    const pairKey = `${gap.leftChar}${gap.rightChar}`;
                                    const kerningValue = metadata.kerning?.[pairKey] ?? 0;
                                    return (
                                        <div
                                            key={`ghost-gap-card-${gap.leftChar}-${gap.rightChar}-${idx}`}
                                            className={`p-2 rounded border text-xs font-mono space-y-1 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-neutral-200 bg-white'}`}
                                        >
                                            <div className="flex items-center justify-between text-[10px] uppercase">
                                                <span>{gap.leftChar}</span>
                                                <span className={`${textSub}`}>→</span>
                                                <span>{gap.rightChar}</span>
                                            </div>
                                            <input
                                                type="number"
                                                value={kerningValue}
                                                onChange={(e) => handleInlineKerningChange(pairKey, parseFloat(e.target.value))}
                                                className={`w-full text-center text-base font-bold rounded border px-1 py-0.5 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-neutral-300 text-black'}`}
                                            />
                                            <p className={`text-[10px] ${textSub}`}>
                                                Gap {formatGapValue(gap.gap)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Alignment Guides */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Alignment Guides</label>
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                            {['glyph', 'anchor', 'context'].map(target => (
                                <button
                                    key={target}
                                    onClick={() => setAlignmentTarget(target as 'glyph' | 'anchor' | 'context')}
                                    className={`text-[9px] py-1.5 rounded border font-bold uppercase tracking-wide ${alignmentTarget === target ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : `${textSub} ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-300'}`}`}
                                >
                                    {target}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                            {ALIGN_GUIDES.map(guide => {
                                const disabled = getGuideLineY(guide.key) === null;
                                return (
                                    <button
                                        key={guide.key}
                                        disabled={disabled}
                                        onClick={() => handleAlignToGuide(guide.key)}
                                        className={`text-[10px] py-1.5 rounded border font-bold uppercase tracking-wide ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white hover:border-white' : 'bg-white border-neutral-300 text-black hover:border-black'}`}
                                    >
                                        {guide.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p className={`text-[10px] leading-tight ${textSub}`}>
                            {alignmentTarget === 'glyph' && 'Moves the glyph so its top/center/bottom snaps to the chosen guide.'}
                            {alignmentTarget === 'anchor' && 'Drops the anchor point directly on the selected guide.'}
                            {alignmentTarget === 'context' && 'Slides the ghost/context glyph so its reference matches the guide.'}
                        </p>
                    </div>
                </div>

                {/* Kerning Preview */}
                <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <label className={`text-[9px] font-black uppercase tracking-wider opacity-70`}>Kerning Preview</label>
                        <button
                            onClick={handleOpenKerningPanelClick}
                            className={`text-[9px] px-2 py-1.5 rounded border font-bold uppercase tracking-wide ${isDarkMode ? 'text-white border-slate-700 hover:border-white' : 'text-black border-neutral-300 hover:border-black'}`}
                        >
                            Open in Kerning Panel
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className={`text-[10px] font-bold block mb-1 ${textSub}`}>Partner glyph</label>
                            <input
                                type="text"
                                maxLength={1}
                                list="kerning-partner-options"
                                value={kerningPartner}
                                onChange={(e) => setKerningPartner(e.target.value)}
                                placeholder="A, V, O, T…"
                                className={`w-full border rounded px-3 py-1.5 text-center font-black text-lg uppercase outline-none ${inputBg}`}
                            />
                        </div>
                        {kerningPartner ? (
                            kerningPreview?.error ? (
                                <div className={`${textSub} text-[11px] italic`}>{kerningPreview.error}</div>
                            ) : kerningPreview ? (
                                <div className="space-y-2">
                                    <div className={`text-lg md:text-xl font-mono tracking-[0.16em] text-center ${textSub}`}>
                                        {kerningPreview.combos.join('   ')}
                                    </div>
                                    <div
                                        className={`border rounded-lg p-3 overflow-hidden ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-neutral-200'} ${isPreviewPanMode ? (isPreviewPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                                        onMouseDown={handleKerningPreviewMouseDown}
                                    >
                                        {kerningPreviewLayout && (
                                            <svg
                                                viewBox={kerningPreviewLayout.viewBox}
                                                className={`w-full h-48 md:h-64 transition-transform duration-150 ${isDarkMode ? 'fill-white' : 'fill-black'}`}
                                                preserveAspectRatio="xMidYMid meet"
                                                style={{ transform: `translate(${kerningPreviewPan.x}px, ${kerningPreviewPan.y}px) scale(${kerningPreviewZoom})`, transformOrigin: '50% 50%' }}
                                            >
                                                <line
                                                    x1={kerningPreviewLayout.viewStart}
                                                    y1={kerningPreviewLayout.baselineY}
                                                    x2={kerningPreviewLayout.viewStart + kerningPreviewLayout.viewWidth}
                                                    y2={kerningPreviewLayout.baselineY}
                                                    stroke={isDarkMode ? '#475569' : '#94a3b8'}
                                                    strokeWidth={6}
                                                    strokeDasharray="12,12"
                                                />
                                                {kerningPreviewLayout.gaps.map((gap, idx) => {
                                                    if (gap.leftChar === ' ' || gap.rightChar === ' ') return null;
                                                    const color = gap.gap >= 0 ? (isDarkMode ? '#22c55e' : '#15803d') : (isDarkMode ? '#fb7185' : '#dc2626');
                                                    const mid = (gap.startX + gap.endX) / 2;
                                                    return (
                                                        <g key={`kern-gap-${gap.leftChar}-${gap.rightChar}-${idx}`}>
                                                            <line
                                                                x1={gap.startX}
                                                                x2={gap.endX}
                                                                y1={kerningPreviewGapY}
                                                                y2={kerningPreviewGapY}
                                                                stroke={color}
                                                                strokeWidth={6}
                                                                strokeLinecap="round"
                                                            />
                                                            <text
                                                                x={mid}
                                                                y={kerningPreviewGapY - 20}
                                                                textAnchor="middle"
                                                                fontFamily="monospace"
                                                                fontSize={12}
                                                                fill={isDarkMode ? '#cbd5f5' : '#475569'}
                                                            >
                                                                {formatGapValue(gap.gap)}
                                                            </text>
                                                        </g>
                                                    );
                                                })}
                                                {kerningPreviewLayout.nodes.map((node, idx) => {
                                                    if (!node.pathData) return null;
                                                    return (
                                                        <g
                                                            key={`kern-node-${node.char}-${idx}`}
                                                            transform={`translate(${node.x + node.leftSideBearing}, ${kerningPreviewLayout.baselineY + node.baselineOffset}) scale(${node.scale})`}
                                                        >
                                                            <path d={node.pathData} />
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <div>
                                                <label className={`text-[10px] font-bold ${textSub}`}>Preview Zoom</label>
                                                <p className={`text-[11px] font-mono ${textMain}`}>{Math.round(kerningPreviewZoom * 100)}%</p>
                                            </div>
                                            <button
                                                onClick={() => setIsPreviewPanMode(prev => !prev)}
                                                disabled={!kerningPreviewLayout}
                                                className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-3 py-1.5 border transition ${!kerningPreviewLayout ? 'opacity-40 cursor-not-allowed' : ''} ${isPreviewPanMode ? (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black') : (isDarkMode ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' : 'bg-white border-neutral-300 text-black hover:bg-neutral-100')}`}
                                            >
                                                {isPreviewPanMode ? 'Pan ativo' : 'Pan do preview'}
                                            </button>
                                        </div>
                                        <input
                                            type="range"
                                            min={0.5}
                                            max={10}
                                            step={0.1}
                                            value={kerningPreviewZoom}
                                            onChange={(e) => setKerningPreviewZoom(parseFloat(e.target.value))}
                                            className={`w-full h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`}
                                        />
                                        <button
                                            onClick={() => setKerningPreviewPan({ x: 0, y: 0 })}
                                            disabled={!kerningPreviewLayout || (kerningPreviewPan.x === 0 && kerningPreviewPan.y === 0)}
                                            className={`w-full mt-2 text-[10px] font-bold uppercase tracking-wide rounded-lg border py-1.5 ${(!kerningPreviewLayout || (kerningPreviewPan.x === 0 && kerningPreviewPan.y === 0)) ? 'opacity-40 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' : 'bg-white border-neutral-300 text-black hover:bg-neutral-100'}`}
                                        >
                                            Reset pan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={`${textSub} text-[11px] italic`}>Kerning preview unavailable.</div>
                            )
                        ) : (
                            <div className={`${textSub} text-[11px] italic`}>Select a partner glyph to preview spacing.</div>
                        )}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className={`text-[10px] font-bold ${textSub}`}>Kerning Bias</label>
                                <span className={`text-xs font-mono font-bold ${textMain}`}>
                                    {kerningBiasValue >= 0 ? `+${kerningBiasValue}` : kerningBiasValue}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={-20}
                                max={20}
                                step={1}
                                value={kerningBiasValue}
                                onChange={(e) => handleChange('kerningBias', parseInt(e.target.value))}
                                onMouseUp={handleInputCommit}
                                onTouchEnd={handleInputCommit}
                                className={`w-full h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`}
                            />
                        </div>
                    </div>
                </div>
                </>
            )}

            {activeTab === 'KERNING' && (
                <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <label className={`text-[9px] font-black uppercase tracking-wider opacity-70`}>Diagnóstico de Espaçamento</label>
                            <span className={`text-[10px] font-mono ${textSub}`}>
                                {(kerningPairsBySide.asLeft.length + kerningPairsBySide.asRight.length)} par{(kerningPairsBySide.asLeft.length + kerningPairsBySide.asRight.length) === 1 ? '' : 'es'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[{
                                label: 'Largura Avançada',
                                value: `${data.advanceWidth} u`,
                                detail: 'Largura total do slot'
                            }, {
                                label: 'Margem Esquerda',
                                value: `${data.leftSideBearing} u`,
                                detail: 'Espaço antes do desenho'
                            }, {
                                label: 'Margem Direita',
                                value: `${computedRightSideBearing} u`,
                                detail: 'Avanço menos a largura desenhada'
                            }, {
                                label: 'Largura Desenhada',
                                value: activeGlyphBounds ? `${Math.round(activeGlyphBounds.width)} u` : '—',
                                detail: 'Largura do desenho atual'
                            }, {
                                label: 'Deslocamento da Linha',
                                value: `${data.baselineOffset} u`,
                                detail: 'Ajuste vertical aplicado'
                            }, {
                                label: 'Viés de Kerning',
                                value: kerningBiasValue >= 0 ? `+${kerningBiasValue}` : `${kerningBiasValue}`,
                                detail: 'Somado automaticamente a cada par'
                            }].map((metric, idx) => (
                                <div
                                    key={`diagnostic-${metric.label}-${idx}`}
                                    className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-neutral-200'}`}
                                >
                                    <p className={`text-[9px] font-bold uppercase tracking-wider ${textSub}`}>{metric.label}</p>
                                    <p className="text-xl font-black leading-tight">{metric.value}</p>
                                    <p className={`text-[10px] ${textSub}`}>{metric.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-200'}`}>
                        <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Construtor de Pares Rápido</label>
                        <div className="space-y-3">
                            {quickBuilderCards.map(card => {
                                const storedValue = card.pairKey ? metadata.kerning?.[card.pairKey] ?? 0 : 0;
                                return (
                                    <div
                                        key={`builder-${card.id}`}
                                        className={`rounded-xl border p-3 space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-neutral-50 border-neutral-200'}`}
                                    >
                                        <div className="flex items-baseline justify-between gap-2">
                                            <div>
                                                <p className={`text-[10px] font-semibold uppercase tracking-wide ${textSub}`}>{card.heading}</p>
                                                <p className="text-xs uppercase font-mono">Par {card.caption}</p>
                                            </div>
                                            <span className={`text-[10px] ${textSub}`}>{card.description}</span>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            list="kerning-partner-options"
                                            value={card.partner}
                                            onChange={(e) => card.setPartner(e.target.value.slice(0, 6))}
                                            placeholder="Glifo ou grupo"
                                            className={`w-full border rounded px-2 py-1 text-sm font-mono uppercase outline-none ${inputBg}`}
                                        />
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={card.value}
                                                onChange={(e) => {
                                                    const next = parseInt(e.target.value, 10);
                                                    card.setValue(Number.isNaN(next) ? 0 : next);
                                                }}
                                                className={`w-24 border rounded px-2 py-1 text-sm font-bold text-center no-spinner ${inputBg}`}
                                            />
                                            <input
                                                type="range"
                                                min={-400}
                                                max={400}
                                                step={5}
                                                value={card.value}
                                                onChange={(e) => card.setValue(parseInt(e.target.value, 10))}
                                                className={`flex-1 h-1.5 rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5 text-[10px] font-mono">
                                            <div className="flex items-center justify-between">
                                                <span className={textSub}>Kerning salvo: {formatGapValue(storedValue)}</span>
                                                <span className={textSub}>Valor proposto: {formatGapValue(card.value)}</span>
                                            </div>
                                            <p className={`${textSub} text-[9px]`}>O ghost do par aparece automaticamente na tela principal para ajustes visuais.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleApplyKerningBuilder(card.direction)}
                                                disabled={!card.partner}
                                                className={`flex-1 text-[10px] font-bold uppercase tracking-wide rounded-lg py-1.5 border ${!card.partner ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-white text-black border-white hover:bg-neutral-200' : 'bg-black text-white border-black hover:bg-neutral-800'}`}
                                            >
                                                Salvar Par
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => card.setValue(0)}
                                                className={`px-3 text-[10px] font-semibold uppercase tracking-wide rounded-lg border ${isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-neutral-300 text-neutral-500 hover:text-black'}`}
                                            >
                                                Zerar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className={`text-[10px] mt-2 ${textSub}`}>
                            Use o mesmo campo para atingir classes de kerning. Os valores só entram em vigor após clicar em "Salvar Par".
                        </p>
                    </div>

                    <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-neutral-200'}`}>
                        <label className={`text-[9px] font-black uppercase tracking-wider block mb-2 opacity-70`}>Pares Salvos</label>
                        <div className="space-y-3">
                            {[{
                                title: `${glyph.char} → parceiro`,
                                pairs: kerningPairsBySide.asLeft,
                                isGlyphLeading: true
                            }, {
                                title: `parceiro → ${glyph.char}`,
                                pairs: kerningPairsBySide.asRight,
                                isGlyphLeading: false
                            }].map((section, idx) => (
                                <div key={`kerning-section-${idx}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide">{section.title}</p>
                                        <span className={`text-[10px] ${textSub}`}>{section.pairs.length} par{section.pairs.length === 1 ? '' : 'es'}</span>
                                    </div>
                                    {section.pairs.length === 0 ? (
                                        <p className={`text-[10px] italic ${textSub}`}>
                                            {section.isGlyphLeading ? 'Nenhum par com este glifo na esquerda.' : 'Nenhum par com este glifo na direita.'}
                                        </p>
                                    ) : (
                                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                            {section.pairs.map(({ pair, partner, value }) => (
                                                <div
                                                    key={`${section.title}-${pair}`}
                                                    className={`flex items-center gap-2 rounded border px-2 py-1 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-neutral-50 border-neutral-200'}`}
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-xs font-mono">
                                                            {section.isGlyphLeading
                                                                ? `${glyph.char} → ${describeKerningToken(partner)}`
                                                                : `${describeKerningToken(partner)} → ${glyph.char}`}
                                                        </p>
                                                        <p className={`text-[9px] ${textSub}`}>{pair}</p>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={value}
                                                        onChange={(e) => handleInlineKerningChange(pair, parseInt(e.target.value, 10))}
                                                        className={`w-20 text-sm font-bold text-center border rounded px-1 py-0.5 no-spinner ${inputBg}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveKerningPair(pair)}
                                                        className={`w-7 h-7 rounded-full text-sm font-black border ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100'}`}
                                                        title="Remover par"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Other tabs maintained with new input size standards */}
            {activeTab === 'ACCENTS' && (
                <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${editingDerivative ? 'bg-yellow-50 border-yellow-300 text-black' : (isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200')}`}>
                        <h3 className={`font-bold mb-3 text-xs flex items-center gap-2 ${editingDerivative ? 'text-yellow-700' : ''}`}>
                            <span className="text-sm">✢</span> 
                            {editingDerivative ? `Anchor: ${editingDerivative}` : "Global Anchor"}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className={`text-[10px] font-bold block mb-1 uppercase ${textSub}`}>X</label>
                                <input type="number" value={currentAnchor.x} onChange={(e) => handleAnchorChange('x', parseInt(e.target.value))} className={`w-full h-8 rounded px-2 text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                <input
                                    type="range"
                                    min={anchorRangeX.min}
                                    max={anchorRangeX.max}
                                    value={currentAnchor.x}
                                    onChange={(e) => handleAnchorChange('x', parseInt(e.target.value))}
                                    className={`w-full h-1 rounded mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-bold block mb-1 uppercase ${textSub}`}>Y</label>
                                <input type="number" value={currentAnchor.y} onChange={(e) => handleAnchorChange('y', parseInt(e.target.value))} className={`w-full h-8 rounded px-2 text-center text-sm font-bold outline-none border no-spinner ${inputBg}`} />
                                <input
                                    type="range"
                                    min={anchorRangeY.min}
                                    max={anchorRangeY.max}
                                    value={currentAnchor.y}
                                    onChange={(e) => handleAnchorChange('y', parseInt(e.target.value))}
                                    className={`w-full h-1 rounded mt-1 ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-300 accent-black'}`}
                                />
                            </div>
                        </div>

                        {editingDerivative && (
                            <button onClick={() => setEditingDerivative(null)} className={`w-full text-[10px] underline mb-2 ${textSub} hover:text-current`}>
                                Reset to Global
                            </button>
                        )}

                        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            {derivatives.map(d => (
                                <div key={d.char} className={`flex items-center gap-2 p-1.5 rounded border transition-colors ${editingDerivative === d.char ? 'bg-yellow-100 border-yellow-400 text-black' : (isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-white' : 'bg-white border-neutral-200 hover:border-black')}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedDerivatives.has(d.char)}
                                        onChange={() => toggleDerivative(d.char)}
                                        className="rounded w-3 h-3 accent-black"
                                    />
                                    <div 
                                        onClick={() => handleSelectDerivativeToEdit(d.char)}
                                        className="flex-1 flex items-center justify-between cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold w-5 text-xs">{d.char}</span>
                                            <span className="text-[9px] opacity-60">({d.accent})</span>
                                        </div>
                                        {anchorOverrides[d.char] && <span className="text-[8px] font-bold bg-yellow-100 text-yellow-800 px-1 rounded">CUSTOM</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleBuildDerivativesClick} className={`w-full mt-3 py-1.5 font-bold rounded-lg transition-colors text-[10px] ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>
                            Aplicar em {selectedDerivatives.size} glifos
                        </button>
                        <p className={`text-[9px] mt-1 text-center ${textSub}`}>
                            Atualiza cada derivado marcado usando as coordenadas acima.
                        </p>
                    </div>
                </div>
            )}
            
            {activeTab === 'COMPS' && (
                <div className="space-y-3">
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            value={manualComponentChar}
                            onChange={(e) => setManualComponentChar(e.target.value)}
                            placeholder="Add char..."
                            className={`flex-1 border rounded px-2 py-1.5 text-xs outline-none ${inputBg}`}
                        />
                        <button onClick={handleAddManualComponent} className={`px-3 rounded font-bold text-xs ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>Add</button>
                     </div>
                     <div className="space-y-2">
                         {data.components.length === 0 && <div className={`${textSub} text-[10px] italic text-center py-4`}>No components linked.</div>}
                         {data.components.map((comp, i) => (
                             <div key={i} className={`p-2 rounded border text-xs ${draggingComponentIndex === i ? 'border-blue-500 ring-1 ring-blue-500' : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-neutral-50 border-neutral-200')}`}>
                                 <div className="flex justify-between items-center mb-1">
                                     <span className="font-bold">{comp.char}</span>
                                     <button onClick={() => handleRemoveComponent(i)} className="text-red-500 hover:text-current font-bold">✕</button>
                                 </div>
                                 <div className="grid grid-cols-3 gap-2">
                                     <input type="number" value={comp.dx} onBlur={handleInputCommit} onChange={(e) => handleUpdateComponent(i, 'dx', parseInt(e.target.value))} className={`w-full h-7 rounded px-1 text-xs border no-spinner ${inputBg}`} />
                                     <input type="number" value={comp.dy} onBlur={handleInputCommit} onChange={(e) => handleUpdateComponent(i, 'dy', parseInt(e.target.value))} className={`w-full h-7 rounded px-1 text-xs border no-spinner ${inputBg}`} />
                                     <input type="number" step="0.1" value={comp.scale} onBlur={handleInputCommit} onChange={(e) => handleUpdateComponent(i, 'scale', parseFloat(e.target.value))} className={`w-full h-7 rounded px-1 text-xs border no-spinner ${inputBg}`} />
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            )}

            {activeTab === 'STROKE' && (
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-[10px] font-bold mb-2">
                            <span>Stroke Width</span>
                            <span className="font-mono">{strokeWidth}px</span>
                        </div>
                        <input 
                            type="range" min="1" max="100" 
                            value={strokeWidth} 
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-700 accent-white' : 'bg-neutral-200 accent-black'}`}
                        />
                    </div>
                    <button onClick={handleStrokeExpand} className={`w-full py-2 font-bold rounded text-xs transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>
                        Expand Stroke
                    </button>
                </div>
            )}
            
          </div>
          <div className={`p-3 border-t flex gap-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-neutral-200'}`}>
             <button onClick={handleCloseWithAutoSave} className={`flex-1 py-2 rounded-lg border transition-colors text-xs font-bold ${btnSec}`}>Close</button>
             <button onClick={handleSave} className={`flex-1 py-2 rounded-lg font-bold transition-colors text-xs ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorModal;

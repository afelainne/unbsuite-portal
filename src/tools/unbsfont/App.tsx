import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  GlyphData, 
  FontMetadata, 
  INITIAL_METADATA, 
  generateInitialGlyphs,
  COMPOSITE_RECIPES,
  GlyphComponent,
  Project
} from './types';
import Toolbar from './components/Toolbar';
import GlyphCard from './components/GlyphCard';
import EditorModal from './components/EditorModal';
import SpacingManager from './components/SpacingManager';
import TestMode from './components/TestMode';
import Dashboard from './components/Dashboard';
import CompactEditor from './components/CompactEditor';
import ModeSelector from './components/ModeSelector';
import FontPreview from './components/FontPreview';
import GlyphDiagnostics from './components/GlyphDiagnostics';
import { exportFont, FontExportError } from './services/fontService';
import { exportSvgBasedFont } from './services/svgFontExporter';
import { downloadFontEditorFont, downloadFontEditorFontWithKerning } from './services/fontEditorExporter';
import { exportGlyphSvgSheet } from './services/svgSheetExportService';
import { processSVGSheet, generateCompositePath, GLYPH_NAME_MAP, measurePath, extractSingleGlyphFromSVG } from './services/importService';
import { buildProjectFilePayload, downloadProjectFile, parseProjectFile, PROJECT_FILE_EXTENSION } from './services/projectFileService';
import { NoticeContext, NoticeVariant } from './contexts/NoticeContext';
import { KerningPair } from './services/professionalKerningService';

type ViewMode = 'GRID' | 'TEST';
type Screen = 'DASHBOARD' | 'MODE_SELECT' | 'EDITOR';
type EditorMode = 'COMPACT' | 'ADVANCED';
interface Notice {
    id: number;
    message: string;
    variant: NoticeVariant;
}

interface AppSnapshot {
    glyphs: GlyphData[];
    metadata: FontMetadata;
    styleMap: Record<string, GlyphData[]>;
    projects: Project[];
    activeProjectId: string | null;
    currentStyle: string;
    screen: Screen;
    viewMode: ViewMode;
    zoom: number;
    showAll: boolean;
    isDarkMode: boolean;
    isPasteMode: boolean;
    selectedChars: string[];
    selectedGlyphChar: string | null;
    isEditorOpen: boolean;
    isSpacingManagerOpen: boolean;
}

const HISTORY_LIMIT = 200;

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createProjectId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const extractProjectBaseName = (fileName: string): string => {
    if (!fileName) return '';
    const trimmed = fileName.trim();
    if (!trimmed) return '';
    const lower = trimmed.toLowerCase();
    if (lower.endsWith(PROJECT_FILE_EXTENSION)) {
        return trimmed.slice(0, trimmed.length - PROJECT_FILE_EXTENSION.length);
    }
    const lastDot = trimmed.lastIndexOf('.');
    return lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
};

const toSafeDownloadBaseName = (rawName: string): string => {
    const cleaned = rawName.replace(/[<>:"/\\|?*]/g, '').trim();
    if (!cleaned) return 'font-project';
    return cleaned.replace(/\s+/g, '-');
};

const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const deriveCustomGlyphSemantics = (char: string) => {
    const codePoint = char.codePointAt(0) ?? 0;
    const isWhitespace = char === ' ';
    const isUppercase = codePoint >= 65 && codePoint <= 90;
    const isLowercase = codePoint >= 97 && codePoint <= 122;
    const isNumbers = codePoint >= 48 && codePoint <= 57;
    const isPunctuation = !isUppercase && !isLowercase && !isNumbers && !isWhitespace;
    let script: 'latin' | 'numbers' | 'symbols' | 'punctuation' | 'other' = 'other';
    if (isUppercase || isLowercase) script = 'latin';
    else if (isNumbers) script = 'numbers';
    else if (isPunctuation) script = 'symbols';
    return { isWhitespace, isUppercase, isLowercase, isPunctuation, script };
};

const createCustomGlyphSlot = (char: string, name?: string): GlyphData => {
    const semantics = deriveCustomGlyphSemantics(char);
    return {
        char,
        name: name || char,
        unicode: char.codePointAt(0) ?? 0,
        pathData: '',
        advanceWidth: char === ' ' ? 250 : 600,
        leftSideBearing: 50,
        baselineOffset: 0,
        scale: 1,
        groups: { left: '', right: '' },
        inheritsFrom: null,
        shapeLeft: 'straight',
        shapeRight: 'straight',
        script: semantics.script,
        isWhitespace: semantics.isWhitespace,
        isPunctuation: semantics.isPunctuation,
        isUppercase: semantics.isUppercase,
        isLowercase: semantics.isLowercase,
        components: [],
        anchors: [],
        anchorOverrides: {},
        kerningBias: 0
    };
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('DASHBOARD');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('COMPACT');
  
  const [projects, setProjects] = useState<Project[]>(() => {
      try {
          const saved = localStorage.getItem('font_studio_projects');
          return saved ? JSON.parse(saved) : [];
      } catch (e) {
          console.warn('[unbsfont] failed to load projects from localStorage', e);
          return [];
      }
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [lastProjectFileName, setLastProjectFileName] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<FontMetadata>(INITIAL_METADATA);
  const [styleMap, setStyleMap] = useState<Record<string, GlyphData[]>>({ "Regular": generateInitialGlyphs() });
  const [currentStyle, setCurrentStyle] = useState("Regular");
  const [glyphs, setGlyphs] = useState<GlyphData[]>(styleMap["Regular"]);

  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [zoom, setZoom] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [selectedGlyph, setSelectedGlyph] = useState<GlyphData | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSpacingManagerOpen, setIsSpacingManagerOpen] = useState(false);
  const [isFontPreviewOpen, setIsFontPreviewOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
    const [kerningFocusChar, setKerningFocusChar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [dragSourceChar, setDragSourceChar] = useState<string | null>(null);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; char: string } | null>(null);
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
    const [newSymbolChar, setNewSymbolChar] = useState('');
    const [newSymbolName, setNewSymbolName] = useState('');
        const [newSymbolError, setNewSymbolError] = useState<string | null>(null);
        const [isCustomSlotModalOpen, setIsCustomSlotModalOpen] = useState(false);
  const [pasteConfirmModal, setPasteConfirmModal] = useState<{ char: string; newData: Partial<GlyphData>; oldGlyph: GlyphData } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticeTimersRef = useRef<number[]>([]);
    const saveProjectRef = useRef<() => void>(() => {});

  const historyRef = useRef<AppSnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);

  const createSnapshot = useCallback((): AppSnapshot => ({
      glyphs: deepClone(glyphs),
      metadata: deepClone(metadata),
      styleMap: deepClone(styleMap),
      projects: deepClone(projects),
      activeProjectId,
      currentStyle,
      screen,
      viewMode,
      zoom,
      showAll,
      isDarkMode,
      isPasteMode,
      selectedChars: Array.from(selectedChars),
      selectedGlyphChar: selectedGlyph?.char ?? null,
      isEditorOpen,
                isSpacingManagerOpen
            }), [glyphs, metadata, styleMap, projects, activeProjectId, currentStyle, screen, viewMode, zoom, showAll, isDarkMode, isPasteMode, selectedChars, selectedGlyph, isEditorOpen, isSpacingManagerOpen]);

  const applySnapshot = useCallback((snapshot: AppSnapshot) => {
      isRestoringRef.current = true;
      setGlyphs(snapshot.glyphs);
      setMetadata(snapshot.metadata);
      setStyleMap(snapshot.styleMap);
      setProjects(snapshot.projects);
      setActiveProjectId(snapshot.activeProjectId);
      setCurrentStyle(snapshot.currentStyle);
      setScreen(snapshot.screen);
      setViewMode(snapshot.viewMode);
      setZoom(snapshot.zoom);
      setShowAll(snapshot.showAll);
      setIsDarkMode(snapshot.isDarkMode);
      setIsPasteMode(snapshot.isPasteMode);
      setSelectedChars(new Set(snapshot.selectedChars));
      setSelectedGlyph(snapshot.selectedGlyphChar ? snapshot.glyphs.find(g => g.char === snapshot.selectedGlyphChar) || null : null);
      setIsEditorOpen(snapshot.isEditorOpen);
    setIsSpacingManagerOpen(snapshot.isSpacingManagerOpen);
  }, []);

  const handleGlobalUndo = useCallback(() => {
      if (historyIndexRef.current <= 0) return;
      historyIndexRef.current -= 1;
      const snapshot = historyRef.current[historyIndexRef.current];
      if (snapshot) applySnapshot(snapshot);
  }, [applySnapshot]);

  const handleGlobalRedo = useCallback(() => {
      if (historyIndexRef.current >= historyRef.current.length - 1) return;
      historyIndexRef.current += 1;
      const snapshot = historyRef.current[historyIndexRef.current];
      if (snapshot) applySnapshot(snapshot);
  }, [applySnapshot]);

  const pushNotice = useCallback((message: string, variant: NoticeVariant = 'info') => {
      const id = Date.now() + Math.random();
      setNotices(prev => [...prev, { id, message, variant }]);
      const timeoutId = window.setTimeout(() => {
          setNotices(prev => prev.filter(n => n.id !== id));
          noticeTimersRef.current = noticeTimersRef.current.filter(t => t !== timeoutId);
      }, 4200);
      noticeTimersRef.current.push(timeoutId);
  }, []);

  const noticeStyles = useMemo<Record<NoticeVariant, { label: string; container: string; dot: string }>>(() => ({
      success: {
          label: 'Sucesso',
          container: isDarkMode ? 'bg-emerald-500/10 border-emerald-300 text-emerald-50' : 'bg-emerald-50 border-emerald-500 text-emerald-900',
          dot: 'bg-emerald-400'
      },
      warning: {
          label: 'Aviso',
          container: isDarkMode ? 'bg-amber-500/10 border-amber-300 text-amber-50' : 'bg-amber-50 border-amber-500 text-amber-900',
          dot: 'bg-amber-400'
      },
      error: {
          label: 'Erro',
          container: isDarkMode ? 'bg-rose-500/10 border-rose-300 text-rose-50' : 'bg-rose-50 border-rose-500 text-rose-900',
          dot: 'bg-rose-400'
      },
      info: {
          label: 'Info',
          container: isDarkMode ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white border-black text-black',
          dot: isDarkMode ? 'bg-slate-200' : 'bg-slate-500'
      }
  }), [isDarkMode]);

  useEffect(() => {
      try {
          localStorage.setItem('font_studio_projects', JSON.stringify(projects));
      } catch (e: any) {
          if (e?.name === 'QuotaExceededError') {
              pushNotice('Browser storage is full. Export the project (.otf) and remove weights or glyphs to free up space.', 'error');
          } else {
              pushNotice('Could not save the project locally.', 'error');
          }
      }
    }, [projects, pushNotice]);

  useEffect(() => { setStyleMap(prev => ({ ...prev, [currentStyle]: glyphs })); }, [glyphs, currentStyle]);
  
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

    useEffect(() => {
        return () => {
            noticeTimersRef.current.forEach(clearTimeout);
            noticeTimersRef.current = [];
        };
    }, []);

  useEffect(() => {
      if (isRestoringRef.current) {
          isRestoringRef.current = false;
          return;
      }
      const snapshot = createSnapshot();
      if (historyIndexRef.current === -1) {
          historyRef.current = [snapshot];
          historyIndexRef.current = 0;
      } else {
          const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
          trimmed.push(snapshot);
          if (trimmed.length > HISTORY_LIMIT) {
              trimmed.shift();
          }
          historyRef.current = trimmed;
          historyIndexRef.current = trimmed.length - 1;
      }
  }, [createSnapshot]);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      const handleKeyDown = (e: KeyboardEvent) => {
          const isModifier = e.ctrlKey || e.metaKey;
          if (!isModifier) return;
          const activeElement = document.activeElement as HTMLElement | null;
          const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
          const key = e.key.toLowerCase();
          if (isTyping && key !== 's') return;
          if (key === 'z' && !e.shiftKey) {
              e.preventDefault();
              handleGlobalUndo();
          } else if ((key === 'z' && e.shiftKey) || key === 'y') {
              e.preventDefault();
              handleGlobalRedo();
          } else if (key === 's') {
              e.preventDefault();
              saveProjectRef.current();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGlobalUndo, handleGlobalRedo]);

  const handleCreateProject = () => {
      const newId = Date.now().toString();
      const newProject: Project = {
          id: newId,
          name: "Untitled Font",
          updatedAt: new Date().toISOString(),
          metadata: INITIAL_METADATA,
          styleMap: { "Regular": generateInitialGlyphs() }
      };
      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(newId);
      
      setMetadata(newProject.metadata);
      setStyleMap(newProject.styleMap);
      setCurrentStyle("Regular");
      setGlyphs(newProject.styleMap["Regular"]);
      setScreen('MODE_SELECT');
  };

  const handleOpenProject = (id: string) => {
      const proj = projects.find(p => p.id === id);
      if (proj) {
          setActiveProjectId(proj.id);
          setMetadata(proj.metadata);
          setStyleMap(proj.styleMap);
          const firstStyle = Object.keys(proj.styleMap)[0] || "Regular";
          setCurrentStyle(firstStyle);
          setGlyphs(proj.styleMap[firstStyle]);
          setScreen('MODE_SELECT');
      }
  };

  const handleSaveProject = useCallback(() => {
      if (!activeProjectId) {
          handleCreateProject(); 
          return;
      }
      const syncedStyleMap = { ...styleMap, [currentStyle]: glyphs };
      setProjects(prev => prev.map(p => {
          if (p.id === activeProjectId) {
              return {
                  ...p,
                  name: metadata.familyName,
                  updatedAt: new Date().toISOString(),
                  metadata: metadata,
                  styleMap: syncedStyleMap
              };
          }
          return p;
      }));
      pushNotice('Projeto salvo localmente.', 'success');
      if (!lastProjectFileName) {
          pushNotice('Use "Download File" para gerar um arquivo .unbsfo quando precisar exportar.', 'info');
      }
  }, [activeProjectId, styleMap, currentStyle, glyphs, metadata, lastProjectFileName, pushNotice]);

  useEffect(() => {
      saveProjectRef.current = handleSaveProject;
  }, [handleSaveProject]);

  const handleDeleteProject = useCallback((projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const projectName = project.metadata.familyName || project.name || 'this project';
      const confirmed = window.confirm(`Delete "${projectName}"? This action cannot be undone.`);
      if (!confirmed) return;

      setProjects(prev => prev.filter(p => p.id !== projectId));

      if (activeProjectId === projectId) {
          const freshGlyphs = generateInitialGlyphs();
          setActiveProjectId(null);
          setMetadata(INITIAL_METADATA);
          setStyleMap({ "Regular": freshGlyphs });
          setCurrentStyle('Regular');
          setGlyphs(freshGlyphs);
          setSelectedGlyph(null);
          setSelectedChars(new Set());
          setScreen('DASHBOARD');
      }

      pushNotice('Project deleted.', 'warning');
  }, [projects, activeProjectId, pushNotice]);

  const handleGoHome = () => {
      if (activeProjectId) {
          setProjects(prev => prev.map(p => {
              if (p.id === activeProjectId) {
                  return {
                      ...p,
                      name: metadata.familyName,
                      updatedAt: new Date().toISOString(),
                      metadata: metadata,
                      styleMap: { ...styleMap, [currentStyle]: glyphs }
                  };
              }
              return p;
          }));
      }
      setScreen('DASHBOARD');
  };

  const handleSwitchStyle = (newStyle: string) => {
    if (!styleMap[newStyle]) return;
    setCurrentStyle(newStyle);
    setGlyphs(styleMap[newStyle]);
    setMetadata(prev => ({ ...prev, styleName: newStyle }));
    setSelectedChars(new Set());
  };

  const handleAddStyle = (styleName: string) => {
        if (styleMap[styleName]) { pushNotice('This weight already exists.', 'warning'); return; }
    const newGlyphs = generateInitialGlyphs();
    setStyleMap(prev => ({ ...prev, [styleName]: newGlyphs }));
    handleSwitchStyle(styleName);
  };

  const handleDuplicateStyle = useCallback((newName: string) => {
    if (styleMap[newName]) { pushNotice('This weight already exists.', 'warning'); return; }
    const clonedGlyphs = JSON.parse(JSON.stringify(glyphs)) as typeof glyphs;
    setStyleMap(prev => ({ ...prev, [newName]: clonedGlyphs }));
    setCurrentStyle(newName);
    setGlyphs(clonedGlyphs);
    setMetadata(prev => ({ ...prev, styleName: newName }));
    pushNotice(`Weight "${newName}" created as copy of "${currentStyle}".`, 'success');
  }, [styleMap, glyphs, currentStyle, pushNotice]);

    const handleRemoveStyle = useCallback((styleName: string) => {
      const styleKeys = Object.keys(styleMap);
      if (!styleMap[styleName]) return;
      if (styleKeys.length <= 1) {
          pushNotice('You must keep at least one weight.', 'warning');
          return;
      }
      const confirmed = window.confirm(`Delete the weight "${styleName}"? This action cannot be undone.`);
      if (!confirmed) return;

      const remainingStyles = styleKeys.filter(name => name !== styleName);
      const nextActiveStyle = currentStyle === styleName ? (remainingStyles[0] || 'Regular') : currentStyle;

      setStyleMap(prev => {
          const updated = { ...prev };
          delete updated[styleName];
          return updated;
      });

      if (activeProjectId) {
          setProjects(prev => prev.map(project => {
              if (project.id !== activeProjectId) return project;
              const updatedStyleMap = { ...project.styleMap };
              delete updatedStyleMap[styleName];
              return {
                  ...project,
                  styleMap: updatedStyleMap,
                  metadata: currentStyle === styleName
                      ? { ...project.metadata, styleName: nextActiveStyle }
                      : project.metadata
              };
          }));
      }

      if (currentStyle === styleName) {
          const fallbackGlyphs = styleMap[nextActiveStyle] || generateInitialGlyphs();
          setCurrentStyle(nextActiveStyle);
          setGlyphs(fallbackGlyphs);
          setMetadata(prev => ({ ...prev, styleName: nextActiveStyle }));
      }

      pushNotice(`Weight "${styleName}" removido.`, 'info');
  }, [styleMap, currentStyle, pushNotice, activeProjectId, setProjects, setGlyphs, setMetadata]);

  const getCasePairChar = (char: string): string | null => {
      if (!char) return null;
      const upper = char.toUpperCase();
      const lower = char.toLowerCase();
      if (char === upper && char !== lower) return lower; // uppercase -> lowercase
      if (char === lower && char !== upper) return upper; // lowercase -> uppercase
      return null;
  };

  const updateDependentGlyphs = (sourceChar: string, currentGlyphs: GlyphData[]) => {
      const sourceGlyph = currentGlyphs.find(g => g.char === sourceChar);
      return currentGlyphs.map(g => {
          if (g.components.some(c => c.char === sourceChar)) {
              const newPath = generateCompositePath(g.components, currentGlyphs);
              const primaryUsesSource = g.components[0]?.char === sourceChar;
              const metricSync = (primaryUsesSource && sourceGlyph)
                  ? {
                      advanceWidth: sourceGlyph.advanceWidth,
                      leftSideBearing: sourceGlyph.leftSideBearing,
                      baselineOffset: sourceGlyph.baselineOffset,
                      scale: sourceGlyph.scale
                  }
                  : {};
              return { ...g, pathData: newPath, ...metricSync };
          }
          return g;
      });
  };

  const handleUpdateGlyph = useCallback((char: string, newData: Partial<GlyphData>) => {
    if (char === ' ' && newData.pathData !== undefined) newData.pathData = "";
    setGlyphs(prev => {
      let updated = prev.map(g => g.char === char ? { ...g, ...newData } : g);
      if (metadata.isUnicase) {
        const pairChar = getCasePairChar(char);
        if (pairChar) {
          updated = updated.map(g => g.char === pairChar ? { 
              ...g, 
              pathData: newData.pathData !== undefined ? newData.pathData : g.pathData, 
              advanceWidth: newData.advanceWidth !== undefined ? newData.advanceWidth : g.advanceWidth, 
              leftSideBearing: newData.leftSideBearing !== undefined ? newData.leftSideBearing : g.leftSideBearing, 
                            scale: newData.scale !== undefined ? newData.scale : g.scale, 
                            baselineOffset: newData.baselineOffset !== undefined ? newData.baselineOffset : g.baselineOffset,
                            components: newData.components !== undefined ? newData.components : g.components,
                            anchorOverrides: newData.anchorOverrides !== undefined ? newData.anchorOverrides : g.anchorOverrides,
          } : g);
        }
      }
            const dependentFields: (keyof GlyphData)[] = ['pathData', 'advanceWidth', 'leftSideBearing', 'baselineOffset', 'scale'];
            const shouldSyncDependents = dependentFields.some(field => newData[field] !== undefined);
            if (shouldSyncDependents) updated = updateDependentGlyphs(char, updated);
      return updated;
    });
  }, [metadata.isUnicase]);

  const applyAutoPositionToAll = useCallback((autoPos: FontMetadata['autoPosition']) => {
      if (!autoPos) return;
      setGlyphs(prev => prev.map(g => {
          if (g.manualPosition) return g;
          if (!g.pathData || g.char === ' ') return g;
          if (g.char === autoPos.sourceChar) return g;
          // Calculate per-glyph scale based on target visual height
          const bbox = measurePath(g.pathData);
          if (bbox && bbox.height > 0) {
              const newScale = autoPos.targetVisualHeight / bbox.height;
              return {
                  ...g,
                  scale: newScale,
                  baselineOffset: autoPos.baselineOffset,
                  leftSideBearing: autoPos.leftSideBearing,
              };
          }
          return g;
      }));
  }, []);

    // When toggling unicase on, immediately mirror uppercase glyphs (including accents) into lowercase slots.
    useEffect(() => {
        if (!metadata.isUnicase) return;
        setGlyphs(prev => {
            const lookup = new Map<string, GlyphData>(prev.map(g => [g.char, g] as const));
            const updated = prev.map(g => {
                const pair = getCasePairChar(g.char);
                const isLowercase = pair && g.char === g.char.toLowerCase() && g.char !== g.char.toUpperCase();
                if (!isLowercase || !pair) return g;
                const upperGlyph = lookup.get(pair);
                if (upperGlyph && upperGlyph.pathData) {
                    return {
                        ...g,
                        pathData: upperGlyph.pathData,
                        advanceWidth: upperGlyph.advanceWidth,
                        leftSideBearing: upperGlyph.leftSideBearing,
                        baselineOffset: upperGlyph.baselineOffset,
                        scale: upperGlyph.scale,
                        components: upperGlyph.components,
                        anchorOverrides: upperGlyph.anchorOverrides,
                        groups: upperGlyph.groups,
                    };
                }
                return g;
            });
            return updated;
        });
    }, [metadata.isUnicase]);

  const handleUpdateMembers = (parentChar: string, memberChars: string) => {
      if (!memberChars) return;
      const targets = Array.from(new Set(memberChars.split('').map(c => c.trim()).filter(c => c && c !== parentChar)));
      if (targets.length === 0) return;

      setGlyphs(prev => {
          const parentGlyph = prev.find(g => g.char === parentChar);
          if (!parentGlyph) return prev;

          return prev.map(g => {
              if (!targets.includes(g.char)) return g;
              return {
                  ...g,
                  groups: {
                      left: parentGlyph.groups.left || parentGlyph.char,
                      right: parentGlyph.groups.right || parentGlyph.char
                  },
                  shapeLeft: parentGlyph.shapeLeft,
                  shapeRight: parentGlyph.shapeRight,
                  advanceWidth: parentGlyph.advanceWidth,
                  leftSideBearing: parentGlyph.leftSideBearing,
                  inheritsFrom: parentGlyph.char
              };
          });
      });
  };

  const handleEditClick = (glyph: GlyphData) => { setSelectedGlyph(glyph); setIsEditorOpen(true); };

  const handleEditByChar = useCallback((char: string) => {
      const glyph = glyphs.find(g => g.char === char);
      if (glyph) {
          setSelectedGlyph(glyph);
          setIsEditorOpen(true);
      }
  }, [glyphs]);

    const handleCloseEditor = useCallback(() => {
            setIsEditorOpen(false);
            setSelectedGlyph(null);
    }, []);

    const handleOpenKerningForGlyph = (char: string) => {
            setKerningFocusChar(char);
            setIsSpacingManagerOpen(true);
                        handleCloseEditor();
        };

  const handleImportSheet = async (file: File) => {
    setIsLoading(true);
    try {
      const text = await file.text();
      const extractedGlyphs = processSVGSheet(text, glyphs);
            const mergeResult = (() => {
                    if (extractedGlyphs.size === 0) return { updatedGlyphs: glyphs, importedCount: 0 };

                    let importedCount = 0;
                    const nextGlyphs = glyphs.map(g => {
                            const extracted = extractedGlyphs.get(g.char);
                            if (!extracted || g.char === ' ') return g;
                            importedCount++;
                            return { ...g, ...extracted };
                    });

                    if (!metadata.isUnicase) return { updatedGlyphs: nextGlyphs, importedCount };

                        const lookup = new Map<string, GlyphData>(nextGlyphs.map(g => [g.char, g] as const));
                        const mirroredGlyphs = nextGlyphs.map(g => {
                            const pair = getCasePairChar(g.char);
                            const isLowercase = pair && g.char === g.char.toLowerCase() && g.char !== g.char.toUpperCase();
                            if (!isLowercase || !pair) return g;
                            const upperGlyph = lookup.get(pair);
                            if (upperGlyph && upperGlyph.pathData) {
                                return {
                                    ...g,
                                    pathData: upperGlyph.pathData,
                                    advanceWidth: upperGlyph.advanceWidth,
                                    leftSideBearing: upperGlyph.leftSideBearing,
                                    baselineOffset: upperGlyph.baselineOffset,
                                        scale: upperGlyph.scale,
                                        components: upperGlyph.components,
                                        anchorOverrides: upperGlyph.anchorOverrides,
                                        groups: upperGlyph.groups,
                                };
                            }
                            return g;
                        });
                    return { updatedGlyphs: mirroredGlyphs, importedCount };
            })();

            const { updatedGlyphs, importedCount } = mergeResult;

            if (importedCount > 0) {
                    setGlyphs(updatedGlyphs);
                    setShowAll(false);
                    pushNotice(`Imported ${importedCount} glyph${importedCount === 1 ? '' : 's'}.`, 'success');
            } else {
                    pushNotice('No matching glyphs found in the SVG.', 'warning');
            }
        } catch (error) { console.error("Import failed", error); pushNotice("Failed to parse SVG. Please verify the file.", 'error'); } finally { setIsLoading(false); }
  };

  const handleDownloadProjectFile = () => {
      const syncedStyleMap = { ...styleMap, [currentStyle]: glyphs };
      const payload = buildProjectFilePayload(metadata, syncedStyleMap, currentStyle);
      const baseName = `${metadata.familyName || 'font'}-${metadata.styleName || currentStyle}`.toLowerCase();
    downloadProjectFile(payload, baseName);
      setLastProjectFileName(baseName);
      pushNotice('Projeto exportado como arquivo.', 'success');
  };

  const handleImportProjectFile = async (file: File) => {
      try {
          const payload = await parseProjectFile(file);
          const availableStyles = Object.keys(payload.styleMap);
          const hasCurrent = payload.currentStyle && payload.styleMap[payload.currentStyle];
          const nextStyle = hasCurrent ? payload.currentStyle : (availableStyles[0] || 'Regular');
          const fallbackGlyphs = payload.styleMap[nextStyle] || generateInitialGlyphs();
          const normalizedStyleMap = payload.styleMap[nextStyle]
              ? payload.styleMap
              : { ...payload.styleMap, [nextStyle]: fallbackGlyphs };

          const importedMetadata = deepClone(payload.metadata);
          const importedStyleMap = deepClone(normalizedStyleMap);
          const nextGlyphs = importedStyleMap[nextStyle] || generateInitialGlyphs();

          const newProjectId = createProjectId();
          const derivedBaseName = extractProjectBaseName(file.name);
          const projectName = importedMetadata.familyName?.trim() || derivedBaseName || 'Imported Font';

          const projectEntry: Project = {
              id: newProjectId,
              name: projectName,
              updatedAt: new Date().toISOString(),
              metadata: deepClone(importedMetadata),
              styleMap: deepClone(importedStyleMap)
          };

          setProjects(prev => [projectEntry, ...prev]);
          setActiveProjectId(newProjectId);
          setMetadata(importedMetadata);
          setStyleMap(importedStyleMap);
          setCurrentStyle(nextStyle);
          setGlyphs(nextGlyphs);
          setSelectedChars(new Set());
          setSelectedGlyph(null);
          setScreen('EDITOR');

          const safeBaseName = toSafeDownloadBaseName(derivedBaseName || projectName);
          setLastProjectFileName(safeBaseName);

          pushNotice('Projeto carregado do arquivo.', 'success');
      } catch (error) {
          console.error('Failed to load project file', error);
          const message = error instanceof Error ? error.message : 'Falha ao abrir arquivo de project.';
          pushNotice(message, 'error');
      }
  };

  const handleExportSvgSheet = useCallback(() => {
      try {
          exportGlyphSvgSheet(metadata, glyphs);
          pushNotice('Tabela SVG exportada com sucesso.', 'success');
      } catch (error) {
          console.error('Falha ao exportar a tabela SVG', error);
          const message = error instanceof Error ? error.message : 'Falha ao exportar a tabela SVG.';
          pushNotice(message, 'error');
      }
  }, [metadata, glyphs, pushNotice]);

  const handleExportEmptySvgSheet = useCallback(() => {
      try {
          const emptyGlyphs = generateInitialGlyphs();
          exportGlyphSvgSheet(metadata, emptyGlyphs, { emptyTemplate: true });
          pushNotice('Tabela SVG vazia exportada.', 'success');
      } catch (error) {
          console.error('Falha ao exportar a tabela SVG vazia', error);
          const message = error instanceof Error ? error.message : 'Falha ao exportar a tabela SVG vazia.';
          pushNotice(message, 'error');
      }
  }, [metadata, pushNotice]);

  const handleExport = async () => {
      if (isExporting) {
          pushNotice('An export is already in progress. Wait for the queue to finish.', 'warning');
          return;
      }

    const styles = Object.entries(styleMap) as Array<[string, GlyphData[]]>;
      const hasDrawnGlyphs = (list: GlyphData[]) => list.some(g => g.pathData && g.pathData.trim().length > 0);

      type ExportCandidate = { styleName: string; glyphList: GlyphData[]; meta: FontMetadata };
      const candidates: ExportCandidate[] = [];

      if (styles.length <= 1) {
          if (!hasDrawnGlyphs(glyphs)) {
              pushNotice('Nenhum glifo desenhado para exportar.', 'warning');
              return;
          }
          candidates.push({
              styleName: metadata.styleName || currentStyle,
              glyphList: glyphs,
              meta: { ...metadata }
          });
      } else {
          styles.forEach(([styleName, styleGlyphs]) => {
              if (!styleGlyphs) return;
              if (!hasDrawnGlyphs(styleGlyphs)) {
                  pushNotice(`Weight "${styleName}" ignored: no glyphs drawn.`, 'warning');
                  return;
              }
              candidates.push({
                  styleName,
                  glyphList: styleGlyphs,
                  meta: { ...metadata, styleName }
              });
          });

          if (!candidates.length) {
              pushNotice('No weight could be exported.', 'error');
              return;
          }
      }

      setIsExporting(true);
      setExportProgress(0);
      pushNotice(
          candidates.length > 1
              ? `Fila criada para ${candidates.length} weight${candidates.length > 1 ? 's' : ''}.`
              : 'Export started.',
          'info'
      );

      const failures: string[] = [];
      let completed = 0;

      try {
          for (const candidate of candidates) {
              try {
                  await exportFont(candidate.meta, candidate.glyphList, {
                      onProgress: (p) => setExportProgress(p),
                  });
                  completed += 1;
                  pushNotice(`Weight "${candidate.styleName}" exportado.`, 'success');
              } catch (error) {
                  const message = error instanceof FontExportError ? error.message : 'Falha ao exportar fonte.';
                  failures.push(candidate.styleName);
                  pushNotice(`Falha ao exportar "${candidate.styleName}": ${message}`, 'error');
              }
          }
      } finally {
          setIsExporting(false);
          setTimeout(() => setExportProgress(null), 300);
      }

      if (completed) {
          pushNotice(`Export completed (${completed} weight${completed > 1 ? 's' : ''}).`, 'success');
      }
      if (failures.length) {
          pushNotice(`Could not export ${failures.join(', ')}.`, 'error');
      }
  };

  const handleExportSvgFirst = async () => {
      if (isExporting) {
          pushNotice('An export is already in progress. Wait for the queue to finish.', 'warning');
          return;
      }

      const hasDrawnGlyphs = glyphs.some(g => (g.pathData || '').trim().length > 0);
      if (!hasDrawnGlyphs) {
          pushNotice('Nenhum glifo desenhado para exportar.', 'warning');
          return;
      }

      setIsExporting(true);
      setExportProgress(0);

      try {
          const safeFamily = (metadata.familyName || 'font').replace(/\s+/g, '-');
          const safeStyle = (metadata.styleName || currentStyle || 'Regular').replace(/\s+/g, '-');
          const fileName = `${safeFamily}-${safeStyle}-svg-first.otf`;

          const svgGlyphs = glyphs.map(g => ({
              ...g,
              svgPathData: g.svgPathData ?? g.pathData,
              svgViewBox: g.svgViewBox ?? [0, 0, metadata.unitsPerEm || 1000, metadata.unitsPerEm || 1000]
          }));

          const buffer = await exportSvgBasedFont(svgGlyphs, {
              mode: 'outline_plus_svg',
              familyName: metadata.familyName || 'font',
              styleName: metadata.styleName || currentStyle || 'Regular',
              upm: metadata.unitsPerEm || 1000,
              ascender: metadata.ascender,
              descender: metadata.descender,
              includeSvgForTextGlyphs: false,
              debug: true
          }, metadata);

          const blob = new Blob([buffer], { type: 'font/otf' });
          downloadBlob(blob, fileName);
          setExportProgress(1);
          pushNotice('SVG-first export generated (outline + SVG stub layer).', 'success');
      } catch (error) {
          console.error('Falha no export SVG-first', error);
          const message = error instanceof Error ? error.message : 'Falha ao exportar fonte SVG-first.';
          pushNotice(message, 'error');
      } finally {
          setIsExporting(false);
          setTimeout(() => setExportProgress(null), 300);
      }
  };

  const handleExportFontEditor = async (kerningPairs?: KerningPair[]) => {
      if (isExporting) {
          pushNotice('An export is already in progress. Please wait.', 'warning');
          return;
      }

      // Sync current style buffer into styleMap before iterating
      const fullStyleMap: Record<string, GlyphData[]> = { ...styleMap, [currentStyle]: glyphs };
      const styles = Object.entries(fullStyleMap);
      const hasDrawn = (list: GlyphData[]) => list.some(g => (g.pathData || '').trim().length > 0);

      const candidates: Array<{ styleName: string; glyphList: GlyphData[]; meta: FontMetadata }> = [];
      styles.forEach(([styleName, list]) => {
          if (!list || !hasDrawn(list)) return;
          candidates.push({
              styleName,
              glyphList: list,
              meta: { ...metadata, styleName }
          });
      });

      if (!candidates.length) {
          pushNotice('Nenhum glifo desenhado para exportar.', 'warning');
          return;
      }

      setIsExporting(true);
      setExportProgress(0);

      const totalStyles = candidates.length;
      const failures: string[] = [];
      let completed = 0;

      try {
          for (const candidate of candidates) {
              try {
                  const result = kerningPairs && kerningPairs.length > 0
                      ? await downloadFontEditorFontWithKerning(candidate.meta, candidate.glyphList, kerningPairs)
                      : await downloadFontEditorFont(candidate.meta, candidate.glyphList);
                  completed += 1;
                  setExportProgress(completed / totalStyles);
                  pushNotice(`Weight "${candidate.styleName}" exportado: ${result.fileName} (${result.glyphCount} glifos).`, 'success');
              } catch (err) {
                  console.error('Falha export', candidate.styleName, err);
                  failures.push(candidate.styleName);
                  const message = err instanceof Error ? err.message : 'Falha ao exportar fonte.';
                  pushNotice(`Falha ao exportar "${candidate.styleName}": ${message}`, 'error');
              }
          }
      } finally {
          setIsExporting(false);
          setTimeout(() => setExportProgress(null), 300);
      }

      if (completed && totalStyles > 1) {
          pushNotice(`Family "${metadata.familyName || 'Untitled'}" exported (${completed}/${totalStyles} weights).`, 'success');
      }
      if (failures.length) {
          pushNotice(`Could not export: ${failures.join(', ')}.`, 'error');
      }
  };
  const handleAutoFit = () => { if (window.confirm("Reset metrics?")) setGlyphs(prev => prev.map(g => !g.pathData ? g : { ...g, scale: 1, leftSideBearing: 50, baselineOffset: 100 })); };
  
  const handleResetAll = () => { 
      if (window.confirm("Clear ALL glyphs? This cannot be undone.")) { 
          const empty = generateInitialGlyphs(); 
          setStyleMap(prev => ({ ...prev, [currentStyle]: empty })); 
          setGlyphs(empty); 
          setSelectedGlyph(null); 
          setSelectedChars(new Set()); 
      } 
  };
  
  const handleDragStart = (char: string) => setDragSourceChar(char);
  const handleDrop = (targetChar: string) => { if (!dragSourceChar || dragSourceChar === targetChar) return; performSwap(dragSourceChar, targetChar); setDragSourceChar(null); };

  const performSwap = (charA: string, charB: string) => {
      setGlyphs(prev => {
        const i1 = prev.findIndex(g => g.char === charA);
        const i2 = prev.findIndex(g => g.char === charB);
        if (i1 === -1 || i2 === -1) return prev;
        const newGlyphs = [...prev];
        const temp = { ...newGlyphs[i1] };
        newGlyphs[i1] = { ...newGlyphs[i1], pathData: newGlyphs[i2].pathData, scale: newGlyphs[i2].scale, leftSideBearing: newGlyphs[i2].leftSideBearing, baselineOffset: newGlyphs[i2].baselineOffset, advanceWidth: newGlyphs[i2].advanceWidth, groups: newGlyphs[i2].groups, components: newGlyphs[i2].components, anchorOverrides: newGlyphs[i2].anchorOverrides };
        newGlyphs[i2] = { ...newGlyphs[i2], pathData: temp.pathData, scale: temp.scale, leftSideBearing: temp.leftSideBearing, baselineOffset: temp.baselineOffset, advanceWidth: temp.advanceWidth, groups: temp.groups, components: temp.components, anchorOverrides: temp.anchorOverrides };
        return newGlyphs;
      });
  };

  const handleMoveGlyph = (fromChar: string, toChar: string) => {
      let target = toChar;
      if (GLYPH_NAME_MAP[toChar.toLowerCase()]) target = GLYPH_NAME_MAP[toChar.toLowerCase()];
      if (!glyphs.some(g => g.char === target)) { pushNotice('Invalid destination to move the glyph.', 'error'); return; }
      performSwap(fromChar, target);
  };

  const handleBuildDerivatives = (
      baseChar: string, 
      globalAnchor: {x:number, y:number}, 
      overrides: Record<string, {x:number, y:number}>, 
      derivatives: string[],
      baseGlyphOverride?: GlyphData
  ) => {
      setGlyphs(prev => {
          const sourceGlyphs = baseGlyphOverride 
             ? prev.map(g => g.char === baseChar ? { ...g, ...baseGlyphOverride } : g)
             : prev;

          const updated = [...prev];
          const baseG = sourceGlyphs.find(g => g.char === baseChar);
          if (!baseG || !baseG.pathData) return prev; 

             derivatives.forEach(targetChar => {
             const recipe = COMPOSITE_RECIPES[targetChar];
             if (!recipe) return;
             const [_, accentChar] = recipe;
             const accentG = sourceGlyphs.find(g => g.char === accentChar);
             if (accentG && accentG.pathData) {
                 const anchor = overrides[targetChar] || globalAnchor;
                 const accentBBox = measurePath(accentG.pathData);
                 const accentCenterX = accentBBox.x + (accentBBox.width / 2);
                 const accentCenterY = accentBBox.y + (accentBBox.height / 2);

                      const baseScale = baseG.scale && baseG.scale !== 0 ? baseG.scale : 1;
                      const accentScale = accentG.scale && accentG.scale !== 0 ? accentG.scale : 1;
                      const accentComponentScale = accentScale / baseScale;

                      const anchorLocalX = (anchor.x - baseG.leftSideBearing) / baseScale;
                      const anchorLocalY = (anchor.y - baseG.baselineOffset) / baseScale;

                      const dx = anchorLocalX - (accentCenterX * accentComponentScale);
                      const dy = anchorLocalY - (accentCenterY * accentComponentScale);

                      const components: GlyphComponent[] = [
                          { char: baseChar, dx: 0, dy: 0, scale: 1 },
                          { char: accentChar, dx, dy, scale: accentComponentScale }
                      ];
                 const pathData = generateCompositePath(components, sourceGlyphs);
                 const targetIndex = updated.findIndex(g => g.char === targetChar);
                 if (targetIndex !== -1) {
                     updated[targetIndex] = { 
                         ...updated[targetIndex], 
                         components, 
                         pathData, 
                         advanceWidth: baseG.advanceWidth, 
                         leftSideBearing: baseG.leftSideBearing,
                         baselineOffset: baseG.baselineOffset,
                         scale: baseG.scale
                     };

                     if (metadata.isUnicase) {
                         const pair = getCasePairChar(targetChar);
                         const isUpper = pair && targetChar === targetChar.toUpperCase() && targetChar !== targetChar.toLowerCase();
                         if (pair && isUpper) {
                             const source = updated[targetIndex];
                             const pairIdx = updated.findIndex(g => g.char === pair);
                             if (pairIdx !== -1) {
                                 updated[pairIdx] = {
                                     ...updated[pairIdx],
                                     pathData: source.pathData,
                                     components: source.components,
                                     advanceWidth: source.advanceWidth,
                                     leftSideBearing: source.leftSideBearing,
                                     baselineOffset: source.baselineOffset,
                                     scale: source.scale,
                                     anchorOverrides: source.anchorOverrides,
                                     groups: source.groups,
                                 };
                             }
                         }
                     }
                 }
             }
          });
          return updated;
      });
  };

  const processSingleGlyphSVG = (svgContent: string): Partial<GlyphData> | null => {
      return extractSingleGlyphFromSVG(svgContent);
  };

  const handlePasteGlyph = async (char: string) => {
      if (char === ' ') return;
      let text = "";
      try { text = await navigator.clipboard.readText(); } catch (err) { const manualPaste = window.prompt("Paste SVG:"); if (manualPaste) text = manualPaste; }
      if (!text) return;
      
      let svgContent = text;
      if (!text.includes('<svg') && !text.includes('<path')) svgContent = `<svg><path d="${text}" /></svg>`;
      else if (!text.includes('<svg')) svgContent = `<svg>${text}</svg>`;
      
      const data = processSingleGlyphSVG(svgContent);
      if (data && data.pathData) {
          const existingGlyph = glyphs.find(g => g.char === char);
          // Se o glyph já tem pathData (está sendo substituído), mostrar modal de confirmação
          if (existingGlyph && existingGlyph.pathData) {
              setPasteConfirmModal({ char, newData: data, oldGlyph: existingGlyph });
          } else {
              handleUpdateGlyph(char, data);
          }
      } else {
          pushNotice('Could not parse the copied SVG.', 'error');
      }
  };

  const handlePasteConfirmKeepSettings = () => {
      if (!pasteConfirmModal) return;
      const { char, newData, oldGlyph } = pasteConfirmModal;
      // Manter configurações antigas: scale, baselineOffset, advanceWidth, leftSideBearing, groups, kerningBias
      handleUpdateGlyph(char, {
          pathData: newData.pathData,
          svgViewBox: newData.svgViewBox,
          // Manter as configurações do glyph antigo
          scale: oldGlyph.scale,
          baselineOffset: oldGlyph.baselineOffset,
          advanceWidth: oldGlyph.advanceWidth,
          leftSideBearing: oldGlyph.leftSideBearing,
          groups: oldGlyph.groups,
          kerningBias: oldGlyph.kerningBias,
          anchorOverrides: oldGlyph.anchorOverrides,
      });
      setPasteConfirmModal(null);
      pushNotice('SVG updated keeping previous settings.', 'success');
  };

  const handlePasteConfirmResetSettings = () => {
      if (!pasteConfirmModal) return;
      const { char, newData } = pasteConfirmModal;
      // Usar todas as novas configurações do SVG importado
      handleUpdateGlyph(char, newData);
      setPasteConfirmModal(null);
      pushNotice('SVG updated with new settings.', 'success');
  };

  const handleContextMenu = (e: React.MouseEvent, char: string) => {
      e.preventDefault();
      if (!selectedChars.has(char)) setSelectedChars(new Set([char]));
      setContextMenu({ x: e.clientX, y: e.clientY, char });
  };

  const handleClearSlot = (targetChar?: string) => {
      const charToClear = targetChar || contextMenu?.char;
      if (charToClear) {
          handleUpdateGlyph(charToClear, { 
              pathData: "", components: [], advanceWidth: charToClear === ' ' ? 250 : 600, 
              leftSideBearing: 50, scale: 1, baselineOffset: 0, groups: { left: '', right: '' }, anchorOverrides: {}, inheritsFrom: null, kerningBias: 0 
          });
          setContextMenu(null);
      }
  };
  
  const handleResetSlotMetrics = () => {
      if (contextMenu) {
          handleUpdateGlyph(contextMenu.char, { advanceWidth: contextMenu.char === ' ' ? 250 : 600, leftSideBearing: 50, scale: 1, baselineOffset: 0 });
          setContextMenu(null);
      }
  };

  const handleCopySVG = () => {
      if (!contextMenu) return;
      const g = glyphs.find(g => g.char === contextMenu.char);
      if (g && g.pathData) {
          const svg = `<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><path d="${g.pathData}" /></svg>`;
          navigator.clipboard.writeText(svg);
      }
      setContextMenu(null);
  };

  // Selection Logic
  const handleGridMouseDown = (e: React.MouseEvent) => {
      const targetElement = e.target as HTMLElement;
      if (targetElement.closest('button') || targetElement.closest('input') || e.button !== 0) return;
      if (targetElement.closest('[data-glyph-char]')) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      setIsSelecting(true);
      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
      if (!e.ctrlKey && !e.shiftKey) setSelectedChars(new Set());
  };

  const handleGridMouseMove = (e: React.MouseEvent) => {
      if (!isSelecting || !selectionBox || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      setSelectionBox(prev => prev ? ({ ...prev, currentX: x, currentY: y }) : null);
  };

  const handleGridMouseUp = () => {
      if (!isSelecting || !selectionBox) return;
      const boxLeft = Math.min(selectionBox.startX, selectionBox.currentX);
      const boxTop = Math.min(selectionBox.startY, selectionBox.currentY);
      const boxRight = Math.max(selectionBox.startX, selectionBox.currentX);
      const boxBottom = Math.max(selectionBox.startY, selectionBox.currentY);

      if (Math.abs(boxRight - boxLeft) > 5 || Math.abs(boxBottom - boxTop) > 5) {
          const newSelection = new Set(selectedChars);
          const cards = document.querySelectorAll('[data-glyph-char]');
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRef.current && containerRect) {
              cards.forEach(card => {
                  const cardRect = card.getBoundingClientRect();
                  const cardLeft = cardRect.left - containerRect.left + containerRef.current!.scrollLeft;
                  const cardTop = cardRect.top - containerRect.top + containerRef.current!.scrollTop;
                  const cardRight = cardLeft + cardRect.width;
                  const cardBottom = cardTop + cardRect.height;
                  if (!(cardLeft > boxRight || cardRight < boxLeft || cardTop > boxBottom || cardBottom < boxTop)) {
                      const char = card.getAttribute('data-glyph-char');
                      if (char) newSelection.add(char);
                  }
              });
              setSelectedChars(newSelection);
          }
      }
      setIsSelecting(false);
      setSelectionBox(null);
  };

  const handleCardClick = (char: string, e: React.MouseEvent) => {
      if (e.ctrlKey || e.shiftKey) {
          e.stopPropagation();
          const newSet = new Set(selectedChars);
          if (newSet.has(char)) newSet.delete(char); else newSet.add(char);
          setSelectedChars(newSet);
      } else { if (selectedChars.size > 0 && !selectedChars.has(char)) setSelectedChars(new Set()); }
  };

  const handleBulkClear = () => {
      if (window.confirm(`Clear ${selectedChars.size} slots?`)) {
          setGlyphs(prev => prev.map(g => {
              if (selectedChars.has(g.char)) {
                  return {
                      ...g, pathData: "", components: [], anchors: [], anchorOverrides: {},
                      advanceWidth: g.char === ' ' ? 250 : 600, leftSideBearing: 50, baselineOffset: 0, scale: 1, groups: { left: '', right: '' }, inheritsFrom: null,
                      kerningBias: 0
                  };
              }
              return g;
          }));
          setSelectedChars(new Set());
      }
  };

  const handleOpenCustomSlotModal = () => {
      setIsCustomSlotModalOpen(true);
  };

  const handleCloseCustomSlotModal = useCallback(() => {
      setIsCustomSlotModalOpen(false);
      setNewSymbolError(null);
      setNewSymbolChar('');
      setNewSymbolName('');
  }, []);

  const handleAddCustomSymbol = useCallback(() => {
      const trimmedChar = newSymbolChar.trim();
      if (!trimmedChar) {
          setNewSymbolError('Informe um caractere.');
          return;
      }
      const [targetChar] = Array.from(trimmedChar) as string[];
      if (!targetChar) {
          setNewSymbolError('Invalid character.');
          return;
      }
      if (glyphs.some(g => g.char === targetChar)) {
          setNewSymbolError('This symbol already exists.');
          return;
      }
      const displayName = newSymbolName.trim() || undefined;
      const templateGlyph = createCustomGlyphSlot(targetChar, displayName);
      setGlyphs(prev => [...prev, templateGlyph]);
      setStyleMap(prev => {
          const next: Record<string, GlyphData[]> = {};
          const entries = Object.entries(prev) as Array<[string, GlyphData[]]>;
          entries.forEach(([styleName, glyphList]) => {
              if (styleName === currentStyle) {
                  next[styleName] = glyphList;
                  return;
              }
              if (glyphList.some(g => g.char === targetChar)) {
                  next[styleName] = glyphList;
                  return;
              }
              next[styleName] = [...glyphList, createCustomGlyphSlot(targetChar, displayName)];
          });
          return next;
      });
      setNewSymbolChar('');
      setNewSymbolName('');
      setNewSymbolError(null);
      handleCloseCustomSlotModal();
      pushNotice(`Symbol ${targetChar} created.`, 'success');
  }, [newSymbolChar, newSymbolName, glyphs, currentStyle, pushNotice, handleCloseCustomSlotModal]);

  // Funções de troca de modo
  const handleSwitchToAdvanced = useCallback(() => {
      setEditorMode('ADVANCED');
  }, []);

  const handleSwitchToCompact = useCallback(() => {
      setEditorMode('COMPACT');
  }, []);

  const visibleGlyphs = useMemo(() => showAll ? glyphs : glyphs.filter(g => (g.pathData && g.pathData.length > 0) || g.char === ' '), [glyphs, showAll]);
  const categorizedGlyphs = useMemo(() => {
      const cats: Record<string, GlyphData[]> = { 'Uppercase': [], 'Lowercase': [], 'Numbers': [], 'Punctuation & Symbols': [], 'Accented & Other': [] };
      visibleGlyphs.forEach(g => {
          const code = g.unicode;
          if (code >= 65 && code <= 90) cats['Uppercase'].push(g);
          else if (code >= 97 && code <= 122) cats['Lowercase'].push(g);
          else if (code >= 48 && code <= 57) cats['Numbers'].push(g);
          else if ((code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126) || code === 32) cats['Punctuation & Symbols'].push(g);
          else cats['Accented & Other'].push(g);
      });
      return Object.entries(cats).filter(([_, list]) => list.length > 0);
  }, [visibleGlyphs]);

        if (screen === 'DASHBOARD') {
            return <Dashboard onCreateProject={handleCreateProject} onOpenProject={handleOpenProject} onImportProjectFile={handleImportProjectFile} onDeleteProject={handleDeleteProject} projects={projects} isDarkMode={isDarkMode} />;
    }

    if (screen === 'MODE_SELECT') {
        return <ModeSelector onSelectMode={(mode) => { setEditorMode(mode); setScreen('EDITOR'); }} isDarkMode={isDarkMode} />;
    }

    // Modo Compact - Interface simplificada
    if (editorMode === 'COMPACT') {
        return (
            <NoticeContext.Provider value={{ pushNotice }}>
                <CompactEditor
                    glyphs={glyphs}
                    metadata={metadata}
                    onUpdateGlyph={handleUpdateGlyph}
                    onUpdateMetadata={setMetadata}
                    isDarkMode={isDarkMode}
                    onSwitchToAdvanced={handleSwitchToAdvanced}
                    onGoHome={handleGoHome}
                    onSaveProject={handleSaveProject}
                    onExportFont={handleExportFontEditor}
                    onImportSheet={handleImportSheet}
                    onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                />
            </NoticeContext.Provider>
        );
    }

    const workspaceLabelClass = `text-[9px] font-black uppercase tracking-[0.32em] ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`;
    const viewSegmentBase = 'px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.18em] transition-colors';
    const viewSegmentActive = isDarkMode ? 'bg-white text-black' : 'bg-black text-white';
    const viewSegmentIdle = isDarkMode ? 'text-slate-400 hover:text-white' : 'text-neutral-500 hover:text-black';
    const zoomSliderClass = `w-full h-1 rounded-lg appearance-none cursor-pointer ${isDarkMode ? 'bg-slate-800 accent-white' : 'bg-neutral-200 accent-black'}`;
    const visibilityButtonBase = 'px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.22em] transition-colors';
    const visibilityButtonState = showAll
        ? (isDarkMode ? 'bg-white text-black border-white hover:bg-neutral-200' : 'bg-black text-white border-black hover:bg-neutral-800')
        : (isDarkMode ? 'border-white text-white hover:bg-white hover:text-black' : 'border-black text-black hover:bg-black hover:text-white');
    const topToolButtonBase = `w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${isDarkMode ? 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-white hover:text-white' : 'bg-white border-neutral-300 text-neutral-600 hover:border-black hover:text-black'}`;
    const topToolDanger = isDarkMode ? 'border-red-500 text-red-400 hover:bg-red-500/10' : 'border-red-500 text-red-600 hover:bg-red-50';
    const topToolHighlight = isDarkMode ? '!bg-white !text-black border-white' : '!bg-black !text-white border-black';
    const toggleTrackBase = `w-11 h-5 rounded-full relative transition-colors border ${isDarkMode ? 'border-white bg-slate-800' : 'border-black bg-white'}`;
    const toggleThumbBase = 'absolute top-0.5 w-3 h-3 rounded-full transition-transform';
    const headerRowClass = 'flex items-center gap-6 flex-nowrap overflow-x-auto py-2';
    const controlGroupClass = 'flex flex-col items-center gap-1.5 shrink-0';
    const workspaceControls = (
        <div className={`w-full sticky top-0 z-40 border-b ${isDarkMode ? 'bg-slate-950 text-white border-slate-800' : 'bg-white text-black border-[#232323]/15'}`}>
            <div className="max-w-6xl mx-auto w-full px-4">
                <div className={`${headerRowClass}`}>
                    <div className={`${controlGroupClass} min-w-[150px]`}>
                        <span className={workspaceLabelClass}>Workspace</span>
                        <div className={`flex rounded-full border p-1 ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-neutral-100 border-neutral-300'}`}>
                            <button
                                type="button"
                                onClick={() => setViewMode('GRID')}
                                className={`${viewSegmentBase} ${viewMode === 'GRID' ? viewSegmentActive : viewSegmentIdle}`}
                            >
                                Grid
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('TEST')}
                                className={`${viewSegmentBase} ${viewMode === 'TEST' ? viewSegmentActive : viewSegmentIdle}`}
                            >
                                Teste
                            </button>
                        </div>
                    </div>
                    <div className={`${controlGroupClass} min-w-[170px]`}>
                        <span className={workspaceLabelClass}>Zoom {Math.round(zoom * 100)}%</span>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className={zoomSliderClass}
                        />
                    </div>
                    <div className={`${controlGroupClass} min-w-[150px]`}>
                        <span className={workspaceLabelClass}>Filled Only</span>
                        <button
                            type="button"
                            onClick={() => setShowAll(!showAll)}
                            aria-pressed={!showAll}
                            className={`${visibilityButtonBase} ${visibilityButtonState}`}
                        >
                            {showAll ? 'All Glyphs' : 'Filled Only'}
                        </button>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0 min-w-[300px]">
                        <span className={workspaceLabelClass}>Ferramentas</span>
                        <div className="flex items-center gap-3 flex-nowrap">
                            <label className={`flex items-center gap-3 px-3 py-1.5 rounded-full border ${isDarkMode ? 'border-white/20 bg-slate-900/70' : 'border-neutral-300 bg-white'}`}>
                                <div className={`${toggleTrackBase} ${metadata.isUnicase ? (isDarkMode ? '!bg-white' : '!bg-black') : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={metadata.isUnicase}
                                        onChange={(e) => setMetadata({ ...metadata, isUnicase: e.target.checked })}
                                    />
                                    <div className={`${toggleThumbBase} ${metadata.isUnicase ? 'left-6 ' + (isDarkMode ? 'bg-black' : 'bg-white') : 'left-0.5 ' + (isDarkMode ? 'bg-white' : 'bg-black')}`}></div>
                                </div>
                                <span className={`text-[10px] uppercase font-bold tracking-[0.2em] ${isDarkMode ? 'text-slate-200' : 'text-neutral-600'}`}>Unicase</span>
                            </label>
                            <button
                                type="button"
                                onClick={handleAutoFit}
                                className={topToolButtonBase}
                                title="Metrics"
                            >
                                <span className="sr-only">Metrics</span>
                                <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                >
                                    <path d="M5 7h14" />
                                    <path d="M9 7v10" />
                                    <path d="M15 11v6" />
                                    <path d="M5 17h14" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSpacingManagerOpen(true)}
                                className={topToolButtonBase}
                                title="Spacing"
                            >
                                <span className="sr-only">Spacing</span>
                                <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M7 8l-3 4 3 4" />
                                    <path d="M17 8l3 4-3 4" />
                                    <path d="M4 12h16" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPasteMode(!isPasteMode)}
                                className={`${topToolButtonBase} ${isPasteMode ? topToolHighlight : ''}`}
                                title="Paste"
                                aria-pressed={isPasteMode}
                            >
                                <span className="sr-only">Paste</span>
                                <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M8 3h8" />
                                    <path d="M9 6h6" />
                                    <path d="M7 4.5V7a2 2 0 01-2 2H5v9a2 2 0 002 2h10a2 2 0 002-2V9h-.01a2 2 0 01-1.99-2V4.5" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={handleResetAll}
                                className={`${topToolButtonBase} ${topToolDanger}`}
                                title="Reset"
                            >
                                <span className="sr-only">Reset</span>
                                <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M4 4v6h6" />
                                    <path d="M20 20v-6h-6" />
                                    <path d="M5 15a7 7 0 0012 2.5L20 14" />
                                    <path d="M19 9a7 7 0 00-12-2.5L4 10" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const workspace = (
        <div className="flex-1 flex flex-col overflow-hidden">
            {workspaceControls}
            <main className="flex-1 flex overflow-hidden relative">
        {viewMode === 'GRID' ? (
          <div ref={containerRef} className={`flex-1 overflow-y-auto p-8 custom-scrollbar relative select-none ${isDarkMode ? 'bg-[radial-gradient(#707070_1px,transparent_1px)]' : 'bg-[radial-gradient(#e5e5e5_1px,transparent_1px)]'} [background-size:20px_20px]`} onMouseDown={handleGridMouseDown} onMouseMove={handleGridMouseMove} onMouseUp={handleGridMouseUp} onMouseLeave={handleGridMouseUp}>
            {isSelecting && selectionBox && <div className="absolute bg-accent/15 border border-accent z-50 pointer-events-none" style={{ left: Math.min(selectionBox.startX, selectionBox.currentX), top: Math.min(selectionBox.startY, selectionBox.currentY), width: Math.abs(selectionBox.currentX - selectionBox.startX), height: Math.abs(selectionBox.currentY - selectionBox.startY) }} />}
            {isLoading && <div className={`fixed inset-0 z-50 flex items-center justify-center ${isDarkMode ? 'bg-black/80' : 'bg-white/80'}`}><div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDarkMode ? 'border-white' : 'border-black'}`}></div></div>}
            <div className="pb-20 space-y-12">
              {categorizedGlyphs.map(([category, catGlyphs]) => (
                <div key={category}>
                   <h3 className={`text-2xl font-black uppercase tracking-tighter border-b-2 pb-2 mb-6 sticky top-0 z-50 ${isDarkMode ? 'text-white border-white bg-slate-950' : 'text-black border-black bg-white'}`}>{category}</h3>
                   <div className="grid gap-6 transition-all duration-300" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${100 * zoom}px, 1fr))` }}>
                        {catGlyphs.map(glyph => (
                            <div key={glyph.char} data-glyph-char={glyph.char} onClick={(e) => handleCardClick(glyph.char, e)}>
                                <GlyphCard glyph={glyph} onEdit={handleEditClick} onUpdate={handleUpdateGlyph} onUpdateMembers={handleUpdateMembers} onDragStart={handleDragStart} onDrop={handleDrop} isPasteMode={isPasteMode} onPaste={handlePasteGlyph} onMoveGlyph={handleMoveGlyph} onContextMenu={(e) => handleContextMenu(e, glyph.char)} onClear={() => handleClearSlot(glyph.char)} isSelected={selectedChars.has(glyph.char)} isDarkMode={isDarkMode} />
                            </div>
                        ))}
                        {category === 'Punctuation & Symbols' && (
                            <div className="relative w-full">
                                <div className="pt-[100%]" aria-hidden="true" />
                                <div className={`absolute inset-0 rounded-2xl border-2 border-dashed overflow-hidden ${isDarkMode ? 'bg-slate-950/80 border-slate-700 text-white' : 'bg-white border-neutral-300 text-black'}`}>
                                    <div className={`absolute inset-0 opacity-30 pointer-events-none ${isDarkMode ? 'bg-[radial-gradient(#707070_1px,transparent_1px)]' : 'bg-[radial-gradient(#d4d4d4_1px,transparent_1px)]'} [background-size:16px_16px]`} aria-hidden="true"></div>
                                    <button
                                        type="button"
                                        onClick={handleOpenCustomSlotModal}
                                        className={`relative z-10 w-full h-full flex flex-col items-center justify-center gap-2 text-center font-black uppercase tracking-[0.4em] text-sm ${isDarkMode ? 'text-white hover:text-emerald-300' : 'text-black hover:text-emerald-600'}`}
                                        aria-label="Adicionar novo slot"
                                    >
                                        <span className="text-4xl tracking-normal">+</span>
                                        <span>Slot</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              ))}
              {!showAll && visibleGlyphs.length > 0 && <div className="flex justify-center mt-12"><button onClick={() => setShowAll(true)} className={`px-8 py-4 border-2 border-dashed rounded-xl font-bold uppercase tracking-widest ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white hover:bg-slate-800' : 'bg-white border-black text-black hover:bg-neutral-50'}`}>Show All Empty Slots</button></div>}
            </div>
          </div>
        ) : <TestMode glyphs={glyphs} metadata={metadata} onUpdateMetadata={setMetadata} onUpdateGlyph={handleUpdateGlyph} onEditGlyph={handleEditClick} isDarkMode={isDarkMode} onOpenKerningPanel={handleOpenKerningForGlyph} />}
      </main>
    {selectedChars.size > 0 && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4"><span className="text-sm font-bold">{selectedChars.size} selected</span><button onClick={handleBulkClear} className="text-white hover:text-red-300 text-sm font-bold flex items-center gap-2 underline decoration-red-500">Clear Selected</button><button onClick={() => setSelectedChars(new Set())} className="text-neutral-400 hover:text-white ml-2 text-xl">&times;</button></div>}
    {contextMenu && <div className={`fixed z-50 border rounded-lg py-1 w-48 flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-black text-black'}`} style={{ top: contextMenu.y, left: contextMenu.x }}><div className={`px-3 py-1 text-xs font-bold border-b mb-1 ${isDarkMode ? 'text-slate-400 border-slate-700' : 'text-neutral-500 border-neutral-200'}`}>Glyph: {contextMenu.char === ' ' ? 'SPACE' : contextMenu.char}</div><button onClick={() => handlePasteGlyph(contextMenu.char)} className={`text-left px-3 py-2 text-sm font-medium ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-neutral-100'}`}>Paste SVG</button><button onClick={handleCopySVG} className={`text-left px-3 py-2 text-sm font-medium ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-neutral-100'}`}>Copy SVG</button><div className={`h-px my-1 ${isDarkMode ? 'bg-slate-700' : 'bg-neutral-200'}`} /><button onClick={handleResetSlotMetrics} className={`text-left px-3 py-2 text-sm font-medium ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-neutral-600 hover:bg-neutral-100'}`}>Reset Metrics</button><div className={`h-px my-1 ${isDarkMode ? 'bg-slate-700' : 'bg-neutral-200'}`} /><button onClick={() => handleClearSlot()} className={`text-left px-3 py-2 text-sm text-red-600 font-medium ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}>Clear Slot</button></div>}
      {isCustomSlotModalOpen && (
          <div
              className={`fixed inset-0 z-[70] flex items-center justify-center px-4 ${isDarkMode ? 'bg-black/70' : 'bg-white/70'}`}
              onClick={handleCloseCustomSlotModal}
          >
              <div
                  className={`w-full max-w-md rounded-3xl border ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
              >
                  <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
                      <div>
                          <p className="text-base font-black uppercase tracking-tight">Adicionar novo slot</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`}>Defina um caractere e um nome opcional antes de criar.</p>
                      </div>
                      <button
                          type="button"
                          onClick={handleCloseCustomSlotModal}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center text-lg font-black ${isDarkMode ? 'border-white/20 hover:bg-white/10' : 'border-neutral-300 hover:bg-neutral-100'}`}
                          aria-label="Fechar"
                      >
                          ×
                      </button>
                  </div>
                  <form className="px-6 py-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleAddCustomSymbol(); }}>
                      <label className="text-xs font-semibold flex flex-col gap-1">
                          <span className={isDarkMode ? 'text-slate-300' : 'text-neutral-600'}>Caractere</span>
                          <input
                              type="text"
                              maxLength={2}
                              value={newSymbolChar}
                              onChange={(e) => { setNewSymbolChar(e.target.value); setNewSymbolError(null); }}
                              placeholder="ex: ∞"
                              className={`rounded-xl px-3 py-2 text-center text-lg font-black outline-none border transition ${isDarkMode ? 'bg-slate-900 border-slate-800 focus:border-white' : 'bg-neutral-50 border-neutral-300 focus:border-black'}`}
                          />
                      </label>
                      <label className="text-xs font-semibold flex flex-col gap-1">
                          <span className={isDarkMode ? 'text-slate-300' : 'text-neutral-600'}>Nome (opcional)</span>
                          <input
                              type="text"
                              value={newSymbolName}
                              onChange={(e) => setNewSymbolName(e.target.value)}
                              placeholder="ex: infinity"
                              className={`rounded-xl px-3 py-2 text-sm outline-none border transition ${isDarkMode ? 'bg-slate-900 border-slate-800 focus:border-white' : 'bg-neutral-50 border-neutral-300 focus:border-black'}`}
                          />
                      </label>
                      {newSymbolError && <p className="text-xs text-red-500">{newSymbolError}</p>}
                      <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                              type="button"
                              onClick={handleCloseCustomSlotModal}
                              className={`px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] border ${isDarkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-neutral-300 text-black hover:bg-neutral-100'}`}
                          >
                              Cancelar
                          </button>
                          <button
                              type="submit"
                              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'}`}
                          >
                              Adicionar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      {pasteConfirmModal && (
          <div
              className={`fixed inset-0 z-[70] flex items-center justify-center px-4 ${isDarkMode ? 'bg-black/70' : 'bg-white/70'}`}
              onClick={() => setPasteConfirmModal(null)}
          >
              <div
                  className={`w-full max-w-lg rounded-3xl border ${isDarkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
              >
                  <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
                      <div>
                          <p className="text-base font-black uppercase tracking-tight">Atualizar Glyph "{pasteConfirmModal.char}"</p>
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`}>This slot already has an SVG. How would you like to update?</p>
                      </div>
                      <button
                          type="button"
                          onClick={() => setPasteConfirmModal(null)}
                          className={`w-9 h-9 rounded-full border flex items-center justify-center text-lg font-black ${isDarkMode ? 'border-white/20 hover:bg-white/10' : 'border-neutral-300 hover:bg-neutral-100'}`}
                          aria-label="Fechar"
                      >
                          ×
                      </button>
                  </div>
                  <div className="px-6 py-6 flex flex-col gap-4">
                      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-neutral-50 border-neutral-200'}`}>
                          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`}>Current settings</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className={isDarkMode ? 'text-slate-500' : 'text-neutral-400'}>Scale:</span> <span className="font-semibold">{pasteConfirmModal.oldGlyph.scale?.toFixed(2) ?? '1.00'}</span></div>
                              <div><span className={isDarkMode ? 'text-slate-500' : 'text-neutral-400'}>Baseline:</span> <span className="font-semibold">{pasteConfirmModal.oldGlyph.baselineOffset ?? 0}</span></div>
                              <div><span className={isDarkMode ? 'text-slate-500' : 'text-neutral-400'}>Advance:</span> <span className="font-semibold">{pasteConfirmModal.oldGlyph.advanceWidth ?? 600}</span></div>
                              <div><span className={isDarkMode ? 'text-slate-500' : 'text-neutral-400'}>LSB:</span> <span className="font-semibold">{pasteConfirmModal.oldGlyph.leftSideBearing ?? 50}</span></div>
                          </div>
                      </div>
                      <div className="flex flex-col gap-3">
                          <button
                              onClick={handlePasteConfirmKeepSettings}
                              className={`w-full p-4 rounded-xl border text-left transition ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100'}`}
                          >
                              <p className="font-black text-sm uppercase tracking-wide text-emerald-600">Keep Settings</p>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`}>Updates only the SVG drawing, keeping scale, baseline, advance width and other settings.</p>
                          </button>
                          <button
                              onClick={handlePasteConfirmResetSettings}
                              className={`w-full p-4 rounded-xl border text-left transition ${isDarkMode ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' : 'border-blue-500 bg-blue-50 hover:bg-blue-100'}`}
                          >
                              <p className="font-black text-sm uppercase tracking-wide text-blue-600">Reset Settings</p>
                              <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-neutral-500'}`}>Applies the new settings calculated from the SVG, resetting scale, baseline and metrics.</p>
                          </button>
                      </div>
                      <button
                          onClick={() => setPasteConfirmModal(null)}
                          className={`w-full py-3 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] border ${isDarkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-neutral-300 text-black hover:bg-neutral-100'}`}
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}
    {selectedGlyph && <EditorModal glyph={selectedGlyph} allGlyphs={glyphs} isOpen={isEditorOpen} onClose={handleCloseEditor} onSave={handleUpdateGlyph} metadata={metadata} onUpdateMetadata={setMetadata} onUpdateMembers={handleUpdateMembers} onBuildDerivatives={handleBuildDerivatives} isDarkMode={isDarkMode} onOpenKerningPanel={handleOpenKerningForGlyph} onApplyAutoPosition={applyAutoPositionToAll} />}
    <SpacingManager isOpen={isSpacingManagerOpen} onClose={() => setIsSpacingManagerOpen(false)} glyphs={glyphs} onUpdateGlyphs={setGlyphs} metadata={metadata} onUpdateMetadata={setMetadata} onUpdateMembers={handleUpdateMembers} isDarkMode={isDarkMode} focusGlyphChar={kerningFocusChar} onConsumeKerningFocus={() => setKerningFocusChar(null)} />
    <FontPreview glyphs={glyphs} metadata={metadata} isDarkMode={isDarkMode} isOpen={isFontPreviewOpen} onClose={() => setIsFontPreviewOpen(false)} />
    <GlyphDiagnostics glyphs={glyphs} metadata={metadata} isDarkMode={isDarkMode} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} onUpdateGlyph={handleUpdateGlyph} onEditGlyph={handleEditByChar} />
            {notices.length > 0 && (
                <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
                    {notices.map(notice => {
                            const style = noticeStyles[notice.variant];
                            return (
                                    <div
                                        key={notice.id}
                                        className={`w-72 border-2 rounded-2xl px-4 py-3 ${style.container}`}
                                    >
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                                                <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                                                <span>{style.label}</span>
                                        </div>
                                        <p className="text-sm font-semibold mt-1 leading-snug">{notice.message}</p>
                                    </div>
                            );
                    })}
                </div>
            )}
        </div>
  );

    const themeClasses = isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-black';

  return (
        <NoticeContext.Provider value={{ pushNotice }}>
            <div className={`font-sans transition-colors duration-300 ${themeClasses} flex-1 flex gap-0 min-h-0`} onContextMenu={(e) => e.preventDefault()}>
                    <Toolbar 
                        metadata={metadata} setMetadata={setMetadata} onExport={handleExport} onExportSvgFirst={handleExportSvgFirst} onExportFontEditor={handleExportFontEditor} onExportSvgSheet={handleExportSvgSheet} onExportEmptySvgSheet={handleExportEmptySvgSheet} isExporting={isExporting} exportProgress={exportProgress} onImportSheet={handleImportSheet}
                        availableStyles={Object.keys(styleMap)} currentStyle={currentStyle} onChangeStyle={handleSwitchStyle}
                        onAddStyle={handleAddStyle} onRemoveStyle={handleRemoveStyle} onDuplicateStyle={handleDuplicateStyle} onGoHome={handleGoHome}
                        onSaveProject={handleSaveProject} onDownloadProjectFile={handleDownloadProjectFile} onImportProjectFile={handleImportProjectFile}
                        isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                        onSwitchToCompact={handleSwitchToCompact}
                        onOpenFontPreview={() => setIsFontPreviewOpen(true)}
                        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                    />
                    <div className="flex-1 flex flex-col">
                        {workspace}
                    </div>
            </div>
        </NoticeContext.Provider>
  );
};
export default App;
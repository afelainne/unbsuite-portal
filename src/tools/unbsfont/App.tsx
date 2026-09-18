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
import { ClipboardPaste, Copy, Download, Eraser, Eye, Home, Moon, MoveHorizontal, PanelsTopLeft, Plus, Ruler, ScanSearch, Sun, X } from 'lucide-react';
import { Field, IconButton, Segmented, Sheet, Spinner, Switch, TextTabs, TitleRow, ValueRow } from './components/ui';
import { cx } from './components/cx';

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

const CATEGORY_UPPER = 'Maiúsculas';
const CATEGORY_LOWER = 'Minúsculas';
const CATEGORY_NUMBERS = 'Números';
const CATEGORY_SYMBOLS = 'Pontuação e símbolos';
const CATEGORY_OTHER = 'Acentuados e outros';

/**
 * Avisos em tinta: o ponto amarelo marca o que deu certo (o sinal da marca),
 * o erro usa o vermelho destrutivo, o alerta é um anel vazado e a informação
 * fica em cinza.
 */
const NOTICE_STYLES: Record<NoticeVariant, { label: string; dot: React.CSSProperties }> = {
    success: { label: 'Pronto', dot: { background: 'hsl(var(--accent))', boxShadow: '0 0 0 1px hsl(var(--foreground) / 0.18)' } },
    warning: { label: 'Atenção', dot: { boxShadow: 'inset 0 0 0 1.5px hsl(var(--foreground))' } },
    error: { label: 'Erro', dot: { background: 'hsl(var(--destructive))' } },
    info: { label: 'Aviso', dot: { background: 'hsl(var(--muted-foreground))' } },
};

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

  useEffect(() => {
      try {
          localStorage.setItem('font_studio_projects', JSON.stringify(projects));
      } catch (e: any) {
          if (e?.name === 'QuotaExceededError') {
              pushNotice('O armazenamento do navegador encheu. Baixe o projeto (.unbsfo) e remova estilos ou glifos para liberar espaço.', 'error');
          } else {
              pushNotice('Não foi possível salvar o projeto neste navegador.', 'error');
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
          name: "Sem nome",
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
          pushNotice('Nenhum projeto aberto. Crie ou abra um projeto antes.', 'warning');
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
      pushNotice('Projeto salvo neste navegador.', 'success');
      if (!lastProjectFileName) {
          pushNotice('Para ter uma cópia fora do navegador, baixe o arquivo .unbsfo.', 'info');
      }
  }, [activeProjectId, styleMap, currentStyle, glyphs, metadata, lastProjectFileName, pushNotice]);

  useEffect(() => {
      saveProjectRef.current = handleSaveProject;
  }, [handleSaveProject]);

  const handleDeleteProject = useCallback((projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const projectName = project.metadata.familyName || project.name || 'este projeto';
      const confirmed = window.confirm(`Excluir "${projectName}"? Não dá para desfazer.`);
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

      pushNotice('Projeto excluído.', 'warning');
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
        if (styleMap[styleName]) { pushNotice('Este estilo já existe.', 'warning'); return; }
    const newGlyphs = generateInitialGlyphs();
    setStyleMap(prev => ({ ...prev, [styleName]: newGlyphs }));
    handleSwitchStyle(styleName);
  };

  const handleDuplicateStyle = useCallback((newName: string) => {
    if (styleMap[newName]) { pushNotice('Este estilo já existe.', 'warning'); return; }
    const clonedGlyphs = JSON.parse(JSON.stringify(glyphs)) as typeof glyphs;
    setStyleMap(prev => ({ ...prev, [newName]: clonedGlyphs }));
    setCurrentStyle(newName);
    setGlyphs(clonedGlyphs);
    setMetadata(prev => ({ ...prev, styleName: newName }));
    pushNotice(`Estilo "${newName}" criado como cópia de "${currentStyle}".`, 'success');
  }, [styleMap, glyphs, currentStyle, pushNotice]);

    const handleRemoveStyle = useCallback((styleName: string) => {
      const styleKeys = Object.keys(styleMap);
      if (!styleMap[styleName]) return;
      if (styleKeys.length <= 1) {
          pushNotice('A fonte precisa de pelo menos um estilo.', 'warning');
          return;
      }
      const confirmed = window.confirm(`Excluir o estilo "${styleName}"? Não dá para desfazer.`);
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

      pushNotice(`Estilo "${styleName}" removido.`, 'info');
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
                    pushNotice(`${importedCount} ${importedCount === 1 ? 'glifo importado' : 'glifos importados'}.`, 'success');
            } else {
                    pushNotice('Nenhum glifo correspondente no SVG.', 'warning');
            }
        } catch (error) { console.error("Import failed", error); pushNotice("Não foi possível ler o SVG. Confira o arquivo.", 'error'); } finally { setIsLoading(false); }
  };

  const handleDownloadProjectFile = () => {
      const syncedStyleMap = { ...styleMap, [currentStyle]: glyphs };
      const payload = buildProjectFilePayload(metadata, syncedStyleMap, currentStyle);
      const baseName = `${metadata.familyName || 'font'}-${metadata.styleName || currentStyle}`.toLowerCase();
    downloadProjectFile(payload, baseName);
      setLastProjectFileName(baseName);
      pushNotice('Projeto baixado como arquivo.', 'success');
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
          const projectName = importedMetadata.familyName?.trim() || derivedBaseName || 'Fonte importada';

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

          pushNotice('Projeto aberto do arquivo.', 'success');
      } catch (error) {
          console.error('Failed to load project file', error);
          const message = error instanceof Error ? error.message : 'Não foi possível abrir o arquivo do projeto.';
          pushNotice(message, 'error');
      }
  };

  const handleExportSvgSheet = useCallback(() => {
      try {
          exportGlyphSvgSheet(metadata, glyphs);
          pushNotice('Folha SVG baixada.', 'success');
      } catch (error) {
          console.error('Failed to export SVG sheet', error);
          const message = error instanceof Error ? error.message : 'Não foi possível exportar a folha SVG.';
          pushNotice(message, 'error');
      }
  }, [metadata, glyphs, pushNotice]);

  const handleExportEmptySvgSheet = useCallback(() => {
      try {
          const emptyGlyphs = generateInitialGlyphs();
          exportGlyphSvgSheet(metadata, emptyGlyphs, { emptyTemplate: true });
          pushNotice('Folha SVG vazia baixada.', 'success');
      } catch (error) {
          console.error('Failed to export empty SVG sheet', error);
          const message = error instanceof Error ? error.message : 'Não foi possível exportar a folha SVG vazia.';
          pushNotice(message, 'error');
      }
  }, [metadata, pushNotice]);

  const handleExport = async () => {
      if (isExporting) {
          pushNotice('Já há uma exportação em andamento. Aguarde terminar.', 'warning');
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
                  pushNotice(`Estilo "${styleName}" ignorado: nenhum glifo desenhado.`, 'warning');
                  return;
              }
              candidates.push({
                  styleName,
                  glyphList: styleGlyphs,
                  meta: { ...metadata, styleName }
              });
          });

          if (!candidates.length) {
              pushNotice('Nenhum estilo pôde ser exportado.', 'error');
              return;
          }
      }

      setIsExporting(true);
      setExportProgress(0);
      pushNotice(
          candidates.length > 1
              ? `Fila criada para ${candidates.length} ${candidates.length > 1 ? 'estilos' : 'estilo'}.`
              : 'Exportação iniciada.',
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
                  pushNotice(`Estilo "${candidate.styleName}" exportado.`, 'success');
              } catch (error) {
                  const message = error instanceof FontExportError ? error.message : 'Não foi possível exportar a fonte.';
                  failures.push(candidate.styleName);
                  pushNotice(`Falha ao exportar "${candidate.styleName}": ${message}`, 'error');
              }
          }
      } finally {
          setIsExporting(false);
          setTimeout(() => setExportProgress(null), 300);
      }

      if (completed) {
          pushNotice(`Exportação concluída (${completed} ${completed > 1 ? 'estilos' : 'estilo'}).`, 'success');
      }
      if (failures.length) {
          pushNotice(`Não foi possível exportar ${failures.join(', ')}.`, 'error');
      }
  };

  const handleExportSvgFirst = async () => {
      if (isExporting) {
          pushNotice('Já há uma exportação em andamento. Aguarde terminar.', 'warning');
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
          pushNotice('Exportação SVG-first gerada (contorno e camada SVG).', 'success');
      } catch (error) {
          console.error('SVG-first export failed', error);
          const message = error instanceof Error ? error.message : 'Não foi possível exportar a fonte SVG-first.';
          pushNotice(message, 'error');
      } finally {
          setIsExporting(false);
          setTimeout(() => setExportProgress(null), 300);
      }
  };

  const handleExportFontEditor = async (kerningPairs?: KerningPair[]) => {
      if (isExporting) {
          pushNotice('Já há uma exportação em andamento. Aguarde.', 'warning');
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
                  pushNotice(`Estilo "${candidate.styleName}" exportado: ${result.fileName} (${result.glyphCount} glifos).`, 'success');
              } catch (err) {
                  console.error('Export failed', candidate.styleName, err);
                  failures.push(candidate.styleName);
                  const message = err instanceof Error ? err.message : 'Não foi possível exportar a fonte.';
                  pushNotice(`Falha ao exportar "${candidate.styleName}": ${message}`, 'error');
              }
          }
      } finally {
          setIsExporting(false);
          setTimeout(() => setExportProgress(null), 300);
      }

      if (completed && totalStyles > 1) {
          pushNotice(`Família "${metadata.familyName || 'Sem nome'}" exportada (${completed} de ${totalStyles} estilos).`, 'success');
      }
      if (failures.length) {
          pushNotice(`Não foi possível exportar: ${failures.join(', ')}.`, 'error');
      }
  };
  const handleAutoFit = () => { if (window.confirm("Redefinir escala, margem esquerda e linha de base de todos os glifos?")) setGlyphs(prev => prev.map(g => !g.pathData ? g : { ...g, scale: 1, leftSideBearing: 50, baselineOffset: 100 })); };
  
  const handleResetAll = () => { 
      if (window.confirm("Limpar todos os glifos deste estilo? Não dá para desfazer.")) { 
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
      if (!glyphs.some(g => g.char === target)) { pushNotice('Destino inválido para mover o glifo.', 'error'); return; }
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
      try { text = await navigator.clipboard.readText(); } catch (err) { const manualPaste = window.prompt("Cole o SVG:"); if (manualPaste) text = manualPaste; }
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
          pushNotice('Não foi possível ler o SVG copiado.', 'error');
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
      pushNotice('Desenho trocado, ajustes mantidos.', 'success');
  };

  const handlePasteConfirmResetSettings = () => {
      if (!pasteConfirmModal) return;
      const { char, newData } = pasteConfirmModal;
      // Usar todas as novas configurações do SVG importado
      handleUpdateGlyph(char, newData);
      setPasteConfirmModal(null);
      pushNotice('Desenho trocado com os ajustes do SVG.', 'success');
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
      if (window.confirm(`Limpar ${selectedChars.size} glifos?`)) {
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
          setNewSymbolError('Caractere inválido.');
          return;
      }
      if (glyphs.some(g => g.char === targetChar)) {
          setNewSymbolError('Este caractere já existe.');
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
      pushNotice(`Glifo ${targetChar} criado.`, 'success');
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
      const cats: Record<string, GlyphData[]> = { [CATEGORY_UPPER]: [], [CATEGORY_LOWER]: [], [CATEGORY_NUMBERS]: [], [CATEGORY_SYMBOLS]: [], [CATEGORY_OTHER]: [] };
      visibleGlyphs.forEach(g => {
          const code = g.unicode;
          if (code >= 65 && code <= 90) cats[CATEGORY_UPPER].push(g);
          else if (code >= 97 && code <= 122) cats[CATEGORY_LOWER].push(g);
          else if (code >= 48 && code <= 57) cats[CATEGORY_NUMBERS].push(g);
          else if ((code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126) || code === 32) cats[CATEGORY_SYMBOLS].push(g);
          else cats[CATEGORY_OTHER].push(g);
      });
      return Object.entries(cats).filter(([, list]) => list.length > 0);
  }, [visibleGlyphs]);
  const drawnCount = useMemo(() => glyphs.filter(g => g.pathData && g.pathData.trim().length > 0).length, [glyphs]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const noticeStack = notices.length > 0 && (
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col items-end gap-2 pointer-events-none" role="status" aria-live="polite">
          {notices.map(notice => {
              const style = NOTICE_STYLES[notice.variant];
              return (
                  <div key={notice.id} className="material-popover fade-in-up w-full sm:w-80 px-4 py-3 pointer-events-auto">
                      <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-pill shrink-0" style={style.dot} aria-hidden="true" />
                          <span className="label">{style.label}</span>
                      </div>
                      <p className="text-[14px] text-foreground mt-1.5 leading-snug">{notice.message}</p>
                  </div>
              );
          })}
      </div>
  );

  /** Raiz de todas as telas: tokens do sistema, e a classe `dark` quando o tema escuro está ligado. */
  const shell = (content: React.ReactNode, extra?: React.HTMLAttributes<HTMLDivElement>) => (
      <NoticeContext.Provider value={{ pushNotice }}>
          <div
              {...extra}
              className={cx(isDarkMode && 'dark', 'flex-1 flex flex-col min-h-0 min-w-0 bg-background text-foreground transition-colors duration-slow ease-out')}
          >
              {content}
              {noticeStack}
          </div>
      </NoticeContext.Provider>
  );

  if (screen === 'DASHBOARD') {
      return shell(
          <Dashboard
              onCreateProject={handleCreateProject}
              onOpenProject={handleOpenProject}
              onImportProjectFile={handleImportProjectFile}
              onDeleteProject={handleDeleteProject}
              projects={projects}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
          />
      );
  }

  if (screen === 'MODE_SELECT') {
      return shell(
          <ModeSelector
              onSelectMode={(mode) => { setEditorMode(mode); setScreen('EDITOR'); }}
              isDarkMode={isDarkMode}
              familyName={metadata.familyName}
              onBack={handleGoHome}
          />
      );
  }

  // Modo compacto: interface simplificada
  if (editorMode === 'COMPACT') {
      return shell(
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
              onToggleTheme={toggleTheme}
          />
      );
  }

  const titleActions = (
      <>
          <IconButton label="Projetos" variant="surface" onClick={handleGoHome}>
              <Home aria-hidden="true" />
          </IconButton>
          <IconButton label="Modo compacto" variant="surface" onClick={handleSwitchToCompact}>
              <PanelsTopLeft aria-hidden="true" />
          </IconButton>
          <IconButton label="Espaçamento e kerning" variant="surface" onClick={() => setIsSpacingManagerOpen(true)}>
              <MoveHorizontal aria-hidden="true" />
          </IconButton>
          <IconButton label="Pré-visualização" variant="surface" onClick={() => setIsFontPreviewOpen(true)}>
              <Eye aria-hidden="true" />
          </IconButton>
          <IconButton label="Diagnóstico" variant="surface" onClick={() => setIsDiagnosticsOpen(true)}>
              <ScanSearch aria-hidden="true" />
          </IconButton>
          <IconButton label={isDarkMode ? 'Usar tema claro' : 'Usar tema escuro'} variant="surface" onClick={toggleTheme}>
              {isDarkMode ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </IconButton>
          <button
              type="button"
              onClick={() => handleExportFontEditor()}
              disabled={isExporting}
              aria-busy={isExporting}
              className="ctl ctl-tinted ctl-lg"
          >
              {isExporting ? <Spinner /> : <Download className="w-4 h-4" aria-hidden="true" />}
              {isExporting ? 'Exportando…' : 'Exportar fonte'}
          </button>
      </>
  );

  const gridControls = (
      <div className="material-card p-4 flex flex-wrap items-center gap-x-6 gap-y-3 shrink-0">
          <Segmented<'FILLED' | 'ALL'>
              ariaLabel="Glifos visíveis"
              value={showAll ? 'ALL' : 'FILLED'}
              onChange={(v) => setShowAll(v === 'ALL')}
              items={[
                  { value: 'FILLED', label: 'Desenhados' },
                  { value: 'ALL', label: 'Todos' },
              ]}
          />
          <label className="flex items-center gap-3 min-w-[180px]">
              <span className="text-[12px] text-muted-foreground">Zoom</span>
              <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="tool-slider flex-1 w-28"
                  aria-label="Zoom da grade"
              />
              <span className="text-[12px] text-foreground tabular w-10 text-right">{Math.round(zoom * 100)}%</span>
          </label>
          <Switch
              label="Unicase"
              checked={metadata.isUnicase}
              onChange={(checked) => setMetadata({ ...metadata, isUnicase: checked })}
              className="gap-3"
          />
          <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[12px] text-muted-foreground tabular mr-2 hidden sm:inline">{drawnCount} de {glyphs.length} desenhados</span>
              <IconButton label="Modo colar: clique num glifo para colar o SVG" active={isPasteMode} onClick={() => setIsPasteMode(!isPasteMode)}>
                  <ClipboardPaste aria-hidden="true" />
              </IconButton>
              <IconButton label="Redefinir métricas" onClick={handleAutoFit}>
                  <Ruler aria-hidden="true" />
              </IconButton>
              <IconButton label="Novo glifo" onClick={handleOpenCustomSlotModal}>
                  <Plus aria-hidden="true" />
              </IconButton>
              <IconButton label="Limpar todos os glifos" variant="danger" onClick={handleResetAll}>
                  <Eraser aria-hidden="true" />
              </IconButton>
          </div>
      </div>
  );

  const onlySpaceVisible = !showAll && visibleGlyphs.every(g => g.char === ' ');

  const glyphGrid = (
      <div className="flex-1 lg:min-h-0 flex flex-col gap-5">
          {gridControls}
          <div
              ref={containerRef}
              className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto relative select-none -mx-1 px-1"
              onMouseDown={handleGridMouseDown}
              onMouseMove={handleGridMouseMove}
              onMouseUp={handleGridMouseUp}
              onMouseLeave={handleGridMouseUp}
          >
              {isSelecting && selectionBox && (
                  <div
                      className="absolute bg-foreground/5 shadow-[inset_0_0_0_1px_hsl(var(--foreground))] rounded-xs z-50 pointer-events-none"
                      style={{ left: Math.min(selectionBox.startX, selectionBox.currentX), top: Math.min(selectionBox.startY, selectionBox.currentY), width: Math.abs(selectionBox.currentX - selectionBox.startX), height: Math.abs(selectionBox.currentY - selectionBox.startY) }}
                  />
              )}
              {onlySpaceVisible && (
                  <div className="material-card mb-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                          <span className="text-[16px] text-foreground">Nenhum glifo desenhado ainda</span>
                          <span className="text-[14px] text-muted-foreground">Importe uma folha SVG pela coluna ao lado ou mostre todos os glifos para desenhar um a um.</span>
                      </div>
                      <button type="button" onClick={() => setShowAll(true)} className="ctl ctl-filled ctl-lg">Mostrar todos</button>
                  </div>
              )}
              <div className="pb-10 flex flex-col gap-8">
                  {categorizedGlyphs.map(([category, catGlyphs]) => (
                      <section key={category} aria-label={category}>
                          <header className="sticky top-0 z-40 bg-background flex items-baseline gap-3 pb-3 pt-1">
                              <h2 className="text-[20px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground">{category}</h2>
                              <span className="text-[13px] text-muted-foreground tabular">{catGlyphs.length}</span>
                          </header>
                          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(100 * zoom)}px, 1fr))` }}>
                              {catGlyphs.map(glyph => (
                                  <div key={glyph.char} data-glyph-char={glyph.char} onClick={(e) => handleCardClick(glyph.char, e)}>
                                      <GlyphCard glyph={glyph} onEdit={handleEditClick} onUpdate={handleUpdateGlyph} onUpdateMembers={handleUpdateMembers} onDragStart={handleDragStart} onDrop={handleDrop} isPasteMode={isPasteMode} onPaste={handlePasteGlyph} onMoveGlyph={handleMoveGlyph} onContextMenu={(e) => handleContextMenu(e, glyph.char)} onClear={() => handleClearSlot(glyph.char)} isSelected={selectedChars.has(glyph.char)} isDarkMode={isDarkMode} />
                                  </div>
                              ))}
                              {category === CATEGORY_SYMBOLS && (
                                  <button
                                      type="button"
                                      onClick={handleOpenCustomSlotModal}
                                      className="aspect-square rounded-lg bg-fill hover:bg-fill-2 text-muted-foreground hover:text-foreground flex flex-col items-center justify-center gap-1.5 transition-colors duration-fast ease-out"
                                  >
                                      <Plus className="w-5 h-5" aria-hidden="true" />
                                      <span className="text-[12px]">Novo glifo</span>
                                  </button>
                              )}
                          </div>
                      </section>
                  ))}
                  {!showAll && !onlySpaceVisible && (
                      <div className="flex justify-center">
                          <button type="button" onClick={() => setShowAll(true)} className="ctl ctl-outline ctl-lg">Mostrar glifos vazios</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  return shell(
      <>
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden">
              <div className="px-5 md:px-10 pt-6 md:pt-8 shrink-0">
                  <TitleRow
                      title={metadata.familyName || 'Sem nome'}
                      crumb={`Modo avançado · ${currentStyle}`}
                      actions={titleActions}
                      tabs={
                          <TextTabs<ViewMode>
                              ariaLabel="Área de trabalho"
                              value={viewMode}
                              onChange={setViewMode}
                              items={[
                                  { value: 'GRID', label: 'Glifos' },
                                  { value: 'TEST', label: 'Teste' },
                              ]}
                          />
                      }
                  />
              </div>
              <div className="shrink-0 lg:shrink lg:flex-1 lg:min-h-0 flex flex-col lg:flex-row gap-5 px-5 md:px-10 pt-6 pb-6">
                  <Toolbar
                      metadata={metadata} setMetadata={setMetadata} onExport={handleExport} onExportSvgFirst={handleExportSvgFirst} onExportFontEditor={handleExportFontEditor} onExportSvgSheet={handleExportSvgSheet} onExportEmptySvgSheet={handleExportEmptySvgSheet} isExporting={isExporting} exportProgress={exportProgress} onImportSheet={handleImportSheet}
                      availableStyles={Object.keys(styleMap)} currentStyle={currentStyle} onChangeStyle={handleSwitchStyle}
                      onAddStyle={handleAddStyle} onRemoveStyle={handleRemoveStyle} onDuplicateStyle={handleDuplicateStyle} onGoHome={handleGoHome}
                      onSaveProject={handleSaveProject} onDownloadProjectFile={handleDownloadProjectFile} onImportProjectFile={handleImportProjectFile}
                      isDarkMode={isDarkMode} onToggleTheme={toggleTheme}
                      onSwitchToCompact={handleSwitchToCompact}
                      onOpenFontPreview={() => setIsFontPreviewOpen(true)}
                      onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                  />
                  <div className="flex-1 min-w-0 lg:min-h-0 flex flex-col">
                      {viewMode === 'GRID'
                          ? glyphGrid
                          : <TestMode glyphs={glyphs} metadata={metadata} onUpdateMetadata={setMetadata} onUpdateGlyph={handleUpdateGlyph} onEditGlyph={handleEditClick} isDarkMode={isDarkMode} onOpenKerningPanel={handleOpenKerningForGlyph} />}
                  </div>
              </div>
          </div>

          {isLoading && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70" role="status" aria-label="Importando">
                  <Spinner className="w-8 h-8 text-foreground" />
              </div>
          )}

          {selectedChars.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-xl h-12 pl-5 pr-1.5 flex items-center gap-2 shadow-floating fade-in-up">
                  <span className="text-[14px] tabular whitespace-nowrap">{selectedChars.size} {selectedChars.size === 1 ? 'selecionado' : 'selecionados'}</span>
                  <button type="button" onClick={handleBulkClear} className="ctl text-primary-foreground hover:bg-primary-foreground/10 ml-2">
                      <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
                      Limpar
                  </button>
                  <button
                      type="button"
                      onClick={() => setSelectedChars(new Set())}
                      aria-label="Desfazer seleção"
                      className="ctl ctl-icon text-primary-foreground hover:bg-primary-foreground/10"
                  >
                      <X className="w-4 h-4" aria-hidden="true" />
                  </button>
              </div>
          )}

          {contextMenu && (
              <div
                  className="fixed z-50 material-popover p-1 w-56 flex flex-col"
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  role="menu"
                  aria-label={`Glifo ${contextMenu.char === ' ' ? 'espaço' : contextMenu.char}`}
              >
                  <div className="px-2.5 pt-1.5 pb-2 mb-1 hairline-b flex items-center justify-between">
                      <span className="label">Glifo</span>
                      <span className="text-[14px] text-foreground">{contextMenu.char === ' ' ? 'Espaço' : contextMenu.char}</span>
                  </div>
                  <button type="button" role="menuitem" onClick={() => handlePasteGlyph(contextMenu.char)} className="row">
                      <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />Colar SVG
                  </button>
                  <button type="button" role="menuitem" onClick={handleCopySVG} className="row">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />Copiar SVG
                  </button>
                  <button type="button" role="menuitem" onClick={handleResetSlotMetrics} className="row">
                      <Ruler className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />Redefinir métricas
                  </button>
                  <div className="h-px my-1 bg-separator" />
                  <button type="button" role="menuitem" onClick={() => handleClearSlot()} className="row text-destructive">
                      <Eraser className="w-3.5 h-3.5" aria-hidden="true" />Limpar glifo
                  </button>
              </div>
          )}

          <Sheet
              open={isCustomSlotModalOpen}
              onClose={handleCloseCustomSlotModal}
              title="Novo glifo"
              description="Escolha o caractere e, se quiser, um nome."
              size="max-w-md"
          >
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleAddCustomSymbol(); }}>
                  <Field label="Caractere">
                      <input
                          type="text"
                          maxLength={2}
                          value={newSymbolChar}
                          onChange={(e) => { setNewSymbolChar(e.target.value); setNewSymbolError(null); }}
                          placeholder="Ex.: ∞"
                          className="field h-12 text-center text-[24px]"
                          autoFocus
                      />
                  </Field>
                  <Field label="Nome (opcional)">
                      <input
                          type="text"
                          value={newSymbolName}
                          onChange={(e) => setNewSymbolName(e.target.value)}
                          placeholder="Ex.: infinity"
                          className="field h-10"
                      />
                  </Field>
                  {newSymbolError && <p className="text-[13px] text-destructive">{newSymbolError}</p>}
                  <div className="flex items-center justify-end gap-2 pt-2">
                      <button type="button" onClick={handleCloseCustomSlotModal} className="ctl ctl-outline ctl-lg">Cancelar</button>
                      <button type="submit" className="ctl ctl-filled ctl-lg">Adicionar</button>
                  </div>
              </form>
          </Sheet>

          <Sheet
              open={Boolean(pasteConfirmModal)}
              onClose={() => setPasteConfirmModal(null)}
              title={pasteConfirmModal ? `Atualizar "${pasteConfirmModal.char}"` : ''}
              description="Este glifo já tem um desenho. Como quer atualizar?"
              size="max-w-lg"
              footer={<button type="button" onClick={() => setPasteConfirmModal(null)} className="ctl ctl-outline ctl-lg">Cancelar</button>}
          >
              {pasteConfirmModal && (
                  <div className="flex flex-col gap-5">
                      <div className="card-quiet p-4">
                          <span className="label">Ajustes atuais</span>
                          <div className="grid grid-cols-2 gap-x-6 mt-2">
                              <ValueRow label="Escala" value={pasteConfirmModal.oldGlyph.scale?.toFixed(2) ?? '1.00'} />
                              <ValueRow label="Linha de base" value={pasteConfirmModal.oldGlyph.baselineOffset ?? 0} />
                              <ValueRow label="Largura" value={pasteConfirmModal.oldGlyph.advanceWidth ?? 600} last />
                              <ValueRow label="Margem esquerda" value={pasteConfirmModal.oldGlyph.leftSideBearing ?? 50} last />
                          </div>
                      </div>
                      <div className="flex flex-col gap-2">
                          <button
                              type="button"
                              onClick={handlePasteConfirmKeepSettings}
                              className="w-full text-left rounded-lg p-4 bg-card shadow-hairline hover:shadow-hairline-strong transition-shadow duration-fast ease-out"
                          >
                              <span className="block text-[16px] text-foreground">Manter ajustes</span>
                              <span className="block text-[13px] text-muted-foreground mt-1">Troca só o desenho e mantém escala, linha de base, largura e o resto.</span>
                          </button>
                          <button
                              type="button"
                              onClick={handlePasteConfirmResetSettings}
                              className="w-full text-left rounded-lg p-4 bg-card shadow-hairline hover:shadow-hairline-strong transition-shadow duration-fast ease-out"
                          >
                              <span className="block text-[16px] text-foreground">Usar ajustes do SVG</span>
                              <span className="block text-[13px] text-muted-foreground mt-1">Recalcula escala, linha de base e métricas a partir do arquivo colado.</span>
                          </button>
                      </div>
                  </div>
              )}
          </Sheet>

          {selectedGlyph && <EditorModal glyph={selectedGlyph} allGlyphs={glyphs} isOpen={isEditorOpen} onClose={handleCloseEditor} onSave={handleUpdateGlyph} metadata={metadata} onUpdateMetadata={setMetadata} onUpdateMembers={handleUpdateMembers} onBuildDerivatives={handleBuildDerivatives} isDarkMode={isDarkMode} onOpenKerningPanel={handleOpenKerningForGlyph} onApplyAutoPosition={applyAutoPositionToAll} />}
          <SpacingManager isOpen={isSpacingManagerOpen} onClose={() => setIsSpacingManagerOpen(false)} glyphs={glyphs} onUpdateGlyphs={setGlyphs} metadata={metadata} onUpdateMetadata={setMetadata} onUpdateMembers={handleUpdateMembers} isDarkMode={isDarkMode} focusGlyphChar={kerningFocusChar} onConsumeKerningFocus={() => setKerningFocusChar(null)} />
          <FontPreview glyphs={glyphs} metadata={metadata} isDarkMode={isDarkMode} isOpen={isFontPreviewOpen} onClose={() => setIsFontPreviewOpen(false)} />
          <GlyphDiagnostics glyphs={glyphs} metadata={metadata} isDarkMode={isDarkMode} isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} onUpdateGlyph={handleUpdateGlyph} onEditGlyph={handleEditByChar} />
      </>,
      { onContextMenu: (e) => e.preventDefault() }
  );
};
export default App;

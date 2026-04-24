import React, { useRef, useCallback } from 'react';
import { GlyphData, FontMetadata, Project } from '../types';

type ViewMode = 'GRID' | 'TEST';
type Screen = 'DASHBOARD' | 'EDITOR';

export interface AppSnapshot {
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

interface HistoryState {
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
    selectedChars: Set<string>;
    selectedGlyph: GlyphData | null;
    isEditorOpen: boolean;
    isSpacingManagerOpen: boolean;
}

interface HistorySetters {
    setGlyphs: React.Dispatch<React.SetStateAction<GlyphData[]>>;
    setMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
    setStyleMap: React.Dispatch<React.SetStateAction<Record<string, GlyphData[]>>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentStyle: React.Dispatch<React.SetStateAction<string>>;
    setScreen: React.Dispatch<React.SetStateAction<Screen>>;
    setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    setShowAll: React.Dispatch<React.SetStateAction<boolean>>;
    setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPasteMode: React.Dispatch<React.SetStateAction<boolean>>;
    setSelectedChars: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedGlyph: React.Dispatch<React.SetStateAction<GlyphData | null>>;
    setIsEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSpacingManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useHistory(state: HistoryState, setters: HistorySetters) {
    const historyRef = useRef<AppSnapshot[]>([]);
    const historyIndexRef = useRef(-1);
    const isRestoringRef = useRef(false);

    const createSnapshot = useCallback((): AppSnapshot => ({
        glyphs: deepClone(state.glyphs),
        metadata: deepClone(state.metadata),
        styleMap: deepClone(state.styleMap),
        projects: deepClone(state.projects),
        activeProjectId: state.activeProjectId,
        currentStyle: state.currentStyle,
        screen: state.screen,
        viewMode: state.viewMode,
        zoom: state.zoom,
        showAll: state.showAll,
        isDarkMode: state.isDarkMode,
        isPasteMode: state.isPasteMode,
        selectedChars: Array.from(state.selectedChars),
        selectedGlyphChar: state.selectedGlyph?.char ?? null,
        isEditorOpen: state.isEditorOpen,
        isSpacingManagerOpen: state.isSpacingManagerOpen
    }), [state]);

    const applySnapshot = useCallback((snapshot: AppSnapshot) => {
        isRestoringRef.current = true;
        setters.setGlyphs(snapshot.glyphs);
        setters.setMetadata(snapshot.metadata);
        setters.setStyleMap(snapshot.styleMap);
        setters.setProjects(snapshot.projects);
        setters.setActiveProjectId(snapshot.activeProjectId);
        setters.setCurrentStyle(snapshot.currentStyle);
        setters.setScreen(snapshot.screen);
        setters.setViewMode(snapshot.viewMode);
        setters.setZoom(snapshot.zoom);
        setters.setShowAll(snapshot.showAll);
        setters.setIsDarkMode(snapshot.isDarkMode);
        setters.setIsPasteMode(snapshot.isPasteMode);
        setters.setSelectedChars(new Set(snapshot.selectedChars));
        setters.setSelectedGlyph(snapshot.selectedGlyphChar 
            ? snapshot.glyphs.find(g => g.char === snapshot.selectedGlyphChar) || null 
            : null);
        setters.setIsEditorOpen(snapshot.isEditorOpen);
        setters.setIsSpacingManagerOpen(snapshot.isSpacingManagerOpen);
    }, [setters]);

    const handleUndo = useCallback(() => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        const snapshot = historyRef.current[historyIndexRef.current];
        if (snapshot) applySnapshot(snapshot);
    }, [applySnapshot]);

    const handleRedo = useCallback(() => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        const snapshot = historyRef.current[historyIndexRef.current];
        if (snapshot) applySnapshot(snapshot);
    }, [applySnapshot]);

    const pushSnapshot = useCallback(() => {
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

    return {
        historyRef,
        historyIndexRef,
        isRestoringRef,
        createSnapshot,
        applySnapshot,
        handleUndo,
        handleRedo,
        pushSnapshot
    };
}

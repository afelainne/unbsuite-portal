import React, { useState, useCallback, useEffect } from 'react';
import { GlyphData, FontMetadata, Project, INITIAL_METADATA, generateInitialGlyphs } from '../types';
import { NoticeVariant } from '../contexts/NoticeContext';

const createProjectId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface ProjectManagerOptions {
    pushNotice: (message: string, variant?: NoticeVariant) => void;
    setMetadata: React.Dispatch<React.SetStateAction<FontMetadata>>;
    setStyleMap: React.Dispatch<React.SetStateAction<Record<string, GlyphData[]>>>;
    setCurrentStyle: React.Dispatch<React.SetStateAction<string>>;
    setGlyphs: React.Dispatch<React.SetStateAction<GlyphData[]>>;
    setSelectedGlyph: React.Dispatch<React.SetStateAction<GlyphData | null>>;
    setSelectedChars: React.Dispatch<React.SetStateAction<Set<string>>>;
    setScreen: React.Dispatch<React.SetStateAction<'DASHBOARD' | 'EDITOR'>>;
}

export function useProjectManager(options: ProjectManagerOptions) {
    const {
        pushNotice,
        setMetadata,
        setStyleMap,
        setCurrentStyle,
        setGlyphs,
        setSelectedGlyph,
        setSelectedChars,
        setScreen
    } = options;

    const [projects, setProjects] = useState<Project[]>(() => {
        try {
            const saved = localStorage.getItem('font_studio_projects');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [lastProjectFileName, setLastProjectFileName] = useState<string | null>(null);

    // Persist projects to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('font_studio_projects', JSON.stringify(projects));
        } catch (e: any) {
            console.error("Storage Save Error:", e);
            if (e.name === 'QuotaExceededError') {
                pushNotice('Armazenamento do navegador cheio. Exporte o projeto (.otf) e remova pesos ou glifos para liberar espaço.', 'error');
            }
        }
    }, [projects, pushNotice]);

    const handleCreateProject = useCallback(() => {
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
        setScreen('EDITOR');
    }, [setMetadata, setStyleMap, setCurrentStyle, setGlyphs, setScreen]);

    const handleOpenProject = useCallback((id: string) => {
        const proj = projects.find(p => p.id === id);
        if (proj) {
            setActiveProjectId(proj.id);
            setMetadata(proj.metadata);
            setStyleMap(proj.styleMap);
            const firstStyle = Object.keys(proj.styleMap)[0] || "Regular";
            setCurrentStyle(firstStyle);
            setGlyphs(proj.styleMap[firstStyle]);
            setScreen('EDITOR');
        }
    }, [projects, setMetadata, setStyleMap, setCurrentStyle, setGlyphs, setScreen]);

    const handleDeleteProject = useCallback((projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const projectName = project.metadata.familyName || project.name || 'este projeto';
        const confirmed = window.confirm(`Deseja excluir "${projectName}"? Essa ação não pode ser desfeita.`);
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
    }, [projects, activeProjectId, pushNotice, setMetadata, setStyleMap, setCurrentStyle, setGlyphs, setSelectedGlyph, setSelectedChars, setScreen]);

    return {
        projects,
        setProjects,
        activeProjectId,
        setActiveProjectId,
        lastProjectFileName,
        setLastProjectFileName,
        handleCreateProject,
        handleOpenProject,
        handleDeleteProject
    };
}

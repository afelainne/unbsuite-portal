import React, { useRef } from 'react';
import { GlyphData, Project } from '../types';
import AppLogo from './AppLogo';

interface DashboardProps {
    onCreateProject: () => void;
    onOpenProject: (id: string) => void;
    onImportProjectFile: (file: File) => void;
    onDeleteProject: (id: string) => void;
    projects: Project[];
    isDarkMode: boolean;
}

const PREVIEW_CHARS: string[] = ['A', 'B', 'C'];

const getStyleGlyphMap = (project: Project): Record<string, GlyphData> | null => {
    const primaryStyle = project.styleMap[project.metadata.styleName] || Object.values(project.styleMap)[0];
    if (!primaryStyle) return null;
    return primaryStyle.reduce<Record<string, GlyphData>>((acc, glyph) => {
        acc[glyph.char] = glyph;
        return acc;
    }, {});
};

const Dashboard: React.FC<DashboardProps> = ({ onCreateProject, onOpenProject, onImportProjectFile, onDeleteProject, projects, isDarkMode }) => {
  const bgClass = isDarkMode ? 'bg-slate-950 text-white' : 'bg-white text-black';
  const sidebarClass = isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-neutral-200 bg-neutral-50/50';
  const cardClass = isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-white' : 'bg-white border-neutral-200 hover:border-black';
  const textSub = isDarkMode ? 'text-slate-400' : 'text-neutral-500';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onImportProjectFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`min-h-screen p-8 font-sans flex overflow-hidden transition-colors duration-300 ${bgClass}`}>
        {/* Sidebar */}
        <div className={`w-64 flex flex-col gap-8 border-r pr-8 shrink-0 ${sidebarClass}`}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleProjectFileChange}
                className="hidden"
                accept=".unbsfo,application/json"
            />
            <div className="pt-4 px-2">
                <AppLogo className={`w-full max-w-[180px] ${isDarkMode ? 'text-white' : 'text-black'}`} />
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 pl-12 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <header className="flex justify-between items-start mb-8 shrink-0 pt-4">
                <div className="space-y-1">
                    <h2 className="text-4xl font-bold tracking-tight">Projects</h2>
                    <p className={`${textSub} font-medium`}>Create, open, or import your fonts.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
                {/* Create New Card */}
                <button 
                    onClick={onCreateProject}
                    className={`group relative h-48 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 text-center px-6 ${isDarkMode ? 'border-slate-700 hover:border-white hover:bg-slate-900' : 'border-neutral-300 hover:border-black hover:bg-neutral-50'}`}
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 group-hover:bg-white group-hover:text-black' : 'bg-neutral-100 group-hover:bg-black group-hover:text-white'}`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <div>
                                            <span className={`font-bold uppercase tracking-[0.12em] text-sm block ${textSub} group-hover:text-current`}>Create New Font</span>
                      <p className={`text-xs mt-2 ${textSub}`}>Start fresh with a blank grid of glyph slots.</p>
                    </div>
                </button>

                {/* Open Project Card */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative h-48 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 text-center px-6 ${isDarkMode ? 'border-slate-700 hover:border-white hover:bg-slate-900' : 'border-neutral-300 hover:border-black hover:bg-neutral-50'}`}
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isDarkMode ? 'bg-slate-800 group-hover:bg-white group-hover:text-black' : 'bg-neutral-100 group-hover:bg-black group-hover:text-white'}`}>
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </div>
                                        <div>
                                            <span className={`font-bold uppercase tracking-[0.12em] text-sm block ${textSub} group-hover:text-current`}>Open Existing Project</span>
                                            <p className={`text-xs mt-2 ${textSub}`}>Import a .unbsfo file to continue where you left off.</p>
                                        </div>
                </button>
            </div>
            
            <div className="mt-16">
                <h3 className={`text-sm font-bold mb-4 uppercase tracking-[0.12em] border-b pb-2 inline-block ${isDarkMode ? 'border-white' : 'border-black'}`}>Recent Projects</h3>
                {projects.length === 0 ? (
                    <div className={`p-12 text-center rounded-xl border text-sm font-medium italic ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-neutral-200 text-neutral-500'}`}>
                        No projects yet. Start by creating or opening one above.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {projects.map(project => {
                            const glyphMap = getStyleGlyphMap(project);
                            return (
                            <div 
                                key={project.id}
                                onClick={() => onOpenProject(project.id)}
                                className={`group relative h-48 rounded-xl border transition-all p-5 flex flex-col justify-between cursor-pointer overflow-hidden ${cardClass}`}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className={`inline-block px-2 py-1 rounded border text-[10px] mb-2 font-mono uppercase tracking-[0.12em] font-bold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-neutral-100 border-neutral-200 text-neutral-600'}`}>
                                        {project.metadata.styleName}
                                    </div>
                                    <h3 className="text-2xl font-black group-hover:underline decoration-2 underline-offset-4 truncate">
                                        {project.metadata.familyName || "Untitled Font"}
                                    </h3>
                                    <p className={`${textSub} text-xs mt-2 font-medium`}>by {project.metadata.designer}</p>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="flex items-end gap-2">
                                        {PREVIEW_CHARS.map(char => {
                                            const glyph = glyphMap ? glyphMap[char] : null;
                                            const hasPath = glyph?.pathData;
                                            return (
                                                <div
                                                    key={`${project.id}-${char}`}
                                                    className={`w-12 h-14 rounded-lg border flex items-center justify-center ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-neutral-200 bg-neutral-50'}`}
                                                >
                                                    {hasPath ? (
                                                        <svg
                                                            viewBox="-120 -320 1240 1440"
                                                            className={`w-full h-full ${isDarkMode ? 'text-white' : 'text-black'}`}
                                                            role="img"
                                                            aria-label={`${char} preview`}
                                                        >
                                                            <path
                                                                d={glyph!.pathData}
                                                                fill="currentColor"
                                                                transform={`translate(${glyph!.leftSideBearing || 0}, ${-(glyph!.baselineOffset || 0)}) scale(${glyph!.scale || 1})`}
                                                            />
                                                        </svg>
                                                    ) : (
                                                        <span className="text-xl font-black">{glyph?.char || char}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                                        aria-label={`Excluir ${project.metadata.familyName || 'projeto'}`}
                                        className={`p-2 rounded-full border transition ${isDarkMode ? 'border-slate-800 text-slate-400 hover:border-red-400 hover:text-red-300 hover:bg-red-500/10' : 'border-neutral-200 text-neutral-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50'}`}
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M4 7h16" />
                                            <path d="M10 11v6" />
                                            <path d="M14 11v6" />
                                            <path d="M6 7l1 12c.1 1.1.9 2 2 2h6c1.1 0 1.9-.9 2-2l1-12" />
                                            <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
                                        </svg>
                                    </button>
                                </div>

                                <div className={`flex items-end justify-between border-t pt-3 mt-3 text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-neutral-100 text-neutral-500'}`}>
                                    <div className={`text-xs font-mono ${textSub}`}>
                                        {new Date(project.updatedAt).toLocaleDateString()}
                                    </div>
                                    <div className={`text-xs font-bold ${textSub} group-hover:text-current`}>
                                        {Object.keys(project.styleMap).length} Styles
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
import React, { useRef } from 'react';
import { FolderOpen, Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { GlyphData, Project } from '../types';
import { IconButton, SectionHeading, TitleRow, GlyphSvg } from './ui';

interface DashboardProps {
    onCreateProject: () => void;
    onOpenProject: (id: string) => void;
    onImportProjectFile: (file: File) => void;
    onDeleteProject: (id: string) => void;
    projects: Project[];
    isDarkMode: boolean;
    onToggleTheme?: () => void;
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

const countDrawn = (project: Project): number => {
    const primaryStyle = project.styleMap[project.metadata.styleName] || Object.values(project.styleMap)[0];
    if (!primaryStyle) return 0;
    return primaryStyle.filter(g => g.pathData && g.pathData.trim().length > 0).length;
};

const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Dashboard: React.FC<DashboardProps> = ({ onCreateProject, onOpenProject, onImportProjectFile, onDeleteProject, projects, isDarkMode, onToggleTheme }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProjectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onImportProjectFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCards = [
      {
          key: 'new',
          icon: <Plus className="w-4 h-4" aria-hidden="true" />,
          title: 'Nova fonte',
          caption: 'Comece com uma grade vazia de glifos.',
          onClick: onCreateProject,
      },
      {
          key: 'open',
          icon: <FolderOpen className="w-4 h-4" aria-hidden="true" />,
          title: 'Abrir projeto',
          caption: 'Importe um arquivo .unbsfo e continue de onde parou.',
          onClick: () => fileInputRef.current?.click(),
      },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleProjectFileChange}
            className="hidden"
            accept=".unbsfo,application/json"
        />
        <div className="max-w-[1240px] mx-auto w-full px-5 md:px-10 pt-6 md:pt-8 pb-24">
            <TitleRow
                title="Projetos"
                crumb="Projetos"
                actions={
                    <>
                        {onToggleTheme && (
                            <IconButton
                                label={isDarkMode ? 'Usar tema claro' : 'Usar tema escuro'}
                                variant="surface"
                                onClick={onToggleTheme}
                            >
                                {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
                            </IconButton>
                        )}
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="ctl ctl-outline ctl-lg">
                            <FolderOpen className="w-4 h-4" aria-hidden="true" />
                            Abrir projeto
                        </button>
                        <button type="button" onClick={onCreateProject} className="ctl ctl-tinted ctl-lg">
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            Nova fonte
                        </button>
                    </>
                }
            />

            {projects.length === 0 ? (
                <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {startCards.map(card => (
                        <button
                            key={card.key}
                            type="button"
                            onClick={card.onClick}
                            className="material-card group text-left flex flex-col items-start gap-10 transition-shadow duration-fast ease-out hover:shadow-hairline-strong"
                        >
                            <span className="w-10 h-10 rounded-md bg-fill-2 text-foreground flex items-center justify-center shrink-0 transition-colors duration-fast ease-out group-hover:bg-primary group-hover:text-primary-foreground [&_svg]:w-[18px] [&_svg]:h-[18px]">
                                {card.icon}
                            </span>
                            <span className="flex flex-col gap-1 min-w-0">
                                <span className="text-[24px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground">{card.title}</span>
                                <span className="text-[14px] text-muted-foreground">{card.caption}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                <SectionHeading
                    className="mt-8 md:mt-10"
                    title="Recentes"
                    hint={`${projects.length} ${projects.length === 1 ? 'projeto salvo' : 'projetos salvos'} neste navegador.`}
                />
            )}

            {projects.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {projects.map(project => {
                        const glyphMap = getStyleGlyphMap(project);
                        const familyName = project.metadata.familyName || 'Sem nome';
                        const styleCount = Object.keys(project.styleMap).length;
                        const drawn = countDrawn(project);
                        return (
                        <article
                            key={project.id}
                            className="material-card group relative flex flex-col gap-5 cursor-pointer transition-shadow duration-fast ease-out hover:shadow-hairline-strong"
                            onClick={() => onOpenProject(project.id)}
                        >
                            <header className="flex items-center justify-between gap-3 min-h-8">
                                <span className="label truncate">{project.metadata.styleName}</span>
                                <IconButton
                                    label={`Excluir ${familyName}`}
                                    variant="danger"
                                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </IconButton>
                            </header>

                            <div className="flex flex-col gap-1 min-w-0">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onOpenProject(project.id); }}
                                    className="text-left text-[24px] font-normal leading-[1.2] tracking-[-0.01em] text-foreground truncate outline-none focus-visible:shadow-focus rounded-xs"
                                >
                                    {familyName}
                                </button>
                                {project.metadata.designer && (
                                    <span className="text-[13px] text-muted-foreground truncate">por {project.metadata.designer}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {PREVIEW_CHARS.map(char => {
                                    const glyph = glyphMap ? glyphMap[char] : null;
                                    const hasPath = Boolean(glyph?.pathData);
                                    return (
                                        <div
                                            key={`${project.id}-${char}`}
                                            className="aspect-square rounded-md bg-canvas text-foreground flex items-center justify-center p-2"
                                        >
                                            {hasPath && glyph ? (
                                                <GlyphSvg
                                                    viewBox="-120 -320 1240 1440"
                                                    className="w-full h-full"
                                                    pathData={glyph.pathData}
                                                    leftSideBearing={glyph.leftSideBearing || 0}
                                                    baselineOffset={-(glyph.baselineOffset || 0)}
                                                    scale={glyph.scale || 1}
                                                    label={`Glifo ${char}`}
                                                />
                                            ) : (
                                                <span className="text-[28px] font-normal text-muted-foreground/60" aria-hidden="true">{glyph?.char || char}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <footer className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground tabular">
                                <span>{formatDate(project.updatedAt)}</span>
                                <span>
                                    {drawn} {drawn === 1 ? 'glifo' : 'glifos'} · {styleCount} {styleCount === 1 ? 'estilo' : 'estilos'}
                                </span>
                            </footer>
                        </article>
                        );
                    })}
                </div>
            )}
            {projects.length === 0 && (
                <p className="mt-6 text-[14px] text-muted-foreground">Os projetos ficam salvos neste navegador. Baixe o arquivo .unbsfo para guardar uma cópia.</p>
            )}
        </div>
    </div>
  );
};

export default Dashboard;

import { ReferenceColor } from '../types';

export interface ProjectData {
  id: string;
  name: string;
  updatedAt: number;
  items: PaletteItemData[];
}

export interface PaletteItemData {
  id: string;
  hex: string;
  name: string;
  matchC: ReferenceColor;
  matchU: ReferenceColor;
  customCmyk?: { c: number; m: number; y: number; k: number }; // User overrides
  customRgb?: { r: number; g: number; b: number }; // User overrides
}

const STORAGE_KEY = 'chromamatch_projects';

export const getProjects = (): ProjectData[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveProject = (project: ProjectData) => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    projects.push({ ...project, updatedAt: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
};

export const deleteProject = (id: string) => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return projects;
};

import { ReferenceColor } from '../types';
import { readJson, writeJson } from './safeStorage';

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

const isProject = (v: any): v is ProjectData =>
  !!v && typeof v === 'object' && typeof v.id === 'string' && Array.isArray(v.items);

const isArray = (v: unknown): v is ProjectData[] => Array.isArray(v);

export const getProjects = (): ProjectData[] => {
  return readJson<ProjectData[]>(STORAGE_KEY, [], isArray).filter(isProject);
};

export const saveProject = (project: ProjectData) => {
  const projects = getProjects();
  const index = projects.findIndex((p) => p.id === project.id);

  if (index >= 0) {
    projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    projects.push({ ...project, updatedAt: Date.now() });
  }

  const persisted = writeJson(STORAGE_KEY, projects);
  return Object.assign(projects, { persisted });
};

export const deleteProject = (id: string) => {
  const projects = getProjects().filter((p) => p.id !== id);
  const persisted = writeJson(STORAGE_KEY, projects);
  return Object.assign(projects, { persisted });
};


export interface FormatPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'PRINT' | 'SOCIAL MEDIA';
}

export interface PrintSettings {
  bleed: number; // mm
  safeZone: number; // mm
  columns: number;
  rows: number;
  gutter: number; // mm
}

export interface PaperRecommendation {
  type: string;
  weight: string;
  finish: string;
  description: string;
}

export interface AnalysisResult {
  detectedFormat: string;
  technicalIssues: string[];
  recommendations: PaperRecommendation[];
}

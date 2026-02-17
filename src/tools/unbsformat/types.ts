
export interface FormatPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'PRINT' | 'SOCIAL MEDIA' | 'EDITORIAL' | 'PACKAGING' | 'SIGNAGE' | 'STATIONERY' | 'PHOTO' | 'ADVERTISING' | 'SCREEN';
}

export interface PrintSettings {
  bleed: number;
  safeZone: number;
  columns: number;
  rows: number;
  gutter: number;
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

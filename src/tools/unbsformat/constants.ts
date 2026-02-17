
import { FormatPreset } from './types';

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: 'a0', name: 'A0 POSTER', width: 841, height: 1189, category: 'PRINT' },
  { id: 'a1', name: 'A1 POSTER', width: 594, height: 841, category: 'PRINT' },
  { id: 'a2', name: 'A2 POSTER', width: 420, height: 594, category: 'PRINT' },
  { id: 'a3', name: 'A3 POSTER', width: 297, height: 420, category: 'PRINT' },
  { id: 'a4', name: 'A4 DOCUMENT', width: 210, height: 297, category: 'PRINT' },
  { id: 'a5', name: 'A5 FLYER', width: 148, height: 210, category: 'PRINT' },
  { id: 'a6', name: 'A6 POSTCARD', width: 105, height: 148, category: 'PRINT' },
  { id: 'bc_int', name: 'BUSINESS CARD (INTL)', width: 85, height: 55, category: 'PRINT' },
  { id: 'bc_us', name: 'BUSINESS CARD (US)', width: 88.9, height: 50.8, category: 'PRINT' },
  { id: 'ig_sq', name: 'INSTAGRAM SQUARE', width: 285.75, height: 285.75, category: 'SOCIAL MEDIA' },
  { id: 'ig_pt', name: 'INSTAGRAM PORTRAIT', width: 285.75, height: 357.18, category: 'SOCIAL MEDIA' },
];

export const MM_TO_PX = 3.7795275591; // 96 DPI

/**
 * Custom Hooks Index
 * 
 * Este arquivo exporta todos os hooks customizados do app.
 * Esses hooks podem ser usados gradualmente para simplificar o App.tsx.
 * 
 * Uso:
 *   import { useNotices, useHistory, useProjectManager, useGlyphSelection } from './hooks';
 */

export { useNotices } from './useNotices';
export type { Notice, NoticeStyles } from './useNotices';

export { useHistory } from './useHistory';
export type { AppSnapshot } from './useHistory';

export { useProjectManager } from './useProjectManager';

export { useGlyphSelection } from './useGlyphSelection';

export { useKerningManager } from './useKerningManager';

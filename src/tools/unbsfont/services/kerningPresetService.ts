/**
 * Kerning Preset Service
 * Centralizes all kerning generation logic used by both CompactEditor and SpacingManager.
 */

import { GlyphData } from '../types';
import { generateSmartAutoKerning, generateCommonPairsKerning, getKerningStats } from './kerningService';
import { 
  generateProfessionalKerning, 
  generateHybridKerning,
  analyzeKerningQuality,
  FontStyle,
  KerningPair,
  KerningQualityReport
} from './professionalKerningService';
import { applyKerningTemplate, getTemplateById } from './kerningTemplates';

// ============================================================================
// TYPES
// ============================================================================

export type KerningPresetName = 
  | 'none' | 'tight' | 'normal' | 'loose' 
  | 'auto-smart' | 'auto-common' 
  | 'professional' | 'hybrid' 
  | string; // template IDs

export interface KerningPresetOptions {
  intensity: number;        // 0.5 to 2.0
  fontStyle: FontStyle;
  existingKerning?: Record<string, number>;
  templateScale?: number;
}

export interface KerningPresetResult {
  kerning: Record<string, number>;
  pairs: KerningPair[];
  pairCount: number;
  quality?: KerningQualityReport;
  message: string;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Applies a kerning preset and returns the generated kerning data.
 * This is the single source of truth for kerning generation logic.
 */
export function applyKerningPreset(
  glyphs: GlyphData[],
  preset: KerningPresetName,
  options: KerningPresetOptions
): KerningPresetResult {
  const { intensity, fontStyle } = options;
  
  let newKerning: Record<string, number> = {};
  let generatedPairs: KerningPair[] = [];
  let message = '';
  
  switch (preset) {
    case 'none':
      message = 'Kerning removido.';
      break;

    case 'tight':
      generatedPairs = generateProfessionalKerning(glyphs, {
        style: fontStyle,
        intensity: 1.3 * intensity
      });
      message = `Tight: ${generatedPairs.length} pairs.`;
      break;

    case 'normal':
      generatedPairs = generateProfessionalKerning(glyphs, {
        style: fontStyle,
        intensity
      });
      message = `Normal: ${generatedPairs.length} pairs.`;
      break;

    case 'loose':
      generatedPairs = generateProfessionalKerning(glyphs, {
        style: fontStyle,
        intensity: 0.5 * intensity
      });
      message = `Loose: ${generatedPairs.length} pairs.`;
      break;

    case 'auto-smart':
      newKerning = generateSmartAutoKerning(glyphs, {}, {
        intensity,
        profile: 'sans',
        includePunctuation: true,
        includeNumbers: true,
      });
      if (Object.keys(newKerning).length < 10) {
        // Fallback to professional
        generatedPairs = generateProfessionalKerning(glyphs, {
          style: fontStyle,
          intensity
        });
        newKerning = {};
        message = `Smart (fallback pro): ${generatedPairs.length} pairs.`;
      } else {
        const stats = getKerningStats(newKerning);
        message = `Smart: ${stats?.totalPairs || 0} pairs.`;
      }
      break;

    case 'auto-common':
      newKerning = generateCommonPairsKerning(glyphs, {}, intensity);
      if (Object.keys(newKerning).length < 10) {
        generatedPairs = generateProfessionalKerning(glyphs, {
          style: fontStyle,
          intensity
        });
        newKerning = {};
        message = `Comum (fallback pro): ${generatedPairs.length} pairs.`;
      } else {
        const stats = getKerningStats(newKerning);
        message = `Comum: ${stats?.totalPairs || 0} pairs.`;
      }
      break;

    case 'professional':
      generatedPairs = generateProfessionalKerning(glyphs, {
        style: fontStyle,
        intensity
      });
      {
        const q = analyzeKerningQuality(glyphs, generatedPairs);
        message = `Pro: ${generatedPairs.length} pairs (${q.grade}).`;
      }
      break;

    case 'hybrid':
      generatedPairs = generateHybridKerning(glyphs, {
        style: fontStyle,
        intensity
      });
      {
        const q = analyzeKerningQuality(glyphs, generatedPairs);
        message = `Hybrid: ${generatedPairs.length} pairs (${q.grade}).`;
      }
      break;

    default: {
      // Template
      const template = getTemplateById(preset);
      if (template) {
        newKerning = applyKerningTemplate(template, {}, {
          scale: options.templateScale ?? intensity,
          overwrite: true,
        });
        message = `Template "${template.name}".`;
      } else {
        message = 'Preset not found.';
      }
      break;
    }
  }
  
  // Combine into single kerning record
  const combinedKerning: Record<string, number> = { ...newKerning };
  generatedPairs.forEach(pair => {
    combinedKerning[`${pair.left}${pair.right}`] = pair.value;
  });
  
  return {
    kerning: combinedKerning,
    pairs: generatedPairs,
    pairCount: Object.keys(combinedKerning).length,
    quality: generatedPairs.length > 0 ? analyzeKerningQuality(glyphs, generatedPairs) : undefined,
    message,
  };
}

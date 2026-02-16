import { Language } from '../i18n';
import { getColorAnalysis } from '../data/colorAnalysis';

/**
 * Retorna análise multilíngue a partir do dataset local, sem chamadas externas.
 */
export const analyzeColor = async (
  hex: string,
  refName: string,
  language: Language = 'en'
): Promise<{ description: string; usageTips: string[]; psychology: string }> => {
  // Pequeno delay opcional para consistência de UX
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));

  const fullAnalysis = getColorAnalysis(hex, refName);

  return {
    description: fullAnalysis.description[language] ?? fullAnalysis.description.en,
    usageTips: fullAnalysis.usageTips[language] ?? fullAnalysis.usageTips.en,
    psychology: fullAnalysis.psychology[language] ?? fullAnalysis.psychology.en
  };
};

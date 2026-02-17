
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "./types";

let _ai: GoogleGenAI | null = null;
const getAI = () => {
  if (!_ai) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error("VITE_GEMINI_API_KEY is not configured. Add it to your secrets.");
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
};

export const analyzePrintImage = async (base64Image: string, fileName: string): Promise<AnalysisResult> => {
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    Analyze this graphic design file for printing. 
    1. Identify the likely target format.
    2. Check for common print issues like text too close to edges or low resolution (if possible to infer).
    3. Recommend 3 suitable paper types (papeis) for this specific design (e.g., Couché, Offset, Kraft) with weights and finishes.
    Return the response in valid JSON format only.
  `;

  const response = await getAI().models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/png" } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedFormat: { type: Type.STRING },
          technicalIssues: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                weight: { type: Type.STRING },
                finish: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["type", "weight", "finish", "description"]
            }
          }
        },
        required: ["detectedFormat", "technicalIssues", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

import { rgbToHex } from './colorMath';

// Quantization settings
const SAMPLE_SIZE = 100; // Analysis resolution (100x100 pixels)
const COLOR_THRESHOLD = 20; // Distance to consider colors similar (0-255)

interface RgbObj { r: number; g: number; b: number; count: number }

const areColorsSimilar = (a: RgbObj, b: RgbObj) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  return distance < COLOR_THRESHOLD;
};

export const extractColorsFromImage = (imageSrc: string, maxColors: number = 6): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas unavailable");

      // Resize for performance
      canvas.width = SAMPLE_SIZE;
      canvas.height = SAMPLE_SIZE;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
      const colorMap: RgbObj[] = [];

      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];

        // Skip transparent or very dark/white pixels (optional, but helps clean up)
        if (a < 128) continue;

        const newColor = { r, g, b, count: 1 };
        
        // Simple clustering
        let found = false;
        for (let j = 0; j < colorMap.length; j++) {
          if (areColorsSimilar(colorMap[j], newColor)) {
            // Average the color
            colorMap[j].r = (colorMap[j].r * colorMap[j].count + r) / (colorMap[j].count + 1);
            colorMap[j].g = (colorMap[j].g * colorMap[j].count + g) / (colorMap[j].count + 1);
            colorMap[j].b = (colorMap[j].b * colorMap[j].count + b) / (colorMap[j].count + 1);
            colorMap[j].count++;
            found = true;
            break;
          }
        }

        if (!found) {
          colorMap.push(newColor);
        }
      }

      // Sort by frequency
      colorMap.sort((a, b) => b.count - a.count);

      // Return top N hex codes
      const hexColors = colorMap
        .slice(0, maxColors)
        .map(c => rgbToHex(Math.round(c.r), Math.round(c.g), Math.round(c.b)));

      resolve(hexColors);
    };

    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
};

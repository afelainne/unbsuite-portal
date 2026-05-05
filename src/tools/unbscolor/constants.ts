import { loadColorLibrary } from './data/encoded/loadColors';
import { ReferenceColor } from './types';

const colorsData = loadColorLibrary() as { colors: any[] };

// Basic named colors used for friendly labels when matching custom HEX.
export const NAMED_COLORS: { name: string; hex: string }[] = [
  // --- GRAYS & NEUTRALS ---
  { name: "Black", hex: "#000000" },
  { name: "Night Rider", hex: "#0F0F0F" },
  { name: "Woodsmoke", hex: "#171717" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Jet Gray", hex: "#2A2A2A" },
  { name: "Dim Gray", hex: "#696969" },
  { name: "Battleship Gray", hex: "#848482" },
  { name: "Gray", hex: "#808080" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Light Gray", hex: "#D3D3D3" },
  { name: "Gainsboro", hex: "#DCDCDC" },
  { name: "White Smoke", hex: "#F5F5F5" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Ivory", hex: "#FFFFF0" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Taupe", hex: "#483C32" },
  { name: "Slate", hex: "#708090" },
  
  // --- REDS ---
  { name: "Maroon", hex: "#800000" },
  { name: "Dark Red", hex: "#8B0000" },
  { name: "Barn Red", hex: "#7C0A02" },
  { name: "Firebrick", hex: "#B22222" },
  { name: "Crimson", hex: "#DC143C" },
  { name: "Red", hex: "#FF0000" },
  { name: "Scarlet", hex: "#FF2400" },
  { name: "Imperial Red", hex: "#ED2939" },
  { name: "Indian Red", hex: "#CD5C5C" },
  { name: "Tomato", hex: "#FF6347" },
  { name: "Coral", hex: "#FF7F50" },
  { name: "Light Coral", hex: "#F08080" },
  { name: "Salmon", hex: "#FA8072" },
  { name: "Chili Pepper", hex: "#9B111E" },
  { name: "Ruby", hex: "#E0115F" },
  
  // --- ORANGES ---
  { name: "Dark Orange", hex: "#FF8C00" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Goldenrod", hex: "#DAA520" },
  { name: "Saffron", hex: "#F4C430" },
  { name: "Amber", hex: "#FFBF00" },
  { name: "Tangerine", hex: "#F28500" },
  { name: "Burnt Orange", hex: "#CC5500" },
  { name: "Pumpkin", hex: "#FF7518" },
  { name: "Peach", hex: "#FFE5B4" },
  { name: "Apricot", hex: "#FBCEB1" },
  { name: "Rust", hex: "#B7410E" },
  
  // --- YELLOWS ---
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Canary Yellow", hex: "#FFEF00" },
  { name: "Lemon", hex: "#FFF700" },
  { name: "Citrine", hex: "#E4D00A" },
  { name: "Corn", hex: "#FBEC5D" },
  { name: "Khaki", hex: "#F0E68C" },
  { name: "Moccasin", hex: "#FFE4B5" },
  { name: "Mustard", hex: "#FFDB58" },
  
  // --- GREENS ---
  { name: "Dark Green", hex: "#006400" },
  { name: "Forest Green", hex: "#228B22" },
  { name: "Green", hex: "#008000" },
  { name: "Emerald", hex: "#50C878" },
  { name: "Lime Green", hex: "#32CD32" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Chartreuse", hex: "#7FFF00" },
  { name: "Spring Green", hex: "#00FF7F" },
  { name: "Mint", hex: "#3EB489" },
  { name: "Sea Green", hex: "#2E8B57" },
  { name: "Olive", hex: "#808000" },
  { name: "Olive Drab", hex: "#6B8E23" },
  { name: "Sage", hex: "#BCB88A" },
  { name: "Jade", hex: "#00A86B" },
  { name: "Kelly Green", hex: "#4CBB17" },
  { name: "Hunter Green", hex: "#355E3B" },
  
  // --- CYANS & TEALS ---
  { name: "Teal", hex: "#008080" },
  { name: "Dark Cyan", hex: "#008B8B" },
  { name: "Light Sea Green", hex: "#20B2AA" },
  { name: "Turquoise", hex: "#40E0D0" },
  { name: "Aqua", hex: "#00FFFF" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Pale Turquoise", hex: "#AFEEEE" },
  { name: "Aquamarine", hex: "#7FFFD4" },
  { name: "Tiffany Blue", hex: "#0ABAB5" },
  
  // --- BLUES ---
  { name: "Midnight Blue", hex: "#191970" },
  { name: "Navy", hex: "#000080" },
  { name: "Dark Blue", hex: "#00008B" },
  { name: "Medium Blue", hex: "#0000CD" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Royal Blue", hex: "#4169E1" },
  { name: "Tory Blue", hex: "#0F4C81" },
  { name: "Sapphire", hex: "#0F52BA" },
  { name: "Cobalt", hex: "#0047AB" },
  { name: "Steel Blue", hex: "#4682B4" },
  { name: "Dodger Blue", hex: "#1E90FF" },
  { name: "Deep Sky Blue", hex: "#00BFFF" },
  { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Light Blue", hex: "#ADD8E6" },
  { name: "Powder Blue", hex: "#B0E0E6" },
  { name: "Alice Blue", hex: "#F0F8FF" },
  { name: "Azure", hex: "#F0FFFF" },
  { name: "Cornflower Blue", hex: "#6495ED" },
  { name: "Denim", hex: "#1560BD" },
  
  // --- PURPLES & VIOLETS ---
  { name: "Indigo", hex: "#4B0082" },
  { name: "Dark Violet", hex: "#9400D3" },
  { name: "Dark Orchid", hex: "#9932CC" },
  { name: "Purple", hex: "#800080" },
  { name: "Magenta", hex: "#FF00FF" },
  { name: "Fuchsia", hex: "#FF00FF" },
  { name: "Violet", hex: "#EE82EE" },
  { name: "Plum", hex: "#DDA0DD" },
  { name: "Thistle", hex: "#D8BFD8" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Amethyst", hex: "#9966CC" },
  { name: "Wisteria", hex: "#C9A0DC" },
  { name: "Lilac", hex: "#C8A2C8" },
  { name: "Mauve", hex: "#E0B0FF" },
  
  // --- PINKS ---
  { name: "Deep Pink", hex: "#FF1493" },
  { name: "Hot Pink", hex: "#FF69B4" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Light Pink", hex: "#FFB6C1" },
  { name: "Rose", hex: "#FF007F" },
  { name: "Flamingo", hex: "#FC8EAC" },
  { name: "Blush", hex: "#DE5D83" },
  { name: "Cerise", hex: "#DE3163" },
  
  // --- BROWNS ---
  { name: "Brown", hex: "#A52A2A" },
  { name: "Saddle Brown", hex: "#8B4513" },
  { name: "Sienna", hex: "#A0522D" },
  { name: "Chocolate", hex: "#D2691E" },
  { name: "Peru", hex: "#CD853F" },
  { name: "Sandy Brown", hex: "#F4A460" },
  { name: "Burlywood", hex: "#DEB887" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Wheat", hex: "#F5DEB3" },
  { name: "Mocca", hex: "#6F4E37" },
  { name: "Coffee", hex: "#6F4E37" },
  { name: "Sepia", hex: "#704214" }
];

export type ColorLibraryFinish = {
  systemId: string;
  systemName: string;
  finishId: string;
  finishName: string;
  colors: ReferenceColor[];
};

export type ColorLibrarySystem = {
  systemId: string;
  systemName: string;
  finishes: ColorLibraryFinish[];
};

export type LibraryOption = {
  id: string;
  label: string;
  systemId: string;
  finishId: string;
  colors: ReferenceColor[];
};

const hexToRgbQuick = (hex: string) => {
  const clean = hex.replace('#', '');
  const intVal = parseInt(clean, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255
  };
};

const extractCode = (raw: string) => {
  const match = raw.match(/prefix=([^$]+)\$\$\//);
  if (match && match[1]) return match[1].trim();
  const cleaned = raw
    .replace(/\$\$\$\/colorbook\/[A-Z]+\/prefix=/g, '')
    .replace(/\$\$\$\/colorbook\/[A-Z]+\/postfix=/g, '')
    .replace(/\$\$\$/g, '')
    .trim();
  return cleaned || raw.trim();
};

const SYSTEM_ALIAS: Record<string, string> = {
  cb_v4: 'sys_a',
  sol_v4: 'sys_b'
};

const FINISH_ALIAS: Record<string, string> = {
  coated: 'fin_c',
  uncoated: 'fin_u'
};

const ALLOWED_FINISHES = new Set([
  'sys_a_fin_c',
  'sys_a_fin_u',
  'sys_b_fin_c',
  'sys_b_fin_u'
]);

// Map source keys from encoded data to internal aliases
const SOURCE_REMAP: Record<string, { systemId: string; systemName: string; finishId: string; finishName: string }> = {};

// Build remap dynamically from known source patterns
const SRC_PATTERNS: Array<{ pattern: RegExp; systemId: string; finishId: string }> = [
  { pattern: /Bridge.*Coated.*V4/i, systemId: 'cb_v4', finishId: 'coated' },
  { pattern: /Bridge.*Uncoated.*V4/i, systemId: 'cb_v4', finishId: 'uncoated' },
  { pattern: /Solid.*Coated.*V4/i, systemId: 'sol_v4', finishId: 'coated' },
  { pattern: /Solid.*Uncoated.*V4/i, systemId: 'sol_v4', finishId: 'uncoated' },
];

const resolveSource = (source: string): { systemId: string; systemName: string; finishId: string; finishName: string } | null => {
  for (const p of SRC_PATTERNS) {
    if (p.pattern.test(source)) {
      return {
        systemId: p.systemId,
        systemName: p.systemId === 'cb_v4' ? 'System A' : 'System B',
        finishId: p.finishId,
        finishName: p.finishId === 'coated' ? 'Coated' : 'Uncoated'
      };
    }
  }
  return null;
};

const buildSystems = (): ColorLibrarySystem[] => {
  const grouped: Record<string, ColorLibraryFinish> = {};

  colorsData.colors.forEach((color) => {
    const meta = resolveSource(color.source || '');
    if (!meta) return;
    const systemId = SYSTEM_ALIAS[meta.systemId] || meta.systemId;
    const finishId = FINISH_ALIAS[meta.finishId] || meta.finishId;
    const key = `${systemId}_${finishId}`;
    if (!ALLOWED_FINISHES.has(key)) return;

    if (!grouped[key]) {
      grouped[key] = {
        systemId,
        systemName: 'System ' + (systemId === 'sys_a' ? 'A' : systemId === 'sys_b' ? 'B' : systemId),
        finishId,
        finishName: finishId === 'fin_c' ? 'Finish C' : finishId === 'fin_u' ? 'Finish U' : meta.finishName,
        colors: []
      };
    }

    const hex = color.hex.toUpperCase();
    const code = extractCode(color.name);

    grouped[key].colors.push({
      code,
      name: code,
      hex,
      rgb: hexToRgbQuick(hex),
      model: color.model,
      cmyk: color.cmyk || undefined,
      source: color.source,
      systemId,
      systemName: 'System ' + (systemId === 'sys_a' ? 'A' : systemId === 'sys_b' ? 'B' : systemId),
      finishId,
      finish: finishId === 'fin_c' ? 'Finish C' : finishId === 'fin_u' ? 'Finish U' : meta.finishName
    } as ReferenceColor);
  });

  const systemsMap: Record<string, ColorLibrarySystem> = {};
  Object.values(grouped).forEach((finish) => {
    if (!systemsMap[finish.systemId]) {
      systemsMap[finish.systemId] = {
        systemId: finish.systemId,
        systemName: finish.systemName,
        finishes: []
      };
    }
    systemsMap[finish.systemId].finishes.push(finish);
  });

  return Object.values(systemsMap).filter((system) => system.finishes.length > 0);
};

export const COLOR_SYSTEMS: ColorLibrarySystem[] = buildSystems();

const LABEL_MAP: Record<string, string> = {
  sys_a_fin_c: 'SYSTEM A (CP)',
  sys_a_fin_u: 'SYSTEM A (UP)',
  sys_b_fin_c: 'SYSTEM B (C)',
  sys_b_fin_u: 'SYSTEM B (U)'
};

export const LIBRARY_OPTIONS: LibraryOption[] = COLOR_SYSTEMS.flatMap((system) =>
  system.finishes.map((finish) => {
    const key = `${system.systemId}_${finish.finishId}`;
    return {
      id: key,
      label: LABEL_MAP[key] || `${system.systemName} ${finish.finishName}`,
      systemId: system.systemId,
      finishId: finish.finishId,
      colors: finish.colors
    };
  })
);

export const DEFAULT_LIBRARY: ReferenceColor[] = LIBRARY_OPTIONS[0]?.colors || [];

export const getLibraryById = (id: string): ReferenceColor[] => {
  const lib = LIBRARY_OPTIONS.find((option) => option.id === id);
  return lib ? lib.colors : DEFAULT_LIBRARY;
};

export const getLibraryLabel = (id: string): string => {
  const lib = LIBRARY_OPTIONS.find((option) => option.id === id);
  return lib ? lib.label : LIBRARY_OPTIONS[0]?.label || '';
};

/**
 * Everyday colour names, used for friendly labels next to a hex value.
 *
 * A short list written for this tool: mostly the CSS / X11 named colours
 * (W3C CSS Color Module, free to use) plus common descriptive names. It is
 * not taken from any colour-reference book.
 */
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

/**
 * Finish suffixes in the order the finish filter shows them. Only the
 * finishes an imported library actually carries are ever shown; unknown ones
 * follow in alphabetical order.
 */
export const FINISH_ORDER = ['C', 'U', 'CP', 'UP'];

export const sortFinishes = (finishes: Iterable<string>): string[] =>
  Array.from(new Set(finishes))
    .filter((finish) => finish.length > 0)
    .sort((a, b) => {
      const ia = FINISH_ORDER.indexOf(a);
      const ib = FINISH_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });

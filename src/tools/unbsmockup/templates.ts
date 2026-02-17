export interface MockupTemplate {
  id: string;
  name: string;
  category: string;
  viewBox: string;
  width: number;
  height: number;
  // The area where the user's image will be clipped into
  screen: { x: number; y: number; width: number; height: number; rx?: number };
  // SVG path/elements for the device frame (rendered AFTER the image)
  frameSvg: string;
  // Optional background SVG rendered BEFORE the image
  bgSvg?: string;
}

export const TEMPLATES: MockupTemplate[] = [
  {
    id: 'iphone-portrait',
    name: 'iPhone 15',
    category: 'Mobile',
    viewBox: '0 0 380 780',
    width: 380,
    height: 780,
    screen: { x: 18, y: 18, width: 344, height: 744, rx: 40 },
    frameSvg: `
      <rect x="4" y="4" width="372" height="772" rx="52" fill="none" stroke="#1a1a1a" stroke-width="8"/>
      <rect x="0" y="0" width="380" height="780" rx="56" fill="none" stroke="#2a2a2a" stroke-width="2"/>
      <!-- Notch -->
      <rect x="120" y="10" width="140" height="28" rx="14" fill="#1a1a1a"/>
      <circle cx="190" cy="24" r="6" fill="#2a2a2a"/>
    `,
  },
  {
    id: 'iphone-landscape',
    name: 'iPhone 15 Landscape',
    category: 'Mobile',
    viewBox: '0 0 780 380',
    width: 780,
    height: 380,
    screen: { x: 18, y: 18, width: 744, height: 344, rx: 40 },
    frameSvg: `
      <rect x="4" y="4" width="772" height="372" rx="52" fill="none" stroke="#1a1a1a" stroke-width="8"/>
      <rect x="0" y="0" width="780" height="380" rx="56" fill="none" stroke="#2a2a2a" stroke-width="2"/>
      <!-- Notch -->
      <rect x="10" y="120" width="28" height="140" rx="14" fill="#1a1a1a"/>
    `,
  },
  {
    id: 'macbook',
    name: 'MacBook Pro',
    category: 'Laptop',
    viewBox: '0 0 900 580',
    width: 900,
    height: 580,
    screen: { x: 82, y: 22, width: 736, height: 460, rx: 4 },
    frameSvg: `
      <!-- Screen bezel -->
      <rect x="62" y="8" width="776" height="490" rx="14" fill="none" stroke="#333" stroke-width="4"/>
      <rect x="58" y="4" width="784" height="498" rx="18" fill="none" stroke="#555" stroke-width="2"/>
      <!-- Camera -->
      <circle cx="450" cy="16" r="3" fill="#444"/>
      <!-- Base/hinge -->
      <path d="M 30 506 L 62 502 L 838 502 L 870 506 L 870 520 Q 870 530 860 530 L 40 530 Q 30 530 30 520 Z" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
      <line x1="380" y1="516" x2="520" y2="516" stroke="#555" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  {
    id: 'ipad',
    name: 'iPad',
    category: 'Tablet',
    viewBox: '0 0 560 780',
    width: 560,
    height: 780,
    screen: { x: 24, y: 32, width: 512, height: 716, rx: 4 },
    frameSvg: `
      <rect x="4" y="4" width="552" height="772" rx="28" fill="none" stroke="#333" stroke-width="8"/>
      <rect x="0" y="0" width="560" height="780" rx="32" fill="none" stroke="#555" stroke-width="2"/>
      <!-- Camera -->
      <circle cx="280" cy="18" r="4" fill="#444"/>
    `,
  },
  {
    id: 'browser',
    name: 'Browser Window',
    category: 'Web',
    viewBox: '0 0 900 600',
    width: 900,
    height: 600,
    screen: { x: 2, y: 44, width: 896, height: 554, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="900" height="600" rx="10" fill="#1e1e1e"/>`,
    frameSvg: `
      <rect x="0" y="0" width="900" height="600" rx="10" fill="none" stroke="#444" stroke-width="2"/>
      <!-- Title bar -->
      <rect x="1" y="1" width="898" height="42" rx="10" fill="#2a2a2a"/>
      <line x1="0" y1="44" x2="900" y2="44" stroke="#444" stroke-width="1"/>
      <!-- Traffic lights -->
      <circle cx="22" cy="22" r="6" fill="#ff5f57"/>
      <circle cx="42" cy="22" r="6" fill="#febc2e"/>
      <circle cx="62" cy="22" r="6" fill="#28c840"/>
      <!-- URL bar -->
      <rect x="140" y="10" width="620" height="24" rx="6" fill="#3a3a3a"/>
      <text x="450" y="27" text-anchor="middle" font-family="monospace" font-size="10" fill="#888">unbserved.com</text>
    `,
  },
  {
    id: 'business-card',
    name: 'Business Card',
    category: 'Print',
    viewBox: '0 0 640 380',
    width: 640,
    height: 380,
    screen: { x: 20, y: 20, width: 600, height: 340, rx: 8 },
    frameSvg: `
      <rect x="0" y="0" width="640" height="380" rx="12" fill="none" stroke="#ccc" stroke-width="2"/>
      <!-- Shadow effect -->
      <rect x="6" y="6" width="640" height="380" rx="12" fill="none" stroke="#eee" stroke-width="1" opacity="0.3"/>
    `,
  },
  {
    id: 'poster-frame',
    name: 'Poster Frame',
    category: 'Print',
    viewBox: '0 0 500 700',
    width: 500,
    height: 700,
    screen: { x: 40, y: 40, width: 420, height: 620, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="500" height="700" fill="#f5f0eb"/>`,
    frameSvg: `
      <!-- Mat -->
      <rect x="20" y="20" width="460" height="660" fill="none" stroke="#ddd" stroke-width="2"/>
      <!-- Inner frame -->
      <rect x="38" y="38" width="424" height="624" fill="none" stroke="#222" stroke-width="3"/>
      <!-- Outer frame -->
      <rect x="0" y="0" width="500" height="700" fill="none" stroke="#333" stroke-width="6"/>
    `,
  },
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    category: 'Social',
    viewBox: '0 0 500 580',
    width: 500,
    height: 580,
    screen: { x: 0, y: 56, width: 500, height: 500, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="500" height="580" fill="#fafafa"/>`,
    frameSvg: `
      <rect x="0" y="0" width="500" height="580" rx="0" fill="none" stroke="#dbdbdb" stroke-width="1"/>
      <!-- Header bar -->
      <rect x="0" y="0" width="500" height="56" fill="#fff" stroke="#dbdbdb" stroke-width="1"/>
      <circle cx="28" cy="28" r="16" fill="#e0e0e0" stroke="#ccc" stroke-width="1.5"/>
      <text x="54" y="24" font-family="sans-serif" font-size="13" font-weight="bold" fill="#262626">username</text>
      <text x="54" y="40" font-family="sans-serif" font-size="10" fill="#8e8e8e">Location</text>
      <!-- Dots menu -->
      <circle cx="470" cy="22" r="2" fill="#262626"/>
      <circle cx="470" cy="28" r="2" fill="#262626"/>
      <circle cx="470" cy="34" r="2" fill="#262626"/>
      <!-- Bottom interaction bar -->
      <line x1="0" y1="556" x2="500" y2="556" stroke="#dbdbdb" stroke-width="1"/>
    `,
  },
];

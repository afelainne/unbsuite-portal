// ─── SVG Icon Paths (16x16 viewBox) ───
// These are used inline in social templates via <g transform="translate(x,y) scale(s)">

export const SVG_ICONS = {
  heart: `<path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 0 1 6 3.5c.97 0 1.8.5 2 1.3.2-.8 1.03-1.3 2-1.3A3.5 3.5 0 0 1 13.5 7C13.5 10.5 8 14 8 14z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  comment: `<path d="M1.5 2.5h13v9h-5.5L5.5 14v-2.5H1.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  share: `<path d="M14.5 1.5L7 9M14.5 1.5L10 14.5 7 9 1.5 6z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  bookmark: `<path d="M3.5 1.5h9v13L8 11l-4.5 3.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`,
  like: `<path d="M2 8.5h2.5V14H2zM4.5 8.5l2-6c.3-.9 1.1-1 1.5-1 .8 0 1.5.7 1.5 1.5V6h4c.8 0 1.5.7 1.4 1.5l-1 6c-.1.6-.6 1-1.2 1H4.5z" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>`,
  globe: `<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.1"/><ellipse cx="8" cy="8" rx="3" ry="6.5" fill="none" stroke="currentColor" stroke-width="1.1"/><line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.1"/>`,
  reply: `<path d="M6 4L2 8l4 4M2 8h8c2.2 0 4 1.8 4 4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  retweet: `<path d="M2 10l2 3 2-3M14 6l-2-3-2 3M4 13V5h4M12 3v8H8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  moreH: `<circle cx="3" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="13" cy="8" r="1.5" fill="currentColor"/>`,
};

// Helper to place an icon in SVG at given position/size
function icon(name: keyof typeof SVG_ICONS, x: number, y: number, size: number = 16, color: string = 'currentColor'): string {
  const s = size / 16;
  return `<g transform="translate(${x},${y}) scale(${s})" color="${color}">${SVG_ICONS[name]}</g>`;
}

export interface EditableField {
  id: string;
  label: string;
  type: 'text' | 'avatar';
  defaultValue: string;
  // text positioning
  x?: number;
  y?: number;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
  fontFamily?: string;
  textAnchor?: string;
  // avatar positioning
  cx?: number;
  cy?: number;
  r?: number;
}

export interface MockupTemplate {
  id: string;
  name: string;
  category: string;
  viewBox: string;
  width: number;
  height: number;
  screen: { x: number; y: number; width: number; height: number; rx?: number };
  frameSvg: string;
  bgSvg?: string;
  editableFields?: EditableField[];
}

export const TEMPLATES: MockupTemplate[] = [
  // ─── Mobile ───
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
      <rect x="10" y="120" width="28" height="140" rx="14" fill="#1a1a1a"/>
    `,
  },
  {
    id: 'android-phone',
    name: 'Android Phone',
    category: 'Mobile',
    viewBox: '0 0 390 844',
    width: 390,
    height: 844,
    screen: { x: 12, y: 12, width: 366, height: 820, rx: 28 },
    frameSvg: `
      <rect x="3" y="3" width="384" height="838" rx="36" fill="none" stroke="#1a1a1a" stroke-width="6"/>
      <rect x="0" y="0" width="390" height="844" rx="40" fill="none" stroke="#333" stroke-width="2"/>
      <circle cx="195" cy="22" r="5" fill="#2a2a2a"/>
    `,
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    category: 'Mobile',
    viewBox: '0 0 340 640',
    width: 340,
    height: 640,
    screen: { x: 20, y: 80, width: 300, height: 480, rx: 2 },
    frameSvg: `
      <rect x="4" y="4" width="332" height="632" rx="40" fill="none" stroke="#1a1a1a" stroke-width="8"/>
      <rect x="0" y="0" width="340" height="640" rx="44" fill="none" stroke="#333" stroke-width="2"/>
      <circle cx="170" cy="600" r="22" fill="none" stroke="#333" stroke-width="3"/>
      <rect x="100" y="20" width="140" height="18" rx="9" fill="#1a1a1a"/>
      <circle cx="170" cy="29" r="5" fill="#2a2a2a"/>
    `,
  },

  // ─── Laptop ───
  {
    id: 'macbook',
    name: 'MacBook Pro',
    category: 'Laptop',
    viewBox: '0 0 900 580',
    width: 900,
    height: 580,
    screen: { x: 82, y: 22, width: 736, height: 460, rx: 4 },
    frameSvg: `
      <rect x="62" y="8" width="776" height="490" rx="14" fill="none" stroke="#333" stroke-width="4"/>
      <rect x="58" y="4" width="784" height="498" rx="18" fill="none" stroke="#555" stroke-width="2"/>
      <circle cx="450" cy="16" r="3" fill="#444"/>
      <path d="M 30 506 L 62 502 L 838 502 L 870 506 L 870 520 Q 870 530 860 530 L 40 530 Q 30 530 30 520 Z" fill="#2a2a2a" stroke="#444" stroke-width="1"/>
      <line x1="380" y1="516" x2="520" y2="516" stroke="#555" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  {
    id: 'windows-laptop',
    name: 'Windows Laptop',
    category: 'Laptop',
    viewBox: '0 0 900 580',
    width: 900,
    height: 580,
    screen: { x: 72, y: 18, width: 756, height: 470, rx: 2 },
    frameSvg: `
      <rect x="52" y="4" width="796" height="500" rx="8" fill="none" stroke="#444" stroke-width="6"/>
      <rect x="48" y="0" width="804" height="508" rx="12" fill="none" stroke="#555" stroke-width="2"/>
      <circle cx="450" cy="12" r="3" fill="#555"/>
      <path d="M 20 512 L 52 508 L 848 508 L 880 512 L 880 528 Q 880 536 872 536 L 28 536 Q 20 536 20 528 Z" fill="#333" stroke="#444" stroke-width="1"/>
    `,
  },

  // ─── Tablet ───
  {
    id: 'ipad',
    name: 'iPad Portrait',
    category: 'Tablet',
    viewBox: '0 0 560 780',
    width: 560,
    height: 780,
    screen: { x: 24, y: 32, width: 512, height: 716, rx: 4 },
    frameSvg: `
      <rect x="4" y="4" width="552" height="772" rx="28" fill="none" stroke="#333" stroke-width="8"/>
      <rect x="0" y="0" width="560" height="780" rx="32" fill="none" stroke="#555" stroke-width="2"/>
      <circle cx="280" cy="18" r="4" fill="#444"/>
    `,
  },
  {
    id: 'ipad-landscape',
    name: 'iPad Landscape',
    category: 'Tablet',
    viewBox: '0 0 780 560',
    width: 780,
    height: 560,
    screen: { x: 32, y: 24, width: 716, height: 512, rx: 4 },
    frameSvg: `
      <rect x="4" y="4" width="772" height="552" rx="28" fill="none" stroke="#333" stroke-width="8"/>
      <rect x="0" y="0" width="780" height="560" rx="32" fill="none" stroke="#555" stroke-width="2"/>
      <circle cx="18" cy="280" r="4" fill="#444"/>
    `,
  },

  // ─── Web ───
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
      <rect x="1" y="1" width="898" height="42" rx="10" fill="#2a2a2a"/>
      <line x1="0" y1="44" x2="900" y2="44" stroke="#444" stroke-width="1"/>
      <circle cx="22" cy="22" r="6" fill="#ff5f57"/>
      <circle cx="42" cy="22" r="6" fill="#febc2e"/>
      <circle cx="62" cy="22" r="6" fill="#28c840"/>
      <rect x="140" y="10" width="620" height="24" rx="6" fill="#3a3a3a"/>
      <text x="450" y="27" text-anchor="middle" font-family="monospace" font-size="10" fill="#888">unbserved.com</text>
    `,
  },
  {
    id: 'dark-browser',
    name: 'Dark Browser',
    category: 'Web',
    viewBox: '0 0 900 600',
    width: 900,
    height: 600,
    screen: { x: 2, y: 44, width: 896, height: 554, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="900" height="600" rx="10" fill="#0d0d0d"/>`,
    frameSvg: `
      <rect x="0" y="0" width="900" height="600" rx="10" fill="none" stroke="#222" stroke-width="2"/>
      <rect x="1" y="1" width="898" height="42" rx="10" fill="#111"/>
      <line x1="0" y1="44" x2="900" y2="44" stroke="#222" stroke-width="1"/>
      <circle cx="22" cy="22" r="6" fill="#ff5f57"/>
      <circle cx="42" cy="22" r="6" fill="#febc2e"/>
      <circle cx="62" cy="22" r="6" fill="#28c840"/>
      <rect x="140" y="10" width="620" height="24" rx="6" fill="#1a1a1a"/>
      <text x="450" y="27" text-anchor="middle" font-family="monospace" font-size="10" fill="#555">unbserved.com</text>
    `,
  },
  {
    id: 'mobile-browser',
    name: 'Mobile Browser',
    category: 'Web',
    viewBox: '0 0 380 700',
    width: 380,
    height: 700,
    screen: { x: 2, y: 54, width: 376, height: 604, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="380" height="700" rx="20" fill="#1e1e1e"/>`,
    frameSvg: `
      <rect x="0" y="0" width="380" height="700" rx="20" fill="none" stroke="#333" stroke-width="2"/>
      <rect x="1" y="1" width="378" height="52" rx="20" fill="#2a2a2a"/>
      <rect x="50" y="16" width="280" height="24" rx="12" fill="#3a3a3a"/>
      <text x="190" y="33" text-anchor="middle" font-family="monospace" font-size="9" fill="#888">unbserved.com</text>
      <rect x="1" y="660" width="378" height="39" rx="0" fill="#2a2a2a"/>
      <line x1="0" y1="660" x2="380" y2="660" stroke="#444" stroke-width="1"/>
      <rect x="140" y="680" width="100" height="4" rx="2" fill="#555"/>
    `,
  },

  // ─── Social ───
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
      <rect x="0" y="0" width="500" height="56" fill="#fff" stroke="#dbdbdb" stroke-width="1"/>
      <!-- avatar placeholder rendered by editableFields -->
      <!-- three dots menu -->
      <circle cx="470" cy="22" r="2" fill="#262626"/>
      <circle cx="470" cy="28" r="2" fill="#262626"/>
      <circle cx="470" cy="34" r="2" fill="#262626"/>
      <!-- action bar -->
      <line x1="0" y1="556" x2="500" y2="556" stroke="#dbdbdb" stroke-width="1"/>
      ${icon('heart', 12, 560, 18, '#262626')}
      ${icon('comment', 40, 560, 18, '#262626')}
      ${icon('share', 68, 560, 18, '#262626')}
      ${icon('bookmark', 468, 560, 18, '#262626')}
    `,
    editableFields: [
      { id: 'avatar', label: 'Avatar', type: 'avatar', defaultValue: '', cx: 28, cy: 28, r: 16 },
      { id: 'username', label: 'Username', type: 'text', defaultValue: 'username', x: 54, y: 24, fontSize: 13, fontWeight: 'bold', fill: '#262626', fontFamily: 'sans-serif' },
      { id: 'location', label: 'Location', type: 'text', defaultValue: 'Location', x: 54, y: 40, fontSize: 10, fill: '#8e8e8e', fontFamily: 'sans-serif' },
    ],
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    category: 'Social',
    viewBox: '0 0 360 640',
    width: 360,
    height: 640,
    screen: { x: 0, y: 60, width: 360, height: 580, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="360" height="640" rx="16" fill="#111"/>`,
    frameSvg: `
      <rect x="0" y="0" width="360" height="640" rx="16" fill="none" stroke="#333" stroke-width="2"/>
      <rect x="1" y="1" width="358" height="58" rx="16" fill="rgba(0,0,0,0.5)"/>
      <!-- avatar rendered by editableFields -->
      <rect x="10" y="8" width="80" height="3" rx="1.5" fill="rgba(255,255,255,0.5)"/>
      <rect x="96" y="8" width="80" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
    `,
    editableFields: [
      { id: 'avatar', label: 'Avatar', type: 'avatar', defaultValue: '', cx: 28, cy: 30, r: 16 },
      { id: 'username', label: 'Username', type: 'text', defaultValue: 'username', x: 54, y: 34, fontSize: 13, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'sans-serif' },
    ],
  },
  {
    id: 'twitter-post',
    name: 'Twitter / X Post',
    category: 'Social',
    viewBox: '0 0 500 280',
    width: 500,
    height: 280,
    screen: { x: 60, y: 70, width: 420, height: 200, rx: 12 },
    bgSvg: `<rect x="0" y="0" width="500" height="280" fill="#15202b"/>`,
    frameSvg: `
      <!-- avatar rendered by editableFields -->
      <!-- action bar below image area -->
      ${icon('reply', 70, 274, 14, '#71767b')}
      ${icon('retweet', 170, 274, 14, '#71767b')}
      ${icon('heart', 270, 274, 14, '#71767b')}
      ${icon('share', 370, 274, 14, '#71767b')}
    `,
    editableFields: [
      { id: 'avatar', label: 'Avatar', type: 'avatar', defaultValue: '', cx: 30, cy: 38, r: 20 },
      { id: 'displayName', label: 'Display Name', type: 'text', defaultValue: 'User Name', x: 60, y: 34, fontSize: 14, fontWeight: 'bold', fill: '#e7e9ea', fontFamily: 'sans-serif' },
      { id: 'handle', label: 'Handle', type: 'text', defaultValue: '@username', x: 60, y: 50, fontSize: 12, fill: '#71767b', fontFamily: 'sans-serif' },
      { id: 'caption', label: 'Caption', type: 'text', defaultValue: 'Check this out', x: 60, y: 66, fontSize: 10, fill: '#71767b', fontFamily: 'sans-serif' },
    ],
  },
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    category: 'Social',
    viewBox: '0 0 500 360',
    width: 500,
    height: 360,
    screen: { x: 0, y: 60, width: 500, height: 260, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="500" height="360" fill="#242526"/>`,
    frameSvg: `
      <rect x="0" y="0" width="500" height="60" fill="#242526"/>
      <!-- avatar rendered by editableFields -->
      <!-- action bar -->
      <rect x="0" y="320" width="500" height="40" fill="#242526"/>
      <line x1="0" y1="320" x2="500" y2="320" stroke="#3e4042" stroke-width="1"/>
      ${icon('like', 60, 334, 14, '#b0b3b8')}
      <text x="80" y="344" font-family="sans-serif" font-size="12" fill="#b0b3b8">Like</text>
      ${icon('comment', 220, 334, 14, '#b0b3b8')}
      <text x="240" y="344" font-family="sans-serif" font-size="12" fill="#b0b3b8">Comment</text>
      ${icon('share', 385, 334, 14, '#b0b3b8')}
      <text x="405" y="344" font-family="sans-serif" font-size="12" fill="#b0b3b8">Share</text>
    `,
    editableFields: [
      { id: 'avatar', label: 'Avatar', type: 'avatar', defaultValue: '', cx: 30, cy: 30, r: 18 },
      { id: 'username', label: 'Username', type: 'text', defaultValue: 'User Name', x: 58, y: 26, fontSize: 14, fontWeight: 'bold', fill: '#e4e6eb', fontFamily: 'sans-serif' },
      { id: 'timestamp', label: 'Timestamp', type: 'text', defaultValue: 'Just now', x: 58, y: 42, fontSize: 10, fill: '#b0b3b8', fontFamily: 'sans-serif' },
    ],
  },
  {
    id: 'youtube-thumbnail',
    name: 'YouTube Thumbnail',
    category: 'Social',
    viewBox: '0 0 640 360',
    width: 640,
    height: 360,
    screen: { x: 0, y: 0, width: 640, height: 360, rx: 8 },
    frameSvg: `
      <rect x="0" y="0" width="640" height="360" rx="8" fill="none" stroke="#333" stroke-width="2"/>
      <circle cx="320" cy="180" r="32" fill="rgba(0,0,0,0.7)"/>
      <polygon points="310,160 310,200 345,180" fill="#fff"/>
      <rect x="540" y="330" width="90" height="24" rx="4" fill="rgba(0,0,0,0.8)"/>
      <text x="585" y="347" text-anchor="middle" font-family="monospace" font-size="12" fill="#fff">12:34</text>
    `,
  },

  // ─── Print ───
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
      <rect x="20" y="20" width="460" height="660" fill="none" stroke="#ddd" stroke-width="2"/>
      <rect x="38" y="38" width="424" height="624" fill="none" stroke="#222" stroke-width="3"/>
      <rect x="0" y="0" width="500" height="700" fill="none" stroke="#333" stroke-width="6"/>
    `,
  },
  {
    id: 'a4-vertical',
    name: 'A4 Vertical',
    category: 'Print',
    viewBox: '0 0 420 594',
    width: 420,
    height: 594,
    screen: { x: 10, y: 10, width: 400, height: 574, rx: 0 },
    frameSvg: `
      <rect x="0" y="0" width="420" height="594" fill="none" stroke="#ccc" stroke-width="1"/>
      <line x1="30" y1="0" x2="30" y2="594" stroke="#eee" stroke-width="0.5" stroke-dasharray="4"/>
    `,
  },
  {
    id: 'album-cover',
    name: 'Album Cover',
    category: 'Print',
    viewBox: '0 0 500 500',
    width: 500,
    height: 500,
    screen: { x: 0, y: 0, width: 500, height: 500, rx: 4 },
    frameSvg: `
      <rect x="0" y="0" width="500" height="500" rx="4" fill="none" stroke="#333" stroke-width="3"/>
      <rect x="4" y="4" width="492" height="492" rx="2" fill="none" stroke="#555" stroke-width="1"/>
    `,
  },
  {
    id: 'book-cover',
    name: 'Book Cover',
    category: 'Print',
    viewBox: '0 0 430 600',
    width: 430,
    height: 600,
    screen: { x: 30, y: 0, width: 400, height: 600, rx: 0 },
    bgSvg: `<rect x="0" y="0" width="430" height="600" fill="#f5f0eb"/>`,
    frameSvg: `
      <rect x="30" y="0" width="400" height="600" fill="none" stroke="#333" stroke-width="2"/>
      <rect x="0" y="0" width="28" height="600" fill="#2a2a2a"/>
      <line x1="28" y1="0" x2="28" y2="600" stroke="#444" stroke-width="2"/>
    `,
  },

  // ─── Wearable / Display ───
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    category: 'Wearable',
    viewBox: '0 0 230 300',
    width: 230,
    height: 300,
    screen: { x: 25, y: 55, width: 180, height: 190, rx: 36 },
    frameSvg: `
      <rect x="15" y="40" width="200" height="220" rx="44" fill="none" stroke="#333" stroke-width="8"/>
      <rect x="10" y="35" width="210" height="230" rx="48" fill="none" stroke="#555" stroke-width="2"/>
      <rect x="218" y="110" width="12" height="40" rx="4" fill="#333"/>
      <rect x="80" y="10" width="70" height="28" rx="6" fill="#2a2a2a"/>
      <rect x="80" y="262" width="70" height="28" rx="6" fill="#2a2a2a"/>
    `,
  },
  {
    id: 'smart-tv',
    name: 'Smart TV',
    category: 'Wearable',
    viewBox: '0 0 960 600',
    width: 960,
    height: 600,
    screen: { x: 20, y: 16, width: 920, height: 520, rx: 4 },
    frameSvg: `
      <rect x="6" y="6" width="948" height="540" rx="10" fill="none" stroke="#222" stroke-width="10"/>
      <rect x="0" y="0" width="960" height="552" rx="14" fill="none" stroke="#444" stroke-width="2"/>
      <path d="M 380 556 L 400 580 L 560 580 L 580 556" fill="none" stroke="#444" stroke-width="3"/>
      <line x1="380" y1="580" x2="580" y2="580" stroke="#444" stroke-width="4"/>
    `,
  },
];

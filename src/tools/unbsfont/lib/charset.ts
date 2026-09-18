/** Conjuntos de caracteres, categorias e nomes de glifo. */

const range = (from: number, to: number, skip: number[] = []) => {
  let s = '';
  for (let cp = from; cp <= to; cp++) if (!skip.includes(cp)) s += String.fromCodePoint(cp);
  return s;
};

/** Sinais de acento desenháveis (caracteres de espaçamento), na ordem da cartela. */
export const MARKS_BASIC = '´`ˆ˜¨¸˚';
/** Sinais que só o Latin Extended-A usa. */
export const MARKS_EXTENDED = 'ˇ˘˙˝˛¯';
/** Letras sem pingo: o acento do í e do ĵ vai sobre elas, quando desenhadas. */
export const DOTLESS: Record<string, string> = { i: 'ı', j: 'ȷ' };

export const ACCENTS_PT_ES = 'ÁÀÂÃÄÇÉÈÊËÍÌÎÏÑÓÒÔÕÖÚÙÛÜÝ' + 'áàâãäçéèêëíìîïñóòôõöúùûüýÿ';
/** Latin-1 Supplement (menos o hífen condicional) e os extras do Windows-1252. */
export const LATIN_1 = range(0xa1, 0xff, [0xad]) + '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export const LATIN_EXT_A = range(0x100, 0x17f) + MARKS_EXTENDED;

/** Conjuntos da ordem de caracteres. Os quatro primeiros formam a grade básica de glifos. */
export const PRESETS = [
  { id: 'upper', label: 'A–Z', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { id: 'lower', label: 'a–z', chars: 'abcdefghijklmnopqrstuvwxyz' },
  { id: 'digits', label: '0–9', chars: '0123456789' },
  { id: 'punct', label: 'Pontuação', chars: '.,:;!?\'"-()&@#%/*+=' },
  { id: 'marks', label: 'Sinais de acento', chars: `${MARKS_BASIC}ı` },
  { id: 'accents', label: 'Acentos PT/ES', chars: ACCENTS_PT_ES },
  { id: 'latin1', label: 'Latin-1 completo', chars: LATIN_1 },
  { id: 'latinA', label: 'Latin Extended-A', chars: LATIN_EXT_A },
] as const;

export const BASIC_PRESETS = PRESETS.slice(0, 4);

export const DEFAULT_SEQUENCE = BASIC_PRESETS.map(p => p.chars).join('\n');

/** Caracteres da sequência, na ordem, sem espaços nem quebras de linha. */
export const sequenceChars = (sequence: string): string[] => Array.from(sequence).filter(c => !/\s/.test(c));

export const isUpper = (c: string) => c !== c.toLowerCase() && c === c.toUpperCase();
export const isLower = (c: string) => c !== c.toUpperCase() && c === c.toLowerCase();
export const isDigit = (c: string) => /^\p{Nd}$/u.test(c);
export const isLetter = (c: string) => isUpper(c) || isLower(c);

/** Letra-base de um acentuado (Á → A), ou o próprio caractere. */
export const baseChar = (c: string) => c.normalize('NFD')[0] || c;

export type CharKind = 'upper' | 'lower' | 'digit' | 'punct' | 'quote' | 'dash' | 'bracket' | 'symbol';

export function charKind(c: string): CharKind {
  if (isUpper(c)) return 'upper';
  if (isLower(c)) return 'lower';
  if (isDigit(c)) return 'digit';
  if ('.,:;!?…¡¿'.includes(c)) return 'punct';
  if ('\'"‘’“”‚„`´'.includes(c)) return 'quote';
  if ('-–—_'.includes(c)) return 'dash';
  if ('()[]{}'.includes(c)) return 'bracket';
  return 'symbol';
}

/* Posição na folha: de onde a linha de base pode ser lida com confiança. */
export const FLAT_BOTTOM = new Set(Array.from('ABDEFHIKLMNPRTXZbdhiklmnrxz12457'));
export const ROUND_BOTTOM = new Set(Array.from('CGOSUcoesau03689.!?:'));
export const DESCENDS = new Set(Array.from('gjpqyQ,;¸˛'));
export const RAISED = new Set(Array.from('\'"‘’“”`´^°*~ˆ˜¨˚ˇ˘˙˝¯'));

/* Referências para as guias da folha, em ordem de preferência. */
export const CAP_REFS = Array.from('HIEFTLZNMKXBDPR');
export const X_REFS = Array.from('xzvwyu');
export const ASC_REFS = Array.from('dhklbf');
export const DESC_REFS = Array.from('pqgyj');

/* ---------------------------------------------------------------- nomes */

const NAMES: Record<string, string> = {
  ' ': 'space', '!': 'exclam', '"': 'quotedbl', '#': 'numbersign', $: 'dollar', '%': 'percent', '&': 'ampersand',
  "'": 'quotesingle', '(': 'parenleft', ')': 'parenright', '*': 'asterisk', '+': 'plus', ',': 'comma', '-': 'hyphen',
  '.': 'period', '/': 'slash', ':': 'colon', ';': 'semicolon', '<': 'less', '=': 'equal', '>': 'greater',
  '?': 'question', '@': 'at', '[': 'bracketleft', '\\': 'backslash', ']': 'bracketright', '^': 'asciicircum',
  _: 'underscore', '`': 'grave', '{': 'braceleft', '|': 'bar', '}': 'braceright', '~': 'asciitilde',
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '¡': 'exclamdown', '¿': 'questiondown', '©': 'copyright', '®': 'registered', '°': 'degree', '·': 'periodcentered',
  '«': 'guillemotleft', '»': 'guillemotright', '–': 'endash', '—': 'emdash', '‘': 'quoteleft', '’': 'quoteright',
  '“': 'quotedblleft', '”': 'quotedblright', '‚': 'quotesinglbase', '„': 'quotedblbase', '…': 'ellipsis', '•': 'bullet',
  '€': 'Euro', '£': 'sterling', '™': 'trademark', 'ß': 'germandbls', 'Æ': 'AE', 'æ': 'ae', 'Ø': 'Oslash', 'ø': 'oslash',
  'Œ': 'OE', 'œ': 'oe', '´': 'acute', '¨': 'dieresis', '¸': 'cedilla', 'ª': 'ordfeminine', 'º': 'ordmasculine',
  'ˆ': 'circumflex', '˜': 'tilde', '˚': 'ring', 'ˇ': 'caron', '˘': 'breve', '˙': 'dotaccent', '˝': 'hungarumlaut', '˛': 'ogonek',
  '¯': 'macron', 'ı': 'dotlessi', 'ȷ': 'dotlessj', '¢': 'cent', '¥': 'yen', '¤': 'currency', '¦': 'brokenbar', '§': 'section',
  '¬': 'logicalnot', '±': 'plusminus', '²': 'twosuperior', '³': 'threesuperior', '¹': 'onesuperior', 'µ': 'mu', '¶': 'paragraph',
  '¼': 'onequarter', '½': 'onehalf', '¾': 'threequarters', '×': 'multiply', '÷': 'divide', 'Ð': 'Eth', 'ð': 'eth', 'Þ': 'Thorn',
  'þ': 'thorn', 'Đ': 'Dcroat', 'đ': 'dcroat', 'Ħ': 'Hbar', 'ħ': 'hbar', 'Ł': 'Lslash', 'ł': 'lslash', 'Ŋ': 'Eng', 'ŋ': 'eng',
  'ĸ': 'kgreenlandic', 'Ŀ': 'Ldot', 'ŀ': 'ldot', 'ŉ': 'napostrophe', 'Ĳ': 'IJ', 'ĳ': 'ij', 'ſ': 'longs', 'ƒ': 'florin',
  '‹': 'guilsinglleft', '›': 'guilsinglright', '†': 'dagger', '‡': 'daggerdbl', '‰': 'perthousand',
  'Ģ': 'Gcommaaccent', 'ģ': 'gcommaaccent', 'Ķ': 'Kcommaaccent', 'ķ': 'kcommaaccent', 'Ļ': 'Lcommaaccent', 'ļ': 'lcommaaccent',
  'Ņ': 'Ncommaaccent', 'ņ': 'ncommaaccent', 'Ŗ': 'Rcommaaccent', 'ŗ': 'rcommaaccent',
};

const MARKS: Record<string, string> = Object.fromEntries(
  ([
    [0x300, 'grave'], [0x301, 'acute'], [0x302, 'circumflex'], [0x303, 'tilde'], [0x304, 'macron'], [0x306, 'breve'], [0x307, 'dotaccent'],
    [0x308, 'dieresis'], [0x30a, 'ring'], [0x30b, 'hungarumlaut'], [0x30c, 'caron'], [0x327, 'cedilla'], [0x328, 'ogonek'],
  ] as const).map(([cp, name]) => [String.fromCharCode(cp), name]),
);

/** Nome de glifo pela Adobe Glyph List quando existe; `uniXXXX` nos demais. */
export function glyphName(c: string): string {
  if (NAMES[c]) return NAMES[c];
  if (/^[A-Za-z]$/.test(c)) return c;
  const nfd = c.normalize('NFD');
  if (nfd.length === 2 && /^[A-Za-z]$/.test(nfd[0]) && MARKS[nfd[1]]) return nfd[0] + MARKS[nfd[1]];
  const cp = c.codePointAt(0) || 0;
  return cp > 0xffff ? `u${cp.toString(16).toUpperCase()}` : `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

/* -------------------------------------------------------- grupos de kerning */

/**
 * Candidatos a classe de kerning, pelo lado que encosta no vizinho. Um glifo só
 * entra na classe se o perfil daquele lado for de fato parecido com o da
 * letra-líder (a primeira da lista que existir na fonte); acentuados seguem a
 * letra-base.
 */
export const LEFT_SIDE_GROUPS = ['HBDEFIKLMNPR', 'OCGQ', 'VW', 'nmrhklbp', 'ocdeqg', 'vwy', 'ij'];
export const RIGHT_SIDE_GROUPS = ['HIMN', 'OD', 'VW', 'nmhuial', 'obp', 'vwy'];

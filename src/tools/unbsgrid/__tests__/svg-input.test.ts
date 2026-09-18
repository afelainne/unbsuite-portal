import { describe, it, expect } from 'vitest';
import {
  validateSvgInput,
  svgFromText,
  svgFromDataUrl,
  svgFromClipboard,
  svgFromDrop,
  readSvgFile,
  decodeSvgDataUrl,
  looksLikeSvgText,
  isSvgDataUrl,
  isSvgFile,
  isSvgInputError,
  isSvgInputResult,
  describeSvgInputError,
  isTextEntryTarget,
  type ClipboardLike,
  type SvgInputOutcome,
} from '../lib/svg-input';

const svg = (body: string, attrs = 'viewBox="0 0 100 100"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

const RECT = svg('<rect x="10" y="10" width="40" height="40" fill="#111"/>');

const errorCode = (outcome: SvgInputOutcome) => (isSvgInputError(outcome) ? outcome.code : null);

const clipboard = (parts: Partial<ClipboardLike>): ClipboardLike => ({
  getData: () => '',
  files: [],
  items: [],
  ...parts,
});

const textClipboard = (text: string): ClipboardLike =>
  clipboard({ getData: (type: string) => (type === 'text/plain' ? text : '') });

describe('sniffing helpers', () => {
  it('recognizes SVG markup, data URLs and .svg files', () => {
    expect(looksLikeSvgText(RECT)).toBe(true);
    expect(looksLikeSvgText('<div><p>oi</p></div>')).toBe(false);
    expect(looksLikeSvgText(42)).toBe(false);
    expect(isSvgDataUrl('data:image/svg+xml;base64,AAA')).toBe(true);
    expect(isSvgDataUrl('data:image/png;base64,AAA')).toBe(false);
    expect(isSvgFile({ name: 'logo.SVG', type: '' })).toBe(true);
    expect(isSvgFile({ name: 'logo', type: 'image/svg+xml' })).toBe(true);
    expect(isSvgFile({ name: 'logo.png', type: 'image/png' })).toBe(false);
    expect(isSvgFile(null)).toBe(false);
  });
});

describe('validateSvgInput', () => {
  it('accepts markup and returns sanitized output', () => {
    const outcome = validateSvgInput(RECT, { name: 'logo.svg', source: 'file' });
    expect(isSvgInputResult(outcome)).toBe(true);
    if (!isSvgInputResult(outcome)) return;
    expect(outcome.svg).toContain('<rect');
    expect(outcome.name).toBe('logo.svg');
    expect(outcome.artboard).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(outcome.elementCount).toBeGreaterThan(0);
    expect(outcome.raw).toBe(RECT);
  });

  it('sanitizes before handing anything back', () => {
    const nasty = svg(`
      <script>alert(1)</script>
      <rect width="10" height="10" onclick="alert(2)"/>
      <image href="https://evil.example/x.png" width="4" height="4"/>
    `);
    const outcome = validateSvgInput(nasty);
    expect(isSvgInputResult(outcome)).toBe(true);
    if (!isSvgInputResult(outcome)) return;
    expect(outcome.svg).not.toMatch(/script|onclick|evil\.example/i);
    expect(outcome.svg).toContain('<rect');
    expect(outcome.warnings.length).toBeGreaterThan(0);
  });

  it('gives a distinct code and message per kind of problem', () => {
    expect(errorCode(validateSvgInput(''))).toBe('empty');
    expect(errorCode(validateSvgInput('   '))).toBe('empty');
    expect(errorCode(validateSvgInput(null))).toBe('empty');
    expect(errorCode(validateSvgInput('apenas um texto'))).toBe('not-svg');
    expect(errorCode(validateSvgInput('<div>oi</div>'))).toBe('not-svg');
    expect(errorCode(validateSvgInput('https://exemplo.com/logo.svg'))).toBe('unsupported-url');
    expect(errorCode(validateSvgInput(svg('<title>vazio</title>')))).toBe('no-shapes');
    expect(errorCode(validateSvgInput(RECT, { maxBytes: 10 }))).toBe('too-large');
    expect(errorCode(validateSvgInput(svg('<rect width="1" height="1"/>'), { sanitize: { maxElements: 1 } }))).toBe('too-complex');
  });

  it('every error carries a title and a description in Portuguese', () => {
    for (const bad of ['', 'texto', 'https://x.test/a.svg', svg('<title>x</title>')]) {
      const outcome = validateSvgInput(bad);
      expect(isSvgInputError(outcome)).toBe(true);
      if (!isSvgInputError(outcome)) continue;
      expect(outcome.title.length).toBeGreaterThan(3);
      expect(outcome.description.length).toBeGreaterThan(10);
      expect(outcome.title).not.toBe(outcome.description);
    }
    const described = describeSvgInputError('too-large', '30.0 MB');
    expect(described.description).toContain('30.0 MB');
  });
});

describe('data URLs (no network)', () => {
  const encoded = `data:image/svg+xml,${encodeURIComponent(RECT)}`;
  const base64 = `data:image/svg+xml;base64,${Buffer.from(RECT, 'utf-8').toString('base64')}`;

  it('decodes percent-encoded and base64 payloads', () => {
    expect(decodeSvgDataUrl(encoded)).toContain('<rect');
    expect(decodeSvgDataUrl(base64)).toContain('<rect');
    expect(decodeSvgDataUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(decodeSvgDataUrl('https://exemplo.com/a.svg')).toBeNull();
    expect(decodeSvgDataUrl('data:image/svg+xml')).toBeNull();
  });

  it('opens both forms through the same validation', () => {
    for (const url of [encoded, base64]) {
      const outcome = svgFromDataUrl(url);
      expect(isSvgInputResult(outcome)).toBe(true);
      if (isSvgInputResult(outcome)) expect(outcome.source).toBe('data-url');
    }
  });

  it('refuses other media types and remote addresses', () => {
    expect(errorCode(svgFromDataUrl('data:text/html,<svg/>'))).toBe('bad-data-url');
    expect(errorCode(svgFromDataUrl('https://exemplo.com/logo.svg'))).toBe('unsupported-url');
  });

  it('svgFromText routes a data URL to the data URL reader', () => {
    const outcome = svgFromText(encoded);
    expect(isSvgInputResult(outcome)).toBe(true);
  });
});

describe('paste', () => {
  it('recognizes SVG markup in the clipboard text', async () => {
    const outcome = await svgFromClipboard(textClipboard(RECT));
    expect(isSvgInputResult(outcome)).toBe(true);
    if (isSvgInputResult(outcome)) expect(outcome.source).toBe('clipboard');
  });

  it('recognizes a data URL in the clipboard text', async () => {
    const outcome = await svgFromClipboard(textClipboard(`data:image/svg+xml,${encodeURIComponent(RECT)}`));
    expect(isSvgInputResult(outcome)).toBe(true);
  });

  it('refuses anything that is not SVG', async () => {
    expect(errorCode(await svgFromClipboard(textClipboard('só um texto qualquer')))).toBe('no-svg-in-clipboard');
    expect(errorCode(await svgFromClipboard(textClipboard('<p>html</p>')))).toBe('no-svg-in-clipboard');
    expect(errorCode(await svgFromClipboard(textClipboard('https://exemplo.com/logo.svg')))).toBe('unsupported-url');
    expect(errorCode(await svgFromClipboard(clipboard({})))).toBe('no-svg-in-clipboard');
    expect(errorCode(await svgFromClipboard(null))).toBe('no-svg-in-clipboard');
  });

  it('prefers a file in the clipboard, and refuses a non-SVG one', async () => {
    const file = new File([RECT], 'colado.svg', { type: 'image/svg+xml' });
    const outcome = await svgFromClipboard(clipboard({ files: [file], getData: () => 'ignorado' }));
    expect(isSvgInputResult(outcome)).toBe(true);
    if (isSvgInputResult(outcome)) expect(outcome.name).toBe('colado.svg');

    const png = new File(['PNG'], 'logo.png', { type: 'image/png' });
    expect(errorCode(await svgFromClipboard(clipboard({ files: [png] })))).toBe('not-svg-file');
  });

  it('reads a file exposed only through items[]', async () => {
    const file = new File([RECT], 'item.svg', { type: 'image/svg+xml' });
    const data = clipboard({
      items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }, { kind: 'file', type: 'image/svg+xml', getAsFile: () => file }],
    });
    expect(isSvgInputResult(await svgFromClipboard(data))).toBe(true);
  });

  it('drop uses the same reader and reports its own source', async () => {
    const file = new File([RECT], 'solto.svg', { type: 'image/svg+xml' });
    const outcome = await svgFromDrop(clipboard({ files: [file] }));
    expect(isSvgInputResult(outcome)).toBe(true);
    if (isSvgInputResult(outcome)) expect(outcome.source).toBe('drop');
  });
});

describe('readSvgFile', () => {
  it('reads an .svg file', async () => {
    const outcome = await readSvgFile(new File([RECT], 'marca.svg', { type: 'image/svg+xml' }));
    expect(isSvgInputResult(outcome)).toBe(true);
    if (isSvgInputResult(outcome)) {
      expect(outcome.name).toBe('marca.svg');
      expect(outcome.bytes).toBe(RECT.length);
    }
  });

  it('refuses other formats, empty files and missing input', async () => {
    expect(errorCode(await readSvgFile(new File(['x'], 'logo.pdf', { type: 'application/pdf' })))).toBe('not-svg-file');
    expect(errorCode(await readSvgFile(new File([''], 'vazio.svg', { type: 'image/svg+xml' })))).toBe('empty');
    expect(errorCode(await readSvgFile(null))).toBe('empty');
  });

  it('refuses a file over the size ceiling without reading it', async () => {
    const file = new File([RECT], 'grande.svg', { type: 'image/svg+xml' });
    Object.defineProperty(file, 'size', { value: 40 * 1024 * 1024 });
    expect(errorCode(await readSvgFile(file))).toBe('too-large');
  });
});

describe('isTextEntryTarget', () => {
  it('spots text fields so page shortcuts leave typing alone', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.append(input, textarea, div, editable);
    expect(isTextEntryTarget(input)).toBe(true);
    expect(isTextEntryTarget(textarea)).toBe(true);
    expect(isTextEntryTarget(div)).toBe(false);
    expect(isTextEntryTarget(editable)).toBe(true);
    expect(isTextEntryTarget(null)).toBe(false);
    input.remove(); textarea.remove(); div.remove(); editable.remove();
  });
});

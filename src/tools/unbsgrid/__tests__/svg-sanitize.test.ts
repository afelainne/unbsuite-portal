import { describe, it, expect } from 'vitest';
import {
  sanitizeSVG, SvgParseError, parseLengthToPx, parseViewBox, parseCssRules, selectorSpecificity, viewBoxTransform,
} from '../lib/svg-sanitize';

const svg = (body: string, attrs = 'viewBox="0 0 100 100"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${attrs}>${body}</svg>`;

const parse = (s: string) => new DOMParser().parseFromString(s, 'image/svg+xml').documentElement;

describe('sanitizeSVG — malicious content', () => {
  it('removes scripts, foreignObject, animation and event handlers', () => {
    const input = svg(`
      <script>alert(1)</script>
      <foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></div></foreignObject>
      <set attributeName="href" to="javascript:alert(3)"/>
      <rect width="10" height="10" onclick="alert(4)" onmouseover="alert(5)"/>
    `, 'viewBox="0 0 100 100" onload="alert(6)"');
    const out = sanitizeSVG(input).svg;
    expect(out).not.toMatch(/script|foreignObject|onerror|onclick|onmouseover|onload|alert|<set/i);
    expect(out).toContain('<rect');
  });

  it('removes javascript: and external hrefs but keeps local refs and raster data URIs', () => {
    const input = svg(`
      <defs><path id="p" d="M0 0L10 10"/></defs>
      <a href="javascript:alert(1)"><rect width="5" height="5"/></a>
      <image href="https://evil.example/track.png" width="10" height="10"/>
      <image xlink:href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" width="10" height="10"/>
      <image href="data:image/png;base64,iVBORw0KGgo=" width="10" height="10"/>
      <path d="M0 0L5 5" fill="url(https://evil.example/x)" style="fill:url(http://e/x);stroke:#f00"/>
      <rect width="1" height="1" fill="url(#grad)"/>
    `);
    const res = sanitizeSVG(input);
    const out = res.svg;
    expect(out).not.toMatch(/javascript|evil\.example|http:\/\/e\/|image\/svg\+xml;base64/);
    expect(out).toContain('data:image/png;base64');
    expect(out).toContain('url(#grad)');
    expect(out).toContain('stroke:#f00');
    // <a> is unwrapped into a <g>, its child kept
    const root = parse(out);
    expect(root.getElementsByTagName('a').length).toBe(0);
    expect(root.querySelectorAll('rect').length).toBe(2);
    // Warnings follow the active language (Portuguese when run headless).
    expect(res.warnings.join(' ')).toMatch(/removed|removid|eliminaron/i);
  });

  it('removes non-SVG namespaced elements', () => {
    const out = sanitizeSVG(svg('<html:iframe xmlns:html="http://www.w3.org/1999/xhtml" src="https://x"/><rect width="1" height="1"/>')).svg;
    expect(out).not.toMatch(/iframe/);
  });

  it('rejects input that paper would treat as an element id / URL', () => {
    expect(() => sanitizeSVG('https://evil.example/logo.svg')).toThrowError(SvgParseError);
    expect(() => sanitizeSVG('   ')).toThrowError(/empty/i);
    try { sanitizeSVG('just text'); } catch (e) { expect((e as SvgParseError).code).toBe('not-svg'); }
  });

  it('rejects oversized input', () => {
    const big = svg(`<path d="${'M0 0L1 1 '.repeat(200)}"/>`);
    expect(() => sanitizeSVG(big, { maxBytes: 100 })).toThrowError(/too large/);
  });

  it('rejects a <use> expansion bomb and element floods', () => {
    let body = '<defs><rect id="l0" width="1" height="1"/>';
    for (let i = 1; i <= 12; i++) body += `<g id="l${i}"><use href="#l${i - 1}"/><use href="#l${i - 1}"/><use href="#l${i - 1}"/></g>`;
    body += '</defs><use href="#l12"/>';
    expect(() => sanitizeSVG(svg(body), { maxElements: 5000 })).toThrowError(/too-complex|expands|too many/);
    expect(() => sanitizeSVG(svg('<rect/>'.repeat(50)), { maxElements: 10 })).toThrowError(SvgParseError);
  });

  it('drops a DOCTYPE with internal entities after expanding simple ones (old Illustrator files)', () => {
    const input = `<?xml version="1.0"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
  <!ENTITY ns_svg "http://www.w3.org/2000/svg">
  <!ENTITY ns_flows "http://ns.adobe.com/Flows/1.0/">
]>
<svg xmlns="&ns_svg;" xmlns:x="&ns_flows;" viewBox="0 0 10 10"><rect width="4" height="4"/></svg>`;
    const out = sanitizeSVG(input).svg;
    expect(out).not.toMatch(/DOCTYPE|ENTITY|&ns_/);
    expect(parse(out).querySelectorAll('rect').length).toBe(1);
  });

  it('falls back to the lenient HTML parser for sloppy markup', () => {
    const input = '<svg viewBox="0 0 10 10"><title>Tom & Jerry</title><rect width="3" height="3"/></svg>';
    const out = sanitizeSVG(input).svg;
    expect(parse(out).querySelectorAll('rect').length).toBe(1);
  });

  it('throws SvgParseError for unrecoverable input', () => {
    expect(() => sanitizeSVG('<svg')).toThrowError(SvgParseError);
  });

  it('strips comments and processing instructions', () => {
    const out = sanitizeSVG(svg('<!-- <script>x</script> --><?php echo 1 ?><rect width="1" height="1"/>')).svg;
    expect(out).not.toMatch(/<!--|<\?php/);
  });
});

describe('sanitizeSVG — normalization', () => {
  it('sizes the root in viewBox units and disables the artboard clip', () => {
    const res = sanitizeSVG(svg('<rect width="1" height="1"/>', 'width="100mm" height="50%" viewBox="10 20 300 150"'));
    const root = parse(res.svg);
    expect(root.getAttribute('width')).toBe('300');
    expect(root.getAttribute('height')).toBe('150');
    expect(root.getAttribute('overflow')).toBe('visible');
    expect(res.artboard).toEqual({ x: 10, y: 20, width: 300, height: 150 });
  });

  it('converts width/height units to px when there is no viewBox', () => {
    const res = sanitizeSVG(svg('<rect width="1" height="1"/>', 'width="2in" height="72pt"'));
    const root = parse(res.svg);
    expect(root.getAttribute('width')).toBe('192');
    expect(root.getAttribute('height')).toBe('96');
    expect(res.artboard).toEqual({ x: 0, y: 0, width: 192, height: 96 });
  });

  it('removes percentage sizes without a viewBox and warns about invalid viewBox', () => {
    const res = sanitizeSVG(svg('<rect width="1" height="1"/>', 'width="100%" height="100%" viewBox="0 0 0 10"'));
    const root = parse(res.svg);
    expect(root.hasAttribute('width')).toBe(false);
    expect(root.hasAttribute('viewBox')).toBe(false);
    expect(res.artboard).toBeNull();
    expect(res.warnings.join()).toMatch(/viewBox/);
  });

  it('inlines <style> rules by specificity / order, keeps inline style, removes <style>', () => {
    const input = svg(`
      <style>
        @import url(https://evil.example/x.css);
        .a { fill: #00f; stroke: #111 }
        rect.a { fill: #0f0 }
        #special { fill: #f00 }
        .b { fill: #abc !important; background: url(https://evil.example/t.png) }
      </style>
      <rect class="a" width="1" height="1"/>
      <rect class="a" id="special" width="1" height="1"/>
      <rect class="a" style="fill:#123456" width="1" height="1"/>
      <rect class="b" style="fill:#123456" width="1" height="1"/>
    `);
    const res = sanitizeSVG(input);
    const rects = Array.from(parse(res.svg).querySelectorAll('rect'));
    expect(res.svg).not.toMatch(/<style|evil\.example|@import/);
    expect(rects[0].getAttribute('style')).toMatch(/fill:#0f0/);
    expect(rects[0].getAttribute('style')).toMatch(/stroke:#111/);
    expect(rects[1].getAttribute('style')).toMatch(/fill:#f00/);
    expect(rects[2].getAttribute('style')).toMatch(/fill:#123456/);
    expect(rects[3].getAttribute('style')).toMatch(/fill:#abc/);
    expect(res.stats.inlinedRules).toBeGreaterThan(0);
  });

  it('expands <use> of symbols and plain elements (incl. forward refs)', () => {
    const input = svg(`
      <use href="#later" x="5" y="6"/>
      <defs><symbol id="sym" viewBox="0 0 10 10"><rect width="10" height="10"/></symbol></defs>
      <use xlink:href="#sym" x="20" y="0" width="20" height="20" fill="#f00"/>
      <circle id="later" cx="1" cy="1" r="1"/>
      <use href="#missing"/>
    `);
    const res = sanitizeSVG(input);
    const root = parse(res.svg);
    expect(root.getElementsByTagName('use').length).toBe(0);
    expect(res.stats.expandedUses).toBe(2);
    const circles = root.querySelectorAll('circle');
    expect(circles.length).toBe(2);
    expect(Array.from(root.querySelectorAll('[id="later"]')).length).toBe(1); // clone has no duplicate id
    const g = circles[0].parentElement!;
    expect(g.getAttribute('transform')).toBe('translate(5 6)');
    const symbolGroup = root.querySelector('g[fill="#f00"]')!;
    expect(symbolGroup.getAttribute('transform')).toBe('translate(20 0)');
    expect(symbolGroup.firstElementChild!.getAttribute('transform')).toContain('scale(2 2)');
    expect(res.warnings.join()).toMatch(/missing/);
  });

  it('drops a self-referencing <use>', () => {
    const res = sanitizeSVG(svg('<g id="loop"><rect width="1" height="1"/><use href="#loop"/></g>'));
    expect(parse(res.svg).getElementsByTagName('use').length).toBe(0);
  });

  it('is memoized but returns independent mutable parts', () => {
    const input = svg('<script/><rect width="1" height="1"/>');
    const a = sanitizeSVG(input);
    a.warnings.push('mutated');
    const b = sanitizeSVG(input);
    expect(b.svg).toBe(a.svg);
    expect(b.warnings).not.toContain('mutated');
  });

  it('does not leave nodes in the live document', () => {
    const before = document.body.innerHTML;
    sanitizeSVG(svg('<rect width="1" height="1"/>'));
    expect(document.body.innerHTML).toBe(before);
  });
});

describe('sanitize helpers', () => {
  it('parseLengthToPx', () => {
    expect(parseLengthToPx('10')).toBe(10);
    expect(parseLengthToPx('1in')).toBe(96);
    expect(parseLengthToPx('2.54cm')).toBeCloseTo(96);
    expect(parseLengthToPx('25.4mm')).toBeCloseTo(96);
    expect(parseLengthToPx('72pt')).toBeCloseTo(96);
    expect(parseLengthToPx('50%')).toBeNull();
    expect(parseLengthToPx('2em')).toBeNull();
    expect(parseLengthToPx('abc')).toBeNull();
    expect(parseLengthToPx(null)).toBeNull();
  });

  it('parseViewBox', () => {
    expect(parseViewBox('0,0,10,20')).toEqual({ x: 0, y: 0, width: 10, height: 20 });
    expect(parseViewBox('0 0 10')).toBeNull();
    expect(parseViewBox('0 0 -1 10')).toBeNull();
    expect(parseViewBox('0 0 NaN 10')).toBeNull();
  });

  it('viewBoxTransform honours preserveAspectRatio', () => {
    expect(viewBoxTransform({ x: 0, y: 0, width: 10, height: 10 }, 20, 40, null)).toBe('translate(0 10) scale(2 2) translate(0 0)');
    expect(viewBoxTransform({ x: 0, y: 0, width: 10, height: 10 }, 20, 40, 'none')).toBe('translate(0 0) scale(2 4) translate(0 0)');
    expect(viewBoxTransform({ x: 1, y: 2, width: 10, height: 10 }, 20, 40, 'xMinYMin slice')).toBe('translate(0 0) scale(4 4) translate(-1 -2)');
  });

  it('parseCssRules skips at-rules and splits selector lists', () => {
    const rules = parseCssRules('/* c */ @media print { .x { fill: red } } .a, .b { fill: #fff; stroke-width: 2 !important }');
    expect(rules.map(r => r.selector)).toEqual(['.a', '.b']);
    expect(rules[0].decls).toEqual([
      { prop: 'fill', value: '#fff', important: false },
      { prop: 'stroke-width', value: '2', important: true },
    ]);
  });

  it('selectorSpecificity orders id > class > type', () => {
    expect(selectorSpecificity('#a')).toBeGreaterThan(selectorSpecificity('.a.b.c'));
    expect(selectorSpecificity('.a')).toBeGreaterThan(selectorSpecificity('rect g path'));
    expect(selectorSpecificity('rect.a')).toBeGreaterThan(selectorSpecificity('.a'));
  });
});

describe('rounded rect radius mirroring', () => {
  it('copies rx to ry so a rounded rect keeps its corners', () => {
    const { svg } = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect x="0" y="0" width="100" height="50" rx="8"/></svg>');
    expect(svg).toMatch(/ry="8"/);
  });

  it('copies ry to rx as well', () => {
    const { svg } = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect x="0" y="0" width="100" height="50" ry="6"/></svg>');
    expect(svg).toMatch(/rx="6"/);
  });

  it('leaves a rect with both radii, or with none, untouched', () => {
    const both = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50" rx="8" ry="3"/></svg>').svg;
    expect(both).toMatch(/rx="8"/);
    expect(both).toMatch(/ry="3"/);
    const none = sanitizeSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect width="100" height="50"/></svg>').svg;
    expect(none).not.toMatch(/r[xy]=/);
  });
});

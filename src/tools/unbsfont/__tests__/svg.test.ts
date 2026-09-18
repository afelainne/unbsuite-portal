import { describe, expect, it } from 'vitest';
import { parsePathData, parseSvgDocument, parseTransform, readSvgShapes } from '../lib/svg';
import { cmdPoints, reverseContour, signedArea, flatten } from '../lib/geometry';

describe('parsePathData', () => {
  it('converte comandos relativos, H/V e fecha no início', () => {
    const cmds = parsePathData('m10 10 h20 v20 h-20 z');
    expect(cmds.map(c => c.type)).toEqual(['M', 'L', 'L', 'L', 'Z']);
    expect(cmdPoints(cmds)).toEqual([[10, 10], [30, 10], [30, 30], [10, 30]]);
  });

  it('lê números colados e flags de arco sem separador', () => {
    const cmds = parsePathData('M0,0L.5.5l-1e1,0a5 5 0 016-6');
    expect(cmds[1]).toEqual({ type: 'L', x: 0.5, y: 0.5 });
    expect(cmds[2]).toEqual({ type: 'L', x: -9.5, y: 0.5 });
    const last = cmds[cmds.length - 1] as { x: number; y: number };
    expect(last.x).toBeCloseTo(-3.5, 6);
    expect(last.y).toBeCloseTo(-5.5, 6);
  });

  it('reflete o controle em S e T', () => {
    const cmds = parsePathData('M0 0 C10 0 20 10 20 20 S30 40 40 40');
    expect(cmds[2]).toMatchObject({ type: 'C', x1: 20, y1: 30 });
  });
});

describe('transformações', () => {
  it('compõe translate e scale na ordem do SVG', () => {
    const m = parseTransform('translate(10 20) scale(2)');
    expect(m).toEqual([2, 0, 0, 2, 10, 20]);
  });
});

describe('limpeza do SVG', () => {
  it('remove script, foreignObject, eventos e links externos', () => {
    const doc = parseSvgDocument(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject/><path d="M0 0L1 0L1 1Z" onclick="x()"/><use href="https://mal.example/x.svg#a"/></svg>',
    );
    const root = doc.documentElement;
    expect(root.getAttribute('onload')).toBeNull();
    expect(root.getElementsByTagName('script').length).toBe(0);
    expect(root.getElementsByTagName('foreignObject').length).toBe(0);
    expect(root.getElementsByTagName('path')[0].getAttribute('onclick')).toBeNull();
    expect(root.getElementsByTagName('use')[0].getAttribute('href')).toBeNull();
  });

  it('ignora entidades e rejeita o que não é SVG', () => {
    expect(() => parseSvgDocument('<html></html>')).toThrow();
    const shapes = readSvgShapes('<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>');
    expect(shapes.shapes.length).toBe(1);
  });

  it('aceita só o valor de d colado', () => {
    expect(readSvgShapes('M0 0 L10 0 L10 10 Z').shapes.length).toBe(1);
  });

  it('descarta formas sem preenchimento, brancas e escondidas, e aplica classes', () => {
    const r = readSvgShapes(`<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:none;stroke:#000}.b{fill:#231f20}</style>
      <rect class="a" width="10" height="10"/><rect class="b" width="10" height="10"/><rect fill="#fff" width="5" height="5"/>
      <g style="display:none"><rect width="3" height="3"/></g><defs><rect id="r" width="4" height="4"/></defs><use href="#r" x="100"/></svg>`);
    expect(r.strokeOnly).toBe(1);
    expect(r.shapes.length).toBe(2);
    expect(cmdPoints(r.shapes[1].contours[0])[0]).toEqual([100, 0]);
  });
});

describe('inversão de contorno', () => {
  it('troca o sentido sem mudar os pontos', () => {
    const c = parsePathData('M0 0 L10 0 C10 5 5 10 0 10 Z');
    const r = reverseContour(c);
    expect(Math.sign(signedArea(flatten(r)))).toBe(-Math.sign(signedArea(flatten(c))));
    const key = (p: number[]) => p.join(',');
    expect(new Set(cmdPoints(r).map(key))).toEqual(new Set(cmdPoints(c).map(key)));
  });
});

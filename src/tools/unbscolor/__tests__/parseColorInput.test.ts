import { describe, it, expect } from 'vitest';
import { parseColorInput } from '../utils/parseColorInput';

describe('parseColorInput', () => {
  it.each([
    ['#f0ff00', '#F0FF00'],
    ['f0ff00', '#F0FF00'],
    ['  #F0FF00  ', '#F0FF00'],
    ['abc', '#AABBCC'],
    ['#abc', '#AABBCC'],
    ['abcd', '#AABBCC'],
    ['a1b2c380', '#A1B2C3'],
    ['rgb(255, 0, 0)', '#FF0000'],
    ['RGB(0 128 255 / 50%)', '#0080FF'],
    ['rgba(0,128,255,0.5)', '#0080FF'],
    ['Tomato', '#FF6347'],
    ['white', '#FFFFFF']
  ])('%j -> %s', (input, expected) => {
    expect(parseColorInput(input)).toBe(expected);
  });

  it.each(['', '   ', '#', '#12', 'f0ff0', 'zzzzzz', 'rgb(1,2)', 'notacolor', 'hsl(0 50% 50%)'])(
    'rejects %j',
    (input) => {
      expect(parseColorInput(input)).toBeNull();
    }
  );

  it('rejects non-string input', () => {
    expect(parseColorInput(undefined as unknown as string)).toBeNull();
    expect(parseColorInput(123 as unknown as string)).toBeNull();
  });
});

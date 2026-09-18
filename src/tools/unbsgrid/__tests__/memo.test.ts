import { describe, it, expect, vi } from 'vitest';
import { hashString, stableStringify, hashKey, LRUCache, memoizeByKey } from '../lib/memo';

describe('memo helpers', () => {
  it('hashString is stable and discriminating', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('abc', 1)).not.toBe(hashString('abc'));
    expect(hashString('')).toMatch(/^[0-9a-f]{14}$/);
  });

  it('stableStringify ignores key order and handles special values', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: [3, { f: 1, e: 2 }] } })).toBe(stableStringify({ a: { c: [3, { e: 2, f: 1 }], d: 2 }, b: 1 }));
    expect(stableStringify({ n: NaN, i: Infinity, f: () => 1 })).toBe('{"i":"Infinity","n":"NaN"}');
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(stableStringify(cyclic)).toContain('[Circular]');
    expect(hashKey('svg', { a: 1, b: 2 })).toBe(hashKey('svg', { b: 2, a: 1 }));
    expect(hashKey('svg', { a: 1 })).not.toBe(hashKey('svg2', { a: 1 }));
  });

  it('LRUCache evicts the least recently used entry', () => {
    const c = new LRUCache<string, number>(2);
    c.set('a', 1).set('b', 2);
    expect(c.get('a')).toBe(1); // a is now most recent
    c.set('c', 3);
    expect(c.has('b')).toBe(false);
    expect(c.has('a')).toBe(true);
    expect(c.size).toBe(2);
    c.delete('a');
    c.clear();
    expect(c.size).toBe(0);
    expect(() => new LRUCache(0)).toThrow();
  });

  it('memoizeByKey caches results but not errors', () => {
    const fn = vi.fn((x: number) => {
      if (x < 0) throw new Error('neg');
      return x * 2;
    });
    const m = memoizeByKey(fn, x => String(x), 4);
    expect(m(2)).toBe(4);
    expect(m(2)).toBe(4);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(() => m(-1)).toThrow();
    expect(() => m(-1)).toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
    m.cache.clear();
    m(2);
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

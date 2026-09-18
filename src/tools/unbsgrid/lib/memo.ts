/**
 * Small, dependency-free memoization helpers used to avoid recomputing heavy
 * SVG work (sanitizing, metrics, layered export) for identical inputs.
 */

/** cyrb53 — fast 53-bit string hash, returned as a 14-char hex string. */
export function hashString(input: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/**
 * Deterministic JSON serialization (object keys sorted) so that two option
 * objects with the same content always produce the same cache key.
 */
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
      if (typeof v === 'function' || typeof v === 'symbol') return undefined;
      return v;
    }
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      const w = walk((v as Record<string, unknown>)[key]);
      if (w !== undefined) out[key] = w;
    }
    return out;
  };
  return JSON.stringify(walk(value)) ?? 'undefined';
}

/** Cache key for "this SVG + these options". */
export function hashKey(...parts: unknown[]): string {
  return hashString(parts.map(p => (typeof p === 'string' ? p : stableStringify(p))).join('␞'));
}

/** Minimal LRU cache built on Map insertion order. */
export class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private readonly maxEntries = 32) {
    if (maxEntries < 1) throw new Error('LRUCache maxEntries must be >= 1');
  }
  get size(): number { return this.map.size; }
  has(key: K): boolean { return this.map.has(key); }
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key: K, value: V): this {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value as K;
      this.map.delete(oldest);
    }
    return this;
  }
  delete(key: K): boolean { return this.map.delete(key); }
  clear(): void { this.map.clear(); }
}

/**
 * Wrap `fn` so results are cached by `keyFn(...args)`. Errors are not cached.
 * The returned function exposes `.cache` for inspection / clearing.
 */
export function memoizeByKey<A extends unknown[], R>(
  fn: (...args: A) => R,
  keyFn: (...args: A) => string,
  maxEntries = 16,
): ((...args: A) => R) & { cache: LRUCache<string, R> } {
  const cache = new LRUCache<string, R>(maxEntries);
  const wrapped = ((...args: A): R => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key) as R;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as ((...args: A) => R) & { cache: LRUCache<string, R> };
  wrapped.cache = cache;
  return wrapped;
}

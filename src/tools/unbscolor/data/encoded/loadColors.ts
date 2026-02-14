import encodedRaw from './lib_colors.dat?raw';
const KEY = 'c0lor-key';
let cached: any | null = null;

const toBytes = (b64: string): Uint8Array => {
  const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
};

const xorBytes = (data: Uint8Array, key: string): Uint8Array => {
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
};

const decodePayload = (): any => {
  const encoded = JSON.parse(encodedRaw) as { d: string[] };
  const joined = encoded.d.join('');
  const bytes = xorBytes(toBytes(joined), KEY);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
};

export const loadColorLibrary = (): any => {
  if (cached) return cached;
  cached = decodePayload();
  return cached;
};
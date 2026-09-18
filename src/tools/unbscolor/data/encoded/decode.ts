// Shared decoder for the XOR + base64 encoded `.dat` payloads.
// Payload shape: JSON `{ "d": string[] }` whose joined chunks are base64 of
// (UTF-8 JSON XOR key).

const toBytes = (b64: string): Uint8Array => {
  const binary =
    typeof atob !== 'undefined'
      ? atob(b64)
      : (globalThis as any).Buffer.from(b64, 'base64').toString('binary');
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
};

export const xorBytes = (data: Uint8Array, key: string): Uint8Array => {
  const keyBytes = new TextEncoder().encode(key);
  if (keyBytes.length === 0) return data.slice();
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return out;
};

/** Decodes a payload. Throws a descriptive Error when the payload is malformed. */
export const decodeEncodedPayload = <T = unknown>(raw: string, key: string): T => {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new Error('Encoded payload is empty');
  }
  const encoded = JSON.parse(raw) as { d?: unknown };
  if (!encoded || !Array.isArray(encoded.d) || !encoded.d.every((c) => typeof c === 'string')) {
    throw new Error('Encoded payload has an invalid shape (expected { d: string[] })');
  }
  const bytes = xorBytes(toBytes((encoded.d as string[]).join('')), key);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
};

/** Same as decodeEncodedPayload, but logs and returns `fallback` instead of throwing. */
export const safeDecodeEncodedPayload = <T>(raw: string, key: string, fallback: T, label = 'payload'): T => {
  try {
    return decodeEncodedPayload<T>(raw, key);
  } catch (err) {
    console.error(`[unbscolor] Failed to decode ${label}:`, err);
    return fallback;
  }
};

/** Test helper / tooling: encodes a value in the same format. */
export const encodePayload = (value: unknown, key: string, chunkSize = 76): string => {
  const bytes = xorBytes(new TextEncoder().encode(JSON.stringify(value)), key);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa !== 'undefined' ? btoa(binary) : (globalThis as any).Buffer.from(binary, 'binary').toString('base64');
  const d: string[] = [];
  for (let i = 0; i < b64.length; i += chunkSize) d.push(b64.slice(i, i + chunkSize));
  return JSON.stringify({ d });
};

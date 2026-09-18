// Escaping helpers for strings interpolated into generated SVG/XML/CSS.

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

/** Escapes text for XML/SVG text nodes and attribute values. */
export const escapeXml = (value: unknown): string =>
  String(value ?? '')
    // Strip characters that are illegal in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch]);

/** Escapes a value for use inside a double-quoted CSS/JS string literal. */
export const escapeQuoted = (value: unknown): string =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');

/**
 * Safe file name: strips accents and characters invalid on Windows/macOS,
 * collapses whitespace to "-". Never returns an empty string.
 */
export const toSafeFileName = (value: string, fallback = 'palette'): string => {
  const cleaned = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^\.+/, '')
    .toLowerCase()
    .slice(0, 120);
  return cleaned || fallback;
};

import { BrandData } from '../types';

// ── brand.json ─────────────────────────────────────────────────────────────────

export function exportBrandJson(data: BrandData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `brand-${slugify(data.name)}.json`);
}

// ── tokens.json ────────────────────────────────────────────────────────────────

export function exportTokensJson(data: BrandData): void {
  const tokens = buildTokens(data);
  const json = JSON.stringify(tokens, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `tokens-${slugify(data.name)}.json`);
}

function buildTokens(data: BrandData) {
  // Spacing tokens
  const spacingScale = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];
  const spacing: Record<string, string> = {};
  spacingScale.forEach((v) => {
    spacing[String(v)] = `${v}px`;
  });

  // Color tokens
  const colors: Record<string, string> = {};
  data.palette.forEach((c) => {
    colors[c.name.toLowerCase().replace(/\s+/g, '-')] = c.hex;
  });
  data.neutrals.forEach((n) => {
    colors[`neutral-${n.label}`] = n.hex;
  });

  // Typography tokens
  const typography: Record<string, object> = {};
  data.typeStyles.forEach((ts) => {
    typography[ts.styleName.toLowerCase()] = {
      fontFamily: ts.fontFamily,
      fontSize: `${ts.size}px`,
      fontWeight: ts.weight,
      lineHeight: ts.lineHeight,
      letterSpacing: `${ts.tracking}em`,
    };
  });

  // Radius tokens
  const radius: Record<string, string> = {
    none: '0px',
    sm: `${Math.round(data.cornerRadius * 0.5)}px`,
    md: `${data.cornerRadius}px`,
    lg: `${data.cornerRadius * 2}px`,
    full: '9999px',
  };

  return {
    meta: {
      brand: data.name,
      version: data.version,
      generatedAt: new Date().toISOString(),
      generator: 'UnbsID — Brand Identity Builder',
    },
    colors,
    spacing,
    typography,
    radius,
    icons: {
      style: data.iconStyle.style,
      size: `${data.iconStyle.defaultSize}px`,
      strokeWidth: `${data.iconStyle.strokeWidth}px`,
      cornerStyle: data.iconStyle.cornerStyle,
    },
  };
}

// ── PDF Print ─────────────────────────────────────────────────────────────────

export function exportPdf(): void {
  window.print();
}

// ── CSS de print injetado ─────────────────────────────────────────────────────

export function injectPrintStyles(): void {
  const existingStyle = document.getElementById('unbsid-print-styles');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'unbsid-print-styles';
  style.textContent = `
    @media print {
      body > * { display: none !important; }
      body > #unbsid-print-root { display: block !important; }
      
      .unbsid-slide {
        page-break-after: always;
        break-after: page;
        width: 297mm;
        height: 210mm;
        overflow: hidden;
      }
      
      @page {
        size: A4 landscape;
        margin: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

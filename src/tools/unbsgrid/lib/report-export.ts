/**
 * Relatório do diagnóstico em Markdown, JSON e PDF.
 *
 * O PDF reaproveita `projectToPDF` de `lib/export-engine.ts` (somente
 * leitura): o relatório é montado como um projeto paper de `PointText` numa
 * página A4 e serializado pelo mesmo escritor usado pelos exports de cena.
 * Assim não há segunda implementação de PDF no projeto.
 *
 * Os três formatos saem do MESMO objeto `LogoDiagnosis`, sem recalcular nada.
 */
import paper from 'paper';
import { projectToPDF, downloadBlob, downloadText } from './export-engine';
import { CRITERION_LABELS, fmt, levelLabel, type LogoDiagnosis, type CriterionScore } from './diagnosis';
import { activeT } from '../i18n/runtime';
import { fill, type FillVars } from '../i18n/format';
import type { Translations } from '../i18n/types';

/** A report line in the active language. */
const tr = (key: keyof Translations['report'], vars?: FillVars): string => fill(activeT().report[key], vars);
import type { GeometrySuggestion } from './suggest';

export interface ReportMeta {
  /** Nome do arquivo de origem, mostrado no cabeçalho. */
  fileName?: string;
  /** Título do relatório (padrão "Diagnóstico do logo"). */
  title?: string;
  /** Data de geração. Padrão: agora. Passe uma data fixa para testes. */
  date?: Date;
  /** Sugestões a incluir na seção final. */
  suggestions?: GeometrySuggestion[];
}

/** Versão do formato do relatório (aparece no JSON). */
export const REPORT_FORMAT_VERSION = 1;

/** Default title, in the active language. */
const defaultTitle = () => tr('title');

function formatDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()} ${h}:${min}`;
}

/** Nome de arquivo seguro (sem acento, espaço ou separador de caminho). */
export function reportFileName(meta: ReportMeta | undefined, extension: string): string {
  const base = (meta?.fileName || 'logo')
    .replace(/\.[a-z0-9]+$/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'logo';
  return `${base}-diagnostico.${extension}`;
}



// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function criterionLines(c: CriterionScore): string[] {
  const lines: string[] = [];
  lines.push(`### ${tr('criterionHeading', { label: c.label, score: c.score, weight: fmt(c.weight, 2), level: levelLabel(c.level) })}`);
  lines.push('');
  lines.push(c.applicable ? c.summary : tr('criterionSkipped', { summary: c.summary }));
  lines.push('');
  if (c.details.length) {
    lines.push(tr('tableMeasure'));
    lines.push('| --- | --- |');
    for (const d of c.details) lines.push(`| ${d.label} | ${d.value} |`);
    lines.push('');
  }
  if (c.issues.length) {
    lines.push(tr('issues'));
    lines.push('');
    for (const i of c.issues) lines.push(`- ${i}`);
    lines.push('');
  }
  return lines;
}

export function diagnosisToMarkdown(diagnosis: LogoDiagnosis, meta: ReportMeta = {}): string {
  const title = meta.title || defaultTitle();
  const date = formatDate(meta.date ?? new Date());
  const suggestions = meta.suggestions ?? [];
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`${tr('file', { name: meta.fileName || '—' })}  `);
  lines.push(tr('generatedAt', { date }));
  lines.push('');

  if (!diagnosis?.ok) {
    lines.push(tr('cannotDiagnose', { reason: diagnosis?.reason || tr('noDrawing') }));
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`## ${tr('overall', { score: diagnosis.overall.score, label: diagnosis.overall.label })}`);
  lines.push('');
  lines.push(diagnosis.overall.summary);
  lines.push('');

  lines.push(tr('tableHead'));
  lines.push('| --- | ---: | ---: | --- |');
  for (const c of diagnosis.criteria) {
    lines.push(`| ${c.label} | ${c.applicable ? c.score : '—'} | ${fmt(c.weight, 2)} | ${c.applicable ? levelLabel(c.level) : activeT().diagnosis.notApplicable} |`);
  }
  lines.push('');

  lines.push(`## ${tr('criteria')}`);
  lines.push('');
  for (const c of diagnosis.criteria) lines.push(...criterionLines(c));

  if (suggestions.length) {
    lines.push(`## ${tr('suggestions')}`);
    lines.push('');
    for (const s of suggestions) {
      lines.push(`- **${s.label}** (${CRITERION_LABELS[s.criterion]}): ${s.reason}`);
      lines.push(`  - ${tr('constructions', { list: `\`${s.keys.join('`, `')}\`` })}`);
    }
    lines.push('');
  }

  if (diagnosis.hygiene.warnings.length) {
    lines.push(`## ${tr('fileWarnings')}`);
    lines.push('');
    for (const w of diagnosis.hygiene.warnings) lines.push(`- ${w}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export interface DiagnosisReportJSON {
  formatVersion: number;
  tool: 'unbsgrid';
  title: string;
  fileName: string | null;
  generatedAt: string;
  diagnosis: LogoDiagnosis;
  suggestions: GeometrySuggestion[];
}

export function diagnosisToJSONObject(diagnosis: LogoDiagnosis, meta: ReportMeta = {}): DiagnosisReportJSON {
  const date = meta.date ?? new Date();
  return {
    formatVersion: REPORT_FORMAT_VERSION,
    tool: 'unbsgrid',
    title: meta.title || defaultTitle(),
    fileName: meta.fileName ?? null,
    generatedAt: Number.isNaN(date.getTime()) ? '' : date.toISOString(),
    diagnosis,
    suggestions: meta.suggestions ?? [],
  };
}

export function diagnosisToJSON(diagnosis: LogoDiagnosis, meta: ReportMeta = {}): string {
  return JSON.stringify(diagnosisToJSONObject(diagnosis, meta), null, 2);
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

/** A4 em pontos (1 px = 1 pt em `projectToPDF`). */
const PAGE_WIDTH = 595.28;
const PAGE_MIN_HEIGHT = 841.89;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/** `projectToPDF` estima a largura de um caractere em 0,55 × corpo (Helvetica). */
const CHAR_WIDTH_RATIO = 0.55;

type LineStyle = 'title' | 'subtitle' | 'section' | 'criterion' | 'body' | 'muted' | 'rule' | 'gap';

interface ReportLine { style: LineStyle; text: string }

const STYLE: Record<LineStyle, { size: number; bold: boolean; gray: number; lead: number; before: number }> = {
  title: { size: 18, bold: true, gray: 0.1, lead: 22, before: 0 },
  subtitle: { size: 10, bold: false, gray: 0.45, lead: 14, before: 2 },
  section: { size: 12, bold: true, gray: 0.1, lead: 16, before: 14 },
  criterion: { size: 10.5, bold: true, gray: 0.1, lead: 14, before: 10 },
  body: { size: 9, bold: false, gray: 0.2, lead: 12, before: 0 },
  muted: { size: 8.5, bold: false, gray: 0.45, lead: 11, before: 0 },
  rule: { size: 0, bold: false, gray: 0.8, lead: 8, before: 4 },
  gap: { size: 0, bold: false, gray: 0, lead: 6, before: 0 },
};

/** Quebra o texto em linhas que cabem na largura útil, sem cortar palavras. */
export function wrapText(text: string, size: number, width = CONTENT_WIDTH): string[] {
  const max = Math.max(8, Math.floor(width / (size * CHAR_WIDTH_RATIO)));
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    if (!line) { line = w; continue; }
    if (line.length + 1 + w.length <= max) line += ` ${w}`;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}

function buildLines(diagnosis: LogoDiagnosis, meta: ReportMeta): ReportLine[] {
  const lines: ReportLine[] = [];
  const push = (style: LineStyle, text = '') => lines.push({ style, text });
  const wrapped = (style: LineStyle, text: string) => {
    for (const l of wrapText(text, STYLE[style].size)) push(style, l);
  };

  push('title', meta.title || defaultTitle());
  push('subtitle', `${meta.fileName || tr('noName')} · ${formatDate(meta.date ?? new Date())}`);
  push('rule');

  if (!diagnosis?.ok) {
    wrapped('body', tr('cannotDiagnose', { reason: diagnosis?.reason || tr('noDrawing') }));
    return lines;
  }

  push('section', tr('overall', { score: diagnosis.overall.score, label: diagnosis.overall.label }));
  wrapped('body', diagnosis.overall.summary);

  push('section', tr('criteria'));
  for (const c of diagnosis.criteria) {
    push('criterion', tr('criterionPdf', { label: c.label, score: c.applicable ? `${c.score}/100` : activeT().diagnosis.notApplicable, weight: fmt(c.weight, 2) }));
    wrapped('body', c.summary);
    for (const d of c.details) wrapped('muted', `${d.label}: ${d.value}`);
    for (const i of c.issues) wrapped('body', `- ${i}`);
  }

  const suggestions = meta.suggestions ?? [];
  if (suggestions.length) {
    push('section', tr('suggestions'));
    for (const s of suggestions) {
      push('criterion', s.label);
      wrapped('body', s.reason);
      wrapped('muted', tr('constructions', { list: s.keys.join(', ') }));
    }
  }

  if (diagnosis.hygiene.warnings.length) {
    push('section', tr('fileWarnings'));
    for (const w of diagnosis.hygiene.warnings) wrapped('muted', `- ${w}`);
  }

  return lines;
}

let reportScope: paper.PaperScope | null = null;

/**
 * Serializa o relatório como PDF vetorial.
 *
 * `projectToPDF` escreve uma página só, então a página cresce em altura
 * quando o relatório passa de um A4 (largura fixa de A4, altura sob demanda).
 * É preferível a cortar conteúdo ou a reimplementar paginação num segundo
 * escritor de PDF.
 */
export function diagnosisToPDFBytes(diagnosis: LogoDiagnosis, meta: ReportMeta = {}): Uint8Array {
  const lines = buildLines(diagnosis, meta);

  if (!reportScope) {
    reportScope = new paper.PaperScope();
    reportScope.setup(new reportScope.Size(PAGE_WIDTH, PAGE_MIN_HEIGHT));
  }
  const scope = reportScope;
  scope.activate();
  try {
    scope.project.clear();

    let y = MARGIN;
    const rules: Array<{ y: number; gray: number }> = [];
    for (const line of lines) {
      const st = STYLE[line.style];
      y += st.before;
      if (line.style === 'rule') {
        rules.push({ y, gray: st.gray });
        y += st.lead;
        continue;
      }
      if (line.style === 'gap' || !line.text) { y += st.lead; continue; }
      y += st.size;
      const text = new paper.PointText({
        point: [MARGIN, y],
        content: line.text,
        fontFamily: 'Helvetica',
        fontWeight: st.bold ? 'bold' : 'normal',
        fontSize: st.size,
        fillColor: new paper.Color(st.gray),
        justification: 'left',
      });
      scope.project.activeLayer.addChild(text);
      y += st.lead - st.size;
    }
    const pageHeight = Math.max(PAGE_MIN_HEIGHT, y + MARGIN);

    for (const r of rules) {
      const line = new paper.Path.Line({
        from: [MARGIN, r.y],
        to: [PAGE_WIDTH - MARGIN, r.y],
        strokeColor: new paper.Color(r.gray),
        strokeWidth: 0.5,
      });
      scope.project.activeLayer.addChild(line);
    }

    const bounds = new paper.Rectangle(0, 0, PAGE_WIDTH, pageHeight);
    return projectToPDF(scope.project, bounds, { title: meta.title || defaultTitle() });
  } finally {
    scope.project.clear();
    paper.activate();
  }
}

export function diagnosisToPDFBlob(diagnosis: LogoDiagnosis, meta: ReportMeta = {}): Blob {
  return new Blob([diagnosisToPDFBytes(diagnosis, meta)], { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export type ReportFormat = 'markdown' | 'json' | 'pdf';

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  pdf: 'PDF',
};

/** Baixa o relatório no formato pedido. Devolve o nome do arquivo gerado. */
export function downloadDiagnosisReport(
  diagnosis: LogoDiagnosis,
  format: ReportFormat,
  meta: ReportMeta = {},
): string {
  if (format === 'json') {
    const name = reportFileName(meta, 'json');
    downloadText(diagnosisToJSON(diagnosis, meta), name, 'application/json');
    return name;
  }
  if (format === 'pdf') {
    const name = reportFileName(meta, 'pdf');
    downloadBlob(diagnosisToPDFBlob(diagnosis, meta), name);
    return name;
  }
  const name = reportFileName(meta, 'md');
  downloadText(diagnosisToMarkdown(diagnosis, meta), name, 'text/markdown');
  return name;
}

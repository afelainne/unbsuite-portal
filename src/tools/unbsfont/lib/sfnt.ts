/**
 * Escrita de tabelas OpenType que as bibliotecas não fazem: kerning em GPOS
 * (PairPos por classes, o formato das fontes profissionais) e na tabela `kern`
 * antiga, mais pequenos acertos de métrica no binário. O arquivo é remontado
 * com somas de verificação novas.
 */

export interface SfntTable { tag: string; data: Uint8Array }

export function readSfnt(buffer: ArrayBuffer): { version: number; tables: SfntTable[] } {
  const view = new DataView(buffer);
  const version = view.getUint32(0);
  const numTables = view.getUint16(4);
  const tables: SfntTable[] = [];
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(view.getUint8(rec), view.getUint8(rec + 1), view.getUint8(rec + 2), view.getUint8(rec + 3));
    const offset = view.getUint32(rec + 8);
    const length = view.getUint32(rec + 12);
    tables.push({ tag, data: new Uint8Array(buffer.slice(offset, offset + length)) });
  }
  return { version, tables };
}

function checksum(bytes: Uint8Array): number {
  let sum = 0;
  const padded = bytes.length % 4 ? new Uint8Array(bytes.length + (4 - (bytes.length % 4))) : bytes;
  if (padded !== bytes) padded.set(bytes);
  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  for (let i = 0; i < padded.length; i += 4) sum = (sum + view.getUint32(i)) >>> 0;
  return sum;
}

export function writeSfnt(version: number, input: SfntTable[]): ArrayBuffer {
  const tables = [...input].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const head = tables.find(t => t.tag === 'head');
  if (head) new DataView(head.data.buffer, head.data.byteOffset).setUint32(8, 0);
  const n = tables.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) { pow *= 2; log++; }
  const headerSize = 12 + n * 16;
  let size = headerSize;
  const offsets = tables.map(t => {
    const o = size;
    size += (t.data.length + 3) & ~3;
    return o;
  });
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, version);
  view.setUint16(4, n);
  view.setUint16(6, pow * 16);
  view.setUint16(8, log);
  view.setUint16(10, n * 16 - pow * 16);
  tables.forEach((t, i) => {
    const rec = 12 + i * 16;
    for (let c = 0; c < 4; c++) view.setUint8(rec + c, t.tag.charCodeAt(c));
    view.setUint32(rec + 4, checksum(t.data));
    view.setUint32(rec + 8, offsets[i]);
    view.setUint32(rec + 12, t.data.length);
    out.set(t.data, offsets[i]);
  });
  if (head) {
    const adjust = (0xb1b0afba - checksum(out)) >>> 0;
    const headOffset = offsets[tables.indexOf(head)];
    view.setUint32(headOffset + 8, adjust);
  }
  return out.buffer;
}

/* ---------------------------------------------------------- escritor binário */

class Writer {
  bytes: number[] = [];
  u16(v: number) { this.bytes.push((v >> 8) & 255, v & 255); return this; }
  i16(v: number) { return this.u16(v < 0 ? v + 65536 : v); }
  u32(v: number) { this.u16((v >>> 16) & 0xffff); return this.u16(v & 0xffff); }
  tag(t: string) { for (let i = 0; i < 4; i++) this.bytes.push(t.charCodeAt(i)); return this; }
  append(b: number[]) { for (const x of b) this.bytes.push(x); return this; }
  get length() { return this.bytes.length; }
  set16(at: number, v: number) { this.bytes[at] = (v >> 8) & 255; this.bytes[at + 1] = v & 255; }
  set32(at: number, v: number) { this.set16(at, (v >>> 16) & 0xffff); this.set16(at + 2, v & 0xffff); }
}

function coverage(glyphs: number[]): number[] {
  const w = new Writer().u16(1).u16(glyphs.length);
  for (const g of glyphs) w.u16(g);
  return w.bytes;
}

function classDef(map: Map<number, number>): number[] {
  const entries = [...map.entries()].filter(([, c]) => c > 0).sort((a, b) => a[0] - b[0]);
  const ranges: [number, number, number][] = [];
  for (const [g, c] of entries) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === g - 1 && last[2] === c) last[1] = g;
    else ranges.push([g, g, c]);
  }
  const w = new Writer().u16(2).u16(ranges.length);
  for (const [s, e, c] of ranges) w.u16(s).u16(e).u16(c);
  return w.bytes;
}

/** Um subtable PairPos formato 2 (classes), só com XAdvance no primeiro glifo. */
function pairPosFormat2(firstClasses: number[][], secondClassOf: Map<number, number>, secondCount: number, values: (c1: number, c2: number) => number): number[] {
  const class1 = new Map<number, number>();
  firstClasses.forEach((gl, i) => gl.forEach(g => class1.set(g, i + 1)));
  const cov = coverage([...class1.keys()].sort((a, b) => a - b));
  const cd1 = classDef(class1);
  const cd2 = classDef(secondClassOf);
  const class1Count = firstClasses.length + 1;
  const class2Count = secondCount + 1;
  const headerSize = 16;
  const matrixSize = class1Count * class2Count * 2;
  const w = new Writer();
  w.u16(2)
    .u16(headerSize + matrixSize)
    .u16(0x0004)
    .u16(0)
    .u16(headerSize + matrixSize + cov.length)
    .u16(headerSize + matrixSize + cov.length + cd1.length)
    .u16(class1Count)
    .u16(class2Count);
  for (let c1 = 0; c1 < class1Count; c1++) for (let c2 = 0; c2 < class2Count; c2++) w.i16(c1 && c2 ? values(c1 - 1, c2 - 1) : 0);
  w.append(cov).append(cd1).append(cd2);
  return w.bytes;
}

export interface ClassKerning {
  /** Classes do primeiro glifo (lado direito), como listas de índices de glifo. */
  left: number[][];
  /** Classes do segundo glifo (lado esquerdo). */
  right: number[][];
  /** Valor para (classe esquerda, classe direita). */
  value: (l: number, r: number) => number;
}

/** Tabela GPOS com a feature `kern` (DFLT e latn) apontando para um lookup de pares por classe. */
export function buildGpos(k: ClassKerning): Uint8Array {
  const secondClassOf = new Map<number, number>();
  k.right.forEach((gl, i) => gl.forEach(g => secondClassOf.set(g, i + 1)));
  // Linhas com algum valor; as vazias ficam fora.
  const rows = k.left.map((gl, i) => ({ gl, i })).filter(({ i }) => k.right.some((_, j) => k.value(i, j) !== 0));
  const rowBytes = (k.right.length + 1) * 2;
  const maxRows = Math.max(1, Math.floor(30000 / rowBytes));
  const subtables: number[][] = [];
  for (let s = 0; s < rows.length; s += maxRows) {
    const chunk = rows.slice(s, s + maxRows);
    subtables.push(pairPosFormat2(chunk.map(r => r.gl), secondClassOf, k.right.length, (c1, c2) => k.value(chunk[c1].i, c2)));
  }
  const useExtension = subtables.reduce((a, b) => a + b.length, 0) > 60000;

  const w = new Writer();
  w.u16(1).u16(0).u16(0).u16(0).u16(0); // versão 1.0 e três offsets
  // ScriptList
  const scriptList = w.length;
  w.set16(4, scriptList);
  const scripts = ['DFLT', 'latn'];
  w.u16(scripts.length);
  const scriptRecs = scripts.map(tag => { w.tag(tag); const at = w.length; w.u16(0); return at; });
  scripts.forEach((_, i) => {
    w.set16(scriptRecs[i], w.length - scriptList);
    w.u16(4).u16(0); // defaultLangSys em +4, sem outros idiomas
    w.u16(0).u16(0xffff).u16(1).u16(0); // LangSys: sem feature obrigatória, 1 feature (índice 0)
  });
  // FeatureList
  const featureList = w.length;
  w.set16(6, featureList);
  w.u16(1).tag('kern').u16(8);
  w.u16(0).u16(1).u16(0);
  // LookupList
  const lookupList = w.length;
  w.set16(8, lookupList);
  w.u16(1).u16(4);
  const lookup = w.length;
  w.u16(useExtension ? 9 : 2).u16(0).u16(subtables.length);
  const subOffsets = subtables.map(() => { const at = w.length; w.u16(0); return at; });
  if (useExtension) {
    const extAt = subtables.map((_, i) => {
      w.set16(subOffsets[i], w.length - lookup);
      const at = w.length;
      w.u16(1).u16(2).u32(0);
      return at;
    });
    subtables.forEach((st, i) => {
      w.set32(extAt[i] + 4, w.length - extAt[i]);
      w.append(st);
    });
  } else {
    subtables.forEach((st, i) => {
      w.set16(subOffsets[i], w.length - lookup);
      w.append(st);
    });
  }
  return new Uint8Array(w.bytes);
}

/** Tabela `kern` antiga (formato 0), para programas que não leem GPOS. Até 10.920 pares. */
export function buildKern(pairs: [number, number, number][]): Uint8Array {
  const list = [...pairs]
    .filter(p => p[2] !== 0)
    .sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]))
    .slice(0, 10920)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const n = list.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) { pow *= 2; log++; }
  const w = new Writer();
  w.u16(0).u16(1); // versão 0, uma subtabela
  w.u16(0).u16(14 + n * 6).u16(0x0001); // formato 0, horizontal
  w.u16(n).u16(pow * 6).u16(log).u16(n * 6 - pow * 6);
  for (const [l, r, v] of list) w.u16(l).u16(r).i16(v);
  return new Uint8Array(w.bytes);
}

/** Troca ou acrescenta tabelas e ajusta campos de métrica. */
export function patchFont(
  buffer: ArrayBuffer,
  extra: SfntTable[],
  fields: { lineGap?: number; macStyle?: number },
): ArrayBuffer {
  const { version, tables } = readSfnt(buffer);
  const tags = new Set(extra.map(t => t.tag));
  const out = tables.filter(t => !tags.has(t.tag)).concat(extra);
  for (const t of out) {
    const v = new DataView(t.data.buffer, t.data.byteOffset, t.data.byteLength);
    if (t.tag === 'hhea' && fields.lineGap !== undefined) v.setInt16(8, fields.lineGap);
    if (t.tag === 'head' && fields.macStyle !== undefined) v.setUint16(44, fields.macStyle);
  }
  return writeSfnt(version, out);
}

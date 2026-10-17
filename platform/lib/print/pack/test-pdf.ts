// Reading the text of a PDF the sheet renderer made, for tests: the standard fonts write every
// shown string as hex in a TJ array of the page's deflated content stream, so no PDF text library is
// needed. Not used outside tests.
import * as zlib from 'node:zlib';

// WinAnsi bytes 0x80-0x9F that differ from Latin-1.
const WIN_ANSI: Record<number, string> = { 0x80: '€', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—' };

/** The data of every stream in the file. Each is cut at the /Length its dictionary gives (pdfkit writes it as a number), so
 * deflated data that happens to end in a carriage return or a line feed (about one page in 256) is read whole: the
 * end-of-line before `endstream` would otherwise take that byte and the page's text would be lost. A stream whose length is
 * not a plain number ends at the line break before `endstream`, as before. */
function streamData(raw: string): string[] {
  const out: string[] = [];
  // 'stream' as a word: never the end of 'endstream'
  const start = /\bstream(\r\n|\n)/g;
  for (let m = start.exec(raw); m; m = start.exec(raw)) {
    const begin = m.index + m[0].length;
    const objectStart = raw.lastIndexOf(' obj', m.index);
    const dictionary = raw.slice(Math.max(0, objectStart), m.index);
    const length = /\/Length\s+(\d+)\b(?!\s+\d+\s+R\b)/.exec(dictionary);
    let end = length ? begin + Number(length[1]) : -1;
    if (end < begin || end > raw.length || !/^\s*endstream/.test(raw.slice(end, end + 32))) {
      const close = /\r?\nendstream/.exec(raw.slice(begin));
      end = close ? begin + close.index : -1;
    }
    if (end < begin) break;
    out.push(raw.slice(begin, end));
    start.lastIndex = end;
  }
  return out;
}

/** Every line of text drawn in the PDF, rebuilt from the TJ arrays. */
export function pdfLines(pdf: Buffer): string[] {
  const raw = pdf.toString('latin1');
  const lines: string[] = [];
  for (const data of streamData(raw)) {
    let content: string;
    try {
      content = zlib.inflateSync(Buffer.from(data, 'latin1')).toString('latin1');
    } catch {
      continue;
    }
    const arrays = /\[((?:<[0-9a-fA-F]*>|\s|-?\d+(?:\.\d+)?)*)\]\s*TJ/g;
    for (let a = arrays.exec(content); a; a = arrays.exec(content)) {
      let text = '';
      for (const hex of a[1].match(/<([0-9a-fA-F]*)>/g) ?? []) {
        const bytes = Buffer.from(hex.slice(1, -1), 'hex');
        for (const b of bytes) text += WIN_ANSI[b] ?? String.fromCharCode(b);
      }
      lines.push(text);
    }
  }
  return lines;
}

/** Whether the sheet shows a phrase, even when pdfkit wrapped it over lines (at a space, or at a
 * hyphen inside a long file name). */
export function shows(lines: string[], phrase: string): boolean {
  if (lines.join(' ').includes(phrase)) return true;
  return lines.join('').replace(/\s+/g, '').includes(phrase.replace(/\s+/g, ''));
}

// Reading the text of a PDF the sheet renderer made, for tests: the standard fonts write every
// shown string as hex in a TJ array of the page's deflated content stream, so no PDF text library is
// needed. Not used outside tests.
import * as zlib from 'node:zlib';

// WinAnsi bytes 0x80-0x9F that differ from Latin-1.
const WIN_ANSI: Record<number, string> = { 0x80: '€', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x96: '–', 0x97: '—' };

/** Every line of text drawn in the PDF, rebuilt from the TJ arrays. */
export function pdfLines(pdf: Buffer): string[] {
  const raw = pdf.toString('latin1');
  const lines: string[] = [];
  const streams = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (let m = streams.exec(raw); m; m = streams.exec(raw)) {
    let content: string;
    try {
      content = zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
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

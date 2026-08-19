const WINANSI_REPLACEMENTS: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...',
};

export function sanitizeWinAnsi(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    // Drop control characters except tab, line feed, and carriage return.
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      continue;
    }
    if (code > 255) {
      out += WINANSI_REPLACEMENTS[char] ?? ' ';
      continue;
    }
    out += char;
  }
  return out;
}

/**
 * Mappings from common Unicode punctuation to their WinAnsi equivalents.
 * These characters have code points above 255 and would otherwise be replaced
 * with a space.
 */
const WINANSI_REPLACEMENTS: Record<string, string> = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...',
};

/** First printable ASCII / WinAnsi code point. */
const PRINTABLE_ASCII_START = 32;

/** Tab control code. */
const TAB_CODE = 9;

/** Line feed control code. */
const LINE_FEED_CODE = 10;

/** Carriage return control code. */
const CARRIAGE_RETURN_CODE = 13;

/** Highest code point supported by WinAnsi (8-bit). */
const WINANSI_MAX_CODE_POINT = 255;

/** Control codes that are preserved in sanitized output. */
const ALLOWED_CONTROL_CODES = new Set([TAB_CODE, LINE_FEED_CODE, CARRIAGE_RETURN_CODE]);

/**
 * Sanitizes a string so that it can be safely drawn by `pdf-lib`'s standard
 * WinAnsi fonts.
 *
 * - Drops C0 control characters (0..31) except tab, line feed, and carriage
 *   return.
 * - Replaces known Unicode punctuation with their WinAnsi equivalents.
 * - Replaces any remaining code point above 255 with a single space.
 *
 * @param text - The string to sanitize.
 * @returns The sanitized string.
 */
export function sanitizeWinAnsi(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < PRINTABLE_ASCII_START && !ALLOWED_CONTROL_CODES.has(code)) {
      continue;
    }
    if (code > WINANSI_MAX_CODE_POINT) {
      out += WINANSI_REPLACEMENTS[char] ?? ' ';
      continue;
    }
    out += char;
  }
  return out;
}

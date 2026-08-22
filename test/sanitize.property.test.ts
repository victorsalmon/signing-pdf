import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizeWinAnsi } from '../src/index.js';

/**
 * Property tests for sanitizeWinAnsi.
 *
 * These assert the documented invariants of the sanitizer over randomly
 * generated Unicode input. They are deliberately stronger than the example
 * tests in sanitize.test.ts so that mutation testing can prove the
 * implementation is not accidentally weakened.
 */
describe('sanitizeWinAnsi — property tests', () => {
  it('is idempotent: sanitize(sanitize(s)) === sanitize(s) for every string', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(sanitizeWinAnsi(sanitizeWinAnsi(s))).toBe(sanitizeWinAnsi(s));
      }),
    );
  });

  it('never emits a character whose UTF-16 code unit exceeds 255', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeWinAnsi(s);
        for (const char of out) {
          expect(char.charCodeAt(0)).toBeLessThanOrEqual(255);
        }
      }),
    );
  });

  it('drops every control character except tab (9), lf (10), and cr (13)', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeWinAnsi(s);
        for (const char of out) {
          const code = char.charCodeAt(0);
          if (code < 32) {
            expect([9, 10, 13]).toContain(code);
          }
        }
      }),
    );
  });

  it('preserves the count of tab, line-feed, and carriage-return characters', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeWinAnsi(s);
        const countIn = (c: string) => [...s].filter((x) => x === c).length;
        const countOut = (c: string) => [...out].filter((x) => x === c).length;
        for (const c of ['\t', '\n', '\r']) {
          expect(countOut(c)).toBe(countIn(c));
        }
      }),
    );
  });

  it('preserves every win-ansi-range character (32..255) verbatim', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeWinAnsi(s);
        for (let code = 32; code <= 255; code++) {
          const c = String.fromCharCode(code);
          const inCount = [...s].filter((x) => x === c).length;
          const outCount = [...out].filter((x) => x === c).length;
          expect(outCount).toBe(inCount);
        }
      }),
    );
  });

  it('preserves each individual win-ansi character (32..255) as itself', () => {
    fc.assert(
      fc.property(fc.integer({ min: 32, max: 255 }), (code) => {
        const c = String.fromCharCode(code);
        expect(sanitizeWinAnsi(c)).toBe(c);
      }),
    );
  });

  it('treats the 255/256 boundary exactly: 255 is preserved, 256 becomes a space', () => {
    // Deterministic boundary cases — fast-check sampling does not guarantee
    // code point 255 is generated, so pin it explicitly to kill `>` vs `>=`
    // mutations on the high-code branch.
    expect(sanitizeWinAnsi(String.fromCharCode(255))).toBe(String.fromCharCode(255));
    expect(sanitizeWinAnsi(String.fromCharCode(256))).toBe(' ');
  });

  it('maps the known unicode punctuation to its win-ansi replacement', () => {
    const cases: Array<[string, string]> = [
      ['\u2018', "'"],
      ['\u2019', "'"],
      ['\u201C', '"'],
      ['\u201D', '"'],
      ['\u2013', '-'],
      ['\u2014', '-'],
      ['\u2026', '...'],
    ];
    for (const [input, expected] of cases) {
      expect(sanitizeWinAnsi(input)).toBe(expected);
    }
  });

  it('replaces every unmapped character with code > 255 with a single space', () => {
    const mapped = new Set([0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014, 0x2026]);
    const unmappedHighChar = fc
      .integer({ min: 256, max: 0x10ffff })
      .filter((code) => !mapped.has(code))
      .map((code) => String.fromCodePoint(code));
    fc.assert(
      fc.property(unmappedHighChar, (char) => {
        // A surrogate-pair code point is a single for..of entry, so one input
        // character maps to exactly one space.
        expect(sanitizeWinAnsi(char)).toBe(' ');
      }),
    );
  });

  it('empty input yields empty output', () => {
    expect(sanitizeWinAnsi('')).toBe('');
  });

  it('output length never shrinks below the count of preserved win-ansi chars', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = sanitizeWinAnsi(s);
        let preserved = 0;
        for (const char of s) {
          const code = char.charCodeAt(0);
          if (code >= 32 && code <= 255) preserved++;
          if (code === 9 || code === 10 || code === 13) preserved++;
        }
        expect(out.length).toBeGreaterThanOrEqual(preserved);
      }),
    );
  });
});

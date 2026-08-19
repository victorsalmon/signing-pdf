import { describe, it, expect } from 'vitest';
import { sanitizeWinAnsi } from '../src/index.js';

describe('sanitizeWinAnsi', () => {
  it('converts common unicode punctuation to win-ansi equivalents', () => {
    const input = '“Smart” quotes ’n’ dashes—ellipsis…';
    expect(sanitizeWinAnsi(input)).toBe('"Smart" quotes \'n\' dashes-ellipsis...');
  });

  it('removes control characters except tab, lf, cr', () => {
    const input = 'a\x00b\x01c\td\ne\rf';
    expect(sanitizeWinAnsi(input)).toBe('abc\td\ne\rf');
  });

  it('replaces unknown high unicode characters with a space', () => {
    expect(sanitizeWinAnsi('café 🍵')).toBe('café  ');
  });
});

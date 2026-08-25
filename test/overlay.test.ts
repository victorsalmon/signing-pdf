import { describe, it, expect, vi } from 'vitest';
import { embedFieldValues, embedSignatureImage, finalizeSignedPdf, loadPdf, StandardFonts } from '../src/index.js';
import { createBlankPdf, ONE_PIXEL_PNG } from './fixtures.js';

describe('embedFieldValues', () => {
  it('draws provided values onto the PDF', async () => {
    const pdf = await createBlankPdf();
    await embedFieldValues(pdf, [
      { key: 'name', page: 1, x: 50, y: 50, width: 200, height: 14 },
      { key: 'date', page: 1, x: 50, y: 80, width: 200, height: 14 },
    ], {
      name: 'Alice Smith',
      date: '2026-08-19',
    });

    const bytes = await finalizeSignedPdf(pdf);
    const reloaded = await loadPdf(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('skips undefined and null values', async () => {
    const pdf = await createBlankPdf();
    await embedFieldValues(pdf, [{ key: 'empty', page: 1, x: 50, y: 50 }], { empty: undefined });
    const bytes = await finalizeSignedPdf(pdf);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('rejects a page number of 0', async () => {
    const pdf = await createBlankPdf();
    await expect(
      embedFieldValues(pdf, [{ key: 'k', page: 0, x: 10, y: 10 }], { k: 'x' }),
    ).rejects.toThrow(/Page 0 does not exist in PDF/);
  });

  it('uses the custom font from options', async () => {
    const pdf = await createBlankPdf();
    const page = pdf.getPage(0);
    const draws: Array<{ text: string; opts: Record<string, unknown> }> = [];
    page.drawText = vi.fn((text: string, opts: Record<string, unknown>) => {
      draws.push({ text, opts });
    }) as unknown as typeof page.drawText;

    const customFont = await pdf.embedFont(StandardFonts.TimesRoman);
    await embedFieldValues(
      pdf,
      [{ key: 'k', page: 1, x: 10, y: 10, width: 100, height: 14 }],
      { k: 'hello' },
      { font: customFont },
    );

    expect(draws).toHaveLength(1);
    expect(draws[0].text).toBe('hello');
    expect(draws[0].opts.font).toBe(customFont);
  });
});

describe('embedSignatureImage', () => {
  it('embeds a PNG signature image', async () => {
    const pdf = await createBlankPdf();
    await embedSignatureImage(pdf, ONE_PIXEL_PNG, {
      page: 1,
      x: 100,
      y: 100,
      width: 50,
      height: 20,
    });
    const bytes = await finalizeSignedPdf(pdf);
    const reloaded = await loadPdf(bytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('rejects non-PNG / invalid base64', async () => {
    const pdf = await createBlankPdf();
    await expect(
      embedSignatureImage(pdf, 'not-valid', { page: 1, x: 0, y: 0, width: 1, height: 1 })
    ).rejects.toThrow(/PNG/);
  });

  it('rejects a PNG data URI that does not start at the beginning of the string', async () => {
    const pdf = await createBlankPdf();
    const garbage = "~!@#$%^&*()_?<>[]{}|;':\"<,.";
    const dataUri = `data:image/png;base64,${ONE_PIXEL_PNG}`;
    await expect(
      embedSignatureImage(pdf, garbage + dataUri, { page: 1, x: 0, y: 0, width: 1, height: 1 }),
    ).rejects.toThrow(/PNG/);
  });

  it('rejects a PNG data URI with trailing content after the payload', async () => {
    const pdf = await createBlankPdf();
    const dataUri = `data:image/png;base64,${ONE_PIXEL_PNG}`;
    await expect(
      embedSignatureImage(pdf, `${dataUri}\nfoo`, { page: 1, x: 0, y: 0, width: 1, height: 1 }),
    ).rejects.toThrow(/PNG/);
  });
});

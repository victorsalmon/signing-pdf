import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { embedFieldValues, embedSignatureImage, finalizeSignedPdf, loadPdf } from '../src/index.js';

async function createBlankPdf(): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  return pdf;
}

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

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
});

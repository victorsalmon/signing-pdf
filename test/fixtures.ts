import { PDFDocument } from 'pdf-lib';

/** A minimal 1x1 transparent PNG, base64-encoded. */
export const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

/**
 * Creates a blank US Letter-sized PDF with the requested number of pages.
 *
 * @param pages - Number of pages to create. Defaults to 1.
 * @returns A blank PDF document.
 */
export async function createBlankPdf(pages = 1): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    pdf.addPage([612, 792]);
  }
  return pdf;
}

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

/** Default text color (black). */
export const DEFAULT_TEXT_COLOR = { r: 0, g: 0, b: 0 };

/**
 * Returns the page for a 1-indexed page number, throwing if it is out of range.
 *
 * @param pdf - The PDF document.
 * @param pageNumber - 1-indexed page number.
 * @returns The requested `pdf-lib` page.
 */
export async function getPage(pdf: PDFDocument, pageNumber: number): Promise<PDFPage> {
  const idx = pageNumber - 1;
  if (idx < 0 || idx >= pdf.getPageCount()) {
    throw new Error(`Page ${pageNumber} does not exist in PDF (page count: ${pdf.getPageCount()})`);
  }
  return pdf.getPage(idx);
}

/**
 * Converts an optional RGB triple to a `pdf-lib` RGB color.
 * Missing channels default to black.
 *
 * @param color - Optional RGB color in the range 0..1.
 * @returns A `pdf-lib` RGB color object.
 */
export function toPdfColor(color?: { r: number; g: number; b: number }) {
  return rgb(
    color?.r ?? DEFAULT_TEXT_COLOR.r,
    color?.g ?? DEFAULT_TEXT_COLOR.g,
    color?.b ?? DEFAULT_TEXT_COLOR.b,
  );
}

/**
 * Converts a top-left Y coordinate to `pdf-lib`'s bottom-left Y coordinate.
 *
 * @param page - The target PDF page.
 * @param topY - Y coordinate measured from the top of the page.
 * @param elementHeight - Height of the text box or image being placed.
 * @returns The Y coordinate ready for `pdf-lib` drawing.
 */
export function topLeftYToPdfLibY(page: PDFPage, topY: number, elementHeight: number): number {
  return page.getHeight() - topY - elementHeight;
}

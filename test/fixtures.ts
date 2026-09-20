import { PDFDocument } from 'pdf-lib';
import { PLACEHOLDER_SIGNATURE_PNG_BASE64 } from '../examples/multi-signer-common.js';

/**
 * A minimal 1x1 transparent PNG, base64-encoded.
 * Shared with the runnable examples so the literal has a single owner.
 */
export const ONE_PIXEL_PNG = PLACEHOLDER_SIGNATURE_PNG_BASE64;

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

import { PDFDocument } from 'pdf-lib';

/**
 * Saves the modified PDF document to a byte array.
 *
 * @param pdf - The `pdf-lib` document to finalize.
 * @returns A promise that resolves to the serialized PDF bytes.
 */
export async function finalizeSignedPdf(pdf: PDFDocument): Promise<Uint8Array> {
  return pdf.save();
}

import { PDFDocument } from 'pdf-lib';

/**
 * Loads a PDF document from a byte array.
 *
 * @param bytes - Raw PDF file content.
 * @returns A promise that resolves to the loaded `pdf-lib` document.
 */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}

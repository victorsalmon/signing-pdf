import { PDFDocument } from 'pdf-lib';

export async function finalizeSignedPdf(pdf: PDFDocument): Promise<Uint8Array> {
  return pdf.save();
}

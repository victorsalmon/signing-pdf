export { loadPdf } from './load.js';
export {
  embedFieldValues,
  embedSignatureImage,
  embedCertificatePage,
  type PdfOverlayField,
  type SignatureOverlay,
  type CertificateSignerEntry,
  type CertificatePageData,
} from './overlay.js';
export { finalizeSignedPdf } from './finalize.js';
export { sanitizeWinAnsi } from './sanitize.js';
export { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';

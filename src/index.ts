/**
 * Public API for `@clocklobster/signing-pdf`.
 *
 * Provides primitives for loading, overlaying field values and signatures,
 * appending certificate pages, finalizing, and sanitizing text for standard
 * WinAnsi fonts. Re-exports commonly used `pdf-lib` values for convenience.
 */

export { loadPdf } from './load.js';
export {
  embedFieldValues,
  embedSignatureImage,
  type PdfFieldType,
  type PdfOverlayField,
  type SignatureOverlay,
} from './overlay.js';
export {
  embedCertificatePage,
  type CertificateSignerEntry,
  type CertificatePageData,
} from './certificate.js';
export { finalizeSignedPdf } from './finalize.js';
export { sanitizeWinAnsi } from './sanitize.js';
export { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';

import { PDFDocument, PDFFont, PDFPage, StandardFonts } from 'pdf-lib';
import { sanitizeWinAnsi } from './sanitize.js';
import { DEFAULT_TEXT_COLOR, toPdfColor } from './pdf-drawing.js';

/** A single signer's metadata for the certificate page. */
export interface CertificateSignerEntry {
  /** Signer's display name. */
  name: string;
  /** Signer's email address. */
  email: string;
  /** Signer's role in the signing flow. */
  role: string;
  /** ISO timestamp when the signer signed. */
  signedAt: string;
  /** Optional IP address. */
  ip?: string;
  /** Optional user-agent string. */
  userAgent?: string;
}

/** Data required to render the certificate of completion page. */
export interface CertificatePageData {
  /** Title of the signed document. */
  documentTitle: string;
  /** Envelope / transaction identifier. */
  envelopeId: string;
  /** ISO timestamp when the envelope was completed. */
  completedAt: string;
  /** List of signers for the certificate. */
  signers: CertificateSignerEntry[];
  /** Document integrity hash (e.g. SHA-256). */
  integrityHash: string;
}

/** Certificate page margin (points). */
const CERTIFICATE_MARGIN = 50;

/** Certificate title font size (points). */
const CERTIFICATE_TITLE_FONT_SIZE = 18;

/** Certificate metadata line font size (points). */
const CERTIFICATE_METADATA_FONT_SIZE = 12;

/** Certificate "Signers:" header font size (points). */
const CERTIFICATE_SIGNERS_HEADER_FONT_SIZE = 14;

/** Certificate signer detail font size (points). */
const CERTIFICATE_DETAIL_FONT_SIZE = 10;

/** Vertical gap between major certificate content blocks (points). */
const CERTIFICATE_BLOCK_GAP = 10;

/** Vertical gap between signer entries (points). */
const CERTIFICATE_SIGNER_GAP = 5;

/** Multiplier used to advance the Y cursor after each certificate line. */
const CERTIFICATE_LINE_SPACING = 1.5;

/** Single line draw options used by `drawCertificateLine`. */
interface CertificateLineOptions {
  /** Target PDF page. */
  page: PDFPage;
  /** Text to draw. */
  text: string;
  /** Font size in points. */
  size: number;
  /** Font to use. */
  font: PDFFont;
  /** Current Y position (bottom-left origin). */
  lineY: number;
  /** Left and right margin in points. */
  margin: number;
  /** Total page width in points. */
  pageWidth: number;
  /** Optional text color; defaults to black. */
  color?: { r: number; g: number; b: number };
}

/**
 * Draws a single line of certificate text and returns the next line Y position.
 *
 * @param options - Line drawing options.
 * @returns The updated Y position for the following line.
 */
function drawCertificateLine({
  page,
  text,
  size,
  font,
  lineY,
  margin,
  pageWidth,
  color = DEFAULT_TEXT_COLOR,
}: CertificateLineOptions): number {
  page.drawText(text, {
    x: margin,
    y: lineY,
    size,
    font,
    color: toPdfColor(color),
    maxWidth: pageWidth - margin * 2,
  });
  return lineY - size * CERTIFICATE_LINE_SPACING;
}

/**
 * Appends a "Certificate of Completion" page with signer and integrity metadata.
 *
 * Every caller-supplied value (title, envelope ID, timestamps, signer name,
 * email, role, signed-at, IP, User-Agent, and integrity hash) is passed through
 * `sanitizeWinAnsi` before drawing, so non-WinAnsi input cannot make the
 * standard font throw during rendering.
 *
 * @param pdf - The PDF document.
 * @param data - Certificate page data.
 * @param options - Optional custom fonts.
 */
export async function embedCertificatePage(
  pdf: PDFDocument,
  data: CertificatePageData,
  options?: { font?: PDFFont; boldFont?: PDFFont },
): Promise<void> {
  const page = pdf.addPage();
  const { width, height } = page.getSize();
  const boldFont = options?.boldFont ?? (await pdf.embedFont(StandardFonts.HelveticaBold));
  const font = options?.font ?? (await pdf.embedFont(StandardFonts.Helvetica));
  let y = height - CERTIFICATE_MARGIN;

  const draw = (text: string, size: number, font: PDFFont) => {
    y = drawCertificateLine({
      page,
      text,
      size,
      font,
      lineY: y,
      margin: CERTIFICATE_MARGIN,
      pageWidth: width,
    });
  };

  draw('Certificate of Completion', CERTIFICATE_TITLE_FONT_SIZE, boldFont);
  y -= CERTIFICATE_BLOCK_GAP;
  draw(`Document: ${sanitizeWinAnsi(data.documentTitle)}`, CERTIFICATE_METADATA_FONT_SIZE, font);
  draw(`Envelope ID: ${sanitizeWinAnsi(data.envelopeId)}`, CERTIFICATE_METADATA_FONT_SIZE, font);
  draw(`Completed At: ${sanitizeWinAnsi(data.completedAt)}`, CERTIFICATE_METADATA_FONT_SIZE, font);
  y -= CERTIFICATE_BLOCK_GAP;
  draw('Signers:', CERTIFICATE_SIGNERS_HEADER_FONT_SIZE, boldFont);
  y -= CERTIFICATE_SIGNER_GAP;

  for (const signer of data.signers) {
    draw(
      `${sanitizeWinAnsi(signer.name)} <${sanitizeWinAnsi(signer.email)}> — ${sanitizeWinAnsi(signer.role)}`,
      CERTIFICATE_DETAIL_FONT_SIZE,
      font,
    );
    draw(`  Signed at: ${sanitizeWinAnsi(signer.signedAt)}`, CERTIFICATE_DETAIL_FONT_SIZE, font);
    if (signer.ip) {
      draw(`  IP: ${sanitizeWinAnsi(signer.ip)}`, CERTIFICATE_DETAIL_FONT_SIZE, font);
    }
    if (signer.userAgent) {
      draw(
        `  User-Agent: ${sanitizeWinAnsi(signer.userAgent)}`,
        CERTIFICATE_DETAIL_FONT_SIZE,
        font,
      );
    }
    y -= CERTIFICATE_SIGNER_GAP;
  }

  y -= CERTIFICATE_BLOCK_GAP;
  draw(
    `Integrity Hash (SHA-256): ${sanitizeWinAnsi(data.integrityHash)}`,
    CERTIFICATE_DETAIL_FONT_SIZE,
    font,
  );
}

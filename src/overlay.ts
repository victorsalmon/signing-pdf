import { PDFDocument, PDFPage, PDFFont, PDFImage, rgb, StandardFonts } from 'pdf-lib';
import { sanitizeWinAnsi } from './sanitize.js';

export type PdfFieldType = 'text' | 'textarea' | 'signature' | 'fillableDate' | 'variable' | 'static';

/** Field overlay definition for a single PDF form-like value. */
export interface PdfOverlayField {
  /** Key used to look up the value in the `values` record. */
  key: string;
  /** Optional field type hint for higher-level filtering or validation. */
  type?: PdfFieldType;
  /** Role that owns or fills this field. Used for per-signer filtering and variable resolution. */
  role?: string;
  /** For `variable` fields: the variable to resolve (e.g. `client-fullName`). */
  variable?: string;
  /** 1-indexed page number where the field should be drawn. */
  page: number;
  /** X coordinate in top-left origin (converted to pdf-lib's bottom-left origin internally). */
  x: number;
  /** Y coordinate in top-left origin (converted to pdf-lib's bottom-left origin internally). */
  y: number;
  /** Maximum text width in points. */
  width?: number;
  /** Text box height in points. */
  height?: number;
  /** Font size in points. */
  fontSize?: number;
  /** Text color as RGB values in the range 0..1. */
  color?: { r: number; g: number; b: number };
  /** For `fillableDate` fields: minimum allowed date (ISO string). */
  minDate?: string;
  /** For `fillableDate` fields: maximum allowed date (ISO string). */
  maxDate?: string;
  /** For `fillableDate` fields: display format string. */
  displayFormat?: string;
}

/** Overlay geometry for a PNG signature image. */
export interface SignatureOverlay {
  /** 1-indexed page number. */
  page: number;
  /** X coordinate in top-left origin. */
  x: number;
  /** Y coordinate in top-left origin. */
  y: number;
  /** Image width in points. */
  width: number;
  /** Image height in points. */
  height: number;
}

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

/** Default width for a text field when not specified (points). */
const DEFAULT_FIELD_WIDTH = 200;

/** Default height for a text field when not specified (points). */
const DEFAULT_FIELD_HEIGHT = 14;

/** Default font size for a text field when not specified (points). */
const DEFAULT_FIELD_FONT_SIZE = 10;

/** Default text color (black). */
const DEFAULT_TEXT_COLOR = { r: 0, g: 0, b: 0 };

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

/**
 * Returns the page for a 1-indexed page number, throwing if it is out of range.
 *
 * @param pdf - The PDF document.
 * @param pageNumber - 1-indexed page number.
 * @returns The requested `pdf-lib` page.
 */
async function getPage(pdf: PDFDocument, pageNumber: number): Promise<PDFPage> {
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
function toPdfColor(color?: { r: number; g: number; b: number }) {
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
function topLeftYToPdfLibY(page: PDFPage, topY: number, elementHeight: number): number {
  return page.getHeight() - topY - elementHeight;
}

/**
 * Draws sanitized text values onto a PDF at the configured coordinates.
 * Skips fields whose value is `undefined`, `null`, or empty after sanitization.
 *
 * @param pdf - The PDF document to draw on.
 * @param fields - Field definitions.
 * @param values - Record of field values keyed by field `key`.
 * @param options - Optional custom font.
 */
export async function embedFieldValues(
  pdf: PDFDocument,
  fields: PdfOverlayField[],
  values: Record<string, unknown>,
  options?: { font?: PDFFont },
): Promise<void> {
  const font = options?.font ?? (await pdf.embedFont(StandardFonts.Helvetica));
  for (const field of fields) {
    const raw = values[field.key];
    if (raw === undefined || raw === null) continue;
    const text = sanitizeWinAnsi(String(raw));
    if (text.length === 0) continue;

    const page = await getPage(pdf, field.page);
    const width = field.width ?? DEFAULT_FIELD_WIDTH;
    const height = field.height ?? DEFAULT_FIELD_HEIGHT;
    const fontSize = field.fontSize ?? DEFAULT_FIELD_FONT_SIZE;
    const x = field.x;
    const y = topLeftYToPdfLibY(page, field.y, height);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: toPdfColor(field.color),
      maxWidth: width,
    });
  }
}

/**
 * Decodes a base64-encoded PNG, accepting both raw base64 and `data:image/png;base64,...`
 * data-URI forms.
 *
 * @param imageBase64 - Base64 PNG data, with or without a data-URI prefix.
 * @returns The decoded PNG bytes.
 */
function decodeBase64Png(imageBase64: string): Uint8Array {
  const match = imageBase64.match(/^data:image\/png;base64,(.+)$/i);
  const payload = match ? match[1] : imageBase64;
  return Buffer.from(payload, 'base64');
}

/**
 * Embeds a base64-encoded PNG signature image onto a PDF page.
 *
 * @param pdf - The PDF document.
 * @param imageBase64 - Base64 PNG data.
 * @param overlay - Image placement geometry.
 */
export async function embedSignatureImage(
  pdf: PDFDocument,
  imageBase64: string,
  overlay: SignatureOverlay,
): Promise<void> {
  const bytes = decodeBase64Png(imageBase64);
  const signature: PDFImage = await pdf.embedPng(bytes).catch(() => {
    throw new TypeError('Signature image must be a valid PNG');
  });

  const page = await getPage(pdf, overlay.page);
  const x = overlay.x;
  const y = topLeftYToPdfLibY(page, overlay.y, overlay.height);

  page.drawImage(signature, { x, y, width: overlay.width, height: overlay.height });
}

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
  draw(`Envelope ID: ${data.envelopeId}`, CERTIFICATE_METADATA_FONT_SIZE, font);
  draw(`Completed At: ${data.completedAt}`, CERTIFICATE_METADATA_FONT_SIZE, font);
  y -= CERTIFICATE_BLOCK_GAP;
  draw('Signers:', CERTIFICATE_SIGNERS_HEADER_FONT_SIZE, boldFont);
  y -= CERTIFICATE_SIGNER_GAP;

  for (const signer of data.signers) {
    draw(
      `${sanitizeWinAnsi(signer.name)} <${signer.email}> — ${signer.role}`,
      CERTIFICATE_DETAIL_FONT_SIZE,
      font,
    );
    draw(`  Signed at: ${signer.signedAt}`, CERTIFICATE_DETAIL_FONT_SIZE, font);
    if (signer.ip) {
      draw(`  IP: ${signer.ip}`, CERTIFICATE_DETAIL_FONT_SIZE, font);
    }
    if (signer.userAgent) {
      draw(`  User-Agent: ${signer.userAgent}`, CERTIFICATE_DETAIL_FONT_SIZE, font);
    }
    y -= CERTIFICATE_SIGNER_GAP;
  }

  y -= CERTIFICATE_BLOCK_GAP;
  draw(`Integrity Hash (SHA-256): ${data.integrityHash}`, CERTIFICATE_DETAIL_FONT_SIZE, font);
}

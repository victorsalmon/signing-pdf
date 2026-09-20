import { PDFDocument, PDFFont, PDFImage, StandardFonts } from 'pdf-lib';
import { sanitizeWinAnsi } from './sanitize.js';
import { getPage, toPdfColor, topLeftYToPdfLibY } from './pdf-drawing.js';

export type PdfFieldType =
  'text' | 'textarea' | 'signature' | 'fillableDate' | 'variable' | 'static';

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

/** Default width for a text field when not specified (points). */
const DEFAULT_FIELD_WIDTH = 200;

/** Default height for a text field when not specified (points). */
const DEFAULT_FIELD_HEIGHT = 14;

/** Default font size for a text field when not specified (points). */
const DEFAULT_FIELD_FONT_SIZE = 10;

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
  const signature: PDFImage = await pdf.embedPng(bytes).catch((error: unknown) => {
    throw new TypeError('Signature image must be a valid PNG', { cause: error });
  });

  const page = await getPage(pdf, overlay.page);
  const x = overlay.x;
  const y = topLeftYToPdfLibY(page, overlay.y, overlay.height);

  page.drawImage(signature, { x, y, width: overlay.width, height: overlay.height });
}

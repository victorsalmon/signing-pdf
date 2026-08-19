import { PDFDocument, PDFPage, PDFFont, PDFImage, rgb, StandardFonts } from 'pdf-lib';
import { sanitizeWinAnsi } from './sanitize.js';

export interface PdfOverlayField {
  key: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
}

export interface SignatureOverlay {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CertificateSignerEntry {
  name: string;
  email: string;
  role: string;
  signedAt: string;
  ip?: string;
  userAgent?: string;
}

export interface CertificatePageData {
  documentTitle: string;
  envelopeId: string;
  completedAt: string;
  signers: CertificateSignerEntry[];
  integrityHash: string;
}

async function getPage(pdf: PDFDocument, pageNumber: number): Promise<PDFPage> {
  const idx = pageNumber - 1;
  if (idx < 0 || idx >= pdf.getPageCount()) {
    throw new Error(`Page ${pageNumber} does not exist in PDF (page count: ${pdf.getPageCount()})`);
  }
  return pdf.getPage(idx);
}

function toPdfColor(color?: { r: number; g: number; b: number }) {
  return rgb(color?.r ?? 0, color?.g ?? 0, color?.b ?? 0);
}

export async function embedFieldValues(
  pdf: PDFDocument,
  fields: PdfOverlayField[],
  values: Record<string, unknown>,
  options?: { font?: PDFFont }
): Promise<void> {
  const font = options?.font ?? (await pdf.embedFont(StandardFonts.Helvetica));
  for (const field of fields) {
    const raw = values[field.key];
    if (raw === undefined || raw === null) continue;
    const text = sanitizeWinAnsi(String(raw));
    if (text.length === 0) continue;

    const page = await getPage(pdf, field.page);
    const width = field.width ?? 200;
    const height = field.height ?? 14;
    const fontSize = field.fontSize ?? 10;
    // Field coordinates are top-left origin; pdf-lib uses bottom-left.
    const x = field.x;
    const y = page.getHeight() - field.y - height;

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

function decodeBase64Png(imageBase64: string): Uint8Array {
  const match = imageBase64.match(/^data:image\/png;base64,(.+)$/i);
  const payload = match ? match[1] : imageBase64;
  try {
    return Buffer.from(payload, 'base64');
  } catch {
    throw new TypeError('Invalid base64 PNG signature image');
  }
}

export async function embedSignatureImage(
  pdf: PDFDocument,
  imageBase64: string,
  overlay: SignatureOverlay
): Promise<void> {
  const bytes = decodeBase64Png(imageBase64);
  const signature: PDFImage = await pdf.embedPng(bytes).catch(() => {
    throw new TypeError('Signature image must be a valid PNG');
  });

  const page = await getPage(pdf, overlay.page);
  const x = overlay.x;
  const y = page.getHeight() - overlay.y - overlay.height;

  page.drawImage(signature, { x, y, width: overlay.width, height: overlay.height });
}

export async function embedCertificatePage(
  pdf: PDFDocument,
  data: CertificatePageData,
  options?: { font?: PDFFont; boldFont?: PDFFont }
): Promise<void> {
  const page = pdf.addPage();
  const { width, height } = page.getSize();
  const boldFont = options?.boldFont ?? (await pdf.embedFont(StandardFonts.HelveticaBold));
  const font = options?.font ?? (await pdf.embedFont(StandardFonts.Helvetica));
  const margin = 50;
  let y = height - margin;

  const draw = (text: string, size: number, f: PDFFont, lineY: number) => {
    page.drawText(text, {
      x: margin,
      y: lineY,
      size,
      font: f,
      color: rgb(0, 0, 0),
      maxWidth: width - margin * 2,
    });
    return lineY - size * 1.5;
  };

  y = draw('Certificate of Completion', 18, boldFont, y);
  y -= 10;
  y = draw(`Document: ${sanitizeWinAnsi(data.documentTitle)}`, 12, font, y);
  y = draw(`Envelope ID: ${data.envelopeId}`, 12, font, y);
  y = draw(`Completed At: ${data.completedAt}`, 12, font, y);
  y -= 10;
  y = draw('Signers:', 14, boldFont, y);
  y -= 5;

  for (const signer of data.signers) {
    y = draw(
      `${sanitizeWinAnsi(signer.name)} <${signer.email}> — ${signer.role}`,
      10,
      font,
      y
    );
    y = draw(`  Signed at: ${signer.signedAt}`, 10, font, y);
    if (signer.ip) {
      y = draw(`  IP: ${signer.ip}`, 10, font, y);
    }
    if (signer.userAgent) {
      y = draw(`  User-Agent: ${signer.userAgent}`, 10, font, y);
    }
    y -= 5;
  }

  y -= 10;
  y = draw(`Integrity Hash (SHA-256): ${data.integrityHash}`, 10, font, y);
}

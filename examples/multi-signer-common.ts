/**
 * Shared helpers for the multi-signer examples.
 *
 * Owns the placeholder signature image and the common two-signer flow so
 * `examples/multi-signer.ts` and `examples/multi-signer-offline.ts` stay
 * runnable while differing only in document metadata and field geometry.
 */
import { PDFDocument } from 'pdf-lib';
import {
  embedFieldValues,
  embedSignatureImage,
  embedCertificatePage,
  finalizeSignedPdf,
  type CertificateSignerEntry,
  type PdfOverlayField,
  type SignatureOverlay,
} from '../src/index.js';

/**
 * A minimal 1x1 transparent PNG used as a stand-in signature image.
 * Hardcoded so the examples run fully offline without image fixtures.
 */
export const PLACEHOLDER_SIGNATURE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

/** The two signers every multi-signer example signs with. */
export const MULTI_SIGNER_PARTIES: Array<Pick<CertificateSignerEntry, 'name' | 'email' | 'role'>> =
  [
    { name: 'Jane Doe', email: 'jane@example.com', role: 'client' },
    { name: 'John Smith', email: 'john@example.com', role: 'contractor' },
  ];

/** The field values drawn by every multi-signer example. */
export const MULTI_SIGNER_VALUES = {
  clientName: 'Jane Doe',
  clientEmail: 'jane@example.com',
  contractorName: 'John Smith',
  contractorEmail: 'john@example.com',
};

/** Differences between the runnable multi-signer examples. */
export interface MultiSignerExample {
  /** Title recorded on the certificate page. */
  documentTitle: string;
  /** Envelope / transaction identifier recorded on the certificate page. */
  envelopeId: string;
  /** Document integrity hash recorded on the certificate page. */
  integrityHash: string;
  /** Role-tagged field placements for the signature page. */
  fields: PdfOverlayField[];
  /** Signature image placement for the `client` signer. */
  clientSignature: SignatureOverlay;
  /** Signature image placement for the `contractor` signer. */
  contractorSignature: SignatureOverlay;
}

/**
 * Builds one agreement PDF: overlays the field values, embeds both signature
 * images, appends the certificate page, and finalizes the bytes.
 *
 * @param example - Metadata, field geometry, and signature placements for the example.
 * @returns The finalized PDF bytes.
 */
export async function buildMultiSignerAgreement(example: MultiSignerExample): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);

  await embedFieldValues(pdf, example.fields, MULTI_SIGNER_VALUES);
  await embedSignatureImage(pdf, PLACEHOLDER_SIGNATURE_PNG_BASE64, example.clientSignature);
  await embedSignatureImage(pdf, PLACEHOLDER_SIGNATURE_PNG_BASE64, example.contractorSignature);

  const signedAt = new Date().toISOString();
  await embedCertificatePage(pdf, {
    documentTitle: example.documentTitle,
    envelopeId: example.envelopeId,
    completedAt: signedAt,
    signers: MULTI_SIGNER_PARTIES.map((party) => ({ ...party, signedAt })),
    integrityHash: example.integrityHash,
  });

  return finalizeSignedPdf(pdf);
}

/**
 * Multi-signer offline example for `@clocklobster/signing-pdf`.
 *
 * Runs offline: builds a one-page PDF from scratch (no network, no fixtures),
 * overlays two role-tagged field sets (client + contractor), embeds one
 * signature placement per signer, appends a certificate page listing both
 * signers, and finalizes the bytes to the OS temp directory so the repo
 * stays clean.
 *
 * Run with any TypeScript runner, e.g. `npx tsx examples/multi-signer.ts`.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import {
  embedFieldValues,
  embedSignatureImage,
  embedCertificatePage,
  finalizeSignedPdf,
  type PdfOverlayField,
  type SignatureOverlay,
} from '../src/index.js';

/**
 * A minimal 1x1 transparent PNG used as a stand-in signature image.
 * Hardcoded so the example runs fully offline without image fixtures.
 */
const PLACEHOLDER_SIGNATURE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

const pdf = await PDFDocument.create();
pdf.addPage([612, 792]);

const fields: PdfOverlayField[] = [
  { key: 'clientName', role: 'client', page: 1, x: 100, y: 150, width: 250, fontSize: 11 },
  { key: 'clientEmail', role: 'client', page: 1, x: 100, y: 175, width: 250, fontSize: 11 },
  { key: 'contractorName', role: 'contractor', page: 1, x: 100, y: 260, width: 250, fontSize: 11 },
  { key: 'contractorEmail', role: 'contractor', page: 1, x: 100, y: 285, width: 250, fontSize: 11 },
];
await embedFieldValues(pdf, fields, {
  clientName: 'Jane Doe',
  clientEmail: 'jane@example.com',
  contractorName: 'John Smith',
  contractorEmail: 'john@example.com',
});

const clientSignature: SignatureOverlay = { page: 1, x: 100, y: 340, width: 160, height: 40 };
const contractorSignature: SignatureOverlay = { page: 1, x: 350, y: 340, width: 160, height: 40 };
await embedSignatureImage(pdf, PLACEHOLDER_SIGNATURE_PNG_BASE64, clientSignature);
await embedSignatureImage(pdf, PLACEHOLDER_SIGNATURE_PNG_BASE64, contractorSignature);

const now = new Date().toISOString();
await embedCertificatePage(pdf, {
  documentTitle: 'Multi-Signer Service Agreement',
  envelopeId: 'env-multisigner-0001',
  completedAt: now,
  signers: [
    { name: 'Jane Doe', email: 'jane@example.com', role: 'client', signedAt: now },
    { name: 'John Smith', email: 'john@example.com', role: 'contractor', signedAt: now },
  ],
  integrityHash: 'multisigner-example-hash',
});

const bytes = await finalizeSignedPdf(pdf);
const outPath = join(tmpdir(), 'signing-pdf-multi-signer.pdf');
await writeFile(outPath, bytes);
console.log(`wrote ${bytes.length} bytes to ${outPath}`);

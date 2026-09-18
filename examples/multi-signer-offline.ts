/**
 * Multi-signer offline example for `@clocklobster/signing-pdf`.
 *
 * Runs offline: builds a one-page PDF from scratch (no network, no fixtures),
 * overlays two role-tagged field sets (client + contractor), embeds one
 * signature placement per signer, appends a certificate page listing both
 * signers, and finalizes the bytes to the OS temp directory so the repo
 * stays clean.
 *
 * This is a hiring-demo companion to `examples/multi-signer.ts` with a
 * distinct envelope ID and distinct field geometry (see
 * `docs/coordinates-system.md` for the delta).
 *
 * Run with any TypeScript runner, e.g. `npx tsx examples/multi-signer-offline.ts`.
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

// Geometry is intentionally distinct from `examples/multi-signer.ts`.
const fields: PdfOverlayField[] = [
  { key: 'clientName', role: 'client', page: 1, x: 60, y: 110, width: 300, height: 16, fontSize: 12 },
  { key: 'clientEmail', role: 'client', page: 1, x: 60, y: 140, width: 300, height: 16, fontSize: 12 },
  { key: 'contractorName', role: 'contractor', page: 1, x: 60, y: 220, width: 300, height: 16, fontSize: 12 },
  { key: 'contractorEmail', role: 'contractor', page: 1, x: 60, y: 250, width: 300, height: 16, fontSize: 12 },
];
await embedFieldValues(pdf, fields, {
  clientName: 'Jane Doe',
  clientEmail: 'jane@example.com',
  contractorName: 'John Smith',
  contractorEmail: 'john@example.com',
});

const clientSignature: SignatureOverlay = { page: 1, x: 60, y: 310, width: 180, height: 50 };
const contractorSignature: SignatureOverlay = { page: 1, x: 330, y: 310, width: 180, height: 50 };
await embedSignatureImage(pdf, PLACEHOLDER_SIGNATURE_PNG_BASE64, clientSignature);
await embedSignatureImage(pdf, PLACEHOLDER_SIGNATURE_PNG_BASE64, contractorSignature);

const now = new Date().toISOString();
await embedCertificatePage(pdf, {
  documentTitle: 'Multi-Signer Offline Consulting Agreement',
  envelopeId: 'env-multisigner-offline-0002',
  completedAt: now,
  signers: [
    { name: 'Jane Doe', email: 'jane@example.com', role: 'client', signedAt: now },
    { name: 'John Smith', email: 'john@example.com', role: 'contractor', signedAt: now },
  ],
  integrityHash: 'multisigner-offline-example-hash',
});

const bytes = await finalizeSignedPdf(pdf);
const outPath = join(tmpdir(), 'signing-pdf-multi-signer-offline.pdf');
await writeFile(outPath, bytes);
console.log(`wrote ${bytes.length} bytes to ${outPath}`);

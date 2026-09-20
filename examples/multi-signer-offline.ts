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
import { buildMultiSignerAgreement } from './multi-signer-common.js';

// Geometry is intentionally distinct from `examples/multi-signer.ts`.
const bytes = await buildMultiSignerAgreement({
  documentTitle: 'Multi-Signer Offline Consulting Agreement',
  envelopeId: 'env-multisigner-offline-0002',
  integrityHash: 'multisigner-offline-example-hash',
  fields: [
    {
      key: 'clientName',
      role: 'client',
      page: 1,
      x: 60,
      y: 110,
      width: 300,
      height: 16,
      fontSize: 12,
    },
    {
      key: 'clientEmail',
      role: 'client',
      page: 1,
      x: 60,
      y: 140,
      width: 300,
      height: 16,
      fontSize: 12,
    },
    {
      key: 'contractorName',
      role: 'contractor',
      page: 1,
      x: 60,
      y: 220,
      width: 300,
      height: 16,
      fontSize: 12,
    },
    {
      key: 'contractorEmail',
      role: 'contractor',
      page: 1,
      x: 60,
      y: 250,
      width: 300,
      height: 16,
      fontSize: 12,
    },
  ],
  clientSignature: { page: 1, x: 60, y: 310, width: 180, height: 50 },
  contractorSignature: { page: 1, x: 330, y: 310, width: 180, height: 50 },
});

const outPath = join(tmpdir(), 'signing-pdf-multi-signer-offline.pdf');
await writeFile(outPath, bytes);
console.log(`wrote ${bytes.length} bytes to ${outPath}`);

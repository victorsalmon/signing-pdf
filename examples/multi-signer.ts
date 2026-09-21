/**
 * Multi-signer example for `@clocklobster/signing-pdf`.
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
import { buildMultiSignerAgreement } from './multi-signer-common.js';

const bytes = await buildMultiSignerAgreement({
  documentTitle: 'Multi-Signer Service Agreement',
  envelopeId: 'env-multisigner-0001',
  integrityHash: 'multisigner-example-hash',
  fields: [
    { key: 'clientName', role: 'client', page: 1, x: 100, y: 150, width: 250, fontSize: 11 },
    { key: 'clientEmail', role: 'client', page: 1, x: 100, y: 175, width: 250, fontSize: 11 },
    {
      key: 'contractorName',
      role: 'contractor',
      page: 1,
      x: 100,
      y: 260,
      width: 250,
      fontSize: 11,
    },
    {
      key: 'contractorEmail',
      role: 'contractor',
      page: 1,
      x: 100,
      y: 285,
      width: 250,
      fontSize: 11,
    },
  ],
  clientSignature: { page: 1, x: 100, y: 340, width: 160, height: 40 },
  contractorSignature: { page: 1, x: 350, y: 340, width: 160, height: 40 },
});

const outPath = join(tmpdir(), 'signing-pdf-multi-signer.pdf');
await writeFile(outPath, bytes);
console.log(`wrote ${bytes.length} bytes to ${outPath}`);

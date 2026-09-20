/**
 * Quickstart for `@clocklobster/signing-pdf`.
 *
 * Runs offline: builds a one-page PDF from scratch, overlays a field value,
 * appends a certificate page, and finalizes it. The finished bytes are written
 * to the OS temp directory so the repo stays clean.
 *
 * Run with any TypeScript runner, e.g. `npx tsx examples/quickstart.ts`.
 */
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { embedFieldValues, embedCertificatePage, finalizeSignedPdf } from '../src/index.js';

const pdf = await PDFDocument.create();
pdf.addPage([612, 792]);

await embedFieldValues(
  pdf,
  [{ key: 'clientName', page: 1, x: 100, y: 200, width: 250, fontSize: 11 }],
  { clientName: 'Jane Doe' },
);

await embedCertificatePage(pdf, {
  documentTitle: 'Service Agreement',
  envelopeId: 'env-quickstart-0001',
  completedAt: new Date().toISOString(),
  signers: [
    {
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'client',
      signedAt: new Date().toISOString(),
    },
  ],
  integrityHash: 'quickstart-example-hash',
});

const bytes = await finalizeSignedPdf(pdf);
const outPath = join(tmpdir(), 'signing-pdf-quickstart.pdf');
await writeFile(outPath, bytes);
console.log(`wrote ${bytes.length} bytes to ${outPath}`);

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { embedCertificatePage, finalizeSignedPdf, loadPdf } from '../src/index.js';

describe('embedCertificatePage', () => {
  it('appends a certificate page with signer metadata', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([612, 792]);

    await embedCertificatePage(pdf, {
      documentTitle: 'Residential Tenancy Agreement',
      envelopeId: 'env-123',
      completedAt: new Date().toISOString(),
      signers: [
        {
          name: 'Alice Smith',
          email: 'alice@example.com',
          role: 'tenant',
          signedAt: new Date().toISOString(),
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        },
      ],
      integrityHash: 'sha256-abc123',
    });

    const bytes = await finalizeSignedPdf(pdf);
    const reloaded = await loadPdf(bytes);
    expect(reloaded.getPageCount()).toBe(2);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { PDFDocument, type PDFFont } from 'pdf-lib';
import { embedCertificatePage, finalizeSignedPdf, loadPdf, StandardFonts } from '../src/index.js';

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

  it('uses custom fonts and the page-margined max width', async () => {
    const pdf = await PDFDocument.create();
    const realAddPage = pdf.addPage.bind(pdf);
    const draws: Array<{ text: string; font: PDFFont; maxWidth: number }> = [];
    let pageWidth = 0;

    pdf.addPage = vi.fn((...args: unknown[]) => {
      const page = realAddPage(...(args as []));
      const size = page.getSize();
      pageWidth = size.width;
      page.drawText = vi.fn((text: string, opts: Record<string, unknown>) => {
        draws.push({ text, font: opts.font as PDFFont, maxWidth: opts.maxWidth as number });
      }) as unknown as typeof page.drawText;
      return page;
    }) as unknown as typeof pdf.addPage;

    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdf.embedFont(StandardFonts.TimesRomanBold);

    await embedCertificatePage(
      pdf,
      {
        documentTitle: 'Test Document',
        envelopeId: 'env-1',
        completedAt: '2026-01-01T00:00:00Z',
        signers: [],
        integrityHash: 'hash-1',
      },
      { font, boldFont },
    );

    expect(draws.length).toBeGreaterThan(0);

    const title = draws.find((d) => d.text === 'Certificate of Completion');
    expect(title).toBeDefined();
    expect(title!.font).toBe(boldFont);

    const documentLine = draws.find((d) => d.text.startsWith('Document:'));
    expect(documentLine).toBeDefined();
    expect(documentLine!.font).toBe(font);

    for (const d of draws) {
      expect(d.maxWidth).toBe(pageWidth - 50 * 2);
    }
  });
});

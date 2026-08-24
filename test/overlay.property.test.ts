import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { PDFDocument, type PDFPage } from 'pdf-lib';
import {
  embedFieldValues,
  embedSignatureImage,
  embedCertificatePage,
  finalizeSignedPdf,
} from '../src/index.js';

/**
 * Property tests for the PDF overlay primitives.
 *
 * The drawing primitives are side-effectful, so the properties spy on
 * `page.drawText` / `page.drawImage` to assert the exact text, coordinates,
 * dimensions, colors, and defaults that the implementation passes to pdf-lib.
 * This makes the drawing contract observable to mutation testing.
 *
 * Value arbitraries are restricted to ASCII printable (32..126) so that the
 * sanitizer (exercised over full Unicode in sanitize.property.test.ts) does
 * not mask drawing assertions with font-encoding behaviour.
 */

const nonEmptyAscii = fc
  .array(fc.integer({ min: 32, max: 126 }).map(String.fromCharCode), {
    minLength: 1,
    maxLength: 24,
  })
  .map((chars) => chars.join(''));

async function createBlankPdf(pages: number): Promise<PDFDocument> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i++) pdf.addPage([612, 792]);
  return pdf;
}

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

interface DrawCall {
  text: string;
  opts: Record<string, unknown>;
}

function spyDrawText(page: PDFPage): DrawCall[] {
  const calls: DrawCall[] = [];
  page.drawText = vi.fn((text: string, opts: Record<string, unknown>) => {
    calls.push({ text, opts });
  }) as unknown as typeof page.drawText;
  return calls;
}

interface ImageCall {
  opts: Record<string, unknown>;
}

function spyDrawImage(page: PDFPage): ImageCall[] {
  const calls: ImageCall[] = [];
  page.drawImage = vi.fn((_img: unknown, opts: Record<string, unknown>) => {
    calls.push({ opts });
  }) as unknown as typeof page.drawImage;
  return calls;
}

describe('embedFieldValues — property tests', () => {
  it('throws for out-of-range page numbers and succeeds for valid ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 12 }),
        nonEmptyAscii,
        async (page, pageCount, value) => {
          const pdf = await createBlankPdf(pageCount);
          const fields = [{ key: 'k', page, x: 10, y: 10, width: 100, height: 14 }];
          if (page >= 1 && page <= pageCount) {
            await embedFieldValues(pdf, fields, { k: value });
            const bytes = await finalizeSignedPdf(pdf);
            expect(bytes.length).toBeGreaterThan(0);
          } else {
            await expect(embedFieldValues(pdf, fields, { k: value })).rejects.toThrow(
              /does not exist in PDF/,
            );
          }
        },
      ),
    );
  });

  it('draws each non-empty value at the flipped y with all defaults applied', async () => {
    const fieldArb = fc.record({
      x: fc.integer({ min: 0, max: 500 }),
      y: fc.integer({ min: 0, max: 500 }),
      width: fc.oneof(fc.constant(undefined), fc.integer({ min: 1, max: 300 })),
      height: fc.oneof(fc.constant(undefined), fc.integer({ min: 1, max: 50 })),
      fontSize: fc.oneof(fc.constant(undefined), fc.integer({ min: 6, max: 24 })),
      color: fc.oneof(
        fc.constant(undefined),
        fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
      ),
    });
    await fc.assert(
      fc.asyncProperty(fieldArb, nonEmptyAscii, async (field, value) => {
        const pdf = await createBlankPdf(1);
        const page = pdf.getPage(0);
        const pageHeight = page.getHeight();
        const draws = spyDrawText(page);
        await embedFieldValues(pdf, [{ key: 'k', page: 1, ...field }], { k: value });
        expect(draws).toHaveLength(1);
        const d = draws[0];
        expect(d.text).toBe(value); // ASCII survives sanitize unchanged
        expect(d.opts.x).toBe(field.x);
        expect(d.opts.y).toBe(pageHeight - field.y - (field.height ?? 14));
        expect(d.opts.size).toBe(field.fontSize ?? 10);
        expect(d.opts.maxWidth).toBe(field.width ?? 200);
        const color = d.opts.color as { red: number; green: number; blue: number };
        expect(color.red).toBe(field.color?.r ?? 0);
        expect(color.green).toBe(field.color?.g ?? 0);
        expect(color.blue).toBe(field.color?.b ?? 0);
      }),
    );
  });

  it('skips undefined, null, and empty-string values (no drawText call)', async () => {
    const emptyValue = fc.oneof(fc.constant(undefined), fc.constant(null), fc.constant(''));
    await fc.assert(
      fc.asyncProperty(emptyValue, async (value) => {
        const pdf = await createBlankPdf(1);
        const page = pdf.getPage(0);
        const draws = spyDrawText(page);
        await embedFieldValues(
          pdf,
          [{ key: 'k', page: 1, x: 10, y: 10, width: 100, height: 14 }],
          { k: value },
        );
        expect(draws).toHaveLength(0);
      }),
    );
  });
});

describe('embedSignatureImage — property tests', () => {
  it('embeds a valid PNG with or without the data-URI prefix', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (withPrefix) => {
        const pdf = await createBlankPdf(1);
        const data = withPrefix ? `data:image/png;base64,${ONE_PIXEL_PNG}` : ONE_PIXEL_PNG;
        await embedSignatureImage(pdf, data, { page: 1, x: 0, y: 0, width: 1, height: 1 });
        const bytes = await finalizeSignedPdf(pdf);
        expect(bytes.length).toBeGreaterThan(0);
      }),
    );
  });

  it('draws the image at the flipped y with the requested dimensions', async () => {
    const overlayArb = fc.record({
      x: fc.integer({ min: 0, max: 500 }),
      y: fc.integer({ min: 0, max: 500 }),
      width: fc.integer({ min: 1, max: 200 }),
      height: fc.integer({ min: 1, max: 100 }),
    });
    await fc.assert(
      fc.asyncProperty(overlayArb, fc.boolean(), async (overlay, withPrefix) => {
        const pdf = await createBlankPdf(1);
        const page = pdf.getPage(0);
        const pageHeight = page.getHeight();
        const images = spyDrawImage(page);
        const data = withPrefix ? `data:image/png;base64,${ONE_PIXEL_PNG}` : ONE_PIXEL_PNG;
        await embedSignatureImage(pdf, data, { page: 1, ...overlay });
        expect(images).toHaveLength(1);
        expect(images[0].opts.x).toBe(overlay.x);
        expect(images[0].opts.y).toBe(pageHeight - overlay.y - overlay.height);
        expect(images[0].opts.width).toBe(overlay.width);
        expect(images[0].opts.height).toBe(overlay.height);
      }),
    );
  });

  it('rejects arbitrary non-PNG input with a TypeError mentioning PNG', async () => {
    const badInput = fc
      .string({ minLength: 1, maxLength: 32 })
      .filter((s) => !/^data:image\/png;base64,/i.test(s));
    await fc.assert(
      fc.asyncProperty(badInput, async (bad) => {
        const pdf = await createBlankPdf(1);
        await expect(
          embedSignatureImage(pdf, bad, { page: 1, x: 0, y: 0, width: 1, height: 1 }),
        ).rejects.toThrow(/PNG/);
      }),
    );
  });
});

describe('embedCertificatePage — property tests', () => {
  it('appends one page and draws title, ids, each signer, and the integrity hash with exact header layout', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 10 }), async (signerCount) => {
        const pdf = await PDFDocument.create();
        pdf.addPage([612, 792]);
        const draws: Array<{ text: string; size: number; y: number }> = [];
        let pageHeight = 0;
        const realAddPage = pdf.addPage.bind(pdf);
        pdf.addPage = vi.fn((...args: unknown[]) => {
          const p = realAddPage(...(args as []));
          pageHeight = p.getSize().height;
          p.drawText = vi.fn((text: string, opts: Record<string, unknown>) => {
            draws.push({ text, size: opts.size as number, y: opts.y as number });
          }) as unknown as typeof p.drawText;
          return p;
        }) as unknown as typeof pdf.addPage;

        const signers = Array.from({ length: signerCount }, (_, i) => ({
          name: `Signer${i}`,
          email: `s${i}@x.com`,
          role: 'tenant',
          signedAt: '2026-01-01T00:00:00Z',
          ip: i % 2 === 0 ? '1.2.3.4' : undefined,
          userAgent: i % 3 === 0 ? 'UA-XYZ' : undefined,
        }));
        await embedCertificatePage(pdf, {
          documentTitle: 'TitleXYZ',
          envelopeId: 'envXYZ',
          completedAt: '2026-01-01T00:00:00Z',
          signers,
          integrityHash: 'hashXYZ',
        });

        expect(pdf.getPageCount()).toBe(2);

        // Model the exact draw sequence (text, font size, and y coordinate)
        // that embedCertificatePage must produce: margin 50, each draw returns
        // lineY - size*1.5, with -10/-5 spacing between blocks. Comparing the
        // whole sequence kills any spacing, size, content, or conditional
        // mutation in the certificate layout.
        const h = pageHeight;
        const expected: Array<{ text: string; size: number; y: number }> = [];
        {
          let y = h - 50;
          const draw = (text: string, size: number) => {
            expected.push({ text, size, y });
            y -= size * 1.5;
          };
          draw('Certificate of Completion', 18);
          y -= 10;
          draw('Document: TitleXYZ', 12);
          draw('Envelope ID: envXYZ', 12);
          draw('Completed At: 2026-01-01T00:00:00Z', 12);
          y -= 10;
          draw('Signers:', 14);
          y -= 5;
          for (const s of signers) {
            draw(`${s.name} <${s.email}> — ${s.role}`, 10);
            draw(`  Signed at: ${s.signedAt}`, 10);
            if (s.ip) draw(`  IP: ${s.ip}`, 10);
            if (s.userAgent) draw(`  User-Agent: ${s.userAgent}`, 10);
            y -= 5;
          }
          y -= 10;
          draw('Integrity Hash (SHA-256): hashXYZ', 10);
        }
        expect(draws).toEqual(expected);
      }),
    );
  });
});

# signing-pdf

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![pdf-lib](https://img.shields.io/badge/pdf--lib-1.17-red.svg)](https://pdf-lib.js.org/)
[![Tests](https://img.shields.io/badge/tests-8%20passing-brightgreen.svg)](#testing)

Pure [`pdf-lib`](https://pdf-lib.js.org/) primitives for electronic-signature PDF overlay —
field values, signature images, certificate pages, and finalization. **No AWS, no storage,
no product coupling — just PDF manipulation.**

> **Why this exists:** Building e-signature PDF handling from scratch with `pdf-lib` is
> fiddly — coordinate systems (top-left vs bottom-left origin), WinAnsi encoding sanitization,
> base64 PNG embedding, and certificate page layout all need careful handling. This package
> wraps those primitives behind a clean, typed, tested surface so you can build a
> self-hosted e-signature flow without reinventing the PDF layer.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Install](#install)
- [Quick start](#quick-start)
- [API reference](#api-reference)
  - [`loadPdf(bytes)`](#loadpdfbytes)
  - [`embedFieldValues(pdf, fields, values, options?)`](#embedfieldvaluespdf-fields-values-options)
  - [`embedSignatureImage(pdf, imageBase64, overlay)`](#embedsignatureimagepdf-imagebase64-overlay)
  - [`embedCertificatePage(pdf, data, options?)`](#embedcertificatepagepdf-data-options)
  - [`finalizeSignedPdf(pdf)`](#finalizesignedpdfpdf)
  - [`sanitizeWinAnsi(text)`](#sanitizewinanitext)
  - [Re-exports](#re-exports)
  - [Types](#types)
- [Coordinate system](#coordinate-system)
- [WinAnsi sanitization](#winansi-sanitization)
- [Field types](#field-types)
- [Certificate page](#certificate-page)
- [Testing](#testing)
- [Development](#development)
- [Project layout](#project-layout)
- [Usage in an e-signature flow](#usage-in-an-e-signature-flow)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`signing-pdf` provides the PDF manipulation primitives needed to build an electronic-signature
flow on top of `pdf-lib`:

- **Load** a PDF from bytes
- **Embed field values** — draw text (names, dates, addresses) at specified coordinates
- **Embed signature images** — place base64-encoded PNG signature images on the document
- **Embed a certificate page** — append a "Certificate of Completion" page with signer
  details, timestamps, IP/User-Agent, and an integrity hash
- **Finalize** — save the modified PDF back to bytes
- **Sanitize WinAnsi** — strip/replace characters that `pdf-lib`'s standard fonts can't render

The package is intentionally low-level: it manipulates PDFs and nothing else. Storage
(S3, local FS), email sending, envelope lifecycle, and tenant management live in the
consuming application.

---

## Features

- **Field value overlay** — draw text at top-left-origin coordinates (the package handles
  the conversion to `pdf-lib`'s bottom-left origin)
- **Signature image embedding** — accepts base64 PNG (with or without the
  `data:image/png;base64,` prefix); validates the PNG before embedding
- **Certificate of Completion page** — appends a formatted page with document title,
  envelope ID, completion timestamp, signer list (name, email, role, signed-at, IP,
  User-Agent), and a SHA-256 integrity hash
- **WinAnsi sanitization** — replaces smart quotes, em/en dashes, ellipses, and strips
  control characters so `pdf-lib`'s standard fonts (Helvetica, etc.) don't throw on
  Unicode input
- **Role-based field types** — fields carry an optional `role` and `type` for per-signer
  filtering and variable resolution in higher layers
- **Color support** — per-field text color via `{ r, g, b }` (0–1 floats)
- **Font injection** — pass custom fonts or use the defaults (Helvetica / HelveticaBold)
- **pdf-lib re-exports** — `PDFDocument`, `PDFPage`, `PDFFont`, `StandardFonts`, `rgb`
  are re-exported so consumers don't need a separate `pdf-lib` import
- **Pure functions** — no side effects beyond the PDF document passed in

---

## Install

```bash
npm install @clocklobster/signing-pdf
# or
pnpm add @clocklobster/signing-pdf
```

### Dependencies

- [`pdf-lib`](https://www.npmjs.com/package/pdf-lib) `^1.17.1` (runtime dependency)

### Requirements

- **Node.js >= 18** (uses `Buffer` for base64 decoding)
- **TypeScript >= 5** (for type consumers; ships `.d.ts` files)

---

## Quick start

```typescript
import {
  loadPdf,
  embedFieldValues,
  embedSignatureImage,
  embedCertificatePage,
  finalizeSignedPdf,
  sanitizeWinAnsi,
  PDFDocument,
  StandardFonts,
} from '@clocklobster/signing-pdf';

// 1. Load the template PDF
const pdfBytes = await fs.readFile('agreement-template.pdf');
const pdf = await loadPdf(new Uint8Array(pdfBytes));

// 2. Embed field values (text fields)
await embedFieldValues(
  pdf,
  [
    { key: 'clientName', page: 1, x: 100, y: 200, width: 250, fontSize: 11 },
    { key: 'date', page: 1, x: 100, y: 220, width: 100, fontSize: 11 },
    { key: 'address', page: 1, x: 100, y: 240, width: 300, fontSize: 10 },
  ],
  {
    clientName: 'Jane Doe',
    date: '2026-08-21',
    address: '123 Main St, Toronto, ON',
  }
);

// 3. Embed a signature image (base64 PNG from a signature pad)
const signatureBase64 = 'data:image/png;base64,iVBORw0KGgo...';
await embedSignatureImage(pdf, signatureBase64, {
  page: 1,
  x: 100,
  y: 300,
  width: 200,
  height: 60,
});

// 4. Append a certificate of completion page
await embedCertificatePage(pdf, {
  documentTitle: 'Service Agreement',
  envelopeId: 'env-2026-0001',
  completedAt: '2026-08-21T15:30:00Z',
  signers: [
    {
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'client',
      signedAt: '2026-08-21T15:29:55Z',
      ip: '203.0.113.42',
      userAgent: 'Mozilla/5.0...',
    },
  ],
  integrityHash: 'a1b2c3d4e5f6...',
});

// 5. Finalize and save
const signedBytes = await finalizeSignedPdf(pdf);
await fs.writeFile('agreement-signed.pdf', signedBytes);
```

---

## API reference

### `loadPdf(bytes)`

Loads a PDF document from bytes.

```typescript
const pdf = await loadPdf(new Uint8Array(fileBuffer));
```

- `bytes` — `Uint8Array` of the PDF file content
- Returns `Promise<PDFDocument>` — a `pdf-lib` document instance

---

### `embedFieldValues(pdf, fields, values, options?)`

Draws text values at specified coordinates on the PDF. Skips fields whose value is
`undefined`, `null`, or empty after sanitization.

```typescript
await embedFieldValues(
  pdf,
  [
    {
      key: 'clientName',        // matches a key in `values`
      type: 'text',              // optional field type
      role: 'client',            // optional role (for per-signer filtering)
      page: 1,                   // 1-indexed page number
      x: 100,                    // top-left origin X
      y: 200,                    // top-left origin Y
      width: 250,                // default: 200
      height: 14,                // default: 14
      fontSize: 11,              // default: 10
      color: { r: 0, g: 0, b: 0 }, // default: black
    },
  ],
  { clientName: 'Jane Doe' },
  { font: customFont }           // optional; defaults to Helvetica
);
```

**Parameters:**
- `pdf` — `PDFDocument` (from `loadPdf` or `pdf-lib`)
- `fields` — array of `PdfOverlayField` (see [Types](#types))
- `values` — `Record<string, unknown>` — values keyed by field `key`; non-string values
  are coerced via `String()`
- `options.font` — optional `PDFFont` (defaults to `StandardFonts.Helvetica`)

**Coordinate system:** fields use **top-left origin** (y increases downward). The function
converts to `pdf-lib`'s bottom-left origin internally. See [Coordinate system](#coordinate-system).

**Throws:** if the page number is out of range.

---

### `embedSignatureImage(pdf, imageBase64, overlay)`

Embeds a PNG signature image at the specified position.

```typescript
await embedSignatureImage(pdf, 'data:image/png;base64,iVBORw0KGgo...', {
  page: 1,
  x: 100,
  y: 300,
  width: 200,
  height: 60,
});
```

**Parameters:**
- `pdf` — `PDFDocument`
- `imageBase64` — base64-encoded PNG. Accepts both:
  - `data:image/png;base64,...` (data URI prefix)
  - raw base64 string (no prefix)
- `overlay` — `SignatureOverlay` with `page`, `x`, `y` (top-left origin), `width`, `height`

**Throws:**
- `TypeError('Invalid base64 PNG signature image')` — if the base64 is malformed
- `TypeError('Signature image must be a valid PNG')` — if the bytes are not a valid PNG
- `Error('Page N does not exist...')` — if the page number is out of range

---

### `embedCertificatePage(pdf, data, options?)`

Appends a "Certificate of Completion" page to the PDF with signer details and an
integrity hash.

```typescript
await embedCertificatePage(
  pdf,
  {
    documentTitle: 'Service Agreement',
    envelopeId: 'env-2026-0001',
    completedAt: '2026-08-21T15:30:00Z',
    signers: [
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'client',
        signedAt: '2026-08-21T15:29:55Z',
        ip: '203.0.113.42',
        userAgent: 'Mozilla/5.0...',
      },
      {
        name: 'John Smith',
        email: 'john@company.com',
        role: 'company',
        signedAt: '2026-08-21T15:30:00Z',
      },
    ],
    integrityHash: 'a1b2c3d4e5f6...',
  },
  { font: customFont, boldFont: customBoldFont }
);
```

**Parameters:**
- `pdf` — `PDFDocument`
- `data` — `CertificatePageData` (see [Types](#types))
- `options.font` — optional regular font (defaults to `StandardFonts.Helvetica`)
- `options.boldFont` — optional bold font (defaults to `StandardFonts.HelveticaBold`)

**Certificate page layout:**
- Title: "Certificate of Completion" (18pt bold)
- Document title (12pt)
- Envelope ID (12pt)
- Completed At timestamp (12pt)
- "Signers:" heading (14pt bold)
- Per signer: name, email, role (10pt) + signed-at + optional IP + optional User-Agent (10pt)
- Integrity Hash (SHA-256) (10pt)

All text is WinAnsi-sanitized before drawing.

---

### `finalizeSignedPdf(pdf)`

Saves the modified PDF document to bytes.

```typescript
const signedBytes = await finalizeSignedPdf(pdf);
```

- `pdf` — `PDFDocument` (after all overlays and certificate page are embedded)
- Returns `Promise<Uint8Array>` — the finalized PDF bytes, ready to write to a file or
  upload to storage

---

### `sanitizeWinAnsi(text)`

Sanitizes a string for `pdf-lib`'s standard fonts (Helvetica, Times, Courier), which use
WinAnsi encoding and cannot render most Unicode characters.

```typescript
const clean = sanitizeWinAnsi('Jane "the client" Doe — Toronto…');
// 'Jane "the client" Doe - Toronto...'
```

**Replacements:**
| Unicode | Replacement |
|---|---|
| `'` (U+2018 left single quote) | `'` |
| `'` (U+2019 right single quote) | `'` |
| `"` (U+201C left double quote) | `"` |
| `"` (U+201D right double quote) | `"` |
| `–` (U+2013 en dash) | `-` |
| `—` (U+2014 em dash) | `-` |
| `…` (U+2026 ellipsis) | `...` |

**Control characters:** all control characters (code < 32) are dropped **except** tab (9),
line feed (10), and carriage return (13).

**Characters > 255:** replaced with the mapping above, or a space if no mapping exists.

This function is called automatically by `embedFieldValues` and `embedCertificatePage`.
You only need to call it directly if you're drawing text with `pdf-lib` directly and want
the same sanitization.

---

### Re-exports

For convenience, the package re-exports common `pdf-lib` symbols so you don't need a
separate import:

```typescript
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from '@clocklobster/signing-pdf';
```

| Symbol | Source | Use |
|---|---|---|
| `PDFDocument` | `pdf-lib` | Document class (for `pdf.embedFont()`, `pdf.addPage()`, etc.) |
| `PDFPage` | `pdf-lib` | Page class |
| `PDFFont` | `pdf-lib` | Font class |
| `StandardFonts` | `pdf-lib` | Enum of built-in fonts (Helvetica, HelveticaBold, etc.) |
| `rgb` | `pdf-lib` | Color helper — `rgb(r, g, b)` with 0–1 floats |

---

### Types

```typescript
// Field type — used by higher layers for per-signer filtering and variable resolution
type PdfFieldType = 'text' | 'textarea' | 'signature' | 'fillableDate' | 'variable' | 'static';

// A field to overlay on the PDF
interface PdfOverlayField {
  key: string;                    // matches a key in the values map
  type?: PdfFieldType;
  role?: string;                  // role that owns/fills this field
  variable?: string;              // for 'variable' fields: the variable to resolve
  page: number;                   // 1-indexed page number
  x: number;                      // top-left origin X
  y: number;                      // top-left origin Y
  width?: number;                 // default: 200
  height?: number;                // default: 14
  fontSize?: number;              // default: 10
  color?: { r: number; g: number; b: number }; // 0-1 floats; default: black
  minDate?: string;               // for 'fillableDate' fields
  maxDate?: string;               // for 'fillableDate' fields
  displayFormat?: string;         // for 'fillableDate' fields
}

// Signature image placement
interface SignatureOverlay {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// A signer entry on the certificate page
interface CertificateSignerEntry {
  name: string;
  email: string;
  role: string;
  signedAt: string;
  ip?: string;
  userAgent?: string;
}

// Data for the certificate of completion page
interface CertificatePageData {
  documentTitle: string;
  envelopeId: string;
  completedAt: string;
  signers: CertificateSignerEntry[];
  integrityHash: string;
}
```

---

## Coordinate system

`pdf-lib` uses a **bottom-left origin** (y increases upward), which is the PDF standard.
However, most document templates and visual editors use a **top-left origin** (y increases
downward), which matches how humans read documents.

This package uses **top-left origin** for all field and signature coordinates. The
conversion to `pdf-lib`'s bottom-left origin is handled internally:

```
pdfY = pageHeight - fieldY - fieldHeight
```

So when you specify a field at `{ x: 100, y: 200 }`, it appears 100 points from the left
edge and 200 points from the **top** of the page.

---

## WinAnsi sanitization

`pdf-lib`'s standard fonts (Helvetica, Times, Courier, and their bold/italic variants)
use **WinAnsi encoding**, which covers the Latin-1 character range (0–255). Characters
outside this range — including common Unicode like smart quotes, em dashes, and ellipses —
cause `pdf-lib` to throw `Error: WinAnsi encoding does not support this character`.

`sanitizeWinAnsi()` replaces the most common problematic Unicode characters with their
ASCII equivalents and strips control characters. It is called automatically by
`embedFieldValues` and `embedCertificatePage`, so you usually don't need to call it
directly.

If you embed custom fonts (e.g. a Unicode TrueType font via `pdf.embedFont(ttfBytes)`),
those fonts support full Unicode and you do **not** need sanitization — but this package
sanitizes regardless, which is safe (the replacements are idempotent for ASCII input).

---

## Field types

Fields carry an optional `type` for use by higher layers (this package doesn't enforce
types — it draws all non-empty values as text):

| Type | Meaning | Drawn as |
|---|---|---|
| `text` | Single-line text input | One line of text |
| `textarea` | Multi-line text input | One line (no wrapping logic — caller splits lines) |
| `signature` | Signature pad area | Use `embedSignatureImage` instead |
| `fillableDate` | Date input with min/max/format | Text (the resolved date string) |
| `variable` | Resolved from a variable map | Text (the resolved value) |
| `static` | Non-fillable label | Text (if a value is provided) |

The `role` field is used by higher layers for per-signer filtering (e.g. only show
fields belonging to the current signer). This package ignores it — it draws all fields
whose `key` has a non-empty value.

---

## Certificate page

The certificate page is appended as the **last page** of the PDF. It includes:

- **Title**: "Certificate of Completion" (18pt bold)
- **Document title**: the `documentTitle` from `CertificatePageData` (12pt)
- **Envelope ID**: the `envelopeId` (12pt)
- **Completed At**: the `completedAt` timestamp (12pt)
- **Signers**: for each signer in `signers[]`:
  - Name, email, role (10pt)
  - Signed-at timestamp (10pt)
  - IP address (10pt, if provided)
  - User-Agent (10pt, if provided)
- **Integrity Hash**: the SHA-256 `integrityHash` (10pt)

All text is WinAnsi-sanitized before drawing. The page uses 50-point margins.

---

## Testing

The suite uses [Vitest](https://vitest.dev/) and tests against real `pdf-lib` documents.
8 tests across 4 describe blocks:

| Describe block | Tests | Coverage |
|---|---|---|
| `embedCertificatePage` | 2 | Certificate page layout, signer details, integrity hash |
| `embedFieldValues` | 2 | Field text embedding, coordinate conversion, skip empty values |
| `embedSignatureImage` | 2 | PNG embedding, base64 data URI parsing, invalid PNG error |
| `sanitizeWinAnsi` | 2 | Unicode replacement, control character stripping |

```bash
npm test             # vitest run (real pdf-lib documents, no mocks)
```

---

## Development

```bash
# Install dependencies
pnpm install

# Typecheck
pnpm run typecheck    # tsc --noEmit

# Run tests
pnpm test             # vitest run

# Build (emit to dist/)
pnpm run build        # tsc -p tsconfig.build.json
```

### Requirements

- Node.js >= 18
- pnpm (or npm/yarn)
- TypeScript >= 5

---

## Project layout

```text
signing-pdf/
├── src/
│   ├── index.ts      # Public exports + pdf-lib re-exports
│   ├── load.ts       # loadPdf — load a PDF from bytes
│   ├── overlay.ts    # embedFieldValues, embedSignatureImage, embedCertificatePage + types
│   ├── finalize.ts   # finalizeSignedPdf — save to bytes
│   └── sanitize.ts   # sanitizeWinAnsi — WinAnsi encoding sanitization
├── test/
│   ├── certificate.test.ts  # Certificate page tests
│   ├── overlay.test.ts      # Field + signature overlay tests
│   └── sanitize.test.ts     # WinAnsi sanitization tests
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── LICENSE
└── README.md
```

---

## Usage in an e-signature flow

This package handles the PDF layer. A complete e-signature flow typically also needs:

1. **Envelope lifecycle** — create, track, and complete signing envelopes (not included)
2. **Storage** — store the template PDF and the finalized signed PDF (S3, local FS, etc.)
   (not included)
3. **Email** — send signing invitations and completion notifications (not included)
4. **Web UI** — a signature pad and field form for the signer (not included)
5. **Webhook/API** — receive signing events and trigger finalization (not included)

This package handles step 5's PDF finalization (load → embed fields → embed signatures →
append certificate → finalize) and nothing else. The orchestration, storage, email, and
UI layers are the consuming application's responsibility.

---

## Contributing

Pull requests are welcome.

### Guidelines

1. Add or update tests for any change (Vitest, real `pdf-lib` documents).
2. Ensure `pnpm run typecheck` and `pnpm test` pass.
3. Do not commit secrets, `.env` files, or `dist/` output.
4. Follow the existing code style (strict TypeScript, no `any`, pure functions).
5. Keep the package low-level — no storage, email, or envelope lifecycle concerns.

---

## License

[MIT](LICENSE) © Victor Salmon

# Coordinates system

All overlay geometry in `@clocklobster/signing-pdf` uses a **top-left origin**:
`x` grows right from the left edge and `y` grows down from the top edge,
in PDF points (1/72 inch). This matches how form designers think about a page
and is the convention used by `examples/quickstart.ts` and
`examples/multi-signer.ts`.

`pdf-lib` itself draws from a **bottom-left origin**, so every placement is
converted internally before drawing. Callers never need to convert by hand —
pass top-left coordinates and the library handles the rest.

## Conversion formula

For a page of height `pageHeight` and an element of height
`elementHeight` (a field's `height`, or a signature image's `height`):

```text
pdfY = pageHeight - topY - elementHeight
```

`x` passes through unchanged. The page number is 1-indexed; out-of-range
pages throw. This is implemented by `topLeftYToPdfLibY` in `src/overlay.ts`:

- Text fields use `height` (default `14`pt when omitted).
- Signature images use the overlay's `height`.
- The certificate page is appended internally and needs no coordinates.

## Worked numeric example

Letter-size page (`612 × 792`pt). A text field at `x = 100`, `y = 200`
with the default height of `14`pt:

```text
pdfY = 792 - 200 - 14 = 578
```

so the field is drawn at pdf-lib coordinates `(100, 578)`. A signature
image at `x = 350`, `y = 340` with `height = 40`:

```text
pdfY = 792 - 340 - 40 = 412
```

drawn at `(350, 412)`.

## Per-field geometry (`examples/multi-signer.ts`)

Letter page (`612 × 792`pt). `pdfY` values follow the formula above.

| Field / placement      | Role       | Page | x   | y (top-left) | w × h (pt) | Font | pdfY |
| ---------------------- | ---------- | ---- | --- | ------------ | ---------- | ---- | ---- |
| `clientName`           | client     | 1    | 100 | 150          | 250 × 14   | 11   | 628  |
| `clientEmail`          | client     | 1    | 100 | 175          | 250 × 14   | 11   | 603  |
| `contractorName`       | contractor | 1    | 100 | 260          | 250 × 14   | 11   | 518  |
| `contractorEmail`      | contractor | 1    | 100 | 285          | 250 × 14   | 11   | 493  |
| Client signature       | client     | 1    | 100 | 340          | 160 × 40   | —    | 412  |
| Contractor signature   | contractor | 1    | 350 | 340          | 160 × 40   | —    | 412  |

The two field sets are tagged by `role` (`client` / `contractor`) so
higher-level flows can filter or resolve values per signer; the role tag
does not affect placement.

## WinAnsi text note

Text is drawn with `pdf-lib`'s standard Helvetica fonts, which only support
WinAnsi (8-bit) characters. Every value passes through `sanitizeWinAnsi`
(`src/sanitize.ts`) before drawing:

- C0 control characters (`0–31`) are dropped, except tab, line feed, and
  carriage return, which are preserved.
- Known Unicode punctuation is mapped to an ASCII equivalent: `‘ ’` → `'`,
  `“ ”` → `"`, `– —` → `-`, `…` → `...`.
- Any remaining code point above `255` is replaced with a single space.

Keep field values within WinAnsi (plain ASCII plus Latin-1) to avoid
silent `...`/space substitutions on the rendered page.

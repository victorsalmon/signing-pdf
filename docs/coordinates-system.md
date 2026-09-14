# Coordinates system guide (`examples/multi-signer-offline.ts`)

This guide explains the coordinate system used by
`examples/multi-signer-offline.ts`. The normative formula reference is
[`docs/coordinates.md`](coordinates.md): when the two documents disagree,
`docs/coordinates.md` wins. This guide agrees with it and only applies the
formula to the new example's coordinates.

All overlay geometry in `@clocklobster/signing-pdf` uses a **top-left origin**:
`x` grows right from the left edge and `y` grows down from the top edge, in
PDF points (1/72 inch). `pdf-lib` draws from a **bottom-left origin**, so the
library converts every placement internally. Callers pass top-left
coordinates and never convert by hand.

## Conversion formula and worked example

The normative conversion formula and a worked numeric example are in
[`docs/coordinates.md`](coordinates.md) and are not duplicated here.

## Per-field geometry (`examples/multi-signer-offline.ts`)

Letter page (`612 x 792`pt). Every `pdfY` below follows the formula above.

| Field / placement   | Role       | Page | x   | y (top-left) | w x h (pt) | Font | pdfY |
| ------------------- | ---------- | ---- | --- | ------------ | ---------- | ---- | ---- |
| `clientName`        | client     | 1    | 60  | 110          | 300 x 16   | 12   | 666  |
| `clientEmail`       | client     | 1    | 60  | 140          | 300 x 16   | 12   | 636  |
| `contractorName`    | contractor | 1    | 60  | 220          | 300 x 16   | 12   | 556  |
| `contractorEmail`   | contractor | 1    | 60  | 250          | 300 x 16   | 12   | 526  |
| Client signature    | client     | 1    | 60  | 310          | 180 x 50   | —    | 432  |
| Contractor signature| contractor | 1    | 330 | 310          | 180 x 50   | —    | 432  |

Spot-checks: `792 - 140 - 16 = 636`; `792 - 220 - 16 = 556`;
`792 - 250 - 16 = 526`; `792 - 310 - 50 = 432`.

The two field sets are tagged by `role` (`client` / `contractor`) so
higher-level flows can filter or resolve values per signer; the role tag
does not affect placement.

## Delta versus `examples/multi-signer.ts`

- Envelope ID: `env-multisigner-0001` vs
  `env-multisigner-offline-0002` (this example).
- Field positions: `x = 100` on every row there vs `x = 60` here
  (contractor signature `x = 350` there vs `x = 330` here); `y` rows
  `150 / 175 / 260 / 285` there vs `110 / 140 / 220 / 250` here;
  signature rows `y = 340` there vs `y = 310` here.
- Field size: implicit default height with `width: 250`, `fontSize: 11`
  there vs explicit `height: 16` with `width: 300`, `fontSize: 12` here.
- Signature size: `160 x 40` there vs `180 x 50` here.
- Document title, output filename, and integrity hash are distinct:
  `Multi-Signer Service Agreement` /
  `signing-pdf-multi-signer.pdf` /
  `multisigner-example-hash` there vs
  `Multi-Signer Offline Consulting Agreement` /
  `signing-pdf-multi-signer-offline.pdf` /
  `multisigner-offline-example-hash` here.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- Sanitize every caller-supplied certificate value (`envelopeId`, `completedAt`, signer `email`, `role`, `signedAt`, `ip`, `userAgent`, and `integrityHash`) before drawing. Attacker-controlled input containing non-WinAnsi characters (for example an emoji in a `User-Agent`) previously threw `WinAnsi cannot encode` and aborted certificate rendering.
- Resolve transitive `fast-uri` (high, 4 advisories) and `qs` (moderate, 3 advisories) advisories in the dev toolchain via pnpm overrides, and add a `pnpm audit` gate to CI.

### Changed

- Raise the published Node.js floor to `>=22.12.0` (was `>=18`) to match the development toolchain: `.nvmrc` pins 22.12.0, the pinned actions run Node 22, and Vitest 5 / Stryker 10 require Node 22. Node 18 and 20 consumers must upgrade; no runtime API changed.

### Fixed

- `embedSignatureImage` now preserves the original `pdf-lib` error as the `cause` of the `TypeError('Signature image must be a valid PNG')` it throws.

## [1.0.0] - 2026-08-17

### Added

- PDF field overlay — draw text values at top-left coordinates on existing PDF pages.
- Signature image embed — place base64-encoded PNG signature images on a PDF page.
- Certificate of Completion page — append a formatted page with signer details, timestamps, and an integrity hash.
- WinAnsi sanitization — replace common Unicode characters with ASCII-safe equivalents for `pdf-lib` standard fonts.

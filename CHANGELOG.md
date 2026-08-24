# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added

- PDF field overlay — draw text values at top-left coordinates on existing PDF pages.
- Signature image embed — place base64-encoded PNG signature images on a PDF page.
- Certificate of Completion page — append a formatted page with signer details, timestamps, and an integrity hash.
- WinAnsi sanitization — replace common Unicode characters with ASCII-safe equivalents for `pdf-lib` standard fonts.

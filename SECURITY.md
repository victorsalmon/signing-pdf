# Security policy

## Supported versions

Security fixes are applied to the current `main` branch and the latest published release. Older releases should be upgraded before requesting a backport.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use the repository host's private security-advisory channel or contact the maintainers privately through the project profile. Include reproduction steps, affected versions, impact, and any suggested mitigation. Do not include live credentials or customer data.

You can expect an acknowledgement within five business days. The maintainers will validate the report, coordinate a fix and disclosure timeline, and credit the reporter unless anonymity is requested.

## Scope

Reports are especially useful for:

- crafted PDFs or PNGs that crash or hang `loadPdf` / `embedSignatureImage`;
- path or content injection through field values, signer metadata, or certificate data;
- integrity-hash confusion — the certificate page records a hash for tamper-evidence, not a cryptographic signature;
- PII exposure via committed fixture PDFs, test data, or Git history.

The project does not accept real personal data in test cases or fixtures. Use obviously synthetic names, emails, and addresses.

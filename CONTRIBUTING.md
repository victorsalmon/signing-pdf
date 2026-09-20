# Contributing

## Setup

```bash
pnpm install
```

Requires Node.js >= 22.12 (dev/CI pin: `.nvmrc`, currently 22.12.0).

## Test

```bash
pnpm test              # vitest — unit tests, no network calls
pnpm test:property     # fast-check property tests
pnpm run typecheck     # tsc --noEmit
pnpm run build         # emit dist/ + declarations
```

## Pull requests

- Keep PRs small and focused — one concern per PR.
- Add or update tests for every behavior change.
- Use obviously synthetic names, emails, and addresses in fixtures — never real personal data or customer PDFs.
- Match the existing code style (strict TypeScript, ESM with `.js` import suffixes).
- Update `README.md` and `CHANGELOG.md` when the public API or behavior changes.

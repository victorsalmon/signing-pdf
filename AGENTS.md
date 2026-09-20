# AGENTS.md — signing-pdf

This file is a thin pointer. The machine rules for the ClockLobster dev fleet
live in the `saas-modules` repo's `AGENTS.md` and are binding here; repo setup,
commands, and conventions also live in [README.md](./README.md) and
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Commands

- `pnpm install --frozen-lockfile` — install exactly the committed lockfile.
- `pnpm run typecheck` — `tsc --noEmit` over `src`, `test`, and `examples`.
- `pnpm run build` — emit `dist/` from `src/`.
- `pnpm test` / `pnpm run test:property` — Vitest unit and fast-check property suites.
- `pnpm run test:mutation` — Stryker (non-gating, `thresholds.break: null`).
- `pnpm run format:check` / `pnpm run format` — Prettier for code and config
  (markdown is intentionally excluded).
- `pnpm audit --audit-level=high` — dependency-advisory gate.

## Rules

- Keep the package product-neutral: pure `pdf-lib` primitives only — no storage,
  network, email, or envelope-lifecycle concerns.
- Every caller-supplied value that reaches a PDF is WinAnsi-sanitized before
  drawing (`src/sanitize.ts`); keep that invariant and its tests.
- The public API is `src/index.ts`; do not add an `exports` map or otherwise
  change the API shape without an owner decision and a major-version release.
- Never commit secrets, `.env` files, or `dist/` output; fixtures use synthetic
  values only.
- One concern per commit, explicit paths only; run the gates before pushing.

# Releasing signing-pdf

Release checklist for `@clocklobster/signing-pdf`. All commands run from the
repository root.

## Preconditions

- Node.js per `.nvmrc` (22) with Corepack pnpm (`packageManager` field).
- Clean worktree (`git status --short` empty apart from ignored `node_modules/`).

## Steps

1. Bump the version (`npm version patch|minor|major` updates `package.json`;
   keep the `CHANGELOG.md` `## [Unreleased]` section in sync, then move its
   entries under a dated `## [x.y.z]` heading per Keep a Changelog).
2. Update `CHANGELOG.md` (Unreleased entries, no rewrites of released sections).
3. Build: `pnpm run build` (emits `dist/` via `tsconfig.build.json`).
4. Publish dry-run: `pnpm publish --dry-run` (expect the `dist/*.js` +
   `dist/*.d.ts` files plus `package.json`; the `files` field lists `dist`,
   `README.md`, `LICENSE`).
5. Tag and push: `git tag v$(node -p "require('./package.json').version")`
   then `git push origin main --tags` (CI runs on `main` pushes and pull
   requests; the tag flow matches the `release` expectations in `ci.yml`).

## CI gates (`.github/workflows/ci.yml`)

Ordered `install`, `typecheck`, `build`, `test`, then:

- Dependency audit (`pnpm audit --audit-level moderate`, fail-closed).
  Re-run locally with the same command. Known dev-only findings (prod tree
  `pnpm audit --prod` is clean; none of these ship in `dist/`):

  | Advisory | Path | Resolution | Owner | Upgrade trigger |
  | :--- | :--- | :--- | :--- | :--- |
  | `fast-uri` HIGH x4 (SSRF/host-confusion) | `@stryker-mutator/*` → `ajv` → `fast-uri` (dev-only) | upstream `>= 3.1.6` or `pnpm audit fix` | Maintainer | Drop once `ajv` pulls `fast-uri >= 3.1.6` without the fix |
  | `qs` MODERATE x3 (DoS family) | `@stryker-mutator/*` → `typed-rest-client` → `qs` (dev-only) | `pnpm.overrides` pin when adopted | Maintainer | Drop once the range resolves cleanly |

- Secret scan (fail-closed worktree grep, filenames only - never line
  content). Re-run locally with the CI grep (bash) or, on Windows
  PowerShell: `Get-ChildItem -Recurse -File | Where-Object {
  $_.FullName -notmatch 'node_modules|\.git|\\dist\\' } | Select-String
  -Pattern 'AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|BEGIN [A-Z ]*PRIVATE
  KEY|sk-live-[A-Za-z0-9]+' | Select-Object Path, LineNumber`.

## Known toolchain follow-ups (not release blockers owned here)

- Fresh `pnpm install` on pnpm 11 default-deny fails on the ignored
  `esbuild` postinstall script (`ERR_PNPM_IGNORED_BUILDS`); local validation
  used `pnpm install --ignore-scripts`. The approve-builds / install-semantics
  decision belongs to a toolchain track.

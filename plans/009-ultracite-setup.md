# Plan 009: Set up Ultracite for linting and formatting

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 581ee39..HEAD -- package.json src/ tsconfig.app.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 007 (dead code cleanup) — recommended but not required; dead code may trigger lint warnings
- **Category**: dx
- **Planned at**: commit `581ee39`, 2026-06-25

## Why this matters

The codebase has no linter or formatter — no ESLint, no Prettier, no Biome config. TypeScript catches type errors but doesn't enforce style, find unused variables, detect missing hook dependencies, or flag unreachable code. As the project grows (currently ~1,200 source lines), style drift and preventable issues will accumulate. Ultracite is a zero-config tool that wraps Biome (or ESLint/Oxlint) with battle-tested presets for React + TypeScript. It also generates configuration for AI agents (Claude Code, Copilot, Cursor) so they match the project's style.

## Current state

- No `.eslintrc.*`, `.prettierrc*`, `biome.json`, `oxlintrc.*` — no linter config at all
- `package.json` has no `lint` script
- No `.vscode/settings.json` with format-on-save configuration
- No `.editorconfig`
- The codebase follows implicit conventions (2-space indent, no semicolons, single quotes in JSX attributes via React conventions, trailing comma in multi-line arrays) — but none are enforced
- `AGENTS.md` exists at repo root and currently only lists agent skills; Ultracite can add a linter configuration section to it

Ultracite 7.8.3 is the current version. It supports Biome as a toolchain (recommended for a Vite + TypeScript project — it's a single fast binary). The plan uses Biome.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `npm install -D ultracite` | exit 0            |
| Init      | `npx ultracite init --linter biome --frameworks react --type-aware --editors universal --agents universal --quiet` | exit 0 |
| Lint check| `npx ultracite check`   | exit 0 (may print warnings for pre-existing issues) |
| Lint fix  | `npx ultracite fix`     | exit 0             |
| Build     | `npm run build`          | exit 0              |
| Tests     | `npm test`               | all pass            |

## Scope

**In scope**:
- `package.json` — add `ultracite` devDependency, add `"lint"` script, add `"format"` script
- Files created by `ultracite init`: `biome.json` (or equivalent config), `.vscode/settings.json` (if not present)
- `AGENTS.md` — Ultracite may append a linter/config section
- `src/` — auto-fixable lint issues (run `ultracite fix` to apply them)

**Out of scope**:
- Manually fixing non-auto-fixable lint warnings (flag them but don't change code outside the auto-fix pass)
- Changing any existing test behavior
- Updating CI config (no CI pipeline exists yet in this repo)
- Installing any ESLint plugins or custom rules — Ultracite's Biome preset covers everything needed

## Git workflow

- Branch: `advisor/009-ultracite`
- Commit message style: `chore: set up Ultracite with Biome for linting and formatting`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Install Ultracite

```bash
npm install -D ultracite
```

**Verify**: `npx ultracite --version` → prints a version string (e.g., `7.8.3`). `package.json` now has `"ultracite"` in `devDependencies`.

### Step 2: Initialize Ultracite (non-interactive)

```bash
npx ultracite init \
  --linter biome \
  --frameworks react \
  --type-aware \
  --editors universal \
  --agents universal \
  --quiet
```

This will:
- Install `@biomejs/biome` and related dependencies
- Create `biome.json` at repo root with React + TypeScript presets
- Create or update `.vscode/settings.json` with format-on-save
- Update `AGENTS.md` with linter context
- Add `"lint"` script to `package.json` (or you verify it and add manually)

**Verify**: `ls biome.json` → file exists. `npx ultracite check` → exits 0 (may print warnings/issues but should not error).

### Step 3: Verify and add lint/format scripts to package.json

Check if `ultracite init` added scripts to `package.json`. If the `scripts` section already has `"lint"` and `"format"`, skip this step. If not, add them:

```json
"lint": "ultracite check",
"format": "ultracite fix"
```

Place them after the existing `"test"` script.

**Verify**: `npm run lint` → exits 0. `npm run format` → exits 0.

### Step 4: Run auto-fix and review

```bash
npx ultracite fix
```

This applies all auto-fixable lint rules. Common changes in this codebase may include:
- Import ordering
- Consistent quote style
- Trailing commas
- Semicolons
- Whitespace/indentation

**Verify**: `npx ultracite check` → exits 0 with zero issues (or only non-auto-fixable warnings remaining).

### Step 5: Verify build and tests still pass

```bash
npm run build && npm test
```

**Verify**: Build exits 0, all 31 tests pass (or 33 with the skipped tests if `--reporter verbose`). If the auto-fix changed formatting of test files, tests must still pass.

### Step 6: Review the generated `biome.json`

Read `biome.json` and verify it contains sensible defaults for this project:
- Language: TypeScript + JSX
- Formatter: indent style = space, indent width = 2 (match existing code)
- Linter: recommended rules for React + TypeScript

If the defaults look reasonable, no changes needed. If anything is clearly wrong (e.g. tab-width 4 when the codebase uses 2), adjust it.

**Verify**: `cat biome.json` and inspect for correctness.

## Test plan

No new tests. The existing test suite validates behavior hasn't changed. The lint/format commands are their own verification — `npm run lint` exiting 0 proves the codebase is clean.

## Done criteria

- [ ] `npx ultracite --version` prints a version
- [ ] `biome.json` exists at repo root
- [ ] `npx ultracite check` exits 0 with zero issues
- [ ] `npm run lint` exits 0
- [ ] `npm run format` exits 0
- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0 (all tests pass)
- [ ] `.vscode/settings.json` exists (or was updated) with format-on-save for Biome
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- `ultracite init --quiet` fails or hangs — the interactive mode may be required. Retry without `--quiet` and accept defaults.
- `ultracite init` tries to install an incompatible version of Biome or Node — check `node --version` (should be >=18).
- Auto-fix produces broken code — verify with `npm run build && npm test`. If broken, `git checkout -- .` and report.
- The tool reports type-aware rules require a `tsconfig.json` that doesn't extend properly — verify `tsconfig.app.json` is the correct path (`tsconfig.json` has references to it).
- Non-auto-fixable warnings remain after `ultracite fix` — this is expected; don't try to fix them manually. Just verify the code builds and tests pass.

## Maintenance notes

- Run `npm run lint` in CI (once CI is set up) to catch regressions.
- Run `npm run format` before commits, or configure a pre-commit hook (Ultracite init may have set up Husky — check `.husky/`).
- If new frameworks are added (e.g., Next.js, Tailwind CSS is already present), re-run `npx ultracite init` with `--frameworks` updated to pick up framework-specific rules.
- The `--type-aware` flag enables rules that need type information. If the project's `tsconfig.json` changes, these rules may break — re-run `ultracite doctor` to diagnose.
- Ultracite's `AGENTS.md` updates tell AI agents about the project's linting setup. Keep this in sync if rules change.
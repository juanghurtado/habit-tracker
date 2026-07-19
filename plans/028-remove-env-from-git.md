# Plan 028: Remove .env from git history and harden .gitignore

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git log --oneline | head -1`
> Then: `git ls-files .env`
> If `.env` still appears in the git index, compare against these steps;
> on a mismatch (e.g., someone already removed it), treat it as a STOP
> condition and report back.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — git history operation and a one-line gitignore change
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `9d536b0`, 2026-07-09
- **Issue**: —

## Why this matters

`.env` (Supabase anon key stored in plaintext) was committed to version control (`.github/` CI config uses env vars, so keys are being used). Although `.gitignore` lists `.env`, the file was added to the index before the gitignore rule took effect (or was added after). Anyone with git history access can read the Supabase project URL and anon key (`sb_publishable_...`). The key is a client-side publishable key (not an admin secret), so it cannot create roles or alter configs, but it does expose the project identifier and can be used by attackers to enumerate existing data if RLS is misconfigured.

**Note**: A committed credential is burned regardless of removal. The `.git` fix alone is insufficient — **the Supabase anon key must be rotated in the Supabase dashboard**. This plan covers the git-level remediation only; the rotation step is noted in Maintenance notes.

## Current state

- `.env:1-3` contains:
  ```
  VITE_SUPABASE_URL=https://gswmwdocfopelzagntzj.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_3c1fNeDkNsAJJ5ovG_Wzyw_fnB8-4kE
  VITE_APP_URL=http://localhost:5173
  ```
- `.gitignore:5` — `.env` is listed (so it would be excluded for new clones), but `.env` is already in the git index
- `.env.example` exists and has proper placeholder values

## Commands you will need

| Purpose      | Command                              | Expected on success |
|--------------|--------------------------------------|---------------------|
| Git status   | `git ls-files .env`                  | lists `.env` (verifying it's tracked) |
| Git history  | `git log --all --oneline -- .env`    | shows commits that touched `.env` |

## Scope

**In scope** (the only files to modify):
- `.env` — removed from git index (and working tree if safe)
- `.gitignore` — verify `.env` and `*.env` patterns ensure future protection

**Out of scope** (do NOT touch):
- Any production code file
- Key rotation (done in Supabase dashboard — see Maintenance notes)

## Git workflow

- Branch: `advisor/028-remove-env-from-git`
- Commit: `security: remove .env from git history`
- Follow conventional commits as in `git log`

## Steps

### Step 1: Verify .env is tracked and confirm the commit history

```bash
git ls-files .env
```
Expected: `.env` is listed (proves it's tracked).

```bash
git log --all --oneline -- .env
```
Expected: at least one commit showing `.env` was added.

### Step 2: Remove .env from git index (without deleting the local file)

```bash
git rm --cached .env
```
Expected: `rm '.env'` — the file is removed from git tracking but remains on disk (still needed for local development).

### Step 3: Verify .gitignore will block future accidential commits

Check that `.gitignore` contains `.env`:
```bash
grep -n '\.env' .gitignore
```
Expected: at least one line matching `.env` (line 5 in current file).

The current `.gitignore` at line 5 already has `.env`. If it didn't, add it as a new line at the top of the file:
```
# dotenv
.env
```

### Step 4: Verify the working state

```bash
git status
```
Expected: `.env` is listed under "Changes not staged for commit" (because it's now untracked again).

```bash
cat .env
```
Expected: the file still exists with contents (dev environment still works).

## Test plan

**No new tests needed** — this is a git operation, not a code change.

**Verification**: `git ls-files .env` returns **no output** (empty, no lines). This proves `.env` is no longer tracked.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git ls-files .env` returns no output (empty stdout)
- [ ] `.env` file still exists on disk (`cat .env` succeeds)
- [ ] `.gitignore` contains `.env` pattern (grep returns a line)
- [ ] `git status` shows `.env` as an untracked file
- [ ] No files outside `.env` and `.gitignore` are modified

## STOP conditions

Stop and report back (do not improvise) if:

- `.env` does **not** appear in `git ls-files` (it was already removed — STOP and confirm).
- `git rm --cached .env` fails with an error (the file doesn't exist in the index — STOP and check if someone else removed it).
- The `.gitignore` doesn't contain `.env` — STOP and ask if you should add it (the existing `.gitignore` at line 5 has `.env`, so this should not happen).

## Maintenance notes

**CRITICAL: Rotate the Supabase anon key.** The key `sb_publishable_...` has been in git history and is considered compromised. After this plan lands:
1. Go to the Supabase dashboard → Project Settings → API
2. Regenerate the anon (public) key
3. Update `.env` (and any CI/CD environment variables) with the new key
4. Do NOT commit the new key — only keep it in CI variables and local `.env`

This plan only removes the file from git history; it does not rotate the key. The rotation is an external operation that must be done manually in the Supabase dashboard.
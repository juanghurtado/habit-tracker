# Optional cloud backup via Supabase with offline-first background sync

Data lives in localStorage as the source of truth, with optional sync to Supabase for durability and cross-device access. On first visit (no session, no local data) a gate offers anonymous or email-magic-link sign-in. Users with existing data or a session skip the gate entirely. Anonymous users with data can sign in from within the app via an Auth Entry; signing in uploads their local data and enables sync going forward.

## Context

The app was localStorage-only, which meant all data was lost on browser clear, device replacement, or browser switch. GitHub Pages prevents running a server-side backend, so any cloud solution must be a BaaS that the SPA talks to directly.

## Considered Options

- **GitHub Gist as storage**: no infra, GitHub OAuth is natural for a GH Pages app. Rejected because Gist API has rate limits (5k/hour) and no real-time querying; the entire dataset must be read/written as a single blob, making partial sync impossible.
- **Supabase (chosen)**: hosted Postgres with auth, RLS, and a JS client. Generous free tier (500 MB database, 50k monthly active users). Well-documented, no server code needed.
- **Anonymous-first flow**: without this, adding auth would destroy the zero-friction tap-and-go experience that is the product's core value.
- **Server-first vs local-first**: chose local-first (localStorage as source of truth) because the app must work offline (commute, outdoors, in bed) and the core interaction must be instant. Supabase is the backup, not the primary store.

## Consequences

- Existing localStorage users get migrated on first load: data is read from old keys, transformed to the new schema (with `user_id`, `synced_at`, `updated_at`, `deleted_at`), and written back under new keys.
- Habits use last-writer-wins by `updated_at` with soft deletes; completions are append-only with no conflict resolution (both copies land). This eliminates the need for CRDTs or complex merge logic.
- Sync fires on every write (debounced 2s) + `visibilitychange` event. A `synced_at` field identifies records pending upload.
- Supabase RLS ensures users can only read/write their own data (`user_id = auth.uid()`). Anonymous users have no Supabase row and sync is a no-op.
- If Supabase goes down, the app works fine — writes go to localStorage and queue for later sync. The only loss is cross-device sync until Supabase recovers.
- Future maintainers need a Supabase project to develop the sync feature. The project ref and anon key are set via Vite environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), read from a local `.env` file. `.env` is gitignored; a `.env.example` file documents the required variables. During manual deployment, the builder's `.env` is used at build time.
# Onboarding — Hermes
<!-- This document is for any engineer (or future you) setting up the project from scratch. -->
<!-- Keep this updated as the setup process changes. -->

## Prerequisites

- Node.js 18+
- npm or pnpm
- Git
- A Supabase account (with access to the Project Hermes organization)
- A Vercel account

## First-Time Setup

### 1. Clone the repo
```bash
git clone https://github.com/clintmccoy/hermes.git
cd hermes
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in all required values. See comments in the file for where to find each value.

### 4. Set up Supabase (local development)

Install the Supabase CLI if you haven't already:
```bash
brew install supabase/tap/supabase
```

Link to the project:
```bash
supabase link --project-ref thnestsqhohsqxlmrvbc
```

You'll be prompted for the database password — ask the project owner or find it in 1Password.

Apply all migrations to get local schema in sync:
```bash
supabase db push --linked
```

### 5. Run the development server
```bash
npm run dev
```
App runs at http://localhost:3000

---

## Supabase Branching — How PR Previews Work

Every PR against `main` gets a fully isolated environment: a dedicated Supabase database branch paired with its own Vercel preview URL. No shared dev database, no migration collisions between branches.

**The lifecycle is fully automatic:**

1. **PR opened** → Supabase GitHub App provisions a fresh Postgres branch seeded from `main`'s migration history. Vercel preview deployment receives the branch-specific `SUPABASE_URL` and `SUPABASE_ANON_KEY` automatically via the Supabase Vercel integration.

2. **CI runs** → The `migration-smoke-test` job in `.github/workflows/ci.yml` links to the project, applies any pending migrations in the PR to the preview branch, and verifies the migration list is clean. If any migration fails to apply, the job fails and blocks the merge.

3. **PR merged or closed** → Supabase GitHub App tears down the preview branch. No manual cleanup needed.

### Adding a migration

1. Create your SQL file in `supabase/migrations/` following the naming convention: `YYYYMMDDHHMMSS_descriptive_name.sql`
2. Also create a rollback script in `supabase/migrations/rollback/` with matching name
3. Open a PR — the preview branch will apply the migration automatically
4. Verify in the Vercel preview that the app works against the new schema
5. Merge — migration applies to production via `supabase db push` on main

### Required GitHub Secrets

These must be present for the `migration-smoke-test` CI job to work:

| Secret | Where to find it |
|---|---|
| `SUPABASE_PROJECT_ID` | Already set — `thnestsqhohsqxlmrvbc` |
| `SUPABASE_ACCESS_TOKEN` | [Supabase dashboard](https://supabase.com/dashboard/account/tokens) → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | Supabase dashboard → Project Settings → Database → Database password |

Set secrets at: https://github.com/clintmccoy/hermes/settings/secrets/actions

---

## Deployment

Deployments are handled automatically via Vercel:
- Push to `main` → production deployment
- Open a PR → preview deployment with isolated Supabase branch (see above)

---

## Project Structure
<!-- Fill in once the app structure is established -->

## Key Concepts & Gotchas

- **Never run `supabase db push --linked` without being on the right branch** — the CLI routes the push to the Supabase branch that corresponds to your current git branch. On `main` it pushes to production.
- **Migration files are the source of truth** — if a migration exists in Supabase but not in `supabase/migrations/`, it will cause drift. Always add the SQL file to the repo.
- **Rollback scripts are mandatory** — every migration that modifies existing rows must have a corresponding rollback in `supabase/migrations/rollback/`.

## Contacts
- **Owner**: Clinton McCoy (clintmccoy)
- **Repo**: https://github.com/clintmccoy/hermes
- **Linear**: https://linear.app/mccoymc/project/project-hermes

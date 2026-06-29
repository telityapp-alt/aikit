# aikit — Foundation (Architecture & Setup)

Production foundation for the aikit platform. The landing UI is unchanged — this
layer adds **auth, data, a secure backend, and real routing** underneath it.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React 19, `react-router-dom` |
| Auth + DB + Storage | Supabase (Postgres, RLS, Auth) |
| Secure backend | Cloudflare **Pages Functions** (`/functions`) — Workers under the hood |
| Hosting | Cloudflare Pages (build `dist`, SPA fallback via `public/_redirects`) |

### Why Pages Functions (the "perlu Workers?" answer)
Yes — but as **Pages Functions**, not a separate Worker. They live in `/functions`
and deploy with the same `git push`. They exist so secret keys (Supabase service
role, Anthropic, ScrapeCreators, Xendit) run **server-side only** and never reach
the browser. The client only ever holds the Supabase *publishable* key.

## Concepts

- **Module** = a full mini-app with its own state (e.g. Manajer Keuangan Pribadi).
  Routed at `/dashboard/module/:slug`, registered in `src/modules/registry.js`,
  state persisted per-user in `module_instances`.
- **Automation** = a single dashboard job (e.g. Instagram Analyzer). "Run" hits
  `/api/runs` → provider → `runs` table. No app of its own.

## Environment variables

**Client (`.env`, exposed to browser — safe):**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

**Server (`.dev.vars` locally / Cloudflare Pages dashboard in prod — secret):**
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...        # enables real AI Agent replies
SCRAPECREATORS_API_KEY=...   # scraper provider (runs.js stub)
XENDIT_SECRET_KEY=...        # payment (topup.js stub)
```
`.env` and `.dev.vars` are git-ignored. Only `.env.example` is committed.

## One-time Supabase setup

1. Open the project's **SQL Editor** in the Supabase dashboard.
2. Run `supabase/migrations/0001_init.sql` (schema, RLS, triggers, RPC).
3. Run `supabase/migrations/0002_seed.sql` (automations + modules catalog).
4. **Auth → Providers**: enable Email; turn on "Confirm email".
5. **Auth → URL Configuration**: add your Pages domain (and `http://localhost:5173`)
   to redirect URLs.

> The migrations are idempotent. They could not be auto-applied here because the
> Postgres **database password** wasn't provided (the value given authenticated
> only as an app login, not the DB role).

## Local development

```bash
npm install
npm run dev                       # Vite only (UI + Supabase; /api/* won't run)
npx wrangler pages dev -- npm run dev   # full stack incl. Pages Functions
```
For the AI Agent / runs / top-up endpoints you must run via `wrangler pages dev`
(or deploy) so `/api/*` Functions execute with `.dev.vars`.

## Deploy (Cloudflare Pages)

1. Connect the repo in Cloudflare Pages.
2. Build command `npm run build`, output directory `dist`.
3. Add all **server** env vars under Settings → Environment variables.
4. Add the **client** `VITE_*` vars too (needed at build time).
5. Deploy. `functions/` is picked up automatically; `_redirects` handles SPA routing.

## Map of new files

```
functions/
  _middleware.js        JWT auth guard for /api/*
  _supabase.js          server helpers (getUser, db, rpc)
  api/runs.js           run automation (credits + run record; provider stub)
  api/chat.js           AI Agent → Anthropic (claude-sonnet-4-6) + persistence
  api/topup.js          credit top-up (Xendit stub)
src/lib/
  supabase.js           browser client
  AuthContext.jsx       session + profile + sign in/up/out
  ToastContext.jsx      notifications
  api.js                authed fetch to /api/*
src/components/
  AuthModal.jsx/.css    login/signup popover
  ProtectedRoute.jsx    dashboard gate
src/modules/
  registry.js           slug → mini-app
  KeuanganPribadi.jsx   sample module (persistence pattern)
supabase/migrations/    0001_init.sql, 0002_seed.sql
```

## Security notes

- Service-role key is only in `functions/` + `.dev.vars` / Pages dashboard — never `VITE_`.
- All user-scoped tables have RLS (`auth.uid() = user_id`); catalogs are read-only.
- Credit spend is atomic via the `spend_credits` RPC (security definer).
- Payment + scraper providers are intentionally **stubbed** — wire keys to go live.

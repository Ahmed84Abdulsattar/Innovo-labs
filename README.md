# Innovo Labs — Digital Initiatives Portal

> Track, evaluate and onboard technology innovations across all Innovo business units.

---

## Project Structure

```
innovo-labs/
├── apps/
│   └── web/                         # The entire application (Next.js 16)
│       │
│       ├── app/                     # Next.js App Router
│       │   ├── (app)/               # All authenticated pages
│       │   │   ├── dashboard/
│       │   │   ├── startups/
│       │   │   │   ├── [id]/        # Startup detail page
│       │   │   │   └── new/         # Add startup form
│       │   │   ├── initiatives/     # Initiatives board (list + [id])
│       │   │   ├── collaborations/  # Collaborations board (list + [id])
│       │   │   ├── challenges/      # Innovation challenges (list + [id])
│       │   │   ├── news/            # News / announcements (list + [id])
│       │   │   ├── ideas/           # Idea submissions (list + [id])
│       │   │   ├── innovation-concierge/  # Guided recommendation flow (+ results)
│       │   │   ├── profile/
│       │   │   └── admin/
│       │   │       ├── users/
│       │   │       └── audit/
│       │   │
│       │   ├── api/                 # ── BACKEND: All API endpoints ──
│       │   │   ├── auth/            # sso, callback/azure, logout, me
│       │   │   │                    #   (login is retired — Microsoft SSO only)
│       │   │   ├── startups/        # GET, POST, PATCH, DELETE (+ [id])
│       │   │   ├── initiatives/     # Initiatives board CRUD
│       │   │   ├── collaborations/  # Collaborations CRUD
│       │   │   ├── challenges/      # Challenges CRUD
│       │   │   ├── news/            # Articles + upload-video
│       │   │   ├── users/           # GET, PATCH
│       │   │   ├── ideas/           # GET, POST, PATCH, DELETE (+ [id]/history)
│       │   │   ├── comments/        # GET, POST (startups + ideas) · [id]: PATCH/DELETE
│       │   │   │                    #   (edit own; delete own or super-admin)
│       │   │   ├── ratings/         # POST
│       │   │   ├── timeline/        # POST, DELETE
│       │   │   ├── notifications/   # GET
│       │   │   ├── upload/          # POST — image upload to Storage
│       │   │   └── audit/           # GET, POST
│       │   │
│       │   ├── login/               # Login page (public)
│       │   ├── layout.tsx           # Root HTML layout
│       │   ├── (app)/layout.tsx     # Auth shell + React Query provider
│       │   ├── page.tsx             # Root redirect
│       │   └── globals.css          # Global styles + design tokens
│       │
│       ├── components/              # React components
│       │   ├── startups/tabs/       # Detail page tabs (Costs, Cyber, Docs, Video)
│       │   ├── layout/              # Sidebar, PageHeader
│       │   └── ui/                  # Reusable primitives (Badge, MultiSelect, …)
│       │
│       ├── lib/                     # ── SHARED LOGIC — split by where it runs ──
│       │   ├── server/              # BACKEND — every file has `import 'server-only'`
│       │   │   │                    #   (build FAILS if imported into the browser)
│       │   │   ├── api/handler.ts   # defineRoute() — auth/RBAC/validation/errors
│       │   │   ├── db/client.ts     # PostgreSQL pool + query helpers
│       │   │   ├── auth/session.ts  # JWT creation + verification
│       │   │   ├── storage.ts       # Private buckets + signed URLs
│       │   │   ├── serializers.ts   # snake↔camel mapping + file-ref signing
│       │   │   ├── server-cache.ts  # Vercel KV cache (in-memory fallback)
│       │   │   ├── rate-limit.ts    # Per-route rate limiting
│       │   │   ├── audit.ts         # Audit-log writes (via after())
│       │   │   ├── config.ts        # Env vars, validated — holds secrets
│       │   │   └── logger.ts        # Structured logging (pino)
│       │   ├── client/              # FRONTEND — browser-only (`'use client'` / `import 'client-only'`)
│       │   │   ├── hooks/           # React Query data hooks (useIdeas, useInitiatives, useStartupComments)
│       │   │   ├── context.tsx      # Global React state (startups, users, notifs)
│       │   │   ├── theme.tsx        # Light/dark theme provider
│       │   │   ├── upload-image.ts  # Client → Storage upload helper
│       │   │   ├── compress-image.ts
│       │   │   ├── exportToExcel.ts # Excel export (ExcelJS, in-browser)
│       │   │   ├── hover.ts         # Card hover effect
│       │   │   └── supabase-browser.ts
│       │   └── shared/              # SHARED — safe on both server and client (no secrets)
│       │       ├── types.ts         # All TypeScript types
│       │       ├── validate.ts      # Zod request schemas
│       │       ├── permissions.ts   # RBAC + visibility rules
│       │       ├── constants.ts     # Departments, statuses, etc.
│       │       ├── nav.ts           # Back-navigation helper
│       │       └── data/            # Static reference data / option lists
│       │
│       ├── proxy.ts                 # Middleware: security headers/CSP, CSRF, auth gate
│       ├── next.config.js           # Next build config (external pkgs, dev origins)
│       └── …                        # tailwind / tsconfig / vercel.json
│
├── scripts/
│   ├── migrate.js                   # Apply migrations: node scripts/migrate.js
│   ├── seed.js                      # Grant first super admin: node scripts/seed.js <email>
│   ├── backfill-images-to-storage.js# One-off: move legacy base64 images → Storage
│   └── cleanup-orphan-images.js     # Reconcile: delete unreferenced Storage files
│
├── supabase/
│   └── migrations/                  # 000–043 — applied in order by migrate.js
├── docs/
│   ├── architecture.md
│   ├── CONVENTIONS.md               # DB + app coding standards
│   ├── deployment.md
│   ├── PERMISSIONS.md               # RBAC roles + capability matrix
│   ├── REBASELINE.md                # How to rebaseline migrations from prod
│   └── schema.sql                   # Authoritative schema snapshot (see REBASELINE.md)
│
├── .env.example                     # Copy to apps/web/.env.local
└── README.md
```

---

## Frontend vs Backend — where things live

| Concern | Location |
|---|---|
| Pages (React) | `app/(app)/` |
| API endpoints | `app/api/**/route.ts` |
| **Backend logic** (server-only) | `lib/server/**` |
| **Frontend logic** (browser-only) | `lib/client/**` |
| **Shared** (types, validation, permissions) | `lib/shared/**` |
| API route wrapper (auth/RBAC/validation) | `lib/server/api/handler.ts` (`defineRoute`) |
| Database connection | `lib/server/db/client.ts` |
| Database schema | `supabase/migrations/*.sql` (applied in order) · `docs/schema.sql` (authoritative snapshot) |
| Auth (JWT sessions + Microsoft SSO) | `lib/server/auth/` · `app/api/auth/` |
| Route protection | `proxy.ts` |
| Permissions / RBAC | `lib/shared/permissions.ts` |
| File storage (private + signed URLs) | `lib/server/storage.ts` |
| Server-side caching | `lib/server/server-cache.ts` |
| Client data fetching | `lib/client/hooks/*` (React Query) + `lib/client/context.tsx` |
| UI components | `components/` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables |
| Database | PostgreSQL via Supabase |
| Client data | TanStack React Query v5 (+ React Context) |
| File storage | Supabase Storage (private buckets + signed URLs) |
| Auth | Microsoft Entra ID (Azure AD) SSO · JWT in an HttpOnly cookie |
| Validation | Zod |
| Caching | Vercel KV / Upstash (optional, in-memory fallback) |
| Hosting | Vercel |

---

## Architecture & Engineering Notes

These are the conventions to follow when extending the codebase.

### Code isolation — `lib/server` · `lib/client` · `lib/shared`
Shared logic is split by **where it is allowed to run**, and the boundary is
**enforced by the compiler**, not by convention:

- **`lib/server/`** — backend only (DB, auth, secrets, storage, caching, rate
  limiting). Every file starts with `import 'server-only'`, so the **build fails**
  if any of it is ever imported into a Client Component. Server code and secrets
  can never end up in the browser bundle.
- **`lib/client/`** — browser only (React Query hooks, context, theme, upload/
  image helpers, Excel export). Browser-only helpers carry `import 'client-only'`.
- **`lib/shared/`** — safe on both sides and free of secrets (TypeScript types,
  Zod schemas, the permissions matrix, constants, static option data).

API routes in `app/api/**` are thin entrypoints that import their logic from
`lib/server`. Put new code in the folder that matches where it runs.

### API routes — `defineRoute`
Every endpoint under `app/api/**/route.ts` is built with **`defineRoute`** from
[`lib/server/api/handler.ts`](apps/web/lib/server/api/handler.ts). It centralises the cross-cutting
concerns so handlers stay focused on business logic:

```ts
export const PATCH = defineRoute({
  roles: ['super_admin', 'innovation_admin'],   // RBAC gate (optional)
  schema: UpdateThingSchema,                      // Zod body validation (optional)
  errorMessage: 'Failed to update thing',         // uniform error envelope
}, async ({ user, body, params }) => { /* … */ })
```

It handles session auth, role gating, request validation, and consistent error
responses. Throw `HttpError(status, message)` for expected failures.

### Data fetching — React Query first
New client data should use **React Query hooks** in
[`lib/client/hooks/`](apps/web/lib/client/hooks/) (see `useIdeas`,
`useStartupComments`). These load on demand, cache, dedupe, and invalidate on
mutation — instead of being eagerly fetched on boot.

`lib/client/context.tsx` is the older "global state" pattern and still owns
**startups, users, and notifications** (eager-loaded once after login). It is
being incrementally decomposed into hooks; prefer a hook for anything new.

### File storage — private + signed
Images, documents, and videos live in **private** Supabase Storage buckets
(`images`, `documents`, `videos`). [`lib/server/storage.ts`](apps/web/lib/server/storage.ts):

- **Reads** are served via short-lived **signed URLs** (`signImages`) — files are
  never publicly reachable.
- **Writes** normalise URLs (`canonicalImageUrl`) so an expiring signed URL is
  never persisted to the DB.
- **Removals** delete the underlying object (`deleteImages`).
- `scripts/cleanup-orphan-images.js` reconciles any files no DB row references.

### Database
Migrations `000`–`043` in [`supabase/migrations/`](supabase/migrations/) are applied in order by
`scripts/migrate.js`. The migration history no longer rebuilds production exactly —
`docs/schema.sql` is the authoritative snapshot and `docs/REBASELINE.md` covers
regenerating a clean baseline. Notable performance/hardening work:

- `026` — performance indexes (GIN for array `@>`, trigram for `ILIKE`, expression indexes)
- `027` — fixes `collaborations.updated_at` (was referenced by a trigger but missing)
- `028` — hardens function `search_path`
- `029` — `search_vector` (tsvector) covers evaluation fields for full-text search
- `013` / `024` — Row-Level Security

### Security & caching
- **Microsoft SSO only** (Entra ID / Azure AD); JWT in an HttpOnly cookie.
- RBAC + visibility rules in `lib/shared/permissions.ts` (see `docs/PERMISSIONS.md`).
- Per-route rate limiting (`lib/server/rate-limit.ts`).
- Security headers / CSP, the CSRF origin check, and the auth gate are all set in
  the middleware (`proxy.ts`) — one source of truth (`vercel.json` has none).
- Every DB table has Row-Level Security enabled; the app uses the service role.
- `lib/server/server-cache.ts` uses Vercel KV (Upstash REST) when configured, and falls
  back to an in-memory cache otherwise — so it is safe to run with no KV env vars.

---

## Role System

| Role | Can do |
|---|---|
| `super_admin` | Everything — unrestricted |
| `innovation_admin` | Full CRUD within own business unit |
| `contributor` | Update evaluation fields on startups in own BU |
| `viewer` | Read-only, plus submit ideas, comment, and rate startups |

See [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md) for the full capability matrix, scope rules, and per-route enforcement.

---

## Getting Started

```bash
# 1. Go into the web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Set up environment
cp ../../.env.example .env.local
# Edit .env.local with your Supabase + Azure AD (Microsoft SSO) credentials

# 4. Run database migrations (applies anything not yet recorded)
node ../../scripts/migrate.js

# 5. Build & start
npm run build && npm start
```

### First Super Admin
After signing in with Microsoft SSO for the first time (which creates your account):
```bash
node scripts/seed.js your.email@innovogroup.com
```

### Maintenance scripts
These connect to Supabase via `apps/web/.env.local` and need `pg`,
`@supabase/supabase-js`, and `dotenv` resolvable. If those packages live only in
`apps/web/node_modules`, point Node at them when running from the repo root:

```bash
# Windows (cmd) — run from the repo root
set "NODE_PATH=%CD%\apps\web\node_modules"
node scripts/cleanup-orphan-images.js --dry-run   # report orphaned Storage files
node scripts/cleanup-orphan-images.js             # delete them
```

---

© Innovo Labs 2026

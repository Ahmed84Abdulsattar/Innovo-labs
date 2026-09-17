# Source Code Management (SCM) Review

**Date:** 4 August 2026 · **Repo:** Initiatives-Portal (GitHub, org: Innovo-Digital-Innovation)

---

## 1. Current state

| Aspect | Finding |
|---|---|
| Host | GitHub (private, organisation repo) |
| History | 276 commits |
| Active branch | `master` (single long-lived branch) |
| Deployment trigger | Vercel auto-deploys on push to `master` |
| Secrets in repo | ✅ None tracked — `.env*` files are git-ignored |
| `.gitignore` | ✅ Ignores `node_modules/`, `.next/`, and all `.env*` variants explicitly |
| Commit style | ✅ Descriptive, imperative subject + body explaining *why*; co-author trailer |
| Monorepo layout | `apps/web` (Next.js app), `supabase/migrations`, `docs`, `load-tests`, `scripts` |

## 2. Repository structure

```
Initiatives-Portal/
├─ apps/web/            # Next.js 16 app (frontend + API routes)
│  ├─ app/             # App Router pages + app/api/** route handlers
│  ├─ lib/server/      # server-only: db, auth, config, handler
│  ├─ lib/client/      # client-only: theme, hooks
│  ├─ lib/shared/      # isomorphic: validation, permissions, types
│  └─ __tests__/       # Vitest unit tests
├─ supabase/migrations/ # 51 ordered SQL migrations (schema + RLS)
├─ docs/               # architecture, OpenAPI, audits, runbooks
├─ load-tests/         # k6 performance scripts
└─ scripts/            # operational scripts
```

## 3. Strengths
- **No secrets committed** — the single most important SCM property; verified clean.
- **Clear layered structure** with compiler-enforced server/client isolation.
- **Ordered, reviewable migrations** (`044_…`, `050_…`) — schema changes are versioned in-repo.
- **Good commit messages** — each explains rationale, not just the change.

## 4. Recommendations (for a growing / vendor-shared repo)

| # | Recommendation | Why |
|---|---|---|
| 1 | **Adopt a branch + PR model** — feature branches → PR → merge to `master` | Currently commits land directly on `master` (which auto-deploys). A PR gate enables review + CI before production. |
| 2 | **Protect `master`** — require PR review + passing CI before merge (GitHub → Settings → Branches) | ⚠️ **The key remaining gap.** CI exists but isn't *enforced* — a direct push to `master` still deploys without the checks passing. This is a settings toggle. |
| 3 | ✅ **CI already exists** — `.github/workflows/ci.yml` runs `tsc --noEmit`, `npm test`, and `next build` on push/PR; an `npm audit` step was added | Regressions are caught *if* branch protection (rec #2) makes CI required. |
| 4 | **Add a `preview` environment** — Vercel preview deploys per PR | Test changes on a real URL before they hit prod. |
| 5 | **Dependabot / scheduled `npm audit`** | Keep the 0-vuln state from drifting. |
| 6 | **CODEOWNERS + PR template** | Clear ownership and a review checklist. |
| 7 | **Tag releases** (`v1.0.0`, …) | Traceability of what shipped when; easier rollback reference. |

## 5. Branching model (suggested)

```
master   ← protected, auto-deploys to production
  ▲
  │ PR (review + CI green)
  │
feature/*  ← short-lived branches per change
hotfix/*   ← urgent production fixes
```

> For a single/small team this is lightweight (trunk-based with PRs). It adds the
> one missing safeguard: **nothing reaches production without passing checks.**

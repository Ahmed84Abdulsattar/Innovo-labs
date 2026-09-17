# Coding Standards & Best-Practices Audit

**Date:** 4 August 2026 · **Baseline:** `docs/CONVENTIONS.md`
**Scope:** 98 TypeScript/TSX files under `app/`, `lib/`, `components/`.

---

## Scorecard

| Standard | Result | Notes |
|---|---|---|
| No type suppression | ✅ **0** `@ts-ignore` / `@ts-nocheck` | Type safety not bypassed anywhere |
| No lingering debt markers | ✅ **0** `TODO` / `FIXME` / `HACK` | Clean |
| Strict TypeScript | ✅ `tsc --noEmit` clean | 0 type errors |
| Consistent route pattern | ✅ **23 / 28** route files use `defineRoute` | The other 5 are auth + upload, which legitimately don't (can't require a session to log in) |
| Parameterized SQL | ✅ 100% | No string-interpolated queries |
| Server/client isolation | ✅ enforced | `server-only` / `client-only` guards |
| Test suite | ✅ 71 tests pass | permissions, validation, rate-limit, handler, contributor-access |
| Structured logging | ✅ **6** `console.*` calls — all client-side | Correct: the pino `logger` is `server-only`; `console.error` is the right tool in `'use client'` components (error boundary, export `.catch`, client context) |
| `any` usage | ⚠️ **106** occurrences | Many are legitimate (raw DB rows); worth tightening the avoidable ones over time |

---

## Findings

### ✅ Strengths
- **No `@ts-ignore`/`@ts-nocheck` and no `TODO/FIXME`** — a genuinely clean codebase
  with no suppressed type errors or abandoned debt markers.
- **One consistent request pattern** (`defineRoute`) across nearly all routes, so
  auth/validation/error-handling behave identically everywhere.
- **Security best practices baked in**: parameterized SQL, server/client isolation,
  Zod validation at the boundary.

### Correction after closer inspection
- The **6 `console.*` calls** are **not** a defect. All are in `'use client'`
  components — a global error boundary, three export-button `.catch(console.error)`
  handlers, and the client data context. The pino `logger` is `server-only` and
  importing it there would break the client build, so `console.error` is the
  correct choice. No change needed.

### ⚠️ Minor cleanup (non-blocking)
1. **106 `any` annotations** — a chunk are unavoidable at the DB-row boundary
   (`query<any>`), but the avoidable ones (function params, event handlers) could be
   typed. Ongoing hygiene, not a defect.

### Recommendation
No blocking issues. Treat the `any` reduction as ongoing hygiene. The fundamentals
(type safety, consistent patterns, secure-by-default) are in place.

# Performance & Scalability Analysis

**Date:** 4 August 2026 · **Target:** ~3,000 named employees, low-thousands scale.
**Status:** Analysed from architecture. Execution (load run) pending — see `load-tests/`.

---

## 1. Capacity model — what "3,000 users" actually demands

3,000 *named* users is not 3,000 requests/second. For an internal tool:
- Typical concurrency: **5–10% active** at peak → ~150–300 concurrent users.
- Each active user issues a request every few seconds (reading, not hammering).
- Estimated peak: **~50–150 requests/second** across all endpoints.

This is a **modest** load for the architecture below. The unknown is not *whether*
it holds, but *where* the first bottleneck appears — which the load run confirms.

## 2. Where the system scales well

| Layer | Why it scales |
|---|---|
| **Compute (Vercel serverless)** | Functions scale horizontally per request automatically; stateless (JWT in cookie, no server session store) so there is no shared-state ceiling. |
| **CDN / static assets** | Served from Vercel's edge — near-zero origin load for JS/CSS/images. |
| **Reads** | List endpoints are paginated and backed by **47 indexes** (incl. GIN indexes for text search and array containment). A short-TTL `serverCache` absorbs repeated list queries. |
| **Auth hot path** | `getCurrentUser()` runs a lean indexed `SELECT` (excludes the multi-MB `profile_photo`); `last_login` write is deferred and throttled to once/hour so it never blocks. |

## 3. The real bottleneck to watch: database connections

Serverless + Postgres is the classic pinch point — many short-lived function
instances each wanting a connection.

- **Mitigation in place:** the app connects through **PgBouncer transaction
  pooling** (Supabase port `6543`). Many function invocations multiplex onto a
  small pool of real Postgres connections. This is *the* reason the design holds
  under burst.
- **What to verify in the load run:** pool saturation. If `p95` latency climbs and
  errors mention connection limits under load, the fix is tuning the pool size /
  Supabase plan — not a code change.

## 4. Known cost/perf considerations (from the code)

| Item | Note |
|---|---|
| `profile_photo` as base64 in `users` | Can be multi-MB. Correctly excluded from the auth hot path; only `/api/auth/me` fetches it. Fine at this scale; if the user table grows large, consider moving photos to Storage + URL. |
| `serverCache` | In-memory per-instance cache with short TTL. On serverless each instance has its own; acceptable (it reduces DB load without needing correctness across instances, since per-user visibility is re-applied on every request). |
| RLS overhead | Policies add a small per-query cost (evaluating `current_setting()` + predicates). Negligible for indexed queries; confirm under load. |

## 5. Recommended thresholds (SLOs)

| Metric | Target |
|---|---|
| p95 response time (API reads) | < 800 ms |
| Error rate | < 1% |
| p95 under 2× expected peak (stress) | degrade gracefully, no cascading failure |

## 6. Execution plan (hand to vendor / run on staging)

1. **Smoke** — `k6 run smoke.js` (1 VU) to validate setup.
2. **Load** — `VUS=300 k6 run load.js` (realistic peak) → expect all SLOs met.
3. **Load ceiling** — `VUS=3000 k6 run load.js` (pessimistic "all at once").
4. **Stress** — `k6 run stress.js` → find the breaking point (likely DB pool).
5. **Soak** — `k6 run soak.js` (1h) → check for leaks / latency drift.

Scripts, thresholds, and instructions: [`load-tests/`](../load-tests/README.md).

## 7. Scaling levers (if the load run finds a limit)

1. **Increase PgBouncer pool / Supabase compute tier** (most likely first lever).
2. **Add read replicas** for heavy read scaling (later, if needed).
3. **Raise cache TTLs** on hot list endpoints.
4. **Move `profile_photo`** out of the row into Storage.

> Bottom line: the architecture is built to handle the target. The one thing to
> *prove* (not assume) is DB-connection behaviour under burst — that is exactly
> what the stress run measures.

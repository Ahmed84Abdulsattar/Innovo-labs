# Load & Performance Test Scripts (k6)

These [k6](https://k6.io) scripts let the vendor (or you, on staging) run the
**Load / Stress / Scalability / Soak** tests from the readiness checklist against a
deployed environment. k6 is a single binary — no runtime to install.

> ⚠️ **Run against a STAGING deployment, not production**, and only with the data
> owner's sign-off. Generating 3,000 virtual users will create real load and, for
> any write scenarios, real data. The scripts below are **read-only** (GET
> endpoints) by default so they are safe to point at a pre-prod environment.

## Prerequisites
1. Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Get a valid **session cookie** for a test user:
   - Log in to the target environment in a browser via SSO.
   - Open DevTools → Application → Cookies → copy the value of `innovo_session`.
3. Set environment variables when you run:
   - `BASE_URL` — e.g. `https://staging.your-portal.vercel.app`
   - `SESSION` — the `innovo_session` cookie value from step 2

## Running

```bash
# Smoke — 1 user, sanity check the script + auth works
BASE_URL=https://staging... SESSION=eyJ... k6 run smoke.js

# Load — ramp to the target concurrent users (default 300; override with VUS)
BASE_URL=... SESSION=... VUS=300 k6 run load.js

# The 3,000-employee readiness target
BASE_URL=... SESSION=... VUS=3000 k6 run load.js

# Stress — push past normal capacity to find the breaking point
BASE_URL=... SESSION=... k6 run stress.js

# Soak — sustained moderate load for 1 hour (stability / leak detection)
BASE_URL=... SESSION=... k6 run soak.js
```

## What "3,000 employees" means for VU count
3,000 *employees* is **not** 3,000 requests/second. Real users spend most of their
time reading, not clicking. A common model is 3,000 named users → ~5–10% concurrent
active → **150–300 concurrent virtual users (VUs)** at peak, each doing a request
every few seconds. `load.js` defaults to 300 VUs with think-time; set `VUS=3000`
only if you want the pessimistic "everyone clicks at once" ceiling (that is really a
*stress* test).

## Pass/fail thresholds (defined in the scripts)
- `http_req_duration p(95) < 800ms` — 95% of requests under 0.8s
- `http_req_failed rate < 1%` — under 1% errors
Adjust to your SLOs. k6 exits non-zero if a threshold is breached (CI-friendly).

## Files
| File | Purpose |
|---|---|
| `smoke.js` | 1 VU, 1 min — verifies the script + cookie work |
| `load.js` | Ramp to target VUs with think-time — the main readiness test |
| `stress.js` | Ramp beyond capacity until it breaks |
| `soak.js` | Sustained load for 1h — stability / memory leaks |
| `lib/endpoints.js` | Shared list of read endpoints + helpers |

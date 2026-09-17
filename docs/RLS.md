# Database-side access control (Row-Level Security)

RLS adds a **second, independent** enforcement layer on top of the app's route
checks: even if an app query had a bug, the database itself refuses to return
rows the user shouldn't see. This is **defense in depth** — it does not replace
the `defineRoute` role gates, it backs them up.

**Phase 1 (this change)** enforces **reads** on `users` and `ideas`. The policies
mirror the app rules exactly, so enabling it locks out no one who is currently
allowed.

## How it works

- Normal/system queries (`query`, `queryOne`) still run as the connection's owner
  role, which **bypasses RLS** — so auth, the rate limiter, audit writes and user
  creation are unaffected.
- User-facing reads use **`queryAsUser(user, …)`** / **`queryOneAsUser`**. When
  `RLS_ENFORCED=true`, each opens a transaction, sets the caller's identity as
  transaction-local settings, and `SET LOCAL ROLE app_rls` (a restricted role that
  **is** subject to RLS). The policies in migration `044` then apply.
- If identity isn't set, the policies deny everything (**fail closed**).

## Roll-out order (do NOT skip the test)

> ⚠️ Never enable this in production untested — a wrong policy can hide data from
> legitimate users. Test first, ideally on a Supabase branch or staging project.

1. **Deploy the app code** with `RLS_ENFORCED` **unset** (or `false`).
   Nothing changes yet — `queryAsUser` behaves exactly like `query`.
2. **Apply the migration** in Supabase: run `supabase/migrations/044_rls_read_policies.sql`
   (via `node scripts/migrate.js`, or paste it into the Supabase SQL editor).
3. **Test the policies** in the Supabase SQL editor (no app needed):
   ```sql
   -- Viewer: should see ONLY their own ideas, and NO users
   BEGIN;
     SELECT set_config('app.user_id', '<a-viewer-user-uuid>', true),
            set_config('app.user_role', 'viewer', true);
     SET LOCAL ROLE app_rls;
     SELECT count(*) FROM users;   -- expect 0
     SELECT count(*) FROM ideas;   -- expect only that viewer's ideas
   ROLLBACK;

   -- Super admin: should see everything
   BEGIN;
     SELECT set_config('app.user_id', '<a-super-admin-uuid>', true),
            set_config('app.user_role', 'super_admin', true);
     SET LOCAL ROLE app_rls;
     SELECT count(*) FROM users;   -- expect > 0
     SELECT count(*) FROM ideas;   -- expect all ideas
   ROLLBACK;
   ```
4. **Enable it:** set `RLS_ENFORCED=true` in Vercel env vars and redeploy.
5. **Smoke test the live app:** open the Users page (as admin), open Ideas as a
   non-admin (should see only their own). If anything is off →

## Instant rollback

Set `RLS_ENFORCED=false` (or unset it) in Vercel and redeploy. The app immediately
returns to app-layer-only enforcement. The policies can stay in place (harmless
while the flag is off); to remove them entirely:
```sql
DROP POLICY IF EXISTS rls_users_select ON users;
DROP POLICY IF EXISTS rls_ideas_select ON ideas;
```

## Prerequisite / caveat

The migration does `GRANT app_rls TO <the app's connection role>` so the app can
`SET ROLE app_rls`. That role must not have `BYPASSRLS`. On Supabase the standard
pooler role can create roles and switch into them, so this works out of the box —
but confirm step 3 actually returns 0 rows for a viewer before trusting it. If the
viewer test returns rows, the connection role is bypassing RLS and the policies are
not being enforced (tell the team before enabling the flag).

## Phase 2 (later)

Extend the same pattern to writes (INSERT/UPDATE/DELETE `WITH CHECK` policies) and
to the other tables (startups, initiatives, comments, …), each mirroring the
`permissions.ts` rules and tested per role.

# Permission Schema (RBAC)

Access control for the Innovo Labs portal. This is derived from
`apps/web/lib/shared/permissions.ts` (the single source of truth for role logic) and the
`roles:` gates declared on each API route via `defineRoute()`.

## Authentication

- **Microsoft Entra ID (Azure AD) SSO only.** Password sign-in is retired.
- Every API route requires a valid session by default (enforced in `defineRoute`);
  only the auth endpoints (`/api/auth/*`) are public.
- Access is restricted to `@innovogroup.com` accounts.
- The session is a JWT in an HttpOnly cookie.

## Roles

Four roles, strictly hierarchical — each inherits everything below it:

| Role | Inherits | Summary |
|------|----------|---------|
| **viewer** | — | Read-only. Can submit ideas, comment, and rate startups. |
| **contributor** | viewer | + update evaluation fields on in-scope startups, upload documents, add timeline notes, star engagement. |
| **innovation_admin** | contributor | + full CRUD on startups **within their scope**, and on initiatives / challenges / news / collaborations; review ideas; view users & audit log. |
| **super_admin** | innovation_admin | Unrestricted. + user management, idea contributor assignment, idea status timeline, timeline unlock, cross-scope everything. |

Helper predicates: `isContributor` = contributor/innovation_admin/super_admin;
`isInnovationAdmin` (`isAdmin`) = innovation_admin/super_admin; `isSuperAdmin` = super_admin.

## Capability matrix

✓ = allowed · — = denied · *scope* = allowed only within the actor's scope (see Scope Rules)

| Capability | viewer | contributor | innovation_admin | super_admin |
|---|:---:|:---:|:---:|:---:|
| **Read** | | | | |
| Browse startups / challenges / news / collaborations | ✓ | ✓ | ✓ | ✓ |
| View an initiative | ✓¹ | ✓¹ | ✓ | ✓ |
| View an idea (detail) | own only | own only | ✓ | ✓ |
| View idea status timeline | — | — | — | ✓ |
| View users list | — | — | ✓ | ✓ |
| View audit log | — | — | ✓ | ✓ |
| **Engage** | | | | |
| Submit an idea | ✓ | ✓ | ✓ | ✓ |
| Comment (startup & idea) | ✓ | ✓ | ✓ | ✓ |
| Rate a startup (1–5) | ✓ | ✓ | ✓ | ✓ |
| Star / flag engagement | — | ✓ | ✓ | ✓ |
| Upload documents | — | ✓ | ✓ | ✓ |
| Add timeline / activity note | — | *scope*² | *scope*² | ✓ |
| Update startup evaluation fields³ | — | *scope* | *scope* | ✓ |
| **Manage content** | | | | |
| Create / edit / delete startups | — | — | *scope* | ✓ |
| Review an idea (status + notes) | — | — | ✓ | ✓ |
| Assign contributors to an idea | — | — | — | ✓ |
| Create / edit / delete initiatives | — | — | ✓ | ✓ |
| Create / edit / delete challenges | — | — | ✓ | ✓ |
| Create / edit / delete news | — | — | ✓ | ✓ |
| Create / edit / delete collaborations | — | — | ✓ | ✓ |
| Unlock / delete a timeline event | — | — | — | ✓ |
| **Administer** | | | | |
| Manage users (role, department) | — | — | — | ✓ |
| Promote a user to admin | — | — | — | ✓ |

¹ Except initiatives marked **Internal** — see Scope Rules.
² Blocked once the startup is Onboarded or Rejected (timeline locked), unless super_admin.
³ Evaluation fields = status, progress, next steps, lessons learnt — distinct from
editing the startup record itself (which is innovation_admin+).

## Scope rules

Some capabilities are gated by a scope check, not just the role:

- **Startup scope (innovation_admin & contributor).** A startup is "in scope" when
  its department equals the actor's department, **or** the actor's department is one of
  the startup's business units (`adminOwnsStartup` / `contributorInBU` / `inStartupScope`).
  **super_admin bypasses scope** and can act on any startup.
- **Initiative visibility.** An initiative marked **`Internal`** is visible only to
  super_admin, innovation_admin, its creator, and its assigned contributors. Any other
  value (`Global` or unset/legacy) is visible to all authenticated staff
  (`canViewInitiative`).
- **Idea detail access.** An idea's detail is visible to its submitter and to
  innovation_admin+ only; enforced server-side in `GET /api/ideas/[id]`.
- **Timeline lock.** Once a startup reaches **Onboarded** or **Rejected**, its timeline
  is locked for everyone except super_admin (`canAddTimelineEvent`).

## Route-level enforcement

Role gates declared on the API (method → minimum role). Unlisted read (`GET`) routes
require only an authenticated session.

| Route | Method(s) | Required role |
|---|---|---|
| `/api/startups`, `/api/startups/[id]` | POST / PATCH / DELETE | innovation_admin (+ scope) |
| `/api/initiatives`, `/api/initiatives/[id]` | POST / PATCH / DELETE | innovation_admin |
| `/api/challenges`, `/api/challenges/[id]` | POST / PATCH / DELETE | innovation_admin |
| `/api/news`, `/api/news/[id]` | POST / PATCH / DELETE | innovation_admin |
| `/api/collaborations`, `/api/collaborations/[id]` | POST / PATCH / DELETE | innovation_admin |
| `/api/ideas` | POST | any authenticated |
| `/api/ideas/[id]` | PATCH | innovation_admin (contributors: super_admin only) |
| `/api/ideas/[id]/history` | GET | super_admin |
| `/api/comments` | POST | any authenticated |
| `/api/ratings` | POST | any authenticated |
| `/api/timeline` | POST | contributor (+ scope) |
| `/api/timeline` | DELETE | super_admin |
| `/api/upload` | POST | contributor |
| `/api/users` | GET | innovation_admin |
| `/api/users/[id]` | PATCH | super_admin |
| `/api/audit` | GET | innovation_admin |
| `/api/audit` | POST | super_admin |

## Rate limits

Per-user sliding-window limits (DB-backed) on mutating routes:

| Route | Limit |
|---|---|
| `/api/ideas` (submit) | 12 / min |
| `/api/comments` | 20 / min |
| `/api/startups`, `/api/initiatives`, `/api/challenges`, `/api/news`, `/api/collaborations` | 20 / min |
| `/api/ratings` | 30 / min |
| `/api/timeline` | 30 / min |

## Notes for reviewers

- **Defense in depth:** UI hides disallowed actions, but every check is also enforced
  server-side in the route — the client gate is never the only gate.
- **RLS:** every table has Row Level Security enabled; the app connects with the
  service role, which blocks any direct anon/public REST access to the database.
- **Open items:** the idea "contributor" assignment (super_admin only) currently stores
  and displays contributors but does not yet grant them any elevated capability on the
  idea — that permission is intentionally still to be defined.

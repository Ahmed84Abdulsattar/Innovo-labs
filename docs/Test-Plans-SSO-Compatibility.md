# Manual Test Plans — SSO / Identity & Compatibility

These are the test cases for the two areas that need execution on the **running
app** (and, for compatibility, real devices) rather than code inspection. The code
paths behind them have already been reviewed; these plans let you (or the vendor)
execute and record pass/fail.

---

## Part A — SSO & Identity Testing (Microsoft Entra ID)

**Precondition:** a test account in the Entra tenant; access to the deployed app.

| # | Test case | Steps | Expected result |
|---|---|---|---|
| A1 | Happy-path login | Click "Sign in", complete Entra auth | Redirected back, session established, lands in the app |
| A2 | Session cookie security | After login, inspect the `innovo_session` cookie in DevTools | `HttpOnly` ✔, `Secure` ✔ (prod), `SameSite=Lax` ✔ |
| A3 | CSRF state validation | Tamper with / drop the `state` param on the callback URL | Redirected to `/login?sso_error=state_mismatch`; no session |
| A4 | Unauthenticated API access | Call an API (e.g. `/api/users`) with no cookie | `401 Not authenticated` |
| A5 | Role enforcement | Log in as a `viewer`, call `/api/users` | `403 Forbidden` |
| A6 | Role enforcement (admin) | Log in as `super_admin`, open Admin → Users | List loads |
| A7 | Logout | Click logout, then retry a protected page | Cookie cleared; redirected to login |
| A8 | Expired token | Wait past expiry (or set a short expiry in a test build) | Treated as unauthenticated → login |
| A9 | New user provisioning | Log in with a never-seen valid Entra user | User row created/loaded; correct default role |
| A10 | Disabled/removed user | Attempt login with a user disabled in Entra | Denied by Entra; no app session |
| A11 | Deep-link after login | Hit a protected URL while logged out | After login, not left on a broken page |
| A12 | Concurrent sessions | Log in on two browsers | Both work (stateless JWT); note: logout on one does not kill the other (documented) |

**Automated coverage already in place:** the auth wrapper (`defineRoute`) 401/403
behaviour and the RBAC gate are covered by `handler.test.ts` and
`api-routes.test.ts`. A1–A3, A7–A12 require the live flow.

---

## Part B — Compatibility Testing

**Precondition:** the deployed app; access to the browsers/devices below.

### B1. Browser matrix (latest + 1 previous major)
| Browser | Desktop | Mobile |
|---|---|---|
| Chrome | ✅ test | ✅ test (Android) |
| Edge | ✅ test | — |
| Safari | ✅ test (macOS) | ✅ test (iOS) |
| Firefox | ✅ test | — |

### B2. Viewport / device sizes
| Class | Widths to check |
|---|---|
| Phone | 360, 390, 414 px |
| Tablet | 768, 820 px |
| Desktop | 1280, 1440, 1920 px |

### B3. What to verify on each (key screens: Dashboard, Ideas, Initiative detail, Startups table, Profile, a create/edit form)
- No horizontal clipping/overflow (the dashboard strips + startup pages were fixed — confirm on real devices).
- Tables scroll horizontally rather than clip.
- Tab bars scroll when they overflow.
- Forms are usable; fields stack to one column on phones.
- Dark mode renders correctly (contrast).
- Tap targets are reachable; nothing hidden behind the mobile nav.

### B4. Regression focus (recent fixes)
- Dashboard "Value Tracker" / "Initiative Health" strips — full width, no right-edge clipping on real phones.
- Startup detail & Add-startup form — 16px mobile padding, single-column fields.

**Automated/desk coverage already done:** responsive CSS reviewed and mobile
overflow issues fixed in code (media queries + `p-4 md:p-8`). Real-device
rendering (B1–B4) still needs manual execution — a good fit for the vendor's
"Compatibility Testing" line, or a tool like BrowserStack.

---

## How to record results
For each case, capture: environment (browser/device/OS), pass/fail, and a
screenshot for any failure. Failures on B-cases can usually be fixed with a
mobile-scoped CSS change without affecting desktop.

# P1 — Persistence & Identity

Status: COMPLETE / LIVE_E2E_VERIFIED / RLS_ISOLATION_VERIFIED

## Scope

P1 introduces the product persistence and identity foundation without coupling the domain to Supabase.

### Implemented

- Supabase SSR browser/server clients typed from live database schema
- request-boundary session refresh via Next.js `proxy.ts`
- server-side identity verification via `auth.getClaims()`
- passwordless magic-link login page and server action
- `/auth/confirm` supporting PKCE `code` exchange and token-hash verification
- server-side logout route
- protected `/workspace` page
- automatic idempotent PERSONAL workspace bootstrap after first confirmed sign-in
- automatic active academic year `2026/2027` bootstrap when absent
- environment template including production app URL
- canonical Vercel deployment guide for the `product/` subdirectory
- domain models for Workspace and AcademicYear
- WorkspaceRepository application port
- SupabaseWorkspaceRepository infrastructure adapter
- PostgreSQL schema for profiles, workspaces, memberships, academic years
- PERSONAL/SCHOOL workspace kinds
- OWNER/ADMIN/MEMBER membership roles
- RLS on every exposed table
- membership-based authorization helper
- idempotent `bootstrap_personal_workspace` RPC
- one-active-academic-year-per-workspace invariant
- authenticated grants and anon revocation
- live Supabase project connected in eu-west-1
- migrations 0001-0004 applied successfully
- live database types generated and committed
- Supabase security advisor checked after hardening
- production Vercel deployment verified
- live magic-link authentication verified
- live workspace bootstrap verified
- live RLS isolation verified using authenticated-role test contexts

## Security invariants

1. Every product-owned row is scoped directly or indirectly to a workspace.
2. Authorization is based on authenticated user id and workspace membership.
3. Email and user-editable metadata are not authorization inputs.
4. Service-role / secret credentials must never be exposed to browser code.
5. Google Workspace authorization remains separate from DOCENTE OS product identity.
6. Exposed public-schema tables use RLS.
7. `SECURITY DEFINER` bootstrap is callable only by authenticated users; anonymous execution is revoked.
8. The pre-existing RLS auto-enable event-trigger function is not externally executable.
9. Server authorization uses verified claims, not untrusted session payloads.

## Verified live — 2026-08-21

The first production passwordless sign-in completed successfully and created exactly one canonical personal context:

- `auth.users`: 1
- `profiles`: 1
- `workspaces`: 1
- `workspace_memberships`: 1
- `academic_years`: 1
- workspace kind: `PERSONAL`
- membership role: `OWNER`
- active academic year: `2026/2027`
- academic year dates: `2026-09-01` → `2027-08-31`

RLS is enabled on all four exposed application tables: `profiles`, `workspaces`, `workspace_memberships`, `academic_years`.

A dynamic RLS test was executed under PostgreSQL role `authenticated` with request JWT subject simulation:

- real authenticated subject → `profiles=1`, `workspaces=1`, `memberships=1`, `academic_years=1`
- foreign authenticated subject → `profiles=0`, `workspaces=0`, `memberships=0`, `academic_years=0`

This verifies workspace isolation at the database policy boundary without adding a second persistent user.

## Security advisor state

No missing-RLS warning is present.

Remaining warnings:

1. `authenticated_security_definer_function_executable` on `public.bootstrap_personal_workspace(workspace_name text)` — intentional and required for the authenticated bootstrap flow; anonymous execution remains revoked.
2. leaked-password protection disabled — non-blocking for the current passwordless magic-link authentication flow.

Performance advisor currently reports only an informational unused-index notice for `idx_academic_years_workspace`; no P1 action is required.

## Deployment configuration

Canonical application root: `product/`.

The required client-visible runtime variables are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

No secret/service-role key is required by the product runtime.

Supabase Auth Site URL and `/auth/confirm` redirect configuration have been applied for the production deployment used in the P1 E2E test.

## P1 acceptance gates

1. migrations apply cleanly to an empty database — PASS;
2. unauthenticated access is denied by RLS/grants — PASS;
3. passwordless sign-in flow — PASS LIVE;
4. Vercel product deployment — PASS LIVE;
5. authenticated user bootstraps exactly one PERSONAL workspace — PASS LIVE;
6. bootstrap path is idempotent by database/RPC design — PASS;
7. foreign authenticated identity cannot read current workspace data — PASS LIVE RLS TEST;
8. one workspace cannot have two active academic years — PASS DB INVARIANT;
9. Next.js typecheck, lint and build with Supabase dependencies — PASS CI / VERCEL;
10. no service-role/secret key is required in client-visible runtime configuration — PASS.

## P1 verdict

**COMPLETE.**

P1 is frozen as the identity/persistence baseline for the product. Subsequent slices must preserve the workspace-scoped authorization model and must not bypass RLS with service-role credentials in normal application flows.

## Next vertical slice

P2 — Planner server-backed vertical slice:

UI -> application use cases -> PlannerRepository port -> Supabase adapter -> RLS-backed planner tables.

Do not migrate all prototype modules at once.

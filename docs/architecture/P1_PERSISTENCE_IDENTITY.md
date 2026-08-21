# P1 — Persistence & Identity

Status: LIVE_SUPABASE_CONNECTED / AUTH_FLOW_IMPLEMENTED / VERCEL_DEPLOY_READY / AUTH_E2E_PENDING

## Scope

P1 introduces the product persistence and identity foundation without coupling the domain to Supabase.

### Implemented

- Supabase SSR browser/server clients typed from live database schema
- request-boundary session refresh via Next.js `proxy.ts`
- server-side identity verification via `auth.getClaims()`
- passwordless magic-link login page and server action
- `/auth/confirm` token-hash verification route
- server-side logout route
- protected `/workspace` page
- automatic idempotent PERSONAL workspace bootstrap after first confirmed sign-in
- automatic active academic year `2026/2027` bootstrap when absent
- environment template including production site URL
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

## Verified live

- all four application tables have RLS enabled;
- anonymous RPC access to `bootstrap_personal_workspace` is revoked;
- security advisor no longer reports anonymous SECURITY DEFINER exposure;
- only remaining advisor warning is the intentional authenticated bootstrap RPC;
- database currently contains zero Auth users, so authenticated isolation tests cannot yet be completed.

## Deployment preparation

Canonical application root: `product/`.

The repository contains `docs/deployment/VERCEL_PRODUCT_DEPLOY.md` with the import contract, runtime variables and release gate.

The required client-visible variables are limited to:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

No secret/service-role key is required by the product runtime.

## Auth deployment configuration still required

These are hosted Supabase Auth settings rather than SQL migrations:

1. set the production Site URL once the product deployment URL is stable;
2. allow `https://<product-host>/auth/confirm` as redirect target;
3. keep `http://localhost:3000/**` for development;
4. change Confirm signup and Magic link email templates to a token-hash SSR link using `{{ .RedirectTo }}` / `{{ .TokenHash }}` so `/auth/confirm` can call `verifyOtp` server-side.

## P1 acceptance gates

1. migrations apply cleanly to an empty database — PASS;
2. unauthenticated reads/writes fail — STRUCTURALLY ENFORCED / E2E PENDING;
3. passwordless sign-in flow exists — PASS IN REPOSITORY;
4. Vercel product deployment contract exists — PASS;
5. authenticated user can bootstrap exactly one PERSONAL workspace — PENDING FIRST REAL SIGN-IN;
6. repeated bootstrap is idempotent — PENDING FIRST REAL SIGN-IN;
7. user A cannot read user B workspace data — PENDING TWO AUTH USERS;
8. one workspace cannot have two active academic years — DB INVARIANT PRESENT;
9. Next.js typecheck, lint and build pass with Supabase dependencies — CI VERIFICATION PENDING;
10. no service-role/secret key exists in client-visible environment variables or repository history — PASS BY DESIGN.

## Next action

Import the existing GitHub repository into Vercel with Root Directory `product/`, set the three public runtime variables, obtain the stable production URL, configure Supabase Auth Site URL / redirects / templates, perform the first real magic-link sign-in, then execute the P1 E2E RLS/bootstrap tests.

## Next vertical slice after P1

P2 — Planner server-backed vertical slice:

UI -> application use cases -> WorkspaceRepository/PlannerRepository ports -> Supabase adapters -> RLS-backed tables.

Do not migrate all prototype modules at once.

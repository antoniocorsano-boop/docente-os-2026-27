# P1 — Persistence & Identity

Status: LIVE_SUPABASE_CONNECTED / MIGRATIONS_APPLIED / AUTH_E2E_PENDING

## Scope

P1 introduces the product persistence and identity foundation without coupling the domain to Supabase.

### Implemented

- Supabase SSR browser/server clients
- environment template
- domain models for Workspace and AcademicYear
- WorkspaceRepository application port
- SupabaseWorkspaceRepository infrastructure adapter
- PostgreSQL schema for profiles, workspaces, memberships, academic years
- PERSONAL/SCHOOL workspace kinds
- OWNER/ADMIN/MEMBER membership roles
- RLS on every exposed table
- membership-based authorization helper
- idempotent bootstrap_personal_workspace RPC
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
4. Service-role credentials must never be exposed to browser code.
5. Google Workspace authorization remains separate from DOCENTE OS product identity.
6. Exposed public-schema tables use RLS.
7. SECURITY DEFINER bootstrap is callable only by authenticated users; anonymous execution is revoked.
8. The pre-existing RLS auto-enable event-trigger function is not externally executable.

## Verified live

- all four application tables have RLS enabled;
- anonymous RPC access to bootstrap_personal_workspace is revoked;
- security advisor no longer reports anonymous SECURITY DEFINER exposure;
- only remaining advisor warning is the intentional authenticated bootstrap RPC;
- project currently contains zero auth users, so authenticated isolation tests cannot yet be completed.

## P1 acceptance gates

1. migrations apply cleanly to an empty database — PASS;
2. unauthenticated reads/writes fail — STRUCTURALLY ENFORCED / E2E PENDING;
3. authenticated user can bootstrap exactly one PERSONAL workspace — PENDING AUTH USER;
4. repeated bootstrap is idempotent — PENDING AUTH USER;
5. user A cannot read user B workspace data — PENDING TWO AUTH USERS;
6. one workspace cannot have two active academic years — DB INVARIANT PRESENT;
7. Next.js typecheck, lint and build pass with Supabase dependencies — CI VERIFICATION PENDING;
8. no service-role key exists in client-visible environment variables or repository history — PASS BY DESIGN.

## Next action

Add the first product sign-in flow and create the first authenticated product user. Then execute the P1 E2E RLS/bootstrap tests before declaring P1 COMPLETE.

## Next vertical slice after P1

P2 — Planner server-backed vertical slice:

UI -> application use cases -> WorkspaceRepository/PlannerRepository ports -> Supabase adapters -> RLS-backed tables.

Do not migrate all prototype modules at once.

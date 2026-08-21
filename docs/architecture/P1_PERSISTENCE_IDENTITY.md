# P1 — Persistence & Identity

Status: IMPLEMENTED_IN_REPOSITORY / NOT_YET_CONNECTED_TO_LIVE_SUPABASE

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

## Security invariants

1. Every product-owned row is scoped directly or indirectly to a workspace.
2. Authorization is based on authenticated user id and workspace membership.
3. Email and user-editable metadata are not authorization inputs.
4. Service-role credentials must never be exposed to browser code.
5. Google Workspace authorization remains separate from DOCENTE OS product identity.
6. Exposed public-schema tables use RLS.

## P1 acceptance gates

P1 can be marked COMPLETE only when a real Supabase project is connected and all gates pass:

1. migrations apply cleanly to an empty database;
2. unauthenticated reads/writes fail;
3. authenticated user can bootstrap exactly one PERSONAL workspace;
4. repeated bootstrap is idempotent;
5. user A cannot read user B workspace data;
6. one workspace cannot have two active academic years;
7. Next.js typecheck, lint and build pass with Supabase dependencies;
8. no service-role key exists in client-visible environment variables or repository history.

## Next vertical slice after P1

P2 — Planner server-backed vertical slice:

UI -> application use cases -> WorkspaceRepository/PlannerRepository ports -> Supabase adapters -> RLS-backed tables.

Do not migrate all prototype modules at once.

# DOCENTE OS Product — Vercel deployment

Canonical application root: `product/`

## Vercel import

Use the repository subdirectory directly:

`https://github.com/antoniocorsano-boop/docente-os-2026-27/tree/main/product`

Recommended project name: `docente-os-product`

Framework: Next.js

Production branch: `main`

## Required environment variables

Set in Vercel for Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Only the modern Supabase publishable key is permitted in client-visible configuration. Never add `sb_secret_*`, `service_role`, database passwords or access tokens to the repository or browser environment.

## Supabase Auth configuration after first production URL exists

In Supabase Auth URL Configuration:

- Site URL = exact production Vercel URL
- Redirect URL = `<production-url>/auth/confirm`
- local development may additionally allow `http://localhost:3000/**`

Magic-link / confirmation email templates for SSR must send the token hash to the application confirmation endpoint, for example:

`{{ .RedirectTo }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

The application endpoint verifies the token with Supabase and stores the authenticated session in cookies.

## Release gate P1

P1 is COMPLETE only after all of the following pass:

1. Vercel production deploy is READY.
2. `/login` renders successfully.
3. A real magic link creates an authenticated session.
4. First login bootstraps exactly one PERSONAL workspace.
5. Repeated login/bootstrap remains idempotent.
6. Academic year `2026/2027` is present and active.
7. A second test user cannot read the first user's workspace data.
8. No privileged Supabase key is client-visible.

Do not start the P2 Planner migration before this gate is closed.

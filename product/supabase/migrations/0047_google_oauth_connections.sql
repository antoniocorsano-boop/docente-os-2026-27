begin;

create table if not exists public.google_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'GOOGLE' check (provider = 'GOOGLE'),
  account_email text null check (account_email is null or char_length(account_email) <= 320),
  scopes text[] not null default '{}',
  access_token_enc text not null check (char_length(access_token_enc) >= 20),
  refresh_token_enc text null check (refresh_token_enc is null or char_length(refresh_token_enc) >= 20),
  expires_at timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_oauth_connections_identity_uq unique (workspace_id, user_id, provider)
);

create index if not exists idx_google_oauth_connections_user
  on public.google_oauth_connections(user_id);

alter table public.google_oauth_connections enable row level security;

create policy google_oauth_connections_select_own
  on public.google_oauth_connections
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_workspace_member(workspace_id)
  );

create policy google_oauth_connections_insert_own
  on public.google_oauth_connections
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_workspace_member(workspace_id)
  );

create policy google_oauth_connections_update_own
  on public.google_oauth_connections
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_workspace_member(workspace_id)
  )
  with check (
    user_id = (select auth.uid())
    and private.is_workspace_member(workspace_id)
  );

grant select, insert, update on public.google_oauth_connections to authenticated;
revoke delete on public.google_oauth_connections from authenticated;
revoke all on public.google_oauth_connections from anon;

comment on table public.google_oauth_connections is
  'Server-encrypted Google OAuth tokens, scoped per authenticated user/workspace. Tokens are encrypted before persistence and never stored in browser storage.';

commit;

-- T2-C: the annual MIM sync is authenticated exclusively with short-lived
-- GitHub Actions OIDC credentials. The temporary static-token verifier from
-- the bootstrap phase is intentionally removed after the first certified run.

drop table if exists public.mim_textbook_sync_credentials;
